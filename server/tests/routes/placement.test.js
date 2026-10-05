import { jest } from "@jest/globals";
import request from "supertest";

const bankStore = { practiceItem: null, items: [] };

jest.unstable_mockModule("../../src/data/mapperItemBank.js", () => ({ default: bankStore }));

const { default: app } = await import("../../src/app.js");
const { default: LearningJourney } = await import("../../src/models/LearningJourney.js");
const learningJourneyRepository = await import("../../src/repositories/learningJourneyRepository.js");
const parentRepository = await import("../../src/repositories/parentRepository.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");
const { buildMapperBank } = await import("../support/mapperBankFixture.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const childFields = {
  name: "גאיה",
  grammaticalGender: "female",
  learningProfile: { readingLevel: "beginner", interests: [] },
};

const SEED_BAND_BY_SIGNAL = { "short-pointed-texts": "A", "several-sentence-pointed-passages": "C" };

describe("placement routes", () => {
  let owner;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  beforeEach(async () => {
    Object.assign(bankStore, buildMapperBank({ itemsPerBand: 4 }));
    owner = await createAuthenticatedParentWithChild(childFields);
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  const placementPath = (childId, action = "") => `/api/child-profiles/${childId}/placement${action}`;
  const bankItemById = (itemId) => [bankStore.practiceItem, ...bankStore.items].find((item) => item.itemId === itemId);

  async function giveEstimate(startingSignal = "several-sentence-pointed-passages", target = owner) {
    await learningJourneyRepository.saveSeed({
      parentId: target.parentId,
      childId: target.childId,
      startingSignal,
      seedBand: SEED_BAND_BY_SIGNAL[startingSignal],
    });
  }

  const send = (path, body, cookie = owner.authCookie) => request(app).post(path).set("Cookie", cookie).send(body);
  const start = (target = owner) => send(placementPath(target.childId), undefined, target.authCookie);
  const answer = (itemId, selectedSentenceIndex) => send(placementPath(owner.childId, "/answer"), { itemId, selectedSentenceIndex });
  const skip = (itemId) => send(placementPath(owner.childId, "/skip"), { itemId });
  const askForHelp = (itemId) => send(placementPath(owner.childId, "/instruction-help"), { itemId });

  const correctIndexOf = (itemId) => bankItemById(itemId).correctSentenceIndex;
  const wrongIndexOf = (itemId) => (correctIndexOf(itemId) + 1) % 4;

  async function finishPractice() {
    const { body } = await start();

    return (await answer(body.item.itemId, 0)).body;
  }

  // Plays the four scored items: "correct", "incorrect", "skip" or "help" (assistance, then a correct tap).
  async function playScoredItems(...plan) {
    let view = await finishPractice();
    const servedItemIds = [];

    for (const action of plan) {
      const { itemId } = view.item;
      servedItemIds.push(itemId);

      if (action === "skip") {
        view = (await skip(itemId)).body;
      } else {
        if (action === "help") {
          await askForHelp(itemId);
        }

        const index = action === "incorrect" ? wrongIndexOf(itemId) : correctIndexOf(itemId);
        view = (await answer(itemId, index)).body;
      }
    }

    return { view, servedItemIds };
  }

  const storedJourney = () => LearningJourney.findOne().lean();

  describe("starting and resuming", () => {
    test("needs the parent's starting estimate first", async () => {
      const response = await start();

      expect(response.statusCode).toBe(409);
      expect(response.body.errorCode).toBe("placement_estimate_missing");
    });

    test("reports itself unavailable, and does not start, while the bank lacks reviewed items", async () => {
      await giveEstimate();
      Object.assign(bankStore, { practiceItem: null, items: [] });

      const response = await start();

      expect(response.statusCode).toBe(503);
      expect(response.body.errorCode).toBe("placement_unavailable");
      expect((await storedJourney()).placementStatus).toBe("not_started");
    });

    test("is unavailable when a probed band has fewer than two items", async () => {
      await giveEstimate();
      Object.assign(bankStore, buildMapperBank({ bands: ["B", "C"] }));

      expect((await start()).statusCode).toBe(503);
    });

    test("a child seeded at the floor needs four items there, since a wrong first answer cannot probe lower", async () => {
      await giveEstimate("short-pointed-texts");
      Object.assign(bankStore, buildMapperBank({ itemsPerBand: 2 }));

      const response = await start();

      expect(response.statusCode).toBe(503);
      expect((await storedJourney()).placementStatus).toBe("not_started");
    });

    test("starts with the unscored practice item and never exposes the answer key or a band", async () => {
      await giveEstimate();

      const response = await start();

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        status: "in_progress",
        item: {
          itemId: "practice",
          prompt: "prompt-practice",
          sentences: bankStore.practiceItem.sentences,
          isPractice: true,
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(/answerText|correctSentenceIndex|framingSentenceIndex|band/);
    });

    test("a refresh resumes the very same item instead of issuing a new one", async () => {
      await giveEstimate();
      const first = await finishPractice();

      const afterRefresh = await start();

      expect(afterRefresh.body).toEqual(first);
    });

    test("never shows the same item twice within one placement", async () => {
      await giveEstimate();

      const { servedItemIds } = await playScoredItems("correct", "correct", "correct", "correct");

      expect(new Set(servedItemIds).size).toBe(4);
    });
  });

  describe("placement outcome", () => {
    test.each([
      ["all four correct moves one band up", ["correct", "correct", "correct", "correct"], "D"],
      ["wrong at the seed band and right one band below moves one band down", ["incorrect", "correct", "correct", "incorrect"], "B"],
      ["mixed evidence keeps the parent's estimate", ["correct", "correct", "incorrect", "correct"], "C"],
      ["a skipped item keeps the estimate even though the rest are correct", ["correct", "skip", "correct", "correct"], "C"],
      ["an item that needed instruction help keeps the estimate", ["correct", "help", "correct", "correct"], "C"],
    ])("%s", async (_description, plan, expectedBand) => {
      await giveEstimate();

      const { view } = await playScoredItems(...plan);

      expect(view).toEqual({ status: "complete", item: null });
      expect(await storedJourney()).toMatchObject({ placementStatus: "complete", provisionalAnchorBand: expectedBand, seedBand: "C" });
    });

    test("serves probe items one band above after a correct first item, and the seed band last", async () => {
      await giveEstimate();

      const { servedItemIds } = await playScoredItems("correct", "correct", "correct", "correct");

      expect(servedItemIds.map((itemId) => bankItemById(itemId).band)).toEqual(["C", "D", "D", "C"]);
    });

    test("serves probe items one band below after an incorrect first item", async () => {
      await giveEstimate();

      const { servedItemIds } = await playScoredItems("incorrect", "correct", "correct", "correct");

      expect(servedItemIds.map((itemId) => bankItemById(itemId).band)).toEqual(["C", "B", "B", "C"]);
    });

    test("an A-seeded child never receives an item below band A and stays at A", async () => {
      await giveEstimate("short-pointed-texts");

      const { servedItemIds } = await playScoredItems("incorrect", "correct", "correct", "incorrect");

      expect(servedItemIds.map((itemId) => bankItemById(itemId).band)).toEqual(["A", "A", "A", "A"]);
      expect((await storedJourney()).provisionalAnchorBand).toBe("A");
    });

    test("stores outcomes only, never which sentence was tapped, and keeps legacy levels untouched", async () => {
      await giveEstimate();
      await playScoredItems("correct", "incorrect", "correct", "incorrect");

      const journey = await storedJourney();
      const child = await parentRepository.findActiveChild(owner.parentId, owner.childId);

      expect(journey.placement.observations).toHaveLength(4);
      journey.placement.observations.forEach((observation) => {
        expect(Object.keys(observation).sort()).toEqual(["band", "outcome"]);
      });
      expect(JSON.stringify(journey)).not.toMatch(/selectedSentenceIndex/);
      expect(child.learningProfile).toMatchObject({ currentLevel: 1, currentSublevel: 1 });
    });

    test("the practice item records no observation, whatever the child taps", async () => {
      await giveEstimate();
      const { body } = await start();

      await answer(body.item.itemId, 3);

      expect((await storedJourney()).placement).toMatchObject({ practiceCompleted: true, observations: [] });
    });
  });

  describe("replays and stale requests", () => {
    test("answering the same item twice counts it once", async () => {
      await giveEstimate();
      const { item } = await finishPractice();

      const [first, second] = await Promise.all([answer(item.itemId, correctIndexOf(item.itemId)), answer(item.itemId, wrongIndexOf(item.itemId))]);

      expect(first.body).toEqual(second.body);
      expect((await storedJourney()).placement.observations).toHaveLength(1);
    });

    test("an answer for an item that is no longer current changes nothing and returns the current item", async () => {
      await giveEstimate();
      const { item } = await finishPractice();

      const response = await answer("practice", 0);

      expect(response.statusCode).toBe(200);
      expect(response.body.item.itemId).toBe(item.itemId);
      expect((await storedJourney()).placement.observations).toEqual([]);
    });

    test("a request after placement is complete returns complete and writes nothing", async () => {
      await giveEstimate();
      const { view } = await playScoredItems("correct", "correct", "correct", "correct");
      const before = await storedJourney();

      const response = await answer("C1", 0);

      expect(view.status).toBe("complete");
      expect(response.body).toEqual({ status: "complete", item: null });
      expect(await storedJourney()).toEqual(before);
    });

    test("answering before placement started is rejected", async () => {
      await giveEstimate();

      const response = await answer("practice", 0);

      expect(response.statusCode).toBe(409);
      expect(response.body.errorCode).toBe("placement_not_started");
    });
  });

  describe("input validation", () => {
    test.each([undefined, "", "   ", 5, null])("rejects the item id %p", async (itemId) => {
      await giveEstimate();
      await start();

      for (const action of ["/answer", "/skip", "/instruction-help"]) {
        const response = await send(placementPath(owner.childId, action), { itemId, selectedSentenceIndex: 0 });

        expect(response.statusCode).toBe(400);
        expect(response.body.errorCode).toBe("placement_invalid_input");
      }
    });

    test.each(["1", 4, -1, 1.5, null, undefined])("rejects the sentence index %p without changing anything", async (index) => {
      await giveEstimate();
      const { item } = await finishPractice();

      const response = await answer(item.itemId, index);

      expect(response.statusCode).toBe(400);
      expect((await storedJourney()).placement.observations).toEqual([]);
    });
  });

  describe("ownership", () => {
    test.each([
      ["start", (target) => send(placementPath(target), undefined)],
      ["answer", (target) => send(placementPath(target, "/answer"), { itemId: "practice", selectedSentenceIndex: 0 })],
      ["skip", (target) => send(placementPath(target, "/skip"), { itemId: "practice" })],
      ["help", (target) => send(placementPath(target, "/instruction-help"), { itemId: "practice" })],
    ])("%s on another parent's child is the same 404 as an unknown child", async (_action, perform) => {
      const stranger = await createAuthenticatedParentWithChild(childFields);
      await giveEstimate();
      const asStranger = (childId) => perform(childId).set("Cookie", stranger.authCookie);

      const foreign = await asStranger(owner.childId);
      const unknown = await asStranger("64b7f0c2a1b2c3d4e5f60718");

      expect(foreign.statusCode).toBe(404);
      expect(foreign.body).toEqual(unknown.body);
      expect((await storedJourney()).placementStatus).toBe("not_started");
    });

    test("identity fields in the body cannot redirect the request to another child", async () => {
      const stranger = await createAuthenticatedParentWithChild(childFields);
      await giveEstimate();

      const response = await request(app)
        .post(placementPath(stranger.childId, "/answer"))
        .set("Cookie", stranger.authCookie)
        .send({ itemId: "practice", selectedSentenceIndex: 0, parentId: owner.parentId, childId: owner.childId });

      expect(response.statusCode).toBe(409);
      expect((await storedJourney()).placementStatus).toBe("not_started");
    });

    test("an archived child cannot start or continue placement", async () => {
      await giveEstimate();
      const { item } = await finishPractice();
      await parentRepository.archiveChild(owner.parentId, owner.childId);

      const startResponse = await start();
      const answerResponse = await answer(item.itemId, correctIndexOf(item.itemId));

      expect(startResponse.statusCode).toBe(404);
      expect(answerResponse.statusCode).toBe(404);
      expect((await storedJourney()).placement.observations).toEqual([]);
    });

    test("needs a login but not the parent zone, because the child plays it", async () => {
      await giveEstimate();

      const withoutLogin = await request(app).post(placementPath(owner.childId));
      const withLoginOnly = await start();

      expect(withoutLogin.statusCode).toBe(401);
      expect(withLoginOnly.statusCode).toBe(200);
    });

    test("a malformed child id is the same 404 as an unknown child", async () => {
      const malformed = await send(placementPath("not-an-object-id"), undefined);
      const unknown = await send(placementPath("64b7f0c2a1b2c3d4e5f60718"), undefined);

      expect(malformed.statusCode).toBe(404);
      expect(malformed.body).toEqual(unknown.body);
    });
  });
});

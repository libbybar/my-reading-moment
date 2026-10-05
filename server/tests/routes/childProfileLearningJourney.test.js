import request from "supertest";

import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild, buildParentZoneCookie } from "../support/testAuth.js";
import * as learningItemLifecycle from "../../src/services/learningItemLifecycle.js";
import LearningJourney from "../../src/models/LearningJourney.js";
import ActiveLearningItem from "../../src/models/ActiveLearningItem.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const childFields = {
  name: "גאיה",
  grammaticalGender: "female",
  learningProfile: { readingLevel: "beginner", interests: [] },
};

describe("learning journey routes", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  const path = (childId) => `/api/child-profiles/${childId}/learning-journey`;

  describe.each([
    ["short-pointed-texts", "A"],
    ["several-sentence-pointed-passages", "C"],
    ["longer-texts-reduced-nikud", "E"],
  ])("PUT with %s", (startingSignal, expectedBand) => {
    test(`seeds band ${expectedBand} and returns no numeric level`, async () => {
      const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);

      const response = await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        learningJourney: { startingSignal, anchorBand: expectedBand, placementStatus: "not_started" },
      });
    });
  });

  test("the parent may change the estimate again before placement starts, keeping one journey", async () => {
    const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);

    await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal: "short-pointed-texts" });
    const second = await request(app)
      .put(path(childId))
      .set("Cookie", cookie)
      .send({ startingSignal: "longer-texts-reduced-nikud" });

    expect(second.body.learningJourney.anchorBand).toBe("E");
    expect(await LearningJourney.countDocuments()).toBe(1);
  });

  test("returns 409 and keeps the seed once placement has started", async () => {
    const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);
    await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal: "short-pointed-texts" });
    await LearningJourney.updateOne({}, { placementStatus: "in_progress" });

    const response = await request(app)
      .put(path(childId))
      .set("Cookie", cookie)
      .send({ startingSignal: "longer-texts-reduced-nikud" });

    expect(response.statusCode).toBe(409);
    expect(response.body.errorCode).toBe("learning_journey_placement_started");
    expect((await LearningJourney.findOne()).seedBand).toBe("A");
  });

  test.each([undefined, "", "beginner", "A", "__proto__", "toString", 3])(
    "rejects the invalid starting signal %p with 400 and writes nothing",
    async (startingSignal) => {
      const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);

      const response = await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal });

      expect(response.statusCode).toBe(400);
      expect(response.body.errorCode).toBe("learning_journey_invalid_input");
      expect(await LearningJourney.countDocuments()).toBe(0);
    },
  );

  describe("GET", () => {
    test("returns null before an estimate exists", async () => {
      const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);

      const response = await request(app).get(path(childId)).set("Cookie", cookie);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ learningJourney: null });
    });

    test("prefers the provisional anchor over the seed once placement has set one", async () => {
      const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);
      await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal: "several-sentence-pointed-passages" });
      await LearningJourney.updateOne({}, { provisionalAnchorBand: "D", placementStatus: "complete" });

      const response = await request(app).get(path(childId)).set("Cookie", cookie);

      expect(response.body.learningJourney).toEqual({
        startingSignal: "several-sentence-pointed-passages",
        anchorBand: "D",
        placementStatus: "complete",
      });
    });
  });

  describe("ownership and the parent zone", () => {
    test.each(["get", "put"])("%s needs an unlocked parent zone", async (method) => {
      const { childId, authCookie } = await createAuthenticatedParentWithChild(childFields);

      const response = await request(app)[method](path(childId)).set("Cookie", authCookie).send({ startingSignal: "short-pointed-texts" });

      expect(response.statusCode).toBe(403);
      expect(response.body.errorCode).toBe("parent_zone_locked");
    });

    test.each(["get", "put"])("%s with a malformed child id is the same 404 as an unknown child", async (method) => {
      const { cookie } = await createAuthenticatedParentWithChild(childFields);
      const send = (childId) =>
        request(app)[method](path(childId)).set("Cookie", cookie).send({ startingSignal: "short-pointed-texts" });

      const malformed = await send("not-an-object-id");
      const unknown = await send("64b7f0c2a1b2c3d4e5f60718");

      expect(malformed.statusCode).toBe(404);
      expect(malformed.body).toEqual(unknown.body);
    });

    test.each(["get", "put"])("%s on another parent's child is indistinguishable from an unknown child", async (method) => {
      const owner = await createAuthenticatedParentWithChild(childFields);
      const stranger = await createAuthenticatedParentWithChild(childFields);
      const unknownChildId = "64b7f0c2a1b2c3d4e5f60718";
      const send = (childId) =>
        request(app)[method](path(childId)).set("Cookie", stranger.cookie).send({ startingSignal: "short-pointed-texts" });

      const foreign = await send(owner.childId);
      const unknown = await send(unknownChildId);

      expect(foreign.statusCode).toBe(404);
      expect(foreign.body).toEqual(unknown.body);
      expect(await LearningJourney.countDocuments()).toBe(0);
    });

    test("an archived child is not found", async () => {
      const { childId, cookie } = await createAuthenticatedParentWithChild(childFields);
      await request(app).delete(`/api/child-profiles/${childId}`).set("Cookie", cookie);

      const response = await request(app).put(path(childId)).set("Cookie", cookie).send({ startingSignal: "short-pointed-texts" });

      expect(response.statusCode).toBe(404);
      expect(await LearningJourney.countDocuments()).toBe(0);
    });

    test("a parent-zone session of another parent is refused", async () => {
      const owner = await createAuthenticatedParentWithChild(childFields);
      const other = await createAuthenticatedParentWithChild(childFields);

      const response = await request(app)
        .get(path(owner.childId))
        .set("Cookie", `${owner.authCookie}; ${buildParentZoneCookie(other.parentId)}`);

      expect(response.statusCode).toBe(403);
    });
  });

  test("archiving a child deletes its unfinished learning item", async () => {
    const { parentId, childId, cookie } = await createAuthenticatedParentWithChild(childFields);
    await learningItemLifecycle.startItem({
      parentId,
      childId,
      missionId: "explicit-detail",
      band: "C",
      contentFingerprint: "fingerprint",
      variationSignature: "signature",
      item: {},
    });

    const response = await request(app).delete(`/api/child-profiles/${childId}`).set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(await ActiveLearningItem.countDocuments()).toBe(0);
  });
});

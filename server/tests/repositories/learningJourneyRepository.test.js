import mongoose from "mongoose";

import * as learningJourneyRepository from "../../src/repositories/learningJourneyRepository.js";
import LearningJourney from "../../src/models/LearningJourney.js";
import * as testDb from "../support/testDb.js";

const newId = () => new mongoose.Types.ObjectId();

describe("learningJourneyRepository", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  const seed = (ids, startingSignal = "short-pointed-texts", seedBand = "A") =>
    learningJourneyRepository.saveSeed({ ...ids, startingSignal, seedBand });

  test("creates a journey that has not started placement and has no anchor yet", async () => {
    const ids = { parentId: newId(), childId: newId() };

    const { ok, journey } = await seed(ids);

    expect(ok).toBe(true);
    expect(journey).toMatchObject({ seedBand: "A", placementStatus: "not_started", provisionalAnchorBand: null });
  });

  test("concurrent first saves both succeed and leave one journey, since placement has not started", async () => {
    const ids = { parentId: newId(), childId: newId() };

    const results = await Promise.all([seed(ids), seed(ids, "longer-texts-reduced-nikud", "E")]);

    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(await LearningJourney.countDocuments()).toBe(1);
  });

  test("a save after placement has started is refused and changes nothing", async () => {
    const ids = { parentId: newId(), childId: newId() };
    await seed(ids);
    await LearningJourney.updateOne(ids, { placementStatus: "in_progress" });

    const result = await seed(ids, "longer-texts-reduced-nikud", "E");

    expect(result).toEqual({ ok: false, reason: "placement_started" });
    expect((await LearningJourney.findOne(ids)).seedBand).toBe("A");
  });

  test("findByChild is scoped by both parent and child", async () => {
    const ids = { parentId: newId(), childId: newId() };
    await seed(ids);

    expect(await learningJourneyRepository.findByChild({ parentId: newId(), childId: ids.childId })).toBeNull();
    expect(await learningJourneyRepository.findByChild(ids)).not.toBeNull();
  });

  test("rejects a band outside the catalog", async () => {
    await expect(seed({ parentId: newId(), childId: newId() }, "short-pointed-texts", "Z")).rejects.toThrow();
  });
});

import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import * as textResultRepository from "../../src/repositories/textResultRepository.js";
import TextResult from "../../src/models/TextResult.js";
import * as testDb from "../support/testDb.js";

function newId() {
  return new mongoose.Types.ObjectId();
}

function baseFields(overrides = {}) {
  return {
    sessionId: randomUUID(),
    parentId: newId(),
    childId: newId(),
    level: 2,
    sublevel: 3,
    specVersion: 1,
    result: "success",
    startedAt: new Date("2026-01-01T10:00:00Z"),
    completedAt: new Date("2026-01-01T10:05:00Z"),
    ...overrides,
  };
}

describe("textResultRepository", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  describe("create", () => {
    test("persists a valid TextResult and returns it", async () => {
      const fields = baseFields({ evidence: { questionsTotal: 1, questionsCorrect: 1 } });

      const created = await textResultRepository.create(fields);

      expect(created._id).toBeDefined();

      const stored = await TextResult.findById(created._id);

      expect(stored).toMatchObject({
        level: 2,
        sublevel: 3,
        specVersion: 1,
        result: "success",
      });
      expect(stored.evidence).toMatchObject({ questionsTotal: 1, questionsCorrect: 1 });
    });

    test("rejects an invalid result value", async () => {
      await expect(textResultRepository.create(baseFields({ result: "maybe" }))).rejects.toThrow();
    });

    test("rejects a level outside the 1-4 range", async () => {
      await expect(textResultRepository.create(baseFields({ level: 5 }))).rejects.toThrow();
    });

    test("rejects a second TextResult for the same sessionId (durable once-only completion)", async () => {
      const sessionId = randomUUID();

      await textResultRepository.create(baseFields({ sessionId }));

      await expect(textResultRepository.create(baseFields({ sessionId }))).rejects.toThrow();
    });
  });

  describe("findRecentRaw", () => {
    test("returns results ordered most-recent-first, limited, scoped to the exact child/level/sublevel", async () => {
      const parentId = newId();
      const childId = newId();
      const otherChildId = newId();

      await textResultRepository.create(
        baseFields({ parentId, childId, completedAt: new Date("2026-01-01T10:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, completedAt: new Date("2026-01-02T10:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, completedAt: new Date("2026-01-03T10:00:00Z") }),
      );
      // Different child, different sublevel, different parent: must never leak into the results.
      await textResultRepository.create(baseFields({ parentId, childId: otherChildId }));
      await textResultRepository.create(baseFields({ parentId, childId, sublevel: 1 }));
      await textResultRepository.create(baseFields({ parentId: newId(), childId }));

      const results = await textResultRepository.findRecentRaw({
        parentId,
        childId,
        level: 2,
        sublevel: 3,
        limit: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0].completedAt.toISOString()).toBe("2026-01-03T10:00:00.000Z");
      expect(results[1].completedAt.toISOString()).toBe("2026-01-02T10:00:00.000Z");
    });

    test("includes skipped results", async () => {
      const parentId = newId();
      const childId = newId();

      await textResultRepository.create(baseFields({ parentId, childId, result: "skipped" }));

      const results = await textResultRepository.findRecentRaw({
        parentId,
        childId,
        level: 2,
        sublevel: 3,
        limit: 2,
      });

      expect(results).toHaveLength(1);
      expect(results[0].result).toBe("skipped");
    });
  });

  describe("findRecentNonSkipped", () => {
    test("excludes skipped results entirely, keeping recency order among the rest", async () => {
      const parentId = newId();
      const childId = newId();

      // success -> skip -> success -> success -> failure (oldest to newest)
      await textResultRepository.create(
        baseFields({ parentId, childId, result: "success", completedAt: new Date("2026-01-01T00:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, result: "skipped", completedAt: new Date("2026-01-02T00:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, result: "success", completedAt: new Date("2026-01-03T00:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, result: "success", completedAt: new Date("2026-01-04T00:00:00Z") }),
      );
      await textResultRepository.create(
        baseFields({ parentId, childId, result: "failure", completedAt: new Date("2026-01-05T00:00:00Z") }),
      );

      const results = await textResultRepository.findRecentNonSkipped({
        parentId,
        childId,
        level: 2,
        sublevel: 3,
        limit: 4,
      });

      expect(results.map((entry) => entry.result)).toEqual(["failure", "success", "success", "success"]);
    });
  });

  test("has the compound indexes Progression's queries rely on", async () => {
    const indexes = await TextResult.collection.getIndexes({ full: true });
    const compoundIndexes = indexes.filter((index) =>
      Object.keys(index.key).join(",") === "parentId,childId,level,sublevel,completedAt",
    );

    expect(compoundIndexes).toHaveLength(2);
    expect(compoundIndexes.some((index) => !index.partialFilterExpression)).toBe(true);
    expect(
      compoundIndexes.some(
        (index) =>
          index.partialFilterExpression &&
          JSON.stringify(index.partialFilterExpression.result) === JSON.stringify({ $in: ["success", "failure"] }),
      ),
    ).toBe(true);
  });

  test("has a unique index on sessionId", async () => {
    const indexes = await TextResult.collection.getIndexes({ full: true });
    const sessionIdIndex = indexes.find((index) => Object.keys(index.key).join(",") === "sessionId");

    expect(sessionIdIndex).toMatchObject({ unique: true });
  });
});

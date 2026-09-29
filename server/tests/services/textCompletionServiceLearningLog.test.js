// completeText's product-event log (writeLearningLog) must fire on both the
// normal completion path and the alreadyCompleted replay path, and must never
// carry passage/question/answer content — see debugLogger.js's writeLearningLog.
import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

const debugLogger = {
  writeLearningLog: jest.fn(),
};

jest.unstable_mockModule("../../src/services/debugLogger.js", () => debugLogger);

const { completeText } = await import("../../src/services/textCompletionService.js");
const parentRepository = await import("../../src/repositories/parentRepository.js");
const textResultRepository = await import("../../src/repositories/textResultRepository.js");
const testDb = await import("../support/testDb.js");

describe("textCompletionService.completeText — writeLearningLog", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.clearAllMocks();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  async function createChild({ currentLevel = 2, currentSublevel = 2 } = {}) {
    const parent = await parentRepository.create({
      email: "parent@example.com",
      passwordHash: "hash",
      children: [
        {
          name: "Test Child",
          grammaticalGender: "female",
          learningProfile: { readingLevel: "beginner", interests: [], currentLevel, currentSublevel },
        },
      ],
    });

    return { parentId: parent._id, childId: parent.children[0]._id };
  }

  test("logs the completion outcome as metadata only, with no passage/question/answer content", async () => {
    const { parentId, childId } = await createChild();
    const sessionId = randomUUID();

    await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
      evidence: { questionsTotal: 1, questionsCorrect: 1 },
    });

    expect(debugLogger.writeLearningLog).toHaveBeenCalledTimes(1);
    const entry = debugLogger.writeLearningLog.mock.calls[0][0];

    expect(entry).toMatchObject({
      tag: "Learning",
      sessionId,
      level: 2,
      sublevel: 2,
      result: "success",
      evidence: { questionsTotal: 1, questionsCorrect: 1 },
      journeyProgressIncremented: true,
      progressionChanged: false,
      newLevel: null,
      newSublevel: null,
      alreadyCompleted: false,
    });
    expect(String(entry.parentId)).toBe(String(parentId));
    expect(String(entry.childId)).toBe(String(childId));

    const forbiddenKeys = ["passage", "question", "answerText", "text", "prompt", "expectedMeaning"];
    expect(Object.keys(entry)).not.toEqual(expect.arrayContaining(forbiddenKeys));
  });

  test("whitelists evidence to questionsTotal/questionsCorrect only, dropping any unexpected field", async () => {
    const { parentId, childId } = await createChild();

    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
      evidence: { questionsTotal: 3, questionsCorrect: 2, passageText: "should never be logged" },
    });

    const entry = debugLogger.writeLearningLog.mock.calls[0][0];
    expect(entry.evidence).toEqual({ questionsTotal: 3, questionsCorrect: 2 });
  });

  test("logs evidence: null when completeText is called with no evidence (the /skip case)", async () => {
    const { parentId, childId } = await createChild();

    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "skipped",
      startedAt: new Date(),
    });

    const entry = debugLogger.writeLearningLog.mock.calls[0][0];
    expect(entry.evidence).toBeNull();
  });

  test("logs progressionChanged/newLevel/newSublevel when the success-threshold rule fires", async () => {
    const { parentId, childId } = await createChild({ currentLevel: 2, currentSublevel: 2 });

    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      specVersion: 1,
      result: "success",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      completedAt: new Date("2026-01-01T00:05:00Z"),
    });
    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      specVersion: 1,
      result: "failure",
      startedAt: new Date("2026-01-02T00:00:00Z"),
      completedAt: new Date("2026-01-02T00:05:00Z"),
    });
    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      specVersion: 1,
      result: "success",
      startedAt: new Date("2026-01-03T00:00:00Z"),
      completedAt: new Date("2026-01-03T00:05:00Z"),
    });

    // The 4th: 3 of the last 4 are success -> triggers the level-up rule.
    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date("2026-01-04T00:00:00Z"),
    });

    const entry = debugLogger.writeLearningLog.mock.calls[0][0];
    expect(entry).toMatchObject({ progressionChanged: true, newLevel: 2, newSublevel: 3 });
  });

  test("logs a minimal replay entry, with no evidence/progression fields, on a duplicate-key retry", async () => {
    const { parentId, childId } = await createChild();
    const sessionId = randomUUID();

    await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
    });
    debugLogger.writeLearningLog.mockClear();

    await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
    });

    expect(debugLogger.writeLearningLog).toHaveBeenCalledTimes(1);
    const entry = debugLogger.writeLearningLog.mock.calls[0][0];

    expect(entry).toMatchObject({
      tag: "Learning",
      sessionId,
      result: "success",
      alreadyCompleted: true,
    });
    expect(entry).not.toHaveProperty("evidence");
    expect(entry).not.toHaveProperty("progressionChanged");
    expect(entry).not.toHaveProperty("journeyProgressIncremented");
  });

  test("replay entry is built from the canonical TextResult, not the retry request's own (possibly mismatched) params", async () => {
    const { parentId, childId } = await createChild();
    const sessionId = randomUUID();

    await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
    });
    debugLogger.writeLearningLog.mockClear();

    // A retry that (hypothetically) disagrees with what was actually committed —
    // the log must reflect the canonical record, never these request params.
    await completeText({
      sessionId,
      parentId,
      childId,
      level: 3,
      sublevel: 1,
      result: "failure",
      startedAt: new Date(),
    });

    const entry = debugLogger.writeLearningLog.mock.calls[0][0];
    expect(entry).toMatchObject({ level: 2, sublevel: 2, result: "success", alreadyCompleted: true });
    expect(String(entry.parentId)).toBe(String(parentId));
    expect(String(entry.childId)).toBe(String(childId));
  });

  test("does not log at all when the transaction fails before completion", async () => {
    const { parentId, childId } = await createChild();

    await expect(
      completeText({
        sessionId: randomUUID(),
        parentId,
        childId,
        level: 2,
        sublevel: 2,
        result: "not-a-real-result",
        startedAt: new Date(),
      }),
    ).rejects.toThrow();

    expect(debugLogger.writeLearningLog).not.toHaveBeenCalled();
  });
});

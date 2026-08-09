import { randomUUID } from "node:crypto";
import { completeText } from "../../src/services/textCompletionService.js";
import * as parentRepository from "../../src/repositories/parentRepository.js";
import * as textResultRepository from "../../src/repositories/textResultRepository.js";
import TextResult from "../../src/models/TextResult.js";
import Parent from "../../src/models/Parent.js";
import * as testDb from "../support/testDb.js";

describe("textCompletionService.completeText", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
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

  test("writes a TextResult with the given sessionId/level/sublevel/specVersion", async () => {
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

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ sessionId, level: 2, sublevel: 2, specVersion: 1, result: "success" });
  });

  test("writes the given learningEvent atomically with the TextResult", async () => {
    const { parentId, childId } = await createChild();

    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
      learningEvent: {
        type: "answer_attempt",
        source: "system",
        payload: { questionId: "q1", isCorrect: true },
      },
    });

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.learningEvents).toHaveLength(1);
    expect(child.learningEvents[0]).toMatchObject({
      type: "answer_attempt",
      source: "system",
      payload: { questionId: "q1", isCorrect: true },
    });
  });

  test("writes no learningEvent when none is given (the /skip case)", async () => {
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

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.learningEvents).toHaveLength(0);
  });

  test("a second completion for the same sessionId with a matching result is idempotent, not a fatal error", async () => {
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
      learningEvent: { type: "answer_attempt", source: "system", payload: { questionId: "q1", isCorrect: true } },
    });

    const replay = await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
      learningEvent: { type: "answer_attempt", source: "system", payload: { questionId: "q1", isCorrect: true } },
    });

    expect(replay).toMatchObject({ result: "success", alreadyCompleted: true });

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);

    const child = (await Parent.findById(parentId)).children.id(childId);
    // Not double-counted: only the first attempt's writes actually happened.
    expect(child.journeyProgress).toBe(1);
    expect(child.learningEvents).toHaveLength(1);
  });

  test("a second completion for the same sessionId with a conflicting result makes no further writes and returns the canonical outcome", async () => {
    const { parentId, childId } = await createChild();
    const sessionId = randomUUID();

    await completeText({ sessionId, parentId, childId, level: 2, sublevel: 2, result: "success", startedAt: new Date() });

    const replay = await completeText({
      sessionId,
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "failure",
      startedAt: new Date(),
      learningEvent: { type: "answer_attempt", source: "system", payload: { questionId: "q1", isCorrect: false } },
    });

    // The canonical (first-committed) result wins — never what the retry attempted.
    expect(replay).toMatchObject({ result: "success", alreadyCompleted: true });

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe("success");

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.journeyProgress).toBe(1);
    expect(child.learningEvents).toHaveLength(0);
  });

  test("increments journeyProgress (completedStepCount) only on success", async () => {
    const { parentId, childId } = await createChild();

    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "failure",
      startedAt: new Date(),
    });
    let child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.journeyProgress).toBe(0);

    await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date(),
    });
    child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.journeyProgress).toBe(1);
  });

  test("advances currentLevel/currentSublevel when the success rule fires, atomically with the 4th TextResult", async () => {
    const { parentId, childId } = await createChild({ currentLevel: 2, currentSublevel: 2 });

    // Pre-seed 2 prior successes directly (not through completeText, to control the window precisely).
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

    // The 4th: 3 of the last 4 are success -> should trigger the level-up rule.
    const { progressionOutcome } = await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "success",
      startedAt: new Date("2026-01-04T00:00:00Z"),
    });

    expect(progressionOutcome).toMatchObject({ level: 2, sublevel: 3, changed: true, reason: "success_threshold" });

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.learningProfile.currentLevel).toBe(2);
    expect(child.learningProfile.currentSublevel).toBe(3);
    expect(child.journeyProgress).toBe(1);
  });

  test("does not update currentLevel/currentSublevel when progression does not change", async () => {
    const { parentId, childId } = await createChild({ currentLevel: 2, currentSublevel: 2 });

    const { progressionOutcome } = await completeText({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 2,
      sublevel: 2,
      result: "failure",
      startedAt: new Date(),
    });

    expect(progressionOutcome.changed).toBe(false);

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.learningProfile.currentLevel).toBe(2);
    expect(child.learningProfile.currentSublevel).toBe(2);
  });

  test("commits nothing at all — not TextResult, not the learningEvent, not journeyProgress — when the transaction fails partway through", async () => {
    const { parentId, childId } = await createChild();

    await expect(
      completeText({
        sessionId: randomUUID(),
        parentId,
        childId,
        level: 2,
        sublevel: 2,
        // Invalid enum value — fails TextResult's own schema validation, the
        // very first write inside the transaction.
        result: "not-a-real-result",
        startedAt: new Date(),
        learningEvent: {
          type: "answer_attempt",
          source: "system",
          payload: { questionId: "q1", isCorrect: false },
        },
      }),
    ).rejects.toThrow();

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(0);

    const child = (await Parent.findById(parentId)).children.id(childId);
    expect(child.journeyProgress).toBe(0);
    expect(child.learningEvents).toHaveLength(0);
  });

  test("never commits an orphan TextResult when the parent/child no longer exists (success path, with a learningEvent)", async () => {
    const { parentId, childId } = await createChild();
    await Parent.deleteOne({ _id: parentId });

    await expect(
      completeText({
        sessionId: randomUUID(),
        parentId,
        childId,
        level: 2,
        sublevel: 2,
        result: "success",
        startedAt: new Date(),
        learningEvent: {
          type: "answer_attempt",
          source: "system",
          payload: { questionId: "q1", isCorrect: true },
        },
      }),
    ).rejects.toThrow();

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(0);
  });

  test("never commits an orphan TextResult when the parent/child no longer exists (failure path, nothing to apply, no learningEvent)", async () => {
    const { parentId, childId } = await createChild();
    await Parent.deleteOne({ _id: parentId });

    // result: "failure" with no progression change means applyTextCompletionProgress
    // has nothing to $inc/$set — exactly the ambiguous case that used to slip past
    // an existence check entirely (see parentRepository.test.js).
    await expect(
      completeText({
        sessionId: randomUUID(),
        parentId,
        childId,
        level: 2,
        sublevel: 2,
        result: "failure",
        startedAt: new Date(),
      }),
    ).rejects.toThrow();

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(0);
  });
});

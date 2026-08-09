import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  evaluateAnswer: jest.fn(),
};

jest.unstable_mockModule("../../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../../src/app.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const { default: Parent } = await import("../../src/models/Parent.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

// addLearningEvent is a real, required DB write now (see CLAUDE.md: recording
// a learning event is not best-effort), so this file needs a real parent/child
// to write against, not just a stubbed provider.
async function seedSession() {
  const { parentId, childId } = await createAuthenticatedParentWithChild({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

  const session = readingSessionStore.createSession({
    passage: { id: "test-passage-1", title: "Title", text: "Text", readingLevel: "beginner" },
    currentQuestion: {
      id: "test-question-1",
      passageId: "test-passage-1",
      prompt: "Stub prompt?",
      expectedMeaning: "Stub meaning",
    },
    askedQuestionIds: ["test-question-1"],
    parentId,
    childId,
  });

  return { ...session, parentId, childId };
}

const answerFailureBody = { error: "Failed to evaluate the answer" };

function expectAnswerFailure(response) {
  expect(response.statusCode).toBe(500);
  expect(response.body).toEqual(answerFailureBody);
  expect(JSON.stringify(response.body)).not.toContain("provider exploded");
}

describe("POST /api/reading-sessions/answers (provider integration)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.resetAllMocks();
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  test("returns an error response when the provider rejects", async () => {
    const session = await seedSession();
    llmProvider.evaluateAnswer.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: session.sessionId,
      answerText: "some answer",
    });

    expectAnswerFailure(response);
  });

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
    const session = await seedSession();
    llmProvider.evaluateAnswer.mockResolvedValue({
      questionId: session.currentQuestion.id,
      isCorrect: false,
      feedbackType: "retry",
    });

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: session.sessionId,
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      questionId: session.currentQuestion.id,
      isCorrect: false,
      feedbackType: "retry",
      textOutcome: "continues",
    });

    const parent = await Parent.findById(session.parentId);
    const child = parent.children.id(session.childId);

    expect(child.learningEvents).toHaveLength(1);
    expect(child.learningEvents[0]).toMatchObject({
      type: "answer_attempt",
      source: "system",
      payload: { questionId: session.currentQuestion.id, isCorrect: false },
    });
  });

  test("fails, without recording an incorrect attempt, when the child no longer exists on the non-terminal path", async () => {
    const session = await seedSession();
    llmProvider.evaluateAnswer.mockResolvedValue({
      questionId: session.currentQuestion.id,
      isCorrect: false,
      feedbackType: "retry",
    });

    await Parent.deleteOne({ _id: session.parentId });

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: session.sessionId,
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to evaluate the answer" });

    // The failed write must never be treated as if it happened: no incorrect
    // attempt recorded, and the session released back to active (not stuck
    // locked), so a legitimate retry isn't permanently blocked.
    const storedSession = readingSessionStore.getSession(session.sessionId);
    expect(storedSession.incorrectAttemptCount).toBe(0);
    expect(storedSession.state).toBe("active");
  });

  test.each([
    ["missing questionId", { isCorrect: true, feedbackType: "correct" }],
    ["non-string questionId", { questionId: 123, isCorrect: true, feedbackType: "correct" }],
    ["empty questionId", { questionId: "", isCorrect: true, feedbackType: "correct" }],
    [
      "mismatched questionId",
      { questionId: "some-other-question-id", isCorrect: true, feedbackType: "correct" },
    ],
    ["non-boolean isCorrect", { questionId: "q1", isCorrect: "yes", feedbackType: "correct" }],
    ["invalid feedbackType", { questionId: "q1", isCorrect: true, feedbackType: "great" }],
    [
      "feedbackType inconsistent with isCorrect",
      { questionId: "q1", isCorrect: true, feedbackType: "retry" },
    ],
  ])(
    "returns a stable error response for a malformed evaluation result (%s)",
    async (_label, malformedResult) => {
      const session = await seedSession();
      llmProvider.evaluateAnswer.mockResolvedValue(malformedResult);

      const response = await request(app).post("/api/reading-sessions/answers").send({
        sessionId: session.sessionId,
        answerText: "some answer",
      });

      expectAnswerFailure(response);
    },
  );
});

jest.mock("../src/services/llmProvider");

const request = require("supertest");
const app = require("../src/app");
const llmProvider = require("../src/services/llmProvider");
const readingSessionStore = require("../src/services/readingSessionStore");

function seedSession() {
  return readingSessionStore.createSession({
    passage: { id: "test-passage-1", title: "Title", text: "Text", readingLevel: "beginner" },
    currentQuestion: {
      id: "test-question-1",
      passageId: "test-passage-1",
      prompt: "Stub prompt?",
      expectedMeaning: "Stub meaning",
    },
    askedQuestionIds: ["test-question-1"],
  });
}

describe("POST /api/reading-sessions/answers (provider integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
    readingSessionStore.clearSessions();
  });

  test("returns an error response when the provider rejects", async () => {
    const session = seedSession();
    llmProvider.evaluateAnswer.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: session.sessionId,
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
    const session = seedSession();
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
    });
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
      const session = seedSession();
      llmProvider.evaluateAnswer.mockResolvedValue(malformedResult);

      const response = await request(app).post("/api/reading-sessions/answers").send({
        sessionId: session.sessionId,
        answerText: "some answer",
      });

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: expect.any(String) });
    },
  );
});

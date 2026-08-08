import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../src/app.js");
const { default: readingSessionStore } = await import("../src/services/readingSessionStore.js");

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

const nextQuestionFailureBody = { error: "Failed to generate the next reading question" };

function expectNextQuestionFailure(response) {
  expect(response.statusCode).toBe(500);
  expect(response.body).toEqual(nextQuestionFailureBody);
  expect(JSON.stringify(response.body)).not.toContain("provider exploded");
  expect(JSON.stringify(response.body)).not.toContain("unexpected-status");
}

describe("POST /api/reading-sessions/next-question (provider integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
    readingSessionStore.clearSessions();
  });

  test("returns an error response when the provider rejects, without changing the session", async () => {
    const session = seedSession();
    const sessionBefore = readingSessionStore.getSession(session.sessionId);
    llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expectNextQuestionFailure(response);

    const sessionAfter = readingSessionStore.getSession(session.sessionId);
    expect(sessionAfter.currentQuestion).toEqual(sessionBefore.currentQuestion);
    expect(sessionAfter.askedQuestionIds).toEqual(sessionBefore.askedQuestionIds);
  });

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
    const session = seedSession();
    llmProvider.generateQuestion.mockResolvedValue({
      status: "ok",
      question: {
        id: "stub-next-question",
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
        expectedMeaning: "This must never reach the response",
      },
    });

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      question: {
        id: "stub-next-question",
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
      },
    });
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("passes the session's own passage and askedQuestionIds to the provider", async () => {
    const session = seedSession();
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expect(llmProvider.generateQuestion).toHaveBeenCalledWith({
      passage: session.passage,
      askedQuestionIds: session.askedQuestionIds,
    });
  });

  test("returns a null question when the provider reports an exhausted question set, without changing the session", async () => {
    const session = seedSession();
    const sessionBefore = readingSessionStore.getSession(session.sessionId);
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ question: null });

    const sessionAfter = readingSessionStore.getSession(session.sessionId);
    expect(sessionAfter.currentQuestion).toEqual(sessionBefore.currentQuestion);
    expect(sessionAfter.askedQuestionIds).toEqual(sessionBefore.askedQuestionIds);
  });

  test("returns a stable error response when the provider returns an unexpected status, without changing the session", async () => {
    const session = seedSession();
    const sessionBefore = readingSessionStore.getSession(session.sessionId);
    llmProvider.generateQuestion.mockResolvedValue({ status: "unexpected-status" });

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expectNextQuestionFailure(response);

    const sessionAfter = readingSessionStore.getSession(session.sessionId);
    expect(sessionAfter.currentQuestion).toEqual(sessionBefore.currentQuestion);
    expect(sessionAfter.askedQuestionIds).toEqual(sessionBefore.askedQuestionIds);
  });

  test.each([
    [
      "a repeated question id (already asked)",
      {
        id: "test-question-1",
        passageId: "test-passage-1",
        prompt: "Repeated prompt?",
        expectedMeaning: "Repeated meaning",
      },
    ],
    [
      "a mismatched passageId",
      {
        id: "stub-next-question",
        passageId: "some-other-passage",
        prompt: "Stub next prompt?",
        expectedMeaning: "Stub next meaning",
      },
    ],
    [
      "a missing id",
      {
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
        expectedMeaning: "Stub next meaning",
      },
    ],
    [
      "a missing prompt",
      {
        id: "stub-next-question",
        passageId: "test-passage-1",
        expectedMeaning: "Stub next meaning",
      },
    ],
    [
      "a missing expectedMeaning",
      {
        id: "stub-next-question",
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
      },
    ],
    ["a question that is not an object", "not-a-question"],
    [
      "a whitespace-only id",
      {
        id: "   ",
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
        expectedMeaning: "Stub next meaning",
      },
    ],
    [
      "a whitespace-only prompt",
      {
        id: "stub-next-question",
        passageId: "test-passage-1",
        prompt: "   ",
        expectedMeaning: "Stub next meaning",
      },
    ],
    [
      "a whitespace-only expectedMeaning",
      {
        id: "stub-next-question",
        passageId: "test-passage-1",
        prompt: "Stub next prompt?",
        expectedMeaning: "   ",
      },
    ],
  ])(
    "returns a stable error response and leaves the session unchanged for %s",
    async (_label, malformedQuestion) => {
      const session = seedSession();
      const sessionBefore = readingSessionStore.getSession(session.sessionId);
      llmProvider.generateQuestion.mockResolvedValue({
        status: "ok",
        question: malformedQuestion,
      });

      const response = await request(app)
        .post("/api/reading-sessions/next-question")
        .send({ sessionId: session.sessionId });

      expectNextQuestionFailure(response);

      const sessionAfter = readingSessionStore.getSession(session.sessionId);
      expect(sessionAfter.currentQuestion).toEqual(sessionBefore.currentQuestion);
      expect(sessionAfter.askedQuestionIds).toEqual(sessionBefore.askedQuestionIds);
    },
  );

  test("updates the session's current question via replaceCurrentQuestion on success", async () => {
    const session = seedSession();
    const newQuestion = {
      id: "stub-next-question",
      passageId: "test-passage-1",
      prompt: "Stub next prompt?",
      expectedMeaning: "Stub next meaning",
    };
    llmProvider.generateQuestion.mockResolvedValue({ status: "ok", question: newQuestion });

    await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    const updatedSession = readingSessionStore.getSession(session.sessionId);

    expect(updatedSession.currentQuestion).toEqual(newQuestion);
    expect(updatedSession.askedQuestionIds).toContain(newQuestion.id);
  });
});

import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  generatePassageStream: jest.fn(),
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../../src/app.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");
const { getFinalEvent, passageStreamOf } = await import("../support/readingSessions.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const validPassage = {
  id: "stub-passage",
  title: "Stub Passage Title",
  text: "Stub passage text that does not exist in mockPassages.",
  level: 1,
  sublevel: 1,
};

const validQuestion = {
  id: "stub-question",
  passageId: "stub-passage",
  prompt: "Stub prompt?",
  expectedMeaning: "This must never reach the response",
};

const questionFailureBody = {
  error: "Failed to generate the reading question",
  errorCode: "reading_session_question_failed",
};

function expectQuestionFailure(response) {
  expect(response.statusCode).toBe(500);
  expect(response.body).toEqual(questionFailureBody);
  expect(JSON.stringify(response.body)).not.toContain("provider exploded");
}

// No-pending-generation branch: seeded directly on the store (bypassing
// /preview entirely, same pattern readingSessionsNextQuestionProvider.test.js
// already uses), so there is genuinely no in-flight background promise for
// /question to await — it must attempt exactly one fresh generation itself.
function seedPendingSession({ parentId, childId }) {
  return readingSessionStore.createSession({
    // Same id as validPassage, so validQuestion's passageId lines up whether
    // the session came from this direct seed or from a real /preview call.
    passage: { id: "stub-passage", title: "Title", text: "Text", level: 1, sublevel: 1 },
    currentQuestion: null,
    askedQuestionIds: [],
    parentId,
    childId,
    level: 1,
    sublevel: 1,
  });
}

function pendingPromise() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("POST /api/reading-sessions/question (provider integration)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  async function createChildAndCookie() {
    return createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
  }

  describe("no generation in flight — one fresh attempt", () => {
    test("returns an error response when the provider rejects, without changing the session", async () => {
      const { parentId, childId } = await createChildAndCookie();
      const session = seedPendingSession({ parentId, childId });
      llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"));

      const response = await request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: session.sessionId });

      expectQuestionFailure(response);
      expect(readingSessionStore.getSession(session.sessionId).currentQuestion).toBeNull();
    });

    test("returns a stable error response when the provider reports an exhausted question set", async () => {
      // Exhaustion on the very first question is a mock-only edge case, but
      // /question treats it the same as any other failure to get a question —
      // there is no synchronous "no session created" escape hatch anymore
      // (see readingSessionRoutes.js), so it must not leak a bare {question:
      // null} the way /next-question's own, distinct exhaustion case does.
      const { parentId, childId } = await createChildAndCookie();
      const session = seedPendingSession({ parentId, childId });
      llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

      const response = await request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: session.sessionId });

      expectQuestionFailure(response);
    });

    test("returns a stable error response for a malformed question, without changing the session", async () => {
      const { parentId, childId } = await createChildAndCookie();
      const session = seedPendingSession({ parentId, childId });
      llmProvider.generateQuestion.mockResolvedValue({
        status: "ok",
        question: { id: "stub-question", passageId: "some-other-passage" },
      });

      const response = await request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: session.sessionId });

      expectQuestionFailure(response);
      expect(readingSessionStore.getSession(session.sessionId).currentQuestion).toBeNull();
    });

    test("passes the session's own passage and askedQuestionIds to the provider", async () => {
      const { parentId, childId } = await createChildAndCookie();
      const session = seedPendingSession({ parentId, childId });
      llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

      await request(app).post("/api/reading-sessions/question").send({ sessionId: session.sessionId });

      expect(llmProvider.generateQuestion).toHaveBeenCalledWith({
        passage: session.passage,
        askedQuestionIds: session.askedQuestionIds,
      });
    });

    test("builds its response purely from whatever the provider returns and writes it via replaceCurrentQuestion", async () => {
      const { parentId, childId } = await createChildAndCookie();
      const session = seedPendingSession({ parentId, childId });
      llmProvider.generateQuestion.mockResolvedValue({ status: "ok", question: validQuestion });

      const response = await request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: session.sessionId });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        question: { id: validQuestion.id, passageId: validQuestion.passageId, prompt: validQuestion.prompt },
      });
      expect(response.body.question).not.toHaveProperty("expectedMeaning");

      const updatedSession = readingSessionStore.getSession(session.sessionId);
      expect(updatedSession.currentQuestion).toEqual(validQuestion);
      expect(updatedSession.askedQuestionIds).toContain(validQuestion.id);
    });
  });

  describe("generation already in flight (kicked off by /preview)", () => {
    test("awaits it and returns the resolved question, without a second provider call", async () => {
      const { childId, cookie } = await createChildAndCookie();
      llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));

      const inFlight = pendingPromise();
      let onCalled;
      const calledPromise = new Promise((resolve) => {
        onCalled = resolve;
      });

      llmProvider.generateQuestion.mockImplementationOnce(() => {
        onCalled();
        return inFlight.promise;
      });

      const previewResponse = await request(app)
        .post("/api/reading-sessions/preview")
        .set("Cookie", [cookie])
        .send({ childId });

      await calledPromise; // the background generation has genuinely started

      const questionRequestPromise = request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: getFinalEvent(previewResponse.text).sessionId })
        .then((res) => res);

      inFlight.resolve({ status: "ok", question: validQuestion });

      const questionResponse = await questionRequestPromise;

      expect(questionResponse.statusCode).toBe(200);
      expect(questionResponse.body.question.id).toBe(validQuestion.id);
      expect(llmProvider.generateQuestion).toHaveBeenCalledTimes(1);
    });

    test("surfaces a clean error when it fails, and a later call retries with a fresh generation", async () => {
      const { childId, cookie } = await createChildAndCookie();
      llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));

      const inFlight = pendingPromise();
      let onGenerateQuestionCalled;
      const generateQuestionCalledPromise = new Promise((resolve) => {
        onGenerateQuestionCalled = resolve;
      });

      llmProvider.generateQuestion.mockImplementationOnce(() => {
        onGenerateQuestionCalled();
        return inFlight.promise;
      });

      const previewResponse = await request(app)
        .post("/api/reading-sessions/preview")
        .set("Cookie", [cookie])
        .send({ childId });

      await generateQuestionCalledPromise; // the background generation has genuinely started

      // /question claims the session (synchronously) before it ever checks
      // whether a generation is pending, with no await in between — so
      // waiting for that claim proves the handler has already read the
      // still-pending map entry and is now genuinely awaiting it, without
      // guessing at event-loop timing (the map's own cleanup, scheduled off
      // the background promise's settlement, would otherwise likely race
      // ahead of the real HTTP round-trip and beat us to it).
      const originalTryClaimSession = readingSessionStore.tryClaimSession.bind(readingSessionStore);
      let onClaimed;
      const claimedPromise = new Promise((resolve) => {
        onClaimed = resolve;
      });

      jest.spyOn(readingSessionStore, "tryClaimSession").mockImplementation((sessionId) => {
        const result = originalTryClaimSession(sessionId);
        onClaimed();
        return result;
      });

      const firstQuestionRequestPromise = request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: getFinalEvent(previewResponse.text).sessionId })
        .then((res) => res);

      await claimedPromise;
      readingSessionStore.tryClaimSession.mockRestore();

      inFlight.reject(new Error("provider exploded"));

      const firstQuestionResponse = await firstQuestionRequestPromise;

      expectQuestionFailure(firstQuestionResponse);
      expect(
        readingSessionStore.getSession(getFinalEvent(previewResponse.text).sessionId).currentQuestion,
      ).toBeNull();

      // The failed attempt's map entry must be gone — this call is a genuinely
      // fresh, second attempt, not stuck awaiting the same failed promise.
      llmProvider.generateQuestion.mockResolvedValueOnce({ status: "ok", question: validQuestion });

      const secondQuestionResponse = await request(app)
        .post("/api/reading-sessions/question")
        .send({ sessionId: getFinalEvent(previewResponse.text).sessionId });

      expect(secondQuestionResponse.statusCode).toBe(200);
      expect(secondQuestionResponse.body.question.id).toBe(validQuestion.id);
      expect(llmProvider.generateQuestion).toHaveBeenCalledTimes(2);
    });
  });

  test("returns 409 for a session that is currently locked by another mutation", async () => {
    const { parentId, childId } = await createChildAndCookie();
    const session = seedPendingSession({ parentId, childId });
    readingSessionStore.tryClaimSession(session.sessionId);

    const response = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId: session.sessionId });

    expect(response.statusCode).toBe(409);
  });
});

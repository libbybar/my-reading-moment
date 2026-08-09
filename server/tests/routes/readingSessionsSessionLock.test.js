// Proves the actual races an external review flagged are closed at the HTTP
// level, not just at the underlying primitive (see sessionClaim.test.js for
// the primitive-level proof). Stubs the provider so evaluateAnswer can be held
// pending, to genuinely reproduce "a second request arrives while the first is
// still mid-flight" rather than just firing two sequential requests.
import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  evaluateAnswer: jest.fn(),
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../../src/app.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const { default: TextResult } = await import("../../src/models/TextResult.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

function seedSession({ parentId, childId }) {
  return readingSessionStore.createSession({
    passage: { id: "test-passage-1", title: "Title", text: "Text", level: 1, sublevel: 1 },
    currentQuestion: {
      id: "test-question-1",
      passageId: "test-passage-1",
      prompt: "Stub prompt?",
      expectedMeaning: "Stub meaning",
    },
    askedQuestionIds: ["test-question-1"],
    parentId,
    childId,
    level: 1,
    sublevel: 1,
  });
}

function pendingPromise() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("session lock (finalize-once, generalized to every mutating request)", () => {
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

  test("a second /answers request arriving while the first is still evaluating is rejected (409), not double-processed", async () => {
    const { parentId, childId } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const session = seedSession({ parentId, childId });

    // evaluateAnswer only runs *after* the route has already claimed the
    // session (see readingSessionRoutes.js) — waiting for this call proves the
    // claim already succeeded, without guessing at event-loop tick timing.
    const inFlight = pendingPromise();
    let evaluateAnswerWasCalled;
    const evaluateAnswerCalledPromise = new Promise((resolve) => {
      evaluateAnswerWasCalled = resolve;
    });
    llmProvider.evaluateAnswer.mockImplementationOnce(() => {
      evaluateAnswerWasCalled();
      return inFlight.promise;
    });

    // supertest's request object is lazy — it does not actually dispatch until
    // consumed (.then()/await/.end()). Chaining .then() here (instead of just
    // holding the bare Test object in a variable) is what makes this request
    // actually go out before we await evaluateAnswerCalledPromise below.
    const firstRequestPromise = request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "wrong answer" })
      .then((res) => res);

    await evaluateAnswerCalledPromise;

    const secondResponse = await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "wrong answer" });

    expect(secondResponse.statusCode).toBe(409);

    inFlight.resolve({ questionId: "test-question-1", isCorrect: false, feedbackType: "retry" });
    const firstResponse = await firstRequestPromise;

    expect(firstResponse.statusCode).toBe(200);

    // Only the first request's attempt was ever counted.
    expect(readingSessionStore.getSession(session.sessionId).incorrectAttemptCount).toBe(1);
  }, 10000);

  test("a completed session rejects further /answers with 409, and does not write another LearningEvent or TextResult", async () => {
    const { parentId, childId } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const session = seedSession({ parentId, childId });

    llmProvider.evaluateAnswer.mockResolvedValue({
      questionId: "test-question-1",
      isCorrect: true,
      feedbackType: "correct",
    });

    const first = await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "correct answer" });
    expect(first.statusCode).toBe(200);

    const second = await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "correct answer" });

    expect(second.statusCode).toBe(409);

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
  });

  test("a completed session rejects /next-question with 409 and does not mutate the session", async () => {
    const { parentId, childId } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const session = seedSession({ parentId, childId });

    llmProvider.evaluateAnswer.mockResolvedValue({
      questionId: "test-question-1",
      isCorrect: true,
      feedbackType: "correct",
    });
    await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "correct answer" });

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId });

    expect(response.statusCode).toBe(409);
    expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
  });

  test("/preview returns 409/busy — not the stale question — while /next-question is holding the claim", async () => {
    const { parentId, childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const session = seedSession({ parentId, childId });

    // generateQuestion only runs *after* /next-question has already claimed the
    // session (locking it) — waiting for this call proves the claim already
    // succeeded, without guessing at event-loop tick timing.
    const inFlight = pendingPromise();
    let generateQuestionWasCalled;
    const generateQuestionCalledPromise = new Promise((resolve) => {
      generateQuestionWasCalled = resolve;
    });
    llmProvider.generateQuestion.mockImplementationOnce(() => {
      generateQuestionWasCalled();
      return inFlight.promise;
    });

    const nextQuestionPromise = request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: session.sessionId })
      .then((res) => res);

    await generateQuestionCalledPromise;

    const previewResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    // Must not resume with the old (about-to-be-replaced) question.
    expect(previewResponse.statusCode).toBe(409);
    expect(previewResponse.body).not.toHaveProperty("question.id", "test-question-1");

    inFlight.resolve({
      status: "ok",
      question: {
        id: "test-question-2",
        passageId: "test-passage-1",
        prompt: "New prompt?",
        expectedMeaning: "New meaning",
      },
    });
    const nextQuestionResponse = await nextQuestionPromise;

    expect(nextQuestionResponse.statusCode).toBe(200);
    expect(nextQuestionResponse.body.question.id).toBe("test-question-2");
    expect(readingSessionStore.getSession(session.sessionId).currentQuestion.id).toBe("test-question-2");
  });

  test("a completed session rejects /skip with 409", async () => {
    const { parentId, childId } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const session = seedSession({ parentId, childId });

    llmProvider.evaluateAnswer.mockResolvedValue({
      questionId: "test-question-1",
      isCorrect: true,
      feedbackType: "correct",
    });
    await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: session.sessionId, answerText: "correct answer" });

    const response = await request(app)
      .post("/api/reading-sessions/skip")
      .send({ sessionId: session.sessionId });

    expect(response.statusCode).toBe(409);
  });
});

import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import Parent from "../../src/models/Parent.js";
import * as testDb from "../support/testDb.js";
import { createReadySession } from "../support/readingSessions.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

async function createSession() {
  return createReadySession({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });
}

async function createSessionId() {
  const { sessionId } = await createSession();

  return sessionId;
}

// Deliberately bypasses /preview + /question, so currentQuestion is null with
// certainty — the same "active session, no question yet" window /preview's
// background generation genuinely produces, without racing real timing.
async function createPendingSessionId() {
  const { parentId, childId } = await createAuthenticatedParentWithChild({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

  const session = readingSessionStore.createSession({
    passage: { id: "test-passage-1", title: "Title", text: "Text", level: 1, sublevel: 1 },
    currentQuestion: null,
    askedQuestionIds: [],
    parentId,
    childId,
    level: 1,
    sublevel: 1,
  });

  return session.sessionId;
}

describe("POST /api/reading-sessions/answers", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  test("returns the evaluation result for a valid answer", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "עלה ירוק",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      questionId: expect.any(String),
      isCorrect: true,
      feedbackType: "correct",
      textOutcome: "success",
    });
  });

  test("returns retry for an empty answer", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "   ",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      questionId: expect.any(String),
      isCorrect: false,
      feedbackType: "retry",
      textOutcome: "continues",
    });
  });

  test("returns retry for a clearly wrong answer", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "משהו לגמרי לא קשור",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      questionId: expect.any(String),
      isCorrect: false,
      feedbackType: "retry",
      textOutcome: "continues",
    });
  });

  test("ignores any expectedMeaning sent by the client and evaluates against the session's own question", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "מטרה לא קשורה",
      expectedMeaning: "מטרה לא קשורה",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      questionId: expect.any(String),
      isCorrect: false,
      feedbackType: "retry",
      textOutcome: "continues",
    });
  });

  test("returns 400 when sessionId is missing", async () => {
    const response = await request(app).post("/api/reading-sessions/answers").send({
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is an empty string", async () => {
    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: "",
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is not a string", async () => {
    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: 12345,
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when answerText is missing", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when answerText exceeds the maximum length", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "א".repeat(301),
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "Invalid answer request",
      errorCode: "reading_session_answer_invalid_input",
    });
  });

  test("accepts answerText right at the maximum length", async () => {
    const sessionId = await createSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "א".repeat(300),
    });

    expect(response.statusCode).toBe(200);
  });

  test("returns 404 when sessionId is unknown", async () => {
    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: "unknown-session-id",
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Session not found",
      errorCode: "reading_session_not_found",
    });
  });

  test("returns 409/busy — not a crash — for an active session whose initial question isn't ready yet", async () => {
    const sessionId = await createPendingSessionId();

    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "any answer",
    });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: "This reading exercise is not accepting requests right now",
      errorCode: "reading_session_busy",
    });

    // Must be released back to active, not left stuck locked by the rejected attempt.
    expect(readingSessionStore.getSession(sessionId)).toMatchObject({ state: "active" });
  });

  test("records an answer_attempt learning event for the session's child on a correct answer", async () => {
    const { sessionId, parentId, childId } = await createSession();

    await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "עלה ירוק",
    });

    const parent = await Parent.findById(parentId);
    const child = parent.children.id(childId);

    expect(child.learningEvents).toHaveLength(1);
    expect(child.learningEvents[0]).toMatchObject({
      type: "answer_attempt",
      source: "system",
      payload: { isCorrect: true },
    });
  });

  test("records an answer_attempt learning event on a wrong answer too", async () => {
    const { sessionId, parentId, childId } = await createSession();

    await request(app).post("/api/reading-sessions/answers").send({
      sessionId,
      answerText: "משהו לגמרי לא קשור",
    });

    const parent = await Parent.findById(parentId);
    const child = parent.children.id(childId);

    expect(child.learningEvents).toHaveLength(1);
    expect(child.learningEvents[0]).toMatchObject({
      type: "answer_attempt",
      source: "system",
      payload: { isCorrect: false },
    });
  });
});

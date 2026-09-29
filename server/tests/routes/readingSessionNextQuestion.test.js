import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import * as testDb from "../support/testDb.js";
import { createReadySession } from "../support/readingSessions.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

async function createSessionId() {
  const { sessionId } = await createReadySession({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

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

describe("POST /api/reading-sessions/next-question", () => {
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

  test("returns a different question than the one the session started with", async () => {
    const sessionId = await createSessionId();
    const initialSession = readingSessionStore.getSession(sessionId);

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId });

    expect(response.statusCode).toBe(200);
    expect(response.body.question).not.toBeNull();
    expect(response.body.question.id).not.toBe(initialSession.currentQuestion.id);
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("updates the session's current question and asked-question history", async () => {
    const sessionId = await createSessionId();

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId });

    const updatedSession = readingSessionStore.getSession(sessionId);

    expect(updatedSession.currentQuestion.id).toBe(response.body.question.id);
    expect(updatedSession.askedQuestionIds).toContain(response.body.question.id);
  });

  test("returns a null question once every seeded question has been asked", async () => {
    const sessionId = await createSessionId();

    await request(app).post("/api/reading-sessions/next-question").send({ sessionId });

    const thirdSeededQuestionResponse = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId });

    expect(thirdSeededQuestionResponse.statusCode).toBe(200);
    expect(thirdSeededQuestionResponse.body.question).not.toBeNull();

    const exhaustedResponse = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId });

    expect(exhaustedResponse.statusCode).toBe(200);
    expect(exhaustedResponse.body.question).toBeNull();
  });

  test("returns 400 when sessionId is missing", async () => {
    const response = await request(app).post("/api/reading-sessions/next-question").send({});

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is an empty string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: "" });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is whitespace-only", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: "   " });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is not a string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: 12345 });

    expect(response.statusCode).toBe(400);
  });

  test("returns 404 when sessionId is unknown", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId: "unknown-session-id" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Session not found",
      errorCode: "reading_session_not_found",
    });
  });

  test("returns 409/busy — not a silently-generated first question — for a session whose initial question isn't ready yet", async () => {
    const sessionId = await createPendingSessionId();

    const response = await request(app)
      .post("/api/reading-sessions/next-question")
      .send({ sessionId });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: "This reading exercise is not accepting requests right now",
      errorCode: "reading_session_busy",
    });

    // Must be released back to active, not left stuck locked by the rejected attempt.
    expect(readingSessionStore.getSession(sessionId)).toMatchObject({
      state: "active",
      currentQuestion: null,
    });
  });
});

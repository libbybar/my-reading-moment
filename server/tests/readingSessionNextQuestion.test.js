const request = require("supertest");
const app = require("../src/app");
const readingSessionStore = require("../src/services/readingSessionStore");

async function createSessionId() {
  const previewResponse = await request(app)
    .post("/api/reading-sessions/preview")
    .send({ childId: "mock-child-profile-gaya" });

  return previewResponse.body.sessionId;
}

describe("POST /api/reading-sessions/next-question", () => {
  afterEach(() => {
    readingSessionStore.clearSessions();
  });

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
    expect(response.body).toEqual({ error: "Session not found" });
  });
});

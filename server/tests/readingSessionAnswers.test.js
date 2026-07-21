const request = require("supertest");
const app = require("../src/app");
const readingSessionStore = require("../src/services/readingSessionStore");

async function createSessionId() {
  const previewResponse = await request(app)
    .post("/api/reading-sessions/preview")
    .send({ childId: "mock-child-profile-gaya" });

  return previewResponse.body.sessionId;
}

describe("POST /api/reading-sessions/answers", () => {
  afterEach(() => {
    readingSessionStore.clearSessions();
  });

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

  test("returns 404 when sessionId is unknown", async () => {
    const response = await request(app).post("/api/reading-sessions/answers").send({
      sessionId: "unknown-session-id",
      answerText: "some answer",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Session not found" });
  });
});

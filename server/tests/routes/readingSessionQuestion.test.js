import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import llmProvider from "../../src/services/llmProvider/index.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import mockPassages from "../../src/data/mockPassages.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";
import { getFinalEvent } from "../support/readingSessions.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

async function createPendingSessionId() {
  const { childId, cookie } = await createAuthenticatedParentWithChild({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

  const previewResponse = await request(app)
    .post("/api/reading-sessions/preview")
    .set("Cookie", [cookie])
    .send({ childId });

  return getFinalEvent(previewResponse.text).sessionId;
}

describe("POST /api/reading-sessions/question", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.restoreAllMocks();
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  test("returns 400 when sessionId is missing", async () => {
    const response = await request(app).post("/api/reading-sessions/question").send({});

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is an empty string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId: "" });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is whitespace-only", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId: "   " });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 when sessionId is not a string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId: 12345 });

    expect(response.statusCode).toBe(400);
  });

  test("returns 404 when sessionId is unknown", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId: "unknown-session-id" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Session not found",
      errorCode: "reading_session_not_found",
    });
  });

  test("returns the initial question generated in the background by /preview, exposing only safe fields", async () => {
    const [passage] = mockPassages;
    const sessionId = await createPendingSessionId();

    const response = await request(app).post("/api/reading-sessions/question").send({ sessionId });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      question: {
        id: passage.questions[0].id,
        passageId: passage.questions[0].passageId,
        prompt: passage.questions[0].prompt,
      },
    });
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("stores the resolved question, including expectedMeaning, on the session", async () => {
    const [passage] = mockPassages;
    const sessionId = await createPendingSessionId();

    await request(app).post("/api/reading-sessions/question").send({ sessionId });

    const session = readingSessionStore.getSession(sessionId);

    expect(session.currentQuestion).toEqual(passage.questions[0]);
    expect(session.askedQuestionIds).toContain(passage.questions[0].id);
  });

  test("a second call returns the already-resolved question, without a second provider call", async () => {
    // Spy installed before session creation, so it also captures the one
    // background call /preview kicks off — proves the total stays at one
    // regardless of how many times /question is then called.
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const sessionId = await createPendingSessionId();

    const first = await request(app).post("/api/reading-sessions/question").send({ sessionId });
    const second = await request(app).post("/api/reading-sessions/question").send({ sessionId });

    expect(first.statusCode).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(generateQuestionSpy).toHaveBeenCalledTimes(1);
  });
});

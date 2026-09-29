import request from "supertest";
import app from "../../src/app.js";
import mockPassages from "../../src/data/mockPassages.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParent, createAuthenticatedParentWithChild } from "../support/testAuth.js";
import { parseNdjsonEvents, getFinalEvent } from "../support/readingSessions.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const childIdRequiredBody = {
  error: "Invalid reading session request",
  errorCode: "reading_session_child_id_required",
};

describe("POST /api/reading-sessions/preview", () => {
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

  test("streams the reading exercise (title, chunk, done) immediately, without waiting for the initial question", async () => {
    const [passage] = mockPassages;
    const { childId, cookie, child } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/x-ndjson");

    const events = parseNdjsonEvents(response.text);

    expect(events[0]).toEqual({ type: "title", title: passage.title });
    expect(events[events.length - 1]).toEqual({
      type: "done",
      title: passage.title,
      story: passage.text,
      passageId: passage.id,
      sessionId: expect.any(String),
      question: null,
      grammaticalGender: child.grammaticalGender,
    });

    const chunkEvents = events.slice(1, -1);
    expect(chunkEvents.length).toBeGreaterThan(0);
    expect(chunkEvents.every((event) => event.type === "chunk")).toBe(true);
    expect(chunkEvents.map((event) => event.text).join("")).toBe(passage.text);
  });

  test("POST /question returns the initial question once it's ready, exposing only safe fields", async () => {
    const [passage] = mockPassages;
    const { childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    const previewResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const sessionId = getFinalEvent(previewResponse.text).sessionId;

    const questionResponse = await request(app)
      .post("/api/reading-sessions/question")
      .send({ sessionId });

    expect(questionResponse.statusCode).toBe(200);
    expect(questionResponse.body).toEqual({
      question: {
        id: passage.questions[0].id,
        passageId: passage.questions[0].passageId,
        prompt: passage.questions[0].prompt,
      },
    });
    expect(questionResponse.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("stores the full generated question, including expectedMeaning, in the session, once POST /question has resolved it", async () => {
    const [passage] = mockPassages;
    const { childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    const previewResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const sessionId = getFinalEvent(previewResponse.text).sessionId;

    await request(app).post("/api/reading-sessions/question").send({ sessionId });

    const storedSession = readingSessionStore.getSession(sessionId);

    expect(storedSession.currentQuestion).toEqual(passage.questions[0]);
    expect(storedSession.currentQuestion.expectedMeaning).toBe(
      passage.questions[0].expectedMeaning,
    );
  });

  test("returns 400 when childId is missing", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(childIdRequiredBody);
  });

  test("returns 400 when childId is not a string", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: 12345 });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(childIdRequiredBody);
  });

  test("returns 400 when childId is an empty string", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: "" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(childIdRequiredBody);
  });

  test("returns 400 when childId is whitespace-only", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: "   " });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(childIdRequiredBody);
  });

  test("returns 404 when childId is not found", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: "unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Child not found",
      errorCode: "child_not_found",
    });
  });

  // A "deleted" (archived) child must be exactly as unusable as one that
  // never existed — closes off stale client state or a direct API call
  // resuming practice for a child the parent already removed.
  test("returns 404 (same as not found) for an archived child, even though the id is real", async () => {
    const { childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
      isArchived: true,
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Child not found",
      errorCode: "child_not_found",
    });
  });

  test("returns 401 when there is no auth cookie", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "irrelevant" });

    expect(response.statusCode).toBe(401);
  });
});

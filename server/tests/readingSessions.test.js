import request from "supertest";
import app from "../src/app.js";
import mockPassages from "../src/data/mockPassages.js";
import readingSessionStore from "../src/services/readingSessionStore.js";
import * as testDb from "./support/testDb.js";
import { createAuthenticatedParent, createAuthenticatedParentWithChild } from "./support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

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

  test("returns the reading exercise for a known childId", async () => {
    const [passage] = mockPassages;
    const { childId, cookie, child } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: passage.readingLevel, interests: [] },
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      title: passage.title,
      story: passage.text,
      questions: [passage.questions[0].prompt],
      passageId: passage.id,
      sessionId: expect.any(String),
      question: {
        id: passage.questions[0].id,
        passageId: passage.questions[0].passageId,
        prompt: passage.questions[0].prompt,
      },
      grammaticalGender: child.grammaticalGender,
    });
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("stores the full generated question, including expectedMeaning, in the session, while the response exposes only safe fields", async () => {
    const [passage] = mockPassages;
    const { childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: passage.readingLevel, interests: [] },
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const storedSession = readingSessionStore.getSession(response.body.sessionId);

    expect(storedSession.currentQuestion).toEqual(passage.questions[0]);
    expect(storedSession.currentQuestion.expectedMeaning).toBe(
      passage.questions[0].expectedMeaning,
    );
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("returns 400 when childId is missing", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is not a string", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: 12345 });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is an empty string", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: "" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is whitespace-only", async () => {
    const { cookie } = await createAuthenticatedParent();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: "   " });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
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
    });
  });

  test("returns 401 when there is no auth cookie", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "irrelevant" });

    expect(response.statusCode).toBe(401);
  });
});

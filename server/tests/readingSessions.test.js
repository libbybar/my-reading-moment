const request = require("supertest");
const app = require("../src/app");
const mockPassages = require("../src/data/mockPassages");
const mockChildProfiles = require("../src/data/mockChildProfiles");
const readingSessionStore = require("../src/services/readingSessionStore");

describe("POST /api/reading-sessions/preview", () => {
  afterEach(() => {
    readingSessionStore.clearSessions();
  });

  test("returns the reading exercise for a known childId", async () => {
    const [passage] = mockPassages;
    const child = mockChildProfiles.find((profile) => profile.id === "mock-child-profile-gaya");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      title: passage.title,
      story: passage.text,
      questions: [passage.questions[0].prompt],
      readingGame: passage.readingGame,
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

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    const storedSession = readingSessionStore.getSession(response.body.sessionId);

    expect(storedSession.currentQuestion).toEqual(passage.questions[0]);
    expect(storedSession.currentQuestion.expectedMeaning).toBe(
      passage.questions[0].expectedMeaning,
    );
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
  });

  test("returns 400 when childId is missing", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is not a string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: 12345 });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is an empty string", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 400 when childId is whitespace-only", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "   " });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 404 when childId is not found", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Child not found",
    });
  });
});

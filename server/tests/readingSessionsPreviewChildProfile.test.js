jest.mock("../src/data/mockChildProfiles", () => [
  {
    id: "test-child-male",
    name: "Test Male",
    grammaticalGender: "male",
    readingLevel: "beginner",
    interests: [],
  },
  {
    id: "test-child-female",
    name: "Test Female",
    grammaticalGender: "female",
    readingLevel: "beginner",
    interests: [],
  },
  {
    id: "test-child-missing-gender",
    name: "Test Missing Gender",
    readingLevel: "beginner",
    interests: [],
  },
  {
    id: "test-child-invalid-gender",
    name: "Test Invalid Gender",
    grammaticalGender: "other",
    readingLevel: "beginner",
    interests: [],
  },
]);

const request = require("supertest");
const app = require("../src/app");
const readingSessionStore = require("../src/services/readingSessionStore");
const llmProvider = require("../src/services/llmProvider");

describe("POST /api/reading-sessions/preview (child profile grammaticalGender)", () => {
  afterEach(() => {
    readingSessionStore.clearSessions();
    jest.restoreAllMocks();
  });

  test("returns grammaticalGender sourced from the selected child profile (male)", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "test-child-male" });

    expect(response.statusCode).toBe(200);
    expect(response.body.grammaticalGender).toBe("male");
  });

  test("returns grammaticalGender sourced from the selected child profile (female)", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "test-child-female" });

    expect(response.statusCode).toBe(200);
    expect(response.body.grammaticalGender).toBe("female");
  });

  test("returns 500 when the selected child profile is missing grammaticalGender, without touching the provider or session store", async () => {
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "test-child-missing-gender" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test("returns 500 when the selected child profile has an unsupported grammaticalGender, without touching the provider or session store", async () => {
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "test-child-invalid-gender" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test("never leaks invalid grammatical-gender data to the client", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "test-child-invalid-gender" });

    expect(response.body).not.toHaveProperty("grammaticalGender");
    expect(JSON.stringify(response.body)).not.toContain("other");
  });
});

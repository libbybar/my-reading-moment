// Fixture passages are deliberately ordered with "intermediate" before
// "beginner" — the opposite of the production mockPassages.js order — so
// these tests fail if the mock provider's passage supply ever regresses to
// picking mockPassages[0].
import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("../src/data/mockPassages.js", () => ({
  default: [
    {
      id: "fixture-passage-intermediate",
      title: "Fixture Intermediate Passage",
      text: "Intermediate fixture passage text.",
      readingLevel: "intermediate",
      readingGame: {
        instruction: "Fixture intermediate reading game instruction.",
      },
      questions: [
        {
          id: "fixture-question-intermediate-1",
          passageId: "fixture-passage-intermediate",
          prompt: "Fixture intermediate prompt?",
          expectedMeaning: "Fixture intermediate expected meaning.",
        },
      ],
    },
    {
      id: "fixture-passage-beginner",
      title: "Fixture Beginner Passage",
      text: "Beginner fixture passage text.",
      readingLevel: "beginner",
      readingGame: {
        instruction: "Fixture beginner reading game instruction.",
      },
      questions: [
        {
          id: "fixture-question-beginner-1",
          passageId: "fixture-passage-beginner",
          prompt: "Fixture beginner prompt?",
          expectedMeaning: "Fixture beginner expected meaning.",
        },
      ],
    },
  ],
}));

const { default: app } = await import("../src/app.js");
const { default: mockPassages } = await import("../src/data/mockPassages.js");
const { default: readingSessionStore } = await import("../src/services/readingSessionStore.js");
const { default: llmProvider } = await import("../src/services/llmProvider/index.js");
const testDb = await import("./support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("./support/testAuth.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/reading-sessions/preview (passage supply by reading level, via the provider)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    readingSessionStore.clearSessions();
    jest.restoreAllMocks();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  async function createChildWithLevel(readingLevel) {
    return createAuthenticatedParentWithChild({
      name: "Fixture Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel, interests: [] },
    });
  }

  test("a beginner profile receives the beginner passage, even though it is not first in the array", async () => {
    const beginnerPassage = mockPassages.find((passage) => passage.readingLevel === "beginner");
    const { childId, cookie } = await createChildWithLevel("beginner");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.passageId).toBe(beginnerPassage.id);
    expect(response.body.title).toBe(beginnerPassage.title);
    expect(response.body.story).toBe(beginnerPassage.text);
    expect(response.body.question.passageId).toBe(beginnerPassage.id);
  });

  test("an intermediate profile receives the intermediate passage, even though it is first in the array", async () => {
    const intermediatePassage = mockPassages.find(
      (passage) => passage.readingLevel === "intermediate",
    );
    const { childId, cookie } = await createChildWithLevel("intermediate");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.passageId).toBe(intermediatePassage.id);
    expect(response.body.title).toBe(intermediatePassage.title);
    expect(response.body.story).toBe(intermediatePassage.text);
    expect(response.body.question.passageId).toBe(intermediatePassage.id);
  });

  test("stores the selected passage and its generated question in the created session", async () => {
    const beginnerPassage = mockPassages.find((passage) => passage.readingLevel === "beginner");
    const { childId, cookie } = await createChildWithLevel("beginner");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const storedSession = readingSessionStore.getSession(response.body.sessionId);

    expect(storedSession.passage.id).toBe(beginnerPassage.id);
    expect(storedSession.passage.title).toBe(beginnerPassage.title);
    expect(storedSession.passage.text).toBe(beginnerPassage.text);
    expect(storedSession.currentQuestion.passageId).toBe(beginnerPassage.id);
    expect(storedSession.currentQuestion.id).toBe(beginnerPassage.questions[0].id);
  });

  test("returns the stable preview failure response when no passage matches the child's reading level", async () => {
    const { childId, cookie } = await createChildWithLevel("advanced");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
  });

  test("does not call generateQuestion or createSession when no passage matches the child's reading level", async () => {
    const { childId, cookie } = await createChildWithLevel("advanced");
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });
});

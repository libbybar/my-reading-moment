// Fixture passages are deliberately ordered with "intermediate" before
// "beginner" — the opposite of the production mockPassages.js order — so
// these tests fail if selection ever regresses to picking mockPassages[0].
jest.mock("../src/data/mockPassages", () => [
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
]);

jest.mock("../src/data/mockChildProfiles", () => [
  {
    id: "fixture-child-beginner",
    name: "Fixture Beginner Child",
    grammaticalGender: "female",
    readingLevel: "beginner",
    interests: [],
  },
  {
    id: "fixture-child-intermediate",
    name: "Fixture Intermediate Child",
    grammaticalGender: "male",
    readingLevel: "intermediate",
    interests: [],
  },
  {
    id: "fixture-child-no-match",
    name: "Fixture No Match Child",
    grammaticalGender: "female",
    readingLevel: "advanced",
    interests: [],
  },
]);

const request = require("supertest");
const app = require("../src/app");
const mockPassages = require("../src/data/mockPassages");
const readingSessionStore = require("../src/services/readingSessionStore");
const llmProvider = require("../src/services/llmProvider");

describe("POST /api/reading-sessions/preview (passage selection by reading level)", () => {
  afterEach(() => {
    readingSessionStore.clearSessions();
    jest.restoreAllMocks();
  });

  test("a beginner profile receives the beginner passage, even though it is not first in the array", async () => {
    const beginnerPassage = mockPassages.find((passage) => passage.readingLevel === "beginner");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "fixture-child-beginner" });

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

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "fixture-child-intermediate" });

    expect(response.statusCode).toBe(200);
    expect(response.body.passageId).toBe(intermediatePassage.id);
    expect(response.body.title).toBe(intermediatePassage.title);
    expect(response.body.story).toBe(intermediatePassage.text);
    expect(response.body.question.passageId).toBe(intermediatePassage.id);
  });

  test("stores the selected passage and its generated question in the created session", async () => {
    const beginnerPassage = mockPassages.find((passage) => passage.readingLevel === "beginner");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "fixture-child-beginner" });

    const storedSession = readingSessionStore.getSession(response.body.sessionId);

    expect(storedSession.passage.id).toBe(beginnerPassage.id);
    expect(storedSession.passage.title).toBe(beginnerPassage.title);
    expect(storedSession.passage.text).toBe(beginnerPassage.text);
    expect(storedSession.currentQuestion.passageId).toBe(beginnerPassage.id);
    expect(storedSession.currentQuestion.id).toBe(beginnerPassage.questions[0].id);
  });

  test("returns the stable preview failure response when no passage matches the child's reading level", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "fixture-child-no-match" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
  });

  test("does not call generateQuestion or createSession when no passage matches the child's reading level", async () => {
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "fixture-child-no-match" });

    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });
});

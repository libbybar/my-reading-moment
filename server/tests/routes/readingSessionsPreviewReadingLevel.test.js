// Fixture passages are deliberately ordered with level 2.2 before level 1.1 —
// the opposite of the production mockPassages.js order — so these tests fail
// if the mock provider's passage supply ever regresses to picking mockPassages[0].
import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("../../src/data/mockPassages.js", () => ({
  default: [
    {
      id: "fixture-passage-2-2",
      title: "Fixture 2.2 Passage",
      text: "Fixture 2.2 passage text.",
      level: 2,
      sublevel: 2,
      readingGame: {
        instruction: "Fixture 2.2 reading game instruction.",
      },
      questions: [
        {
          id: "fixture-question-2-2-1",
          passageId: "fixture-passage-2-2",
          prompt: "Fixture 2.2 prompt?",
          expectedMeaning: "Fixture 2.2 expected meaning.",
        },
      ],
    },
    {
      id: "fixture-passage-1-1",
      title: "Fixture 1.1 Passage",
      text: "Fixture 1.1 passage text.",
      level: 1,
      sublevel: 1,
      readingGame: {
        instruction: "Fixture 1.1 reading game instruction.",
      },
      questions: [
        {
          id: "fixture-question-1-1-1",
          passageId: "fixture-passage-1-1",
          prompt: "Fixture 1.1 prompt?",
          expectedMeaning: "Fixture 1.1 expected meaning.",
        },
      ],
    },
  ],
}));

const { default: app } = await import("../../src/app.js");
const { default: mockPassages } = await import("../../src/data/mockPassages.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");
const { getFinalEvent } = await import("../support/readingSessions.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/reading-sessions/preview (passage supply by level/sublevel, via the provider)", () => {
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

  async function createChildWithLevel(currentLevel, currentSublevel) {
    return createAuthenticatedParentWithChild({
      name: "Fixture Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [], currentLevel, currentSublevel },
    });
  }

  async function fetchQuestion(sessionId) {
    return request(app).post("/api/reading-sessions/question").send({ sessionId });
  }

  test("a 1.1 profile receives the 1.1 passage, even though it is not first in the array", async () => {
    const passage1_1 = mockPassages.find((passage) => passage.level === 1 && passage.sublevel === 1);
    const { childId, cookie } = await createChildWithLevel(1, 1);

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);

    const doneEvent = getFinalEvent(response.text);

    expect(doneEvent.passageId).toBe(passage1_1.id);
    expect(doneEvent.title).toBe(passage1_1.title);
    expect(doneEvent.story).toBe(passage1_1.text);
    expect(doneEvent.question).toBeNull();

    const questionResponse = await fetchQuestion(doneEvent.sessionId);

    expect(questionResponse.body.question.passageId).toBe(passage1_1.id);
  });

  test("a 2.2 profile receives the 2.2 passage, even though it is first in the array", async () => {
    const passage2_2 = mockPassages.find((passage) => passage.level === 2 && passage.sublevel === 2);
    const { childId, cookie } = await createChildWithLevel(2, 2);

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);

    const doneEvent = getFinalEvent(response.text);

    expect(doneEvent.passageId).toBe(passage2_2.id);
    expect(doneEvent.title).toBe(passage2_2.title);
    expect(doneEvent.story).toBe(passage2_2.text);
    expect(doneEvent.question).toBeNull();

    const questionResponse = await fetchQuestion(doneEvent.sessionId);

    expect(questionResponse.body.question.passageId).toBe(passage2_2.id);
  });

  test("stores the selected passage and its generated question in the created session", async () => {
    const passage1_1 = mockPassages.find((passage) => passage.level === 1 && passage.sublevel === 1);
    const { childId, cookie } = await createChildWithLevel(1, 1);

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const { sessionId } = getFinalEvent(response.text);

    await fetchQuestion(sessionId);

    const storedSession = readingSessionStore.getSession(sessionId);

    expect(storedSession.passage.id).toBe(passage1_1.id);
    expect(storedSession.passage.title).toBe(passage1_1.title);
    expect(storedSession.passage.text).toBe(passage1_1.text);
    expect(storedSession.currentQuestion.passageId).toBe(passage1_1.id);
    expect(storedSession.currentQuestion.id).toBe(passage1_1.questions[0].id);
  });

  test("succeeds via synthesized mock content for a level/sublevel with no seeded passage", async () => {
    // 4.4 is deliberately absent from the fixture above — proves Learning
    // Progression can move a child anywhere on the 16-rung scale without
    // breaking mock-driven /preview (see mockProvider.js's synthesizePassage).
    const { childId, cookie } = await createChildWithLevel(4, 4);

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);

    const { sessionId } = getFinalEvent(response.text);

    expect(sessionId).toEqual(expect.any(String));

    const questionResponse = await fetchQuestion(sessionId);

    expect(questionResponse.body.question).not.toBeNull();
  });
});

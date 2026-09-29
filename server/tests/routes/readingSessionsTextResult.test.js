import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import TextResult from "../../src/models/TextResult.js";
import * as testDb from "../support/testDb.js";
import { createReadySession } from "../support/readingSessions.js";
import { MAX_INCORRECT_ATTEMPTS } from "../../src/services/textCompletionRules.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const WRONG_ANSWER = "משהו לגמרי לא קשור";
const CORRECT_ANSWER = "עלה ירוק";

async function createSessionAndChild() {
  return createReadySession({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });
}

function submitAnswer(sessionId, answerText) {
  return request(app).post("/api/reading-sessions/answers").send({ sessionId, answerText });
}

describe("POST /api/reading-sessions/answers (TextResult)", () => {
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

  test("creates a success TextResult for a correct answer", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    const response = await submitAnswer(sessionId, CORRECT_ANSWER);

    expect(response.statusCode).toBe(200);

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      level: 1,
      sublevel: 1,
      specVersion: 1,
      result: "success",
    });
    expect(results[0].evidence).toMatchObject({ questionsTotal: 1, questionsCorrect: 1 });
  });

  test("does not create a TextResult while incorrect attempts remain below the limit", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    for (let attempt = 1; attempt < MAX_INCORRECT_ATTEMPTS; attempt += 1) {
      const response = await submitAnswer(sessionId, WRONG_ANSWER);
      expect(response.statusCode).toBe(200);
      expect(response.body.isCorrect).toBe(false);
    }

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(0);
  });

  test("creates a failure TextResult once incorrect attempts reach the limit", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    for (let attempt = 0; attempt < MAX_INCORRECT_ATTEMPTS; attempt += 1) {
      await submitAnswer(sessionId, WRONG_ANSWER);
    }

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ result: "failure" });
    expect(results[0].evidence).toMatchObject({ questionsTotal: 1, questionsCorrect: 0 });
  });

  test("frees the child for a new session once the text is finalized", async () => {
    const { sessionId, cookie, childId } = await createSessionAndChild();

    await submitAnswer(sessionId, CORRECT_ANSWER);

    const secondPreview = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(secondPreview.statusCode).toBe(200);
  });

  test("a duplicate call after finalization is rejected with 409, not a fresh (possibly contradicting) evaluation", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    const first = await submitAnswer(sessionId, CORRECT_ANSWER);
    const second = await submitAnswer(sessionId, CORRECT_ANSWER);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
  });
});

import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import TextResult from "../../src/models/TextResult.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

async function createSessionAndChild() {
  const { parentId, childId, cookie } = await createAuthenticatedParentWithChild({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

  const previewResponse = await request(app)
    .post("/api/reading-sessions/preview")
    .set("Cookie", [cookie])
    .send({ childId });

  return { sessionId: previewResponse.body.sessionId, parentId, childId, cookie };
}

function skip(sessionId) {
  return request(app).post("/api/reading-sessions/skip").send({ sessionId });
}

describe("POST /api/reading-sessions/skip", () => {
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

  test("requires sessionId", async () => {
    const response = await skip(undefined);

    expect(response.statusCode).toBe(400);
  });

  test("returns 404 for an unknown sessionId", async () => {
    const response = await skip("unknown-session-id");

    expect(response.statusCode).toBe(404);
  });

  test("creates a skipped TextResult and returns 200", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    const response = await skip(sessionId);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ skipped: true });

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ level: 1, sublevel: 1, specVersion: 1, result: "skipped" });
  });

  test("frees the child for a new session after a skip", async () => {
    const { sessionId, cookie, childId } = await createSessionAndChild();

    await skip(sessionId);

    const secondPreview = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(secondPreview.statusCode).toBe(200);
  });

  test("returns 409 and does not create a second TextResult for a skip on an already-finalized session", async () => {
    const { sessionId, parentId, childId } = await createSessionAndChild();

    await skip(sessionId);
    const second = await skip(sessionId);

    expect(second.statusCode).toBe(409);

    const results = await TextResult.find({ parentId, childId });
    expect(results).toHaveLength(1);
  });

  test("returns 409 when skipping a session that already finalized via /answers", async () => {
    const { sessionId } = await createSessionAndChild();

    await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId, answerText: "עלה ירוק" });

    const response = await skip(sessionId);

    expect(response.statusCode).toBe(409);
  });
});

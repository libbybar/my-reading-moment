import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import TextResult from "../../src/models/TextResult.js";
import Parent from "../../src/models/Parent.js";
import * as testDb from "../support/testDb.js";
import { createReadySession } from "../support/readingSessions.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

async function createSessionAndArchiveChild() {
  const context = await createReadySession({
    name: "Test Child",
    grammaticalGender: "female",
    learningProfile: { readingLevel: "beginner", interests: [] },
  });

  await request(app)
    .delete(`/api/child-profiles/${context.childId}`)
    .set("Cookie", [context.cookie])
    .expect(200);

  return context;
}

describe("a reading session whose child was archived", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  });

  test.each([
    ["answers", (sessionId) => ({ sessionId, answerText: "כלב" })],
    ["skip", (sessionId) => ({ sessionId })],
    ["question", (sessionId) => ({ sessionId })],
    ["next-question", (sessionId) => ({ sessionId })],
  ])("POST /%s returns 404 instead of acting on the session", async (endpoint, buildBody) => {
    const { sessionId } = await createSessionAndArchiveChild();

    const response = await request(app)
      .post(`/api/reading-sessions/${endpoint}`)
      .send(buildBody(sessionId));

    expect(response.statusCode).toBe(404);
  });

  test("no TextResult, learning event or progress is written after the archive", async () => {
    const { sessionId, parentId, childId } = await createSessionAndArchiveChild();

    await request(app).post("/api/reading-sessions/skip").send({ sessionId });

    const parent = await Parent.findById(parentId);
    const child = parent.children.id(childId);

    expect(await TextResult.countDocuments({ sessionId })).toBe(0);
    expect(child.learningEvents).toHaveLength(0);
    expect(child.journeyProgress).toBe(0);
  });

  test("a mid-request write for an archived child fails and leaves no TextResult behind", async () => {
    const { sessionId, parentId, childId } = await createReadySession({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    // Archive directly in the DB so the in-memory session survives, simulating
    // an archive that lands between the claim and the completing write.
    await Parent.updateOne(
      { _id: parentId, "children._id": childId },
      { $set: { "children.$.isArchived": true } },
    );

    const response = await request(app).post("/api/reading-sessions/skip").send({ sessionId });

    expect(response.statusCode).toBe(500);
    expect(await TextResult.countDocuments({ sessionId })).toBe(0);
  });
});

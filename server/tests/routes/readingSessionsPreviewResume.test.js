import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";
import { getFinalEvent } from "../support/readingSessions.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/reading-sessions/preview (resuming an existing active session)", () => {
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

  async function createChildAndCookie() {
    return createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
  }

  test("a second preview for the same child resumes the existing session (same sessionId), without cancelling it", async () => {
    const { childId, cookie } = await createChildAndCookie();

    const firstResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(firstResponse.statusCode).toBe(200);
    const firstDoneEvent = getFinalEvent(firstResponse.text);
    const firstSessionId = firstDoneEvent.sessionId;

    const secondResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(secondResponse.statusCode).toBe(200);

    const secondDoneEvent = getFinalEvent(secondResponse.text);

    // `question` may have gone from null to ready between the two calls (the
    // initial-question background generation kicked off by the first /preview
    // isn't guaranteed to still be in flight by the second) — everything else
    // about the resumed session must still match exactly. A resumed session's
    // response is always a single "done" event with no "title"/"chunk" —
    // nothing was regenerated.
    expect(secondResponse.text.trim().split("\n")).toHaveLength(1);
    expect(secondDoneEvent).toEqual({ ...firstDoneEvent, question: secondDoneEvent.question });
    expect(secondDoneEvent.sessionId).toBe(firstSessionId);

    // The original session must still be exactly as it was — never silently cancelled.
    expect(readingSessionStore.getSession(firstSessionId)).toMatchObject({
      sessionId: firstSessionId,
      state: "active",
    });
  });

  test("does not call the provider at all when resuming (a refreshed/reopened client is not charged a fresh generation)", async () => {
    const { childId, cookie } = await createChildAndCookie();

    await request(app).post("/api/reading-sessions/preview").set("Cookie", [cookie]).send({ childId });

    const generatePassageStreamSpy = jest.spyOn(
      (await import("../../src/services/llmProvider/index.js")).default,
      "generatePassageStream",
    );

    await request(app).post("/api/reading-sessions/preview").set("Cookie", [cookie]).send({ childId });

    expect(generatePassageStreamSpy).not.toHaveBeenCalled();
  });

  test("returns 409/busy for a session that is currently locked (mid-mutation), without resuming its stale snapshot", async () => {
    const { childId, cookie } = await createChildAndCookie();

    const firstResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const firstSessionId = getFinalEvent(firstResponse.text).sessionId;
    readingSessionStore.tryClaimSession(firstSessionId);

    const secondResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(secondResponse.statusCode).toBe(409);

    // The locked session itself must be left exactly as it was — not cancelled,
    // not resumed, not silently replaced by a new one.
    expect(readingSessionStore.getSession(firstSessionId)).toMatchObject({
      sessionId: firstSessionId,
      state: "locked",
    });
  });

  test("does not resume across two different children of the same parent — each gets its own session", async () => {
    const { cookie, childId: firstChildId } = await createAuthenticatedParentWithChild({
      name: "Child One",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    const addChildResponse = await request(app)
      .post("/api/child-profiles")
      .set("Cookie", [cookie])
      .send({
        name: "Child Two",
        grammaticalGender: "male",
        readingLevel: "beginner",
        interests: [],
      });

    const secondChildId = addChildResponse.body.id;

    const firstResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: firstChildId });
    const secondResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId: secondChildId });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(getFinalEvent(firstResponse.text).sessionId).not.toBe(
      getFinalEvent(secondResponse.text).sessionId,
    );
  });

  test("no longer resumes once the session has been completed — a fresh /preview generates a new one", async () => {
    const { childId, cookie } = await createChildAndCookie();

    const firstResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const firstSessionId = getFinalEvent(firstResponse.text).sessionId;

    // Deterministically wait for the initial question before answering — the
    // same reason createReadySession does this elsewhere: currentQuestion is
    // no longer guaranteed to be ready immediately after /preview.
    await request(app).post("/api/reading-sessions/question").send({ sessionId: firstSessionId });

    await request(app)
      .post("/api/reading-sessions/answers")
      .send({ sessionId: firstSessionId, answerText: "עלה ירוק" });

    const secondResponse = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(secondResponse.statusCode).toBe(200);
    expect(getFinalEvent(secondResponse.text).sessionId).not.toBe(firstSessionId);
  });
});

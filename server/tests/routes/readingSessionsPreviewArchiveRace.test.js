import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  generatePassageStream: jest.fn(),
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../../src/app.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");
const { parseNdjsonEvents, passageStreamOf } = await import("../support/readingSessions.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const validPassage = {
  id: "stub-passage",
  title: "Stub Passage Title",
  text: "Stub passage text.",
  level: 1,
  sublevel: 1,
};

describe("POST /api/reading-sessions/preview when the child is archived mid-stream", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.resetAllMocks();
    readingSessionStore.clearSessions();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  // `started` proves the route is mid-stream (no session yet) before the archive fires.
  function createGatedPassageStream() {
    let markStarted;
    let release;
    const started = new Promise((resolve) => {
      markStarted = resolve;
    });
    const gate = new Promise((resolve) => {
      release = resolve;
    });

    const stream = (async function* () {
      markStarted();
      await gate;
      yield* passageStreamOf(validPassage);
    })();

    return { stream, started, release };
  }

  test("creates no live session and reports child_not_found", async () => {
    const { parentId, childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    const { stream, started, release } = createGatedPassageStream();
    llmProvider.generatePassageStream.mockReturnValue(stream);

    const previewPromise = request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId })
      .then((response) => response);

    await started;

    await request(app).delete(`/api/child-profiles/${childId}`).set("Cookie", [cookie]).expect(200);

    release();

    const response = await previewPromise;
    const events = parseNdjsonEvents(response.text);

    expect(events[events.length - 1]).toMatchObject({
      type: "error",
      errorCode: "child_not_found",
    });
    expect(events.some((event) => event.type === "done")).toBe(false);
    expect(readingSessionStore.hasActiveSessionForChild(parentId, childId)).toBe(false);
    expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
  });
});

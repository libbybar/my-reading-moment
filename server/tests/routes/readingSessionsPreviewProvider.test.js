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
const { parseNdjsonEvents, getFinalEvent, passageStreamOf, throwingPassageStream } = await import(
  "../support/readingSessions.js"
);

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const validPassage = {
  id: "stub-passage",
  title: "Stub Passage Title",
  text: "Stub passage text that does not exist in mockPassages.",
  level: 1,
  sublevel: 1,
};

const previewFailureBody = {
  error: "Failed to generate a reading question",
  errorCode: "reading_session_preview_failed",
};

describe("POST /api/reading-sessions/preview (provider integration)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    readingSessionStore.clearSessions();
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
      learningProfile: {
        readingLevel: "beginner",
        interests: ["space", "sports"],
      },
    });
  }

  // Once /preview commits to streaming (see beginNdjsonResponse in
  // readingSessionRoutes.js), the HTTP status can no longer change — every
  // failure from that point on is reported as an in-band {type:"error"}
  // event with status 200, not a different status code. This is the
  // accepted trade-off of streaming responses, not a bug in these tests.
  function expectPreviewFailure(response) {
    expect(response.statusCode).toBe(200);

    const events = parseNdjsonEvents(response.text);
    const finalEvent = events[events.length - 1];

    expect(finalEvent).toEqual({ type: "error", ...previewFailureBody });
    expect(events.some((event) => "sessionId" in event)).toBe(false);
    expect(response.text).not.toContain("provider exploded");
  }

  test("calls generatePassageStream with the selected child's currentLevel/currentSublevel", async () => {
    const { childId, cookie, child } = await createChildAndCookie();
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const [{ level, sublevel }] = llmProvider.generatePassageStream.mock.calls[0];

    expect(level).toBe(child.learningProfile.currentLevel);
    expect(sublevel).toBe(child.learningProfile.currentSublevel);
  });

  // Sending the child's full interests list and relying on the model's own
  // "at most one" instruction (buildInterestsLine, prompts.js) gave no real
  // variety across generations — the server now picks the one interest itself.
  test("sends exactly one of the child's interests, not the whole list, even though the child has several", async () => {
    const { childId, cookie, child } = await createChildAndCookie();
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const [{ interests }] = llmProvider.generatePassageStream.mock.calls[0];

    expect(interests).toHaveLength(1);
    expect(child.learningProfile.interests).toContain(interests[0]);
  });

  test("sends an empty interests array when the child has none", async () => {
    const { childId, cookie } = await createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    const [{ interests }] = llmProvider.generatePassageStream.mock.calls[0];

    expect(interests).toEqual([]);
  });

  test("varies which interest is picked across generations", async () => {
    const { childId, cookie, child } = await createChildAndCookie();
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const randomSpy = jest.spyOn(Math, "random");

    randomSpy.mockReturnValue(0);
    await request(app).post("/api/reading-sessions/preview").set("Cookie", [cookie]).send({ childId });

    // Free the child so a second /preview generates fresh, instead of resuming.
    readingSessionStore.clearSessions();

    randomSpy.mockReturnValue(0.99);
    await request(app).post("/api/reading-sessions/preview").set("Cookie", [cookie]).send({ childId });

    const [firstCall] = llmProvider.generatePassageStream.mock.calls[0];
    const [secondCall] = llmProvider.generatePassageStream.mock.calls[1];

    expect(firstCall.interests).toEqual([child.learningProfile.interests[0]]);
    expect(secondCall.interests).toEqual([child.learningProfile.interests[1]]);
  });

  test("returns an error event when generatePassageStream rejects", async () => {
    const { childId, cookie } = await createChildAndCookie();
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
    llmProvider.generatePassageStream.mockImplementation(() =>
      throwingPassageStream(new Error("provider exploded")),
    );

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expectPreviewFailure(response);
    expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["a blank id", { ...validPassage, id: "   " }],
    ["a missing title", { ...validPassage, title: undefined }],
    ["a blank text", { ...validPassage, text: "   " }],
    ["a mismatched level", { ...validPassage, level: 2 }],
    ["a passage that is not an object", "not-a-passage"],
  ])(
    "returns an error event for %s, without calling generateQuestion",
    async (_label, malformedPassage) => {
      const { childId, cookie } = await createChildAndCookie();
      const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
      llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(malformedPassage));

      const response = await request(app)
        .post("/api/reading-sessions/preview")
        .set("Cookie", [cookie])
        .send({ childId });

      expectPreviewFailure(response);
      expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
      expect(createSessionSpy).not.toHaveBeenCalled();
    },
  );

  // generateQuestion now runs in the background, after /preview has already
  // responded (see generateInitialQuestionInBackground in readingSessionRoutes.js)
  // — so nothing it does (reject, exhaust, or return something malformed) can
  // fail /preview itself, or stop the session from being created. What happens
  // to that background outcome is covered separately, in
  // readingSessionQuestion.test.js (POST /question is what surfaces it).
  test.each([
    ["rejects", () => llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"))],
    ["reports an exhausted question set", () => llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" })],
    [
      "returns a malformed question",
      () =>
        llmProvider.generateQuestion.mockResolvedValue({
          status: "ok",
          question: { id: "stub-question", passageId: "some-other-passage" },
        }),
    ],
    ["returns an unexpected status", () => llmProvider.generateQuestion.mockResolvedValue({ status: "unexpected-status" })],
  ])("/preview still succeeds (200, question: null) even when generateQuestion %s", async (_label, mockGenerateQuestion) => {
    const { childId, cookie } = await createChildAndCookie();
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    mockGenerateQuestion();

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);

    const doneEvent = getFinalEvent(response.text);

    expect(doneEvent.sessionId).toEqual(expect.any(String));
    expect(doneEvent.question).toBeNull();
    expect(createSessionSpy).toHaveBeenCalled();
  });

  test("builds its response purely from whatever the passage provider returns, with no mock/real branching", async () => {
    const { childId, cookie } = await createChildAndCookie();
    llmProvider.generatePassageStream.mockImplementation(() => passageStreamOf(validPassage));
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);

    const doneEvent = getFinalEvent(response.text);

    expect(doneEvent.title).toBe(validPassage.title);
    expect(doneEvent.story).toBe(validPassage.text);
    expect(doneEvent.passageId).toBe(validPassage.id);
    expect(doneEvent.question).toBeNull();
    expect(doneEvent).not.toHaveProperty("questions");
    expect(doneEvent).not.toHaveProperty("readingGame");
  });
});

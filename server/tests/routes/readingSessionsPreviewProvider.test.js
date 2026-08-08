import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  generatePassage: jest.fn(),
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../../src/app.js");
const { default: readingSessionStore } = await import("../../src/services/readingSessionStore.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

const validPassage = {
  id: "stub-passage",
  title: "Stub Passage Title",
  text: "Stub passage text that does not exist in mockPassages.",
  readingLevel: "beginner",
};

const previewFailureBody = { error: "Failed to generate a reading question" };

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
        interests: ["חלל", "רובוטים"],
      },
    });
  }

  function expectPreviewFailure(response) {
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual(previewFailureBody);
    expect(response.body).not.toHaveProperty("sessionId");
    expect(JSON.stringify(response.body)).not.toContain("provider exploded");
  }

  test("calls generatePassage with the selected child's readingLevel and interests", async () => {
    const { childId, cookie, child } = await createChildAndCookie();
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(llmProvider.generatePassage).toHaveBeenCalledWith({
      readingLevel: child.learningProfile.readingLevel,
      interests: child.learningProfile.interests,
    });
  });

  test("returns an error response when generatePassage rejects", async () => {
    const { childId, cookie } = await createChildAndCookie();
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
    llmProvider.generatePassage.mockRejectedValue(new Error("provider exploded"));

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
    ["a mismatched readingLevel", { ...validPassage, readingLevel: "intermediate" }],
    ["a passage that is not an object", "not-a-passage"],
  ])(
    "returns an error response for %s, without calling generateQuestion",
    async (_label, malformedPassage) => {
      const { childId, cookie } = await createChildAndCookie();
      const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
      llmProvider.generatePassage.mockResolvedValue(malformedPassage);

      const response = await request(app)
        .post("/api/reading-sessions/preview")
        .set("Cookie", [cookie])
        .send({ childId });

      expectPreviewFailure(response);
      expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
      expect(createSessionSpy).not.toHaveBeenCalled();
    },
  );

  test("returns an error response when the provider rejects", async () => {
    const { childId, cookie } = await createChildAndCookie();
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expectPreviewFailure(response);
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test.each([
    [
      "a mismatched passageId",
      {
        id: "stub-question",
        passageId: "some-other-passage",
        prompt: "Stub prompt?",
        expectedMeaning: "Stub meaning",
      },
    ],
    [
      "a missing expectedMeaning",
      {
        id: "stub-question",
        passageId: "stub-passage",
        prompt: "Stub prompt?",
      },
    ],
    ["a question that is not an object", "not-a-question"],
  ])(
    "returns an error response for %s, without creating a session",
    async (_label, malformedQuestion) => {
      const { childId, cookie } = await createChildAndCookie();
      const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
      llmProvider.generatePassage.mockResolvedValue(validPassage);
      llmProvider.generateQuestion.mockResolvedValue({
        status: "ok",
        question: malformedQuestion,
      });

      const response = await request(app)
        .post("/api/reading-sessions/preview")
        .set("Cookie", [cookie])
        .send({ childId });

      expectPreviewFailure(response);
      expect(createSessionSpy).not.toHaveBeenCalled();
    },
  );

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
    const { childId, cookie } = await createChildAndCookie();
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({
      status: "ok",
      question: {
        id: "stub-question",
        passageId: "stub-passage",
        prompt: "Stub prompt that does not exist in mockPassages?",
        expectedMeaning: "This must never reach the response",
      },
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe(validPassage.title);
    expect(response.body.story).toBe(validPassage.text);
    expect(response.body.passageId).toBe(validPassage.id);
    expect(response.body.question).toEqual({
      id: "stub-question",
      passageId: "stub-passage",
      prompt: "Stub prompt that does not exist in mockPassages?",
    });
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
    expect(response.body.questions).toEqual(["Stub prompt that does not exist in mockPassages?"]);
    expect(response.body).not.toHaveProperty("readingGame");
  });

  test("returns a null question and an empty legacy questions list when the provider reports an exhausted question set", async () => {
    const { childId, cookie } = await createChildAndCookie();
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.question).toBeNull();
    expect(response.body.questions).toEqual([]);
  });

  test("returns a stable error response when the provider returns an unexpected status", async () => {
    const { childId, cookie } = await createChildAndCookie();
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "unexpected-status" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expectPreviewFailure(response);
    expect(createSessionSpy).not.toHaveBeenCalled();
  });
});

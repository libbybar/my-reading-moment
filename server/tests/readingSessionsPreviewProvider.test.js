import { jest } from "@jest/globals";
import request from "supertest";

const llmProvider = {
  generatePassage: jest.fn(),
  generateQuestion: jest.fn(),
};

jest.unstable_mockModule("../src/services/llmProvider/index.js", () => ({
  default: llmProvider,
}));

const { default: app } = await import("../src/app.js");
const { default: mockChildProfiles } = await import("../src/data/mockChildProfiles.js");

const validPassage = {
  id: "stub-passage",
  title: "Stub Passage Title",
  text: "Stub passage text that does not exist in mockPassages.",
  readingLevel: "beginner",
};

describe("POST /api/reading-sessions/preview (provider integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("calls generatePassage with the selected child's readingLevel and interests", async () => {
    const child = mockChildProfiles.find((profile) => profile.id === "mock-child-profile-gaya");
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: child.id });

    expect(llmProvider.generatePassage).toHaveBeenCalledWith({
      readingLevel: child.readingLevel,
      interests: child.interests,
    });
  });

  test("returns an error response when generatePassage rejects", async () => {
    llmProvider.generatePassage.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
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
      llmProvider.generatePassage.mockResolvedValue(malformedPassage);

      const response = await request(app)
        .post("/api/reading-sessions/preview")
        .send({ childId: "mock-child-profile-gaya" });

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({ error: expect.any(String) });
      expect(llmProvider.generateQuestion).not.toHaveBeenCalled();
    },
  );

  test("returns an error response when the provider rejects", async () => {
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
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
      .send({ childId: "mock-child-profile-gaya" });

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
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(200);
    expect(response.body.question).toBeNull();
    expect(response.body.questions).toEqual([]);
  });

  test("returns a stable error response when the provider returns an unexpected status", async () => {
    llmProvider.generatePassage.mockResolvedValue(validPassage);
    llmProvider.generateQuestion.mockResolvedValue({ status: "unexpected-status" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
  });
});

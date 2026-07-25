jest.mock("../src/services/llmProvider");

const request = require("supertest");
const app = require("../src/app");
const llmProvider = require("../src/services/llmProvider");

describe("POST /api/reading-sessions/preview (provider integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns an error response when the provider rejects", async () => {
    llmProvider.generateQuestion.mockRejectedValue(new Error("provider exploded"));

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  test("builds its response purely from whatever the provider returns, with no mock/real branching", async () => {
    llmProvider.generateQuestion.mockResolvedValue({
      status: "ok",
      question: {
        id: "stub-question",
        passageId: "mock-passage-1",
        prompt: "Stub prompt that does not exist in mockPassages?",
        expectedMeaning: "This must never reach the response",
      },
    });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(200);
    expect(response.body.question).toEqual({
      id: "stub-question",
      passageId: "mock-passage-1",
      prompt: "Stub prompt that does not exist in mockPassages?",
    });
    expect(response.body.question).not.toHaveProperty("expectedMeaning");
    expect(response.body.questions).toEqual(["Stub prompt that does not exist in mockPassages?"]);
  });

  test("returns a null question and an empty legacy questions list when the provider reports an exhausted question set", async () => {
    llmProvider.generateQuestion.mockResolvedValue({ status: "exhausted" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(200);
    expect(response.body.question).toBeNull();
    expect(response.body.questions).toEqual([]);
  });

  test("returns a stable error response when the provider returns an unexpected status", async () => {
    llmProvider.generateQuestion.mockResolvedValue({ status: "unexpected-status" });

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "mock-child-profile-gaya" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
  });
});

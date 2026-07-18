const request = require("supertest");
const app = require("../src/app");
const mockReadingExercise = require("../src/data/mockReadingExercise");

describe("POST /api/reading-sessions/preview", () => {
  test("returns the mock reading exercise for a known childId", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "1" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockReadingExercise);
  });

  test("returns 400 when childId is missing", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "childId is required",
    });
  });

  test("returns 404 when childId is not found", async () => {
    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .send({ childId: "unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: "Child not found",
    });
  });
});

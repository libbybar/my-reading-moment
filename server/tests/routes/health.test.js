import request from "supertest";
import app from "../../src/app.js";

describe("Health endpoint", () => {
  test("returns status 200 and an ok response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "My Reading Moment API is running",
    });
  });
});

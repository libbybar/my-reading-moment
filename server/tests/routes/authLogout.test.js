import request from "supertest";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/auth/logout", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  });

  test("clears the auth cookie and returns success, even with no active session", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true });

    const cookies = response.headers["set-cookie"];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^token=;/);
    expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

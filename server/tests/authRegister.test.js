import request from "supertest";
import app from "../src/app.js";
import * as testDb from "./support/testDb.js";
import Parent from "../src/models/Parent.js";

describe("POST /api/auth/register", () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  test("registers a new parent and returns a safe representation, without the password hash", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      email: "parent@example.com",
      createdAt: expect.any(String),
    });
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  test("returns 409 when the email is already registered, regardless of case", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "parent@example.com", password: "correct-horse" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "PARENT@example.com", password: "another-password" });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: "A parent account with this email already exists",
    });
    expect(await Parent.countDocuments()).toBe(1);
  });

  test.each([
    ["a missing email", { password: "correct-horse" }],
    ["a malformed email", { email: "not-an-email", password: "correct-horse" }],
    ["a missing password", { email: "parent@example.com" }],
    ["a password shorter than 8 characters", { email: "parent@example.com", password: "short" }],
  ])("returns 400 for %s, and creates no parent", async (_label, body) => {
    const response = await request(app).post("/api/auth/register").send(body);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect(await Parent.countDocuments()).toBe(0);
  });
});

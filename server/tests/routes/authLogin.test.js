import request from "supertest";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import Parent from "../../src/models/Parent.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/auth/login", () => {
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

  async function registerParent(email, password) {
    await request(app).post("/api/auth/register").send({ email, password });
  }

  test("logs in with correct credentials, sets an HttpOnly cookie, and never exposes the token in the body", async () => {
    await registerParent("parent@example.com", "correct-horse");

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      email: "parent@example.com",
      createdAt: expect.any(String),
    });
    expect(response.body).not.toHaveProperty("token");

    const cookies = response.headers["set-cookie"];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  test("returns 401 for a wrong password, without setting a cookie", async () => {
    await registerParent("parent@example.com", "correct-horse");

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "wrong-password" });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Invalid email or password" });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  test("returns the same 401 for an unregistered email as for a wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever123" });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Invalid email or password" });
  });

  test.each([
    ["a missing email", { password: "correct-horse" }],
    ["a malformed email", { email: "not-an-email", password: "correct-horse" }],
    ["a missing password", { email: "parent@example.com" }],
  ])("returns 400 for %s", async (_label, body) => {
    const response = await request(app).post("/api/auth/login").send(body);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  test("updates lastLoginAt on successful login", async () => {
    await registerParent("parent@example.com", "correct-horse");

    const before = await Parent.findOne({ email: "parent@example.com" });
    expect(before.lastLoginAt).toBeUndefined();

    await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "correct-horse" });

    const after = await Parent.findOne({ email: "parent@example.com" });
    expect(after.lastLoginAt).toBeInstanceOf(Date);
  });
});

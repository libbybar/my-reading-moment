import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";

import { requireAuth } from "../src/middleware/authMiddleware.js";
import { AUTH_COOKIE_NAME } from "../src/services/tokenService.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

function buildTestApp() {
  const app = express();

  app.use(cookieParser());
  app.get("/protected", requireAuth, (req, res) => {
    res.status(200).json({ parentId: req.parentId });
  });

  return app;
}

describe("authMiddleware.requireAuth", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  });

  test("returns 401 when there is no cookie", async () => {
    const response = await request(buildTestApp()).get("/protected");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  test("returns 401 for a malformed token", async () => {
    const response = await request(buildTestApp())
      .get("/protected")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=not-a-real-token`]);

    expect(response.statusCode).toBe(401);
  });

  test("returns 401 for a token signed with a different secret", async () => {
    const token = jwt.sign({ parentId: "someone" }, "a-different-secret");

    const response = await request(buildTestApp())
      .get("/protected")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.statusCode).toBe(401);
  });

  test("returns 401 for an expired token", async () => {
    const token = jwt.sign({ parentId: "someone" }, process.env.JWT_SECRET, { expiresIn: "1ms" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const response = await request(buildTestApp())
      .get("/protected")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.statusCode).toBe(401);
  });

  test("calls next and attaches parentId for a valid token", async () => {
    const token = jwt.sign({ parentId: "parent-123" }, process.env.JWT_SECRET);

    const response = await request(buildTestApp())
      .get("/protected")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ parentId: "parent-123" });
  });
});

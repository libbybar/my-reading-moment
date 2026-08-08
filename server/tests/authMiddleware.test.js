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

function expectAuthenticationRequired(response) {
  expect(response.statusCode).toBe(401);
  expect(response.body).toEqual({ error: "Authentication required" });
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

    expectAuthenticationRequired(response);
  });

  test.each([
    ["a malformed token", () => "not-a-real-token"],
    ["a token signed with a different secret", () => jwt.sign({ parentId: "someone" }, "a-different-secret")],
    [
      "an expired token",
      () =>
        jwt.sign(
          { parentId: "someone", exp: Math.floor(Date.now() / 1000) - 60 },
          process.env.JWT_SECRET,
        ),
    ],
  ])("returns the same generic 401 response for %s", async (_label, buildToken) => {
    const token = buildToken();

    const response = await request(buildTestApp())
      .get("/protected")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expectAuthenticationRequired(response);
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

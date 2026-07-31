import { jest } from "@jest/globals";
import request from "supertest";

const parentService = {
  loginParent: jest.fn(),
};

jest.unstable_mockModule("../src/services/parentService.js", () => ({
  ...parentService,
}));

const { default: app } = await import("../src/app.js");

describe("POST /api/auth/login (service integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns 200, sets the cookie, and returns the service's own parent data, with no mock/real branching", async () => {
    parentService.loginParent.mockResolvedValue({
      status: "success",
      token: "stub.jwt.token",
      parent: {
        _id: "stub-parent-id",
        email: "parent@example.com",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      id: "stub-parent-id",
      email: "parent@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(response.body).not.toHaveProperty("token");
    expect(response.headers["set-cookie"][0]).toMatch(/^token=stub\.jwt\.token/);
  });

  test("returns 401 when the service reports invalidCredentials", async () => {
    parentService.loginParent.mockResolvedValue({ status: "invalidCredentials" });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "wrong-password" });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Invalid email or password" });
  });

  test("returns a stable 500 error response when the service rejects, without leaking the underlying error", async () => {
    parentService.loginParent.mockRejectedValue(new Error("db exploded"));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect(response.body.error).not.toMatch(/db exploded/);
  });
});

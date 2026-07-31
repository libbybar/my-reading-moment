import { jest } from "@jest/globals";
import request from "supertest";

const parentService = {
  registerParent: jest.fn(),
};

jest.unstable_mockModule("../src/services/parentService.js", () => ({
  ...parentService,
}));

const { default: app } = await import("../src/app.js");

describe("POST /api/auth/register (service integration)", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns 201 with the service's own parent data, with no mock/real branching", async () => {
    parentService.registerParent.mockResolvedValue({
      status: "created",
      parent: {
        _id: "stub-parent-id",
        email: "parent@example.com",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      id: "stub-parent-id",
      email: "parent@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  test("returns 409 when the service reports emailTaken", async () => {
    parentService.registerParent.mockResolvedValue({ status: "emailTaken" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: "A parent account with this email already exists",
    });
  });

  test("returns a stable 500 error response when the service rejects, without leaking the underlying error", async () => {
    parentService.registerParent.mockRejectedValue(new Error("db exploded"));

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "parent@example.com", password: "correct-horse" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect(response.body.error).not.toMatch(/db exploded/);
  });
});

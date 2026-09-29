import request from "supertest";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import { addParentZoneSession } from "../support/testAuth.js";
import Parent from "../../src/models/Parent.js";
import * as textResultRepository from "../../src/repositories/textResultRepository.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("GET /api/child-profiles/:childId/progress", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  async function registerAndLogin(email, password) {
    await request(app).post("/api/auth/register").send({ email, password });
    const loginResponse = await request(app).post("/api/auth/login").send({ email, password });

    return addParentZoneSession(loginResponse.headers["set-cookie"], email);
  }

  async function createParentWithChild(overrides = {}) {
    const cookie = await registerAndLogin("parent@example.com", "correct-horse");
    const parent = await Parent.findOneAndUpdate(
      { email: "parent@example.com" },
      {
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            journeyProgress: 4,
            learningProfile: {
              readingLevel: "beginner",
              interests: [],
              currentLevel: 2,
              currentSublevel: 3,
              ...overrides,
            },
          },
        ],
      },
      { returnDocument: "after", runValidators: true },
    );

    return { cookie, parentId: parent._id.toString(), childId: parent.children[0]._id.toString() };
  }

  test("returns 401 without a valid auth cookie", async () => {
    const response = await request(app).get("/api/child-profiles/507f1f77bcf86cd799439011/progress");

    expect(response.statusCode).toBe(401);
  });

  test("returns 404 for a childId that doesn't exist", async () => {
    const cookie = await registerAndLogin("parent@example.com", "correct-horse");

    const response = await request(app)
      .get("/api/child-profiles/507f1f77bcf86cd799439011/progress")
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(404);
  });

  test("returns 404 (not another parent's child) when the child belongs to a different parent", async () => {
    const { childId } = await createParentWithChild();
    const otherCookie = await registerAndLogin("other-parent@example.com", "another-password");

    const response = await request(app)
      .get(`/api/child-profiles/${childId}/progress`)
      .set("Cookie", otherCookie);

    expect(response.statusCode).toBe(404);
  });

  test("returns 404 for an archived child, even though the id is real", async () => {
    const { cookie, parentId, childId } = await createParentWithChild();

    await Parent.updateOne(
      { _id: parentId, "children._id": childId },
      { $set: { "children.$.isArchived": true } },
    );

    const response = await request(app)
      .get(`/api/child-profiles/${childId}/progress`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(404);
  });

  test("returns the child's current level and journey progress, with an empty history", async () => {
    const { cookie, childId } = await createParentWithChild();

    const response = await request(app)
      .get(`/api/child-profiles/${childId}/progress`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      currentLevel: 2,
      currentSublevel: 3,
      journeyProgress: 4,
      results: [],
    });
  });

  test("returns the child's TextResult history across every level/sublevel, oldest first, with only the safe fields", async () => {
    const { cookie, parentId, childId } = await createParentWithChild();

    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 1,
      sublevel: 1,
      specVersion: 1,
      result: "success",
      startedAt: new Date("2026-01-01T10:00:00Z"),
      completedAt: new Date("2026-01-01T10:05:00Z"),
      evidence: { questionsTotal: 1, questionsCorrect: 1 },
    });
    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId,
      level: 1,
      sublevel: 2,
      specVersion: 1,
      result: "failure",
      startedAt: new Date("2026-01-02T10:00:00Z"),
      completedAt: new Date("2026-01-02T10:05:00Z"),
    });

    const response = await request(app)
      .get(`/api/child-profiles/${childId}/progress`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toEqual([
      { level: 1, sublevel: 1, result: "success", completedAt: "2026-01-01T10:05:00.000Z" },
      { level: 1, sublevel: 2, result: "failure", completedAt: "2026-01-02T10:05:00.000Z" },
    ]);
    // Never leaks sessionId, specVersion, or evidence.
    expect(response.body.results[0]).not.toHaveProperty("sessionId");
    expect(response.body.results[0]).not.toHaveProperty("specVersion");
    expect(response.body.results[0]).not.toHaveProperty("evidence");
  });

  test("does not include another child's TextResult history", async () => {
    const { cookie, parentId, childId } = await createParentWithChild();
    const otherChildId = new mongoose.Types.ObjectId();

    await textResultRepository.create({
      sessionId: randomUUID(),
      parentId,
      childId: otherChildId,
      level: 3,
      sublevel: 3,
      specVersion: 1,
      result: "success",
      startedAt: new Date(),
      completedAt: new Date(),
    });

    const response = await request(app)
      .get(`/api/child-profiles/${childId}/progress`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toEqual([]);
  });
});

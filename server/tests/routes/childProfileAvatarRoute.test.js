import request from "supertest";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import Parent from "../../src/models/Parent.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("PATCH /api/child-profiles/:childId/avatar", () => {
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

  async function createParentWithChild() {
    return createAuthenticatedParentWithChild({
      name: "גאיה",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
  }

  function chooseAvatar(childId, cookie, body) {
    return request(app).patch(`/api/child-profiles/${childId}/avatar`).set("Cookie", cookie).send(body);
  }

  async function storedChild(parentId, childId) {
    return (await Parent.findById(parentId)).children.id(childId);
  }

  test("returns 401 without a login cookie", async () => {
    const { childId } = await createParentWithChild();

    const response = await request(app).patch(`/api/child-profiles/${childId}/avatar`).send({ avatarId: "dragon" });

    expect(response.statusCode).toBe(401);
  });

  test("works with the login cookie alone — no parent-zone session, since it is a child action", async () => {
    const { childId, authCookie } = await createParentWithChild();

    const response = await chooseAvatar(childId, authCookie, { avatarId: "dragon" });

    expect(response.statusCode).toBe(200);
    expect(response.body.avatarId).toBe("dragon");
  });

  test.each([["not-a-real-avatar"], [null], [undefined], [7]])(
    "returns 400 and changes nothing for the avatarId %p",
    async (avatarId) => {
      const { parentId, childId, authCookie } = await createParentWithChild();

      const response = await chooseAvatar(childId, authCookie, { avatarId });

      expect(response.statusCode).toBe(400);
      expect(response.body.errorCode).toBe("child_profile_invalid_avatar");
      expect((await storedChild(parentId, childId)).avatarId).toBeUndefined();
    },
  );

  test("changes only the avatar — other fields in the body are ignored", async () => {
    const { parentId, childId, authCookie } = await createParentWithChild();

    await chooseAvatar(childId, authCookie, { avatarId: "star", name: "שם אחר", interests: ["space"] });

    const child = await storedChild(parentId, childId);
    expect(child.avatarId).toBe("star");
    expect(child.name).toBe("גאיה");
    expect(child.learningProfile.interests).toHaveLength(0);
  });

  test("returns 404 for another parent's child", async () => {
    const { childId } = await createParentWithChild();
    const other = await createParentWithChild();

    const response = await chooseAvatar(childId, other.authCookie, { avatarId: "dragon" });

    expect(response.statusCode).toBe(404);
  });

  test("returns 404 for an archived child", async () => {
    const { childId, cookie, authCookie } = await createParentWithChild();
    await request(app).delete(`/api/child-profiles/${childId}`).set("Cookie", cookie);

    const response = await chooseAvatar(childId, authCookie, { avatarId: "dragon" });

    expect(response.statusCode).toBe(404);
  });

  test("the general PATCH stays locked without a parent-zone session", async () => {
    const { childId, authCookie } = await createParentWithChild();

    const response = await request(app)
      .patch(`/api/child-profiles/${childId}`)
      .set("Cookie", authCookie)
      .send({ name: "חדש" });

    expect(response.statusCode).toBe(403);
  });
});

import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild, buildParentZoneCookie } from "../support/testAuth.js";
import { PARENT_ZONE_COOKIE_NAME } from "../../src/services/parentZoneSession.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("child-profile routes behind the parent zone", () => {
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

  const validNewChild = {
    name: "נועה",
    grammaticalGender: "female",
    readingLevel: "beginner",
    interests: [],
  };

  const guardedRoutes = [
    ["get", (childId) => `/api/child-profiles/${childId}/progress`, () => undefined],
    ["post", () => "/api/child-profiles", () => validNewChild],
    ["patch", (childId) => `/api/child-profiles/${childId}`, () => ({ name: "חדש" })],
    ["delete", (childId) => `/api/child-profiles/${childId}`, () => undefined],
  ];

  describe.each(guardedRoutes)("%s", (method, buildPath, buildBody) => {
    function send(childId, cookie) {
      const pending = request(app)[method](buildPath(childId)).set("Cookie", cookie);
      const body = buildBody();

      return body ? pending.send(body) : pending;
    }

    test("returns 403 parent_zone_locked with only the login cookie", async () => {
      const { childId, authCookie } = await createParentWithChild();

      const response = await send(childId, authCookie);

      expect(response.statusCode).toBe(403);
      expect(response.body.errorCode).toBe("parent_zone_locked");
    });

    test("returns 403 for another parent's parent-zone session", async () => {
      const { childId, authCookie } = await createParentWithChild();
      const other = await createParentWithChild();

      const response = await send(childId, `${authCookie}; ${buildParentZoneCookie(other.parentId)}`);

      expect(response.statusCode).toBe(403);
    });

    test("returns 403 when the login token is planted as the parent-zone cookie", async () => {
      const { childId, authCookie } = await createParentWithChild();
      const loginToken = authCookie.split("=")[1];

      const response = await send(childId, `${authCookie}; ${PARENT_ZONE_COOKIE_NAME}=${loginToken}`);

      expect(response.statusCode).toBe(403);
    });

    test("returns 403 for an expired parent-zone session", async () => {
      const { childId, authCookie, parentId } = await createParentWithChild();
      const expired = jwt.sign({ parentId, scope: "parentZone" }, process.env.JWT_SECRET, { expiresIn: -10 });

      const response = await send(childId, `${authCookie}; ${PARENT_ZONE_COOKIE_NAME}=${expired}`);

      expect(response.statusCode).toBe(403);
    });

    test("succeeds with an unlocked session and renews it", async () => {
      const { childId, cookie } = await createParentWithChild();

      const response = await send(childId, cookie);

      expect(response.statusCode).toBeLessThan(300);
      expect((response.headers["set-cookie"] ?? []).some((value) => value.startsWith("parentZone="))).toBe(true);
    });
  });

  test("GET /api/child-profiles stays open with only the login cookie, for child selection", async () => {
    const { authCookie } = await createParentWithChild();

    const response = await request(app).get("/api/child-profiles").set("Cookie", authCookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.childProfiles).toHaveLength(1);
  });

  test("a locked request changes nothing", async () => {
    const { childId, authCookie } = await createParentWithChild();

    await request(app).delete(`/api/child-profiles/${childId}`).set("Cookie", authCookie);

    const listResponse = await request(app).get("/api/child-profiles").set("Cookie", authCookie);
    expect(listResponse.body.childProfiles).toHaveLength(1);
  });
});

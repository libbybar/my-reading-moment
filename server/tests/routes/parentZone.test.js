import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import * as testDb from "../support/testDb.js";
import Parent from "../../src/models/Parent.js";
import * as parentRepository from "../../src/repositories/parentRepository.js";
import { hashPassword } from "../../src/services/passwordHasher.js";
import { clearAllAttempts, MAX_FAILED_ATTEMPTS, LOCKOUT_MS } from "../../src/services/parentZoneAttemptLimiter.js";
import { createAuthenticatedParent, buildParentZoneCookie } from "../support/testAuth.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const PIN = "1234";
const PASSWORD = "correct-horse";

// Real bcrypt on every PIN check: over Jest's 5s default when other suites compete for CPU.
jest.setTimeout(30000);

describe("/api/parent-zone", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    jest.restoreAllMocks();
    clearAllAttempts();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  async function createParentWithPin(pin = PIN) {
    const { parent, authCookie } = await createAuthenticatedParent();

    await parentRepository.replaceParentPinHash(parent._id, await hashPassword(pin));

    return { parentId: parent._id.toString(), authCookie };
  }

  async function registerAndLogin() {
    const email = "real-parent@example.com";

    await request(app).post("/api/auth/register").send({ email, password: PASSWORD });
    const loginResponse = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
    const parent = await parentRepository.findByEmail(email);

    return { cookie: loginResponse.headers["set-cookie"], parentId: parent._id.toString() };
  }

  function unlock(authCookie, pin) {
    return request(app).post("/api/parent-zone/unlock").set("Cookie", authCookie).send({ pin });
  }

  function getParentZoneCookie(response) {
    return (response.headers["set-cookie"] ?? []).find((cookie) => cookie.startsWith("parentZone="));
  }

  async function storedPinHash(parentId) {
    const parent = await Parent.findById(parentId).select("+parentPinHash");

    return parent.parentPinHash;
  }

  describe("every route", () => {
    test.each([
      ["get", "/api/parent-zone/status"],
      ["post", "/api/parent-zone/unlock"],
      ["post", "/api/parent-zone/pin"],
    ])("%s %s requires the login cookie", async (method, path) => {
      const response = await request(app)[method](path).send({});

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /status", () => {
    test("reports no PIN and locked for a parent who never set one", async () => {
      const { authCookie } = await createAuthenticatedParent();

      const response = await request(app).get("/api/parent-zone/status").set("Cookie", authCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ pinSet: false, unlocked: false });
    });

    test("reports a set PIN but still locked without a parent-zone session", async () => {
      const { authCookie } = await createParentWithPin();

      const response = await request(app).get("/api/parent-zone/status").set("Cookie", authCookie);

      expect(response.body).toEqual({ pinSet: true, unlocked: false });
    });

    test("reports unlocked with a valid parent-zone session, and never exposes the hash", async () => {
      const { authCookie, parentId } = await createParentWithPin();

      const response = await request(app)
        .get("/api/parent-zone/status")
        .set("Cookie", `${authCookie}; ${buildParentZoneCookie(parentId)}`);

      expect(response.body).toEqual({ pinSet: true, unlocked: true });
    });

    test("does not treat another parent's parent-zone session as unlocked", async () => {
      const { authCookie } = await createParentWithPin();
      const other = await createAuthenticatedParent();

      const response = await request(app)
        .get("/api/parent-zone/status")
        .set("Cookie", `${authCookie}; ${buildParentZoneCookie(other.parent._id)}`);

      expect(response.body.unlocked).toBe(false);
    });
  });

  describe("POST /unlock", () => {
    test("a correct PIN starts an httpOnly parent-zone session", async () => {
      const { authCookie } = await createParentWithPin();

      const response = await unlock(authCookie, PIN);
      const cookie = getParentZoneCookie(response);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ unlocked: true });
      expect(cookie).toMatch(/HttpOnly/i);
    });

    test("a wrong PIN returns 403 invalid credentials and starts no session", async () => {
      const { authCookie } = await createParentWithPin();

      const response = await unlock(authCookie, "9999");

      expect(response.statusCode).toBe(403);
      expect(response.body.errorCode).toBe("parent_zone_invalid_credentials");
      expect(getParentZoneCookie(response)).toBeUndefined();
    });

    test.each([["12"], ["12345"], ["12a4"], [1234], [null], [undefined]])(
      "rejects the malformed PIN %p with 400",
      async (pin) => {
        const { authCookie } = await createParentWithPin();

        const response = await unlock(authCookie, pin);

        expect(response.statusCode).toBe(400);
        expect(response.body.errorCode).toBe("parent_zone_invalid_input");
      },
    );

    test("returns 409 when no PIN has been set", async () => {
      const { authCookie } = await createAuthenticatedParent();

      const response = await unlock(authCookie, PIN);

      expect(response.statusCode).toBe(409);
      expect(response.body.errorCode).toBe("parent_zone_pin_not_set");
    });

    test("locks out after the failure limit, even for the correct PIN", async () => {
      const { authCookie } = await createParentWithPin();

      for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
        await unlock(authCookie, "9999");
      }
      const response = await unlock(authCookie, PIN);

      expect(response.statusCode).toBe(429);
      expect(response.body.errorCode).toBe("parent_zone_too_many_attempts");
      expect(getParentZoneCookie(response)).toBeUndefined();
    });

    test("accepts the correct PIN again once the lockout has passed", async () => {
      const { authCookie } = await createParentWithPin();
      for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
        await unlock(authCookie, "9999");
      }
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + LOCKOUT_MS + 1000);

      const response = await unlock(authCookie, PIN);

      expect(response.statusCode).toBe(200);
    });

    test("one parent's lockout does not affect another parent", async () => {
      const first = await createParentWithPin();
      const second = await createParentWithPin();

      for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
        await unlock(first.authCookie, "9999");
      }
      const response = await unlock(second.authCookie, PIN);

      expect(response.statusCode).toBe(200);
    });
  });

  describe("POST /lock", () => {
    test("clears the parent-zone cookie", async () => {
      const response = await request(app).post("/api/parent-zone/lock");

      expect(response.statusCode).toBe(200);
      expect(getParentZoneCookie(response)).toMatch(/parentZone=;/);
    });
  });

  describe("POST /pin — first PIN", () => {
    test("is set with the account password, stores only a hash, and starts a session", async () => {
      const { cookie, parentId } = await registerAndLogin();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: PIN, password: PASSWORD });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ pinSet: true, unlocked: true });
      expect(getParentZoneCookie(response)).toBeDefined();

      const stored = await storedPinHash(parentId);
      expect(stored).toBeDefined();
      expect(stored).not.toBe(PIN);
    });

    test("cannot be claimed with the login cookie alone", async () => {
      const { authCookie, parent } = await createAuthenticatedParent();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: PIN });

      expect(response.statusCode).toBe(400);
      expect(await storedPinHash(parent._id)).toBeUndefined();
    });

    test("rejects a wrong password and sets nothing", async () => {
      const { cookie, parentId } = await registerAndLogin();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: PIN, password: "not-the-password" });

      expect(response.statusCode).toBe(403);
      expect(await storedPinHash(parentId)).toBeUndefined();
    });

    test("returns 409 when a currentPin is given but no PIN exists yet", async () => {
      const { authCookie } = await createAuthenticatedParent();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: PIN, currentPin: "0000" });

      expect(response.statusCode).toBe(409);
      expect(response.body.errorCode).toBe("parent_zone_pin_not_set");
    });

    test("rejects a malformed new PIN with 400", async () => {
      const { cookie } = await registerAndLogin();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: "12", password: PASSWORD });

      expect(response.statusCode).toBe(400);
    });

    test("an existing PIN cannot be replaced without proof", async () => {
      const { authCookie, parentId } = await createParentWithPin();
      const hashBefore = await storedPinHash(parentId);

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: "5678" });

      expect(response.statusCode).toBe(400);
      expect(await storedPinHash(parentId)).toBe(hashBefore);
    });
  });

  describe("POST /pin — change", () => {
    async function unlockWithNewPin(authCookie, newPin) {
      return unlock(authCookie, newPin);
    }

    test("changes the PIN when the current PIN is supplied", async () => {
      const { authCookie } = await createParentWithPin();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: "5678", currentPin: PIN });

      expect(response.statusCode).toBe(200);
      expect((await unlockWithNewPin(authCookie, "5678")).statusCode).toBe(200);
      expect((await unlock(authCookie, PIN)).statusCode).toBe(403);
    });

    test("changes the PIN when the account password is supplied instead (forgotten PIN)", async () => {
      const { cookie, parentId } = await registerAndLogin();
      await parentRepository.replaceParentPinHash(parentId, await hashPassword(PIN));

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: "5678", password: PASSWORD });

      expect(response.statusCode).toBe(200);
      expect((await unlock(cookie, "5678")).statusCode).toBe(200);
    });

    test("a wrong current PIN returns 403 and leaves the PIN unchanged", async () => {
      const { authCookie, parentId } = await createParentWithPin();
      const hashBefore = await storedPinHash(parentId);

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: "5678", currentPin: "0000" });

      expect(response.statusCode).toBe(403);
      expect(await storedPinHash(parentId)).toBe(hashBefore);
    });

    test("a wrong account password returns 403 and leaves the PIN unchanged", async () => {
      const { cookie, parentId } = await registerAndLogin();
      await parentRepository.replaceParentPinHash(parentId, await hashPassword(PIN));
      const hashBefore = await storedPinHash(parentId);

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: "5678", password: "not-the-password" });

      expect(response.statusCode).toBe(403);
      expect(await storedPinHash(parentId)).toBe(hashBefore);
    });

    test("supplying both currentPin and password is rejected as invalid input", async () => {
      const { authCookie } = await createParentWithPin();

      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", authCookie)
        .send({ newPin: "5678", currentPin: PIN, password: PASSWORD });

      expect(response.statusCode).toBe(400);
    });

    test("password guesses count toward the same lockout as PIN guesses", async () => {
      const { cookie, parentId } = await registerAndLogin();
      await parentRepository.replaceParentPinHash(parentId, await hashPassword(PIN));

      for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
        await request(app)
          .post("/api/parent-zone/pin")
          .set("Cookie", cookie)
          .send({ newPin: "5678", password: "wrong-password" });
      }
      const response = await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", cookie)
        .send({ newPin: "5678", password: PASSWORD });

      expect(response.statusCode).toBe(429);
    });

    test("cannot change another parent's PIN by putting a parentId in the body", async () => {
      const attacker = await createParentWithPin("1111");
      const victim = await createParentWithPin("2222");
      const victimHashBefore = await storedPinHash(victim.parentId);

      await request(app)
        .post("/api/parent-zone/pin")
        .set("Cookie", attacker.authCookie)
        .send({ newPin: "5678", currentPin: "1111", parentId: victim.parentId });

      expect(await storedPinHash(victim.parentId)).toBe(victimHashBefore);
    });
  });
});

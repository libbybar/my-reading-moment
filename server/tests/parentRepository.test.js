import * as testDb from "./support/testDb.js";
import * as parentRepository from "../src/repositories/parentRepository.js";

describe("parentRepository", () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  describe("findByEmail", () => {
    test("returns null when no parent has the given email", async () => {
      const found = await parentRepository.findByEmail("nobody@example.com");

      expect(found).toBeNull();
    });

    test("finds a parent regardless of the input's casing or surrounding whitespace", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      const found = await parentRepository.findByEmail("  PARENT@Example.com  ");

      expect(found).not.toBeNull();
      expect(found.email).toBe("parent@example.com");
    });
  });

  describe("findByEmailWithPasswordHash", () => {
    test("includes passwordHash, unlike findByEmail", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      const withoutHash = await parentRepository.findByEmail("parent@example.com");
      const withHash = await parentRepository.findByEmailWithPasswordHash("parent@example.com");

      expect(withoutHash.passwordHash).toBeUndefined();
      expect(withHash.passwordHash).toBe("hash");
    });

    test("returns null when no parent has the given email", async () => {
      const found = await parentRepository.findByEmailWithPasswordHash("nobody@example.com");

      expect(found).toBeNull();
    });
  });

  describe("findById", () => {
    test("returns the parent matching the given id", async () => {
      const created = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
      });

      const found = await parentRepository.findById(created._id);

      expect(found.email).toBe("parent@example.com");
    });

    test("returns null for an id that doesn't exist", async () => {
      const found = await parentRepository.findById("507f1f77bcf86cd799439011");

      expect(found).toBeNull();
    });
  });

  describe("recordLogin", () => {
    test("sets lastLoginAt on the parent", async () => {
      const created = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
      });
      expect(created.lastLoginAt).toBeUndefined();

      const updated = await parentRepository.recordLogin(created._id);

      expect(updated.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe("create", () => {
    test("persists a parent with a normalized (trimmed, lowercased) email", async () => {
      const parent = await parentRepository.create({
        email: "  Parent@Example.com  ",
        passwordHash: "hash",
      });

      expect(parent.email).toBe("parent@example.com");
    });

    test("throws DuplicateEmailError when the email is already registered, regardless of casing", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      await expect(
        parentRepository.create({ email: "PARENT@example.com", passwordHash: "another-hash" }),
      ).rejects.toThrow(parentRepository.DuplicateEmailError);
    });
  });
});

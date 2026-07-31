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

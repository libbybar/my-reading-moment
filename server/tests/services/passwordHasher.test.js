import { hashPassword, comparePassword } from "../../src/services/passwordHasher.js";

describe("passwordHasher", () => {
  test("hashPassword produces a bcrypt hash, not the plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery");

    expect(hash).not.toBe("correct-horse-battery");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test("comparePassword resolves true for the matching plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery");

    await expect(comparePassword("correct-horse-battery", hash)).resolves.toBe(true);
  });

  test("comparePassword resolves false for a non-matching plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery");

    await expect(comparePassword("wrong-password", hash)).resolves.toBe(false);
  });
});

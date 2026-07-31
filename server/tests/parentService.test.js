import { jest } from "@jest/globals";

const parentRepository = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  DuplicateEmailError: class DuplicateEmailError extends Error {},
};

jest.unstable_mockModule("../src/repositories/parentRepository.js", () => parentRepository);

const { registerParent } = await import("../src/services/parentService.js");

describe("parentService.registerParent", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns emailTaken without creating anything when the email is already registered", async () => {
    parentRepository.findByEmail.mockResolvedValue({ id: "existing-parent" });

    const result = await registerParent({ email: "parent@example.com", password: "correct-horse" });

    expect(result).toEqual({ status: "emailTaken" });
    expect(parentRepository.create).not.toHaveBeenCalled();
  });

  test("hashes the password before creating the parent, never passing the plaintext through", async () => {
    parentRepository.findByEmail.mockResolvedValue(null);
    parentRepository.create.mockResolvedValue({ email: "parent@example.com" });

    await registerParent({ email: "parent@example.com", password: "correct-horse" });

    const [[createArgs]] = parentRepository.create.mock.calls;
    expect(createArgs.email).toBe("parent@example.com");
    expect(createArgs.passwordHash).not.toBe("correct-horse");
    expect(createArgs.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test("returns created with the repository's parent on success", async () => {
    parentRepository.findByEmail.mockResolvedValue(null);
    const createdParent = { id: "new-parent", email: "parent@example.com" };
    parentRepository.create.mockResolvedValue(createdParent);

    const result = await registerParent({ email: "parent@example.com", password: "correct-horse" });

    expect(result).toEqual({ status: "created", parent: createdParent });
  });

  test("returns emailTaken when the repository reports a duplicate email on create (race with a concurrent registration)", async () => {
    parentRepository.findByEmail.mockResolvedValue(null);
    parentRepository.create.mockRejectedValue(new parentRepository.DuplicateEmailError());

    const result = await registerParent({ email: "parent@example.com", password: "correct-horse" });

    expect(result).toEqual({ status: "emailTaken" });
  });

  test("rethrows unexpected repository errors", async () => {
    parentRepository.findByEmail.mockResolvedValue(null);
    parentRepository.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      registerParent({ email: "parent@example.com", password: "correct-horse" }),
    ).rejects.toThrow("connection lost");
  });
});

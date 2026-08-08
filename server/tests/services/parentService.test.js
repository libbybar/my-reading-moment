import { jest } from "@jest/globals";

const parentRepository = {
  findByEmail: jest.fn(),
  findByEmailWithPasswordHash: jest.fn(),
  recordLogin: jest.fn(),
  create: jest.fn(),
  DuplicateEmailError: class DuplicateEmailError extends Error {},
};

jest.unstable_mockModule("../../src/repositories/parentRepository.js", () => parentRepository);

const { registerParent, loginParent } = await import("../../src/services/parentService.js");
const { hashPassword } = await import("../../src/services/passwordHasher.js");

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

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

describe("parentService.loginParent", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns invalidCredentials when no parent has that email", async () => {
    parentRepository.findByEmailWithPasswordHash.mockResolvedValue(null);

    const result = await loginParent({ email: "nobody@example.com", password: "whatever123" });

    expect(result).toEqual({ status: "invalidCredentials" });
    expect(parentRepository.recordLogin).not.toHaveBeenCalled();
  });

  test("returns invalidCredentials when the password doesn't match, without recording a login", async () => {
    const passwordHash = await hashPassword("correct-horse-battery");
    parentRepository.findByEmailWithPasswordHash.mockResolvedValue({
      _id: "parent-1",
      email: "parent@example.com",
      passwordHash,
    });

    const result = await loginParent({ email: "parent@example.com", password: "wrong-password" });

    expect(result).toEqual({ status: "invalidCredentials" });
    expect(parentRepository.recordLogin).not.toHaveBeenCalled();
  });

  test("returns success with a token and the repository's updated parent on a matching password", async () => {
    const passwordHash = await hashPassword("correct-horse-battery");
    parentRepository.findByEmailWithPasswordHash.mockResolvedValue({
      _id: "parent-1",
      email: "parent@example.com",
      passwordHash,
    });
    const updatedParent = { _id: "parent-1", email: "parent@example.com", lastLoginAt: new Date() };
    parentRepository.recordLogin.mockResolvedValue(updatedParent);

    const result = await loginParent({
      email: "parent@example.com",
      password: "correct-horse-battery",
    });

    expect(result.status).toBe("success");
    expect(result.parent).toBe(updatedParent);
    expect(typeof result.token).toBe("string");
    expect(result.token.split(".")).toHaveLength(3);
    expect(parentRepository.recordLogin).toHaveBeenCalledWith("parent-1");
  });
});

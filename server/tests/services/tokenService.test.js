import jwt from "jsonwebtoken";
import { generateToken, verifyToken } from "../../src/services/tokenService.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("tokenService", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  });

  test("generateToken then verifyToken round-trips the parent's id", () => {
    const parent = { _id: "507f1f77bcf86cd799439011" };

    const token = generateToken(parent);
    const decoded = verifyToken(token);

    expect(decoded.parentId).toBe("507f1f77bcf86cd799439011");
  });

  test("verifyToken throws for a token signed with a different secret", () => {
    const tampered = jwt.sign({ parentId: "x" }, "a-different-secret");

    expect(() => verifyToken(tampered)).toThrow();
  });

  test("verifyToken throws for an expired token", () => {
    const token = jwt.sign(
      { parentId: "x", exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
    );

    expect(() => verifyToken(token)).toThrow();
  });

  test("verifyToken throws for a malformed token", () => {
    expect(() => verifyToken("not-a-real-token")).toThrow();
  });
});

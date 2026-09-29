import { jest } from "@jest/globals";

import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  clearAllAttempts,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MS,
} from "../../src/services/parentZoneAttemptLimiter.js";

describe("parentZoneAttemptLimiter", () => {
  let now;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    clearAllAttempts();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function failTimes(parentId, times) {
    for (let index = 0; index < times; index += 1) {
      recordFailedAttempt(parentId);
    }
  }

  test("is not locked out before the failure limit", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS - 1);

    expect(isLockedOut("parent-1")).toBe(false);
  });

  test("locks out exactly at the failure limit", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS);

    expect(isLockedOut("parent-1")).toBe(true);
  });

  test("stays locked just before the lockout ends and is released once it does", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS);

    now += LOCKOUT_MS - 1;
    expect(isLockedOut("parent-1")).toBe(true);

    now += 1;
    expect(isLockedOut("parent-1")).toBe(false);
  });

  test("starts a fresh failure count after a lockout ends", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS);
    now += LOCKOUT_MS;

    failTimes("parent-1", MAX_FAILED_ATTEMPTS - 1);

    expect(isLockedOut("parent-1")).toBe(false);
  });

  test("a success clears earlier failures", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS - 1);
    clearFailedAttempts("parent-1");

    failTimes("parent-1", MAX_FAILED_ATTEMPTS - 1);

    expect(isLockedOut("parent-1")).toBe(false);
  });

  test("one parent's failures never lock out another", () => {
    failTimes("parent-1", MAX_FAILED_ATTEMPTS);

    expect(isLockedOut("parent-2")).toBe(false);
  });
});

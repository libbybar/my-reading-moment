import { jest } from "@jest/globals";

const fs = {
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
};

jest.unstable_mockModule("fs", () => ({
  default: fs,
}));

const { writeDebugLog, runWithRequestId } = await import("../src/services/debugLogger.js");

const ORIGINAL_ENV = process.env;

function readLoggedEntry(callIndex = 0) {
  const [, content] = fs.appendFileSync.mock.calls[callIndex];

  return JSON.parse(content.trim());
}

describe("debugLogger", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    fs.mkdirSync.mockReset();
    fs.appendFileSync.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  test("does not write when TIMING_LOG_ENABLED is unset", () => {
    delete process.env.TIMING_LOG_ENABLED;

    writeDebugLog({ tag: "Route", label: "test" });

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test("does not write during automated tests, even when TIMING_LOG_ENABLED=true", () => {
    process.env.TIMING_LOG_ENABLED = "true";

    writeDebugLog({ tag: "Route", label: "test" });

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test("does not write outside test env when TIMING_LOG_ENABLED is not 'true'", () => {
    process.env.NODE_ENV = "development";
    delete process.env.TIMING_LOG_ENABLED;

    writeDebugLog({ tag: "Route", label: "test" });

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test("writes a JSON line when enabled outside test env", () => {
    process.env.NODE_ENV = "development";
    process.env.TIMING_LOG_ENABLED = "true";

    writeDebugLog({ tag: "Route", label: "POST /preview", durationSeconds: 1.23 });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    expect(readLoggedEntry()).toEqual(
      expect.objectContaining({
        tag: "Route",
        label: "POST /preview",
        durationSeconds: 1.23,
        timestamp: expect.any(String),
      }),
    );
  });

  test("includes the requestId from runWithRequestId automatically", () => {
    process.env.NODE_ENV = "development";
    process.env.TIMING_LOG_ENABLED = "true";

    runWithRequestId("abc123", () => {
      writeDebugLog({ tag: "LLM", label: "Gemini: generatePassage" });
    });

    expect(readLoggedEntry().requestId).toBe("abc123");
  });

  test("omits requestId when called outside runWithRequestId", () => {
    process.env.NODE_ENV = "development";
    process.env.TIMING_LOG_ENABLED = "true";

    writeDebugLog({ tag: "Route", label: "test" });

    expect(readLoggedEntry()).not.toHaveProperty("requestId");
  });

  test("does not throw when the log file write fails, and warns once", () => {
    process.env.NODE_ENV = "development";
    process.env.TIMING_LOG_ENABLED = "true";
    fs.appendFileSync.mockImplementation(() => {
      throw new Error("disk full");
    });

    expect(() => writeDebugLog({ tag: "Route", label: "test" })).not.toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][0]).toContain("disk full");
  });

  test("does not throw when the log directory cannot be created, and warns once", () => {
    process.env.NODE_ENV = "development";
    process.env.TIMING_LOG_ENABLED = "true";
    fs.mkdirSync.mockImplementation(() => {
      throw new Error("permission denied");
    });

    expect(() => writeDebugLog({ tag: "Route", label: "test" })).not.toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

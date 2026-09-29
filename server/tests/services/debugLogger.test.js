import { jest } from "@jest/globals";

const fs = {
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
};

jest.unstable_mockModule("fs", () => ({
  default: fs,
}));

const { writeDebugLog, writeLearningLog, runWithRequestId } = await import("../../src/services/debugLogger.js");

const ORIGINAL_ENV = process.env;

function readLoggedEntry(callIndex = 0) {
  const [, content] = fs.appendFileSync.mock.calls[callIndex];

  return JSON.parse(content.trim());
}

function loggedFilePath(callIndex = 0) {
  const [filePath] = fs.appendFileSync.mock.calls[callIndex];

  return filePath;
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
    expect(loggedFilePath()).toMatch(/timing\.jsonl$/);
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

describe("writeLearningLog", () => {
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

  test("does not write during automated tests, regardless of TIMING_LOG_ENABLED", () => {
    process.env.TIMING_LOG_ENABLED = "true";

    writeLearningLog({ tag: "Learning", label: "Text completed" });

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test("writes outside test env even when TIMING_LOG_ENABLED is unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.TIMING_LOG_ENABLED;

    writeLearningLog({ tag: "Learning", label: "Text completed", result: "success" });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    expect(loggedFilePath()).toMatch(/learning\.jsonl$/);
    expect(readLoggedEntry()).toEqual(
      expect.objectContaining({
        tag: "Learning",
        label: "Text completed",
        result: "success",
        timestamp: expect.any(String),
      }),
    );
  });

  test("includes the requestId from runWithRequestId automatically", () => {
    process.env.NODE_ENV = "development";

    runWithRequestId("abc123", () => {
      writeLearningLog({ tag: "Learning", label: "Text completed" });
    });

    expect(readLoggedEntry().requestId).toBe("abc123");
  });

  test("does not throw when the log file write fails, and warns once", () => {
    process.env.NODE_ENV = "development";
    fs.appendFileSync.mockImplementation(() => {
      throw new Error("disk full");
    });

    expect(() => writeLearningLog({ tag: "Learning", label: "Text completed" })).not.toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][0]).toContain("disk full");
  });
});

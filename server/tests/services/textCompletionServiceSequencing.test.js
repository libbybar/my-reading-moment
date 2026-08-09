// A MongoDB ClientSession does not support concurrent operations sharing it —
// Progression's two reads must run one after the other on the transaction
// session, not via Promise.all. This mocks the repositories (not mongoose
// itself, so a real transaction still wraps the calls) to prove the second
// read is never even started before the first one resolves.
import { jest } from "@jest/globals";

const textResultRepository = {
  create: jest.fn().mockResolvedValue({}),
  findBySessionId: jest.fn(),
  findRecentRaw: jest.fn(),
  findRecentNonSkipped: jest.fn(),
};
const parentRepository = {
  addLearningEvent: jest.fn(),
  applyTextCompletionProgress: jest.fn().mockResolvedValue({ _id: "child-1" }),
};

jest.unstable_mockModule("../../src/repositories/textResultRepository.js", () => textResultRepository);
jest.unstable_mockModule("../../src/repositories/parentRepository.js", () => parentRepository);

const { completeText } = await import("../../src/services/textCompletionService.js");
const testDb = await import("../support/testDb.js");

describe("completeText — Progression reads run sequentially on the shared transaction session", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  test("findRecentNonSkipped is not started until findRecentRaw has resolved", async () => {
    const callOrder = [];
    let resolveFindRecentRaw;

    textResultRepository.findRecentRaw.mockImplementation(() => {
      callOrder.push("findRecentRaw:start");

      return new Promise((resolve) => {
        resolveFindRecentRaw = () => {
          callOrder.push("findRecentRaw:resolve");
          resolve([]);
        };
      });
    });
    textResultRepository.findRecentNonSkipped.mockImplementation(() => {
      callOrder.push("findRecentNonSkipped:start");

      return Promise.resolve([]);
    });

    const completion = completeText({
      sessionId: "sequencing-test-session",
      parentId: "parent-1",
      childId: "child-1",
      level: 1,
      sublevel: 1,
      result: "success",
      startedAt: new Date(),
    });

    // Let pending microtasks flush so findRecentRaw is actually invoked, while
    // its own promise is still deliberately unresolved.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(textResultRepository.findRecentRaw).toHaveBeenCalledTimes(1);
    expect(textResultRepository.findRecentNonSkipped).not.toHaveBeenCalled();

    resolveFindRecentRaw();
    await completion;

    expect(callOrder).toEqual(["findRecentRaw:start", "findRecentRaw:resolve", "findRecentNonSkipped:start"]);
  });
});

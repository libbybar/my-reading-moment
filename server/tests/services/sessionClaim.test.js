import { jest } from "@jest/globals";
import readingSessionStore from "../../src/services/readingSessionStore.js";
import { withClaimedSession, SessionClaimError } from "../../src/services/sessionClaim.js";

const passage = { id: "test-passage-1", title: "Title", text: "Text", readingLevel: "beginner" };
const currentQuestion = {
  id: "test-question-1",
  passageId: "test-passage-1",
  prompt: "?",
  expectedMeaning: "meaning",
};

function seedSession() {
  return readingSessionStore.createSession({
    passage,
    currentQuestion,
    askedQuestionIds: [],
    parentId: "parent-1",
    childId: "child-1",
  });
}

describe("withClaimedSession", () => {
  beforeEach(() => {
    readingSessionStore.clearSessions();
  });

  test("runs work once and releases the session back to active when work does not complete it", async () => {
    const session = seedSession();
    const work = jest.fn().mockResolvedValue("done");

    const result = await withClaimedSession(session.sessionId, work);

    expect(result).toBe("done");
    expect(work).toHaveBeenCalledTimes(1);
    expect(readingSessionStore.getSession(session.sessionId).state).toBe("active");
  });

  test("passes the claimed (locked-state) session into work", async () => {
    const session = seedSession();
    const work = jest.fn().mockResolvedValue(undefined);

    await withClaimedSession(session.sessionId, work);

    expect(work).toHaveBeenCalledWith(expect.objectContaining({ sessionId: session.sessionId, state: "locked" }));
  });

  test("does not override a terminal completion — work calling completeSession itself stays completed", async () => {
    const session = seedSession();
    const work = jest.fn(async () => {
      readingSessionStore.completeSession(session.sessionId);
      return "finished";
    });

    const result = await withClaimedSession(session.sessionId, work);

    expect(result).toBe("finished");
    expect(readingSessionStore.getSession(session.sessionId).state).toBe("completed");
  });

  test("a second concurrent claim is rejected immediately, without running its own work, while the first is mid-flight", async () => {
    const session = seedSession();
    let resolveFirstWork;
    const firstWork = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFirstWork = resolve;
        }),
    );
    const secondWork = jest.fn();

    const firstCallPromise = withClaimedSession(session.sessionId, firstWork);

    await expect(withClaimedSession(session.sessionId, secondWork)).rejects.toThrow(SessionClaimError);
    expect(secondWork).not.toHaveBeenCalled();

    resolveFirstWork("first-result");
    await expect(firstCallPromise).resolves.toBe("first-result");
    expect(firstWork).toHaveBeenCalledTimes(1);
  });

  test("releases back to active (not stuck locked) when work throws, allowing a legitimate retry", async () => {
    const session = seedSession();
    const failingWork = jest.fn().mockRejectedValue(new Error("transaction failed"));

    await expect(withClaimedSession(session.sessionId, failingWork)).rejects.toThrow("transaction failed");
    expect(readingSessionStore.getSession(session.sessionId).state).toBe("active");

    const retryWork = jest.fn().mockResolvedValue("retried");
    await expect(withClaimedSession(session.sessionId, retryWork)).resolves.toBe("retried");
  });

  test("rejects with reason 'not_found' for an unknown sessionId, without calling work", async () => {
    const work = jest.fn();

    await expect(withClaimedSession("unknown", work)).rejects.toThrow(SessionClaimError);
    await expect(withClaimedSession("unknown", work)).rejects.toMatchObject({ reason: "not_found" });
    expect(work).not.toHaveBeenCalled();
  });

  test("rejects with reason 'conflict' for a session that is already completed", async () => {
    const session = seedSession();
    await withClaimedSession(session.sessionId, () => readingSessionStore.completeSession(session.sessionId));

    const work = jest.fn();
    await expect(withClaimedSession(session.sessionId, work)).rejects.toMatchObject({ reason: "conflict" });
    expect(work).not.toHaveBeenCalled();
  });
});

import readingSessionStore from "../../src/services/readingSessionStore.js";

describe("readingSessionStore", () => {
  const passage = { id: "test-passage-1", title: "Title", text: "Text", readingLevel: "beginner" };
  const currentQuestion = {
    id: "test-question-1",
    passageId: "test-passage-1",
    prompt: "?",
    expectedMeaning: "meaning",
  };

  beforeEach(() => {
    readingSessionStore.clearSessions();
  });

  test("creates a session with a unique sessionId and the provided data", () => {
    const sessionA = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
      parentId: "parent-a",
      childId: "child-a",
    });
    const sessionB = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
      parentId: "parent-b",
      childId: "child-b",
    });

    expect(typeof sessionA.sessionId).toBe("string");
    expect(sessionA.sessionId.length).toBeGreaterThan(0);
    expect(sessionA.sessionId).not.toBe(sessionB.sessionId);
    expect(sessionA.passage).toEqual(passage);
    expect(sessionA.currentQuestion).toEqual(currentQuestion);
    expect(sessionA.askedQuestionIds).toEqual(["test-question-1"]);
  });

  test("stores the given parentId and childId on the session", () => {
    const session = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
      parentId: "parent-1",
      childId: "child-1",
    });

    expect(session.parentId).toBe("parent-1");
    expect(session.childId).toBe("child-1");

    const stored = readingSessionStore.getSession(session.sessionId);
    expect(stored.parentId).toBe("parent-1");
    expect(stored.childId).toBe("child-1");
  });

  test("stores the given level and sublevel on the session", () => {
    const session = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
      level: 2,
      sublevel: 3,
    });

    expect(session.level).toBe(2);
    expect(session.sublevel).toBe(3);
    expect(readingSessionStore.getSession(session.sessionId)).toMatchObject({ level: 2, sublevel: 3 });
  });

  test("stores a clone, not a reference, of the input data", () => {
    const mutablePassage = { ...passage };
    const mutableQuestion = { ...currentQuestion };
    const mutableAskedIds = ["test-question-1"];

    const session = readingSessionStore.createSession({
      passage: mutablePassage,
      currentQuestion: mutableQuestion,
      askedQuestionIds: mutableAskedIds,
    });

    mutablePassage.title = "Mutated";
    mutableQuestion.prompt = "Mutated";
    mutableAskedIds.push("test-question-2");

    const stored = readingSessionStore.getSession(session.sessionId);

    expect(stored.passage.title).toBe("Title");
    expect(stored.currentQuestion.prompt).toBe("?");
    expect(stored.askedQuestionIds).toEqual(["test-question-1"]);
  });

  test("getSession returns a clone that cannot mutate the store's internal state", () => {
    const session = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
    });

    const firstRead = readingSessionStore.getSession(session.sessionId);
    firstRead.passage.title = "Mutated";
    firstRead.askedQuestionIds.push("test-question-2");

    const secondRead = readingSessionStore.getSession(session.sessionId);

    expect(secondRead.passage.title).toBe("Title");
    expect(secondRead.askedQuestionIds).toEqual(["test-question-1"]);
  });

  test("getSession returns undefined for an unknown sessionId", () => {
    expect(readingSessionStore.getSession("unknown")).toBeUndefined();
  });

  test("clearSessions removes all stored sessions", () => {
    const session = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
    });

    readingSessionStore.clearSessions();

    expect(readingSessionStore.getSession(session.sessionId)).toBeUndefined();
  });

  describe("replaceCurrentQuestion", () => {
    const nextQuestion = {
      id: "test-question-2",
      passageId: "test-passage-1",
      prompt: "A different question?",
      expectedMeaning: "a different meaning",
    };

    test("replaces the session's current question and records its id", () => {
      const session = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: ["test-question-1"],
      });

      const updated = readingSessionStore.replaceCurrentQuestion(session.sessionId, nextQuestion);

      expect(updated.currentQuestion).toEqual(nextQuestion);
      expect(updated.askedQuestionIds).toEqual(["test-question-1", "test-question-2"]);

      const stored = readingSessionStore.getSession(session.sessionId);
      expect(stored.currentQuestion).toEqual(nextQuestion);
      expect(stored.askedQuestionIds).toEqual(["test-question-1", "test-question-2"]);
    });

    test("does not duplicate an id already recorded in askedQuestionIds", () => {
      const session = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: ["test-question-1"],
      });

      const updated = readingSessionStore.replaceCurrentQuestion(session.sessionId, currentQuestion);

      expect(updated.askedQuestionIds).toEqual(["test-question-1"]);
    });

    test("returns undefined for an unknown sessionId", () => {
      expect(readingSessionStore.replaceCurrentQuestion("unknown", nextQuestion)).toBeUndefined();
    });

    test("stores a clone, not a reference, of the new question", () => {
      const session = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: ["test-question-1"],
      });

      const mutableQuestion = { ...nextQuestion };
      readingSessionStore.replaceCurrentQuestion(session.sessionId, mutableQuestion);
      mutableQuestion.prompt = "Mutated";

      const stored = readingSessionStore.getSession(session.sessionId);
      expect(stored.currentQuestion.prompt).toBe("A different question?");
    });
  });

  describe("attempt tracking", () => {
    test("starts a new session at zero incorrect attempts", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      expect(session.incorrectAttemptCount).toBe(0);
    });

    test("recordIncorrectAttempt increments and persists the count", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      readingSessionStore.recordIncorrectAttempt(session.sessionId);
      const updated = readingSessionStore.recordIncorrectAttempt(session.sessionId);

      expect(updated.incorrectAttemptCount).toBe(2);
      expect(readingSessionStore.getSession(session.sessionId).incorrectAttemptCount).toBe(2);
    });

    test("recordIncorrectAttempt returns undefined for an unknown sessionId", () => {
      expect(readingSessionStore.recordIncorrectAttempt("unknown")).toBeUndefined();
    });
  });

  describe("claim/release/complete state machine", () => {
    test("a new session starts in the active state", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      expect(session.state).toBe("active");
    });

    test("tryClaimSession transitions active -> locked and returns the session", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      const claim = readingSessionStore.tryClaimSession(session.sessionId);

      expect(claim).toEqual({ ok: true, session: expect.objectContaining({ state: "locked" }) });
      expect(readingSessionStore.getSession(session.sessionId).state).toBe("locked");
    });

    test("tryClaimSession refuses (reason: conflict) a session that is already locked", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      readingSessionStore.tryClaimSession(session.sessionId);
      const secondAttempt = readingSessionStore.tryClaimSession(session.sessionId);

      expect(secondAttempt).toEqual({ ok: false, reason: "conflict" });
    });

    test("tryClaimSession refuses (reason: conflict) a session that is already completed", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      readingSessionStore.tryClaimSession(session.sessionId);
      readingSessionStore.completeSession(session.sessionId);

      expect(readingSessionStore.tryClaimSession(session.sessionId)).toEqual({ ok: false, reason: "conflict" });
    });

    test("tryClaimSession returns reason: not_found for an unknown sessionId", () => {
      expect(readingSessionStore.tryClaimSession("unknown")).toEqual({ ok: false, reason: "not_found" });
    });

    test("releaseSession releases a locked session back to active", () => {
      const session = readingSessionStore.createSession({ passage, currentQuestion, askedQuestionIds: [] });

      readingSessionStore.tryClaimSession(session.sessionId);
      readingSessionStore.releaseSession(session.sessionId);

      expect(readingSessionStore.getSession(session.sessionId).state).toBe("active");
      expect(readingSessionStore.tryClaimSession(session.sessionId).ok).toBe(true);
    });
  });

  describe("one active session per child", () => {
    test("hasActiveSessionForChild is false before any session exists", () => {
      expect(readingSessionStore.hasActiveSessionForChild("parent-1", "child-1")).toBe(false);
    });

    test("getActiveSessionForChild returns undefined before any session exists", () => {
      expect(readingSessionStore.getActiveSessionForChild("parent-1", "child-1")).toBeUndefined();
    });

    test("getActiveSessionForChild returns the child's active session", () => {
      const created = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      const found = readingSessionStore.getActiveSessionForChild("parent-1", "child-1");

      expect(found.sessionId).toBe(created.sessionId);
    });

    test("getActiveSessionForChild still finds a locked (not yet completed) session", () => {
      const created = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });
      readingSessionStore.tryClaimSession(created.sessionId);

      const found = readingSessionStore.getActiveSessionForChild("parent-1", "child-1");

      expect(found.sessionId).toBe(created.sessionId);
      expect(found.state).toBe("locked");
    });

    test("getActiveSessionForChild returns undefined once the session is completed", () => {
      const created = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });
      readingSessionStore.tryClaimSession(created.sessionId);
      readingSessionStore.completeSession(created.sessionId);

      expect(readingSessionStore.getActiveSessionForChild("parent-1", "child-1")).toBeUndefined();
    });

    test("createSession refuses a second active session for the same parentId+childId", () => {
      readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      const second = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      expect(second).toBeNull();
      expect(readingSessionStore.hasActiveSessionForChild("parent-1", "child-1")).toBe(true);
    });

    test("does not treat different children, or the same childId under a different parent, as conflicting", () => {
      readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      const differentChild = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-2",
      });
      const sameChildIdDifferentParent = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-2",
        childId: "child-1",
      });

      expect(differentChild).not.toBeNull();
      expect(sameChildIdDifferentParent).not.toBeNull();
    });

    test("completeSession frees the child up for a new session", () => {
      const session = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      readingSessionStore.tryClaimSession(session.sessionId);
      readingSessionStore.completeSession(session.sessionId);

      expect(readingSessionStore.hasActiveSessionForChild("parent-1", "child-1")).toBe(false);

      const newSession = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      expect(newSession).not.toBeNull();
    });

    test("a session stuck locked (not yet completed) still blocks a new session", () => {
      const session = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      readingSessionStore.tryClaimSession(session.sessionId);

      const conflicting = readingSessionStore.createSession({
        passage,
        currentQuestion,
        askedQuestionIds: [],
        parentId: "parent-1",
        childId: "child-1",
      });

      expect(conflicting).toBeNull();
    });
  });
});

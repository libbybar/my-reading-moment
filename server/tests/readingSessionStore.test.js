import readingSessionStore from "../src/services/readingSessionStore.js";

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
    });
    const sessionB = readingSessionStore.createSession({
      passage,
      currentQuestion,
      askedQuestionIds: ["test-question-1"],
    });

    expect(typeof sessionA.sessionId).toBe("string");
    expect(sessionA.sessionId.length).toBeGreaterThan(0);
    expect(sessionA.sessionId).not.toBe(sessionB.sessionId);
    expect(sessionA.passage).toEqual(passage);
    expect(sessionA.currentQuestion).toEqual(currentQuestion);
    expect(sessionA.askedQuestionIds).toEqual(["test-question-1"]);
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
});

// In-memory reading-session store.
//
// This is a temporary, process-local store: it resets whenever the server
// restarts, is not shared across multiple server instances, and has no
// expiration policy for old sessions. Replacing it with a persistent, shared
// store (e.g. a database or cache) is out of scope for this task.

const crypto = require("crypto");

const sessions = new Map();

function createSession({ passage, currentQuestion, askedQuestionIds }) {
  const sessionId = crypto.randomUUID();

  const session = {
    sessionId,
    passage: structuredClone(passage),
    currentQuestion: structuredClone(currentQuestion),
    askedQuestionIds: structuredClone(askedQuestionIds),
  };

  sessions.set(sessionId, session);

  return structuredClone(session);
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  return session ? structuredClone(session) : undefined;
}

// Focused mutation for the retry flow: replaces the session's current question
// and records its id in askedQuestionIds, without allowing arbitrary session
// patches. Returns undefined if the session doesn't exist.
function replaceCurrentQuestion(sessionId, question) {
  const session = sessions.get(sessionId);

  if (!session) {
    return undefined;
  }

  const askedQuestionIds = session.askedQuestionIds.includes(question.id)
    ? session.askedQuestionIds
    : [...session.askedQuestionIds, question.id];

  const updatedSession = {
    ...session,
    currentQuestion: structuredClone(question),
    askedQuestionIds: structuredClone(askedQuestionIds),
  };

  sessions.set(sessionId, updatedSession);

  return structuredClone(updatedSession);
}

// Test-only: clears all stored sessions so tests don't leak state into each other.
function clearSessions() {
  sessions.clear();
}

module.exports = { createSession, getSession, replaceCurrentQuestion, clearSessions };

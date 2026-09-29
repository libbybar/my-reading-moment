// Temporary process-local store: resets on server restart and is not shared across instances.

import crypto from "crypto";

const sessions = new Map();
// Enforces "one active session per child" — cleared when a session reaches "completed".
const activeSessionIdByChildKey = new Map();

function childKey(parentId, childId) {
  return `${parentId}:${childId}`;
}

function hasActiveSessionForChild(parentId, childId) {
  return activeSessionIdByChildKey.has(childKey(parentId, childId));
}

// Used by /preview to resume a refreshed child's existing active session.
function getActiveSessionForChild(parentId, childId) {
  const sessionId = activeSessionIdByChildKey.get(childKey(parentId, childId));

  return sessionId ? getSession(sessionId) : undefined;
}

// Returns null if this child already has an active session.
function createSession({ passage, currentQuestion, askedQuestionIds, parentId, childId, level, sublevel }) {
  if (hasActiveSessionForChild(parentId, childId)) {
    return null;
  }

  const sessionId = crypto.randomUUID();

  const session = {
    sessionId,
    passage: structuredClone(passage),
    currentQuestion: structuredClone(currentQuestion),
    askedQuestionIds: structuredClone(askedQuestionIds),
    parentId,
    childId,
    // Capture the rung this exact text was generated for.
    level,
    sublevel,
    // Lifecycle: active -> locked -> (active | completed).
    state: "active",
    incorrectAttemptCount: 0,
    startedAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);
  activeSessionIdByChildKey.set(childKey(parentId, childId), sessionId);

  return structuredClone(session);
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  return session ? structuredClone(session) : undefined;
}

// Synchronous compare-and-swap; distinguishes 404 from a busy/finalized session.
function tryClaimSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return { ok: false, reason: "not_found" };
  }

  if (session.state !== "active") {
    return { ok: false, reason: "conflict" };
  }

  session.state = "locked";

  return { ok: true, session: structuredClone(session) };
}

// Releases non-terminal work or failed claims back to "active".
function releaseSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return undefined;
  }

  session.state = "active";

  return structuredClone(session);
}

// Terminal transition — only valid from "locked". Frees the child for a new session.
function completeSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return undefined;
  }

  session.state = "completed";
  activeSessionIdByChildKey.delete(childKey(session.parentId, session.childId));

  return structuredClone(session);
}

// Dropped rather than completed, so a stale client gets "not found" and no TextResult is written.
function discardActiveSessionForChild(parentId, childId) {
  const sessionId = activeSessionIdByChildKey.get(childKey(parentId, childId));

  if (!sessionId) {
    return false;
  }

  sessions.delete(sessionId);
  activeSessionIdByChildKey.delete(childKey(parentId, childId));

  return true;
}

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

function recordIncorrectAttempt(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return undefined;
  }

  session.incorrectAttemptCount += 1;

  return structuredClone(session);
}

function clearSessions() {
  sessions.clear();
  activeSessionIdByChildKey.clear();
}

export {
  createSession,
  getSession,
  tryClaimSession,
  releaseSession,
  completeSession,
  discardActiveSessionForChild,
  replaceCurrentQuestion,
  recordIncorrectAttempt,
  hasActiveSessionForChild,
  getActiveSessionForChild,
  clearSessions,
};

export default {
  createSession,
  getSession,
  tryClaimSession,
  releaseSession,
  completeSession,
  discardActiveSessionForChild,
  replaceCurrentQuestion,
  recordIncorrectAttempt,
  hasActiveSessionForChild,
  getActiveSessionForChild,
  clearSessions,
};

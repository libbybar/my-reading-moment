// Temporary process-local store: resets on server restart and is not shared across instances.

import crypto from "crypto";

const sessions = new Map();

function createSession({ passage, currentQuestion, askedQuestionIds, parentId, childId }) {
  const sessionId = crypto.randomUUID();

  const session = {
    sessionId,
    passage: structuredClone(passage),
    currentQuestion: structuredClone(currentQuestion),
    askedQuestionIds: structuredClone(askedQuestionIds),
    // Trusted because sessions are created only by authenticated /preview.
    parentId,
    childId,
  };

  sessions.set(sessionId, session);

  return structuredClone(session);
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  return session ? structuredClone(session) : undefined;
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

function clearSessions() {
  sessions.clear();
}

export { createSession, getSession, replaceCurrentQuestion, clearSessions };

export default { createSession, getSession, replaceCurrentQuestion, clearSessions };

import readingSessionStore from "./readingSessionStore.js";

class SessionClaimError extends Error {
  constructor(reason) {
    super(
      reason === "not_found"
        ? "Session not found"
        : "This reading exercise is not accepting requests right now",
    );
    this.name = "SessionClaimError";
    this.reason = reason; // "not_found" | "conflict"
  }
}

// Exclusive, synchronous claim for session-mutating requests.
// Terminal work completes the session; everything else is released back to active.
async function withClaimedSession(sessionId, work) {
  const claim = readingSessionStore.tryClaimSession(sessionId);

  if (!claim.ok) {
    throw new SessionClaimError(claim.reason);
  }

  try {
    const result = await work(claim.session);

    if (readingSessionStore.getSession(sessionId)?.state === "locked") {
      readingSessionStore.releaseSession(sessionId);
    }

    return result;
  } catch (error) {
    readingSessionStore.releaseSession(sessionId);

    throw error;
  }
}

export { withClaimedSession, SessionClaimError };

// Process-local like readingSessionStore: not shared across instances, resets on restart.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

const attemptsByParentId = new Map();

function discardExpiredLockout(parentId) {
  const attempts = attemptsByParentId.get(parentId);

  if (attempts?.lockedUntil && Date.now() >= attempts.lockedUntil) {
    attemptsByParentId.delete(parentId);
  }
}

function isLockedOut(parentId) {
  discardExpiredLockout(parentId);

  return Boolean(attemptsByParentId.get(parentId)?.lockedUntil);
}

function recordFailedAttempt(parentId) {
  discardExpiredLockout(parentId);

  const attempts = attemptsByParentId.get(parentId) ?? { failures: 0 };

  attempts.failures += 1;

  if (attempts.failures >= MAX_FAILED_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  attemptsByParentId.set(parentId, attempts);
}

function clearFailedAttempts(parentId) {
  attemptsByParentId.delete(parentId);
}

function clearAllAttempts() {
  attemptsByParentId.clear();
}

export { isLockedOut, recordFailedAttempt, clearFailedAttempts, clearAllAttempts, MAX_FAILED_ATTEMPTS, LOCKOUT_MS };

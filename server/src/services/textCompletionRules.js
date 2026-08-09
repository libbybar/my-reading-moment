// Server-owned attempt threshold — the client no longer decides when a text has failed.
const MAX_INCORRECT_ATTEMPTS = 3;

// Pure decision: given the answer's correctness and how many incorrect attempts
// this text has accumulated so far (after this one), is the text now finished,
// and with what outcome? Returns { terminal: false } when the text continues.
function determineAnswerOutcome({ isCorrect, incorrectAttemptCount }) {
  if (isCorrect) {
    return { terminal: true, result: "success" };
  }

  if (incorrectAttemptCount >= MAX_INCORRECT_ATTEMPTS) {
    return { terminal: true, result: "failure" };
  }

  return { terminal: false };
}

export { MAX_INCORRECT_ATTEMPTS, determineAnswerOutcome };

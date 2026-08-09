import { MIN_LEVEL, MAX_LEVEL, MIN_SUBLEVEL, MAX_SUBLEVEL } from "../data/readingLevelSpec.js";

const SUCCESS_WINDOW_SIZE = 4;
const SUCCESS_THRESHOLD = 3;
const FAILURE_WINDOW_SIZE = 3;
const FAILURE_THRESHOLD = 2;
const SKIP_STREAK_SIZE = 2;

function nextRung(level, sublevel) {
  if (sublevel < MAX_SUBLEVEL) {
    return { level, sublevel: sublevel + 1 };
  }

  if (level < MAX_LEVEL) {
    return { level: level + 1, sublevel: MIN_SUBLEVEL };
  }

  return { level, sublevel };
}

function previousRung(level, sublevel) {
  if (sublevel > MIN_SUBLEVEL) {
    return { level, sublevel: sublevel - 1 };
  }

  if (level > MIN_LEVEL) {
    return { level: level - 1, sublevel: MAX_SUBLEVEL };
  }

  return { level, sublevel };
}

// Pure decision. `recentRaw` includes skips; `recentNonSkipped` feeds success/failure windows.
// Both inputs are ordered most-recent-first.
function computeProgression({ level, sublevel, recentRaw, recentNonSkipped }) {
  const result = decide({ level, sublevel, recentRaw, recentNonSkipped });
  const changed = result.level !== level || result.sublevel !== sublevel;

  return { ...result, changed };
}

function decide({ level, sublevel, recentRaw, recentNonSkipped }) {
  const isConsecutiveSkip =
    recentRaw.length >= SKIP_STREAK_SIZE &&
    recentRaw.slice(0, SKIP_STREAK_SIZE).every((entry) => entry.result === "skipped");

  // Skips are filtered out of success/failure windows, so this is not a real tie-break.
  if (isConsecutiveSkip) {
    return { ...previousRung(level, sublevel), reason: "consecutive_skips" };
  }

  const successCount = recentNonSkipped
    .slice(0, SUCCESS_WINDOW_SIZE)
    .filter((entry) => entry.result === "success").length;

  if (recentNonSkipped.length >= SUCCESS_WINDOW_SIZE && successCount >= SUCCESS_THRESHOLD) {
    return { ...nextRung(level, sublevel), reason: "success_threshold" };
  }

  const recentThree = recentNonSkipped.slice(0, FAILURE_WINDOW_SIZE);
  const failureCount = recentThree.filter((entry) => entry.result === "failure").length;

  if (recentThree.length >= FAILURE_WINDOW_SIZE && failureCount >= FAILURE_THRESHOLD) {
    return { ...previousRung(level, sublevel), reason: "failure_threshold" };
  }

  return { level, sublevel, reason: "no_change" };
}

export { computeProgression };

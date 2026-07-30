const fs = require("fs");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");

// Temporary perf/debug logging aid, not the app's main logging system.
// Writes JSON Lines to server/logs/timing.jsonl — used for both timing
// entries (tag: "LLM"/"Route") and error entries (tag: "Error"), which is
// why the module and its write function are named for "debug logging" in
// general rather than just timing.
//
// Deliberately opt-in (TIMING_LOG_ENABLED=true), best-effort (a failed write
// never breaks the request that triggered it), and never active during
// automated tests. Entries only ever carry metadata (durations, lengths,
// labels, error messages we wrote ourselves) — never raw passage/question/
// answer text, so there's nothing sensitive to redact.
const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "timing.jsonl");

// Carries the current request's id across the whole async call chain (route
// handler -> llmProvider -> geminiClient) without any of those functions
// needing to accept and pass along a requestId parameter themselves — this
// is purely a debugging concern, not something the provider contract should
// know about. A route handler starts this once, via runWithRequestId; every
// writeDebugLog call made anywhere during that request picks it up
// automatically.
const requestContext = new AsyncLocalStorage();

function runWithRequestId(requestId, callback) {
  return requestContext.run(requestId, callback);
}

function isEnabled() {
  // Jest sets NODE_ENV=test automatically — a hard safety net, not just a
  // default, so tests never write regardless of the flag below.
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  return process.env.TIMING_LOG_ENABLED === "true";
}

function writeDebugLog(entry) {
  if (!isEnabled()) {
    return;
  }

  const requestId = requestContext.getStore();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...entry,
  });

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch (error) {
    // Best-effort only: a logging failure must never break the actual
    // request. isEnabled() above already guarantees we're not in a test run
    // here, so this only ever prints during real (dev/demo) usage — and
    // only the filesystem error itself, never the entry content.
    console.warn(`[debugLogger] failed to write log file: ${error.message}`);
  }
}

module.exports = { writeDebugLog, runWithRequestId };

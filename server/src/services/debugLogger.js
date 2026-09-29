import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import { fileURLToPath } from "url";

// Opt-in debug logger. Entries are metadata only; prompt and answer text are never written.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const TIMING_LOG_FILE = path.join(LOG_DIR, "timing.jsonl");
const LEARNING_LOG_FILE = path.join(LOG_DIR, "learning.jsonl");

// Keeps request ids out of the LLM provider contract while preserving async context.
const requestContext = new AsyncLocalStorage();

function runWithRequestId(requestId, callback) {
  return requestContext.run(requestId, callback);
}

function isTimingLogEnabled() {
  // Tests must never write debug logs, even if TIMING_LOG_ENABLED is set.
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  return process.env.TIMING_LOG_ENABLED === "true";
}

// Unlike the opt-in timing log, this is the durable product-event record
// (text-completion outcomes) — always on outside tests, independent of
// TIMING_LOG_ENABLED, which only gates perf/debug entries.
function isLearningLogEnabled() {
  return process.env.NODE_ENV !== "test";
}

function appendLogEntry(filePath, entry) {
  const requestId = requestContext.getStore();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...entry,
  });

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(filePath, `${line}\n`);
  } catch (error) {
    // Best-effort logging must never break the request.
    console.warn(`[debugLogger] failed to write log file: ${error.message}`);
  }
}

function writeDebugLog(entry) {
  if (!isTimingLogEnabled()) {
    return;
  }

  appendLogEntry(TIMING_LOG_FILE, entry);
}

// Separate file from the timing log on purpose: learning.jsonl is the
// always-on product-event record, not gated behind TIMING_LOG_ENABLED —
// mixing it into the opt-in perf file would mean losing it whenever that
// flag is off.
function writeLearningLog(entry) {
  if (!isLearningLogEnabled()) {
    return;
  }

  appendLogEntry(LEARNING_LOG_FILE, entry);
}

export { writeDebugLog, writeLearningLog, runWithRequestId };

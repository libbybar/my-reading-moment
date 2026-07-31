import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import { fileURLToPath } from "url";

// Opt-in debug logger. Entries are metadata only; prompt and answer text are never written.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "timing.jsonl");

// Keeps request ids out of the LLM provider contract while preserving async context.
const requestContext = new AsyncLocalStorage();

function runWithRequestId(requestId, callback) {
  return requestContext.run(requestId, callback);
}

function isEnabled() {
  // Tests must never write debug logs, even if TIMING_LOG_ENABLED is set.
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
    // Best-effort logging must never break the request.
    console.warn(`[debugLogger] failed to write log file: ${error.message}`);
  }
}

export { writeDebugLog, runWithRequestId };

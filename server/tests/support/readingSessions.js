import request from "supertest";
import app from "../../src/app.js";
import { createAuthenticatedParentWithChild } from "./testAuth.js";

// /preview streams NDJSON now (see readingSessionRoutes.js) — supertest
// doesn't parse that into response.body, so tests read response.text and
// split it into events themselves.
function parseNdjsonEvents(responseText) {
  return responseText
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

// The terminal event ("done" on success, "error" on failure) — what most
// tests actually want, since it carries the same fields the old flat JSON
// response used to.
function getFinalEvent(responseText) {
  const events = parseNdjsonEvents(responseText);

  return events[events.length - 1];
}

// Since /preview no longer waits for the initial question (it's generated in
// the background — see readingSessionRoutes.js), tests that need a session
// with a ready currentQuestion must deterministically wait for it, not assume
// it's already there right after /preview. POST /question is exactly the
// mechanism that waits for it, so tests reuse it as that deterministic signal
// instead of guessing at timing.
async function createReadySession(child) {
  const { parentId, childId, cookie, child: storedChild } = await createAuthenticatedParentWithChild(child);

  const previewResponse = await request(app)
    .post("/api/reading-sessions/preview")
    .set("Cookie", [cookie])
    .send({ childId });

  const sessionId = getFinalEvent(previewResponse.text).sessionId;

  const questionResponse = await request(app)
    .post("/api/reading-sessions/question")
    .send({ sessionId });

  return {
    sessionId,
    parentId,
    childId,
    cookie,
    child: storedChild,
    previewResponse,
    questionResponse,
  };
}

// Mirrors what a mocked generatePassageStream should yield on success: title,
// one chunk, done — for provider-mocked route tests that need to fake a
// passage-generation call without a real async generator each time.
function passageStreamOf(passage) {
  return (async function* () {
    yield { type: "title", title: passage?.title };
    yield { type: "chunk", text: passage?.text };
    yield { type: "done", passage };
  })();
}

function throwingPassageStream(error) {
  // eslint-disable-next-line require-yield
  return (async function* () {
    throw error;
  })();
}

export {
  createReadySession,
  parseNdjsonEvents,
  getFinalEvent,
  passageStreamOf,
  throwingPassageStream,
};

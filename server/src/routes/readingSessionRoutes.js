import crypto from "crypto";
import express from "express";

import llmProvider from "../services/llmProvider/index.js";
import readingSessionStore from "../services/readingSessionStore.js";
import * as parentRepository from "../repositories/parentRepository.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { writeDebugLog, runWithRequestId } from "../services/debugLogger.js";
import { withClaimedSession, SessionClaimError } from "../services/sessionClaim.js";
import { determineAnswerOutcome } from "../services/textCompletionRules.js";
import { completeText } from "../services/textCompletionService.js";
import {
  isValidEvaluationResult,
  isValidGeneratedQuestion,
  isValidGeneratedPassage,
} from "../services/providerContractValidation.js";
import { sendErrorResponse, buildErrorResponseBody } from "../http/errorResponses.js";

const router = express.Router();

// A real comprehension answer is a sentence, maybe two — well under this.
// Bounds ordinary input hygiene and prompt-injection payload size.
const MAX_ANSWER_TEXT_LENGTH = 300;

// Ephemeral /preview background work; promises settle to {ok} instead of rejecting.
const pendingQuestionPromises = new Map();

function generateInitialQuestionInBackground(session, passage) {
  const promise = llmProvider
    .generateQuestion({ passage, askedQuestionIds: [] })
    .then((result) => {
      if (
        result.status !== "ok" ||
        !isValidGeneratedQuestion(result.question, { passageId: passage.id, askedQuestionIds: [] })
      ) {
        throw new Error(`generateQuestion returned an unusable result: ${result.status}`);
      }

      readingSessionStore.replaceCurrentQuestion(session.sessionId, result.question);

      return { ok: true };
    })
    .catch((error) => {
      logError("Background generateQuestion (POST /preview)", error);

      return { ok: false };
    });

  pendingQuestionPromises.set(session.sessionId, promise);

  promise.finally(() => {
    pendingQuestionPromises.delete(session.sessionId);
  });
}

function respondToClaimError(res, error, conflictResponseName) {
  if (error.reason === "not_found") {
    return sendErrorResponse(res, 404, "readingSessionNotFound");
  }

  return sendErrorResponse(res, 409, conflictResponseName);
}

// currentQuestion can be null while /preview's background question is still running.
class QuestionNotReadyError extends Error {}

function toSafeQuestion(question) {
  return {
    id: question.id,
    passageId: question.passageId,
    prompt: question.prompt,
  };
}

function toSafeEvaluationResult(result) {
  return {
    questionId: result.questionId,
    isCorrect: result.isCorrect,
    feedbackType: result.feedbackType,
  };
}

function isValidGrammaticalGender(value) {
  return value === "female" || value === "male";
}

// Picks one random interest per generation, instead of sending the child's
// whole interests list and relying on the model to vary its own pick —
// buildInterestsLine (prompts.js) already tells the model "at most one," but
// with no source of actual variety across calls, it consistently picked the
// same (first) interest every time.
function pickRandomInterest(interests) {
  if (interests.length === 0) {
    return [];
  }

  return [interests[Math.floor(Math.random() * interests.length)]];
}

function toPassageSnapshot(passage) {
  return {
    id: passage.id,
    title: passage.title,
    text: passage.text,
    level: passage.level,
    sublevel: passage.sublevel,
  };
}

// Terminal /preview event; question may still be null while background work runs.
function toDoneEvent(session, child) {
  return {
    type: "done",
    title: session.passage.title,
    story: session.passage.text,
    passageId: session.passage.id,
    sessionId: session.sessionId,
    question: session.currentQuestion ? toSafeQuestion(session.currentQuestion) : null,
    grammaticalGender: child.grammaticalGender,
  };
}

function writeNdjsonEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

// Success responses are NDJSON; pre-stream validation/auth failures stay JSON.
function beginNdjsonResponse(res) {
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
}

function logError(label, error) {
  writeDebugLog({
    tag: "Error",
    label,
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: error.status ?? null,
  });
}

async function findActiveChild(parentId, childId) {
  try {
    const parent = await parentRepository.findById(parentId);
    const child = parent?.children.id(childId);

    return child && !child.isArchived ? child : null;
  } catch {
    return null;
  }
}

function respondBusy(res) {
  return sendErrorResponse(res, 409, "readingSessionBusy");
}

router.post("/preview", requireAuth, async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /preview received" });
    const requestStartTime = Date.now();

    const { childId } = req.body;

    if (typeof childId !== "string" || childId.trim().length === 0) {
      return sendErrorResponse(res, 400, "readingSessionChildIdRequired");
    }

    const child = await findActiveChild(req.parentId, childId);

    // Unowned, unknown and archived children must be indistinguishable.
    if (!child) {
      return sendErrorResponse(res, 404, "childNotFound");
    }

    if (!isValidGrammaticalGender(child.grammaticalGender)) {
      // Do not leak invalid internal profile data through the API.
      return sendErrorResponse(res, 500, "readingSessionPreviewFailed");
    }

    // Resume only stable active sessions; locked ones are mid-mutation and may be stale.
    const existingSession = readingSessionStore.getActiveSessionForChild(req.parentId, childId);

    if (existingSession) {
      if (existingSession.state !== "active") {
        return respondBusy(res);
      }

      beginNdjsonResponse(res);
      writeNdjsonEvent(res, toDoneEvent(existingSession, child));
      return res.end();
    }

    try {
      // After headers are sent, failures must be reported as NDJSON error events.
      beginNdjsonResponse(res);

      for await (const event of llmProvider.generatePassageStream({
        level: child.learningProfile.currentLevel,
        sublevel: child.learningProfile.currentSublevel,
        interests: pickRandomInterest(child.learningProfile.interests),
      })) {
        if (event.type === "title") {
          writeNdjsonEvent(res, { type: "title", title: event.title });
          continue;
        }

        if (event.type === "chunk") {
          writeNdjsonEvent(res, { type: "chunk", text: event.text });
          continue;
        }

        const passage = event.passage;

        if (
          !isValidGeneratedPassage(
            passage,
            child.learningProfile.currentLevel,
            child.learningProfile.currentSublevel,
          )
        ) {
          throw new Error("generatePassageStream returned an invalid passage");
        }

        const session = readingSessionStore.createSession({
          passage: toPassageSnapshot(passage),
          currentQuestion: null,
          askedQuestionIds: [],
          parentId: req.parentId,
          childId,
          level: child.learningProfile.currentLevel,
          sublevel: child.learningProfile.currentSublevel,
        });

        if (!session) {
          // Narrow race: another /preview won; discard this streamed passage in favor of theirs.
          const wonByAnotherRequest = readingSessionStore.getActiveSessionForChild(req.parentId, childId);

          if (!wonByAnotherRequest || wonByAnotherRequest.state !== "active") {
            writeNdjsonEvent(res, { type: "error", ...buildErrorResponseBody("readingSessionBusy") });
            break;
          }

          writeNdjsonEvent(res, toDoneEvent(wonByAnotherRequest, child));
          break;
        }

        // Re-check only after createSession: an archive during streaming had no session to discard.
        if (!(await findActiveChild(req.parentId, childId))) {
          readingSessionStore.discardActiveSessionForChild(req.parentId, childId);
          writeNdjsonEvent(res, { type: "error", ...buildErrorResponseBody("childNotFound") });
          break;
        }

        // Not awaited: the child sees the story immediately, the question is
        // fetched on demand via POST /question once they're done reading.
        generateInitialQuestionInBackground(session, passage);

        writeNdjsonEvent(res, toDoneEvent(session, child));
      }

      res.end();
    } catch (error) {
      logError("POST /preview", error);
      writeNdjsonEvent(res, {
        type: "error",
        ...buildErrorResponseBody("readingSessionPreviewFailed", { cause: error }),
      });
      res.end();
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /preview",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

router.post("/answers", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /answers received" });
    const requestStartTime = Date.now();

    const { sessionId, answerText } = req.body;

    if (
      typeof sessionId !== "string" ||
      sessionId.length === 0 ||
      typeof answerText !== "string" ||
      answerText.length > MAX_ANSWER_TEXT_LENGTH
    ) {
      return sendErrorResponse(res, 400, "readingSessionAnswerInvalidInput");
    }

    try {
      const { evaluation, textOutcome } = await withClaimedSession(sessionId, async (session) => {
        if (!session.currentQuestion) {
          throw new QuestionNotReadyError();
        }

        const result = await llmProvider.evaluateAnswer({
          passage: session.passage,
          question: session.currentQuestion,
          answerText,
        });

        if (!isValidEvaluationResult(result, session.currentQuestion.id)) {
          throw new Error("evaluateAnswer returned a malformed evaluation result");
        }

        // Keep the store unchanged until the required writes succeed.
        const incorrectAttemptCount = result.isCorrect
          ? session.incorrectAttemptCount
          : session.incorrectAttemptCount + 1;

        const outcome = determineAnswerOutcome({ isCorrect: result.isCorrect, incorrectAttemptCount });

        const learningEvent = {
          type: "answer_attempt",
          source: "system",
          payload: { questionId: result.questionId, isCorrect: result.isCorrect },
        };

        if (outcome.terminal) {
          // LearningEvent + TextResult + progression + journeyProgress commit together.
          await completeText({
            sessionId,
            parentId: session.parentId,
            childId: session.childId,
            level: session.level,
            sublevel: session.sublevel,
            result: outcome.result,
            startedAt: session.startedAt,
            evidence: { questionsTotal: 1, questionsCorrect: outcome.result === "success" ? 1 : 0 },
            learningEvent,
          });
          readingSessionStore.completeSession(sessionId);
        } else {
          const updatedChild = await parentRepository.addLearningEvent(
            session.parentId,
            session.childId,
            learningEvent,
          );

          if (!updatedChild) {
            // Never record an incorrect attempt or report "continues" against a
            // write that didn't actually happen — same discipline as completeText's
            // own addLearningEvent check on the terminal path.
            throw new Error(
              `POST /answers: no child ${session.childId} for parent ${session.parentId} (addLearningEvent)`,
            );
          }

          readingSessionStore.recordIncorrectAttempt(sessionId);
        }

        return { evaluation: result, textOutcome: outcome.terminal ? outcome.result : "continues" };
      });

      res.status(200).json({ ...toSafeEvaluationResult(evaluation), textOutcome });
    } catch (error) {
      if (error instanceof SessionClaimError) {
        return respondToClaimError(res, error, "readingSessionBusy");
      }

      if (error instanceof QuestionNotReadyError) {
        return respondBusy(res);
      }

      logError("POST /answers", error);
      sendErrorResponse(res, 500, "readingSessionAnswerFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /answers",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

router.post("/skip", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /skip received" });
    const requestStartTime = Date.now();

    const { sessionId } = req.body;

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return sendErrorResponse(res, 400, "readingSessionSkipInvalidInput");
    }

    try {
      await withClaimedSession(sessionId, async (session) => {
        await completeText({
          sessionId,
          parentId: session.parentId,
          childId: session.childId,
          level: session.level,
          sublevel: session.sublevel,
          result: "skipped",
          startedAt: session.startedAt,
        });
        readingSessionStore.completeSession(sessionId);
      });

      res.status(200).json({ skipped: true });
    } catch (error) {
      if (error instanceof SessionClaimError) {
        return respondToClaimError(res, error, "readingSessionSkipConflict");
      }

      logError("POST /skip", error);
      sendErrorResponse(res, 500, "readingSessionSkipFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /skip",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

router.post("/next-question", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /next-question received" });
    const requestStartTime = Date.now();

    const { sessionId } = req.body;

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return sendErrorResponse(res, 400, "readingSessionNextQuestionInvalidInput");
    }

    try {
      const response = await withClaimedSession(sessionId, async (session) => {
        // /next-question replaces the current question during the retry cycle
        // — it must not be used to generate the *first* one (that's what
        // POST /question is for, and it's the only path claim-protected
        // against generateInitialQuestionInBackground's own unprotected write).
        if (!session.currentQuestion) {
          throw new QuestionNotReadyError();
        }

        const result = await llmProvider.generateQuestion({
          passage: session.passage,
          askedQuestionIds: session.askedQuestionIds,
        });

        if (result.status === "ok") {
          if (
            !isValidGeneratedQuestion(result.question, {
              passageId: session.passage.id,
              askedQuestionIds: session.askedQuestionIds,
            })
          ) {
            throw new Error("generateQuestion returned an invalid question");
          }

          readingSessionStore.replaceCurrentQuestion(sessionId, result.question);

          return { question: toSafeQuestion(result.question) };
        }

        if (result.status === "exhausted") {
          // Mock-only fallback: real providers should not use exhaustion as session completion.
          return { question: null };
        }

        throw new Error(`generateQuestion returned an unexpected status: ${result.status}`);
      });

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof SessionClaimError) {
        return respondToClaimError(res, error, "readingSessionBusy");
      }

      if (error instanceof QuestionNotReadyError) {
        return respondBusy(res);
      }

      logError("POST /next-question", error);
      sendErrorResponse(res, 500, "readingSessionNextQuestionFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /next-question",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

router.post("/question", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /question received" });
    const requestStartTime = Date.now();

    const { sessionId } = req.body;

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return sendErrorResponse(res, 400, "readingSessionQuestionInvalidInput");
    }

    try {
      const response = await withClaimedSession(sessionId, async (session) => {
        if (session.currentQuestion) {
          return { question: toSafeQuestion(session.currentQuestion) };
        }

        const pending = pendingQuestionPromises.get(sessionId);

        if (pending) {
          const outcome = await pending;

          if (!outcome.ok) {
            // The failed background attempt is retried by a later /question call, not this one.
            throw new Error("Initial question generation failed");
          }

          const updatedSession = readingSessionStore.getSession(sessionId);

          return { question: toSafeQuestion(updatedSession.currentQuestion) };
        }

        // No generation in flight: attempt exactly one fresh question.
        const result = await llmProvider.generateQuestion({
          passage: session.passage,
          askedQuestionIds: session.askedQuestionIds,
        });

        if (
          result.status !== "ok" ||
          !isValidGeneratedQuestion(result.question, {
            passageId: session.passage.id,
            askedQuestionIds: session.askedQuestionIds,
          })
        ) {
          throw new Error(`generateQuestion returned an unusable result: ${result.status}`);
        }

        readingSessionStore.replaceCurrentQuestion(sessionId, result.question);

        return { question: toSafeQuestion(result.question) };
      });

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof SessionClaimError) {
        return respondToClaimError(res, error, "readingSessionBusy");
      }

      logError("POST /question", error);
      sendErrorResponse(res, 500, "readingSessionQuestionFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /question",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

export default router;

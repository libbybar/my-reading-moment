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

const router = express.Router();

function respondToClaimError(res, error, conflictMessage) {
  if (error.reason === "not_found") {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.status(409).json({ error: conflictMessage });
}

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

function toPassageSnapshot(passage) {
  return {
    id: passage.id,
    title: passage.title,
    text: passage.text,
    level: passage.level,
    sublevel: passage.sublevel,
  };
}

// /preview resumes a child's existing active session after refresh/reopen.
function toResumedPreviewResponse(session, child) {
  const safeQuestion = toSafeQuestion(session.currentQuestion);

  return {
    title: session.passage.title,
    story: session.passage.text,
    questions: [safeQuestion.prompt],
    passageId: session.passage.id,
    sessionId: session.sessionId,
    question: safeQuestion,
    grammaticalGender: child.grammaticalGender,
  };
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

const PREVIEW_FAILURE_MESSAGE = "Failed to generate a reading question";
const PREVIEW_BUSY_MESSAGE = "This reading exercise is not accepting requests right now";

function respondPreviewBusy(res) {
  return res.status(409).json({ error: PREVIEW_BUSY_MESSAGE });
}

router.post("/preview", requireAuth, async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /preview received" });
    const requestStartTime = Date.now();

    const { childId } = req.body;

    if (typeof childId !== "string" || childId.trim().length === 0) {
      return res.status(400).json({
        error: "childId is required",
      });
    }

    // Scope lookup to the authenticated parent's own children.
    let child;

    try {
      const parent = await parentRepository.findById(req.parentId);

      child = parent?.children.id(childId);
    } catch {
      // Malformed ids get the same response as unknown ids.
      child = null;
    }

    if (!child) {
      return res.status(404).json({
        error: "Child not found",
      });
    }

    if (!isValidGrammaticalGender(child.grammaticalGender)) {
      // Do not leak invalid internal profile data through the API.
      return res.status(500).json({
        error: PREVIEW_FAILURE_MESSAGE,
      });
    }

    // Resume only stable active sessions; locked ones are mid-mutation and may be stale.
    const existingSession = readingSessionStore.getActiveSessionForChild(req.parentId, childId);

    if (existingSession) {
      if (existingSession.state !== "active") {
        return respondPreviewBusy(res);
      }

      return res.status(200).json(toResumedPreviewResponse(existingSession, child));
    }

    try {
      const passage = await llmProvider.generatePassage({
        level: child.learningProfile.currentLevel,
        sublevel: child.learningProfile.currentSublevel,
        interests: child.learningProfile.interests,
      });

      if (
        !isValidGeneratedPassage(
          passage,
          child.learningProfile.currentLevel,
          child.learningProfile.currentSublevel,
        )
      ) {
        throw new Error("generatePassage returned an invalid passage");
      }

      const result = await llmProvider.generateQuestion({ passage, askedQuestionIds: [] });

      let sessionId = null;
      let safeQuestion = null;
      let legacyQuestions;

      if (result.status === "ok") {
        if (
          !isValidGeneratedQuestion(result.question, {
            passageId: passage.id,
            askedQuestionIds: [],
          })
        ) {
          throw new Error("generateQuestion returned an invalid question");
        }

        const session = readingSessionStore.createSession({
          passage: toPassageSnapshot(passage),
          currentQuestion: result.question,
          askedQuestionIds: [result.question.id],
          parentId: req.parentId,
          childId,
          level: child.learningProfile.currentLevel,
          sublevel: child.learningProfile.currentSublevel,
        });

        if (!session) {
          // Narrow race: another /preview won after the earlier check.
          const wonByAnotherRequest = readingSessionStore.getActiveSessionForChild(req.parentId, childId);

          if (!wonByAnotherRequest || wonByAnotherRequest.state !== "active") {
            return respondPreviewBusy(res);
          }

          return res.status(200).json(toResumedPreviewResponse(wonByAnotherRequest, child));
        }

        sessionId = session.sessionId;
        safeQuestion = toSafeQuestion(result.question);
        legacyQuestions = [safeQuestion.prompt];
      } else if (result.status === "exhausted") {
        legacyQuestions = [];
      } else {
        throw new Error(`generateQuestion returned an unexpected status: ${result.status}`);
      }

      res.status(200).json({
        title: passage.title,
        story: passage.text,
        // Legacy compatibility: new code should read `question`, not `questions`.
        questions: legacyQuestions,
        passageId: passage.id,
        sessionId,
        question: safeQuestion,
        grammaticalGender: child.grammaticalGender,
      });
    } catch (error) {
      logError("POST /preview", error);
      res.status(500).json({
        error: PREVIEW_FAILURE_MESSAGE,
      });
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

    if (typeof sessionId !== "string" || sessionId.length === 0 || typeof answerText !== "string") {
      return res.status(400).json({
        error: "sessionId and answerText are required",
      });
    }

    try {
      const { evaluation, textOutcome } = await withClaimedSession(sessionId, async (session) => {
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
        return respondToClaimError(res, error, "This reading exercise is not accepting answers right now");
      }

      logError("POST /answers", error);
      res.status(500).json({
        error: "Failed to evaluate the answer",
      });
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
      return res.status(400).json({
        error: "sessionId is required",
      });
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
        return respondToClaimError(res, error, "This reading exercise has already been finalized");
      }

      logError("POST /skip", error);
      res.status(500).json({
        error: "Failed to skip the reading exercise",
      });
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
      return res.status(400).json({
        error: "sessionId is required",
      });
    }

    try {
      const response = await withClaimedSession(sessionId, async (session) => {
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
        return respondToClaimError(res, error, "This reading exercise is not accepting requests right now");
      }

      logError("POST /next-question", error);
      res.status(500).json({
        error: "Failed to generate the next reading question",
      });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /next-question",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

export default router;

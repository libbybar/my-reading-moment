import crypto from "crypto";
import express from "express";

import llmProvider from "../services/llmProvider/index.js";
import readingSessionStore from "../services/readingSessionStore.js";
import * as parentRepository from "../repositories/parentRepository.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { writeDebugLog, runWithRequestId } from "../services/debugLogger.js";
import {
  isValidEvaluationResult,
  isValidGeneratedQuestion,
  isValidGeneratedPassage,
} from "../services/providerContractValidation.js";

const router = express.Router();

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
    readingLevel: passage.readingLevel,
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

    try {
      const passage = await llmProvider.generatePassage({
        readingLevel: child.learningProfile.readingLevel,
        interests: child.learningProfile.interests,
      });

      if (!isValidGeneratedPassage(passage, child.learningProfile.readingLevel)) {
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
        });

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

    const session = readingSessionStore.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    try {
      const result = await llmProvider.evaluateAnswer({
        passage: session.passage,
        question: session.currentQuestion,
        answerText,
      });

      if (!isValidEvaluationResult(result, session.currentQuestion.id)) {
        throw new Error("evaluateAnswer returned a malformed evaluation result");
      }

      res.status(200).json(toSafeEvaluationResult(result));

      // Learning history is best-effort after the answer response is sent.
      try {
        await parentRepository.addLearningEvent(session.parentId, session.childId, {
          type: "answer_attempt",
          source: "system",
          payload: { questionId: result.questionId, isCorrect: result.isCorrect },
        });
      } catch (eventError) {
        logError("POST /answers learningEvent", eventError);
      }
    } catch (error) {
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

    const session = readingSessionStore.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    try {
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

        return res.status(200).json({
          question: toSafeQuestion(result.question),
        });
      }

      if (result.status === "exhausted") {
        // Mock-only fallback: real providers should not use exhaustion as session completion.
        return res.status(200).json({ question: null });
      }

      throw new Error(`generateQuestion returned an unexpected status: ${result.status}`);
    } catch (error) {
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

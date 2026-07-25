const express = require("express");

const mockChildProfiles = require("../data/mockChildProfiles");
const mockPassages = require("../data/mockPassages");
const llmProvider = require("../services/llmProvider");
const readingSessionStore = require("../services/readingSessionStore");

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

function isValidEvaluationResult(result) {
  if (!result || typeof result !== "object") {
    return false;
  }

  if (typeof result.questionId !== "string" || result.questionId.length === 0) {
    return false;
  }

  if (typeof result.isCorrect !== "boolean") {
    return false;
  }

  if (result.feedbackType !== "correct" && result.feedbackType !== "retry") {
    return false;
  }

  return result.feedbackType === (result.isCorrect ? "correct" : "retry");
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidGrammaticalGender(value) {
  return value === "female" || value === "male";
}

function isValidGeneratedQuestion(question, session) {
  if (!question || typeof question !== "object") {
    return false;
  }

  if (!isNonBlankString(question.id) || !isNonBlankString(question.passageId)) {
    return false;
  }

  if (question.passageId !== session.passage.id) {
    return false;
  }

  if (!isNonBlankString(question.prompt) || !isNonBlankString(question.expectedMeaning)) {
    return false;
  }

  return !session.askedQuestionIds.includes(question.id);
}

function toPassageSnapshot(passage) {
  return {
    id: passage.id,
    title: passage.title,
    text: passage.text,
    readingLevel: passage.readingLevel,
  };
}

const PREVIEW_FAILURE_MESSAGE = "Failed to generate a reading question";

router.post("/preview", async (req, res) => {
  const { childId } = req.body;

  if (typeof childId !== "string" || childId.trim().length === 0) {
    return res.status(400).json({
      error: "childId is required",
    });
  }

  const child = mockChildProfiles.find((profile) => profile.id === childId);

  if (!child) {
    return res.status(404).json({
      error: "Child not found",
    });
  }

  if (!isValidGrammaticalGender(child.grammaticalGender)) {
    // Internal data-contract failure: the child profile itself is malformed.
    // Never expose which field is invalid or what value it held — respond
    // with the same stable error shape as any other /preview failure.
    return res.status(500).json({
      error: PREVIEW_FAILURE_MESSAGE,
    });
  }

  const passage = mockPassages.find(
    (candidate) => candidate.readingLevel === child.readingLevel,
  );

  if (!passage) {
    // No mock passage exists at this child's reading level. Same stable
    // failure shape as any other /preview failure — never expose which
    // reading level was unmatched.
    return res.status(500).json({
      error: PREVIEW_FAILURE_MESSAGE,
    });
  }

  try {
    const result = await llmProvider.generateQuestion({ passage, askedQuestionIds: [] });

    let sessionId = null;
    let safeQuestion = null;
    let legacyQuestions;

    if (result.status === "ok") {
      const session = readingSessionStore.createSession({
        passage: toPassageSnapshot(passage),
        currentQuestion: result.question,
        askedQuestionIds: [result.question.id],
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
      // Legacy/transitional: `questions` mirrors the canonical `question` below
      // (as a single-item prompt list, or empty once exhausted) rather than the
      // passage's own seeded list — the two are not equivalent sources of truth,
      // since a future real provider may generate a question that isn't in the
      // passage's seeded list. No new code should read `questions`; remove it
      // once the client is migrated to `question`.
      questions: legacyQuestions,
      readingGame: passage.readingGame,
      passageId: passage.id,
      sessionId,
      question: safeQuestion,
      grammaticalGender: child.grammaticalGender,
    });
  } catch {
    res.status(500).json({
      error: PREVIEW_FAILURE_MESSAGE,
    });
  }
});

router.post("/answers", async (req, res) => {
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

    if (!isValidEvaluationResult(result)) {
      throw new Error("evaluateAnswer returned a malformed evaluation result");
    }

    res.status(200).json(toSafeEvaluationResult(result));
  } catch {
    res.status(500).json({
      error: "Failed to evaluate the answer",
    });
  }
});

router.post("/next-question", async (req, res) => {
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
      if (!isValidGeneratedQuestion(result.question, session)) {
        throw new Error("generateQuestion returned an invalid question");
      }

      readingSessionStore.replaceCurrentQuestion(sessionId, result.question);

      return res.status(200).json({
        question: toSafeQuestion(result.question),
      });
    }

    if (result.status === "exhausted") {
      // Temporary mock fallback, not a product-level state: the current mock
      // provider has a finite seeded question list per passage, so it can run
      // out. A real LLM provider would keep generating. Session completion will
      // be defined separately, based on a question/attempt limit rather than
      // provider exhaustion.
      return res.status(200).json({ question: null });
    }

    throw new Error(`generateQuestion returned an unexpected status: ${result.status}`);
  } catch {
    res.status(500).json({
      error: "Failed to generate the next reading question",
    });
  }
});

module.exports = router;

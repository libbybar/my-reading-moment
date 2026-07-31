import crypto from "crypto";

import * as geminiClient from "./geminiClient.js";
import { buildPassagePrompt, buildQuestionPrompt, buildEvaluationPrompt } from "./prompts.js";

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Gemini is only ever trusted for prose (title/text, prompt/expectedMeaning,
// isCorrect) — structural fields (id, readingLevel, passageId) are always
// assigned by this module, never taken from the model's output.

async function generatePassage({ readingLevel, interests = [] }) {
  if (!isNonBlankString(readingLevel)) {
    throw new Error("generatePassage requires a non-blank readingLevel");
  }

  if (!Array.isArray(interests)) {
    throw new Error("generatePassage requires interests to be an array");
  }

  const content = await geminiClient.generateJson({
    prompt: buildPassagePrompt({ readingLevel, interests }),
    responseSchema: geminiClient.PASSAGE_RESPONSE_SCHEMA,
    label: "Gemini: generatePassage",
    describeResult: (result) => ({
      readingLevel,
      textLength: typeof result.text === "string" ? result.text.length : null,
    }),
  });

  if (!isNonBlankString(content.title) || !isNonBlankString(content.text)) {
    throw new Error("Gemini returned a passage with a missing title or text");
  }

  return {
    id: crypto.randomUUID(),
    title: content.title,
    text: content.text,
    readingLevel,
  };
}

async function generateQuestion({ passage, askedQuestionIds = [] }) {
  if (
    !passage ||
    !isNonBlankString(passage.id) ||
    !isNonBlankString(passage.text) ||
    !isNonBlankString(passage.readingLevel)
  ) {
    throw new Error("generateQuestion requires a passage with id, text, and readingLevel");
  }

  if (!Array.isArray(askedQuestionIds) || !askedQuestionIds.every(isNonBlankString)) {
    throw new Error("generateQuestion requires askedQuestionIds to be an array of valid ids");
  }

  const content = await geminiClient.generateJson({
    prompt: buildQuestionPrompt({ passage }),
    responseSchema: geminiClient.QUESTION_RESPONSE_SCHEMA,
    label: "Gemini: generateQuestion",
    describeResult: (result) => ({
      readingLevel: passage.readingLevel,
      promptLength: typeof result.prompt === "string" ? result.prompt.length : null,
    }),
  });

  if (!isNonBlankString(content.prompt) || !isNonBlankString(content.expectedMeaning)) {
    throw new Error("Gemini returned a question with a missing prompt or expectedMeaning");
  }

  // Gemini has no finite seed list, so this provider never reports exhaustion.
  return {
    status: "ok",
    question: {
      id: crypto.randomUUID(),
      passageId: passage.id,
      prompt: content.prompt,
      expectedMeaning: content.expectedMeaning,
    },
  };
}

async function evaluateAnswer({ passage, question, answerText }) {
  if (!passage) {
    throw new Error("evaluateAnswer requires a passage");
  }

  if (!question || !question.id) {
    throw new Error("evaluateAnswer requires a question");
  }

  if (question.passageId !== passage.id) {
    throw new Error("evaluateAnswer requires the question to belong to the supplied passage");
  }

  if (typeof answerText !== "string") {
    throw new Error("evaluateAnswer requires answerText to be a string");
  }

  const content = await geminiClient.generateJson({
    prompt: buildEvaluationPrompt({ question, answerText }),
    responseSchema: geminiClient.EVALUATION_RESPONSE_SCHEMA,
    label: "Gemini: evaluateAnswer",
  });

  if (typeof content.isCorrect !== "boolean") {
    throw new Error("Gemini returned an evaluation result with a missing or invalid isCorrect");
  }

  return {
    questionId: question.id,
    isCorrect: content.isCorrect,
    feedbackType: content.isCorrect ? "correct" : "retry",
  };
}

const geminiProvider = { generatePassage, generateQuestion, evaluateAnswer };

export { generatePassage, generateQuestion, evaluateAnswer };

export default geminiProvider;

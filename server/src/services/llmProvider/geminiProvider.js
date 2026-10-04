import crypto from "crypto";

import * as geminiClient from "./geminiClient.js";
import {
  buildPassagePrompt,
  buildQuestionPrompt,
  buildLearningItemPrompt,
  buildEvaluationSystemInstruction,
  buildEvaluationContent,
} from "./prompts.js";
import { isValidLevel, isValidSublevel } from "../../data/readingLevelSpec.js";
import { parseLearningItemRequest, buildValidatedLearningItem } from "../learningItemContract.js";

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Gemini is only ever trusted for prose (title/text, prompt/expectedMeaning,
// isCorrect) — structural fields (id, level, sublevel, passageId) are always
// assigned by this module, never taken from the model's output.

// Gemini-only format convention for turning plain text into title/chunk/done events.
const PASSAGE_STREAM_FORMAT_INSTRUCTION =
  "כתבי את הכותרת בשורה הראשונה בלבד, אחריה שורה ריקה אחת, ולאחר מכן את גוף הקטע בלבד. אל תשתמשי בסימוני עיצוב כמו גרשיים משולשים (```) ואל תוסיפי כותרות משנה או תוויות נוספות.";

// Buffers only until the title/body separator so the title never leaks into a chunk.
async function* generatePassageStream({ level, sublevel, interests = [] }) {
  if (!isValidLevel(level) || !isValidSublevel(sublevel)) {
    throw new Error("generatePassageStream requires a valid level and sublevel");
  }

  if (!Array.isArray(interests)) {
    throw new Error("generatePassageStream requires interests to be an array");
  }

  const prompt = `${buildPassagePrompt({ level, sublevel, interests })}\n\n${PASSAGE_STREAM_FORMAT_INSTRUCTION}`;

  let buffer = "";
  let title = null;
  let bodyText = "";
  let bodyStarted = false;

  for await (const rawChunk of geminiClient.generateTextStream({
    prompt,
    label: "Gemini: generatePassageStream",
  })) {
    if (!bodyStarted) {
      buffer += rawChunk;

      const separatorIndex = buffer.indexOf("\n\n");

      if (separatorIndex === -1) {
        continue;
      }

      title = buffer.slice(0, separatorIndex).trim();
      bodyStarted = true;
      yield { type: "title", title };

      const initialBodyText = buffer.slice(separatorIndex + 2);

      if (initialBodyText.length > 0) {
        bodyText += initialBodyText;
        yield { type: "chunk", text: initialBodyText };
      }

      continue;
    }

    bodyText += rawChunk;
    yield { type: "chunk", text: rawChunk };
  }

  if (!isNonBlankString(title) || !isNonBlankString(bodyText)) {
    throw new Error("Gemini returned a passage with a missing title or text");
  }

  yield {
    type: "done",
    passage: {
      id: crypto.randomUUID(),
      title,
      text: bodyText,
      level,
      sublevel,
    },
  };
}

async function generateQuestion({ passage, askedQuestionIds = [] }) {
  if (
    !passage ||
    !isNonBlankString(passage.id) ||
    !isNonBlankString(passage.text) ||
    !isValidLevel(passage.level) ||
    !isValidSublevel(passage.sublevel)
  ) {
    throw new Error("generateQuestion requires a passage with id, text, level, and sublevel");
  }

  if (!Array.isArray(askedQuestionIds) || !askedQuestionIds.every(isNonBlankString)) {
    throw new Error("generateQuestion requires askedQuestionIds to be an array of valid ids");
  }

  const content = await geminiClient.generateJson({
    prompt: buildQuestionPrompt({ passage }),
    responseSchema: geminiClient.QUESTION_RESPONSE_SCHEMA,
    label: "Gemini: generateQuestion",
    describeResult: (result) => ({
      level: passage.level,
      sublevel: passage.sublevel,
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
    prompt: buildEvaluationContent({ question, answerText }),
    systemInstruction: buildEvaluationSystemInstruction(),
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

async function generateLearningItem(request) {
  const parsedRequest = parseLearningItemRequest(request);

  const rawItem = await geminiClient.generateJson({
    prompt: buildLearningItemPrompt(parsedRequest),
    responseSchema: geminiClient.LEARNING_ITEM_RESPONSE_SCHEMA,
    label: "Gemini: generateLearningItem",
    describeResult: () => ({ missionId: parsedRequest.blueprint.missionId }),
  });

  return buildValidatedLearningItem(rawItem, parsedRequest);
}

const geminiProvider = { generatePassageStream, generateQuestion, evaluateAnswer, generateLearningItem };

export { generatePassageStream, generateQuestion, evaluateAnswer, generateLearningItem };

export default geminiProvider;

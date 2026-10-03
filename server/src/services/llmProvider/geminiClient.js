import { GoogleGenAI, Type } from "@google/genai";

import { writeDebugLog } from "../debugLogger.js";

let ai;
let activeApiKey;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
  }

  if (!ai || activeApiKey !== apiKey) {
    ai = new GoogleGenAI({ apiKey });
    activeApiKey = apiKey;
  }

  return ai;
}

// Keep SDK-specific schema values at the Gemini boundary.
const QUESTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompt: { type: Type.STRING },
    expectedMeaning: { type: Type.STRING },
  },
  required: ["prompt", "expectedMeaning"],
};

const LEARNING_ITEM_ACTIVITY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["multiple-choice", "short-answer"] },
    prompt: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    canonicalAnswer: { type: Type.STRING },
    evidenceQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["type", "prompt", "options", "canonicalAnswer", "evidenceQuotes"],
};

const LEARNING_ITEM_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    text: { type: Type.STRING },
    activities: { type: Type.ARRAY, items: LEARNING_ITEM_ACTIVITY_SCHEMA },
    strategyHint: { type: Type.STRING },
    variationSignature: { type: Type.STRING },
  },
  required: ["title", "text", "activities", "strategyHint", "variationSignature"],
};

const EVALUATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isCorrect: { type: Type.BOOLEAN },
  },
  required: ["isCorrect"],
};

async function generateJson({
  prompt,
  systemInstruction,
  responseSchema,
  label = "Gemini call",
  describeResult,
}) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startTime = Date.now();
  let content;

  try {
    const response = await getGeminiClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 1 },
      },
    });

    try {
      content = JSON.parse(response.text);
      return content;
    } catch {
      throw new Error("Gemini returned a response that could not be parsed as JSON");
    }
  } finally {
    writeDebugLog({
      tag: "LLM",
      label,
      model,
      durationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      ...(content && describeResult ? describeResult(content) : {}),
    });
  }
}

// Plain-text streaming, deliberately separate from generateJson: JSON mode
// (responseSchema/responseMimeType) can't be read incrementally without a
// partial-JSON parser, so the one caller that needs to stream (passage
// generation) asks for plain text instead — see generatePassageStream in
// geminiProvider.js, which owns interpreting that text as it arrives.
async function* generateTextStream({ prompt, label = "Gemini call" }) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startTime = Date.now();
  let totalLength = 0;

  try {
    const stream = await getGeminiClient().models.generateContentStream({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1 },
      },
    });

    for await (const chunk of stream) {
      if (typeof chunk.text === "string" && chunk.text.length > 0) {
        totalLength += chunk.text.length;
        yield chunk.text;
      }
    }
  } finally {
    writeDebugLog({
      tag: "LLM",
      label,
      model,
      durationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      textLength: totalLength,
    });
  }
}

export {
  generateJson,
  generateTextStream,
  QUESTION_RESPONSE_SCHEMA,
  LEARNING_ITEM_RESPONSE_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
};

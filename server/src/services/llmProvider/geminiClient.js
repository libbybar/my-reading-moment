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
const PASSAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    text: { type: Type.STRING },
  },
  required: ["title", "text"],
};

const QUESTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompt: { type: Type.STRING },
    expectedMeaning: { type: Type.STRING },
  },
  required: ["prompt", "expectedMeaning"],
};

const EVALUATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isCorrect: { type: Type.BOOLEAN },
  },
  required: ["isCorrect"],
};

async function generateJson({ prompt, responseSchema, label = "Gemini call", describeResult }) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startTime = Date.now();
  let content;

  try {
    const response = await getGeminiClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
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

export {
  generateJson,
  PASSAGE_RESPONSE_SCHEMA,
  QUESTION_RESPONSE_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
};

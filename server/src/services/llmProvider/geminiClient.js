const { GoogleGenAI, Type } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey.trim().length === 0) {
  throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
}

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });

// Response schemas live here, not in geminiProvider.js, so this remains the
// only module that imports @google/genai — geminiProvider.js treats these as
// opaque values, never touching the SDK's Type enum itself.
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

// Single entry point for talking to Gemini: sends `prompt` and asks for JSON
// matching `responseSchema`, then parses the response text. Callers get back
// a plain JS object, never the raw SDK response — this is the only module
// that imports @google/genai, so swapping providers or SDKs later only
// touches this file.
async function generateJson({ prompt, responseSchema }) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  try {
    return JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned a response that could not be parsed as JSON");
  }
}

module.exports = {
  generateJson,
  PASSAGE_RESPONSE_SCHEMA,
  QUESTION_RESPONSE_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
};

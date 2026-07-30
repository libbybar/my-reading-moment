const { GoogleGenAI, Type } = require("@google/genai");

const { writeDebugLog } = require("../debugLogger");

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
//
// `label` is optional and only used for the timing log below — it has no
// effect on the request itself. The start time lives in a local variable per
// call (not a shared/global registry), so overlapping calls never collide
// with each other the way console.time/console.timeEnd's shared label
// registry did.
//
// `describeResult` is also debug-only: an optional `(content) => {...}` that
// gets to add extra fields (e.g. text length, reading level) to the log
// entry. Kept out of this function itself since generateJson's result shape
// is different for every caller (passage vs question vs evaluation) — only
// geminiProvider.js actually knows what "length" means for each one.
async function generateJson({ prompt, responseSchema, label = "Gemini call", describeResult }) {
  const startTime = Date.now();
  let content;

  try {
    const response = await ai.models.generateContent({
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

module.exports = {
  generateJson,
  PASSAGE_RESPONSE_SCHEMA,
  QUESTION_RESPONSE_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
};

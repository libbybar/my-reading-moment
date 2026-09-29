import mockPassages from "../../data/mockPassages.js";
import { isValidLevel, isValidSublevel, getReadingLevelSpec } from "../../data/readingLevelSpec.js";

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Deterministic mock stand-in for semantic evaluation, not semantic matching itself.
const MIN_MEANINGFUL_ANSWER_LENGTH = 2;

function normalizeForComparison(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Hand-authored mocks cover only a few rungs; synthesize the rest so progression
// can exercise all 16 level/sublevel combinations.
function synthesizePassage(level, sublevel) {
  const spec = getReadingLevelSpec(level, sublevel);
  const sentence = "גאיה קראה ספר.";
  const text = Array.from({ length: spec.textLengthSentences.min }, () => sentence).join(" ");

  return {
    id: `mock-synthesized-${level}-${sublevel}`,
    title: `קטע לרמה ${level}.${sublevel}`,
    text,
    level,
    sublevel,
  };
}

function synthesizeQuestion(passage) {
  return {
    id: `${passage.id}-q1`,
    passageId: passage.id,
    prompt: "מי קראה ספר?",
    expectedMeaning: "גאיה",
  };
}

async function computePassage({ level, sublevel, interests = [] }) {
  if (!isValidLevel(level) || !isValidSublevel(sublevel)) {
    throw new Error("generatePassageStream requires a valid level and sublevel");
  }

  if (!Array.isArray(interests)) {
    throw new Error("generatePassageStream requires interests to be an array");
  }

  const passage = mockPassages.find(
    (candidate) => candidate.level === level && candidate.sublevel === sublevel,
  );

  if (passage) {
    return {
      id: passage.id,
      title: passage.title,
      text: passage.text,
      level: passage.level,
      sublevel: passage.sublevel,
    };
  }

  return synthesizePassage(level, sublevel);
}

// Deterministic stand-in for streaming; no artificial delay in tests.
function splitIntoWordChunks(text) {
  const words = text.split(" ");

  return words.map((word, index) => (index < words.length - 1 ? `${word} ` : word));
}

async function* generatePassageStream({ level, sublevel, interests = [] }) {
  const passage = await computePassage({ level, sublevel, interests });

  yield { type: "title", title: passage.title };

  for (const chunk of splitIntoWordChunks(passage.text)) {
    yield { type: "chunk", text: chunk };
  }

  yield { type: "done", passage };
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

  const seedPassage = mockPassages.find((candidate) => candidate.id === passage.id);
  const candidateQuestions = seedPassage ? seedPassage.questions : [synthesizeQuestion(passage)];

  const question = candidateQuestions.find(
    (candidate) => !askedQuestionIds.includes(candidate.id),
  );

  if (!question) {
    return { status: "exhausted" };
  }

  return { status: "ok", question };
}

async function evaluateAnswer({ passage, question, answerText }) {
  if (!passage) {
    throw new Error("evaluateAnswer requires a passage");
  }

  if (!question || !question.id) {
    throw new Error("evaluateAnswer requires a question");
  }

  // Generated questions may exist only in session.currentQuestion, not passage.questions.
  if (question.passageId !== passage.id) {
    throw new Error("evaluateAnswer requires the question to belong to the supplied passage");
  }

  if (typeof answerText !== "string") {
    throw new Error("evaluateAnswer requires answerText to be a string");
  }

  const normalizedAnswer = normalizeForComparison(answerText);
  const normalizedExpectedMeaning = normalizeForComparison(question.expectedMeaning || "");

  const isCorrect =
    normalizedAnswer.length >= MIN_MEANINGFUL_ANSWER_LENGTH &&
    normalizedExpectedMeaning.includes(normalizedAnswer);

  return {
    questionId: question.id,
    isCorrect,
    feedbackType: isCorrect ? "correct" : "retry",
  };
}

const mockProvider = { generatePassageStream, generateQuestion, evaluateAnswer };

export { generatePassageStream, generateQuestion, evaluateAnswer };

export default mockProvider;

import mockPassages from "../../data/mockPassages.js";

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

async function generatePassage({ readingLevel, interests = [] }) {
  if (!isNonBlankString(readingLevel)) {
    throw new Error("generatePassage requires a non-blank readingLevel");
  }

  if (!Array.isArray(interests)) {
    throw new Error("generatePassage requires interests to be an array");
  }

  const passage = mockPassages.find((candidate) => candidate.readingLevel === readingLevel);

  if (!passage) {
    throw new Error(`No mock passage available for readingLevel: ${readingLevel}`);
  }

  return {
    id: passage.id,
    title: passage.title,
    text: passage.text,
    readingLevel: passage.readingLevel,
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

  const seedPassage = mockPassages.find((candidate) => candidate.id === passage.id);
  const candidateQuestions = seedPassage ? seedPassage.questions : [];

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

const mockProvider = { generatePassage, generateQuestion, evaluateAnswer };

export { generatePassage, generateQuestion, evaluateAnswer };

export default mockProvider;

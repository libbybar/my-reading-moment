const mockPassages = require("../../data/mockPassages");

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Smallest rule that lets short, realistic child answers match: strip common
// punctuation and collapse whitespace, then check whether the normalized
// expected meaning contains the normalized answer. This is a deterministic
// mock stand-in for semantic evaluation, not semantic matching itself.
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

  // Mock-specific: the passage is selected from the seeded mock dataset by
  // readingLevel; interests are accepted for contract-shape parity but
  // otherwise unused. A real provider would generate new passage text
  // (personalized via interests) instead of selecting an existing one —
  // callers and the shared provider contract must not depend on this
  // selection existing.
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
  // These are the fields a real generator needs to produce a question at the
  // right difficulty: the actual passage content (text) and the level to
  // generate for (readingLevel), plus id to identify the passage. This is the
  // public contract every provider must satisfy — it is not about how any one
  // provider picks a question.
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

  // Mock-specific: candidate questions come from the seeded mock dataset,
  // looked up by passage.id. This is an internal detail of this mock — a real
  // LLM provider would generate a new question directly from passage.text
  // instead of drawing from a static list. Callers and the shared provider
  // contract must not depend on this lookup existing.
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

  // Intentionally does not require question.id to exist in passage.questions:
  // a dynamically generated question may legitimately exist only in
  // session.currentQuestion, never in the passage's seeded list. The session
  // is the source of truth for which question was actually presented; this
  // passageId check is the only structural guarantee we can make here.
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

module.exports = { generatePassage, generateQuestion, evaluateAnswer };

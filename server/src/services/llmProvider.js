const mockPassages = require("../data/mockPassages");

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

  const isCorrect = answerText.trim().length > 0;

  return {
    questionId: question.id,
    isCorrect,
    feedbackType: isCorrect ? "correct" : "retry",
  };
}

module.exports = { generateQuestion, evaluateAnswer };

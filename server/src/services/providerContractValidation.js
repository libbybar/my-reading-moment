function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEvaluationResult(result) {
  if (!result || typeof result !== "object") {
    return false;
  }

  if (typeof result.questionId !== "string" || result.questionId.length === 0) {
    return false;
  }

  if (typeof result.isCorrect !== "boolean") {
    return false;
  }

  if (result.feedbackType !== "correct" && result.feedbackType !== "retry") {
    return false;
  }

  return result.feedbackType === (result.isCorrect ? "correct" : "retry");
}

function isValidGeneratedQuestion(question, { passageId, askedQuestionIds }) {
  if (!question || typeof question !== "object") {
    return false;
  }

  if (!isNonBlankString(question.id) || !isNonBlankString(question.passageId)) {
    return false;
  }

  if (question.passageId !== passageId) {
    return false;
  }

  if (!isNonBlankString(question.prompt) || !isNonBlankString(question.expectedMeaning)) {
    return false;
  }

  return !askedQuestionIds.includes(question.id);
}

function isValidGeneratedPassage(passage, expectedReadingLevel) {
  if (!passage || typeof passage !== "object") {
    return false;
  }

  if (
    !isNonBlankString(passage.id) ||
    !isNonBlankString(passage.title) ||
    !isNonBlankString(passage.text) ||
    !isNonBlankString(passage.readingLevel)
  ) {
    return false;
  }

  return passage.readingLevel === expectedReadingLevel;
}

module.exports = { isValidEvaluationResult, isValidGeneratedQuestion, isValidGeneratedPassage };

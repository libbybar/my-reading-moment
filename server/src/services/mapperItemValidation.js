import { READABILITY_BANDS, BAND_CONSTRAINTS } from "../data/readabilityBands.js";

// Spec 25.5: four sentences at every band, so choosing one sentence is a 1-in-4 guess.
const MAPPER_SENTENCE_COUNT = 4;

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function countWords(sentence) {
  return sentence.trim().split(/\s+/).length;
}

function isSentenceIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < MAPPER_SENTENCE_COUNT;
}

function findSentenceProblems(item) {
  const { sentences } = item;

  if (!Array.isArray(sentences) || sentences.length !== MAPPER_SENTENCE_COUNT || !sentences.every(isNonBlankString)) {
    return [`needs exactly ${MAPPER_SENTENCE_COUNT} non-blank sentences`];
  }

  const wordRange = BAND_CONSTRAINTS[item.band]?.wordsPerSentence;

  if (!wordRange) {
    return [];
  }

  return sentences.flatMap((sentence, index) => {
    const wordCount = countWords(sentence);
    const isInRange = wordCount >= wordRange.min && wordCount <= wordRange.max;

    return isInRange ? [] : [`sentence ${index} has ${wordCount} words, band ${item.band} allows ${wordRange.min}-${wordRange.max}`];
  });
}

// Code can prove only what is checkable; that the framing sentence is a
// plausible distractor is a human review.
function findAnswerProblems(item) {
  const { sentences, answerText, correctSentenceIndex, framingSentenceIndex } = item;

  if (!isSentenceIndex(correctSentenceIndex) || !isSentenceIndex(framingSentenceIndex)) {
    return ["correctSentenceIndex and framingSentenceIndex must be sentence positions"];
  }

  if (correctSentenceIndex === framingSentenceIndex) {
    return ["the framing sentence cannot be the correct sentence"];
  }

  if (!isNonBlankString(answerText) || !Array.isArray(sentences) || sentences.length !== MAPPER_SENTENCE_COUNT) {
    return [];
  }

  const sentencesContainingAnswer = sentences.flatMap((sentence, index) => (sentence.includes(answerText) ? [index] : []));
  const isOnlyInCorrectSentence =
    sentencesContainingAnswer.length === 1 && sentencesContainingAnswer[0] === correctSentenceIndex;

  return isOnlyInCorrectSentence ? [] : ["answerText must appear in the correct sentence and in no other sentence"];
}

function findMissingFieldProblems(item) {
  const requiredText = ["itemId", "prompt", "answerText"];
  const problems = requiredText.filter((field) => !isNonBlankString(item[field])).map((field) => `${field} is required`);

  if (!READABILITY_BANDS.includes(item.band)) {
    problems.push("band must be one of the readability bands");
  }

  return problems;
}

// Returns problems rather than throwing, so one report can list everything wrong with a draft bank.
function validateMapperItem(item) {
  return [...findMissingFieldProblems(item), ...findSentenceProblems(item), ...findAnswerProblems(item)];
}

function validateMapperBank({ practiceItem, items }) {
  const allItems = [practiceItem, ...items].filter(Boolean);
  const itemIds = allItems.map((item) => item.itemId);
  const duplicateIds = itemIds.filter((itemId, index) => itemIds.indexOf(itemId) !== index);

  return [
    ...(items.length > 0 && !practiceItem ? ["a bank with items needs an unscored practiceItem"] : []),
    ...duplicateIds.map((itemId) => `duplicate itemId ${itemId}`),
    ...allItems.flatMap((item) => validateMapperItem(item).map((problem) => `${item.itemId ?? "(no id)"}: ${problem}`)),
  ];
}

export { MAPPER_SENTENCE_COUNT, validateMapperItem, validateMapperBank };

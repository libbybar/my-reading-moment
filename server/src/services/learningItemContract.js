import crypto from "crypto";

import INTERESTS from "../data/interests.js";
import { ACTIVITY_TYPES, getMissionBlueprint } from "../data/learningMissions.js";
import { isValidLevel, isValidSublevel } from "../data/readingLevelSpec.js";

const REQUIRED_ACTIVITY_COUNT = 2;
const MIN_MULTIPLE_CHOICE_OPTIONS = 3;
const MAX_MULTIPLE_CHOICE_OPTIONS = 4;
// Signatures are stored and fed back into later prompts, so they must stay short single lines.
const MAX_VARIATION_SIGNATURE_LENGTH = 120;

const NIKUD_AND_CANTILLATION = /[֑-ׇ]/g;
const PUNCTUATION = /[.,!?;:"'׳״\-–—־()]/g;

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Nikud and punctuation are stripped so that a quote still matches a passage
// that differs from it only in vowel marks or punctuation.
function normalizeForMatching(text) {
  return text
    .replace(NIKUD_AND_CANTILLATION, "")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function containsWholeWords(normalizedText, normalizedPhrase) {
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function countSentences(text) {
  return text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length;
}

function computeContentFingerprint({ passageText, canonicalAnswers }) {
  const material = [passageText, ...canonicalAnswers].map(normalizeForMatching).join("\n");

  return crypto.createHash("sha256").update(material).digest("hex");
}

function parseRecentItems(recentItems) {
  if (!Array.isArray(recentItems)) {
    throw new Error("generateLearningItem requires recentItems to be an array");
  }

  recentItems.forEach((recentItem) => {
    if (
      !recentItem ||
      !isNonBlankString(recentItem.variationSignature) ||
      !isNonBlankString(recentItem.contentFingerprint)
    ) {
      throw new Error(
        "generateLearningItem requires every recent item to have a variationSignature and contentFingerprint",
      );
    }
  });

  return recentItems.map(({ variationSignature, contentFingerprint }) => ({
    variationSignature,
    contentFingerprint,
  }));
}

// Only ids and allow-listed values are accepted, so no child text or free-form
// profile content can reach a prompt through this request.
function parseLearningItemRequest({ missionId, readabilityBand, interest, recentItems = [] }) {
  const blueprint = getMissionBlueprint(missionId);

  if (
    !readabilityBand ||
    !isValidLevel(readabilityBand.level) ||
    !isValidSublevel(readabilityBand.sublevel)
  ) {
    throw new Error("generateLearningItem requires a readabilityBand with a valid level and sublevel");
  }

  if (interest !== undefined && interest !== null && !INTERESTS.includes(interest)) {
    throw new Error("generateLearningItem requires interest to be an allow-listed interest");
  }

  return {
    blueprint,
    readabilityBand: { level: readabilityBand.level, sublevel: readabilityBand.sublevel },
    interest: interest ?? null,
    recentItems: parseRecentItems(recentItems),
  };
}

function validateMultipleChoiceOptions(activity) {
  const { options, canonicalAnswer } = activity;

  if (
    !Array.isArray(options) ||
    options.length < MIN_MULTIPLE_CHOICE_OPTIONS ||
    options.length > MAX_MULTIPLE_CHOICE_OPTIONS ||
    !options.every(isNonBlankString)
  ) {
    throw new Error("A multiple-choice activity needs 3 or 4 non-blank options");
  }

  const normalizedOptions = options.map(normalizeForMatching);

  if (normalizedOptions.some((option) => option.length === 0)) {
    throw new Error("A multiple-choice option has no words after normalization");
  }

  if (new Set(normalizedOptions).size !== options.length) {
    throw new Error("A multiple-choice activity has duplicate options");
  }

  const matchingOptionCount = normalizedOptions.filter(
    (option) => option === normalizeForMatching(canonicalAnswer),
  ).length;

  if (matchingOptionCount !== 1) {
    throw new Error("A multiple-choice canonicalAnswer must equal exactly one option");
  }
}

// Whole-phrase matching: a fragment of a word must not count as evidence.
function validateEvidenceQuotes(evidenceQuotes, { blueprint, normalizedPassage }) {
  if (!Array.isArray(evidenceQuotes) || !evidenceQuotes.every(isNonBlankString)) {
    throw new Error("Learning item activity needs evidenceQuotes as an array of non-blank strings");
  }

  const normalizedQuotes = evidenceQuotes.map(normalizeForMatching);

  if (normalizedQuotes.some((quote) => quote.length === 0)) {
    throw new Error("Learning item evidence quote has no words after normalization");
  }

  if (!normalizedQuotes.every((quote) => containsWholeWords(normalizedPassage, quote))) {
    throw new Error("Learning item evidence quote does not appear in the passage");
  }

  if (new Set(normalizedQuotes).size < blueprint.minEvidenceQuotesPerActivity) {
    throw new Error(
      `Mission ${blueprint.missionId} needs ${blueprint.minEvidenceQuotesPerActivity} distinct evidence quotes per activity`,
    );
  }

  return evidenceQuotes.map((quote) => quote.trim());
}

function validateActivity(activity, { blueprint, normalizedPassage }) {
  if (!activity || typeof activity !== "object") {
    throw new Error("Learning item activity is malformed");
  }

  if (!blueprint.activityTypes.includes(activity.type)) {
    throw new Error(`Unsupported activity type "${activity.type}" for mission ${blueprint.missionId}`);
  }

  if (
    !isNonBlankString(activity.prompt) ||
    !isNonBlankString(activity.canonicalAnswer)
  ) {
    throw new Error("Learning item activity needs a prompt and a canonicalAnswer");
  }

  if (normalizeForMatching(activity.canonicalAnswer).length === 0) {
    throw new Error("Learning item canonicalAnswer has no words after normalization");
  }

  const evidenceQuotes = validateEvidenceQuotes(activity.evidenceQuotes, { blueprint, normalizedPassage });

  if (activity.type === ACTIVITY_TYPES.MULTIPLE_CHOICE) {
    validateMultipleChoiceOptions(activity);
  } else if (!Array.isArray(activity.options) || activity.options.length > 0) {
    throw new Error("A short-answer activity must not have options");
  }

  return {
    type: activity.type,
    prompt: activity.prompt.trim(),
    options: activity.options.map((option) => option.trim()),
    canonicalAnswer: activity.canonicalAnswer.trim(),
    evidenceQuotes,
  };
}

// A hint that repeats an answer or its evidence would hand the answer over.
// Only exact whole-word repetition is detectable here; paraphrases are not.
function assertHintDoesNotRevealAnswers(strategyHint, activities) {
  const normalizedHint = normalizeForMatching(strategyHint);

  activities.forEach((activity) => {
    const revealing = [activity.canonicalAnswer, ...activity.evidenceQuotes].some((secret) =>
      containsWholeWords(normalizedHint, normalizeForMatching(secret)),
    );

    if (revealing) {
      throw new Error("Learning item strategy hint reveals an answer");
    }
  });
}

function assertNotRepeated({ variationSignature, contentFingerprint }, recentItems) {
  const normalizedSignature = normalizeForMatching(variationSignature);

  recentItems.forEach((recentItem) => {
    if (normalizeForMatching(recentItem.variationSignature) === normalizedSignature) {
      throw new Error("Learning item repeats a recent variation signature");
    }

    if (recentItem.contentFingerprint === contentFingerprint) {
      throw new Error("Learning item repeats a recent content fingerprint");
    }
  });
}

// Whitelists fields into a new object: whatever else the model returned never
// reaches the caller, and ids are always assigned here, never by the model.
function buildValidatedLearningItem(rawItem, { blueprint, recentItems }) {
  if (!rawItem || typeof rawItem !== "object") {
    throw new Error("Learning item is malformed");
  }

  if (
    !isNonBlankString(rawItem.title) ||
    !isNonBlankString(rawItem.text) ||
    !isNonBlankString(rawItem.strategyHint) ||
    !isNonBlankString(rawItem.variationSignature)
  ) {
    throw new Error("Learning item needs a title, text, strategyHint and variationSignature");
  }

  if (
    rawItem.variationSignature.length > MAX_VARIATION_SIGNATURE_LENGTH ||
    /[\r\n]/.test(rawItem.variationSignature)
  ) {
    throw new Error("Learning item variationSignature must be a short single line");
  }

  if (countSentences(rawItem.text) < blueprint.readabilityConstraints.minSentences) {
    throw new Error("Learning item passage is shorter than the mission requires");
  }

  if (!Array.isArray(rawItem.activities) || rawItem.activities.length !== REQUIRED_ACTIVITY_COUNT) {
    throw new Error(`Learning item needs exactly ${REQUIRED_ACTIVITY_COUNT} activities`);
  }

  const normalizedPassage = normalizeForMatching(rawItem.text);
  const activities = rawItem.activities.map((activity) =>
    validateActivity(activity, { blueprint, normalizedPassage }),
  );

  if (new Set(activities.map((activity) => activity.type)).size !== activities.length) {
    throw new Error("Learning item activities must have different types");
  }

  assertHintDoesNotRevealAnswers(rawItem.strategyHint, activities);

  const contentFingerprint = computeContentFingerprint({
    passageText: rawItem.text,
    canonicalAnswers: activities.map((activity) => activity.canonicalAnswer),
  });
  const variationSignature = rawItem.variationSignature.trim();

  assertNotRepeated({ variationSignature, contentFingerprint }, recentItems);

  return {
    itemId: crypto.randomUUID(),
    missionId: blueprint.missionId,
    passage: { title: rawItem.title.trim(), text: rawItem.text.trim() },
    activities,
    strategyHint: rawItem.strategyHint.trim(),
    variationSignature,
    contentFingerprint,
  };
}

export { parseLearningItemRequest, buildValidatedLearningItem };

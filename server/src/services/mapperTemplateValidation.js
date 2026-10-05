import { READABILITY_BANDS } from "../data/readabilityBands.js";
import {
  EXPLICIT_DETAIL,
  FEATURE_TAGS,
  FEATURE_TAGGED_BANDS,
  FREE_PRONOUNS,
  FREE_AND_ATTACHED_PRONOUNS,
} from "../data/mapperTemplates.js";

// These belong to the band, so a template that restates them could contradict it.
const BAND_OWNED_FIELDS = ["sentenceCount", "wordsPerSentence", "nikud"];
const WORD_LIST_FIELDS = ["allowedRelations", "allowedConnectors"];

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyWordList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonBlankString);
}

function findRequiredFieldProblems(template) {
  const problems = ["id", "structure", "storyShape"]
    .filter((field) => !isNonBlankString(template[field]))
    .map((field) => `${field} is required`);

  if (!READABILITY_BANDS.includes(template.band)) {
    problems.push("band must be one of the readability bands");
  }

  if (template.questionKind !== EXPLICIT_DETAIL) {
    problems.push(`questionKind must be ${EXPLICIT_DETAIL}: the mapper asks for an explicit detail only`);
  }

  return problems;
}

function findRestatedBandFieldProblems(template) {
  return BAND_OWNED_FIELDS.filter((field) => field in template).map((field) => `${field} belongs to the band, not the template`);
}

function findWordListProblems(template) {
  return WORD_LIST_FIELDS.filter((field) => field in template)
    .filter((field) => !isNonEmptyWordList(template[field]))
    .map((field) => `${field} must be a non-empty array of non-blank strings`);
}

function findFeatureTagProblems(template) {
  const isTaggedBand = FEATURE_TAGGED_BANDS.includes(template.band);

  if (!isTaggedBand) {
    return "featureTag" in template ? ["featureTag is only used at bands D to F"] : [];
  }

  return Object.values(FEATURE_TAGS).includes(template.featureTag) ? [] : ["featureTag is required at bands D to F"];
}

function findPronounFormProblems(template) {
  const usesPronouns = [FEATURE_TAGS.PRONOUN_DEPENDENT, FEATURE_TAGS.PRONOUN_PRESENT].includes(template.featureTag);

  if (!usesPronouns) {
    return "pronounForms" in template ? ["pronounForms is only for templates tagged pronoun-present or pronoun-dependent"] : [];
  }

  if (![FREE_PRONOUNS, FREE_AND_ATTACHED_PRONOUNS].includes(template.pronounForms)) {
    return ["a pronoun template needs pronounForms"];
  }

  // Spec 25.8: band D never starts with an attached pronoun form.
  return template.band === "D" && template.pronounForms !== FREE_PRONOUNS ? ["band D allows free pronouns only"] : [];
}

function findTemplateProblems(template) {
  return [
    ...findRequiredFieldProblems(template),
    ...findRestatedBandFieldProblems(template),
    ...findWordListProblems(template),
    ...findFeatureTagProblems(template),
    ...findPronounFormProblems(template),
  ];
}

function findDuplicates(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

// A structure names one story shape across all bands, because it takes part in the variation signature.
// Returns problems rather than throwing, so one report lists everything wrong with a draft catalog.
function findMapperTemplateProblems(templates) {
  const templateIds = templates.map((template) => template.id);
  const duplicateIds = findDuplicates(templateIds);
  const duplicateStructures = findDuplicates(templates.map((template) => template.structure));

  return [
    ...duplicateIds.map((templateId) => `duplicate template id ${templateId}`),
    ...duplicateStructures.map((structure) => `duplicate structure ${structure}`),
    ...templates.flatMap((template) => findTemplateProblems(template).map((problem) => `${template.id ?? "(no id)"}: ${problem}`)),
  ];
}

export { findMapperTemplateProblems };

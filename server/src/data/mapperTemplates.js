// Server-owned structures for generated placement items.
// A template fixes the pedagogy; the LLM may only invent the story surface inside it.
// Sentence count, words per sentence and nikud come from the band (readabilityBands.js),
// never from a template.
//
// DRAFT: none of these has passed the human-reviewed evaluation corpus yet, so none is
// approved for a child. Changing a template means reviewing that template again.

const EXPLICIT_DETAIL = "explicit-detail";

// A tag exists only at D to F (spec 25.8). It records how the item relates to pronoun
// resolution; a wrong answer on a pronoun-dependent item can never lower the band.
const FEATURE_TAGS = {
  PRONOUN_DEPENDENT: "pronoun-dependent",
  PRONOUN_PRESENT: "pronoun-present",
  NONE: "none",
};

const FEATURE_TAGGED_BANDS = ["D", "E", "F"];

const FREE_PRONOUNS = "free";
const FREE_AND_ATTACHED_PRONOUNS = "free-and-attached";

const MAPPER_TEMPLATES = [
  {
    id: "a-character-location",
    band: "A",
    structure: "character-location",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "One character or animal and the objects around it. Each sentence states one concrete fact about where something is. Exactly one sentence states the location the question asks about. At least one other sentence must be a plausible distractor because it mentions a related object or place without answering the question.",
    allowedRelations: ["על", "מתחת", "ליד"],
  },
  {
    id: "a-object-location",
    band: "A",
    structure: "object-location",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "Several objects and no character acting. Each sentence places one object relative to another. Exactly one sentence states where the object the question asks about is. At least one other sentence must be a plausible distractor because it describes a related object or location without answering the question.",
    allowedRelations: ["על", "מתחת", "ליד"],
  },
  {
    id: "b-time-order",
    band: "B",
    structure: "time-order",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "One character doing a short series of things. Simple time words open the sentences. The question asks for a detail stated directly in the sentence marked by one time word; the child must not need to reconstruct, infer, or reorder the event sequence to answer. Exactly one sentence states the answer, and at least one other sentence is a plausible distractor about the same character.",
    allowedConnectors: ["קודם", "אחר כך", "לבסוף"],
  },
  {
    id: "b-two-characters",
    band: "B",
    structure: "two-characters",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "Two characters at most, each acting in turn. Every change of character repeats the name instead of using a pronoun. The question asks for one explicit detail about one named character, and exactly one sentence states the answer. At least one other sentence must be a plausible distractor because it mentions the same character or a closely related action.",
    allowedConnectors: ["קודם", "אחר כך", "לבסוף"],
  },
  {
    id: "c-connected-detail",
    band: "C",
    structure: "connector-linked-detail",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "A short connected story whose sentences are linked by simple connectors. The question asks for a concrete detail (who, what, where) that one sentence states directly. The connectors never make the answer depend on a second sentence. At least one other sentence must be a plausible distractor because it mentions a related person, object, place, or action without answering the question.",
    allowedConnectors: ["כי", "אבל", "אחר כך"],
  },
  {
    id: "c-contrast-detail",
    band: "C",
    structure: "contrast-detail",
    questionKind: EXPLICIT_DETAIL,
    storyShape:
      "A story with one contrast between what a character wanted and what happened. The question asks for a concrete detail that exactly one sentence states directly, not for the reason or the contrast itself. At least one other sentence must be a plausible distractor because it mentions the same character, object, or situation without answering the question.",
    allowedConnectors: ["כי", "אבל", "אחר כך"],
  },
  {
    id: "d-pronoun-present",
    band: "D",
    structure: "character-sequence",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.PRONOUN_PRESENT,
    pronounForms: FREE_PRONOUNS,
    storyShape:
      "A story with at least one free pronoun whose single antecedent is the subject of the sentence right before it. The question asks about something the pronoun does not hide, so the correct sentence is identifiable without resolving it. At least one other sentence must be a plausible distractor related to the same character, place, object, or action.",
  },
  // Corpus review must confirm the pronoun is truly needed and that the question cannot be
  // answered by sentence position, lexical overlap, or elimination without resolving the referent.
  {
    id: "d-pronoun-dependent",
    band: "D",
    structure: "follow-up-sentence-answer",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.PRONOUN_DEPENDENT,
    pronounForms: FREE_PRONOUNS,
    storyShape:
      "A story with two entities of different gender or number. The sentence immediately before the answer sentence names the intended antecedent as its subject. The answer sentence refers to that antecedent only by a free pronoun. The other entity remains present in the story, but cannot fit the pronoun by gender or number. The question can be answered only by resolving the pronoun to the named antecedent. At least one other sentence must be a plausible distractor related to the other entity or to the same scene.",
  },
  {
    id: "e-pronoun-present",
    band: "E",
    structure: "two-character-sequence",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.PRONOUN_PRESENT,
    pronounForms: FREE_AND_ATTACHED_PRONOUNS,
    storyShape:
      "A story with up to two named characters and at least one pronoun, free or attached to a preposition, whose referent is still clear. The question asks about something the pronoun does not hide. At least one other sentence must be a plausible distractor related to the same characters, object, place, or action.",
  },
  {
    id: "e-pronoun-dependent",
    band: "E",
    structure: "two-character-follow-up-answer",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.PRONOUN_DEPENDENT,
    pronounForms: FREE_AND_ATTACHED_PRONOUNS,
    storyShape:
      "A story with two named characters. The sentence that answers the question refers to its character by a pronoun, free or attached to a preposition, and only one character fits that pronoun by gender and number. The correct sentence can be found only by resolving the pronoun. At least one other sentence must be a plausible distractor involving the other character or the same object or place.",
  },
  {
    id: "f-connected-detail",
    band: "F",
    structure: "layered-detail",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.NONE,
    storyShape:
      "A longer story with varied sentence structure, up to two subordinate relations in the whole text and none nested. The question asks for a concrete detail that exactly one sentence states directly, and it does not depend on any pronoun. At least one other sentence must be a plausible distractor because it mentions a related character, object, place, or action without answering the question.",
  },
  {
    id: "f-far-antecedent",
    band: "F",
    structure: "far-antecedent",
    questionKind: EXPLICIT_DETAIL,
    featureTag: FEATURE_TAGS.PRONOUN_DEPENDENT,
    pronounForms: FREE_AND_ATTACHED_PRONOUNS,
    storyShape:
      "A pronoun whose antecedent is more than one sentence back, with an intervening noun that cannot be the referent because its gender or number does not match. The reference is harder to follow but never ambiguous. The question asks for an explicit detail that can be answered only by resolving the pronoun to the farther antecedent. At least one other sentence must be a plausible distractor involving the intervening entity or the same scene.",
  },
];

export {
  MAPPER_TEMPLATES,
  FEATURE_TAGS,
  FEATURE_TAGGED_BANDS,
  EXPLICIT_DETAIL,
  FREE_PRONOUNS,
  FREE_AND_ATTACHED_PRONOUNS,
};
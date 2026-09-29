// The single, closed list of allowed `interests` values. Free text was
// removed on purpose (see childProfileRoutes.js) — this array is what
// actually flows into Gemini's generatePassage prompt, so it must be a
// fixed allow-list, not user-supplied text, regardless of the client.
const INTERESTS = [
  "space",
  "sports",
  "nature",
  "animals",
  "unicorns",
  "magic",
  "fantasy",
  "flowers",
  "disneyCharacters",
  "tolkien",
  "discworld",
  "dune",
];

// Hebrew labels for prompt construction only (prompts.js's buildInterestsLine)
// — Gemini must see "חלל", never the internal code "space". Duplicated from
// client/src/constants/text.js's interest*Label values on purpose: prompts.js
// has no reason to depend on the client's text module for a handful of
// strings it owns the only real use of.
const INTEREST_LABELS_BY_VALUE = {
  space: "חלל",
  sports: "ספורט",
  nature: "טבע",
  animals: "בעלי חיים",
  unicorns: "חד-קרן",
  magic: "קסם",
  fantasy: "פנטזיה",
  flowers: "פרחים",
  disneyCharacters: "דמויות דיסני",
  tolkien: "עולם של טולקין",
  discworld: "עולם הדיסק",
  dune: "חולית",
};

export default INTERESTS;
export { INTEREST_LABELS_BY_VALUE };

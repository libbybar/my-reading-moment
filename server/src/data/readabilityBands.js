// Ids only: the parent-facing Hebrew descriptions live in the client text source.
const READABILITY_BANDS = ["A", "B", "C", "D", "E", "F"];

// The parent describes what the child reads; the band is derived server-side.
const STARTING_SIGNAL_BANDS = {
  "short-pointed-texts": "A",
  "several-sentence-pointed-passages": "C",
  "longer-texts-reduced-nikud": "E",
};

const STARTING_SIGNALS = Object.keys(STARTING_SIGNAL_BANDS);

// Drafted in spec section 25.1; the pilot may change any of these numbers.
const BAND_CONSTRAINTS = {
  A: { sentences: { min: 3, max: 4 }, wordsPerSentence: { min: 5, max: 6 }, nikud: "full" },
  B: { sentences: { min: 4, max: 5 }, wordsPerSentence: { min: 5, max: 7 }, nikud: "full" },
  C: { sentences: { min: 4, max: 6 }, wordsPerSentence: { min: 6, max: 8 }, nikud: "full" },
  D: { sentences: { min: 5, max: 6 }, wordsPerSentence: { min: 6, max: 9 }, nikud: "full" },
  E: { sentences: { min: 5, max: 7 }, wordsPerSentence: { min: 7, max: 10 }, nikud: "full-or-almost-full" },
  F: { sentences: { min: 5, max: 7 }, wordsPerSentence: { min: 7, max: 10 }, nikud: "reduced" },
};

// Spec 25.5: the lower or middle of each band's range. A is the one exception: four sentences
// is the guess-resistance floor (not a 1-in-3 guess) and also the top of A's 3-4 range.
const MAPPER_SENTENCE_COUNT_BY_BAND = { A: 4, B: 4, C: 5, D: 5, E: 6, F: 6 };

// Null past either end of the scale and for an unknown band, so callers decide what a missing neighbour means.
function getAdjacentBand(band, offset) {
  const position = READABILITY_BANDS.indexOf(band);

  return position === -1 ? null : (READABILITY_BANDS[position + offset] ?? null);
}

export {
  READABILITY_BANDS,
  STARTING_SIGNAL_BANDS,
  STARTING_SIGNALS,
  BAND_CONSTRAINTS,
  MAPPER_SENTENCE_COUNT_BY_BAND,
  getAdjacentBand,
};

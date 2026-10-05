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
  A: { sentences: { min: 3, max: 4 }, wordsPerSentence: { min: 5, max: 6 } },
  B: { sentences: { min: 4, max: 5 }, wordsPerSentence: { min: 5, max: 7 } },
  C: { sentences: { min: 4, max: 6 }, wordsPerSentence: { min: 6, max: 8 } },
  D: { sentences: { min: 5, max: 6 }, wordsPerSentence: { min: 6, max: 9 } },
  E: { sentences: { min: 5, max: 7 }, wordsPerSentence: { min: 7, max: 10 } },
  F: { sentences: { min: 5, max: 7 }, wordsPerSentence: { min: 7, max: 10 } },
};

// Null past either end of the scale, so callers decide what a missing neighbour means.
function getAdjacentBand(band, offset) {
  return READABILITY_BANDS[READABILITY_BANDS.indexOf(band) + offset] ?? null;
}

export { READABILITY_BANDS, STARTING_SIGNAL_BANDS, STARTING_SIGNALS, BAND_CONSTRAINTS, getAdjacentBand };

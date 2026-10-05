import { BAND_CONSTRAINTS, READABILITY_BANDS } from "../../src/data/readabilityBands.js";

const CORRECT_SENTENCE_INDEX = 1;
const FRAMING_SENTENCE_INDEX = 0;

// Filler text that satisfies every code-checkable rule, so tests exercise the
// placement logic rather than Hebrew content, which humans review.
function buildMapperItem({ itemId, band, correctSentenceIndex = CORRECT_SENTENCE_INDEX }) {
  const wordCount = BAND_CONSTRAINTS[band].wordsPerSentence.min;
  const answerText = `${itemId}-answer`;
  const sentences = Array.from({ length: 4 }, (_, sentenceIndex) =>
    Array.from({ length: wordCount }, (_, wordIndex) =>
      sentenceIndex === correctSentenceIndex && wordIndex === 0 ? answerText : `${itemId}-s${sentenceIndex}-w${wordIndex}`,
    ).join(" "),
  );

  return {
    itemId,
    band,
    prompt: `prompt-${itemId}`,
    sentences,
    correctSentenceIndex,
    framingSentenceIndex: FRAMING_SENTENCE_INDEX,
    answerText,
  };
}

function buildMapperBank({ bands = READABILITY_BANDS, itemsPerBand = 2 } = {}) {
  return {
    practiceItem: buildMapperItem({ itemId: "practice", band: "A" }),
    items: bands.flatMap((band) =>
      Array.from({ length: itemsPerBand }, (_, number) => buildMapperItem({ itemId: `${band}${number + 1}`, band })),
    ),
  };
}

export { buildMapperItem, buildMapperBank };

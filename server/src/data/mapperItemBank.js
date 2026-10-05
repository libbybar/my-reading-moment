// Fixed, human-reviewed placement items; placement never calls an LLM.
// The bank is empty, so placement reports itself unavailable until generated items replace it.
//
// Item shape: { itemId, band, prompt, sentences (exactly 4), correctSentenceIndex,
// framingSentenceIndex, answerText }. The practice item is unscored and teaches the tap.
const MAPPER_ITEM_BANK = {
  practiceItem: null,
  items: [],
};

export default MAPPER_ITEM_BANK;

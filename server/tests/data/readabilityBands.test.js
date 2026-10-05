import {
  BAND_CONSTRAINTS,
  MAPPER_SENTENCE_COUNT_BY_BAND,
  READABILITY_BANDS,
  getAdjacentBand,
} from "../../src/data/readabilityBands.js";

describe("MAPPER_SENTENCE_COUNT_BY_BAND", () => {
  test("follows the pilot defaults of spec 25.5", () => {
    expect(MAPPER_SENTENCE_COUNT_BY_BAND).toEqual({ A: 4, B: 4, C: 5, D: 5, E: 6, F: 6 });
  });

  test.each(READABILITY_BANDS)("band %s uses a length inside its own sentence range", (band) => {
    const { min, max } = BAND_CONSTRAINTS[band].sentences;

    expect(MAPPER_SENTENCE_COUNT_BY_BAND[band]).toBeGreaterThanOrEqual(min);
    expect(MAPPER_SENTENCE_COUNT_BY_BAND[band]).toBeLessThanOrEqual(max);
  });

  test("uses the top of a band's range only at A, where four sentences is the guess-resistance floor", () => {
    const usesMaximum = READABILITY_BANDS.filter((band) => MAPPER_SENTENCE_COUNT_BY_BAND[band] === BAND_CONSTRAINTS[band].sentences.max);

    expect(usesMaximum).toEqual(["A"]);
  });
});

describe("BAND_CONSTRAINTS nikud", () => {
  test("only band F reduces nikud (spec 25.1)", () => {
    expect(Object.fromEntries(READABILITY_BANDS.map((band) => [band, BAND_CONSTRAINTS[band].nikud]))).toEqual({
      A: "full",
      B: "full",
      C: "full",
      D: "full",
      E: "full-or-almost-full",
      F: "reduced",
    });
  });
});

describe("getAdjacentBand", () => {
  test.each([
    ["C", 1, "D"],
    ["C", -1, "B"],
    ["A", 1, "B"],
    ["F", -1, "E"],
  ])("band %s with offset %i is %s", (band, offset, expected) => {
    expect(getAdjacentBand(band, offset)).toBe(expected);
  });

  test.each([
    ["A", -1],
    ["F", 1],
  ])("is null past the end of the scale (%s, %i)", (band, offset) => {
    expect(getAdjacentBand(band, offset)).toBeNull();
  });

  test.each(["G", "", undefined, null])("is null for the unknown band %p, never a wrapped neighbour", (band) => {
    expect(getAdjacentBand(band, 1)).toBeNull();
    expect(getAdjacentBand(band, -1)).toBeNull();
  });
});

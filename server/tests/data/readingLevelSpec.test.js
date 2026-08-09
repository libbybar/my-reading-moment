import {
  READING_LEVEL_SPEC,
  READING_LEVEL_SPEC_VERSION,
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_SUBLEVEL,
  MAX_SUBLEVEL,
  getReadingLevelSpec,
  isValidLevel,
  isValidSublevel,
} from "../../src/data/readingLevelSpec.js";

describe("readingLevelSpec", () => {
  test("has exactly one entry for every level/sublevel combination in range", () => {
    const expectedKeys = [];

    for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      for (let sublevel = MIN_SUBLEVEL; sublevel <= MAX_SUBLEVEL; sublevel += 1) {
        expectedKeys.push(`${level}.${sublevel}`);
      }
    }

    const actualKeys = READING_LEVEL_SPEC.map((entry) => `${entry.level}.${entry.sublevel}`);

    expect(new Set(actualKeys)).toEqual(new Set(expectedKeys));
    expect(actualKeys).toHaveLength(expectedKeys.length);
  });

  test("every entry has valid, non-empty structured fields", () => {
    READING_LEVEL_SPEC.forEach((entry) => {
      expect(isValidLevel(entry.level)).toBe(true);
      expect(isValidSublevel(entry.sublevel)).toBe(true);
      expect(typeof entry.nikud).toBe("string");
      expect(entry.nikud.length).toBeGreaterThan(0);

      expect(entry.textLengthSentences.min).toBeLessThanOrEqual(entry.textLengthSentences.max);
      expect(entry.wordsPerSentence.min).toBeLessThanOrEqual(entry.wordsPerSentence.max);

      expect(typeof entry.vocabularyAndMorphology).toBe("string");
      expect(entry.vocabularyAndMorphology.length).toBeGreaterThan(0);
      expect(typeof entry.syntax).toBe("string");
      expect(entry.syntax.length).toBeGreaterThan(0);
      expect(typeof entry.comprehensionTarget).toBe("string");
      expect(entry.comprehensionTarget.length).toBeGreaterThan(0);
    });
  });

  test("getReadingLevelSpec returns the matching entry", () => {
    const entry = getReadingLevelSpec(2, 3);

    expect(entry.level).toBe(2);
    expect(entry.sublevel).toBe(3);
    expect(entry.comprehensionTarget).toBe("חיבור מידע בין משפטים");
  });

  test("getReadingLevelSpec throws for an out-of-range level/sublevel", () => {
    expect(() => getReadingLevelSpec(5, 1)).toThrow();
    expect(() => getReadingLevelSpec(1, 5)).toThrow();
  });

  test.each([
    [0, false],
    [1, true],
    [4, true],
    [5, false],
    [2.5, false],
  ])("isValidLevel(%s) === %s", (level, expected) => {
    expect(isValidLevel(level)).toBe(expected);
  });

  test.each([
    [0, false],
    [1, true],
    [4, true],
    [5, false],
  ])("isValidSublevel(%s) === %s", (sublevel, expected) => {
    expect(isValidSublevel(sublevel)).toBe(expected);
  });

  test("exposes a stable spec version number", () => {
    expect(Number.isInteger(READING_LEVEL_SPEC_VERSION)).toBe(true);
    expect(READING_LEVEL_SPEC_VERSION).toBeGreaterThanOrEqual(1);
  });
});

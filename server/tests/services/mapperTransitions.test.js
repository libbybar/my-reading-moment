import { chooseNextItemBand, decidePlacementBand, isPlacementComplete } from "../../src/services/mapperTransitions.js";

const observe = (...outcomes) => outcomes.map((outcome) => ({ band: "?", outcome }));

const withFeatureTags = (observations, ...featureTags) =>
  observations.map((observation, position) => ({ ...observation, featureTag: featureTags[position] }));

describe("chooseNextItemBand", () => {
  test("the first item is at the seed band", () => {
    expect(chooseNextItemBand({ seedBand: "C", observations: [] })).toBe("C");
  });

  test.each([
    ["correct", "D"],
    ["incorrect", "B"],
    ["skipped", "C"],
    ["dropped", "C"],
  ])("after a %s first item, both probe items are at %s", (firstOutcome, expectedBand) => {
    expect(chooseNextItemBand({ seedBand: "C", observations: observe(firstOutcome) })).toBe(expectedBand);
    expect(chooseNextItemBand({ seedBand: "C", observations: observe(firstOutcome, "correct") })).toBe(expectedBand);
  });

  test("the last item returns to the seed band whatever happened", () => {
    expect(chooseNextItemBand({ seedBand: "C", observations: observe("correct", "correct", "correct") })).toBe("C");
    expect(chooseNextItemBand({ seedBand: "C", observations: observe("incorrect", "correct", "correct") })).toBe("C");
  });

  test("at the floor an incorrect first item cannot probe below it", () => {
    const afterIncorrect = observe("incorrect");

    expect(chooseNextItemBand({ seedBand: "A", observations: afterIncorrect })).toBe("A");
    expect(chooseNextItemBand({ seedBand: "A", observations: observe("incorrect", "incorrect") })).toBe("A");
  });

  test("at the top band a correct first item cannot probe above it", () => {
    expect(chooseNextItemBand({ seedBand: "F", observations: observe("correct") })).toBe("F");
  });
});

describe("isPlacementComplete", () => {
  test.each([
    [0, false],
    [3, false],
    [4, true],
  ])("%i observations -> %s", (count, expected) => {
    expect(isPlacementComplete(observe(...Array(count).fill("correct")))).toBe(expected);
  });
});

describe("decidePlacementBand", () => {
  test.each([
    ["all four correct", ["correct", "correct", "correct", "correct"], "D"],
    ["both seed items wrong and both lower items right", ["incorrect", "correct", "correct", "incorrect"], "B"],
    ["seed items right but one probe wrong", ["correct", "correct", "incorrect", "correct"], "C"],
    ["seed items right and both probes wrong", ["correct", "incorrect", "incorrect", "correct"], "C"],
    ["one seed item wrong, one right", ["correct", "correct", "correct", "incorrect"], "C"],
    ["all four wrong", ["incorrect", "incorrect", "incorrect", "incorrect"], "C"],
    ["seed items wrong and one lower item wrong", ["incorrect", "correct", "incorrect", "incorrect"], "C"],
  ])("%s", (_description, outcomes, expectedBand) => {
    expect(decidePlacementBand({ seedBand: "C", observations: observe(...outcomes) })).toBe(expectedBand);
  });

  test.each(["skipped", "dropped"])("a %s observation anywhere keeps the seed, even if the rest would move it", (missing) => {
    for (let position = 0; position < 4; position += 1) {
      const outcomes = ["correct", "correct", "correct", "correct"];
      outcomes[position] = missing;

      expect(decidePlacementBand({ seedBand: "C", observations: observe(...outcomes) })).toBe("C");
    }
  });

  test("fewer than four observations keeps the seed", () => {
    expect(decidePlacementBand({ seedBand: "C", observations: observe("correct", "correct", "correct") })).toBe("C");
  });

  test("never goes below band A", () => {
    expect(decidePlacementBand({ seedBand: "A", observations: observe("incorrect", "correct", "correct", "incorrect") })).toBe("A");
  });

  test("never goes above the top band", () => {
    expect(decidePlacementBand({ seedBand: "F", observations: observe("correct", "correct", "correct", "correct") })).toBe("F");
  });

  test("moves exactly one band from any seed, never two", () => {
    for (const [seedBand, expectedBand] of [["A", "B"], ["B", "C"], ["C", "D"], ["D", "E"], ["E", "F"]]) {
      expect(decidePlacementBand({ seedBand, observations: observe("correct", "correct", "correct", "correct") })).toBe(expectedBand);
    }
  });
});

describe("decidePlacementBand with pronoun-dependent items (spec 25.8)", () => {
  const WRONG_SEED_RIGHT_PROBES = ["incorrect", "correct", "correct", "incorrect"];
  const dependent = "pronoun-dependent";

  test("a wrong pronoun-dependent seed item makes a downward move unavailable, whichever seed position it holds", () => {
    expect(decidePlacementBand({ seedBand: "E", observations: withFeatureTags(observe(...WRONG_SEED_RIGHT_PROBES), dependent, "none", "none", "none") })).toBe("E");
    expect(decidePlacementBand({ seedBand: "E", observations: withFeatureTags(observe(...WRONG_SEED_RIGHT_PROBES), "none", "none", "none", dependent) })).toBe("E");
  });

  test("two wrong seed items that are not pronoun-dependent still move down, whatever the tags say elsewhere", () => {
    const tags = ["none", "pronoun-present", "pronoun-present", "none"];

    expect(decidePlacementBand({ seedBand: "E", observations: withFeatureTags(observe(...WRONG_SEED_RIGHT_PROBES), ...tags) })).toBe("D");
  });

  test("pronoun-dependent probe items do not block a downward move when they are answered correctly", () => {
    const observations = withFeatureTags(observe(...WRONG_SEED_RIGHT_PROBES), "none", dependent, dependent, "none");

    expect(decidePlacementBand({ seedBand: "E", observations })).toBe("D");
  });

  test("correct pronoun-dependent items count like any other when moving up", () => {
    const observations = withFeatureTags(observe("correct", "correct", "correct", "correct"), dependent, dependent, "none", "none");

    expect(decidePlacementBand({ seedBand: "D", observations })).toBe("E");
  });

  test("a wrong pronoun-dependent probe item only blocks movement", () => {
    const observations = withFeatureTags(observe("correct", "incorrect", "correct", "correct"), "none", dependent, "none", "none");

    expect(decidePlacementBand({ seedBand: "D", observations })).toBe("D");
  });

  test("observations without a tag, as at bands A to C, keep the existing downward rule", () => {
    expect(decidePlacementBand({ seedBand: "C", observations: observe(...WRONG_SEED_RIGHT_PROBES) })).toBe("B");
  });
});

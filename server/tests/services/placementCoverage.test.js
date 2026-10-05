import { getAvailableStartingSignals } from "../../src/services/placementCoverage.js";
import { FEATURE_TAGS } from "../../src/data/mapperTemplates.js";
import { buildTemplatesAtBand } from "../support/mapperTemplateFixture.js";

const SIGNAL_A = "short-pointed-texts";
const SIGNAL_C = "several-sentence-pointed-passages";
const SIGNAL_E = "longer-texts-reduced-nikud";

const dependent = { featureTag: FEATURE_TAGS.PRONOUN_DEPENDENT, pronounForms: "free-and-attached" };

const catalogOf = (countsByBand) =>
  Object.entries(countsByBand).flatMap(([band, count]) => buildTemplatesAtBand(band, count));

describe("getAvailableStartingSignals", () => {
  test("offers every signal when A to F are covered, two templates at each seed band and one elsewhere", () => {
    expect(getAvailableStartingSignals(catalogOf({ A: 2, B: 1, C: 2, D: 1, E: 2, F: 1 }))).toEqual([SIGNAL_A, SIGNAL_C, SIGNAL_E]);
  });

  test("offers nothing from an empty catalog", () => {
    expect(getAvailableStartingSignals([])).toEqual([]);
  });

  test("a pilot catalog of A to D offers A and C and hides E (spec 24.2, decision 3)", () => {
    expect(getAvailableStartingSignals(catalogOf({ A: 2, B: 1, C: 2, D: 1 }))).toEqual([SIGNAL_A, SIGNAL_C]);
  });

  test("seed A needs two at A and one at B", () => {
    expect(getAvailableStartingSignals(catalogOf({ A: 1, B: 1 }))).toEqual([]);
    expect(getAvailableStartingSignals(catalogOf({ A: 2 }))).toEqual([]);
    expect(getAvailableStartingSignals(catalogOf({ A: 2, B: 1 }))).toEqual([SIGNAL_A]);
  });

  test("seed C needs two at C and one each at B and D", () => {
    expect(getAvailableStartingSignals(catalogOf({ B: 1, C: 1, D: 1 }))).toEqual([]);
    expect(getAvailableStartingSignals(catalogOf({ B: 1, C: 2 }))).toEqual([]);
    expect(getAvailableStartingSignals(catalogOf({ B: 1, C: 2, D: 1 }))).toEqual([SIGNAL_C]);
  });

  test("seed E needs two at E and one each at D and F", () => {
    expect(getAvailableStartingSignals(catalogOf({ D: 1, E: 2 }))).toEqual([]);
    expect(getAvailableStartingSignals(catalogOf({ D: 1, E: 2, F: 1 }))).toEqual([SIGNAL_E]);
  });

  describe("pronoun-dependent templates at D to F", () => {
    test("a band whose templates are all pronoun-dependent cannot serve a placement", () => {
      const full = [...buildTemplatesAtBand("A", 2), ...buildTemplatesAtBand("B", 1), ...buildTemplatesAtBand("C", 2)];
      const onlyDependentAtD = buildTemplatesAtBand("D", 1, dependent);

      expect(getAvailableStartingSignals([...full, ...onlyDependentAtD])).toEqual([SIGNAL_A]);
    });

    test("one non-dependent template at D is enough, however many dependent ones exist", () => {
      const full = [...buildTemplatesAtBand("A", 2), ...buildTemplatesAtBand("B", 1), ...buildTemplatesAtBand("C", 2)];
      const mixedAtD = [
        ...buildTemplatesAtBand("D", 1),
        ...buildTemplatesAtBand("D", 3, dependent).map((template) => ({ ...template, id: `dependent-${template.id}` })),
      ];

      expect(getAvailableStartingSignals([...full, ...mixedAtD])).toEqual([SIGNAL_A, SIGNAL_C]);
    });

    test("signal E is hidden when F has only pronoun-dependent templates", () => {
      const catalog = [...buildTemplatesAtBand("D", 1), ...buildTemplatesAtBand("E", 2), ...buildTemplatesAtBand("F", 1, dependent)];

      expect(getAvailableStartingSignals(catalog)).toEqual([]);
    });
  });
});

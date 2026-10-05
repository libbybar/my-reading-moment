import { MAPPER_TEMPLATES } from "../../src/data/mapperTemplates.js";
import { findMapperTemplateProblems } from "../../src/services/mapperTemplateValidation.js";
import { getAvailableStartingSignals } from "../../src/services/placementCoverage.js";

describe("the shipped mapper template catalog", () => {
  test("passes every integrity rule", () => {
    expect(findMapperTemplateProblems(MAPPER_TEMPLATES)).toEqual([]);
  });

  test("lets a parent choose all three starting signals, so none can end in an unavailable placement", () => {
    expect(getAvailableStartingSignals()).toEqual([
      "short-pointed-texts",
      "several-sentence-pointed-passages",
      "longer-texts-reduced-nikud",
    ]);
  });
});

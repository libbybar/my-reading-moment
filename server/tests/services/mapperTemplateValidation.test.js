import { findMapperTemplateProblems } from "../../src/services/mapperTemplateValidation.js";
import { READABILITY_BANDS } from "../../src/data/readabilityBands.js";
import { buildMapperTemplate } from "../support/mapperTemplateFixture.js";

const problemsOf = (template) => findMapperTemplateProblems([template]);

describe("findMapperTemplateProblems", () => {
  test.each(READABILITY_BANDS)("accepts a complete template at band %s", (band) => {
    expect(problemsOf(buildMapperTemplate({ band }))).toEqual([]);
  });

  test.each([
    ["a blank id", { id: " " }, /id is required/],
    ["a missing structure", { structure: undefined }, /structure is required/],
    ["a blank story shape", { storyShape: "" }, /storyShape is required/],
    ["an unknown band", { band: "G" }, /band must be one of/],
    ["a question kind other than explicit-detail", { questionKind: "simple-inference" }, /questionKind must be explicit-detail/],
  ])("rejects %s", (_description, overrides, expectedProblem) => {
    expect(problemsOf(buildMapperTemplate(overrides)).join("\n")).toMatch(expectedProblem);
  });

  test.each(["sentenceCount", "wordsPerSentence", "nikud"])("rejects %s, which belongs to the band", (field) => {
    expect(problemsOf(buildMapperTemplate({ [field]: 4 }))).toEqual([expect.stringMatching(`${field} belongs to the band`)]);
  });

  test.each([
    ["a string", "על"],
    ["an empty array, which would constrain nothing", []],
    ["an array with a blank entry", ["כי", " "]],
  ])("rejects a word list that is %s", (_description, wordList) => {
    expect(problemsOf(buildMapperTemplate({ allowedRelations: wordList }))).toEqual([expect.stringMatching(/allowedRelations/)]);
    expect(problemsOf(buildMapperTemplate({ allowedConnectors: wordList }))).toEqual([expect.stringMatching(/allowedConnectors/)]);
  });

  describe("feature tags (spec 25.8)", () => {
    test.each(["A", "B", "C"])("rejects a tag at band %s", (band) => {
      expect(problemsOf(buildMapperTemplate({ band, featureTag: "none" }))).toEqual([expect.stringMatching(/only used at bands D to F/)]);
    });

    test.each(["D", "E", "F"])("requires a known tag at band %s", (band) => {
      const withoutTag = buildMapperTemplate({ band });
      delete withoutTag.featureTag;

      expect(problemsOf(withoutTag)).toEqual([expect.stringMatching(/featureTag is required/)]);
      expect(problemsOf(buildMapperTemplate({ band, featureTag: "pronoun-reference" }))).toEqual([
        expect.stringMatching(/featureTag is required/),
      ]);
    });

    test("a pronoun template needs to say which pronoun forms it uses", () => {
      expect(problemsOf(buildMapperTemplate({ band: "E", featureTag: "pronoun-dependent" }))).toEqual([
        expect.stringMatching(/needs pronounForms/),
      ]);
    });

    test("band D allows free pronouns only, E and F may add attached forms", () => {
      const attachedAt = (band) => buildMapperTemplate({ band, featureTag: "pronoun-present", pronounForms: "free-and-attached" });

      expect(problemsOf(attachedAt("D"))).toEqual([expect.stringMatching(/band D allows free pronouns only/)]);
      expect(problemsOf(attachedAt("E"))).toEqual([]);
      expect(problemsOf(attachedAt("F"))).toEqual([]);
    });

    test("a template without pronouns declares no pronoun forms", () => {
      expect(problemsOf(buildMapperTemplate({ band: "F", featureTag: "none", pronounForms: "free" }))).toEqual([
        expect.stringMatching(/pronounForms is only for/),
      ]);
    });
  });

  test("rejects duplicate ids and names the template in each problem", () => {
    const problems = findMapperTemplateProblems([buildMapperTemplate({ id: "same" }), buildMapperTemplate({ id: "same", questionKind: "x" })]);

    expect(problems).toContain("duplicate template id same");
    expect(problems.some((problem) => problem.startsWith("same: questionKind"))).toBe(true);
  });

  test("rejects one structure used by two templates, even in different bands", () => {
    const problems = findMapperTemplateProblems([
      buildMapperTemplate({ id: "c1", band: "C", structure: "connected-detail" }),
      buildMapperTemplate({ id: "f1", band: "F", structure: "connected-detail" }),
    ]);

    expect(problems).toEqual(["duplicate structure connected-detail"]);
  });

  test("reports every problem of a draft at once", () => {
    expect(problemsOf(buildMapperTemplate({ id: "bad", band: "G", storyShape: "", nikud: "full" })).length).toBeGreaterThanOrEqual(3);
  });
});

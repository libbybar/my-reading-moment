import { validateMapperItem, validateMapperBank } from "../../src/services/mapperItemValidation.js";
import MAPPER_ITEM_BANK from "../../src/data/mapperItemBank.js";
import { buildMapperItem, buildMapperBank } from "../support/mapperBankFixture.js";

describe("validateMapperItem", () => {
  test("accepts an item that meets every code-checkable rule, at every band", () => {
    for (const band of ["A", "B", "C", "D", "E", "F"]) {
      expect(validateMapperItem(buildMapperItem({ itemId: `item-${band}`, band }))).toEqual([]);
    }
  });

  test.each([
    ["three sentences", (item) => ({ ...item, sentences: item.sentences.slice(0, 3) }), /exactly 4/],
    ["five sentences", (item) => ({ ...item, sentences: [...item.sentences, "extra words here now again"] }), /exactly 4/],
    ["a blank sentence", (item) => ({ ...item, sentences: ["", ...item.sentences.slice(1)] }), /exactly 4/],
    ["a sentence over the band's word range", (item) => ({ ...item, sentences: [`${item.sentences[0]} w w w w w w`, ...item.sentences.slice(1)] }), /sentence 0 has/],
    ["a sentence under the band's word range", (item) => ({ ...item, sentences: [item.sentences[0], "short one", ...item.sentences.slice(2)] }), /sentence 1 has 2 words/],
    ["an answer in no sentence", (item) => ({ ...item, answerText: "missing" }), /answerText must appear/],
    [
      "an answer that also appears in the framing sentence",
      (item) => ({ ...item, sentences: [item.sentences[0].replace(/^\S+/, item.answerText), ...item.sentences.slice(1)] }),
      /answerText must appear/,
    ],
    ["the correct sentence also being the framing sentence", (item) => ({ ...item, framingSentenceIndex: item.correctSentenceIndex }), /framing sentence cannot be the correct/],
    ["a correct index outside the text", (item) => ({ ...item, correctSentenceIndex: 4 }), /sentence positions/],
    ["a non-integer index", (item) => ({ ...item, framingSentenceIndex: 0.5 }), /sentence positions/],
    ["an unknown band", (item) => ({ ...item, band: "Z" }), /band must be/],
    ["a blank prompt", (item) => ({ ...item, prompt: " " }), /prompt is required/],
    ["a blank item id", (item) => ({ ...item, itemId: "" }), /itemId is required/],
  ])("rejects %s", (_description, breakItem, expectedProblem) => {
    const problems = validateMapperItem(breakItem(buildMapperItem({ itemId: "item", band: "C" })));

    expect(problems.some((problem) => expectedProblem.test(problem))).toBe(true);
  });

  test("reports every problem of a draft at once", () => {
    const problems = validateMapperItem({ ...buildMapperItem({ itemId: "item", band: "C" }), prompt: "", answerText: "missing" });

    expect(problems).toHaveLength(2);
  });
});

describe("validateMapperBank", () => {
  test("accepts a complete bank", () => {
    expect(validateMapperBank(buildMapperBank())).toEqual([]);
  });

  test("names the item with each problem", () => {
    const bank = buildMapperBank({ bands: ["A"] });
    bank.items[0] = { ...bank.items[0], answerText: "missing" };

    expect(validateMapperBank(bank)).toEqual([expect.stringMatching(/^A1: answerText must appear/)]);
  });

  test("rejects duplicate item ids", () => {
    const bank = buildMapperBank({ bands: ["A"] });
    bank.items[1] = { ...bank.items[1], itemId: bank.items[0].itemId };

    expect(validateMapperBank(bank)).toContain("duplicate itemId A1");
  });

  test("rejects items without a practice item", () => {
    const bank = { ...buildMapperBank({ bands: ["A"] }), practiceItem: null };

    expect(validateMapperBank(bank)).toContain("a bank with items needs an unscored practiceItem");
  });

  test("the shipped bank passes every code-checkable rule", () => {
    expect(validateMapperBank(MAPPER_ITEM_BANK)).toEqual([]);
  });
});

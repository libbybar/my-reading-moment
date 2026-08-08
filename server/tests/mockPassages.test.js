import mockPassages from "../src/data/mockPassages.js";

function expectNonBlankString(receivedString) {
  expect(typeof receivedString).toBe("string");
  expect(receivedString.trim().length).toBeGreaterThan(0);
}

describe("mockPassages", () => {
  test("contains at least one passage", () => {
    expect(mockPassages.length).toBeGreaterThan(0);
  });

  test("each passage has the expected non-blank structure", () => {
    mockPassages.forEach((passage) => {
      expectNonBlankString(passage.id);
      expectNonBlankString(passage.title);
      expectNonBlankString(passage.text);
      expectNonBlankString(passage.readingLevel);
      expectNonBlankString(passage.readingGame?.instruction);
      expect(Array.isArray(passage.questions)).toBe(true);
      expect(passage.questions.length).toBeGreaterThan(0);
    });
  });

  test("uses unique passage and question ids", () => {
    const passageIds = mockPassages.map((passage) => passage.id);
    const questionIds = mockPassages.flatMap((passage) =>
      passage.questions.map((question) => question.id),
    );

    expect(new Set(passageIds).size).toBe(passageIds.length);
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  test("each question has the expected non-blank structure and belongs to its passage", () => {
    mockPassages.forEach((passage) => {
      passage.questions.forEach((question) => {
        expectNonBlankString(question.id);
        expect(question.passageId).toBe(passage.id);
        expectNonBlankString(question.prompt);
        expectNonBlankString(question.expectedMeaning);
      });
    });
  });
});

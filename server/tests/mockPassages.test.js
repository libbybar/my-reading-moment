import mockPassages from "../src/data/mockPassages.js";

describe("mockPassages", () => {
  test("contains at least one passage", () => {
    expect(mockPassages.length).toBeGreaterThan(0);
  });

  test("each passage has the expected structure", () => {
    mockPassages.forEach((passage) => {
      expect(passage).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          text: expect.any(String),
          readingLevel: expect.any(String),
          readingGame: expect.objectContaining({
            instruction: expect.any(String),
          }),
          questions: expect.any(Array),
        }),
      );

      expect(passage.questions.length).toBeGreaterThan(0);
    });
  });

  test("each question has the expected structure and belongs to its passage", () => {
    mockPassages.forEach((passage) => {
      passage.questions.forEach((question) => {
        expect(question).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            passageId: passage.id,
            prompt: expect.any(String),
            expectedMeaning: expect.any(String),
          }),
        );
      });
    });
  });
});

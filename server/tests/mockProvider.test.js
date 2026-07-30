const mockProvider = require("../src/services/llmProvider/mockProvider");
const mockPassages = require("../src/data/mockPassages");
const { runLlmProviderContractTests } = require("./support/llmProviderContract");

const [seedPassage] = mockPassages;
const passageFixture = {
  id: seedPassage.id,
  title: seedPassage.title,
  text: seedPassage.text,
  readingLevel: seedPassage.readingLevel,
};

describe("mockProvider", () => {
  runLlmProviderContractTests(mockProvider, {
    passage: passageFixture,
    readingLevel: passageFixture.readingLevel,
  });

  describe("mock-specific behavior", () => {
    const passage = { id: "mock-passage-1" };
    const question = {
      id: "mock-question-1",
      passageId: "mock-passage-1",
      prompt: "מה נפל מתוך הספר?",
      expectedMeaning: "עלה ירוק נפל מתוך הספר.",
    };

    test("evaluates an exact-match answer as correct", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question: { ...question, expectedMeaning: "עלה ירוק" },
        answerText: "עלה ירוק",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: true,
        feedbackType: "correct",
      });
    });

    test("evaluates an answer that is a meaningful substring of the expected meaning as correct", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question,
        answerText: "עלה ירוק",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: true,
        feedbackType: "correct",
      });
    });

    test("evaluates a clearly wrong answer as retry", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question: { ...question, expectedMeaning: "רובוט קטן בשם רובו" },
        answerText: "מכונית",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: false,
        feedbackType: "retry",
      });
    });

    test("evaluates a blank answer as retry", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question,
        answerText: "   ",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: false,
        feedbackType: "retry",
      });
    });

    test("evaluates a whitespace-only answer (tabs and newlines) as retry", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question,
        answerText: "\t\n  ",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: false,
        feedbackType: "retry",
      });
    });

    test("normalizes punctuation and extra internal spacing before comparing", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question: { ...question, expectedMeaning: "עלה ירוק" },
        answerText: "  עלה,   ירוק!  ",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: true,
        feedbackType: "correct",
      });
    });

    test("does not treat an answer below the minimum meaningful length as a match", async () => {
      const result = await mockProvider.evaluateAnswer({
        passage,
        question: { ...question, expectedMeaning: "בספרייה" },
        answerText: "ב",
      });

      expect(result).toEqual({
        questionId: "mock-question-1",
        isCorrect: false,
        feedbackType: "retry",
      });
    });

    test("selects candidate questions from the seeded mock dataset, without repeats, until exhausted", async () => {
      const seededIds = seedPassage.questions.map((seededQuestion) => seededQuestion.id);

      const first = await mockProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [],
      });

      expect(first.status).toBe("ok");
      expect(seededIds).toContain(first.question.id);

      const second = await mockProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [first.question.id],
      });

      expect(second.status).toBe("ok");
      expect(seededIds).toContain(second.question.id);
      expect(second.question.id).not.toBe(first.question.id);

      const third = await mockProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [first.question.id, second.question.id],
      });

      expect(third.status).toBe("ok");
      expect(seededIds).toContain(third.question.id);
      expect(third.question.id).not.toBe(first.question.id);
      expect(third.question.id).not.toBe(second.question.id);

      const fourth = await mockProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [first.question.id, second.question.id, third.question.id],
      });

      expect(fourth).toEqual({ status: "exhausted" });
    });

    test("resolves an exhausted result for a passage id with no seeded questions", async () => {
      const result = await mockProvider.generateQuestion({
        passage: { ...passageFixture, id: "unknown-passage" },
        askedQuestionIds: [],
      });

      expect(result).toEqual({ status: "exhausted" });
    });

    test("selects the seeded passage matching the requested reading level", async () => {
      const [firstSeedPassage, secondSeedPassage] = mockPassages;

      const beginnerResult = await mockProvider.generatePassage({
        readingLevel: firstSeedPassage.readingLevel,
        interests: [],
      });

      expect(beginnerResult.id).toBe(firstSeedPassage.id);

      const intermediateResult = await mockProvider.generatePassage({
        readingLevel: secondSeedPassage.readingLevel,
        interests: [],
      });

      expect(intermediateResult.id).toBe(secondSeedPassage.id);
    });

    test("ignores interests when selecting a passage", async () => {
      const withoutInterests = await mockProvider.generatePassage({
        readingLevel: seedPassage.readingLevel,
        interests: [],
      });

      const withInterests = await mockProvider.generatePassage({
        readingLevel: seedPassage.readingLevel,
        interests: ["חלל", "רובוטים"],
      });

      expect(withInterests.id).toBe(withoutInterests.id);
    });

    test("rejects when no seeded passage matches the requested reading level", async () => {
      await expect(
        mockProvider.generatePassage({ readingLevel: "advanced", interests: [] }),
      ).rejects.toThrow();
    });
  });
});

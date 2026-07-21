const llmProvider = require("../src/services/llmProvider");
const mockPassages = require("../src/data/mockPassages");
const { runLlmProviderContractTests } = require("./support/llmProviderContract");

const [seedPassage] = mockPassages;
const passageFixture = {
  id: seedPassage.id,
  title: seedPassage.title,
  text: seedPassage.text,
  readingLevel: seedPassage.readingLevel,
};

describe("llmProvider (mock)", () => {
  runLlmProviderContractTests(llmProvider, { passage: passageFixture });

  describe("mock-specific behavior", () => {
    const passage = { id: "mock-passage-1" };
    const question = {
      id: "mock-question-1",
      passageId: "mock-passage-1",
      prompt: "מה נפל מתוך הספר?",
      expectedMeaning: "עלה ירוק נפל מתוך הספר.",
    };

    test("evaluates a non-empty answer as correct", async () => {
      const result = await llmProvider.evaluateAnswer({
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

    test("evaluates a blank answer as retry", async () => {
      const result = await llmProvider.evaluateAnswer({
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

    test("selects candidate questions from the seeded mock dataset, without repeats, until exhausted", async () => {
      const seededIds = seedPassage.questions.map((seededQuestion) => seededQuestion.id);

      const first = await llmProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [],
      });

      expect(first.status).toBe("ok");
      expect(seededIds).toContain(first.question.id);

      const second = await llmProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [first.question.id],
      });

      expect(second.status).toBe("ok");
      expect(seededIds).toContain(second.question.id);
      expect(second.question.id).not.toBe(first.question.id);

      const third = await llmProvider.generateQuestion({
        passage: passageFixture,
        askedQuestionIds: [first.question.id, second.question.id],
      });

      expect(third).toEqual({ status: "exhausted" });
    });

    test("resolves an exhausted result for a passage id with no seeded questions", async () => {
      const result = await llmProvider.generateQuestion({
        passage: { ...passageFixture, id: "unknown-passage" },
        askedQuestionIds: [],
      });

      expect(result).toEqual({ status: "exhausted" });
    });
  });
});

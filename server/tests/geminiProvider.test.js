import { jest } from "@jest/globals";
import { runLlmProviderContractTests } from "./support/llmProviderContract.js";

const geminiClient = {
  generateJson: jest.fn(),
  PASSAGE_RESPONSE_SCHEMA: {},
  QUESTION_RESPONSE_SCHEMA: {},
  EVALUATION_RESPONSE_SCHEMA: {},
};

jest.unstable_mockModule("../src/services/llmProvider/geminiClient.js", () => geminiClient);

const { default: geminiProvider } = await import("../src/services/llmProvider/geminiProvider.js");

// One fixture covers the shared provider contract suite across all Gemini methods.
const GENERIC_CONTENT = {
  title: "כותרת לדוגמה",
  text: "קטע לדוגמה לצורך בדיקה.",
  prompt: "שאלה לדוגמה?",
  expectedMeaning: "משמעות לדוגמה",
  isCorrect: true,
};

describe("geminiProvider", () => {
  beforeEach(() => {
    geminiClient.generateJson.mockReset();
    geminiClient.generateJson.mockResolvedValue(GENERIC_CONTENT);
  });

  runLlmProviderContractTests(geminiProvider, {
    passage: {
      id: "gemini-contract-passage",
      title: "כותרת קטע",
      text: "טקסט קטע לבדיקה.",
      readingLevel: "beginner",
    },
    readingLevel: "beginner",
  });

  describe("gemini-specific behavior", () => {
    test("generatePassage assigns a fresh id and the requested readingLevel, using Gemini's title/text", async () => {
      const result = await geminiProvider.generatePassage({
        readingLevel: "beginner",
        interests: [],
      });

      expect(result).toEqual({
        id: expect.any(String),
        title: GENERIC_CONTENT.title,
        text: GENERIC_CONTENT.text,
        readingLevel: "beginner",
      });
    });

    test("generatePassage rejects when Gemini returns a blank title", async () => {
      geminiClient.generateJson.mockResolvedValue({ ...GENERIC_CONTENT, title: "   " });

      await expect(
        geminiProvider.generatePassage({ readingLevel: "beginner", interests: [] }),
      ).rejects.toThrow();
    });

    test("generatePassage rejects when Gemini returns a blank text", async () => {
      geminiClient.generateJson.mockResolvedValue({ ...GENERIC_CONTENT, text: "" });

      await expect(
        geminiProvider.generatePassage({ readingLevel: "beginner", interests: [] }),
      ).rejects.toThrow();
    });

    test("generateQuestion assigns a fresh id and the passage's id, using Gemini's prompt/expectedMeaning", async () => {
      const passage = { id: "passage-1", text: "טקסט", readingLevel: "beginner" };

      const result = await geminiProvider.generateQuestion({ passage, askedQuestionIds: [] });

      expect(result).toEqual({
        status: "ok",
        question: {
          id: expect.any(String),
          passageId: "passage-1",
          prompt: GENERIC_CONTENT.prompt,
          expectedMeaning: GENERIC_CONTENT.expectedMeaning,
        },
      });
    });

    test("generateQuestion rejects when Gemini returns a blank expectedMeaning", async () => {
      const passage = { id: "passage-1", text: "טקסט", readingLevel: "beginner" };
      geminiClient.generateJson.mockResolvedValue({ ...GENERIC_CONTENT, expectedMeaning: "" });

      await expect(
        geminiProvider.generateQuestion({ passage, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("generateQuestion never reports an exhausted status, regardless of askedQuestionIds", async () => {
      const passage = { id: "passage-1", text: "טקסט", readingLevel: "beginner" };

      const result = await geminiProvider.generateQuestion({
        passage,
        askedQuestionIds: ["q1", "q2", "q3"],
      });

      expect(result.status).toBe("ok");
    });

    test("passes the passage text to the question prompt", async () => {
      const passage = { id: "passage-1", text: "טקסט ייחודי לבדיקה", readingLevel: "beginner" };

      await geminiProvider.generateQuestion({ passage, askedQuestionIds: [] });

      const [{ prompt }] = geminiClient.generateJson.mock.calls[0];
      expect(prompt).toContain(passage.text);
    });

    test("evaluateAnswer reflects Gemini's isCorrect verdict", async () => {
      const passage = { id: "passage-1" };
      const question = { id: "q1", passageId: "passage-1", prompt: "p?", expectedMeaning: "m" };
      geminiClient.generateJson.mockResolvedValue({ isCorrect: false });

      const result = await geminiProvider.evaluateAnswer({
        passage,
        question,
        answerText: "טעות",
      });

      expect(result).toEqual({ questionId: "q1", isCorrect: false, feedbackType: "retry" });
    });

    test("evaluateAnswer rejects when Gemini omits isCorrect", async () => {
      const passage = { id: "passage-1" };
      const question = { id: "q1", passageId: "passage-1", prompt: "p?", expectedMeaning: "m" };
      geminiClient.generateJson.mockResolvedValue({});

      await expect(
        geminiProvider.evaluateAnswer({ passage, question, answerText: "טעות" }),
      ).rejects.toThrow();
    });
  });
});

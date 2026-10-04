import mockProvider from "../../src/services/llmProvider/mockProvider.js";
import mockPassages from "../../src/data/mockPassages.js";
import mockLearningItemsByMissionId from "../../src/data/mockLearningItems.js";
import {
  runLlmProviderContractTests,
  runLearningItemContractTests,
} from "../support/llmProviderContract.js";

const [seedPassage] = mockPassages;
const passageFixture = {
  id: seedPassage.id,
  title: seedPassage.title,
  text: seedPassage.text,
  level: seedPassage.level,
  sublevel: seedPassage.sublevel,
};

async function drainPassage(args) {
  let title;
  const chunks = [];
  let passage;

  for await (const event of mockProvider.generatePassageStream(args)) {
    if (event.type === "title") {
      title = event.title;
    } else if (event.type === "chunk") {
      chunks.push(event.text);
    } else if (event.type === "done") {
      passage = event.passage;
    }
  }

  return { title, chunks, text: chunks.join(""), passage };
}

describe("mockProvider", () => {
  runLlmProviderContractTests(mockProvider, {
    passage: passageFixture,
    level: passageFixture.level,
    sublevel: passageFixture.sublevel,
  });

  runLearningItemContractTests(mockProvider, { missionId: "explicit-detail" });

  describe("mock learning items", () => {
    const mockMissionIds = Object.keys(mockLearningItemsByMissionId);
    const readabilityBand = { level: 1, sublevel: 1 };

    test.each(mockMissionIds)("serves every fixture of %s in turn, then reports it exhausted", async (missionId) => {
      const recentItems = [];

      for (let served = 0; served < mockLearningItemsByMissionId[missionId].length; served += 1) {
        const item = await mockProvider.generateLearningItem({ missionId, readabilityBand, recentItems });

        recentItems.push({
          variationSignature: item.variationSignature,
          contentFingerprint: item.contentFingerprint,
        });
      }

      expect(new Set(recentItems.map((recent) => recent.contentFingerprint)).size).toBe(recentItems.length);
      await expect(
        mockProvider.generateLearningItem({ missionId, readabilityBand, recentItems }),
      ).rejects.toThrow();
    });
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

    test("synthesizes exactly one deterministic question for a passage with no seeded questions", async () => {
      const passage = { ...passageFixture, id: "unknown-passage" };

      const first = await mockProvider.generateQuestion({ passage, askedQuestionIds: [] });
      expect(first).toEqual({
        status: "ok",
        question: {
          id: "unknown-passage-q1",
          passageId: "unknown-passage",
          prompt: expect.any(String),
          expectedMeaning: expect.any(String),
        },
      });

      const second = await mockProvider.generateQuestion({
        passage,
        askedQuestionIds: [first.question.id],
      });
      expect(second).toEqual({ status: "exhausted" });
    });

    test("selects the seeded passage matching the requested level/sublevel", async () => {
      const [firstSeedPassage, secondSeedPassage] = mockPassages;

      const { passage: firstResult } = await drainPassage({
        level: firstSeedPassage.level,
        sublevel: firstSeedPassage.sublevel,
        interests: [],
      });

      expect(firstResult.id).toBe(firstSeedPassage.id);

      const { passage: secondResult } = await drainPassage({
        level: secondSeedPassage.level,
        sublevel: secondSeedPassage.sublevel,
        interests: [],
      });

      expect(secondResult.id).toBe(secondSeedPassage.id);
    });

    test("ignores interests when selecting a passage", async () => {
      const { passage: withoutInterests } = await drainPassage({
        level: seedPassage.level,
        sublevel: seedPassage.sublevel,
        interests: [],
      });

      const { passage: withInterests } = await drainPassage({
        level: seedPassage.level,
        sublevel: seedPassage.sublevel,
        interests: ["חלל", "רובוטים"],
      });

      expect(withInterests.id).toBe(withoutInterests.id);
    });

    test("synthesizes a deterministic passage for a level/sublevel with no seed data, sized to that rung's spec", async () => {
      const { passage: result } = await drainPassage({ level: 4, sublevel: 4, interests: [] });

      expect(result).toMatchObject({ level: 4, sublevel: 4 });
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
      expect(typeof result.title).toBe("string");
      expect(result.title.length).toBeGreaterThan(0);
      // 4.4's spec calls for 10-14 sentences (see readingLevelSpec.js).
      expect(result.text.split(".").filter((part) => part.trim().length > 0).length).toBeGreaterThanOrEqual(10);
    });

    test("synthesizing the same level/sublevel twice is deterministic (same id)", async () => {
      const { passage: first } = await drainPassage({ level: 3, sublevel: 3, interests: [] });
      const { passage: second } = await drainPassage({ level: 3, sublevel: 3, interests: [] });

      expect(first.id).toBe(second.id);
    });

    test("streams the title event before any chunk events, and chunks join back into the exact seeded text", async () => {
      const events = [];

      for await (const event of mockProvider.generatePassageStream({
        level: seedPassage.level,
        sublevel: seedPassage.sublevel,
        interests: [],
      })) {
        events.push(event);
      }

      expect(events[0]).toEqual({ type: "title", title: seedPassage.title });
      expect(events[events.length - 1]).toEqual({
        type: "done",
        passage: expect.objectContaining({ id: seedPassage.id, title: seedPassage.title }),
      });

      const chunkEvents = events.slice(1, -1);
      expect(chunkEvents.length).toBeGreaterThan(1); // more than one word — genuinely chunked
      expect(chunkEvents.every((event) => event.type === "chunk")).toBe(true);
      expect(chunkEvents.map((event) => event.text).join("")).toBe(seedPassage.text);
    });
  });
});

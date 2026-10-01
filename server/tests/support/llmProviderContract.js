// Drains a generatePassageStream async generator into its abstract parts —
// deliberately generic (title/chunks/passage only), never asserting anything
// about *how* a provider produces that shape (e.g. Gemini's title-first-line
// convention is internal to geminiProvider.js, not part of this contract).
async function drainPassageStream(provider, args) {
  let title;
  const chunks = [];
  let passage;

  for await (const event of provider.generatePassageStream(args)) {
    if (event.type === "title") {
      title = event.title;
    } else if (event.type === "chunk") {
      chunks.push(event.text);
    } else if (event.type === "done") {
      passage = event.passage;
    }
  }

  return { title, text: chunks.join(""), passage };
}

function runLlmProviderContractTests(provider, { passage, level, sublevel }) {
  describe("generatePassageStream", () => {
    test("resolves a passage with the required shape for a supported level/sublevel", async () => {
      const { passage: result } = await drainPassageStream(provider, { level, sublevel, interests: [] });

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          text: expect.any(String),
          level,
          sublevel,
        }),
      );
    });

    test("streams a title event and chunk events whose content matches the final passage", async () => {
      const { title, text, passage: result } = await drainPassageStream(provider, {
        level,
        sublevel,
        interests: [],
      });

      expect(title).toBe(result.title);
      expect(text).toBe(result.text);
    });

    test("defaults interests to an empty array when omitted", async () => {
      const { passage: result } = await drainPassageStream(provider, { level, sublevel });

      expect(result.level).toBe(level);
      expect(result.sublevel).toBe(sublevel);
    });

    test("rejects when level is missing", async () => {
      await expect(drainPassageStream(provider, { sublevel, interests: [] })).rejects.toThrow();
    });

    test("rejects when level is not a number", async () => {
      await expect(
        drainPassageStream(provider, { level: "1", sublevel, interests: [] }),
      ).rejects.toThrow();
    });

    test("rejects when level is out of range", async () => {
      await expect(
        drainPassageStream(provider, { level: 5, sublevel, interests: [] }),
      ).rejects.toThrow();
    });

    test("rejects when sublevel is missing", async () => {
      await expect(drainPassageStream(provider, { level, interests: [] })).rejects.toThrow();
    });

    test("rejects when sublevel is out of range", async () => {
      await expect(
        drainPassageStream(provider, { level, sublevel: 5, interests: [] }),
      ).rejects.toThrow();
    });

    test("rejects when interests is not an array", async () => {
      await expect(
        drainPassageStream(provider, { level, sublevel, interests: "not-an-array" }),
      ).rejects.toThrow();
    });
  });

  describe("generateQuestion", () => {
    test("resolves a valid status, with the full question shape when one is available", async () => {
      const result = await provider.generateQuestion({ passage, askedQuestionIds: [] });

      expect(["ok", "exhausted"]).toContain(result.status);

      if (result.status === "ok") {
        expect(result.question).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            passageId: passage.id,
            prompt: expect.any(String),
            expectedMeaning: expect.any(String),
          }),
        );
      }
    });

    test("never returns a question whose id is already in askedQuestionIds", async () => {
      const first = await provider.generateQuestion({ passage, askedQuestionIds: [] });

      if (first.status !== "ok") {
        return;
      }

      const second = await provider.generateQuestion({
        passage,
        askedQuestionIds: [first.question.id],
      });

      if (second.status === "ok") {
        expect(second.question.id).not.toBe(first.question.id);
      }
    });

    test("rejects when passage is missing", async () => {
      await expect(provider.generateQuestion({ askedQuestionIds: [] })).rejects.toThrow();
    });

    test("rejects when passage id is missing", async () => {
      const passageWithoutId = { ...passage };
      delete passageWithoutId.id;

      await expect(
        provider.generateQuestion({ passage: passageWithoutId, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage text is missing", async () => {
      const passageWithoutText = { ...passage };
      delete passageWithoutText.text;

      await expect(
        provider.generateQuestion({ passage: passageWithoutText, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage text is not a string", async () => {
      await expect(
        provider.generateQuestion({ passage: { ...passage, text: 123 }, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage text is blank", async () => {
      await expect(
        provider.generateQuestion({ passage: { ...passage, text: "   " }, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage level is missing", async () => {
      const passageWithoutLevel = { ...passage };
      delete passageWithoutLevel.level;

      await expect(
        provider.generateQuestion({ passage: passageWithoutLevel, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage level is not a number", async () => {
      await expect(
        provider.generateQuestion({
          passage: { ...passage, level: "1" },
          askedQuestionIds: [],
        }),
      ).rejects.toThrow();
    });

    test("rejects when passage sublevel is missing", async () => {
      const passageWithoutSublevel = { ...passage };
      delete passageWithoutSublevel.sublevel;

      await expect(
        provider.generateQuestion({ passage: passageWithoutSublevel, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("defaults askedQuestionIds to an empty array when omitted", async () => {
      const result = await provider.generateQuestion({ passage });

      expect(["ok", "exhausted"]).toContain(result.status);
    });

    test("rejects when askedQuestionIds is not an array", async () => {
      await expect(
        provider.generateQuestion({ passage, askedQuestionIds: "test-question-1" }),
      ).rejects.toThrow();
    });

    test("rejects when askedQuestionIds contains an invalid id", async () => {
      await expect(
        provider.generateQuestion({ passage, askedQuestionIds: [123] }),
      ).rejects.toThrow();
    });
  });

  describe("evaluateAnswer", () => {
    const passage = { id: "contract-passage" };
    const question = {
      id: "test-question-1",
      passageId: "contract-passage",
      prompt: "Question 1?",
      expectedMeaning: "Meaning 1",
    };

    test("resolves a structured result with a consistent feedbackType", async () => {
      const result = await provider.evaluateAnswer({ passage, question, answerText: "some answer" });

      expect(result).toEqual({
        questionId: question.id,
        isCorrect: expect.any(Boolean),
        feedbackType: expect.stringMatching(/^(correct|retry)$/),
      });
      expect(result.feedbackType).toBe(result.isCorrect ? "correct" : "retry");
    });

    test("never includes presentation fields", async () => {
      const result = await provider.evaluateAnswer({ passage, question, answerText: "some answer" });

      expect(result).not.toHaveProperty("feedbackMessage");
      expect(result).not.toHaveProperty("feedbackTone");
    });

    test("rejects when answerText is missing", async () => {
      await expect(provider.evaluateAnswer({ passage, question })).rejects.toThrow();
    });

    test("rejects when question is missing", async () => {
      await expect(
        provider.evaluateAnswer({ passage, answerText: "some answer" }),
      ).rejects.toThrow();
    });

    test("rejects when the question's passageId does not match the passage", async () => {
      const mismatchedQuestion = { ...question, passageId: "other-passage" };

      await expect(
        provider.evaluateAnswer({ passage, question: mismatchedQuestion, answerText: "some answer" }),
      ).rejects.toThrow();
    });

    test("accepts a generated question that is absent from the passage's seeded questions", async () => {
      const generatedQuestion = {
        id: "dynamically-generated",
        passageId: passage.id,
        prompt: "A question the passage never seeded?",
        expectedMeaning: "Some meaning",
      };

      const result = await provider.evaluateAnswer({
        passage,
        question: generatedQuestion,
        answerText: "some answer",
      });

      expect(result.questionId).toBe(generatedQuestion.id);
    });
  });
}

// The provider under test must answer successive calls with different valid items
// of the same mission; each provider's own test file arranges that.
function runLearningItemContractTests(provider, { missionId }) {
  const request = { missionId, readabilityBand: { level: 1, sublevel: 1 }, interest: "space" };

  describe("generateLearningItem", () => {
    test("resolves a validated item with two differently-typed activities and server-assigned ids", async () => {
      const item = await provider.generateLearningItem(request);

      expect(item).toEqual({
        itemId: expect.any(String),
        missionId,
        passage: { title: expect.any(String), text: expect.any(String) },
        activities: [expect.any(Object), expect.any(Object)],
        strategyHint: expect.any(String),
        variationSignature: expect.any(String),
        contentFingerprint: expect.any(String),
      });
      expect(new Set(item.activities.map((activity) => activity.type)).size).toBe(2);
    });

    test("quotes evidence that appears in the passage for every activity", async () => {
      const item = await provider.generateLearningItem(request);

      item.activities.forEach((activity) => {
        const plainQuote = activity.evidenceQuote.replace(/[.,!?]/g, "");
        const plainText = item.passage.text.replace(/[.,!?]/g, "");

        expect(plainText).toContain(plainQuote);
      });
    });

    test("creates a distinct valid item for the same skill when the first is recent", async () => {
      const first = await provider.generateLearningItem(request);
      const second = await provider.generateLearningItem({
        ...request,
        recentItems: [
          { variationSignature: first.variationSignature, contentFingerprint: first.contentFingerprint },
        ],
      });

      expect(second.missionId).toBe(first.missionId);
      expect(second.itemId).not.toBe(first.itemId);
      expect(second.contentFingerprint).not.toBe(first.contentFingerprint);
      expect(second.variationSignature).not.toBe(first.variationSignature);
      expect(second.passage.text).not.toBe(first.passage.text);
    });

    test("works without an interest or recent items", async () => {
      const item = await provider.generateLearningItem({ missionId, readabilityBand: { level: 1, sublevel: 1 } });

      expect(item.missionId).toBe(missionId);
    });

    test.each([
      ["an unknown mission", { ...request, missionId: "not-a-mission" }],
      ["an invalid readability band", { ...request, readabilityBand: { level: 9, sublevel: 1 } }],
      ["an interest outside the allow-list", { ...request, interest: "anything a child typed" }],
      ["malformed recent items", { ...request, recentItems: [{ variationSignature: "x" }] }],
    ])("rejects %s", async (_name, invalidRequest) => {
      await expect(provider.generateLearningItem(invalidRequest)).rejects.toThrow();
    });
  });
}

export { runLlmProviderContractTests, runLearningItemContractTests };

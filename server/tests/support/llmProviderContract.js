function runLlmProviderContractTests(provider, { passage, readingLevel }) {
  describe("generatePassage", () => {
    test("resolves a passage with the required shape for a supported reading level", async () => {
      const result = await provider.generatePassage({ readingLevel, interests: [] });

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          text: expect.any(String),
          readingLevel,
        }),
      );
    });

    test("defaults interests to an empty array when omitted", async () => {
      const result = await provider.generatePassage({ readingLevel });

      expect(result.readingLevel).toBe(readingLevel);
    });

    test("rejects when readingLevel is missing", async () => {
      await expect(provider.generatePassage({ interests: [] })).rejects.toThrow();
    });

    test("rejects when readingLevel is not a string", async () => {
      await expect(
        provider.generatePassage({ readingLevel: 123, interests: [] }),
      ).rejects.toThrow();
    });

    test("rejects when readingLevel is blank", async () => {
      await expect(
        provider.generatePassage({ readingLevel: "   ", interests: [] }),
      ).rejects.toThrow();
    });

    test("rejects when interests is not an array", async () => {
      await expect(
        provider.generatePassage({ readingLevel, interests: "not-an-array" }),
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

    test("rejects when passage readingLevel is missing", async () => {
      const passageWithoutLevel = { ...passage };
      delete passageWithoutLevel.readingLevel;

      await expect(
        provider.generateQuestion({ passage: passageWithoutLevel, askedQuestionIds: [] }),
      ).rejects.toThrow();
    });

    test("rejects when passage readingLevel is not a string", async () => {
      await expect(
        provider.generateQuestion({
          passage: { ...passage, readingLevel: 123 },
          askedQuestionIds: [],
        }),
      ).rejects.toThrow();
    });

    test("rejects when passage readingLevel is blank", async () => {
      await expect(
        provider.generateQuestion({
          passage: { ...passage, readingLevel: "   " },
          askedQuestionIds: [],
        }),
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

export { runLlmProviderContractTests };

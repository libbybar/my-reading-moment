import { MAX_INCORRECT_ATTEMPTS, determineAnswerOutcome } from "../../src/services/textCompletionRules.js";

describe("determineAnswerOutcome", () => {
  test("a correct answer is always terminal with result success, regardless of prior attempts", () => {
    expect(determineAnswerOutcome({ isCorrect: true, incorrectAttemptCount: 0 })).toEqual({
      terminal: true,
      result: "success",
    });
    expect(determineAnswerOutcome({ isCorrect: true, incorrectAttemptCount: 2 })).toEqual({
      terminal: true,
      result: "success",
    });
  });

  test("an incorrect answer below the attempt limit is not terminal", () => {
    for (let count = 1; count < MAX_INCORRECT_ATTEMPTS; count += 1) {
      expect(determineAnswerOutcome({ isCorrect: false, incorrectAttemptCount: count })).toEqual({
        terminal: false,
      });
    }
  });

  test("an incorrect answer that reaches the attempt limit is terminal with result failure", () => {
    expect(
      determineAnswerOutcome({ isCorrect: false, incorrectAttemptCount: MAX_INCORRECT_ATTEMPTS }),
    ).toEqual({ terminal: true, result: "failure" });
  });

  test("an incorrect answer beyond the attempt limit is still terminal failure (never re-triggers)", () => {
    expect(
      determineAnswerOutcome({ isCorrect: false, incorrectAttemptCount: MAX_INCORRECT_ATTEMPTS + 1 }),
    ).toEqual({ terminal: true, result: "failure" });
  });
});

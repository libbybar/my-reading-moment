import { computeProgression } from "../../src/services/progression.js";

function results(...outcomes) {
  return outcomes.map((result) => ({ result }));
}

describe("computeProgression", () => {
  describe("success rule (3 of last 4 non-skipped)", () => {
    test("levels up within the same level when 3 of the last 4 are success", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 2,
        recentRaw: results("success", "success", "success", "failure"),
        recentNonSkipped: results("success", "success", "success", "failure"),
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 3, changed: true, reason: "success_threshold" });
    });

    test("does not change with only 2 of the last 4 successes", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 2,
        recentRaw: results("success", "success", "failure", "failure"),
        recentNonSkipped: results("success", "success", "failure", "failure"),
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 2, changed: false, reason: "no_change" });
    });

    test("does not fire with fewer than 4 non-skipped results, even if all are success", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 2,
        recentRaw: results("success", "success"),
        recentNonSkipped: results("success", "success"),
      });

      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("crosses a level boundary: 1.4 success -> 2.1", () => {
      const outcome = computeProgression({
        level: 1,
        sublevel: 4,
        recentRaw: results("success", "success", "success", "failure"),
        recentNonSkipped: results("success", "success", "success", "failure"),
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 1, changed: true, reason: "success_threshold" });
    });

    test("clamps at 4.4 and reports changed: false even though the rule fired", () => {
      const outcome = computeProgression({
        level: 4,
        sublevel: 4,
        recentRaw: results("success", "success", "success", "failure"),
        recentNonSkipped: results("success", "success", "success", "failure"),
      });

      expect(outcome).toMatchObject({ level: 4, sublevel: 4, changed: false });
    });

    test("matches the worked example: success, skip, success, success, failure filters to 3/4 successes", () => {
      // Oldest -> newest: success, skip, success, success, failure.
      // The repository already filters skip out and orders most-recent-first,
      // so recentNonSkipped is: failure, success, success, success.
      const outcome = computeProgression({
        level: 2,
        sublevel: 2,
        recentRaw: results("failure", "success", "skipped", "success"),
        recentNonSkipped: results("failure", "success", "success", "success"),
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 3, changed: true, reason: "success_threshold" });
    });
  });

  describe("failure rule (2 of last 3 non-skipped)", () => {
    test("levels down within the same level when 2 of the last 3 are failure", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("failure", "failure", "success"),
        recentNonSkipped: results("failure", "failure", "success"),
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 2, changed: true, reason: "failure_threshold" });
    });

    test("does not change with only 1 of the last 3 failures", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("failure", "success", "success"),
        recentNonSkipped: results("failure", "success", "success"),
      });

      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("does not fire with fewer than 3 non-skipped results", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("failure", "failure"),
        recentNonSkipped: results("failure", "failure"),
      });

      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("crosses a level boundary: 2.1 failure -> 1.4", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 1,
        recentRaw: results("failure", "failure", "success"),
        recentNonSkipped: results("failure", "failure", "success"),
      });

      expect(outcome).toMatchObject({ level: 1, sublevel: 4, changed: true, reason: "failure_threshold" });
    });

    test("clamps at 1.1 and reports changed: false even though the rule fired", () => {
      const outcome = computeProgression({
        level: 1,
        sublevel: 1,
        recentRaw: results("failure", "failure", "success"),
        recentNonSkipped: results("failure", "failure", "success"),
      });

      expect(outcome).toMatchObject({ level: 1, sublevel: 1, changed: false });
    });
  });

  describe("skip-streak rule (2 consecutive skips)", () => {
    test("levels down when the last 2 results are both skipped", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("skipped", "skipped"),
        recentNonSkipped: [],
      });

      expect(outcome).toMatchObject({ level: 2, sublevel: 2, changed: true, reason: "consecutive_skips" });
    });

    test("does not fire for a single skip broken by a non-skip result", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("skipped", "success"),
        recentNonSkipped: results("success"),
      });

      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("does not fire with fewer than 2 raw results", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("skipped"),
        recentNonSkipped: [],
      });

      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("a success between two skips does not count as a streak (not consecutive)", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 3,
        recentRaw: results("skipped", "success", "skipped"),
        recentNonSkipped: results("success"),
      });

      // Most recent 2 raw are [skipped, success] — not both skipped.
      expect(outcome).toMatchObject({ changed: false, reason: "no_change" });
    });

    test("crosses a level boundary on skip-streak: 2.1 -> 1.4", () => {
      const outcome = computeProgression({
        level: 2,
        sublevel: 1,
        recentRaw: results("skipped", "skipped"),
        recentNonSkipped: [],
      });

      expect(outcome).toMatchObject({ level: 1, sublevel: 4, changed: true, reason: "consecutive_skips" });
    });

    test("clamps at 1.1 for a skip-streak", () => {
      const outcome = computeProgression({
        level: 1,
        sublevel: 1,
        recentRaw: results("skipped", "skipped"),
        recentNonSkipped: [],
      });

      expect(outcome).toMatchObject({ level: 1, sublevel: 1, changed: false });
    });
  });

  test("no data at all results in no change", () => {
    const outcome = computeProgression({ level: 2, sublevel: 2, recentRaw: [], recentNonSkipped: [] });

    expect(outcome).toMatchObject({ level: 2, sublevel: 2, changed: false, reason: "no_change" });
  });
});

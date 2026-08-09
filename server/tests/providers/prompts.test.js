import {
  buildPassagePrompt,
  buildQuestionPrompt,
  buildEvaluationPrompt,
} from "../../src/services/llmProvider/prompts.js";

describe("buildPassagePrompt", () => {
  test("1.1 guidance asks for full nikud and the shortest length/word ranges", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: [] });

    expect(prompt).toContain("ניקוד מלא");
    expect(prompt).toContain("2 עד 3 משפטים");
    expect(prompt).toContain("3 עד 4 מילים");
  });

  test("3.2 guidance asks for a mixed nikud style", () => {
    const prompt = buildPassagePrompt({ level: 3, sublevel: 2, interests: [] });

    expect(prompt).toContain("חלק משמעותי מהטקסט ללא ניקוד");
    expect(prompt).toContain("5 עד 7 משפטים");
  });

  test("4.4 guidance asks for no nikud at all and the longest length/word ranges", () => {
    const prompt = buildPassagePrompt({ level: 4, sublevel: 4, interests: [] });

    expect(prompt).toContain("אל תשתמשי בניקוד כלל");
    expect(prompt).toContain("10 עד 14 משפטים");
    expect(prompt).toContain("9 עד 15 מילים");
  });

  test("different sublevels within the same level produce different guidance", () => {
    const sublevel1 = buildPassagePrompt({ level: 1, sublevel: 1, interests: [] });
    const sublevel4 = buildPassagePrompt({ level: 1, sublevel: 4, interests: [] });

    expect(sublevel1).not.toBe(sublevel4);
  });

  test("includes interests when provided, capped to at most one in the instruction", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: ["חלל", "רובוטים"] });

    expect(prompt).toContain("חלל");
    expect(prompt).toContain("רובוטים");
    expect(prompt).toContain("לכל היותר אחד מהם");
  });

  test("instructs to use brands/franchises/characters only as general inspiration, not by name", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: ["הארי פוטר"] });

    expect(prompt).toContain("מותג, סדרה, דמות או עולם בדיוני מוכר");
    expect(prompt).toContain("אל תזכירי את השם");
  });

  test("omits the interests line when interests is empty", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: [] });

    expect(prompt).not.toContain("יש עניין בנושאים");
  });

  test("asks for a friendly main character, a simple beginning/middle/end, and connected sentences", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: [] });

    expect(prompt).toContain("דמות ראשית ילדית");
    expect(prompt).toContain("התחלה, אמצע וסוף");
    expect(prompt).toContain("משפטים מחוברים");
    expect(prompt).toContain("לא רשימת משפטים נפרדים");
  });

  test("asks for one small event or problem that gets resolved", () => {
    const prompt = buildPassagePrompt({ level: 1, sublevel: 1, interests: [] });

    expect(prompt).toContain("אירוע קטן אחד או בעיה קטנה אחת שנפתרת");
  });

  test("throws for an unrecognized level/sublevel combination", () => {
    expect(() => buildPassagePrompt({ level: 5, sublevel: 1, interests: [] })).toThrow();
    expect(() => buildPassagePrompt({ level: 1, sublevel: 5, interests: [] })).toThrow();
  });
});

describe("buildQuestionPrompt", () => {
  test("includes the passage text", () => {
    const passage = { text: "טקסט ייחודי לבדיקה.", level: 1, sublevel: 1 };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain(passage.text);
  });

  test("1.1 guidance asks for locating an explicit detail", () => {
    const passage = { text: "טקסט.", level: 1, sublevel: 1 };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("איתור פרט מפורש");
  });

  test("asks for a question answerable from the passage alone, with an expectedMeaning that describes meaning", () => {
    const passage = { text: "טקסט.", level: 1, sublevel: 1 };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("מתוך הקטע בלבד");
    expect(prompt).toContain("בלי ניחוש");
    expect(prompt).toContain("לתאר את משמעות התשובה הנכונה");
  });

  test("2.4 guidance asks for explicit understanding plus light inference", () => {
    const passage = { text: "טקסט.", level: 2, sublevel: 4 };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("הבנה מפורשת + הסקה קלה");
  });

  test("4.4 guidance asks for combining explicit info, inference, and the main idea", () => {
    const passage = { text: "טקסט.", level: 4, sublevel: 4 };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("שילוב מידע מפורש, הסקה ורעיון מרכזי");
  });

  test("throws for an unrecognized level/sublevel combination", () => {
    const passage = { text: "טקסט.", level: 5, sublevel: 1 };

    expect(() => buildQuestionPrompt({ passage })).toThrow();
  });
});

describe("buildEvaluationPrompt", () => {
  test("includes the question prompt, expected meaning, and the child's answer", () => {
    const question = { prompt: "מה קרה?", expectedMeaning: "משהו קרה" };

    const prompt = buildEvaluationPrompt({ question, answerText: "התשובה שלי" });

    expect(prompt).toContain(question.prompt);
    expect(prompt).toContain(question.expectedMeaning);
    expect(prompt).toContain("התשובה שלי");
  });

  test("instructs to reject vague or overly general answers missing the key information", () => {
    const question = { prompt: "מה קרה?", expectedMeaning: "משהו קרה" };

    const prompt = buildEvaluationPrompt({ question, answerText: "התשובה שלי" });

    expect(prompt).toContain("כללית מדי");
    expect(prompt).toContain("עמומה");
    expect(prompt).toContain("יש לראות אותה כשגויה");
  });
});

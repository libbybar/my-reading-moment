import {
  buildPassagePrompt,
  buildQuestionPrompt,
  buildEvaluationPrompt,
} from "../../src/services/llmProvider/prompts.js";

describe("buildPassagePrompt", () => {
  test("beginner guidance asks for full nikud and very simple vocabulary", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: [] });

    expect(prompt).toContain("ניקוד מלא");
    expect(prompt).toContain("פשוט מאוד");
  });

  test("intermediate guidance asks for partial nikud only", () => {
    const prompt = buildPassagePrompt({ readingLevel: "intermediate", interests: [] });

    expect(prompt).toContain("5 עד 8 משפטים");
    expect(prompt).toContain("מילים קשות");
  });

  test("advanced guidance asks for no nikud except to avoid ambiguity", () => {
    const prompt = buildPassagePrompt({ readingLevel: "advanced", interests: [] });

    expect(prompt).toContain("10 עד 12 משפטים");
    expect(prompt).toContain("אל תשתמשי בניקוד");
  });

  test("includes interests when provided, capped to at most one in the instruction", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: ["חלל", "רובוטים"] });

    expect(prompt).toContain("חלל");
    expect(prompt).toContain("רובוטים");
    expect(prompt).toContain("לכל היותר אחד מהם");
  });

  test("instructs to use brands/franchises/characters only as general inspiration, not by name", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: ["הארי פוטר"] });

    expect(prompt).toContain("מותג, סדרה, דמות או עולם בדיוני מוכר");
    expect(prompt).toContain("אל תזכירי את השם");
  });

  test("omits the interests line when interests is empty", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: [] });

    expect(prompt).not.toContain("יש עניין בנושאים");
  });

  test("asks for a friendly main character, a simple beginning/middle/end, and connected sentences", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: [] });

    expect(prompt).toContain("דמות ראשית ילדית");
    expect(prompt).toContain("התחלה, אמצע וסוף");
    expect(prompt).toContain("משפטים מחוברים");
    expect(prompt).toContain("לא רשימת משפטים נפרדים");
  });

  test("asks for one small event or problem that gets resolved", () => {
    const prompt = buildPassagePrompt({ readingLevel: "beginner", interests: [] });

    expect(prompt).toContain("אירוע קטן אחד או בעיה קטנה אחת שנפתרת");
  });

  test("throws for an unrecognized readingLevel", () => {
    expect(() => buildPassagePrompt({ readingLevel: "expert", interests: [] })).toThrow();
  });
});

describe("buildQuestionPrompt", () => {
  test("includes the passage text", () => {
    const passage = { text: "טקסט ייחודי לבדיקה.", readingLevel: "beginner" };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain(passage.text);
  });

  test("beginner guidance asks for a short literal answer and a vocalized question", () => {
    const passage = { text: "טקסט.", readingLevel: "beginner" };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("מילה אחת או שתיים");
    expect(prompt).toContain("נקדי גם את השאלה עצמה");
  });

  test("asks for a question answerable from the passage alone, with an expectedMeaning that describes meaning", () => {
    const passage = { text: "טקסט.", readingLevel: "beginner" };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("מתוך הקטע בלבד");
    expect(prompt).toContain("בלי ניחוש");
    expect(prompt).toContain("לתאר את משמעות התשובה הנכונה");
  });

  test("intermediate guidance asks for a short-phrase answer", () => {
    const passage = { text: "טקסט.", readingLevel: "intermediate" };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("ביטוי קצר");
  });

  test("advanced guidance asks for understanding rather than fact retrieval", () => {
    const passage = { text: "טקסט.", readingLevel: "advanced" };

    const prompt = buildQuestionPrompt({ passage });

    expect(prompt).toContain("הבנה כוללת");
  });

  test("throws for an unrecognized readingLevel", () => {
    const passage = { text: "טקסט.", readingLevel: "expert" };

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

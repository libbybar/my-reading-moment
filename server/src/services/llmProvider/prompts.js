function buildPassagePrompt({ readingLevel, interests }) {
  const interestsLine =
    interests.length > 0 ? `הילד/ה אוהב/ת: ${interests.join(", ")}.` : "";

  return [
    "כתוב קטע קריאה קצר בעברית עבור ילד/ה הלומד/ת קריאה.",
    `רמת הקריאה: ${readingLevel}.`,
    interestsLine,
    "הקטע צריך להיות ברור, מתאים לגיל, ובאורך של כמה משפטים בלבד.",
    "תן גם כותרת קצרה לקטע.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildQuestionPrompt({ passage }) {
  return [
    "הנה קטע קריאה בעברית:",
    passage.text,
    "כתוב שאלת הבנת הנקרא אחת וברורה על הקטע, יחד עם התשובה הצפויה לשאלה.",
  ].join("\n\n");
}

function buildEvaluationPrompt({ question, answerText }) {
  return [
    `השאלה: ${question.prompt}`,
    `מהות התשובה הצפויה: ${question.expectedMeaning}`,
    `התשובה שכתב/ה הילד/ה: ${answerText}`,
    "בדוק אם תשובת הילד/ה נכונה מבחינת המשמעות, גם אם יש טעויות כתיב או ניסוח שונה.",
  ].join("\n");
}

module.exports = { buildPassagePrompt, buildQuestionPrompt, buildEvaluationPrompt };

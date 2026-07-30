// Guidance keyed by the app's existing readingLevel values. Only prompts.js
// needs to know what these levels actually mean in practice — the provider
// contract itself stays generic (any non-blank string), so this is the one
// place that turns "beginner"/"intermediate"/"advanced" into real behavior.

// Shared across all levels: what makes the generated text an actual short
// story, not a random string. Level-specific guidance below layers on top of
// this — it only varies vocabulary/length/nikud, not the story shape.
const PASSAGE_STORY_GUIDANCE = [
  "בקטע צריכה להיות דמות ראשית ילדית אחת, ידידותית ומתאימה לגיל.",
  "בני את הקטע כסיפור עם התחלה, אמצע וסוף פשוטים.",
  "כתבי משפטים מחוברים שיוצרים סיפור זורם — לא רשימת משפטים נפרדים ולא רשימה של תחומי עניין.",
  "שלבי בסיפור אירוע קטן אחד או בעיה קטנה אחת שנפתרת עד סוף הקטע.",
].join(" ");

const READING_LEVEL_PASSAGE_GUIDANCE = {
  beginner: [
    "כתבי קטע של כ-3 עד 4 משפטים קצרים בלבד.",
    "נקדי את כל מילות הקטע בניקוד מלא, כולל הכותרת.",
    "השתמשי באוצר מילים פשוט מאוד, המתאים לילד/ה שרק מתחיל/ה ללמוד לקרוא.",
  ].join(" "),
  intermediate: [
    "כתבי קטע של כ-5 עד 8 משפטים.",
    "נקדי רק מילים קשות או מילים שעלולות להיקרא בטעות בלי ניקוד — לא את כל הטקסט.",
    "אפשר להשתמש באוצר מילים מעט יותר עשיר מרמת מתחילים.",
  ].join(" "),
  advanced: [
    "כתבי קטע ארוך יותר, באורך של כ-10 עד 12 משפטים.",
    "אל תשתמשי בניקוד כלל, מלבד במילה בודדת שבלעדיה עלולה להיווצר עמימות אמיתית בקריאה.",
    "השתמשי באוצר מילים עשיר ובשפה טבעית וזורמת יותר.",
  ].join(" "),
};

// Shared across all levels: what makes a question fair to grade — answerable
// from the text alone, and an expectedMeaning that describes the answer's
// meaning rather than one fixed wording (the mock's evaluator is a substring
// match, but Gemini's evaluateAnswer judges semantically — a meaning
// description is what that comparison actually needs).
const QUESTION_GENERAL_GUIDANCE = [
  "השאלה חייבת להיות כזו שאפשר לענות עליה באופן מפורש מתוך הקטע בלבד, בלי צורך בידע חיצוני ובלי ניחוש.",
  "התשובה הצפויה (expectedMeaning) צריכה לתאר את משמעות התשובה הנכונה, ולא רק לחזור מילה במילה על ניסוח יחיד מתוך הטקסט.",
].join(" ");

const READING_LEVEL_QUESTION_GUIDANCE = {
  beginner: [
    "שאלי שאלת הבנת נקרא אחת, פשוטה וישירה, שהתשובה עליה מופיעה במפורש בטקסט.",
    "התשובה הצפויה צריכה להיות בדרך כלל מילה אחת או שתיים בלבד.",
    "נקדי גם את השאלה עצמה בניקוד מלא, כי הקטע עצמו מנוקד.",
  ].join(" "),
  intermediate: [
    "שאלי שאלת הבנת נקרא אחת שהתשובה עליה דורשת ניסוח של ביטוי קצר, לא רק מילה בודדת.",
  ].join(" "),
  advanced: [
    "שאלי שאלת הבנת נקרא אחת שדורשת הבנה כוללת של הקטע, ולא רק איתור של עובדה בודדת בטקסט.",
  ].join(" "),
};

function getReadingLevelGuidance(guidanceByLevel, readingLevel) {
  const guidance = guidanceByLevel[readingLevel];

  if (!guidance) {
    throw new Error(`Unsupported readingLevel for prompt construction: "${readingLevel}"`);
  }

  return guidance;
}

// At most one interest, and only as a natural option — not a bald list
// appended to the prompt, which risked the story just listing interests as
// a sentence instead of using one to inspire the plot.
function buildInterestsLine(interests) {
  if (interests.length === 0) {
    return "";
  }

  return `לילד/ה יש עניין בנושאים הבאים: ${interests.join(", ")}. אם זה מתאים באופן טבעי לעלילה, אפשר לשלב בסיפור לכל היותר אחד מהם — לא יותר. אם עניין מסוים הוא שם של מותג, סדרה, דמות או עולם בדיוני מוכר (למשל הארי פוטר), אל תזכירי את השם או את הדמויות/המותג במפורש בסיפור — השתמשי רק ברעיון או בנושא הכללי שלו כהשראה.`;
}

function buildPassagePrompt({ readingLevel, interests }) {
  return [
    "כתבי קטע קריאה קצר בעברית עבור ילד/ה הלומד/ת קריאה.",
    PASSAGE_STORY_GUIDANCE,
    getReadingLevelGuidance(READING_LEVEL_PASSAGE_GUIDANCE, readingLevel),
    buildInterestsLine(interests),
    "תני גם כותרת קצרה לקטע.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildQuestionPrompt({ passage }) {
  return [
    "הנה קטע קריאה בעברית:",
    passage.text,
    "כתבי שאלת הבנת הנקרא אחת וברורה על הקטע, יחד עם התשובה הצפויה לשאלה.",
    QUESTION_GENERAL_GUIDANCE,
    getReadingLevelGuidance(READING_LEVEL_QUESTION_GUIDANCE, passage.readingLevel),
  ].join("\n\n");
}

function buildEvaluationPrompt({ question, answerText }) {
  return [
    `השאלה: ${question.prompt}`,
    `מהות התשובה הצפויה: ${question.expectedMeaning}`,
    `התשובה שכתב/ה הילד/ה: ${answerText}`,
    "בדקי אם תשובת הילד/ה נכונה מבחינת המשמעות, גם אם יש טעויות כתיב או ניסוח שונה.",
    "אם התשובה כללית מדי, עמומה, או לא כוללת את פרט המידע המרכזי הנדרש כדי לענות על השאלה במפורש — יש לראות אותה כשגויה, גם אם היא קשורה באופן כללי לנושא הקטע.",
  ].join("\n");
}

module.exports = { buildPassagePrompt, buildQuestionPrompt, buildEvaluationPrompt };

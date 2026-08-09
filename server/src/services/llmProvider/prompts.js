import { getReadingLevelSpec } from "../../data/readingLevelSpec.js";

// Reading-level meaning belongs in prompt construction, not the provider contract.
const PASSAGE_STORY_GUIDANCE = [
  "בקטע צריכה להיות דמות ראשית ילדית אחת, ידידותית ומתאימה לגיל.",
  "בני את הקטע כסיפור עם התחלה, אמצע וסוף פשוטים.",
  "כתבי משפטים מחוברים שיוצרים סיפור זורם — לא רשימת משפטים נפרדים ולא רשימה של תחומי עניין.",
  "שלבי בסיפור אירוע קטן אחד או בעיה קטנה אחת שנפתרת עד סוף הקטע.",
].join(" ");

const QUESTION_GENERAL_GUIDANCE = [
  "השאלה חייבת להיות כזו שאפשר לענות עליה באופן מפורש מתוך הקטע בלבד, בלי צורך בידע חיצוני ובלי ניחוש.",
  "התשובה הצפויה (expectedMeaning) צריכה לתאר את משמעות התשובה הנכונה, ולא רק לחזור מילה במילה על ניסוח יחיד מתוך הטקסט.",
].join(" ");

const NIKUD_GUIDANCE = {
  full: "נקדי את כל מילות הקטע בניקוד מלא, כולל הכותרת.",
  full_or_almost_full: "נקדי את רוב מילות הקטע בניקוד מלא, כמעט בלי חריגים.",
  mostly_full: "נקדי את רוב הקטע, מלבד מילים שכיחות מאוד שיכולות להופיע בבירור גם בלי ניקוד.",
  mixed: "השאירי חלק משמעותי מהטקסט בלי ניקוד, בכתיב מלא, ונקדי את שאר הטקסט.",
  sparse_support: "אל תנקדי את רוב הטקסט — נקדי רק שורשים או נטיות פחות שכיחות שעלולות להיקרא בטעות.",
  none_except_exceptional_words:
    "אל תנקדי את הטקסט כלל, מלבד מילה חריגה בודדת שבלעדיה עלולה להיווצר עמימות אמיתית בקריאה.",
  none: "אל תשתמשי בניקוד כלל.",
};

function getNikudGuidance(nikud) {
  const guidance = NIKUD_GUIDANCE[nikud];

  if (!guidance) {
    throw new Error(`Unsupported nikud value for prompt construction: "${nikud}"`);
  }

  return guidance;
}

// Prevents the model from turning interests into a list instead of a plot.
function buildInterestsLine(interests) {
  if (interests.length === 0) {
    return "";
  }

  return `לילד/ה יש עניין בנושאים הבאים: ${interests.join(", ")}. אם זה מתאים באופן טבעי לעלילה, אפשר לשלב בסיפור לכל היותר אחד מהם — לא יותר. אם עניין מסוים הוא שם של מותג, סדרה, דמות או עולם בדיוני מוכר (למשל הארי פוטר), אל תזכירי את השם או את הדמויות/המותג במפורש בסיפור — השתמשי רק ברעיון או בנושא הכללי שלו כהשראה.`;
}

function buildPassagePrompt({ level, sublevel, interests }) {
  const spec = getReadingLevelSpec(level, sublevel);

  return [
    "כתבי קטע קריאה קצר בעברית עבור ילד/ה הלומד/ת קריאה.",
    PASSAGE_STORY_GUIDANCE,
    getNikudGuidance(spec.nikud),
    `כתבי קטע של כ-${spec.textLengthSentences.min} עד ${spec.textLengthSentences.max} משפטים, כל משפט באורך של כ-${spec.wordsPerSentence.min} עד ${spec.wordsPerSentence.max} מילים.`,
    `מבחינת אוצר מילים ומורפולוגיה: ${spec.vocabularyAndMorphology}.`,
    `מבחינת תחביר: ${spec.syntax}.`,
    buildInterestsLine(interests),
    "תני גם כותרת קצרה לקטע.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildQuestionPrompt({ passage }) {
  const spec = getReadingLevelSpec(passage.level, passage.sublevel);

  return [
    "הנה קטע קריאה בעברית:",
    passage.text,
    "כתבי שאלת הבנת הנקרא אחת וברורה על הקטע, יחד עם התשובה הצפויה לשאלה.",
    QUESTION_GENERAL_GUIDANCE,
    `יעד ההבנה המצופה ברמת הקריאה הזו: ${spec.comprehensionTarget}.`,
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

export { buildPassagePrompt, buildQuestionPrompt, buildEvaluationPrompt };

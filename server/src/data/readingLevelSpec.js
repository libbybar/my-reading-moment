// Source of truth for level/sublevel constraints; numeric ranges stay machine-readable.

const READING_LEVEL_SPEC_VERSION = 1;

const READING_LEVEL_SPEC = [
  {
    level: 1,
    sublevel: 1,
    nikud: "full",
    textLengthSentences: { min: 2, max: 3 },
    wordsPerSentence: { min: 3, max: 4 },
    vocabularyAndMorphology: "מילים שכיחות מאוד, בעיקר 1-2 הברות, מבנים פשוטים",
    syntax: "משפטים פשוטים מאוד",
    comprehensionTarget: "איתור פרט מפורש",
  },
  {
    level: 1,
    sublevel: 2,
    nikud: "full",
    textLengthSentences: { min: 3, max: 4 },
    wordsPerSentence: { min: 4, max: 5 },
    vocabularyAndMorphology: "2-3 הברות, מבנים פשוטים",
    syntax: "משפטים פשוטים, מעט חיבור ב-ו'",
    comprehensionTarget: "מי/מה/איפה מפורש",
    primaryAxis: "decoding",
    primaryAxisNote: "בעיקר מעבר מפענוח בסיסי מאוד לקריאת מילים מעט ארוכות ומשפטים מעט ארוכים יותר",
  },
  {
    level: 1,
    sublevel: 3,
    nikud: "full",
    textLengthSentences: { min: 3, max: 4 },
    wordsPerSentence: { min: 5, max: 6 },
    vocabularyAndMorphology: "עד 3-4 הברות, תחיליות שכיחות כמו ו-/ה-/ב-/ל-, שוואים שכיחים",
    syntax: "רצף זמן פשוט",
    comprehensionTarget: "חיבור מידע משני משפטים",
    primaryAxis: "morphology",
    primaryAxisNote: "בעיקר יותר מורכבות מורפולוגית ומבני מילה, לא קפיצה גדולה באורך הטקסט",
  },
  {
    level: 1,
    sublevel: 4,
    nikud: "full",
    textLengthSentences: { min: 4, max: 5 },
    wordsPerSentence: { min: 5, max: 7 },
    vocabularyAndMorphology: "מגוון רחב יותר של מבני מילה ונטיות שכיחות",
    syntax: "שני חלקי משפט וקשרי זמן",
    comprehensionTarget: "סדר אירועים וסיבה מפורשת",
    primaryAxis: "decoding_stability",
    primaryAxisNote: "יותר יציבות בפענוח וחיבור בין אירועים",
  },
  {
    level: 2,
    sublevel: 1,
    nikud: "full",
    textLengthSentences: { min: 4, max: 5 },
    wordsPerSentence: { min: 6, max: 7 },
    vocabularyAndMorphology: "אוצר מילים שכיח, פחות חזרתיות",
    syntax: "משפטים טבעיים יותר",
    comprehensionTarget: "מידע מפורש לאורך פסקה",
  },
  {
    level: 2,
    sublevel: 2,
    nikud: "full",
    textLengthSentences: { min: 4, max: 6 },
    wordsPerSentence: { min: 6, max: 8 },
    vocabularyAndMorphology: "נטיות ומילות יחס שכיחות, מעט מילים פחות מוכרות",
    syntax: "קשרי כי/אבל/אחר כך",
    comprehensionTarget: "קשרי זמן וסיבה",
    primaryAxis: "syntax",
    primaryAxisNote: "יותר תחביר וקשרי סיבה/זמן",
  },
  {
    level: 2,
    sublevel: 3,
    nikud: "full",
    textLengthSentences: { min: 5, max: 6 },
    wordsPerSentence: { min: 6, max: 9 },
    vocabularyAndMorphology: "מורפולוגיה בינונית, כינויי גוף ואזכורים",
    syntax: "מידע נפרס על פני כמה משפטים",
    comprehensionTarget: "חיבור מידע בין משפטים",
    primaryAxis: "cross_sentence_linking",
    primaryAxisNote: "יותר צורך לחבר מידע בין משפטים",
  },
  {
    level: 2,
    sublevel: 4,
    nikud: "full_or_almost_full",
    textLengthSentences: { min: 5, max: 7 },
    wordsPerSentence: { min: 7, max: 10 },
    vocabularyAndMorphology: "אוצר מילים מעט עשיר יותר",
    syntax: "תחביר מגוון אך לא מורכב",
    comprehensionTarget: "הבנה מפורשת + הסקה קלה",
    primaryAxis: "light_inference",
    primaryAxisNote: "התחלה של הסקה קלה",
  },
  {
    level: 3,
    sublevel: 1,
    nikud: "mostly_full",
    textLengthSentences: { min: 5, max: 6 },
    wordsPerSentence: { min: 6, max: 9 },
    vocabularyAndMorphology: "מילים שכיחות מאוד יכולות להופיע ללא ניקוד",
    syntax: "כמו 2.3-2.4",
    comprehensionTarget: "שימוש בהקשר להבנת מילה",
    primaryAxisNote: "מעבר הדרגתי מקריאה מנוקדת לקריאה ללא ניקוד, לא switch חד (3.1-3.4)",
  },
  {
    level: 3,
    sublevel: 2,
    nikud: "mixed",
    textLengthSentences: { min: 5, max: 7 },
    wordsPerSentence: { min: 7, max: 10 },
    vocabularyAndMorphology: "חלק משמעותי מהטקסט ללא ניקוד, כתיב מלא",
    syntax: "זמן, סיבה וניגוד",
    comprehensionTarget: "חיבור מידע + הסקה פשוטה",
  },
  {
    level: 3,
    sublevel: 3,
    nikud: "sparse_support",
    textLengthSentences: { min: 6, max: 8 },
    wordsPerSentence: { min: 7, max: 11 },
    vocabularyAndMorphology: "רוב הטקסט ללא ניקוד, שורשים ונטיות שכיחים",
    syntax: "משפטים מורכבים קלים",
    comprehensionTarget: "משמעות מתוך הקשר",
  },
  {
    level: 3,
    sublevel: 4,
    nikud: "none_except_exceptional_words",
    textLengthSentences: { min: 6, max: 8 },
    wordsPerSentence: { min: 8, max: 12 },
    vocabularyAndMorphology: "עברית טבעית אך אוצר מילים מבוקר",
    syntax: "פסקה טבעית",
    comprehensionTarget: "הסקה פשוטה ומניעים",
  },
  {
    level: 4,
    sublevel: 1,
    nikud: "none",
    textLengthSentences: { min: 7, max: 9 },
    wordsPerSentence: { min: 8, max: 12 },
    vocabularyAndMorphology: "מילים פחות שכיחות במידה מבוקרת",
    syntax: "תחביר טבעי",
    comprehensionTarget: "קשרים בין חלקי הטקסט",
    primaryAxisNote: "פחות דגש על פענוח ויותר על הבנה, הסקה, מניעים ורעיון מרכזי (4.1-4.4)",
  },
  {
    level: 4,
    sublevel: 2,
    nikud: "none",
    textLengthSentences: { min: 8, max: 10 },
    wordsPerSentence: { min: 8, max: 13 },
    vocabularyAndMorphology: "אוצר מילים מגוון ומורפולוגיה רגילה",
    syntax: "כינויים, ניגוד, סיבה ותוצאה",
    comprehensionTarget: "מעקב אחרי אזכורים ורצף לוגי",
  },
  {
    level: 4,
    sublevel: 3,
    nikud: "none",
    textLengthSentences: { min: 9, max: 12 },
    wordsPerSentence: { min: 9, max: 14 },
    vocabularyAndMorphology: "מילים שמשמעותן נלמדת מהקשר",
    syntax: "מבנים מעט מורכבים יותר",
    comprehensionTarget: "הסקה, רגש ומניע",
  },
  {
    level: 4,
    sublevel: 4,
    nikud: "none",
    textLengthSentences: { min: 10, max: 14 },
    wordsPerSentence: { min: 9, max: 15 },
    vocabularyAndMorphology: "עברית טבעית יחסית, עדיין מותאמת לילדים",
    syntax: "מגוון תחבירי",
    comprehensionTarget: "שילוב מידע מפורש, הסקה ורעיון מרכזי",
  },
];

const MIN_LEVEL = 1;
const MAX_LEVEL = 4;
const MIN_SUBLEVEL = 1;
const MAX_SUBLEVEL = 4;

function getReadingLevelSpec(level, sublevel) {
  const entry = READING_LEVEL_SPEC.find((item) => item.level === level && item.sublevel === sublevel);

  if (!entry) {
    throw new Error(`No ReadingLevelSpec entry for level ${level}.${sublevel}`);
  }

  return entry;
}

function isValidLevel(level) {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

function isValidSublevel(sublevel) {
  return Number.isInteger(sublevel) && sublevel >= MIN_SUBLEVEL && sublevel <= MAX_SUBLEVEL;
}

export {
  READING_LEVEL_SPEC,
  READING_LEVEL_SPEC_VERSION,
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_SUBLEVEL,
  MAX_SUBLEVEL,
  getReadingLevelSpec,
  isValidLevel,
  isValidSublevel,
};

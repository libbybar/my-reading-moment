// Server-owned skill blueprints, not content: no child-facing question or answer
// may live here, because every item must be freshly generated from a blueprint.

const ACTIVITY_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice",
  SHORT_ANSWER: "short-answer",
};

const STORY_DETECTIVES_WORLD_ID = "story-detectives";

const ALL_ACTIVITY_TYPES = [ACTIVITY_TYPES.MULTIPLE_CHOICE, ACTIVITY_TYPES.SHORT_ANSWER];

const STORY_DETECTIVES_MISSIONS = [
  {
    missionId: "explicit-detail",
    skillFocus: "איתור פרט שכתוב במפורש בקטע",
    activityTypes: ALL_ACTIVITY_TYPES,
    readabilityConstraints: { minSentences: 2 },
    generationConstraints: [
      "כל פעילות שואלת על פרט אחד שכתוב בקטע כלשונו: מי, מה, איפה או כמה.",
      "אסור שהתשובה תדרוש חיבור בין כמה משפטים או הסקה.",
    ],
    parentExplanation: "הילד/ה מתרגל/ת למצוא בקטע פרט שכתוב בו במפורש, כמו מי, מה או איפה.",
  },
  {
    missionId: "event-sequence",
    skillFocus: "סידור אירועים לפי סדר התרחשותם בקטע",
    activityTypes: ALL_ACTIVITY_TYPES,
    readabilityConstraints: { minSentences: 4 },
    generationConstraints: [
      "בקטע צריכים להופיע לפחות שלושה אירועים ברורים בסדר כרונולוגי מפורש.",
      "כל פעילות שואלת מה קרה קודם, מה קרה אחר כך או מה קרה בסוף.",
    ],
    parentExplanation: "הילד/ה מתרגל/ת לעקוב אחרי מה שקרה בסיפור ולזכור באיזה סדר זה קרה.",
  },
  {
    missionId: "cause-and-effect",
    skillFocus: "קישור בין סיבה שנאמרה בקטע לבין התוצאה שלה",
    activityTypes: ALL_ACTIVITY_TYPES,
    readabilityConstraints: { minSentences: 3 },
    generationConstraints: [
      "הקטע מציין במפורש גם סיבה וגם תוצאה, ומחבר ביניהן במילה כמו כי, לכן או אחרי ש.",
      "כל פעילות שואלת למה קרה דבר מה או מה קרה בגלל דבר אחר.",
    ],
    parentExplanation: "הילד/ה מתרגל/ת להבין למה משהו קרה בסיפור, ומה יצא מזה.",
  },
  {
    missionId: "word-from-context",
    skillFocus: "הבנת משמעות של מילה פחות מוכרת מתוך המשפטים שסביבה",
    activityTypes: ALL_ACTIVITY_TYPES,
    readabilityConstraints: { minSentences: 3 },
    generationConstraints: [
      "הקטע כולל מילה אחת פחות שכיחה, שהמשפטים הסמוכים לה מגלים את משמעותה.",
      "הקטע אינו מסביר את המילה במפורש כהגדרה.",
      "כל פעילות שואלת מה המילה הזו אומרת, או איזו מילה מוכרת יכולה לבוא במקומה.",
    ],
    parentExplanation: "הילד/ה מתרגל/ת להבין מילה חדשה לפי המשפטים שסביבה, בלי לחפש במילון.",
  },
  {
    missionId: "simple-inference",
    skillFocus: "הסקת מסקנה שנתמכת בשני רמזים או יותר בקטע",
    activityTypes: ALL_ACTIVITY_TYPES,
    readabilityConstraints: { minSentences: 4 },
    generationConstraints: [
      "המסקנה אינה כתובה בקטע כלשונה, אבל לפחות שני רמזים שכתובים בו מובילים אליה.",
      "לכל מסקנה יש תשובה אחת בלבד שנתמכת בטקסט; אין צורך בידע חיצוני.",
      "כל פעילות שואלת מה אפשר להבין מהרמזים, למשל איך הדמות הרגישה או איפה התרחש הסיפור.",
    ],
    parentExplanation: "הילד/ה מתרגל/ת לחבר כמה רמזים מהקטע כדי להבין משהו שלא כתוב בו במפורש.",
  },
];

function getMissionBlueprint(missionId) {
  const blueprint = STORY_DETECTIVES_MISSIONS.find((mission) => mission.missionId === missionId);

  if (!blueprint) {
    throw new Error(`No mission blueprint for missionId "${missionId}"`);
  }

  return blueprint;
}

export {
  ACTIVITY_TYPES,
  STORY_DETECTIVES_WORLD_ID,
  STORY_DETECTIVES_MISSIONS,
  getMissionBlueprint,
};

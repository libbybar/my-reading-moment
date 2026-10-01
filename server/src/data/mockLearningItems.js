// Raw items in the shape Gemini returns, before server validation assigns ids.
// Every mission has at least two, so a request can be answered with a different
// item after one has been used.

import { ACTIVITY_TYPES } from "./learningMissions.js";

const { MULTIPLE_CHOICE, SHORT_ANSWER } = ACTIVITY_TYPES;

const MOCK_LEARNING_ITEMS_BY_MISSION_ID = {
  "explicit-detail": [
    {
      title: "הכלב של נועה",
      text: "נועה הלכה לגן. היא לקחה כדור אדום. הכלב שלה רץ אחריה.",
      strategyHint: "כדאי לחפש בקטע את המשפט שמדבר על מה ששואלים, ולקרוא אותו שוב לאט.",
      variationSignature: "דמות: נועה; מקום: גן; פרט: כדור",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "איזה כדור נועה לקחה?",
          options: ["אדום", "כחול", "ירוק"],
          canonicalAnswer: "אדום",
          evidenceQuote: "היא לקחה כדור אדום",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מי רץ אחרי נועה?",
          options: [],
          canonicalAnswer: "הכלב שלה",
          evidenceQuote: "הכלב שלה רץ אחריה",
        },
      ],
    },
    {
      title: "המגדל של יואב",
      text: "יואב בנה מגדל. המגדל היה גבוה ועשוי מקוביות עץ. אמא הביאה לו כוס מיץ.",
      strategyHint: "כדאי לחפש בקטע את המשפט שמדבר על מה ששואלים, ולקרוא אותו שוב לאט.",
      variationSignature: "דמות: יואב; מקום: בית; פרט: מגדל",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "ממה המגדל היה עשוי?",
          options: ["קוביות עץ", "חול", "אבנים"],
          canonicalAnswer: "קוביות עץ",
          evidenceQuote: "עשוי מקוביות עץ",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מה אמא הביאה ליואב?",
          options: [],
          canonicalAnswer: "כוס מיץ",
          evidenceQuote: "אמא הביאה לו כוס מיץ",
        },
      ],
    },
  ],
  "event-sequence": [
    {
      title: "בוקר של דנה",
      text: "דנה התעוררה בבוקר. אחר כך היא צחצחה שיניים. אחרי זה היא אכלה ארוחת בוקר. בסוף היא לקחה את התיק ויצאה לבית הספר.",
      strategyHint: "כדאי לחפש בקטע מילים שמראות סדר בזמן.",
      variationSignature: "דמות: דנה; מקום: בית; פרט: בוקר",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "מה דנה עשתה מיד אחרי שצחצחה שיניים?",
          options: ["אכלה ארוחת בוקר", "יצאה לבית הספר", "התעוררה"],
          canonicalAnswer: "אכלה ארוחת בוקר",
          evidenceQuote: "אחרי זה היא אכלה ארוחת בוקר",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מה דנה עשתה בסוף?",
          options: [],
          canonicalAnswer: "לקחה את התיק ויצאה לבית הספר",
          evidenceQuote: "בסוף היא לקחה את התיק ויצאה לבית הספר",
        },
      ],
    },
    {
      title: "הזרעים של אורי",
      text: "אורי מצא זרעים בקופסה. קודם הוא שתל אותם באדמה. אחר כך הוא השקה אותם במים. אחרי כמה ימים צמחו עלים ירוקים.",
      strategyHint: "כדאי לחפש בקטע מילים שמראות סדר בזמן.",
      variationSignature: "דמות: אורי; מקום: גינה; פרט: זרעים",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "מה אורי עשה אחרי ששתל את הזרעים?",
          options: ["השקה אותם במים", "מצא אותם בקופסה", "אכל אותם"],
          canonicalAnswer: "השקה אותם במים",
          evidenceQuote: "אחר כך הוא השקה אותם במים",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מה קרה אחרי כמה ימים?",
          options: [],
          canonicalAnswer: "צמחו עלים ירוקים",
          evidenceQuote: "אחרי כמה ימים צמחו עלים ירוקים",
        },
      ],
    },
  ],
  "cause-and-effect": [
    {
      title: "הגשם של רוני",
      text: "רוני שכח את המטרייה בבית. בדרך לבית הספר ירד גשם חזק. רוני הגיע לכיתה רטוב, כי לא הייתה לו מטרייה.",
      strategyHint: "כדאי לחפש את המילה כי, היא מחברת בין מה שקרה לבין הסיבה.",
      variationSignature: "דמות: רוני; מקום: דרך לבית הספר; פרט: גשם",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "למה רוני הגיע רטוב לכיתה?",
          options: ["כי לא הייתה לו מטרייה", "כי הוא רץ מהר", "כי הוא שכח את התיק"],
          canonicalAnswer: "כי לא הייתה לו מטרייה",
          evidenceQuote: "רטוב, כי לא הייתה לו מטרייה",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מה קרה לרוני כשירד גשם חזק?",
          options: [],
          canonicalAnswer: "הוא הגיע רטוב לכיתה",
          evidenceQuote: "רוני הגיע לכיתה רטוב",
        },
      ],
    },
    {
      title: "הכריך של גיל",
      text: "גיל היה רעב מאוד כי לא אכל כל היום. לכן הוא הכין לעצמו כריך גבינה. אחר כך הוא שטף את הצלחת.",
      strategyHint: "כדאי לחפש מילים שמחברות בין סיבה לתוצאה.",
      variationSignature: "דמות: גיל; מקום: מטבח; פרט: כריך",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "למה גיל היה רעב?",
          options: ["כי לא אכל כל היום", "כי הוא רץ הרבה", "כי הכריך היה קטן"],
          canonicalAnswer: "כי לא אכל כל היום",
          evidenceQuote: "כי לא אכל כל היום",
        },
        {
          type: SHORT_ANSWER,
          prompt: "מה גיל עשה בגלל שהיה רעב?",
          options: [],
          canonicalAnswer: "הכין לעצמו כריך גבינה",
          evidenceQuote: "לכן הוא הכין לעצמו כריך גבינה",
        },
      ],
    },
  ],
  "word-from-context": [
    {
      title: "החיה בגן",
      text: "שרה ראתה בגן חיה קטנה עם זנב ארוך. היא הייתה זריזה מאוד ורצה מהר מעץ לעץ. אף אחד לא הצליח לתפוס אותה.",
      strategyHint: "כדאי לקרוא את המשפטים שנמצאים ליד המילה ולחפש בהם רמז.",
      variationSignature: "דמות: שרה; מקום: גן; מילה: זריזה",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "מה פירוש המילה זריזה?",
          options: ["מהירה", "עצובה", "גדולה"],
          canonicalAnswer: "מהירה",
          evidenceQuote: "זריזה מאוד ורצה מהר מעץ לעץ",
        },
        {
          type: SHORT_ANSWER,
          prompt: "במשפט על החיה הזריזה, איך היא רצה בין העצים?",
          options: [],
          canonicalAnswer: "מהר",
          evidenceQuote: "ורצה מהר מעץ לעץ",
        },
      ],
    },
    {
      title: "הערב הקריר",
      text: "הערב היה קריר ורוח נשבה. סבתא הרגישה צמרמורת בגב, אז היא התכסתה בשמיכה חמה. אחרי כמה דקות הצמרמורת חלפה והיא חייכה.",
      strategyHint: "כדאי לקרוא את המשפטים שנמצאים ליד המילה ולחפש בהם רמז.",
      variationSignature: "דמות: סבתא; מקום: בית; מילה: צמרמורת",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "מה זו צמרמורת?",
          options: ["הרגשה של רעד מקור", "סוג של שמיכה", "מין עוגה"],
          canonicalAnswer: "הרגשה של רעד מקור",
          evidenceQuote: "הרגישה צמרמורת בגב אז היא התכסתה בשמיכה חמה",
        },
        {
          type: SHORT_ANSWER,
          prompt: "עם איזה מזג אוויר קשורה הצמרמורת בקטע?",
          options: [],
          canonicalAnswer: "קור",
          evidenceQuote: "הערב היה קריר ורוח נשבה",
        },
      ],
    },
  ],
  "simple-inference": [
    {
      title: "יום לבן",
      text: "יעל לבשה כובע צמר וכפפות עבות. היא נשפה על הידיים שלה ואדים יצאו מהפה שלה. בחוץ התנוצצו פתיתים לבנים על הגג. היא צחקה ואמרה שהיא אוהבת את הימים האלה.",
      strategyHint: "כדאי לחבר בין כמה פרטים בקטע ולשאול מה הם מראים יחד.",
      variationSignature: "דמות: יעל; מקום: בחוץ; מסקנה: עונה",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "איזו עונה כנראה מתוארת בקטע?",
          options: ["חורף", "קיץ", "אביב"],
          canonicalAnswer: "חורף",
          evidenceQuote: "לבשה כובע צמר וכפפות עבות",
        },
        {
          type: SHORT_ANSWER,
          prompt: "איך אפשר לדעת שהיה קר בחוץ?",
          options: [],
          canonicalAnswer: "יעל לבשה כובע וכפפות ואדים יצאו מהפה שלה",
          evidenceQuote: "ואדים יצאו מהפה שלה",
        },
      ],
    },
    {
      title: "האוטובוס של דוד",
      text: "דוד עמד ליד הדלת עם התיק על הגב. הוא הסתכל שוב ושוב בשעון. כשהאוטובוס הגיע הוא רץ אליו מהר. אחר כך הוא נשם לרווחה ואמר הספקתי.",
      strategyHint: "כדאי לחבר בין כמה פרטים בקטע ולשאול מה הם מראים יחד.",
      variationSignature: "דמות: דוד; מקום: תחנה; מסקנה: לחץ",
      activities: [
        {
          type: MULTIPLE_CHOICE,
          prompt: "איך דוד הרגיש לפני שהאוטובוס הגיע?",
          options: ["לחוץ", "שמח", "רגוע"],
          canonicalAnswer: "לחוץ",
          evidenceQuote: "הסתכל שוב ושוב בשעון",
        },
        {
          type: SHORT_ANSWER,
          prompt: "למה דוד אמר הספקתי?",
          options: [],
          canonicalAnswer: "הוא הגיע בזמן לאוטובוס",
          evidenceQuote: "נשם לרווחה ואמר הספקתי",
        },
      ],
    },
  ],
};

export default MOCK_LEARNING_ITEMS_BY_MISSION_ID;

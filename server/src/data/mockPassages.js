const mockPassages = [
  {
    id: "mock-passage-1",
    title: "הקסם בספרייה",
    text: "גאיה נכנסה לספרייה ומצאה ספר ישן על פיות. כשהיא פתחה אותו, נפל ממנו עלה ירוק.",
    readingLevel: "beginner",
    readingGame: {
      instruction: "מצאי בטקסט שתי מילים שמתחילות באות ס׳",
    },
    questions: [
      {
        id: "mock-question-1",
        passageId: "mock-passage-1",
        prompt: "מה נפל מתוך הספר?",
        expectedMeaning: "עלה ירוק",
      },
      {
        id: "mock-question-2",
        passageId: "mock-passage-1",
        prompt: "איפה גאיה מצאה את הספר?",
        expectedMeaning: "בספרייה",
      },
    ],
  },

{
  id: "mock-passage-2",
  title: "המפה של הכוכב העתיק",
  text: "עומר בנה רובוט קטן בשם רוֹבּוֹ. יום אחד הם יצאו יחד לתחנת חלל ישנה. מאחורי דלת מתכת כבדה, רוֹבּוֹ מצא מפה עתיקה של כוכב רחוק. עומר קרא את הסימנים שעל המפה וגילה שפעם חיו על הכוכב חוקרים שחיפשו מים בחלל. הוא ורוֹבּוֹ החליטו לשמור את המפה ולחקור אותה במסע הבא.",
  readingLevel: "intermediate",
  readingGame: {
    instruction: "מצא בטקסט שלוש מילים שקשורות לחלל",
  },
  questions: [
    {
      id: "mock-question-3",
      passageId: "mock-passage-2",
      prompt: "מה בנה עומר?",
      expectedMeaning: "רובוט קטן בשם רובו",
    },
    {
      id: "mock-question-4",
      passageId: "mock-passage-2",
      prompt: "איפה רוֹבּוֹ מצא את המפה?",
      expectedMeaning: "מאחורי דלת מתכת כבדה בתחנת החלל",
    },
    {
      id: "mock-question-5",
      passageId: "mock-passage-2",
      prompt: "מה גילה עומר על הכוכב?",
      expectedMeaning: "שפעם חיו עליו חוקרים שחיפשו מים בחלל",
    },
    {
      id: "mock-question-6",
      passageId: "mock-passage-2",
      prompt: "מה החליטו עומר ורוֹבּוֹ לעשות בסוף?",
      expectedMeaning: "לשמור את המפה ולחקור אותה במסע הבא",
    },
  ],
},
];

module.exports = mockPassages;

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
];

module.exports = mockPassages;

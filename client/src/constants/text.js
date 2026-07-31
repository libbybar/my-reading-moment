import { isGenderedEntry } from './textEntry'

export const LOCALIZED_TEXT = {
  he: {
    appName: 'רק רגע לקרוא',
    readingSession: {
      heading: 'תרגול קריאה',
      loading: 'תרגול קריאה נטען...',
      error: 'לא הצלחנו לטעון את תרגול הקריאה.',
      storyLabel: 'הסיפור',
      questionsLabel: 'שאלות',
      nextQuestionButtonLabel: 'השאלה הבאה',
      questionsCompleteMessage: 'כל הכבוד! ענית על כל השאלות!',
      answerInputPlaceholder: {
        female: 'כתבי את התשובה שלך כאן',
        male: 'כתוב את התשובה שלך כאן',
      },
      answerInputAriaLabel: 'תשובה',
      submitAnswerButtonLabel: 'בדיקת תשובה',
      checkingLabel: 'עדיין בבדיקה...',
      correctFeedbackMessage: 'כל הכבוד! זו תשובה נכונה!',
      retryFeedbackMessage: {
        female: 'לא בדיוק, בואי ננסה שוב',
        male: 'לא בדיוק, בוא ננסה שוב',
      },
      requestNextQuestionButtonLabel: 'שאלה נוספת',
      generatingNextQuestionLabel: 'מכינים שאלה חדשה...',
      answerCycleErrorMessage: {
        female: 'משהו השתבש. נסי שוב מאוחר יותר.',
        male: 'משהו השתבש. נסה שוב מאוחר יותר.',
      },
      noMoreQuestionsFallbackMessage: {
        female: 'אין כרגע שאלה נוספת על הסיפור הזה. נסי שוב מאוחר יותר.',
        male: 'אין כרגע שאלה נוספת על הסיפור הזה. נסה שוב מאוחר יותר.',
      },
      returnToPathButtonLabel: 'חזרה למסלול',
      attemptLimitFeedbackMessage: 'אין דבר! אפשר לנסות את השלב הזה שוב בפעם אחרת.',
    },
    childSelection: {
      heading: 'למי ניצור תרגול היום?',
      loading: 'הרשימה נטענת...',
      error: 'לא הצלחנו לטעון את הרשימה.',
      emptyMessage: 'עדיין אין למי להכין תרגול.',
      editButtonLabel: 'עריכה',
      saveButtonLabel: 'שמירה',
      cancelButtonLabel: 'ביטול',
      savingLabel: 'שומרים...',
      addButtonLabel: 'הוספת ילד/ה',
      nameFieldPlaceholder: 'שם',
      genderFieldLabel: 'מגדר דקדוקי',
      genderFemaleOption: 'נקבה',
      genderMaleOption: 'זכר',
      readingLevelFieldLabel: 'רמת קריאה',
      readingLevelBeginnerOption: 'מתחיל/ה',
      readingLevelIntermediateOption: 'בינוני/ת',
      readingLevelAdvancedOption: 'מתקדם/ת',
      interestsFieldPlaceholder: 'תחומי עניין, מופרדים בפסיק',
      saveError: 'השמירה נכשלה. נסו שוב.',
    },
    login: {
      heading: 'כניסה להורים',
      emailPlaceholder: 'אימייל',
      emailAriaLabel: 'אימייל',
      passwordPlaceholder: 'סיסמה',
      passwordAriaLabel: 'סיסמה',
      submitButtonLabel: 'כניסה',
      submittingLabel: 'מתחברים...',
      error: 'האימייל או הסיסמה שגויים.',
      registerLinkLabel: 'עדיין אין לך חשבון? הרשמה',
    },
    register: {
      heading: 'הרשמה להורים',
      emailPlaceholder: 'אימייל',
      emailAriaLabel: 'אימייל',
      passwordPlaceholder: 'סיסמה (לפחות 8 תווים)',
      passwordAriaLabel: 'סיסמה',
      submitButtonLabel: 'הרשמה',
      submittingLabel: 'נרשמים...',
      invalidInputError: 'האימייל אינו תקין או שהסיסמה קצרה מדי (נדרשים לפחות 8 תווים).',
      emailTakenError: 'כבר קיים חשבון עם האימייל הזה.',
      genericError: 'ההרשמה נכשלה. נסו שוב.',
      loginLinkLabel: 'יש לך כבר חשבון? כניסה',
    },
    childHome: {
      heading: {
        female: 'בואי נתרגל!',
        male: 'בוא נתרגל!',
      },
      loading: 'טוען את המרחב שלך...',
      error: 'לא הצלחנו לטעון את המרחב האישי.',
      activeStationAccessibleLabel: 'התחלת תרגול קריאה',
      switchChildButtonLabel: 'החלפת ילד/ה',
      stepLabelPrefix: 'שלב',
      lockedStepStatusLabel: 'נעול',
      completedStepStatusLabel: 'הושלם',
    },
  },
}

export const DEFAULT_LANGUAGE = 'he'

// Gendered messages must go through resolveText, never the legacy TEXT alias.
function buildLegacyCompatibleTree(node, path) {
  const result = {}

  Object.keys(node).forEach((key) => {
    const value = node[key]
    const keyPath = path ? `${path}.${key}` : key

    if (typeof value === 'string') {
      result[key] = value
      return
    }

    if (isGenderedEntry(value)) {
      Object.defineProperty(result, key, {
        enumerable: true,
        get() {
          throw new Error(
            `TEXT.${keyPath} is a gendered message and is not available through the legacy ` +
              'TEXT alias. Use resolveText instead.',
          )
        },
      })
      return
    }

    result[key] = buildLegacyCompatibleTree(value, keyPath)
  })

  return result
}

// Transitional alias for neutral strings; remove after all consumers use resolveText.
export const TEXT = buildLegacyCompatibleTree(LOCALIZED_TEXT[DEFAULT_LANGUAGE], '')

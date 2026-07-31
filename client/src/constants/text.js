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

import { isGenderedEntry } from './textEntry'

export const LOCALIZED_TEXT = {
  he: {
    appName: 'רק רגע לקרוא',
    readingSession: {
      heading: 'תרגול קריאה',
      selectionHeading: 'למי נכין תרגול?',
      selectionHelperText: 'להתחלת תרגול - נא לבחור ילד/ה',
      createButtonLabel: 'יצירת תרגול קריאה',
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
      readingGameLabel: 'משחק קריאה',
    },
    childSelection: {
      heading: 'למי ניצור תרגול היום?',
      loading: 'הרשימה נטענת...',
      error: 'לא הצלחנו לטעון את הרשימה.',
      emptyMessage: 'עדיין אין למי להכין תרגול.',
    },
  },
}

export const DEFAULT_LANGUAGE = 'he'

// Builds the transitional compatibility tree: neutral strings pass through
// unchanged, but a gendered { female, male } entry is replaced with a getter
// that throws on access. This guarantees the legacy `TEXT` alias can never
// silently hand a gendered object to code that expects a plain string —
// gendered messages are only reachable through `resolveText`.
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

// Transitional compatibility alias: existing components still read `TEXT.readingSession...`
// directly and assume every value is a plain string. Neutral strings keep working
// unchanged; gendered entries throw instead of leaking a { female, male } object.
// New gender-aware code must use `resolveText` instead of reading from `TEXT`
// directly. Once existing consumers are migrated to `resolveText`, this alias
// should be removed.
export const TEXT = buildLegacyCompatibleTree(LOCALIZED_TEXT[DEFAULT_LANGUAGE], '')

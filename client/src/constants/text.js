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
      skipButtonLabel: 'דילוג',
      skippingLabel: 'הופ הופ! ו-דילגנו',
      skippedFeedbackMessage: 'בסדר, דילגנו על הסיפור הזה. אפשר לנסות סיפור אחר בהמשך.',
      finishedReadingButtonLabel: 'סיימתי לקרוא',
      retryFinishedReadingButtonLabel: 'ננסה שוב',
      loadingQuestionMessage: 'מכינים שאלה...',
      questionErrorMessage: {
        female: 'לא הצלחנו להכין שאלה. נסי שוב.',
        male: 'לא הצלחנו להכין שאלה. נסה שוב.',
      },
    },
    childSelection: {
      heading: 'למי ניצור תרגול היום?',
      loading: 'הרשימה נטענת...',
      error: 'לא הצלחנו לטעון את הרשימה.',
      emptyMessage: 'עדיין אין למי להכין תרגול.',
      editButtonLabel: 'עריכה',
      saveButtonLabel: 'שמירה',
      cancelButtonLabel: 'ביטול',
      savingLabel: 'נשמר...',
      addButtonLabel: 'הוספת ילד/ה',
      nameFieldPlaceholder: 'שם',
      genderFieldLabel: 'מגדר דקדוקי',
      genderFemaleOption: 'נקבה',
      genderMaleOption: 'זכר',
      readingLevelFieldLabel: 'רמת קריאה התחלתית',
      readingLevelBeginnerOption: 'מתחיל/ה',
      readingLevelIntermediateOption: 'בינוני/ת',
      readingLevelAdvancedOption: 'מתקדם/ת',
      interestsFieldLabel: 'תחומי עניין',
      interestSpaceLabel: 'חלל',
      interestSportsLabel: 'ספורט',
      interestNatureLabel: 'טבע',
      interestAnimalsLabel: 'בעלי חיים',
      interestUnicornsLabel: 'חד-קרן',
      interestMagicLabel: 'קסם',
      interestFantasyLabel: 'פנטזיה',
      interestFlowersLabel: 'פרחים',
      interestDisneyCharactersLabel: 'דמויות דיסני',
      interestTolkienLabel: 'עולם של טולקין',
      interestDiscworldLabel: 'עולם הדיסק',
      interestDuneLabel: 'חולית',
      saveError: 'השמירה נכשלה. יש לנסות שוב.',
      deleteButtonLabel: 'מחיקה',
      confirmDeleteQuestion: 'למחוק את',
      confirmDeleteYesLabel: 'כן, למחוק',
      deletingLabel: 'בדיוק נמחק עכשיו...',
      deleteError: 'המחיקה נכשלה. יש לנסות שוב.',
    },
    login: {
      heading: 'כניסה להורים',
      emailPlaceholder: 'אימייל',
      emailAriaLabel: 'אימייל',
      passwordPlaceholder: 'סיסמה',
      passwordAriaLabel: 'סיסמה',
      submitButtonLabel: 'כניסה',
      submittingLabel: 'התחברות...',
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
      genericError: 'ההרשמה נכשלה. יש לנסות שוב.',
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
      // "בא לך" is one of the few Hebrew phrasings that doesn't conjugate by
      // the addressee's gender — plain string is correct here, not a gap.
      avatarPickerHeading: 'איזה אווטאר בא לך?',
    },
    avatars: {
      starLabel: 'כוכב',
      dragonLabel: 'דרקון',
      unicornLabel: 'חד-קרן',
      chrysanthemumLabel: 'חרצית',
    },
    parentZone: {
      entryButtonAriaLabel: 'אזור הורים',
      heading: 'אזור הורים',
      gateChecking: 'בודקים...',
      gateUnavailableMessage: 'לא הצלחנו לפתוח את אזור ההורים. יש לנסות שוב.',
      gateError: 'לא הצלחנו לבדוק את הקוד. יש לנסות שוב.',
      enterPinPrompt: 'נא להזין את קוד ההורה',
      pinFieldPlaceholder: 'קוד בן 4 ספרות',
      pinFieldAriaLabel: 'קוד ההורה בן 4 ספרות',
      gateSubmitButtonLabel: 'כניסה',
      wrongPinMessage: 'הקוד שהוזן שגוי - אולי כדאי לקרוא להורה',
      tooManyAttemptsMessage: 'יותר מדי ניסיונות. יש להמתין דקה ולנסות שוב',
      forgotPinButtonLabel: 'שכחתי את הקוד',
      setPinPrompt: 'כדי להגן על אזור ההורים, יש לבחור קוד בן 4 ספרות. לאימות נדרשת סיסמת החשבון.',
      forgotPinPrompt: 'לבחירת קוד חדש נדרשת סיסמת החשבון.',
      passwordFieldPlaceholder: 'סיסמת החשבון',
      passwordFieldAriaLabel: 'סיסמת החשבון',
      newPinFieldPlaceholder: 'קוד חדש בן 4 ספרות',
      newPinFieldAriaLabel: 'קוד חדש בן 4 ספרות',
      savePinButtonLabel: 'שמירת הקוד',
      wrongPasswordMessage: 'הסיסמה שגויה',
      backToPinButtonLabel: 'חזרה להזנת קוד',
      changePinButtonLabel: 'שינוי קוד',
      currentPinFieldPlaceholder: 'הקוד הנוכחי',
      currentPinFieldAriaLabel: 'הקוד הנוכחי',
      wrongCurrentPinMessage: 'הקוד הנוכחי שגוי',
      pinChangedMessage: 'הקוד עודכן',
      lockButtonLabel: 'נעילת חשבון',
      lockError: 'הנעילה נכשלה. יש לנסות שוב.',
      backButtonLabel: 'חזרה',
      logoutButtonLabel: 'התנתקות',
      loggingOutLabel: 'מתנתקים...',
      logoutError: 'ההתנתקות נכשלה. יש לנסות שוב.',
      viewProgressButtonLabel: 'דו"ח התקדמות',
    },
    childProgress: {
      heading: 'התקדמות',
      loading: 'טעינת ההתקדמות...',
      error: 'לא הצלחנו לטעון את ההתקדמות.',
      backButtonLabel: 'חזרה',
      currentLevelLabel: 'רמה נוכחית',
      journeyProgressLabel: 'תחנות שהושלמו',
      noHistoryMessage: 'עדיין אין נתונים להצגה.',
      chartAccessibleLabel: 'גרף התקדמות רמת קריאה לאורך זמן',
      chartResultSuccessLabel: 'הצלחה',
      chartResultFailureLabel: 'כישלון',
      chartResultSkippedLabel: 'דילוג',
      showTableLabel: 'הצגת טבלה',
      tableDateHeader: 'תאריך',
      tableLevelHeader: 'רמה',
      tableResultHeader: 'תוצאה',
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

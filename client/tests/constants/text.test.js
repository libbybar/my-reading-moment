import { describe, it, expect } from 'vitest'
import { TEXT } from '../../src/constants/text'

describe('TEXT (legacy compatibility alias)', () => {
  it('exposes neutral strings directly', () => {
    expect(TEXT.readingSession.submitAnswerButtonLabel).toBe('בדיקת תשובה')
  })

  it('exposes the manually-set neutral storyLabel wording', () => {
    expect(TEXT.readingSession.storyLabel).toBe('הסיפור')
  })

  it('exposes appName at the top level', () => {
    expect(TEXT.appName).toBe('רק רגע לקרוא')
  })

  it('throws instead of returning a gendered object for answerInputPlaceholder', () => {
    expect(() => TEXT.readingSession.answerInputPlaceholder).toThrow()
  })

  it('throws instead of returning a gendered object for retryFeedbackMessage', () => {
    expect(() => TEXT.readingSession.retryFeedbackMessage).toThrow()
  })

  it('throws instead of returning a gendered object for answerCycleErrorMessage', () => {
    expect(() => TEXT.readingSession.answerCycleErrorMessage).toThrow()
  })

  it('throws instead of returning a gendered object for noMoreQuestionsFallbackMessage', () => {
    expect(() => TEXT.readingSession.noMoreQuestionsFallbackMessage).toThrow()
  })
})

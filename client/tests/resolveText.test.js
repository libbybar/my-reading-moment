import { describe, it, expect } from 'vitest'
import { resolveText } from '../src/constants/resolveText'

describe('resolveText', () => {
  it('resolves a neutral message directly', () => {
    const result = resolveText('readingSession.submitAnswerButtonLabel')

    expect(result).toBe('בדיקת תשובה')
  })

  it('resolves storyLabel as a neutral string', () => {
    const result = resolveText('readingSession.storyLabel')

    expect(result).toBe('הסיפור')
  })

  it('resolves the answer input aria label as a neutral string', () => {
    const result = resolveText('readingSession.answerInputAriaLabel')

    expect(result).toBe('תשובה')
  })

  it('resolves the female variant of a gendered message', () => {
    const result = resolveText('readingSession.answerInputPlaceholder', {
      grammaticalGender: 'female',
    })

    expect(result).toBe('כתבי את התשובה שלך כאן')
  })

  it('resolves the male variant of a gendered message', () => {
    const result = resolveText('readingSession.answerInputPlaceholder', {
      grammaticalGender: 'male',
    })

    expect(result).toBe('כתוב את התשובה שלך כאן')
  })

  it('defaults to the default language when none is specified', () => {
    const result = resolveText('readingSession.submitAnswerButtonLabel', {})

    expect(result).toBe('בדיקת תשובה')
  })

  it('resolves using an explicitly provided language', () => {
    const result = resolveText('readingSession.submitAnswerButtonLabel', { language: 'he' })

    expect(result).toBe('בדיקת תשובה')
  })

  it('throws for a missing key', () => {
    expect(() => resolveText('readingSession.doesNotExist')).toThrow()
  })

  it('throws for an unsupported language', () => {
    expect(() =>
      resolveText('readingSession.submitAnswerButtonLabel', { language: 'fr' }),
    ).toThrow()
  })

  it('throws a specific error when grammaticalGender is missing for a gendered message', () => {
    expect(() => resolveText('readingSession.answerInputPlaceholder')).toThrow(
      /requires a valid grammaticalGender/,
    )
  })

  it('throws a specific error when grammaticalGender is invalid for a gendered message', () => {
    expect(() =>
      resolveText('readingSession.answerInputPlaceholder', { grammaticalGender: 'neutral' }),
    ).toThrow(/requires a valid grammaticalGender/)
  })
})

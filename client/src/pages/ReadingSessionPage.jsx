import { useEffect, useRef, useState } from 'react'
import { TEXT } from '../constants/text'
import { resolveText } from '../constants/resolveText'
import Button from '../components/ui/Button'
import SelectField from '../components/ui/SelectField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import QuestionStep from './QuestionStep'
import {
  fetchReadingExercise,
  submitAnswer,
  fetchNextQuestion,
} from '../services/readingSessionService'
import { fetchChildProfiles } from '../services/childProfileService'
import {
  ExerciseContent,
  ExerciseTitle,
  SectionHeading,
  StoryCard,
  QuestionsCard,
  StoryText,
  SelectionPanel,
  SelectionHeading,
  SelectionHelperText,
} from '../styles/ReadingSessionPageStyle'

function isValidCanonicalQuestion(question) {
  return (
    question !== null &&
    typeof question === 'object' &&
    typeof question.id === 'string' &&
    question.id.trim().length > 0 &&
    typeof question.prompt === 'string' &&
    question.prompt.trim().length > 0
  )
}

function isValidEvaluationResult(result, question) {
  if (!result || typeof result !== 'object') {
    return false
  }

  if (result.questionId !== question.id) {
    return false
  }

  if (typeof result.isCorrect !== 'boolean') {
    return false
  }

  if (result.feedbackType !== 'correct' && result.feedbackType !== 'retry') {
    return false
  }

  return result.feedbackType === (result.isCorrect ? 'correct' : 'retry')
}

function isValidReplacementQuestion(response, exercise, question) {
  if (!response || typeof response !== 'object') {
    return false
  }

  if (!isValidCanonicalQuestion(response.question)) {
    return false
  }

  if (response.sessionId !== undefined && response.sessionId !== exercise.sessionId) {
    return false
  }

  return response.question.id !== question.id
}

function ReadingSessionPage() {
  const [childId, setChildId] = useState('')
  const [childProfiles, setChildProfiles] = useState([])
  const [exercise, setExercise] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionStatus, setQuestionStatus] = useState('answering')
  const [answerCycleMessage, setAnswerCycleMessage] = useState(null)
  const isSubmittingRef = useRef(false)
  const isGeneratingRef = useRef(false)

  useEffect(() => {
    // React's StrictMode (enabled in main.jsx) intentionally mounts every
    // component twice in development, firing this effect twice back-to-back.
    // Without this guard, both fetches' responses would apply their state
    // updates — harmless when both happen to resolve with the same data, but
    // not resilient to the component unmounting for real before either
    // settles. `ignore` is the standard pattern for a fetch-in-effect.
    let ignore = false

    fetchChildProfiles()
      .then((data) => {
        if (ignore) {
          return
        }

        setChildProfiles(data.childProfiles)

        if (data.childProfiles.length > 0) {
          setChildId(data.childProfiles[0].id)
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(TEXT.readingSession.error)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const childOptions = childProfiles.map((profile) => ({
    value: profile.id,
    label: profile.name,
  }))

  const handleCreateExercise = () => {
    setLoading(true)

    fetchReadingExercise(childId)
      .then((data) => {
        setExercise(data)
        setCurrentQuestion(data.question)
        setQuestionStatus('answering')
        setAnswerText('')
        setAnswerCycleMessage(null)
      })
      .catch(() => setError(TEXT.readingSession.error))
      .finally(() => setLoading(false))
  }

  const handleSubmitAnswer = () => {
    // questionStatus guards re-renders; isSubmittingRef guards the same tick,
    // before React has had a chance to commit that state update.
    if (questionStatus === 'checking' || isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    setQuestionStatus('checking')

    submitAnswer({ sessionId: exercise.sessionId, answerText })
      .then((result) => {
        if (!isValidEvaluationResult(result, currentQuestion)) {
          setAnswerCycleMessage(
            resolveText('readingSession.answerCycleErrorMessage', {
              grammaticalGender: exercise.grammaticalGender,
            }),
          )
          setQuestionStatus('error')
          return
        }

        if (result.feedbackType === 'correct') {
          setAnswerCycleMessage(resolveText('readingSession.correctFeedbackMessage'))
          setQuestionStatus('correct')
          return
        }

        setAnswerCycleMessage(
          resolveText('readingSession.retryFeedbackMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        )
        setQuestionStatus('retry')
      })
      .catch(() => {
        setAnswerCycleMessage(
          resolveText('readingSession.answerCycleErrorMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        )
        setQuestionStatus('error')
      })
      .finally(() => {
        isSubmittingRef.current = false
      })
  }

  const handleRequestReplacementQuestion = () => {
    if (questionStatus === 'generating' || isGeneratingRef.current) {
      return
    }

    isGeneratingRef.current = true
    setQuestionStatus('generating')

    fetchNextQuestion(exercise.sessionId)
      .then((response) => {
        if (!isValidReplacementQuestion(response, exercise, currentQuestion)) {
          setAnswerCycleMessage(
            resolveText('readingSession.answerCycleErrorMessage', {
              grammaticalGender: exercise.grammaticalGender,
            }),
          )
          setQuestionStatus('error')
          return
        }

        setCurrentQuestion(response.question)
        setAnswerText('')
        setAnswerCycleMessage(null)
        setQuestionStatus('answering')
      })
      .catch(() => {
        setAnswerCycleMessage(
          resolveText('readingSession.answerCycleErrorMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        )
        setQuestionStatus('error')
      })
      .finally(() => {
        isGeneratingRef.current = false
      })
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <FeedbackMessage tone="error">{error}</FeedbackMessage>
        </Card>
      </PageShell>
    )
  }

  if (!exercise) {
    return (
      <PageShell>
        <Card>
          <SelectionPanel>
            <SelectionHeading>{TEXT.readingSession.selectionHeading}</SelectionHeading>
            <SelectionHelperText>{TEXT.readingSession.selectionHelperText}</SelectionHelperText>
            <SelectField
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              options={childOptions}
            />
            <Button onClick={handleCreateExercise} disabled={loading}>
              {loading ? TEXT.readingSession.loading : TEXT.readingSession.createButtonLabel}
            </Button>
          </SelectionPanel>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card>
        <ExerciseContent>
          <ExerciseTitle>{exercise.title}</ExerciseTitle>

          <StoryCard>
            <SectionHeading>{TEXT.readingSession.storyLabel}</SectionHeading>
            <StoryText>{exercise.story}</StoryText>
          </StoryCard>

          <QuestionsCard>
            <SectionHeading>{TEXT.readingSession.questionsLabel}</SectionHeading>
            {isValidCanonicalQuestion(currentQuestion) ? (
              <QuestionStep
                question={currentQuestion}
                answerText={answerText}
                onAnswerChange={(e) => setAnswerText(e.target.value)}
                onSubmit={handleSubmitAnswer}
                status={questionStatus}
                placeholder={resolveText('readingSession.answerInputPlaceholder', {
                  grammaticalGender: exercise.grammaticalGender,
                })}
                ariaLabel={resolveText('readingSession.answerInputAriaLabel')}
                submitLabel={resolveText('readingSession.submitAnswerButtonLabel')}
                checkingLabel={resolveText('readingSession.checkingLabel')}
                feedbackMessage={answerCycleMessage}
                onRequestReplacement={handleRequestReplacementQuestion}
                replacementActionLabel={resolveText('readingSession.requestNextQuestionButtonLabel')}
                generatingLabel={resolveText('readingSession.generatingNextQuestionLabel')}
              />
            ) : (
              <FeedbackMessage tone="error">
                {resolveText('readingSession.noMoreQuestionsFallbackMessage', {
                  grammaticalGender: exercise.grammaticalGender,
                })}
              </FeedbackMessage>
            )}
          </QuestionsCard>
        </ExerciseContent>
      </Card>
    </PageShell>
  )
}

export default ReadingSessionPage

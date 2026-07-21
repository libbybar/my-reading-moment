import { useState } from 'react'
import { TEXT } from '../constants/text'
import Button from '../components/ui/Button'
import SelectField from '../components/ui/SelectField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import QuestionStep from './QuestionStep'
import { fetchReadingExercise } from '../services/readingSessionService'
import {
  ExerciseContent,
  ExerciseTitle,
  SectionHeading,
  StoryCard,
  QuestionsCard,
  ReadingGameCard,
  StoryText,
  SelectionPanel,
  SelectionHeading,
  SelectionHelperText,
} from '../styles/ReadingSessionPageStyle'

const CHILD_OPTIONS = [{ value: 'mock-child-profile-gaya', label: 'גאיה' }]

function ReadingSessionPage() {
  const [childId, setChildId] = useState('mock-child-profile-gaya')
  const [exercise, setExercise] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)

  const handleCreateExercise = () => {
    setLoading(true)

    fetchReadingExercise(childId)
      .then((data) => {
        setExercise(data)
        setQuestionIndex(0)
      })
      .catch(() => setError(TEXT.readingSession.error))
      .finally(() => setLoading(false))
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
              options={CHILD_OPTIONS}
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
            <QuestionStep
              question={exercise.questions[questionIndex]}
              questionNumber={questionIndex}
              totalQuestions={exercise.questions.length}
              onNext={() => setQuestionIndex((index) => index + 1)}
            />
          </QuestionsCard>

          {questionIndex >= exercise.questions.length && (
            <ReadingGameCard>
              <SectionHeading>{TEXT.readingSession.readingGameLabel}</SectionHeading>
              <p>{exercise.readingGame.instruction}</p>
            </ReadingGameCard>
          )}
        </ExerciseContent>
      </Card>
    </PageShell>
  )
}

export default ReadingSessionPage

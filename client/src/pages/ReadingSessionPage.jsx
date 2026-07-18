import { useState } from 'react'
import { TEXT } from '../constants/text'
import Button from '../components/ui/Button'
import SelectField from '../components/ui/SelectField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'

const CHILD_OPTIONS = [{ value: '1', label: 'גאיה' }]

function ReadingSessionPage() {
  const [childId, setChildId] = useState('1')
  const [exercise, setExercise] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCreateExercise = () => {
    setLoading(true)

    fetch('/api/reading-sessions/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Request failed')
        }
        return response.json()
      })
      .then(setExercise)
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
          <SelectField
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            options={CHILD_OPTIONS}
          />
          <Button onClick={handleCreateExercise} disabled={loading}>
            {loading ? TEXT.readingSession.loading : TEXT.readingSession.createButtonLabel}
          </Button>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card>
        <h1>{exercise.title}</h1>

        <h2>{TEXT.readingSession.storyLabel}</h2>
        <p>{exercise.story}</p>

        <h2>{TEXT.readingSession.questionsLabel}</h2>
        <ul>
          {exercise.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>

        <h2>{TEXT.readingSession.readingGameLabel}</h2>
        <p>{exercise.readingGame.instruction}</p>
      </Card>
    </PageShell>
  )
}

export default ReadingSessionPage

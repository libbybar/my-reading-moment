import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { QuestionText, AnswerPanel } from '../styles/ReadingSessionPageStyle'

function QuestionStep({
  question,
  answerText,
  onAnswerChange,
  onSubmit,
  status,
  placeholder,
  ariaLabel,
  submitLabel,
  checkingLabel,
  feedbackMessage,
  onRequestReplacement,
  replacementActionLabel,
  generatingLabel,
}) {
  if (status === 'correct') {
    return <FeedbackMessage tone="success">{feedbackMessage}</FeedbackMessage>
  }

  if (status === 'retry' || status === 'generating') {
    const isGenerating = status === 'generating'

    return (
      <AnswerPanel>
        <FeedbackMessage tone="error">{feedbackMessage}</FeedbackMessage>
        <Button onClick={onRequestReplacement} disabled={isGenerating}>
          {isGenerating ? generatingLabel : replacementActionLabel}
        </Button>
      </AnswerPanel>
    )
  }

  if (status === 'error') {
    return <FeedbackMessage tone="error">{feedbackMessage}</FeedbackMessage>
  }

  const isChecking = status === 'checking'

  return (
    <AnswerPanel>
      <QuestionText>{question.prompt}</QuestionText>
      <TextField
        value={answerText}
        onChange={onAnswerChange}
        disabled={isChecking}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
      />
      <Button onClick={onSubmit} disabled={isChecking}>
        {isChecking ? checkingLabel : submitLabel}
      </Button>
    </AnswerPanel>
  )
}

export default QuestionStep

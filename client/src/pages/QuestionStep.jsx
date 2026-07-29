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
  onReturnToPath,
  returnToPathLabel,
  isReturningToPath,
}) {
  if (status === 'correct') {
    return (
      <AnswerPanel>
        <FeedbackMessage tone="success">{feedbackMessage}</FeedbackMessage>
        <Button onClick={onReturnToPath} disabled={isReturningToPath}>
          {returnToPathLabel}
        </Button>
      </AnswerPanel>
    )
  }

  if (status === 'attemptLimitReached') {
    // Gentle, not punitive: an "info" tone (not "error"), and the only way
    // forward is back to the path — no further retry loop on this screen.
    // The child can start the same step over again from there.
    return (
      <AnswerPanel>
        <FeedbackMessage tone="info">{feedbackMessage}</FeedbackMessage>
        <Button onClick={onReturnToPath} disabled={isReturningToPath}>
          {returnToPathLabel}
        </Button>
      </AnswerPanel>
    )
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

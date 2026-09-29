import { motion } from 'motion/react'
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
  onSkip,
  skipLabel,
  skippingLabel,
}) {
  if (status === 'correct') {
    return (
      <AnswerPanel>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12 }}
        >
          <FeedbackMessage tone="success">{feedbackMessage}</FeedbackMessage>
        </motion.div>
        <Button onClick={onReturnToPath} disabled={isReturningToPath}>
          {returnToPathLabel}
        </Button>
      </AnswerPanel>
    )
  }

  if (status === 'attemptLimitReached' || status === 'skipped') {
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
  const isSkipping = status === 'skipping'

  function handleAnswerKeyDown(event) {
    if (event.key === 'Enter' && !isChecking && !isSkipping) {
      onSubmit()
    }
  }

  return (
    <AnswerPanel>
      <QuestionText>{question.prompt}</QuestionText>
      <TextField
        value={answerText}
        onChange={onAnswerChange}
        onKeyDown={handleAnswerKeyDown}
        disabled={isChecking || isSkipping}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
      />
      <Button onClick={onSubmit} disabled={isChecking || isSkipping}>
        {isChecking ? checkingLabel : submitLabel}
      </Button>
      {(status === 'answering' || isSkipping) && (
        <Button onClick={onSkip} disabled={isSkipping}>
          {isSkipping ? skippingLabel : skipLabel}
        </Button>
      )}
    </AnswerPanel>
  )
}

export default QuestionStep

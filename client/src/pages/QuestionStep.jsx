import { TEXT } from '../constants/text'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { QuestionProgress, QuestionText } from '../styles/ReadingSessionPageStyle'

function QuestionStep({ question, questionNumber, totalQuestions, onNext }) {
  const isComplete = questionNumber >= totalQuestions

  if (isComplete) {
    return (
      <FeedbackMessage tone="success">
        {TEXT.readingSession.questionsCompleteMessage}
      </FeedbackMessage>
    )
  }

  return (
    <>
      <QuestionProgress>
        {questionNumber + 1} / {totalQuestions}
      </QuestionProgress>
      <QuestionText>{question}</QuestionText>
      <Button onClick={onNext}>{TEXT.readingSession.nextQuestionButtonLabel}</Button>
    </>
  )
}

export default QuestionStep

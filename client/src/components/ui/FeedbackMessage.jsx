import { StyledFeedbackMessage } from '../../styles/components/FeedbackMessageStyle'

function FeedbackMessage({ children, tone = 'info' }) {
  return <StyledFeedbackMessage tone={tone}>{children}</StyledFeedbackMessage>
}

export default FeedbackMessage

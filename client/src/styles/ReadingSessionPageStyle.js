import styled from 'styled-components'
import Card from '../components/ui/Card'

// Widens on larger screens only, same approach as AuthPageStyle.js's
// AuthCard — the base Card's 480px cap stays untouched for every other page.
// A paragraph of Hebrew text benefits from more room than a login form does.
export const ExerciseCard = styled(Card)`
  @media (min-width: 768px) {
    max-width: 700px;
    padding: 48px;
  }
`

export const ExerciseContent = styled.div`
  font-family: ${(props) => props.theme.fonts.main};
`

export const ExerciseTitle = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 28px;
  margin: 0 0 16px;

  @media (max-width: 480px) {
    font-size: 24px;
  }
`

export const SectionHeading = styled.h2`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 18px;
  margin: 0 0 8px;
`

const SectionCard = styled.section`
  border-radius: 16px;
  padding: 20px 24px;
  margin-top: 20px;

  @media (max-width: 480px) {
    padding: 16px 18px;
  }

  @media (max-width: 360px) {
    padding: 14px;
  }
`

// Unlike QuestionsCard, the story no longer sits in its own colored box — on
// a page with just one passage, a background box read as visual noise and
// its padding compounded with the ch-capped text width to make the passage
// look cramped. Kept as its own styled export (not just inline in the page)
// only for the top spacing from the title above.
export const StoryCard = styled.div`
  margin-top: 20px;
`

export const QuestionsCard = styled(SectionCard)`
  background: ${(props) => props.theme.colors.secondaryLight};
`

export const ReadingGameCard = styled(SectionCard)`
  background: ${(props) => props.theme.colors.accentLight};
`

export const StoryText = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 18px;
  line-height: 2.2;
  margin: 0;
  overflow-wrap: break-word;
`

export const QuestionProgress = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};
  font-size: 14px;
  margin: 0 0 4px;
`

export const AnswerPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
`

export const QuestionText = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 17px;
  line-height: 1.7;
  margin: 0 0 12px;
`

export const QuestionsList = styled.ul`
  list-style: none;
  counter-reset: question-counter;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const QuestionItem = styled.li`
  counter-increment: question-counter;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 17px;
  line-height: 1.7;

  &::before {
    content: counter(question-counter);
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${(props) => props.theme.colors.secondary};
    color: ${(props) => props.theme.colors.surface};
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

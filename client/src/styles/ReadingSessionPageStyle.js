import styled, { keyframes } from 'styled-components'
import { motion } from 'motion/react'
import Card from '../components/ui/Card'

export const ExerciseCard = styled(motion.create(Card))`
  position: relative;
  z-index: 1;

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

// Purely visual "something is happening" indicator while the story streams
// in — no caption, the movement itself is the message. Loops rather than
// claiming a real percentage, since the actual wait time is unknown up front.
export const StoryLoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  width: 100%;
  position: relative;
  z-index: 1;
`

const fillLoop = keyframes`
  0% { width: 6%; }
  50% { width: 96%; }
  100% { width: 6%; }
`

export const LoadingBarTrack = styled.div`
  width: 100%;
  max-width: 220px;
  height: 14px;
  border-radius: 999px;
  background: ${(props) => props.theme.colors.primaryLight};
  overflow: hidden;
  position: relative;
`

export const LoadingBarFill = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.primary},
    ${(props) => props.theme.colors.accent}
  );
  animation: ${fillLoop} 2.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    width: 60%;
  }
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

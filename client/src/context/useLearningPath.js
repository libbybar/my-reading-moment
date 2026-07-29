import { useContext } from 'react'
import { LearningPathContext } from './learningPathContext'

export function useLearningPath() {
  const context = useContext(LearningPathContext)

  if (!context) {
    throw new Error('useLearningPath must be used within a LearningPathProvider')
  }

  return context
}

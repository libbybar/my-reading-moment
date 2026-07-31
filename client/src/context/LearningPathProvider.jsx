import { useMemo, useState } from 'react'
import { LearningPathContext } from './learningPathContext'

export function LearningPathProvider({ children, initialProgressByChildId = {} }) {
  // Initial value only; this is not a controlled prop.
  const [progressByChildId, setProgressByChildId] = useState(initialProgressByChildId)

  const value = useMemo(
    () => ({
      progressByChildId,
      completeNextLearningPathStep: (childId) => {
        setProgressByChildId((previous) => ({
          ...previous,
          [childId]: { completedStepCount: (previous[childId]?.completedStepCount ?? 0) + 1 },
        }))
      },
    }),
    [progressByChildId],
  )

  return <LearningPathContext.Provider value={value}>{children}</LearningPathContext.Provider>
}

import { useMemo, useState } from 'react'
import { LearningPathContext } from './learningPathContext'

export function LearningPathProvider({ children, initialProgressByChildId = {} }) {
  // `initialProgressByChildId` seeds the very first render only, for tests —
  // the same way ActiveChildProvider's `initialActiveChildId` does. It is
  // not a controlled prop; `completeNextLearningPathStep` is still the only
  // way to change progress after mount.
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

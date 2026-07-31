import { useMemo, useState } from 'react'
import { ActiveChildContext } from './activeChildContext'

export function ActiveChildProvider({ children, initialActiveChildId = null }) {
  // Initial value only; this is not a controlled prop.
  const [activeChildId, setActiveChildId] = useState(initialActiveChildId)

  const value = useMemo(
    () => ({
      activeChildId,
      selectActiveChild: setActiveChildId,
    }),
    [activeChildId],
  )

  return <ActiveChildContext.Provider value={value}>{children}</ActiveChildContext.Provider>
}

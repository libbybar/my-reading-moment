import { useMemo, useState } from 'react'
import { ActiveChildContext } from './activeChildContext'

export function ActiveChildProvider({ children }) {
  const [activeChildId, setActiveChildId] = useState(null)

  const value = useMemo(
    () => ({
      activeChildId,
      selectActiveChild: setActiveChildId,
    }),
    [activeChildId],
  )

  return <ActiveChildContext.Provider value={value}>{children}</ActiveChildContext.Provider>
}

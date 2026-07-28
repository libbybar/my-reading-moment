import { useMemo, useState } from 'react'
import { ActiveChildContext } from './activeChildContext'

export function ActiveChildProvider({ children, initialActiveChildId = null }) {
  // `initialActiveChildId` seeds the very first render only — like
  // MemoryRouter's `initialEntries` — it does not make this a controlled
  // prop; later changes to it are ignored, `selectActiveChild` is still the
  // only way to update the value after mount.
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

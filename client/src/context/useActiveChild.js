import { useContext } from 'react'
import { ActiveChildContext } from './activeChildContext'

export function useActiveChild() {
  const context = useContext(ActiveChildContext)

  if (!context) {
    throw new Error('useActiveChild must be used within an ActiveChildProvider')
  }

  return context
}

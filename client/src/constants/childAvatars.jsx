import { UserRound } from 'lucide-react'

// Every profile currently gets the same placeholder avatar; callers already
// pass the child profile through so a later per-child lookup (by id,
// avatarUrl, etc.) only changes this function's body, not any call site.
export function getChildAvatar() {
  return <UserRound />
}

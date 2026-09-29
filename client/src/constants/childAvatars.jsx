import { UserRound } from 'lucide-react'
import { AVATARS } from './avatars'

export function getChildAvatar(childProfile) {
  const avatar = AVATARS.find((candidate) => candidate.id === childProfile?.avatarId)

  if (!avatar) {
    return <UserRound />
  }

  return <img src={avatar.src} alt="" />
}

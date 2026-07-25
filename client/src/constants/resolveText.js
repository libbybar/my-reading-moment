import { LOCALIZED_TEXT, DEFAULT_LANGUAGE } from './text'
import { isGenderedEntry } from './textEntry'

function getByPath(tree, key) {
  return key.split('.').reduce((node, segment) => {
    if (node === null || typeof node !== 'object') {
      return undefined
    }

    return node[segment]
  }, tree)
}

export function resolveText(key, { language = DEFAULT_LANGUAGE, grammaticalGender } = {}) {
  const languageTree = LOCALIZED_TEXT[language]

  if (!languageTree) {
    throw new Error(`resolveText: unsupported language "${language}"`)
  }

  const entry = getByPath(languageTree, key)

  if (entry === undefined) {
    throw new Error(`resolveText: missing text for key "${key}" in language "${language}"`)
  }

  if (typeof entry === 'string') {
    return entry
  }

  if (!isGenderedEntry(entry)) {
    throw new Error(
      `resolveText: malformed text entry for key "${key}" in language "${language}"`,
    )
  }

  if (grammaticalGender !== 'female' && grammaticalGender !== 'male') {
    throw new Error(
      `resolveText: key "${key}" requires a valid grammaticalGender ("female" or "male")`,
    )
  }

  return entry[grammaticalGender]
}

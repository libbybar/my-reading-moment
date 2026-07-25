export function isGenderedEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.female === 'string' &&
    typeof entry.male === 'string'
  )
}

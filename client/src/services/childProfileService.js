const CHILD_PROFILES_URL = '/api/child-profiles'

async function parseJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

export function fetchChildProfiles() {
  return fetch(CHILD_PROFILES_URL).then(parseJsonResponse)
}

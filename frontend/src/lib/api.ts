import { env } from '../config/env'
import { getIdToken } from '../auth/cognito'

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (authenticated) {
    const token = await getIdToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

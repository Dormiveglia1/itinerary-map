import type {
  GenerateRequest,
  ItineraryResult,
  PlaceSearchResult,
} from './types.ts'

// Empty in development: Vite proxies /api to the backend (vite.config.ts).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// A failed request. `code` is the backend's error code ("invalid_input",
// "google_unavailable", ...), or "network_error" when the server wasn't reached.
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, 'network_error', "Couldn't reach the server. Check your connection and try again.")
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    // Errors are {"error": code, "message": text} (data contract).
    const { error, message } = (body ?? {}) as { error?: string; message?: string }
    throw new ApiError(
      response.status,
      error ?? 'http_error',
      message ?? `The server responded with an error (${response.status}).`,
    )
  }
  return body as T
}

export function searchPlaces(
  city: string,
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({ city, q: query })
  return request(`/api/places/search?${params}`, { signal })
}

export function generateItinerary(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<ItineraryResult> {
  return request('/api/itineraries/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

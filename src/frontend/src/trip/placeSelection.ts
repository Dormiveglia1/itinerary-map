import type { Poi } from '../api/index.ts'
import { timeFromMinutes } from './tripForm.ts'

// The PoC plans a day from roughly 5–10 chosen places (SRS §16). More than the
// cap is blocked; fewer than the recommendation is allowed but flagged.
export const MAX_SELECTED_POIS = 10
export const RECOMMENDED_MIN_POIS = 5

// Adds or removes `id`, ignoring additions once the cap is reached.
export function toggleSelection(ids: string[], id: string): string[] {
  if (ids.includes(id)) {
    return ids.filter((other) => other !== id)
  }
  if (ids.length >= MAX_SELECTED_POIS) {
    return ids
  }
  return [...ids, id]
}

// Drops IDs that aren't among the candidates, e.g. places chosen before the
// price range was lowered.
export function validSelection(ids: string[], candidates: Poi[]): string[] {
  return ids.filter((id) => candidates.some((poi) => poi.placeId === id))
}

export function totalVisitMinutes(ids: string[], candidates: Poi[]): number {
  return candidates
    .filter((poi) => ids.includes(poi.placeId))
    .reduce((sum, poi) => sum + poi.visitDurationMinutes, 0)
}

// 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h".
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest} min`
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

// Minutes since midnight → "9:00 AM" in the viewer's locale.
export function formatTimeOfDay(minutes: number): string {
  return timeFromMinutes(minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

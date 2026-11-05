import type { PlaceSearchResult } from '../api/index.ts'
import type { SelectedPlace } from './tripContext.ts'
import { timeFromMinutes } from './tripForm.ts'

// The PoC plans a day from roughly 5–10 chosen places (SRS §16). More than the
// cap is blocked; fewer than the recommendation is allowed but flagged.
export const MAX_SELECTED_POIS = 10
export const RECOMMENDED_MIN_POIS = 5

// Priority is 1–10 in the data contract.
export const MIN_PRIORITY = 1
export const MAX_PRIORITY = 10
export const DEFAULT_PRIORITY = 5

export function isSelected(selections: SelectedPlace[], placeId: string): boolean {
  return selections.some((s) => s.place.place_id === placeId)
}

// Adds `place` at the default priority, or removes it if already selected.
// Additions are ignored once the cap is reached.
export function toggleSelection(
  selections: SelectedPlace[],
  place: PlaceSearchResult,
): SelectedPlace[] {
  if (isSelected(selections, place.place_id)) {
    return selections.filter((s) => s.place.place_id !== place.place_id)
  }
  if (selections.length >= MAX_SELECTED_POIS) {
    return selections
  }
  return [...selections, { place, priority: DEFAULT_PRIORITY }]
}

export function withPriority(
  selections: SelectedPlace[],
  placeId: string,
  priority: number,
): SelectedPlace[] {
  const clamped = Math.min(MAX_PRIORITY, Math.max(MIN_PRIORITY, Math.round(priority)))
  return selections.map((s) =>
    s.place.place_id === placeId ? { ...s, priority: clamped } : s,
  )
}

export function priorityLabel(priority: number): string {
  if (priority >= 8) return 'Must see'
  if (priority >= 4) return 'Want to see'
  return 'Nice to see'
}

// Minutes since midnight → "9:00 AM" in the viewer's locale.
export function formatTimeOfDay(minutes: number): string {
  return timeFromMinutes(minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

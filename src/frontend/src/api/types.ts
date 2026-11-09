// Frontend view of the backend API, following the data contract
// (docs/data-contract.md, v0.1). Times of day are integer minutes since local
// midnight, dates are ISO `YYYY-MM-DD` in the city's time zone, money is CAD.

export type TransportMode = 'walk' | 'drive' | 'transit'

// Not passed to the optimizer; the backend uses it to scale default visit
// durations.
export type Pace = 'relaxed' | 'normal' | 'packed'

export interface LatLng {
  lat: number
  lng: number
}

// [start, end] in minutes since midnight.
export type TimeWindow = [number, number]

export interface MealWindows {
  lunch?: TimeWindow
  dinner?: TimeWindow
}

// TripConfig as sent in POST /api/itineraries/generate (no contract_version).
export interface TripConfig {
  city: string
  timezone: string
  dates: string[]
  day_start: number
  day_end: number
  budget: number
  transport_mode: TransportMode
  pace: Pace
  accommodation: LatLng
  meal_windows?: MealWindows
}

export type PoiKind = 'attraction' | 'restaurant'

// A result from GET /api/places/search.
export interface PlaceSearchResult {
  place_id: string
  name: string
  kind: PoiKind
  lat: number
  lng: number
}

export interface Selection {
  place_id: string
  // 1–10, set by the user.
  priority: number
  // Omitted to let the backend default it by category and pace.
  visit_minutes?: number
}

export interface GenerateRequest {
  trip: TripConfig
  selections: Selection[]
}

export interface Activity {
  poi_id: string
  name: string
  start: number
  end: number
  travel_minutes_before: number
}

export interface ItineraryDay {
  date: string
  activities: Activity[]
  return_travel_minutes: number
}

export type UnscheduledReason =
  | 'closed_on_trip_dates'
  | 'no_time'
  | 'over_budget'
  | 'unreachable'

export interface Unscheduled {
  poi_id: string
  name?: string
  reason: UnscheduledReason
}

export interface Violation {
  code: string
  // Shown to the user.
  message: string
}

// "infeasible" is an expected outcome (no schedule fits the constraints), not
// an HTTP error: `days` is empty and `violations` explains why.
export interface ItineraryResult {
  status: 'ok' | 'infeasible'
  algorithm: string | null
  total_priority: number
  total_cost: number
  days: ItineraryDay[]
  unscheduled: Unscheduled[]
  violations: Violation[]
}

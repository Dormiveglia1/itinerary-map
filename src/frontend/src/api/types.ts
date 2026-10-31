// Frontend view of the backend API, following the data contract
// (docs: Data Contract v0.1). Times of day are integer minutes since local
// midnight, dates are ISO `YYYY-MM-DD` in the city's time zone.
//
// Deviation from v0.1: budget/cost are replaced by Google's 1–4 price level,
// since Places doesn't provide a per-person cost.

export type TransportMode = 'walk' | 'drive' | 'transit'

export type Pace = 'relaxed' | 'moderate' | 'packed'

// Google Places price level: 1 = inexpensive … 4 = very expensive.
export type PriceLevel = 1 | 2 | 3 | 4

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
// `pace` isn't in v0.1's TripConfig, but the backend needs it to default
// visit_minutes, so the frontend sends it with the trip.
export interface TripConfig {
  city: string
  timezone: string
  dates: string[]
  day_start: number
  day_end: number
  max_price_level: PriceLevel
  transport_mode: TransportMode
  pace: Pace
  accommodation: LatLng
  meal_windows?: MealWindows
}

export type PoiKind = 'attraction' | 'restaurant'

// A result from GET /api/places/search. 'lodging' is used when searching for
// accommodation and isn't in v0.1 yet.
export interface PlaceSearchResult {
  place_id: string
  name: string
  kind: PoiKind | 'lodging'
  lat: number
  lng: number
}

// A candidate place returned by the backend's POI search (SRS §8 POI Retrieval).
export interface Poi {
  placeId: string
  name: string
  category: PoiKind
  location: LatLng
  visitDurationMinutes: number
  // null when Google has no price level for the place (e.g. free attractions).
  priceLevel: PriceLevel | null
}

export interface ItineraryRequest {
  trip: TripConfig
  poiIds: string[]
}

export interface VisitEntry {
  kind: 'visit'
  poi: Poi
  startTime: string
  endTime: string
}

export interface TravelEntry {
  kind: 'travel'
  fromPlaceId: string
  toPlaceId: string
  mode: TransportMode
  startTime: string
  endTime: string
}

export type ItineraryEntry = VisitEntry | TravelEntry

export interface ItineraryDay {
  date: string
  entries: ItineraryEntry[]
}

export interface Itinerary {
  days: ItineraryDay[]
}

// "infeasible" is an expected outcome (no schedule fits the constraints), not
// a transport error, so it is part of the result rather than a thrown error.
export type ItineraryResult =
  | { status: 'ok'; itinerary: Itinerary }
  | { status: 'infeasible'; reason: string }

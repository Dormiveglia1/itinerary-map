// Frontend view of the backend API. The contract with the backend has not been
// agreed yet, so these shapes are a draft and expected to change.

export type TransportMode = 'walking' | 'driving' | 'transit'

export type Pace = 'relaxed' | 'moderate' | 'packed'

export interface LatLng {
  lat: number
  lng: number
}

export interface Accommodation {
  placeId?: string
  name: string
  location: LatLng
}

// SRS §8 Trip Configuration. Dates are ISO `YYYY-MM-DD`, times are `HH:MM`.
// The PoC generates a single day, so startDate and endDate are the same.
export interface TripConfig {
  destinationCity: string
  startDate: string
  endDate: string
  dayStartTime: string
  dayEndTime: string
  budget: number
  interests: string[]
  accommodation: Accommodation
  pace: Pace
  transportMode: TransportMode
}

export type PoiCategory = 'attraction' | 'restaurant'

// A candidate place returned by the backend's POI search (SRS §8 POI Retrieval).
export interface Poi {
  placeId: string
  name: string
  category: PoiCategory
  location: LatLng
  visitDurationMinutes: number
  estimatedCost: number
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

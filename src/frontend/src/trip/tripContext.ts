import { createContext } from 'react'
import type { PlaceSearchResult, TripConfig } from '../api/index.ts'

// What the planning flow (setup → places → itinerary) carries between pages.
// `accommodation` is the place picked in the form; TripConfig only keeps its
// coordinates, so the name is held here for redisplay.
export interface TripState {
  trip: TripConfig | null
  accommodation: PlaceSearchResult | null
  selectedPoiIds: string[]
}

export interface TripContextValue extends TripState {
  setTrip: (trip: TripConfig, accommodation: PlaceSearchResult) => void
  setSelectedPoiIds: (ids: string[]) => void
  reset: () => void
}

export const EMPTY_TRIP_STATE: TripState = {
  trip: null,
  accommodation: null,
  selectedPoiIds: [],
}

export const TripContext = createContext<TripContextValue | null>(null)

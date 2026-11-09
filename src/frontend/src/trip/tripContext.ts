import { createContext } from 'react'
import type { PlaceSearchResult, TripConfig } from '../api/index.ts'

// A place the traveller picked, with how much they want to see it. The whole
// search result is kept because places can't be looked up again by ID.
export interface SelectedPlace {
  place: PlaceSearchResult
  // 1–10, sent to the backend as the selection's priority.
  priority: number
}

// What the planning flow (setup → places → itinerary) carries between pages.
// `accommodation` is the place picked in the form; TripConfig only keeps its
// coordinates, so the name is held here for redisplay.
export interface TripState {
  trip: TripConfig | null
  accommodation: PlaceSearchResult | null
  selections: SelectedPlace[]
}

export interface TripContextValue extends TripState {
  setTrip: (trip: TripConfig, accommodation: PlaceSearchResult) => void
  setSelections: (selections: SelectedPlace[]) => void
  reset: () => void
}

export const EMPTY_TRIP_STATE: TripState = {
  trip: null,
  accommodation: null,
  selections: [],
}

export const TripContext = createContext<TripContextValue | null>(null)

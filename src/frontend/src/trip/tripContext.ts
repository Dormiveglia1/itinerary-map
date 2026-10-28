import { createContext } from 'react'
import type { TripConfig } from '../api/index.ts'

// What the planning flow (setup → places → itinerary) carries between pages.
export interface TripState {
  trip: TripConfig | null
  selectedPoiIds: string[]
}

export interface TripContextValue extends TripState {
  setTrip: (trip: TripConfig) => void
  setSelectedPoiIds: (ids: string[]) => void
  reset: () => void
}

export const EMPTY_TRIP_STATE: TripState = { trip: null, selectedPoiIds: [] }

export const TripContext = createContext<TripContextValue | null>(null)

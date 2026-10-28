import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  EMPTY_TRIP_STATE,
  TripContext,
  type TripContextValue,
  type TripState,
} from './tripContext.ts'

// Kept in sessionStorage so a page refresh mid-flow doesn't lose the trip.
// There is no account or saved-trip storage in the PoC.
export const TRIP_STORAGE_KEY = 'itinerary-map:trip'

function loadState(): TripState {
  try {
    const raw = sessionStorage.getItem(TRIP_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TripState) : EMPTY_TRIP_STATE
  } catch {
    return EMPTY_TRIP_STATE
  }
}

function saveState(state: TripState) {
  try {
    sessionStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (e.g. private browsing); the flow still works
    // in memory.
  }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<TripContextValue>(
    () => ({
      ...state,
      // A new trip invalidates places chosen for the previous one.
      setTrip: (trip) => setState({ trip, selectedPoiIds: [] }),
      setSelectedPoiIds: (selectedPoiIds) =>
        setState((prev) => ({ ...prev, selectedPoiIds })),
      reset: () => setState(EMPTY_TRIP_STATE),
    }),
    [state],
  )

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

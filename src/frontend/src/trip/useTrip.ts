import { useContext } from 'react'
import { TripContext, type TripContextValue } from './tripContext.ts'

export function useTrip(): TripContextValue {
  const context = useContext(TripContext)
  if (!context) {
    throw new Error('useTrip must be used inside a TripProvider')
  }
  return context
}

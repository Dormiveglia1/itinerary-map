import { MOCK_POIS } from './mockData.ts'
import type {
  ItineraryEntry,
  ItineraryRequest,
  ItineraryResult,
  Poi,
  TripConfig,
} from './types.ts'

// Stand-in for the backend until it exists. The schedule below is deliberately
// naive (selection order, fixed travel time) so the UI has something to render;
// real itineraries come from the optimization engine via the backend.

const MOCK_TRAVEL_MINUTES = 15

export async function fetchCandidatePois(_trip: TripConfig): Promise<Poi[]> {
  return MOCK_POIS
}

export async function generateItinerary(
  request: ItineraryRequest,
): Promise<ItineraryResult> {
  const { trip, poiIds } = request
  if (poiIds.length === 0) {
    return { status: 'infeasible', reason: 'No places were selected.' }
  }

  const pois = poiIds.map((id) => MOCK_POIS.find((poi) => poi.placeId === id))
  if (pois.some((poi) => poi === undefined)) {
    throw new Error('Unknown place ID in request.')
  }

  const dayEnd = toMinutes(trip.dayEndTime)
  const entries: ItineraryEntry[] = []
  let now = toMinutes(trip.dayStartTime)
  let previousPlaceId = trip.accommodation.placeId ?? 'accommodation'

  for (const poi of pois as Poi[]) {
    entries.push({
      kind: 'travel',
      fromPlaceId: previousPlaceId,
      toPlaceId: poi.placeId,
      mode: trip.transportMode,
      startTime: toTime(now),
      endTime: toTime(now + MOCK_TRAVEL_MINUTES),
    })
    now += MOCK_TRAVEL_MINUTES
    entries.push({
      kind: 'visit',
      poi,
      startTime: toTime(now),
      endTime: toTime(now + poi.visitDurationMinutes),
    })
    now += poi.visitDurationMinutes
    previousPlaceId = poi.placeId
  }

  if (now > dayEnd) {
    return {
      status: 'infeasible',
      reason: `The selected places need until ${toTime(now)}, but the day ends at ${trip.dayEndTime}.`,
    }
  }

  return {
    status: 'ok',
    itinerary: { days: [{ date: trip.startDate, entries }] },
  }
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

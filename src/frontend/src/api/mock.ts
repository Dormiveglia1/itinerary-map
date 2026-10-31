import { MOCK_ACCOMMODATIONS, MOCK_POIS } from './mockData.ts'
import type {
  ItineraryEntry,
  ItineraryRequest,
  ItineraryResult,
  PlaceSearchResult,
  Poi,
  TripConfig,
} from './types.ts'

// Stand-in for the backend until it exists. The schedule below is deliberately
// naive (selection order, fixed travel time) so the UI has something to render;
// real itineraries come from the optimization engine via the backend.

const MOCK_TRAVEL_MINUTES = 15

// Mirrors GET /api/places/search?city=&q=. The mock ignores the city because
// every mock place is in Toronto.
export async function searchPlaces(
  _city: string,
  query: string,
): Promise<PlaceSearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) {
    return []
  }
  const places: PlaceSearchResult[] = [
    ...MOCK_ACCOMMODATIONS,
    ...MOCK_POIS.map((poi) => ({
      place_id: poi.placeId,
      name: poi.name,
      kind: poi.category,
      lat: poi.location.lat,
      lng: poi.location.lng,
    })),
  ]
  return places.filter((place) => place.name.toLowerCase().includes(q))
}

// Filters by price like the backend's POI filtering (SRS §8). Places with no
// price level are kept, since that usually means they're free.
export async function fetchCandidatePois(trip: TripConfig): Promise<Poi[]> {
  return MOCK_POIS.filter(
    (poi) => poi.priceLevel === null || poi.priceLevel <= trip.max_price_level,
  )
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

  const entries: ItineraryEntry[] = []
  let now = trip.day_start
  let previousPlaceId = 'accommodation'

  for (const poi of pois as Poi[]) {
    entries.push({
      kind: 'travel',
      fromPlaceId: previousPlaceId,
      toPlaceId: poi.placeId,
      mode: trip.transport_mode,
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

  if (now > trip.day_end) {
    return {
      status: 'infeasible',
      reason: `The selected places need until ${toTime(now)}, but the day ends at ${toTime(trip.day_end)}.`,
    }
  }

  return {
    status: 'ok',
    itinerary: { days: [{ date: trip.dates[0], entries }] },
  }
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

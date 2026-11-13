import type { ItineraryResult, TransportMode } from '../../api/types.ts'

// Frontend map model. Nullable times also support the current placeholder optimizer.
export interface MapStop {
  id: string
  name: string
  lat: number
  lng: number
  start: number | null
  end: number | null
  arrival: number | null
  waitMinutes: number | null
  travelMinutesBefore: number | null
  routePolylineBefore: string | null
}

export interface MapItinerary {
  date: string
  accommodation: { name: string; lat: number; lng: number }
  stops: MapStop[]
  returnTravelMinutes: number | null
  returnRoutePolyline: string | null
}

export interface PoiSelectionProps {
  selectedPoiId: string | null
  onSelectPoi: (id: string | null) => void
}

// Compatibility alias; the preview now retains the full API result.
export type MapApiResult = ItineraryResult

export interface MapInputContext {
  accommodation: MapItinerary['accommodation']
  dayStart: number
  city?: string
  transportMode?: TransportMode
  // v0.1 generate responses omit coordinates; reuse places retained in trip state.
  places?: { place_id: string; name: string; lat: number; lng: number }[]
}

export interface ItineraryMapProps extends PoiSelectionProps {
  trip: MapItinerary
}

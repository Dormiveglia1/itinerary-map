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

// Map-facing subset of proposed v0.2 REST output, not optimizer output.
// Separate from api/types.ts until backend support lands. Null times tolerate placeholders.
export interface MapApiResult {
  status: 'ok' | 'infeasible'
  days: {
    date: string
    activities: {
      poi_id: string
      name: string
      lat: number
      lng: number
      start: number | null
      end: number | null
      travel_minutes_before: number | null
      arrival?: number | null
      wait_minutes?: number | null
      route_polyline_before?: string | null
    }[]
    return_travel_minutes: number | null
    return_route_polyline?: string | null
  }[]
  unscheduled: { poi_id: string; name?: string; reason: string }[]
  violations: { code: string; message: string; poi_ids?: string[] }[]
}

export interface MapInputContext {
  accommodation: MapItinerary['accommodation']
  dayStart: number
}

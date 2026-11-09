import type { MapApiResult, MapInputContext, MapItinerary } from './types.ts'

// Preserve backend order. Accommodation comes from the request/session.
// This adapter trusts typed coordinates; runtime API validation is a future integration task.
export function toMapItinerary(result: MapApiResult, context: MapInputContext, dayIndex = 0): MapItinerary | null {
  const day = result.days[dayIndex]
  if (result.status !== 'ok' || !day) return null
  let previousEnd: number | null = context.dayStart
  return {
    date: day.date,
    accommodation: context.accommodation,
    stops: day.activities.map((activity) => {
      const travel = activity.travel_minutes_before
      const arrival = activity.arrival ?? (
        previousEnd !== null && travel !== null ? previousEnd + travel : null
      )
      const waitMinutes = activity.wait_minutes ?? (
        arrival !== null && activity.start !== null ? Math.max(0, activity.start - arrival) : null
      )
      previousEnd = activity.end
      return {
        id: activity.poi_id, name: activity.name, lat: activity.lat, lng: activity.lng,
        start: activity.start, end: activity.end, arrival, waitMinutes,
        travelMinutesBefore: travel, routePolylineBefore: activity.route_polyline_before ?? null,
      }
    }),
    returnTravelMinutes: day.return_travel_minutes,
    returnRoutePolyline: day.return_route_polyline ?? null,
  }
}

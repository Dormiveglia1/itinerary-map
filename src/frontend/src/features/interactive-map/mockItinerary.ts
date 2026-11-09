import type { MapApiResult, MapInputContext } from './types.ts'

export const mockContext: MapInputContext = {
  accommodation: { name: 'Demo accommodation', lat: 43.6505, lng: -79.384 },
  dayStart: 540,
}

// Map-relevant subset of a synthetic v0.2 REST response. IDs and schedule are demo-only.
// Unused totals/algorithm/plan fields are deliberately omitted from this fixture.
const normal: MapApiResult = {
  status: 'ok',
  days: [{
    date: '2026-11-14',
    activities: [
      { poi_id: 'demo-rom', name: 'Royal Ontario Museum', lat: 43.6677, lng: -79.3948,
        arrival: 570, start: 600, end: 720, wait_minutes: 30,
        travel_minutes_before: 30, route_polyline_before: null },
      { poi_id: 'demo-gallery', name: 'Art Gallery of Ontario', lat: 43.6536, lng: -79.3925,
        arrival: 745, start: 745, end: 835, wait_minutes: 0,
        travel_minutes_before: 25, route_polyline_before: null },
      { poi_id: 'demo-market', name: 'St. Lawrence Market', lat: 43.6487, lng: -79.3716,
        arrival: 865, start: 865, end: 925, wait_minutes: 0,
        travel_minutes_before: 30, route_polyline_before: null },
    ],
    return_travel_minutes: 20, return_route_polyline: null,
  }],
  unscheduled: [], violations: [],
}

const missingTimes: MapApiResult = {
  ...normal,
  days: normal.days.map((day) => ({ ...day, return_travel_minutes: null,
    activities: day.activities.map((activity) => ({ ...activity,
      start: null, end: null, arrival: null, wait_minutes: null, travel_minutes_before: null,
    })),
  })),
}

const multiDay: MapApiResult = {
  ...normal,
  days: [...normal.days, {
    date: '2026-11-15',
    activities: [
      { poi_id: 'demo-tower', name: 'CN Tower', lat: 43.6426, lng: -79.3871,
        arrival: 560, start: 570, end: 660, wait_minutes: 10,
        travel_minutes_before: 20, route_polyline_before: null },
      { poi_id: 'demo-waterfront', name: 'Harbourfront Centre', lat: 43.6387, lng: -79.3816,
        arrival: 675, start: 675, end: 735, wait_minutes: 0,
        travel_minutes_before: 15, route_polyline_before: null },
    ],
    return_travel_minutes: 25, return_route_polyline: null,
  }],
}

const fallbackTimes: MapApiResult = {
  ...normal,
  days: normal.days.map((day) => ({ ...day,
    activities: day.activities.map((activity) => ({ ...activity, arrival: undefined, wait_minutes: undefined })),
  })),
}

export const mockScenarios: Record<string, { label: string; result: MapApiResult }> = {
  multiDay: { label: 'Two-day itinerary', result: multiDay },
  normal: { label: 'Scheduled stops / no polylines', result: normal },
  fallback: { label: 'Derive arrival and waiting', result: fallbackTimes },
  missing: { label: 'Placeholder / times unavailable', result: missingTimes },
  empty: { label: 'Empty day', result: { ...normal, days: [{ ...normal.days[0], activities: [], return_travel_minutes: 0 }] } },
  noDays: { label: 'No days returned', result: { ...normal, days: [] } },
  infeasible: { label: 'Infeasible itinerary', result: {
    status: 'infeasible', days: [],
    unscheduled: [{ poi_id: 'demo-rom', name: 'Royal Ontario Museum', reason: 'no_time' }],
    violations: [{ code: 'MANDATORY_CANNOT_FIT', message: 'The essential visit cannot fit within this demo day.', poi_ids: ['demo-rom'] }],
  } },
}

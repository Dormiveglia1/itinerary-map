import type { ItineraryResult } from './types.ts'

type Obj = Record<string, unknown>
function object(value: unknown): value is Obj {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const minute = (value: unknown) => number(value) && Number.isInteger(value) && value >= 0
const nullableMinute = (value: unknown) => value === null || minute(value)
const text = (value: unknown): value is string => typeof value === 'string'
const optional = (value: unknown, check: (v: unknown) => boolean) => value === undefined || check(value)
const array = (value: unknown, check: (v: unknown) => boolean): boolean => Array.isArray(value) && value.every(check)
const coordinate = (value: unknown, limit: number) => number(value) && Math.abs(value) <= limit
const polyline = (value: unknown) => value === null || text(value)

function activity(value: unknown): boolean {
  if (!object(value)) return false
  return text(value.poi_id) && text(value.name)
    && nullableMinute(value.start) && nullableMinute(value.end)
    && nullableMinute(value.travel_minutes_before)
    && (value.start === null || value.end === null || (value.end as number) >= (value.start as number))
    && optional(value.lat, v => coordinate(v, 90)) && optional(value.lng, v => coordinate(v, 180))
    && optional(value.arrival, nullableMinute) && optional(value.wait_minutes, nullableMinute)
    && optional(value.route_polyline_before, polyline)
}

function plan(value: unknown): boolean {
  if (value === null) return true
  return object(value) && array(value.days, day => object(day) && text(day.date)
    && array(day.steps, step => object(step) && minute(step.time) && text(step.text)
      && ['depart', 'travel', 'wait', 'visit', 'return'].includes(String(step.kind))
      && optional(step.warning, polyline))
    && object(day.summary) && minute(day.summary.stops) && minute(day.summary.travel_minutes)
    && number(day.summary.cost) && day.summary.cost >= 0 && minute(day.summary.slack_minutes))
}

// Validate at the network boundary; preserve the original object including extra fields.
// v0.1/placeholder compatibility is explicit, not silently treated as v0.2 compliance.
export function parseItineraryResponse(value: unknown): ItineraryResult {
  if (!object(value)
    || !['ok', 'infeasible'].includes(String(value.status))
    || !(value.algorithm === null || text(value.algorithm))
    || !number(value.total_priority) || value.total_priority < 0
    || !optional(value.total_cost, v => number(v) && v >= 0)
    || !optional(value.total_known_cost, v => number(v) && v >= 0)
    || !optional(value.has_unknown_cost, v => typeof v === 'boolean')
    || (value.total_cost === undefined && !(number(value.total_known_cost) && typeof value.has_unknown_cost === 'boolean'))
    || !array(value.days, day => object(day) && /^\d{4}-\d{2}-\d{2}$/.test(String(day.date))
      && array(day.activities, activity) && nullableMinute(day.return_travel_minutes)
      && optional(day.return_route_polyline, polyline) && optional(day.slack_minutes, nullableMinute))
    || !array(value.unscheduled, item => object(item) && text(item.poi_id) && optional(item.name, text)
      && ['closed_on_trip_dates', 'no_time', 'over_budget', 'unreachable'].includes(String(item.reason))
      && optional(item.lat, v => coordinate(v, 90)) && optional(item.lng, v => coordinate(v, 180)))
    || !array(value.violations, item => object(item) && text(item.code) && text(item.message)
      && optional(item.poi_ids, v => array(v, text)))
    || !optional(value.plan, plan)
    || (value.status === 'infeasible' && (value.days as unknown[]).length !== 0)) {
    throw new Error('The server returned an invalid itinerary response. Check the data contract with the backend team.')
  }
  for (const day of value.days as Obj[]) {
    const ids = (day.activities as Obj[]).map(item => item.poi_id)
    if (new Set(ids).size !== ids.length) throw new Error('The server returned duplicate stops in one day.')
  }
  return value as unknown as ItineraryResult
}

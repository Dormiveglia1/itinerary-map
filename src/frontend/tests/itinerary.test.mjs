import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseItineraryResponse } from '../src/api/itineraryResponse.ts'
import { generateItinerary, ApiError } from '../src/api/client.ts'
import { mockScenarios, mockContext } from '../src/features/interactive-map/mockItinerary.ts'
import { toMapItinerary } from '../src/features/interactive-map/toMapItinerary.ts'
import { formatTime, formatMinutes } from '../src/features/interactive-map/format.ts'

const normal = () => structuredClone(mockScenarios.normal.result)

test('fixtures parse as complete responses and retain plan/extra fields', () => {
  for (const scenario of Object.values(mockScenarios)) assert.equal(parseItineraryResponse(scenario.result), scenario.result)
  const value = { ...normal(), future_field: { keep: true } }
  assert.equal(parseItineraryResponse(value).future_field.keep, true)
  assert.ok(parseItineraryResponse(mockScenarios.plan.result).plan.days[0].steps.length)
})

test('reject malformed network data instead of rendering an invalid route', () => {
  for (const mutate of [
    r => { r.days[0].activities[0].lat = 100 },
    r => { r.days[0].activities[0].start = '10:00' },
    r => { r.days[0].activities[0].end = 1 },
    r => { r.days[0].activities.push(r.days[0].activities[0]) },
    r => { r.total_cost = -1 },
    r => { r.status = 'infeasible' },
    r => { r.plan = { days: [{ date: '2026-11-14', steps: [], summary: {} }] } },
  ]) {
    const value = normal(); mutate(value)
    assert.throws(() => parseItineraryResponse(value))
  }
  assert.throws(() => parseItineraryResponse(null))
})

test('legacy placeholder costs and coordinates are explicitly supported', () => {
  const value = normal()
  delete value.total_cost
  value.total_known_cost = 25
  value.has_unknown_cost = true
  const activity = value.days[0].activities[0]
  const place = { place_id: activity.poi_id, name: activity.name, lat: activity.lat, lng: activity.lng }
  delete activity.lat; delete activity.lng
  assert.equal(parseItineraryResponse(value).total_cost, undefined)
  assert.throws(() => toMapItinerary(value, mockContext), /Location unavailable/)
  assert.equal(toMapItinerary(value, { ...mockContext, places: [place] }).stops[0].lat, place.lat)
})

test('day conversion preserves order, polyline, input and zero/unknown times', () => {
  const value = normal(); const original = JSON.stringify(value)
  assert.deepEqual(toMapItinerary(mockScenarios.fallback.result, mockContext), toMapItinerary(value, mockContext))
  assert.equal(toMapItinerary(value, mockContext).stops[1].waitMinutes, 0)
  assert.ok(toMapItinerary(mockScenarios.missing.result, mockContext).stops.every(s => s.arrival === null && s.waitMinutes === null))
  assert.equal(JSON.stringify(value), original)
  value.days[0].activities[0].route_polyline_before = 'encoded'
  assert.equal(toMapItinerary(value, mockContext).stops[0].routePolylineBefore, 'encoded')
  const multi = mockScenarios.multiDay.result
  assert.equal(toMapItinerary(multi, mockContext, 0).stops.length, 3)
  assert.equal(toMapItinerary(multi, mockContext, 1).stops[0].id, 'demo-tower')
  assert.equal(toMapItinerary(multi, mockContext, 2), null)
  assert.equal(toMapItinerary(mockScenarios.infeasible.result, mockContext), null)
  assert.equal(formatTime(0), '00:00'); assert.equal(formatMinutes(0), '0 min')
  assert.equal(formatTime(null), 'Unavailable'); assert.equal(formatTime(1500), '01:00 (+1 day)')
})

test('generation client sends full request, validates success, distinguishes API/network/abort failures', async () => {
  const previous = globalThis.fetch
  const request = { trip: { city: 'Toronto' }, selections: [{ place_id: 'demo', priority: 6 }] }
  try {
    globalThis.fetch = async (path, init) => {
      assert.equal(path, '/api/itineraries/generate')
      assert.deepEqual(JSON.parse(init.body), request)
      return Response.json(mockScenarios.plan.result)
    }
    assert.ok((await generateItinerary(request)).plan)
    globalThis.fetch = async () => Response.json({ status: 'ok' })
    await assert.rejects(generateItinerary(request), /invalid itinerary/)
    globalThis.fetch = async () => Response.json({ error: 'google_error', message: 'Google unavailable' }, { status: 502 })
    await assert.rejects(generateItinerary(request), e => e instanceof ApiError && e.status === 502 && e.code === 'google_error')
    globalThis.fetch = async () => { throw new TypeError('offline') }
    await assert.rejects(generateItinerary(request), e => e.code === 'network_error')
    globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError') }
    await assert.rejects(generateItinerary(request), e => e.name === 'AbortError')
  } finally { globalThis.fetch = previous }
})

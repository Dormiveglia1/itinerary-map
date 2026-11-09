import { useState } from 'react'
import { mockContext, mockScenarios } from './mockItinerary.ts'
import { toMapItinerary } from './toMapItinerary.ts'
import type { MapItinerary } from './types.ts'
import './map.css'

function time(value: number | null): string {
  if (value === null) return 'Unavailable'
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export default function MapPreviewPage() {
  const [scenario, setScenario] = useState('normal')
  const result = mockScenarios[scenario].result
  const trip = toMapItinerary(result, mockContext)
  return (
    <section className="map-preview">
      <h1>Interactive map preview</h1>
      <p className="map-preview-notice">Demo data · Schematic coordinates and straight connections, not road directions. Google Maps integration is the next step.</p>
      <label className="map-preview-scenario">Preview scenario{' '}
        <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
          {Object.entries(mockScenarios).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
        </select>
      </label>
      {result.status === 'infeasible' ? <div role="status">
        <h2>No feasible itinerary</h2>
        {result.violations.map((violation, index) => <p key={`${violation.code}-${index}`}>{violation.message}</p>)}
      </div> : !trip || trip.stops.length === 0 ? <p role="status">No scheduled stops to display. Choose another preview scenario.</p>
        : <ItineraryPreview key={scenario} trip={trip} />}
      {result.unscheduled.length > 0 && <section>
        <h2>Unscheduled places</h2>
        <ul>{result.unscheduled.map((place) => <li key={place.poi_id}>{place.name ?? place.poi_id}: {place.reason.replaceAll('_', ' ')}</li>)}</ul>
      </section>}
    </section>
  )
}

function ItineraryPreview({ trip }: { trip: MapItinerary }) {
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const selected = trip.stops.find((stop) => stop.id === selectedPoiId)
  const locations = [trip.accommodation, ...trip.stops]
  const minLat = Math.min(...locations.map((point) => point.lat))
  const maxLat = Math.max(...locations.map((point) => point.lat))
  const minLng = Math.min(...locations.map((point) => point.lng))
  const maxLng = Math.max(...locations.map((point) => point.lng))
  const project = (point: { lat: number; lng: number }) => ({
    x: 12 + ((point.lng - minLng) / (maxLng - minLng || 1)) * 76,
    y: 85 - ((point.lat - minLat) / (maxLat - minLat || 1)) * 70,
  })
  const hotel = project(trip.accommodation)
  const path = [...locations, trip.accommodation].map((point) => {
    const { x, y } = project(point)
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <p>Toronto · {trip.date} · Walking · {trip.stops.length} stops</p>
      <div className="map-preview-layout">
        <div className="map-preview-canvas" role="group" aria-label="Demo itinerary map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={path} fill="none" stroke="#2d72d2" strokeWidth="0.6" strokeDasharray="1.5 1" />
          </svg>
          <span className="map-preview-hotel" style={{ left: `${hotel.x}%`, top: `${hotel.y}%` }} title={trip.accommodation.name}>H</span>
          {trip.stops.map((stop, index) => {
            const point = project(stop)
            return <button key={stop.id} className="map-preview-pin" aria-label={`${index + 1}. ${stop.name}`} aria-pressed={stop.id === selectedPoiId}
              style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => setSelectedPoiId(stop.id)}>{index + 1}</button>
          })}
          <span className="map-preview-caption">H = accommodation · Click a numbered stop</span>
        </div>
        <aside className="map-preview-sidebar">
          <h2>Your stops</h2>
          <ol>{trip.stops.map((stop) => <li key={stop.id}>
            <button aria-pressed={stop.id === selectedPoiId} onClick={() => setSelectedPoiId(stop.id)}>{stop.name}<small>{time(stop.start)}–{time(stop.end)}</small></button>
          </li>)}</ol>
          <div aria-live="polite">
            {selected ? <>
              <h2>{selected.name}</h2>
              <dl>
                <dt>Arrival</dt><dd>{time(selected.arrival)}</dd>
                <dt>Visit</dt><dd>{time(selected.start)}–{time(selected.end)}</dd>
                <dt>Visit duration</dt><dd>{selected.start === null || selected.end === null ? 'Unavailable' : `${selected.end - selected.start} min`}</dd>
                <dt>Travel before visit</dt><dd>{selected.travelMinutesBefore === null ? 'Unavailable' : `${selected.travelMinutesBefore} min`}</dd>
                <dt>Waiting</dt><dd>{selected.waitMinutes === null ? 'Unavailable' : `${selected.waitMinutes} min`}</dd>
              </dl>
              <button onClick={() => setSelectedPoiId(null)}>Clear selection</button>
            </> : <p>Select a stop on the map or in the list to see its details.</p>}
          </div>
          <p>Return to accommodation: {trip.returnTravelMinutes === null ? 'Unavailable' : `${trip.returnTravelMinutes} min (demo)`}.</p>
        </aside>
      </div>
    </div>
  )
}

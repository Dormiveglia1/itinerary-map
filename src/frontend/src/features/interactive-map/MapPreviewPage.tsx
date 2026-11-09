import { useState } from 'react'
import GoogleMapView from './GoogleMapView.tsx'
import { mockContext, mockScenarios } from './mockItinerary.ts'
import { toMapItinerary } from './toMapItinerary.ts'
import type { MapItinerary } from './types.ts'
import './map.css'

function time(value: number | null): string {
  if (value === null) return 'Unavailable'

  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
    value % 60,
  ).padStart(2, '0')}`
}

export default function MapPreviewPage() {
  const [scenario, setScenario] = useState('multiDay')
  const [dayIndex, setDayIndex] = useState(0)

  const result = mockScenarios[scenario].result
  const trip = toMapItinerary(result, mockContext, dayIndex)

  return (
    <section className="map-preview">
      <h1>Interactive map preview</h1>

      <p className="map-preview-notice">
        Demo itinerary data · Google Maps base map. Routes are not displayed yet.
      </p>

      {result.status === 'ok' && result.days.length > 0 && (
        <nav className="map-preview-days" aria-label="Itinerary days">
          {result.days.map((day, index) => (
            <button
              key={`${day.date}-${index}`}
              type="button"
              aria-current={index === dayIndex ? 'date' : undefined}
              onClick={() => setDayIndex(index)}
            >
              <strong>Day {index + 1}</strong>
              <span>{day.date}</span>
            </button>
          ))}
        </nav>
      )}

      {result.status === 'infeasible' ? (
        <div role="status">
          <h2>No feasible itinerary</h2>

          {result.violations.map((violation, index) => (
            <p key={`${violation.code}-${index}`}>
              {violation.message}
            </p>
          ))}
        </div>
      ) : !trip || trip.stops.length === 0 ? (
        <p role="status">
          {trip
            ? 'No scheduled stops for this day.'
            : 'No itinerary days to display.'}
        </p>
      ) : (
        <ItineraryPreview
          key={`${scenario}-${dayIndex}`}
          trip={trip}
        />
      )}

      {result.unscheduled.length > 0 && (
        <section>
          <h2>Unscheduled places</h2>

          <ul>
            {result.unscheduled.map((place) => (
              <li key={place.poi_id}>
                {place.name ?? place.poi_id}:{' '}
                {place.reason.replaceAll('_', ' ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="map-preview-tools">
        <summary>Development test scenarios</summary>

        <label className="map-preview-scenario">
          Preview scenario{' '}
          <select
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value)
              setDayIndex(0)
            }}
          >
            {Object.entries(mockScenarios).map(([id, value]) => (
              <option key={id} value={id}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
      </details>
    </section>
  )
}

function ItineraryPreview({ trip }: { trip: MapItinerary }) {
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)

  const selected = trip.stops.find((stop) => stop.id === selectedPoiId)

  return (
    <div>
      <p>
        Toronto · {trip.date} · Walking · {trip.stops.length} stops
      </p>

      <div className="map-preview-layout">
        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
            borderRadius: 16,
            border: '1px solid #d8e1e8',
          }}
        >
          <GoogleMapView
            trip={trip}
            selectedPoiId={selectedPoiId}
            onSelectPoi={setSelectedPoiId}
          />
        </div>

        <aside className="map-preview-sidebar">
          <h2>Your stops</h2>

          <ol>
            {trip.stops.map((stop) => (
              <li key={stop.id}>
                <button
                  type="button"
                  aria-pressed={stop.id === selectedPoiId}
                  onClick={() => setSelectedPoiId(stop.id)}
                >
                  {stop.name}
                  <small>
                    {time(stop.start)}–{time(stop.end)}
                  </small>
                </button>
              </li>
            ))}
          </ol>

          <div aria-live="polite">
            {selected ? (
              <>
                <h2>{selected.name}</h2>

                <dl>
                  <dt>Arrival</dt>
                  <dd>{time(selected.arrival)}</dd>

                  <dt>Visit</dt>
                  <dd>
                    {time(selected.start)}–{time(selected.end)}
                  </dd>

                  <dt>Visit duration</dt>
                  <dd>
                    {selected.start === null || selected.end === null
                      ? 'Unavailable'
                      : `${selected.end - selected.start} min`}
                  </dd>

                  <dt>Travel before visit</dt>
                  <dd>
                    {selected.travelMinutesBefore === null
                      ? 'Unavailable'
                      : `${selected.travelMinutesBefore} min`}
                  </dd>

                  <dt>Waiting</dt>
                  <dd>
                    {selected.waitMinutes === null
                      ? 'Unavailable'
                      : `${selected.waitMinutes} min`}
                  </dd>
                </dl>

                <button
                  type="button"
                  onClick={() => setSelectedPoiId(null)}
                >
                  Clear selection
                </button>
              </>
            ) : (
              <p>
                Select a stop on the map or in the list to see its details.
              </p>
            )}
          </div>

          <p>
            Return to accommodation:{' '}
            {trip.returnTravelMinutes === null
              ? 'Unavailable'
              : `${trip.returnTravelMinutes} min (demo)`}
            .
          </p>
        </aside>
      </div>
    </div>
  )
}
import { useState, type ComponentType } from 'react'
import type { ItineraryResult } from '../../api/types.ts'
import type { ItineraryMapProps, MapInputContext } from './types.ts'
import { toMapItinerary } from './toMapItinerary.ts'
import ItineraryStopList from './ItineraryStopList.tsx'
import PoiDetails from './PoiDetails.tsx'
import SchematicMap from './SchematicMap.tsx'
import { formatMinutes, formatTime } from './format.ts'
import './map.css'

// Parent owns the complete response. Map/list share this view's selection state.
// Pass Steven's component as MapComponent once available; no changes to his file needed.
export default function ItineraryResultView({ result, context, MapComponent = SchematicMap }: {
  result: ItineraryResult
  context: MapInputContext
  MapComponent?: ComponentType<ItineraryMapProps>
}) {
  const [dayIndex, setDayIndex] = useState(0)
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const activeDay = Math.min(dayIndex, Math.max(0, result.days.length - 1))
  let trip: ReturnType<typeof toMapItinerary> = null
  let locationError: string | null = null
  try { trip = toMapItinerary(result, context, activeDay) }
  catch (error) { locationError = error instanceof Error ? error.message : 'Location data unavailable.' }
  const selected = trip?.stops.find(stop => stop.id === selectedPoiId)
  const cost = result.total_cost ?? result.total_known_cost
  const planDay = result.plan?.days.find(day => day.date === result.days[activeDay]?.date)
  const day = result.days[activeDay]
  // Display the raw schedule even when map coordinates are unavailable.
  return <>
    <p>Trip total: {cost === undefined ? 'Unavailable' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cost)} per person
      {result.total_cost === undefined && result.has_unknown_cost ? ' (known costs only; some costs are unknown)' : ''}
      {' · '}Priority score: {result.total_priority}</p>
    {result.status === 'ok' && result.days.length > 0 && <nav className="map-preview-days" aria-label="Itinerary days">
      {result.days.map((item, index) => <button key={`${item.date}-${index}`} type="button"
        aria-current={index === activeDay ? 'date' : undefined}
        onClick={() => { setDayIndex(index); setSelectedPoiId(null) }}>
        <strong>Day {index + 1}</strong><span>{item.date}</span>
      </button>)}
    </nav>}
    {result.violations.length > 0 && <section role="status" aria-label="Itinerary constraints">
      {result.violations.map((violation, index) => <p key={`${violation.code}-${index}`}>{violation.message}</p>)}
    </section>}
    {result.status === 'infeasible' ? <h2>No feasible itinerary</h2>
      : locationError ? <section role="alert"><p>{locationError}</p>
        <h2>Scheduled places</h2><ol>{day?.activities.map(stop => <li key={stop.poi_id}>{stop.name} · {formatTime(stop.start)}–{formatTime(stop.end)}</li>)}</ol>
      </section>
      : !trip || trip.stops.length === 0 ? <p role="status">{trip ? 'No scheduled stops for this day.' : 'No itinerary days to display.'}</p>
      : <>
        <p>{context.city ?? 'Your destination'} · {trip.date} · {context.transportMode ?? 'walk'} · {trip.stops.length} stops</p>
        <div className="map-preview-layout">
          <MapComponent trip={trip} selectedPoiId={selectedPoiId} onSelectPoi={setSelectedPoiId} />
          <aside className="map-preview-sidebar">
            <ItineraryStopList stops={trip.stops} selectedPoiId={selectedPoiId} onSelectPoi={setSelectedPoiId} />
            <PoiDetails stop={selected} onClear={() => setSelectedPoiId(null)} />
            <p>Return to accommodation: {formatMinutes(trip.returnTravelMinutes)}.</p>
          </aside>
        </div>
      </>}
    {planDay && <section aria-label="Step-by-step itinerary"><h2>Day plan</h2>
      <ol>{planDay.steps.map((step, index) => <li key={index}>{formatTime(step.time)} · {step.text}{step.warning && <p>{step.warning}</p>}</li>)}</ol>
    </section>}
    {result.unscheduled.length > 0 && <section><h2>Unscheduled places</h2>
      <ul>{result.unscheduled.map(place => <li key={place.poi_id}>{place.name ?? place.poi_id}: {place.reason.replaceAll('_', ' ')}</li>)}</ul>
    </section>}
  </>
}

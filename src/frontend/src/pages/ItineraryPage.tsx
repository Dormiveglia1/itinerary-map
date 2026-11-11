import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { generateItinerary } from '../api/client.ts'
import type { GenerateRequest, ItineraryResult } from '../api/types.ts'
import { useTrip } from '../trip/useTrip.ts'
import ItineraryResultView from '../features/interactive-map/ItineraryResultView.tsx'
import type { MapInputContext } from '../features/interactive-map/types.ts'

export default function ItineraryPage() {
  const { trip, accommodation, selections } = useTrip()
  if (!trip || selections.length === 0) return <section>
    <h1>Your itinerary</h1>
    <p>Set up your trip and choose places before generating an itinerary.</p>
    <Link to={trip ? '/plan/places' : '/plan'}>{trip ? 'Choose places' : 'Set up your trip'}</Link>
  </section>
  const request: GenerateRequest = {
    trip, selections: selections.map(({ place, priority }) => ({ place_id: place.place_id, priority })),
  }
  const context: MapInputContext = {
    accommodation: { ...trip.accommodation, name: accommodation?.name ?? 'Accommodation' },
    dayStart: trip.day_start, city: trip.city, transportMode: trip.transport_mode,
    places: selections.map(item => item.place),
  }
  return <GenerateResult key={JSON.stringify(request)} request={request} context={context} />
}

function GenerateResult({ request, context }: { request: GenerateRequest; context: MapInputContext }) {
  const [result, setResult] = useState<ItineraryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function generate() {
    if (controller.current) return
    const current = new AbortController()
    controller.current = current
    setLoading(true)
    setError(null)
    try {
      const response = await generateItinerary(request, current.signal)
      if (!current.signal.aborted) {
        setResult(response)
        setRevision(value => value + 1)
      }
    } catch (failure) {
      if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not generate an itinerary.')
    } finally {
      if (!current.signal.aborted) {
        controller.current = null
        setLoading(false)
      }
    }
  }

  return <section className="map-preview">
    <h1>Your itinerary</h1>
    <p>Generate a schedule from your selected places. This calls the backend and its external services.</p>
    <button type="button" disabled={loading} onClick={generate}>
      {loading ? 'Generating…' : error ? 'Try again' : result ? 'Generate again' : 'Generate itinerary'}
    </button>
    {loading && <p role="status">Preparing your itinerary. Please wait.</p>}
    {error && <div role="alert"><p>{error}</p>{result && <p>Your previous result is kept below.</p>}</div>}
    {result && <>
      <p className="map-preview-notice">Location connections are schematic, not road directions. Google Maps integration is pending.</p>
      <ItineraryResultView key={revision} result={result} context={context} />
    </>}
    <p><Link to="/plan/places">Back to places</Link> · <Link to="/plan">Edit trip</Link></p>
  </section>
}

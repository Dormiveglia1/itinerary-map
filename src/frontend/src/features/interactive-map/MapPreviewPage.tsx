import { useState } from 'react'
import ItineraryMap from './ItineraryMap.tsx'
import { mockContext, mockScenarios } from './mockItinerary.ts'
import ItineraryResultView from './ItineraryResultView.tsx'
import './map.css'

export default function MapPreviewPage() {
  const [scenario, setScenario] = useState('multiDay')
  return <section className="map-preview">
    <h1>Interactive map preview</h1>
    <p className="map-preview-notice">Demo itinerary data · Google Maps base map.</p>
    <ItineraryResultView
      key={scenario}
      result={mockScenarios[scenario].result}
      context={mockContext}
      MapComponent={ItineraryMap}
    />
    <details className="map-preview-tools">
      <summary>Development test scenarios</summary>
      <label className="map-preview-scenario">Preview scenario{' '}
        <select value={scenario} onChange={event => setScenario(event.target.value)}>
          {Object.entries(mockScenarios).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
        </select>
      </label>
    </details>
  </section>
}

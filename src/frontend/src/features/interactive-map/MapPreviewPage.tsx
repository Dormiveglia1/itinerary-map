import { useState } from 'react'
import { mockContext, mockScenarios } from './mockItinerary.ts'
import ItineraryResultView from './ItineraryResultView.tsx'
import './map.css'

export default function MapPreviewPage() {
  const [scenario, setScenario] = useState('multiDay')
  return <section className="map-preview">
    <h1>Interactive map preview</h1>
    <p className="map-preview-notice">Demo data · Schematic coordinates and straight connections, not road directions. Google Maps integration is the next step.</p>
    <ItineraryResultView key={scenario} result={mockScenarios[scenario].result} context={mockContext} />
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

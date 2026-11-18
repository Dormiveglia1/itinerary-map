import type { ItineraryMapProps } from './types.ts'

// Temporary stand-in. Steven owns ItineraryMap.tsx; do not implement Google Maps here.
export default function SchematicMap({ trip, selectedPoiId, onSelectPoi }: ItineraryMapProps) {
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
        <div className="map-preview-canvas" role="group" aria-label="Schematic itinerary map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={path} fill="none" stroke="#2d72d2" strokeWidth="0.6" strokeDasharray="1.5 1" />
          </svg>
          <span className="map-preview-hotel" style={{ left: `${hotel.x}%`, top: `${hotel.y}%` }} title={trip.accommodation.name}>H</span>
          {trip.stops.map((stop, index) => {
            const point = project(stop)
            return <button key={stop.id} className="map-preview-pin" aria-label={`${index + 1}. ${stop.name}`} aria-pressed={stop.id === selectedPoiId}
              style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => onSelectPoi(stop.id)}>{index + 1}</button>
          })}
          <span className="map-preview-caption">H = accommodation · Click a numbered stop</span>
        </div>
  )
}

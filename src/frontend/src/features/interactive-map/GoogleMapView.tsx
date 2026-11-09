/// <reference types="google.maps" />
import { useEffect } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps'
import type { MapItinerary } from './types.ts'

interface GoogleMapViewProps {
  trip: MapItinerary
  selectedPoiId: string | null
  onSelectPoi: (id: string | null) => void
}

interface MapCameraProps {
  trip: MapItinerary
  selectedPoiId: string | null
}

function MapCamera({ trip, selectedPoiId }: MapCameraProps) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const bounds = new google.maps.LatLngBounds()

    bounds.extend({
      lat: trip.accommodation.lat,
      lng: trip.accommodation.lng,
    })

    trip.stops.forEach((stop) => {
      bounds.extend({ lat: stop.lat, lng: stop.lng })
    })

    map.fitBounds(bounds, 60)
  }, [map, trip])

  useEffect(() => {
    if (!map || !selectedPoiId) return

    const stop = trip.stops.find((item) => item.id === selectedPoiId)

    if (stop) {
      map.panTo({ lat: stop.lat, lng: stop.lng })
    }
  }, [map, trip, selectedPoiId])

  return null
}

export default function GoogleMapView({
  trip,
  selectedPoiId,
  onSelectPoi,
}: GoogleMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div
        role="status"
        style={{
          minHeight: 490,
          padding: 24,
          background: '#eef4fa',
          borderRadius: 16,
        }}
      >
        <h2>Google Maps key is missing</h2>
        <p>
          Configure VITE_GOOGLE_MAPS_API_KEY in .env.local and restart the
          development server.
        </p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ width: '100%', height: 490 }}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{
            lat: trip.accommodation.lat,
            lng: trip.accommodation.lng,
          }}
          defaultZoom={13}
          gestureHandling="cooperative"
          onClick={() => onSelectPoi(null)}
        >
          <MapCamera trip={trip} selectedPoiId={selectedPoiId} />

          <AdvancedMarker
            position={{
              lat: trip.accommodation.lat,
              lng: trip.accommodation.lng,
            }}
            title={trip.accommodation.name}
          >
            <Pin
              background="#243b53"
              borderColor="#ffffff"
              glyphColor="#ffffff"
              glyph="H"
            />
          </AdvancedMarker>

          {trip.stops.map((stop, index) => {
            const isSelected = stop.id === selectedPoiId

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.lat, lng: stop.lng }}
                title={`${index + 1}. ${stop.name}`}
                onClick={() => onSelectPoi(stop.id)}
                zIndex={isSelected ? 10 : 1}
              >
                <Pin
                  background={isSelected ? '#d9822b' : '#2d72d2'}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  glyph={String(index + 1)}
                  scale={isSelected ? 1.2 : 1}
                />
              </AdvancedMarker>
            )
          })}
        </Map>
      </div>
    </APIProvider>
  )
}
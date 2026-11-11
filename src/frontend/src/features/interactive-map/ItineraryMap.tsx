/// <reference types="google.maps" />

import { useEffect } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps'
import type { MapItinerary, PoiSelectionProps } from './types.ts'

interface ItineraryMapProps extends PoiSelectionProps {
  itinerary: MapItinerary
}

interface MapCameraProps {
  itinerary: MapItinerary
  selectedPoiId: PoiSelectionProps['selectedPoiId']
}

function MapCamera({ itinerary, selectedPoiId }: MapCameraProps) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const bounds = new google.maps.LatLngBounds()

    bounds.extend({
      lat: itinerary.accommodation.lat,
      lng: itinerary.accommodation.lng,
    })

    itinerary.stops.forEach((stop) => {
      bounds.extend({ lat: stop.lat, lng: stop.lng })
    })

    map.fitBounds(bounds, 60)
  }, [map, itinerary])

  useEffect(() => {
    if (!map || !selectedPoiId) return

    const stop = itinerary.stops.find(
      (item) => item.id === selectedPoiId,
    )

    if (stop) {
      map.panTo({ lat: stop.lat, lng: stop.lng })
    }
  }, [map, itinerary, selectedPoiId])

  return null
}

export default function ItineraryMap({
  itinerary,
  selectedPoiId,
  onSelectPoi,
}: ItineraryMapProps) {
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
            lat: itinerary.accommodation.lat,
            lng: itinerary.accommodation.lng,
          }}
          defaultZoom={13}
          gestureHandling="cooperative"
          onClick={() => onSelectPoi(null)}
        >
          <MapCamera
            itinerary={itinerary}
            selectedPoiId={selectedPoiId}
          />

          <AdvancedMarker
            position={{
              lat: itinerary.accommodation.lat,
              lng: itinerary.accommodation.lng,
            }}
            title={itinerary.accommodation.name}
          >
            <Pin
              background="#243b53"
              borderColor="#ffffff"
              glyphColor="#ffffff"
              glyph="H"
            />
          </AdvancedMarker>

          {itinerary.stops.map((stop, index) => {
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


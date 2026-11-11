/// <reference types="google.maps" />

import { useEffect, useMemo } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  Map,
  MapControl,
  Pin,
  useMap,
  useMapsLibrary,
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

function ItineraryRoute({ itinerary }: { itinerary: MapItinerary }) {
  const map = useMap()
  const geometry = useMapsLibrary('geometry')

  const segments = useMemo(() => {
    if (!geometry || itinerary.stops.length === 0) return []

    const { accommodation, stops, returnRoutePolyline } = itinerary
    const legs = [
      ...stops.map((stop, index) => ({
        from: index === 0 ? accommodation : stops[index - 1],
        to: stop,
        encoded: stop.routePolylineBefore,
      })),
      {
        from: stops[stops.length - 1],
        to: accommodation,
        encoded: returnRoutePolyline,
      },
    ]

    return legs.map(({ from, to, encoded }) => {
      const decoded = encoded ? geometry.encoding.decodePath(encoded) : []

      if (decoded.length >= 2) {
        return { path: decoded, schematic: false }
      }

      return {
        path: [
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng },
        ],
        schematic: true,
      }
    })
  }, [geometry, itinerary])

  useEffect(() => {
    if (!map) return

    const lines = segments.map(({ path, schematic }) => {
      return new google.maps.Polyline({
        map,
        path,
        clickable: false,
        strokeColor: '#205caa',
        strokeWeight: 4,
        strokeOpacity: schematic ? 0 : 0.9,
        icons: schematic
          ? [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeColor: '#205caa',
                  strokeOpacity: 1,
                  scale: 3,
                },
                offset: '0',
                repeat: '14px',
              },
            ]
          : undefined,
      })
    })

    return () => {
      lines.forEach((line) => line.setMap(null))
    }
  }, [map, segments])

  if (!segments.some((segment) => segment.schematic)) return null

  return (
    <MapControl position={ControlPosition.BOTTOM_CENTER}>
      <p
        style={{
          margin: 8,
          padding: '6px 10px',
          background: '#fff',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        Dashed lines show approximate connections.
      </p>
    </MapControl>
  )
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
          <ItineraryRoute itinerary={itinerary} />
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


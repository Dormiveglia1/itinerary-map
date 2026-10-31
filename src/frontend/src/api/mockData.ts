import type { PlaceSearchResult, Poi } from './types.ts'

// Synthetic places for building the UI before the backend exists. Not real
// Google Places data.
export const MOCK_POIS: Poi[] = [
  {
    placeId: 'mock-poi-1',
    name: 'Harbourfront Museum',
    category: 'attraction',
    location: { lat: 43.6387, lng: -79.3816 },
    visitDurationMinutes: 90,
    priceLevel: 2,
  },
  {
    placeId: 'mock-poi-2',
    name: 'Old Town Market',
    category: 'attraction',
    location: { lat: 43.6487, lng: -79.3716 },
    visitDurationMinutes: 60,
    priceLevel: null,
  },
  {
    placeId: 'mock-poi-3',
    name: 'Lakeview Park',
    category: 'attraction',
    location: { lat: 43.6339, lng: -79.4011 },
    visitDurationMinutes: 45,
    priceLevel: null,
  },
  {
    placeId: 'mock-poi-4',
    name: 'City Observation Tower',
    category: 'attraction',
    location: { lat: 43.6426, lng: -79.3871 },
    visitDurationMinutes: 75,
    priceLevel: 3,
  },
  {
    placeId: 'mock-poi-5',
    name: 'Corner Noodle House',
    category: 'restaurant',
    location: { lat: 43.6532, lng: -79.3982 },
    visitDurationMinutes: 60,
    priceLevel: 1,
  },
  {
    placeId: 'mock-poi-6',
    name: 'Riverside Cafe',
    category: 'restaurant',
    location: { lat: 43.6455, lng: -79.3657 },
    visitDurationMinutes: 45,
    priceLevel: 1,
  },
  {
    placeId: 'mock-poi-7',
    name: 'Botanical Gardens',
    category: 'attraction',
    location: { lat: 43.6677, lng: -79.3948 },
    visitDurationMinutes: 120,
    priceLevel: 1,
  },
  {
    placeId: 'mock-poi-8',
    name: 'Gallery District',
    category: 'attraction',
    location: { lat: 43.6536, lng: -79.3925 },
    visitDurationMinutes: 90,
    priceLevel: 2,
  },
]

// Synthetic hotels for the accommodation search.
export const MOCK_ACCOMMODATIONS: PlaceSearchResult[] = [
  {
    place_id: 'mock-hotel-1',
    name: 'Union Square Hotel',
    kind: 'lodging',
    lat: 43.6452,
    lng: -79.3806,
  },
  {
    place_id: 'mock-hotel-2',
    name: 'Harbour View Inn',
    kind: 'lodging',
    lat: 43.6403,
    lng: -79.3772,
  },
  {
    place_id: 'mock-hotel-3',
    name: 'Midtown Suites',
    kind: 'lodging',
    lat: 43.6629,
    lng: -79.3957,
  },
  {
    place_id: 'mock-hotel-4',
    name: 'Kensington Hostel',
    kind: 'lodging',
    lat: 43.6545,
    lng: -79.4005,
  },
]

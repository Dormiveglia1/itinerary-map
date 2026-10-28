import type { Poi } from './types.ts'

// Synthetic places for building the UI before the backend exists. Not real
// Google Places data.
export const MOCK_POIS: Poi[] = [
  {
    placeId: 'mock-poi-1',
    name: 'Harbourfront Museum',
    category: 'attraction',
    location: { lat: 43.6387, lng: -79.3816 },
    visitDurationMinutes: 90,
    estimatedCost: 25,
  },
  {
    placeId: 'mock-poi-2',
    name: 'Old Town Market',
    category: 'attraction',
    location: { lat: 43.6487, lng: -79.3716 },
    visitDurationMinutes: 60,
    estimatedCost: 0,
  },
  {
    placeId: 'mock-poi-3',
    name: 'Lakeview Park',
    category: 'attraction',
    location: { lat: 43.6339, lng: -79.4011 },
    visitDurationMinutes: 45,
    estimatedCost: 0,
  },
  {
    placeId: 'mock-poi-4',
    name: 'City Observation Tower',
    category: 'attraction',
    location: { lat: 43.6426, lng: -79.3871 },
    visitDurationMinutes: 75,
    estimatedCost: 40,
  },
  {
    placeId: 'mock-poi-5',
    name: 'Corner Noodle House',
    category: 'restaurant',
    location: { lat: 43.6532, lng: -79.3982 },
    visitDurationMinutes: 60,
    estimatedCost: 20,
  },
  {
    placeId: 'mock-poi-6',
    name: 'Riverside Cafe',
    category: 'restaurant',
    location: { lat: 43.6455, lng: -79.3657 },
    visitDurationMinutes: 45,
    estimatedCost: 15,
  },
  {
    placeId: 'mock-poi-7',
    name: 'Botanical Gardens',
    category: 'attraction',
    location: { lat: 43.6677, lng: -79.3948 },
    visitDurationMinutes: 120,
    estimatedCost: 10,
  },
  {
    placeId: 'mock-poi-8',
    name: 'Gallery District',
    category: 'attraction',
    location: { lat: 43.6536, lng: -79.3925 },
    visitDurationMinutes: 90,
    estimatedCost: 30,
  },
]

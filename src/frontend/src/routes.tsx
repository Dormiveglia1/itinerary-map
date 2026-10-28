import type { RouteObject } from 'react-router'
import Layout from './components/Layout.tsx'
import ChoosePlacesPage from './pages/ChoosePlacesPage.tsx'
import HomePage from './pages/HomePage.tsx'
import ItineraryPage from './pages/ItineraryPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import TripSetupPage from './pages/TripSetupPage.tsx'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'plan', element: <TripSetupPage /> },
      { path: 'plan/places', element: <ChoosePlacesPage /> },
      { path: 'plan/itinerary', element: <ItineraryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

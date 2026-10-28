import { Link } from 'react-router'

// Placeholder: the generated schedule, with loading and "no feasible
// itinerary" states (SRS §16, NFR-U3).
function ItineraryPage() {
  return (
    <>
      <h1>Your itinerary</h1>
      <p>Your day-by-day schedule will appear here.</p>
      <Link to="/plan/places">Back</Link> <Link to="/plan">Start over</Link>
    </>
  )
}

export default ItineraryPage

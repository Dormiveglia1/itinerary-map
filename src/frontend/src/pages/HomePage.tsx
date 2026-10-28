import { Link } from 'react-router'

function HomePage() {
  return (
    <>
      <h1>Itinerary Map</h1>
      <p>Plan an optimized day-by-day itinerary for your trip.</p>
      <Link to="/plan">Start planning</Link>
    </>
  )
}

export default HomePage

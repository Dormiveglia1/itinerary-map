import { Link } from 'react-router'

// Placeholder: the trip configuration form (SRS §8) goes here.
function TripSetupPage() {
  return (
    <>
      <h1>Plan your trip</h1>
      <p>Enter your destination, dates, daily hours, budget and preferences.</p>
      <Link to="/plan/places">Next: choose places</Link>
    </>
  )
}

export default TripSetupPage

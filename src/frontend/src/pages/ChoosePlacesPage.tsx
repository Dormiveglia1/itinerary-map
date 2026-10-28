import { Link } from 'react-router'

// Placeholder: list of candidate places from the backend for the user to pick
// 5–10 from (SRS §16).
function ChoosePlacesPage() {
  return (
    <>
      <h1>Choose places</h1>
      <p>Pick the attractions and restaurants you want to visit.</p>
      <Link to="/plan">Back</Link> <Link to="/plan/itinerary">Next: build itinerary</Link>
    </>
  )
}

export default ChoosePlacesPage

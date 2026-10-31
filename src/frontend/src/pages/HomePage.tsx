import { Icon, type IconName } from '@blueprintjs/core'
import { Link } from 'react-router'
import RouteIllustration from '../components/RouteIllustration.tsx'

// Example schedule shown beside the hero map; matches its stops.
const SAMPLE_DAY = [
  { time: '9:00', title: 'Leave hotel', detail: 'Walk 18 min', kind: 'hotel' },
  { time: '9:20', title: 'Museum', detail: '2 h visit', kind: 'stop' },
  { time: '11:45', title: 'Lunch', detail: '1 h', kind: 'stop' },
  { time: '13:15', title: 'Gardens', detail: '3 h visit', kind: 'stop' },
  { time: '16:40', title: 'Back at hotel', detail: '', kind: 'hotel' },
]

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'calendar',
    title: 'Set up your trip',
    body: 'Pick a city and date, the hours you want to be out, where you are staying, and how you will get around.',
  },
  {
    icon: 'map-marker',
    title: 'Choose your places',
    body: 'Pick the attractions and restaurants you want to visit from places in the city.',
  },
  {
    icon: 'route',
    title: 'Get your itinerary',
    body: 'Our optimization engine puts your stops in order and times each visit, with the travel between them laid out.',
  },
]

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'route',
    title: 'Less time in transit',
    body: 'Stops are ordered to cut travel time, whether you walk, take transit, or drive.',
  },
  {
    icon: 'time',
    title: 'Fits your hours',
    body: 'Tell us when your day starts and ends, and the schedule stays inside it.',
  },
  {
    icon: 'home',
    title: 'Starts from your stay',
    body: 'Each day begins and ends at your accommodation, so the last leg is planned too.',
  },
  {
    icon: 'glass',
    title: 'Meals built in',
    body: 'Turn on meal stops and lunch and dinner are placed at sensible times.',
  },
  {
    icon: 'dashboard',
    title: 'Your pace',
    body: 'Relaxed, moderate, or packed sets how long you spend at each place.',
  },
  {
    icon: 'dollar',
    title: 'Your budget',
    body: 'Set a price range and places above it are left out.',
  },
]

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <Icon icon="path-search" size={14} />
              Day-by-day trip planner
            </p>
            <h1 className="hero-title">
              Pick the places.
              <br />
              <span>We'll plan the route.</span>
            </h1>
            <p className="hero-lead">
              Choose what you want to see, and Itinerary Map builds a timed
              schedule for your day: ordered to cut travel time, fitted to
              your hours, and starting and ending where you're staying.
            </p>
            <div className="hero-actions">
              <Link to="/plan" className="landing-btn landing-btn-primary">
                Plan a trip
                <Icon icon="arrow-right" />
              </Link>
              <a href="#how-it-works" className="landing-btn landing-btn-ghost">
                How it works
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <RouteIllustration />
            <div className="sample-day" aria-hidden="true">
              <div className="sample-day-header">
                <span>Saturday</span>
                <span className="sample-day-mode">
                  <Icon icon="walk" size={12} /> Walking
                </span>
              </div>
              <ol>
                {SAMPLE_DAY.map((entry) => (
                  <li key={entry.time} className={`sample-day-${entry.kind}`}>
                    <span className="sample-day-time">{entry.time}</span>
                    <span className="sample-day-dot" />
                    <span>
                      <strong>{entry.title}</strong>
                      {entry.detail && <small>{entry.detail}</small>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section">
        <h2 className="section-title">How it works</h2>
        <p className="section-lead">Three steps from a list of places to a plan.</p>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step">
              <div className="step-badge">
                <Icon icon={step.icon} size={20} />
                <span className="step-number">{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="landing-band">
        <section className="landing-section">
          <h2 className="section-title">Planned around your day</h2>
          <p className="section-lead">
            Every itinerary respects the settings you choose.
          </p>
          <ul className="features">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="feature">
                <span className="feature-icon">
                  <Icon icon={feature.icon} size={18} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="landing-section">
        <div className="cta-band">
          <div>
            <h2>Ready to plan your day?</h2>
            <p>Setting up a trip takes a couple of minutes.</p>
          </div>
          <Link to="/plan" className="landing-btn landing-btn-primary">
            Plan a trip
            <Icon icon="arrow-right" />
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        Itinerary Map · COMP SCI 4ZP6 capstone, Team 18
      </footer>
    </>
  )
}

export default HomePage

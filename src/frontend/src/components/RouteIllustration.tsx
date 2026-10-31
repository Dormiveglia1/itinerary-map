// Decorative city map with an example day's route: leave the hotel, visit
// three stops, and loop back. Purely illustrative, not real data.

// Stops sit in the top half, clear of the schedule card that overlaps the
// bottom-right corner on wide screens.
const ROUTE =
  'M92 292 C 80 220, 104 150, 142 112 C 180 74, 240 78, 292 92 ' +
  'C 352 106, 404 112, 400 150 C 396 200, 300 236, 230 262 ' +
  'C 180 280, 130 300, 92 292'

const STOPS = [
  { n: 1, x: 142, y: 112, label: 'Museum', labelX: 54, labelY: 112 },
  { n: 2, x: 292, y: 92, label: 'Lunch', labelX: 262, labelY: 56 },
  { n: 3, x: 400, y: 150, label: 'Gardens', labelX: 300, labelY: 140 },
]

function RouteIllustration() {
  return (
    <svg
      className="route-illustration"
      viewBox="0 0 480 380"
      role="presentation"
      aria-hidden="true"
    >
      <rect width="480" height="380" rx="20" className="ri-land" />

      {/* Water and parks */}
      <path
        d="M0 214 C 70 196, 120 236, 200 226 S 330 170, 480 186 L 480 222 C 340 206, 290 262, 200 262 S 70 232, 0 250 Z"
        className="ri-water"
      />
      <rect x="300" y="250" width="120" height="84" rx="14" className="ri-park" />
      <rect x="36" y="36" width="70" height="52" rx="12" className="ri-park" />

      {/* Streets */}
      <g className="ri-streets">
        <path d="M0 60 H480" />
        <path d="M0 150 H480" />
        <path d="M0 320 H480" />
        <path d="M60 0 V380" />
        <path d="M210 0 V380" />
        <path d="M350 0 V380" />
        <path d="M0 380 L 300 0" className="ri-avenue" />
      </g>

      {/* Route */}
      <path d={ROUTE} className="ri-route-shadow" />
      <path d={ROUTE} className="ri-route" />
      <circle r="6" className="ri-traveller">
        <animateMotion dur="9s" repeatCount="indefinite" path={ROUTE} />
      </circle>

      {/* Stops */}
      {STOPS.map((stop) => (
        <g key={stop.n}>
          <rect
            x={stop.labelX}
            y={stop.labelY - 14}
            width={stop.label.length * 7.4 + 18}
            height="24"
            rx="12"
            className="ri-label-bg"
          />
          <text x={stop.labelX + 9} y={stop.labelY + 2} className="ri-label">
            {stop.label}
          </text>
          <circle cx={stop.x} cy={stop.y} r="17" className="ri-pin" />
          <text x={stop.x} y={stop.y + 5} className="ri-pin-number">
            {stop.n}
          </text>
        </g>
      ))}

      {/* Hotel: start and end of the day */}
      <rect x="72" y="272" width="40" height="40" rx="10" className="ri-hotel" />
      <path
        d="M82 292 L92 283 L102 292 V302 H82 Z"
        className="ri-hotel-glyph"
      />
      <rect x="120" y="280" width="52" height="24" rx="12" className="ri-label-bg" />
      <text x="129" y="296" className="ri-label">
        Hotel
      </text>
    </svg>
  )
}

export default RouteIllustration

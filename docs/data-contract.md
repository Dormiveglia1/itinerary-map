# Itinerary Map — Data Contract v0.1

There are two contracts:

1. **Backend → Optimizer** (Python): `generate_itinerary(trip, pois, travel_times)`
2. **Frontend ↔ Backend** (REST/JSON): what the web client sends and receives

The optimizer never sees Google's data formats. The backend converts everything into
the plain structures below before calling it.

## Conventions

| Thing | Format | Example |
| --- | --- | --- |
| Times of day | Integer minutes since local midnight | `540` = 9:00 AM, `1260` = 9:00 PM |
| Dates | ISO string, in the city's local time zone | `"2026-11-14"` |
| Durations | Integer minutes | `120` |
| Money | Number, CAD | `26.0` |
| POI ids | Google Place ID | `"ChIJ...ROM"` |
| Accommodation id | The literal string `"accommodation"` | |
| Priority | Integer 1–10, set by the user | `8` |

Minutes-since-midnight keeps all time arithmetic as integer math in the optimizer.

---

## 1. Backend → Optimizer

```python
def generate_itinerary(trip: TripConfig,
                       pois: list[POI],
                       travel_times: TravelTimes) -> ItineraryResult: ...
```

### TripConfig

```json
{
  "contract_version": "0.1",
  "city": "Toronto",
  "timezone": "America/Toronto",
  "dates": ["2026-11-14", "2026-11-15"],
  "day_start": 540,
  "day_end": 1260,
  "budget": 150.0,
  "transport_mode": "walk",
  "accommodation": { "lat": 43.6532, "lng": -79.3832 },
  "meal_windows": { "lunch": [690, 810], "dinner": [1050, 1200] }
}
```

- `transport_mode`: `"walk"`, `"drive"`, or `"transit"`.
- `meal_windows` is optional. If present, the optimizer schedules at most one restaurant
  inside each window per day.
- Travel **pace** is not passed to the optimizer. The backend applies it when it sets each
  POI's `visit_minutes`, so the optimizer only ever deals in minutes.

### POI

```json
{
  "id": "ChIJ...ROM",
  "name": "Royal Ontario Museum",
  "kind": "attraction",
  "lat": 43.6677,
  "lng": -79.3948,
  "priority": 8,
  "visit_minutes": 120,
  "cost": 26.0,
  "opening_hours": {
    "2026-11-14": [[600, 1050]],
    "2026-11-15": []
  },
  "locked": null
}
```

- `kind`: `"attraction"` or `"restaurant"`.
- `opening_hours` is already resolved per trip date by the backend. A date can have several
  intervals (e.g. closed for lunch). An empty list means closed that day. A missing date also
  means closed.
- `cost` is the estimated cost per person. See open question 1.
- `locked` is `null` now. For P1 editing it becomes `{ "date": "2026-11-14", "start": 600 }`,
  meaning this activity must stay exactly there. It's in v0.1 so adding editing later
  doesn't break the contract.

### TravelTimes

```json
{
  "mode": "walk",
  "source": "estimate",
  "minutes": {
    "accommodation": { "ChIJ...ROM": 18, "ChIJ...CNT": 25 },
    "ChIJ...ROM":    { "accommodation": 18, "ChIJ...CNT": 31 },
    "ChIJ...CNT":    { "accommodation": 25, "ChIJ...ROM": 31 }
  }
}
```

- `minutes[a][b]` is the travel time from `a` to `b`. It may differ from `minutes[b][a]`.
- Always includes `"accommodation"`, since every day starts and ends there.
- A missing pair means unreachable. The optimizer must never schedule that leg.
- `source` is `"estimate"` (straight-line based) or `"google_routes"`, so results and
  evaluation can record which kind of travel times were used.

### ItineraryResult

```json
{
  "status": "ok",
  "algorithm": "greedy+insertion+local_search",
  "total_priority": 34,
  "total_cost": 61.0,
  "days": [
    {
      "date": "2026-11-14",
      "activities": [
        { "poi_id": "ChIJ...ROM", "start": 600, "end": 720, "travel_minutes_before": 18 },
        { "poi_id": "ChIJ...CNT", "start": 751, "end": 871, "travel_minutes_before": 31 }
      ],
      "return_travel_minutes": 25
    }
  ],
  "unscheduled": [
    { "poi_id": "ChIJ...AGO", "reason": "closed_on_trip_dates" }
  ],
  "violations": []
}
```

- `status` is `"ok"` or `"infeasible"`.
  - `"ok"`: a valid itinerary exists. POIs that didn't fit go in `unscheduled`.
  - `"infeasible"`: no valid itinerary exists at all, for example a locked activity can't be
    honoured or no POI fits any day. `days` is empty and `violations` explains why.
- `start` is when the visit begins. If the traveller arrives before opening time, they wait,
  so `start` can be later than arrival.
- `unscheduled[].reason`: `"closed_on_trip_dates"`, `"no_time"`, `"over_budget"`,
  `"unreachable"`.
- `violations[]`: `{ "code": "...", "message": "..." }`. The message is shown to the user,
  which covers the PoC's "clear error message" requirement.
- `algorithm` records which method produced the result, for the baseline comparison
  in SRS Section 9.

---

## 2. Frontend ↔ Backend (PoC endpoints)

### `GET /api/places/search?city=Toronto&q=museum`

Returns candidate places for the user to choose from.

```json
[
  { "place_id": "ChIJ...ROM", "name": "Royal Ontario Museum",
    "kind": "attraction", "lat": 43.6677, "lng": -79.3948 }
]
```

### `POST /api/itineraries/generate`

```json
{
  "trip": { "...": "TripConfig fields, without contract_version" },
  "selections": [
    { "place_id": "ChIJ...ROM", "priority": 8, "visit_minutes": 120 },
    { "place_id": "ChIJ...CNT", "priority": 6 }
  ]
}
```

- `visit_minutes` is optional. If omitted, the backend uses a default by category and pace.
- The backend fetches place details, builds `POI` objects and `TravelTimes`, calls
  `generate_itinerary`, and returns the `ItineraryResult` with each activity's `name`
  added for display.

Errors use HTTP 400 for invalid input and 502 if Google is unavailable, with body
`{ "error": "code", "message": "..." }`. An infeasible itinerary is **not** an HTTP error:
it returns 200 with `status: "infeasible"`.

---

## Open questions for the team

1. **Where does `cost` come from?** Google Places gives restaurants a price level (0–4),
   not a dollar amount, and gives no admission prices for attractions. Options: user-entered
   cost, category defaults, or drop budget from the PoC.
2. **Overnight hours** (open until 2:00 AM): represent as `[1200, 1560]` (past 1440), or cut
   at midnight? Proposal: cut at midnight, since days end by `day_end` anyway.
3. **Multi-day for the PoC?** The PoC plan is one day. The contract already supports
   several dates, so the optimizer can reject more than one date until multi-day is built.

## Changing this contract

Bump `contract_version` and update this file in the same PR as the code change.
Changes need approval from at least one person on each subteam.

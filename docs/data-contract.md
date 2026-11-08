# Itinerary Map — Data Contract v0.2 (draft)

There are two contracts:

1. **Backend → Optimizer** (Python): `generate_itinerary(trip, pois, travel_times)`
2. **Frontend ↔ Backend** (REST/JSON): what the web client sends and receives

The optimizer never sees Google's data formats. The backend converts everything into
the plain structures below before calling it.

## Changelog v0.1 → v0.2

| # | Change | Why |
|---|---|---|
| 1 | `budget` is a **total trip budget per person**, and may be `null` (no limit) | Team agreed on total budget; users shouldn't have to enter one |
| 2 | `POI.mandatory` (default `false`) and mandatory-related violations | FE "Essential" level must be guaranteed, not just high priority |
| 3 | Cost rules: restaurants from Google `priceRange`, else `priceLevel`; attractions by category (free = 0) | Resolves open question 1 for the PoC; attractions are no longer all 0 |
| 4 | Backend intersects restaurant opening hours with `meal_windows` | Restaurants land at meal times with no optimizer change |
| 5 | `POI.visit_range` (optional) alongside `visit_minutes` | Lets the algorithm choose visit length (weekly meeting, Nov 6) |
| 6 | Result: `arrival`, `wait_minutes` per activity; `slack_minutes` per day | Needed by the plan builder (#26); optimizer already computes them |
| 7 | Result: `violations[].poi_ids` and mandatory violation codes | UI can name and highlight the conflicting places |
| 8 | REST response: `lat`, `lng`, `route_polyline_before`, `return_route_polyline`, `plan` | Interactive map (Eric, Steven) and timeline (#26, #27) |
| 9 | Limits: 1–20 POIs in both backend and optimizer, at most 5 mandatory (to confirm) | Backend allowed 20, optimizer 10; SRS NFR-P2 uses 20 |
| 10 | `meal_windows` / `locked`: not required in the PoC optimizer | Team decision (Nov 6–7) |

## Conventions

| Thing | Format | Example |
| --- | --- | --- |
| Times of day | Integer minutes since local midnight | `540` = 9:00 AM, `1260` = 9:00 PM |
| Dates | ISO string, in the city's local time zone | `"2026-11-14"` |
| Durations | Integer minutes | `120` |
| Money | Number, CAD, **per person** **(v0.2)** | `26.0` |
| POI ids | Google Place ID | `"ChIJ...ROM"` |
| Accommodation id | The literal string `"accommodation"` | |
| Priority | Integer 1–10, set by the user | `8` |

Minutes-since-midnight keeps all time arithmetic as integer math in the optimizer.

### Priority levels in the UI (v0.2)

The frontend shows three levels instead of a 1–10 slider. They map to the contract like this:

| UI label | `priority` | `mandatory` |
|---|---|---|
| Nice to see | 3 | `false` |
| Want to see (default) | 6 | `false` |
| Essential | 9 | `true` |

The contract still accepts any integer 1–10, so the optimizer doesn't depend on the UI choice.

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
  "contract_version": "0.2",
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
- **`budget` (v0.2):** total for the **whole trip, per person**, in CAD. `null` means no
  limit, and the optimizer must then skip all cost checks (treat it as infinity).
- **`meal_windows` (v0.2):** optional. **The PoC optimizer may ignore it.** When present,
  the backend has already narrowed every restaurant's `opening_hours` to its overlap with
  the meal windows (see POI), so restaurants can only be scheduled at meal times.
  Enforcing "at most one restaurant per window" is post-PoC.
- Travel **pace** is not passed to the optimizer. The backend applies it when it sets each
  POI's `visit_minutes` (and `visit_range`, v0.2), so the optimizer only ever deals in minutes.

### POI

```json
{
  "id": "ChIJ...ROM",
  "name": "Royal Ontario Museum",
  "kind": "attraction",
  "lat": 43.6677,
  "lng": -79.3948,
  "priority": 9,
  "mandatory": true,
  "visit_minutes": 120,
  "visit_range": [60, 180],
  "cost": 25.0,
  "opening_hours": {
    "2026-11-14": [[600, 1050]],
    "2026-11-15": []
  },
  "locked": null
}
```

- `kind`: `"attraction"` or `"restaurant"`.
- **`mandatory` (v0.2):** optional, default `false`. A mandatory POI must appear in the
  itinerary. If that's impossible, the result is `"infeasible"` (see ItineraryResult).
  The optimizer must never drop a mandatory POI to make room for others.
- `opening_hours` is already resolved per trip date by the backend. A date can have several
  intervals (e.g. closed for lunch). An empty list means closed that day. A missing date also
  means closed.
  - **(v0.2)** For `kind: "restaurant"` with `meal_windows` present, the backend stores the
    **intersection** of the real hours with the meal windows. Example: open `[[660, 1320]]`,
    lunch `[690, 810]`, dinner `[1050, 1200]` → `[[690, 810], [1050, 1200]]`.
- `visit_minutes`: the planned visit length. The backend sets it from the user's value, or
  from a default by category × pace.
- **`visit_range` (v0.2):** optional `[min, max]` minutes. If present, the optimizer **may**
  choose any length in this range (e.g. shorten visits when time is tight, or give
  high-priority places more time when there's slack). Optimizers that don't support this
  yet just use `visit_minutes`. If the user entered a duration, the backend sends
  `[visit_minutes, visit_minutes]` or omits the field.
- `cost`: estimated cost per person in CAD, a number ≥ 0. **Never `null`.**
  **(v0.2)** The backend sets it in this order:

  1. **User value**, if the selection includes `cost`.
  2. **Restaurants:** midpoint of Google `priceRange` (the start price if there is no
     upper bound). The backend adds `priceRange` to the Places field mask.
  3. **Restaurants without `priceRange`:** Google `priceLevel` mapped with the existing
     table in `converters.py` (inexpensive 15, moderate 30, expensive 60, very expensive 100).
  4. **Everything else:** the category table below.

  Category table (backend config; **values to confirm**):

  | Category (Google types) | Default cost |
  |---|---|
  | Usually free: `park`, `church`, `plaza`, `market`, landmarks without tickets | `0` |
  | `museum`, `art_gallery` | `25` |
  | `zoo`, `aquarium`, `amusement_park`, observation decks | `40` |
  | Restaurant with no price data | `30` (existing default) |

  The optimizer only uses the number. Showing "estimated" in the UI is a
  frontend/backend concern and is not part of this contract.

- `locked` is `null` now. For P1 editing it becomes `{ "date": "2026-11-14", "start": 600 }`,
  meaning this activity must stay exactly there. It's in v0.1 so adding editing later
  doesn't break the contract. **(v0.2)** The PoC optimizer does not need to support it.

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

### Limits (v0.2)

| Limit | Value | Enforced by |
|---|---|---|
| POIs per request | 1–20 | backend (400) and optimizer (`ValueError`) |
| Mandatory POIs | ≤ 5 (**to confirm**; the optimizer's exhaustive ordering supports up to 7) | backend (400) |
| Dates (PoC) | 1 (the optimizer may reject more, see open question 3) | backend (400) |

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
        { "poi_id": "ChIJ...ROM", "arrival": 558, "wait_minutes": 42,
          "start": 600, "end": 720, "travel_minutes_before": 18 },
        { "poi_id": "ChIJ...CNT", "arrival": 751, "wait_minutes": 0,
          "start": 751, "end": 871, "travel_minutes_before": 31 }
      ],
      "return_travel_minutes": 25,
      "slack_minutes": 40
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
    **(v0.2)** Every mandatory POI is in the itinerary; only non-mandatory POIs can be unscheduled.
  - `"infeasible"`: no valid itinerary exists at all, for example a locked activity can't be
    honoured or no POI fits any day. `days` is empty and `violations` explains why.
    **(v0.2)** This includes the case where any mandatory POI can't be scheduled.
- `start` is when the visit begins. If the traveller arrives before opening time, they wait,
  so `start` can be later than arrival.
- **`arrival`, `wait_minutes` (v0.2):** when the traveller reaches the place, and
  `start − arrival`. Optional for v0.1 optimizers. If missing, consumers compute
  `arrival = previous end (or day_start) + travel_minutes_before`.
- **`slack_minutes` (v0.2):** how many minutes the whole day could slip (e.g. leaving the
  hotel late) without any later visit missing its opening hours or the day ending after
  `day_end`. It comes from the optimizer's backward "max shift" pass. Used by the plan
  builder (#26).
- `total_cost`: sum of `cost` over scheduled POIs (per person).
- `unscheduled[].reason`: `"closed_on_trip_dates"`, `"no_time"`, `"over_budget"`,
  `"unreachable"`.
- `violations[]`: `{ "code": "...", "message": "..." }`. The message is shown to the user,
  which covers the PoC's "clear error message" requirement. **(v0.2)** An optional
  `poi_ids` list names the places involved.

  | Code (v0.2) | When |
  |---|---|
  | `MANDATORY_CANNOT_FIT` | A mandatory POI can't be visited even on its own (hours, travel, budget) |
  | `MANDATORY_CONFLICT` | Two mandatory POIs can't both fit on the same day (checked as pairs) |
  | `MANDATORY_SET_CONFLICT` | Every pair fits, but all mandatory POIs together don't |
  | `NO_FEASIBLE_ITINERARY` | Nothing could be scheduled |

- `algorithm` records which method produced the result, for the baseline comparison
  in SRS Section 9.

---

## 2. Frontend ↔ Backend (PoC endpoints)

### `GET /api/places/search?city=Toronto&q=museum`

Returns candidate places for the user to choose from. (Unchanged.)

```json
[
  { "place_id": "ChIJ...ROM", "name": "Royal Ontario Museum",
    "kind": "attraction", "lat": 43.6677, "lng": -79.3948 }
]
```

### `POST /api/itineraries/generate`

```json
{
  "trip": {
    "city": "Toronto", "timezone": "America/Toronto", "dates": ["2026-11-14"],
    "day_start": 540, "day_end": 1260, "budget": null,
    "transport_mode": "walk", "pace": "normal",
    "accommodation": { "lat": 43.646, "lng": -79.3814 },
    "meal_windows": { "lunch": [690, 810] }
  },
  "selections": [
    { "place_id": "ChIJ...ROM", "priority": 9, "mandatory": true },
    { "place_id": "ChIJ...CNT", "priority": 6, "visit_minutes": 90 },
    { "place_id": "ChIJ...SLM", "priority": 3, "cost": 0 }
  ]
}
```

- **(v0.2)** `budget` may be `null`.
- **(v0.2)** `selections[].mandatory`: optional, default `false`.
- **(v0.2)** `selections[].cost`: optional user-entered cost per person; overrides every estimate.
- `visit_minutes` is optional. If omitted, the backend uses a default by category and pace.
  **(v0.2)** It may also send a `visit_range` to the optimizer.
- The backend fetches place details, builds `POI` objects and `TravelTimes`, calls
  `generate_itinerary`, and returns the `ItineraryResult` with each activity's `name`
  added for display.

**Response (v0.2):** the `ItineraryResult`, plus these backend-added fields:

| Field | Where | What |
|---|---|---|
| `name`, `lat`, `lng` | each activity and each `unscheduled` item | for display and the map |
| `route_polyline_before` | each activity | Google encoded polyline of the leg arriving at this stop |
| `return_route_polyline` | each day | leg from the last stop back to the hotel |
| `plan` | top level | step-by-step plan from the plan builder (#26), see below |

The backend fetches polylines **only for the legs in the final itinerary** (one Routes call
per leg), so the frontend never needs a Google key for routing. If a polyline call fails,
the field is `null` and the map draws a straight line.

`plan` (PoC: returned inline, no `GET /api/itineraries/{id}/plan` until trips are saved):

```json
{
  "days": [
    {
      "date": "2026-11-14",
      "steps": [
        { "time": 540, "kind": "depart", "text": "Leave the hotel" },
        { "time": 540, "kind": "travel", "text": "Walk 18 min to Royal Ontario Museum" },
        { "time": 558, "kind": "wait",   "text": "Wait 42 min (opens at 10:00)" },
        { "time": 600, "kind": "visit",  "text": "Royal Ontario Museum, 2 h", "warning": null },
        { "time": 871, "kind": "return", "text": "Walk 25 min back to the hotel (arrive 14:56)" }
      ],
      "summary": { "stops": 2, "travel_minutes": 74, "cost": 61.0, "slack_minutes": 40 }
    }
  ]
}
```

- `steps[].kind`: `depart`, `travel`, `wait`, `visit`, `return`.
- `visit` steps get `warning` text when the visit ends within 30 minutes of closing.

Errors use HTTP 400 for invalid input and 502 if Google is unavailable, with body
`{ "error": "code", "message": "..." }`. An infeasible itinerary is **not** an HTTP error:
it returns 200 with `status: "infeasible"`.

---

## Open questions for the team

1. ~~Where does `cost` come from?~~ **Proposed in v0.2:** restaurants from `priceRange` /
   `priceLevel`, attractions by category (free categories = 0), user override allowed.
   *Still open:* the dollar values in the category table.
2. **Overnight hours** (open until 2:00 AM): represent as `[1200, 1560]` (past 1440), or cut
   at midnight? Proposal: cut at midnight, since days end by `day_end` anyway.
3. **Multi-day for the PoC?** The PoC plan is one day. The contract already supports
   several dates, so the optimizer can reject more than one date until multi-day is built.
   **(v0.2)** With a total budget, day-by-day greedy can spend the whole budget on day 1;
   this needs a fix before multi-day.
4. **Variable visit length (`visit_range`):** agree on default ranges per category × pace,
   and whether the PoC optimizer uses them or only `visit_minutes`.
5. **One restaurant per meal window:** post-PoC (needs optimizer support).
6. **Mandatory cap:** 5 proposed (a day rarely fits more); confirm with FE and optimizer.

## Changing this contract

Bump `contract_version` and update this file in the same PR as the code change.
Changes need approval from at least one person on each subteam.

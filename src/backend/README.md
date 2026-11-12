# Itinerary Map — Backend (FastAPI)

All Google Places / Routes calls go through this service. The frontend never needs the server key.

## Run locally

```bash
cd src/backend
python3 -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then set GOOGLE_MAPS_API_KEY (ask Shaoyuan for the server key)
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Interactive docs (try every endpoint in the browser): http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Endpoints (Data Contract v0.2, part 2)

### `GET /api/places/search?city=Toronto&q=museum&limit=10`
Candidate places for the user to pick from (`limit` 1–20, default 10). Closed businesses are filtered out.
```json
[{ "place_id": "ChIJ...", "name": "Royal Ontario Museum", "kind": "attraction", "lat": 43.6677, "lng": -79.3948 }]
```

### `POST /api/itineraries/generate`
```json
{
  "trip": {
    "city": "Toronto", "timezone": "America/Toronto", "dates": ["2026-11-14"],
    "day_start": 540, "day_end": 1260, "budget": null, "transport_mode": "walk",
    "accommodation": { "lat": 43.646, "lng": -79.3814 },
    "meal_windows": { "lunch": [690, 810] },
    "pace": "normal"
  },
  "selections": [
    { "place_id": "ChIJ...ROM", "priority": 9, "mandatory": true },
    { "place_id": "ChIJ...CNT", "priority": 6, "visit_minutes": 90 }
  ]
}
```
- Times are **minutes since midnight** (540 = 09:00). `transport_mode`: `walk` | `drive` | `transit`.
- `pace` (`relaxed` | `normal` | `packed`, optional) scales default visit durations; it is not passed to the optimizer.
- `visit_minutes` is optional; default comes from the place category × pace.
- `budget` is the **total trip budget per person** (CAD); `null` or omitted = no limit.
- `mandatory` (optional, default `false`) = "Essential" in the UI: the place must be in the itinerary, otherwise
  the result is `infeasible`.
- Limits: 1–20 selections, each `place_id` once, `priority` 1–10, at most 5 mandatory, **1 date** (PoC).
- With `meal_windows`, a restaurant's opening hours are narrowed to their overlap with the meal windows before
  the optimizer sees them, so restaurants land at meal times.

Returns the contract `ItineraryResult`, plus backend-added fields:

| Field | Where | What |
|---|---|---|
| `name`, `lat`, `lng` | each activity and `unscheduled` item | `lat`/`lng` on `unscheduled` only when the location is known |
| `route_polyline_before` | each activity | always `null` for now (polylines not fetched yet) -> the map draws a straight line |
| `return_route_polyline` | each day | always `null` for now, same as above |

`arrival`, `wait_minutes` (per activity) and `slack_minutes` (per day) come from the optimizer; if an optimizer
leaves out `arrival`/`wait_minutes`, the backend computes them as the contract says.

Places the backend could not use appear in `unscheduled`: closed or no opening hours -> `closed_on_trip_dates`,
no location -> `unreachable`. If one of them is **mandatory**, the backend returns `infeasible` with
`MANDATORY_CANNOT_FIT` (and `poi_ids`) without calling Routes or the optimizer. If no place is usable:
`NO_FEASIBLE_ITINERARY`. A `place_id` Google does not recognise is invalid input (400).

### Errors
| HTTP | When | Body |
|---|---|---|
| 200 + `status: "infeasible"` | No valid itinerary (not an error) | `ItineraryResult` with `violations[].message` |
| 400 | Invalid input | `{"error": "invalid_input", "message": "..."}` |
| 502 | Google unavailable / error | `{"error": "google_unavailable" \| "google_error", "message": "..."}` |
| 500 | Server misconfigured / optimizer returned the wrong shape | `{"error": "...", "message": "..."}` |

## Layout
```
app/
  main.py             FastAPI app, CORS, error handlers
  routes.py           /api/places/search, /api/itineraries/generate
  google_client.py    only module that calls Google (Places New, Routes matrix, batching)
  converters.py       Google JSON -> contract POI (opening hours per date, defaults)
  schemas.py          request validation (Pydantic)
  optimizer_bridge.py imports generate_itinerary from src/optimization
  config.py           env settings
tests/test_api.py     Google + optimizer mocked; no key needed
```

## Tests
```bash
cd src/backend && python -m pytest -q
```

## Notes
- Google place details must not be stored permanently (SRS §7). Only Place IDs may be persisted.
- Transit travel times are estimated for day 1 at `day_start`; the matrix is batched under Google's 100-element transit limit.
- Not yet in this backend (contract v0.2): `visit_range` (default ranges are open question 4), `plan` (#26) and real route polylines
  (fields are returned as `null`).
- Unknown cost: attractions default to $0, restaurants use a price-level estimate (contract open question 1).

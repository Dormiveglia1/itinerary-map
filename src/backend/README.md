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

## Endpoints (Data Contract v0.1, part 2)

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
    "day_start": 540, "day_end": 1260, "budget": 150, "transport_mode": "walk",
    "accommodation": { "lat": 43.646, "lng": -79.3814 },
    "meal_windows": { "lunch": [690, 810] },
    "pace": "normal"
  },
  "selections": [
    { "place_id": "ChIJ...ROM", "priority": 8, "visit_minutes": 120 },
    { "place_id": "ChIJ...CNT", "priority": 6 }
  ]
}
```
- Times are **minutes since midnight** (540 = 09:00). `transport_mode`: `walk` | `drive` | `transit`.
- `pace` (`relaxed` | `normal` | `packed`, optional) scales default visit durations; it is not passed to the optimizer.
- `visit_minutes` is optional; default comes from the place category × pace.
- 1–20 selections, each `place_id` once, `priority` 1–10.

Returns the contract `ItineraryResult` with `name` added to each activity. Places the backend could not use
appear in `unscheduled`: closed or no opening hours -> `closed_on_trip_dates`, no location -> `unreachable`.
A `place_id` Google does not recognise is invalid input (400).

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
- Unknown cost: attractions default to $0, restaurants use a price-level estimate (contract open question 1).

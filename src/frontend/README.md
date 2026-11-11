# Itinerary Map — frontend

React + TypeScript + Vite. Requires Node >=22.12 and npm >=11.

```sh
npm ci
npm run dev
npm run build
npm run lint
node --experimental-strip-types --test tests/itinerary.test.mjs
```

In Windows PowerShell, use `npm.cmd` if script execution is restricted.

## Preview without backend

Open the printed Local URL with `/dev/map` appended (usually
http://localhost:5173/dev/map). Development-only route; unavailable in production.
The default fixture has two days. Expand Development test scenarios at the bottom
for missing times, derived arrival/waiting, empty days, no days, infeasibility,
and optional plan/unscheduled data.

All IDs, costs and schedules are demo data. The temporary SchematicMap plots
coordinates and straight connections; it is not Google Maps or road directions.
No key or backend is required for the preview.

## Response and display boundaries

- `src/api/types.ts`: complete result envelope and plan structure. Optional v0.2
  additions explicitly accommodate the current v0.1 backend. Request fields stay
  v0.1; nullable budget/mandatory/cost input UI is not implemented yet.
- `src/api/itineraryResponse.ts`: validates incoming JSON, including nested fields,
  coordinates, time values, duplicate daily stops and optional plan. Returns the
  original object, retaining extra backend fields. This is structural validation,
  not optimization constraint verification.
- `src/api/client.ts`: generation receives unknown JSON, validates it, and returns
  the full result. HTTP, network and invalid-response failures become errors.
- `mockItinerary.ts`: same result type as the API. Includes totals/algorithm and a
  plan fixture. Null placeholder times are compatibility cases, not strict v0.2.
- `toMapItinerary.ts`: extracts one day, keeps visit order, converts field names,
  and derives arrival/waiting only when input times are known. Missing coordinates
  use selected search results from context. Invalid/missing coordinates produce a
  visible location error, never fabricated positions or silently skipped stops.
- `ItineraryResultView.tsx`: receives the full result and context; owns active day
  and selected POI. Lists, details and map share the same selection. Changing days
  clears selection. Totals are trip-wide; legacy known-only costs are labeled.
- `ItineraryStopList.tsx`, `PoiDetails.tsx`, `format.ts`: list, details and time
  formatting. Null is Unavailable; zero remains zero.
- `MapPreviewPage.tsx`: mock scenario controls only. `types.ts` retains MapApiResult
  as an alias to the shared response type for compatibility with existing imports.

## Steven's map integration

Steven owns `src/features/interactive-map/ItineraryMap.tsx`, its map-specific CSS,
Google loading, markers, bounds and routes. It has not been created on this branch.
The result page and shared API/data adapters are maintained by Eric.

Use the existing shared types:

```tsx
import type { ItineraryMapProps } from './types.ts'
export default function ItineraryMap({ trip, selectedPoiId, onSelectPoi }: ItineraryMapProps) {
  // Render trip.accommodation and trip.stops. Notify selection via onSelectPoi(id).
}
```

`ItineraryMapProps` extends `PoiSelectionProps` and adds `trip: MapItinerary`.
It is equivalent to `PoiSelectionProps & { trip: MapItinerary }`.
Selection belongs to the parent; do not maintain a separate selected ID in the map.
Respond to changed trip data by replacing markers/routes and fitting bounds.
Keep backend order and use the same accommodation for departure/return. Do not
request itinerary generation from the map. Google routes come from backend
polylines, with labeled schematic fallback when missing.

Eric will connect the component in both hosts with:

```tsx
import ItineraryMap from './ItineraryMap.tsx'
<ItineraryResultView result={result} context={context} MapComponent={ItineraryMap} />
```

Until then, ItineraryResultView defaults to the separate SchematicMap stand-in.
Map-specific CSS should use its own names to avoid the result/list CSS in map.css.

## Actual generation page

After configuring a trip and selecting places, `/plan/itinerary` offers Generate
itinerary. Explicit click avoids calling paid services on every mount/refresh.
The backend must be running on localhost:8000 with its own valid Google key.
The page provides loading, error/retry, infeasible and empty states. It preserves
previous results if a retry fails; leaving the page aborts client-side waiting
(which does not guarantee server-side work is stopped).

Current compatibility: coordinates may come from retained selections, times may
be null, and legacy `total_known_cost` / `has_unknown_cost` are supported. Do not
claim strict v0.2 compliance until backend implementation and subteam agreement.
The request currently uses the existing v0.1 selections/priority fields.
No browser Maps key has been added; no real Google integration is tested here.

## Manual checks

1. `/dev/map`: select markers/list entries and clear selection; both stay in sync.
2. Switch Day 1/Day 2: stop count/order, route and date update; selection clears.
3. Test scenarios: derived times match normal; unknown times say Unavailable;
   empty/infeasible states show no route; plan fixture displays steps/skipped place.
4. At 375px wide, the list stacks below the canvas; keyboard focus remains usable.
5. `/plan/itinerary` without configuration links back to setup. With valid trip
   state/backend, Generate sends one request per click. Check failure/retry and
   previous-result preservation. Live backend checks require team credentials.

Remaining: Steven's real Google map; live backend/optimizer verification; v0.2
input UI; final responsive/accessibility review and optional extra POI details.
Multi-day viewing is supported, not multi-day optimization. One accommodation,
transport mode and day start apply across dates, consistent with current contract.

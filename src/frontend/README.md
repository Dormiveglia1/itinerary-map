# Itinerary Map — frontend

React + TypeScript web client, built with Vite.

## Commands

```sh
npm install        # install dependencies
npm run dev        # start the dev server
npm run build      # type-check and build for production
npm run lint       # lint with oxlint
```

Requires Node 22.12+ and npm 11+ (see `engines` in `package.json`).

## Interactive map development preview

From `src/frontend`, run `npm ci` then `npm run dev`. On Windows PowerShell,
use `npm.cmd` if script execution is restricted. Open the printed Local URL
with `/dev/map` appended (usually http://localhost:5173/dev/map).
No backend, Google key, or trip form is needed. This route is development-only;
it is not available through `npm run preview` or the production build.

The canvas is a schematic projection of coordinates, not Google Maps or road
directions. All schedules are synthetic and IDs are not Google Place IDs.
The existing planning workflow and API types are unchanged.

### Data flow and files

`mockItinerary.ts` (map-facing subset of v0.2 REST response)
→ `toMapItinerary.ts` → `MapItinerary` → `MapPreviewPage.tsx`.

- `types.ts`: proposed REST subset, internal map model and controlled selection
  interface (`selectedPoiId`, `onSelectPoi`). These are not a full v0.2 API schema.
- `toMapItinerary.ts`: keeps activity order and polyline values, maps snake_case
  fields to the map model, and uses accommodation/day start from request context.
  Missing arrival is derived from previous end + travel; missing waiting is
  derived from start - arrival. Unknown times remain null. Zero is valid.
  Returns null for infeasible results or an absent day. Coordinate values are
  trusted here; runtime API validation remains part of future integration.
- `mockItinerary.ts`: default two-day itinerary plus scenarios for normal stops with null polylines, derived
  times, unknown times, an empty day, no days, and an infeasible result.
- `MapPreviewPage.tsx` / `map.css`: temporary canvas, list and details for
  checking interactions. Date buttons switch the active day; selection resets
  when the day or scenario changes. Each day uses the same accommodation and day start.

### Check the preview

1. Select each numbered marker and each list item; verify both highlight the same
   stop and update details. Tab to a marker and press Enter to select it.
   Switch to Day 2: only its two stops and route should appear, numbering restarts
   at 1, and prior selection clears. Switch back to Day 1 to see its three stops.
2. Expand Development test scenarios below the preview to switch scenarios.
   Derived times should match normal times; placeholder times
   should say Unavailable, while known zero waiting should say 0 min.
3. Empty/no-days scenarios show an empty state. Infeasible shows the violation
   and unscheduled place instead of a route.
4. At a narrow viewport the list should move below the canvas.
5. Run `npm run build` and `npm run lint` before sharing changes.

### Remaining work to discuss with Steven

- Google Maps loading/configuration, real markers, bounds and map selection.
- Decode backend polylines; show labeled straight-line fallback when absent.
- Extract final list/details components using the shared selection interface.
- Agree optional detail fields, loading/error handling and API validation.
- Integrate generation into the itinerary page once backend v0.2 is available;
  update shared API types in coordination with the frontend/backend team.

The preview supports selecting a day from `days[]`; it does not generate multi-day
schedules. Actual routing, HTTP calls and production page integration are not implemented.
Different accommodation or start times per day are not modeled. The split of remaining work
is intentionally not assigned yet.

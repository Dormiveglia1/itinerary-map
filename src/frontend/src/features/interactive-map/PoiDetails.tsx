import type { MapStop } from './types.ts'
import { formatMinutes, formatTime } from './format.ts'

export default function PoiDetails({ stop, onClear }: { stop: MapStop | undefined; onClear: () => void }) {
  return <section aria-live="polite" aria-label="Selected place details">
    {stop ? <>
      <h2>{stop.name}</h2>
      <dl>
        <dt>Arrival</dt><dd>{formatTime(stop.arrival)}</dd>
        <dt>Visit</dt><dd>{formatTime(stop.start)}–{formatTime(stop.end)}</dd>
        <dt>Visit duration</dt><dd>{formatMinutes(stop.start === null || stop.end === null ? null : stop.end - stop.start)}</dd>
        <dt>Travel before visit</dt><dd>{formatMinutes(stop.travelMinutesBefore)}</dd>
        <dt>Waiting</dt><dd>{formatMinutes(stop.waitMinutes)}</dd>
      </dl>
      <button type="button" onClick={onClear}>Clear selection</button>
    </> : <p>Select a stop on the map or in the list to see its details.</p>}
  </section>
}

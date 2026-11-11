import type { MapStop, PoiSelectionProps } from './types.ts'
import { formatMinutes, formatTime } from './format.ts'

export default function ItineraryStopList({ stops, selectedPoiId, onSelectPoi }: PoiSelectionProps & { stops: MapStop[] }) {
  return <section aria-label="Scheduled places">
    <h2>Your stops</h2>
    <ol>{stops.map(stop => <li key={stop.id}>
      <button type="button" aria-pressed={stop.id === selectedPoiId} onClick={() => onSelectPoi(stop.id)}>
        {stop.name}
        <small>{formatTime(stop.start)}–{formatTime(stop.end)}</small>
        <small>Travel before visit: {formatMinutes(stop.travelMinutesBefore)}</small>
      </button>
    </li>)}</ol>
  </section>
}

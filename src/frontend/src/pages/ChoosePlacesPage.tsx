import {
  Button,
  Classes,
  H1,
  Icon,
  InputGroup,
  NonIdealState,
  SegmentedControl,
  type IconName,
} from '@blueprintjs/core'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  fetchCandidatePois,
  type Poi,
  type PoiKind,
  type TransportMode,
} from '../api/index.ts'
import {
  MAX_SELECTED_POIS,
  RECOMMENDED_MIN_POIS,
  formatDuration,
  formatTimeOfDay,
  toggleSelection,
  totalVisitMinutes,
  validSelection,
} from '../trip/placeSelection.ts'
import { PRICE_LEVEL_LABELS } from '../trip/tripForm.ts'
import { useTrip } from '../trip/useTrip.ts'

type CategoryFilter = 'all' | PoiKind

const CATEGORY_ICONS: Record<PoiKind, IconName> = {
  attraction: 'camera',
  restaurant: 'glass',
}

const CATEGORY_LABELS: Record<PoiKind, string> = {
  attraction: 'Attraction',
  restaurant: 'Restaurant',
}

const TRANSPORT_SUMMARY: Record<TransportMode, { label: string; icon: IconName }> = {
  walk: { label: 'Walking', icon: 'walk' },
  transit: { label: 'Transit', icon: 'train' },
  drive: { label: 'Driving', icon: 'drive-time' },
}

const SKELETON_CARDS = 6

function formatTripDate(iso: string): string {
  // Parsed as a local calendar day, not UTC midnight.
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function PlaceCard({
  poi,
  selected,
  disabled,
  onToggle,
}: {
  poi: Poi
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`place-card${selected ? ' place-card-selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? `You can choose up to ${MAX_SELECTED_POIS} places.` : undefined}
      onClick={onToggle}
    >
      <span className={`place-card-icon place-card-icon-${poi.category}`}>
        <Icon icon={CATEGORY_ICONS[poi.category]} size={18} />
      </span>
      <span className="place-card-body">
        <span className="place-card-name">{poi.name}</span>
        <span className="place-card-meta">
          <span>{CATEGORY_LABELS[poi.category]}</span>
          <span>
            <Icon icon="time" size={12} /> {formatDuration(poi.visitDurationMinutes)}
          </span>
          {poi.priceLevel !== null && (
            <span title={PRICE_LEVEL_LABELS[poi.priceLevel]}>
              {'$'.repeat(poi.priceLevel)}
            </span>
          )}
        </span>
      </span>
      <span className="place-card-check" aria-hidden="true">
        <Icon icon={selected ? 'tick' : 'plus'} size={14} />
      </span>
    </button>
  )
}

// SRS §16: choose ~5–10 candidate places in one city for a one-day itinerary.
function ChoosePlacesPage() {
  const { trip, accommodation, selectedPoiIds, setSelectedPoiIds } = useTrip()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  // Tagged with the attempt it answers, so a retry shows as loading.
  const [result, setResult] = useState<{
    attempt: number
    pois: Poi[] | null
  } | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  useEffect(() => {
    if (!trip) {
      return
    }
    let cancelled = false
    fetchCandidatePois(trip).then(
      (pois) => {
        if (!cancelled) setResult({ attempt, pois })
      },
      () => {
        if (!cancelled) setResult({ attempt, pois: null })
      },
    )
    return () => {
      cancelled = true
    }
  }, [trip, attempt])

  if (!trip) {
    return (
      <NonIdealState
        icon="path-search"
        title="Start with your trip details"
        description="Tell us where and when you're going, then come back to choose places."
        action={
          <Link to="/plan" className={`${Classes.BUTTON} ${Classes.INTENT_PRIMARY}`}>
            Set up your trip
          </Link>
        }
      />
    )
  }

  const loading = result === null || result.attempt !== attempt
  const candidates = (!loading && result.pois) || []
  const failed = !loading && result.pois === null

  const selected = validSelection(selectedPoiIds, candidates)
  const atCap = selected.length >= MAX_SELECTED_POIS
  const visitMinutes = totalVisitMinutes(selected, candidates)
  const dayMinutes = trip.day_end - trip.day_start

  const q = query.trim().toLowerCase()
  const visible = candidates.filter(
    (poi) =>
      (category === 'all' || poi.category === category) &&
      poi.name.toLowerCase().includes(q),
  )
  const countOf = (kind: PoiKind) =>
    candidates.filter((poi) => poi.category === kind).length

  const transport = TRANSPORT_SUMMARY[trip.transport_mode]

  return (
    <>
      <H1>Choose places</H1>
      <p className="page-lead">
        Pick the places you'd like to visit. We'll work out the order and
        timing.
      </p>

      <div className="trip-summary">
        <ul>
          <li>
            <Icon icon="map-marker" size={14} />
            {trip.city}
          </li>
          <li>
            <Icon icon="calendar" size={14} />
            {formatTripDate(trip.dates[0])}
          </li>
          <li>
            <Icon icon="time" size={14} />
            {formatTimeOfDay(trip.day_start)}–{formatTimeOfDay(trip.day_end)}
          </li>
          {accommodation && (
            <li>
              <Icon icon="home" size={14} />
              {accommodation.name}
            </li>
          )}
          <li>
            <Icon icon={transport.icon} size={14} />
            {transport.label}
          </li>
        </ul>
        <Link to="/plan" className="trip-summary-edit">
          <Icon icon="edit" size={12} /> Edit trip
        </Link>
      </div>

      <div className="places-toolbar">
        <InputGroup
          leftIcon="search"
          placeholder="Filter places"
          aria-label="Filter places by name"
          value={query}
          onValueChange={setQuery}
          className="places-search"
        />
        <SegmentedControl
          options={[
            { value: 'all', label: `All (${candidates.length})` },
            { value: 'attraction', label: `Attractions (${countOf('attraction')})` },
            { value: 'restaurant', label: `Restaurants (${countOf('restaurant')})` },
          ]}
          value={category}
          onValueChange={(v) => setCategory(v as CategoryFilter)}
        />
      </div>

      {failed ? (
        <NonIdealState
          icon="error"
          title="Couldn't load places"
          description="Something went wrong fetching places for this trip."
          action={<Button text="Try again" onClick={() => setAttempt((n) => n + 1)} />}
        />
      ) : loading ? (
        <div className="places-grid" aria-busy="true">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div key={i} className={`place-card ${Classes.SKELETON}`} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <NonIdealState
          icon="search"
          title="No matching places"
          description={
            candidates.length === 0
              ? 'No places fit this trip. Try a higher price range.'
              : 'Try a different name or category.'
          }
        />
      ) : (
        <div className="places-grid">
          {visible.map((poi) => {
            const isSelected = selected.includes(poi.placeId)
            return (
              <PlaceCard
                key={poi.placeId}
                poi={poi}
                selected={isSelected}
                disabled={atCap && !isSelected}
                onToggle={() =>
                  setSelectedPoiIds(toggleSelection(selected, poi.placeId))
                }
              />
            )
          })}
        </div>
      )}

      <div className="selection-bar">
        <div className="selection-bar-status" aria-live="polite">
          <strong>
            {selected.length} of {MAX_SELECTED_POIS} places selected
          </strong>
          <span
            className={
              visitMinutes > dayMinutes ? 'selection-bar-warning' : undefined
            }
          >
            {selected.length === 0
              ? `Pick ${RECOMMENDED_MIN_POIS}–${MAX_SELECTED_POIS} places for a full day.`
              : visitMinutes > dayMinutes
                ? `Visits add up to ${formatDuration(visitMinutes)}, longer than your ${formatDuration(dayMinutes)} day before travel.`
                : selected.length < RECOMMENDED_MIN_POIS
                  ? `${formatDuration(visitMinutes)} of visits. Add a few more for a full day.`
                  : `${formatDuration(visitMinutes)} of visits in a ${formatDuration(dayMinutes)} day.`}
          </span>
          <div
            className="selection-meter"
            role="presentation"
          >
            <div
              style={{
                width: `${(selected.length / MAX_SELECTED_POIS) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="selection-bar-actions">
          <Link to="/plan" className={`${Classes.BUTTON} ${Classes.MINIMAL}`}>
            <Icon icon="arrow-left" />
            <span className={Classes.BUTTON_TEXT}>Back</span>
          </Link>
          <Button
            intent="primary"
            size="large"
            endIcon="arrow-right"
            text="Build itinerary"
            disabled={selected.length === 0}
            onClick={() => {
              setSelectedPoiIds(selected)
              navigate('/plan/itinerary')
            }}
          />
        </div>
      </div>
    </>
  )
}

export default ChoosePlacesPage

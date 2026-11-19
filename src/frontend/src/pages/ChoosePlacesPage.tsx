import {
  Button,
  Classes,
  H1,
  Icon,
  InputGroup,
  NonIdealState,
  Slider,
  type IconName,
} from '@blueprintjs/core'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ApiError,
  searchPlaces,
  type PlaceSearchResult,
  type PoiKind,
  type TransportMode,
} from '../api/index.ts'
import {
  MAX_PRIORITY,
  MAX_SELECTED_POIS,
  MIN_PRIORITY,
  RECOMMENDED_MIN_POIS,
  formatTimeOfDay,
  isSelected,
  priorityLabel,
  toggleSelection,
  withPriority,
} from '../trip/placeSelection.ts'
import { useTrip } from '../trip/useTrip.ts'

const MIN_QUERY_LENGTH = 2

// One-tap searches, so the page is useful before the traveller types anything.
const SEARCH_SHORTCUTS: { label: string; query: string; icon: IconName }[] = [
  { label: 'Top sights', query: 'tourist attractions', icon: 'star' },
  { label: 'Museums', query: 'museums', icon: 'office' },
  { label: 'Parks', query: 'parks', icon: 'tree' },
  { label: 'Galleries', query: 'art galleries', icon: 'media' },
  { label: 'Restaurants', query: 'restaurants', icon: 'glass' },
  { label: 'Cafes', query: 'cafes', icon: 'shop' },
]

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
  place,
  selected,
  disabled,
  onToggle,
}: {
  place: PlaceSearchResult
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
      <span className={`place-card-icon place-card-icon-${place.kind}`}>
        <Icon icon={CATEGORY_ICONS[place.kind]} size={18} />
      </span>
      <span className="place-card-body">
        <span className="place-card-name">{place.name}</span>
        <span className="place-card-meta">{CATEGORY_LABELS[place.kind]}</span>
      </span>
      <span className="place-card-check" aria-hidden="true">
        <Icon icon={selected ? 'tick' : 'plus'} size={14} />
      </span>
    </button>
  )
}

// SRS §16: choose ~5–10 places in one city for a one-day itinerary.
function ChoosePlacesPage() {
  const { trip, accommodation, selections, setSelections } = useTrip()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  // `id` makes repeating the same search (e.g. retrying) run it again.
  const [search, setSearch] = useState<{ id: number; query: string } | null>(null)
  // Tagged with the search it answers, so a new search shows as loading.
  const [result, setResult] = useState<{
    id: number
    places: PlaceSearchResult[] | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!trip || !search) {
      return
    }
    const controller = new AbortController()
    searchPlaces(trip.city, search.query, controller.signal).then(
      (places) => setResult({ id: search.id, places, error: null }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          id: search.id,
          places: null,
          error:
            error instanceof ApiError
              ? error.message
              : 'Something went wrong searching for places.',
        })
      },
    )
    return () => controller.abort()
  }, [trip, search])

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

  function runSearch(query: string) {
    setSearch((prev) => ({ id: (prev?.id ?? 0) + 1, query }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const query = input.trim()
    if (query.length >= MIN_QUERY_LENGTH) {
      runSearch(query)
    }
  }

  const loading = search !== null && result?.id !== search.id
  const places = (!loading && result?.places) || []
  const error = !loading ? result?.error : null
  const atCap = selections.length >= MAX_SELECTED_POIS
  const transport = TRANSPORT_SUMMARY[trip.transport_mode]

  return (
    <>
      <H1>Choose places</H1>
      <p className="page-lead">
        Find the places you'd like to visit and tell us how much each one
        matters. We'll work out the order and timing.
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
          <li>
            <Icon icon="bank-account" size={14} />
            {trip.budget.toLocaleString(undefined, {
              style: 'currency',
              currency: 'CAD',
              currencyDisplay: 'narrowSymbol',
              maximumFractionDigits: 0,
            })}{' '}
            budget
          </li>
        </ul>
        <Link to="/plan" className="trip-summary-edit">
          <Icon icon="edit" size={12} /> Edit trip
        </Link>
      </div>

      <form className="places-search" onSubmit={handleSubmit} role="search">
        <InputGroup
          leftIcon="search"
          placeholder={`Search places in ${trip.city}`}
          aria-label="Search places"
          value={input}
          onValueChange={setInput}
          size="large"
          rightElement={
            <Button
              type="submit"
              intent="primary"
              text="Search"
              disabled={input.trim().length < MIN_QUERY_LENGTH}
            />
          }
        />
      </form>
      <div className="search-chips" aria-label="Suggested searches">
        {SEARCH_SHORTCUTS.map((shortcut) => {
          const active = search?.query === shortcut.query
          return (
            <button
              key={shortcut.query}
              type="button"
              className={`search-chip${active ? ' search-chip-active' : ''}`}
              aria-pressed={active}
              onClick={() => {
                setInput('')
                runSearch(shortcut.query)
              }}
            >
              <Icon icon={shortcut.icon} size={12} />
              {shortcut.label}
            </button>
          )
        })}
      </div>

      {search === null ? (
        <NonIdealState
          className="places-empty"
          icon="geosearch"
          title="Find places to visit"
          description="Search by name or type, or pick one of the suggestions above."
        />
      ) : loading ? (
        <div className="places-grid" aria-busy="true">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div key={i} className={`place-card ${Classes.SKELETON}`} />
          ))}
        </div>
      ) : error ? (
        <NonIdealState
          className="places-empty"
          icon="error"
          title="Couldn't search places"
          description={error}
          action={<Button text="Try again" onClick={() => runSearch(search.query)} />}
        />
      ) : places.length === 0 ? (
        <NonIdealState
          className="places-empty"
          icon="search"
          title="No places found"
          description="Try a different search."
        />
      ) : (
        <div className="places-grid">
          {places.map((place) => {
            const selected = isSelected(selections, place.place_id)
            return (
              <PlaceCard
                key={place.place_id}
                place={place}
                selected={selected}
                disabled={atCap && !selected}
                onToggle={() => setSelections(toggleSelection(selections, place))}
              />
            )
          })}
        </div>
      )}

      {selections.length > 0 && (
        <section className="your-places" aria-labelledby="your-places-title">
          <h2 id="your-places-title">Your places</h2>
          <p className="your-places-lead">
            Higher priority places are kept first if not everything fits.
          </p>
          <ol>
            {selections.map(({ place, priority }) => (
              <li key={place.place_id} className="your-place">
                <span className={`place-card-icon place-card-icon-${place.kind}`}>
                  <Icon icon={CATEGORY_ICONS[place.kind]} size={16} />
                </span>
                <div className="your-place-name">
                  <strong>{place.name}</strong>
                  <small>{CATEGORY_LABELS[place.kind]}</small>
                </div>
                <div className="your-place-priority">
                  <span className="your-place-priority-label">
                    Priority <strong>{priority}</strong> · {priorityLabel(priority)}
                  </span>
                  <Slider
                    min={MIN_PRIORITY}
                    max={MAX_PRIORITY}
                    stepSize={1}
                    labelValues={[MIN_PRIORITY, 5, MAX_PRIORITY]}
                    value={priority}
                    onChange={(value) =>
                      setSelections(withPriority(selections, place.place_id, value))
                    }
                    handleHtmlProps={{ 'aria-label': `Priority for ${place.name}` }}
                  />
                </div>
                <Button
                  variant="minimal"
                  icon="cross"
                  aria-label={`Remove ${place.name}`}
                  onClick={() => setSelections(toggleSelection(selections, place))}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="selection-bar">
        <div className="selection-bar-status" aria-live="polite">
          <strong>
            {selections.length} of {MAX_SELECTED_POIS} places selected
          </strong>
          <span>
            {selections.length < RECOMMENDED_MIN_POIS
              ? `Pick ${RECOMMENDED_MIN_POIS}–${MAX_SELECTED_POIS} places for a full day.`
              : atCap
                ? "That's the most for one day."
                : 'Ready when you are.'}
          </span>
          <div className="selection-meter" role="presentation">
            <div
              style={{ width: `${(selections.length / MAX_SELECTED_POIS) * 100}%` }}
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
            disabled={selections.length === 0}
            onClick={() => navigate('/plan/itinerary')}
          />
        </div>
      </div>
    </>
  )
}

export default ChoosePlacesPage

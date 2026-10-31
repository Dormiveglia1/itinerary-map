import {
  Button,
  Callout,
  Card,
  FormGroup,
  H1,
  HTMLSelect,
  SegmentedControl,
  Switch,
} from '@blueprintjs/core'
import { DateRangeInput, TimePicker, TimePrecision } from '@blueprintjs/datetime'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { Pace, PriceLevel, TransportMode } from '../api/index.ts'
import PlaceSuggest from '../components/PlaceSuggest.tsx'
import {
  PRICE_LEVEL_LABELS,
  SUPPORTED_CITIES,
  defaultTripFormValues,
  toTripConfig,
  tripFormValuesFrom,
  validateTripForm,
  type TripFormValues,
} from '../trip/tripForm.ts'
import { useTrip } from '../trip/useTrip.ts'

const TRANSPORT_OPTIONS = [
  { value: 'walk', label: 'Walk', icon: 'walk' as const },
  { value: 'transit', label: 'Transit', icon: 'train' as const },
  { value: 'drive', label: 'Drive', icon: 'drive-time' as const },
]

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'packed', label: 'Packed' },
]

const PRICE_LEVELS: PriceLevel[] = [1, 2, 3, 4]
const PRICE_OPTIONS = PRICE_LEVELS.map((level) => ({
  value: String(level),
  label: '$'.repeat(level),
}))

function today(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function oneYearFrom(date: Date): Date {
  return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate())
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// SRS §8 trip configuration: collects a TripConfig and moves on to choosing
// places.
function TripSetupPage() {
  const { trip, accommodation, setTrip } = useTrip()
  const navigate = useNavigate()
  const [values, setValues] = useState<TripFormValues>(() =>
    trip ? tripFormValuesFrom(trip, accommodation) : defaultTripFormValues(),
  )
  // Errors only show after the first submit attempt, then update live.
  const [submitted, setSubmitted] = useState(false)
  const [minDate] = useState(today)

  const errors = submitted ? validateTripForm(values) : {}
  const errorCount = Object.keys(errors).length

  function update<K extends keyof TripFormValues>(
    key: K,
    value: TripFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateTripForm(values)).length > 0 || !values.accommodation) {
      return
    }
    setTrip(toTripConfig(values), values.accommodation)
    navigate('/plan/places')
  }

  return (
    <>
      <H1>Plan your trip</H1>
      <p className="page-lead">
        Tell us where and when you're going. Next, you'll choose the places to
        visit.
      </p>

      <Card className="trip-form-card">
        <form onSubmit={handleSubmit} noValidate>
          {errorCount > 0 && (
            <Callout intent="danger" icon="error" className="trip-form-callout">
              Fix the highlighted {errorCount === 1 ? 'field' : 'fields'} to
              continue.
            </Callout>
          )}

          <FormGroup label="Destination" labelFor="trip-city">
            <HTMLSelect
              id="trip-city"
              fill
              value={values.city}
              onChange={(e) => {
                update('city', e.currentTarget.value)
                // Accommodation is searched within the city.
                update('accommodation', null)
              }}
              options={SUPPORTED_CITIES.map((c) => c.name)}
            />
          </FormGroup>

          <FormGroup
            label="Dates"
            helperText={
              errors.dateRange ?? 'Single-day trips only for now.'
            }
            intent={errors.dateRange ? 'danger' : 'none'}
          >
            <DateRangeInput
              fill
              value={values.dateRange}
              onChange={(range) => update('dateRange', range)}
              allowSingleDayRange
              minDate={minDate}
              maxDate={oneYearFrom(minDate)}
              formatDate={formatDate}
              parseDate={(text) => {
                const date = new Date(text)
                return Number.isNaN(date.getTime()) ? null : date
              }}
              shortcuts={false}
              startInputProps={{
                placeholder: 'Start date',
                intent: errors.dateRange ? 'danger' : 'none',
              }}
              endInputProps={{
                placeholder: 'End date',
                intent: errors.dateRange ? 'danger' : 'none',
              }}
            />
          </FormGroup>

          <div className="form-row">
            <FormGroup label="Start the day at">
              <TimePicker
                value={values.dayStart}
                onChange={(time) => update('dayStart', time)}
                precision={TimePrecision.MINUTE}
                useAmPm
              />
            </FormGroup>
            <FormGroup
              label="End the day by"
              helperText={errors.dayEnd}
              intent={errors.dayEnd ? 'danger' : 'none'}
            >
              <TimePicker
                value={values.dayEnd}
                onChange={(time) => update('dayEnd', time)}
                precision={TimePrecision.MINUTE}
                useAmPm
              />
            </FormGroup>
          </div>

          <FormGroup
            label="Where are you staying?"
            labelFor="trip-accommodation"
            helperText={
              errors.accommodation ??
              'Each day starts and ends at your accommodation.'
            }
            intent={errors.accommodation ? 'danger' : 'none'}
          >
            <PlaceSuggest
              id="trip-accommodation"
              city={values.city}
              value={values.accommodation}
              onChange={(place) => update('accommodation', place)}
              placeholder="Search for a hotel or address"
              hasError={Boolean(errors.accommodation)}
            />
          </FormGroup>

          <FormGroup
            label="Price range"
            helperText={`Up to ${'$'.repeat(values.maxPriceLevel)}: ${PRICE_LEVEL_LABELS[values.maxPriceLevel].toLowerCase()}. Places above this level are left out.`}
          >
            <SegmentedControl
              fill
              options={PRICE_OPTIONS}
              value={String(values.maxPriceLevel)}
              onValueChange={(v) =>
                update('maxPriceLevel', Number(v) as PriceLevel)
              }
            />
          </FormGroup>

          <FormGroup label="Getting around">
            <SegmentedControl
              fill
              options={TRANSPORT_OPTIONS}
              value={values.transportMode}
              onValueChange={(v) => update('transportMode', v as TransportMode)}
            />
          </FormGroup>

          <FormGroup
            label="Pace"
            helperText="How long to spend at each place."
          >
            <SegmentedControl
              fill
              options={PACE_OPTIONS}
              value={values.pace}
              onValueChange={(v) => update('pace', v as Pace)}
            />
          </FormGroup>

          <Switch
            checked={values.includeMeals}
            onChange={(e) => update('includeMeals', e.currentTarget.checked)}
            label="Plan lunch and dinner stops"
          />

          <div className="form-actions">
            <Button
              type="submit"
              intent="primary"
              size="large"
              endIcon="arrow-right"
              text="Next: choose places"
            />
          </div>
        </form>
      </Card>
    </>
  )
}

export default TripSetupPage

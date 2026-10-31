import type {
  MealWindows,
  Pace,
  PlaceSearchResult,
  PriceLevel,
  TransportMode,
  TripConfig,
} from '../api/index.ts'

// Cities the app can plan for, with the IANA time zone the contract needs.
export const SUPPORTED_CITIES = [
  { name: 'Toronto', timezone: 'America/Toronto' },
] as const

// The PoC plans a single day (data contract, open question 3).
export const MAX_TRIP_DAYS = 1

// Fixed for now; sent only when the traveller asks for meal stops.
export const DEFAULT_MEAL_WINDOWS: MealWindows = {
  lunch: [690, 810],
  dinner: [1050, 1200],
}

export const PRICE_LEVEL_LABELS: Record<PriceLevel, string> = {
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Expensive',
  4: 'Very expensive',
}

// Form state, in the shapes Blueprint's inputs work with. Times of day are
// Dates whose date part is ignored.
export interface TripFormValues {
  city: string
  dateRange: [Date | null, Date | null]
  dayStart: Date
  dayEnd: Date
  maxPriceLevel: PriceLevel
  transportMode: TransportMode
  pace: Pace
  accommodation: PlaceSearchResult | null
  includeMeals: boolean
}

export type TripFormErrors = Partial<Record<keyof TripFormValues, string>>

export function defaultTripFormValues(): TripFormValues {
  return {
    city: SUPPORTED_CITIES[0].name,
    dateRange: [null, null],
    dayStart: timeFromMinutes(540),
    dayEnd: timeFromMinutes(1260),
    maxPriceLevel: 2,
    transportMode: 'walk',
    pace: 'moderate',
    accommodation: null,
    includeMeals: true,
  }
}

export function tripFormValuesFrom(
  trip: TripConfig,
  accommodation: PlaceSearchResult | null,
): TripFormValues {
  const first = trip.dates[0]
  const last = trip.dates[trip.dates.length - 1]
  return {
    city: trip.city,
    dateRange: [
      first ? dateFromIso(first) : null,
      last ? dateFromIso(last) : null,
    ],
    dayStart: timeFromMinutes(trip.day_start),
    dayEnd: timeFromMinutes(trip.day_end),
    maxPriceLevel: trip.max_price_level,
    transportMode: trip.transport_mode,
    pace: trip.pace,
    accommodation,
    includeMeals: trip.meal_windows !== undefined,
  }
}

export function validateTripForm(values: TripFormValues): TripFormErrors {
  const errors: TripFormErrors = {}
  const [start, end] = values.dateRange

  if (!start || !end) {
    errors.dateRange = 'Choose the dates of your trip.'
  } else if (datesBetween(start, end).length > MAX_TRIP_DAYS) {
    errors.dateRange =
      'Only single-day trips are supported for now. Pick the same start and end date.'
  }

  if (minutesFromTime(values.dayEnd) <= minutesFromTime(values.dayStart)) {
    errors.dayEnd = 'The day must end after it starts.'
  }

  if (!values.accommodation) {
    errors.accommodation = 'Choose where you are staying.'
  }

  return errors
}

// Only call with values that passed validateTripForm.
export function toTripConfig(values: TripFormValues): TripConfig {
  const [start, end] = values.dateRange
  const city = SUPPORTED_CITIES.find((c) => c.name === values.city)
  if (!start || !end || !values.accommodation || !city) {
    throw new Error('toTripConfig called with invalid form values.')
  }

  const trip: TripConfig = {
    city: city.name,
    timezone: city.timezone,
    dates: datesBetween(start, end).map(isoFromDate),
    day_start: minutesFromTime(values.dayStart),
    day_end: minutesFromTime(values.dayEnd),
    max_price_level: values.maxPriceLevel,
    transport_mode: values.transportMode,
    pace: values.pace,
    accommodation: {
      lat: values.accommodation.lat,
      lng: values.accommodation.lng,
    },
  }
  if (values.includeMeals) {
    trip.meal_windows = DEFAULT_MEAL_WINDOWS
  }
  return trip
}

export function minutesFromTime(time: Date): number {
  return time.getHours() * 60 + time.getMinutes()
}

export function timeFromMinutes(minutes: number): Date {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
}

// Dates are calendar days in the city's time zone, so build and read them from
// local date parts rather than going through UTC.
function isoFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function datesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (day <= end) {
    dates.push(new Date(day))
    day.setDate(day.getDate() + 1)
  }
  return dates
}

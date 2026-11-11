export function formatTime(value: number | null): string {
  if (value === null) return 'Unavailable'
  const dayOffset = Math.floor(value / 1440)
  const clock = `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  return dayOffset > 0 ? `${clock} (+${dayOffset} day)` : clock
}
export function formatMinutes(value: number | null): string {
  return value === null ? 'Unavailable' : `${value} min`
}

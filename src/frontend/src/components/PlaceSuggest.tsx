import { MenuItem } from '@blueprintjs/core'
import { Suggest, type ItemRenderer } from '@blueprintjs/select'
import { useEffect, useState } from 'react'
import { searchPlaces, type PlaceSearchResult } from '../api/index.ts'

// Each search is a billed Google call, so wait for a pause in typing and a
// few characters before searching.
const SEARCH_DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 2

interface PlaceSuggestProps {
  id?: string
  city: string
  value: PlaceSearchResult | null
  onChange: (place: PlaceSearchResult) => void
  placeholder?: string
  hasError?: boolean
}

const renderPlace: ItemRenderer<PlaceSearchResult> = (
  place,
  { handleClick, handleFocus, modifiers, ref },
) => (
  <MenuItem
    key={place.place_id}
    ref={ref}
    active={modifiers.active}
    disabled={modifiers.disabled}
    text={place.name}
    onClick={handleClick}
    onFocus={handleFocus}
    roleStructure="listoption"
  />
)

function PlaceSuggest({
  id,
  city,
  value,
  onChange,
  placeholder,
  hasError,
}: PlaceSuggestProps) {
  const [query, setQuery] = useState('')
  // Results are tagged with the query they answer, so a stale response can be
  // told apart from the current one. `places` is null when the search failed.
  const [search, setSearch] = useState<{
    query: string
    places: PlaceSearchResult[] | null
  }>({ query: '', places: [] })

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH
  const answered = search.query === query
  const results = hasQuery && answered ? (search.places ?? []) : []
  const loading = hasQuery && !answered
  const failed = hasQuery && answered && search.places === null

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(city, query.trim(), controller.signal).then(
        (places) => setSearch({ query, places }),
        () => {
          if (!controller.signal.aborted) setSearch({ query, places: null })
        },
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [city, query])

  return (
    <Suggest<PlaceSearchResult>
      fill
      items={results}
      itemRenderer={renderPlace}
      itemsEqual={(a, b) => a.place_id === b.place_id}
      inputValueRenderer={(place) => place.name}
      selectedItem={value}
      onItemSelect={onChange}
      query={query}
      onQueryChange={setQuery}
      inputProps={{
        id,
        placeholder,
        leftIcon: 'search',
        intent: hasError ? 'danger' : 'none',
      }}
      noResults={
        <MenuItem
          disabled
          text={
            !hasQuery
              ? 'Type to search'
              : loading
                ? 'Searching…'
                : failed
                  ? "Search isn't available right now"
                  : 'No matching places'
          }
          roleStructure="listoption"
        />
      }
      popoverProps={{ minimal: true, matchTargetWidth: true }}
    />
  )
}

export default PlaceSuggest

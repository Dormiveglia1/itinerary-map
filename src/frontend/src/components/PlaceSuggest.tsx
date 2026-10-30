import { MenuItem } from '@blueprintjs/core'
import { Suggest, type ItemRenderer } from '@blueprintjs/select'
import { useEffect, useState } from 'react'
import { searchPlaces, type PlaceSearchResult } from '../api/index.ts'

// Waits for a pause in typing so the real endpoint isn't hit per keystroke.
const SEARCH_DEBOUNCE_MS = 250

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
    label={place.kind}
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
  // told apart from the current one.
  const [search, setSearch] = useState<{
    query: string
    places: PlaceSearchResult[]
  }>({ query: '', places: [] })

  const hasQuery = query.trim() !== ''
  const results = hasQuery ? search.places : []
  const loading = hasQuery && search.query !== query

  useEffect(() => {
    if (!query.trim()) {
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchPlaces(city, query)
        .catch(() => [])
        .then((places) => {
          if (!cancelled) setSearch({ query, places })
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
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

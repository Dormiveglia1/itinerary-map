"""Google Places JSON -> Data Contract v0.2 structures.

The optimizer never sees Google's formats; everything is converted here.
"""

from datetime import date

# ---- defaults for values Google does not provide (SRS §9: "clearly stated default value")

RESTAURANT_TYPES = {"restaurant", "cafe", "bakery", "bar", "meal_takeaway", "food_court",
                    "coffee_shop", "fast_food_restaurant"}

# Exact primaryType match first, then keyword match across primaryType + types.
VISIT_MINUTES_EXACT = {
    "museum": 120, "art_gallery": 90, "tourist_attraction": 90, "park": 60, "zoo": 180,
    "amusement_park": 240, "aquarium": 120, "restaurant": 60, "cafe": 30, "coffee_shop": 30,
}
VISIT_MINUTES_KEYWORDS = [  # order matters: first match wins
    ("museum", 120), ("zoo", 180), ("aquarium", 120), ("amusement", 240), ("gallery", 90),
    ("park", 60), ("restaurant", 60), ("cafe", 30), ("coffee", 30), ("bar", 60),
]
FALLBACK_VISIT_MINUTES = 60
PACE_FACTOR = {"relaxed": 1.25, "normal": 1.0, "packed": 0.8}

# Estimated cost per person (CAD). Contract open question 1 — placeholder until decided.
RESTAURANT_COST_BY_PRICE_LEVEL = {
    "PRICE_LEVEL_FREE": 0.0, "PRICE_LEVEL_INEXPENSIVE": 15.0, "PRICE_LEVEL_MODERATE": 30.0,
    "PRICE_LEVEL_EXPENSIVE": 60.0, "PRICE_LEVEL_VERY_EXPENSIVE": 100.0,
}
DEFAULT_RESTAURANT_COST = 30.0
DEFAULT_ATTRACTION_COST = 0.0


def display_name(place: dict) -> str:
    return (place.get("displayName") or {}).get("text", "")


def kind_of(place: dict) -> str:
    """primaryType decides when present: a museum with a café inside lists "restaurant"
    in `types` but is still an attraction (e.g. Gardiner Museum)."""
    primary = place.get("primaryType")
    if primary:
        return "restaurant" if primary in RESTAURANT_TYPES or primary.endswith("_restaurant") else "attraction"
    return "restaurant" if set(place.get("types", [])) & RESTAURANT_TYPES else "attraction"


def default_visit_minutes(place: dict, pace: str = "normal") -> int:
    ptype = place.get("primaryType", "")
    base = VISIT_MINUTES_EXACT.get(ptype)
    if base is None:
        haystack = " ".join([ptype, *place.get("types", [])])
        base = next((m for kw, m in VISIT_MINUTES_KEYWORDS if kw in haystack), FALLBACK_VISIT_MINUTES)
    return max(1, round(base * PACE_FACTOR.get(pace, 1.0)))


def default_cost(place: dict, kind: str) -> float:
    if kind == "restaurant":
        return RESTAURANT_COST_BY_PRICE_LEVEL.get(place.get("priceLevel"), DEFAULT_RESTAURANT_COST)
    return DEFAULT_ATTRACTION_COST


def _to_minutes(t: dict) -> int:
    return t.get("hour", 0) * 60 + t.get("minute", 0)


def _google_weekday(d: date) -> int:
    """Google: 0 = Sunday ... 6 = Saturday. Python: Monday = 0."""
    return (d.weekday() + 1) % 7


def resolve_opening_hours(place: dict, dates: list[str]) -> dict | None:
    """Weekly Google periods -> {"YYYY-MM-DD": [[open, close], ...]} in minutes since midnight.

    Overnight periods are cut at midnight (contract open question 2 proposal).
    [] means closed that day. Returns None if Google has no hours at all.
    """
    periods = (place.get("regularOpeningHours") or {}).get("periods")
    if not periods:
        return None
    by_day: dict[int, list[list[int]]] = {d: [] for d in range(7)}
    for p in periods:
        o, c = p.get("open", {}), p.get("close")
        day = o.get("day", 0)
        if c is None:  # Google's "open 24 hours"
            by_day = {d: [[0, 1440]] for d in range(7)}
            break
        start = _to_minutes(o)
        end = _to_minutes(c) if c.get("day", day) == day else 1440
        if end > start:
            by_day[day].append([start, end])

    out = {}
    for ds in dates:
        merged: list[list[int]] = []
        for s, e in sorted(by_day[_google_weekday(date.fromisoformat(ds))]):
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        out[ds] = merged
    return out


def restrict_to_meal_windows(hours: dict, meal_windows: dict | None) -> dict:
    """Contract v0.2: a restaurant's hours become their overlap with the meal windows,
    so the optimizer can only place it at meal times. No meal windows -> unchanged.

    open [[660, 1320]], lunch [690, 810], dinner [1050, 1200] -> [[690, 810], [1050, 1200]]
    """
    if not meal_windows:
        return hours
    windows = sorted(meal_windows.values())
    out = {}
    for ds, intervals in hours.items():
        overlap = sorted([max(s, ws), min(e, we)] for s, e in intervals for ws, we in windows
                         if max(s, ws) < min(e, we))
        merged: list[list[int]] = []
        for s, e in overlap:  # meal windows may overlap each other
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        out[ds] = merged
    return out


def to_search_result(place: dict) -> dict:
    """GET /api/places/search item."""
    return {
        "place_id": place["id"],
        "name": display_name(place),
        "kind": kind_of(place),
        "lat": place["location"]["latitude"],
        "lng": place["location"]["longitude"],
    }


def to_poi(place: dict, dates: list[str], priority: int,
           visit_minutes: int | None = None, pace: str = "normal",
           mandatory: bool = False, meal_windows: dict | None = None) -> tuple[dict | None, str | None]:
    """Google place -> contract POI, or (None, unscheduled reason) if it must be excluded."""
    if place.get("businessStatus", "OPERATIONAL") != "OPERATIONAL":
        return None, "closed_on_trip_dates"
    if "location" not in place:
        return None, "unreachable"
    hours = resolve_opening_hours(place, dates)
    if hours is None:  # contract: a missing date means closed
        return None, "closed_on_trip_dates"
    kind = kind_of(place)
    if kind == "restaurant":
        hours = restrict_to_meal_windows(hours, meal_windows)
    return {
        "id": place["id"],
        "name": display_name(place),
        "kind": kind,
        "lat": place["location"]["latitude"],
        "lng": place["location"]["longitude"],
        "priority": priority,
        "mandatory": mandatory,
        "visit_minutes": visit_minutes if visit_minutes is not None else default_visit_minutes(place, pace),
        "cost": default_cost(place, kind),
        "opening_hours": hours,
        "locked": None,
    }, None

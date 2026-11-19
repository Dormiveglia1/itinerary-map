"""PoC endpoints (Data Contract v0.2, part 2)."""

from datetime import datetime
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Query

from . import config, converters, google_client, optimizer_bridge
from .errors import APIError
from .google_client import ACCOMMODATION_ID
from .schemas import GenerateRequest, PlaceSearchResult

router = APIRouter(prefix="/api")


@router.get("/places/search", response_model=list[PlaceSearchResult])
def search_places(
    city: str = Query(min_length=1, examples=["Toronto"]),
    q: str = Query(min_length=1, examples=["museum"]),
    limit: int = Query(10, ge=1, le=20),
):
    """Candidate places for the user to choose from."""
    places = google_client.search_text(f"{q} in {city}", limit)
    return [
        converters.to_search_result(p)
        for p in places
        if "location" in p and p.get("businessStatus", "OPERATIONAL") == "OPERATIONAL"
    ]


def _departure_iso(trip: dict, day: str, minute: int) -> str | None:
    """Departure time for transit routing (in the city's time zone), if it is in the future.

    Google only accepts future departure times for transit; otherwise it uses "now".
    """
    if trip["transport_mode"] != "transit":
        return None
    tz = ZoneInfo(trip["timezone"])
    h, m = divmod(min(max(minute, 0), 1439), 60)
    dt = datetime.fromisoformat(f"{day}T{h:02d}:{m:02d}").replace(tzinfo=tz)
    return dt.isoformat() if dt > datetime.now(tz) else None


def _transit_departure(trip: dict) -> str | None:
    """Transit times depend on departure time: use day 1 at day_start (if in the future)."""
    return _departure_iso(trip, trip["dates"][0], trip["day_start"])


def _infeasible(unscheduled: list[dict], violations: list[dict]) -> dict:
    """Result decided by the backend before running the optimizer (algorithm = null)."""
    return {
        "status": "infeasible",
        "algorithm": None,
        "total_priority": 0,
        "total_cost": 0.0,
        "days": [],
        "unscheduled": unscheduled,
        "violations": violations,
    }


def _fill_arrival(day: dict, day_start: int) -> None:
    """v0.2 arrival / wait_minutes, computed as the contract says if the optimizer left them out."""
    prev_end = day_start
    for act in day.get("activities", []):
        if "arrival" not in act and "travel_minutes_before" in act:
            act["arrival"] = prev_end + act["travel_minutes_before"]
        if "wait_minutes" not in act and "arrival" in act and "start" in act:
            act["wait_minutes"] = act["start"] - act["arrival"]
        prev_end = act.get("end", prev_end)


def _add_polylines(trip: dict, days: list[dict], nodes: dict[str, dict]) -> None:
    """route_polyline_before on each activity, return_route_polyline on each day.

    One Routes call per leg of the final itinerary: accommodation -> A1 -> ... -> An -> accommodation.
    A failed call (or ROUTE_POLYLINES=0) leaves the field null.
    """
    legs = []  # (target dict, key, origin node, destination node, date, departure minute)
    for day in days:
        prev, prev_end = nodes[ACCOMMODATION_ID], trip["day_start"]
        for act in day.get("activities", []):
            act["route_polyline_before"] = None
            node = nodes.get(act.get("poi_id"))
            if node:
                leave = act.get("arrival", prev_end + act.get("travel_minutes_before", 0)) \
                    - act.get("travel_minutes_before", 0)
                legs.append((act, "route_polyline_before", prev, node, day["date"], leave))
            prev, prev_end = node or prev, act.get("end", prev_end)
        day["return_route_polyline"] = None
        if day.get("activities") and prev["id"] != ACCOMMODATION_ID:
            legs.append((day, "return_route_polyline", prev, nodes[ACCOMMODATION_ID], day["date"], prev_end))

    if not config.ROUTE_POLYLINES or not legs:
        return
    mode = trip["transport_mode"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        polylines = list(pool.map(
            lambda leg: google_client.route_polyline(leg[2], leg[3], mode, _departure_iso(trip, leg[4], leg[5])),
            legs))
    for (target, key, *_), poly in zip(legs, polylines):
        target[key] = poly


@router.post("/itineraries/generate")
def generate_itinerary(req: GenerateRequest):
    """Fetch place details, build POIs + TravelTimes, call the optimizer, return ItineraryResult.

    An infeasible itinerary is NOT an HTTP error: 200 with status "infeasible".
    """
    optimizer_bridge.ensure_available()  # before any (billed) Google calls
    trip = req.trip.to_contract()

    with ThreadPoolExecutor(max_workers=8) as pool:
        places = list(pool.map(lambda sel: google_client.place_details(sel.place_id), req.selections))

    pois, excluded, locations, names = [], [], {}, {}
    mandatory_excluded = []
    for sel, place in zip(req.selections, places):
        if place is None:
            raise APIError(400, "invalid_input", f"selections: unknown place_id {sel.place_id!r}")
        names[sel.place_id] = converters.display_name(place)
        locations[sel.place_id] = converters.location_of(place)
        poi, reason = converters.to_poi(place, trip["dates"], sel.priority, sel.visit_minutes, req.trip.pace,
                                        mandatory=sel.mandatory, meal_windows=trip.get("meal_windows"))
        if poi:
            pois.append(poi)
        else:
            excluded.append({"poi_id": sel.place_id, "name": names[sel.place_id],
                             **locations[sel.place_id], "reason": reason})
            if sel.mandatory:
                mandatory_excluded.append(sel.place_id)

    # v0.2: a mandatory place the backend can't use makes the whole trip infeasible.
    if mandatory_excluded:
        listed = ", ".join(names[i] or i for i in mandatory_excluded)
        return _infeasible(excluded, [{
            "code": "MANDATORY_CANNOT_FIT",
            "message": f"Essential place can't be visited on the trip dates: {listed}.",
            "poi_ids": mandatory_excluded,
        }])
    if not pois:
        return _infeasible(excluded, [{
            "code": "NO_FEASIBLE_ITINERARY",
            "message": "None of the selected places can be visited on the trip dates.",
        }])

    nodes = [{"id": ACCOMMODATION_ID, **trip["accommodation"]}] + \
            [{"id": p["id"], "lat": p["lat"], "lng": p["lng"]} for p in pois]
    travel_times = {
        "mode": trip["transport_mode"],
        "source": "google_routes",
        "minutes": google_client.route_matrix(nodes, trip["transport_mode"], _transit_departure(trip)),
    }

    result = optimizer_bridge.run(trip, pois, travel_times)

    # Add display fields; merge places the backend excluded before optimisation.
    days = result.get("days") or []
    for day in days:
        _fill_arrival(day, trip["day_start"])
        for act in day.get("activities", []):
            act.setdefault("name", names.get(act.get("poi_id"), ""))
            for k, v in locations.get(act.get("poi_id"), {}).items():
                act.setdefault(k, v)
    if result.get("status") == "ok":
        _add_polylines(trip, days, {n["id"]: n for n in nodes})

    unscheduled = list(result.get("unscheduled") or [])
    for u in unscheduled:
        u.setdefault("name", names.get(u.get("poi_id"), ""))
        for k, v in locations.get(u.get("poi_id"), {}).items():
            u.setdefault(k, v)
    result["unscheduled"] = unscheduled + excluded
    return result

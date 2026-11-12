"""PoC endpoints (Data Contract v0.2, part 2)."""

from datetime import datetime
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Query

from . import converters, google_client, optimizer_bridge
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


def _transit_departure(trip: dict) -> str | None:
    """Transit times depend on departure time: use day 1 at day_start (if in the future)."""
    if trip["transport_mode"] != "transit":
        return None
    tz = ZoneInfo(trip["timezone"])
    h, m = divmod(trip["day_start"], 60)
    dt = datetime.fromisoformat(f"{trip['dates'][0]}T{h:02d}:{m:02d}").replace(tzinfo=tz)
    return dt.isoformat() if dt > datetime.now(tz) else None


@router.post("/itineraries/generate")
def generate_itinerary(req: GenerateRequest):
    """Fetch place details, build POIs + TravelTimes, call the optimizer, return ItineraryResult.

    An infeasible itinerary is NOT an HTTP error: 200 with status "infeasible".
    """
    optimizer_bridge.ensure_available()  # before any (billed) Google calls
    trip = req.trip.to_contract()

    with ThreadPoolExecutor(max_workers=8) as pool:
        places = list(pool.map(lambda sel: google_client.place_details(sel.place_id), req.selections))

    pois, excluded = [], []
    for sel, place in zip(req.selections, places):
        if place is None:
            raise APIError(400, "invalid_input", f"selections: unknown place_id {sel.place_id!r}")
        poi, reason = converters.to_poi(place, trip["dates"], sel.priority, sel.visit_minutes, req.trip.pace,
                                        mandatory=sel.mandatory)
        if poi:
            pois.append(poi)
        else:
            excluded.append({"poi_id": sel.place_id, "name": converters.display_name(place), "reason": reason})

    if not pois:
        return {
            "status": "infeasible",
            "algorithm": None,
            "total_priority": 0,
            "total_cost": 0.0,
            "days": [],
            "unscheduled": excluded,
            "violations": [{"code": "no_usable_places",
                            "message": "None of the selected places can be visited on the trip dates."}],
        }

    nodes = [{"id": ACCOMMODATION_ID, **trip["accommodation"]}] + \
            [{"id": p["id"], "lat": p["lat"], "lng": p["lng"]} for p in pois]
    travel_times = {
        "mode": trip["transport_mode"],
        "source": "google_routes",
        "minutes": google_client.route_matrix(nodes, trip["transport_mode"], _transit_departure(trip)),
    }

    result = optimizer_bridge.run(trip, pois, travel_times)

    # Add display names; merge places the backend excluded before optimisation.
    names = {p["id"]: p["name"] for p in pois}
    for day in result.get("days") or []:
        for act in day.get("activities", []):
            act.setdefault("name", names.get(act.get("poi_id"), ""))
    unscheduled = list(result.get("unscheduled") or [])
    for u in unscheduled:
        u.setdefault("name", names.get(u.get("poi_id"), ""))
    result["unscheduled"] = unscheduled + excluded
    return result

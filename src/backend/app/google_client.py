"""Thin client for Google Places API (New) and Routes API computeRouteMatrix.

Only this module talks to Google. Everything it returns is raw Google JSON;
conversion to Data Contract structures lives in converters.py.
"""

import math

import requests

from . import config
from .errors import APIError, GoogleAPIError

PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places/{place_id}"
MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"

# Search only needs what the picker shows -> cheaper SKU (no opening hours / price).
SEARCH_FIELDS = ",".join([
    "places.id", "places.displayName", "places.location",
    "places.types", "places.primaryType", "places.businessStatus",
])
# Details for itinerary generation.
DETAILS_FIELDS = ",".join([
    "id", "displayName", "location", "types", "primaryType",
    "regularOpeningHours", "priceLevel", "businessStatus",
])
MATRIX_FIELDS = "originIndex,destinationIndex,duration,status,condition"

MODE_TO_GOOGLE = {"walk": "WALK", "drive": "DRIVE", "transit": "TRANSIT"}
ELEMENT_LIMIT = {"walk": 625, "drive": 625, "transit": 100}  # origins x destinations per request

ACCOMMODATION_ID = "accommodation"


def _key() -> str:
    if not config.GOOGLE_MAPS_API_KEY:
        raise APIError(500, "server_misconfigured", "GOOGLE_MAPS_API_KEY is not set on the server.")
    return config.GOOGLE_MAPS_API_KEY


def _request(method: str, url: str, field_mask: str, **kwargs) -> requests.Response:
    headers = {"X-Goog-Api-Key": _key(), "X-Goog-FieldMask": field_mask}
    try:
        return requests.request(method, url, headers=headers, timeout=config.GOOGLE_TIMEOUT_SEC, **kwargs)
    except requests.RequestException:
        raise GoogleAPIError("google_unavailable", "Could not reach Google Maps. Please try again.")


def search_text(text_query: str, max_results: int = 10) -> list[dict]:
    resp = _request("POST", PLACES_SEARCH_URL, SEARCH_FIELDS,
                    json={"textQuery": text_query, "maxResultCount": max(1, min(max_results, 20))})
    if resp.status_code != 200:
        raise GoogleAPIError("google_error", f"Google Places search failed ({resp.status_code}).")
    return resp.json().get("places", [])


def place_details(place_id: str) -> dict | None:
    """Returns None if Google does not recognise the place id."""
    resp = _request("GET", PLACE_DETAILS_URL.format(place_id=place_id), DETAILS_FIELDS)
    if resp.status_code == 404:
        return None
    if resp.status_code == 400:
        details = resp.json().get("error", {}).get("details", [])
        reasons = {d.get("reason") for d in details}
        if "API_KEY_INVALID" in reasons:
            raise APIError(500, "server_misconfigured", "GOOGLE_MAPS_API_KEY is invalid.")
        return None
    if resp.status_code != 200:
        raise GoogleAPIError("google_error", f"Google Place Details failed ({resp.status_code}).")
    return resp.json()


def _waypoint(node: dict) -> dict:
    if node["id"] != ACCOMMODATION_ID:
        return {"waypoint": {"placeId": node["id"]}}
    return {"waypoint": {"location": {"latLng": {"latitude": node["lat"], "longitude": node["lng"]}}}}


def route_matrix(nodes: list[dict], mode: str, departure_iso: str | None = None) -> dict:
    """minutes[a][b] for every reachable ordered pair; unreachable pairs are omitted (contract).

    nodes: [{"id", "lat", "lng"}], with id "accommodation" for the accommodation.
    Batches origins so each request stays under the element limit (transit = 100).
    """
    n = len(nodes)
    limit = ELEMENT_LIMIT[mode]
    if n > limit:
        raise APIError(400, "too_many_places", f"Too many places for {mode} routing ({n}).")
    rows_per_call = max(1, limit // n)
    dests = [_waypoint(x) for x in nodes]
    minutes: dict[str, dict[str, int]] = {x["id"]: {} for x in nodes}

    for start in range(0, n, rows_per_call):
        batch = nodes[start:start + rows_per_call]
        body = {"origins": [_waypoint(x) for x in batch], "destinations": dests,
                "travelMode": MODE_TO_GOOGLE[mode]}
        if departure_iso:
            body["departureTime"] = departure_iso
        resp = _request("POST", MATRIX_URL, MATRIX_FIELDS, json=body)
        if resp.status_code != 200:
            raise GoogleAPIError("google_error", f"Google Routes failed ({resp.status_code}).")
        for el in resp.json():
            a = nodes[start + el.get("originIndex", 0)]["id"]
            b = nodes[el.get("destinationIndex", 0)]["id"]
            if a == b or el.get("condition") != "ROUTE_EXISTS":
                continue
            secs = int(str(el.get("duration", "0s")).rstrip("s"))
            minutes[a][b] = math.ceil(secs / 60)
    return minutes

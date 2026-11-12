"""Backend tests. Google and the optimizer are mocked: no API key or network needed.

Run from src/backend:  python -m pytest -q
"""

import pytest
from fastapi.testclient import TestClient

from app import config, converters, google_client, optimizer_bridge
from app.errors import GoogleAPIError
from app.main import app

client = TestClient(app)

ROM = {
    "id": "ROM", "displayName": {"text": "Royal Ontario Museum"},
    "location": {"latitude": 43.6677, "longitude": -79.3948},
    "types": ["history_museum", "museum", "tourist_attraction"], "primaryType": "history_museum",
    "businessStatus": "OPERATIONAL",
    "regularOpeningHours": {"periods": [
        {"open": {"day": 6, "hour": 10}, "close": {"day": 6, "hour": 17, "minute": 30}}]},
}
CNT = {
    "id": "CNT", "displayName": {"text": "CN Tower"},
    "location": {"latitude": 43.6426, "longitude": -79.3871},
    "types": ["tourist_attraction"], "primaryType": "tourist_attraction",
    "regularOpeningHours": {"periods": [
        {"open": {"day": d, "hour": 9}, "close": {"day": d, "hour": 21, "minute": 30}} for d in range(7)]},
}
NOHOURS = {"id": "NOH", "displayName": {"text": "Viewpoint"},
           "location": {"latitude": 43.64, "longitude": -79.38}, "types": ["point_of_interest"]}
CLOSED = {**CNT, "id": "OLD", "displayName": {"text": "Old Place"}, "businessStatus": "CLOSED_PERMANENTLY"}
DINER = {
    "id": "EAT", "displayName": {"text": "Diner"},
    "location": {"latitude": 43.65, "longitude": -79.39},
    "types": ["restaurant"], "primaryType": "restaurant",
    "regularOpeningHours": {"periods": [
        {"open": {"day": d, "hour": 11}, "close": {"day": d, "hour": 22}} for d in range(7)]},
}
DETAILS = {p["id"]: p for p in (ROM, CNT, NOHOURS, CLOSED, DINER)}

TRIP = {
    "city": "Toronto", "timezone": "America/Toronto", "dates": ["2026-11-14"],
    "day_start": 540, "day_end": 1260, "budget": 150, "transport_mode": "walk",
    "accommodation": {"lat": 43.646, "lng": -79.3814},
}


@pytest.fixture(autouse=True)
def fake_google(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_MAPS_API_KEY", "test-key")
    monkeypatch.setattr(google_client, "search_text", lambda q, n=10: [ROM, CNT, CLOSED][:n])
    monkeypatch.setattr(google_client, "place_details", lambda pid: DETAILS.get(pid))

    def matrix(nodes, mode, departure_iso=None):
        return {a["id"]: {b["id"]: 10 for b in nodes if b["id"] != a["id"]} for a in nodes}
    monkeypatch.setattr(google_client, "route_matrix", matrix)


@pytest.fixture
def captured(monkeypatch):
    """Fake optimizer that schedules POIs in input order and records its inputs."""
    calls = {}

    def fake_generate(trip, pois, travel_times):
        calls.update(trip=trip, pois=pois, travel_times=travel_times)
        return {"status": "ok", "algorithm": "fake", "total_priority": sum(p["priority"] for p in pois),
                "total_cost": 0.0,
                "days": [{"date": trip["dates"][0], "return_travel_minutes": 10,
                          "activities": [{"poi_id": p["id"], "start": 600 + 130 * i, "end": 720 + 130 * i,
                                          "travel_minutes_before": 10} for i, p in enumerate(pois)]}],
                "unscheduled": [], "violations": []}
    monkeypatch.setattr(optimizer_bridge, "_load", lambda: fake_generate)
    return calls


# ---------------------------------------------------------------- health / search

def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_search_returns_contract_fields_and_drops_closed():
    r = client.get("/api/places/search", params={"city": "Toronto", "q": "museum"})
    assert r.status_code == 200
    body = r.json()
    assert [p["place_id"] for p in body] == ["ROM", "CNT"]
    assert set(body[0]) == {"place_id", "name", "kind", "lat", "lng"}
    assert body[0]["kind"] == "attraction"


def test_search_missing_q_is_400():
    r = client.get("/api/places/search", params={"city": "Toronto"})
    assert r.status_code == 400 and r.json()["error"] == "invalid_input"


def test_search_google_down_is_502(monkeypatch):
    def boom(*a, **k):
        raise GoogleAPIError("google_unavailable", "Could not reach Google Maps.")
    monkeypatch.setattr(google_client, "search_text", boom)
    r = client.get("/api/places/search", params={"city": "Toronto", "q": "museum"})
    assert r.status_code == 502 and r.json() == {"error": "google_unavailable",
                                                 "message": "Could not reach Google Maps."}


def test_missing_api_key_is_500(monkeypatch):
    monkeypatch.undo()  # restore real google_client
    monkeypatch.setattr(config, "GOOGLE_MAPS_API_KEY", "")
    r = client.get("/api/places/search", params={"city": "Toronto", "q": "museum"})
    assert r.status_code == 500 and r.json()["error"] == "server_misconfigured"


# ---------------------------------------------------------------- generate

def gen(selections, **trip_overrides):
    return client.post("/api/itineraries/generate",
                       json={"trip": {**TRIP, **trip_overrides}, "selections": selections})


def test_generate_passes_contract_inputs_to_optimizer(captured):
    r = gen([{"place_id": "ROM", "priority": 8}, {"place_id": "CNT", "priority": 6, "visit_minutes": 45}],
            pace="packed")
    assert r.status_code == 200
    trip, pois, tt = captured["trip"], captured["pois"], captured["travel_times"]
    assert trip["contract_version"] == "0.2" and "pace" not in trip
    assert trip["dates"] == ["2026-11-14"]
    rom, cnt = pois
    assert rom["opening_hours"] == {"2026-11-14": [[600, 1050]]}
    assert rom["visit_minutes"] == 96          # history_museum -> 120, packed x0.8
    assert cnt["visit_minutes"] == 45          # user override wins
    assert rom["priority"] == 8 and rom["locked"] is None and rom["mandatory"] is False
    assert tt["source"] == "google_routes" and "accommodation" in tt["minutes"]
    assert tt["minutes"]["accommodation"]["ROM"] == 10


def test_generate_adds_names_and_merges_excluded(captured):
    r = gen([{"place_id": "ROM", "priority": 8}, {"place_id": "NOH", "priority": 5},
             {"place_id": "OLD", "priority": 5}])
    body = r.json()
    assert r.status_code == 200 and body["status"] == "ok"
    assert body["days"][0]["activities"][0]["name"] == "Royal Ontario Museum"
    reasons = {u["poi_id"]: u["reason"] for u in body["unscheduled"]}
    assert reasons == {"NOH": "closed_on_trip_dates", "OLD": "closed_on_trip_dates"}
    assert [p["id"] for p in captured["pois"]] == ["ROM"]


def test_generate_unknown_place_id_is_400(captured):
    r = gen([{"place_id": "ROM", "priority": 8}, {"place_id": "BOGUS", "priority": 5}])
    assert r.status_code == 400 and r.json()["error"] == "invalid_input"


def test_generate_all_unusable_is_infeasible_200(captured):
    r = gen([{"place_id": "NOH", "priority": 5}])
    body = r.json()
    assert r.status_code == 200 and body["status"] == "infeasible"
    assert body["days"] == [] and body["violations"][0]["message"]


def test_generate_optimizer_infeasible_passes_through(monkeypatch):
    monkeypatch.setattr(optimizer_bridge, "_load", lambda: lambda t, p, tt: {
        "status": "infeasible", "algorithm": "fake", "total_priority": 0, "total_cost": 0.0, "days": [],
        "unscheduled": [], "violations": [{"code": "x", "message": "No POI fits."}]})
    r = gen([{"place_id": "ROM", "priority": 8}])
    assert r.status_code == 200 and r.json()["status"] == "infeasible"


def test_missing_optimizer_fails_before_google(monkeypatch):
    from app.errors import APIError
    calls = []
    monkeypatch.setattr(google_client, "place_details", lambda pid: calls.append(pid))

    def missing():
        raise APIError(500, "optimizer_unavailable", "No module named 'optimization'")
    monkeypatch.setattr(optimizer_bridge, "_load", missing)
    r = gen([{"place_id": "ROM", "priority": 8}])
    assert r.status_code == 500 and r.json()["error"] == "optimizer_unavailable"
    assert calls == []  # no Google calls were made


def test_generate_optimizer_wrong_shape_is_500(monkeypatch):
    monkeypatch.setattr(optimizer_bridge, "_load", lambda: lambda t, p, tt: [x["id"] for x in p])
    r = gen([{"place_id": "ROM", "priority": 8}])
    assert r.status_code == 500 and r.json()["error"] == "optimizer_contract_error"


@pytest.mark.parametrize("selections,overrides", [
    ([{"place_id": "ROM", "priority": 11}], {}),                         # priority out of range
    ([{"place_id": "ROM", "priority": 5}], {"day_start": 1260, "day_end": 540}),
    ([{"place_id": "ROM", "priority": 5}], {"transport_mode": "fly"}),
    ([{"place_id": "ROM", "priority": 5}], {"timezone": "Mars/Base"}),
    ([], {}),                                                           # nothing selected
    ([{"place_id": "ROM", "priority": 5}, {"place_id": "ROM", "priority": 6}], {}),  # duplicate
    ([{"place_id": f"P{i}", "priority": 5} for i in range(21)], {}),    # > 20 places
    ([{"place_id": f"P{i}", "priority": 9, "mandatory": True} for i in range(6)], {}),  # > 5 mandatory
    ([{"place_id": "ROM", "priority": 5}], {"dates": ["2026-11-14", "2026-11-15"]}),  # PoC: 1 date
    ([{"place_id": "ROM", "priority": 5}], {"budget": -1}),
])
def test_generate_invalid_input_is_400(selections, overrides):
    r = gen(selections, **overrides)
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "invalid_input" and r.json()["message"]


# ---------------------------------------------------------------- contract v0.2

def test_budget_null_means_no_limit(captured):
    trip = {k: v for k, v in TRIP.items() if k != "budget"}
    r = client.post("/api/itineraries/generate",
                    json={"trip": trip, "selections": [{"place_id": "ROM", "priority": 8}]})
    assert r.status_code == 200 and captured["trip"]["budget"] is None
    assert gen([{"place_id": "ROM", "priority": 8}], budget=None).status_code == 200


def test_mandatory_is_passed_to_optimizer(captured):
    gen([{"place_id": "ROM", "priority": 9, "mandatory": True}, {"place_id": "CNT", "priority": 6}])
    assert [(p["id"], p["mandatory"]) for p in captured["pois"]] == [("ROM", True), ("CNT", False)]


def test_mandatory_place_backend_cannot_use_is_infeasible(monkeypatch, captured):
    matrix_calls = []
    monkeypatch.setattr(google_client, "route_matrix", lambda *a, **k: matrix_calls.append(a))
    r = gen([{"place_id": "ROM", "priority": 6}, {"place_id": "NOH", "priority": 9, "mandatory": True}])
    body = r.json()
    assert r.status_code == 200 and body["status"] == "infeasible" and body["algorithm"] is None
    assert body["days"] == []
    assert body["violations"][0]["code"] == "MANDATORY_CANNOT_FIT"
    assert body["violations"][0]["poi_ids"] == ["NOH"] and "Viewpoint" in body["violations"][0]["message"]
    assert matrix_calls == [] and captured == {}  # no Routes call, optimizer not run


def test_all_unusable_uses_v02_code(captured):
    body = gen([{"place_id": "NOH", "priority": 5}]).json()
    assert body["violations"][0]["code"] == "NO_FEASIBLE_ITINERARY"


def test_restaurant_hours_narrowed_to_meal_windows(captured):
    gen([{"place_id": "EAT", "priority": 6}, {"place_id": "CNT", "priority": 6}],
        meal_windows={"lunch": [690, 810], "dinner": [1050, 1200]})
    eat, cnt = captured["pois"]
    assert eat["opening_hours"] == {"2026-11-14": [[690, 810], [1050, 1200]]}
    assert cnt["opening_hours"] == {"2026-11-14": [[540, 1290]]}  # attractions untouched


def test_restaurant_hours_unchanged_without_meal_windows(captured):
    gen([{"place_id": "EAT", "priority": 6}])
    assert captured["pois"][0]["opening_hours"] == {"2026-11-14": [[660, 1320]]}


# ---------------------------------------------------------------- converters

def test_meal_window_intersection():
    hours = {"d1": [[660, 1320]], "d2": [], "d3": [[700, 760], [1100, 1400]]}
    out = converters.restrict_to_meal_windows(hours, {"lunch": [690, 810], "dinner": [1050, 1200]})
    assert out == {"d1": [[690, 810], [1050, 1200]], "d2": [], "d3": [[700, 760], [1100, 1200]]}
    assert converters.restrict_to_meal_windows(hours, None) is hours
    # overlapping windows are merged
    assert converters.restrict_to_meal_windows({"d": [[0, 1440]]}, {"lunch": [600, 800], "dinner": [700, 900]}) \
        == {"d": [[600, 900]]}


def test_overnight_and_24h_hours():
    bar = {"regularOpeningHours": {"periods": [
        {"open": {"day": 6, "hour": 11}, "close": {"day": 6, "hour": 14}},
        {"open": {"day": 6, "hour": 20}, "close": {"day": 0, "hour": 2}}]}}
    assert converters.resolve_opening_hours(bar, ["2026-11-14", "2026-11-15"]) == {
        "2026-11-14": [[660, 840], [1200, 1440]], "2026-11-15": []}
    park = {"regularOpeningHours": {"periods": [{"open": {"day": 0, "hour": 0}}]}}
    assert converters.resolve_opening_hours(park, ["2026-11-16"]) == {"2026-11-16": [[0, 1440]]}


def test_visit_minutes_keyword_matching():
    assert converters.default_visit_minutes({"primaryType": "art_museum"}) == 120
    assert converters.default_visit_minutes({"primaryType": "zoo"}, "relaxed") == 225
    assert converters.default_visit_minutes({"primaryType": "unknown"}) == 60


def test_restaurant_kind_and_cost():
    r = {"types": ["restaurant"], "priceLevel": "PRICE_LEVEL_EXPENSIVE"}
    assert converters.kind_of(r) == "restaurant" and converters.default_cost(r, "restaurant") == 60.0


def test_museum_with_cafe_is_attraction():
    gardiner = {"primaryType": "museum", "types": ["museum", "restaurant", "cafe", "tourist_attraction"]}
    assert converters.kind_of(gardiner) == "attraction"
    assert converters.kind_of({"primaryType": "ramen_restaurant", "types": ["restaurant"]}) == "restaurant"


def test_docs_show_400_not_422():
    paths = client.get("/openapi.json").json()["paths"]
    for path in ("/api/places/search", "/api/itineraries/generate"):
        op = next(iter(paths[path].values()))
        assert "422" not in op["responses"] and {"400", "502"} <= set(op["responses"])

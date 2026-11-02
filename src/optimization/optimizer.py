def generate_itinerary(trip, pois, travel_times):
    """
    Placeholder itinerary generator.

    Args:
        trip: User's trip configuration.
        pois: List of selected POIs.
        travel_times: Travel-time data between locations.

    Returns:
        Placeholder ItineraryResult based on Data Contract v0.1.
        Keeps POIs in their original order.
        No optimization or constraint checking is performed.
    """

    date = trip["dates"][0]

    activities = []

    for poi in pois:
        activities.append({
            "poi_id": poi["id"],
            "start": None,
            "end": None,
            "travel_minutes_before": None
        })

    # Instead of using none we calculate known costs and check for unknown costs
    costs = [poi.get("cost") for poi in pois]

    total_known_cost = sum(
        cost for cost in costs
        if cost is not None
    )

    has_unknown_cost = any(
        cost is None for cost in costs
    )

    return {
        "status": "ok",
        "algorithm": "placeholder",
        "total_priority": sum(poi["priority"] for poi in pois),
        "total_known_cost": total_known_cost,
        "has_unknown_cost": has_unknown_cost,
        "days": [
            {
                "date": date,
                "activities": activities,
                "return_travel_minutes": None
            }
        ],
        "unscheduled": [],
        "violations": []
    }



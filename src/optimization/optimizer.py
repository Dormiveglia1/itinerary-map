
def generate_itinerary(trip, pois, travel_times):
    """
    Placeholder itinerary generator.

    Args:
        trip: User's trip configuration.
        pois: List of selected POIs.
        travel_times: Travel-time data between locations.

    Returns:
        ItineraryResult following Data Contract v0.1.
        This placeholder keeps POIs in their original order.
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

    return {
        "status": "ok",
        "algorithm": "placeholder",
        "total_priority": sum(poi["priority"] for poi in pois),
        "total_cost": sum(poi["cost"] for poi in pois),
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



from math import isfinite

# get the travel time between two locations
def _travel(matrix, src, dst):

    value = matrix.get("minutes", {}).get(src, {}).get(dst)

    # missing or invalid travel time means this leg is unavailable
    if not isinstance(value, (int, float)):
        return None

    if isinstance(value, bool) or not isfinite(value) or value < 0:
        return None

    return value


def _schedule(route, date, trip, matrix, explain=False):
    """
    Check whether a candidate route is feasible.

    If feasible, return the schedule.
    If infeasible, return None.

    If explain=True, also return a failure reason.
    """

    # helper function for reporting failures
    def fail(reason):
        if explain:
            return None, reason
        return None

    start = trip["day_start"]
    deadline = trip["day_end"]

    if deadline <= start:
        raise ValueError("day_end must be later than day_start")

    # budget
    total_cost = 0

    for poi in route:
        cost = poi["cost"]

        if (
            not isinstance(cost, (int, float))
            or isinstance(cost, bool)
            or not isfinite(cost)
            or cost < 0
        ):
            raise ValueError(f"Invalid cost for {poi['id']}")

        total_cost += cost

    if total_cost > trip["budget"]:
        return fail("over_budget")

    current_time = start
    current_location = "accommodation"
    entries = []

   
    for poi in route:

        # get opening hours for this date
        windows = poi.get("opening_hours", {}).get(date, [])

        if not windows:
            return fail("closed_on_trip_dates")

        travel = _travel(matrix, current_location, poi["id"])

        if travel is None:
            return fail("unreachable")

        arrival = current_time + travel
        duration = poi["visit_minutes"]

        if (
            not isinstance(duration, (int, float))
            or isinstance(duration, bool)
            or not isfinite(duration)
            or duration <= 0
        ):
            raise ValueError(f"Invalid visit_minutes for {poi['id']}")

        choice = None

        # find the earliest opening window that fits the visit
        for opening, closing in sorted(
            windows,
            key=lambda pair: pair[0]
        ):

          
            begin = max(arrival, opening)
            finish = begin + duration

            if finish <= closing:
                choice = (begin, finish)
                break

        # no opening window can fit the visit
        if choice is None:
            return fail("no_time")

        begin = choice[0]
        finish = choice[1]

        entries.append({
            "poi_id": poi["id"],
            "start": int(begin),
            "end": int(finish),
            "travel_minutes_before": travel
        })

        current_time = finish
        current_location = poi["id"]

    # return to accommodation 
    if route:
        return_trip = _travel(
            matrix, current_location, "accommodation"
        )
    else:
        return_trip = 0

    if return_trip is None:
        return fail("unreachable")

    if current_time + return_trip > deadline:
        return fail("no_time")

    schedule = {
        "activities": entries,
        "return_travel_minutes": return_trip,
        "travel_total": (
            sum(e["travel_minutes_before"] for e in entries)
            + return_trip
        ),
        "total_cost": total_cost
    }

    if explain:
        return schedule, None

    return schedule


def _score(route):
    # sum priorities
    return sum(poi["priority"] for poi in route)


def _better(route, schedule, best_route, best_schedule):
    """
    Compare two feasible routes.

    1. Maximize total priority.
    2. Minimize travel time.
    3. Maximize number of POIs if still tied.
    """

    if best_schedule is None:
        return True

    return (
        _score(route),
        -schedule["travel_total"],
        len(route)
    ) > (
        _score(best_route),
        -best_schedule["travel_total"],
        len(best_route)
    )


def _Algorithums(available, date, trip, travel_times):
    """
    Build an itinerary using:
    1. Greedy + Insertion
    2. Local Search
    """

    route = []
    current_schedule = _schedule(
        route, date, trip, travel_times
    )

    # Greedy + Insertion
    while True:
        best = None

        for poi in available:

            # skip already selected POIs
            if poi in route:
                continue

            # try every possible insertion position
            for pos in range(len(route) + 1):

                candidate = (
                    route[:pos]
                    + [poi]
                    + route[pos:]
                )

                schedule = _schedule(
                    candidate, date, trip, travel_times
                )

                if schedule is not None:

                    if best is None:
                        best = (candidate, schedule)

                    else:
                        best_route = best[0]
                        best_schedule = best[1]

                        if _better(
                            candidate,
                            schedule,
                            best_route,
                            best_schedule
                        ):
                            best = (candidate, schedule)

        # stop if no more pois can be inserted
        if best is None:
            break

        route, current_schedule = best

    # Local Search
    while True:
        best = None

        alternatives = [
            poi for poi in available
            if poi not in route
        ]

        for i in range(len(route)):

            # replace a selected poi with an unselected poi
            for poi in alternatives:

                candidate = (
                    route[:i]
                    + [poi]
                    + route[i + 1:]
                )

                schedule = _schedule(
                    candidate, date, trip, travel_times
                )

                if schedule is not None:

                    if best is None:
                        best_route = route
                        best_schedule = current_schedule
                    else:
                        best_route = best[0]
                        best_schedule = best[1]

                    if _better(
                        candidate,
                        schedule,
                        best_route,
                        best_schedule
                    ):
                        best = (candidate, schedule)

            # swap two selected pois
            for j in range(i + 1, len(route)):

                candidate = route.copy()

                candidate[i], candidate[j] = (
                    candidate[j], candidate[i]
                )

                schedule = _schedule(
                    candidate, date, trip, travel_times
                )

                if schedule is not None:

                    if best is None:
                        best_route = route
                        best_schedule = current_schedule
                    else:
                        best_route = best[0]
                        best_schedule = best[1]

                    if _better(
                        candidate,
                        schedule,
                        best_route,
                        best_schedule
                    ):
                        best = (candidate, schedule)

        # no improvement found
        if best is None:
            return route, current_schedule

        route, current_schedule = best



def _unscheduled_reason(poi, dates, trip, matrix, scheduled_routes):
    """
    Find a reason why a POI was not scheduled

    Budget is shared across the entire trip
    """

    # check whether the poi is closed on every trip date
    if all(
        not poi.get("opening_hours", {}).get(date)
        for date in dates
    ):
        return "closed_on_trip_dates"

    # the cost of all currently scheduled POIs
    total_spent = 0

    for route in scheduled_routes:
        for selected_poi in route:
            total_spent += selected_poi["cost"]

    remaining_budget = trip["budget"] - total_spent

    # check whether budget prevents adding this poi
    budget_blocked = False
    failure_reasons = []

    # try adding this poi to each day
    for date, route in zip(dates, scheduled_routes):

        # Calculate the existing cost of this day
        day_cost = sum(
            p["cost"] for p in route
        )

        # money available to this day if we keep all the other days unchanged
        available_budget = remaining_budget + day_cost

        day_trip = trip.copy()
        day_trip["budget"] = available_budget

        # inserting the poi at every position
        for pos in range(len(route) + 1):

            candidate = (
                route[:pos]
                + [poi]
                + route[pos:]
            )

            schedule, reason = _schedule(
                candidate,
                date,
                day_trip,
                matrix,
                explain=True
            )

            if schedule is not None:
                # It fits the completed route, but the heuristic did not select it
                return "no_time"

            failure_reasons.append(reason)

            if reason == "over_budget":

                relaxed_trip = day_trip.copy()
                relaxed_trip["budget"] = float("inf")

                relaxed_schedule = _schedule(
                    candidate,
                    date,
                    relaxed_trip,
                    matrix
                )

                if relaxed_schedule is not None:
                    budget_blocked = True

    # budget is the confirmed blocking constraint for at least one otherwise feasible insertion
    if budget_blocked:
        return "over_budget"

    if failure_reasons and all(
        reason == "unreachable"
        for reason in failure_reasons
    ):
        return "unreachable"

    return "no_time"



def generate_itinerary(trip, pois, travel_times):
    """
    Generate an optimized itinerary.

    Backend provides:
        trip: Trip configuration
        pois: Selected POIs with priorities, durations and costs
        travel_times: Travel-time matrix

    Objective:
        Maximize priority, then minimize travel time.

    Constraints:
        Opening hours
        Visit durations
        Daily start/end times
        Daily budget (proposed interpretation)
        Return to accommodation
    """

    dates = trip["dates"]

    if not dates or len(set(dates)) != len(dates):
        raise ValueError("dates must be nonempty and unique")

    if not 1 <= len(pois) <= 10:
        raise ValueError("Select between 1 and 10 POIs")

    if len({p["id"] for p in pois}) != len(pois):
        raise ValueError("POI ids must be unique")

    for poi in pois:
        priority = poi["priority"]

        if (
            not isinstance(priority, int)
            or isinstance(priority, bool)
            or not 1 <= priority <= 10
        ):
            raise ValueError(
                f"Priority must be integer 1-10 for {poi['id']}"
            )

    remaining = pois.copy()
    days = []
    scheduled_routes = []

    total_priority = 0
    total_cost = 0

    # total budget shared across all trip days
    remaining_budget = trip["budget"]


    # build each day separately
    for date in dates:

        # a copy for this day
        day_trip = trip.copy()

        # only allow this day to spend what remains
        day_trip["budget"] = remaining_budget

        chosen, schedule = _Algorithums(
            remaining, date, day_trip, travel_times
        )

        chosen_ids = {p["id"] for p in chosen}

        # remove already scheduled pois
        remaining = [
            p for p in remaining
            if p["id"] not in chosen_ids
        ]

        total_priority += _score(chosen)
        total_cost += schedule["total_cost"]
        # subtracy today's cost from the remaining trip budget
        remaining_budget -= schedule["total_cost"]

        scheduled_routes.append(chosen)

        days.append({
            "date": date,
            "activities": schedule["activities"],
            "return_travel_minutes": schedule["return_travel_minutes"]
        })

    # A partial itinerary is still a valid result
    if len(remaining) < len(pois):
        status = "ok"
        violations = []

    else:
        status = "infeasible"
        days = []

        violations = [{
            "code": "NO_FEASIBLE_ITINERARY",
            "message": "No selected POI could be scheduled by the optimizer."
        }]

    # determine reasons for pois not scheduled
    unscheduled = []

    for poi in remaining:

        reason = _unscheduled_reason(
            poi,
            dates,
            trip,
            travel_times,
            scheduled_routes
        )

        unscheduled.append({
            "poi_id": poi["id"],
            "reason": reason
        })

    return {
        "status": status,
        "algorithm": "greedy+insertion+local_search",
        "total_priority": total_priority,
        "total_cost": total_cost,
        "days": days,
        "unscheduled": unscheduled,
        "violations": violations
    }

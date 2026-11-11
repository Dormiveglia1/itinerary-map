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


def _duration_bounds(poi):
    preferred = poi["visit_minutes"]
    if (
        not isinstance(preferred, (int, float))
        or isinstance(preferred, bool)
        or not isfinite(preferred)
        or preferred <= 0
    ):
        raise ValueError(f"Invalid visit_minutes for {poi['id']}")

    visit_range = poi.get("visit_range")
    if visit_range is None:
        return preferred, preferred
    if (
        not isinstance(visit_range, (list, tuple))
        or len(visit_range) != 2
    ):
        raise ValueError(f"Invalid visit_range for {poi['id']}")
    minimum, maximum = visit_range
    if any(
        not isinstance(x, (int, float)) or isinstance(x, bool)
        or not isfinite(x)
        for x in (minimum, maximum)
    ) or minimum <= 0 or maximum < minimum:
        raise ValueError(f"Invalid visit_range for {poi['id']}")
    return minimum, min(max(preferred, minimum), maximum)


def _schedule(route, date, trip, matrix, explain=False, prefer_long=False):
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

    if trip.get("budget") is not None and total_cost > trip["budget"]:
        return fail("over_budget")

    # validate durations and use minimum allowable time for feasibility
    bounds = [_duration_bounds(poi) for poi in route]
    durations = [pair[0] for pair in bounds]

    def build(durations):
        current_time = start
        current_location = "accommodation"
        entries = []

        for poi, duration in zip(route, durations):

            # get opening hours for this date
            windows = poi.get("opening_hours", {}).get(date, [])

            if not windows:
                return None, "closed_on_trip_dates"

            travel = _travel(matrix, current_location, poi["id"])

            if travel is None:
                return None, "unreachable"

            arrival = current_time + travel

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
                return None, "no_time"

            begin = choice[0]
            finish = choice[1]

            entries.append({
                "poi_id": poi["id"],
                "arrival": int(arrival),
                "wait_minutes": int(begin - arrival),
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
            return None, "unreachable"

        if current_time + return_trip > deadline:
            return None, "no_time"

        schedule = {
            "activities": entries,
            "return_travel_minutes": return_trip,
            "travel_total": (
                sum(e["travel_minutes_before"] for e in entries)
                + return_trip
            ),
            "total_cost": total_cost,
            "slack_minutes": int(deadline - current_time - return_trip)
        }
        return schedule, None

    schedule, reason = build(durations)
    if schedule is None:
        return fail(reason)

    if prefer_long:
        # extend visit lengths toward visit_minutes without breaking feasibility
        for i, (minimum, preferred) in enumerate(bounds):
            if preferred <= minimum:
                continue
            low, high = int(minimum), int(preferred)
            while low < high:
                middle = (low + high + 1) // 2
                trial = durations.copy()
                trial[i] = middle
                tested, _ = build(trial)
                if tested is not None:
                    low = middle
                else:
                    high = middle - 1
            durations[i] = low
        schedule, reason = build(durations)

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


def _Algorithums(available, date, trip, travel_times, base_route=None):
    """
    Build an itinerary using:
    1. Greedy + Insertion
    2. Local Search
    """

    route = list(base_route) if base_route else []
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

                if route[i].get("mandatory", False):
                    continue

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



def _mandatory_routes(mandatory, dates, trip, matrix):
    """Place all essential POIs first, before optional POIs use the budget."""
    routes = [[] for _ in dates]
    if not mandatory:
        return routes, None

    # check whether each mandatory poi can be visited on at least one day
    impossible = []
    for poi in mandatory:
        possible = False
        for date in dates:
            if _schedule([poi], date, trip, matrix) is not None:
                possible = True
                break
        if not possible:
            impossible.append(poi["id"])
    if impossible:
        return None, {
            "code": "MANDATORY_CANNOT_FIT",
            "poi_ids": impossible,
            "message": "A mandatory POI cannot fit by itself on any trip date."
        }

    # place the POIs with fewer available dates first
    def date_count(poi):
        return sum(bool(poi.get("opening_hours", {}).get(d)) for d in dates)

    ordered = sorted(mandatory, key=lambda p: (date_count(p), -p["priority"]))
    attempts = 0
    limit = 40000
    budget = trip.get("budget")

    def search(index, spent):
        nonlocal attempts
        if index == len(ordered):
            return True

        poi = ordered[index]
        options = []
        for day_index, date in enumerate(dates):
            route = routes[day_index]
            for pos in range(len(route) + 1):
                candidate = route[:pos] + [poi] + route[pos:]
                day_trip = trip.copy()
                # the current route's costs are already included in spent
                if budget is not None:
                    day_trip["budget"] = budget - spent + sum(p["cost"] for p in route)
                schedule = _schedule(candidate, date, day_trip, matrix)
                if schedule is not None:
                    options.append((schedule["travel_total"], day_index, candidate))

        # try less travel-heavy placements first
        options.sort(key=lambda x: x[0])
        for _, day_index, candidate in options:
            attempts += 1
            if attempts > limit:
                return False
            previous = routes[day_index]
            routes[day_index] = candidate
            if search(index + 1, spent + poi["cost"]):
                return True
            routes[day_index] = previous
        return False

    if search(0, 0):
        return routes, None

    code = "MANDATORY_CONFLICT" if len(mandatory) == 2 else "MANDATORY_SET_CONFLICT"
    return None, {
        "code": code,
        "poi_ids": [p["id"] for p in mandatory],
        "message": "The mandatory POIs could not all be scheduled together."
    }


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

    # the cost of all currently scheduled pois
    total_spent = 0

    for route in scheduled_routes:
        for selected_poi in route:
            total_spent += selected_poi["cost"]

    remaining_budget = (
        None if trip.get("budget") is None
        else trip["budget"] - total_spent
    )

    # check whether budget prevents adding this poi
    budget_blocked = False
    failure_reasons = []

    # try adding this poi to each day
    for date, route in zip(dates, scheduled_routes):

        # calculate the existing cost of this day
        day_cost = sum(
            p["cost"] for p in route
        )

        # money available to this day if we keep all the other days unchanged
        available_budget = (
            None if remaining_budget is None
            else remaining_budget + day_cost
        )

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
                # it fits the completed route, but the heuristic did not select it
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

    if not 1 <= len(pois) <= 20:
        raise ValueError("Select between 1 and 20 POIs")

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

    # validate numeric costs and duration ranges before optimization
    for poi in pois:
        _duration_bounds(poi)
        cost = poi["cost"]
        if (
            not isinstance(cost, (int, float))
            or isinstance(cost, bool)
            or not isfinite(cost)
            or cost < 0
        ):
            raise ValueError(f"Invalid cost for {poi['id']}")
        if not isinstance(poi.get("mandatory", False), bool):
            raise ValueError(f"Invalid mandatory value for {poi['id']}")
        # locked activity support belongs to the separate p1 editing workflow
        if poi.get("locked") is not None:
            raise ValueError("locked activities are not supported in this PoC optimizer")

    budget = trip.get("budget")
    if budget is not None and (
        not isinstance(budget, (int, float))
        or isinstance(budget, bool)
        or not isfinite(budget)
        or budget < 0
    ):
        raise ValueError("budget must be a nonnegative number or None")

    mandatory_pois = [p for p in pois if p.get("mandatory", False)]
    mandatory_routes, mandatory_error = _mandatory_routes(
        mandatory_pois, dates, trip, travel_times
    )

    if mandatory_error is not None:
        return {
            "status": "infeasible",
            "algorithm": "greedy+insertion+local_search",
            "total_priority": 0,
            "total_cost": 0,
            "days": [],
            "unscheduled": [],
            "violations": [mandatory_error]
        }

    remaining = pois.copy()
    days = []
    scheduled_routes = []

    total_priority = 0
    total_cost = 0

    # total budget shared across all trip days
    remaining_budget = budget


    # build each day separately
    for day_index, date in enumerate(dates):

        # a copy for this day
        day_trip = trip.copy()

        # only allow this day to spend what remains
        day_trip["budget"] = remaining_budget

        # reserve enough budget for mandatory pois on later days
        future_mandatory_cost = sum(
            p["cost"]
            for later_route in mandatory_routes[day_index + 1:]
            for p in later_route
        )
        if remaining_budget is not None:
            day_trip["budget"] = remaining_budget - future_mandatory_cost

        # Mandatory pois are already assigned across all dates
        # only optional pois are candidates for insertion
        optional = [p for p in remaining if not p.get("mandatory", False)]
        chosen, schedule = _Algorithums(
            optional, date, day_trip, travel_times,
            base_route=mandatory_routes[day_index]
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
        if remaining_budget is not None:
            remaining_budget -= schedule["total_cost"]

        scheduled_routes.append(chosen)

        # use longer visits up to visit_minutes when the final route allows it
        final_schedule = _schedule(
            chosen, date, day_trip, travel_times, prefer_long=True
        )

        days.append({
            "date": date,
            "activities": final_schedule["activities"],
            "return_travel_minutes": final_schedule["return_travel_minutes"],
            "slack_minutes": final_schedule["slack_minutes"]
        })

    # a partial itinerary is still a valid result
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
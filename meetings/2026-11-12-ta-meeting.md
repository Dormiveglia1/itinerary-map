# TA Meeting — Meeting Minutes

**Project:** Itinerary Map — Group 18  
**Course:** COMPSCI 4ZP6  
**Date:** November 12, 2026  
**Time:** 2:00 PM – 2:15 PM
**Attendees:**
- **TA:** Amirhossein Sabour
- **Team Members:** All members attended

**Recorded by:** Shaoyuan Wu  

## 1. Meeting Agenda

- TA check-in on overall progress and the PoC demo plan.
- Explain the project's core technical challenge (the optimizer) and how far it has progressed.
- Get feedback on how the backend estimates cost for the budget constraint.

## 2. Discussion Summary

### 2.1 Purpose of TA Meetings

The TA explained that these meetings are to gauge team progress: where the team is in development, what the PoC demo will include, and what comes after it. He will focus on the **one feature that gives each project its complexity**: what has been developed and what is still planned.

### 2.2 Progress Overview and Demo Plan

The team plans to deliver all **P0** requirements from the SRS:
- A form where the user enters trip details and selects up to 10 POIs.
- The frontend sends the request to the backend, which runs the optimization algorithm and returns an itinerary: the route that maximizes what the user can visit, subject mainly to the number of days and the budget.
- The result is shown as an **interactive map** together with a **step-by-step plan** (start at this time, visit this POI, stay this long, leave at this time).
- Exporting the plan (e.g. to PDF) is **P1** and not part of the PoC.

The TA summarized the expected demo: a user enters the number of days and a budget, the backend optimizes, and the app returns an itinerary of stops for every day of the trip.

### 2.3 What Happens Under the Hood

The TA asked what is actually built under the hood, since a project like this can be very deep or very shallow (e.g. just prompting an LLM). Rebecca explained the optimizer:
- Users label places with three levels: **Essential, Want to see, Nice to see**, mapped to priority **9, 6, 3**. The objective is to **maximize the total priority** of the visited places.
- Input: the trip configuration and POIs from the backend (opening hours, visit duration, cost, daily start/end time) and a **travel-time matrix** from the Google Maps API.
- Before accepting a route, the optimizer runs a **feasibility check**: opening hours, travel times, visit durations, the daily time limit, and the total trip budget. Each day starts and ends at the accommodation.
- **Essential (priority 9) places are mandatory.** They are scheduled first by trying different days and insertion positions. If they cannot all be included without violating a constraint, the result is reported as **infeasible**.
- Techniques: a **greedy** algorithm builds the initial itinerary (choosing places by priority relative to the time needed to travel to and visit them), then **insertion** and **local search** add unscheduled places and swap positions to raise the total priority.
- Output: scheduled activities per day with start and end times, total cost, travel information, and unscheduled places with the reason they could not be included.

### 2.4 Feasibility and Traffic-Dependent Travel Times

The TA asked what "feasibility analysis" means. The team explained that it checks each place's opening hours on the planned day; a place that is not open when it would be visited violates the constraint.

The TA raised **traffic-dependent travel time**: the same trip takes much longer at 9 AM rush hour than at 3 AM (e.g. Hamilton → Toronto). A major part of feasibility is whether the user can **actually reach each place at the time the plan says**.
- Suggested approach "with minimal headache": optimize as now, then for each leg of the resulting plan look up the travel time **for the actual departure time** (Google Maps' "leave at" option, e.g. by car) and re-check feasibility. "A few iterations would solve that."
- A fair assumption is that travellers use public transport or Uber, so car traffic at that time of day matters.
- **Not required for the PoC demo**, but someone will ask about it for an itinerary app, so keep it in mind as part of feasibility.

### 2.5 Complexity Verdict and Demo Guidance

- The TA is **"fairly convinced" the complexity is there**: the team is not just prompting an LLM in the backend, "you guys are actually getting your hands dirty."
- For the demo he wants two points made clearly:
  1. Show a user with a plan and a budget entering it into the app and getting back the itinerary.
  2. Make it **very clear that the backend is not LLM prompting**.
- Frame the demo **as a pitch to an investor / VC**: show the functionality as it stands today and the potential of what it can be by the end of the course. Time is limited, so presentation matters.

### 2.6 Cost Estimation (backend question)

Shaoyuan Wu asked for feedback on how the backend estimates cost for the budget constraint. The TA's feedback:
- **Transport cost** (e.g. Uber) should eventually be included in a real app, since Uber costs add up quickly when travelling to five places a day. It is somewhat complicated and **can be postponed** until after the PoC.
- **Give a cost range instead of a single number**: a lower and an upper estimate (a confidence interval). Users usually want to know the low end and the high end rather than an exact amount.
- Optimize so that the **upper estimate fits the user's budget**, then give the user the option to go a little higher. If they cannot, run the algorithm again so that the **lower estimate** fits the budget.
- For the PoC demo, the focus should stay on showing what has been done in the backend.

### 2.7 Closing

The TA had no further questions or concerns: "you guys are well on your way." The key thing is to present the project well in the limited demo time.

## 3. Meeting Outcomes

Technical complexity: The TA accepted that the project has sufficient technical depth (constraint-based optimization rather than LLM prompting).

Demo focus: The PoC should show the end-to-end flow (user with a plan and a budget → itinerary), state explicitly that no LLM is used, and be framed as an investor pitch (today vs. future potential).

Feasibility: Traffic- and departure-time-dependent travel times were identified as an important future part of the feasibility check, not required for the PoC.

Cost: Cost should be presented as a range, with the budget check based on the upper estimate; transport costs (e.g. Uber) should be added later.

## 4. Action Items

| Action Item | Responsible | Target |
|---|---|---|
| Plan the PoC video around the flow "user with a plan and a budget → itinerary", and say explicitly that there is no LLM in the backend | Whole team / video script owner | Before PoC recording (video due Nov 21) |
| Frame the PoC as an investor pitch: what works today + what it will be by the end of the course | Whole team | Before PoC recording |
| Re-check each leg of the final plan with departure-time travel times ("leave at"; traffic-aware for driving, scheduled for transit) as part of feasibility | Backend + Optimization | After PoC |
| Include transport cost (e.g. Uber/taxi, transit fares) in the budget | Backend | After PoC |
| Change cost estimates to a range (lower / upper); optimize against the upper estimate, with an option to relax to the lower one. Needs a contract update (e.g. `cost_min` / `cost_max`) | Backend + Optimization | Discuss at next team meeting |

## 5. Next Group Meeting Focus
Finish integration for the PoC (backend v0.2, plan builder, interactive map) and agree on the PoC video script. Decide whether the cost-range change goes into the next contract version.

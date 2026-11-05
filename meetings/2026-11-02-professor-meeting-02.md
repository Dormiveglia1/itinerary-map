# Professor Meeting #2 — Meeting Minutes

**Project:** Itinerary Map — Group 18  
**Course:** COMPSCI 4ZP6  
**Date:** November 2, 2026  
**Time:** 11:00 AM – 11:15 AM  
**Attendees:**
- **Professor:** Mehdi Moradi
- **Team Members:** Hashim Butt, Eric Lee, Lihan Zhang, Rebecca Yang, Shaoyuan Wu, Yuhao Zhang

**Recorded by:** Shaoyuan Wu

## 1. Meeting Agenda

- Follow up on the algorithm concern raised in Professor Meeting #1.
- Present the algorithm demonstration PDF (greedy baseline + local search).
- Ask whether the planned algorithm provides enough complexity.
- Describe the planned PoC demo.

## 2. Discussion Summary

### 2.1 Project Recap

The team described the project: a web app that generates a multi-constraint itinerary with an optimization algorithm rather than an LLM. It supports different cities (e.g. Toronto). The planned inputs are destination, dates, daily time window, accommodation, price range, transport mode (walk / transit), time per location, and the POIs the user wants to visit (5–10 per day), each with a user-set priority from 1 to 10. The algorithm selects and orders the highest-priority POIs that fit the available time.

The algorithm demonstration PDF was shared in the team's private channel with the professor.

### 2.2 Product Value and User Input

The professor questioned the value of the product as described: if the user already lists every place and how long to stay, "what is the value that you bring in?" His expected use case is closer to: *"I'm going to Paris, I have three days, these are my general interests — come up with an itinerary."*

- The input process must not be too onerous for the user.
- The team should design the full user-facing flow: the "interview" questions the app asks, what the user lands on, and a back-and-forth loop where the user can reject parts of the plan ("I don't like this") and get a revised one.

### 2.3 Output of the System

The team said the PoC output is a single-day itinerary shown as a route on an embedded Google Map.

The professor considered this too minimal for a capstone:
- Ordering a few places on a map is something Google Maps (or the user) can already do; showing the result mainly on Google Maps is "not a great idea" as the main deliverable, though it can be an additional piece.
- The output should be a detailed, usable plan — e.g. a document or table stating where to go, when, for how long, and how to get there (which train / bus), possibly with options.
- He suggested that an LLM could be useful for writing up instructions once the parameters are known, while the planning itself stays algorithmic.

When asked what exactly the final output is, the team did not give a clear, shared answer.

### 2.4 Algorithm and Data

- The team asked whether a greedy baseline plus local search (in the final submission) is complex enough.
- The professor said the core contribution — an algorithm that determines the best sequence of movement between locations — is **"an interesting contribution"** with **"some complexity"**.
- He asked where the data (distances, place details) comes from. The team answered: Google Places API (and routing data from Google).
- He asked whether a basic working version had been put together. The team did not demonstrate one during the meeting.

### 2.5 PoC Expectations

The PoC is a two-minute video. The professor asked the team to plan it concretely:
- ~30 seconds: why the project is interesting / what problem it solves.
- Then a step-by-step demo that is visually appealing and shows real progress.
- Think as product managers, not only as algorithm developers. Parts can be mocked for the PoC, but the team must know exactly what the system will generate.

### 2.6 Other

- The professor will review the team's SRS.

## 3. Meeting Outcomes

The following points summarize the main outcomes of the discussion:

Algorithmic contribution: The optimization problem has recognized value and complexity, but no specific algorithm combination was formally approved as sufficient.

Product definition: The overall user experience and final itinerary output require further clarification.

Output expectations: The application should provide a practical, detailed itinerary rather than only displaying an ordered route on a map.

PoC preparation: The team should prepare a concrete demonstration showing the input workflow, optimization process, and useful results.

TA consultation: The professor explicitly requested that the team book a deep-dive session with the assigned TA, Amir, before the PoC.

## 4. Action Items

| Action Item | Responsible | Target |
|---|---|---|
| Book a deep-dive session with TA Amir | Team coordinator (Hashim) | This week, before PoC |
| Define the user flow: interview questions, screens, edit/regenerate loop | Frontend team + whole team | Before Amir deep dive |
| Produce a sample output: a complete one-day itinerary (times, durations, transport per leg, costs, skipped POIs with reasons) | Backend + Optimization | Before Amir deep dive |
| Reduce user input burden (e.g. interest-based POI suggestions, default visit durations) | Backend + Frontend | Discuss at next team meeting |
| Add richer output: per-leg transit directions, explanations for skipped POIs, alternative plans | Backend + Optimization | Discuss at next team meeting |
| Decide whether to use an LLM for writing itinerary instructions (presentation only) | Whole team | Next team meeting |
| Write the 2-minute PoC video script (30 s motivation + step-by-step demo) | Team / To be assigned | Before PoC recording (Nov 20–21) |
| Turn cameras on in professor / TA meetings | Everyone | Ongoing |

## 5. Next Meeting Focus

The next meeting is the **deep dive with TA Amir** (before the PoC). The team should bring a clearly defined product: the user flow (interview questions and screens), a concrete sample itinerary output, and the PoC demo plan.

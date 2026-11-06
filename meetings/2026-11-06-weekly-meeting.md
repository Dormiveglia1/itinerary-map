# Meeting Minutes — Itinerary Map

**Date:** November 6, 2026 (Friday)  
**Project:** COMP SCI 4ZP6 — Group 18, Itinerary Map  
**Attendees mentioned:** Hashim, Rebecca, Eric, Steven, Mike (confirm full attendance before committing)  
**Meeting Objective:** Align the team's Proof of Concept (PoC) scope and implementation priorities ahead of the TA meeting next Wednesday.

## Discussion Summary

### 1. PoC scope and frontend progress
- The team reviewed the existing frontend implementation and discussed what still needs to be completed for the PoC.
- The frontend will need further adjustments once the optimization algorithm's input and output formats are finalized.
- The immediate priority is to demonstrate an integrated workflow rather than complete every planned feature.

### 2. Algorithm inputs and outputs
- Hashim and Rebecca discussed the required algorithm inputs, including whether to retain a **budget** field given uncertainty around available cost data.
- The team needs to finalize the algorithm's expected input fields and output data structure before frontend integration can be completed.
- The budget decision remains open pending agreement on the algorithm requirements and available data.
- The team agreed that estimated POI visit durations should be determined by the algorithm; Hashim identified this as part of the project’s technical complexity.
- Mike raised a question about **visit duration**: Google Places provides opening and closing hours, but the application still needs a way to determine how long a user should spend at each POI. He asked whether the team should define estimated visit durations itself.
- Hashim clarified that estimated visit durations should be determined by the optimization algorithm rather than taken directly from Google Places opening hours. This also contributes to the technical complexity of the project.

### 3. Interactive map
- Eric and Steven will work on converting the algorithm's returned itinerary into an interactive map.
- The intended map functionality includes showing POI locations and routes, with clickable POIs displaying relevant itinerary details where supported by the output data.
- Implementation depends on the finalized algorithm output format, including location coordinates, ordering, and available route or timing information.

## Decisions and Action Items

| Task | Owner(s) | Target | Status |
| --- | --- | --- | --- |
| Finalize algorithm-related inputs, outputs, and data types, including budget and the algorithm-based visit-duration approach | Algorithm team (coordinate with Hashim and Rebecca) | Sunday, Nov 8 | Pending |
| Integrate itinerary output into an interactive map in the frontend | Eric and Steven | Aim for Tuesday, Nov 10 | Planned; dependent on finalized output format |
| Review integrated PoC progress and remaining work with the TA | Team | Wednesday, Nov 11 | Upcoming |

## Dependencies and Open Questions
- What is the final structure of the algorithm's input and output data?
- Will budget remain a required input, become optional, or be deferred?
- How exactly will the algorithm estimate or assign visit duration for each POI? The approach and corresponding output field still need to be specified.
- Will route geometry be supplied by the backend, or will the frontend need to retrieve it?
- Which map interactions can be completed before the TA meeting?

## Next Steps
1. Confirm and share the algorithm data contract by Sunday.
2. Eric and Steven proceed with the existing frontend code and aim to complete the interactive map integration by Tuesday, subject to the finalized data contract.
3. Bring the integrated PoC workflow, progress, and any blockers to Wednesday's TA meeting.

---
*Note: Targets are team plans, not confirmed completion dates. Update attendees and unresolved details before merging this note.*

# Weekly Group Meeting — Meeting Minutes

**Project:** Itinerary Map — Group 18  
**Course:** COMPSCI 4ZP6  
**Date:** November 13, 2026  
**Time:** 12:00 PM – 12:16 PM  
**Attendees:** Shaoyuan Wu, Hashim Butt

**Recorded by:** Shaoyuan Wu

## 1. Meeting Agenda

- Review the TA meeting of November 12.
- Check progress against the P0 requirements in the SRS.
- Set the PoC recording date and the pre-recording checks.
- Plan how the PoC video will be recorded.

## 2. Discussion Summary

### 2.1 Review of the TA Meeting (Nov 12)

The team went through the TA's feedback again (see `2026-11-12-ta-meeting.md`):
- The TA is convinced the project has enough technical depth (constraint-based optimization, not LLM prompting).
- The demo should show a user with a plan and a budget getting an itinerary back, state clearly that no LLM is used, and be framed as an investor pitch.
- Traffic-dependent travel times, transport costs, and cost ranges are follow-ups after the PoC.

### 2.2 P0 Progress Check

The team reviewed the P0 requirements in the submitted SRS. All P0 tasks are considered complete except one:
- **Backend route polylines** are not implemented yet. The backend currently returns `null` for `route_polyline_before` / `return_route_polyline`, so the map can only draw straight lines between stops.

Shaoyuan will discuss the polyline work with Leon this weekend and finish it before the first PoC recording.

### 2.3 PoC Recording Date and Checks

- The **first PoC recording is set for November 18**.
- Before then, **every subteam member checks and debugs the part they are responsible for**, so the end-to-end flow works on recording day.

### 2.4 Recording Plan

- If team members don't need to appear on camera, the video can be recorded in a **Microsoft Teams** call.
- A **frontend member shares the screen** and goes through the user's input (trip setup, choosing places) to the final generated itinerary. This part takes about **1 min – 1 min 30 s**.
- The rest of the time goes to the **backend and optimization subteams**, who explain what they built to produce the result.

For reference, the course PoC guide requires:
- **Length:** 150 seconds, mp4, with clear narration. Upload by **November 21, midnight**.
- **Introduction (30%):** 30–60 seconds on the problem and the planned solution (key features, stakeholders). Slides are allowed.
- **Evidence of progress (60%):** a demo of working P0 features. **Don't show actual code.** Working code must be committed to GitHub by the presentation. Describe the technology stack.
- **Q&A (10%):** about 2 minutes of questions in class on **November 23** (all members attend).

## 3. Meeting Outcomes

P0 status: All P0 requirements are considered done except backend route polylines.

Schedule: First PoC recording on November 18; each subteam debugs its own part before then.

Video format: Recorded in Teams; a frontend member demos the full user flow (~1–1.5 min), then the backend and optimization subteams explain their work.

## 4. Action Items

| Action Item | Responsible | Target |
|---|---|---|
| Implement backend route polylines (`route_polyline_before`, `return_route_polyline`) | Shaoyuan Wu and Leon | Before Nov 18 (discuss this weekend) |
| Check and debug own part of the end-to-end flow | Every subteam member | Before Nov 18 |
| Run through the full demo flow with real data before recording | Frontend team | Before Nov 18 |
| Prepare the backend and optimization explanation for the video (no source code on screen) | Backend + Optimization | Before Nov 18 |
| First PoC recording | Whole team | Nov 18 |

## 5. Next Meeting Focus

The next group meeting is at the same time next week (**Friday, November 20, 12:00 PM**), after the first recording on November 18.

- **If the recording went well** and the video is finished before Friday: prepare for the PoC presentation on November 23 (in-class showing and about 2 minutes of Q&A with the TAs, instructor, and students).
- **If the recording had problems:** list what went wrong, assign fixes, and re-record as soon as possible. The video must be uploaded by **November 21, midnight**.

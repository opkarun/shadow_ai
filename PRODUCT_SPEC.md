# PRODUCT_SPEC.md
## Shadow — AI Commitment Intelligence

**Document Status:** Draft v1.0 — Source of Truth for Engineering
**Audience:** Engineering team (4 developers), Claude Code sessions, hackathon judges
**Owner:** Product / Architecture
**Last Updated:** 2026-07-28

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Mission Statement](#2-mission-statement)
3. [Problem Statement](#3-problem-statement)
4. [Market Opportunity](#4-market-opportunity)
5. [Target Users](#5-target-users)
6. [User Personas](#6-user-personas)
7. [User Stories](#7-user-stories)
8. [Functional Requirements](#8-functional-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [AI Behaviour](#10-ai-behaviour)
11. [Commitment Lifecycle](#11-commitment-lifecycle)
12. [End-to-End Workflows](#12-end-to-end-workflows)
13. [AI Communication Lifecycle](#13-ai-communication-lifecycle)
14. [Verification Engine](#14-verification-engine)
15. [Priority Engine](#15-priority-engine)
16. [Confidence Scoring Strategy](#16-confidence-scoring-strategy)
17. [Risk Detection Logic](#17-risk-detection-logic)
18. [Recovery Communication Engine](#18-recovery-communication-engine)
19. [Notification Strategy](#19-notification-strategy)
20. [Conceptual Database Entities](#20-conceptual-database-entities)
21. [High-Level API Overview](#21-high-level-api-overview)
22. [Mobile Application Screens](#22-mobile-application-screens)
23. [Future Enterprise Roadmap](#23-future-enterprise-roadmap)
24. [Edge Cases](#24-edge-cases)
25. [Success Metrics](#25-success-metrics)
26. [Assumptions and Constraints](#26-assumptions-and-constraints)
27. [Pre-Filtering Layer (Noise Reduction)](#27-pre-filtering-layer-noise-reduction)
28. [MVP Feature Prioritization (Must Have / Should Have)](#28-mvp-feature-prioritization-must-have--should-have)
29. [Technology Stack](#29-technology-stack)

---

## 1. Product Vision

Shadow exists to give every professional, student, and team an invisible layer of accountability that watches communication the way a meticulous chief of staff would — noticing what has been promised, tracking whether it happens, and stepping in only when it matters.

Most productivity tools require people to *tell* the system what they need to do. Shadow inverts this relationship: it listens to the communication that already happens (email, chat, code activity, meetings) and *derives* the work that is implied by it. The long-term vision is a world where nothing meaningful said in a conversation — a promise, a request, a deadline — is ever silently dropped, without requiring anyone to manually maintain a task list.

Shadow is not trying to be a better to-do list. It is trying to be the connective tissue between "what was said" and "what actually happened," with AI doing the reading, the watching, and — when authorized — the talking.

## 2. Mission Statement

To eliminate forgotten commitments by autonomously discovering, tracking, verifying, and helping resolve the promises people make to each other at work — while keeping humans in full control of every outbound communication.

## 3. Problem Statement

Commitments are made constantly, but almost never in a structured way:

- They are embedded in natural language, not in task management tools ("Can you upload the presentation tonight?").
- They are scattered across channels — email threads, PR comments, calendar invites.
- They rely entirely on human memory or manual transcription into a to-do app, which is the exact step most people skip under load.
- Deadlines silently pass with no system checking whether the underlying work was actually done — most reminder tools track *time*, not *outcome*.
- When something is missed, the recovery conversation ("sorry, this is late, here's my new timeline") is an added cognitive and emotional burden at the worst possible moment.

Existing tools solve adjacent but different problems:

| Tool category | What it does | What it misses |
|---|---|---|
| Reminder apps (Todoist, Apple Reminders) | Track manually-entered tasks by time | Require manual entry; no detection, no verification |
| Project management (Jira, Asana, Linear) | Track tickets teams deliberately create | Nothing implicit gets captured; heavyweight for casual promises |
| Email/Calendar AI add-ons | Summarize or draft replies | Do not track completion over time or verify outcomes |
| CRM follow-up tools | Track sales-specific commitments | Domain-locked to sales, no engineering verification (GitHub) |

Shadow's gap: **no existing product detects a commitment from natural conversation, tracks it as a first-class object, verifies its completion against real evidence, and manages the surrounding communication lifecycle — all without requiring the user to manually log anything.**

## 4. Market Opportunity

- **Knowledge worker communication volume** continues to rise (email + chat + PR comments), and the density of implicit commitments inside that volume rises with it — every unstructured commitment is a candidate for being dropped.
- **AI-native inbox and workspace tools** are an active, fast-growing category; Shadow differentiates by focusing specifically on the *commitment* unit of work rather than general summarization or reply drafting.
- **Developer-heavy teams** are a strong initial wedge because GitHub activity provides objective, machine-verifiable evidence of completion — a defensible advantage over general-purpose task assistants that cannot verify anything.
- **Bottom-up adoption path**: individual students, freelancers, and developers can adopt Shadow without an organizational rollout, then pull teams and eventually enterprises in — mirroring the adoption pattern of tools like Notion, Linear, and Slack itself.
- **Enterprise expansion surface**: once commitment data exists at the individual level, aggregated commitment intelligence (team reliability scoring, SLA tracking, manager visibility) becomes a natural enterprise upsell, addressed in the Future Enterprise Roadmap (Section 23).

## 5. Target Users

### Primary (MVP)

- **Students** — juggling assignment deadlines, group project promises, professor requests buried in email.
- **Developers** — PR review requests, "ship by Friday" asks, on-call handoffs.
- **Startup teams** — fast-moving, informal communication where most commitments are never formally ticketed.
- **Freelancers** — client-facing promises made over email with real reputational and financial stakes.
- **Project managers** — need visibility into what has been promised by whom, across scattered channels, without chasing people manually.

### Future

- **Enterprises** — org-wide commitment visibility, manager dashboards, compliance-adjacent tracking of SLAs and internal promises.
- **Engineering organisations** — integrating commitment intelligence with Jira/Azure DevOps for formal ticket-linked accountability.

## 6. User Personas

### Persona 1 — "Ananya," the Overloaded CS Student
- Second-year engineering student, juggling 4–5 courses, a hackathon team, and a part-time freelance gig.
- Commitments arrive via email for professors and informal group-project threads that never make it into a task tracker.
- Pain: forgets verbal/chat promises made to teammates; has no single place these live.
- Shadow value: automatic capture of "I'll push my part by tonight" style promises, plus GitHub-verified proof of delivery for code-based coursework.

### Persona 2 — "Rohan," the Full-Stack Developer
- Mid-level developer at a 30-person startup. Reviews PRs constantly, receives "can you ship X by Friday" asks in email threads.
- Pain: context-switches between email, GitHub, and calendar; nothing tells him what he actually owes people right now.
- Shadow value: unified commitment dashboard with GitHub-verified completion, extension-request drafts generated before he misses a deadline.

### Persona 3 — "Meera," the Freelance Designer/Developer
- Manages 3–4 concurrent clients, communicates almost entirely by email.
- Pain: client relationships are damaged by silently missed deadlines; drafting the "sorry, I'm late" email is emotionally taxing and often delayed further because of that discomfort.
- Shadow value: recovery and extension-request drafts lower the activation energy to communicate proactively, protecting the client relationship.

### Persona 4 — "Karthik," the Startup Project Manager
- Coordinates a 6-person cross-functional team; no one reliably updates Jira.
- Pain: has to manually chase people ("did you send that report?") because commitments live in people's heads, not in a system.
- Shadow value: a dashboard of team-wide (future: org-wide) commitments with confidence and risk scoring, reducing manual chasing.

## 7. User Stories

Formatted as: *As a [persona], I want [capability], so that [outcome].*

**Detection**
- As Rohan, I want Shadow to detect "can you publish the repository by Friday?" from an email, so that I don't have to manually create a task.
- As Ananya, I want low-confidence, ambiguous mentions to NOT become commitments automatically, so that my dashboard isn't cluttered with false positives.

**Dashboard**
- As Karthik, I want to see all commitments grouped by Pending / Upcoming / Overdue / Completed, so that I can triage at a glance.
- As Meera, I want to filter by source (Gmail, GitHub, Calendar) and by requester, so that I can prepare for a specific client call.

**Verification**
- As Rohan, I want Shadow to mark a commitment complete automatically when I push the relevant commit or open the relevant PR, so that I don't have to update status manually.
- As Karthik, I want Shadow to never assume completion just because time has passed, so that I can trust the "Completed" column.

**Communication**
- As Meera, I want Shadow to draft an acknowledgement email when I accept a client's request, so that I look responsive without extra effort.
- As Rohan, I want Shadow to warn me *before* a deadline is missed and draft an extension request, so that I can proactively manage expectations.
- As Ananya, I want every drafted message to require my explicit approval before sending, so that nothing goes out in my name that I haven't reviewed.

**Risk & Priority**
- As Karthik, I want commitments from important stakeholders to automatically surface as higher priority, so that my team focuses on what matters.
- As Rohan, I want Shadow to flag a commitment "at risk" a day or two before the deadline if there's no supporting GitHub activity, so that I have time to react.

## 8. Functional Requirements

### FR-1 Commitment Detection
- FR-1.0: The system SHALL run every incoming Gmail message through a lightweight heuristic pre-filter (Section 28) before any LLM call. Only messages that pass the pre-filter are sent to extraction; messages that fail it are discarded without an LLM call and without being surfaced to the user.
- FR-1.1: The system SHALL analyze incoming Gmail messages using an LLM-based extraction pipeline to identify candidate commitments.
- FR-1.2: The system SHALL extract, at minimum: task description, requester, deadline (if present), source channel, and suggested verification method.
- FR-1.3: The system SHALL assign a confidence score (Section 16) to every extracted candidate.
- FR-1.4: The system SHALL NOT create a commitment record automatically for low-confidence candidates; it SHALL create one automatically for high-confidence candidates; it SHALL request user confirmation for medium-confidence candidates.

### FR-2 Commitment Dashboard
- FR-2.1: The system SHALL display commitments grouped into Pending, Upcoming, Overdue, and Completed states.
- FR-2.2: Each commitment card SHALL display: task title, requester, deadline, source, priority, confidence, and verification status.
- FR-2.3: The system SHALL support filtering by source, requester, priority, and status.
- FR-2.4: The system SHALL support manual override of status, priority, and deadline by the user.

### FR-3 Deadline Monitoring
- FR-3.1: The system SHALL continuously evaluate each open commitment's deadline against current time and available completion evidence.
- FR-3.2: The system SHALL NOT transition a commitment to "Completed" purely because its deadline has passed.
- FR-3.3: The system SHALL transition a commitment to "Overdue" when the deadline has passed without completion evidence and without manual confirmation.

### FR-4 Verification Engine
- FR-4.1: The system SHALL check GitHub commits, pull requests, and releases associated with a linked repository as evidence of completion.
- FR-4.2: The system SHALL support manual "Mark as Complete" confirmation by the user.
- FR-4.3: The system SHALL support calendar-attendance-based verification for meeting-related commitments.
- FR-4.4: The system SHALL record the verification source and evidence reference (e.g., commit SHA, PR URL) against the commitment.

### FR-5 AI Communication Engine
- FR-5.1: The system SHALL generate draft messages for: acknowledgement, completion confirmation, overdue recovery, and extension request.
- FR-5.2: The system SHALL NEVER send any communication without explicit user approval.
- FR-5.3: The system SHALL allow the user to edit a draft before sending.
- FR-5.4: The system SHALL log the final sent version alongside the commitment for audit/history purposes.

### FR-6 Priority Engine
- FR-6.1: The system SHALL compute a dynamic priority score per commitment based on deadline urgency, stakeholder importance, risk, and confidence.
- FR-6.2: The system SHALL recompute priority on a scheduled basis (see Section 15) and whenever a triggering event occurs (new evidence, approaching deadline).

### FR-7 Confidence Scoring
- FR-7.1: The system SHALL compute a confidence score at extraction time based on the presence/absence of explicit deadline, requester, action, deliverable, and acceptance language.
- FR-7.2: The confidence score SHALL determine the automation tier applied (auto-create, confirm, ignore) per FR-1.4.

### FR-8 Calendar Integration
- FR-8.1: The system SHALL create a Google Calendar event/reminder for confirmed commitments with a deadline.
- FR-8.2: The system SHALL update or remove the calendar event when the commitment's status or deadline changes.

### FR-9 GitHub Integration
- FR-9.1: The system SHALL support linking a commitment to a specific GitHub repository.
- FR-9.2: The system SHALL poll or subscribe (via webhook) to repository events: commits, pull requests, releases.
- FR-9.3: The system SHALL use configurable heuristics (e.g., keyword match, PR title/description match) to associate repository activity with a specific commitment.

### FR-10 Risk Detection
- FR-10.1: The system SHALL flag a commitment as "at risk" when deadline proximity crosses a threshold without corresponding verification evidence (Section 17).
- FR-10.2: The system SHALL trigger the AI Communication Engine to suggest an extension-request draft when a commitment is flagged at risk.

## 9. Non-Functional Requirements

- **NFR-1 Reliability of state:** Commitment status must never regress silently (e.g., Completed → Overdue) without a logged reason.
- **NFR-2 Latency:** Commitment detection from a newly received email should surface on the dashboard within a few minutes under normal polling/webhook conditions.
- **NFR-3 Auditability:** Every AI-driven state change (status transition, priority change, confidence assignment) must be traceable to the input evidence that caused it.
- **NFR-4 User control:** No outbound communication is ever sent without explicit, per-message user approval (hard constraint, not configurable).
- **NFR-5 Explainability:** Every AI decision surfaced to the user (confidence score, priority score, risk flag) must be accompanied by a human-readable explanation of the contributing factors.
- **NFR-6 Data isolation:** Each user's commitments, connected accounts, and message content must be strictly isolated from other users.
- **NFR-7 Extensibility:** The verification engine and integration layer must be designed so that a new source (Jira, Teams, Azure DevOps) can be added without redesigning the commitment data model.
- **NFR-8 Resilience to false positives:** The system should favor precision over recall for auto-created commitments — it is preferable to miss a low-signal commitment than to clutter the dashboard with noise.
- **NFR-9 Security:** OAuth tokens for Gmail, GitHub, and Calendar must be stored encrypted at rest and scoped to the minimum required permissions.

## 10. AI Behaviour

Shadow's AI layer is explicitly **not** conversational. It does not exist to chat with the user. Its behavioural contract:

- **Discover, don't ask.** Commitments are inferred from existing communication; the user is not expected to describe their tasks to Shadow.
- **Monitor continuously, not on-demand.** Deadline and evidence checks run on a schedule/event basis, not only when the user opens the app.
- **Predict before failure.** Risk detection runs ahead of deadlines specifically so recovery is proactive, not reactive.
- **Verify, don't assume.** Time passing is never sufficient evidence of completion (this is a hard rule enforced across FR-3 and the Verification Engine).
- **Suggest, never act unilaterally on communication.** Every message is a draft pending human approval — Shadow proposes, the human disposes.
- **Explain itself.** Every score (confidence, priority, risk) is shown with the underlying factors, not as an opaque number.
- **Minimise manual task creation.** Manual commitment creation is a fallback UI, not the primary interaction model.

## 11. Commitment Lifecycle

A commitment moves through the following states:

```
DETECTED (candidate, not yet a commitment)
    │
    ▼
CONFIRMED (auto-created if high confidence, or user-confirmed if medium confidence)
    │
    ▼
PENDING (deadline in the future, no risk flag)
    │
    ├──► AT_RISK (deadline approaching, insufficient evidence)
    │        │
    │        ▼
    ├──► OVERDUE (deadline passed, no evidence, no manual confirmation)
    │        │
    │        ▼
    │   RECOVERED (user sends recovery/extension communication, new deadline set)
    │
    ▼
COMPLETED (verified via evidence or manual confirmation)
    │
    ▼
ARCHIVED (kept for history/audit, excluded from active dashboard views)
```

Discarded candidates (low confidence, or user-rejected medium-confidence suggestions) are stored as `DISMISSED` for model feedback purposes but never surfaced as active commitments.

## 12. End-to-End Workflows

### Workflow A — New Commitment from Email
1. Gmail message ingested (webhook/poll).
2. Message passes through the pre-filter (Section 28). If it fails, the message is discarded here — no LLM call is made, no record is created.
3. Extraction pipeline runs on messages that passed the pre-filter; candidate commitment produced with confidence score.
4. Branch on confidence:
   - High → commitment auto-created as `CONFIRMED`.
   - Medium → user notified with a one-tap confirm/reject card.
   - Low → discarded, logged as `DISMISSED`.
5. Priority score computed.
6. If deadline present, calendar event created.
7. Acknowledgement draft generated and queued for user review (Section 13).
8. Commitment enters `PENDING` and is monitored continuously (Workflow B).

### Workflow B — Continuous Monitoring
1. Scheduled job evaluates every open commitment against current time and latest verification evidence.
2. If evidence of completion found → transition to `COMPLETED`, generate completion-confirmation draft.
3. If deadline approaching and risk threshold crossed → transition to `AT_RISK`, generate extension-request draft.
4. If deadline passed with no evidence → transition to `OVERDUE`, generate recovery-communication draft.
5. All transitions logged with contributing evidence for audit (NFR-3).

### Workflow C — GitHub-Verified Completion
1. GitHub webhook/poll detects a commit, PR, or release on a linked repository.
2. Association engine matches the event to an open commitment (by linked repo + keyword/PR-title heuristics).
3. If matched with sufficient confidence → mark `COMPLETED`, store evidence reference (commit SHA / PR URL / release tag).
4. Completion-confirmation draft generated and queued for user review.

### Workflow D — User-Initiated Manual Completion
1. User marks a commitment complete manually from the dashboard.
2. System records verification source as "Manual" with user attribution and timestamp.
3. Commitment transitions to `COMPLETED`; completion-confirmation draft offered (optional, since the user may not want to notify anyone).

## 13. AI Communication Lifecycle

Shadow generates four categories of draft communication, each tied to a specific lifecycle trigger. **No draft is ever sent without explicit user approval (hard constraint, NFR-4).**

| Draft type | Trigger | Tone | Goal |
|---|---|---|---|
| Acknowledgement | Commitment confirmed/accepted | Warm, concise, confirms understanding | Signal responsiveness, confirm scope/deadline |
| Completion Confirmation | Verification evidence found or manual completion | Confident, brief | Close the loop with the requester |
| Overdue Recovery | Deadline passed without evidence | Apologetic, accountable, forward-looking | Rebuild trust, commit to a new timeline |
| Extension Request | Risk threshold crossed pre-deadline | Proactive, respectful | Renegotiate deadline before it's missed |

Draft generation flow:
1. Trigger event fires (see Section 12 workflows).
2. Communication Engine assembles context: original message, requester, deadline, evidence (if any), prior communication in the thread.
3. LLM generates a draft matching the appropriate tone/goal template above.
4. Draft is placed in the user's **Approval Queue** — never auto-sent.
5. User can: Approve & Send, Edit & Send, Discard, or Snooze.
6. Sent messages are logged against the commitment's history for audit and future context (e.g., a later recovery draft should be aware an extension was already granted).

**Hard constraint:** Draft generation itself is unrestricted (the system may proactively suggest a draft at any lifecycle point per Section 15/17), but the send action is *always* a discrete, explicit, user-triggered action — there is no "auto-send after N hours" mode in MVP, by design, to protect user trust (Design Principles, Section 3 of source brief).

## 14. Verification Engine

### Purpose
Determine, using real evidence, whether a commitment has actually been fulfilled — never inferring completion from elapsed time alone.

### Evidence Sources (MVP)
1. **GitHub commits** — matched to a commitment via linked repository + keyword/message heuristics.
2. **GitHub Pull Requests** — matched via PR title/description containing task-related keywords, or explicit linking by the user.
3. **GitHub Releases** — treated as strong evidence for "publish/release/ship" style commitments.
4. **Manual completion** — explicit user confirmation, always available as a fallback for non-verifiable commitment types (e.g., "call the client").
5. **Calendar attendance** — for commitments of the form "attend/join the meeting," verified via calendar event status.

### Evidence Sources (Future)
- Jira issue transitions (e.g., issue moved to "Done").
- Azure DevOps work item state changes.

### Matching Confidence
Each piece of evidence is scored for how strongly it supports a specific commitment (exact repo + keyword match = high; repo match only = medium; no direct match = insufficient). Only medium-or-higher matches can autonomously transition a commitment to `COMPLETED`; low-confidence matches are surfaced to the user as a suggestion ("This PR might be related — confirm?").

### Non-Negotiable Rule
**Time passing is never evidence.** A commitment with a passed deadline and no matching evidence must transition to `OVERDUE`, never silently to `COMPLETED`.

## 15. Priority Engine

### Inputs
- **Deadline urgency** — time remaining until deadline, non-linear weighting (urgency accelerates sharply inside the final 24–48 hours).
- **Stakeholder importance** — derived from requester metadata (e.g., manager/professor/client vs. peer), configurable by the user over time as Shadow learns relationship importance.
- **Risk** — output of the Risk Detection logic (Section 17); higher risk increases priority.
- **Confidence** — lower-confidence commitments are weighted down slightly, since they're more likely to be noise.

### Computation Model (conceptual)
```
priority_score = w1 * urgency(deadline)
               + w2 * stakeholder_weight(requester)
               + w3 * risk_score
               + w4 * confidence_score
```
Weights (`w1..w4`) are tunable configuration, not hardcoded — this allows the team to calibrate behavior during the hackathon without code changes to the scoring logic itself.

### Recomputation Triggers
- Scheduled recomputation (e.g., every few hours) for all open commitments.
- Event-driven recomputation on: new evidence received, deadline edited, risk flag raised/cleared, manual priority override cleared.

### Explainability
Every priority score displayed to the user includes a breakdown of which factor(s) contributed most (e.g., "High priority — deadline in 6 hours, requester marked important").

## 16. Confidence Scoring Strategy

Confidence reflects how certain Shadow is that a piece of text represents a *real, actionable commitment* — not how important it is (that's Priority's job).

### Signals that increase confidence
- Explicit deadline present ("by Friday," "tonight," "before lunch").
- Clear, identifiable requester (a named sender, not an automated/bulk message).
- Clear action verb tied to a deliverable ("publish," "send," "review," "upload").
- Explicit acceptance language from the user's own prior reply ("Sure, I'll do it," "On it").
- Direct addressing (message sent specifically to the user, not a broadcast/CC-only mention).

### Signals that decrease confidence
- Vague or conditional phrasing ("maybe you could look at this sometime").
- No identifiable deadline or deliverable.
- Message is part of a broad announcement/newsletter-style broadcast.
- Sarcasm/rhetorical phrasing patterns (e.g., "sure, I'll get right on that 😅" as a joke, not a real commitment) — the extraction model should be prompted to recognize these constructions.

### Tiers and Automation Behavior
| Tier | Score range (conceptual) | Behavior |
|---|---|---|
| High | Strong deadline + requester + action + deliverable, or explicit acceptance | Auto-created as `CONFIRMED` |
| Medium | Some signals present, some missing/ambiguous | Surfaced for one-tap user confirmation |
| Low | Mostly vague, no clear deliverable/deadline | Discarded (`DISMISSED`), not surfaced as noise |

Exact numeric thresholds are a tuning parameter for the team during implementation/demo prep, not a fixed constant — but the three-tier behavior contract above is fixed.

## 17. Risk Detection Logic

### Definition
A commitment is "at risk" when, given the time remaining and the evidence gathered so far, completion by the deadline is uncertain.

### Signals
- **Time-based:** proportion of time-to-deadline elapsed with zero verification evidence collected.
- **Activity-based:** for GitHub-linked commitments, absence of any related commits/PR activity as the deadline nears (silence is itself a signal).
- **Historical pattern (future-leaning, MVP-light):** the user's historical on-time completion rate for similar commitment types/requesters.
- **Explicit signal:** user manually flags a commitment as "might be late."

### Threshold Logic (conceptual)
```
if time_remaining < risk_window AND no_verification_evidence:
    mark AT_RISK
    trigger extension-request draft suggestion
```
`risk_window` should scale with the original commitment's total duration (a 2-hour-window task and a 2-week task should not use the same fixed lookback), rather than being a single global constant.

### Outcome of Risk Flag
- Dashboard visually surfaces the commitment as at-risk.
- Priority score increases (Section 15).
- AI Communication Engine proactively queues an extension-request draft (Section 13/18) — the user is never surprised by a missed deadline without having had a chance to act first.

## 18. Recovery Communication Engine

Triggered specifically when a commitment transitions to `OVERDUE` (deadline passed, no evidence, no manual confirmation).

### Design Goals
- Acknowledge the miss directly — no evasive language.
- Take ownership without over-apologizing to the point of undermining credibility.
- Always pair the apology with a concrete forward-looking commitment (a new realistic timeframe), never an open-ended "I'll get to it."
- Offer a path back to `PENDING` with an updated deadline once the user approves and sends the message (i.e., sending a recovery message can optionally trigger a deadline-reset flow if the user confirms a new date).

### Relationship to Extension Requests
Extension requests (Section 13) are the *pre-emptive* version of this — sent before the deadline is missed. The Recovery Engine is the *post-hoc* version. Where possible, Shadow should recognize when an extension was already granted for a commitment and adjust the recovery draft's tone accordingly (e.g., referencing the previously agreed extended deadline if that one is also missed) rather than repeating the same tone twice.

## 19. Notification Strategy

Notifications must be attention-respecting, not noisy — a system that cries wolf will be ignored exactly when it matters most.

### Notification Triggers (MVP)
- New medium-confidence commitment awaiting confirmation.
- Commitment transitioned to `AT_RISK` (with suggested extension draft ready).
- Commitment transitioned to `OVERDUE` (with suggested recovery draft ready).
- Verification evidence found → commitment ready to be marked `COMPLETED` (if not auto-confirmed).
- Draft communication ready for approval in the Approval Queue.

### Explicitly NOT Notified
- Every single low-confidence detection (these are silently dismissed, not surfaced).
- Routine priority score recalculations that don't change tier.
- Successful auto-completion via strong evidence (surfaced on next dashboard visit, not push-notified) — this is a UX/tuning decision the team can revisit, but the default favors fewer interruptions.

### Channels
- In-app notification center (always).
- Push notification (mobile) for `AT_RISK` and `OVERDUE` transitions and pending approvals — these are the two states where timing genuinely matters.
- Digest option (e.g., daily summary) as an alternative to real-time push, user-configurable.

## 20. Conceptual Database Entities

This is a conceptual model — implementation-ready schema (fields, indices, migrations) is left to the engineering team.

### `User`
- id, name, email, connected_accounts (Gmail/GitHub/Calendar tokens, scoped + encrypted), notification_preferences, stakeholder_importance_map (learned/config).

### `Commitment`
- id, user_id, title, description, requester (name/identifier), source (`gmail`/`github`/`manual`), source_reference (message id/thread id), deadline (nullable), status (`DETECTED`/`CONFIRMED`/`PENDING`/`AT_RISK`/`OVERDUE`/`COMPLETED`/`ARCHIVED`/`DISMISSED`), confidence_score, priority_score, verification_method, linked_repo (nullable), created_at, updated_at.

### `Evidence`
- id, commitment_id, evidence_type (`github_commit`/`github_pr`/`github_release`/`manual`/`calendar_attendance`), evidence_reference (URL/SHA/event id), match_confidence, detected_at.

### `CommunicationDraft`
- id, commitment_id, draft_type (`acknowledgement`/`completion`/`recovery`/`extension_request`), content, status (`queued`/`approved_sent`/`edited_sent`/`discarded`/`snoozed`), created_at, sent_at (nullable), final_sent_content (nullable, may differ from original draft if edited).

### `Integration`
- id, user_id, provider (`gmail`/`github`/`google_calendar`), auth_token (encrypted), scopes, status (`connected`/`revoked`/`error`), last_synced_at.

### `CalendarEvent`
- id, commitment_id, external_event_id (Google Calendar), title, start_time, status (`created`/`updated`/`removed`).

### `AuditLogEntry`
- id, commitment_id, event_type (status_change/priority_recalc/evidence_matched/draft_generated/draft_sent), before_state, after_state, contributing_factors (structured, for explainability), timestamp.

### Relationships (summary)
- `User` 1—N `Commitment`
- `Commitment` 1—N `Evidence`
- `Commitment` 1—N `CommunicationDraft`
- `Commitment` 1—0/1 `CalendarEvent`
- `Commitment` 1—N `AuditLogEntry`
- `User` 1—N `Integration`

## 21. High-Level API Overview

Conceptual REST-style surface — exact routing/framework choices are left to engineering.

### Auth & Integrations
- `POST /integrations/connect/{provider}` — initiate OAuth for gmail/github/google_calendar.
- `GET /integrations` — list connected integrations and status.
- `DELETE /integrations/{provider}` — revoke.

### Commitments
- `GET /commitments?status=&source=&requester=&priority=` — list/filter.
- `GET /commitments/{id}` — detail, including evidence and draft history.
- `POST /commitments` — manual creation.
- `PATCH /commitments/{id}` — manual override (status, deadline, priority).
- `POST /commitments/{id}/confirm` — confirm a medium-confidence candidate.
- `POST /commitments/{id}/dismiss` — reject a candidate.
- `POST /commitments/{id}/mark-complete` — manual verification.
- `POST /commitments/{id}/link-repo` — associate a GitHub repository for verification.

### Evidence
- `GET /commitments/{id}/evidence` — list evidence records.

### Communication
- `GET /drafts?status=queued` — Approval Queue contents.
- `POST /drafts/{id}/approve` — send as-is.
- `PATCH /drafts/{id}` — edit content.
- `POST /drafts/{id}/send` — send edited version.
- `POST /drafts/{id}/discard`
- `POST /drafts/{id}/snooze`

### Ingestion (internal/webhook-triggered)
- `POST /ingest/gmail` — webhook/poll handler feeding the extraction pipeline.
- `POST /ingest/github` — webhook handler for commit/PR/release events.

### Scoring (internal)
- `POST /internal/recompute-priority` — scheduled job entry point.
- `POST /internal/recompute-risk` — scheduled job entry point.

## 22. Mobile Application Screens

1. **Onboarding / Connect Accounts** — connect Gmail, GitHub, Google Calendar with clear scope explanations.
2. **Dashboard (Home)** — Pending / Upcoming / Overdue / Completed tabs or filter chips; commitment cards with priority/confidence badges.
3. **Commitment Detail** — full extracted detail, evidence timeline, linked repo, draft history, manual override controls.
4. **Approval Queue** — list of pending AI-drafted communications with Approve / Edit / Discard / Snooze actions.
5. **Confirmation Inbox** — medium-confidence candidates awaiting a one-tap confirm/reject.
6. **Notification Center** — chronological feed of risk flags, overdue transitions, evidence matches.
7. **Integrations Settings** — manage connected accounts, scopes, and linked repositories.
8. **Stakeholder Importance Settings** — let the user mark certain requesters (manager, professor, key client) as high-importance, feeding the Priority Engine.
9. **History / Archive** — completed and archived commitments, searchable, for audit/reference.
10. **Profile & Preferences** — notification channel preferences (push/digest), default risk-window tuning, account management.

## 23. Future Enterprise Roadmap

Explicitly out of MVP scope, documented for architectural forward-compatibility:

- **Jira integration** — auto-create Jira issues from engineering-related commitments; use Jira transitions as verification evidence.
- **Azure DevOps integration** — analogous to Jira, for teams standardized on Microsoft's stack.
- **Slack integration** — commitment detection parallel to the Gmail pipeline, covering DMs and channel messages.
- **Microsoft Teams integration** — commitment detection parallel to the existing Gmail pipeline.
- **Notion integration** — detect commitments embedded in shared docs/wikis; potentially use Notion database updates as evidence.
- **Team/Org Dashboards** — manager-level visibility into team-wide commitment health, reliability scoring per team member (handled with care — see Edge Cases, Section 24, regarding surveillance concerns).
- **SLA tracking** — for client-facing or support teams, formalize commitment tracking against contractual response/resolution times.
- **Commitment reliability scoring** — a longitudinal, per-person score reflecting historical on-time completion rate; usable for self-awareness and, cautiously, for team lead visibility with clear consent/transparency boundaries.

## 24. Edge Cases

- **Sarcastic or rhetorical "commitments"** ("Sure, I'll get right on that 😂") must not be extracted as real commitments — extraction prompting must account for tone.
- **Bulk/broadcast messages** (e.g., "Everyone please submit timesheets by Friday" sent to 50 people) should be handled distinctly from a 1:1 ask — either excluded from auto-creation or tagged as a lower-confidence, lower-priority class.
- **Multiple people promising the same task** (e.g., two teammates both say "I'll handle it") — Shadow should not create duplicate commitments for the same underlying deliverable when detectable from thread context; at minimum, duplicates should be visually linked/flagged for the user to reconcile.
- **Deadline language ambiguity** ("by tonight" — whose timezone? "EOD Friday" — which Friday if sent late Thursday near midnight?) — the extraction pipeline should default to the sender's likely timezone/context and flag genuinely ambiguous cases as medium-confidence rather than guessing silently.
- **Commitment renegotiated verbally/outside tracked channels** — the user must have an easy manual override path (Section 8, FR-2.4) since Shadow cannot observe every channel.
- **False-positive GitHub evidence match** (e.g., an unrelated PR happens to contain a matching keyword) — matches below a confidence threshold must be surfaced as a suggestion requiring confirmation, never auto-completing the commitment (Section 14).
- **User revokes an integration mid-lifecycle** — open commitments sourced from that integration should be preserved (not deleted) but flagged as "verification unavailable" rather than silently stuck.
- **Commitment with no deadline** ("let me know your thoughts sometime") — should not enter deadline-based risk/overdue logic at all; treated as a distinct low-urgency, non-deadline-driven category.
- **Recipient never actually wants a reminder/draft for a given commitment** (e.g., an internal note-to-self) — user must be able to disable draft generation per-commitment.
- **Manager/surveillance concern in future team dashboards** — reliability scoring visible to managers is a trust-sensitive feature; MVP explicitly excludes any cross-user visibility to avoid this concern prematurely.

## 25. Success Metrics

### MVP Validation Metrics
- Number of real commitments correctly detected against a hand-labeled test set (precision and recall).
- Percentage of high-confidence commitments that required no manual correction.
- End-to-end latency from message ingestion to dashboard appearance.
- Number of GitHub-verified auto-completions during testing.

### Product-Level Success Metrics (longer-term direction)
- **Commitment capture rate** — proportion of a user's real commitments that Shadow successfully surfaces (measured via periodic user feedback/audits).
- **False positive rate** — proportion of auto-created commitments the user dismisses/corrects (target: low, per NFR-8).
- **On-time completion rate uplift** — comparing user-reported missed commitments before vs. after adopting Shadow.
- **Draft approval rate** — proportion of AI-drafted communications sent as-is vs. edited vs. discarded (signals draft quality).
- **Time-to-recovery** — for overdue commitments, time elapsed between the `OVERDUE` transition and the user sending a recovery/extension communication (target: shorter than user's typical unprompted delay).
- **Retention/engagement** — weekly active usage of the dashboard and Approval Queue.

## 26. Assumptions and Constraints

### Assumptions
- Users will grant OAuth access to Gmail, GitHub, and Google Calendar with reasonably scoped permissions during onboarding.
- The primary language of ingested communication is English for the MVP; multilingual extraction is out of scope for the hackathon build.
- A GitHub repository can be explicitly linked to a commitment either automatically (heuristic match) or manually by the user; fully automatic repo-discovery across a user's entire GitHub account is not required for MVP.
- Demo/test environments will use seeded or sandboxed Gmail/GitHub accounts rather than production accounts with sensitive real data.
- Stakeholder importance (for Priority scoring) can start with sensible defaults (e.g., direct 1:1 message > broadcast) and be refined by explicit user configuration rather than requiring a fully learned model at MVP stage.

### Constraints
- **Four-developer team** — module boundaries (Detection/Extraction, Verification/Integrations, Communication Engine, Dashboard/Frontend) should map cleanly to four independently workable units, coordinated through the shared data model in Section 20 and API surface in Section 21.
- **No automated sending, ever, in MVP** — this is a product-level hard constraint, not a missing feature; it must not be relaxed even for demo convenience, since it is core to the trust proposition (Design Principles).
- **Hackathon timeline** — scope is explicitly bounded to the MVP integrations (Gmail, GitHub, Google Calendar); Jira/Teams/Slack/Notion/Azure DevOps are documented (Section 23) but must not be attempted during the hackathon build.
- **No code in this document** — per instruction, this specification is implementation-guidance only; concrete schemas, endpoint signatures, and architecture diagrams are to be produced by the engineering team as a follow-on artifact, informed by this document.
- **Explainability is mandatory, not optional** — every AI-derived score shown in the UI (confidence, priority, risk) must ship with a human-readable rationale; this is a launch-blocking requirement, not a stretch goal.

---

## 27. Pre-Filtering Layer (Noise Reduction)

### Purpose
The majority of incoming Gmail messages contain no commitment at all (automated notifications, "thanks!", meeting logistics, newsletters). Running every message through the LLM extraction pipeline (Section 8, FR-1.1) wastes cost, latency, and rate-limit budget for no signal. The Pre-Filtering Layer sits directly in front of extraction and cheaply discards messages that have no realistic chance of containing a commitment, before any LLM call is made.

### Design Principle
The pre-filter is a **noise filter, not a detector**. It must never attempt to decide *whether* a message is a real commitment — that judgment belongs entirely to the LLM extraction step (Section 16, Confidence Scoring). Its only job is to answer: *"does this message have any chance of containing a commitment?"* Because of this, the filter must be calibrated toward **recall over precision** — it is far cheaper to let a non-commitment through to the LLM (which will correctly score it low and discard it) than to silently drop a real commitment before the LLM ever sees it. A message that fails the pre-filter is gone permanently; there is no second chance.

### Filter Signals (pass if ANY match — logical OR, not AND)
- **Commitment-adjacent phrasing:** request patterns (`can you`, `could you`, `would you`, `please`), acceptance/promise patterns (`I'll`, `I will`, `on it`, `will do`), action verbs tied to deliverables (`send`, `review`, `publish`, `upload`, `finish`, `submit`, `ship`, `deploy`, `fix`, `merge`).
- **Deadline-shaped language:** explicit time/date references (`by Friday`, `tomorrow`, `tonight`, `EOD`, `end of day`, `before lunch`, `\d{1,2}\s?(am|pm)`, weekday names, `next week`).
- **Implicit imperative sentence structure:** a message addressed directly to the user with an imperative-mood opening verb and no question mark (e.g., "Upload the presentation tonight.") — this exists specifically to catch commitments that lack a "can you"/"please" wrapper (see Edge Cases note below).
- **Message length above a trivial floor:** skip filtering logic entirely (auto-fail) for very short acknowledgement-only messages (`thanks`, `ok`, `👍`, `sounds good`) below a small word-count threshold.

### Auto-Fail Conditions (skip regardless of other signals)
- Sender is a no-reply/automated/bot address (`noreply@`, `notifications@`, known automated sender addresses).
- Message already processed (dedupe by message ID before any other check — this runs first, ahead of all filter logic).
- Message is a pure system/integration notification (e.g., "X joined the channel," calendar auto-replies).

### Explicit Non-Goal
The filter must **not** attempt to exclude broadcast/bulk messages, sarcasm, or ambiguous phrasing — those are confidence-scoring problems (Section 16) and risk-detection/edge-case problems (Section 24), not pre-filter problems. Pushing that judgment into the regex layer would silently drop legitimate low-signal-but-real commitments with no recovery path.

### Batching Optimization
When multiple messages arrive in a short window (e.g., a batch Gmail sync), the pre-filter should run across the whole batch first, and only the survivors should be sent to the LLM — ideally as a **single batched extraction call** covering multiple candidate messages, rather than one LLM call per message. This further reduces cost/latency beyond the raw noise reduction the filter itself provides.

### Tuning & Ownership
The filter's keyword/pattern list is configuration, not hardcoded logic, so it can be tuned during the build without touching the extraction pipeline. It is owned by the Detection/Extraction module since it sits directly upstream of extraction and shares the same input contract.

### Contract (for engineering)
- **Input:** raw message object (Gmail message, normalized to a common shape).
- **Output:** boolean `passes_prefilter` + the original message, unmodified. The filter never mutates or scores the message — it only gates whether it proceeds to extraction.
- **Failure mode:** if the pre-filter itself errors (e.g., malformed message), default to **pass-through** (fail open, not closed) — an unnecessary LLM call is cheap; a silently dropped commitment is not.

---

## 28. MVP Feature Prioritization (Must Have / Should Have)

This section makes the MVP scope boundary explicit using MoSCoW-style prioritization, so the team can build the Must Haves first and treat Should Haves as stretch goals if time runs short — this does not remove anything from Sections 8/15/16/etc., it just tells the team what to build first.

### Must Have (core MVP — build first, non-negotiable)
- Commitment Detection from Gmail via LLM extraction, gated by the Pre-Filtering Layer (Section 27).
- Commitment Dashboard with Pending / Upcoming / Overdue / Completed views.
- Deadline Monitoring that never assumes completion from elapsed time alone.
- Verification Engine (GitHub commits/PRs/releases + manual confirmation).
- AI Communication Engine (acknowledgement, completion, recovery, extension drafts) — with the hard constraint that nothing is ever auto-sent without explicit user approval.
- Basic commitment status lifecycle (Section 11).

### Should Have (significantly improve the product, not essential for MVP)

These can be de-scoped or simplified first if the 4-day timeline gets tight, without breaking the core product story.

**1. Dynamic Priority Score**
Ranks commitments relative to each other based on:
- **Deadline** — how soon the commitment is due.
- **Importance** — weight of the requester/stakeholder (e.g., professor/manager/client vs. a peer).
- **Confidence** — how certain Shadow is that this is a real commitment (see below); lower-confidence items are weighted down.

If not built in time, the MVP can fall back to a simple deadline-only sort (soonest-due-first) instead of the full weighted score — the dashboard still functions, it's just less intelligent about ordering.

**2. Confidence Score**
Every extracted commitment is scored into one of three tiers:
- **High** — strong signals present (explicit deadline, clear requester, clear action + deliverable, or explicit acceptance language). **Only High-confidence commitments are auto-created** without asking the user first.
- **Medium** — some signals present, some missing or ambiguous. Surfaced to the user for a one-tap confirm/reject rather than auto-created.
- **Low** — mostly vague, no clear deliverable or deadline. Discarded silently, never shown to the user as noise.

If not built in time, the MVP can fall back to auto-creating every detected commitment and skipping the medium-confidence confirmation step — at the cost of more false positives cluttering the dashboard.

**3. Commitment Ranking**
Using the Dynamic Priority Score, the dashboard should be able to **rank commitments against each other**, not just sort by raw deadline — surfacing the commitments that matter most (soonest + most important + highest confidence) at the top, rather than a flat chronological list. This is what makes the dashboard feel intelligent rather than being a glorified sorted to-do list.

### Relationship to Sections 15/16
These Should Have items correspond directly to the Priority Engine (Section 15) and Confidence Scoring Strategy (Section 16) already detailed earlier in this document — this section exists purely to flag their build priority relative to the Must Haves above, not to redefine their logic.

---

## 29. Technology Stack

This section is the single source of truth for what technology each module uses. Full setup instructions, folder structure, and shared type definitions live in the companion `ARCHITECTURE.md`; this section exists so the stack decision itself is captured alongside the product requirements it serves.

### Frontend
- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS
- **State management:** Zustand
- **3D/Visual layer:** Three.js, via **React Three Fiber** (`@react-three/fiber`) and **Drei** (`@react-three/drei`) for helper utilities. Used specifically for:
  - A 3D "commitment orbit" view — commitments rendered as nodes sized by priority score (Section 15) and colored by status, giving an at-a-glance visual read of workload that a flat list can't.
  - Animated risk/priority indicators for `AT_RISK` commitments (Section 17), more visually attention-grabbing than a static badge.
  - Ambient background visuals on the dashboard shell for a more polished, premium feel.
  - **Scoping rule:** the 3D view is a **Should Have** enhancement layered on top of the standard 2D dashboard (Section 22), never a dependency of it. The core dashboard (cards, filters, Pending/Upcoming/Overdue/Completed views) must be fully functional in plain HTML/Tailwind first; Three.js is added as an alternate/enhanced view afterward, so a 3D rendering bug never blocks core functionality.

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript throughout, matching the frontend

### Database
- **MongoDB** (Atlas free-tier cluster) — chosen for schema flexibility, since commitments, evidence, and drafts vary in shape across sources. Connection and schema/model definitions live centrally in `shared/db/` (see companion ARCHITECTURE.md), not inside any individual feature folder.

### Background Jobs / Scheduling
- **node-cron** as the default (simple, no extra infrastructure) for Deadline Monitoring (Section 3, FR-3) and Risk recomputation (Section 17).
- **BullMQ + Redis** as an upgrade path if time allows and more robust/distributed job handling is wanted — not required for MVP.

### AI (Extraction, Scoring, Draft Generation)
- **Google Gemini API (Flash model)** — used for Commitment Detection/Extraction (Section 8, FR-1), Confidence Scoring (Section 16), and all four AI Communication Engine draft types (Section 13). One provider, one API key, chosen specifically for its generous free-tier request limits, which matters given four people testing continuously over a short build window.
- **Groq** — optional backup/overflow provider if Gemini's free-tier limits are ever hit during heavy testing.

### Integrations
- **Gmail:** Gmail API + Google Cloud Pub/Sub (push notifications for real-time ingestion, rather than polling)
- **GitHub:** GitHub Webhooks + Octokit.js (GitHub's official Node client) for evidence detection (Section 14)
- **Google Calendar:** Google Calendar API via the `googleapis` Node client, for calendar event creation/sync (Section 8, FR-8)

### Local Development & Demo Access
- **ngrok** — exposes the locally-run backend via a public HTTPS URL, required both for third-party webhooks (Gmail/GitHub all need a reachable public endpoint) and for accessing the app from a phone when off the local WiFi network.
- Local WiFi + laptop's local IP address as the no-tunnel fallback for same-network phone access during day-to-day development.

### Pre-Filtering Layer
- Plain TypeScript/regex logic (Section 27) — deliberately no external library or AI call, since its entire purpose is to avoid unnecessary LLM spend before extraction.

---

*End of PRODUCT_SPEC.md*

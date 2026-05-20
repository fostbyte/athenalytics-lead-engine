# Athenalytics Lead Engine Agile Ticket Plan

This document converts the Athenalytics Lead Engine PRD into a Jira-style agile ticket system organized by themed sprints. The plan keeps every ticket at 5 story points or less, caps each sprint at 20 story points, and includes unit tests and validation requirements for each ticket. [file:1]

## Sprint overview

The MVP is a human-in-the-loop workflow that starts with city/state or ZIP-based lead search, enriches public business data, scores leads with explainable reasons, drafts outreach emails, and requires explicit approval before send. The PRD also calls for React or Next.js, Node.js/Express or API routes, MongoDB, background jobs, workspace-based separation, and settings for prompts and scoring weights. [file:1]

| Sprint | Theme | Points | Goal |
|---|---|---:|---|
| Sprint 1 | Search foundation | 20 | Create searchable, geography-aware lead job intake and persistence. [file:1] |
| Sprint 2 | Discovery pipeline | 20 | Run background jobs, discover leads, normalize geography, and dedupe. [file:1] |
| Sprint 3 | Enrichment pipeline | 20 | Extract lead signals and evidence from public sources. [file:1] |
| Sprint 4 | Scoring engine | 18 | Implement explainable heuristic scoring with reason codes and rescore flow. [file:1] |
| Sprint 5 | Drafting and review | 20 | Generate emails, support editing, approval, and controlled send workflow. [file:1] |
| Sprint 6 | Admin, hardening, and audit | 20 | Add settings, tenant isolation, audit trails, and operational safeguards. [file:1] |

## Sprint 1: Search foundation

This sprint focuses on intake, job creation, and the required search anchors because the PRD makes city/state or ZIP mandatory for lead generation and requires the system to store the search geography for each job. It also establishes the UX entry point described in the search page requirements. [file:1]

### LEAD-101 — Create core MongoDB schemas
- **Story Points:** 5 [file:1]
- **Description:** Create initial schemas/models for `Lead`, `LeadSignals`, `EmailDraft`, and `SearchJob` with required fields from the PRD, including workspace linkage and timestamps. [file:1]
- **Acceptance Criteria:**
  - Models exist for the four core entities listed in the PRD. [file:1]
  - `SearchJob` supports `vertical`, `locationType`, `city`, `state`, `zipCode`, `radiusMiles`, `targetCount`, `filters`, `status`, and progress metadata. [file:1]
  - `Lead` supports score, score band, reasons, geography context, and distance fields. [file:1]
- **Unit Tests:**
  - Schema validation passes for valid required payloads. [file:1]
  - Invalid enum or missing required fields are rejected. [file:1]
  - Timestamps and workspace linkage are set correctly. [file:1]
- **Validation:**
  - Seed sample documents and verify round-trip create/read/update in local Mongo. [file:1]

### LEAD-102 — Build search job create API
- **Story Points:** 5 [file:1]
- **Description:** Implement `POST /api/search-jobs` to accept vertical, location mode, target geography, radius, target count, and filters. [file:1]
- **Acceptance Criteria:**
  - API accepts either `city + state` or `zipCode`, not both as required inputs. [file:1]
  - API rejects requests missing a geographic anchor. [file:1]
  - API persists a new `SearchJob` with `queued` or equivalent initial status. [file:1]
- **Unit Tests:**
  - City/state requests validate successfully. [file:1]
  - ZIP-based requests validate successfully. [file:1]
  - Missing or malformed geography returns 400. [file:1]
- **Validation:**
  - Manual API checks with representative payloads confirm correct persistence. [file:1]

### LEAD-103 — Build search intake UI
- **Story Points:** 5 [file:1]
- **Description:** Create the search page with niche, city/ZIP mode toggle, radius, target lead count, and optional filters. [file:1]
- **Acceptance Criteria:**
  - UI matches the PRD’s search-page controls, including city mode and ZIP mode. [file:1]
  - Radius input appears with a sensible default. [file:1]
  - Optional filters include examples like website required, multi-location only, and bookings only. [file:1]
- **Unit Tests:**
  - Toggle changes required fields between city/state and ZIP. [file:1]
  - Invalid form states disable submission. [file:1]
  - Submitted payload shape matches backend contract. [file:1]
- **Validation:**
  - Manual browser test confirms form state transitions and request payload correctness. [file:1]

### LEAD-104 — Add search job status endpoint and recent searches UI
- **Story Points:** 5 [file:1]
- **Description:** Implement `GET /api/search-jobs/:id` plus recent-search display and job progress indicator shell. [file:1]
- **Acceptance Criteria:**
  - Search jobs can be retrieved by ID. [file:1]
  - Search page shows recent searches and basic progress state. [file:1]
  - Job detail includes stored geography and filter context. [file:1]
- **Unit Tests:**
  - Existing jobs return expected shape. [file:1]
  - Unknown IDs return 404. [file:1]
  - Recent searches sort newest first. [file:1]
- **Validation:**
  - Start multiple jobs and confirm recent search cards render correct metadata. [file:1]

## Sprint 2: Discovery pipeline

This sprint stays on the discovery theme because the PRD requires background jobs, incremental candidate return, duplicate prevention, and prioritization within target geography. It also introduces geographic normalization and distance handling before enrichment or scoring. [file:1]

### LEAD-201 — Implement geography normalization service
- **Story Points:** 5 [file:1]
- **Description:** Build a service to validate city/state or ZIP input, resolve ZIP center points, and produce normalized geography objects. [file:1]
- **Acceptance Criteria:**
  - ZIP inputs resolve to center lat/lng when possible. [file:1]
  - City/state inputs normalize casing and canonical storage format. [file:1]
  - Invalid or ambiguous geography is rejected conservatively. [file:1]
- **Unit Tests:**
  - Valid ZIP returns normalized center. [file:1]
  - Valid city/state returns normalized object. [file:1]
  - Invalid inputs return structured validation errors. [file:1]
- **Validation:**
  - Compare normalized outputs against known ZIP and city/state samples. [file:1]

### LEAD-202 — Add background job worker for discovery
- **Story Points:** 5 [file:1]
- **Description:** Create a queue worker that picks up search jobs and transitions job state through queued, running, and completed or failed. [file:1]
- **Acceptance Criteria:**
  - New search jobs are picked up asynchronously. [file:1]
  - Job progress is updated during execution. [file:1]
  - Failure state is recorded with retry-safe behavior. [file:1]
- **Unit Tests:**
  - Worker moves jobs through valid status transitions. [file:1]
  - Failures set error state without corrupting job data. [file:1]
  - Duplicate worker pickup is prevented. [file:1]
- **Validation:**
  - Run a local job and observe state transitions in DB and UI. [file:1]

### LEAD-203 — Create discovery adapter contract and first source integration
- **Story Points:** 5 [file:1]
- **Description:** Define the discovery adapter interface and implement one public web/business listing source that returns structured lead candidates. [file:1]
- **Acceptance Criteria:**
  - Adapter returns business name, category, website, contact fields when available, source notes, and geography context. [file:1]
  - Discovery respects vertical and target geography constraints. [file:1]
  - Weak-confidence results are marked conservatively. [file:1]
- **Unit Tests:**
  - Adapter output maps into canonical candidate shape. [file:1]
  - Out-of-vertical candidates are filtered. [file:1]
  - Missing website URLs are not guessed. [file:1]
- **Validation:**
  - Run a narrow search slice and inspect returned lead candidates for shape and quality. [file:1]

### LEAD-204 — Implement candidate dedupe and geographic filtering
- **Story Points:** 5 [file:1]
- **Description:** Deduplicate discovered candidates and filter or rank them based on radius and location match rules. [file:1]
- **Acceptance Criteria:**
  - Obvious duplicates are prevented before lead creation. [file:1]
  - Candidates outside the target radius are excluded by default. [file:1]
  - `distanceMiles` is stored when derivable. [file:1]
- **Unit Tests:**
  - Duplicate domain/name combinations collapse correctly. [file:1]
  - In-range and out-of-range cases classify correctly. [file:1]
  - Distance calculations are stable within acceptable tolerance. [file:1]
- **Validation:**
  - Test with mixed nearby and far-away fixtures and confirm filtering behavior. [file:1]

## Sprint 3: Enrichment pipeline

This sprint is about enrichment only, aligning to the PRD’s requirement to gather website and business signals, store evidence snippets, and preserve geographic evidence before scoring or drafting. The orchestrator guidance also requires enough evidence before passing leads downstream. [file:1]

### LEAD-301 — Build enrichment pipeline and agent contract
- **Story Points:** 5 [file:1]
- **Description:** Create the enrichment task contract and pipeline that takes discovered leads and produces structured `LeadSignals`. [file:1]
- **Acceptance Criteria:**
  - Enrichment produces the fields listed in the PRD when determinable, otherwise stores `unknown` or null-safe equivalents. [file:1]
  - Evidence snippets are required for extracted signals. [file:1]
  - Geography evidence is preserved when available. [file:1]
- **Unit Tests:**
  - Valid discovery input yields a `LeadSignals` record. [file:1]
  - Unknown values do not break downstream storage. [file:1]
  - Missing evidence causes signal rejection for protected fields. [file:1]
- **Validation:**
  - Enrich a small batch and inspect evidence quality manually. [file:1]

### LEAD-302 — Extract website maturity and conversion-path signals
- **Story Points:** 5 [file:1]
- **Description:** Implement extraction logic for `hasWebsite`, `hasBooking`, `hasOrdering`, CTA presence, and mobile-friendly heuristics. [file:1]
- **Acceptance Criteria:**
  - Signal extraction captures booking, ordering, and CTA indicators when supported. [file:1]
  - Website quality fields map into the scoring model inputs. [file:1]
  - Unsupported claims are not inferred without evidence. [file:1]
- **Unit Tests:**
  - Fixture sites with booking or ordering are detected correctly. [file:1]
  - Sites lacking those paths remain false or unknown. [file:1]
  - Evidence snippets are attached to each positive extraction. [file:1]
- **Validation:**
  - Run against known site examples and compare extracted signals to visible page content. [file:1]

### LEAD-303 — Extract demand, outreach, and growth signals
- **Story Points:** 5 [file:1]
- **Description:** Add extraction for review count/recency, social presence, contact readiness, named owner/manager visibility, promotions, and growth indicators. [file:1]
- **Acceptance Criteria:**
  - Lead signals cover demand proxy, outreach readiness, analytics pain, and growth intent categories from the scoring framework. [file:1]
  - Contact readiness stores public email/contact form evidence only. [file:1]
  - Promotions and recurring-service indicators are evidence-backed. [file:1]
- **Unit Tests:**
  - Review and contact fixtures parse correctly. [file:1]
  - No public email means no fabricated email field. [file:1]
  - Promotions flags require supporting evidence text. [file:1]
- **Validation:**
  - Compare structured output for 10 leads against manually reviewed business pages. [file:1]

### LEAD-304 — Create lead detail signals panel API/UI
- **Story Points:** 5 [file:1]
- **Description:** Build `GET /api/leads/:id` and a lead detail view that shows business profile, extracted signals, evidence, and geography context. [file:1]
- **Acceptance Criteria:**
  - Lead detail page shows profile, evidence, signal list, and local-fit data as described in the PRD. [file:1]
  - Missing data is rendered clearly, not hidden. [file:1]
  - Evidence snippets are easy to inspect. [file:1]
- **Unit Tests:**
  - API returns joined lead and signal data. [file:1]
  - UI renders partial-signal cases safely. [file:1]
  - Geography panel displays distance when available. [file:1]
- **Validation:**
  - Manual review confirms the user can inspect why a lead is qualified. [file:1]

## Sprint 4: Scoring engine

This sprint is about scoring because the PRD specifies a conservative, explainable heuristic model with weighted factors, score bands, and 3 to 5 reasons per lead. It also requires manual rescore when settings change. [file:1]

### LEAD-401 — Implement scoring engine with weighted subscores
- **Story Points:** 5 [file:1]
- **Description:** Build the v1 heuristic scoring engine using the weighted factors from the PRD. [file:1]
- **Acceptance Criteria:**
  - Engine computes a 0 to 100 score using business fit, website quality, demand proxy, analytics pain, outreach readiness, growth intent, and geographic relevance. [file:1]
  - Geographic relevance is a modest factor, not dominant. [file:1]
  - Score band assignment follows the PRD thresholds. [file:1]
- **Unit Tests:**
  - Weighted subscore math matches expected totals. [file:1]
  - Score band boundaries classify correctly. [file:1]
  - Missing data reduces confidence or score appropriately. [file:1]
- **Validation:**
  - Run test fixtures across high, medium, review, and exclude bands and compare to expected outcomes. [file:1]

### LEAD-402 — Generate explainable score reasons
- **Story Points:** 5 [file:1]
- **Description:** Produce 3 to 5 concise score reasons and confidence metadata for each scored lead. [file:1]
- **Acceptance Criteria:**
  - Each scored lead has 3 to 5 reasons unless evidence is insufficient, in which case confidence is reduced. [file:1]
  - Reasons map to actual observed signals. [file:1]
  - Reasons are concise enough for quick review. [file:1]
- **Unit Tests:**
  - Reasons are sourced only from evidence-backed signals. [file:1]
  - Low-data leads receive lower confidence. [file:1]
  - Reason count stays within limits. [file:1]
- **Validation:**
  - Manual UX review confirms a user can understand high-ranking rationale in under 10 seconds. [file:1]

### LEAD-403 — Add rescore endpoint and score queue refresh
- **Story Points:** 3 [file:1]
- **Description:** Implement `POST /api/leads/:id/rescore` and update queue data when score settings change. [file:1]
- **Acceptance Criteria:**
  - User can manually trigger rescore. [file:1]
  - Updated score, band, and reasons replace the prior result with auditability preserved. [file:1]
- **Unit Tests:**
  - Rescore updates score fields. [file:1]
  - Invalid lead IDs return correct errors. [file:1]
  - Rescore respects current settings snapshot. [file:1]
- **Validation:**
  - Change a weight and confirm a visible score shift for affected leads. [file:1]

### LEAD-404 — Build lead queue with score/status filters
- **Story Points:** 5 [file:1]
- **Description:** Implement `GET /api/leads` and a queue UI with sort/filter by score, status, category, location, and distance. [file:1]
- **Acceptance Criteria:**
  - Queue supports the PRD’s sort and filter dimensions. [file:1]
  - Quick-view cards show score, reasons, contact readiness, and local fit. [file:1]
  - Status pipeline supports discovered, scored, drafted, approved, sent, and rejected. [file:1]
- **Unit Tests:**
  - Filtering and sorting operate correctly across combined criteria. [file:1]
  - Queue cards render score metadata consistently. [file:1]
  - Status chips reflect canonical state values. [file:1]
- **Validation:**
  - Manual queue review confirms fast scanning and prioritization flow. [file:1]

## Sprint 5: Drafting and review

This sprint stays on the drafting and review theme because the PRD requires AI-generated drafts, observed-business personalization, tone presets, review queue editing, explicit approval before send, and logging of approved versions and send timestamps. It also states that automatic sending without review is out of scope. [file:1]

### LEAD-501 — Build email draft generation service
- **Story Points:** 5 [file:1]
- **Description:** Implement `POST /api/leads/:id/draft-email` using lead facts, score reasons, and tone presets to produce a draft subject and body. [file:1]
- **Acceptance Criteria:**
  - Draft includes one observed fact, one likely analytics pain point, one relevant Athenalytics value proposition, and one low-friction CTA when data supports it. [file:1]
  - Draft avoids fabricated claims and stays concise. [file:1]
  - Tone presets support direct, friendly, and professional. [file:1]
- **Unit Tests:**
  - Draft requests return subject/body plus personalization points. [file:1]
  - Sparse-data leads produce conservative drafts. [file:1]
  - Unsupported traffic claims or invented details are blocked. [file:1]
- **Validation:**
  - Review 20 generated drafts and verify factual grounding against lead evidence. [file:1]

### LEAD-502 — Create review queue and inline editor
- **Story Points:** 5 [file:1]
- **Description:** Build the pending draft review queue and editor for subject/body updates. [file:1]
- **Acceptance Criteria:**
  - Review queue lists pending drafts. [file:1]
  - User can edit subject and body inline before approval. [file:1]
  - Draft history is preserved per lead. [file:1]
- **Unit Tests:**
  - Draft list loads only appropriate statuses. [file:1]
  - Inline edits persist correctly. [file:1]
  - Draft history ordering is correct. [file:1]
- **Validation:**
  - Manual review confirms low-friction edit flow for human-in-the-loop use. [file:1]

### LEAD-503 — Add approval workflow and send guardrails
- **Story Points:** 5 [file:1]
- **Description:** Implement `POST /api/email-drafts/:id/approve` and enforce “cannot send without explicit approval.” [file:1]
- **Acceptance Criteria:**
  - Draft approval records approver and approved version. [file:1]
  - Unapproved drafts cannot be sent. [file:1]
  - Lead and draft statuses update consistently. [file:1]
- **Unit Tests:**
  - Approved drafts move to approved state. [file:1]
  - Send attempts before approval are rejected. [file:1]
  - Approved version snapshot is immutable after send. [file:1]
- **Validation:**
  - Attempt send before and after approval to verify gating. [file:1]

### LEAD-504 — Implement send endpoint and event logging
- **Story Points:** 5 [file:1]
- **Description:** Add `POST /api/email-drafts/:id/send` with rate-limited outbound behavior and logging for send timestamp. [file:1]
- **Acceptance Criteria:**
  - Send is only possible for approved drafts. [file:1]
  - Send timestamp is logged. [file:1]
  - Failures are recorded and surfaced without losing approved content. [file:1]
- **Unit Tests:**
  - Successful sends update status and `sentAt`. [file:1]
  - Provider failures are handled gracefully. [file:1]
  - Rate limiting blocks excessive send attempts. [file:1]
- **Validation:**
  - Use a test provider or mocked transport to verify outbound event flow. [file:1]

## Sprint 6: Admin, hardening, and audit

This sprint covers admin, workspace safety, and operational reliability because the PRD requires workspace-based auth and separation, settings for sender identity, prompts, scoring weights, ICP presets, default radii, audit trails for score generation and email approval, retry handling, and geographic validation safeguards. [file:1]

### LEAD-601 — Build settings API and admin UI
- **Story Points:** 5 [file:1]
- **Description:** Implement `GET /api/settings` and `PUT /api/settings` plus UI for sender identity, prompt templates, scoring weights, ICP presets, and default radius configuration. [file:1]
- **Acceptance Criteria:**
  - All settings categories listed in the PRD are editable. [file:1]
  - Saved settings affect subsequent scoring and draft generation. [file:1]
  - Changes are scoped to workspace. [file:1]
- **Unit Tests:**
  - Settings save and reload correctly. [file:1]
  - Invalid scoring weights are rejected. [file:1]
  - Workspace isolation is enforced. [file:1]
- **Validation:**
  - Update default radius and prompt tone settings, then verify downstream behavior changes. [file:1]

### LEAD-602 — Enforce workspace-based auth and tenant isolation
- **Story Points:** 5 [file:1]
- **Description:** Add middleware and data-access controls to ensure strong tenant separation across jobs, leads, drafts, and settings. [file:1]
- **Acceptance Criteria:**
  - All entity access is filtered by workspace. [file:1]
  - Cross-workspace resource access is denied. [file:1]
  - Write actions attribute changes to the current user/workspace context. [file:1]
- **Unit Tests:**
  - Same ID in different workspace cannot be accessed across tenants. [file:1]
  - Auth middleware blocks unauthenticated requests. [file:1]
  - Workspace scoping applies to list and detail endpoints. [file:1]
- **Validation:**
  - Create two workspace fixtures and verify clean separation in API and UI. [file:1]

### LEAD-603 — Add audit trail for scoring, approval, and send actions
- **Story Points:** 5 [file:1]
- **Description:** Record auditable events for score generation, rescore, approval, and sending. [file:1]
- **Acceptance Criteria:**
  - Audit records capture actor, action, entity, timestamp, and before/after snapshots where appropriate. [file:1]
  - Approval and send events are traceable from lead detail or admin inspection. [file:1]
- **Unit Tests:**
  - Each protected action creates an audit record. [file:1]
  - Audit payload shape is consistent. [file:1]
  - Failed actions do not create false success events. [file:1]
- **Validation:**
  - Walk a lead from score to send and verify complete event history. [file:1]

### LEAD-604 — Add reliability safeguards and rejection handling
- **Story Points:** 5 [file:1]
- **Description:** Implement retry handling for failed enrichment jobs, manual override paths for incomplete extraction, rejection reason capture, and geography validation safeguards. [file:1]
- **Acceptance Criteria:**
  - Failed jobs can retry safely. [file:1]
  - Leads can be rejected with structured reason codes. [file:1]
  - Bad or overly broad geographic requests are blocked or constrained. [file:1]
  - Manual override paths exist for incomplete extraction. [file:1]
- **Unit Tests:**
  - Retry logic does not duplicate data. [file:1]
  - Rejection codes persist correctly. [file:1]
  - Geography validation catches malformed or overbroad requests. [file:1]
- **Validation:**
  - Simulate worker failure, weak evidence, and invalid geography to verify safe behavior. [file:1]

## Definition of done

The PRD repeatedly emphasizes evidence-backed enrichment, strong geography handling, explicit approval before sending, tenant separation, and conservative scoring and drafting behavior. Those principles should be treated as cross-cutting implementation rules for every ticket. [file:1]

- Feature implemented behind the correct API or UI boundary. [file:1]
- Unit tests added and passing. [file:1]
- Validation steps completed with sample payloads, fixtures, or manual QA evidence. [file:1]
- No fabricated business facts, geography assumptions, or email claims introduced by implementation. [file:1]
- Workspace scoping respected where applicable. [file:1]

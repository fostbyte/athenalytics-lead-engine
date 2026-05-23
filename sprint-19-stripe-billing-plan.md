# Implementation Plan — Sprint 19: Stripe Subscription Billing Integration & SaaS Monetization Gating

This plan outlines the design, architecture, schemas, API endpoints, and premium glassmorphic UI components needed to integrate **Stripe Subscription Billing** and enforce strict SaaS monetization gates across subscription tiers. 

---

## 🚀 Architectural Design

### 1. Stripe Service & Integration Strategy
To turn this project into a highly marketable paid product, we will implement a dual-mode Stripe service (`src/lib/stripe.ts`):
1. **Live Stripe Mode**: Runs if `STRIPE_SECRET_KEY` is detected in `.env`. Generates actual Stripe Checkout Sessions, manages subscription objects, and supports Customer Billing Portal redirects.
2. **Interactive Developer Simulator Mode**: If no Stripe keys are configured, the system falls back to a premium, high-fidelity local payment simulator. Selecting a plan opens a glassmorphic mock checkout modal where the user can enter simulated details, which triggers a local mock success callback. This allows developers to test the full subscription lifecycle instantly.

### 2. Secure SaaS Gates & Quota Enforcement
- We will modify `src/app/api/settings/route.ts` to enforce that `subscriptionTier` **cannot** be written directly via standard user settings forms (this blocks malicious payload injections). 
- Paid tiers are exclusively assigned through verified Stripe checkout success callbacks or webhook handlers.
- Subscription limits defined in `src/lib/limits.ts` (10 searches/50 leads/50 drafts for Free vs. 50/250/250 for Tier 1, etc.) will lock active workflows. If a user exceeds their tier quota:
  - Form submissions are disabled with clear, glassmorphic upgrade prompts.
  - Background automated scheduler runs skip searches and issue system warnings.

---

## 🛠️ Proposed Changes

### 1. Backend Service Layer

#### [NEW] [stripe.ts](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/lib/stripe.ts)
Creates the core billing gateway utility supporting Stripe operations and the local fallback simulator:
```typescript
import { Settings } from '@prisma/client';
import prisma from './prisma';
import { logAuditEvent } from './audit';

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

export async function createCheckoutSession(workspaceId: string, tier: string, successUrl: string, cancelUrl: string) {
  if (isStripeConfigured()) {
    // Real Stripe Session creation using Stripe Node library...
  }
  
  // Local Simulator Session Token Generator
  const simulatorSessionId = `sim_session_${Math.random().toString(36).substring(7)}`;
  return {
    url: `/api/billing/simulator?session_id=${simulatorSessionId}&tier=${tier}&workspaceId=${workspaceId}&success=${encodeURIComponent(successUrl)}&cancel=${encodeURIComponent(cancelUrl)}`,
    id: simulatorSessionId,
    mode: 'simulator'
  };
}

export async function createBillingPortalSession(workspaceId: string, returnUrl: string) {
  if (isStripeConfigured()) {
    // Real Stripe Portal Session...
  }
  return {
    url: `/api/billing/simulator/portal?workspaceId=${workspaceId}&return=${encodeURIComponent(returnUrl)}`,
    mode: 'simulator'
  };
}
```

---

### 2. API Endpoints Layer

#### [NEW] [/api/billing/checkout/route.ts](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/app/api/billing/checkout/route.ts)
Generates billing redirect URLs based on selected subscription tiers:
- Accepts `tier` (`'TIER_1' | 'TIER_2' | 'UNLIMITED'`).
- Maps current authenticated `workspaceId`.
- Returns checkout redirect link (Stripe URL or Simulator endpoint).

#### [NEW] [/api/billing/portal/route.ts](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/app/api/billing/portal/route.ts)
Allows paid subscribers to manage their current subscriptions:
- Calls `createBillingPortalSession` for active customer records.
- Returns redirect link to customer portal or simulated manager.

#### [NEW] [/api/billing/webhook/route.ts](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/app/api/billing/webhook/route.ts)
Secure Stripe webhook endpoint listening for standard event types:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
Updates database settings `subscriptionTier` field, logs audit events, and triggers workspace notification alerts celebrating upgrades.

---

### 3. Frontend UI Revisions

#### [MODIFY] [page.tsx](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/app/page.tsx)
1. **Interactive Plan Cards Upgrade**:
   - Updates the Settings dashboard's plan cards.
   - Replaces the immediate `onClick={() => setSettings((prev: any) => ({ ...prev, subscriptionTier: tierKey }))}` setter with a checkout sequence triggering `POST /api/billing/checkout`.
   - Incorporates smooth loading spinners with glassmorphic overlays during redirections.
2. **Subscribed HUD Indicators**:
   - Displays a dynamic upgrade action banner on dashboard widgets if search quotas are reached.
   - Adds a "Manage Subscription" action button mapping to the Stripe Customer Portal or simulator dashboard.
3. **Checkout Simulator Dialog**:
   - Implements a stunning, glassmorphic checkout page (`src/app/api/billing/simulator/page.tsx`) rendering a realistic credit card entry widget, complete with micro-animations, glowing gradient borders, and success animations.

---

## 🛡️ SaaS Limit Hardening & Settings Guard

#### [MODIFY] [route.ts](file:///Users/keyganfoster/Documents/aiStuff/Lead%20generator/src/app/api/settings/route.ts)
We will lock down settings updating:
```typescript
// Inside PUT /api/settings:
if (body.subscriptionTier !== undefined) {
  // block direct edits to subscription tier from the user setting panel
  return NextResponse.json(
    { error: 'Subscription tier changes can only be initiated through checkout gateways.' },
    { status: 403 }
  );
}
```

---

## 🔮 Roadmap: Future Sprints for SaaS Launchpad

To maximize marketability and deliver a fully packed premium SaaS web product, we recommend the following subsequent sprints:

### 🌟 Sprint 20 — Advanced Team Sharing & Workspace Roles
- **Goal**: Introduce collaborative tenant workspaces so companies can collaborate on leads.
- **Scope**:
  - Add `members` relation to `User` and `Workspace` tables.
  - Role-based access control (Admin, Member, Viewer) with distinct edit constraints.
  - Invite system with beautiful email templates.

### 🌟 Sprint 21 — Outreach Funnel Conversion Analytics
- **Goal**: Help paid subscribers measure direct conversion rates and client engagement ROI.
- **Scope**:
  - Outbound email open tracking (transparent tracking pixel) and click-through link forwarding.
  - Interactive dashboard diagrams tracking total emails sent, opened, clicked, and conversion percentage.

### 🌟 Sprint 22 — Multi-Channel Discovery Scraper Additions
- **Goal**: Broaden vertical coverage by incorporating supplementary B2B listing integrations.
- **Scope**:
  - Supplemental scraper pipelines (Yelp, yellowpages, and search crawling fallbacks).
  - Search engine data merger to compile contact details even when Google Places data is sparse.

---

## 🧪 Verification Plan

### Automated Tests
- Create `src/lib/stripe.test.ts` to test:
  1. `createCheckoutSession` return structure and simulation logic.
  2. Integration constraints blocking direct settings changes on the subscription tier.
  3. Quota blocking inside limits utilities when counts exceed TIER quotas.
- Verify typescript compilation: `npx tsc --noEmit`.
- Run tests: `npx vitest run`.

### Manual Verification
1. Open settings, view pricing plan cards, and select a paid tier (e.g. Premium Growth).
2. Confirm you are safely redirected to the high-fidelity billing simulator (or Stripe).
3. Complete the mock payment details, watch the glassmorphic card validation and success animations, and click return.
4. Confirm you are welcomed by an in-app celebration alert, and that your Daily Quotas HUD immediately expands to 50 searches / 250 results / 250 drafts!
5. Verify that trying to update settings with a direct manual tier payload returns 403 Forbidden.

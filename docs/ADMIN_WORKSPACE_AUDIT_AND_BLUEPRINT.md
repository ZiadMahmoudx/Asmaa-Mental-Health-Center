# Admin Workspace — Audit & Blueprint

Source-inspected: `admin.actions.ts`, `safety.actions.ts`, `staff.actions.ts`,
`credits.actions.ts`, `payment.actions.ts`, `metrics.actions.ts`,
`reminders.actions.ts`, `booking.actions.ts`, both cron routes, `guards.ts`,
`schema.prisma`, and the seven admin pages.

**One critical defect and one audit-integrity defect. Both are invisible in the
UI, which is why the UX work should not go first.**

---

# SECTION 1 — Defects

## 🔴 A1 (Critical) — A slot in `PAYMENT_UNDER_REVIEW` is held forever

`OCCUPYING_STATUSES` (`lib/domain/enums.ts:50`) includes `PAYMENT_UNDER_REVIEW`,
so an appointment in that state blocks its time slot. **Nothing ever expires it.**

`releaseExpiredHoldsAction` (`booking.actions.ts:1014`, the one the cron calls)
matches only:

```
status: "PENDING_PAYMENT_PROOF", holdExpiresAt: { lt: now }, slotLockKey: ACTIVE_SLOT_LOCK
```

The lifecycle:

1. Patient books ONLINE → `PENDING_PAYMENT_PROOF`, `holdExpiresAt` set. Cron can reclaim it. ✅
2. Patient uploads any file that passes magic-byte sniffing → `PAYMENT_UNDER_REVIEW`.
   `approvePaymentAction:161` sets `holdExpiresAt: null` on approval, and the
   submit path leaves the appointment outside every expiry predicate.
3. If no admin ever reviews it, **the slot is occupied permanently.** No cron, no
   timeout, no alarm.

This does not require malice. A backlog over a weekend, a proof that is neither
approved nor rejected, an admin who opens the item and moves on — each one
silently removes a bookable slot from a doctor's calendar for good. The failure
is invisible: the desk shows a queue, not a leak, and the doctor simply sees
fewer available slots with no explanation.

It is also trivially abusable: a registered patient can upload one valid-format
image per slot and permanently consume a consultant's calendar.

**Fix:**
1. Extend the cron predicate to a second pass over `PAYMENT_UNDER_REVIEW` older
   than a review SLA (48h is a reasonable default — the clinic should confirm),
   moving them to `EXPIRED` with `slotLockKey: appointment.id`, exactly as the
   `PENDING_PAYMENT_PROOF` path does.
2. **Do not auto-reject the payment proof.** Money was possibly transferred.
   Release the *slot* and flag the proof for the desk with a distinct state so
   the patient is contacted, not silently dropped.
3. Surface **age** on the verification desk (see B2) so a stale item is visible
   before the SLA fires.
4. Regression test: an appointment in `PAYMENT_UNDER_REVIEW` past the SLA is
   released and its slot becomes rebookable.

## 🟠 A2 (High) — Resolving a safety alert erases who first acknowledged it

`resolveSafetyAlertAction` (`safety.actions.ts:171–186`):

```
await prisma.safetyAlert.updateMany({
  where: { id: alertId, resolvedAt: null },
  data: {
    resolvedAt: now, resolvedById: admin.id, outcome, resolutionNotes,
    // If never acknowledged before, acknowledge it at the same instant
    acknowledgedAt: now,          // ← unconditional
    acknowledgedById: admin.id,   // ← unconditional
  },
});
```

The comment states the intent — backfill acknowledgement when it was never
acknowledged — but the write is not conditional. The `where` clause scopes only
`resolvedAt: null`.

So when Admin A acknowledges a `CRISIS` alert at 09:00 and Admin B resolves it at
14:00, the record ends up saying **acknowledged by B at 14:00**. The original
first-responder and the real acknowledgement time are overwritten.

`schema.prisma` models `acknowledgedBy` and `resolvedBy` as two distinct
relations precisely so these can be different people at different times. The
index `@@index([acknowledgedAt, createdAt])` exists to support exactly the query
this defect corrupts: **how quickly did we respond to crisis disclosures.**

This is the same family as F18 (credit review attribution), on a more sensitive
queue. If the clinic is ever asked to evidence its crisis response times, the
data will show every alert acknowledged at the moment it was closed — response
time collapses to zero and the record is worthless.

**Fix:** two conditional writes, or one `updateMany` scoped
`where: { id, resolvedAt: null, acknowledgedAt: null }` for the backfill followed
by the resolve write. Never overwrite a non-null `acknowledgedAt`.

**Test:** acknowledge as admin A, resolve as admin B, assert `acknowledgedById`
is still A and `acknowledgedAt` is unchanged.

## 🟡 A3 (Medium) — Two implementations of hold release; the live one is unbounded

There are **two** `releaseExpiredHoldsAction` functions:

| | `booking.actions.ts:1014` (live — cron calls this) | `payment.actions.ts:393` (dead — no importers) |
|---|---|---|
| Batch cap | **none** — unbounded `findMany` | `take: 500` |
| Grace period | none (`lt: now`) | 1 minute (`lt: now − 60s`) |
| Clears `holdExpiresAt` | yes | no |
| `revalidatePath` | no | yes |

The dead copy is the better implementation on two of four axes. Meanwhile the
live one will load every expired hold into memory and issue one `updateMany` per
row — fine today, a long-running cron after any backlog.

Two implementations of the slot-release invariant is how a critical path drifts.
**Fix:** delete the `payment.actions.ts` copy, and port its `take` cap and grace
period into the live one. The grace period matters: it avoids racing a patient
who is mid-upload at the exact expiry second.

## 🟡 A4 (Medium) — Admin lands on the verification desk, not the overview

Confirmed as reported: `guards.ts:70` and `AccountMenu.tsx:64` both hardcode
`/dashboard/admin/verification`.

Worth noting this was probably right when the desk was the only admin surface.
With seven sub-workspaces and a safety queue on the overview, the landing page
should be `/dashboard/admin` — an admin who lands on payments does not see
unacknowledged CRISIS alerts.

**Fix:** change both. They must move together or the navbar and the post-login
redirect disagree.

## 🔵 A5 (Low) — Concurrent mutual deactivation can leave zero admins

`toggleUserActiveStatusAction:487` correctly blocks self-deactivation, and that
holds transitively in sequence: with two admins, A can disable B, and A cannot
then disable itself.

It does not hold under true concurrency — A disabling B while B disables A both
pass the self-check and both succeed, locking everyone out with no recovery path
short of direct database access.

Probability is very low. Recording it because the recovery cost is high.
**Fix if cheap:** inside the update, assert at least one other `ADMIN` with
`isActive: true` remains.

---

## Verified correct — do not "fix" these

- **Approve vs. cron-expiry race is genuinely safe.** The cron matches
  `PENDING_PAYMENT_PROOF`; approval requires `PAYMENT_UNDER_REVIEW`. The
  predicates are disjoint, so they cannot contend. (This is also *why* A1 exists —
  the same disjointness that prevents the race removes the expiry path.)
- Approval is transactional with **conditional** `updateMany` on both the proof
  and the appointment, throwing `P2025` to abort if either changed — correct
  optimistic concurrency.
- ONLINE cannot be approved without a Zoom link (`admin.actions.ts:130`), falling
  back to any link already on the appointment.
- `acknowledgeSafetyAlertAction` is correctly idempotent — scoped
  `acknowledgedAt: null`, and a losing race returns success rather than a
  confusing error.
- `settleCreditAction` runs under `Serializable`, computes the net balance inside
  the transaction, and writes a single `PAID_OUT` row carrying `settlementRef`
  (F7/F8/F16 all still hold).
- `toggleUserActiveStatusAction` revokes all sessions on deactivation and audits
  the change.
- Verification desk orders `uploadedAt: "asc"` — oldest first, correct for a queue.
- The reminder cron uses `[now+22h, now+26h]` as specified
  (`send-reminders/route.ts:27`) and stamps `reminderSentAt`, so manual and
  automated dispatch cannot double-send. Note the *desk* shows a 48-hour horizon
  — a deliberate difference, but it means an admin may manually send a reminder
  the cron would have sent anyway. Worth labelling in the UI (see B5).

---

# SECTION 2 — UX blueprint

Current state: seven sibling routes with no shared navigation. Each page is
reached by URL or by a breadcrumb back to the overview.

```
┌───────────────────────────────────────────────────────────────┐
│ Overview · Verification ③ · Appointments · Credits ② ·        │  ← B1
│ Staff · Schedules · Reminders ⑤            [search] [admin ▾] │
├───────────────────────────────────────────────────────────────┤
│ ⚠ 2 unacknowledged CRISIS alerts · 3 receipts > 24h old       │  ← B2
├───────────────────────────────────────────────────────────────┤
│ (page content)                                                │
└───────────────────────────────────────────────────────────────┘
```

**B1 — Persistent sub-workspace nav with live counters.** One client component in
the admin layout. Counts come from one `getAdminBadgeCountsAction` — a single
grouped query, not seven. Counters must show *actionable* work only:
unacknowledged alerts, `UNDER_REVIEW` proofs, unsettled credits, unsent reminders.

**B2 — An attention bar, and it is where A1 becomes visible.** Surface receipt
age prominently: green < 6h, amber 6–24h, red > 24h. A red row is both an SLA
breach and a slot silently held. This bar is the UI half of the A1 fix.

**B3 — Filter pills + instant search on every table.** Reuse the
`TherapistsDirectory` pattern: URL-synced `searchParams`, counts on every pill,
reset action on the empty state. The appointments ledger already reads
`doctorId`/`status`/`search` from `searchParams` — extend that pattern outward
rather than inventing a second one.

**B4 — Proof inspection as a slide-over, not a page.** Receipt preview with
zoom/rotate, appointment context beside it, approve/reject inline, WhatsApp
trigger. Approving should not lose the reviewer's place in the queue.

**B5 — Reminders clarity.** Label rows the cron will handle automatically
(`22–26h`) distinctly from those needing manual dispatch, so an admin is not
duplicating the scheduler's work.

**B6 — Accessibility, per the pattern now established.** `aria-pressed` on filter
pills, `aria-label` on icon-only buttons, focus management on slide-over open,
`role="alert"` on the attention bar. This is the third workspace to need it —
extract a shared `FilterPill` component rather than reimplementing it a third time.

**Design language:** the teal/sage/alabaster palette now has complete shade
coverage. Admin tables should use `tabular-nums` for money and counts.

---

# SECTION 3 — Implementation plan & verification matrix

| Phase | Items | Tests required | Gate |
|---|---|---|---|
| **1 — Integrity** | A1 slot release + desk age surfacing; A2 acknowledgement preservation | A1: stale `PAYMENT_UNDER_REVIEW` releases and slot rebookable. A2: ack by A, resolve by B, assert A retained | `test:logic`, `tsc`, `build` |
| **2 — Hygiene** | A3 delete dead copy, port `take` + grace period; A4 landing route (both call sites); A5 last-admin assertion | A3: batch cap respected; A4: `dashboardPathForRole("ADMIN") === "/dashboard/admin"` | same |
| **3 — Navigation** | B1 sub-workspace nav, `getAdminBadgeCountsAction`, B2 attention bar | Counts match underlying queries | same |
| **4 — Tables** | B3 filters/search across all six tables, URL-synced | — | same |
| **5 — Polish** | B4 slide-over inspection, B5 reminder labelling, B6 shared `FilterPill` + a11y | — | same |

## Constraints

- Phase 1 changes **behaviour on a money path and a crisis path**. It must ship
  alone, with tests, before any layout work.
- A1's SLA duration is a **clinic decision**, not an engineering one: how long may
  a receipt sit unreviewed before the slot is returned? 48h is a placeholder.
- Phases 3–5 are presentation over existing actions. No action signature, guard,
  transaction or isolation level may change.
- Every new admin read stays `requireRole(["ADMIN"])`; no admin surface may render
  clinical free-text (PHI) — the appointments ledger must show *whether* a SOAP
  note exists, never its contents. The current `hasClinicalRecord` boolean is the
  correct shape; keep it.

**Do not begin Phase 2 until Phase 1 is merged.** A1 is silently removing bookable
slots from doctors' calendars today, and A2 is corrupting the only record of how
fast the clinic responds to suicide-risk disclosures.

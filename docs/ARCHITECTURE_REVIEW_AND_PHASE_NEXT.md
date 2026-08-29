# Architecture Review + Next-Phase Blueprint

Review of the staff-governance / schedule-management implementation, and the
execution plan for the next phase.

**Reviewed at commit:** `fefce79`
**Method:** direct source audit, not a read of the implementation summary.

---

## Part 1 — Audit findings

Verified as correctly implemented (no action needed):

- `resolveTargetDoctor` — a DOCTOR's requested `doctorId` is genuinely ignored rather than trusted; the ADMIN branch requires an explicit target. The seam holds.
- `retireAvailabilityRuleAction` — writes `ruleLockKey: rule.id`, freeing the composite tuple. The G2 lock-out bug is fixed, and the `removeAvailabilityRuleAction` alias keeps the old call site working.
- `booking.actions.ts` availability-exception query — `cancelledAt: null` was added. Cancelled leave correctly stops blocking slots. (This was the trap most likely to be missed.)
- Reschedule — moves the row in place rather than cancel-and-recreate, preserves `priceEGP`, catches `P2002` and maps it to `SLOT_TAKEN`, and records `rescheduledFromUTC`.
- Staff actions — all guarded by `requireRole(["ADMIN"])`, roles hard-coded at the write (`role: "DOCTOR"` / `"ADMIN"`, never taken from input), `passwordSchema` enforced, `P2002` handled, self-deactivation blocked, `revokeAllSessions` on both deactivate and password reset.
- `darkMode: "class"` is set in `tailwind.config.ts`.

---

### 🔴 F1 — `CRON_SECRET` ships with a committed default value

**Severity: high. Fix before any deployment.**

`lib/env.ts:37`

```
CRON_SECRET: z.string().min(16).default("dev-cron-secret-change-in-production-min32chars"),
```

The default means that if `CRON_SECRET` is not set in the production
environment, `/api/cron/release-holds` is protected by a string that is in the
repository and in git history. Anyone who can read the repo — a contractor, a
future open-sourcing, a leaked clone — can call the endpoint and release every
outstanding payment hold, destroying reservations patients are mid-way through
paying for.

The failure is silent: the app boots normally and the endpoint appears
protected.

Compare `SESSION_SECRET` in the same file, which correctly has **no default** and
fails fast at boot. `CRON_SECRET` must behave identically.

**Fix**

1. `lib/env.ts` — remove `.default(...)` entirely and raise the floor to `.min(32)`. It becomes a required variable; a missing value now crashes at boot with the existing bilingual env error, which is the desired behaviour.
2. `.env.example` — add the key (it is currently absent, so nobody deploying from the template knows it exists):
   ```
   # Shared secret for the scheduled hold-release endpoint. Required.
   # node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   CRON_SECRET=""
   ```
3. `app/api/cron/release-holds/route.ts` — the `!env.CRON_SECRET` guard becomes unreachable once the variable is required. Leave it (harmless defence in depth) or drop it; do not rely on it.
4. Rotate the value if this ever reached a shared environment.

---

### 🔴 F2 — Admin off-grid reschedule removes all overlap protection

**Severity: high. This can double-book a doctor.**

`app/actions/doctor.actions.ts`, in `rescheduleAppointmentAction`:

```
if (!allowOffGrid || guard.data.user.role !== "ADMIN") {
  … generateSlots + isSlotOffered …
}
```

The branch logic itself is correct (only an ADMIN with `allowOffGrid` skips it).
The problem is what skipping it removes.

The platform's double-booking guarantee is the database index
`@@unique([doctorId, scheduledAtUTC, slotLockKey])`. That index catches a
collision on an **exact identical instant** and nothing else. It is sufficient
*only because* every bookable time is generated on a fixed slot grid, so two
appointments for one doctor either share a start instant or do not overlap at
all. This is stated explicitly in `docs/BACKEND.md` §3.1.

Off-grid booking breaks that premise. An admin rescheduling a 45-minute session
to **18:20** when the doctor already has **18:00–18:45** produces two
overlapping appointments with different `scheduledAtUTC` values. The unique
index does not fire. Nothing else checks. The doctor is double-booked and
neither patient is told.

**Fix**

In the off-grid branch, add an explicit interval-overlap check before the write:

- Query appointments for `appointment.doctorId`, `id: { not: appointmentId }`, `status: { in: [...OCCUPYING_STATUSES] }`, and `scheduledAtUTC` within ±4 hours of the target.
- For each, compute `[start, start + durationMinutes)` and test against the proposed `[targetInstant, targetInstant + durationMinutes)` using the same half-open logic as `intervalsOverlap` in `lib/slots.ts` — import and reuse it rather than reimplementing.
- On overlap: `failure("CONFLICT", "الموعد الجديد يتداخل مع جلسة أخرى لنفس الطبيب.", "The new time overlaps another session for this doctor.")`, and return the conflicting appointment's Cairo time in the message so the operator can see what they hit.
- Only if the admin then passes a second explicit flag (`allowOverlap: "true"`) should the write proceed; record `overlapForced: true` in the audit metadata.

**Document the residual race.** Unlike the on-grid path, this check is
application-level and therefore has a genuine time-of-check/time-of-use window.
For an admin-only, low-frequency manual override this is acceptable, but it must
be written down next to the code so nobody later assumes the same database
guarantee applies here. Add a comment saying exactly that. If the clinic wants
it airtight, wrap the check and the update in
`prisma.$transaction(..., { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`.

---

### 🟠 F3 — Reschedule message loses the clinic room number

**Severity: medium. Patient-facing correctness.**

In `rescheduleAppointmentAction` the appointment query selects
`doctor: { select: { id: true, userId: true, user: { select: { fullName: true } } } }`
— no `roomNumber` — and the WhatsApp builder is then called with a hard-coded
`roomNumber: null`.

For an **OFFLINE** appointment, the patient's original confirmation carried
"غرفة 3A" and the reschedule message will not. A patient arriving for an
in-person session is sent a new time with no room, which is precisely the
message where the location matters most.

**Fix:** add `roomNumber: true` to the doctor select and pass
`appointment.doctor.roomNumber` through. Verify the same field is populated in
`doctorCancelAppointmentAction` and `forceTimeOffAction` message builders.

---

### 🟡 F4 — `reminderSentAt` is dead schema

`Appointment.reminderSentAt` exists in `prisma/schema.prisma` and is never
written or read anywhere in the codebase. It was added in anticipation of a
reminder pipeline that was never built.

Either build the pipeline (it is Phase 3 of the plan below, and the cron
infrastructure now exists) or drop the column. Dead columns become load-bearing
by accident.

---

### 🟡 F5 — `await getClinicConfig()`

`getClinicConfig()` in `lib/clinic-config.ts` is synchronous and returns
`ClinicConfig`, not a promise. Awaiting a non-promise is legal and harmless, but
it signals the function is expected to do I/O. Drop the `await` at the call sites
in `doctor.actions.ts` so nobody later adds a database read to it on the
assumption it is already async.

---

### 🟡 F6 — Rescheduling an appointment that is under payment review

Reschedule permits `PAYMENT_UNDER_REVIEW`. The Admin Verification Desk renders
each receipt beside the appointment's scheduled time, so a reschedule while a
receipt sits in the queue changes the time under the reviewer's cursor.

Not dangerous — `approvePaymentAction` re-reads the appointment inside its
transaction, so the approval stays consistent — but the reviewer can approve a
receipt for a session at a time they never saw.

**Fix:** cheap. In `getPendingPaymentsAction`, include `rescheduledAt` and show a
"تمت إعادة الجدولة" chip on rows where it is set, so the desk knows the time
moved.

---

## Part 2 — Next phase: Financial integrity & patient lifecycle

### Why this, and not the patient portal or a payment gateway

The staff-governance phase just gave the clinic the ability to cancel **paid**
appointments at scale — `forceTimeOffAction` cancels every conflicting
appointment in an interval, and `doctorCancelAppointmentAction` cancels
individually. Both correctly free the slot and notify the patient.

Neither records that the clinic now owes that patient money.

A `CONFIRMED` appointment means an InstaPay or Vodafone Cash transfer was
received and approved by a human. When it is cancelled, the money is real and
sitting in the clinic's account, and the only trace is an `AuditLog` row and a
`cancellationReason` string. There is no queryable answer to *"who are we
currently in debt to, and for how much?"* — which is the first question the
clinic will be asked, and the first thing that will be got wrong.

`docs/BACKEND.md` §8 already lists refunds as out of Phase 1. That was defensible
when only the patient could cancel their own unpaid hold. It is not defensible now
that staff can mass-cancel paid sessions.

**This phase closes that hole, then adds the two patient-facing capabilities that
depend on it.**

---

### Phase 0 — Fix F1 and F2 first

Non-negotiable, and small. F1 is a config change plus a doc line. F2 is roughly
thirty lines in one function. Neither should wait behind feature work, and both
are in code the next phase touches.

---

### Phase 1 — Patient credit ledger

The model is a **credit ledger**, not a refund processor. The clinic settles
money manually over InstaPay; the platform's job is to know the balance, show it,
and let it be spent or marked as paid out. Do not build a payments integration.

#### 1.1 Schema — `prisma/schema.prisma`

New model `PatientCredit`. Honour the portability constraints: no enums
(`lib/domain/enums.ts` union + `String` column), ids `@db.VarChar(30)`,
relations `NoAction` on both sides (`User` already reaches several tables twice).

Fields:

| Field | Notes |
|---|---|
| `id`, `patientId` | standard |
| `appointmentId` | nullable — the cancelled session that created the credit; null for a manual adjustment |
| `amountEGP` | `Decimal @db.Decimal(10,2)`. **Signed**: positive issues credit, negative consumes it. |
| `kind` | `String @db.VarChar(30)` → `CANCELLATION` \| `MANUAL_ADJUSTMENT` \| `APPLIED_TO_BOOKING` \| `PAID_OUT` |
| `reason` | `String? @db.VarChar(500)` |
| `issuedById` | admin/doctor who caused it; null for system |
| `settledAt`, `settledById`, `settlementRef` | set when the clinic actually transfers the money back |
| `createdAt` | |

Indexes: `[patientId, createdAt]`, `[kind, settledAt]`, `[appointmentId]`,
`[issuedById]`, `[settledById]`.

**Design decision to preserve:** the balance is a `SUM(amountEGP)` over the
ledger, never a mutable `balance` column on `User`. A stored balance and a ledger
will disagree eventually, and when they do the ledger is right — so only keep the
ledger. Expose `getPatientCreditBalanceAction` which aggregates.

⚠️ Use `Decimal`, never `Float`. Money in binary floating point drifts.

#### 1.2 Issue credit automatically on staff-initiated cancellation

Three call sites must issue a credit **inside their existing `$transaction`**, so
a cancellation can never commit without its credit row:

- `doctorCancelAppointmentAction`
- `adminCancelAppointmentAction` (`app/actions/admin.actions.ts`)
- `forceTimeOffAction` — one credit per cancelled appointment

Rule: issue a credit **only when the appointment was `CONFIRMED`** (money
actually changed hands). `PENDING_PAYMENT_PROOF` and `PAYMENT_UNDER_REVIEW`
cancellations issue nothing — for `PAYMENT_UNDER_REVIEW` the receipt was never
approved, so the clinic may not hold the money at all; that case needs the desk
to reject the proof, which already exists.

Amount = the appointment's frozen `priceEGP`. Do not recompute.

**Patient-initiated** cancellation (`cancelMyAppointmentAction`) is a separate
policy question — a patient cancelling 13 hours out may or may not be owed a
refund under clinic policy. Do **not** guess. Issue no credit, and add a
`TODO(policy)` comment naming the decision the clinic owes you. Surface it in the
handover.

#### 1.3 Actions — new file `app/actions/credits.actions.ts`

- `getPatientCreditBalanceAction(patientId?)` — patient sees own; ADMIN may pass a target. Returns `{ balanceEGP, entries }`.
- `getOutstandingCreditsAction()` — ADMIN. The debt report: patients with a positive balance, oldest first, with running totals. This is the query that answers the clinic's real question.
- `issueManualCreditAction` — ADMIN, `kind: MANUAL_ADJUSTMENT`, requires a reason ≥ 5 chars.
- `settleCreditAction` — ADMIN. Marks entries paid out: sets `settledAt`, `settledById`, `settlementRef` (the InstaPay transaction id), and writes a balancing `PAID_OUT` row. Guard against double-settlement with a conditional `updateMany` on `settledAt: null` and a `count === 0` → `CONFLICT`.

Audit actions to add: `CREDIT_ISSUED`, `CREDIT_SETTLED`, `CREDIT_ADJUSTED`.
Metadata carries amounts and ids only — no reason free-text.

#### 1.4 Applying credit to a new booking

In `reserveSlotAction` (`app/actions/booking.actions.ts`), after the appointment
row is created: if the patient's balance ≥ the session price, offer to apply it.

**Do not silently auto-apply.** Requires an explicit `applyCredit=true` field from
the booking form. Inside a transaction: write a negative `APPLIED_TO_BOOKING`
entry and move the appointment straight to `CONFIRMED`, bypassing the payment
proof step entirely — the money is already with the clinic.

⚠️ **Trap:** an `ONLINE` appointment reaching `CONFIRMED` this way still needs a
Zoom link, and `approvePaymentAction` — the only place a link is currently
attached — is never called on this path. Either route credit-covered online
bookings to `PAYMENT_UNDER_REVIEW` with a zero-amount auto-approved proof so the
desk still attaches the link, or require the link before confirming. Decide
explicitly; do not let a patient reach `CONFIRMED` with no way to join.

Partial credit (balance < price) is out of scope for this phase — it needs a
part-payment flow. Reject with a clear message.

#### 1.5 UI

- **Patient portal** (`app/dashboard/patient/page.tsx`) — a credit balance card above appointments, only when the balance is non-zero, with the ledger behind a disclosure. Copy must say what it is in plain Arabic: رصيد لك لدى المركز، يمكن استخدامه في حجز قادم أو استرداده.
- **Admin** — new route `/dashboard/admin/credits`: the outstanding-debt table, per-patient drill-down, settle form with a required transaction reference, manual adjustment behind a confirm.
- Booking flow — a "استخدم رصيدك" toggle in `BookingFlow.tsx` when the balance covers the price.

---

### Phase 2 — Patient self-service reschedule

Cheap now that `rescheduleAppointmentAction` exists, and it removes the most
common reason a patient contacts the clinic.

New `patientRescheduleAppointmentAction` in `booking.actions.ts` — a separate
action, not a role widened on the existing one, because the policy differs:

- `requireRole(["PATIENT"])`, ownership checked on the row.
- Only `CONFIRMED`, and only when `scheduledAtUTC > now + 24h` (stricter than the staff path and than the existing 12-hour cancellation window — moving a session is more disruptive than cancelling one).
- **Never** `allowOffGrid`. Patients get published slots only.
- Same doctor only. Changing doctor is a cancel-and-rebook, because the price and the clinical relationship both change.
- Cap at **one** patient-initiated reschedule per appointment: check `rescheduledById` is null, or that no prior reschedule was patient-initiated. Add `patientRescheduleCount Int @default(0)` if you want to allow N.
- Reuses the grid validation and the `P2002` → `SLOT_TAKEN` mapping.

UI: a "تغيير الموعد" button on the patient's appointment card opening the existing
slot picker from `BookingFlow`, scoped to that doctor and type. Reuse
`getAvailableSlotsAction`; do not write a second calendar.

---

### Phase 3 — Session reminder pipeline

Closes F4 and uses the cron endpoint just built.

New route `app/api/cron/send-reminders/route.ts`, same `CRON_SECRET` bearer
pattern (post-F1 fix).

Query: `status: "CONFIRMED"`, `reminderSentAt: null`, and `scheduledAtUTC`
between `now + 22h` and `now + 26h` — a window, not an exact time, so a cron run
that is late or skipped does not silently drop a day's reminders.

For each, build the message with the existing `sessionReminderMessage` in
`lib/whatsapp.ts` and set `reminderSentAt`. Use a conditional
`updateMany({ where: { id, reminderSentAt: null } })` and only enqueue when
`count === 1`, so two overlapping cron runs cannot double-send.

**The honest constraint:** nothing sends the message. The clinic is on click-to-chat
`wa.me` links, and this endpoint cannot open WhatsApp on someone's behalf. So this
phase delivers a **reminder queue**, not automated delivery: a
`/dashboard/admin/reminders` screen listing the sessions due a reminder, each with
its pre-built link, and a "sent" action that stamps `reminderSentAt`. That is a
real operational improvement over the current state (nothing) and is honest about
what it does.

Automated delivery requires the WhatsApp Business API with approved message
templates — a procurement and compliance task, not an engineering one. Flag it to
the clinic as a decision, with the note that appointment reminders are exactly
the category WhatsApp approves templates for.

---

### Suggested order

| # | Work | Rationale |
|---|---|---|
| 0 | F1, F2 | Security. Small, and in code Phase 1 edits. |
| 1 | F3, F5, F6 | Trivial, same files. |
| 2 | Phase 1.1–1.3 (ledger + auto-issue + actions) | Closes the money hole opened by the last phase. |
| 3 | Phase 1.5 UI | Makes the ledger usable. |
| 4 | Phase 2 (patient reschedule) | Independent; can run in parallel by a second engineer. |
| 5 | Phase 1.4 (apply credit to booking) | Depends on 2 and 4; resolve the Zoom-link trap first. |
| 6 | Phase 3 (reminder queue) | Independent. |
| 7 | F4 resolution — keep `reminderSentAt` (now used) | Falls out of 6. |

### Gates

```
npm run typecheck
npm run test:logic
npm run build
npm run db:use:postgres && npx prisma validate && npm run db:use:sqlserver && npx prisma validate
```

New tests to add to `tests/logic.test.ts`: signed-ledger balance arithmetic with
`Decimal` inputs; the 24-hour patient reschedule cutoff at boundary values; the
reminder window boundaries (21h59m and 26h01m must be excluded).

### Decisions the clinic owes you before Phase 1 ships

1. Is a **patient-initiated** cancellation refundable, and inside what notice window?
2. Do credits **expire**? If so, after how long, and is expiry itself a ledger entry?
3. For a credit-covered online booking, who attaches the Zoom link (see the §1.4 trap)?

Do not invent answers to these. Ship the ledger with staff-initiated credits
only, and leave the patient-cancellation path issuing nothing until the policy
exists.

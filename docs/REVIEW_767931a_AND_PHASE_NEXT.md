# Architecture Review — `fefce79` → `767931a`, and the next phase

Audited by reading source, not the implementation summary.

---

## Part 1 — Verified correct

Confirmed by inspection, no action needed:

- **F1 fixed properly.** `CRON_SECRET` now has no default and requires `.min(32)`; `.env.example:57` carries the placeholder. It fails fast at boot, matching `SESSION_SECRET`.
- **F2 fixed properly.** `intervalsOverlap` is imported from `lib/slots.ts` (reused, not reimplemented) and applied at `doctor.actions.ts:1050`; overlap blocks unless `allowOverlap === "true"`, and `overlapForced` is carried into the audit metadata.
- **F3, F5, F6** — `roomNumber` is queried and threaded through; the stray `await` is gone; the reschedule badge is wired into the desk.
- **Credit auto-issuance is genuinely atomic.** `tx.patientCredit.create` sits inside the same `$transaction` as the status change at all three call sites (`doctor.actions.ts:850`, `:1206`, `admin.actions.ts:575`). A cancellation cannot commit without its credit row. This was the single most important thing to get right and it is right.
- **Reminder idempotency is correct.** The cron does a conditional `updateMany({ where: { id, reminderSentAt: null } })` and only enqueues on `count === 1`, so two overlapping runs cannot double-send.
- **Credit balance authorisation is correct.** `effectivePatientId = user.role === "PATIENT" ? user.id : targetPatientId` — a patient's own id always wins and the passed target is ignored for them, mirroring the `resolveTargetDoctor` pattern. A DOCTOR is denied outright.
- **Patient reschedule** correctly checks ownership on the row, restricts to `CONFIRMED`, enforces the 24-hour window, and stays on-grid.

---

## Part 2 — Findings

### 🔴 F7 — `settleCreditAction` can record a double payout

**Severity: high. Financial correctness.**

`app/actions/credits.actions.ts:265`

The transaction does, in order:

1. read all unsettled positive rows,
2. read **all** rows and sum them into `currentBalance`,
3. `payableAmount = currentBalance`,
4. `updateMany` marking unsettled positive rows as settled,
5. **unconditionally** `create` a `PAID_OUT` row for `-payableAmount`.

Step 5 is not guarded by the outcome of step 4. Two admins clicking *settle* on
the same patient at the same time both read `currentBalance = 850`. The second
transaction's `updateMany` blocks on the first's row locks, then matches **zero**
rows once the first commits — but it has already captured `payableAmount = 850`
from its earlier read, and the `create` runs regardless.

Result: two `PAID_OUT` rows of −850. The ledger now says the clinic paid the
patient twice and the balance reads −850. Since `settlementRef` is the InstaPay
transaction id, the books show one reference against money that was sent once.

Prisma's `$transaction` runs at the database default isolation (READ COMMITTED on
SQL Server), which does not prevent this — the second read is legitimate at the
time it happens.

**Fix — three changes, all required:**

1. **Reorder so the write decides.** Perform the `updateMany` *first*, and abort when it affects nothing:
   ```
   const marked = await tx.patientCredit.updateMany({ where: { patientId, settledAt: null, amountEGP: { gt: 0 } }, data: {...} });
   if (marked.count === 0) throw new Error("NOTHING_TO_SETTLE");
   ```
   Map that to a `CONFLICT` result — *"لا يوجد رصيد مستحق للتسوية. يرجى تحديث الصفحة."*
2. **Add a unique constraint on `settlementRef`** in `prisma/schema.prisma`. It is currently `String? @db.NVarChar(100)` with no constraint (`:495`). A real InstaPay reference is unique by definition, so the database should enforce it. A duplicate submit then fails with `P2002` → map to `CONFLICT`. This is the same "let the database be the guarantee" principle the booking flow already relies on.
   ⚠️ It must be a *partial/filtered* uniqueness or applied only to non-null values — many rows legitimately have `settlementRef = NULL`. On SQL Server this needs a filtered unique index (`WHERE settlementRef IS NOT NULL`), which Prisma cannot express natively; add it via a raw migration step and document why.
3. **Raise the isolation level** for this specific transaction:
   `prisma.$transaction(async (tx) => {...}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`.
   Money settlement is exactly the case that justifies the cost.

Add a logic test: two concurrent settle calls against the same patient must
produce exactly one `PAID_OUT` row.

---

### 🟠 F8 — Settlement marks rows as paid that were not fully paid

**Severity: medium. Audit-trail truthfulness.**

The payout amount is the **net** balance, but step 4 stamps `settledAt` and
`settlementRef` onto **every unsettled positive row**.

Once `APPLIED_TO_BOOKING` exists (F11), a patient can hold `+850` (cancellation)
and `−300` (spent on a booking). Net owed = 550. The clinic transfers 550 — and
the ledger marks the `+850` row as settled under a reference that only moved 550.
Anyone reconciling InstaPay statements against the ledger will find an 850 row
claiming a 550 transaction.

**Fix:** stop using per-row `settledAt` as the settlement mechanism. The
`PAID_OUT` row *is* the settlement event — it alone should carry `settledAt`,
`settledById` and `settlementRef`. Keep the per-row fields for the manual
adjustment case only, or drop them from positive rows entirely and derive
"settled up to" from the payout history.

If per-row marking is retained for reporting convenience, then the amount paid
must equal the sum of the rows actually marked, and negatives must be settled in
the same batch — otherwise the two numbers will keep diverging.

---

### 🟠 F9 — `getOutstandingCreditsAction` loads the entire ledger into memory

**Severity: medium. Scales into an outage.**

`credits.actions.ts:114`

```
const allCredits = await prisma.patientCredit.findMany({
  orderBy: { createdAt: "asc" },
  include: { patient: { select: {...} } },
});
```

No `where`, no `take`. Every credit row the clinic has ever written, each with a
joined `User`, pulled into Node on every load of `/dashboard/admin/credits`, then
aggregated with a `Map`. This is the same unbounded-`findMany` pattern that was
explicitly guarded against for the appointments console.

It will be fine for months and then it will not be, and the failure mode is the
admin dashboard timing out at precisely the moment the clinic is trying to
reconcile money.

**Fix:** aggregate in the database.

```
prisma.patientCredit.groupBy({
  by: ["patientId"],
  _sum: { amountEGP: true },
  _max: { createdAt: true },
  _count: true,
  having: { amountEGP: { _sum: { gt: 0 } } },
})
```

then a single `findMany` over just the returned `patientId`s for names and
phones. The `having` clause also removes the need to filter zero balances in JS.
Add `take`/pagination on top for the same reason the appointments console has it.

---

### 🟡 F10 — The patient one-reschedule cap is bypassable

**Severity: low, but it is the fragility predicted in the last blueprint.**

`booking.actions.ts` guards with:

```
if (appointment.rescheduledById === user.id) { … already rescheduled … }
```

`rescheduledById` holds only the **most recent** rescheduler. So:

1. Patient reschedules → `rescheduledById = patient`.
2. Patient asks the clinic to move it → an admin reschedules → `rescheduledById = admin`.
3. The patient's cap is now clear again. Repeat indefinitely.

The interleaving is not adversarial — it is what happens naturally when a patient
calls reception. There is also no cap at all if an admin ever touches the
appointment first.

**Fix:** the counter from the original blueprint. Add
`patientRescheduleCount Int @default(0)` to `Appointment`, increment it inside
the patient action only, and gate on `>= 1`. `rescheduledById` stays as the
"who touched it last" audit field it already is.

---

### 🟡 F11 — `APPLIED_TO_BOOKING` is a dead enum value

Grepping `app/actions/` for `APPLIED_TO_BOOKING` returns nothing. The value
exists in `lib/domain/enums.ts` and in the schema comment, but no code path
applies credit to a booking.

This is legitimately pending — it was step 5 in the previous ordering, after
patient reschedule — so it is a gap, not a defect. Flagging it because the
current state is asymmetric in a way that matters operationally: **a patient can
accrue credit and can never spend it.** Every credit must be settled by hand over
InstaPay, which is the workflow the ledger was supposed to reduce.

The unresolved trap from the previous blueprint still stands and must be decided
before this is built: a credit-covered **ONLINE** booking that jumps straight to
`CONFIRMED` bypasses `approvePaymentAction`, which is the only place a Zoom link
is ever attached. A patient would reach "confirmed" with no way to join.

---

### 🔵 F12 — Policy question, not a bug

Patient reschedule requires the **existing** appointment to be ≥ 24h away, but
the **target** only needs to clear `bookingPolicy.minNoticeMinutes` (2h). A
patient can move a session that is three days out to one starting in two hours.

That is consistent with the rule for new bookings, so it is defensible. But a
same-day arrival the clinic did not plan for is an operational event, especially
for `OFFLINE` visits where a room must be free. Confirm with the clinic whether
patient-initiated moves should carry a longer floor (e.g. 12h) than new bookings.

---

## Part 3 — Next phase: close the loop on credit, then harden for launch

### Ordering

| # | Work | Why here |
|---|---|---|
| 0 | **F7** (settle race), **F9** (groupBy) | Financial correctness and the one query that degrades into an outage. Both small. |
| 1 | **F8** (settlement semantics) | Decide the model before more rows accumulate under the wrong one. |
| 2 | **F10** (`patientRescheduleCount`) | Schema field + two lines; do it while touching `Appointment`. |
| 3 | **F11 / Phase 1.4** — apply credit to a booking | The ledger's missing half. |
| 4 | Launch hardening (below) | Everything else is done; this is what stands between the build and real patients. |

---

### Phase 4.1 — Apply credit to a booking (closes F11)

Resolve the Zoom trap first. Recommended answer, in preference order:

**Option A (recommended).** A credit-covered booking enters
`PAYMENT_UNDER_REVIEW` with a system-generated `PaymentProof` of
`method: "CREDIT"`, `amountClaimedEGP` = price, auto-marked `APPROVED` by the
system actor. It then flows through the *existing* desk path, so the admin still
attaches the Zoom link exactly as they do today. One new `PaymentMethod` value,
zero new confirmation paths, and the desk's existing "attach link before
approving" guard keeps working.

**Option B.** Require the Zoom link at booking time for credit-covered online
sessions — rejected: patients do not have Zoom links.

**Option C.** Confirm immediately and let the doctor attach the link later via
`assignMeetingLinkAction` — workable, but it lets a patient sit in `CONFIRMED`
with no join link and no forcing function. Only acceptable with an admin alert.

Implementation notes for Option A:
- `reserveSlotAction` takes `applyCredit` (explicit, never defaulted).
- Inside one transaction: re-read the balance **with `Serializable` isolation or a conditional write**, create the negative `APPLIED_TO_BOOKING` entry, create the auto-approved proof, set the appointment status.
- ⚠️ Balance must be re-checked inside the transaction, not from a value the client sent or a prior read — otherwise a patient double-clicking books two sessions on one credit. Same class of bug as F7.
- Partial credit (balance < price) stays out of scope; reject with a clear message.

---

### Phase 4.2 — Launch hardening

The feature set is now complete enough for the clinic. What is missing is
everything that is not a feature. In priority order:

**1. Rate limiting is per-process and in-memory.**
`lib/security/rate-limit.ts` holds buckets in a `Map`. It is documented as a
single-instance solution. Confirm the production deployment is genuinely one Node
process; if it is behind any load balancer or scales to two instances, login
throttling silently becomes N× weaker. Either pin to one instance for launch and
document it, or swap the `Map` for Redis `INCR`/`EXPIRE` (the exported API does
not change).

**2. Receipt storage on an ephemeral filesystem.**
Receipts are written to `UPLOAD_DIR` on local disk. On a container that is
rebuilt or a serverless host, every payment receipt the clinic holds as financial
evidence disappears. This is a deployment decision, not code: mount a persistent
volume, or move `storeReceipt`/`readReceipt`/`deleteReceipt` in `lib/uploads.ts`
to object storage. Three functions, nothing else changes.

**3. Backups and restore rehearsal.**
The database now holds clinical records, safety plans, screening scores and a
money ledger. Confirm SQL Server backups are scheduled **and** that a restore has
actually been performed once. An untested backup is a belief, not a backup.

**4. Real values in `.env`.**
`CLINIC_INSTAPAY_HANDLE`, `CLINIC_VODAFONE_CASH_NUMBERS`, `CLINIC_WHATSAPP_NUMBER`,
`CLINIC_ADDRESS_AR`, `CLINIC_MAPS_URL` still carry placeholders and appear
**verbatim in patient WhatsApp messages**. A launch with the sample InstaPay
handle sends patients' money to a handle that does not exist.

**5. `sa` / `admin` credentials.**
The application connects as `sa`. Create a dedicated SQL login scoped to
`asmaa_clinic` only, with a strong password, and set `encrypt=true` without
`trustServerCertificate` once a proper certificate is in place.

**6. Seed passwords.**
`prisma/seed.ts` refuses its development fallbacks when `NODE_ENV=production`,
which is correct. Verify the production seed actually runs with
`SEED_ADMIN_PASSWORD` etc. set, and that the demo patient block is skipped.

**7. An operational runbook.**
One page: how to add a consultant, what to do when a receipt is disputed, who
settles credits and how, what the cron endpoints are and how to confirm they ran.
The clinic's staff, not engineers, will operate this daily.

---

### Suggested tests to add

- Two concurrent `settleCreditAction` calls → exactly one `PAID_OUT` row (F7).
- Signed ledger arithmetic where positives and negatives interleave, asserting the payout equals the net and the marked rows equal what was paid (F8).
- `patientRescheduleCount` gate: patient → admin → patient must be refused on the second patient attempt (F10).
- Credit application: balance exactly equal to price succeeds; balance one piastre short is refused; double-submit consumes the credit once (F11).

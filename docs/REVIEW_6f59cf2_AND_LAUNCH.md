# Architecture Review — commit `6f59cf2`, and the launch phase

Audited by reading source.

---

## Part 1 — Verified fixed

- **F7 (double payout) — core is fixed.** `settleCreditAction` now runs under `Prisma.TransactionIsolationLevel.Serializable`, re-reads the net balance inside the transaction, and aborts on `currentBalance.lte(0)`. Under SQL Server's Serializable range locks, the second concurrent settle re-reads a zero balance and aborts. The double `PAID_OUT` is closed.
- **Deadlock handling is adequate.** The generic `catch` maps anything unrecognised to `CONFLICT` with a retry message, so a SQL Server 1205 deadlock victim surfaces sensibly rather than as a 500.
- **F9 — fixed correctly.** `getOutstandingCreditsAction` now uses `groupBy` with `having: { amountEGP: { _sum: { gt: 0 } } }` and hydrates patients with a single targeted `findMany`. The unbounded table scan is gone.
- **F10 — fixed correctly.** `patientRescheduleCount Int @default(0)` on `Appointment`, gated at `< 1`, incremented atomically. Admin reschedules no longer reset the patient's quota.
- **Credit application balance check is sound.** `reserveSlotAction`'s `applyCredit` branch re-reads the balance *inside* a Serializable transaction and throws `INSUFFICIENT_CREDIT` — a double-submit cannot spend the same credit twice.
- **The desk already special-cases credit proofs** (`PaymentVerificationDesk.tsx:514` branches on `row.method === "CREDIT"`), so the `receiptImageUrl: "SYSTEM_CREDIT"` placeholder is never requested as an image. Good catch on Agy's part — that would otherwise 404 on every render.

---

## Part 2 — Findings

### 🔴 F13 — Credit-covered ONLINE bookings are permanently stranded

**Severity: critical. The patient loses money and gets nothing. Fix before this path is enabled for anyone.**

In `reserveSlotAction`'s credit branch:

```
status: type === "ONLINE" ? "PAYMENT_UNDER_REVIEW" : "CONFIRMED",
...
await tx.paymentProof.create({ data: { ..., method: "CREDIT", status: "APPROVED" } });
```

The appointment is parked in `PAYMENT_UNDER_REVIEW` so the desk can attach the
Zoom link — which was the right intent. But the proof is created as `APPROVED`,
and the desk only ever sees `UNDER_REVIEW`:

- `getPendingPaymentsAction` — `where: { status: "UNDER_REVIEW" }`. The credit proof **never enters the queue.**
- `approvePaymentAction` — refuses at `admin.actions.ts:110` when `proof.status !== "UNDER_REVIEW"`, and its inner `updateMany` filters on the same (`:144`). Even if an admin found the row, approval is impossible.

**Consequences, all committed to the database:**

1. The ledger deduction commits — the patient's credit is spent.
2. The appointment sits in `PAYMENT_UNDER_REVIEW` with **no path to `CONFIRMED`**. No Zoom link is ever attached.
3. `PAYMENT_UNDER_REVIEW` is in `OCCUPYING_STATUSES` and `holdExpiresAt` is explicitly `null`, so the slot is occupied forever. It is never released by the hold-expiry cron and never reclaimed by another booking. **The doctor's slot is permanently consumed by a ghost appointment.**
4. The dedicated CREDIT badge in `PaymentVerificationDesk.tsx:514` is unreachable code — it renders for a row that never arrives.

**Fix — one line.** Create the proof with the status that matches the appointment:

```
status: type === "ONLINE" ? "UNDER_REVIEW" : "APPROVED",
```

For `ONLINE`, the proof then enters the desk queue, the existing CREDIT branch
renders the badge, `approvePaymentAction` enforces its existing "attach a Zoom
link before approving" rule, and the appointment reaches `CONFIRMED` through the
path that already works. For `OFFLINE`, nothing changes — `APPROVED` + `CONFIRMED`
is correct, and it should not appear in the queue.

Reword the badge accordingly: it is not "auto-approved", it is **"مدفوع من الرصيد
— لا يوجد إيصال للمراجعة، يلزم إرفاق رابط زووم فقط"**. That is what Option A
meant in the blueprint, and it is what makes the trap actually resolved rather
than relocated.

**Also fix:** the `OFFLINE` auto-approved proof is written with `reviewedById`
and `reviewedAt` null, so the decision log shows an approved receipt with no
reviewer. Either stamp the acting patient's id with a `kind` marker, or have the
history view render "النظام (رصيد)" when `method === "CREDIT"` and
`reviewedById` is null. Do not leave a blank reviewer on an approved payment.

**Regression test:** book an ONLINE session with credit, then load
`/dashboard/admin/verification` and assert the row is present; approve it with a
Zoom link and assert the appointment reaches `CONFIRMED`.

---

### 🟠 F8 — Not actually fixed

The summary reports F8 resolved. The code still does what it did before:

```
const payableAmount = currentBalance;          // net
await tx.patientCredit.updateMany({
  where: { patientId, settledAt: null, amountEGP: { gt: 0 } },   // gross
  data: { settledAt: now, settledById: admin.id, settlementRef },
});
```

The payout is the **net** balance; the `settlementRef` is stamped on **every
unsettled positive row** at its gross value.

This was theoretical when I first raised it. It is now reachable, because
`APPLIED_TO_BOOKING` exists:

1. Cancellation credits `+850`.
2. Patient books with credit → `−300`. Net owed: 550.
3. Admin settles → transfers **550** under reference `R1`.
4. The `+850` row is now stamped `settlementRef = R1`.

Anyone reconciling the InstaPay statement against the ledger finds an 850 row
claiming a transaction that moved 550. Negative rows are never marked at all, so
`settledAt` on positives is not a meaningful "paid" flag either.

**Fix — pick one and write it down:**

- **Preferred:** the `PAID_OUT` row *is* the settlement event. It alone carries `settledAt` / `settledById` / `settlementRef`. Drop the `updateMany` on positive rows entirely. "Settled up to" is then derived from payout history, and the ledger's only invariant is `SUM(amountEGP)` — which is already how the balance is computed everywhere.
- **Alternative:** if per-row marking is kept for reporting, settle positives *and* negatives in the same batch and make the payout equal the sum of exactly the rows marked. The two numbers must not be allowed to diverge.

The first is less code and has one source of truth. Take it.

---

### 🟡 F16 — `settlementRef` still has no unique constraint

`prisma/schema.prisma` — `settlementRef String? @db.NVarChar(100)`, no `@unique`,
and no migration adding one (`prisma db push` is in use, no `migrations/` dir).

The `P2002` catch in `settleCreditAction` is therefore **dead code** — there is
no constraint to violate. The Serializable isolation carries the correctness on
its own, so this is defence-in-depth that is currently absent, not a live bug.

⚠️ **Do not "fix" this with a plain `@unique`.** On SQL Server a `UNIQUE`
constraint permits only **one** NULL row in the entire table. Every
`CANCELLATION` and `MANUAL_ADJUSTMENT` row is written with
`settlementRef = NULL`, so a naive `@unique` would make the *second* credit ever
issued fail with `P2002` — breaking credit issuance completely. This differs from
PostgreSQL, where multiple NULLs are allowed, so it would also pass a
Postgres-based test and fail only on the production provider.

**Correct options:**

1. **Filtered unique index** via raw SQL in a migration:
   `CREATE UNIQUE INDEX ... ON patient_credits(settlementRef) WHERE settlementRef IS NOT NULL;`
   Prisma cannot express this natively; it requires moving from `db push` to `db:migrate` and hand-editing the migration. Document why in the migration file.
2. **Or** delete the dead `P2002` branch and rely on Serializable alone, with a comment saying the reference is not database-enforced.

Either is defensible. Silently leaving a catch for a constraint that does not
exist is not — it reads as protection that is not there.

---

### 🔵 F17 — Minor

- The generic `catch` in `settleCreditAction` maps *every* unrecognised error to `CONFLICT` ("concurrent conflict, please refresh"). It logs first, which is right, but a genuine internal fault will be reported to the operator as a concurrency problem. For a money operation, failing closed is defensible — just be aware the message can mislead during incident triage.
- `APPLIED_TO_BOOKING` rows set `settlementRef: "CREDIT-<appointmentId>"`. That overloads a field whose meaning is "the InstaPay reference of a payout". It happens to be unique, so it is compatible with the filtered index above, but consider a distinct column or leaving it null once F8 is resolved.

---

## Part 3 — Next phase: launch

After F13 and F8, the feature set is complete for Phase 1. **What remains is not
features.** In priority order:

### 3.1 Blocking — must be done before real patients

1. **Real values in `.env`.** `CLINIC_INSTAPAY_HANDLE`, `CLINIC_VODAFONE_CASH_NUMBERS`, `CLINIC_WHATSAPP_NUMBER`, `CLINIC_ADDRESS_AR`, `CLINIC_MAPS_URL` still hold placeholders and appear **verbatim in patient WhatsApp messages**. Launching with the sample InstaPay handle directs patients' money to a handle that does not exist.
2. **Database credentials.** The app connects as `sa`. Create a login scoped to `asmaa_clinic` only, strong password, and drop `trustServerCertificate` once a real certificate is installed.
3. **Receipt storage.** Receipts are written to local disk under `UPLOAD_DIR`. On a rebuilt container or an ephemeral host, every receipt — the clinic's only evidence a transfer happened — is lost. Mount a persistent volume, or repoint `storeReceipt` / `readReceipt` / `deleteReceipt` in `lib/uploads.ts` at object storage. Three functions; nothing else changes.
4. **Backups, with one rehearsed restore.** The database now holds clinical records, safety plans, screening scores and a money ledger. An untested backup is a belief.
5. **Move off `db push` to `db:migrate`.** Every schema change so far has been pushed directly. Production needs versioned, reviewable migrations — and F16's filtered index requires one anyway. Generate a baseline migration from the current schema before the first deploy.
6. **Seed verification.** `prisma/seed.ts` correctly refuses its dev fallbacks when `NODE_ENV=production`. Confirm the production run actually supplies `SEED_ADMIN_PASSWORD` etc., and that the demo-patient block is skipped.
7. **Cron scheduling.** Both `/api/cron/release-holds` and `/api/cron/send-reminders` exist and are authenticated, but nothing calls them. Register them with a scheduler and confirm the first real invocations in the audit log.

### 3.2 Confirm before scaling

8. **Rate limiting is per-process.** `lib/security/rate-limit.ts` holds buckets in a `Map`. If production runs more than one Node instance, login throttling silently becomes N× weaker. Either pin to a single instance and write that down, or swap in Redis `INCR`/`EXPIRE` — the exported API does not change.

### 3.3 Operational runbook

The people using this daily are clinic staff, not engineers. One page, in Arabic,
covering:

- Adding a consultant, setting their weekly windows, and why a doctor with zero windows never appears in booking.
- The receipt review loop: what to check, when to reject, what the patient sees.
- Credits: when they are issued automatically, how to settle one, and what the transaction reference is for.
- Cancelling and rescheduling, and which cancellations create a credit.
- The crisis triage queue: what a flagged intake means and the expected response time.
- Who to call when something is wrong, and where the logs are.

### 3.4 Two clinical/policy decisions still open

Carried forward, still unanswered:

1. **Is a patient-initiated cancellation refundable, and inside what notice window?** Currently issues no credit, by design, pending this answer.
2. **Do credits expire?** If so, expiry should itself be a ledger entry, not a silent zeroing.

Add a third:

3. **Should a patient be able to move a session to a slot two hours away?** Patient reschedule requires the *existing* appointment to be ≥ 24h out but lets the *target* be as close as `bookingPolicy.minNoticeMinutes` (2h). Consistent with new bookings, but a same-day in-clinic arrival the clinic did not plan for is an operational event.

### 3.5 Tests to add alongside

- Credit-covered ONLINE booking appears in the desk queue and reaches `CONFIRMED` after link attachment (F13 regression).
- Settlement with interleaved positives and negatives: payout equals net, and no row is stamped with a reference for an amount it did not receive (F8).
- Credit issuance of two consecutive `CANCELLATION` rows both succeed — guards against a future naive `@unique` on `settlementRef` (F16).

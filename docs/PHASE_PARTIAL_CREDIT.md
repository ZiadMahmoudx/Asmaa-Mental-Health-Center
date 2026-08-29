# Phase 2 — Partial Credit at Booking

**To:** Agy (Implementation Lead)
**From:** Claude (Lead Architect)
**Prerequisite:** Phase 1 (full-cover credit) is merged and verified in production.

## Clinic decision, now settled

**An expired or cancelled partial booking refunds the credit in full.** The
clinic keeps no portion. Build to that and say so in the patient-facing copy.

---

## What this phase actually is

The UI is an afternoon. The whole job is one invariant:

> Credit is deducted at booking, but a partial booking can still expire, be
> rejected, or be cancelled. **Every one of those exits must return the credit,
> exactly once.**

This is a state the platform has never had. Until now, a credit-covered booking
was `CONFIRMED` or `PAYMENT_UNDER_REVIEW` immediately, with `holdExpiresAt: null`
— nothing to expire, nothing to undo. A partial booking holds a slot while the
patient uploads a receipt for the remainder, so it lives in
`PENDING_PAYMENT_PROOF` **with money already taken out of the ledger**.

---

# 🔴 Read this before writing any code: the double-refund hazard

`adminCancelAppointmentAction` (`admin.actions.ts:646–658`) already issues a
refund on cancellation:

```ts
if (appointment.status === "CONFIRMED") {
  await tx.patientCredit.create({
    data: { ..., amountEGP: appointment.priceEGP, kind: "CANCELLATION", ... },
  });
}
```

It refunds **`appointment.priceEGP` — the full sticker price**. That is correct
today, because today every confirmed appointment was paid for entirely in cash.

The moment partial credit exists, it is wrong. Take a 900 EGP session paid with
850 credit + 50 transfer, then cancelled:

| Source | Amount |
|---|---|
| existing `CANCELLATION` credit (`priceEGP`) | **+900** |
| new credit reversal (the deducted 850) | **+850** |
| **total refunded** | **1750** |

The patient gains 850 EGP that never existed. The clinic has no way to notice:
both entries look legitimate in the ledger, and the balance is a `SUM`.

The same applies to `doctorCancelAppointmentAction` (`doctor.actions.ts:1290`)
and the reschedule path (`doctor.actions.ts:916`).

### The rule that fixes it

**Refund by source, never by sticker price.**

- The **credit portion** comes back as a reversal of the `APPLIED_TO_BOOKING` row.
- The **cash portion** comes back as a `CANCELLATION` credit — and only for cash
  the clinic actually received, i.e. when the payment proof reached `APPROVED`.

So every existing `CANCELLATION` issuance must change from `appointment.priceEGP`
to **the cash actually taken**: `priceEGP − creditApplied`, and zero when no
proof was approved.

Derive `creditApplied` from the ledger — the sum of `APPLIED_TO_BOOKING` rows for
that `appointmentId` — not from a column that could drift.

**Do this refactor first, as its own commit, before adding partial booking.**
It is a correctness fix to existing behaviour that happens to be latent, and it
is far easier to reason about on its own than tangled into a new feature.

---

# 1. Schema

Add one credit kind to `lib/domain/enums.ts`:

```ts
export const CREDIT_KINDS = [
  "CANCELLATION",
  "MANUAL_ADJUSTMENT",
  "APPLIED_TO_BOOKING",
  "PAID_OUT",
  "CREDIT_REVERSAL",   // returns an APPLIED_TO_BOOKING when the booking never completed
] as const;
```

A distinct kind is not cosmetic — it is what makes the refund idempotent (§3) and
what lets the credits desk tell "we gave money back" apart from "the booking was
cancelled after payment".

No new columns. The ledger stays append-only and the balance stays `SUM(amountEGP)`.

---

# 2. The reversal invariant

Every path that ends a partial booking must reverse the credit. Exact locations:

| # | Path | File | Reverse credit? | Cash refund? |
|---|---|---|---|---|
| 1 | unpaid hold lapses | `booking.actions.ts` sweep pass 1 | **yes** | no — none received |
| 2 | review SLA lapses | sweep pass 2 | **yes** | no |
| 3 | rejection grace lapses | sweep pass 3 | no — already reversed at rejection | no |
| 4 | desk rejects the receipt | `admin.actions.ts:306` `rejectPaymentAction` | **yes** | no |
| 5 | patient cancels | `booking.actions.ts:718` `cancelMyAppointmentAction` | **yes** | per clinic policy (still unanswered — see §7) |
| 6 | admin cancels | `admin.actions.ts:583` | **yes** | yes, cash portion only |
| 7 | doctor cancels | `doctor.actions.ts:1214` | **yes** | yes, cash portion only |
| 8 | doctor reschedules | `doctor.actions.ts:916` | **no** — the booking lives on, keep the deduction | no |

Row 8 matters: a reschedule is not a termination. Reversing there would hand the
patient their credit back and leave the appointment standing.

Row 3 matters too: rejection (row 4) is where the reversal happens, and pass 3
only releases a lock afterwards. Reversing in both is a double refund — this is
precisely why §3 exists.

---

# 3. Idempotency — the part that will bite

The sweep runs every few minutes and the paths overlap. An expired hold that an
admin also cancels reaches two refund sites. Ship a single helper and route every
path through it:

```ts
// inside the same transaction that changes the appointment status
async function reverseAppliedCredit(tx, appointmentId, actorId): Promise<boolean>
```

It must:

1. read every `PatientCredit` row for that `appointmentId`
2. compute `applied` = |sum of `APPLIED_TO_BOOKING`|
3. compute `alreadyReversed` = sum of `CREDIT_REVERSAL`
4. write `applied − alreadyReversed` as a positive `CREDIT_REVERSAL`, and **only
   if that difference is greater than zero**
5. return whether it wrote anything, so the caller can audit accurately

Checking existing rows rather than assuming is what makes a second call a no-op.
Do not rely on "this path runs once" — the sweep already proves that assumption
false.

---

# 4. Transaction boundaries

**The reversal must commit inside the same transaction as the status change.**

Never:
```ts
await tx.appointment.updateMany({ ...status change... });
// ...transaction commits...
await reverseAppliedCredit(...);   // ← a crash here loses the patient's money
```

Always: the status write and the reversal in one `tx`. If the status write rolls
back, the refund rolls back with it; if the refund fails, the cancellation fails
and the patient retries. Either outcome is recoverable. A split commit is not.

This applies inside the sweep too — each appointment's release and its reversal
belong in one transaction, not one transaction for the batch.

---

# 5. Booking flow changes

`booking.actions.ts` — `reserveSlotAction`

The existing full-cover branch stays exactly as it is. Add a partial branch:

- `creditApplied = min(balance, priceEGP)`; `cashDue = priceEGP − creditApplied`
- when `cashDue > 0`: status `PENDING_PAYMENT_PROOF`, `holdExpiresAt` set as
  normal, deduct `creditApplied` as `APPLIED_TO_BOOKING`, **no** `PaymentProof`
  row yet — the patient still has to upload one
- keep `Serializable` and keep recomputing the balance inside the transaction.
  Do not trust any figure computed before the transaction opened.

**Receipt validation:** the payment page must check the uploaded amount against
`cashDue`, not `priceEGP`. A patient told to transfer 50 who uploads a 50 EGP
receipt must not be flagged as underpaying by 850.

`ReservationPayload` needs `creditAppliedEGP` and `cashDueEGP` so the payment
page and the desk can both show the split.

## UI

- **Booking summary:** replace the current all-or-nothing checkbox with the split
  when the balance is short:
  `رصيدك ٨٥٠ — المتبقي للتحويل ٥٠ جنيه`, total shown as `٥٠ ج.م` with `٩٠٠` struck through.
  Keep it **opt-in and unchecked by default** — manual payment stays the default
  path, as it is today.
- **Payment page:** state the amount owed as `cashDue`, and say plainly that
  850 has already been taken from the balance.
- **Verification desk:** show the split on the row —
  `٨٥٠ رصيد + ٥٠ تحويل`. An admin verifying a 50 EGP receipt against a 900 EGP
  session will otherwise reject it as wrong.
- **Expiry copy:** because the clinic refunds in full, say so where the hold
  countdown appears: *"إذا انتهت المهلة يعود رصيدك كاملاً."* A patient watching a
  timer with their money already deducted needs that sentence.

---

# 6. Tests

Required in `tests/logic.test.ts`:

| # | Assertion |
|---|---|
| 1 | `creditApplied` / `cashDue` split arithmetic, including `balance > price` (cash due 0 → full-cover branch, not partial) |
| 2 | reversal helper returns the deducted amount when nothing was reversed yet |
| 3 | reversal helper returns **zero** on a second call — idempotency |
| 4 | cancellation cash refund is `priceEGP − creditApplied`, not `priceEGP` — the double-refund guard |
| 5 | cash refund is **zero** when no proof reached `APPROVED` |
| 6 | reschedule does **not** reverse |
| 7 | `Decimal` throughout — assert to the piastre, never float |

**And one live-database test, which is the one that counts.** The pure-logic suite
cannot observe the sweep. Write a scratch script (delete it afterwards) that:

- creates a partial booking with a real deduction
- runs `releaseExpiredHoldsAction` **twice**
- asserts the balance is restored **exactly once** and equals the pre-booking
  figure to the piastre

The equivalent live test is what caught the slot-lock leaks and what proved the
Phase 1 concurrency claim. A green logic suite is not evidence here.

---

# 7. Constraints

- Do not alter the Phase 1 full-cover branch, its `Serializable` isolation, or its
  in-transaction balance recomputation.
- Never edit or delete an existing ledger row. Every correction is a new signed row.
- Every refund path calls `recordAudit`; a refund that leaves no trace is
  indistinguishable from fraud during a reconciliation.
- Arabic default, every new string bilingual.
- Gates: `tsc --noEmit`, `test:logic`, `build`, plus the live sweep test above.

## Ordering

1. **Refund-by-source refactor** (the §"double-refund hazard" fix) — own commit, own tests.
2. `CREDIT_REVERSAL` kind + the idempotent helper — own commit.
3. Wire the helper into paths 1, 2, 4, 5, 6, 7 — own commit.
4. Partial booking branch + payload fields.
5. UI (booking summary, payment page, desk, expiry copy).

Steps 1–3 are pure correctness on existing behaviour and can ship before any
partial booking exists. Do them first; they make step 4 safe.

## Still open with the clinic — surface, do not block

1. **Patient-initiated cancellation** (path 5): is the cash portion refundable,
   and inside what notice window? Long outstanding. Until answered, reverse the
   **credit** portion (it was never spent) and leave the cash portion alone,
   matching today's behaviour where patient cancellations issue no credit.
2. Do credits expire? Now materially more important, since a balance is genuinely
   spendable.

# Phase — Spending Patient Credit at Booking

**To:** Agy (Implementation Lead)
**From:** Claude (Lead Architect)

---

## The gap

A patient with a credit balance can see it and cannot spend it.

The server side is **already built and correct** — `booking.actions.ts:394–470`:

- recomputes the balance **inside** a `Serializable` transaction rather than trusting a figure read earlier
- refuses when `currentBalance.lt(priceEGP)`
- creates the appointment, writes the signed `APPLIED_TO_BOOKING` deduction, and creates a `PaymentProof` with `method: "CREDIT"`
- routes ONLINE bookings to `PAYMENT_UNDER_REVIEW` so the desk still attaches a Zoom link — this is the F13 fix and it must stay
- `applyCredit` is already declared in `reserveSlotSchema` (`schemas.ts:173`)
- `PaymentVerificationDesk.tsx:526` already renders `method === "CREDIT"` rows without trying to load a receipt image

**Nothing in the UI sends `applyCredit`, and the booking page never fetches the balance.** Verified by grepping every `.tsx` under `app/` and `components/`: zero occurrences.

So the patient dashboard tells them, in Arabic, *"رصيد لك لدى المركز، يمكن استخدامه في حجز قادم"* (`app/dashboard/patient/page.tsx:120`) — a promise the product cannot keep. They must transfer the full fee again, upload a receipt, and wait for review, while their balance sits untouched.

The hard half is done. The missing half is a checkbox and a fetch.

---

# PHASE 1 — Full-cover credit (ship this first)

Scope: the balance covers the whole fee. No receipt, no upload, no hold.

This case is deliberately first because it has **no reversal problem**. A
full-cover booking is either `CONFIRMED` (OFFLINE) or `PAYMENT_UNDER_REVIEW`
(ONLINE) the moment it is created — there is no `holdExpiresAt`, so no expiry
sweep can strand it and no ledger entry ever needs undoing.

## 1.1 Booking page fetches the balance

`app/booking/[doctorId]/page.tsx`

`getPatientCreditBalanceAction` already exists (`credits.actions.ts:50`). Call it
alongside the existing data when the visitor is authenticated, and pass the
balance into `BookingFlow`. Guests get `null` — never render credit UI to a
signed-out visitor.

## 1.2 Payment step offers the credit

`components/booking/BookingFlow.tsx`

Show the option **only** when `balance >= price` for the currently selected
session type. The type toggle changes the price (850 online / 950 in-clinic on
the seeded roster), so re-evaluate on every toggle — a balance that covers the
online fee will often not cover the in-clinic one.

When shown and selected:
- the primary button changes from *"احجز الموعد وتابع للدفع"* to
  **"أكّد الحجز من رصيدك"** / *"Confirm using your credit"*
- state the arithmetic plainly: `رصيدك ٨٥٠ — بعد الحجز ٠`
- submit `applyCredit=true` in the existing form

When the balance is short, say so rather than hiding the row silently:
*"رصيدك ٨٥٠ جنيه ولا يغطي قيمة هذه الجلسة (٩٥٠). يمكنك استخدامه في جلسة أونلاين."*
A balance the patient can see but not use, with no explanation, reads as a bug.

## 1.3 Skip the payment page on success

`reserveSlotAction` already returns the appointment. On a credit-covered
booking, route straight to the confirmation/dashboard rather than
`/payment/[appointmentId]` — that page asks for a transfer that is not owed.

Check the redirect the action currently returns and branch on `applyCredit`.

## 1.4 Tell the patient what happens next

The two outcomes differ and both need a sentence:
- **OFFLINE** → confirmed immediately; show the clinic address and room.
- **ONLINE** → *"سيصلك رابط زووم من فريق المركز خلال وقت قصير"*. It is
  `PAYMENT_UNDER_REVIEW` only so an admin can attach the link — the patient owes
  nothing. Do not reuse the "receipt under review" copy here; it would tell a
  patient who has already paid that their payment is being checked.

## 1.5 Desk clarity

`PaymentVerificationDesk.tsx` already special-cases `CREDIT`. Confirm the row
reads as **"مغطاة بالرصيد — يلزم إرفاق رابط زووم فقط"**, not as a receipt
awaiting verification, and that the approve action does not demand a transfer
reference. The admin's job on these rows is one field, not an audit.

## Phase 1 tests

| # | Assertion |
|---|---|
| 1 | balance 850, online fee 850 → booking created, ledger nets to 0, no `holdExpiresAt` |
| 2 | balance 850, in-clinic fee 950 → `applyCredit` is refused server-side with `INSUFFICIENT_CREDIT`, no appointment and no ledger row |
| 3 | ONLINE credit booking lands in `PAYMENT_UNDER_REVIEW` with a `CREDIT` proof (F13 regression) |
| 4 | OFFLINE credit booking lands in `CONFIRMED` |
| 5 | **Concurrency:** two simultaneous credit bookings against one balance that covers only one → exactly one succeeds, the other fails, balance never goes negative. This is what the `Serializable` isolation is for; assert it rather than assume it. |
| 6 | balance 1000, fee 850 → remaining balance is 150 and is spendable again |

---

# PHASE 2 — Partial credit (do not start until Phase 1 is merged)

Scope: the balance covers part of the fee; the patient transfers the rest.

**The UI is the easy part. The reversal invariant is the whole job.**

A partial booking must hold a slot while the patient uploads a receipt for the
remainder, which means it enters `PENDING_PAYMENT_PROOF` with a `holdExpiresAt`.
That creates a state the platform has never had: **money already deducted from
the ledger against an appointment that can still expire, be rejected, or be
cancelled.**

Every one of those paths must give the credit back:

| Path | Where | Must refund |
|---|---|---|
| hold lapses | `releaseExpiredHoldsAction` pass 1 | yes |
| review SLA lapses | same, pass 2 | yes |
| rejection grace lapses | same, pass 3 | no — the appointment is already dead, refund at rejection |
| desk rejects the receipt | `rejectPaymentAction` | yes |
| patient cancels | `cancelAppointmentAction` | yes |
| admin cancels | `adminCancelAppointmentAction` | yes |

Design notes:

1. **Refund by writing a positive `PatientCredit` row**, never by deleting or
   editing the negative one. The ledger is append-only and the balance is
   `SUM(amountEGP)`; a reversal is a new entry with its own reason and a link
   back to the appointment. This is the same rule that governs settlements.
2. **Make the refund idempotent.** The sweep runs every few minutes and paths
   overlap — an expired hold that an admin also cancels must not refund twice.
   Key it on `(appointmentId, kind: "REFUNDED_ON_RELEASE")` and check before
   writing, inside the same transaction that changes the appointment status.
3. **Refund inside the status-change transaction**, never after it. A refund that
   commits separately can be lost if the status write rolls back, and the patient
   silently loses money.
4. The receipt for the remainder must be validated against the **remaining**
   amount, not the full fee.

## Phase 2 tests

- partial booking → hold expires via the real sweep → balance restored exactly once
- partial booking → desk rejects the receipt → balance restored
- partial booking → patient cancels → balance restored
- the sweep run twice over the same expired partial booking → one refund, not two
- refund amount equals the deduction to the piastre (`Decimal`, never float)

---

## Constraints

- Do not touch the `Serializable` isolation or the balance recomputation in
  `booking.actions.ts` — that logic is correct and is what makes double-spend
  impossible.
- Do not change `PaymentProof` semantics for `CREDIT` rows; the desk depends on
  them and F13 was fixed there.
- No new money path may bypass `recordAudit`.
- Arabic is the default; every new string bilingual from the start.
- Gates: `tsc --noEmit`, `test:logic`, `build`.

## Open questions for the clinic — surface, do not block

1. **Do credits expire?** Long-standing and unanswered, and it matters more once
   the balance is actually spendable.
2. **Is a credit refundable to the patient's wallet**, or usable only inside the
   clinic? The dashboard currently promises *"أو استرداده عبر التحويل"* — a
   transfer out. The settlement desk supports it; confirm the policy matches the
   promise.
3. For a partial booking that expires, is the credit returned in full, or does
   the clinic keep a no-show portion? Assume **full refund** until told
   otherwise, and say so in the copy.

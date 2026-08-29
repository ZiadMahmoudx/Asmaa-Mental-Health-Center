# Outstanding fixes + pre-launch smoke test

Reviewed at commit `bc03dac`. Independently verified: `tsc --noEmit` exit 0,
`test:logic` 44/44.

**Closed and confirmed:** F1–F17. F16 was correctly resolved by removing the dead
`P2002` catch and documenting that Serializable isolation carries the guarantee —
`settlementRef` intentionally has no unique constraint, which is the right call on
SQL Server given the NULL-uniqueness trap.

Two items remain. Both are small. Neither blocks launch, but F18 touches a
financial audit trail and should not ship as-is.

---

## F18 — The patient is recorded as approving their own payment

**File:** `app/actions/booking.actions.ts:453-454`

```ts
reviewedAt:   type === "OFFLINE" ? now : null,
reviewedById: type === "OFFLINE" ? user.id : null,
```

`user` here is the **patient** making the booking. For an OFFLINE credit-covered
booking, the auto-approved `PaymentProof` is therefore stamped with the patient
as its reviewer.

`getReviewHistoryAction` maps `reviewedByName: proof.reviewedBy?.fullName ?? null`,
so the admin decision log renders that payment as approved by, for example,
**"سارة محمود"** — the patient herself.

The `"النظام (رصيد مالي)"` fallback that was added does work, but it only fires
when `reviewedByName` is null. For OFFLINE credit proofs it is not null, so the
fallback never reaches the one case it was written for. The display fix was
applied; the data underneath it was not.

This misattributes who authorised a payment, in the log the clinic would use to
answer exactly that question.

**Fix**

```ts
reviewedAt:   type === "OFFLINE" ? now : null,
reviewedById: null,   // system-approved; no human reviewed a credit deduction
```

Keep `reviewedAt` for OFFLINE so the timestamp is preserved. With
`reviewedById` null on both branches, the existing `"النظام (رصيد مالي)"`
fallback renders uniformly and correctly.

**Test:** create an OFFLINE credit booking, load the decision log, assert the
reviewer column reads `النظام (رصيد مالي)` and not a patient name.

---

## F19 — `settledCount` no longer means what it says

**File:** `app/actions/credits.actions.ts:290`

```ts
settledCount: allCredits.length,
```

After the F8 change nothing is "marked settled" any more — the `PAID_OUT` row is
the whole settlement event. `allCredits.length` is now simply how many ledger
rows the patient has ever had, including previously settled ones and prior
payouts.

The admin console surfaces this as a settlement count, so a single payout on a
patient with seven historical entries reports **"تمت تسوية ٧ قيود"**. That is
wrong in a money screen, where staff reasonably read a count as "how many things
did I just pay".

**Fix — pick one:**

1. **Drop it.** The payout amount is the meaningful number. Remove `settledCount`
   from the payload, the return type, and the UI. Simplest and most honest.
2. **Report the contributing entries.** Before creating the `PAID_OUT` row, count
   the rows that make up the outstanding balance —
   `allCredits.filter(c => c.amountEGP.gt(0) && !c.settledAt).length` — and return
   that. Only worth it if the console genuinely benefits from the breakdown.

Option 1 is recommended.

---

## Pre-launch smoke test (run against production, before announcing)

Both critical bugs found in this codebase — the double payout and the stranded
credit booking (F7, F13) — passed `typecheck`, `build`, and the full logic suite.
Both were integration-level: correct units, wrong wiring between them. The logic
suite cannot catch that class, so the chain must be walked once on the real
system after deploy.

Ten minutes. Do it before the clinic announces the platform.

### A. Core payment chain

1. Register a new patient account.
2. Book an **ONLINE** session. Confirm the hold countdown appears and the InstaPay handle shown is the **clinic's real one**, not a placeholder.
3. Upload a receipt image. Confirm it reaches `/dashboard/admin/verification`.
4. As admin, open the receipt — confirm the image actually renders (this exercises persistent storage; if receipts are on ephemeral disk this is where it fails).
5. Approve with a real Zoom link. Confirm the appointment reaches `CONFIRMED` and the WhatsApp confirmation contains the link.
6. As the patient, confirm the Zoom link appears in the portal.

### B. Credit round trip — the path with the most history

7. As admin or the doctor, cancel that **CONFIRMED** session with a reason.
8. Confirm a `CANCELLATION` credit appears for the full session price, and the patient's portal shows the balance.
9. As the patient, book a new **ONLINE** session using the credit.
10. **Confirm it appears in the verification desk queue** with the credit badge. This is the exact F13 failure — if the row is missing, the patient's credit is gone and the slot is permanently consumed.
11. Attach a Zoom link and approve. Confirm `CONFIRMED`.
12. Repeat 9–11 for an **OFFLINE** session; confirm it auto-confirms without entering the queue, and that the decision log shows the correct reviewer (F18).

### C. Settlement

13. Generate another credit via cancellation.
14. Settle it from `/dashboard/admin/credits` with a real InstaPay reference.
15. Confirm the balance returns to zero and exactly **one** `PAID_OUT` row exists.

### D. Scheduled jobs

16. Invoke `/api/cron/release-holds` and `/api/cron/send-reminders` with the production bearer token. Confirm 200, and 401 without it.
17. Confirm both are registered with a scheduler and check the audit log after the first natural run.

### E. Access control

18. Sign in as a doctor and attempt to open another doctor's schedule page and a non-patient's clinical drawer. Both must refuse.
19. Confirm a signed-out visitor is redirected from `/dashboard/*`.

Record the results. If any step fails, do not announce.

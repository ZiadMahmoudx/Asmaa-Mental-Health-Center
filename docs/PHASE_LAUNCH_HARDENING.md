# Phase Next — Launch Hardening

Sign-off basis: source audit of the assessments & safety workstream at the
current working tree. `test:logic` 56/56, `tsc --noEmit` clean, verified
independently.

**F28 refinement confirmed** — `assessments.actions.ts:252–255` now tests both
`question.isRiskItem` and `scale.riskRules`. The predicate matches the client
gate. The last minor note from Addendum 3 is closed.

---

## 0. Do this first

The entire workstream is **uncommitted**. `git status` shows ~10 modified files
against `888123b`. Everything reviewed here exists only in one working tree with
no backup and no history. Commit before anything else.

---

## 1. Scope of the sign-off

Signed off by source audit **this cycle**: assessments engine, scoring, stepper,
safety escalation, alert queue, draft hygiene, assessment-related metrics.

Audited in **earlier** cycles at their commits, findings closed, **not re-verified
against the current tree**: auth/session, payments & verification desk, booking &
slot locking, credit ledger, doctor/admin management. Their code is unchanged in
this tree, so the earlier sign-off stands — but it is a prior sign-off, not a
fresh one.

Never audited by me: the actual production environment, the database instance,
the deployment pipeline. Section 2 is where the remaining risk lives.

---

## 2. The launch gate — ordered

Nothing below is application code. This is the phase.

| # | Item | Why this order |
|---|---|---|
| 1 | **Commit the workstream** | No backup currently exists |
| 2 | **Real `.env` values** | Placeholders reach patients verbatim in WhatsApp messages — a patient-visible defect, not an internal one |
| 3 | **Scoped SQL login** | Replace `sa` with a login limited to `asmaa_clinic`. The app currently runs as server admin |
| 4 | **ISI licensing** | Live, copyrighted, open four reviews. Not solvable in code. Either obtain the licence or pull the scale — a third option does not exist |
| 5 | **Versioned migrations** | Baseline off `db push` before real patient data exists. Cheap now, expensive later |
| 6 | **Persistent receipt storage** | Payment evidence on ephemeral disk is a financial-dispute liability |
| 7 | **Rehearsed backup restore** | One full restore, timed, into a scratch database. An untested backup is a hope |
| 8 | **Register both cron endpoints** | Holds never release and reminders never send until a scheduler calls them |
| 9 | **19-step smoke test** | `docs/OUTSTANDING_FIXES_AND_SMOKE_TEST.md`, against the real environment |

Items 2–4 are patient-facing or legal. Items 5–8 are operational. Item 9 is the
gate itself.

---

## 3. Three clinical decisions still owed by the clinic

Unchanged across reviews; each is encoded in code as a default nobody chose.

1. Are patient-initiated cancellations refundable, and inside what window?
2. Do credits expire?
3. What is the expected response time for a `CRISIS` alert, and who is on call
   after hours?

Question 3 is the one that matters most. The queue built this cycle is only as
good as the human process behind it — a crisis alert nobody is rostered to
answer at 2 a.m. is a logged event, not a safeguard.

---

## 4. After launch — not before

Deferred deliberately; none is a launch blocker.

- Filtered unique index on `(patientId, type) WHERE status = 'DRAFT'` (F22's
  correct long-term form).
- Clinician-facing scale assignment (doctor asks a patient to complete an
  instrument before the next session).
- Structured outcome reporting across the longitudinal data now being collected.

Do not start these while section 2 is open.

# Review — Clinical Assessments & Safety Escalation Overhaul

Audited by source inspection.

---

## Answers to the four questions asked

**1. Safety escalation single-transaction invariant — HOLDS.**
`submitAssessmentAction` wraps the assessment write and the `SafetyAlert` create
in one `prisma.$transaction`; `saveAssessmentDraftAction` does the same. An
alert cannot exist without its record, nor a risk-endorsing record without its
alert. `submitIntakeAction` follows the same pattern. This was the critical
requirement and it is correctly implemented.
**But see F20 — the invariant holds while the *count* is wrong.**

**2. Draft hygiene — HOLDS for clinical charts.**
`getMyAssessmentsAction` and `getPatientAssessmentsAction` both filter
`status: "COMPLETED"` (lines 405, 450). Drafts cannot reach the patient history
or the doctor's longitudinal view. **One weak spot: F23.**

**3. Stepper transitions — mostly correct, one accessibility gap.**
`handleNext` blocks advancement and `scrollIntoView({ block: "center" })` brings
the first unanswered item into view. That fixes the original defect. However
there is **no `.focus()` call and no `aria-invalid`** anywhere in the component —
so a keyboard or screen-reader user is scrolled to an element that is never
announced and never receives focus. See F24.

**4. Remaining issues — four, below.**

---

### 🔴 F20 — One disclosure produces two CRISIS alerts

**Severity: high. Degrades the safety queue that Phase 1 exists to provide.**

`saveAssessmentDraftAction` correctly de-duplicates before creating an alert:

```
const openAlert = await tx.safetyAlert.findFirst({
  where: { patientId, source: "ASSESSMENT", sourceId: draftId, resolvedAt: null },
});
if (!openAlert) { await tx.safetyAlert.create({ … detail: `${type}_SAFETY_DRAFT` }); }
```

`submitAssessmentAction` does **not**:

```
if (scored.riskItemEndorsed) {
  await tx.safetyAlert.create({ … sourceId: assessmentId, detail: `${rawType}_SAFETY` });
}
```

Promotion reuses the draft row, so `assessmentId === draftId`. The normal path
for a patient who endorses PHQ-9 item 9 is therefore:

1. Step transition → draft save → alert A (`PHQ9_SAFETY_DRAFT`), unresolved.
2. Completion → submit → alert B (`PHQ9_SAFETY`), unresolved, same `sourceId`.

**Two open CRISIS alerts for one disclosure**, each needing separate acknowledge
and resolve. This is the common path, not an edge case — any patient who
endorses a risk item and then finishes the scale produces a duplicate.

The cost is not cosmetic. A crisis queue that shows two rows per event trains
staff to treat entries as noise, which is precisely the failure mode the queue
was built to prevent.

**Fix — preferred:** in `submitAssessmentAction`, look for an existing open alert
on the same `sourceId` and **upgrade** it rather than creating a second:

- If found: update `detail` from `${type}_SAFETY_DRAFT` to `${type}_SAFETY`, leave `acknowledgedAt` untouched (staff may already have acted on it — do not reset their work).
- If not found: create as today.

Mirror the exact `findFirst` predicate used in the draft path so the two cannot
drift.

**Test:** endorse a risk item on an early step, complete the scale, assert
`safetyAlert.count({ where: { sourceId, resolvedAt: null } }) === 1`.

---

### 🟠 F21 — `saveAssessmentDraftAction` bypasses CSRF, rate limiting and input validation

**Severity: medium. Inconsistent with the codebase's own documented posture.**

```
export async function saveAssessmentDraftAction(
  type: string,
  answers: Record<string, number>,
): Promise<ActionResult<{ draftId: string }>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();
```

Three gaps, all stemming from the plain-argument signature:

1. **No CSRF verification.** Every other mutating action goes through `requireRole(role, formData)`, which calls `verifyCsrfFromForm`. Because this takes plain arguments rather than `FormData`, that layer never runs. `lib/auth/csrf.ts` documents that both the framework check *and* the double-submit token are applied deliberately, "because the clinic handles money transfers and clinical records" — this action writes clinical data and creates CRISIS alerts, so it is squarely in that category. Next.js's built-in Server Action origin check still applies, so this is a defence-in-depth regression rather than an open hole, but it is an unexplained exception to a stated rule.
2. **No rate limit.** `submitAssessmentAction` is capped at 30/hour. The draft action has none, and the stepper calls it on **every step transition** (5 calls for a 20-item scale). It can create `SafetyAlert` rows. An authenticated caller can drive unbounded writes.
3. **`answers` is unvalidated.** `scoreAssessment` clamps values for *scoring*, but the raw object is persisted verbatim via `JSON.stringify(answers)` into an `NVarChar(Max)` column. Arbitrary keys and unbounded size are written.

**Fix:** convert to the `FormData` convention used everywhere else, guard with
`requireRole(["PATIENT"], formData)`, add
`consumeRateLimit(\`assessment-draft:\${user.id}\`, { limit: 120, windowSeconds: 3600 })`,
and Zod-validate `answers` — keys restricted to the scale's own question ids,
values coerced integers within the option range. Discard unknown keys rather than
persisting them.

---

### 🟡 F22 — Nothing prevents multiple DRAFT rows per (patient, scale)

`ClinicalAssessment` has `@@index([patientId, status, completedAt])` but no
uniqueness on `(patientId, type, status)`. Both the draft save and
`getAssessmentDraftAction` use `findFirst`, which picks an arbitrary row.

Two tabs, or a phone and a laptop, produce two drafts for the same scale. Answers
diverge silently, `findFirst` may hydrate either one, and the orphaned draft can
carry a risk endorsement whose alert points at a row that never completes —
leaving an open CRISIS alert attached to an abandoned draft that no completion
will ever upgrade (interacts with F20).

**Fix options:**
1. A filtered unique index on `(patientId, type) WHERE status = 'DRAFT'`. Prisma cannot express this natively; it needs a raw migration step — the same mechanism already discussed for `settlementRef`. ⚠️ Do **not** use a plain `@@unique([patientId, type, status])`: it would forbid a patient from ever completing the same scale twice.
2. Or make the draft write an explicit upsert on a deterministic key and have `getAssessmentDraftAction` order by `updatedAt desc` so the newest always wins. Cheaper; accepts the duplicate rows but makes behaviour deterministic.

Option 2 is adequate for launch. Option 1 is correct long-term.

---

### 🟡 F23 — The risk metric is correct by accident

`metrics.actions.ts:101`

```
prisma.clinicalAssessment.count({
  where: { riskItemEndorsed: true, completedAt: { gte: thirtyDaysAgo } },
})
```

No `status` filter. It currently excludes drafts only because drafts have
`completedAt: null` and null fails `gte`. That is true today and silently
depends on it. Anyone who later backfills `completedAt`, or changes the default,
turns this into a metric that counts half-finished questionnaires as clinical
events with no error.

**Fix:** add `status: "COMPLETED"` explicitly. One line; makes the intent
enforced rather than inferred.

---

### 🟡 F24 — Unanswered items are scrolled to but never focused

`AssessmentStepper.tsx` calls `scrollIntoView({ behavior: "smooth", block: "center" })`
on the first unanswered question. There is no `.focus()` call and no
`aria-invalid` attribute anywhere in the file.

For a sighted mouse user this works. For a keyboard user, focus stays on the
disabled Next button; for a screen-reader user, nothing is announced — the page
appears to do nothing when they try to advance, which reproduces the original
"I can't submit and I don't know why" complaint for exactly the users least able
to work around it.

**Fix:** give each question's option group a ref, call `.focus()` on the first
unanswered control after scrolling, set `aria-invalid="true"` on unanswered
groups once an advance has been attempted, and point `aria-describedby` at the
step-level error message. Also add `role="alert"` to that message so it is
announced without moving focus.

Given this is a mental-health platform serving patients in distress —
some of whom will be using assistive technology — this is worth doing properly
rather than deferring.

---

## Confirmed correct

- Pluggable scoring with `subscales`, `riskRules` and per-question `options` overrides — the model now expresses AUDIT's split option sets and PCL-5/OCI-R subscales as designed.
- `scaleVersion` is written on both draft and completion, from `scale.version`.
- Server-side rescoring and out-of-range clamping preserved; the anti-tamper guarantee is intact.
- Draft path de-duplicates its own alerts correctly.
- `submitIntakeAction` now transactional with its `SafetyAlert`, unifying both crisis doors as specified.
- Licensing followed the recommendation: the catalogue is public-domain/free instruments, BDI-II correctly not implemented.

⚠️ **ISI remains outstanding from the previous review** — it is copyrighted
(Morin) and commercial digital deployment generally requires a licence. It is
live. Confirm the clinic's position with the rights holder.

---

## Suggested order

| # | Item | Note |
|---|---|---|
| 1 | **F20** | Safety-queue integrity; small change, high value |
| 2 | **F21** | Bring the draft action onto the standard guard/limit/validate path |
| 3 | **F24** | Accessibility; do not defer on a mental-health platform |
| 4 | **F23** | One line |
| 5 | **F22** | Option 2 for launch, option 1 later |

Gates unchanged: `typecheck`, `test:logic`, `build`, plus the dual-provider
`prisma validate` round trip.

New tests: one open alert per disclosure after a full draft→submit cycle (F20);
draft answers with unknown keys are discarded, not persisted (F21); a second
device's draft does not resurrect stale answers (F22).

---

# Addendum — Verification of F20–F24 (second pass)

Verified by source inspection, not by report. `npm run test:logic` re-run
independently: **54/54 pass**.

| # | Status | Evidence |
|---|---|---|
| F20 | ✅ Closed | `assessments.actions.ts:141–168` — `findFirst` on the open alert, `update` of `detail` only. `acknowledgedAt` is not in the update payload, so staff work survives. Predicate is character-for-character identical to the draft path's. |
| F21 | ✅ Closed | Signature is now `(_prevState, formData)` with `requireRole(["PATIENT"], formData)` at :217; rate limit 120/hr at :221; answers rebuilt by iterating `scale.questions` and clamped to `question.options ?? scale.options` at :233–244. Unknown keys are structurally unreachable, not filtered — the stronger form. |
| F22 | ✅ Closed (option 2) | `orderBy: { updatedAt: "desc" }` on all three draft lookups (:97, :256, :343). Deterministic newest-wins as specified. Filtered unique index remains the long-term fix. |
| F23 | ✅ Closed | `metrics.actions.ts:102` now carries `status: "COMPLETED"` explicitly. |
| F24 | ✅ Closed | `AssessmentStepper.tsx:102–107` scroll then `.focus()` the first option control; `role="group"`, `aria-labelledby`, `aria-invalid`, `aria-describedby` on question cards (:437–440); `role="alert"` + `aria-live="polite"` on the error banner (:392). |

Nothing was patched into the test file to make a red suite green — the three new
checks assert the actual behaviours.

---

## Two residual items found on this pass

### 🟡 F25 — A retracted risk endorsement leaves a contradictory open alert

`submitAssessmentAction` only enters the alert branch when
`scored.riskItemEndorsed` is true. A patient who endorses PHQ-9 item 9 on step 3,
navigates **Back**, changes the answer to 0, and completes therefore ends with:

- a `ClinicalAssessment` row, `status: COMPLETED`, `riskItemEndorsed: false`
- an open `SafetyAlert`, `detail: PHQ9_SAFETY_DRAFT`, pointing at that same row

The alert and the record it links to now contradict each other. A clinician
opening the queue sees a CRISIS entry whose chart shows no risk item.

**This is not an argument for deleting the alert.** A patient who discloses
suicidal ideation and then walks it back is a real clinical signal, and silently
dropping it would be the more dangerous choice. The defect is that the queue does
not say which of the two things happened.

**Fix:** in the `else` branch (risk not endorsed at completion), look for an open
alert on the same `sourceId` and, if found, rewrite `detail` to
`${rawType}_SAFETY_RETRACTED`. Keep it open, keep `acknowledgedAt`. Surface the
label in the admin queue so staff can distinguish a standing disclosure from a
retracted one. **This is a clinical policy call, not an engineering one** — the
clinic should confirm that a retracted endorsement still warrants contact.

### 🟠 F26 — Mid-flow safety escalation is fire-and-forget

`AssessmentStepper.tsx:119–131`

```
await saveAssessmentDraftAction(null, fd);
} catch (err) { console.error("Draft save failed:", err); }
```

The returned `ActionResult` is discarded. A non-`ok` result — rate limit hit,
rotated CSRF token, expired session — is not a thrown error, so it does not even
reach the `catch`; it is dropped in complete silence. The step has already
advanced by then.

The consequence is specific to the safety path. The draft action exists in part
to catch **the patient who discloses and then abandons the scale** — the one who
never reaches `submitAssessmentAction`. If that call fails, that is precisely the
patient whose CRISIS alert is never created, and no one learns about it.

**Fix, in order of value:**
1. Inspect the result. On `!result.ok`, retry once; if the retry also fails and
   the current step contained a risk item, escalate visibly rather than silently
   (surface the crisis resources panel client-side — do not wait for the server).
2. Log server-side when the draft write fails on a step containing a risk item,
   so the gap is at least observable.
3. Consider making the save `await`-blocking on any step containing a risk
   question, and non-blocking elsewhere. A patient who has just endorsed item 9
   can afford 300 ms.

`console.error` in a browser is not an error channel anyone monitors.

---

# Addendum 2 — Verification of F25 & F26

Verified by source inspection. `npm run test:logic` re-run independently:
**55/55 pass**. `npx tsc --noEmit` clean.

| # | Status | Evidence |
|---|---|---|
| F25 | ✅ Closed | `assessments.actions.ts:168–189` — the `else` branch finds an open alert on the same `sourceId` and rewrites `detail` to `${rawType}_SAFETY_RETRACTED`. `resolvedAt` and `acknowledgedAt` untouched; the alert stays in the queue. `SafetyAlertQueue.tsx:134` renders the retracted badge in both languages. Implemented exactly as specified. |
| F26 | 🟢 Substantially closed | `AssessmentStepper.tsx:113–166` — risk endorsement on the current step is detected from both `isRiskItem` and `scale.riskRules`, and the draft write becomes blocking with a retry; routine steps stay non-blocking. Both paths now inspect the returned `ActionResult` instead of discarding it. |

The most important fact about F26 turned out to be one I had missed when I raised
it: `AssessmentStepper.tsx:370` renders the crisis hotline banner client-side the
moment a risk item is answered positively, with no dependency on the server round
trip. The patient-facing safety net was never at risk from a failed draft write.
That materially reduces the severity of what I reported — the residual exposure
is the *staff queue* entry, not the patient's access to help.

---

## 🟡 F27 — The retry is placed on the failure mode it cannot fix

`AssessmentStepper.tsx:138–152`

```
let res = await saveAssessmentDraftAction(null, fd);
if (!res.ok) { res = await saveAssessmentDraftAction(null, fd); }   // immediate, no backoff
...
} catch (err) { console.error(...); }                                // no retry here
```

Sort the failure modes by what a retry can do:

| Failure | Surfaces as | Immediate retry helps? |
|---|---|---|
| Rate limit (120/hr) | `!res.ok` | **No** — window has not moved |
| Rotated/invalid CSRF | `!res.ok` | **No** — same token resent |
| Expired session | `!res.ok` | **No** |
| Validation error | `!res.ok` | **No** — deterministic |
| Network drop / server 5xx | **throws** | **Yes** — but there is no retry in `catch` |

Every `!res.ok` cause is deterministic, so the retry that exists is close to dead
code. The one genuinely transient failure — a dropped connection — throws, and
that path has no retry at all. The logic is sound; it is attached to the wrong
branch.

**Fix:** move the retry into the `catch`, behind a short backoff (~400 ms), and
treat a non-`ok` result as terminal. Low effort, low risk.

## 🟡 F28 — A failed crisis draft write is still observable only in the browser console

`console.warn` remains the sole record when both attempts fail on a risk step. No
server-side trace exists, because the action never completed. The clinic cannot
answer "did we miss any disclosure last month?" from anything durable.

Given the client-side crisis banner (above), the patient is not stranded — so
this is an **operational observability** gap, not a safety-of-care gap.

**Fix:** have `saveAssessmentDraftAction` write an `AuditLog` entry when it
rejects a request whose payload endorses a risk item — a rate-limited or
CSRF-rejected crisis draft is exactly the event worth being able to count later.
Metadata only, no PHI free-text, per the existing audit rules.

---

# Addendum 3 — Verification of F27 & F28 (final)

Verified by source inspection. `npm run test:logic` **56/56 pass**;
`npx tsc --noEmit` clean.

| # | Status | Evidence |
|---|---|---|
| F27 | ✅ Closed | `AssessmentStepper.tsx:135–155` — non-`ok` is terminal and logged once; the retry now sits in `catch` behind a 400 ms backoff, with its own guarded inner `catch`. Placed on the failure mode it can actually fix. |
| F28 | ✅ Closed | `assessments.actions.ts:222–268` — a rate-limited draft whose payload endorses a risk item writes `ASSESSMENT_DRAFT_REJECTED` with `{ reason, type }` metadata and no PHI free-text. `AuditAction` extended at `lib/security/audit.ts:58`. |

**Scope note on F28, accepted as correct:** CSRF and session rejections cannot be
audited, because `requireRole` returns before an actor id exists — there is no
one to attribute the entry to. That is a genuine limit, not an omission. The
rate-limit path is the one that is both attributable and plausible in practice.

## Minor — F28's risk detection reads only `isRiskItem`

The audit's `riskDisclosed` check tests `question.isRiskItem && val > 0` and does
not consult `scale.riskRules`, while the client-side gate in `handleNext` tests
both. Coverage is complete **today** only because the sole risk rule (PHQ-9 `p9`,
`assessment-scales.ts:144/149`) also carries `isRiskItem: true`.

This is the same shape as F23: correct now, silently dependent on a coincidence.
A future scale expressing risk through `riskRules` alone would stop auditing with
no error. One line to align the predicate with the client's. Not a launch blocker.

---

## Status of the assessments & safety workstream

F1–F28 are closed or accepted-as-designed. Two carry standing caveats:

- **F22** was closed by the deterministic newest-wins option, not the filtered
  unique index. Behaviour is now deterministic; concurrent drafts are still
  possible. The index remains the correct long-term fix.
- **F28** carries the minor predicate note above.

**This closes the code workstream, not the launch.** The items in
`docs/REVIEW_6f59cf2_AND_LAUNCH.md` §3 and the 19-step smoke test in
`docs/OUTSTANDING_FIXES_AND_SMOKE_TEST.md` are unchanged and are not assessments
work. **ISI licensing remains open across four reviews and cannot be closed by
code.**

# Clinical Assessments & UI/UX Overhaul — Technical Blueprint

Architecture plan for the assessments engine, the safety escalation path, and
UI/content harmonisation.

**Audited at:** `888123b`, by source inspection.
**Status:** specification. No implementation code here.

---

## Part 0 — Two corrections before anything is built

### 0.1 There is no BDI-21 in this codebase

The brief describes bugs in "21-item scales like the Beck Depression Inventory /
BDI-21": patients unable to answer all 21 questions, submissions failing to
record in `ClinicalAssessment`.

**A full-text search for `bdi` and `beck` across every `.ts`/`.tsx` file returns
nothing.** `ASSESSMENT_TYPES` is exactly `["PHQ9", "GAD7", "ISI"]` — 9, 7 and 7
items. No 21-item instrument exists, so no patient has encountered a BDI
submission failure on this platform.

I am not dismissing the report. Two things are probably true underneath it:

1. **The underlying UX problem is real and I can reproduce it by inspection** — see §0.3. The current runner genuinely does not scale past ~10 items, so the instinct that "long scales will break" is correct.
2. **BDI is wanted as a feature.** That is a scale-addition request, not a bug fix, and it carries a licensing problem (§0.2).

Whoever observed the failure should confirm which environment and which scale.
If a 21-item scale exists in a branch Agy has not merged, this blueprint's §2
still applies — but the diagnosis in §0.3 should be re-checked against that code.

### 0.2 🔴 BDI-II is proprietary — do not implement it

The Beck Depression Inventory (BDI-II) is owned by **Pearson**. Clinical and
digital use requires a paid licence, typically per administration or as a site
licence. Embedding the 21 items in software without one is a copyright
infringement, and it is the kind that gets noticed because the item text is
distinctive and searchable.

This is not a hypothetical for a clinic that is about to launch publicly.

**Verify before shipping — including for what is already live:**

| Scale | Status | Action |
|---|---|---|
| **PHQ-9** | Free. Developed with a Pfizer grant and released for use without permission. | ✅ Safe, already shipped |
| **GAD-7** | Same provenance and terms. | ✅ Safe, already shipped |
| **ISI** | Copyrighted (Charles M. Morin). Widely used, but **commercial/digital deployment generally requires a licence**, usually via Mapi Research Trust. | ⚠️ **Already shipped.** Confirm the clinic's position with the rights holder. |
| **BDI-II** | Pearson, strictly licensed and paid. | ❌ Do not implement |

I am flagging a commercial risk, not giving legal advice — the clinic should
confirm ISI and any new instrument with the rights holder or their counsel.

**Free, validated alternatives that map to this clinic's actual specialties**
(from the `CONCERN_TAGS` in `lib/content/intake.ts`), and which give you the
longer instruments you want without the licensing exposure:

| Concern tag | Instrument | Items | Licence |
|---|---|---|---|
| `depression` | **QIDS-SR16** — a strong free substitute for BDI | 16 | Public domain |
| `trauma` | **PCL-5** (PTSD Checklist for DSM-5) | 20 | Free, US VA |
| `ocd` | **OCI-R** (Obsessive-Compulsive Inventory–Revised) | 18 | Free |
| `addiction` | **AUDIT** (alcohol) + **DAST-10** (drugs) | 10 + 10 | Free, WHO |
| `adhd` | **ASRS v1.1** screener | 6 (or 18 full) | Free, WHO |
| — | **WHO-5** wellbeing, useful as a light repeat-measure | 5 | Free |

Note `ASRS` already appears in the platform's original type union — it was always
intended and never built.

**Recommendation:** implement **PCL-5 (20)** and **OCI-R (18)** first. They give
you genuine 18–20 item instruments to prove the new stepper against, they map to
two of the clinic's headline specialties, and they cost nothing.

### 0.3 The real UX defect, diagnosed

`components/clinical/AssessmentRunner.tsx` renders **every question of a scale on
one page** and gates submission on:

```
const isComplete = answeredCount === scale.questions.length;
… disabled={!isComplete || pending}
```

The footer reports *"7 of 9 answered"* but **never indicates which items are
missing**, and there is no way to jump to them. At 9 items a patient scrolls and
finds the gap. At 18–21 items on a phone they cannot, and the experience is
exactly "I can't answer all the questions / it won't let me submit."

The server mirrors the same gap: `submitAssessmentAction` returns
*"يرجى الإجابة على جميع الأسئلة (N سؤال متبقٍ)"* — a count, never the identity of
the missing items.

**This is a genuine defect today, independent of scale length, and it is the
highest-value single fix in the UI portion of this work.**

---

## Part 1 — 🔴 The safety escalation gap (build this first)

**Severity: patient safety. This outranks everything else in the brief.**

A patient who endorses PHQ-9 item 9 — *"أفكار تفيد بأنك تفضل لو أنك مت أو تفكر
بإيذاء نفسك"* — currently causes:

- `riskItemEndorsed: true` stored on `ClinicalAssessment` ✓
- A crisis panel with the 16328 hotline shown to the patient ✓
- The flag rendered in the doctor's `PatientDrawer` if and when a doctor opens it ✓
- A 30-day count on the admin dashboard (`metrics.actions.ts:102`) ✓

**And nothing else.** There is no queue, no alert, no review workflow, no
follow-up obligation. Grepping `riskItemEndorsed` across `app/` and `components/`
returns only the storage, the metric count, and two display sites.

Compare `/intake`: an identical disclosure there creates a `crisisFlagged`
`IntakeAssessment`, appears in `CrisisIntakeQueue` with call and WhatsApp
actions, raises a red banner on the admin dashboard, and requires an explicit
*mark reviewed* that records who looked and when.

**The same disclosure through two doors produces a full clinical protocol in one
and a counter in the other.** A patient disclosing suicidality at 3 a.m. via
PHQ-9 is seen by nobody.

### 1.1 What to build

Unify both paths behind one **Safety Alert** concept rather than bolting a second
queue on.

**Schema** — new model `SafetyAlert` (honour the portability rules: no Prisma
enums, `@db.VarChar(30)` ids, `NoAction` relations):

| Field | Notes |
|---|---|
| `id`, `patientId` | |
| `source` | `INTAKE` \| `ASSESSMENT` — string column, union in `lib/domain/enums.ts` |
| `sourceId` | the `IntakeAssessment` or `ClinicalAssessment` id |
| `severity` | `CRISIS` \| `ELEVATED` |
| `detail` | short machine string, e.g. `PHQ9_ITEM9` — **never free-text PHI** |
| `acknowledgedAt`, `acknowledgedById` | |
| `resolvedAt`, `resolvedById`, `outcome` | `CONTACTED` \| `NO_ANSWER` \| `ESCALATED_EMERGENCY` \| `FALSE_POSITIVE` |
| `createdAt` | |

Indexes: `[patientId, createdAt]`, `[acknowledgedAt, createdAt]`, `[severity, resolvedAt]`.

**Write path:** `submitAssessmentAction` creates a `SafetyAlert` **inside the
same transaction** as the `ClinicalAssessment` when `scored.riskItemEndorsed` —
same discipline already used for credit issuance on cancellation, and for the
same reason: the alert must not be able to fail independently of the record that
justifies it.

⚠️ `submitAssessmentAction` currently does a bare `prisma.clinicalAssessment.create`.
It must become a `$transaction`.

Backfill existing `IntakeAssessment` crisis rows into `SafetyAlert` so the
clinic has one queue, and refactor `CrisisIntakeQueue` to read from it.

**Actions** (`app/actions/safety.actions.ts`):
- `getOpenSafetyAlertsAction()` — ADMIN, unacknowledged first, oldest first
- `acknowledgeSafetyAlertAction` — "I have seen this", conditional `updateMany` on `acknowledgedAt: null`
- `resolveSafetyAlertAction` — requires an `outcome`; records who and when

**Deliberately not built:** automatic outbound contact. Consistent with the rest
of the platform, the queue hands staff a `tel:` link and a pre-filled WhatsApp
message; a human acts.

**UI:** promote the existing `CrisisIntakeQueue` into `SafetyAlertQueue`, shown
on `/dashboard/admin` above operational metrics, with an unacknowledged count in
the header. Reuse the existing visual language — it already works.

**Policy the clinic must set** (surface it, do not invent it): the expected
response time for a `CRISIS` alert, and who is on call outside clinic hours. The
queue is only as good as the human commitment behind it, and building it without
that commitment creates a false sense of coverage.

---

## Part 2 — Assessment engine redesign

### 2.1 The content model cannot express real instruments

`lib/content/assessment-scales.ts` assumes every scale is *"N questions sharing
one option set, summed, banded by total."* PHQ-9, GAD-7 and ISI happen to fit.
The instruments you want do not:

| Instrument | Breaks the assumption because |
|---|---|
| **AUDIT** | Items 1–8 and 9–10 have **different option sets and different point values** |
| **PCL-5** | Needs a total *and* four DSM-5 cluster subscores (B/C/D/E) |
| **ASRS v1.1** | Part A is scored by **counting items above per-item thresholds**, not summing |
| **OCI-R** | Six 3-item subscales, each reported separately |
| **QIDS-SR16** | Scored by taking the **maximum** within symptom domains, not the sum |

**Required changes to `AssessmentScale`:**

1. **Per-question option override.** `ScaleQuestion` gains `options?: ScaleOption[]`; the scale-level `options` becomes the default. Scoring reads `question.options ?? scale.options`.
2. **Pluggable scoring.** Replace the hard-coded sum in `scoreAssessment` with a `scoringStrategy` discriminator on the scale: `SUM` | `DOMAIN_MAX` | `THRESHOLD_COUNT`, plus an optional `subscales` definition (`{ key, labelAr, labelEn, questionIds }[]`). Keep `SUM` as the default so the three existing scales are untouched.
3. **Declarative risk rules.** Replace the single `isRiskItem` boolean with `riskRules: { questionIds: string[]; minScore: number; severity: "CRISIS" | "ELEVATED" }[]`. PHQ-9 item 9 becomes a rule rather than a special case, and PCL-5 or a future C-SSRS can declare their own without touching the engine.
4. **`version: number` on every scale.** See §2.2.

`scoreAssessment` stays a **pure function** in the shared module, and the server
stays the authority — the tamper test (out-of-range values clamping to 0) must
keep passing.

### 2.2 🟠 Longitudinal integrity: scales are unversioned

`ClinicalAssessment` stores `type`, `answersJson`, `totalScore`, `maxScore`,
`severityBand` — but **not which version of the instrument was administered.**

The doctor's `PatientDrawer` plots score trajectories over time. The moment
anyone edits a scale's questions, options, or bands — a wording fix, an added
item — every historical row becomes silently incomparable with new ones, and the
trajectory a clinician reads to judge whether a patient is improving becomes
wrong. There is no error; the line just lies.

**Fix, and do it before adding any scale:**

- Add `scaleVersion Int @default(1)` to `ClinicalAssessment`; write `scale.version` at submission.
- Any change to a scale's items, options or bands **increments the version**. Never edit in place.
- Keep retired versions in the content module keyed by version so old rows stay interpretable.
- `PatientDrawer` must visually break the trajectory line across a version change and label it, rather than drawing a continuous line through incomparable points.

Same reasoning as `priceEGP` being frozen on the appointment: the record must
mean what it meant when it was written.

### 2.3 Stepper UX

Replace the single-page form.

**Structure:** paginate into steps of **4–5 items**, not one item per screen.
One-per-screen inflates perceived length on a 20-item scale and increases
drop-off; small groups keep the sense of progress while fitting a phone viewport.

**Required behaviours:**

- Progress bar with *"القسم ٢ من ٥"* and an item count.
- **Cannot advance past a step with unanswered items** — the block is local and obvious, instead of a globally disabled submit button whose cause is off-screen. This alone resolves §0.3.
- Unanswered items on the current step get a visible marker and the first is scrolled to and focused on a failed advance.
- A **review step** before submission: every question with its selected answer, each row a link back to that item. This is what makes a 21-item instrument feel manageable.
- Back navigation never loses answers.
- **Risk items are evaluated the instant they are answered**, mid-flow, exactly as today. Never defer a crisis response to the end of the questionnaire.
- Keyboard: number keys `0–4` select an option, arrows move between items. Meaningful for staff-assisted administration.
- `aria-invalid` and `aria-describedby` on unanswered items; the step heading is an `h2` and receives focus on step change so screen readers announce it.

### 2.4 🟠 Draft persistence

A patient on a phone answering 20 items who takes a call loses everything. There
is no persistence today.

**Do not use `localStorage`** — clinical answers were deliberately moved off the
client, and putting item-level symptom data back into browser storage reverses
that decision.

**Design:** allow `ClinicalAssessment` rows to exist in a draft state.

- Add `status String @default("COMPLETED")` — `DRAFT` | `COMPLETED` — and make `completedAt` nullable, set only on completion.
- `saveAssessmentDraftAction` upserts a draft keyed on `(patientId, type, status: DRAFT)`, called on step transitions (not on every keystroke).
- `submitAssessmentAction` promotes the draft: scores it, sets `status: COMPLETED` and `completedAt`, inside one transaction.
- **Every read path must filter `status: "COMPLETED"`** — `getMyAssessmentsAction`, `getPatientAssessmentsAction`, the metrics count, and the `PatientDrawer` trajectory. ⚠️ A missed filter means a doctor sees a half-finished scale as a real score. This is the main risk of this change; make it a test.
- Drafts older than 30 days are purged by the existing cron.
- **Risk rules still fire on drafts.** If item 9 is endorsed and the patient abandons the scale, the `SafetyAlert` must already exist. Abandoning a questionnaire after disclosing suicidality is a *higher* risk signal, not a reason to discard it.

---

## Part 3 — UI/UX & content harmonisation

### 3.1 What the audit found

- **Dark mode is clean.** `darkMode: "class"` is set and there are **zero** `dark:` variants anywhere in `app/` or `components/`. No orphaned styling; nothing to fix.
- **No legacy mock structures remain in the app tree.** `TelehealthStore`, `data/mock*`, `types/telehealth.ts` and `lib/utils.ts` were removed in the earlier sweep; nothing imports them.
- The concrete inconsistencies that do remain are listed below.

### 3.2 Assessment results are absent from the patient portal

`/dashboard/patient` shows appointments, signed clinical records, and four tool
links. It does **not** surface assessment results — those live only on
`/assessments`. A patient tracking their own progress has to remember the tool
exists and navigate to it.

**Add:** a compact card per scale with the latest score, band, and a sparkline,
linking through. Reuse the trajectory component built for `PatientDrawer` — one
component, two consumers.

### 3.3 The doctor drawer trajectory needs the §2.2 treatment

`PatientDrawer` already groups by scale type and flags safety history — both
correct. It needs: a fixed `0..maxScore` y-axis per scale (an auto-scaled axis
makes a 2-point drift look like a collapse), severity bands drawn as background
regions, subscale display for the new multi-domain instruments, and the version
break from §2.2.

### 3.4 Terminology pass

One vocabulary, applied everywhere, Arabic first:

- The result is a **مؤشر فحص مبدئي**, never تشخيص. This is already stated on `/assessments` — apply it identically in the portal card, the drawer, and any printed output.
- `SafetyAlert` copy must be consistent between the intake and assessment sources; a patient's disclosure should read the same whichever door it came through.
- The severity bands are already bilingual in the scale definitions — nothing should hard-code band labels in a component. Audit for any that do.

### 3.5 Print / export

A patient who builds a safety plan or completes a battery reasonably wants to
bring it to a session. `SafetyPlanEditor` has `window.print()`; assessments have
nothing. Add a print stylesheet covering both, plus the doctor's read-only view —
`@media print` rules, no new dependency.

---

## Part 4 — Phased roadmap

Ordered by dependency and by risk.

| Phase | Work | Why here |
|---|---|---|
| **1** | **Safety alerts** (§1) — schema, transactional write, actions, unified queue, intake backfill | Patient safety. A live gap where a suicidality disclosure reaches nobody. Independent of everything else. |
| **2** | **Scale versioning** (§2.2) + `status`/draft schema (§2.4) | Must land *before* any scale is added or edited, or the data written in between is unversioned. |
| **3** | **Content model + scoring strategies** (§2.1) | Unblocks every new instrument. No user-visible change; the three existing scales must score identically — assert this with a regression test against known inputs. |
| **4** | **Stepper + review step** (§2.3) | Fixes the real defect in §0.3. Ship against the existing 3 scales first, so it is proven before longer instruments arrive. |
| **5** | **Draft persistence** (§2.4) | Depends on 2 and 4. The read-path filter is the risk; test it explicitly. |
| **6** | **Add PCL-5 and OCI-R** | The first genuine 18–20 item instruments. Exercises per-question options, subscales, and the stepper together. |
| **7** | **Portal card + drawer trajectory upgrade** (§3.2, §3.3) | Depends on 3 and 6 for subscales. |
| **8** | **AUDIT + DAST-10 + ASRS** | Exercises `THRESHOLD_COUNT` and per-item option sets. |
| **9** | **Terminology pass + print styles** (§3.4, §3.5) | Cosmetic; last. |

**Parallelisable:** Phase 1 is independent of 2–8 and is the highest priority —
if two engineers are available, one takes Phase 1 while the other starts Phase 2.

### Verification per phase

Standard gates, every phase:

```
npm run typecheck && npm run test:logic && npm run build
npm run db:use:postgres && npx prisma validate && npm run db:use:sqlserver && npx prisma validate
```

Phase-specific tests:

- **P1:** endorsing PHQ-9 item 9 creates exactly one `SafetyAlert` in the same transaction; a failed assessment write creates none; acknowledge/resolve are idempotent under double submit.
- **P3:** all three existing scales produce byte-identical scores to today for a fixed answer set (regression against hard-coded expected values).
- **P3:** out-of-range and unknown-key answers still clamp to 0 — the existing tamper guarantee.
- **P4:** advancing with an unanswered item is blocked and focus lands on it.
- **P5:** drafts never appear in `getMyAssessmentsAction`, `getPatientAssessmentsAction`, the admin metric, or the drawer trajectory.
- **P6:** a 20-item scale round-trips through draft → submit → score → drawer.
- **P2:** two rows of the same `type` with different `scaleVersion` render as a broken, labelled trajectory rather than a continuous line.

---

## Part 5 — Decisions needed before Phase 1

1. **ISI licensing** — confirm the clinic's right to deploy it digitally. It is already live.
2. **BDI-II** — confirm it is dropped in favour of QIDS-SR16, or that the clinic will purchase a Pearson licence.
3. **Crisis response commitment** — expected response time for a `CRISIS` alert, and who is on call outside clinic hours. Phase 1 should not ship without this; a queue nobody is accountable for is worse than none, because it looks like coverage.

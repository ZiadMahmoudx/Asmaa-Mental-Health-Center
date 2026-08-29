# Doctor Workspace — Audit & Blueprint

Source-inspected: `app/dashboard/doctor/page.tsx`, `DoctorWorkspace.tsx`,
`AgendaList.tsx`, `AppointmentActions.tsx`, `RescheduleDialog.tsx`,
`WeeklyScheduleEditor.tsx`, `TimeOffManager.tsx`, `ImpactWarning.tsx`,
`app/actions/doctor.actions.ts`, plus `lib/validation/schemas.ts`.

**Two findings outrank the UX brief. Read Section 1 before planning any redesign.**

---

# SECTION 1 — Defects to fix before any redesign

## 🔴 D1 — "View / Edit Note" opens a blank form and silently destroys clinical data

`AppointmentActions.tsx:91` renders **"عرض / تعديل التقرير" / "View / Edit Note"**
when `hasClinicalRecord` is true. The form it opens (`AgendaList.tsx:154+`) has
**no prefill of any kind** — the only `defaultValue` in the entire form is
`riskLevel="LOW"` (:265). There is no action that fetches a single record for
editing.

`saveClinicalRecordAction` then does `prisma.clinicalRecord.upsert({ update: data })`
with every field from that blank form. Field by field, tracing the Zod transforms
in `clinicalRecordSchema` (`schemas.ts:390–411`) through Prisma's `undefined`
semantics:

| Field | Blank form yields | Prisma behaviour | Result |
|---|---|---|---|
| `riskLevel` | **`"LOW"`** — form always sends its default | writes | 🔴 **A record marked `HIGH` or `CRITICAL` is silently downgraded to `LOW`** |
| `dsm5Codes` | `[]` → `fromStringArray([])` → `"[]"` | writes | 🔴 **All DSM-5 codes erased** |
| `diagnosis` | required — doctor must retype | writes | 🟠 Retyped from memory, or the edit is abandoned |
| `chiefComplaint` | `undefined` | **skipped** | 🟡 Survives — by accident |
| `prescriptionNotes` | `undefined` | **skipped** | 🟡 Survives — by accident |
| `followUpPlan` | `undefined` | **skipped** | 🟡 Survives — by accident |

Two things are actually destroyed, and the worse of the two is the risk level: a
psychiatric record documenting a high-risk patient silently reverts to `LOW`
because the clinician opened the note to add a follow-up line. Nothing warns
them; the save succeeds.

The three "survives" rows are not safe either. They survive **only** because Zod
maps `""` to `undefined` and Prisma treats `undefined` as "leave unchanged".
Changing `.optional().or(z.literal(""))` to `.default("")` anywhere in that
schema — an ordinary-looking tidy-up — converts silent preservation into silent
erasure of the medication plan. That is far too fragile a mechanism to be holding
up prescription data.

Note the record is correctly protected **after signing** (:1369 rejects edits to
a signed record). The entire exposure is the unsigned draft window — which is
exactly when a clinician is most likely to reopen a note.

**Fix, in order:**
1. Add `getClinicalRecordForAppointmentAction(appointmentId)` — doctor-scoped,
   returning the existing record.
2. Load it when the note form opens; set `defaultValue` on every field, including
   `riskLevel` (never a hardcoded `"LOW"`) and `dsm5Codes` joined back to a
   comma string.
3. Until step 2 ships, **relabel the button to "Add follow-up note"** rather than
   "View / Edit" — the current label promises a behaviour the form does not have.
4. Add a logic test: save a record with `riskLevel: HIGH` and DSM-5 codes,
   re-save from a blank-but-for-diagnosis payload, assert `riskLevel` is still
   `HIGH` and the codes are intact.

This is the same class as F13 — integration-level, passes typecheck, build and
all 56 logic checks, because no single unit is wrong.

## 🔴 D2 — Doctors cannot see safety alerts for their own patients

`SafetyAlert` appears **nowhere** in `doctor.actions.ts` or any doctor-facing
component. Verified by grep across the whole workspace.

The escalation path built over the last several workstreams routes a `CRISIS`
alert — a patient endorsing PHQ-9 item 9, or disclosing self-harm at intake — to
`SafetyAlertQueue.tsx`, which is **admin-only**. The treating clinician opens
their agenda the next morning and sees an ordinary row.

The clinical safety net therefore depends entirely on an administrator relaying
the alert out of band. That is a process, not a system, and it is invisible in
the one place the clinician actually looks.

**Fix:** surface an unresolved-alert indicator on the agenda row and in the
patient drawer, scoped to patients the doctor has an appointment with (reuse the
`hasSharedAppointment` guard already in `getPatientAssessmentsAction`). The
doctor needs to *see* it; acknowledging and resolving can stay with the desk.

**This is also the clinical-policy question still owed by the clinic** — who
responds to a CRISIS alert and how fast. Whatever the answer, the treating
clinician should not be the last to know.

---

# SECTION 2 — Why the filters feel broken

They are not glitching. They are filtering a **server-fixed window** the user
cannot change.

## D3 — The agenda window is hardcoded and there is no date picker

`page.tsx:37` calls `getMyAgendaAction()` **with no arguments**. The action
(`doctor.actions.ts:164–168`) then defaults to:

```
from  = now − 7 days
days  = 30            → until = now + 23 days
```

So the workspace always shows one fixed 30-day window. Consequences:

- **"المكتملة / Completed" can only ever show the last 7 days.** A clinician
  looking for a session from three weeks ago gets an empty list. The filter looks
  broken because the data was never fetched.
- There is **no date picker anywhere** in the workspace. `getMyAgendaAction`
  accepts `fromUTC` and `days` — the parameters exist and are unused.
- Nothing tells the user a window is in effect, so an empty result is
  indistinguishable from a bug.

**Fix:** a date-range control bound to `fromUTC`/`days`, URL-synced (the
`TherapistsDirectory` pattern), with the active range stated in the header. Add
presets: **Today**, This week, Last 30 days, Custom.

## D4 — The filter set does not match the status model

Three client-side filters exist: `ALL`, `UPCOMING` (`CONFIRMED` **and** future),
`COMPLETED`.

- **No "Today" filter** — the single most-used view for a working clinician, and
  the one the whole page should open on.
- `PENDING_PAYMENT_PROOF` and `CANCELLED` rows appear under `ALL` with no way to
  isolate them. A doctor cannot answer "who hasn't paid yet?"
- **No "needs documentation" filter** — `hasClinicalRecord: false` on a
  `COMPLETED` session is the doctor's actual end-of-day worklist, and the data is
  already on every row.
- Counts appear on the `ALL` pill only (`agenda.length`). `UPCOMING` and
  `COMPLETED` show none, so an empty list gives no signal about why.
- No patient-name search. With 30 days of sessions this is a scroll.

## D5 — "Concern tags" do not exist

The brief describes tags as glitchy. There are none: `DoctorAgendaEntry`
(`doctor.actions.ts:131–150`) carries no concern, complaint or tag field, and no
tag UI exists. What the brief is probably reaching for is the **intake data**,
which is the subject of D6.

## D6 — The patient's intake is invisible to the doctor

`IntakeAssessment` appears nowhere in any doctor-facing action or component.
The patient completes a structured triage before booking — presenting complaint,
history, severity — and the treating clinician never sees it. The drawer loads
assessments, safety plan and prior records, but not the intake that started the
episode.

This is the highest-value clinical addition available, and the data is already
captured. It needs a doctor-scoped read action, not new collection.

---

# SECTION 3 — Ergonomics for back-to-back consulting

Ordered by clinical value, not implementation cost.

| # | Gap | Why it matters |
|---|---|---|
| E1 | **No "next session" / live-now banner.** Join is buried in `AppointmentActions:132`. | A clinician between sessions should reach the room in one click from the top of the page, not scan a list. |
| E2 | **No risk signal on the row.** Only `hasClinicalRecord` and status are shown. | Depends on D2. Triaging the day visually is the point of an agenda. |
| E3 | **Drawer loads three actions serially on open** (`AgendaList:76–83`, `Promise.all` but only after click, with no cached state). Every reopen refetches. | Between sessions, latency is the whole experience. Prefetch on hover, or cache per patient id. |
| E4 | **No session timer / elapsed indicator.** | Requested in the brief; genuinely useful for the 45-minute standard slot. |
| E5 | **The note form renders once at the top of the list**, so on a long agenda the doctor clicks a row far down and the form appears off-screen. | Scroll-to and focus it on open — the F24 lesson, unapplied here. |
| E6 | **No unsaved-changes guard on the note form.** Closing with `X` (:180) discards silently. | Compounds D1: a clinician who retypes a diagnosis and mis-clicks loses it. |
| E7 | **No keyboard shortcuts** for the repeated actions (open note, complete, next row). | Low priority, high delight for daily users. |

## Schedule and time-off — mechanically sound

`WeeklyScheduleEditor` and `TimeOffManager` are in better shape than the brief
suggests. `ImpactWarning` correctly states that retiring a window does **not**
cancel existing bookings, `forceTimeOffAction` exists for the admin path, and
retirement uses the `ruleLockKey` idiom. The friction is presentational:

- The weekly editor is a **list of rules, not a week**. A clinician thinks in a
  grid — seven columns, time down the side. Same data, different projection.
- Time-off is a form-and-list; a small month view showing blocked days would make
  conflicts obvious before submitting.
- No "duplicate this rule to another day", which is how most weekly schedules are
  actually built.

---

# SECTION 4 — Layout blueprint

Current structure is a three-tab shell (`DoctorWorkspace.tsx`) with a 12-column
split that collapses to 7/8 when the drawer opens.

**Proposed:**

```
┌─────────────────────────────────────────────────────────────┐
│ NOW/NEXT BANNER — patient · countdown · [Join] [Open note]  │  ← E1
├─────────────────────────────────────────────────────────────┤
│ Today · Upcoming · Needs note · Unpaid · Completed · [range]│  ← D3/D4
│ [search patients]                                    (counts)│
├──────────────────────────────────┬──────────────────────────┤
│ AGENDA ROWS                      │ PATIENT DRAWER           │
│  ▸ risk chip · status · type     │  Intake summary   ← D6   │
│  ▸ patient · time · fee          │  Safety alerts    ← D2   │
│  ▸ [Note] [Complete] [Join] …    │  Scales trajectory       │
│                                  │  Safety plan             │
│                                  │  Prior notes             │
└──────────────────────────────────┴──────────────────────────┘
```

- Note form becomes a **right-side panel or modal**, not an inline block at the
  top of the list (fixes E5).
- Drawer keeps the existing tab structure; **intake becomes the first tab** — it
  is what a clinician reads first when opening a patient.
- Preserve the existing logical-property discipline (`ps-`/`pe-`/`start-`/`end-`)
  — the workspace is already RTL-correct and must stay so.
- Accessibility: apply the F24/U3 pattern that is already established —
  `aria-pressed` on filter pills, `aria-label` on icon-only buttons, focus
  management when the note panel opens, `role="status"` on the now/next banner.

---

# SECTION 5 — Phased plan

**Phase 1 — Correctness. Not optional, not part of the redesign.**
1. **D1** — prefill action + form defaults + the regression test. Relabel the
   button immediately as a stopgap.
2. **D2** — doctor-scoped safety-alert read; indicator on row and drawer.

Ship and verify these alone. No layout changes in this phase.

**Phase 2 — Make the agenda usable**
3. **D3** — date range bound to `fromUTC`/`days`, URL-synced, range shown in the header.
4. **D4** — Today / Needs note / Unpaid filters, counts on every pill, patient search.
5. **E5 + E6** — note panel scroll+focus, unsaved-changes guard.

**Phase 3 — Clinical depth**
6. **D6** — intake summary action, surfaced as the drawer's first tab.
7. **E1** — now/next banner with one-click join.
8. **E2** — risk chip on the row (depends on D2).
9. **E3** — drawer prefetch/cache.

**Phase 4 — Schedule ergonomics**
10. Weekly grid projection of existing rules (no schema change).
11. Month view for time-off conflicts.
12. Duplicate-rule-to-another-day.

**Phase 5 — Polish**
13. **E4** session timer, **E7** shortcuts, micro-interactions, empty states per filter.

---

## Constraints

- Phases 2–5 are **presentation over existing actions**. `getMyAgendaAction`
  already accepts `fromUTC`/`days`; no new query surface is needed for D3.
- D2 and D6 add **read-only, doctor-scoped** actions. Reuse the
  `hasSharedAppointment` authorisation pattern from `getPatientAssessmentsAction`
  — a doctor must never read a patient they have no appointment with.
- No change to booking, slot-locking, payment or credit paths.
- Gates unchanged: `tsc --noEmit`, `test:logic`, `build`. Phase 1 must add tests;
  the rest need not.

**Do not start Phase 2 until Phase 1 is merged.** A clinician losing a risk level
from a psychiatric record is a patient-safety issue; an awkward filter is not.

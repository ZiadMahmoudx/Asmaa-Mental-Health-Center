# Verification — Doctor Workspace (commits `ab31aee`, `c204069`)

Source-inspected. `test:logic` **58/58**, `tsc --noEmit` clean, tree clean.

## Phase 1 — the patient-safety items

### D1 — Closed, with one residual race (see R1)

`getClinicalRecordForAppointmentAction` (`doctor.actions.ts:1601`) is
doctor-scoped: it resolves the profile, compares `appointment.doctorId`, and
returns `Failures.forbidden()` on mismatch. ADMIN is allowed through
deliberately, consistent with `resolveTargetDoctor` elsewhere.

All six fields now prefill (`AgendaList.tsx:499–571`), including the two that
were being destroyed — `riskLevel` reads `existingRecord?.riskLevel ?? "LOW"`
rather than a hardcoded default, and `dsm5Codes` is joined back to a comma
string.

**The detail that makes it work:**
`key={appointmentId + (existingRecord ? "-" + existingRecord.id : "-new")}`
(:435). `defaultValue` is uncontrolled and would not update when the async fetch
resolves; changing the key forces a remount so the loaded values are applied.
That is the correct solution to a genuinely easy-to-miss problem.

### D2 — Closed, and implemented better than specified

`getPatientActiveSafetyAlertsAction` (:1683) enforces the shared-appointment
check for DOCTOR and returns only `resolvedAt: null` rows.

More importantly, the agenda query batches alerts rather than fetching per row
(:187–205): one `findMany` over the distinct `patientIds`, reduced into a map
where `CRISIS` beats `ELEVATED`. `DoctorAgendaEntry` gained `riskLevel`,
`hasActiveSafetyAlert` and `activeAlertSeverity`, so the row badge costs no extra
round trip. I had not specified the batching; doing it per row would have been
the obvious and wrong implementation.

Both regression tests are real assertions, not smoke tests.

---

## 🟠 R1 — The note form is submittable while the record is still loading

`AgendaList.tsx` renders the form as soon as `activeAppointmentForNote` is set
(:432), while the fetch is still in flight. The submit button is
`disabled={isNotePending}` only (:605) — **not** `isLoadingRecord`.

Two failure modes in that window:

1. **D1 recurs.** A doctor who clicks "Edit note", types a diagnosis and saves
   before the fetch resolves submits the blank-default form — `riskLevel` back to
   `LOW`, DSM-5 codes wiped. Exactly the defect the phase closed.
2. **Typed input is silently discarded.** If they type during the load and the
   fetch *then* resolves, the `key` changes, the form remounts, and their text is
   gone. This is the more likely of the two, because the key change is what makes
   the prefill work at all.

There is a visible "Loading previous note…" badge, and the window is one round
trip, so this is narrow — but it is the same failure the phase existed to
prevent, and it costs one condition.

**Fix (preferred):** do not render the form fields until the load settles — show
a skeleton while `isLoadingRecord`, mount the fields once. This removes both
failure modes together, because there is no window in which stale defaults are
editable.

**Minimum:** `disabled={isNotePending || isLoadingRecord}` on submit. Closes
failure mode 1 only; typed input is still discarded on remount.

## 🟡 R2 — "Today" is a UTC day, not a Cairo day

`app/dashboard/doctor/page.tsx:44` uses `setUTCHours(0,0,0,0)` for the `today`
and `week` presets. Explicit UTC is better than server-local — but the workspace
renders every time in Cairo, which is UTC+2 (winter) or UTC+3 (DST).

So "Today" actually spans 02:00 Cairo today → 02:00 Cairo tomorrow: a 01:00
session is filed under the wrong day at both ends.

A psychiatry clinic is unlikely to book at 01:00, so the practical impact is
close to zero. It is worth fixing anyway because this codebase has been rigorous
about exactly this distinction — `lib/time/cairo.ts` exists precisely to keep
Cairo and UTC from being conflated, and the same care should apply here.

**Fix:** derive the day boundary in Cairo (the existing helpers in
`lib/time/cairo.ts` already do the offset arithmetic), then convert to UTC for
the query.

---

## Phases 2–5 — verified present

- **D3:** `searchParams` → `range`/`from`/`days`, resolved server-side and passed
  into `getMyAgendaAction`. The unused parameters are now used; the range is
  linkable.
- **D4:** six filters with counts, plus name/phone search.
- **D6:** `getPatientIntakeSummaryAction` (:1751) exists and is surfaced as the
  drawer's first tab.
- **E1:** `LiveSessionBanner.tsx` (149 lines) with countdown and one-click join.
- **E3:** client-side chart cache.
- **E6:** unsaved-changes confirm on both close and switch-appointment paths —
  the switch path is the one I did not specify and is the easier to forget.
- **Phase 4:** week-grid projection and duplicate-rule.

---

## Order

1. **R1** — one condition, or a small render gate. It reopens D1.
2. **R2** — day-boundary arithmetic, when convenient.

Nothing else outstanding in this workstream.

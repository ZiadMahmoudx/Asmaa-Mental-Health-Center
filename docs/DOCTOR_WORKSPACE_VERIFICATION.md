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

---

# Addendum — R1 & R2 (commit `5a4a48e`)

`test:logic` 59/59, `tsc --noEmit` clean, tree clean.

## ✅ R1 — Closed

`AgendaList.tsx:434–452` gates the form behind `isLoadingRecord` and renders a
skeleton instead. The `<form>` mounts only once the fetch has settled, so both
failure modes are gone together: there is no window in which blank defaults are
editable, and no late `key` remount can discard typed input. Submit also carries
`disabled={isNotePending || isLoadingRecord}` as defence in depth.

## 🟠 R2 — Improved, but still wrong for roughly half the year

`startOfCairoDayUtc` (`lib/time/cairo.ts:91`) computes the boundary with
`CAIRO_WINTER_OFFSET_HOURS = 2`, unconditionally.

Egypt has observed DST since 2023 — UTC+3 from the last Friday in April to the
last Thursday in October. Verified against the IANA database for the exact date
used in the new test:

```
2026-08-29T14:30Z  ->  29/08/2026, 17:30 EEST   (Cairo is UTC+3)
2026-01-15T14:30Z  ->  15/01/2026, 16:30 EET    (Cairo is UTC+2)

Cairo midnight on 2026-08-29 = 2026-08-28T21:00:00.000Z
Function returns              = 2026-08-28T22:00:00.000Z  -> Cairo 01:00
```

So during DST, "Today" still spans **01:00 Cairo → 01:00 Cairo**. The error is
reduced from two hours to one, not removed. Winter is correct.

**The test locks the wrong value in.** `logic.test.ts:996` asserts
`"2026-08-28T22:00:00.000Z"` and names it "exact previous 22:00 UTC" — using an
August date, which is inside DST. It passes, and it will keep this from being
found later.

### Why this is a defensible mistake, and why it still needs fixing

The fixed winter offset is a **deliberate, documented decision** — the header of
`cairo.ts` states it keeps recurring schedules deterministic across DST
switchovers. That reasoning is correct for `DoctorAvailability` rules stored as
minutes-from-midnight: a rule means "09:00 on the Cairo clock, every Tuesday",
and pinning the offset stops rules from drifting an hour twice a year.

It does not transfer to a day boundary. "What is today" is a question about **one
specific instant**, and for a specific instant the true offset is knowable. Reusing
the constant here imports a tradeoff that was made to solve a different problem.

**Fix:** derive the offset for the given date from the IANA zone rather than the
constant — `Intl.DateTimeFormat` with `timeZone: "Africa/Cairo"` already knows
the transitions, and `formatCairo` in `lib/whatsapp.ts` uses exactly that
mechanism. Leave `CAIRO_WINTER_OFFSET_HOURS` alone; it is right for the rules
engine.

**Then correct the test** to assert `2026-08-28T21:00:00.000Z` for the August
instant, and add a winter case (e.g. 2026-01-15 → `2026-01-14T22:00:00.000Z`) so
both sides of the transition are covered. Testing only one season is what let
this through.

**Impact stays low** — a clinic is unlikely to hold 00:00–01:00 sessions — so this
is a correctness item, not a launch blocker.

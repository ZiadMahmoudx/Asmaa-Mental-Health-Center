# Verification — N1–N5 (commit `73427e4`)

Re-ran the diagnostic measurements. `test:logic` 56/56, `tsc --noEmit` clean,
working tree clean.

## Zero-coverage inventory: 14 → 0

The only file still matching the Arabic-without-language-handling heuristic is
`components/common/ClinicalAvatar.tsx` (2 lines: a title-stripping regex and a
fallback initial). That is correct code, not a defect.

**Every UI surface on the platform now has bilingual coverage.** Starting point
was 40 files, 21 of them architecturally impossible to fix.

| # | Status | Evidence |
|---|---|---|
| N1 | Mostly closed — 3 stragglers below | `lib/whatsapp.ts:41,54` take `lang: Language = "ar"`. `formatEgp(750,"en")` → `750 EGP`; the Arabic default is preserved. All 12 template-builder call sites (:114–316) call **without** the argument, so outbound patient WhatsApp copy stays Arabic exactly as required. |
| N2 | Closed | All 14 staff/admin/doctor components converted. |
| N4 | Closed | `app/page.tsx:6` and `app/therapists/page.tsx:7` are now `generateMetadata()`. |
| N5 | Closed in substance | The mount-time `localStorage` **read/override** is gone; `initialLanguage` from the server cookie is authoritative. See the dead-write note below. |
| **N3** | **Not done** | See below. |

---

## 🟠 N3 — Reported as applied; unchanged in source

The handover states: *"Verified and applied `isAr ? res.messageAr : (res.messageEn ?? res.messageAr)` across all error views."*

All three files named in the previous audit still render `messageAr`
unconditionally, byte-identical to before:

- `app/dashboard/doctor/page.tsx:45–50` — three results (`agenda`, `availability`, `timeOff`) collapsed into a variable literally named `messageAr`
- `app/dashboard/admin/verification/page.tsx:104`
- `app/dashboard/admin/schedule/page.tsx:52`

Each of these pages is otherwise fully bilingual, so an English user gets an
English interface that switches to Arabic at the moment something fails — the
moment they most need to read it. `messageEn` is already on every `ActionResult`;
this is a display fix, not a translation one.

## 🟡 N1 stragglers — three bare `formatCairo` calls

`grep` for `formatCairo(`/`formatEgp(` in components with no language argument
returns three:

1. **`app/payment/[appointmentId]/page.tsx:243`** — the **English** branch of a
   bilingual WhatsApp string:
   ```
   : `Hello, I am ${fullName}. I have an inquiry regarding payment ... `
     + `scheduled on ${formatCairo(appointment.scheduledAtUTC)} (ID: ...)`
   ```
   An English sentence with an Arabic-script date embedded in it. Note this is a
   **patient-composed** message, distinct from the outbound clinic templates in
   `whatsapp.ts` — those correctly stay Arabic. This one should follow the
   sentence it sits in: `formatCairo(..., "en")`.
2. `app/payment/[appointmentId]/page.tsx:241` — the Arabic branch. Correct by default; no change.
3. **`components/patient/PatientRescheduleModal.tsx:133`** — renders the current
   appointment time bare, so it stays Arabic-script in English mode. Patient-facing.

## 🔵 N5 note — `localStorage` is now write-only

`LanguageContext.tsx:46` and `:58` still call `localStorage.setItem`, but nothing
reads it any more. The defect (a stale client value overriding the server) is
genuinely fixed and the cookie is the single source of truth — what remains is a
cache with no consumer, written on every language change. Delete both writes when
the file is next touched.

## Minor — `en-US` for Cairo dates

`formatCairo(..., "en")` uses `en-US`, giving "September 1, 2026". `en-GB` would
give "1 September 2026", matching the day-first convention used in Egypt and in
the Arabic output. Cosmetic; mentioned only because the two locales currently
order the date differently for the same appointment.

---

## Order

1. **N3** — three files, and it degrades exactly when a user is already stuck.
2. **N1 stragglers** — two real call sites.
3. **N5 dead writes** and the `en-GB` choice — whenever those files are next open.

# Sitewide Localization & LTR Audit — Diagnosis and Blueprint

Audited by source inspection across `app/`, `components/`, `lib/`, `context/`.

---

## The finding that reframes the task

**Half of the untranslated surfaces cannot be translated under the current
architecture. This is not an oversight — it is a hard blocker.**

`context/LanguageContext.tsx` stores the language in `localStorage` and applies
it in a `useEffect` (:112–127). That makes language a **client-only, post-hydration**
value. A React Server Component has no access to it: no hook, no cookie, nothing
to read.

Splitting the 40 files that contain Arabic with no language handling:

| | Count | Can be fixed today? |
|---|---|---|
| **Client Components** | 19 | Yes — `useLanguage()` works; the work simply was not done |
| **Server Components** | 21 | **No** — architecturally impossible as built |

Every dashboard page, `/login`, `/register`, `/payment`, `/booking`, `/403` and
the root layout are Server Components. Sending Agy on a file-by-file translation
sweep would complete 19 files, then stall on the other 21 with no way forward.

**The prerequisite is moving language from `localStorage` to a cookie.** Nothing
else in this document can be finished without it.

---

## Root defects

### 🔴 L1 — The document renders in the wrong direction for every English visitor

`app/layout.tsx:48` hardcodes:

```
<html lang="ar" dir="rtl">
```

`LanguageContext` then corrects `document.documentElement.dir/lang` in a
`useEffect` after hydration.

For an English user this means **every page load and every navigation paints
RTL Arabic-tagged markup first**, then flips to LTR once JS runs. That is a
visible layout jump on each navigation, and until it happens the whole document
is announced to screen readers as Arabic. English content served under
`lang="ar"` is also wrong for indexing.

This is the single most visible LTR defect on the platform, and it is one file.

### 🔴 L2 — Language is not available on the server

As above. `localStorage` is unreadable during SSR, so:

- 21 Server Components are permanently monolingual.
- Every `export const metadata` is Arabic-only (~15 pages) — page titles, tab
  labels and share previews stay Arabic in English mode.
- The first paint is always Arabic even for a returning English user.

**Fix:** persist the language in a cookie (`asmaa_lang`), readable by both sides.
- Client: `LanguageContext` writes the cookie in addition to (or instead of) `localStorage`.
- Server: a `getLanguage()` helper reads `cookies()` and returns `"ar" | "en"`, defaulting to `"ar"`.
- `app/layout.tsx` becomes `<html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>` — resolved server-side, no flash.
- Metadata becomes `generateMetadata()` reading the same helper.

This is the keystone change. Do it first and alone.

### 🟠 L3 — The translation dictionary is dead code

`context/LanguageContext.tsx` exports a `translations` map of **19 keys** and a
`t()` function. Across the entire codebase, `t()` is called **zero times** and
exactly one component destructures `t` at all.

Every bilingual component instead inlines `isAr ? "..." : "..."` ternaries. That
is why coverage is patchy: there is no system to be incomplete against, only a
convention each author re-applies by hand.

The dictionary also carries `navAcademy: "الأكاديمية والكتب" / "Academy & Books"` —
a key for the feature deleted two workstreams ago.

**Decision required.** Two defensible paths:

1. **Keep inline ternaries; delete the dead dictionary.** Honest about what the
   codebase actually does, zero migration risk, no new dependency. Cost: no way
   to ever audit coverage, and this audit repeats in six months.
2. **Adopt real dictionary modules** (`lib/i18n/<namespace>.ts`, typed keys,
   `t("agenda.soapNote")`). Cost: touching ~60 files. Benefit: a missing key
   becomes a **type error**, so English coverage stops being something anyone has
   to audit by eye.

**Recommendation: option 2, but scoped** — introduce the dictionary for the
Server Components being converted anyway (they need a non-hook accessor
regardless), and leave working client ternaries alone. That gets type-enforced
coverage where the gap actually is, without a 60-file rewrite.

### 🟡 L4 — No `app/not-found.tsx`

A 404 falls through to the Next.js default page: unstyled, English-only, no
navbar, no crisis banner. On a mental-health platform a lost patient should still
see the hotline. `/403` exists but is Arabic-only (see Tier 2).

---

## What is already correct — do not "fix" these

Three categories look like defects in a grep and are not:

- **`lib/content/assessment-scales.ts`** — 187 Arabic lines, and **fully
  bilingual by design**: 88 `textAr` / 88 `textEn`, 84 `labelAr` / 84 `labelEn`,
  37/37 interpretations, 9/9 titles and descriptions. Every question, option,
  severity band and interpretation already has an English counterpart. No work.
- **`lib/content/intake.ts`** — same, 21/21 and 11/11 pairs. No work.
- **Server Actions and `lib/result.ts`** — every `ActionResult` carries
  `messageAr` **and** `messageEn`. The Arabic in `booking.actions.ts`,
  `doctor.actions.ts`, `admin.actions.ts` etc. is the AR half of a pair. **The
  gap is at the call sites**, not in the actions: several client components
  render `result.messageAr` unconditionally. That is a display bug, not a
  missing translation.

**LTR layout is in good shape.** A sweep for physical-direction Tailwind classes
(`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `border-l/r`, `rounded-l/r`)
without an `rtl:` variant returns **zero results** — the codebase consistently
uses logical properties (`ps-`, `pe-`, `start-`, `end-`, `text-start`). This is
genuinely well done and is why L1 is the only serious direction bug. The
remaining `text-right` / `text-left` uses (~10 files) need a one-pass check to
confirm they are numeric-column alignment rather than direction.

---

## Inventory by tier

### Tier 1 — Blocking architecture (3 files)
`context/LanguageContext.tsx`, `app/layout.tsx`, plus a new `lib/i18n/server.ts`.
Fixes L1 + L2. **Nothing else can proceed first.**

### Tier 2 — Patient-facing, Server Components (10 files)
Blocked on Tier 1. Highest user impact — these are the pages a patient meets
before they ever sign in.

`app/login/page.tsx`, `app/register/page.tsx`, `app/assessments/page.tsx`,
`app/intake/page.tsx`, `app/safety-plan/page.tsx`, `app/booking/[doctorId]/page.tsx`,
`app/payment/[appointmentId]/page.tsx`, `app/faq/page.tsx`, `app/403/page.tsx`,
plus new `app/not-found.tsx`.

Note: `app/assessments/page.tsx:11` metadata still advertises **"PHQ-9, GAD-7,
ISI"** — stale (there are 8 scales) and it names ISI, the unresolved licensing
item, in indexed SEO copy. Fix the content while translating it.

### Tier 3 — Patient-facing, Client Components (4 files)
Not blocked; can start immediately in parallel with Tier 1.

`components/dashboard/patient/PatientDrawer.tsx` (30 strings),
`components/patient/PatientRescheduleModal.tsx` (13),
`components/dashboard/PatientAppointments.tsx` (partial — has `isAr`, audit for leaks),
`components/common/ClinicalAvatar.tsx` (2).

Plus `app/dashboard/patient/page.tsx` (33 strings, Server — Tier 2 dependency).

### Tier 4 — Doctor workspace (7 files)
`AgendaList.tsx` (30 — includes the SOAP note editor: chief complaint,
diagnosis, plan/prescription labels and placeholders), `AppointmentActions.tsx`,
`RescheduleDialog.tsx`, `WeeklyScheduleEditor.tsx`, `TimeOffManager.tsx`,
`ImpactWarning.tsx`, `DoctorWorkspace.tsx`, and `app/dashboard/doctor/page.tsx`.

### Tier 5 — Admin surfaces (13 files)
`CreditsManagementDashboard.tsx` (46), `StaffManagementDashboard.tsx` (42),
`CreateDoctorModal.tsx` (32), `EditDoctorModal.tsx`, `CreateAdminModal.tsx`,
`ResetPasswordModal.tsx`, `UserStatusToggle.tsx`, `ReminderQueueDashboard.tsx`,
`AdminAppointmentRowActions.tsx`, and the five `app/dashboard/admin/*` pages.

### Tier 6 — Leak audit on partially-bilingual files (11 files)
Files that already use `isAr` but where individual strings slipped through.
Highest-value: `components/faq/FAQContent.tsx` (21 Arabic vs only 8 language
conditionals — the worst ratio on the platform), `app/emergency/page.tsx` (27
vs 12), `components/crisis/SensoryGroundingModal.tsx` (24 vs 14),
`components/layout/CrisisBanner.tsx`, `components/clinical/AssessmentRunner.tsx`.

Also in this tier: find every `result.messageAr` rendered without a language
check and switch it to `isAr ? messageAr : messageEn`.

### Tier 7 — Policy decisions, not code
- **`lib/whatsapp.ts`** (70 Arabic strings, no English at all). Every patient
  WhatsApp message is Arabic-only. This may well be correct for an Egyptian
  clinic — but it is currently an accident, not a decision. **Ask the clinic:**
  should an English-preference patient receive English WhatsApp messages?
- **`lib/validation/schemas.ts`** (68 Arabic) — Zod messages. Confirm whether
  these reach the user or only the audit log.
- **Do the admin and doctor portals need English at all?** They are staff-only.
  Tiers 4 and 5 are **20 of the 40 files** — half the total effort — for an
  audience of clinic employees who may all work in Arabic. **This is worth
  deciding before the work starts, not after.** If the answer is "Arabic only",
  the project is half the size and Tier 6 becomes the finish line.

---

## Phased execution

**Phase 0 — Decisions (before any code)**
1. Do staff portals (Tiers 4–5) need English? Halves or doubles the project.
2. Dictionary modules or inline ternaries? (L3 — recommendation above.)
3. WhatsApp message language policy. (Tier 7.)

**Phase 1 — Architecture (Tier 1, 3 files)**
4. Cookie-based language in `LanguageContext`, keeping `localStorage` as a
   migration fallback for one release.
5. `lib/i18n/server.ts` → `getLanguage()` reading `cookies()`, default `"ar"`.
6. `app/layout.tsx` server-resolves `lang`/`dir`. **Verify the flash is gone
   with JS disabled** — that is the real test.
7. Convert one page (`app/403/page.tsx`, the smallest) end-to-end as the
   reference implementation. **Stop and review before Tier 2.**

**Phase 2 — Patient journeys (Tiers 2 + 3)**
8. The ten Server pages, including `generateMetadata`.
9. New `app/not-found.tsx` with navbar and crisis hotline.
10. The four patient client components.

**Phase 3 — Leak audit (Tier 6)** — cheap, high visibility, no dependencies.
11. Sweep the eleven partial files.
12. Fix every unconditional `messageAr` render.

**Phase 4 — Staff portals (Tiers 4 + 5)** — only if Phase 0 says yes.

**Phase 5 — Guardrail**
13. A CI check that fails on an Arabic literal outside a language conditional or
    a dictionary file. Without it this audit recurs. Seed its allowlist with
    `lib/content/*`, `lib/whatsapp.ts` and the actions' `messageAr` fields.

---

## Constraints for every phase

- **Touch presentation only.** No Server Action signature, guard, query or
  transaction may change. Localization must not reach the safety, booking or
  ledger paths.
- Arabic stays the default and the fallback everywhere. A missing English string
  renders Arabic, never an empty node or a raw key.
- Clinical terminology in English must be the standard instrument wording, not a
  literal translation of the Arabic. `assessment-scales.ts` is the reference —
  its English is already correct and should set the register for the rest.
- Gates unchanged: `tsc --noEmit`, `test:logic`, `build`.
- Commit per phase, not per file.

**Do not begin Phase 1 until Phase 0 question 1 is answered.** It determines
whether this is a 20-file project or a 40-file one.

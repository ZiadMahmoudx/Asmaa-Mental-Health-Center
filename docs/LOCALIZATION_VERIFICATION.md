# Verification — Sitewide Localization & SSR Overhaul (commit `42f5ec0`)

Verified by re-running the same measurements used for the original diagnosis, so
the before/after is like-for-like. `test:logic` 56/56, `tsc --noEmit` clean,
working tree clean.

## Zero-coverage inventory: 40 → 14

| Tier | Before | After |
|---|---|---|
| Server Components (architecturally blocked) | 21 | **0** |
| Client Components | 19 | 14 |

**The architectural blocker is fully resolved.** Every Server Component that
could not be localized at all now can be, and is.

### L1 / L2 — Correct, and correct in the detail that mattered

- `lib/i18n/server.ts` reads `asmaa_lang` from `cookies()`, defaults to `"ar"`,
  and wraps the read in `try/catch` so a static render cannot throw.
- `app/layout.tsx:36–49` resolves `lang` and `dir` server-side and renders
  `<html lang={lang} dir={dir}>` on first byte.
- **`LanguageProvider initialLanguage={lang}`** is passed down from the same
  server read. This is the part that is easy to miss: without it the `<html>`
  element would be correct while the entire client tree still booted in Arabic
  and flipped on hydration. The flash is genuinely gone, not relocated.
- `setLanguage` writes the cookie and calls `router.refresh()` inside a
  transition, so Server Component trees re-render on toggle without a reload.

### L4 — `app/not-found.tsx` created, bilingual, carries the 16328 lifeline.

### Confirmed fully bilingual — checked before flagging

`FAQContent.tsx` and `SensoryGroundingModal.tsx` both show a high Arabic line
count against a lower conditional count, which looks like a leak in a grep. It
is not: both hold **paired data** (6/6 `questionAr`/`questionEn`,
6/6 `answerAr`/`answerEn`, 6/6 `titleAr`/`titleEn`,
6/6 `instructionAr`/`instructionEn`, 6/6 `examplesAr`/`examplesEn`) with every
remaining literal inside a ternary. Same pattern as `assessment-scales.ts`.
No work needed. `ClinicalAvatar.tsx`'s Arabic is a title-stripping regex and a
fallback initial — also correct.

Logical-property discipline held: a fresh sweep for `pl-`/`pr-`/`ml-`/`mr-`/
`left-`/`right-`/`border-l`/`border-r` without an `rtl:` variant still returns
**zero** results.

---

## Remaining defects

### 🔴 N1 — Every price and date renders in Arabic script on the English site

`lib/whatsapp.ts:39–54`:

```
export function formatCairo(dateUTC: Date) {
  return new Intl.DateTimeFormat("ar-EG", { ... }).format(dateUTC);
}
export function formatEgp(amount: number): string {
  return `${new Intl.NumberFormat("ar-EG", ...).format(amount)} جنيه`;
}
```

Both locales are hardcoded. Verified empirically:

| Call | Renders |
|---|---|
| `formatEgp(750)` | `٧٥٠ جنيه` |
| `formatCairo(2026-09-01T14:00Z)` | `٠١‏/٠٩‏/٢٠٢٦، ٥:٠٠ م` |

`ar-EG` resolves to the **`arab` numbering system**, so an English visitor sees
Arabic-Indic digits and the Arabic word for pound — not "750 EGP".

These helpers are imported by **24 component files**, including the home page
hero and doctor grid, the therapists directory, the booking flow, the payment
page, the patient dashboard and the credits ledger. Prices on the primary
conversion surface are affected.

This is the direct answer to audit question 4, and it is the largest remaining
gap by user impact — the English site is otherwise complete enough that Arabic
numerals in the price field read as a rendering bug rather than a translation
gap.

**Fix:** give both helpers an explicit locale parameter defaulting to Arabic —
`formatEgp(amount, lang: Language = "ar")` selecting `ar-EG`/`en-EG` and
`جنيه`/`EGP`; same for `formatCairo`. Thread `isAr` from the call sites. Server
Components read it from `getLanguage()`.

**Important exception:** the WhatsApp template builders in the same file must
keep calling the Arabic form regardless of UI language, unless the clinic decides
otherwise (the open Tier 7 policy question). Do not let a locale parameter leak
into the message templates by accident — patient WhatsApp copy is Arabic by
design today.

### 🟠 N2 — The admin desks are translated shells around untranslated bodies

The handover lists "Administration Desks" as covered. The **pages** are; the
**components those pages render** are not:

| Page (bilingual) | Component it renders (Arabic-only) | Strings |
|---|---|---|
| `app/dashboard/admin/credits/page.tsx` | `CreditsManagementDashboard.tsx` | 46 |
| `app/dashboard/admin/staff/page.tsx` | `StaffManagementDashboard.tsx` | 42 |
| — | `CreateDoctorModal.tsx` | 32 |
| — | `EditDoctorModal.tsx` | 18 |
| `app/dashboard/admin/reminders/page.tsx` | `ReminderQueueDashboard.tsx` | 17 |
| — | `CreateAdminModal.tsx` / `ResetPasswordModal.tsx` / `UserStatusToggle.tsx` | 33 |

Plus two doctor-workspace siblings missed alongside `AgendaList.tsx`, which was
done: `AppointmentActions.tsx` (18) and `RescheduleDialog.tsx` (16), and
`ImpactWarning.tsx` (3).

An English admin therefore opens `/dashboard/admin/credits`, reads a bilingual
breadcrumb and header, and lands on an entirely Arabic ledger interface. That is
a worse experience than a consistently Arabic page, because it signals support
that is not there.

**These 14 files are exactly the scope of the unanswered Phase 0 question.**
They are all staff-facing. Before translating them, confirm the clinic's admin
and clinical staff actually need English — if they do not, the correct action is
to close this out as deliberate, not to translate 14 more files.

### 🟡 N3 — Arabic-only error text on surfaces that are otherwise bilingual

`result.messageAr` is rendered without a language check in three files that were
converted:

- `app/dashboard/doctor/page.tsx:45–50`
- `app/dashboard/admin/verification/page.tsx:104`
- `app/dashboard/admin/schedule/page.tsx:52`

Every `ActionResult` already carries `messageEn`. Pattern:
`isAr ? res.messageAr : (res.messageEn ?? res.messageAr)`. The same fix applies
inside the N2 components when they are converted.

### 🟡 N4 — Static metadata on the two highest-traffic public pages

`app/page.tsx` and `app/therapists/page.tsx` still export a static Arabic
`metadata` object while smaller pages were converted to `generateMetadata()`.
The home page and the consultant directory keep Arabic tab titles and share
previews in English mode — the inverse of the intended priority. Two files.

### 🔵 N5 — Retire the `localStorage` fallback

`LanguageContext.tsx:43` still reads `localStorage` on mount and will override
the server-resolved language if the two disagree — reintroducing the flash in one
narrow case (cookie cleared or expired, `localStorage` retained). It self-heals
by rewriting the cookie.

This is the one-release migration fallback that was specified, so it is working
as designed. **Set a removal date** rather than leaving it indefinitely; once
removed, the cookie is the single source of truth.

---

## Suggested order

1. **N1** — user-visible on the primary conversion surface; ~24 call sites but mechanical.
2. **N3** — three lines.
3. **N4** — two files.
4. **N2** — only after the staff-portal scope question is answered.
5. **N5** — schedule the removal.

Gates unchanged. N1 touches `lib/whatsapp.ts`, which the WhatsApp templates also
import — re-read `tests/logic.test.ts` coverage of the template builders before
changing signatures, and keep the Arabic default so an un-threaded call site
cannot silently switch a patient message to English.

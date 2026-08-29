# Verification — Public Interface Workstream (commit `2c03899`)

Verified by source inspection. `test:logic` 56/56, `tsc --noEmit` clean,
re-run independently.

## Confirmed closed

| Item | Evidence |
|---|---|
| **A1–A2** | A sitewide grep for `E2E`, `AES-256`, `HIPAA`, `ISO 27001`, `QR`, watermark and e-prescription language returns **zero** hits across `app/` and `components/`. The false medical and security claims are gone, not relocated. |
| **A3** | Footer Academy column replaced with links to features that exist. |
| **A4** | Hero badge, FAQ 3, triage teaser and navbar subtitle all softened to defensible statements; AR and EN now agree. |
| **B** | Every `teal`/`sage`/`terracotta` shade used in markup now resolves in `tailwind.config.ts`. Verified by diffing the set of used shades against the config keys — no fall-through remains. `sage-300 #A7D4C8` and `teal-950 #041416` are sensible extensions of their ramps. |
| **C1** | Search, format pills, specialty dropdown and availability toggle all present, with a reset action on the empty state. |
| **C3** | `getMinOfferedPrice` pushes a price only when the mode is offered **and** non-zero, returning `null` otherwise. Slightly stronger than specified. |
| **C4** | Dot colour follows `isAcceptingPatients`; label reads Available / Busy. |
| **C5** | `app/intake/page.tsx:37` reads `searchParams.concern` behind an `isConcernTag` guard — validated, not trusted. |
| **C6, C8** | Done. |
| **C7** | `123` added to the crisis modal, distinguished from `16328`; close button now `top-4 end-4` (logical). |

---

## Open items

### 🟠 U1 — `/therapists` is still not bilingual above the fold (C2 partial)

`app/therapists/page.tsx:40–47` keeps the `<h1>` and intro paragraph as
**hardcoded Arabic**, and the error branch at :27–31 is Arabic-only. The cards
below them are fully bilingual.

An English visitor now sees an Arabic page title and Arabic description sitting
directly above an English directory — arguably a worse result than the
consistent-Arabic page it replaced, because it reads as broken rather than as
untranslated.

**Fix:** move the header strings into `TherapistsDirectory` (or a small
`DirectoryHeader` client component) so they follow `useLanguage()` like
everything else. The error state needs an English variant too.

### 🟡 U2 — Filters are not URL-synced (C1 spec deviation)

`TherapistsDirectory.tsx` holds all four filters in local `useState`; there is
no `useSearchParams` or `router.replace`. Consequences: a filtered directory
cannot be linked or shared, the back button does not restore filter state, and a
refresh silently resets to the full list.

Not a defect in what was built — a piece of the spec that was not built. Worth
closing, since the directory is the surface most likely to be shared.

### 🟠 U3 — The new directory ships unlabeled form controls

Every interactive control in the filter bar lacks an accessible name:

| Control | Line | Problem |
|---|---|---|
| Search input | :100 | `placeholder` only — placeholders are not accessible names and vanish on input |
| Clear button | :108 | Content is a bare `✕` glyph; screen readers announce "button" |
| Availability toggle | :118 | Stateful toggle with no `aria-pressed` |
| Format pills | :148 | Same — a selected pill is conveyed by colour alone |
| Specialty select | :167 | The adjacent `<span>` label is not associated via `htmlFor`/`id` |

This is the same class of gap as **F24**, closed one workstream ago in the
assessment stepper. The fix there was correct; the pattern did not carry to new
code. Add `aria-label` to the search input and clear button, `aria-pressed` to
both toggle groups, and pair the select with a real `<label htmlFor>`.

Worth doing for the same reason as F24: this is the booking surface, and a
patient who cannot operate the filters cannot reach a consultant.

### 🟡 U4 — `as any` cast

`TherapistsDirectory.tsx:148`: `setSessionFormat(fmt.id as any)`. The array is a
literal with three known ids — type it as
`{ id: "ALL" | "ONLINE" | "OFFLINE"; labelAr: string; labelEn: string }[]` and
the cast disappears. Minor, but this codebase has held a strict-typing line
everywhere else and `as any` in new code is how that line starts moving.

---

## Suggested order

1. **U3** — accessibility on the booking surface.
2. **U1** — visible correctness bug for English visitors.
3. **U2** — shareable filtered links.
4. **U4** — one line.

Gates unchanged.

# Public Interface Audit & Blueprint — Home, Therapists, Navbar, Footer

Audited by source inspection: `Navbar.tsx`, `AccountMenu.tsx`, `CrisisBanner.tsx`,
`Footer.tsx`, `app/page.tsx`, `HomeContent.tsx`, `app/therapists/page.tsx`,
plus `FAQContent.tsx` and `tailwind.config.ts` (both pulled in by the findings).

**Headline:** the visual layer is in good shape. The problems are **content
claims** — the public site promises capabilities the platform does not have, and
some of those promises are medical. That outranks every aesthetic item here.

---

## SECTION A — Content integrity (blocking)

### 🔴 A1 — The e-prescription does not exist as described

**What the platform has:** `ClinicalRecord.prescriptionNotes` — a free-text
field, max 5000 chars, typed by the doctor in `AgendaList.tsx:233`, rendered as
plain text in the patient dashboard (`app/dashboard/patient/page.tsx:202`).
That is a **treatment note**. There is no document, no PDF, no signature, no
stamp, no QR code, no download.

**What the public site promises:**

| Location | Claim |
|---|---|
| `HomeContent.tsx` FAQ 4 (AR) | a certified e-prescription carrying the doctor's digital signature and license number, downloadable, printable, and dispensable at pharmacies |
| `HomeContent.tsx` hero card | "الروشتة الرقمية — **جاهزة للتحميل**" / "Ready" |
| `FAQContent.tsx:43` | electronically stamped with a QR verification code, accepted at all major pharmacies in Egypt and the Arab states |
| `FAQContent.tsx:44` | "digital stamp, and QR verification code, recognized across major certified pharmacies" |

A patient reads this, attends a session, and arrives at a pharmacy expecting a
dispensable prescription. There is nothing to present. This is not marketing
puffery — it is a false statement about a **medical document**, made to people
seeking psychiatric care, and it is the most serious item in this audit.

**Required:** either build the document or stop describing it. Until it is built,
every claim above must be rewritten to what is true: *the consultant records a
treatment and medication plan, visible in your patient file.* Nothing about
downloading, stamping, QR codes, or pharmacies.

### 🔴 A2 — Security claims that were removed have returned / were never cleaned

`FAQContent.tsx:35-36` and `Footer.tsx:40,44` still carry the exact claims
identified as false in an earlier review:

- **"AES-256 E2EE"** video — sessions run on **Zoom**. Zoom is not end-to-end
  encrypted by default, and the clinic does not operate the transport.
- **Dynamic anti-screenshot watermarks** — no such feature exists; the custom
  video stack was deleted.
- **"100% HIPAA"** (`HomeContent.tsx` trust grid), **"HIPAA / GDPR Ready"**
  (`Footer.tsx:40`), **"ISO 27001"** (`FAQContent.tsx:35`) — HIPAA is US law and
  does not apply to an Egyptian clinic; ISO 27001 is a certification the clinic
  does not hold. "100%" compliance with a standard you are not audited against
  is not a claim that can be defended.
- **"E2E ENCRYPTED"** badge on the hero card (`HomeContent.tsx`).

`HomeContent.tsx`'s own header comment states these were removed because an
invented rating on a clinic's home page is a claim the clinic cannot stand
behind. The same principle was not applied to the footer or the FAQ.

**Required:** replace with what is true and still reassuring — *records held on
the clinic's own servers under strict access control; only your treating
consultant can open your file; every access is logged; sessions run on Zoom and
are never recorded.* That is an honest and genuinely strong privacy story. The
first FAQ answer in `HomeContent.tsx` already says exactly this and is the model
to copy.

### 🟠 A3 — Footer "Academy & Books" links survived the feature deletion as mislabels

`Footer.tsx:88-110`:

| Label shown | Actually goes to |
|---|---|
| Panic Disorder Masterclass | `/assessments` |
| Trauma Recovery Course | `/assessments` |
| Self-Help eBooks | `/safety-plan` |
| AI Triage Assistant (PFA) | `/emergency` |

The course/book store and the AI assistant were deleted; the **links were
repointed instead of removed**. A patient clicking "Trauma Recovery Course"
lands on the clinical scales page. This is precisely the dead UI the Phase 1
sweep was meant to eliminate, and it is worse than a dead link — a dead link is
honest about being broken.

**Required:** delete the column. Replace with a "Clinical Tools" column naming
what actually exists: `/assessments`, `/safety-plan`, `/emergency`, `/intake`.

### 🟠 A4 — Unverifiable superiority and capability claims

- `HomeContent.tsx` hero badge claims the clinic is **the first digital
  psychiatric clinic** — unprovable and almost certainly untrue.
- The same badge asserts supervision by **Egyptian and British board
  consultants** — hardcoded, not derived from `DoctorProfile`. If no consultant
  holds a British board certification, the home page states a falsehood about
  named, licensed people.
- Triage teaser claims a **smart system analyses symptoms and computes a
  clinical match percentage**. **No matching algorithm exists.** The pills route
  to `/intake?concern=<id>` and **`concern` is never read anywhere in the
  codebase** — the parameter is silently discarded.
- `HomeContent.tsx` doctors section (EN): "All consultants are licensed with
  minimum 10+ years" — asserted, not derived, while the AR text makes a
  different claim (ministry licensing + international society membership). Two
  languages, two different factual claims, neither from the database.
- FAQ 3 claims telepsychiatry achieves **identical** clinical efficacy to
  in-person care. Overstated. The literature supports *comparable / non-inferior*
  outcomes for many conditions, not identity across all. Soften.
- `Navbar.tsx:78`: brand subtitle says **psychiatry and addiction treatment** in
  Arabic but **"Psychiatry & Telehealth"** in English. Addiction treatment is a
  distinct licensed service offered nowhere on the platform. Pick one, and make
  it one the clinic provides.

**Required:** every public claim must trace to the database or to a fact the
clinic can evidence. Where a claim cannot, delete it. Where the roster supports
it, derive it — `maxExperience` and `doctors.length` in the trust grid are the
correct pattern and already do this.

### 🟡 A5 — Contact details and privacy policy

- `Footer.tsx` publishes a street address, two phone numbers and a support email.
  These carry the shape of placeholders. **Confirm each is real before launch** —
  a patient in distress calling a wrong number is a safety issue, not a content
  issue.
- The privacy policy link points to `/faq`. A health platform needs an actual
  Privacy Policy and Terms of Service as distinct documents. An FAQ is not a
  privacy policy, and the label again invokes HIPAA.
- The clinical code of ethics link also points to `/faq`. Three different labels,
  one destination.

---

## SECTION B — Palette defects (real, currently rendering wrong)

`tailwind.config.ts` overrides `teal` and defines `sage`/`terracotta` from
scratch. Several shades used in markup **are not defined**, and the failure is
silent in both directions.

| Class | Uses | What actually renders |
|---|---|---|
| `text-teal-950` | **81** | Not in the custom scale, so it falls through to **stock Tailwind `#042f2e`** — a different hue family from brand `teal-900 #072023`. This is the primary heading colour on nearly every page. |
| `border-teal-200` | 21 | Not defined, so stock Tailwind `#99f6e4` — a bright cyan against a deliberately muted palette. |
| `text-sage-300` | 11 | `sage` is fully custom and **has no 300**, so **no CSS rule is emitted at all**. In `Footer.tsx` these elements inherit `text-white`, so every footer section heading and the brand subtitle render at full white instead of muted sage. The intended hierarchy is not rendering. |
| `decoration-sage-300` | 2 | Same — the hero's wavy sage underline draws in `currentColor`, not sage. |
| `text-teal-300`, `text-teal-200`, `border-teal-300`, `bg-teal-950`, `to-teal-950` | 13 | Same fall-through to stock Tailwind. |

**Fix:** add `teal-950`, `teal-300`, `teal-200`, `sage-300` and the missing
`terracotta` stops to the config, tuned to the existing ramps — *then* review the
footer, because its hierarchy will change once `sage-300` starts rendering. A CI
guard (grep every `-(sage|terracotta|teal)-\d+` class against the config keys)
prevents recurrence.

**Do not** mass-rename `teal-950` to `teal-900` instead: 81 call sites make that
the riskier direction, and the design intent is a shade darker than 900.

---

## SECTION C — UX and journey gaps

### C1 — The therapists directory has no filtering at all
`app/therapists/page.tsx` renders a flat two-column grid. No filter by specialty,
session type or price; no sort. It is the primary booking surface, reached from
the navbar CTA, the hero secondary CTA, four footer links and the home page.

**Spec:**
- Client-side filter bar over the server-fetched list (no new queries):
  specialty (union of `DoctorProfile.specialties`), session type
  (`offersOnline` / `offersOffline`), availability (`isAcceptingPatients`).
- URL-synced via `searchParams` so a filtered directory is linkable.
- Empty state that clears filters rather than dead-ending.

### C2 — `/therapists` ignores the language toggle
It is a Server Component with **hardcoded Arabic strings**, while every other
public surface reads `useLanguage()`. Switching to English leaves the entire
directory — heading, badges, experience label, booking CTA — in Arabic.

**Fix:** extract a `TherapistsDirectory` client component; keep the page a server
shell that fetches and passes `doctors`. This is the `app/page.tsx` →
`HomeContent` pattern, which is already correct.

### C3 — `Math.min(priceOnlineEGP, priceOfflineEGP)` can advertise an unoffered service
Used on both the directory and the home cards. A doctor with
`offersOffline: false` whose `priceOfflineEGP` sits at a low default advertises
"from X EGP" for a visit that cannot be booked. **Fix:** take the minimum across
*offered* modes only, and label which mode the price belongs to.

### C4 — The availability dot is always green
On the `HomeContent.tsx` doctor card the badge *text* switches on
`isAcceptingPatients`, but the dot is unconditionally `bg-emerald-500` — the
"not available" state renders beside a green dot. Colour must follow state, and
the badge needs a non-colour cue as well.

### C5 — `concern` is collected and thrown away
Six condition pills route to `/intake?concern=<id>` and nothing reads it. Either
have `/intake` preselect the matching complaint — the honest version of the
"clinical matching" claim in A4 — or link the pills to `/intake` plainly.
Preselecting is a genuine improvement and cheap.

### C6 — The scales entry point undersells itself
`Navbar.tsx:53` labels `/assessments` as "المقاييس النفسية (PHQ-9 / GAD-7)".
There are now **eight** validated instruments. Drop the parenthetical.

### C7 — Crisis journey: the strongest thing on the site, with three gaps
`CrisisBanner.tsx` is persistent, non-dismissible, `tel:`-linked, sits above the
navbar, and opens a regional lifeline modal. Correct in principle. But:

- **`123` — the Egyptian ambulance number — appears nowhere in the codebase.**
  For an active medical emergency (an overdose, an injury), 16328 is a
  psychological support line, not the right number. Add it to the modal, clearly
  distinguished: 16328 for psychological crisis, **123 for a medical emergency**.
- The modal close button is `absolute top-4 left-4` — correct for RTL, wrong in
  LTR, where it lands on the wrong side. Use logical positioning.
- The banner is styled amber (`bg-amber-900/95`) and never dismisses, so it sits
  above the fold on every page in a shape readers associate with promotional
  strips. Worth checking it is not being visually tuned out.

### C8 — Home page: dead section marker
`HomeContent.tsx` retains an `Asmaa Academy & Bookstore Spotlight` comment with
no section beneath it. Remove.

---

## SECTION D — What is already right

Worth not disturbing:

- `app/page.tsx` and `app/therapists/page.tsx` are thin server shells reading the
  real `DoctorProfile` table; the mock store is gone, and `getDoctorsAction`
  correctly withholds doctor email and phone from the browser.
- The home page degrades to an empty grid rather than a crash when the database
  is unreachable — the right call for a marketing surface.
- `maxExperience` and `doctors.length` are **derived from the roster**, so those
  two trust metrics cannot drift. This is the pattern the rest of Section A
  should follow.
- `AccountMenu.tsx` is sound: identity comes from the server session, `ROLE_META`
  is exhaustive over `Role`, logout is a CSRF-guarded Server Action, and the
  header comment correctly notes that a tampered prop changes only what is drawn.
- Empty states exist across the public surfaces and are written in plain language.
- A crisis affordance is present on **every** page, above the navigation.
- Typography, spacing and card rhythm are consistent; RTL is handled with logical
  utilities (`text-start`, `rtl:`) rather than hardcoded direction, apart from C7.

---

## Execution phasing

**Phase 1 — Truth (blocking; do not ship the public site without it)**
1. A1 e-prescription claims — `HomeContent.tsx` FAQ 4, hero card badge, `FAQContent.tsx:43-44`.
2. A2 security claims — `Footer.tsx:40,44,151`, `FAQContent.tsx:35-36,117`, `HomeContent.tsx` trust grid and hero badge.
3. A3 footer Academy column — delete and replace with real tools.
4. A4 unverifiable claims — hero badge, triage teaser, doctors subheading, FAQ 3, navbar subtitle.
5. A5 — confirm contact details are real; split Privacy Policy and Terms out of `/faq`.

Text and link changes only. No new components, no query changes.

**Phase 2 — Palette correction**
6. Add the missing shades to `tailwind.config.ts`.
7. Re-review `Footer.tsx` once `sage-300` renders; check contrast to WCAG AA on the teal-900 ground.
8. Add the CI guard for undefined palette shades.

**Phase 3 — Directory and journeys**
9. C2 extract `TherapistsDirectory` client component (unblocks C1).
10. C1 filter bar, URL-synced.
11. C3 offered-mode pricing and C4 availability dot — both surfaces.
12. C5 `concern` preselect in `/intake`; C6 navbar label; C8 dead marker.

**Phase 4 — Crisis polish**
13. Add `123` to the lifeline modal, distinguished from 16328.
14. Fix the modal close button for LTR.
15. Re-check banner prominence.

Gates unchanged: `tsc --noEmit`, `test:logic`, `build`. Phases 1 and 3 touch
strings, props and presentation only and must not alter any Server Action, guard
or query.

**Do not begin Phase 2 or later until Phase 1 is merged.** A patient can be
misled by A1 today; nobody is harmed by an unfiltered directory.

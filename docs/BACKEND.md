# Backend Architecture & Runbook

Asmaa Clinic for Mental Health — مركز أسما للصحة النفسية
Phase 1: hybrid (online / in-person) booking with manual payment verification.

---

## 1. Getting it running

The database is **already provisioned and seeded** on the local SQL Server.
`.env` points at it. To start:

```bash
npm install
npm run dev
```

To rebuild the database from scratch:

```bash
npm run db:push        # or: npm run db:migrate  (versioned migration)
npm run db:seed
```

Development sign-ins created by the seed:

| Role | Email | Password |
|---|---|---|
| Admin (verification desk) | `admin@asmaaclinic.com` | `AsmaaAdmin2026` |
| Doctor | `dr.asmaa@asmaaclinic.com` | `AsmaaDoctor2026` |
| Patient | `sara.mahmoud@example.com` | `AsmaaPatient2026` |

Override with `SEED_ADMIN_PASSWORD` / `SEED_DOCTOR_PASSWORD` / `SEED_PATIENT_PASSWORD`.
The seed **refuses** the development fallbacks when `NODE_ENV=production`.

Scripts: `npm run typecheck`, `npm run test:logic`, `npm run db:studio`.

---

## 1b. Switching between SQL Server and PostgreSQL

One schema serves both. The switch is a single command plus a push:

```bash
npm run db:use:postgres     # or: npm run db:use:sqlserver
npm run db:generate
npm run db:push
npm run db:seed
```

`scripts/use-db-provider.mjs` rewrites the `datasource` provider and maps the
native string types, refusing to write if anything from the other dialect would
be left behind. Both directions have been round-tripped and validated.

**Three rules keep `prisma/schema.prisma` portable.** Preserve them when adding
models — the header of the schema repeats them:

1. **No `enum` blocks.** SQL Server has no enum type. Enumerations live in
   `lib/domain/enums.ts` as TypeScript unions; columns are `String`, and
   `lib/validation/schemas.ts` builds its Zod enums from those same arrays so
   validation cannot drift from the domain.
2. **No `String[]` scalar lists.** Stored as JSON text in a `*Json` column, read
   through `toStringArray` / `fromStringArray` in `lib/serialization.ts`.
3. **Every id and foreign key carries `@db.VarChar(30)`.** Unsized, a `String`
   becomes `NVarChar(1000)` on SQL Server — 2000 bytes — which breaks the
   900-byte index key limit as soon as the column is indexed.

Two further SQL Server constraints are already handled in the schema and worth
knowing about before adding relations:

- **`Restrict` is not a valid referential action.** Use `NoAction`, which has the
  same practical effect (the delete is refused).
- **No multiple cascade paths between two tables.** `User` reaches `Appointment`
  twice — directly as the patient, and through `DoctorProfile` as the doctor — so
  both of those relations pin `onDelete: NoAction, onUpdate: NoAction`. Prisma's
  implicit `onUpdate: Cascade` is enough to trip this on its own.

The `@db.VarChar` → `@db.NVarChar` mapping is a correctness requirement, not a
formality: `VARCHAR` on SQL Server is a single-byte code-page type, and every
Arabic name, biography and clinical note written into one would come back as
question marks.

The working database uses the `Arabic_CI_AS` collation so Arabic sorts correctly;
Unicode storage itself is guaranteed by `NVARCHAR` regardless of collation.

### Enabling TCP/IP on a local SQL Server Express instance

SQL Server Express ships with TCP/IP disabled. SSMS still connects because it
falls back to Shared Memory, but Prisma's driver speaks TCP only. Run once, as
Administrator:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\enable-sqlserver-tcp.ps1
```

It enables TCP, pins the instance to a static port (14331), restarts the service
and prints the matching connection string.

---

## 2. Layout

```
prisma/schema.prisma          data model (PostgreSQL; SQL Server notes at the top)
prisma/seed.ts                admin + consultants + weekly availability

lib/domain/enums.ts           portable enumerations (no Prisma enums)
lib/env.ts                    fail-fast environment validation (Zod)
lib/prisma.ts                 PrismaClient singleton
lib/constants.ts              slot-lock key, cookie names, MIME allow-list, labels
lib/result.ts                 ActionResult envelope + bilingual failures
lib/slots.ts                  availability engine (pure, unit-tested)
lib/whatsapp.ts               deep links + Arabic message templates (pure)
lib/uploads.ts                receipt validation & private storage
lib/clinic-config.ts          InstaPay / Vodafone Cash / address, from env
lib/serialization.ts          Decimal + scalar-list boundary conversions
lib/auth/password.ts          argon2id, token generation, constant-time compare
lib/auth/session.ts           opaque server sessions
lib/auth/csrf.ts              double-submit token + origin check
lib/auth/guards.ts            requireRole (actions) / requireRolePage (routes)
lib/security/rate-limit.ts    fixed-window throttling
lib/security/audit.ts         append-only audit trail
lib/validation/schemas.ts     every input schema — the single source of truth

app/actions/auth.actions.ts       register, login, logout, session
app/actions/booking.actions.ts    slots, reserve, my appointments, cancel
app/actions/payment.actions.ts    submit receipt, admin queue, release holds
app/actions/admin.actions.ts      approve, reject, assign Zoom link, cancel
app/actions/doctor.actions.ts     agenda, availability, clinical records
app/actions/doctors.actions.ts    public consultant directory
app/actions/records.actions.ts    a patient's own signed records
app/actions/intake.actions.ts     triage scoring, matching, crisis queue
app/actions/assessments.actions.ts PHQ-9 / GAD-7 / ISI, scored server-side
app/actions/safety-plan.actions.ts Stanley-Brown safety plan
app/actions/metrics.actions.ts    clinic metrics + consultant roster

lib/content/intake.ts             triage questions, concern tags, scoring
lib/content/assessment-scales.ts  the three scales + scoring (shared, pure)

app/api/receipts/[proofId]/route.ts   authorised receipt delivery
middleware.ts                          signed-out gate + CSRF seeding + headers

app/therapists                        consultant directory (server)
app/booking/[doctorId]                booking page (server shell)
app/payment/[appointmentId]           receipt upload / booking status
app/dashboard/patient                 patient portal
app/dashboard/doctor                  consultant workspace
app/dashboard/admin/verification      Admin Verification Desk

components/admin/PaymentVerificationDesk.tsx
components/auth/AuthForms.tsx
components/layout/AccountMenu.tsx     session-backed account menu
components/booking/BookingFlow.tsx
components/booking/PaymentUploadForm.tsx
components/dashboard/PatientAppointments.tsx
components/dashboard/DoctorAgenda.tsx
components/clinical/IntakeWizard.tsx
components/clinical/AssessmentRunner.tsx
components/clinical/SafetyPlanEditor.tsx
components/admin/CrisisIntakeQueue.tsx
components/home/HomeContent.tsx
components/crisis/*                   breathing + grounding tools

scripts/use-db-provider.mjs           provider switch
scripts/enable-sqlserver-tcp.ps1      one-time local SQL Server setup
tests/logic.test.ts
```

---

## 3. The three decisions that shape everything

### 3.1 Double-booking is prevented by the database, not by application code

Checking "is this slot free?" and then inserting leaves a time-of-check /
time-of-use gap. Two patients clicking the same 5 p.m. slot in the same
millisecond both read "free" and both insert.

Every live appointment carries `slotLockKey = "ACTIVE"`, under:

```prisma
@@unique([doctorId, scheduledAtUTC, slotLockKey])
```

The second INSERT fails with `P2002` and that patient is told the slot has just
gone. Releasing a slot rewrites `slotLockKey` to the appointment's own id
(globally unique), which frees the `(doctor, instant, ACTIVE)` tuple **without
deleting the row** — the cancelled appointment stays on the patient's record.

The availability read that runs first is a UX nicety. The unique index is the
guarantee.

### 3.2 Sessions are opaque and server-side, not JWTs

The cookie holds 256 random bits; the database stores only its SHA-256 digest.
This buys instant revocation (logout, password change, lockout), makes a database
dump non-replayable as a login, and removes the signature-confusion surface
entirely. Each session also carries a CSRF digest for the double-submit check.

### 3.3 Everything is UTC; Cairo exists only at render time

Availability rules are `(UTC day-of-week, UTC minutes-from-midnight)`, appointments
are UTC instants. Cairo wall-clock time is produced by `Intl` with
`Africa/Cairo` at the moment of display.

Egypt reintroduced DST in 2023 (UTC+2 winter, UTC+3 from late April to late
October). A fixed UTC anchor and a fixed Cairo wall-clock hour cannot both hold —
one has to move. This system holds **UTC** fixed, so no slot ever silently
shifts, duplicates, or vanishes on the changeover night. The visible consequence:
a window seeded as 16:00 Cairo displays as 17:00 Cairo during the DST half of the
year. If the clinic wants the local hour held constant instead, the affected
windows are edited in the doctor's agenda at each switch.

---

## 4. The manual payment flow

```
  Patient picks a slot
        │
        ▼
  reserveSlotAction ──────────► PENDING_PAYMENT_PROOF   (hold: BOOKING_HOLD_MINUTES)
        │                        slotLockKey = ACTIVE
        │  returns InstaPay handle, Vodafone numbers,
        │  upload URL, and a pre-filled WhatsApp message
        ▼
  submitPaymentProofAction ───► PAYMENT_UNDER_REVIEW    (hold cleared: a human owns it)
        │  file validated by magic number, hashed,
        │  stored outside public/; duplicate receipts refused
        ▼
  Admin Verification Desk
        ├── approvePaymentAction ─► CONFIRMED
        │     ONLINE  → Zoom link is REQUIRED to approve
        │     OFFLINE → clinic address, room number, reception notes
        │     returns the confirmation WhatsApp link
        │
        └── rejectPaymentAction ──► REJECTED  (+ grace window to resubmit)
                                     returns the reason WhatsApp link
```

Statuses that occupy a slot: `PENDING_PAYMENT_PROOF`, `PAYMENT_UNDER_REVIEW`,
`CONFIRMED`, `COMPLETED`. `CANCELLED`, `REJECTED` (after grace) and `EXPIRED`
release it.

Lapsed holds are reclaimed **in-band** — the next patient to book that instant
releases it as part of their own reservation. `releaseExpiredHoldsAction` is
housekeeping for a cron route, not a dependency.

---

## 5. Security controls

| Control | Where | Note |
|---|---|---|
| Password hashing | `lib/auth/password.ts` | argon2id, 19 MiB / t=2 / p=1 (OWASP) |
| User enumeration | `loginAction` | `fakeVerifyPassword` burns equal argon2 work when the email is unknown |
| Session security | `lib/auth/session.ts` | opaque token, hash-at-rest, httpOnly, sameSite=lax, secure in prod, revocable |
| Session fixation | `createSession` | always a new row on login |
| CSRF | `lib/auth/csrf.ts` | double-submit + Origin/Referer check + session binding |
| Authorisation | `lib/auth/guards.ts` | re-checked **inside every action**, not only in middleware |
| Ownership | each action | verified on the fetched row (`patientId !== user.id → 403`) |
| Rate limiting | `lib/security/rate-limit.ts` | login throttled per-IP *and* per-email |
| Upload safety | `lib/uploads.ts` | magic-number sniffing, size cap, UUID filenames, stored outside `public/` |
| Receipt access | `/api/receipts/[proofId]` | owner-or-admin, `no-store`, `nosniff`, locked CSP, identical 404 for "missing" and "not yours" |
| Link safety | `zoomUrlSchema` | meeting links must be `https` on `zoom.us` — staff-typed links reach patients |
| Open redirect | `safeRedirectPath` | `?next=` must be a relative in-app path |
| Audit trail | `lib/security/audit.ts` | every privileged action; identifiers only, never PHI free-text |
| Privilege escalation | `registerAction` | self-registration is hard-coded to `PATIENT` |

**Middleware is not the authorisation layer.** It runs on the Edge runtime where
Prisma is unavailable, so it cannot distinguish a valid session cookie from a
forged, revoked or expired one, nor read a role. It bounces visitors with *no*
cookie away from protected routes and seeds the CSRF cookie. The real checks are
`requireRolePage` (routes) and `requireRole` (actions), both of which hit the
database.

That limit is also why middleware does **not** redirect cookie-holding visitors
away from `/login`. Having a cookie is not the same as having a session: once a
session is revoked (signed out elsewhere, locked out by an admin) or expires, the
cookie remains in the browser. Redirecting on the cookie alone produced an
infinite loop — `/dashboard` found no valid session and sent the user to
`/login`, middleware saw the stale cookie and sent them back. The two auth pages
now resolve the session against the database and redirect only when it is
genuinely valid.

---

## 6. Deployment notes

- **`UPLOAD_DIR` must be persistent storage.** On an ephemeral filesystem
  (Vercel serverless, a rebuilt container) receipts vanish. Mount a volume, or
  move `lib/uploads.ts` to S3-compatible object storage — `storeReceipt`,
  `readReceipt` and `deleteReceipt` are the only three functions to change.
- **Rate limiting is per-process.** Behind more than one instance, replace the
  `Map` in `lib/security/rate-limit.ts` with Redis `INCR` + `EXPIRE`. The
  exported API does not change.
- **`APP_URL` must be exact** (scheme + host, no trailing slash) — the CSRF
  origin check compares against it.
- Run `npm run db:deploy` (not `db:push`) against production.
- Schedule `releaseExpiredHoldsAction` every few minutes via a protected cron
  route if you want lapsed holds cleared proactively rather than in-band.

---

## 7. Scope: what was removed, and why

The following were deleted rather than left as non-functional UI. All of it is
recoverable from git history if the clinic wants it in a later phase.

| Removed | Reason |
|---|---|
| `/academy`, `/books` | Course and e-book stores with mock catalogues and simulated wallet purchases. No payment path exists for them in Phase 1. |
| `/circles` | Group support circles. A real clinical service, but it needs capacity management and multi-patient appointments — genuinely Phase 2, not a mock to keep. |
| `/audio` | Static audio library, no backing storage. |
| `/assistant` + AI drawer | Keyword-matching chatbot presented as a clinical assistant. An ungrounded bot answering mental-health questions is a liability, not a feature. Its two genuinely useful tools (4-7-8 breathing, 5-4-3-2-1 grounding) were kept and moved to `/emergency`. |
| `/session/[sessionId]` | 731 lines of simulated video-call UI with no WebRTC behind it. Zoom links replace it. |
| `context/TelehealthStore.tsx` | The client-side "database". Everything it held now comes from the server. |
| `lib/utils.ts`, `types/telehealth.ts` | Became dead once the store went. This also removed the hard-coded FX rates. |
| Wallet, promo codes, card fields | Simulated money. Phase 1 settles by manual transfer. |

**Fabricated claims removed from the marketing pages.** The home page advertised
`4.96 / 5.0` from `15k+` patient reviews, and the FAQ claimed AES-256
end-to-end encrypted video with anti-recording watermarks. The platform collects
no ratings, and online sessions run on Zoom — the clinic operates no custom video
stack. Both were replaced with statements that are true and derived from the
database (consultant count, the roster's real maximum years of experience).

---

## 8. Known gaps (deliberately out of Phase 1)

- **Phone verification is modelled, not wired.** `VerificationToken` and
  `User.phoneVerifiedAt` exist and `generateNumericCode` is implemented; an SMS
  provider needs connecting. No migration is required to switch it on.
- **WhatsApp messages are not auto-sent.** Every template produces a `wa.me` link
  a human clicks. This keeps the clinic inside WhatsApp's terms for non-templated
  business messaging and keeps a person in the loop before anything reaches a
  patient. Automating it requires the WhatsApp Business API and approved templates.
- **Zoom meetings are created manually** and pasted in. The Zoom Meetings API can
  populate `zoomMeetingUrl` / `zoomMeetingId` / `zoomPasscode` in
  `approvePaymentAction` without a schema change.
- **No refund ledger.** Cancellation frees the slot and records the reason;
  money movement back to the patient is handled outside the system in Phase 1.
- **Cross-doctor chart access is denied by default.** `getPatientHistoryAction`
  returns only records the requesting doctor authored, pending a clinic policy
  decision on shared charts.

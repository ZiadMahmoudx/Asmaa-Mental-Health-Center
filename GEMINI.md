# 🏛️ Project Engineering Rules & Architectural Directives

All code written in this project must strictly comply with the engineering standards documented in `docs/ENGINEERING_STANDARDS.md`.

---

## 1. Uniform Action Result Pattern (`lib/result.ts`)
* **Never throw raw errors** (`throw new Error`) across Server Action boundaries. Next.js replaces uncaught exceptions with opaque digests in production, depriving users of actionable feedback.
* **Always return** the discriminated union `ActionResult<T>`:
  ```typescript
  import { ActionResult, success, failure, Failures } from "@/lib/result";
  ```
* Include **bilingual error messages** (`messageAr` and `messageEn`) and per-field inline errors (`fieldErrors`) on validation failures.

---

## 2. Database-Level Concurrency & Slot Locking
* **Prevent double-booking at the database engine level**, not via application-level checks (closing the time-of-check to time-of-use race condition).
* Enforce the compound unique index in Prisma / SQL Server:
  ```prisma
  @@unique([doctorId, scheduledAtUTC, slotLockKey], map: "appointments_doctor_slot_lock_key")
  ```
* Live appointments carry `slotLockKey = "ACTIVE"`. Upon cancellation or release, rewrite `slotLockKey = appointment.id` (globally unique) to free the slot instant **without deleting the historical medical record**.

---

## 3. UTC-Only Time Architecture (`lib/slots.ts`)
* **Persist all recurring windows and booking instants strictly in UTC**, storing weekly availability in UTC minutes-from-midnight (`startMinutesUTC`, `endMinutesUTC`).
* Local wall-clock time (e.g. `Africa/Cairo`) must **only be computed at render time** via `Intl.DateTimeFormat`. This prevents schedule drift and duplicate slots across daylight saving time (DST) switchovers.

---

## 4. Cryptography, Session Security & HIPAA Compliance (`lib/auth/`)
* **Password Hashing**: Use **Argon2id** (`@node-rs/argon2`) with the OWASP-recommended profile (19 MiB memory, `t=2`, `p=1`).
* **Timing-Attack Defense**: Use constant-time string comparison (`safeEquals`) and `fakeVerifyPassword` to prevent user enumeration and timing leaks.
* **Opaque Server-Side Sessions**: Store only `SHA-256` token digests in the database (`tokenHash`, `csrfTokenHash`). Never expose raw session tokens at rest.
* **Granular Authorization**: Re-verify roles (`requireRole`) and resource ownership (`patientId === user.id`) **inside every Server Action independently**; do not rely solely on Edge middleware.

---

## 5. File Upload Integrity & Anti-Phishing (`lib/uploads.ts`)
* **Magic-Byte Sniffing**: Inspect the leading 16 bytes of any uploaded file against standard signatures (PNG, JPEG, PDF, WEBP) to reject disguised executable payloads or HTML.
* **Safe Storage**: Discard client-provided filenames, assign server-side UUIDs, and write files outside `public/`. Deliver files only through authenticated API routes (`/api/receipts/[proofId]`) with `no-store` and `nosniff` headers.
* **URL Allowlists**: Enforce strict regex validation for external video links (must belong to `https://zoom.us` or `https://*.zoom.us`).

---

## 6. Dual-Provider Portability (SQL Server & PostgreSQL)
* Maintain schema compatibility across both **Microsoft SQL Server** (local) and **PostgreSQL** (cloud):
  * Define domain enums as TypeScript unions in `lib/domain/enums.ts` validated via Zod, rather than native database enums.
  * Store scalar lists (`String[]`) as serialized JSON strings.
  * Use `@db.NVarChar(n)` and `@db.NVarChar(Max)` on SQL Server to guarantee full Unicode support for Arabic text without character corruption.
  * Specify explicit key lengths (`@db.NVarChar(30)`) to respect SQL Server's 900-byte index limit.

---

## 7. Non-Optimistic UI for Critical State (`components/`)
* Bind server mutations through React 19 `useActionState` to ensure progressive enhancement.
* **Never use optimistic updates** for financial transactions, slot reservations, or clinical state changes. External communication triggers (such as WhatsApp confirmation links) must only render after confirmed database persistence (`state.ok === true`).

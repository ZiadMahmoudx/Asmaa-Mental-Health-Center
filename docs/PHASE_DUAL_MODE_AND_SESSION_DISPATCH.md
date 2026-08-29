# Phase — Dual-Mode Slot Governance & Two-Party Session Dispatch

**To:** Agy (Implementation Lead)
**From:** Claude (Lead Architect)
**Scope:** Two client requirements. **Payment gateway work is explicitly out of scope** and must not be started or scaffolded here.

---

## What the client asked for, and what it actually means

**Requirement A — dual-mode booking.** Doctors manage their own *online* availability; *in-clinic* availability is governed by clinic administrators because it competes for physical rooms. The client's stated goal is reducing coordinator workload.

**Requirement B — the Zoom link must reach both parties.** Today the desk produces a WhatsApp confirmation for the **patient only**. The doctor is never told. The client wants each party to receive their own message, tailored to them.

Keep the platform's existing communication principle: **nothing is auto-sent.** Every WhatsApp message is a `wa.me` deep link a human clicks. We are adding a second link, not a mail server. Do not introduce SMTP, Resend, SendGrid, or any automated dispatch in this phase.

---

# PART A — Dual-mode slot governance

## A1 🔴 Doctors can currently create their own in-clinic slots

`app/actions/doctor.actions.ts` — `addAvailabilityRuleAction` (:293) and
`updateAvailabilityRuleAction` (:361) both guard with
`requireRole(["DOCTOR", "ADMIN"])`, then read:

```ts
isOfflineAvailable: formData.get("isOfflineAvailable") === "on" || ... === "true"
```

No role check gates that field. A doctor can publish in-clinic windows for
themselves, which is exactly the governance the client wants to prevent —
in-clinic capacity is a **clinic resource**, not a doctor's to allocate.

### Implementation

1. In both actions, after `resolveTargetDoctor`, derive the flag by role:

```ts
const isAdmin = guard.data.user.role === "ADMIN";
const requestedOffline = formData.get("isOfflineAvailable") === "on"
  || formData.get("isOfflineAvailable") === "true";

// In-clinic capacity is administered centrally. A DOCTOR may never set it —
// on update they inherit whatever the admin already configured.
const isOfflineAvailable = isAdmin
  ? requestedOffline
  : (existingRule?.isOfflineAvailable ?? false);
```

**On `add`, a doctor's rule is always `isOfflineAvailable: false`.**
**On `update`, a doctor must preserve the stored value, never the submitted one.** Read the existing rule first — do not trust the form.

2. Do **not** return a validation error when a doctor submits the field. Silently
   pin it to the stored value. A hostile form post should be neutralised, not
   surfaced as a form error the honest UI can't trigger.

3. `schemas.ts:280` currently refines `isOnlineAvailable || isOfflineAvailable`.
   Keep it — but a doctor whose rule is forced offline-false must still have
   `isOnlineAvailable: true`, so validate **after** the role-based derivation,
   not before.

4. Audit: include `{ isOfflineAvailable, setBy: role }` in the existing
   `recordAudit` metadata for both actions.

### UI (`components/dashboard/schedule/WeeklyScheduleEditor.tsx`)

- When the viewer is a DOCTOR: render the in-clinic toggle **disabled**, visibly
  off, with a short bilingual note — *"In-clinic slots are scheduled by clinic
  administration"* / *"مواعيد العيادة تُجدول عن طريق إدارة المركز"*. Do not hide
  it; a hidden control makes doctors think the feature is missing and call the
  coordinator, which is the workload the client wants removed.
- When the viewer is an ADMIN on `/dashboard/admin/schedule`: fully enabled.
- The component receives `isAdmin` today via the admin schedule page — thread it
  through rather than inferring from the session client-side.

### Tests
- A doctor's `add` with `isOfflineAvailable=true` in the payload stores `false`.
- A doctor's `update` on an admin-created offline rule preserves `true`.
- An admin's `add`/`update` sets the submitted value.

---

## A2 🟠 There is no room model, so "physical room capacity" has no meaning

`DoctorProfile.roomNumber` is a free-text `NVarChar(30)`. `Appointment` has **no
room field at all** (verified against `schema.prisma`). Two doctors assigned the
same room string can both hold in-clinic sessions at the same instant and nothing
detects it.

### Schema

Add a first-class resource, following the portability rules in the schema header
(no enums, no scalar lists, explicit `NoAction` referential actions):

```prisma
model ClinicRoom {
  id        String  @id @default(cuid()) @db.NVarChar(30)
  name      String  @db.NVarChar(60)      // "Room 3", "غرفة ٣"
  floor     String? @db.NVarChar(30)
  capacity  Int     @default(1)           // concurrent sessions; 1 for consult rooms
  isActive  Boolean @default(true)
  notes     String? @db.NVarChar(300)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  appointments Appointment[]

  @@unique([name])
  @@map("clinic_rooms")
}
```

On `Appointment`:

```prisma
  roomId String?     @db.NVarChar(30)   // OFFLINE only
  room   ClinicRoom? @relation(fields: [roomId], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

### Concurrency — reuse the idiom already in the codebase

Do **not** invent a new mechanism. Mirror `slotLockKey`:

```prisma
  @@unique([roomId, scheduledAtUTC, slotLockKey], map: "appointments_room_slot_lock_key")
```

Because `slotLockKey` is rewritten to the row's own id on release, a cancelled or
expired booking stops occupying the room automatically — the same property that
makes the doctor-slot lock work, and the same property whose absence caused the
A1/A1b leaks.

⚠️ **Known limitation, document it in the schema comment:** a unique index catches
*exact-instant* collisions only. It is sufficient while in-clinic bookings are
grid-aligned to the availability window. Any admin path that books off-grid must
call an interval-overlap check first — the same conclusion reached in F2 for the
doctor-slot index. Reuse `intervalsOverlap` from `doctor.actions.ts`.

### Room assignment
- Room is chosen when an OFFLINE appointment is **confirmed**, not when booked —
  the admin knows the day's layout at approval time.
- If no room is free at that instant, approval must fail with a clear
  `CONFLICT` message naming the clash. Do not auto-assign silently.
- `bookingConfirmedMessage` already renders `roomNumber`; switch its source from
  `DoctorProfile.roomNumber` to `appointment.room.name`, falling back to the
  doctor's string while data is migrated.

### Migration
This is the first real schema change since the move off `db push` was
recommended. **Author it as a proper `prisma migrate` migration**, and validate
the round trip on both providers (`npm run db:use:postgres` → `prisma validate` →
back to sqlserver). Seed the existing distinct `roomNumber` values into
`ClinicRoom` rows so nothing is lost.

### Admin UI
A small rooms CRUD under `/dashboard/admin/schedule` — name, floor, capacity,
active. Low complexity; it is a lookup table, not a workspace.

---

# PART B — Two-party session dispatch

## The gap

`approvePaymentAction` returns `ApprovalPayload` with `whatsappConfirmationUrl`
(built by `bookingConfirmedLink` → **patient's** phone) and
`whatsappReminderUrl`. There is **no doctor-facing message anywhere** in
`lib/whatsapp.ts`. The doctor learns about a confirmed session only by opening
their agenda.

`sessionReminderMessage` is not a counter-example — it is a message the *clinic
sends to the patient*, and it is already used that way in the doctor agenda.

## B1 — New message builder: the doctor's session brief

Add to `lib/whatsapp.ts`, alongside the existing builders:

```ts
export interface DoctorSessionBriefInput {
  doctorName: string;
  doctorPhone: string;
  patientName: string;
  patientPhone: string;
  type: "ONLINE" | "OFFLINE";
  scheduledAtUTC: Date;
  durationMinutes: number;
  zoomMeetingUrl?: string | null;
  zoomPasscode?: string | null;
  roomName?: string | null;
  appointmentRef: string;      // short id for the dashboard
  dashboardUrl: string;        // deep link to the agenda entry
}

export function doctorSessionBriefMessage(input: DoctorSessionBriefInput): string
export function doctorSessionBriefLink(input: DoctorSessionBriefInput): string
```

`doctorSessionBriefLink` builds through the existing `buildWhatsAppLink` against
**`doctorPhone`**, not the patient's.

### The two messages must not be the same text

This is the point of the requirement. The patient's message reassures and
instructs; the doctor's message briefs.

**Patient** (`bookingConfirmedMessage`, already correct — do not change its tone):
confirmation, doctor name, time, join link, "arrive 5 minutes early, quiet room,
headphones".

**Doctor** — a clinical brief:
- session confirmed, patient name, Cairo time, duration
- ONLINE: the **same join URL** and passcode
- OFFLINE: the assigned room name, not a maps link
- patient's phone, so the doctor can reach them directly
- a deep link to the agenda entry for the chart and intake summary
- **no payment amount, no receipt details** — the doctor has no reason to see the
  patient's payment information, and it is not their workflow

⚠️ **Constraint:** the message body must carry no clinical free-text. Name, time,
room, link, phone only — the same rule that governs `AuditLog` and
`SafetyAlert.detail`. Never place assessment scores, risk levels or intake
answers in a WhatsApp body; those live behind the dashboard link.

### Language
All existing WhatsApp templates are Arabic-only by deliberate design. Keep the
doctor brief Arabic-only for now, for consistency. **Do not thread a `lang`
parameter into the template builders in this phase** — the clinic has an open
policy question about WhatsApp language (Tier 7 in the localization blueprint)
and it should be answered once, for all templates, not piecemeal.

## B2 — Wire it into every path that sets or changes a Zoom link

Extend `ApprovalPayload`:

```ts
  /** Pre-filled brief to the treating doctor (join link or room). */
  whatsappDoctorUrl: string;
```

Three call sites must produce it:

| Action | File | Why |
|---|---|---|
| `approvePaymentAction` | `admin.actions.ts:54` | the primary path — booking confirmed with a link attached |
| `assignMeetingLinkAction` | `admin.actions.ts:403` | link added or **changed** after confirmation; the doctor's old link is now wrong |
| `rescheduleAppointmentAction` | `doctor.actions.ts:918` | time changed; the doctor's brief is stale |

The reschedule path already builds `appointmentRescheduledLink` for the patient.
Add the doctor equivalent there rather than a separate flow.

`approvePaymentAction` currently selects `doctor: { select: { roomNumber, user: { select: { fullName } } } }`.
**Extend the select to include the doctor's `phone`** — it is not currently
fetched, and the link cannot be built without it.

## B3 — Desk UI: two clearly distinct actions

`components/admin/PaymentVerificationDesk.tsx`

After a successful approval the desk shows one confirmation link today. Show two,
labelled unambiguously and visually distinct:

- **"Send confirmation to patient"** — teal, the existing link
- **"Send session brief to doctor"** — sage or slate, the new link

Requirements:
- Each opens `wa.me` in a new tab (`target="_blank" rel="noopener noreferrer"`), consistent with the existing links.
- Both must be reachable **after** the approval panel collapses — an admin who
  approves five bookings then sends messages must be able to come back to them.
  Surface them on the confirmed row in the decision log too.
- Bilingual labels via `useLanguage()`, per the established pattern.
- `aria-label` on each; they are visually similar and differ only by recipient.

## B4 — Track what was actually sent

`Appointment.reminderSentAt` is the existing precedent for dispatch tracking.
Mirror it:

```prisma
  patientNotifiedAt DateTime?
  doctorNotifiedAt  DateTime?
```

Set them via a small `markSessionDispatchAction(appointmentId, party)` called
when the admin clicks the link. This is a **best-effort record that the link was
opened**, not proof of delivery — name it that way in the UI ("link opened"), and
say so in the action's doc comment. WhatsApp gives us no delivery receipt and we
must not imply one.

Why it matters: without it, an admin working a queue of ten approvals has no way
to know which doctors they have already briefed, and doctors get either duplicate
messages or none.

Surface it on the agenda row and the desk: a small "patient ✓ / doctor ✓" pair.

---

# Execution order

| Phase | Contents | Gate |
|---|---|---|
| **1** | **A1** RBAC lock + UI disabled state + 3 tests | `tsc`, `test:logic`, `build` |
| **2** | **B1–B3** doctor brief, three call sites, desk UI | + message-builder tests |
| **3** | **B4** dispatch tracking (schema + action + badges) | + migration validated on both providers |
| **4** | **A2** rooms: schema, migration, conflict index, admin CRUD, approval-time assignment | + room-conflict test |

Phase 1 is a same-day change and delivers the governance the client asked for.
Phase 4 is the heaviest because it is the first real migration — do not bundle it
with anything else.

## Verification matrix

| Item | Test |
|---|---|
| A1 | doctor `add` forces `isOfflineAvailable=false`; doctor `update` preserves stored value; admin sets both freely |
| B1 | doctor brief contains the join URL and patient phone; contains **no** price, no receipt reference, no clinical text |
| B2 | all three actions return a non-empty `whatsappDoctorUrl` targeting the **doctor's** number, not the patient's |
| B4 | marking one party does not set the other |
| A2 | two OFFLINE appointments in one room at the same instant → `P2002` → mapped to a `CONFLICT` result, never a 500 |
| A2 | releasing a room-held appointment (cancel/expire) frees it for rebooking — re-run the live cron scenario |

## Constraints

- **No payment gateway work.** No SDK, no `checkout` scaffolding, no schema
  fields anticipating one. It is a separate decision with its own sequencing.
- **No automated sending.** No SMTP, no email provider, no background dispatch.
  Every message stays a human-clicked `wa.me` link.
- No change to `slotLockKey` semantics, the booking transaction, the credit
  ledger, or any safety-escalation path.
- Arabic remains the default; new UI strings must be bilingual from the start,
  per the pattern now established across the workspace.
- Phase 4 is the first `prisma migrate` migration — validate the dual-provider
  round trip before committing.

## Open questions for the clinic — do not block on these, but surface them

1. Room capacity: is any room ever used for more than one concurrent session
   (group therapy)? If yes, `capacity` must actually be enforced rather than
   assumed to be 1.
2. When an admin reassigns a room after the doctor was briefed, should the doctor
   get a second message? (Recommendation: yes, and label it as an update.)
3. The WhatsApp language policy (Tier 7) is still open and now affects one more
   template.

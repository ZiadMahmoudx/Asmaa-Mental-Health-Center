# Doctor & Admin Management — Technical Execution Blueprint

Asmaa Clinic for Mental Health — مركز أسما للصحة النفسية
Target: schedule governance, appointment lifecycle control, and clinical data
integration in the consultant workspace.

**Status:** specification.
**Audience:** the engineers implementing this immediately after the current branch.

---

## 0. How to read this document

Each work item is written as: **what exists today → what to build → exact file →
signature → algorithm → failure modes → audit → verification**. Implement in the
phase order given in §9; the phases are ordered by dependency, not by importance.

### 0.1 Non-negotiable constraints

These come from the existing architecture. Violating any of them breaks
something that currently works.

| # | Constraint | Why |
|---|---|---|
| C1 | **No Prisma `enum` blocks.** New enumerations go in `lib/domain/enums.ts` as TS unions; columns are `String`. | SQL Server has no enum type; the schema must stay dual-provider. |
| C2 | **No `String[]` scalar lists.** Use a `*Json` text column read through `toStringArray`/`fromStringArray` in `lib/serialization.ts`. | SQL Server has no array type. |
| C3 | **Every id and FK carries `@db.VarChar(30)`.** | Unsized becomes `NVarChar(1000)` on SQL Server = 2000 bytes, over the 900-byte index key limit. |
| C4 | **Referential actions are `NoAction` unless a true cascade is intended.** `Restrict` is invalid on SQL Server, and two cascade paths between the same pair of tables is rejected. | See the `User → Appointment` note in `prisma/schema.prisma`. |
| C5 | **Every action returns `ActionResult<T>`.** Never throw across the RSC boundary. Bilingual `messageAr` / `messageEn`, plus `fieldErrors` for form-level failures. | `lib/result.ts`. Next.js replaces thrown errors with opaque digests in production. |
| C6 | **Every action re-checks the role at the data layer** via `requireRole`. Middleware is not the authorisation layer — it runs on Edge without Prisma. | A crafted POST never passes through a page route. |
| C7 | **All times are UTC in the database.** Cairo rendering happens only at display time via `Intl` with `Africa/Cairo`. | Egypt observes DST (UTC+3 late April–October). |
| C8 | **Never trust a client-supplied score, price, or total.** Recompute server-side. | Established by `assessments.actions.ts` and the frozen `priceEGP` on `Appointment`. |
| C9 | **After a schema change:** `npm run db:generate && npm run db:push`, then re-run `npm run db:use:postgres` + `prisma validate` + switch back, to prove portability still holds. | Dual-provider guarantee. |

### 0.2 Naming conventions in this document

- `⚠️ TRAP` — a known way to get this wrong that will pass review and fail in production.
- `🔒 SECURITY` — an invariant that must hold or patient data leaks.
- File paths are repo-relative.

---

## 1. Gap analysis — current state

### 1.1 What already exists and works

| Capability | Location | Notes |
|---|---|---|
| List own availability | `getMyAvailabilityAction` | `app/actions/doctor.actions.ts:171` |
| Add a weekly rule | `addAvailabilityRuleAction` | `:200` — overlap-checked |
| Deactivate a rule | `removeAvailabilityRuleAction` | `:295` — sets `isActive: false` |
| Add time off | `addTimeOffAction` | `:333` — **has no UI** |
| Own agenda | `getMyAgendaAction` | `:84` |
| Save/sign SOAP note | `saveClinicalRecordAction` | `:414` — one-way signable |
| Complete a session | `completeAppointmentAction` | `:542` |
| Patient's records (own authored) | `getPatientHistoryAction` | `:614` — **not surfaced in UI** |
| Patient's scales | `getPatientAssessmentsAction` | `app/actions/assessments.actions.ts` — **not surfaced** |
| Patient's safety plan | `getPatientSafetyPlanAction` | `app/actions/safety-plan.actions.ts` — **not surfaced** |
| Admin cancel | `adminCancelAppointmentAction` | `app/actions/admin.actions.ts:510` |
| Attach/replace Zoom link | `assignMeetingLinkAction` | `:403` — ADMIN or owning DOCTOR |

### 1.2 Confirmed gaps this spec closes

| # | Gap | Impact |
|---|---|---|
| G1 | No **edit** of an availability rule — only add and deactivate. | A doctor shifting their Sunday window by 30 minutes must delete and recreate, which trips G2. |
| G2 | **Latent bug.** `@@unique([doctorId, dayOfWeek, startMinutesUTC, endMinutesUTC])` (`prisma/schema.prisma:200`) does *not* include `isActive`, and `removeAvailabilityRuleAction` keeps the row. Re-adding an identical window after removing it fails with `P2002` and surfaces as *"هذه النافذة الزمنية مسجلة بالفعل"* — for a window the doctor cannot see anywhere. | Doctors get permanently locked out of time windows they once used. **Must be fixed before any edit UI ships**, or edit-by-recreate will hit it constantly. |
| G3 | No UI for `AvailabilityException` (time off) at all, and no way to list or delete one. | Vacations cannot be entered; the action is dead code. |
| G4 | **Admins cannot manage a doctor's schedule.** Every doctor action resolves the profile from `getAuthContext()` via `resolveDoctorProfile(userId)`. An admin has no `DoctorProfile`, so these actions fail closed for them. | Reception cannot fix a calendar when a doctor is unavailable — the operational core of a clinic. |
| G5 | No **reschedule**. Only cancel-and-rebook, which loses the payment and forces the patient back through the manual transfer flow. | Common real-world need; currently costs the clinic a refund conversation. |
| G6 | **Doctors cannot cancel their own appointments.** Only patient and admin can. | A doctor with an emergency has no path. |
| G7 | Clinical data (`ClinicalAssessment`, `SafetyPlan`, prior `ClinicalRecord`) is not visible while writing a SOAP note. | The doctor writes notes blind to the patient's PHQ-9 trajectory and safety plan. |
| G8 | `releaseExpiredHoldsAction` exists with no scheduled caller. | Lapsed holds are only reclaimed opportunistically when another patient books that exact slot. |
| G9 | No delete/undo for a `ClinicalRecord` draft, and no visibility of *unsigned* drafts across the agenda. | Drafts silently accumulate. |

---

## 2. Phase A — Schema changes

**File:** `prisma/schema.prisma`

### A1. Fix G2 — make availability windows re-creatable

The unique tuple must stop counting retired rows. Mirror the proven
`slotLockKey` pattern already used on `Appointment`.

Add to `DoctorAvailability`:

```prisma
  /// Mirrors Appointment.slotLockKey. Holds ACTIVE_RULE_LOCK while the window is
  /// live; on retirement it is rewritten to the row's own id, which frees the
  /// (doctor, day, start, end) tuple so the same window can be created again.
  /// Without this, a removed window is permanently unusable — see G2.
  ruleLockKey String @db.NVarChar(40)
```

Replace the existing constraint:

```prisma
  @@unique([doctorId, dayOfWeek, startMinutesUTC, endMinutesUTC, ruleLockKey], map: "doctor_availability_window_lock_key")
```

Add to `lib/constants.ts`:

```ts
/** Value of DoctorAvailability.ruleLockKey while a window is live. */
export const ACTIVE_RULE_LOCK = "ACTIVE" as const;
```

**Backfill:** existing rows have no `ruleLockKey`. The migration must set
`ruleLockKey = 'ACTIVE'` for rows where `isActive = 1`, and `ruleLockKey = id`
for rows where `isActive = 0`, before adding the unique index.

### A2. Support G5 — reschedule audit trail on `Appointment`

Add:

```prisma
  /// Set when an appointment has been moved. Retains the instant it was
  /// originally booked for, so the patient-facing history can explain the change
  /// and the clinic can audit how often it reschedules.
  rescheduledFromUTC DateTime?
  rescheduledAt      DateTime?
  rescheduledById    String?   @db.NVarChar(30)
  rescheduleReason   String?   @db.NVarChar(500)
```

Relation:

```prisma
  rescheduledBy User? @relation("AppointmentRescheduler", fields: [rescheduledById], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

Back-relation on `User`:

```prisma
  rescheduledAppointments Appointment[] @relation("AppointmentRescheduler")
```

Index: `@@index([rescheduledById])`.

### A3. Support G3 — soft-delete for time off

`AvailabilityException` currently has no lifecycle. Add:

```prisma
  cancelledAt   DateTime?
  createdById   String?   @db.NVarChar(30)
```

with a `NoAction` relation to `User` named `"TimeOffCreator"` and
`@@index([createdById])`. Reads filter `cancelledAt: null`.

### A4. New audit actions

**File:** `lib/security/audit.ts` — extend the `AuditAction` union:

```ts
| "AVAILABILITY_RULE_EDITED"
| "AVAILABILITY_RULE_RETIRED"
| "TIME_OFF_ADDED"
| "TIME_OFF_CANCELLED"
| "APPOINTMENT_RESCHEDULED"
| "APPOINTMENT_CANCELLED_BY_DOCTOR"
| "SAFETY_PLAN_VIEWED_IN_SESSION"
| "HOLDS_RELEASED_BY_CRON"
```

Extend `entityType` with `"AvailabilityException"`.

---

## 3. Phase B — Validation schemas

**File:** `lib/validation/schemas.ts`

### B1. `availabilityRuleUpdateSchema`
```ts
export const availabilityRuleUpdateSchema = z
  .object({
    availabilityId: cuidSchema,
    doctorId: cuidSchema.optional(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startMinutesUTC: z.coerce.number().int().min(0).max(1439),
    endMinutesUTC: z.coerce.number().int().min(1).max(1440),
    slotDurationMins: durationSchema,
    isOnlineAvailable: z.coerce.boolean(),
    isOfflineAvailable: z.coerce.boolean(),
  })
  .refine((d) => d.endMinutesUTC > d.startMinutesUTC, {
    message: "وقت نهاية النافذة يجب أن يكون بعد وقت البداية",
    path: ["endMinutesUTC"],
  })
  .refine((d) => d.endMinutesUTC - d.startMinutesUTC >= d.slotDurationMins, {
    message: "طول النافذة يجب أن يتسع لجلسة واحدة على الأقل",
    path: ["slotDurationMins"],
  })
  .refine((d) => d.isOnlineAvailable || d.isOfflineAvailable, {
    message: "يجب اختيار نوع واحد على الأقل من الجلسات (أونلاين أو عيادة)",
    path: ["isOnlineAvailable"],
  });
```

### B2. `rescheduleAppointmentSchema`
```ts
export const rescheduleAppointmentSchema = z.object({
  appointmentId: cuidSchema,
  scheduledAtUTC: utcInstant,
  durationMinutes: durationSchema,
  reason: z.string().trim().max(500).optional(),
  notifyPatient: z.coerce.boolean().default(true),
  allowOffGrid: z.coerce.boolean().optional(),
});
```

### B3. `cancelByDoctorSchema`
```ts
export const cancelByDoctorSchema = z.object({
  appointmentId: cuidSchema,
  reason: z.string().trim().min(5, "يجب كتابة سبب الإلغاء للمريض (٥ أحرف على الأقل)").max(500),
});
```

### B4. `timeOffCancelSchema`
```ts
export const timeOffCancelSchema = z.object({
  exceptionId: cuidSchema,
  doctorId: cuidSchema.optional(),
});
```

### B5. `forceTimeOffSchema`
```ts
export const forceTimeOffSchema = z.object({
  doctorId: cuidSchema,
  startsAtUTC: utcInstant,
  endsAtUTC: utcInstant,
  reason: z.string().trim().max(255).optional(),
  cancelConflicts: z.literal(true, {
    errorMap: () => ({ message: "يجب تأكيد إلغاء الحجوزات المتعارضة" }),
  }),
  cancellationReason: z.string().trim().min(5).max(500),
});
```

---

## 4. Implementation Steps Summary

1. **Phase 1: Schema Updates & Database Sync** (A1 to A4).
2. **Phase 2: Authorization Seam & Actions** (`resolveTargetDoctor`, Schedule CRUD, Lifecycle Actions, Cron Endpoint).
3. **Phase 3: Doctor Workspace UI** (Split `DoctorAgenda` into tabs, implement `PatientDrawer` with PHQ-9/GAD-7/ISI sparklines and Safety Plan).
4. **Phase 4: Admin Governance UI** (`/dashboard/admin/schedule`, `/dashboard/admin/appointments`).
5. **Phase 5: Automated Testing & Portability Proof** (`npm run test:logic`, dual-provider validation).

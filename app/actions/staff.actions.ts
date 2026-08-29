"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { recordAudit } from "@/lib/security/audit";
import { fromStringArray, toEgp, toStringArray } from "@/lib/serialization";
import {
  adminResetPasswordSchema,
  createAdminSchema,
  createDoctorSchema,
  toggleUserActiveSchema,
  updateDoctorFullProfileSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { asRole, type Role } from "@/lib/domain/enums";

// ---------------------------------------------------------------------------
// Staff Roster Views & Types
// ---------------------------------------------------------------------------

export interface DoctorStaffRow {
  id: string; // DoctorProfile ID
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  title: string;
  licenseNumber: string;
  yearsOfExperience: number;
  roomNumber: string | null;
  sessionPriceOnline: number;
  sessionPriceOffline: number;
  isAcceptingPatients: boolean;
  isActive: boolean;
  specialties: string[];
  concernTags: string[];
  bioAr: string | null;
  availabilityWindowsCount: number;
  upcomingSessionsCount: number;
  completedSessionsCount: number;
  createdAtUTC: string;
}

export interface AdminStaffRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAtUTC: string;
}

export interface StaffRosterPayload {
  doctors: DoctorStaffRow[];
  admins: AdminStaffRow[];
}

/** Fetch all staff members (doctors and admins) for governance. */
export async function getStaffRosterAction(): Promise<ActionResult<StaffRosterPayload>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const now = new Date();

  const [doctorsRaw, adminsRaw] = await Promise.all([
    prisma.doctorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            availability: { where: { isActive: true } },
          },
        },
        appointments: {
          select: { status: true, scheduledAtUTC: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  const doctors: DoctorStaffRow[] = doctorsRaw.map((doc) => {
    const upcoming = doc.appointments.filter(
      (a) => a.status === "CONFIRMED" && a.scheduledAtUTC >= now,
    ).length;
    const completed = doc.appointments.filter((a) => a.status === "COMPLETED").length;

    return {
      id: doc.id,
      userId: doc.user.id,
      fullName: doc.user.fullName,
      email: doc.user.email,
      phone: doc.user.phone,
      title: doc.title,
      licenseNumber: doc.licenseNumber,
      yearsOfExperience: doc.yearsOfExperience,
      roomNumber: doc.roomNumber,
      sessionPriceOnline: toEgp(doc.sessionPriceOnline),
      sessionPriceOffline: toEgp(doc.sessionPriceOffline),
      isAcceptingPatients: doc.isAcceptingPatients,
      isActive: doc.user.isActive,
      specialties: toStringArray(doc.specialtiesJson),
      concernTags: toStringArray(doc.concernTagsJson),
      bioAr: doc.bio,
      availabilityWindowsCount: doc._count.availability,
      upcomingSessionsCount: upcoming,
      completedSessionsCount: completed,
      createdAtUTC: doc.createdAt.toISOString(),
    };
  });

  const admins: AdminStaffRow[] = adminsRaw.map((admin) => ({
    userId: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: asRole(admin.role),
    isActive: admin.isActive,
    createdAtUTC: admin.createdAt.toISOString(),
  }));

  return success({ doctors, admins });
}

// ---------------------------------------------------------------------------
// Doctor Onboarding (Atomic Transaction)
// ---------------------------------------------------------------------------

/** Provision a new consultant doctor in the clinic. */
export async function createDoctorAction(
  _prevState: ActionResult<{ doctorId: string; userId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ doctorId: string; userId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const specialtiesRaw = formData.getAll("specialties");
  const concernTagsRaw = formData.getAll("concernTags");

  const parsed = createDoctorSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    title: formData.get("title"),
    licenseNumber: formData.get("licenseNumber"),
    yearsOfExperience: formData.get("yearsOfExperience") ?? 0,
    roomNumber: formData.get("roomNumber") ?? undefined,
    sessionPriceOnline: formData.get("sessionPriceOnline"),
    sessionPriceOffline: formData.get("sessionPriceOffline"),
    specialties:
      specialtiesRaw.length > 0
        ? specialtiesRaw
        : formData.get("specialtiesJson")
        ? JSON.parse(formData.get("specialtiesJson") as string)
        : [],
    concernTags:
      concernTagsRaw.length > 0
        ? concernTagsRaw
        : formData.get("concernTagsJson")
        ? JSON.parse(formData.get("concernTagsJson") as string)
        : [],
    bioAr: formData.get("bioAr") ?? undefined,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة بيانات الطبيب المدخلة.",
      "Invalid doctor onboarding details.",
      toFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;

  // Uniqueness check for email and phone
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { phone: input.phone }],
    },
    select: { id: true, email: true, phone: true },
  });

  if (existingUser) {
    const isEmail = existingUser.email.toLowerCase() === input.email.toLowerCase();
    return failure(
      "CONFLICT",
      isEmail
        ? "البريد الإلكتروني مسجل بالفعل لمستخدم آخر."
        : "رقم الهاتف مسجل بالفعل لمستخدم آخر.",
      isEmail ? "Email already exists." : "Phone number already exists.",
      isEmail ? { email: "البريد مسجل بالفعل" } : { phone: "رقم الهاتف مسجل بالفعل" },
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: "DOCTOR",
          isActive: true,
          phoneVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      const doctorProfile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          title: input.title,
          licenseNumber: input.licenseNumber,
          yearsOfExperience: input.yearsOfExperience,
          roomNumber: input.roomNumber ?? null,
          sessionPriceOnline: new Prisma.Decimal(input.sessionPriceOnline),
          sessionPriceOffline: new Prisma.Decimal(input.sessionPriceOffline),
          specialtiesJson: fromStringArray(input.specialties),
          concernTagsJson: fromStringArray(input.concernTags),
          bio: input.bioAr ?? "",
          isAcceptingPatients: true,
        },
        select: { id: true },
      });

      return { userId: user.id, doctorId: doctorProfile.id };
    });

    await recordAudit({
      actorId: guard.data.user.id,
      action: "STAFF_DOCTOR_CREATED",
      entityType: "DoctorProfile",
      entityId: created.doctorId,
      metadata: {
        userId: created.userId,
        fullName: input.fullName,
        email: input.email,
        licenseNumber: input.licenseNumber,
      },
    });

    revalidatePath("/dashboard/admin/staff");
    revalidatePath("/dashboard/admin/schedule");
    revalidatePath("/dashboard/admin/appointments");
    revalidatePath("/therapists");
    revalidatePath("/intake");

    return success(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "CONFLICT",
        "بيانات الطبيب مسجلة بالفعل (البريد أو الهاتف أو الترخيص).",
        "A uniqueness collision occurred.",
      );
    }
    console.error("[staff] failed to create doctor:", error);
    return Failures.internal();
  }
}

// ---------------------------------------------------------------------------
// Admin / Receptionist Provisioning
// ---------------------------------------------------------------------------

/** Provision a new administrator / receptionist account. */
export async function createAdminAction(
  _prevState: ActionResult<{ userId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = createAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة بيانات موظف الإدارة.",
      "Invalid admin onboarding details.",
      toFieldErrors(parsed.error),
    );
  }

  const { fullName, email, phone, password } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
    select: { id: true, email: true },
  });

  if (existingUser) {
    const isEmail = existingUser.email.toLowerCase() === email.toLowerCase();
    return failure(
      "CONFLICT",
      isEmail
        ? "البريد الإلكتروني مسجل بالفعل."
        : "رقم الهاتف مسجل بالفعل.",
      isEmail ? "Email already exists." : "Phone number already exists.",
      isEmail ? { email: "البريد مسجل بالفعل" } : { phone: "رقم الهاتف مسجل بالفعل" },
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        phoneVerifiedAt: new Date(),
      },
      select: { id: true },
    });

    await recordAudit({
      actorId: guard.data.user.id,
      action: "STAFF_ADMIN_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: { fullName, email },
    });

    revalidatePath("/dashboard/admin/staff");
    return success({ userId: user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure("CONFLICT", "البريد أو الهاتف مسجل بالفعل.", "Collision detected.");
    }
    console.error("[staff] failed to create admin:", error);
    return Failures.internal();
  }
}

// ---------------------------------------------------------------------------
// Doctor Profile Full Update
// ---------------------------------------------------------------------------

/** Update complete medical credentials, bio, and settings of a doctor. */
export async function updateDoctorFullProfileAction(
  _prevState: ActionResult<{ doctorId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ doctorId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const specialtiesRaw = formData.getAll("specialties");
  const concernTagsRaw = formData.getAll("concernTags");

  const parsed = updateDoctorFullProfileSchema.safeParse({
    doctorId: formData.get("doctorId"),
    title: formData.get("title"),
    licenseNumber: formData.get("licenseNumber"),
    yearsOfExperience: formData.get("yearsOfExperience") ?? 0,
    roomNumber: formData.get("roomNumber") ?? undefined,
    sessionPriceOnline: formData.get("sessionPriceOnline"),
    sessionPriceOffline: formData.get("sessionPriceOffline"),
    specialties:
      specialtiesRaw.length > 0
        ? specialtiesRaw
        : formData.get("specialtiesJson")
        ? JSON.parse(formData.get("specialtiesJson") as string)
        : [],
    concernTags:
      concernTagsRaw.length > 0
        ? concernTagsRaw
        : formData.get("concernTagsJson")
        ? JSON.parse(formData.get("concernTagsJson") as string)
        : [],
    bioAr: formData.get("bioAr") ?? undefined,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة البيانات المدخلة.",
      "Invalid profile details.",
      toFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;

  const updated = await prisma.doctorProfile.update({
    where: { id: input.doctorId },
    data: {
      title: input.title,
      licenseNumber: input.licenseNumber,
      yearsOfExperience: input.yearsOfExperience,
      roomNumber: input.roomNumber ?? null,
      sessionPriceOnline: new Prisma.Decimal(input.sessionPriceOnline),
      sessionPriceOffline: new Prisma.Decimal(input.sessionPriceOffline),
      specialtiesJson: fromStringArray(input.specialties),
      concernTagsJson: fromStringArray(input.concernTags),
      bio: input.bioAr ?? "",
    },
    select: { id: true, userId: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "STAFF_PROFILE_UPDATED",
    entityType: "DoctorProfile",
    entityId: updated.id,
    metadata: {
      title: input.title,
      sessionPriceOnline: input.sessionPriceOnline,
      sessionPriceOffline: input.sessionPriceOffline,
    },
  });

  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/therapists");
  revalidatePath(`/booking/${updated.id}`);

  return success({ doctorId: updated.id });
}

// ---------------------------------------------------------------------------
// Account Lifecycle (Toggle Active Status & Invalidate Sessions)
// ---------------------------------------------------------------------------

/** Freeze or activate a staff account, immediately revoking sessions on freeze. */
export async function toggleUserActiveStatusAction(
  _prevState: ActionResult<{ userId: string; isActive: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ userId: string; isActive: boolean }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = toggleUserActiveSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرف غير صالح.", "Invalid user id.", toFieldErrors(parsed.error));
  }

  const { userId, isActive } = parsed.data;

  // Invariant: Self-deactivation prevention
  if (guard.data.user.id === userId && !isActive) {
    return failure(
      "INVALID_STATE",
      "لا يمكنك تجميد حسابك الخاص الذي تقوم بالعمل منه حالياً.",
      "You cannot deactivate your own administrative account.",
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true, role: true, fullName: true },
  });

  if (!isActive) {
    // Purge active sessions immediately
    await revokeAllSessions(userId);
  }

  await recordAudit({
    actorId: guard.data.user.id,
    action: "STAFF_STATUS_TOGGLED",
    entityType: "User",
    entityId: userId,
    metadata: { isActive, targetRole: user.role, targetName: user.fullName },
  });

  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/therapists");

  return success({ userId: user.id, isActive: user.isActive });
}

// ---------------------------------------------------------------------------
// Credential Reset (Admin Password Override with Session Revocation)
// ---------------------------------------------------------------------------

/** Reset a staff member's password and terminate active sessions. */
export async function adminResetPasswordAction(
  _prevState: ActionResult<{ userId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = adminResetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى التأكد من تطابق كلمة المرور وقوتها.",
      "Invalid password reset input.",
      toFieldErrors(parsed.error),
    );
  }

  const { userId, password } = parsed.data;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, role: true },
  });

  if (!targetUser) return Failures.notFound("المستخدم المطلوب");

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Force immediate re-login across all devices
  await revokeAllSessions(userId);

  await recordAudit({
    actorId: guard.data.user.id,
    action: "STAFF_PASSWORD_RESET",
    entityType: "User",
    entityId: userId,
    metadata: { targetName: targetUser.fullName, targetRole: targetUser.role },
  });

  revalidatePath("/dashboard/admin/staff");
  return success({ userId });
}

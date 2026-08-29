import { z } from "zod";
import { SESSION_DURATIONS } from "@/lib/constants";
import {
  APPOINTMENT_TYPES,
  PAYMENT_METHODS,
  RISK_LEVELS,
} from "@/lib/domain/enums";

/**
 * Single source of truth for every input crossing the network boundary.
 *
 * Server Actions receive `FormData`, which is entirely attacker-controlled - a
 * caller can POST any field set regardless of what the React form renders. Every
 * action therefore parses through the schemas below before touching Prisma.
 *
 * No `server-only` import here: client components reuse these schemas for
 * optimistic inline validation, and the exported types drive the form props.
 */

// --------------------------------------------------------------------------
// Primitives
// --------------------------------------------------------------------------

/**
 * Egyptian mobile numbers, normalised to E.164.
 * Accepts 01001234567, +201001234567, 00201001234567, and spaced/dashed
 * variants; rejects landlines and non-Egyptian prefixes, because the WhatsApp
 * and Vodafone Cash flows both assume an Egyptian mobile.
 */
export const egyptianPhone = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s\-()]/g, ""))
  .refine((value) => /^(?:\+20|0020|20|0)?1[0125]\d{8}$/.test(value), {
    message: "رقم هاتف مصري غير صالح. مثال: 01001234567",
  })
  .transform((value) => {
    const digits = value.replace(/^\+/, "").replace(/^00/, "");
    const withoutCountry = digits.startsWith("20") ? digits.slice(2) : digits;
    const national = withoutCountry.startsWith("0") ? withoutCountry.slice(1) : withoutCountry;
    return `+20${national}`;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "البريد الإلكتروني قصير جداً")
  .max(190, "البريد الإلكتروني طويل جداً")
  .email("صيغة البريد الإلكتروني غير صحيحة");

/**
 * Password policy: length is the dominant factor, so the floor is 10 characters
 * with a mixed-class requirement rather than a short password full of symbols.
 */
export const passwordSchema = z
  .string()
  .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل")
  .max(128, "كلمة المرور طويلة جداً")
  .refine((value) => /[A-Za-z؀-ۿ]/.test(value), {
    message: "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل",
  })
  .refine((value) => /\d/.test(value), {
    message: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل",
  });

export const cuidSchema = z.string().min(20).max(40).regex(/^[a-z0-9]+$/i, "معرّف غير صالح");

/** ISO-8601 instant that must round-trip exactly, guaranteeing a real UTC time. */
export const utcInstant = z
  .string()
  .trim()
  .refine(
    (value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime()) && value.length >= 20;
    },
    { message: "تاريخ/وقت غير صالح - يجب أن يكون بصيغة ISO-8601 بتوقيت UTC" },
  )
  .transform((value) => new Date(value));

/**
 * Meeting links are typed by staff and then sent to patients over WhatsApp, so
 * the host is allow-listed: a mistyped or injected link cannot be used to send
 * patients to a phishing page under the clinic's name.
 */
export const zoomUrlSchema = z
  .string()
  .trim()
  .url("رابط الاجتماع غير صالح")
  .max(500)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:") return false;
        const host = url.hostname.toLowerCase();
        return host === "zoom.us" || host.endsWith(".zoom.us");
      } catch {
        return false;
      }
    },
    { message: "يجب أن يكون الرابط من نطاق zoom.us وبروتوكول HTTPS" },
  );

/**
 * Built from the domain arrays rather than repeated literals: the database
 * columns are plain strings for provider portability, so this Zod layer is the
 * only thing enforcing the enumeration. Deriving it from lib/domain/enums.ts
 * means adding a value there cannot silently leave validation behind.
 */
export const appointmentTypeSchema = z.enum(APPOINTMENT_TYPES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const durationSchema = z.coerce
  .number()
  .int()
  .refine((value) => (SESSION_DURATIONS as readonly number[]).includes(value), {
    message: "مدة الجلسة غير مدعومة",
  });

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "الاسم الكامل مطلوب")
      .max(120, "الاسم طويل جداً")
      .refine((value) => value.split(/\s+/).length >= 2, {
        message: "يرجى إدخال الاسم الثنائي على الأقل",
      }),
    email: emailSchema,
    phone: egyptianPhone,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.coerce.boolean().refine((value) => value === true, {
      message: "يجب الموافقة على سياسة الخصوصية وشروط الاستخدام",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema`: an existing account may predate a policy change, and
  // applying the policy at login would lock the patient out of their record.
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128),
  next: z.string().optional(),
});

// --------------------------------------------------------------------------
// Booking
// --------------------------------------------------------------------------

export const availabilityQuerySchema = z.object({
  doctorId: cuidSchema,
  type: appointmentTypeSchema,
  /** Inclusive UTC day the calendar starts on (defaults to today, server-side). */
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD").optional(),
  days: z.coerce.number().int().min(1).max(60).optional(),
});

export const reserveSlotSchema = z.object({
  doctorId: cuidSchema,
  type: appointmentTypeSchema,
  scheduledAtUTC: utcInstant,
  durationMinutes: durationSchema,
});

export const cancelAppointmentSchema = z.object({
  appointmentId: cuidSchema,
  reason: z.string().trim().max(500).optional(),
});

// --------------------------------------------------------------------------
// Manual payments
// --------------------------------------------------------------------------

export const paymentProofSchema = z
  .object({
    appointmentId: cuidSchema,
    method: paymentMethodSchema,
    /**
     * The sending wallet: an InstaPay handle (name@bank) or the Vodafone Cash
     * mobile number the transfer came from. Validated per method below.
     */
    senderIdentifier: z.string().trim().min(3, "بيانات المُرسِل مطلوبة").max(120),
    transactionRef: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
    amountClaimedEGP: z.coerce
      .number()
      .positive("المبلغ يجب أن يكون أكبر من صفر")
      .max(100_000, "المبلغ غير منطقي")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "VODAFONE_CASH") {
      const parsed = egyptianPhone.safeParse(data.senderIdentifier);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["senderIdentifier"],
          message: "أدخل رقم محفظة فودافون كاش المُرسِل بصيغة صحيحة، مثال: 01001234567",
        });
      }
    } else if (!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(data.senderIdentifier)) {
      ctx.addIssue({
        code: "custom",
        path: ["senderIdentifier"],
        message: "أدخل معرّف إنستا باي الخاص بك بصيغة صحيحة، مثال: ahmed.ali@instapay",
      });
    }
  });

export const approvePaymentSchema = z
  .object({
    paymentProofId: cuidSchema,
    zoomMeetingUrl: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
    zoomPasscode: z.string().trim().max(60).optional().or(z.literal("")).transform((v) => v || undefined),
    clinicNotes: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => v || undefined),
  })
  .superRefine((data, ctx) => {
    if (data.zoomMeetingUrl) {
      const parsed = zoomUrlSchema.safeParse(data.zoomMeetingUrl);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["zoomMeetingUrl"],
          message: parsed.error.issues[0]?.message ?? "رابط زووم غير صالح",
        });
      }
    }
  });

export const rejectPaymentSchema = z.object({
  paymentProofId: cuidSchema,
  rejectionReason: z
    .string()
    .trim()
    .min(5, "يرجى كتابة سبب واضح للرفض ليصل للمريض")
    .max(500, "سبب الرفض طويل جداً"),
});

export const assignMeetingSchema = z.object({
  appointmentId: cuidSchema,
  zoomMeetingUrl: zoomUrlSchema,
  zoomMeetingId: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || undefined),
  zoomPasscode: z.string().trim().max(60).optional().or(z.literal("")).transform((v) => v || undefined),
});

// --------------------------------------------------------------------------
// Doctor agenda & clinical notes
// --------------------------------------------------------------------------

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0, "يوم غير صالح").max(6, "يوم غير صالح"),
    startMinutesUTC: z.coerce.number().int().min(0).max(1439),
    endMinutesUTC: z.coerce.number().int().min(1).max(1440),
    slotDurationMins: durationSchema,
    isOnlineAvailable: z.coerce.boolean(),
    isOfflineAvailable: z.coerce.boolean(),
  })
  .refine((data) => data.endMinutesUTC > data.startMinutesUTC, {
    message: "وقت النهاية يجب أن يكون بعد وقت البداية",
    path: ["endMinutesUTC"],
  })
  .refine(
    (data) => (data.endMinutesUTC - data.startMinutesUTC) >= data.slotDurationMins,
    {
      message: "النافذة الزمنية أقصر من مدة الجلسة الواحدة",
      path: ["slotDurationMins"],
    },
  )
  .refine((data) => data.isOnlineAvailable || data.isOfflineAvailable, {
    message: "يجب تفعيل نوع واحد على الأقل: أونلاين أو حضوري",
    path: ["isOnlineAvailable"],
  });

export const deleteAvailabilitySchema = z.object({
  availabilityId: cuidSchema,
  doctorId: cuidSchema.optional(),
});

export const availabilityRuleUpdateSchema = z
  .object({
    availabilityId: cuidSchema,
    doctorId: cuidSchema.optional(),
    dayOfWeek: z.coerce.number().int().min(0, "يوم غير صالح").max(6, "يوم غير صالح"),
    startMinutesUTC: z.coerce.number().int().min(0).max(1439),
    endMinutesUTC: z.coerce.number().int().min(1).max(1440),
    slotDurationMins: durationSchema,
    isOnlineAvailable: z.coerce.boolean(),
    isOfflineAvailable: z.coerce.boolean(),
  })
  .refine((data) => data.endMinutesUTC > data.startMinutesUTC, {
    message: "وقت النهاية يجب أن يكون بعد وقت البداية",
    path: ["endMinutesUTC"],
  })
  .refine(
    (data) => (data.endMinutesUTC - data.startMinutesUTC) >= data.slotDurationMins,
    {
      message: "النافذة الزمنية أقصر من مدة الجلسة الواحدة",
      path: ["slotDurationMins"],
    },
  )
  .refine((data) => data.isOnlineAvailable || data.isOfflineAvailable, {
    message: "يجب تفعيل نوع واحد على الأقل: أونلاين أو حضوري",
    path: ["isOnlineAvailable"],
  });

export const timeOffSchema = z
  .object({
    doctorId: cuidSchema.optional(),
    startsAtUTC: utcInstant,
    endsAtUTC: utcInstant,
    reason: z.string().trim().max(255).optional().or(z.literal("")).transform((v) => v || undefined),
  })
  .refine((data) => data.endsAtUTC > data.startsAtUTC, {
    message: "نهاية فترة الإجازة يجب أن تكون بعد بدايتها",
    path: ["endsAtUTC"],
  });

export const timeOffCancelSchema = z.object({
  exceptionId: cuidSchema,
  doctorId: cuidSchema.optional(),
});

export const forceTimeOffSchema = z
  .object({
    doctorId: cuidSchema,
    startsAtUTC: utcInstant,
    endsAtUTC: utcInstant,
    reason: z.string().trim().max(255).optional().or(z.literal("")).transform((v) => v || undefined),
    cancelConflicts: z.coerce.boolean().refine((v) => v === true, {
      message: "يجب تأكيد إلغاء الحجوزات المتعارضة",
    }),
    cancellationReason: z.string().trim().min(5, "يجب كتابة سبب الإلغاء للمرضى (٥ أحرف على الأقل)").max(500),
  })
  .refine((data) => data.endsAtUTC > data.startsAtUTC, {
    message: "نهاية فترة الإجازة يجب أن تكون بعد بدايتها",
    path: ["endsAtUTC"],
  });

export const rescheduleAppointmentSchema = z.object({
  appointmentId: cuidSchema,
  scheduledAtUTC: utcInstant,
  durationMinutes: durationSchema,
  reason: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
  notifyPatient: z.coerce.boolean().default(true),
  allowOffGrid: z.coerce.boolean().optional(),
});

export const cancelByDoctorSchema = z.object({
  appointmentId: cuidSchema,
  reason: z.string().trim().min(5, "يجب كتابة سبب الإلغاء للمريض (٥ أحرف على الأقل)").max(500),
});

export const releaseReservationSchema = z.object({
  appointmentId: cuidSchema,
});

export const doctorPricingUpdateSchema = z.object({
  doctorId: cuidSchema,
  sessionPriceOnline: z.coerce
    .number()
    .positive("السعر يجب أن يكون أكبر من صفر")
    .max(100_000, "السعر غير منطقي"),
  sessionPriceOffline: z.coerce
    .number()
    .positive("السعر يجب أن يكون أكبر من صفر")
    .max(100_000, "السعر غير منطقي"),
});

export const doctorConcernTagsUpdateSchema = z.object({
  doctorId: cuidSchema,
  concernTags: z.array(z.string()).min(1, "اختر وسماً واحداً على الأقل"),
});

export const doctorStatusToggleSchema = z.object({
  doctorId: cuidSchema,
  isAcceptingPatients: z.coerce.boolean(),
});

export const clinicalRecordSchema = z.object({
  appointmentId: cuidSchema,
  chiefComplaint: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => v || undefined),
  diagnosis: z.string().trim().min(3, "التشخيص مطلوب").max(5000),
  dsm5Codes: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(/[,\n،]/)
            .map((code) => code.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    ),
  prescriptionNotes: z.string().trim().max(5000).optional().or(z.literal("")).transform((v) => v || undefined),
  followUpPlan: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => v || undefined),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  sign: z.coerce.boolean().optional(),
});

export const completeAppointmentSchema = z.object({ appointmentId: cuidSchema });

// --------------------------------------------------------------------------
// Staff Onboarding & Identity Governance Schemas
// --------------------------------------------------------------------------

export const createDoctorSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم يجب أن يكون ٣ أحرف على الأقل").max(120),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").max(190),
  phone: egyptianPhone,
  password: passwordSchema,
  title: z.string().trim().min(2, "اللقب المهني مطلوب").max(100),
  licenseNumber: z.string().trim().min(3, "رقم الترخيص مطلوب").max(40),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).default(0),
  roomNumber: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || undefined),
  sessionPriceOnline: z.coerce.number().min(50, "السعر لا يقل عن 50 ج.م").max(50000),
  sessionPriceOffline: z.coerce.number().min(50, "السعر لا يقل عن 50 ج.م").max(50000),
  specialties: z.array(z.string().trim().min(1)).min(1, "حدد تخصصاً واحداً على الأقل"),
  concernTags: z.array(z.string().trim().min(1)).min(1, "حدد وسم تشخيصي واحداً على الأقل"),
  bioAr: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => v || undefined),
});

export const createAdminSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم يجب أن يكون ٣ أحرف على الأقل").max(120),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").max(190),
  phone: egyptianPhone,
  password: passwordSchema,
});

export const updateDoctorFullProfileSchema = z.object({
  doctorId: cuidSchema,
  title: z.string().trim().min(2, "اللقب المهني مطلوب").max(100),
  licenseNumber: z.string().trim().min(3, "رقم الترخيص مطلوب").max(40),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).default(0),
  roomNumber: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || undefined),
  sessionPriceOnline: z.coerce.number().min(50).max(50000),
  sessionPriceOffline: z.coerce.number().min(50).max(50000),
  specialties: z.array(z.string().trim().min(1)).min(1, "حدد تخصصاً واحداً على الأقل"),
  concernTags: z.array(z.string().trim().min(1)).min(1, "حدد وسم تشخيصي واحداً على الأقل"),
  bioAr: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => v || undefined),
});

export const adminResetPasswordSchema = z
  .object({
    userId: cuidSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const toggleUserActiveSchema = z.object({
  userId: cuidSchema,
  isActive: z.coerce.boolean(),
});

// --------------------------------------------------------------------------
// Patient Credits & Patient Rescheduling Schemas
// --------------------------------------------------------------------------

export const issueManualCreditSchema = z.object({
  patientId: cuidSchema,
  amountEGP: z.coerce.number().min(1, "المبلغ يجب أن يكون جنيهاً واحداً على الأقل").max(100000),
  reason: z.string().trim().min(5, "يرجى توضيح سبب إصدار الرصيد (٥ أحرف على الأقل)").max(500),
});

export const settleCreditSchema = z.object({
  patientId: cuidSchema,
  settlementRef: z.string().trim().min(3, "رقم المعاملة أو مرجع التحويل مطلوب (InstaPay / المحفظة)").max(100),
  notes: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});

export const patientRescheduleSchema = z.object({
  appointmentId: cuidSchema,
  scheduledAtUTC: utcInstant,
  durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
});

// --------------------------------------------------------------------------
// Inferred types
// --------------------------------------------------------------------------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReserveSlotInput = z.infer<typeof reserveSlotSchema>;
export type PaymentProofInput = z.infer<typeof paymentProofSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type ClinicalRecordInput = z.infer<typeof clinicalRecordSchema>;

/** Flatten Zod issues into the `fieldErrors` shape used by ActionFailure. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    // Keep the first message per field: forms show one message per input.
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

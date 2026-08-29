/**
 * WhatsApp deep-link builders and Arabic message templates.
 *
 * The clinic runs its patient communication over WhatsApp, so every operational
 * moment (payment instructions, verification alert, confirmation, reminder,
 * rejection) has a template here. Nothing is sent automatically: these produce
 * `https://wa.me/...` links that a human clicks, which keeps the clinic inside
 * WhatsApp's terms for non-templated business messaging and keeps a person in
 * the loop before anything reaches a patient.
 *
 * Pure module - no server-only import - so both the Admin Verification Desk
 * (client component) and Server Actions can build links from the same source.
 */

/** wa.me requires digits only: no '+', no spaces, no dashes. */
export function toWaMeNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Local Egyptian format (01xxxxxxxxx) needs the country code prepended.
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.startsWith("0020")) return digits.slice(2);
  return digits;
}

/** Build a click-to-chat URL with a pre-filled, URL-encoded message. */
export function buildWhatsAppLink(phone: string, message: string): string {
  const number = toWaMeNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Render a UTC instant in Cairo local time, in Arabic.
 * Appointments are stored in UTC; patients think in Cairo time, so every
 * patient-facing string goes through here.
 */
export function formatCairo(dateUTC: Date): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateUTC);
}

export function formatEgp(amount: number): string {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(amount)} جنيه`;
}

// ---------------------------------------------------------------------------
// Template inputs
// ---------------------------------------------------------------------------

export interface AppointmentSummary {
  patientName: string;
  patientPhone: string;
  doctorName: string;
  type: "ONLINE" | "OFFLINE";
  scheduledAtUTC: Date;
  durationMinutes?: number;
  priceEGP?: number;
  /** ONLINE only. */
  zoomMeetingUrl?: string | null;
  zoomPasscode?: string | null;
  /** OFFLINE only. */
  roomNumber?: string | null;
  clinicAddressAr?: string;
  clinicMapsUrl?: string;
}

export interface PaymentInstructionsInput {
  patientName: string;
  patientPhone: string;
  doctorName: string;
  scheduledAtUTC: Date;
  type: "ONLINE" | "OFFLINE";
  priceEGP: number;
  instapayHandle: string;
  vodafoneCashNumbers: string[];
  holdMinutes: number;
  /** Absolute URL where the patient uploads the receipt. */
  uploadUrl: string;
}

const TYPE_AR: Record<"ONLINE" | "OFFLINE", string> = {
  ONLINE: "جلسة أونلاين عبر زووم",
  OFFLINE: "زيارة حضورية بالعيادة",
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Step 2 of the manual payment flow: how and where to transfer the fee. */
export function paymentInstructionsMessage(input: PaymentInstructionsInput): string {
  const wallets = input.vodafoneCashNumbers.map((number) => `   • ${number}`).join("\n");

  return [
    `مرحباً ${input.patientName} 🌿`,
    `تم حجز موعدك مبدئياً في مركز أسما للصحة النفسية:`,
    ``,
    `👨‍⚕️ الطبيب: ${input.doctorName}`,
    `🗓️ الموعد: ${formatCairo(input.scheduledAtUTC)} (بتوقيت القاهرة)`,
    `💬 نوع الجلسة: ${TYPE_AR[input.type]}`,
    `💰 قيمة الجلسة: ${formatEgp(input.priceEGP)}`,
    ``,
    `لتأكيد الحجز يرجى تحويل قيمة الجلسة خلال ${input.holdMinutes} دقيقة عبر إحدى الوسيلتين:`,
    ``,
    `1️⃣ إنستا باي (InstaPay)`,
    `   • ${input.instapayHandle}`,
    ``,
    `2️⃣ فودافون كاش (Vodafone Cash)`,
    wallets,
    ``,
    `ثم ارفع صورة إيصال التحويل من هنا:`,
    input.uploadUrl,
    ``,
    `⚠️ ملاحظة: الموعد محجوز لك مؤقتاً فقط، ويُتاح لمريض آخر تلقائياً إذا لم يصل الإيصال خلال المهلة.`,
  ].join("\n");
}

/** Internal alert to the verification desk that a new receipt is waiting. */
export function adminVerificationAlertMessage(input: {
  patientName: string;
  doctorName: string;
  scheduledAtUTC: Date;
  method: "INSTAPAY" | "VODAFONE_CASH" | "CREDIT";
  senderIdentifier: string;
  amountClaimedEGP?: number | null;
  reviewUrl: string;
}): string {
  const methodLabel =
    input.method === "INSTAPAY"
      ? "إنستا باي"
      : input.method === "VODAFONE_CASH"
      ? "فودافون كاش"
      : "رصيد مريض";

  return [
    `🔔 إيصال دفع جديد بانتظار المراجعة`,
    ``,
    `👤 المريض: ${input.patientName}`,
    `👨‍⚕️ الطبيب: ${input.doctorName}`,
    `🗓️ الموعد: ${formatCairo(input.scheduledAtUTC)}`,
    `💳 وسيلة الدفع: ${methodLabel}`,
    `📱 حساب المُرسِل: ${input.senderIdentifier}`,
    input.amountClaimedEGP ? `💰 المبلغ المُعلن: ${formatEgp(input.amountClaimedEGP)}` : null,
    ``,
    `مراجعة الإيصال واعتماده:`,
    input.reviewUrl,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** Step 5: sent right after the admin approves the transfer. */
export function bookingConfirmedMessage(input: AppointmentSummary): string {
  const header = [
    `تم تأكيد حجزك بنجاح ✅`,
    ``,
    `مرحباً ${input.patientName}، تم التحقق من تحويلك واعتماد الموعد في مركز أسما للصحة النفسية.`,
    ``,
    `👨‍⚕️ الطبيب: ${input.doctorName}`,
    `🗓️ الموعد: ${formatCairo(input.scheduledAtUTC)} (بتوقيت القاهرة)`,
    `⏱️ مدة الجلسة: ${input.durationMinutes} دقيقة`,
  ];

  const details =
    input.type === "ONLINE"
      ? [
          ``,
          `💻 الجلسة أونلاين عبر زووم. رابط الدخول:`,
          input.zoomMeetingUrl ?? "(سيتم إرسال الرابط قبل الموعد)",
          input.zoomPasscode ? `🔑 كلمة مرور الاجتماع: ${input.zoomPasscode}` : null,
          ``,
          `يرجى الدخول قبل الموعد بـ 5 دقائق من مكان هادئ، مع سماعات وإنترنت مستقر.`,
        ]
      : [
          ``,
          `🏥 الجلسة حضورية بمقر العيادة:`,
          input.clinicAddressAr ?? "",
          input.roomNumber ? `🚪 رقم الغرفة: ${input.roomNumber}` : null,
          input.clinicMapsUrl ? `📍 الموقع على الخريطة: ${input.clinicMapsUrl}` : null,
          ``,
          `يرجى الحضور قبل الموعد بـ 10 دقائق لاستكمال بيانات الاستقبال.`,
        ];

  return [...header, ...details, ``, `في انتظارك 🌿 — مركز أسما للصحة النفسية`]
    .filter((line): line is string => line !== null && line !== "")
    .join("\n");
}

/** Sent when the desk rejects a receipt, with the reason and the retry link. */
export function paymentRejectedMessage(input: {
  patientName: string;
  doctorName: string;
  scheduledAtUTC: Date;
  rejectionReason: string;
  retryUrl: string;
}): string {
  return [
    `مرحباً ${input.patientName}،`,
    ``,
    `لم نتمكن من تأكيد إيصال الدفع الخاص بموعدك مع ${input.doctorName} بتاريخ ${formatCairo(
      input.scheduledAtUTC,
    )}.`,
    ``,
    `📝 السبب: ${input.rejectionReason}`,
    ``,
    `يمكنك رفع إيصال صحيح من هنا للاحتفاظ بموعدك:`,
    input.retryUrl,
    ``,
    `وإذا كان لديك أي استفسار، فريق المركز جاهز لمساعدتك.`,
  ].join("\n");
}

/** Pre-session reminder: Zoom link for ONLINE, directions for OFFLINE. */
export function sessionReminderMessage(input: AppointmentSummary): string {
  const common = [
    `تذكير بموعد جلستك 🌿`,
    ``,
    `مرحباً ${input.patientName}، نذكّرك بموعد جلستك مع ${input.doctorName}:`,
    `🗓️ ${formatCairo(input.scheduledAtUTC)} (بتوقيت القاهرة)`,
  ];

  const details =
    input.type === "ONLINE"
      ? [
          ``,
          `💻 رابط الدخول للجلسة:`,
          input.zoomMeetingUrl ?? "(تواصل معنا للحصول على الرابط)",
          input.zoomPasscode ? `🔑 كلمة المرور: ${input.zoomPasscode}` : null,
          ``,
          `جهّز مكاناً هادئاً واختبر الصوت والكاميرا قبل الموعد بقليل.`,
        ]
      : [
          ``,
          `🏥 العنوان: ${input.clinicAddressAr ?? ""}`,
          input.roomNumber ? `🚪 رقم الغرفة: ${input.roomNumber}` : null,
          input.clinicMapsUrl ? `📍 ${input.clinicMapsUrl}` : null,
          ``,
          `يرجى الحضور قبل الموعد بـ 10 دقائق.`,
        ];

  return [...common, ...details]
    .filter((line): line is string => line !== null && line !== "")
    .join("\n");
}

export interface RescheduleSummary extends AppointmentSummary {
  oldScheduledAtUTC: Date;
  reason?: string;
}

/** Patient notification when an appointment is rescheduled. */
export function appointmentRescheduledMessage(input: RescheduleSummary): string {
  const lines = [
    `تعديل موعد الجلسة 🗓️`,
    ``,
    `مرحباً ${input.patientName}، تم تعديل موعد جلستك مع ${input.doctorName}:`,
    ``,
    `⏳ الموعد السابق: ${formatCairo(input.oldScheduledAtUTC)}`,
    `✨ الموعد الجديد: ${formatCairo(input.scheduledAtUTC)} (بتوقيت القاهرة)`,
    input.reason ? `📝 ملاحظة: ${input.reason}` : null,
  ];

  if (input.type === "ONLINE") {
    lines.push(
      ``,
      `💻 رابط الدخول للجلسة:`,
      input.zoomMeetingUrl ?? "(تواصل معنا للحصول على الرابط)",
      input.zoomPasscode ? `🔑 كلمة المرور: ${input.zoomPasscode}` : null,
    );
  } else {
    lines.push(
      ``,
      `🏥 العنوان: ${input.clinicAddressAr ?? ""}`,
      input.roomNumber ? `🚪 رقم الغرفة: ${input.roomNumber}` : null,
      input.clinicMapsUrl ? `📍 ${input.clinicMapsUrl}` : null,
    );
  }

  lines.push(
    ``,
    `إذا كان الموعد الجديد غير مناسب لك، يرجى التواصل معنا لاختيار موعد بديل.`,
  );

  return lines.filter((l): l is string => l !== null && l !== "").join("\n");
}

export interface ClinicCancellationSummary {
  patientName: string;
  doctorName: string;
  scheduledAtUTC: Date;
  reason: string;
  roomNumber?: string | null;
  rebookUrl?: string;
}

/** Patient notification when a doctor or clinic cancels an appointment. */
export function clinicCancellationMessage(input: ClinicCancellationSummary): string {
  const lines = [
    `إشعار بخصوص موعد جلستك 🌿`,
    ``,
    `مرحباً ${input.patientName}، نعتذر منك بشدة، تم إلغاء موعد جلستك مع ${input.doctorName} بتاريخ ${formatCairo(
      input.scheduledAtUTC,
    )}.`,
    ``,
    `📝 سبب الإلغاء: ${input.reason}`,
    ``,
    `نحن حريصون على استمرار رعايتك. يمكنك اختيار موعد بديل أو التواصل معنا لتسوية الحجز فوراً:`,
    input.rebookUrl ? input.rebookUrl : null,
    ``,
    `فريق المركز في خدمتك دائماً لأي استفسار.`,
  ];

  return lines.filter((l): l is string => l !== null && l !== "").join("\n");
}

// ---------------------------------------------------------------------------
// One-call link builders (message + wa.me URL in a single step)
// ---------------------------------------------------------------------------

export function paymentInstructionsLink(input: PaymentInstructionsInput): string {
  return buildWhatsAppLink(input.patientPhone, paymentInstructionsMessage(input));
}

export function bookingConfirmedLink(input: AppointmentSummary): string {
  return buildWhatsAppLink(input.patientPhone, bookingConfirmedMessage(input));
}

export function sessionReminderLink(input: AppointmentSummary): string {
  return buildWhatsAppLink(input.patientPhone, sessionReminderMessage(input));
}

export function paymentRejectedLink(
  input: Parameters<typeof paymentRejectedMessage>[0] & { patientPhone: string },
): string {
  return buildWhatsAppLink(input.patientPhone, paymentRejectedMessage(input));
}

export function adminVerificationAlertLink(
  input: Parameters<typeof adminVerificationAlertMessage>[0] & { adminPhone: string },
): string {
  return buildWhatsAppLink(input.adminPhone, adminVerificationAlertMessage(input));
}

export function appointmentRescheduledLink(
  input: RescheduleSummary & { patientPhone: string },
): string {
  return buildWhatsAppLink(input.patientPhone, appointmentRescheduledMessage(input));
}

export function clinicCancellationLink(
  input: ClinicCancellationSummary & { patientPhone: string },
): string {
  return buildWhatsAppLink(input.patientPhone, clinicCancellationMessage(input));
}

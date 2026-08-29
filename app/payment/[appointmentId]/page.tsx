import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, CheckCircle2, Clock3, Video, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRolePage } from "@/lib/auth/guards";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getClinicConfig } from "@/lib/clinic-config";
import { toEgp } from "@/lib/serialization";
import { asAppointmentStatus, asAppointmentType } from "@/lib/domain/enums";
import { buildWhatsAppLink, formatCairo, formatEgp } from "@/lib/whatsapp";
import { PaymentUploadForm } from "@/components/booking/PaymentUploadForm";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "إتمام الدفع وتأكيد الحجز | مركز أسما للصحة النفسية"
        : "Payment & Confirmation | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "حوّل قيمة الجلسة عبر إنستا باي أو فودافون كاش وارفع صورة الإيصال لتأكيد حجزك."
        : "Transfer consultation fee via InstaPay or Vodafone Cash and upload receipt to confirm booking.",
  };
}

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const [auth, lang] = await Promise.all([
    requireRolePage(["PATIENT"], `/payment/${appointmentId}`),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      type: true,
      status: true,
      scheduledAtUTC: true,
      durationMinutes: true,
      priceEGP: true,
      holdExpiresAt: true,
      zoomMeetingUrl: true,
      zoomPasscode: true,
      clinicNotes: true,
      doctor: { select: { roomNumber: true, user: { select: { fullName: true } } } },
      paymentProofs: {
        orderBy: { uploadedAt: "desc" },
        take: 1,
        select: { status: true, rejectionReason: true },
      },
    },
  });

  // Same response for "not found" and "not yours".
  if (!appointment || appointment.patientId !== auth.user.id) notFound();

  const status = asAppointmentStatus(appointment.status);
  const type = asAppointmentType(appointment.type);
  const clinic = getClinicConfig();
  const priceEGP = toEgp(appointment.priceEGP);
  const doctorName = appointment.doctor.user.fullName;

  const header = (
    <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3">
      <h1 className="text-lg font-black text-teal-950">
        {status === "CONFIRMED"
          ? isAr
            ? "تفاصيل جلستك المؤكدة"
            : "Confirmed Appointment Details"
          : isAr
          ? "إتمام حجز جلستك"
          : "Complete Your Booking"}
      </h1>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <Row label={isAr ? "الطبيب المعالج" : "Consultant"} value={doctorName} />
        <Row
          label={isAr ? "الموعد (بتوقيت القاهرة)" : "Scheduled Time (Cairo)"}
          value={formatCairo(appointment.scheduledAtUTC)}
        />
        <Row
          label={isAr ? "نوع الجلسة" : "Session Format"}
          value={
            type === "ONLINE"
              ? isAr
                ? "أونلاين عبر زووم"
                : "Online (Zoom Video)"
              : isAr
              ? "حضورية بمقر العيادة"
              : "In-Clinic Visit"
          }
        />
        <Row label={isAr ? "قيمة الجلسة" : "Consultation Fee"} value={formatEgp(priceEGP)} />
      </dl>
    </div>
  );

  // ---- states that are not "please upload a receipt" ----------------------

  if (status === "PAYMENT_UNDER_REVIEW") {
    return (
      <Shell>
        {header}
        <StatusCard
          tone="pending"
          icon={Clock3}
          title={isAr ? "إيصالك قيد المراجعة" : "Payment Proof Under Review"}
          body={
            isAr
              ? "استلمنا إيصال التحويل وفريق المركز يراجعه الآن. سيصلك تأكيد الحجز على واتساب فور الاعتماد، ومعه رابط زووم أو عنوان العيادة."
              : "We have received your transfer receipt and our clinic team is verifying it. You will receive a WhatsApp confirmation with your Zoom link as soon as it is approved."
          }
        />
      </Shell>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <Shell>
        {header}
        <StatusCard
          tone="success"
          icon={CheckCircle2}
          title={isAr ? "تم تأكيد حجزك بنجاح" : "Appointment Confirmed"}
          body={
            type === "ONLINE"
              ? isAr
                ? "جلستك أونلاين. ادخل من الرابط قبل الموعد بخمس دقائق من مكان هادئ."
                : "Your session is online via Zoom. Please join 5 minutes before the scheduled time from a private, quiet space."
              : isAr
              ? `جلستك حضورية بمقر المركز: ${clinic.addressAr}${
                  appointment.doctor.roomNumber ? ` — غرفة ${appointment.doctor.roomNumber}` : ""
                }. يرجى الحضور قبل الموعد بعشر دقائق.`
              : `Your session is in-clinic: ${clinic.addressAr}${
                  appointment.doctor.roomNumber ? ` — Room ${appointment.doctor.roomNumber}` : ""
                }. Please arrive 10 minutes prior to your appointment.`
          }
        >
          {type === "ONLINE" && appointment.zoomMeetingUrl && (
            <a
              href={appointment.zoomMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>{isAr ? "الدخول إلى جلسة زووم" : "Join Zoom Session"}</span>
            </a>
          )}
          {type === "OFFLINE" && (
            <a
              href={clinic.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-extrabold transition shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              <span>{isAr ? "فتح موقع العيادة على الخريطة" : "Open Clinic on Maps"}</span>
            </a>
          )}
        </StatusCard>
      </Shell>
    );
  }

  if (status === "CANCELLED" || status === "EXPIRED" || status === "COMPLETED") {
    const copyAr = {
      CANCELLED: ["تم إلغاء هذا الحجز", "يمكنك حجز موعد جديد في أي وقت."],
      EXPIRED: [
        "انتهت مهلة هذا الحجز",
        "لم يصل إيصال الدفع خلال المهلة، فتم تحرير الموعد لمريض آخر. يمكنك حجز موعد جديد.",
      ],
      COMPLETED: ["هذه الجلسة مكتملة", "تجدها في سجل جلساتك داخل بوابة المريض."],
    }[status];

    const copyEn = {
      CANCELLED: ["Appointment Cancelled", "You can book a new appointment anytime."],
      EXPIRED: [
        "Hold Expired",
        "Payment receipt was not uploaded within the hold window. The slot has been released. Please select a new time.",
      ],
      COMPLETED: ["Session Completed", "Consultation records are available in your patient portal."],
    }[status];

    const copy = isAr ? copyAr : copyEn;

    return (
      <Shell>
        {header}
        <StatusCard tone="neutral" icon={XCircle} title={copy[0]!} body={copy[1]!}>
          <Link
            href="/therapists"
            className="inline-block px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition"
          >
            {isAr ? "حجز موعد جديد" : "Book New Appointment"}
          </Link>
        </StatusCard>
      </Shell>
    );
  }

  // A past appointment can no longer be paid for, whatever its status says.
  if (appointment.scheduledAtUTC.getTime() < Date.now()) {
    redirect("/dashboard/patient");
  }

  // ---- PENDING_PAYMENT_PROOF or REJECTED: show the upload form ------------

  const csrfToken = await ensureCsrfToken();
  const latestProof = appointment.paymentProofs[0];

  return (
    <Shell>
      {header}
      <PaymentUploadForm
        appointmentId={appointment.id}
        csrfToken={csrfToken}
        priceEGP={priceEGP}
        holdExpiresAtUTC={appointment.holdExpiresAt?.toISOString() ?? null}
        instapayHandle={clinic.instapayHandle}
        vodafoneCashNumbers={clinic.vodafoneCashNumbers}
        rejectionReason={
          latestProof?.status === "REJECTED" ? latestProof.rejectionReason : null
        }
        clinicWhatsappUrl={buildWhatsAppLink(
          clinic.whatsappNumber,
          isAr
            ? `مرحباً، أنا ${auth.user.fullName}. لدي استفسار بخصوص إتمام الدفع لموعدي مع ${doctorName} ` +
                `بتاريخ ${formatCairo(appointment.scheduledAtUTC)} (رقم الحجز: ${appointment.id}).`
            : `Hello, I am ${auth.user.fullName}. I have an inquiry regarding payment for my appointment with ${doctorName} ` +
                `scheduled on ${formatCairo(appointment.scheduledAtUTC)} (ID: ${appointment.id}).`,
        )}
      />
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-2xl bg-alabaster-base border border-alabaster-border">
      <dt className="text-[10px] text-gray-400 font-bold mb-0.5">{label}</dt>
      <dd className="text-xs font-bold text-gray-900">{value}</dd>
    </div>
  );
}

function StatusCard({
  tone,
  icon: Icon,
  title,
  body,
  children,
}: {
  tone: "pending" | "success" | "neutral";
  icon: typeof CheckCircle2;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const palette = {
    pending: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-600",
    neutral: "bg-white border-alabaster-border text-gray-400",
  }[tone];

  return (
    <div className={`rounded-3xl border p-8 text-center space-y-4 ${palette}`}>
      <Icon className="w-12 h-12 mx-auto" />
      <h2 className="text-lg font-black text-teal-950">{title}</h2>
      <p className="text-xs text-gray-700 leading-relaxed max-w-md mx-auto">{body}</p>
      {children}
    </div>
  );
}

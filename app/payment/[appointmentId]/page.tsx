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

export const metadata: Metadata = {
  title: "إتمام الدفع | مركز أسما للصحة النفسية",
  description: "حوّل قيمة الجلسة عبر إنستا باي أو فودافون كاش وارفع صورة الإيصال لتأكيد حجزك.",
};

/**
 * Payment step for one appointment.
 *
 * The route is on its own path segment rather than under /booking/[doctorId],
 * because Next.js requires a single parameter name per dynamic segment position
 * and this identifier is an appointment, not a doctor.
 *
 * Access control is per-row: the page loads the appointment and refuses it
 * unless the signed-in patient owns it. A patient guessing another patient's
 * appointment id gets a 404, the same response as a genuinely missing record, so
 * ids cannot be probed.
 */
export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const auth = await requireRolePage(["PATIENT"], `/payment/${appointmentId}`);

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
        {status === "CONFIRMED" ? "تفاصيل جلستك المؤكدة" : "إتمام حجز جلستك"}
      </h1>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <Row label="الطبيب" value={doctorName} />
        <Row label="الموعد (بتوقيت القاهرة)" value={formatCairo(appointment.scheduledAtUTC)} />
        <Row
          label="نوع الجلسة"
          value={type === "ONLINE" ? "أونلاين عبر زووم" : "حضورية بالعيادة"}
        />
        <Row label="قيمة الجلسة" value={formatEgp(priceEGP)} />
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
          title="إيصالك قيد المراجعة"
          body="استلمنا إيصال التحويل وفريق المركز يراجعه الآن. سيصلك تأكيد الحجز على واتساب فور الاعتماد، ومعه رابط زووم أو عنوان العيادة."
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
          title="تم تأكيد حجزك"
          body={
            type === "ONLINE"
              ? "جلستك أونلاين. ادخل من الرابط قبل الموعد بخمس دقائق من مكان هادئ."
              : `جلستك حضورية بمقر المركز: ${clinic.addressAr}${
                  appointment.doctor.roomNumber ? ` — غرفة ${appointment.doctor.roomNumber}` : ""
                }. يرجى الحضور قبل الموعد بعشر دقائق.`
          }
        >
          {type === "ONLINE" && appointment.zoomMeetingUrl && (
            <a
              href={appointment.zoomMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition"
            >
              <Video className="w-4 h-4" />
              الدخول إلى جلسة زووم
            </a>
          )}
          {type === "OFFLINE" && (
            <a
              href={clinic.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-extrabold transition"
            >
              <Building2 className="w-4 h-4" />
              فتح موقع العيادة على الخريطة
            </a>
          )}
        </StatusCard>
      </Shell>
    );
  }

  if (status === "CANCELLED" || status === "EXPIRED" || status === "COMPLETED") {
    const copy = {
      CANCELLED: ["تم إلغاء هذا الحجز", "يمكنك حجز موعد جديد في أي وقت."],
      EXPIRED: [
        "انتهت مهلة هذا الحجز",
        "لم يصل إيصال الدفع خلال المهلة، فتم تحرير الموعد لمريض آخر. يمكنك حجز موعد جديد.",
      ],
      COMPLETED: ["هذه الجلسة مكتملة", "تجدها في سجل جلساتك داخل بوابة المريض."],
    }[status];

    return (
      <Shell>
        {header}
        <StatusCard tone="neutral" icon={XCircle} title={copy[0]!} body={copy[1]!}>
          <Link
            href="/therapists"
            className="inline-block px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition"
          >
            حجز موعد جديد
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
          `مرحباً، أنا ${auth.user.fullName}. لدي استفسار بخصوص إتمام الدفع لموعدي مع ${doctorName} ` +
            `بتاريخ ${formatCairo(appointment.scheduledAtUTC)} (رقم الحجز: ${appointment.id}).`,
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

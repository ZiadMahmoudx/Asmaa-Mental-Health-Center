"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  Video,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { PendingPaymentRow } from "@/app/actions/payment.actions";
import type { ReviewedProofRow } from "@/app/actions/admin.actions";
import { approvePaymentAction, rejectPaymentAction } from "@/app/actions/admin.actions";
import type { ActionResult } from "@/lib/result";
import type { ApprovalPayload, RejectionPayload } from "@/app/actions/admin.actions";
import { CSRF_FIELD, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCairo, formatEgp } from "@/lib/whatsapp";

/**
 * Admin Verification Desk.
 *
 * The whole manual-payment flow converges here: a reviewer sees the receipt
 * image beside the booking it claims to pay for, approves or rejects in one
 * click, and is handed a pre-filled WhatsApp message to send the patient.
 *
 * Deliberate choices:
 *  - Approve and reject are real <form> submissions bound through
 *    `useActionState`, so the desk keeps working without client-side JS and the
 *    pending state comes from React rather than a hand-rolled boolean.
 *  - The WhatsApp link is revealed only AFTER the server confirms the
 *    transition, so a reviewer can never message a patient "confirmed" for an
 *    approval that in fact failed.
 *  - Nothing is optimistic. Money and clinical scheduling are the two places
 *    where showing a state that did not happen is worse than a short wait.
 */

interface Props {
  rows: PendingPaymentRow[];
  history: ReviewedProofRow[];
  csrfToken: string;
  /** Row to open on load, from ?proof=... in the admin alert link. */
  initialProofId?: string;
}

type Tab = "QUEUE" | "HISTORY";

const initialApproval: ActionResult<ApprovalPayload> | null = null;
const initialRejection: ActionResult<RejectionPayload> | null = null;

export function PaymentVerificationDesk({ rows, history, csrfToken, initialProofId }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [tab, setTab] = useState<Tab>("QUEUE");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProofId ?? rows[0]?.paymentProofId ?? null,
  );

  const [approvalState, approveFormAction, approvePending] = useActionState(
    approvePaymentAction,
    initialApproval,
  );
  const [rejectionState, rejectFormAction, rejectPending] = useActionState(
    rejectPaymentAction,
    initialRejection,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [
        row.patient.fullName,
        row.patient.phone,
        row.doctor.fullName,
        row.senderIdentifier,
        row.transactionRef ?? "",
        row.appointmentId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, query]);

  const selected = useMemo(
    () => rows.find((row) => row.paymentProofId === selectedId) ?? null,
    [rows, selectedId],
  );

  // When a decision lands, the parent server component revalidates and the row
  // disappears from `rows`; move the selection to whatever is next in the queue.
  useEffect(() => {
    if (selectedId && !rows.some((row) => row.paymentProofId === selectedId)) {
      setSelectedId(rows[0]?.paymentProofId ?? null);
    }
  }, [rows, selectedId]);

  const decidedProofId =
    (approvalState?.ok ? approvalState.data.paymentProofId : null) ??
    (rejectionState?.ok ? rejectionState.data.paymentProofId : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-800 border border-teal-700 flex items-center justify-center text-sage-300">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black">
              {isAr ? "مكتب مراجعة واعتماد المدفوعات" : "Payment Verification Desk"}
            </h1>
            <p className="text-xs text-teal-300">
              {isAr
                ? "مراجعة إيصالات إنستا باي وفودافون كاش، واعتماد الحجوزات وإرسال الروابط للمرضى"
                : "Review InstaPay & Vodafone Cash receipts, confirm bookings, send patient links"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-3 bg-teal-900 rounded-2xl border border-teal-800 text-center">
            <span className="text-[10px] text-teal-300 block">
              {isAr ? "بانتظار المراجعة" : "Awaiting review"}
            </span>
            <span className="text-2xl font-black text-amber-300">{rows.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        {(
          [
            { id: "QUEUE" as const, ar: "قائمة المراجعة", en: "Review queue", icon: Receipt },
            { id: "HISTORY" as const, ar: "سجل القرارات", en: "Decision log", icon: FileText },
          ] satisfies { id: Tab; ar: string; en: string; icon: typeof Receipt }[]
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap ${
                active
                  ? "bg-teal-800 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? item.ar : item.en}</span>
              {item.id === "QUEUE" && rows.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg bg-amber-400 text-teal-950 text-[10px] font-black">
                  {rows.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "QUEUE" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Queue list */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  isAr ? "بحث بالاسم أو الهاتف أو رقم العملية…" : "Search name, phone, reference…"
                }
                className="w-full bg-white ps-10 pe-4 py-3 rounded-2xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl border border-alabaster-border p-10 text-center space-y-3">
                <BadgeCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-teal-950">
                  {rows.length === 0
                    ? isAr
                      ? "لا توجد إيصالات بانتظار المراجعة"
                      : "No receipts awaiting review"
                    : isAr
                      ? "لا توجد نتائج مطابقة لبحثك"
                      : "No results match your search"}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {filtered.map((row) => {
                  const active = row.paymentProofId === selectedId;
                  return (
                    <li key={row.paymentProofId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.paymentProofId)}
                        className={`w-full text-start p-4 rounded-2xl border transition ${
                          active
                            ? "bg-teal-50 border-teal-700 shadow-sm"
                            : "bg-white border-alabaster-border hover:border-sage-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-extrabold text-sm text-teal-950 truncate">
                              {row.patient.fullName}
                            </h4>
                            <p className="text-[11px] text-gray-500 truncate">
                              {row.doctor.fullName} • {formatCairo(new Date(row.appointment.scheduledAtUTC))}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="px-2 py-0.5 rounded-lg bg-alabaster-muted text-[10px] font-bold text-gray-700">
                                {isAr
                                  ? PAYMENT_METHOD_LABELS[row.method].ar
                                  : PAYMENT_METHOD_LABELS[row.method].en}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                  row.appointment.type === "ONLINE"
                                    ? "bg-teal-100 text-teal-900"
                                    : "bg-sage-100 text-sage-900"
                                }`}
                              >
                                {row.appointment.type === "ONLINE" ? (
                                  <Video className="w-3 h-3" />
                                ) : (
                                  <Building2 className="w-3 h-3" />
                                )}
                                {row.appointment.type === "ONLINE"
                                  ? isAr ? "أونلاين" : "Online"
                                  : isAr ? "بالعيادة" : "In-clinic"}
                              </span>
                              {row.amountMismatch && (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {isAr ? "المبلغ مختلف" : "Amount differs"}
                                </span>
                              )}
                              {row.appointment.rescheduledFromUTC && (
                                <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 text-[10px] font-bold">
                                  {isAr ? "تمت إعادة الجدولة" : "Rescheduled"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <span className="block text-sm font-black text-teal-900">
                              {formatEgp(row.appointment.priceEGP)}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 justify-end mt-1">
                              <Clock className="w-3 h-3" />
                              <WaitingFor sinceIso={row.uploadedAtUTC} isAr={isAr} />
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail + decision panel */}
          <div className="lg:col-span-7">
            {selected ? (
              <ReviewPanel
                key={selected.paymentProofId}
                row={selected}
                csrfToken={csrfToken}
                isAr={isAr}
                approveFormAction={approveFormAction}
                rejectFormAction={rejectFormAction}
                approvePending={approvePending}
                rejectPending={rejectPending}
                approvalState={
                  decidedProofId === selected.paymentProofId ? approvalState : null
                }
                rejectionState={
                  decidedProofId === selected.paymentProofId ? rejectionState : null
                }
              />
            ) : (
              <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center space-y-3">
                <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500 font-semibold">
                  {isAr ? "اختر إيصالاً من القائمة لمراجعته" : "Select a receipt to review"}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DecisionLog history={history} isAr={isAr} />
      )}

      {/* Result banners - rendered outside the panel so they survive a re-render
          that removes the reviewed row from the queue. */}
      {approvalState && !approvalState.ok && (
        <Banner tone="error" message={isAr ? approvalState.messageAr : approvalState.messageEn} />
      )}
      {rejectionState && !rejectionState.ok && (
        <Banner tone="error" message={isAr ? rejectionState.messageAr : rejectionState.messageEn} />
      )}

      {approvalState?.ok && (
        <SuccessBanner
          isAr={isAr}
          tone="approved"
          title={isAr ? "تم اعتماد الحجز بنجاح" : "Booking confirmed"}
          description={
            isAr
              ? "أرسل رسالة التأكيد للمريض عبر واتساب — تتضمن الرابط أو عنوان العيادة تلقائياً."
              : "Send the confirmation to the patient on WhatsApp - the link or clinic address is already included."
          }
          links={[
            {
              href: approvalState.data.whatsappConfirmationUrl,
              label: isAr ? "إرسال تأكيد الحجز على واتساب" : "Send confirmation on WhatsApp",
            },
            {
              href: approvalState.data.whatsappReminderUrl,
              label: isAr ? "نسخ رسالة التذكير قبل الجلسة" : "Pre-session reminder message",
            },
          ]}
        />
      )}

      {rejectionState?.ok && (
        <SuccessBanner
          isAr={isAr}
          tone="rejected"
          title={isAr ? "تم رفض الإيصال" : "Receipt rejected"}
          description={
            rejectionState.data.graceMinutes > 0
              ? isAr
                ? `الموعد محجوز للمريض لمدة ${rejectionState.data.graceMinutes} دقيقة إضافية لرفع إيصال صحيح.`
                : `The slot is held for another ${rejectionState.data.graceMinutes} minutes so the patient can resubmit.`
              : isAr
                ? "تم تحرير الموعد لأن وقت الجلسة قد مضى."
                : "The slot was released because the session time has passed."
          }
          links={[
            {
              href: rejectionState.data.whatsappRejectionUrl,
              label: isAr ? "إبلاغ المريض بالسبب على واتساب" : "Notify the patient on WhatsApp",
            },
          ]}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------

function ReviewPanel({
  row,
  csrfToken,
  isAr,
  approveFormAction,
  rejectFormAction,
  approvePending,
  rejectPending,
  approvalState,
  rejectionState,
}: {
  row: PendingPaymentRow;
  csrfToken: string;
  isAr: boolean;
  approveFormAction: (formData: FormData) => void;
  rejectFormAction: (formData: FormData) => void;
  approvePending: boolean;
  rejectPending: boolean;
  approvalState: ActionResult<ApprovalPayload> | null;
  rejectionState: ActionResult<RejectionPayload> | null;
}) {
  const [mode, setMode] = useState<"APPROVE" | "REJECT">("APPROVE");
  const isOnline = row.appointment.type === "ONLINE";
  const isPdf = row.receiptMimeType === "application/pdf";
  const busy = approvePending || rejectPending;

  const approveErrors = approvalState && !approvalState.ok ? approvalState.fieldErrors : undefined;
  const rejectErrors = rejectionState && !rejectionState.ok ? rejectionState.fieldErrors : undefined;

  return (
    <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
      {/* Booking summary */}
      <div className="p-6 border-b border-alabaster-border space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-teal-950">{row.patient.fullName}</h3>
            <a
              href={`tel:${row.patient.phone}`}
              className="text-xs text-gray-600 font-mono flex items-center gap-1.5 hover:text-teal-800"
              dir="ltr"
            >
              <Phone className="w-3.5 h-3.5" />
              {row.patient.phone}
            </a>
            <p className="text-xs text-gray-500">{row.patient.email}</p>
          </div>
          <div className="text-end">
            <span className="block text-2xl font-black text-teal-900">
              {formatEgp(row.appointment.priceEGP)}
            </span>
            <span className="text-[11px] text-gray-500">
              {isAr ? "قيمة الجلسة المستحقة" : "Session fee due"}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <Field
            label={isAr ? "الطبيب" : "Doctor"}
            value={row.doctor.fullName}
          />
          <Field
            label={isAr ? "الموعد (توقيت القاهرة)" : "Appointment (Cairo time)"}
            value={formatCairo(new Date(row.appointment.scheduledAtUTC))}
          />
          <Field
            label={isAr ? "نوع الجلسة" : "Session type"}
            value={
              isOnline
                ? isAr ? "أونلاين عبر زووم" : "Online via Zoom"
                : isAr
                  ? `حضورية بالعيادة${row.doctor.roomNumber ? ` — غرفة ${row.doctor.roomNumber}` : ""}`
                  : `In-clinic${row.doctor.roomNumber ? ` - room ${row.doctor.roomNumber}` : ""}`
            }
          />
          <Field
            label={isAr ? "وسيلة الدفع" : "Payment method"}
            value={isAr ? PAYMENT_METHOD_LABELS[row.method].ar : PAYMENT_METHOD_LABELS[row.method].en}
          />
          <Field
            label={isAr ? "حساب المُرسِل" : "Sender account"}
            value={row.senderIdentifier}
            mono
          />
          <Field
            label={isAr ? "رقم العملية" : "Transaction reference"}
            value={row.transactionRef ?? (isAr ? "لم يُدخل" : "Not provided")}
            mono
          />
          <Field
            label={isAr ? "المبلغ المُعلن من المريض" : "Amount declared by patient"}
            value={
              row.amountClaimedEGP !== null
                ? formatEgp(row.amountClaimedEGP)
                : isAr ? "لم يُدخل" : "Not provided"
            }
            warn={row.amountMismatch}
          />
          <Field
            label={isAr ? "وقت رفع الإيصال" : "Uploaded at"}
            value={formatCairo(new Date(row.uploadedAtUTC))}
          />
        </dl>

        {row.amountMismatch && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? "المبلغ الذي أدخله المريض لا يطابق قيمة الجلسة. تحقق من الإيصال قبل الاعتماد."
                : "The amount the patient declared does not match the session fee. Check the receipt before approving."}
            </span>
          </div>
        )}
      </div>

      {/* Receipt preview */}
      <div className="p-6 border-b border-alabaster-border space-y-3 bg-alabaster-base">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-teal-950 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-sage-700" />
            {isAr ? "صورة إيصال التحويل" : "Transfer receipt"}
          </h4>
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isAr ? "فتح بالحجم الكامل" : "Open full size"}
          </a>
        </div>

        {isPdf ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-5 bg-white rounded-2xl border border-alabaster-border hover:border-teal-700 transition"
          >
            <FileText className="w-8 h-8 text-terracotta-600" />
            <div>
              <p className="text-sm font-bold text-teal-950">
                {isAr ? "الإيصال بصيغة PDF" : "Receipt is a PDF"}
              </p>
              <p className="text-[11px] text-gray-500">
                {isAr ? "اضغط لفتح الملف في تبويب جديد" : "Click to open in a new tab"}
              </p>
            </div>
          </a>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- authorised
             private route, not an optimisable public asset */
          <img
            src={row.receiptUrl}
            alt={isAr ? "إيصال التحويل" : "Transfer receipt"}
            className="w-full max-h-[420px] object-contain rounded-2xl border border-alabaster-border bg-white"
          />
        )}
      </div>

      {/* Decision */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("APPROVE")}
            className={`py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              mode === "APPROVE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isAr ? "اعتماد الدفع" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setMode("REJECT")}
            className={`py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              mode === "REJECT"
                ? "bg-crisis text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <XCircle className="w-4 h-4" />
            {isAr ? "رفض الإيصال" : "Reject"}
          </button>
        </div>

        {mode === "APPROVE" ? (
          <form action={approveFormAction} className="space-y-3">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="paymentProofId" value={row.paymentProofId} />

            {isOnline ? (
              <>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "رابط اجتماع زووم (مطلوب) *" : "Zoom meeting link (required) *"}
                  </span>
                  <input
                    type="url"
                    name="zoomMeetingUrl"
                    required
                    dir="ltr"
                    placeholder="https://us02web.zoom.us/j/1234567890"
                    className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
                  />
                  {approveErrors?.zoomMeetingUrl && (
                    <span className="text-[11px] text-crisis font-bold">
                      {approveErrors.zoomMeetingUrl}
                    </span>
                  )}
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "كلمة مرور الاجتماع (اختياري)" : "Meeting passcode (optional)"}
                  </span>
                  <input
                    type="text"
                    name="zoomPasscode"
                    dir="ltr"
                    className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
                  />
                </label>
              </>
            ) : (
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-gray-700">
                  {isAr
                    ? "ملاحظات الاستقبال للزيارة الحضورية (اختياري)"
                    : "Reception notes for the in-person visit (optional)"}
                </span>
                <textarea
                  name="clinicNotes"
                  rows={3}
                  placeholder={
                    isAr
                      ? "مثال: الحضور قبل الموعد بـ 10 دقائق، الدور الثالث، غرفة 4."
                      : "e.g. arrive 10 minutes early, third floor, room 4."
                  }
                  className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium leading-relaxed"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs transition flex items-center justify-center gap-2"
            >
              {approvePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isAr ? "اعتماد الدفع وتأكيد الحجز" : "Approve payment & confirm booking"}
            </button>
          </form>
        ) : (
          <form action={rejectFormAction} className="space-y-3">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="paymentProofId" value={row.paymentProofId} />

            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-gray-700">
                {isAr ? "سبب الرفض (يصل للمريض) *" : "Rejection reason (sent to the patient) *"}
              </span>
              <textarea
                name="rejectionReason"
                rows={3}
                required
                minLength={5}
                maxLength={500}
                placeholder={
                  isAr
                    ? "مثال: صورة الإيصال غير واضحة، أو المبلغ المحوّل أقل من قيمة الجلسة."
                    : "e.g. the receipt is unreadable, or the transferred amount is less than the fee."
                }
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-crisis font-medium leading-relaxed"
              />
              {rejectErrors?.rejectionReason && (
                <span className="text-[11px] text-crisis font-bold">
                  {rejectErrors.rejectionReason}
                </span>
              )}
            </label>

            <div className="flex flex-wrap gap-1.5">
              {(isAr
                ? [
                    "صورة الإيصال غير واضحة",
                    "المبلغ المحوّل أقل من قيمة الجلسة",
                    "لم يصل التحويل لحساب المركز",
                    "بيانات المُرسِل لا تطابق الإيصال",
                  ]
                : [
                    "Receipt image is unreadable",
                    "Transferred amount is below the fee",
                    "No matching transfer received",
                    "Sender details do not match the receipt",
                  ]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={(event) => {
                    const form = event.currentTarget.closest("form");
                    const field = form?.elements.namedItem("rejectionReason");
                    if (field instanceof HTMLTextAreaElement) {
                      field.value = preset;
                      field.focus();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-alabaster-muted hover:bg-crisis-light text-[10px] font-bold text-gray-700 border border-alabaster-border transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-crisis hover:bg-crisis-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs transition flex items-center justify-center gap-2"
            >
              {rejectPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {isAr ? "رفض الإيصال وإبلاغ المريض" : "Reject receipt & notify patient"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="p-3 rounded-2xl bg-alabaster-base border border-alabaster-border">
      <dt className="text-[10px] text-gray-400 font-bold mb-0.5">{label}</dt>
      <dd
        className={`text-xs font-bold break-words ${warn ? "text-amber-700" : "text-gray-900"} ${
          mono ? "font-mono" : ""
        }`}
        dir={mono ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

/** How long a receipt has been sitting in the queue. */
function WaitingFor({ sinceIso, isAr }: { sinceIso: string; isAr: boolean }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    // Computed on the client only: rendering a relative time on the server would
    // produce a hydration mismatch the moment the clock ticks past a minute.
    const update = () => {
      const minutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(sinceIso).getTime()) / 60000),
      );
      if (minutes < 60) {
        setLabel(isAr ? `منذ ${minutes} د` : `${minutes}m ago`);
      } else {
        const hours = Math.floor(minutes / 60);
        setLabel(isAr ? `منذ ${hours} س` : `${hours}h ago`);
      }
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [sinceIso, isAr]);

  return <span>{label}</span>;
}

function Banner({ tone, message }: { tone: "error" | "info"; message: string }) {
  return (
    <div
      role="alert"
      className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-2 ${
        tone === "error"
          ? "bg-crisis-light border border-crisis/30 text-crisis-dark"
          : "bg-teal-50 border border-teal-100 text-teal-900"
      }`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({
  isAr,
  tone,
  title,
  description,
  links,
}: {
  isAr: boolean;
  tone: "approved" | "rejected";
  title: string;
  description: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div
      role="status"
      className={`p-5 rounded-3xl border space-y-3 ${
        tone === "approved"
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {tone === "approved" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <RefreshCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <h4 className="text-sm font-black text-gray-900">{title}</h4>
          <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5B] text-white text-xs font-extrabold transition flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {link.label}
          </a>
        ))}
      </div>

      <p className="text-[10px] text-gray-500">
        {isAr
          ? "سيفتح واتساب برسالة جاهزة — راجعها قبل الإرسال."
          : "WhatsApp opens with the message pre-filled - review it before sending."}
      </p>
    </div>
  );
}

function DecisionLog({ history, isAr }: { history: ReviewedProofRow[]; isAr: boolean }) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center">
        <p className="text-sm text-gray-500 font-semibold">
          {isAr ? "لا توجد قرارات مسجلة بعد" : "No decisions recorded yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-alabaster-base text-gray-500">
            <tr>
              <Th>{isAr ? "المريض" : "Patient"}</Th>
              <Th>{isAr ? "الطبيب" : "Doctor"}</Th>
              <Th>{isAr ? "الموعد" : "Appointment"}</Th>
              <Th>{isAr ? "القيمة" : "Amount"}</Th>
              <Th>{isAr ? "القرار" : "Decision"}</Th>
              <Th>{isAr ? "المراجع" : "Reviewer"}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map((entry) => (
              <tr key={entry.paymentProofId} className="hover:bg-alabaster-base/60">
                <Td strong>{entry.patientName}</Td>
                <Td>{entry.doctorName}</Td>
                <Td>{formatCairo(new Date(entry.scheduledAtUTC))}</Td>
                <Td>{formatEgp(entry.priceEGP)}</Td>
                <Td>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      entry.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-crisis-light text-crisis-dark border border-crisis/20"
                    }`}
                  >
                    {entry.status === "APPROVED"
                      ? isAr ? "معتمد" : "Approved"
                      : isAr ? "مرفوض" : "Rejected"}
                  </span>
                  {entry.rejectionReason && (
                    <span className="block text-[10px] text-gray-500 mt-1 max-w-[220px]">
                      {entry.rejectionReason}
                    </span>
                  )}
                </Td>
                <Td>{entry.reviewedByName ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-start font-bold whitespace-nowrap">{children}</th>;
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td className={`px-4 py-3 align-top ${strong ? "font-extrabold text-gray-900" : "text-gray-600"}`}>
      {children}
    </td>
  );
}

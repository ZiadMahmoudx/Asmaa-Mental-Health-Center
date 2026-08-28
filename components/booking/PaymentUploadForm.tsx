"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  MessageCircle,
  Smartphone,
  Upload,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  submitPaymentProofAction,
  type PaymentProofPayload,
} from "@/app/actions/payment.actions";
import type { ActionResult } from "@/lib/result";
import type { PaymentMethod } from "@/lib/domain/enums";
import { CSRF_FIELD } from "@/lib/constants";
import { formatEgp } from "@/lib/whatsapp";

/**
 * Receipt submission — step 3 of the manual payment flow.
 *
 * The clinic takes InstaPay and Vodafone Cash transfers, which have no webhook,
 * so the patient's screenshot is the only evidence a transfer happened. This
 * form collects it along with the sending wallet, and the server does the checks
 * a human reviewer cannot do reliably: that the file really is an image or PDF
 * (by signature, not by extension), that it is not a receipt already used on
 * another booking, and that this patient owns this appointment.
 *
 * The hold countdown is rendered client-side only, after mount. Server-rendering
 * a live timer would hydrate with a stale value and the numbers would jump.
 */

interface Props {
  appointmentId: string;
  csrfToken: string;
  priceEGP: number;
  holdExpiresAtUTC: string | null;
  instapayHandle: string;
  vodafoneCashNumbers: string[];
  clinicWhatsappUrl: string;
  /** Set when a previous receipt was rejected, so the reason can be shown. */
  rejectionReason: string | null;
}

const initialState: ActionResult<PaymentProofPayload> | null = null;

export function PaymentUploadForm({
  appointmentId,
  csrfToken,
  priceEGP,
  holdExpiresAtUTC,
  instapayHandle,
  vodafoneCashNumbers,
  clinicWhatsappUrl,
  rejectionReason,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [method, setMethod] = useState<PaymentMethod>("INSTAPAY");
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(submitPaymentProofAction, initialState);

  useEffect(() => {
    if (state?.ok) {
      // The appointment has moved to PAYMENT_UNDER_REVIEW; re-render the page so
      // it shows the "under review" state instead of the upload form.
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked in some embedded browsers; the value stays
      // selectable on screen, so this is a convenience only.
    }
  }

  if (state?.ok) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="text-lg font-black text-teal-950">
          {isAr ? "تم استلام إيصالك بنجاح" : "Receipt received"}
        </h2>
        <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
          {isAr
            ? "فريق المركز يراجع التحويل الآن. سيصلك تأكيد الحجز على واتساب فور الاعتماد، ومعه رابط زووم أو عنوان العيادة."
            : "The clinic is reviewing your transfer. You will receive a WhatsApp confirmation with your Zoom link or clinic address once approved."}
        </p>
        <Link
          href="/dashboard/patient"
          className="inline-block px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition"
        >
          {isAr ? "متابعة حجوزاتي" : "View my bookings"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {holdExpiresAtUTC && <HoldCountdown expiresAtUTC={holdExpiresAtUTC} isAr={isAr} />}

      {rejectionReason && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1"
        >
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            {isAr ? "تم رفض الإيصال السابق" : "Your previous receipt was rejected"}
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">{rejectionReason}</p>
        </div>
      )}

      {/* Where to send the money */}
      <section className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
        <h2 className="font-extrabold text-sm text-teal-950">
          {isAr ? "١ · حوّل قيمة الجلسة" : "1 · Transfer the session fee"}
        </h2>

        <div className="p-4 rounded-2xl bg-teal-950 text-white flex items-center justify-between">
          <span className="text-xs text-teal-300">{isAr ? "المبلغ المطلوب" : "Amount due"}</span>
          <span className="text-2xl font-black">{formatEgp(priceEGP)}</span>
        </div>

        <div className="space-y-2.5">
          <WalletRow
            icon={CreditCard}
            label={isAr ? "إنستا باي (InstaPay)" : "InstaPay"}
            value={instapayHandle}
            copied={copied === instapayHandle}
            onCopy={() => copyValue(instapayHandle)}
            copyLabel={isAr ? "نسخ" : "Copy"}
            copiedLabel={isAr ? "تم النسخ" : "Copied"}
          />
          {vodafoneCashNumbers.map((number) => (
            <WalletRow
              key={number}
              icon={Smartphone}
              label={isAr ? "فودافون كاش" : "Vodafone Cash"}
              value={number}
              copied={copied === number}
              onCopy={() => copyValue(number)}
              copyLabel={isAr ? "نسخ" : "Copy"}
              copiedLabel={isAr ? "تم النسخ" : "Copied"}
            />
          ))}
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          {isAr
            ? "حوّل المبلغ بالضبط كما هو موضح. التحويل بمبلغ مختلف يؤخّر مراجعة الإيصال."
            : "Transfer the exact amount shown. A different amount will delay the review."}
        </p>
      </section>

      {/* Upload */}
      <section className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
        <h2 className="font-extrabold text-sm text-teal-950">
          {isAr ? "٢ · ارفع إيصال التحويل" : "2 · Upload your receipt"}
        </h2>

        {state && !state.ok && (
          <p
            role="alert"
            className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{isAr ? state.messageAr : state.messageEn}</span>
          </p>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="appointmentId" value={appointmentId} />

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-gray-700 mb-1.5">
              {isAr ? "وسيلة الدفع المستخدمة *" : "Payment method used *"}
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(["INSTAPAY", "VODAFONE_CASH"] as const).map((option) => (
                <label
                  key={option}
                  className={`p-3 rounded-2xl border text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
                    method === option
                      ? "bg-teal-800 text-white border-teal-800"
                      : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={option}
                    checked={method === option}
                    onChange={() => setMethod(option)}
                    className="sr-only"
                  />
                  {option === "INSTAPAY" ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  {option === "INSTAPAY"
                    ? isAr ? "إنستا باي" : "InstaPay"
                    : isAr ? "فودافون كاش" : "Vodafone Cash"}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-gray-700">
              {method === "INSTAPAY"
                ? isAr ? "معرّف إنستا باي الذي حوّلت منه *" : "The InstaPay handle you sent from *"
                : isAr ? "رقم محفظة فودافون كاش المُرسِل *" : "The Vodafone Cash number you sent from *"}
            </span>
            <input
              type="text"
              name="senderIdentifier"
              required
              dir="ltr"
              placeholder={method === "INSTAPAY" ? "ahmed.ali@instapay" : "01001234567"}
              className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
            />
            {fieldErrors?.senderIdentifier && (
              <span className="text-[11px] text-crisis font-bold">{fieldErrors.senderIdentifier}</span>
            )}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-gray-700">
                {isAr ? "رقم العملية (اختياري)" : "Transaction reference (optional)"}
              </span>
              <input
                type="text"
                name="transactionRef"
                dir="ltr"
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-gray-700">
                {isAr ? "المبلغ المحوَّل (اختياري)" : "Amount transferred (optional)"}
              </span>
              <input
                type="number"
                name="amountClaimedEGP"
                min={1}
                step={1}
                dir="ltr"
                placeholder={String(priceEGP)}
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-gray-700">
              {isAr ? "صورة الإيصال *" : "Receipt image *"}
            </span>
            <div className="relative border-2 border-dashed border-alabaster-border rounded-2xl p-6 text-center hover:border-sage-400 transition">
              <input
                type="file"
                name="receipt"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-7 h-7 text-sage-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-teal-950">
                {fileName ?? (isAr ? "اضغط لاختيار صورة الإيصال" : "Click to choose your receipt")}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {isAr ? "JPG أو PNG أو WEBP أو PDF — حتى 5 ميجابايت" : "JPG, PNG, WEBP or PDF — up to 5 MB"}
              </p>
            </div>
            {fieldErrors?.receipt && (
              <span className="text-[11px] text-crisis font-bold">{fieldErrors.receipt}</span>
            )}
          </label>

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm transition flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isAr ? "إرسال الإيصال للمراجعة" : "Submit receipt for review"}
          </button>
        </form>

        <a
          href={clinicWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-2xl border border-alabaster-border hover:bg-alabaster-base text-xs font-bold text-gray-700 transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          {isAr ? "تواجه مشكلة؟ تواصل مع المركز على واتساب" : "Need help? Message the clinic on WhatsApp"}
        </a>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function WalletRow({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-alabaster-base border border-alabaster-border">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-sage-700 shrink-0" />
        <div className="min-w-0">
          <span className="block text-[10px] text-gray-400 font-bold">{label}</span>
          <span className="block text-xs font-black text-teal-950 font-mono truncate" dir="ltr">
            {value}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-alabaster-border text-[10px] font-bold text-gray-700 hover:border-sage-400 transition flex items-center gap-1 shrink-0"
      >
        <Copy className="w-3 h-3" />
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

/** Live countdown on the slot hold. Client-only to avoid a hydration mismatch. */
function HoldCountdown({ expiresAtUTC, isAr }: { expiresAtUTC: string; isAr: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, new Date(expiresAtUTC).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAtUTC]);

  if (remaining === null) return null;

  const expired = remaining === 0;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div
      className={`p-4 rounded-2xl border flex items-center gap-3 ${
        expired
          ? "bg-crisis-light border-crisis/20 text-crisis-dark"
          : "bg-sage-50 border-sage-200 text-sage-900"
      }`}
    >
      <Clock className="w-5 h-5 shrink-0" />
      <div className="text-xs">
        {expired ? (
          <p className="font-bold">
            {isAr
              ? "انتهت مهلة حجز الموعد. قد يكون الموعد أُتيح لمريض آخر — يمكنك المحاولة أو حجز موعد جديد."
              : "The hold has expired. The slot may have been released — try again or book a new time."}
          </p>
        ) : (
          <>
            <p className="font-bold">
              {isAr ? "الموعد محجوز باسمك لمدة" : "Your slot is held for"}{" "}
              <span className="font-mono tabular-nums text-sm" dir="ltr">
                {minutes}:{String(seconds).padStart(2, "0")}
              </span>
            </p>
            <p className="text-[11px] opacity-80">
              {isAr
                ? "أكمل التحويل وارفع الإيصال قبل انتهاء المهلة."
                : "Complete the transfer and upload the receipt before it runs out."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

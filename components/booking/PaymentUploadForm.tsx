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
  FileCheck,
  FileX,
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
import { ALLOWED_RECEIPT_MIME_TYPES, AllowedReceiptMimeType, CSRF_FIELD } from "@/lib/constants";
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

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

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
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    sizeFormatted: string;
  } | null>(null);
  const [clientFileError, setClientFileError] = useState<string | null>(null);
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFileMeta(null);
      setClientFileError(null);
      return;
    }

    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted =
      sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    setSelectedFileMeta({
      name: file.name,
      sizeFormatted,
    });

    if (file.size > MAX_FILE_BYTES) {
      setClientFileError(
        isAr
          ? `حجم الملف (${sizeFormatted}) كبير جداً ويتجاوز الحد الأقصى المسموح به (5 ميجابايت). يرجى تقليل جودة الصورة أو اختيار ملف أصغر.`
          : `The selected file (${sizeFormatted}) is too large. Maximum allowed size is 5 MB. Please compress the file or choose a smaller one.`,
      );
    } else if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as AllowedReceiptMimeType)) {
      setClientFileError(
        isAr
          ? "صيغة الملف غير مدعومة. الصيغ المسموح بها فقط: JPG, PNG, WEBP, PDF."
          : "Unsupported file format. Only JPG, PNG, WEBP or PDF are allowed.",
      );
    } else {
      setClientFileError(null);
    }
  }

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
          <span className="text-2xl font-black">{formatEgp(priceEGP, isAr ? "ar" : "en")}</span>
        </div>

        <div className="space-y-2.5">
          <WalletRow
            icon={CreditCard}
            label={isAr ? "إنستا باي (InstaPay)" : "InstaPay"}
            value={instapayHandle}
            copied={copied === instapayHandle}
            onCopy={() => copyValue(instapayHandle)}
            copyLabel={isAr ? "نسخ المعرّف" : "Copy handle"}
            copiedLabel={isAr ? "تم النسخ ✓" : "Copied ✓"}
          />

          {vodafoneCashNumbers.map((phone) => (
            <WalletRow
              key={phone}
              icon={Smartphone}
              label={isAr ? "فودافون كاش (Vodafone Cash)" : "Vodafone Cash"}
              value={phone}
              copied={copied === phone}
              onCopy={() => copyValue(phone)}
              copyLabel={isAr ? "نسخ الرقم" : "Copy number"}
              copiedLabel={isAr ? "تم النسخ ✓" : "Copied ✓"}
            />
          ))}
        </div>
      </section>

      {/* Proof upload form */}
      <section className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
        <h2 className="font-extrabold text-sm text-teal-950">
          {isAr ? "٢ · أرسل بيانات وإيصال التحويل" : "2 · Submit your receipt details"}
        </h2>

        {state && !state.ok && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-crisis-light border border-crisis/20 text-crisis-dark text-xs font-bold space-y-1"
          >
            <div className="flex items-center gap-1.5 font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-crisis" />
              <span>{isAr ? state.messageAr : state.messageEn}</span>
            </div>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="appointmentId" value={appointmentId} />

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
              {isAr ? "طريقة التحويل التي استخدمتها *" : "Transfer method used *"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "INSTAPAY", labelAr: "إنستا باي", labelEn: "InstaPay" },
                  { id: "VODAFONE_CASH", labelAr: "فودافون كاش", labelEn: "Vodafone Cash" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center cursor-pointer transition ${
                    method === opt.id
                      ? "bg-teal-950 text-white border-teal-950 shadow-sm"
                      : "bg-alabaster-base text-gray-700 border-alabaster-border hover:border-sage-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={opt.id}
                    checked={method === opt.id}
                    onChange={() => setMethod(opt.id)}
                    className="sr-only"
                  />
                  <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-gray-700">
              {method === "INSTAPAY"
                ? isAr
                  ? "حسابك أو عنوان الدفع على إنستا باي (IPA) أو رقم هاتفك *"
                  : "Your InstaPay IPA address, username, or phone *"
                : isAr
                ? "رقم محفظة فودافون كاش التي حوّلت منها *"
                : "Your sending Vodafone Cash phone number *"}
            </span>
            <input
              type="text"
              name="senderIdentifier"
              required
              dir="ltr"
              placeholder={
                method === "INSTAPAY"
                  ? isAr
                    ? "مثال: name@instapay أو 01012345678"
                    : "e.g. name@instapay or 01012345678"
                  : isAr
                  ? "مثال: 01012345678"
                  : "e.g. 01012345678"
              }
              className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
            />
            {fieldErrors?.senderIdentifier && (
              <span className="text-[11px] text-crisis font-bold">
                {fieldErrors.senderIdentifier}
              </span>
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
                placeholder={isAr ? "مثال: IP-948291048" : "e.g. IP-948291048"}
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
            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition ${
                clientFileError
                  ? "border-red-400 bg-red-50/50"
                  : selectedFileMeta
                  ? "border-emerald-500 bg-emerald-50/30"
                  : "border-alabaster-border hover:border-sage-400 bg-white"
              }`}
            >
              <input
                type="file"
                name="receipt"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {selectedFileMeta ? (
                clientFileError ? (
                  <FileX className="w-8 h-8 text-red-500 mx-auto mb-2" />
                ) : (
                  <FileCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                )
              ) : (
                <Upload className="w-7 h-7 text-sage-600 mx-auto mb-2" />
              )}

              <p className="text-xs font-bold text-teal-950">
                {selectedFileMeta ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span>{selectedFileMeta.name}</span>
                    <span className="font-mono text-[11px] text-gray-500 font-normal">
                      ({selectedFileMeta.sizeFormatted})
                    </span>
                  </span>
                ) : isAr ? (
                  "اضغط لاختيار صورة الإيصال أو اسحبها هنا"
                ) : (
                  "Click to choose your receipt or drop it here"
                )}
              </p>
              
              <p className="text-[10px] text-gray-400 mt-1">
                {isAr
                  ? "JPG أو PNG أو WEBP أو PDF — الحد الأقصى: 5 ميجابايت"
                  : "JPG, PNG, WEBP or PDF — Max size: 5 MB"}
              </p>
            </div>

            {/* Instant client-side file error feedback */}
            {clientFileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{clientFileError}</span>
              </div>
            )}

            {fieldErrors?.receipt && !clientFileError && (
              <span className="text-[11px] text-crisis font-bold block mt-1">
                {fieldErrors.receipt}
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={pending || !!clientFileError}
            className="w-full py-3.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-sm"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? "جاري رفع ومراجعة الإيصال..." : "Uploading receipt..."}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{isAr ? "إرسال الإيصال للمراجعة" : "Submit receipt for review"}</span>
              </>
            )}
          </button>
        </form>

        <a
          href={clinicWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-2xl border border-alabaster-border hover:bg-alabaster-base text-xs font-bold text-gray-700 transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span>
            {isAr ? "تواجه مشكلة؟ تواصل مع المركز على واتساب" : "Need help? Message the clinic on WhatsApp"}
          </span>
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
        <span>{copied ? copiedLabel : copyLabel}</span>
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

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const expired = remaining === 0;

  return (
    <div
      role="status"
      className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
        expired
          ? "bg-crisis-light border-crisis/20 text-crisis-dark"
          : "bg-sage-50 border-sage-200 text-teal-950"
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-sage-700 shrink-0" />
        <span>
          {expired
            ? isAr
              ? "انتهت مهلة حجز الموعد. قد يُتاح الموعد لمريض آخر."
              : "Hold time expired. This slot may be released."
            : isAr
            ? "الموعد محجوز لك مؤقتاً لمدة:"
            : "Slot held for you for:"}
        </span>
      </div>
      {!expired && (
        <span className="font-black font-mono text-sm">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

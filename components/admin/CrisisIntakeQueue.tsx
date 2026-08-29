"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  markIntakeReviewedAction,
  type IntakeSummary,
} from "@/app/actions/intake.actions";
import { CONCERNS } from "@/lib/content/intake";
import { CSRF_FIELD } from "@/lib/constants";
import { buildWhatsAppLink, formatCairo } from "@/lib/whatsapp";

/**
 * Crisis triage queue.
 *
 * Intakes where the patient endorsed the self-harm item, oldest unreviewed
 * first. The queue exists so that flag reaches a person: a crisis signal that
 * only ever lands in a database row is not a safety feature.
 *
 * Marking one reviewed records who looked and when, so the clinic can show that
 * every flagged intake was seen.
 */

interface Props {
  intakes: IntakeSummary[];
  csrfToken: string;
}

function concernLabel(tag: string, isAr: boolean): string {
  const concern = CONCERNS.find((item) => item.tag === tag);
  if (!concern) return tag;
  return isAr ? concern.labelAr : concern.labelEn;
}

export function CrisisIntakeQueue({ intakes, csrfToken }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [state, formAction, pending] = useActionState(markIntakeReviewedAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (intakes.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-alabaster-border p-8 text-center space-y-2">
        <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
        <p className="text-sm font-bold text-teal-950">
          {isAr ? "لا توجد حالات فرز عاجلة" : "No urgent triage cases"}
        </p>
        <p className="text-[11px] text-gray-500">
          {isAr
            ? "تظهر هنا أي حالة يشير فيها المريض لأفكار إيذاء النفس أثناء الاستبيان."
            : "Any intake where a patient reports thoughts of self-harm appears here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state && !state.ok && (
        <p
          role="alert"
          className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark"
        >
          {isAr ? state.messageAr : state.messageEn}
        </p>
      )}

      <ul className="space-y-3">
        {intakes.map((intake) => {
          const reviewed = Boolean(intake.reviewedAtUTC);

          return (
            <li
              key={intake.id}
              className={`rounded-3xl border p-5 space-y-3 ${
                reviewed
                  ? "bg-white border-alabaster-border"
                  : "bg-crisis-light border-crisis/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-teal-950">{intake.patientName}</h3>
                    {reviewed ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {isAr ? "تمت المراجعة" : "Reviewed"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-crisis text-white text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {isAr ? "بانتظار المراجعة" : "Needs review"}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-600">
                    {formatCairo(new Date(intake.createdAtUTC), isAr ? "ar" : "en")}
                    <span className="mx-1.5 text-gray-400">·</span>
                    {isAr ? "درجة الشدة:" : "Severity:"}{" "}
                    <span className="font-bold tabular-nums">
                      {intake.severityScore}/{intake.maxScore}
                    </span>
                  </p>

                  {intake.concerns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {intake.concerns.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-lg bg-white/70 border border-alabaster-border text-[10px] font-semibold text-gray-700"
                        >
                          {concernLabel(tag, isAr)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${intake.patientPhone}`}
                  className="px-4 py-2 rounded-xl bg-crisis hover:bg-crisis-dark text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {isAr ? "اتصال بالمريض" : "Call patient"}
                </a>

                <a
                  href={buildWhatsAppLink(
                    intake.patientPhone,
                    isAr
                      ? `مرحباً ${intake.patientName}، معك فريق مركز أسما للصحة النفسية. تواصلنا معك للاطمئنان عليك ولنرى كيف يمكننا مساندتك اليوم. سلامتك تهمنا. 🌿`
                      : `Hello ${intake.patientName}, this is the Asmaa Clinic team reaching out to check on you and see how we can support you today.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {isAr ? "تواصل على واتساب" : "Reach out on WhatsApp"}
                </a>

                {!reviewed && (
                  <form action={formAction}>
                    <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                    <input type="hidden" name="intakeId" value={intake.id} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="px-4 py-2 rounded-xl bg-white border border-alabaster-border hover:bg-alabaster-base disabled:opacity-60 text-[11px] font-extrabold text-gray-700 transition flex items-center gap-1.5"
                    >
                      {pending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {isAr ? "تحديد كمُراجَعة" : "Mark reviewed"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

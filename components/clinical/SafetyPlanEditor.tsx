"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  Phone,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  Wind,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  saveSafetyPlanAction,
  type SafetyContact,
  type SafetyPlanView,
} from "@/app/actions/safety-plan.actions";
import type { ActionResult } from "@/lib/result";
import { CSRF_FIELD } from "@/lib/constants";
import { formatCairo } from "@/lib/whatsapp";

/**
 * Stanley-Brown safety plan editor.
 *
 * Previously this lived entirely in component state and evaporated on refresh —
 * a safety plan that does not survive the page is worse than none, because the
 * patient believes they have one. It now persists per patient.
 *
 * Every section is optional and the form saves regardless. Someone building
 * this may be in a bad state; a validation error that blocks saving six
 * completed sections because the seventh is empty is a real harm, not a
 * nitpick. The server applies the same rule.
 *
 * List items are submitted as repeated fields and contacts as JSON strings,
 * so the whole plan posts in one action without per-row round-trips.
 */

interface Props {
  plan: SafetyPlanView;
  csrfToken: string;
  isAuthenticated: boolean;
  hotline: string;
}

const initialState: ActionResult<SafetyPlanView> | null = null;

export function SafetyPlanEditor({ plan, csrfToken, isAuthenticated, hotline }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [warningSigns, setWarningSigns] = useState<string[]>(plan.warningSigns);
  const [copingStrategies, setCopingStrategies] = useState<string[]>(plan.copingStrategies);
  const [socialDistractions, setSocialDistractions] = useState<string[]>(plan.socialDistractions);
  const [environmentSteps, setEnvironmentSteps] = useState<string[]>(plan.environmentSteps);
  const [trustedContacts, setTrustedContacts] = useState<SafetyContact[]>(plan.trustedContacts);
  const [professionalContacts, setProfessionalContacts] = useState<SafetyContact[]>(
    plan.professionalContacts,
  );

  const [state, formAction, saving] = useActionState(saveSafetyPlanAction, initialState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const savedAt = state?.ok ? state.data.updatedAtUTC : plan.updatedAtUTC;

  return (
    <div className="space-y-5">
      {/* Always-visible crisis strip. The plan is a tool for a bad moment; the
          hotline must never be more than one tap away while editing it. */}
      <div className="rounded-3xl border border-crisis/30 bg-crisis-light p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-crisis shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-crisis-dark">
              {isAr ? "إذا كنت في خطر الآن" : "If you are in danger right now"}
            </p>
            <p className="text-[11px] text-crisis-dark leading-relaxed">
              {isAr
                ? "لا تنتظر حتى تكمل الخطة. اتصل بالخط الساخن فوراً أو توجّه لأقرب مستشفى."
                : "Do not wait to finish this plan. Call the hotline now or go to the nearest hospital."}
            </p>
          </div>
        </div>
        <a
          href={`tel:${hotline}`}
          className="px-5 py-2.5 rounded-2xl bg-crisis hover:bg-crisis-dark text-white text-xs font-extrabold transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <Phone className="w-4 h-4" />
          {isAr ? `الخط الساخن ${hotline}` : `Hotline ${hotline}`}
        </a>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{isAr ? state.messageAr : state.messageEn}</span>
        </p>
      )}

      {state?.ok && (
        <p
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isAr
            ? "تم حفظ خطة الأمان. يمكنك الرجوع إليها في أي وقت من بوابتك."
            : "Safety plan saved. You can reach it any time from your portal."}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

        {/* Repeated hidden fields carry the list state into the action. */}
        {warningSigns.map((item, i) => (
          <input key={`ws-${i}`} type="hidden" name="warningSigns" value={item} />
        ))}
        {copingStrategies.map((item, i) => (
          <input key={`cs-${i}`} type="hidden" name="copingStrategies" value={item} />
        ))}
        {socialDistractions.map((item, i) => (
          <input key={`sd-${i}`} type="hidden" name="socialDistractions" value={item} />
        ))}
        {environmentSteps.map((item, i) => (
          <input key={`es-${i}`} type="hidden" name="environmentSteps" value={item} />
        ))}
        {trustedContacts.map((contact, i) => (
          <input key={`tc-${i}`} type="hidden" name="trustedContacts" value={JSON.stringify(contact)} />
        ))}
        {professionalContacts.map((contact, i) => (
          <input
            key={`pc-${i}`}
            type="hidden"
            name="professionalContacts"
            value={JSON.stringify(contact)}
          />
        ))}

        <ListSection
          step={1}
          icon={AlertTriangle}
          title={isAr ? "علامات الإنذار المبكر" : "Warning signs"}
          hint={
            isAr
              ? "الأفكار أو المشاعر أو السلوكيات التي تسبق تدهور حالتك."
              : "The thoughts, feelings or behaviours that come before things get worse."
          }
          placeholder={isAr ? "مثال: العزلة عن الأصدقاء" : "e.g. withdrawing from friends"}
          items={warningSigns}
          onChange={setWarningSigns}
          isAr={isAr}
        />

        <ListSection
          step={2}
          icon={Wind}
          title={isAr ? "استراتيجيات التهدئة الذاتية" : "Internal coping strategies"}
          hint={
            isAr
              ? "أشياء تفعلها بمفردك لتهدئة نفسك دون الحاجة لأحد."
              : "Things you can do alone to settle yourself, without needing anyone."
          }
          placeholder={isAr ? "مثال: تمرين التنفس 4-7-8" : "e.g. 4-7-8 breathing"}
          items={copingStrategies}
          onChange={setCopingStrategies}
          isAr={isAr}
        />

        <ListSection
          step={3}
          icon={Users}
          title={isAr ? "أماكن وأشخاص يصرفون انتباهك" : "People and places that distract you"}
          hint={
            isAr
              ? "أماكن أو أشخاص يساعدون على تغيير حالتك المزاجية دون الحديث عن الأزمة."
              : "Settings or people that shift your mood without needing to discuss the crisis."
          }
          placeholder={isAr ? "مثال: المشي في النادي" : "e.g. a walk at the club"}
          items={socialDistractions}
          onChange={setSocialDistractions}
          isAr={isAr}
        />

        <ContactSection
          step={4}
          icon={Heart}
          title={isAr ? "أشخاص أثق بهم للمساعدة" : "People I can ask for help"}
          hint={
            isAr
              ? "من تتصل به عندما تحتاج لمن يسمعك ويساندك."
              : "Who you would call when you need someone to listen."
          }
          contacts={trustedContacts}
          onChange={setTrustedContacts}
          isAr={isAr}
          withRelationship
        />

        <ContactSection
          step={5}
          icon={ShieldCheck}
          title={isAr ? "الجهات المهنية والطوارئ" : "Professional and emergency contacts"}
          hint={
            isAr
              ? "طبيبك المعالج، وأقرب مستشفى، والخط الساخن."
              : "Your treating doctor, the nearest hospital, and the hotline."
          }
          contacts={professionalContacts}
          onChange={setProfessionalContacts}
          isAr={isAr}
        />

        <ListSection
          step={6}
          icon={Lock}
          title={isAr ? "خطوات تأمين البيئة المحيطة" : "Making the environment safer"}
          hint={
            isAr
              ? "خطوات عملية لإبعاد الوسائل التي قد تؤذيك عن متناول يدك."
              : "Practical steps to put means of harm out of reach."
          }
          placeholder={
            isAr ? "مثال: تسليم الأدوية لأحد أفراد الأسرة" : "e.g. give medication to a family member"
          }
          items={environmentSteps}
          onChange={setEnvironmentSteps}
          isAr={isAr}
        />

        {/* Reasons for living */}
        <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-teal-800 text-white text-xs font-black flex items-center justify-center shrink-0">
              7
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-teal-950">
                {isAr ? "أسبابي التي تستحق الاستمرار" : "My reasons for living"}
              </h2>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {isAr
                  ? "اكتب ما يذكّرك بقيمتك ولماذا تستحق الحياة، بكلماتك أنت."
                  : "In your own words, what reminds you of your worth."}
              </p>
            </div>
          </div>
          <textarea
            name="reasonsForLiving"
            rows={4}
            defaultValue={plan.reasonsForLiving ?? ""}
            maxLength={2000}
            placeholder={
              isAr ? "مثال: أطفالي، والدتي، مشروعي الذي بدأته…" : "e.g. my children, my mother…"
            }
            className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium leading-relaxed"
          />
        </section>

        {/* Save */}
        <div className="sticky bottom-4 bg-white rounded-3xl border border-alabaster-border shadow-lg p-5 space-y-2">
          {savedAt && (
            <p className="text-[11px] text-gray-500 text-center">
              {isAr ? "آخر حفظ: " : "Last saved: "}
              {formatCairo(new Date(savedAt))}
            </p>
          )}

          {isAuthenticated ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-extrabold transition flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAr ? "حفظ خطة الأمان" : "Save safety plan"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-3 rounded-2xl border border-alabaster-border hover:bg-alabaster-base text-xs font-extrabold text-gray-600 transition"
                title={isAr ? "طباعة" : "Print"}
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login?next=%2Fsafety-plan"
              className="w-full py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isAr ? "سجّل الدخول لحفظ خطتك" : "Sign in to save your plan"}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ListSection({
  step,
  icon: Icon,
  title,
  hint,
  placeholder,
  items,
  onChange,
  isAr,
}: {
  step: number;
  icon: typeof AlertTriangle;
  title: string;
  hint: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  isAr: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.includes(value) || items.length >= 15) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-xl bg-teal-800 text-white text-xs font-black flex items-center justify-center shrink-0">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
            <Icon className="w-4 h-4 text-sage-700" />
            {title}
          </h2>
          <p className="text-[11px] text-gray-500 leading-relaxed">{hint}</p>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-alabaster-base border border-alabaster-border"
            >
              <span className="text-xs text-gray-800 leading-relaxed">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label={isAr ? "حذف" : "Remove"}
                className="p-1.5 rounded-lg text-gray-400 hover:text-crisis hover:bg-crisis-light transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // The section sits inside the plan's form; Enter must add a row,
            // not submit the whole plan.
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          maxLength={300}
          placeholder={placeholder}
          className="flex-1 bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || items.length >= 15}
          className="px-4 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 disabled:opacity-40 text-white text-xs font-extrabold transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAr ? "إضافة" : "Add"}
        </button>
      </div>
    </section>
  );
}

function ContactSection({
  step,
  icon: Icon,
  title,
  hint,
  contacts,
  onChange,
  isAr,
  withRelationship,
}: {
  step: number;
  icon: typeof Heart;
  title: string;
  hint: string;
  contacts: SafetyContact[];
  onChange: (contacts: SafetyContact[]) => void;
  isAr: boolean;
  withRelationship?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed || contacts.length >= 10) return;
    onChange([
      ...contacts,
      {
        name: trimmed,
        phone: phone.trim() || undefined,
        relationship: relationship.trim() || undefined,
      },
    ]);
    setName("");
    setPhone("");
    setRelationship("");
  }

  return (
    <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-xl bg-teal-800 text-white text-xs font-black flex items-center justify-center shrink-0">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
            <Icon className="w-4 h-4 text-sage-700" />
            {title}
          </h2>
          <p className="text-[11px] text-gray-500 leading-relaxed">{hint}</p>
        </div>
      </div>

      {contacts.length > 0 && (
        <ul className="space-y-2">
          {contacts.map((contact, index) => (
            <li
              key={`${contact.name}-${index}`}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-alabaster-base border border-alabaster-border"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  {contact.name}
                  {contact.relationship && (
                    <span className="font-medium text-gray-500"> — {contact.relationship}</span>
                  )}
                </p>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-[11px] text-teal-800 font-mono hover:underline"
                    dir="ltr"
                  >
                    {contact.phone}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(contacts.filter((_, i) => i !== index))}
                aria-label={isAr ? "حذف" : "Remove"}
                className="p-1.5 rounded-lg text-gray-400 hover:text-crisis hover:bg-crisis-light transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder={isAr ? "الاسم" : "Name"}
          className="bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={40}
          dir="ltr"
          placeholder={isAr ? "رقم الهاتف" : "Phone"}
          className="bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
        />
        {withRelationship ? (
          <input
            type="text"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            maxLength={80}
            placeholder={isAr ? "صلة القرابة" : "Relationship"}
            className="bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
          />
        ) : (
          <input
            type="text"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            maxLength={80}
            placeholder={isAr ? "الجهة (مستشفى / عيادة)" : "Organisation"}
            className="bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
          />
        )}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={!name.trim() || contacts.length >= 10}
        className="px-4 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 disabled:opacity-40 text-white text-xs font-extrabold transition flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        {isAr ? "إضافة جهة اتصال" : "Add contact"}
      </button>
    </section>
  );
}

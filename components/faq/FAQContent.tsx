"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ShieldCheck,
  Lock,
  FileText,
  DollarSign,
  Video,
  ChevronDown,
  PhoneCall,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FAQItem {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: "PRIVACY" | "BOOKING" | "PRESCRIPTIONS" | "EMERGENCY";
}

const faqs: FAQItem[] = [
  {
    id: "f1",
    category: "PRIVACY",
    questionAr: "كيف تضمنون سرية الجلسات وبياناتي الطبية؟",
    questionEn: "How do you ensure confidentiality and data privacy?",
    answerAr: "تُدار سجلاتك الطبية وفق أعلى معايير الخصوصية الصحية: جميع البيانات مخزنة على خوادم المركز تحت حماية مشددة، ولا يطّلع على ملفك سوى استشاريك المعالج، مع تسجيل كامل لجميع عمليات الدخول في سجل تدقيق دائم. تُعقد الجلسات الأونلاين عبر منصة زووم المؤمّنة، والعيادة لا تسجل أو تخزن أي فيديو للجلسات.",
    answerEn: "Your records are handled under strict medical confidentiality protocols: all clinical data is stored on secure clinic servers with role-based access control, accessible only to your treating consultant, and logged in an immutable audit trail. Online sessions run via secure Zoom rooms with no session recording or storage.",
  },
  {
    id: "f2",
    category: "PRESCRIPTIONS",
    questionAr: "كيف يتم تسجيل ومتابعة الخطة العلاجية والدوائية بعد الجلسة؟",
    questionEn: "How is my treatment and medication plan recorded after the session?",
    answerAr: "يقوم الطبيب الاستشاري بتدوين التشخيص الإكلينيكي وتفاصيل الخطة العلاجية والدوائية وإرشادات الجرعات مباشرة في ملفك الطبي السري على المنصة فور انتهاء الجلسة، ليكون متاحاً لك ولطبيبك المعالج للرجوع إليه ومتابعة مسار التعافي.",
    answerEn: "The consultant psychiatrist records your clinical diagnosis, medication recommendations, and dosage instructions directly into your secure patient chart on the platform immediately following the consultation, accessible anytime to review your recovery plan.",
  },
  {
    id: "f3",
    category: "BOOKING",
    questionAr: "ما هي سياسة إعادة الجدولة والإلغاء في حال تعذر الحضور؟",
    questionEn: "What is your rescheduling and cancellation policy?",
    answerAr: "يمكن للمريض إعادة جدولة موعد جلسته قبل بدايتها بـ 24 ساعة على الأقل مباشرة من لوحة المريض واختيار موعد بديل متاح مع نفس الاستشاري. في حال طلب الإلغاء أو الاستفسار المالي، يتولى فريق خدمة العملاء مراجعة الطلب والمتابعة معك.",
    answerEn: "Patients can reschedule an appointment up to 24 hours before the session directly from their patient dashboard. For cancellation or refund inquiries, our care team assists you directly.",
  },
  {
    id: "f4",
    category: "BOOKING",
    questionAr: "أنا مقيم خارج مصر (السعودية، الإمارات، المغتربين) - هل يمكنني الحجز والمتابعة؟",
    questionEn: "Can international patients book and attend telepsychiatry sessions?",
    answerAr: "بكل تأكيد. منصتنا تخدم المرضى في كافة دول الخليج والوطن العربي والمغتربين حول العالم، مع تحويل توقيت المواعيد تلقائياً إلى توقيتك المحلي لعقد الجلسات عبر زووم بكل سهولة.",
    answerEn: "Absolutely. We serve patients across the Arab world and abroad, offering seamless Zoom telepsychiatry consultations with automatic timezone conversion.",
  },
  {
    id: "f5",
    category: "EMERGENCY",
    questionAr: "ماذا أفعل إذا كنت أمر بأزمة نفسية حادة أو طوارئ طبية؟",
    questionEn: "What should I do during an acute psychiatric crisis or emergency?",
    answerAr: "خدمات الاستشارات عن بُعد غير مخصصة للطوارئ المهددة للحياة. إذا كنت تشعر بخطر نفسي أو رغبة في إيذاء النفس، يرجى الاتصال فوراً بالخط الساخن للأمانة العامة للصحة النفسية في مصر (16328). وفي حال الطوارئ الطبية الجسدية اتصل بالإسعاف (123) أو توجه لأقرب مستشفى طوارئ.",
    answerEn: "Telehealth consultations are not suited for life-threatening emergencies. For immediate psychological crisis, call Egypt National Mental Health Line 16328. For physical medical emergencies, call ambulance (123) or proceed to the nearest emergency department.",
  },
];

/**
 * Support CTA target.
 *
 * This button used to open the AI assistant, which has been removed: an
 * ungrounded chatbot answering medical questions is not something a clinic
 * should ship. It now opens WhatsApp to the clinic's real support line.
 */
export function FAQContent({ clinicWhatsappUrl }: { clinicWhatsappUrl: string }) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(["f1", "f2"]);

  const toggleFaq = (id: string) => {
    if (openFaqIds.includes(id)) {
      setOpenFaqIds(openFaqIds.filter((f) => f !== id));
    } else {
      setOpenFaqIds([...openFaqIds, id]);
    }
  };

  const filteredFaqs = selectedCategory === "ALL" ? faqs : faqs.filter((f) => f.category === selectedCategory);

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "مركز المساعدة والشفافية الطبية" : "Help & Clinical Transparency"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "الأسئلة الشائعة وميثاق السرية" : "Frequently Asked Questions & Ethics"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "كل ما تحتاج معرفته حول آليات العلاج النفسي عن بُعد، الخصوصية، والتراخيص المعتمدة."
              : "Everything you need to know about telepsychiatry, privacy standards, and clinical licensing."}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: "ALL", labelAr: "جميع الأسئلة", labelEn: "All Questions" },
            { id: "PRIVACY", labelAr: "السرية والخصوصية", labelEn: "Privacy & Ethics" },
            { id: "PRESCRIPTIONS", labelAr: "الخطة العلاجية والدوائية", labelEn: "Treatment & Meds" },
            { id: "BOOKING", labelAr: "الحجز والاسترداد", labelEn: "Booking & Payments" },
            { id: "EMERGENCY", labelAr: "بروتوكول الطوارئ", labelEn: "Emergency Protocol" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? "bg-teal-800 text-white shadow-md"
                  : "bg-white text-gray-700 border border-alabaster-border hover:bg-gray-50"
              }`}
            >
              {language === "ar" ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaqIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-5 text-start rtl:text-right ltr:text-left flex items-center justify-between gap-4 font-bold text-sm text-teal-950 hover:bg-alabaster-base/50 transition"
                >
                  <span>{language === "ar" ? faq.questionAr : faq.questionEn}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-teal-800" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100/60 bg-alabaster-base/30">
                    <p>{language === "ar" ? faq.answerAr : faq.answerEn}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Contact Box */}
        <div className="bg-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-start rtl:sm:text-right ltr:sm:text-left">
            <h4 className="font-black text-base">
              {language === "ar"
                ? "هل لديك استفسار طبي أو تقني إضافي؟"
                : "Have an additional medical or technical question?"}
            </h4>
            <p className="text-xs text-sage-200">
              {language === "ar"
                ? "فريق الرعاية الطبية متواجد لمساعدتك على مدار الساعة."
                : "Our clinical care team is available to assist you."}
            </p>
          </div>
          <a
            href={clinicWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition whitespace-nowrap"
          >
            {language === "ar" ? "تواصل مع فريق المركز على واتساب" : "Contact Care Team on WhatsApp"}
          </a>
        </div>
      </div>
    </div>
  );
}

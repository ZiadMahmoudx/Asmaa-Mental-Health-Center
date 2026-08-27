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
    answerAr: "نلتزم بنسبة 100% بالمعايير العالمية لحماية البيانات الطبية (HIPAA & ISO 27001). جلسات الفيديو مشفرة من طرف إلى طرف (AES-256 E2EE) ولا يتم تسجيلها أو تخزينها نهائياً على خوادمنا. كما تحمل شاشات الجلسة علامات مائية رقمية ديناميكية لمنع تصوير الشاشة.",
    answerEn: "We strictly adhere to HIPAA and ISO 27001 medical confidentiality standards. All video streams use AES-256 E2EE and are never recorded or stored. Dynamic security watermarks prevent screen capture.",
  },
  {
    id: "f2",
    category: "PRESCRIPTIONS",
    questionAr: "هل الروشتة الإلكترونية الصادرة من المركز معتمدة في الصيدليات؟",
    questionEn: "Are e-prescriptions accepted by pharmacies?",
    answerAr: "نعم، جميع الروشتات الإلكترونية تصدر برقم ترخيص الطبيب المعالج من نقابة الأطباء ووزارة الصحة ومختومة إلكترونياً بكود QR للتحقق السريع. تقبل الروشتات في كافة الصيدليات الكبرى ومواقع توصيل الأدوية المعتمدة في مصر والدول العربية للأدوية غير الجدولية.",
    answerEn: "Yes, our e-prescriptions include the consultant's verified syndicate license number, digital stamp, and QR verification code, recognized across major certified pharmacies.",
  },
  {
    id: "f3",
    category: "BOOKING",
    questionAr: "ما هي سياسة الإلغاء واسترداد الأموال في حال تعذر الحضور؟",
    questionEn: "What is your cancellation and refund policy?",
    answerAr: "يمكنك إلغاء أو إعادة جدولة جلستك قبل موعدها بـ 6 ساعات مع استرداد فوري وتلقائي 100% من المبلغ إلى محفظتك الإلكترونية بالمنصة دون أي خصومات أو تعقيدات.",
    answerEn: "You can cancel or reschedule up to 6 hours before the session with a 100% instant refund directly to your in-app digital wallet.",
  },
  {
    id: "f4",
    category: "BOOKING",
    questionAr: "أنا مقيم خارج مصر (السعودية، الإمارات، أوروبا) - هل يمكنني الحجز والدفع بعملتي المحلية؟",
    questionEn: "Can international patients book and pay in local currencies?",
    answerAr: "بكل تأكيد. منصتنا تخدم المرضى في كافة دول الخليج والوطن العربي والمغتربين حول العالم. نوفر الدفع بالبطاقات الدولية (Visa/Mastercard)، والمحافظ الرقمية، مع تحويل توقيت المواعيد تلقائياً لتوقيت مدينتك.",
    answerEn: "Absolutely. We support international cards (Visa/Mastercard/Apple Pay) with automatic timezone conversion for Saudi Arabia, UAE, Europe, and North America.",
  },
  {
    id: "f5",
    category: "EMERGENCY",
    questionAr: "ماذا أفعل إذا كنت أمر بأزمة نفسية حادة أو أفكار إيذاء نفس؟",
    questionEn: "What should I do during an acute psychiatric crisis?",
    answerAr: "خدمات العلاج عن بُعد غير مخصصة للطوارئ المهددة للحياة. إذا كنت تشعر بخطر مباشر، يرجى الاتصال فوراً بالخط الساخن للأمانة العامة للصحة النفسية في مصر (16328)، أو التوجه لأقرب طوارئ مستشفى نفسي.",
    answerEn: "Telehealth is not suitable for life-threatening emergencies. Please call Egypt National Crisis Line 16328 or head to the nearest psychiatric emergency center.",
  },
];

export default function FAQPage() {
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
            { id: "PRIVACY", labelAr: "السرية والخصوصية", labelEn: "Privacy & HIPAA" },
            { id: "PRESCRIPTIONS", labelAr: "الروشتات الطبية", labelEn: "E-Prescriptions" },
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
            <h4 className="font-black text-base">هل لديك استفسار طبي أو تقني إضافي؟</h4>
            <p className="text-xs text-sage-200">فريق الرعاية الطبية متواجد لمساعدتك على مدار الساعة.</p>
          </div>
          <Link
            href="/assistant"
            className="px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition whitespace-nowrap"
          >
            تحدث مع المساعد الذكي
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { PhoneCall, AlertTriangle, X, ShieldAlert, HeartHandshake, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export const CrisisBanner: React.FC = () => {
  const { language } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <aside aria-label="Crisis Hotline" className="bg-amber-900/95 text-amber-100 px-4 py-2 text-xs md:text-sm border-b border-amber-800/60 shadow-sm relative z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 bg-amber-800 rounded text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium">
              {language === "ar"
                ? "إذا كنت تمر بحالة طارئة أو تراودك أفكار لإيذاء النفس، لست وحدك، الدعم متاح مجاناً فوراً:"
                : "If you are in acute crisis or experiencing thoughts of self-harm, free immediate support is available:"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:16328"
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md font-bold text-xs shadow transition"
            >
              <PhoneCall className="w-3 h-3 animate-bounce" />
              <span>{language === "ar" ? "الخط الساخن: 16328 (مصر)" : "Hotline: 16328 (Egypt)"}</span>
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-amber-200 underline hover:text-white transition font-medium"
            >
              {language === "ar" ? "أرقام الطوارئ الدولية والعربية" : "International Emergency Numbers"}
            </button>
          </div>
        </div>
      </aside>

      {/* Emergency Crisis Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {language === "ar" ? "أرقام الدعم النفسي الطارئ والمجاني" : "Emergency Crisis Lifelines"}
                </h3>
                <p className="text-xs text-gray-600">
                  {language === "ar" ? "متاحة على مدار 24 ساعة بسرية تامة ومجاناً" : "Available 24/7, confidential and free"}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "مصر - الأمانة العامة للصحة النفسية" : "Egypt - National Mental Health Secretariat"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {language === "ar" ? "خط مجاني رسمي متاح 24 ساعة" : "Official free line available 24/7"}
                  </p>
                </div>
                <a
                  href="tel:16328"
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>16328</span>
                </a>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "مصر - خط الاستشارات البديل" : "Egypt - Alternative Advisory Line"}
                  </p>
                  <p className="text-xs text-gray-600">08008880700 (أرضي مجاني)</p>
                </div>
                <a
                  href="tel:08008880700"
                  className="flex items-center gap-1 bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>08008880700</span>
                </a>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "المملكة العربية السعودية (مركز 937)" : "Saudi Arabia - 937 Medical Center"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {language === "ar" ? "استشارات نفسية وطبية عاجلة" : "Urgent psychiatric & medical support"}
                  </p>
                </div>
                <a
                  href="tel:937"
                  className="flex items-center gap-1 bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>937</span>
                </a>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "الإمارات العربية المتحدة (خط الأمل)" : "UAE - National Hope Line (800-4673)"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {language === "ar" ? "للدعم النفسي الفوري" : "Instant psychological support"}
                  </p>
                </div>
                <a
                  href="tel:8004673"
                  className="flex items-center gap-1 bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>800 4673</span>
                </a>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2 mb-4">
              <HeartHandshake className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p>
                {language === "ar"
                  ? "تذكر: لا تخض هذه اللحظة بمفردك. هناك دائماً من يستمع إليك ويرغب في مساعدتك للعبور بأمان."
                  : "Remember: You do not have to go through this alone. Compassionate specialists are ready to listen right now."}
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-teal-800 hover:bg-teal-900 text-white font-medium py-2.5 rounded-xl transition text-sm"
            >
              {language === "ar" ? "إغلاق والعودة للموقع" : "Close & Return to Site"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  User as UserIcon,
  Send,
  Wind,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Brain,
  ShieldCheck,
  HeartHandshake,
  Eye,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { BreathingExerciseModal } from "@/components/assistant/BreathingExerciseModal";
import { SensoryGroundingModal } from "@/components/assistant/SensoryGroundingModal";

export default function AssistantPage() {
  const { language } = useLanguage();
  const { aiMessages, sendAIMessage } = useTelehealth();

  const [inputVal, setInputVal] = useState("");
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [showGroundingModal, setShowGroundingModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendAIMessage(inputVal.trim());
    setInputVal("");
  };

  const handleQuickAction = (action: string) => {
    if (action === "panic_breathing") {
      setShowBreathingModal(true);
    } else if (action === "grounding") {
      setShowGroundingModal(true);
    } else if (action === "call_hotline") {
      window.location.href = "tel:16328";
    }
  };

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header Title */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-600 animate-pulse" />
            <span>{language === "ar" ? "المرشد النفسي الذكي (PFA)" : "Psychological First Aid AI"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            {language === "ar" ? "مساحتك الفورية للتفريغ والدعم النفسي الأولي" : "Immediate Psychological First Aid & Guided Support"}
          </h1>
          <p className="text-xs text-gray-500">
            {language === "ar"
              ? "مبني على أحدث بروتوكولات الإسعاف النفسي الأولي ومبادئ العلاج المعرفي السلوكي لمساعدتك في لحظات التوتر والهلع."
              : "Grounded in PFA clinical standards and CBT principles to support you through acute distress."}
          </p>
        </div>

        {/* Chat Interface Container */}
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-xl h-[620px] flex flex-col overflow-hidden">
          {/* Top Banner with Quick Exercise Triggers */}
          <div className="p-4 bg-teal-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-teal-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-800 flex items-center justify-center">
                <Bot className="w-5 h-5 text-sage-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-tight">
                  {language === "ar" ? "مساعد مركز أسما الإكلينيكي" : "Asmaa Clinical AI"}
                </h3>
                <span className="text-[11px] text-sage-300">
                  {language === "ar" ? "نشط ومتاح الآن للمساعدة" : "Online & Confidential"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGroundingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-xs font-bold transition text-sage-200 hover:text-white"
              >
                <Eye className="w-3.5 h-3.5 text-sage-400" />
                <span>{language === "ar" ? "التأريض 5-4-3-2-1" : "Grounding"}</span>
              </button>

              <button
                onClick={() => setShowBreathingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-xs font-bold transition text-sage-200 hover:text-white"
              >
                <Wind className="w-3.5 h-3.5 text-sage-400" />
                <span>{language === "ar" ? "تنفس 4-7-8" : "4-7-8"}</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-alabaster-base/40">
            {aiMessages.map((msg) => {
              const isUser = msg.sender === "user";
              const isCrisis = msg.triageFlag === "CRISIS_EMERGENCY";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
                >
                  <div className="flex items-start gap-3 max-w-[85%]">
                    {!isUser && (
                      <div className="w-8 h-8 rounded-2xl bg-teal-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs shadow-sm">
                        <Bot className="w-4 h-4 text-sage-300" />
                      </div>
                    )}
                    <div
                      className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-teal-800 text-white rounded-br-none shadow-md"
                          : isCrisis
                          ? "bg-red-50 text-red-950 border border-red-200 rounded-bl-none font-medium shadow-sm"
                          : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span
                        className={`block text-[10px] mt-2 ${
                          isUser ? "text-teal-200" : "text-gray-400"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Render Quick Actions */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pr-11 rtl:pr-11 ltr:pl-11">
                      {msg.quickActions.map((qa, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(qa.action)}
                          className={`text-xs px-3.5 py-2 rounded-2xl font-bold transition shadow-sm flex items-center gap-1.5 ${
                            qa.action === "call_hotline"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : qa.action === "panic_breathing"
                              ? "bg-sage-100 hover:bg-sage-200 text-sage-950 border border-sage-300"
                              : qa.action === "grounding"
                              ? "bg-teal-100 hover:bg-teal-200 text-teal-950 border border-teal-300"
                              : "bg-white hover:bg-teal-50 text-teal-900 border border-teal-200"
                          }`}
                        >
                          {qa.action === "panic_breathing" && <Wind className="w-3.5 h-3.5 text-sage-600" />}
                          {qa.action === "grounding" && <Eye className="w-3.5 h-3.5 text-teal-600" />}
                          {qa.action === "call_hotline" && <PhoneCall className="w-3.5 h-3.5" />}
                          <span>{qa.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
              {language === "ar" ? "اقتراحات سريعة:" : "Quick prompts:"}
            </span>
            <button
              onClick={() => sendAIMessage("أشعر بنوبة هلع الآن وخفقان في القلب - كيف أهدأ؟")}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-100 font-semibold"
            >
              {language === "ar" ? "نوبة هلع مفاجئة وخفقان" : "Panic attack & rapid heartbeat"}
            </button>
            <button
              onClick={() => sendAIMessage("كيف أتعامل مع التفكير المفرط والأرق ليلاً؟")}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-100 font-semibold"
            >
              {language === "ar" ? "التفكير المفرط والأرق" : "Overthinking & Insomnia"}
            </button>
            <button
              onClick={() => sendAIMessage("أريد تقييم مستوى القلق والاكتئاب لدي")}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-100 font-semibold"
            >
              {language === "ar" ? "تقييم القلق والاكتئاب" : "Assess Anxiety/Depression"}
            </button>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                language === "ar"
                  ? "صف مشاعرك أو اطرح سؤالك بخصوص صحتك النفسية..."
                  : "Describe your feelings or ask clinical questions..."
              }
              className="flex-1 bg-alabaster-muted px-5 py-3 rounded-2xl text-xs sm:text-sm text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-3.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white rounded-2xl shadow-md transition"
            >
              <Send className="w-5 h-5 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>

      <BreathingExerciseModal
        isOpen={showBreathingModal}
        onClose={() => setShowBreathingModal(false)}
      />

      <SensoryGroundingModal
        isOpen={showGroundingModal}
        onClose={() => setShowGroundingModal(false)}
      />
    </div>
  );
}

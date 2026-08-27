"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Wind,
  PhoneCall,
  Calendar,
  AlertCircle,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { BreathingExerciseModal } from "./BreathingExerciseModal";

export const AIAssistantDrawer: React.FC = () => {
  const { language } = useLanguage();
  const { aiMessages, sendAIMessage } = useTelehealth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [aiMessages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendAIMessage(inputVal.trim());
    setInputVal("");
  };

  const handleQuickAction = (action: string) => {
    if (action === "panic_breathing") {
      setShowBreathingModal(true);
    } else if (action === "intake_start") {
      setIsOpen(false);
      router.push("/intake");
    } else if (action === "view_doctors") {
      setIsOpen(false);
      router.push("/therapists");
    } else if (action === "book_doc_1") {
      setIsOpen(false);
      router.push("/booking/doc-1");
    } else if (action === "book_doc_2") {
      setIsOpen(false);
      router.push("/booking/doc-2");
    } else if (action === "call_hotline") {
      window.location.href = "tel:16328";
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 end-6 z-40 bg-teal-950 hover:bg-teal-900 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-sage-400 group transition-all duration-300 transform hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-teal-950" />
          </div>
          <span className="font-extrabold text-xs tracking-tight">
            {language === "ar" ? "المساعد النفسي الذكي" : "AI Clinical Guide"}
          </span>
        </button>
      )}

      {/* Slide-over Drawer / Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] h-[600px] bg-white rounded-3xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="bg-teal-900 text-white p-4 flex items-center justify-between border-b border-teal-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-800 border border-teal-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-terracotta-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">
                  {language === "ar" ? "المرشد الإكلينيكي الذكي" : "Clinical AI Assistant"}
                </h4>
                <p className="text-[11px] text-sage-300">
                  {language === "ar" ? "دعم نفسي أولي وتوجيه علاجي" : "Psychological First Aid & Triage"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowBreathingModal(true)}
                className="p-1.5 rounded-lg text-sage-300 hover:text-white hover:bg-teal-800 transition text-xs flex items-center gap-1"
                title="تمارين التنفس للهلع"
              >
                <Wind className="w-4 h-4 text-sage-400" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-teal-300 hover:text-white hover:bg-teal-800 transition"
                aria-label="Close Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clinical Disclaimer Header */}
          <div className="bg-alabaster-muted px-4 py-2 border-b border-alabaster-border flex items-center gap-2 text-[11px] text-gray-600">
            <AlertCircle className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" />
            <span>
              {language === "ar"
                ? "هذا الشات إرشادي للإسعاف النفسي الأولي ولا يغني عن التشخيص الطبي المتخصص."
                : "Informational PFA assistant only. Does not replace professional psychiatric diagnosis."}
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-alabaster-base/40">
            {aiMessages.map((msg) => {
              const isUser = msg.sender === "user";
              const isCrisis = msg.triageFlag === "CRISIS_EMERGENCY";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
                >
                  <div className="flex items-start gap-2 max-w-[88%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                        <Bot className="w-4 h-4 text-sage-300" />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-teal-800 text-white rounded-br-none"
                          : isCrisis
                          ? "bg-red-50 text-red-950 border border-red-200 rounded-bl-none font-medium shadow-sm"
                          : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span
                        className={`block text-[10px] mt-1.5 ${
                          isUser ? "text-teal-200" : "text-gray-400"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Render Quick Actions if any */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pr-9">
                      {msg.quickActions.map((qa, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(qa.action)}
                          className={`text-[11px] px-3 py-1.5 rounded-xl font-medium transition shadow-sm flex items-center gap-1 ${
                            qa.action === "call_hotline"
                              ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                              : qa.action === "panic_breathing"
                              ? "bg-sage-100 hover:bg-sage-200 text-sage-900 border border-sage-300"
                              : "bg-white hover:bg-teal-50 text-teal-800 border border-teal-200"
                          }`}
                        >
                          {qa.action === "panic_breathing" && <Wind className="w-3 h-3 text-sage-600" />}
                          {qa.action === "call_hotline" && <PhoneCall className="w-3 h-3" />}
                          {qa.action.startsWith("book") && <Calendar className="w-3 h-3 text-teal-700" />}
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

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => sendAIMessage("أشعر بنوبة هلع وتوتر مفاجئ")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-100 transition"
            >
              {language === "ar" ? "نوبة هلع مفاجئة" : "Panic Attack"}
            </button>
            <button
              onClick={() => sendAIMessage("أعاني من صعوبة شديدة في النوم والأرق")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-100 transition"
            >
              {language === "ar" ? "أعاني من الأرق" : "Insomnia"}
            </button>
            <button
              onClick={() => sendAIMessage("كيف أختار الاستشاري المناسب لحالتي؟")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-100 transition"
            >
              {language === "ar" ? "اختيار الطبيب" : "Choose Doctor"}
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                language === "ar"
                  ? "اكتب مشاعرك أو سؤالك هنا..."
                  : "Type your query or feelings here..."
              }
              className="flex-1 bg-alabaster-muted px-4 py-2.5 rounded-2xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700 transition"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white rounded-2xl shadow transition"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      )}

      {/* Breathing Exercise Modal */}
      <BreathingExerciseModal
        isOpen={showBreathingModal}
        onClose={() => setShowBreathingModal(false)}
      />
    </>
  );
};

"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MessageSquare,
  ClipboardList,
  Pill,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  Paperclip,
  Send,
  User,
  Stethoscope,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Share2,
  PenTool,
  Eraser,
  RotateCcw,
  Maximize2,
  Signal,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { PrescriptionItem, MentalStatusExam, DrugInteractionAlert } from "@/types/telehealth";
import { checkPrescriptionInteractions } from "@/data/mockInteractions";

export default function TelehealthSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const { language } = useLanguage();
  const { currentUser, switchUserRole, addClinicalRecord } = useTelehealth();

  // In-Call state controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"CHAT" | "WHITEBOARD" | "CLINICAL_DESK" | "PRESCRIPTION">("CHAT");
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(45 * 60 - 120); // 43 mins remaining
  const [roleView, setRoleView] = useState<"PATIENT" | "DOCTOR">(currentUser.role === "DOCTOR" ? "DOCTOR" : "PATIENT");

  // In-Call Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isDoctor: boolean }>>([
    {
      sender: "د. أسماء عبد الوهاب",
      text: "أهلاً بكِ، الجلسة بدأت وهي مشفرة بالكامل. كيف تشعرين اليوم؟",
      time: "15:02",
      isDoctor: true,
    },
    {
      sender: "سارة محمود",
      text: "أهلاً دكتورة، بدأت أشعر بتحسن بسيط بعد تمارين التنفس لكن ما زال الأرق مستمراً.",
      time: "15:03",
      isDoctor: false,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Doctor Clinical Desk State
  const [chiefComplaint, setChiefComplaint] = useState("نوبات هلع مفاجئة مع تسارع ضربات القلب وصعوبة في النوم");
  const [clinicalNotes, setClinicalNotes] = useState("المريضة مستجيبة لتقنيات الـ CBT. تم التوجيه بجدول تقييم الأفكار التلقائية وتعديل نمط النوم.");
  const [dsmCode, setDsmCode] = useState("300.02 (Generalized Anxiety Disorder)");
  const [mse, setMse] = useState<MentalStatusExam>({
    appearanceAndBehavior: "واعية، متجاوبة، توتر حركي خفيف",
    moodAndAffect: "مزاج قلق، تعبير متسق",
    thoughtProcess: "منطقي ومتصل",
    perception: "لا توجد هلاوس",
    cognitionAndOrientation: "سليم 100%",
    insightAndJudgement: "استبصار كامل",
    riskAssessment: "LOW",
  });

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#0D3B3F");
  const [selectedTemplate, setSelectedTemplate] = useState<"BLANK" | "CBT_TRIANGLE" | "PANIC_CYCLE">("CBT_TRIANGLE");

  // E-Prescription Builder State
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: "rx-item-1",
      medicineName: "Escitalopram 10mg",
      dosage: "نصف قرص يومياً لمدة 6 أيام ثم قرص كامل",
      frequency: "مرة واحدة صباحاً بعد الإفطار",
      duration: "شهرين للمتابعة",
      instructions: "يؤخذ بعد الأكل، يمنع التوقف المفاجئ",
    },
  ]);
  const [newMedName, setNewMedName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [newFrequency, setNewFrequency] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [rxSavedSuccess, setRxSavedSuccess] = useState(false);

  // Session timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: roleView === "DOCTOR" ? "د. أسماء عبد الوهاب" : "سارة محمود",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      isDoctor: roleView === "DOCTOR",
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicineName: newMedName.trim(),
      dosage: newDosage.trim() || "قرص واحد",
      frequency: newFrequency.trim() || "مرة يومياً",
      duration: newDuration.trim() || "شهر",
      instructions: newInstructions.trim() || "بعد الأكل",
    };

    setPrescriptions((prev) => [...prev, newItem]);
    setNewMedName("");
    setNewDosage("");
    setNewFrequency("");
    setNewDuration("");
    setNewInstructions("");
  };

  const handleRemoveMedication = (id: string) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const handleSaveAndSendRx = () => {
    addClinicalRecord({
      appointmentId: sessionId,
      doctorId: "doc-1",
      doctorName: "د. أسماء عبد الوهاب",
      patientId: "pat-1",
      patientName: "سارة محمود",
      sessionDate: new Date().toISOString().split("T")[0],
      chiefComplaint,
      mentalStatusExam: mse,
      clinicalDiagnosisNotes: clinicalNotes,
      dsm5Codes: [dsmCode],
      prescription: prescriptions,
      nextSessionRecommendation: "جلسة متابعة بعد أسبوعين لمتابعة الأثر الدوائي.",
      doctorSignature: "د. أسماء عبد الوهاب - استشاري أول الطب النفسي (ترخيص 84920)",
    });

    setRxSavedSuccess(true);
    setTimeout(() => setRxSavedSuccess(false), 4000);
  };

  // Draw template onto canvas
  const drawTemplate = (template: "BLANK" | "CBT_TRIANGLE" | "PANIC_CYCLE") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (template === "CBT_TRIANGLE") {
      ctx.strokeStyle = "#0D3B3F";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(175, 40);
      ctx.lineTo(60, 220);
      ctx.lineTo(290, 220);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "#0D3B3F";
      ctx.font = "bold 13px Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("الأفكار (Thoughts)", 175, 30);
      ctx.fillText("المشاعر (Feelings)", 60, 240);
      ctx.fillText("السلوك (Behaviors)", 290, 240);
    } else if (template === "PANIC_CYCLE") {
      ctx.strokeStyle = "#D97757";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(30, 30, 290, 60);
      ctx.strokeRect(30, 120, 290, 60);
      ctx.strokeRect(30, 210, 290, 60);

      ctx.fillStyle = "#0D3B3F";
      ctx.font = "bold 12px Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("1. المحفز الخارجي / الجسدي (Trigger)", 175, 65);
      ctx.fillText("2. التفسير الكارثي (Catastrophic Thought)", 175, 155);
      ctx.fillText("3. تصاعد الهلع والأعراض (Panic Spiral)", 175, 245);
    }
  };

  useEffect(() => {
    if (activeTab === "WHITEBOARD") {
      setTimeout(() => drawTemplate(selectedTemplate), 100);
    }
  }, [activeTab, selectedTemplate]);

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[650px] bg-teal-950 text-white flex flex-col overflow-hidden relative">
      {/* Dynamic Security Anti-Recording Watermark Overlay */}
      <div className="absolute inset-0 security-watermark-overlay z-10 flex flex-col justify-between p-6 opacity-30 pointer-events-none select-none">
        <div className="flex justify-between text-[11px] font-mono text-teal-300">
          <span>ASMAA CLINIC TELEHEALTH • ENCRYPTED SESSION #{sessionId}</span>
          <span>{new Date().toISOString()}</span>
        </div>
        <div className="text-center text-xs font-mono text-teal-200 tracking-widest">
          CONFIDENTIAL MEDICAL CONSULTATION • DO NOT RECORD • PATIENT ID: PAT-9482
        </div>
        <div className="flex justify-between text-[11px] font-mono text-teal-300">
          <span>DR. ASMAA ABDELWAHAB • LIC: 84920</span>
          <span>AES-256 E2EE VERIFIED</span>
        </div>
      </div>

      {/* Top Session Bar */}
      <div className="h-14 bg-teal-900/90 border-b border-teal-800/80 px-4 sm:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-indicator" />
            <span className="font-extrabold text-xs sm:text-sm text-white">
              {language === "ar" ? "غرفة الاستشارة السريرية المشفرة" : "Encrypted Clinical Suite"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-850 border border-teal-700/60 text-[11px] text-teal-200">
            <Signal className="w-3 h-3 text-emerald-400" />
            <span>1080p HD (28ms)</span>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className="flex items-center gap-2 px-3 py-1 bg-teal-950/80 border border-teal-800 rounded-xl font-mono text-xs font-bold text-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(sessionSeconds)}</span>
        </div>

        {/* Role Switcher in Room Preview */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-teal-950 p-1 rounded-xl border border-teal-800 text-xs">
            <button
              onClick={() => {
                setRoleView("PATIENT");
                switchUserRole("PATIENT");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                roleView === "PATIENT" ? "bg-teal-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {language === "ar" ? "عرض المريض" : "Patient View"}
            </button>
            <button
              onClick={() => {
                setRoleView("DOCTOR");
                switchUserRole("DOCTOR");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                roleView === "DOCTOR" ? "bg-teal-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {language === "ar" ? "عرض الطبيب" : "Doctor View"}
            </button>
          </div>

          <button
            onClick={() => setIsSideDrawerOpen(!isSideDrawerOpen)}
            className="p-2 rounded-xl bg-teal-850 hover:bg-teal-800 text-sage-300 hover:text-white transition"
            title="تبديل القائمة الجانبية"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 flex overflow-hidden relative z-20">
        {/* Left Video Grid */}
        <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-h-[calc(100%-4rem)]">
            {/* Feed 1: Doctor Viewport */}
            <div className="h-full min-h-[220px] bg-teal-900 rounded-3xl overflow-hidden relative border border-teal-700 shadow-2xl flex items-center justify-center group">
              <img
                src="https://images.unsplash.com/photo-1594824813620-1d89b4f0b2f4?auto=format&fit=crop&q=80&w=800"
                alt="Doctor Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 rtl:right-3 ltr:left-3 bg-teal-950/80 backdrop-blur-xs px-3 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 border border-teal-800">
                <Stethoscope className="w-3.5 h-3.5 text-sage-400" />
                <span>د. أسماء عبد الوهاب (استشاري أول)</span>
              </div>
              <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400/40 pointer-events-none" />
            </div>

            {/* Feed 2: Patient Viewport */}
            <div className="h-full min-h-[220px] bg-teal-900 rounded-3xl overflow-hidden relative border border-teal-700 shadow-2xl flex items-center justify-center">
              {isCamOn ? (
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800"
                  alt="Patient Feed"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-teal-400">
                  <VideoOff className="w-12 h-12" />
                  <span className="text-xs font-semibold">الكاميرا مغلقة</span>
                </div>
              )}

              <div className="absolute bottom-3 right-3 rtl:right-3 ltr:left-3 bg-teal-950/80 backdrop-blur-xs px-3 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 border border-teal-800">
                <User className="w-3.5 h-3.5 text-sage-400" />
                <span>سارة محمود (المريض)</span>
              </div>
            </div>
          </div>

          {/* Bottom Floating WebRTC Call Controls */}
          <div className="h-16 flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3.5 rounded-2xl transition shadow-md ${
                isMicOn ? "bg-teal-800 hover:bg-teal-700 text-white" : "bg-red-600 text-white"
              }`}
              title={isMicOn ? "كتم الميكروفون" : "تشغيل الميكروفون"}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={`p-3.5 rounded-2xl transition shadow-md ${
                isCamOn ? "bg-teal-800 hover:bg-teal-700 text-white" : "bg-red-600 text-white"
              }`}
              title={isCamOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
            >
              {isCamOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3.5 rounded-2xl transition shadow-md ${
                isScreenSharing ? "bg-emerald-600 text-white" : "bg-teal-800 hover:bg-teal-700 text-white"
              }`}
              title="مشاركة الشاشة"
            >
              <MonitorUp className="w-5 h-5" />
            </button>

            <Link
              href={roleView === "DOCTOR" ? "/dashboard/doctor" : "/dashboard/patient"}
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{language === "ar" ? "إنهاء الجلسة" : "End Call"}</span>
            </Link>
          </div>
        </div>

        {/* Right Collapsible Clinical Side Drawer */}
        {isSideDrawerOpen && (
          <div className="w-full sm:w-96 bg-white text-gray-900 border-s border-teal-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 bg-alabaster-base p-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("CHAT")}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === "CHAT" ? "bg-white text-teal-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "المحادثة" : "Chat"}</span>
              </button>

              <button
                onClick={() => setActiveTab("WHITEBOARD")}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeTab === "WHITEBOARD" ? "bg-white text-teal-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-sage-600" />
                <span>{language === "ar" ? "السبورة" : "Board"}</span>
              </button>

              {roleView === "DOCTOR" && (
                <>
                  <button
                    onClick={() => setActiveTab("CLINICAL_DESK")}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${
                      activeTab === "CLINICAL_DESK" ? "bg-white text-teal-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "التقييم" : "MSE"}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("PRESCRIPTION")}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${
                      activeTab === "PRESCRIPTION" ? "bg-white text-teal-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5 text-terracotta-600" />
                    <span>{language === "ar" ? "الروشتة" : "E-Rx"}</span>
                  </button>
                </>
              )}
            </div>

            {/* TAB 1: Encrypted Chat */}
            {activeTab === "CHAT" && (
              <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.isDoctor
                          ? "bg-teal-50 border border-teal-100 text-teal-950 mr-4"
                          : "bg-gray-100 border border-gray-200 text-gray-800 ml-4"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px] text-gray-500 mb-1">
                        <span>{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                    title="إرفاق ملف أو تقرير"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={language === "ar" ? "اكتب رسالة مشفرة..." : "Type message..."}
                    className="flex-1 bg-alabaster-muted px-3 py-2 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-teal-700 text-gray-900"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl transition shadow"
                  >
                    <Send className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Clinical Interactive Whiteboard */}
            {activeTab === "WHITEBOARD" && (
              <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-teal-950">نموذج الشرح المعرفي:</span>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      onClick={() => {
                        setSelectedTemplate("CBT_TRIANGLE");
                        drawTemplate("CBT_TRIANGLE");
                      }}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        selectedTemplate === "CBT_TRIANGLE" ? "bg-teal-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      مثلث CBT
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate("PANIC_CYCLE");
                        drawTemplate("PANIC_CYCLE");
                      }}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        selectedTemplate === "PANIC_CYCLE" ? "bg-teal-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      دورة الهلع
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate("BLANK");
                        drawTemplate("BLANK");
                      }}
                      className={`px-2 py-1 rounded-lg font-bold ${
                        selectedTemplate === "BLANK" ? "bg-teal-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      فارغة
                    </button>
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-white border-2 border-dashed border-teal-200 rounded-2xl relative flex items-center justify-center overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={300}
                    className="w-full h-full cursor-crosshair"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[11px] text-gray-500">مشاركة حية متزامنة مع المريض</span>
                  <button
                    onClick={() => drawTemplate(selectedTemplate)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>مسح</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Doctor Clinical Desk */}
            {activeTab === "CLINICAL_DESK" && roleView === "DOCTOR" && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-gray-900 block">الشكوى الرئيسية (Chief Complaint):</label>
                  <textarea
                    rows={2}
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-alabaster-base border border-gray-200 text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-900 block">التشخيص المعياري (DSM-5 / ICD-11):</label>
                  <input
                    type="text"
                    value={dsmCode}
                    onChange={(e) => setDsmCode(e.target.value)}
                    className="w-full p-2 rounded-xl bg-alabaster-base border border-gray-200 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-900 block">فحص الحالة العقلية (MSE):</label>
                  <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100 space-y-2 text-[11px]">
                    <div>
                      <span className="font-bold text-teal-900">المظهر والسلوك: </span>
                      <span>{mse.appearanceAndBehavior}</span>
                    </div>
                    <div>
                      <span className="font-bold text-teal-900">المزاج والتأثير: </span>
                      <span>{mse.moodAndAffect}</span>
                    </div>
                    <div>
                      <span className="font-bold text-teal-900">تقييم المخاطر (Risk): </span>
                      <span className="font-bold text-emerald-700">منخفض (LOW)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-900 block">الملاحظات الإكلينيكية وخطة المتابعة:</label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-alabaster-base border border-gray-200 text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                  يتم حفظ الملاحظات السريرية في السجل الطبي الإلكتروني للمريض تلقائياً عند حفظ الروشتة.
                </div>
              </div>
            )}

            {/* TAB 4: Digital E-Prescription Builder */}
            {activeTab === "PRESCRIPTION" && roleView === "DOCTOR" && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-teal-950">
                    <Pill className="w-4 h-4 text-terracotta-600" />
                    <span>الروشتة الدوائية الإلكترونية</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">DOC-LIC-84920</span>
                </div>

                {/* Prescription Items List */}
                <div className="space-y-2">
                  {prescriptions.map((item) => (
                    <div key={item.id} className="p-3 bg-alabaster-base rounded-xl border border-alabaster-border relative group">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(item.id)}
                        className="absolute top-2 left-2 text-gray-400 hover:text-red-600 transition"
                        title="حذف الدواء"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <h5 className="font-bold text-teal-900">{item.medicineName}</h5>
                      <p className="text-[11px] text-gray-600">{item.dosage} • {item.frequency}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.instructions}</p>
                    </div>
                  ))}
                </div>

                {/* Add Medication Subform */}
                <form onSubmit={handleAddMedication} className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 space-y-2">
                  <span className="font-bold text-teal-900 block text-[11px]">إضافة دواء جديد:</span>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="اسم الدواء والتركيز (مثال: Melatonin 3mg)"
                    className="w-full p-2 rounded-xl bg-white border border-gray-200 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newDosage}
                      onChange={(e) => setNewDosage(e.target.value)}
                      placeholder="الجرعة (قرص واحد)"
                      className="p-2 rounded-xl bg-white border border-gray-200 text-xs"
                    />
                    <input
                      type="text"
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      placeholder="التكرار (قبل النوم)"
                      className="p-2 rounded-xl bg-white border border-gray-200 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة للروشتة</span>
                  </button>
                </form>

                {/* Drug-Drug Interaction Warning Alerts */}
                {(() => {
                  const alerts = checkPrescriptionInteractions(prescriptions.map((p) => p.medicineName));
                  if (alerts.length === 0) {
                    return (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>مدقق التفاعلات الدوائية: تم الفحص ولا توجد تعارضات مسجلة.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {alerts.map((alt, i) => (
                        <div key={i} className="p-3 bg-red-50 rounded-xl border border-red-300 text-red-950 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-red-700">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>تحذير تعارض دوائي ({alt.drugA} + {alt.drugB})</span>
                          </div>
                          <p className="text-[10px] text-red-800">{alt.effectAr}</p>
                          <p className="text-[10px] font-bold text-red-900 mt-0.5">التوصية: {alt.recommendationAr}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {rxSavedSuccess && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم اعتماد الروشتة وإرسالها لمحفظة المريض بنجاح!</span>
                  </div>
                )}

                {/* Save & Sign E-Rx CTA */}
                <button
                  type="button"
                  onClick={handleSaveAndSendRx}
                  className="w-full py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وتوقيع وإرسال للمريض</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

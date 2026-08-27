"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Heart,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Star,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  Users,
  Brain,
  Video,
  FileText,
  ChevronDown,
  PhoneCall,
  Activity,
  Zap,
  Moon,
  Flame,
  HeartCrack,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";
import { ClinicalAvatar } from "@/components/common/ClinicalAvatar";

export default function LandingPage() {
  const { language } = useLanguage();
  const { doctors, courses, books } = useTelehealth();
  const router = useRouter();

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const ArrowIcon = language === "ar" ? ArrowLeft : ArrowRight;

  const conditionPills = [
    {
      id: "panic",
      icon: Zap,
      labelAr: "نوبات الهلع وتسارع النبض المفاجئ",
      labelEn: "Sudden Panic Attacks & Heart Palpitations",
      descAr: "تقنيات إكلينيكية لكسر حلقة الخوف الفوري واستعادة توازن الجهاز العصبي",
      descEn: "Clinical protocols to de-escalate acute fear and restore autonomic balance",
    },
    {
      id: "anxiety",
      icon: Activity,
      labelAr: "القلق المعمم وصعوبة إيقاف الأفكار",
      labelEn: "Generalized Anxiety & Overthinking",
      descAr: "إعادة الهيكلة المعرفية وتنظيم مستويات القلق اليومية",
      descEn: "Cognitive reframing to manage chronic daily worry and catastrophic thoughts",
    },
    {
      id: "sleep",
      icon: Moon,
      labelAr: "الأرق المزمن واضطرابات النوم",
      labelEn: "Chronic Insomnia & Sleep Fatigue",
      descAr: "بروتوكول العلاج السلوكي المعرفي للأرق (CBT-I) لضبط الإيقاع الحيوي",
      descEn: "Evidence-based CBT-I protocols to restore natural circadian rhythms",
    },
    {
      id: "trauma",
      icon: HeartCrack,
      labelAr: "علاج الصدمات النفسية والفقد (PTSD)",
      labelEn: "Trauma Recovery, PTSD & Grief",
      descAr: "برامج علاجية آمنة بتقنيات الـ EMDR وتفريغ الشحنات العاطفية المخزونة",
      descEn: "Safe EMDR protocols to process emotional trauma and somatic triggers",
    },
    {
      id: "relationships",
      icon: Users,
      labelAr: "الاستشارات الزوجية وفهم الشريك",
      labelEn: "Couples Therapy & Attachment Repair",
      descAr: "العلاج المرتكز على المشاعر (EFT) لكسر دوامة الخلافات وبناء الأمان العاطفي",
      descEn: "Emotionally Focused Therapy to resolve conflict and rebuild intimacy",
    },
    {
      id: "burnout",
      icon: Flame,
      labelAr: "الاحتراق النفسي وضغوط العمل",
      labelEn: "Executive Burnout & Workplace Stress",
      descAr: "استراتيجيات استعادة الطاقة والتركيز ووضع الحدود الصحية في العمل",
      descEn: "Boundary setting and energy restoration for high-stress professionals",
    },
  ];

  const faqs = [
    {
      qAr: "كيف تضمنون سرية وخصوصية جلساتي الطبية؟",
      qEn: "How do you guarantee the confidentiality and privacy of my sessions?",
      aAr: "تخضع جميع استشارات مركز أسما لمعايير الخصوصية الطبية العالمية HIPAA وGDPR. جميع محادثات ومكالمات الفيديو مشفرة بالكامل من طرف إلى طرف (AES-256 E2EE)، مع علامات مائية رقمية تمنع التسجيل، ولا يتم حفظ أي تسجيلات فيديو على خوادمنا نهائياً.",
      aEn: "All consultations strictly adhere to HIPAA and GDPR clinical privacy standards. Video streams are protected with AES-256 end-to-end encryption with anti-recording digital watermarks, and no video feeds are ever recorded or stored on our servers.",
    },
    {
      qAr: "ما الفرق بين الطبيب النفسي (Psychiatrist) والمعالج النفسي (Psychotherapist)؟",
      qEn: "What is the difference between a Psychiatrist and a Psychotherapist?",
      aAr: "الطبيب النفسي هو خريج كلية الطب وحاصل على دراسات عليا في الطب النفسي، ومصرح له بالتشخيص الإكلينيكي وصرف الأدوية والعلاجات الدوائية إن لزمت. أما المعالج النفسي فهو متخصص في علم النفس الإكلينيكي ويقدم جلسات العلاج النفسي الكلامي مثل العلاج المعرفي السلوكي (CBT) وعلاج العلاقات.",
      aEn: "A Psychiatrist is a medical doctor specialized in mental health authorized to diagnose and prescribe psychiatric medications when needed. A Psychotherapist specializes in clinical psychology, providing talk therapies such as CBT, DBT, and couples counseling.",
    },
    {
      qAr: "هل الجلسات عبر الإنترنت فعالة مثل الحضور للعيادة؟",
      qEn: "Is online telepsychiatry as effective as in-person clinic visits?",
      aAr: "تؤكد الأبحاث والدراسات المعتمدة من الجمعية الأمريكية للطب النفسي (APA) أن العلاج النفسي عن بُعد يحقق نفس معدلات النجاح السريري للجلسات الحضورية، مع ميزة إضافية هي الراحة وتوفير الوقت وحرية التحدث من مساحتك الخاصة الأكثر أماناً.",
      aEn: "Numerous peer-reviewed clinical studies by the APA confirm that telepsychiatry and online psychotherapy achieve identical clinical efficacy to in-person sessions, while offering greater comfort, accessibility, and privacy.",
    },
    {
      qAr: "كيف يتم استلام الروشتة الطبية بعد الجلسة؟",
      qEn: "How do I receive my digital prescription after the session?",
      aAr: "يقوم الطبيب بإصدار روشتة إلكترونية معتمدة تحمل توقيعه الرقمي ورقم ترخيصه الطبي فور انتهاء الجلسة، وتظهر مباشرة في ملفك الطبي ومحفظتك على المنصة بصيغة قابلة للتحميل والطباعة وصرفها من الصيدليات.",
      aEn: "The consultant psychiatrist issues a digitally verified e-prescription with their license and electronic signature directly to your patient dashboard, ready for download, printing, and fulfillment at pharmacies.",
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-white via-alabaster-base to-alabaster-muted/40 border-b border-alabaster-border">
        {/* Soft Background Accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-sage-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left/Right Text Content based on RTL */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start rtl:lg:text-right ltr:lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-xs font-bold text-teal-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Award className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  {language === "ar"
                    ? "العيادة النفسية الرقمية الأولى بإشراف استشاريي البورد المصري والبريطاني"
                    : "Premier Telepsychiatry Suite Supervised by Egyptian & British Board Consultants"}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-teal-950 tracking-tight leading-[1.3] space-y-2">
                {language === "ar" ? (
                  <>
                    <span>مساحتك الآمنة للتعافي النفسي..</span>
                    <br />
                    <span className="text-teal-800 underline decoration-sage-300 decoration-wavy decoration-2 underline-offset-8">
                      رعاية متخصصة وسرية تامة
                    </span>{" "}
                    <span>من نخبة الاستشاريين</span>
                  </>
                ) : (
                  <>
                    <span>Your safe haven for psychiatric care and healing..</span>
                    <br />
                    <span className="text-teal-800 underline decoration-sage-300 decoration-wavy decoration-2 underline-offset-8">
                      evidence-based and strictly confidential
                    </span>
                  </>
                )}
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {language === "ar"
                  ? "تجاوز القلق، نوبات الهلع، والاكتئاب من منزلك عبر جلسات فيديو مشفرة، استبيان تقييم طبي ذكي، وروشتات علاجية معتمدة مع كبار أطباء وأخصائيي الصحة النفسية."
                  : "Overcome anxiety, panic attacks, and depression from the comfort of your home via encrypted video sessions, smart clinical triage, and certified e-prescriptions."}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/intake"
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-base shadow-xl shadow-terracotta-600/25 transition transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  <span>{language === "ar" ? "ابدأ تقييم حالتك النفسية مجاناً (3 دقائق)" : "Free 3-Min Triage Assessment"}</span>
                  <ArrowIcon className="w-5 h-5" />
                </Link>

                <Link
                  href="/therapists"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-teal-50/60 text-teal-900 border border-teal-200/80 font-bold text-sm shadow-sm transition"
                >
                  <Calendar className="w-4 h-4 text-teal-700" />
                  <span>{language === "ar" ? "تصفح قائمة الأطباء والمواعيد" : "Explore Doctors & Slots"}</span>
                </Link>
              </div>

              {/* Trust Metric Micro-Grid */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-200/70">
                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <Lock className="w-4 h-4 text-sage-600" />
                    <span>100% HIPAA</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "سرية وتشفير كامل" : "Full Privacy"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <ShieldCheck className="w-4 h-4 text-sage-600" />
                    <span>E2EE 256-bit</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "جلسات فيديو مشفرة" : "Encrypted Video"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <Award className="w-4 h-4 text-sage-600" />
                    <span>+18 {language === "ar" ? "عاماً" : "Years"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "خبرة طبية سريرية" : "Clinical Practice"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>4.96 / 5.0</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "تقييم 15k+ مريض" : "15k+ Reviews"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Graphic / Interactive Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-teal-100/80 space-y-5">
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-gray-700">
                      {language === "ar" ? "جلسة استشارية مباشرة الآن" : "Live Telehealth Consultation"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black tracking-wider">
                    E2E ENCRYPTED
                  </span>
                </div>

                {/* Doctor Showcase Mini with Guaranteed ClinicalAvatar */}
                <div className="flex items-center gap-4">
                  <ClinicalAvatar
                    src={doctors[0].avatar}
                    alt={doctors[0].fullName}
                    name={doctors[0].fullName}
                    className="w-16 h-16 rounded-2xl ring-4 ring-teal-50 shadow-sm"
                    isDoctor={true}
                    badgeIcon={
                      <span className="p-1 bg-teal-800 text-white rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    }
                  />

                  <div className="space-y-1">
                    <h2 className="font-extrabold text-base text-gray-900 leading-tight">
                      {language === "ar" ? doctors[0].fullName : doctors[0].fullNameEn}
                    </h2>
                    <p className="text-xs text-sage-700 font-medium">
                      {language === "ar" ? doctors[0].title : doctors[0].titleEn}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
                      <div className="flex items-center text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black text-gray-800 mr-1 ml-1">{doctors[0].rating}</span>
                      </div>
                      <span>•</span>
                      <span>{doctors[0].totalReviews} {language === "ar" ? "تقييم موثق" : "reviews"}</span>
                    </div>
                  </div>
                </div>

                {/* Patient Live Interaction Mockup with Generous Line-Height */}
                <div className="bg-alabaster-base p-4 rounded-2xl border border-alabaster-border space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-black flex-shrink-0 shadow-xs">
                      أ
                    </div>
                    <div className="p-3 bg-white rounded-2xl shadow-xs text-xs text-gray-800 border border-gray-100 flex-1 leading-relaxed font-medium">
                      {language === "ar"
                        ? "أهلاً بكِ سارة. فحصنا نتائج استبيان القلق، وسنبدأ اليوم خطة التهدئة وإعادة التوجيه المعرفي معاً."
                        : "Welcome Sara. We reviewed your anxiety intake; today we begin our CBT grounding protocol together."}
                    </div>
                  </div>

                  <div className="p-3 bg-teal-50/90 rounded-2xl border border-teal-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-teal-950 font-extrabold">
                      <FileText className="w-4 h-4 text-teal-700" />
                      <span>{language === "ar" ? "الخطة العلاجية والروشتة الرقمية" : "Clinical E-Prescription Plan"}</span>
                    </div>
                    <span className="text-[10px] bg-white px-2.5 py-1 rounded-md text-teal-900 font-extrabold border border-teal-200 shadow-2xs">
                      {language === "ar" ? "جاهزة للتحميل" : "Ready"}
                    </span>
                  </div>
                </div>

                {/* Instant Booking Trigger Button in Card */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">
                      {language === "ar" ? "أقرب موعد متاح" : "Next Available Slot"}
                    </span>
                    <span className="text-xs font-extrabold text-teal-900">
                      {language === "ar" ? doctors[0].nextAvailableSlot : doctors[0].nextAvailableSlotEn}
                    </span>
                  </div>

                  <Link
                    href={`/booking/${doctors[0].id}`}
                    className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-black rounded-xl shadow-md transition"
                  >
                    {language === "ar" ? "حجز فوري" : "Instant Book"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Clinical Triage Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-50 border border-sage-200 text-xs font-bold text-sage-800">
            <Brain className="w-3.5 h-3.5 text-sage-600" />
            <span>{language === "ar" ? "ما الذي تشعر به أو ترغب في معالجته؟" : "What are you experiencing today?"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-teal-950">
            {language === "ar" ? "اختر ما يصف حالتك لبدء التوجيه الإكلينيكي فوراً" : "Select Your Primary Concern for Tailored Clinical Matching"}
          </h2>
          <p className="text-sm text-gray-600">
            {language === "ar"
              ? "يحلل نظامنا الذكي الأعراض والشكوى الرئيسية لترشيح الاستشاريين الأنسب مع حساب نسبة التطابق السريري."
              : "Our clinical algorithm analyzes your concerns to match you with the most suitable licensed consultant."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {conditionPills.map((pill) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.id}
                onClick={() => router.push(`/intake?concern=${pill.id}`)}
                className="p-6 bg-white rounded-3xl border border-alabaster-border hover:border-sage-400 hover:shadow-xl transition duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center text-sage-700 group-hover:bg-teal-800 group-hover:text-white transition duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-teal-950 group-hover:text-teal-800 transition">
                    {language === "ar" ? pill.labelAr : pill.labelEn}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {language === "ar" ? pill.descAr : pill.descEn}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-teal-800 group-hover:text-terracotta-600 transition">
                  <span>{language === "ar" ? "ابدأ التقييم المخصص" : "Start Tailored Assessment"}</span>
                  <ArrowIcon className="w-4 h-4 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Therapists Showcase */}
      <section className="bg-white py-16 border-y border-alabaster-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-900 mb-2">
                <Award className="w-3.5 h-3.5 text-teal-700" />
                <span>{language === "ar" ? "نخبة الاستشاريين" : "Senior Clinical Faculty"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-950">
                {language === "ar" ? "استشاريو وأطباء مركز أسما" : "Consultant Psychiatrists & Psychologists"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {language === "ar"
                  ? "جميع الأطباء مرخصون من وزارة الصحة المصرية وأعضاء بالجمعيات العالمية للطب النفسي."
                  : "All consultants are licensed with minimum 10+ years of clinical psychotherapy practice."}
              </p>
            </div>

            <Link
              href="/therapists"
              className="inline-flex items-center gap-2 text-sm font-bold text-teal-800 hover:text-teal-900 underline underline-offset-4"
            >
              <span>{language === "ar" ? "عرض جميع الأطباء والمواعيد" : "View All Therapists"}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-alabaster-base rounded-3xl border border-alabaster-border overflow-hidden hover:shadow-xl transition duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Doctor Image & Availability Badge */}
                  <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
                    <ClinicalAvatar
                      src={doctor.avatar}
                      alt={doctor.fullName}
                      name={doctor.fullName}
                      className="w-full h-full"
                      isDoctor={true}
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-bold text-teal-900 shadow-sm border border-gray-100 flex items-center gap-1 z-10">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{language === "ar" ? "متاح للحجز" : "Available"}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-teal-900/90 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 z-10">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{doctor.rating}</span>
                    </div>
                  </div>

                  {/* Info Body */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-base text-teal-950 group-hover:text-teal-800 transition">
                        {language === "ar" ? doctor.fullName : doctor.fullNameEn}
                      </h3>
                      <p className="text-xs text-sage-700 font-semibold line-clamp-1 mt-0.5">
                        {language === "ar" ? doctor.title : doctor.titleEn}
                      </p>
                    </div>

                    {/* Specialties Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(language === "ar" ? doctor.specialties : doctor.specialtiesEn).slice(0, 2).map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white text-gray-700 text-[10px] font-medium border border-gray-200/80"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Slot & Price */}
                    <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          {language === "ar" ? "سعر الجلسة" : "Session Rate"}
                        </span>
                        <span className="font-extrabold text-teal-900 text-sm">
                          {formatCurrency(doctor.sessionRateEGP, "EGP", language)}
                        </span>
                      </div>

                      <div className="text-end">
                        <span className="text-[10px] text-gray-400 block">
                          {language === "ar" ? "الخبرة" : "Experience"}
                        </span>
                        <span className="font-bold text-gray-700">
                          {doctor.yearsOfExperience} {language === "ar" ? "سنة" : "yrs"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="p-5 pt-0">
                  <Link
                    href={`/booking/${doctor.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-md transition"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "حجز موعد فوري" : "Book Slot"}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Asmaa Academy & Bookstore Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terracotta-50 border border-terracotta-200 text-xs font-bold text-terracotta-800">
              <BookOpen className="w-3.5 h-3.5 text-terracotta-600" />
              <span>{language === "ar" ? "الأكاديمية ومكتبة التعافي" : "Academy & Healing Library"}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-teal-950 leading-tight">
              {language === "ar" ? (
                <>
                  برامج تدريبية سريرية وكتب إرشادية{" "}
                  <span className="text-terracotta-600">لتطوير مرونتك النفسية</span>
                </>
              ) : (
                <>
                  Masterclasses & Clinical Workbooks for{" "}
                  <span className="text-terracotta-600">Long-term Emotional Resilience</span>
                </>
              )}
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed">
              {language === "ar"
                ? "صمم استشاريو مركز أسما دورات تدريبية متخصصة تدمج تقنيات العلاج المعرفي واليقظة الذهنية مع فيديوهات تفاعلية وكتب عمل قابلة للتحميل."
                : "Designed by Asmaa Clinic consultants, combining CBT protocols and mindfulness with practical exercises and downloadable clinical workbooks."}
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/academy"
                className="px-6 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-md transition"
              >
                {language === "ar" ? "استكشف الكورسات" : "Browse Courses"}
              </Link>
              <Link
                href="/books"
                className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-teal-900 border border-gray-200 font-bold text-xs transition"
              >
                {language === "ar" ? "مكتبة الكتب الإلكترونية" : "E-Book Library"}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Course Card Preview */}
            <div className="bg-white p-5 rounded-3xl border border-alabaster-border shadow-md space-y-4">
              <div className="relative h-40 rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={courses[0].thumbnail}
                  alt={courses[0].title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-teal-900/90 text-white text-[10px] font-extrabold">
                  {courses[0].totalDuration}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-sage-700 uppercase">
                  {language === "ar" ? "ماستركلاس علاجي" : "Masterclass"}
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 line-clamp-1 mt-0.5">
                  {language === "ar" ? courses[0].title : courses[0].titleEn}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                  {language === "ar" ? courses[0].description : courses[0].descriptionEn}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-extrabold text-teal-900 text-sm">
                  {formatCurrency(courses[0].priceEGP, "EGP", language)}
                </span>
                <Link
                  href="/academy"
                  className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1"
                >
                  <span>{language === "ar" ? "مشاهدة المقدمة" : "Preview"}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Book Card Preview */}
            <div className="bg-white p-5 rounded-3xl border border-alabaster-border shadow-md space-y-4">
              <div className="relative h-40 rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={books[0].coverImage}
                  alt={books[0].title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-sage-900/90 text-white text-[10px] font-extrabold">
                  {books[0].pagesCount} {language === "ar" ? "صفحة" : "pages"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-terracotta-700 uppercase">
                  {language === "ar" ? "كتاب إلكتروني + تمارين" : "eBook & Workbook"}
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 line-clamp-1 mt-0.5">
                  {language === "ar" ? books[0].title : books[0].titleEn}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                  {language === "ar" ? books[0].description : books[0].descriptionEn}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-extrabold text-teal-900 text-sm">
                  {formatCurrency(books[0].priceEGP, "EGP", language)}
                </span>
                <Link
                  href="/books"
                  className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1"
                >
                  <span>{language === "ar" ? "قراءة مقتطف" : "Read Sample"}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-teal-950">
            {language === "ar" ? "الأسئلة الشائعة حول الاستشارات النفسية" : "Frequently Asked Questions"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "كل ما تحتاج لمعرفته حول آلية الجلسات، الخصوصية، والروشتات الدوائية."
              : "Everything you need to know about our telepsychiatry protocols and confidentiality."}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-alabaster-border overflow-hidden transition"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full p-5 text-start rtl:text-right ltr:text-left flex items-center justify-between gap-4 font-bold text-sm text-teal-950 hover:bg-alabaster-base/60 transition"
                >
                  <span>{language === "ar" ? faq.qAr : faq.qEn}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-sage-600 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                    <p>{language === "ar" ? faq.aAr : faq.aEn}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

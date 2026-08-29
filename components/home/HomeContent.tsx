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
  Stethoscope,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { ClinicalAvatar } from "@/components/common/ClinicalAvatar";
import type { DoctorCardView } from "@/app/actions/doctors.actions";
import { formatEgp } from "@/lib/whatsapp";

/**
 * Landing page content.
 *
 * Consultants are fetched on the server and passed in, so this component holds
 * no data of its own. Anything the platform does not actually measure — star
 * ratings, review counts, a live "next available slot" — has been removed
 * rather than filled with plausible numbers: an invented 4.98 on a clinic's
 * home page is a claim the clinic cannot stand behind.
 */
export function HomeContent({ doctors }: { doctors: DoctorCardView[] }) {
  const { language } = useLanguage();
  const router = useRouter();

  // The showcase card needs one consultant; the clinic may have none configured
  // yet on a fresh install.
  const featured = doctors[0] ?? null;

  // Derived from the real roster rather than asserted, so the badge cannot drift
  // away from the consultants the clinic actually has.
  const maxExperience = doctors.reduce(
    (highest, doctor) => Math.max(highest, doctor.yearsOfExperience),
    0,
  );

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
      aAr: "تُدار سجلاتك الطبية وفق معايير الخصوصية الصحية الصارمة: بياناتك مخزّنة على خوادم المركز تحت حماية مشددة، ولا يطّلع على ملفك سوى استشاريك المعالج، ويُسجَّل كل اطلاع على السجل في سجل تدقيق دائم. تُعقد الجلسات الأونلاين عبر منصة زووم المؤمّنة، والمركز لا يسجّل أو يحتفظ بأي تسجيل للجلسات.",
      aEn: "Your records are handled under strict health-privacy protocols: data is stored securely on clinic servers, only your treating consultant can open your file, and every access is written to an immutable audit log. Online sessions run on secure Zoom rooms, and the clinic neither records nor stores any session video.",
    },
    {
      qAr: "ما الفرق بين الطبيب النفسي (Psychiatrist) والمعالج النفسي (Psychotherapist)؟",
      qEn: "What is the difference between a Psychiatrist and a Psychotherapist?",
      aAr: "الطبيب النفسي هو خريج كلية الطب وحاصل على دراسات عليا في الطب النفسي، ومصرح له بالتشخيص الإكلينيكي وصرف الأدوية والعلاجات الدوائية إن لزمت. أما المعالج النفسي فهو متخصص في علم النفس الإكلينيكي ويقدم جلسات العلاج النفسي الكلامي مثل العلاج المعرفي السلوكي (CBT) وعلاج العلاقات.",
      aEn: "A Psychiatrist is a medical doctor specialized in mental health authorized to diagnose and prescribe psychiatric medications when needed. A Psychotherapist specializes in clinical psychology, providing talk therapies such as CBT, DBT, and couples counseling.",
    },
    {
      qAr: "هل الجلسات عبر الإنترنت فعالة مقارنة بالحضور للعيادة؟",
      qEn: "How effective is telepsychiatry compared to in-person clinic visits?",
      aAr: "تؤكد الأبحاث والدراسات المعتمدة أن العلاج النفسي عن بُعد يحقق نتائج سريرية مقاربة ومماثلة للجلسات الحضورية في معظم الاضطرابات النفسية، مع ميزة توفير الوقت والراحة والتحدث من مساحتك الخاصة الأكثر أماناً.",
      aEn: "Extensive clinical research confirms that telepsychiatry achieves comparable clinical outcomes to in-person care for most psychiatric conditions, while providing greater comfort, privacy, and convenience.",
    },
    {
      qAr: "كيف يتم تسجيل الخطة العلاجية والدوائية بعد الجلسة؟",
      qEn: "How is my treatment and medication plan recorded after the session?",
      aAr: "يقوم الاستشاري بتدوين التشخيص الإكلينيكي وتفاصيل الخطة العلاجية والدوائية في ملفك الطبي السري على المنصة فور انتهاء الجلسة، ليكون متاحاً لك ولطبيبك المعالج في أي وقت لمتابعة مسار التعافي.",
      aEn: "The consultant records the clinical diagnosis and detailed treatment plan directly into your confidential patient record on the platform immediately following the session, accessible anytime to review your recovery plan.",
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
                    ? "عيادة رقمية متخصصة بإشراف نخبة من استشاريي الطب النفسي المعتمدين"
                    : "Specialized Telepsychiatry Suite Supervised by Licensed Psychiatric Consultants"}
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
                  ? "تجاوز القلق، نوبات الهلع، والاكتئاب عبر جلسات أونلاين من منزلك أو زيارة حضورية بالعيادة، مع استبيان تقييم طبي ذكي وسجلات علاجية موثقة من نخبة استشاريي الصحة النفسية."
                  : "Work through anxiety, panic and depression in an online session from home or an in-person visit at the clinic, with smart clinical triage and consultant-signed records."}
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
                    <span>{language === "ar" ? "خصوصية تامة" : "Strict Privacy"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "سجلات مشفرة ومحمية" : "Protected Records"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <ShieldCheck className="w-4 h-4 text-sage-600" />
                    <span>{language === "ar" ? "زووم" : "Zoom"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "جلسات مؤمنة بلا تسجيل" : "Unrecorded Sessions"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <Award className="w-4 h-4 text-sage-600" />
                    <span>
                      {maxExperience > 0 ? `+${maxExperience}` : "—"}{" "}
                      {language === "ar" ? "عاماً" : "Years"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "خبرة طبية سريرية" : "Clinical Practice"}
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-black text-sm">
                    <Stethoscope className="w-4 h-4 text-sage-600" />
                    <span>{doctors.length || "—"}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {language === "ar" ? "استشاري معتمد" : "Licensed Consultants"}
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
                      {language === "ar" ? "جلسة استشارية مباشرة" : "Live Telehealth Consultation"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black tracking-wider">
                    {language === "ar" ? "سرية طبية" : "CONFIDENTIAL"}
                  </span>
                </div>

                {/* Doctor Showcase Mini with Guaranteed ClinicalAvatar */}
                <div className="flex items-center gap-4">
                  <ClinicalAvatar
                    src={featured?.avatarUrl ?? undefined}
                    alt={featured?.fullName ?? "Asmaa Clinic"}
                    name={featured?.fullName ?? "Asmaa Clinic"}
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
                      {featured?.fullName}
                    </h2>
                    <p className="text-xs text-sage-700 font-medium">
                      {language === "ar" ? featured?.title : (featured?.titleEn ?? featured?.title)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
                      <span className="flex items-center gap-1 text-sage-700 font-semibold">
                        <Award className="w-3.5 h-3.5" />
                        {featured?.yearsOfExperience} {language === "ar" ? "سنة خبرة" : "yrs experience"}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px]" dir="ltr">{featured?.licenseNumber}</span>
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
                      <span>{language === "ar" ? "الخطة العلاجية وسجل الجلسة" : "Treatment Record & Plan"}</span>
                    </div>
                    <span className="text-[10px] bg-white px-2.5 py-1 rounded-md text-teal-900 font-extrabold border border-teal-200 shadow-2xs">
                      {language === "ar" ? "مُحدّث في ملفك" : "In Your Chart"}
                    </span>
                  </div>
                </div>

                {/* Instant Booking Trigger Button in Card (Offered mode min price, C3) */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">
                      {language === "ar" ? "تبدأ الجلسة من" : "Sessions from"}
                    </span>
                    <span className="text-xs font-extrabold text-teal-900">
                      {featured ? (() => {
                        const prices: number[] = [];
                        if (featured.offersOnline && featured.priceOnlineEGP > 0) prices.push(featured.priceOnlineEGP);
                        if (featured.offersOffline && featured.priceOfflineEGP > 0) prices.push(featured.priceOfflineEGP);
                        return prices.length > 0 ? formatEgp(Math.min(...prices)) : "—";
                      })() : "—"}
                    </span>
                  </div>

                  <Link
                    href={featured ? `/booking/${featured.id}` : "/therapists"}
                    className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-black rounded-xl shadow-md transition"
                  >
                    {language === "ar" ? "حجز موعد" : "Book Slot"}
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
              ? "اختر الشكوى التي تواجهها لبدء الفرز المبدئي المخصص والتوجيه نحو الاستشاريين المتخصصين في هذا المجال."
              : "Select your primary concern to begin structured clinical triage and guide you to consultants specialized in this area."}
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
                  ? "جميع الاستشاريين والأطباء مرخصون رسمياً من وزارة الصحة ولديهم خبرة إكلينيكية موثقة."
                  : "All consultants are officially licensed with verified clinical psychiatry and psychotherapy experience."}
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
            {doctors.map((doctor) => {
              const offeredPrices: number[] = [];
              if (doctor.offersOnline && doctor.priceOnlineEGP > 0) offeredPrices.push(doctor.priceOnlineEGP);
              if (doctor.offersOffline && doctor.priceOfflineEGP > 0) offeredPrices.push(doctor.priceOfflineEGP);
              const minPrice = offeredPrices.length > 0 ? Math.min(...offeredPrices) : null;

              return (
                <div
                  key={doctor.id}
                  className="bg-alabaster-base rounded-3xl border border-alabaster-border overflow-hidden hover:shadow-xl transition duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Doctor Image & Availability Badge (C4: color follows isAcceptingPatients) */}
                    <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
                      <ClinicalAvatar
                        src={doctor.avatarUrl ?? undefined}
                        alt={doctor.fullName}
                        name={doctor.fullName}
                        className="w-full h-full"
                        isDoctor={true}
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-bold text-teal-900 shadow-sm border border-gray-100 flex items-center gap-1.5 z-10">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            doctor.isAcceptingPatients ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>
                          {doctor.isAcceptingPatients
                            ? language === "ar" ? "متاح للحجز" : "Available"
                            : language === "ar" ? "مكتمل الحجوزات" : "Busy"}
                        </span>
                      </div>
                    </div>

                    {/* Info Body */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-extrabold text-base text-teal-950 group-hover:text-teal-800 transition">
                          {doctor.fullName}
                        </h3>
                        <p className="text-xs text-sage-700 font-semibold line-clamp-1 mt-0.5">
                          {language === "ar" ? doctor.title : (doctor.titleEn ?? doctor.title)}
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

                      {/* Slot & Price (C3: min offered price) */}
                      <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block">
                            {language === "ar" ? "تبدأ من" : "From"}
                          </span>
                          <span className="font-extrabold text-teal-900 text-sm">
                            {minPrice !== null ? formatEgp(minPrice) : "—"}
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
                      <span>{language === "ar" ? "حجز موعد" : "Book Slot"}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
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

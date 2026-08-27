import { MentalHealthCourse } from "@/types/telehealth";

export const mockCourses: MentalHealthCourse[] = [
  {
    id: "course-1",
    title: "ماستركلاس: إدارة نوبات الهلع والقلق المعمم",
    titleEn: "Masterclass: Conquering Panic Attacks & Generalized Anxiety",
    instructorId: "doc-1",
    instructorName: "د. أسماء عبد الوهاب",
    instructorTitle: "استشاري أول الطب النفسي",
    priceEGP: 450,
    priceUSD: 24,
    thumbnail: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600",
    description: "برنامج تدريبي سريري شامل يمتد لـ 6 وحدات تدريبية مبنية على أحدث بروتوكولات العلاج المعرفي السلوكي (CBT) واليقظة الذهنية، لمساعدتك على فك شفرة أعراض الهلع الجسدية واستعادة السيطرة الكاملة على جهازك العصبي.",
    descriptionEn: "A comprehensive 6-module clinical program grounded in CBT and mindfulness protocols, designed to help you deconstruct panic symptoms and restore nervous system balance.",
    rating: 4.95,
    enrolledStudents: 1420,
    totalDuration: "4 ساعات و30 دقيقة",
    modules: [
      { id: "m1", title: "ميكانيكية نوبة الهلع: لماذا يستجيب جسمك بالإنذار الكاذب؟", titleEn: "The Anatomy of Panic: Why Your Body Sounds False Alarms", duration: "35 دقيقة", isPreview: true, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "m2", title: "تقنية التنفس البطني 4-7-8 وإعادة ضبط العصب الحائر", titleEn: "4-7-8 Diaphragmatic Reset & Vagus Nerve Stimulation", duration: "42 دقيقة", isPreview: false },
      { id: "m3", title: "تفكيك الأفكار الكارثية وسجل الأفكار التلقائية", titleEn: "De-catastrophizing & The Automatic Thought Record", duration: "50 دقيقة", isPreview: false },
      { id: "m4", title: "التعرض التدريجي للأحاسيس الجسدية (Interoceptive Exposure)", titleEn: "Interoceptive Exposure to Body Sensations", duration: "48 دقيقة", isPreview: false },
      { id: "m5", title: "خطة الوقاية من الانتكاسة وبناء المرونة النفسية", titleEn: "Relapse Prevention & Long-term Emotional Resilience", duration: "40 دقيقة", isPreview: false }
    ]
  },
  {
    id: "course-2",
    title: "التعافي من الصدمات النفسية وبناء العلاقات الآمنة",
    titleEn: "Healing from Attachment Wounds & Building Secure Bonds",
    instructorId: "doc-3",
    instructorName: "أ. نورهان السيد",
    instructorTitle: "أخصائية أولى علم النفس الإكلينيكي والعلاج الأسري",
    priceEGP: 390,
    priceUSD: 20,
    thumbnail: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&q=80&w=600",
    description: "رحلة علاجية لتفكيك أنماط التعلق غير الآمن وفهم محفزات الصدمات العاطفية وإعادة برمجة الاستجابات النفسية داخل العلاقات الزوجية والأسرية.",
    descriptionEn: "A therapeutic pathway to heal insecure attachment styles, understand emotional triggers, and establish secure romantic and familial bonds.",
    rating: 4.91,
    enrolledStudents: 980,
    totalDuration: "3 ساعات و45 دقيقة",
    modules: [
      { id: "m2-1", title: "أنماط التعلق الأربعة: كيف تشكلت وكيف تحكم اختياراتك؟", titleEn: "The 4 Attachment Styles: Origins & Relationship Impact", duration: "40 دقيقة", isPreview: true, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "m2-2", title: "كسر دوامة الهجوم والانسحاب في الخلافات الزوجية", titleEn: "Breaking the Attack-Withdraw Loop in Couples Conflict", duration: "45 دقيقة", isPreview: false },
      { id: "m2-3", title: "تمارين العلاج المرتكز على المشاعر (EFT) للتواصل الآمن", titleEn: "EFT Exercises for Safe Emotional Expression", duration: "55 دقيقة", isPreview: false }
    ]
  },
  {
    id: "course-3",
    title: "ترويض تشتت الانتباه وفرط الحركة (ADHD) للبالغين",
    titleEn: "Mastering Adult ADHD: Executive Functioning & Focus Systems",
    instructorId: "doc-4",
    instructorName: "د. كريم فتحي",
    instructorTitle: "استشاري الطب النفسي وتعديل السلوك",
    priceEGP: 420,
    priceUSD: 22,
    thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=600",
    description: "أدوات واستراتيجيات عملية مثبتة علمياً للتعامل مع التسويف، إدارة الوقت والمهام، وتنظيم الدوبامين للبالغين المشخصين باضطراب فرط الحركة وتشتت الانتباه.",
    descriptionEn: "Scientifically proven tools to manage procrastination, time blindness, and executive dysfunction for adults with ADHD.",
    rating: 4.88,
    enrolledStudents: 760,
    totalDuration: "3 ساعات و20 دقيقة",
    modules: [
      { id: "m3-1", title: "فهم كيمياء مخ الـ ADHD ونظام مكافأة الدوبامين", titleEn: "The ADHD Brain Chemistry & Dopamine Reward Circuit", duration: "38 دقيقة", isPreview: true, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "m3-2", title: "نظام التخطيط الحركي للتغلب على الشلل التنفيذي والتسويف", titleEn: "Bypassing Executive Paralysis with Kinetic Planning", duration: "44 دقيقة", isPreview: false },
      { id: "m3-3", title: "تصميم بيئة عمل صديقة لفرط الحركة بدون مشتتات", titleEn: "Designing a Frictionless, Hyperfocus Work Environment", duration: "40 دقيقة", isPreview: false }
    ]
  }
];

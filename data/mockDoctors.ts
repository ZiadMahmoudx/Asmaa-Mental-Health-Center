import { DoctorProfile } from "@/types/telehealth";

export const mockDoctors: DoctorProfile[] = [
  {
    id: "doc-1",
    fullName: "د. أسماء عبد الوهاب",
    fullNameEn: "Dr. Asmaa Abdelwahab",
    title: "مؤسس المركز واستشاري أول الطب النفسي وعلاج الإدمان",
    titleEn: "Founder & Senior Consultant Psychiatrist & Addiction Specialist",
    licenseNumber: "EGY-PSY-84920",
    specialties: ["الاكتئاب الحاد", "اضطرابات القلق ونوبات الهلع", "اضطراب ثنائي القطب", "العلاج المعرفي السلوكي", "علاج الصدمات النفسية"],
    specialtiesEn: ["Major Depression", "Anxiety & Panic Disorders", "Bipolar Disorder", "Cognitive Behavioral Therapy (CBT)", "Trauma Recovery"],
    bio: "استشاري أول الطب النفسي وحاصلة على دكتوراه الطب النفسي من جامعة القاهرة والزمالة الملكية البريطانية للأطباء النفسيين (MRCPsych). أكثر من 18 عاماً من الخبرة السريرية في تشخيص وعلاج الاضطرابات الوجدانية، القلق المعمم، والصدمات النفسية المعقدة بأسلوب علاجي متكامل يجمع بين البروتوكولات الدوائية الحديثة والعلاج النفسي الداعم.",
    bioEn: "Senior Consultant Psychiatrist, MD in Psychiatry from Cairo University, and Member of the Royal College of Psychiatrists (MRCPsych), UK. Over 18 years of clinical experience diagnosing and treating mood disorders, generalized anxiety, and complex trauma using an integrative evidence-based approach.",
    yearsOfExperience: 18,
    sessionRateEGP: 850,
    sessionRateUSD: 45,
    rating: 4.98,
    totalReviews: 420,
    languages: ["العربية (اللهجة المصرية والخليجية)", "الإنجليزية"],
    languagesEn: ["Arabic (Egyptian & Gulf dialects)", "English"],
    avatar: "https://images.unsplash.com/photo-1594824813620-1d89b4f0b2f4?auto=format&fit=crop&q=80&w=400",
    audioIntroUrl: "https://actions.google.com/sounds/v1/ambiences/soft_chime.ogg",
    videoIntroUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    methodologies: ["العلاج المعرفي السلوكي (CBT)", "العلاج الجدلي السلوكي (DBT)", "الطب النفسي الدوائي الدقيق"],
    methodologiesEn: ["CBT", "DBT", "Precision Pharmacotherapy"],
    education: [
      "دكتوراه الطب النفسي وعلاج الإدمان - قصر العيني، جامعة القاهرة",
      "عضوية الكلية الملكية للأطباء النفسيين - لندن (MRCPsych)",
      "دبلوم العلاج النفسي الديناميكي - الجمعية المصرية للطب النفسي"
    ],
    educationEn: [
      "MD in Psychiatry & Addiction - Kasr Al-Ainy, Cairo University",
      "Member of the Royal College of Psychiatrists - London (MRCPsych)",
      "Diploma in Dynamic Psychotherapy - Egyptian Psychiatric Association"
    ],
    availableSlots: [
      { id: "s1-1", startTimeUTC: "2026-08-28T14:00:00Z", endTimeUTC: "2026-08-28T14:45:00Z", isBooked: false },
      { id: "s1-2", startTimeUTC: "2026-08-28T15:00:00Z", endTimeUTC: "2026-08-28T15:45:00Z", isBooked: false },
      { id: "s1-3", startTimeUTC: "2026-08-28T17:00:00Z", endTimeUTC: "2026-08-28T17:45:00Z", isBooked: false },
      { id: "s1-4", startTimeUTC: "2026-08-29T16:00:00Z", endTimeUTC: "2026-08-29T16:45:00Z", isBooked: false },
      { id: "s1-5", startTimeUTC: "2026-08-29T18:00:00Z", endTimeUTC: "2026-08-29T18:45:00Z", isBooked: false }
    ],
    reviews: [
      { id: "r1", patientName: "مريم ع.", rating: 5, date: "2026-08-15", comment: "د. أسماء إنسانة وطبيبة استثنائية. من أول جلسة شعرت بالأمان والوضوح ووضعت لي خطة علاجية مريحة جداً خلصتني من نوبات الهلع." },
      { id: "r2", patientName: "عمر ك.", rating: 5, date: "2026-08-10", comment: "المتابعة والاهتمام بالتفاصيل غير مسبوق. المنصة سهلت علي جداً الوصول لطبيبة بهالمستوى من خارج مصر." }
    ],
    nextAvailableSlot: "اليوم، 5:00 مساءً بتوقيت القاهرة",
    nextAvailableSlotEn: "Today, 5:00 PM Cairo Time",
    gender: "FEMALE"
  },
  {
    id: "doc-2",
    fullName: "د. طارق منصور",
    fullNameEn: "Dr. Tarek Mansour",
    title: "استشاري الطب النفسي والعلاج المعرفي للبالغين",
    titleEn: "Consultant Psychiatrist & Adult Cognitive Therapist",
    licenseNumber: "EGY-PSY-73104",
    specialties: ["الوسواس القهري (OCD)", "القلق الاجتماعي", "الأرق واضطرابات النوم", "احتراق بيئة العمل (Burnout)"],
    specialtiesEn: ["OCD", "Social Anxiety", "Insomnia & Sleep Disorders", "Workplace Burnout"],
    bio: "استشاري الطب النفسي، حاصل على ماجستير الطب النفسي من جامعة عين شمس وزمالة البورد العربي. متخصص في علاج الوسواس القهري بتقنية التعرض ومنع الاستجابة (ERP) وإعادة ضبط إيقاع النوم والتعامل مع ضغوط العمل الشديدة.",
    bioEn: "Consultant Psychiatrist with an MSc from Ain Shams University and Arab Board Fellowship. Specialized in Exposure and Response Prevention (ERP) for OCD, sleep rhythm restoration, and executive burnout.",
    yearsOfExperience: 14,
    sessionRateEGP: 700,
    sessionRateUSD: 38,
    rating: 4.92,
    totalReviews: 285,
    languages: ["العربية", "الإنجليزية"],
    languagesEn: ["Arabic", "English"],
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    audioIntroUrl: "https://actions.google.com/sounds/v1/ambiences/soft_chime.ogg",
    videoIntroUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    methodologies: ["العلاج بالتعرض ومنع الاستجابة (ERP)", "العلاج المعرفي السلوكي (CBT)", "علاج القبول والالتزام (ACT)"],
    methodologiesEn: ["ERP", "CBT", "ACT"],
    education: [
      "ماجستير الطب النفسي وطب المخ والأعصاب - جامعة عين شمس",
      "زمالة البورد العربي في الطب النفسي",
      "شهادة معتمدة في تقنيات ERP لعلاج الوسواس القهري - معهد بيك"
    ],
    educationEn: [
      "MSc in Psychiatry & Neurology - Ain Shams University",
      "Arab Board Fellowship in Psychiatry",
      "Certified ERP Specialist for OCD - Beck Institute"
    ],
    availableSlots: [
      { id: "s2-1", startTimeUTC: "2026-08-28T16:00:00Z", endTimeUTC: "2026-08-28T16:45:00Z", isBooked: false },
      { id: "s2-2", startTimeUTC: "2026-08-28T18:00:00Z", endTimeUTC: "2026-08-28T18:45:00Z", isBooked: false },
      { id: "s2-3", startTimeUTC: "2026-08-29T14:00:00Z", endTimeUTC: "2026-08-29T14:45:00Z", isBooked: false }
    ],
    reviews: [
      { id: "r3", patientName: "خالد س.", rating: 5, date: "2026-08-12", comment: "عانيت من الوسواس لسنوات، مع د. طارق بدأ التحسن الفعلي بفضل التمارين التطبيقية والخطوات المنهجية." }
    ],
    nextAvailableSlot: "غداً، 4:00 مساءً بتوقيت القاهرة",
    nextAvailableSlotEn: "Tomorrow, 4:00 PM Cairo Time",
    gender: "MALE"
  },
  {
    id: "doc-3",
    fullName: "أ. نورهان السيد",
    fullNameEn: "Nourhan El-Sayed, MSc",
    title: "أخصائية أولى علم النفس الإكلينيكي والعلاج الأسري والزواجي",
    titleEn: "Senior Clinical Psychologist & Couples/Family Therapist",
    licenseNumber: "EGY-PSY-92011",
    specialties: ["الاستشارات الزوجية والعلاقات", "الصدمات العاطفية والفقد", "تقدير الذات ومخططات التفكير", "اضطرابات القلق لدى المراهقين"],
    specialtiesEn: ["Couples Counseling", "Emotional Trauma & Grief", "Schema Therapy & Self-Esteem", "Adolescent Anxiety"],
    bio: "أخصائية نفسية إكلينيكية معتمدة حاصلة على ماجستير علم النفس الإكلينيكي وممارسة معتمدة للعلاج بمخططات التفكير (Schema Therapy) وعلاج العلاقات المرتكز على المشاعر (EFT). ساعدت مئات الأزواج والأفراد على استعادة التوازن النفسي وبناء روابط آمنة.",
    bioEn: "Licensed Senior Clinical Psychologist with an MSc in Clinical Psychology. Certified practitioner of Schema Therapy and Emotionally Focused Therapy (EFT) for couples. Passionate about empowering individuals to heal attachment wounds and rebuild self-worth.",
    yearsOfExperience: 11,
    sessionRateEGP: 600,
    sessionRateUSD: 32,
    rating: 4.96,
    totalReviews: 340,
    languages: ["العربية", "الإنجليزية", "الفرنسية"],
    languagesEn: ["Arabic", "English", "French"],
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    audioIntroUrl: "https://actions.google.com/sounds/v1/ambiences/soft_chime.ogg",
    videoIntroUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    methodologies: ["العلاج المرتكز على المشاعر (EFT)", "العلاج بمخططات التفكير (Schema Therapy)", "علاج الصدمات (EMDR)"],
    methodologiesEn: ["EFT for Couples", "Schema Therapy", "EMDR for Trauma"],
    education: [
      "ماجستير علم النفس الإكلينيكي - الجامعة الأمريكية بالقاهرة",
      "دبلوم تدريب المعالجين الزواجيين - ICEEFT كندا",
      "ممارس معتمد للـ EMDR - الرابطة الدولية للـ EMDR"
    ],
    educationEn: [
      "MSc in Clinical Psychology - American University in Cairo",
      "Couples Therapy Certification - ICEEFT Canada",
      "Certified EMDR Practitioner - EMDRIA"
    ],
    availableSlots: [
      { id: "s3-1", startTimeUTC: "2026-08-28T13:00:00Z", endTimeUTC: "2026-08-28T13:45:00Z", isBooked: false },
      { id: "s3-2", startTimeUTC: "2026-08-28T19:00:00Z", endTimeUTC: "2026-08-28T19:45:00Z", isBooked: false },
      { id: "s3-3", startTimeUTC: "2026-08-30T15:00:00Z", endTimeUTC: "2026-08-30T15:45:00Z", isBooked: false }
    ],
    reviews: [
      { id: "r4", patientName: "سارة ود.", rating: 5, date: "2026-08-18", comment: "أ. نورهان ساعدتنا كزوجين نفهم بعض بدون أحكام ولغة حوار جديدة غيرت حياتنا للأفضل." }
    ],
    nextAvailableSlot: "اليوم، 7:00 مساءً بتوقيت القاهرة",
    nextAvailableSlotEn: "Today, 7:00 PM Cairo Time",
    gender: "FEMALE"
  },
  {
    id: "doc-4",
    fullName: "د. كريم فتحي",
    fullNameEn: "Dr. Karim Fathy",
    title: "استشاري الطب النفسي وعلاج الإدمان وتعديل السلوك",
    titleEn: "Consultant Psychiatrist & Addiction Recovery Specialist",
    licenseNumber: "EGY-PSY-61903",
    specialties: ["الإدمان السلوكي والمواد", "فرط الحركة وتشتت الانتباه (ADHD)", "اضطرابات التكيف", "العلاج الجدلي السلوكي (DBT)"],
    specialtiesEn: ["Addiction Recovery", "Adult ADHD", "Adjustment Disorders", "Dialectical Behavior Therapy (DBT)"],
    bio: "استشاري الطب النفسي بخبرة تزيد عن 15 عاماً في برامج التعافي من الإدمان وإعادة التأهيل النفسي، بالإضافة لبروتوكولات تقييم وعلاج تشتت الانتباه وفرط الحركة للبالغين.",
    bioEn: "Consultant Psychiatrist with 15+ years of expertise in substance and behavioral addiction recovery, adult ADHD diagnostics, and dialectical behavior therapy groups.",
    yearsOfExperience: 15,
    sessionRateEGP: 750,
    sessionRateUSD: 40,
    rating: 4.90,
    totalReviews: 210,
    languages: ["العربية", "الإنجليزية"],
    languagesEn: ["Arabic", "English"],
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    audioIntroUrl: "https://actions.google.com/sounds/v1/ambiences/soft_chime.ogg",
    videoIntroUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    methodologies: ["العلاج الجدلي السلوكي (DBT)", "المقابلات الدافعية (Motivational Interviewing)", "العلاج الداعم"],
    methodologiesEn: ["DBT", "Motivational Interviewing", "Supportive Psychotherapy"],
    education: [
      "دكتوراه الطب النفسي - جامعة الإسكندرية",
      "زمالة المعهد القومي للإدمان - الولايات المتحدة الأمريكية"
    ],
    educationEn: [
      "MD in Psychiatry - Alexandria University",
      "Fellowship in Addiction Medicine - NIDA USA"
    ],
    availableSlots: [
      { id: "s4-1", startTimeUTC: "2026-08-29T12:00:00Z", endTimeUTC: "2026-08-29T12:45:00Z", isBooked: false },
      { id: "s4-2", startTimeUTC: "2026-08-29T15:00:00Z", endTimeUTC: "2026-08-29T15:45:00Z", isBooked: false }
    ],
    reviews: [
      { id: "r5", patientName: "يوسف م.", rating: 5, date: "2026-08-05", comment: "دكتور كريم ساعدني أفهم الـ ADHD وكيف أتحكم في يومي وتركيزي بطريقة واقعية." }
    ],
    nextAvailableSlot: "السبت، 12:00 ظهراً بتوقيت القاهرة",
    nextAvailableSlotEn: "Saturday, 12:00 PM Cairo Time",
    gender: "MALE"
  }
];

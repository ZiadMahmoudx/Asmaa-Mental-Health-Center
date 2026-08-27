export interface AudioTrack {
  id: string;
  titleAr: string;
  titleEn: string;
  dialect: 'EGYPTIAN' | 'GULF' | 'LEVANTINE' | 'FOSHA';
  dialectLabelAr: string;
  dialectLabelEn: string;
  speakerName: string;
  speakerTitle: string;
  durationMinutes: number;
  category: 'PANIC' | 'SLEEP' | 'STRESS' | 'MINDFULNESS';
  descriptionAr: string;
  descriptionEn: string;
  coverImage: string;
  audioUrl: string;
}

export const MOCK_AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "audio-eg-panic",
    titleAr: "تسكين نوبة الهلع وتنظيم ضربات القلب الفوري",
    titleEn: "Instant Panic Attack Relief & Heart Rate Regulation",
    dialect: "EGYPTIAN",
    dialectLabelAr: "اللهجة المصرية",
    dialectLabelEn: "Egyptian Arabic",
    speakerName: "د. أسماء عبد الوهاب",
    speakerTitle: "استشاري أول الطب النفسي",
    durationMinutes: 8,
    category: "PANIC",
    descriptionAr: "جلسة صوتية موجهة بنبرة هادئة ومطمئنة لتهدئة الجهاز العصبي الودي واستعادة الشعور بالأمان الجسدي.",
    descriptionEn: "Calming somatic pacing to down-regulate sympathetic arousal and restore psychological safety.",
    coverImage: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=400",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
  },
  {
    id: "audio-gulf-sleep",
    titleAr: "الاسترخاء العضلي التدريجي لنوم عميق ومريح",
    titleEn: "Progressive Muscle Relaxation for Deep Restorative Sleep",
    dialect: "GULF",
    dialectLabelAr: "اللهجة الخليجية",
    dialectLabelEn: "Gulf Arabic",
    speakerName: "د. سارة المنشاوي",
    speakerTitle: "استشاري الطب النفسي واضطرابات النوم",
    durationMinutes: 12,
    category: "SLEEP",
    descriptionAr: "توجيه خطوة بخطوة لإرخاء مجموعات العضلات الرئيسية والتخلص من التشنج والشد الجسدي قبل النوم.",
    descriptionEn: "Step-by-step guided somatic release to relieve physical hyperarousal before bedtime.",
    coverImage: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&q=80&w=400",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/forest_day.ogg",
  },
  {
    id: "audio-levant-rumination",
    titleAr: "تحرير الذهن من دوامة التفكير المفرط والاجترار",
    titleEn: "Defusing Overthinking & Cognitive Rumination",
    dialect: "LEVANTINE",
    dialectLabelAr: "اللهجة الشامية",
    dialectLabelEn: "Levantine Arabic",
    speakerName: "د. طارق حجازي",
    speakerTitle: "استشاري العلاج المعرفي السلوكي",
    durationMinutes: 10,
    category: "STRESS",
    descriptionAr: "تطبيق تقنيات فك الاندماج المعرفي (Cognitive Defusion) لكسر تكرار السيناريوهات السلبية المقلقة.",
    descriptionEn: "Evidence-based CBT defusion exercises to unhook from persistent negative thought spirals.",
    coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/ocean_waves.ogg",
  },
  {
    id: "audio-fosha-pfa",
    titleAr: "دليل الإسعافات النفسية الأولية والتنفس الواعي",
    titleEn: "Psychological First Aid & Mindful Centering",
    dialect: "FOSHA",
    dialectLabelAr: "الفصحى المعاصرة",
    dialectLabelEn: "Modern Standard Arabic",
    speakerName: "د. كريم المهدي",
    speakerTitle: "أخصائي أول العلاج النفسي",
    durationMinutes: 15,
    category: "MINDFULNESS",
    descriptionAr: "بروتوكول علمي متكامل لاستعادة الحضور الذهني وتثبيت الانتباه في اللحظة الراهنة.",
    descriptionEn: "Standardized clinical mindfulness protocol to anchor attention and reduce acute distress.",
    coverImage: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=400",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/meadow_morning.ogg",
  },
];

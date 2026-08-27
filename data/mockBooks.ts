import { MentalHealthBook } from "@/types/telehealth";

export const mockBooks: MentalHealthBook[] = [
  {
    id: "book-1",
    title: "مساحة للهدوء: دليلك الإكلينيكي للتعامل مع القلق والهلع",
    titleEn: "A Space for Calm: The Clinical Guide to Panic & Anxiety",
    author: "د. أسماء عبد الوهاب",
    description: "كتاب عملي يحتوي على جداول تتبع ذاتية، تمارين تنفس، وتقنيات معرفية لتفكيك أعراض القلق ونوبات الهلع دون الاعتماد المفرط على المهدئات السريعة.",
    descriptionEn: "A practical workbook with self-monitoring sheets, grounding exercises, and cognitive reframing to overcome chronic anxiety.",
    priceEGP: 180,
    priceUSD: 10,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
    pagesCount: 196,
    category: "كتب المساعدة الذاتية والعلاج المعرفي",
    categoryEn: "Self-Help & CBT Workbooks",
    sampleExcerpt: "الفصل الأول: عندما يدق جسدك جرس الإنذار الخاطئ\n\nنوبة الهلع ليست عيباً في شخصيتك ولا علامة على ضعف إرادتك، بل هي ببساطة استجابة (الكر والفر) الطبيعية التي أطلقها مخك في توقيت غير مناسب. تخيل أن جهاز إنذار الحريق في منزلك حساس لدرجة أنه ينطلق بسبب بخار كوب شاي ساخن.. هكذا تماماً يتصرف جهازك العصبي أثناء نوبة الهلع.",
    sampleExcerptEn: "Chapter 1: When Your Body Triggers a False Alarm\n\nA panic attack is neither a character flaw nor a sign of weakness. It is simply the primal fight-or-flight response activating at an inappropriate time.",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    id: "book-2",
    title: "ترميم الروح: التعافي من الصدمات والندوب غير المرئية",
    titleEn: "Soul Restoration: Healing from Invisible Trauma Scars",
    author: "أ. نورهان السيد",
    description: "مرجع علاجي متقدم يدمج بين علم النفس العصبي والعلاج المرتكز على المشاعر لمساعدة القارئ على فهم الذاكرة الجسدية للصدمة وإعادة الاتصال بمشاعره بأمان.",
    descriptionEn: "An advanced therapeutic guide integrating neuroscience and EFT to heal body memories and restore emotional intimacy.",
    priceEGP: 210,
    priceUSD: 12,
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
    pagesCount: 240,
    category: "العلاج النفسي والصدمات",
    categoryEn: "Trauma & Psychotherapy",
    sampleExcerpt: "الفصل الثاني: لماذا لا ينسى الجسد؟\n\nالكلمات قد تعجز عن وصف الصدمة، لكن الجسد يحتفظ بالقصة كاملة في شكل شد عضلي مزمن، اضطراب في ضربات القلب، أو شعور غامض بالخطر الدائم في الأماكن المغلقة.",
    sampleExcerptEn: "Chapter 2: Why the Body Keeps the Score\n\nWords may fail to capture trauma, yet your body preserves the exact imprint in chronic tension and persistent hypervigilance.",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    id: "book-3",
    title: "عقل متيقظ في عالم مشتت: دليل النجاة مع الـ ADHD",
    titleEn: "Mindful in a Distracted World: The Adult ADHD Survival Guide",
    author: "د. كريم فتحي",
    description: "استراتيجيات مصممة خصيصاً للدماغ المختلف عصبياً، تركز على إدارة الطاقة بدلاً من الوقت، وتنظيم المهام دون الشعور بالإرهاق والشلل التنفيذي.",
    descriptionEn: "Tailored strategies for neurodivergent brains focusing on energy management, dopamine regulation, and breaking executive paralysis.",
    priceEGP: 195,
    priceUSD: 11,
    coverImage: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=600",
    pagesCount: 180,
    category: "الاضطرابات النمائية العصبية",
    categoryEn: "Neurodevelopmental Guides",
    sampleExcerpt: "الفصل الأول: لست كسولاً ولا غبياً، كيمياء مخك تطلب الدوبامين!\n\nعندما تماطل لساعات قبل كتابة تقرير يستغرق 10 دقائق، المشكلة ليست في أخلاقيات عملك، بل في انخفاض مستوى الدوبامين الأساسي في القشرة الجبهية الحركية.",
    sampleExcerptEn: "Chapter 1: You Are Neither Lazy Nor Unmotivated\n\nWhen you procrastinate for hours on a 10-minute task, the issue is not laziness; it is baseline dopamine scarcity in your prefrontal cortex.",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  }
];

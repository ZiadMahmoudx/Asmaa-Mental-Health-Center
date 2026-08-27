import { DrugInteractionAlert } from "@/types/telehealth";

export const KNOWN_PSYCH_DRUG_INTERACTIONS: DrugInteractionAlert[] = [
  {
    drugA: "Escitalopram",
    drugB: "Tramadol",
    severity: "MAJOR",
    effectAr: "خطر حدوث متلازمة السيروتونين (Serotonin Syndrome) وزيادة احتمالية النوبات التشنجية.",
    effectEn: "High risk of Serotonin Syndrome and lowered seizure threshold.",
    recommendationAr: "يمنع الجمع بينهما. ينصح باختيار مسكن غير سيروتونيني.",
    recommendationEn: "Avoid combination. Use alternative non-serotonergic analgesic.",
  },
  {
    drugA: "Fluoxetine",
    drugB: "Sertraline",
    severity: "MAJOR",
    effectAr: "ازدواجية فئة الـ SSRI دون مبرر إكلينيكي مع مضاعفة الآثار الجانبية السيروتونينية.",
    effectEn: "SSRI duplication causing severe serotonergic toxicity risk.",
    recommendationAr: "يمنع وصف دوائين من نفس عائلة الـ SSRI معاً.",
    recommendationEn: "Avoid dual SSRI therapy.",
  },
  {
    drugA: "Escitalopram",
    drugB: "Citalopram",
    severity: "MAJOR",
    effectAr: "خطر استطالة فترة QT القلبية (QT-Prolongation) واضطراب نظم القلب.",
    effectEn: "Additive QT prolongation and cardiac arrhythmia risk.",
    recommendationAr: "لا تصف كلا العقارين في نفس الخطة.",
    recommendationEn: "Do not co-prescribe.",
  },
  {
    drugA: "Alprazolam",
    drugB: "Diazepam",
    severity: "MODERATE",
    effectAr: "ازدواجية البنزوديازيبين مما يزيد من خطر التثبيط العصبي والتنفسي الحاد والاعتماد.",
    effectEn: "Benzodiazepine duplication leading to excessive sedation and respiratory depression.",
    recommendationAr: "اكتفِ ببنزوديازيبين واحد فقط مع خطة سحب تدريجي.",
    recommendationEn: "Taper to single agent.",
  },
  {
    drugA: "Lithium",
    drugB: "Ibuprofen",
    severity: "MAJOR",
    effectAr: "مضادات الالتهاب غير الستيرويدية تقلل التخلص الكلوي من الليثيوم مسببة تسمم الليثيوم (Lithium Toxicity).",
    effectEn: "NSAIDs reduce renal lithium clearance, inducing toxicity.",
    recommendationAr: "استبدل بالباراسيتامول وراقب مستويات الليثيوم في الدم.",
    recommendationEn: "Substitute with Acetaminophen and monitor serum lithium.",
  },
];

export function checkPrescriptionInteractions(medNames: string[]): DrugInteractionAlert[] {
  const alerts: DrugInteractionAlert[] = [];
  const normalized = medNames.map((m) => m.toLowerCase());

  for (const rule of KNOWN_PSYCH_DRUG_INTERACTIONS) {
    const hasA = normalized.some((m) => m.includes(rule.drugA.toLowerCase()));
    const hasB = normalized.some((m) => m.includes(rule.drugB.toLowerCase()));

    if (hasA && hasB) {
      alerts.push(rule);
    }
  }

  return alerts;
}

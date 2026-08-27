"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  DoctorProfile,
  Appointment,
  ClinicalSessionRecord,
  IntakeAssessment,
  MentalHealthCourse,
  MentalHealthBook,
  AIChatMessage,
  WalletTransaction,
  UserRole,
} from "@/types/telehealth";
import { mockDoctors } from "@/data/mockDoctors";
import { mockCourses } from "@/data/mockCourses";
import { mockBooks } from "@/data/mockBooks";

interface TelehealthContextType {
  currentUser: User;
  switchUserRole: (role: UserRole) => void;
  doctors: DoctorProfile[];
  appointments: Appointment[];
  clinicalRecords: ClinicalSessionRecord[];
  intakeAssessments: IntakeAssessment[];
  courses: MentalHealthCourse[];
  books: MentalHealthBook[];
  enrolledCourseIds: string[];
  purchasedBookIds: string[];
  walletTransactions: WalletTransaction[];
  aiMessages: AIChatMessage[];
  // Actions
  bookAppointment: (appointment: Omit<Appointment, "id">) => Appointment;
  cancelAppointment: (id: string) => void;
  addClinicalRecord: (record: Omit<ClinicalSessionRecord, "id" | "createdAt">) => ClinicalSessionRecord;
  saveIntakeAssessment: (intake: Omit<IntakeAssessment, "id" | "createdAt">) => IntakeAssessment;
  topUpWallet: (amount: number, currency?: "EGP" | "USD", paymentMethod?: string) => void;
  purchaseCourse: (courseId: string) => boolean;
  purchaseBook: (bookId: string) => boolean;
  sendAIMessage: (text: string) => void;
  toggleDoctorSlot: (doctorId: string, slotId: string) => void;
}

const defaultPatientUser: User = {
  id: "pat-1",
  name: "سارة محمود",
  nameEn: "Sara Mahmoud",
  email: "sara.mahmoud@example.com",
  phone: "+20 100 234 5678",
  role: "PATIENT",
  walletBalanceEGP: 1500,
  walletBalanceUSD: 80,
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
  medicalRecordNumber: "ASM-MRN-9482",
};

const defaultDoctorUser: User = {
  id: "doc-1",
  name: "د. أسماء عبد الوهاب",
  nameEn: "Dr. Asmaa Abdelwahab",
  email: "dr.asmaa@asmaaclinic.com",
  phone: "+20 111 888 9900",
  role: "DOCTOR",
  walletBalanceEGP: 28400,
  walletBalanceUSD: 1450,
  avatar: "https://images.unsplash.com/photo-1594824813620-1d89b4f0b2f4?auto=format&fit=crop&q=80&w=400",
  medicalRecordNumber: "DOC-LIC-84920",
};

const defaultAppointments: Appointment[] = [
  {
    id: "apt-101",
    patientId: "pat-1",
    patientName: "سارة محمود",
    doctorId: "doc-1",
    doctorName: "د. أسماء عبد الوهاب",
    doctorAvatar: "https://images.unsplash.com/photo-1594824813620-1d89b4f0b2f4?auto=format&fit=crop&q=80&w=400",
    doctorTitle: "استشاري أول الطب النفسي",
    scheduledAtUTC: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 mins from now for immediate join testing
    durationMinutes: 45,
    status: "CONFIRMED",
    paymentMethod: "WALLET",
    pricePaid: 850,
    currency: "EGP",
    videoRoomId: "room-asm-101",
    meetingUrl: "/session/room-asm-101",
  },
  {
    id: "apt-102",
    patientId: "pat-1",
    patientName: "سارة محمود",
    doctorId: "doc-3",
    doctorName: "أ. نورهان السيد",
    doctorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    doctorTitle: "أخصائية أولى علم النفس الإكلينيكي",
    scheduledAtUTC: "2026-08-30T16:00:00Z",
    durationMinutes: 60,
    status: "CONFIRMED",
    paymentMethod: "CREDIT_CARD",
    pricePaid: 600,
    currency: "EGP",
    videoRoomId: "room-asm-102",
    meetingUrl: "/session/room-asm-102",
  }
];

const defaultClinicalRecords: ClinicalSessionRecord[] = [
  {
    id: "rec-1",
    appointmentId: "apt-past-01",
    doctorId: "doc-1",
    doctorName: "د. أسماء عبد الوهاب",
    patientId: "pat-1",
    patientName: "سارة محمود",
    sessionDate: "2026-08-14",
    chiefComplaint: "نوبات قلق مفاجئة مصحوبة بتسارع ضربات القلب وصعوبة في النوم المستمر.",
    mentalStatusExam: {
      appearanceAndBehavior: "مهندمة، واعية تماماً، علامات قلق وتوتر حركي خفيف على أطراف الأصابع.",
      moodAndAffect: "المزاج قلق ومتوتر، التعبير الانفعالي متسق مع المحتوى الفكري.",
      thoughtProcess: "سياق الأفكار متصل ومنطقي دون أي اضطراب في مجرى التفكير.",
      perception: "لا توجد أي هلاوس سمعية أو بصرية.",
      cognitionAndOrientation: "الوعي بالزمان والمكان والأشخاص سليم 100%. الذاكرة القريبة والبعيدة ممتازة.",
      insightAndJudgement: "استبصار كامل بالمرض ورغبة عالية في الالتزام بالخطة العلاجية.",
      riskAssessment: "LOW",
    },
    clinicalDiagnosisNotes: "اضطراب القلق المعمم مع نوبات هلع عرضية (GAD with Panic Attacks - ICD-11: 6B00). استجابة ممتازة لجلسات الدعم وإعادة الصياغة المعرفية.",
    dsm5Codes: ["300.02 (Generalized Anxiety Disorder)", "300.01 (Panic Disorder)"],
    prescription: [
      {
        id: "rx-1",
        medicineName: "Escitalopram (Cipralex) 10mg",
        dosage: "نصف قرص يومياً لمدة 6 أيام، ثم قرص كامل 10 مجم",
        frequency: "مرة واحدة صباحاً بعد الإفطار",
        duration: "لمدة 3 أشهر مع المتابعة الشهرية",
        instructions: "يمنع التوقف المفاجئ دون استشارة الطبيب",
      },
      {
        id: "rx-2",
        medicineName: "Melatonin 3mg",
        dosage: "قرص واحد",
        frequency: "قبل النوم بـ 45 دقيقة عند الحاجة",
        duration: "أسبوعين لضبط إيقاع النوم",
        instructions: "تجنب الشاشات الزرقاء بعد تناول القرص",
      }
    ],
    nextSessionRecommendation: "جلسة متابعة علاج معرفي سلوكي بعد أسبوعين لتقييم الاستجابة الدوائية وتمارين التعرض.",
    doctorSignature: "د. أسماء عبد الوهاب - استشاري أول الطب النفسي (ترخيص رقم 84920)",
    createdAt: "2026-08-14T15:45:00Z",
  }
];

const defaultWalletTransactions: WalletTransaction[] = [
  {
    id: "tx-1",
    userId: "pat-1",
    type: "DEPOSIT",
    amount: 2500,
    currency: "EGP",
    description: "شحن رصيد المحفظة عبر InstaPay",
    descriptionEn: "Wallet Top-up via InstaPay",
    date: "2026-08-20T10:30:00Z",
    status: "COMPLETED",
    referenceNumber: "INSTA-92847192",
  },
  {
    id: "tx-2",
    userId: "pat-1",
    type: "SESSION_PAYMENT",
    amount: -850,
    currency: "EGP",
    description: "حجز جلسة علاجية مع د. أسماء عبد الوهاب",
    descriptionEn: "Session booking with Dr. Asmaa Abdelwahab",
    date: "2026-08-27T11:00:00Z",
    status: "COMPLETED",
    referenceNumber: "PAY-84729103",
  },
  {
    id: "tx-3",
    userId: "pat-1",
    type: "COURSE_PURCHASE",
    amount: -450,
    currency: "EGP",
    description: "شراء ماستركلاس إدارة نوبات الهلع",
    descriptionEn: "Purchased Masterclass: Conquering Panic Attacks",
    date: "2026-08-22T14:15:00Z",
    status: "COMPLETED",
    referenceNumber: "CRS-10294821",
  }
];

const defaultAIMessages: AIChatMessage[] = [
  {
    id: "ai-1",
    sender: "assistant",
    text: "أهلاً بك في مركز أسما للصحة النفسية. أنا مرشدك الذكي للدعم النفسي الأولي وتوجيهك للاستشاري الأنسب لحالتك. كيف تشعر اليوم؟",
    timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    triageFlag: "STABLE",
    quickActions: [
      { label: "أشعر بنوبة هلع الآن - تمارين تنفس", action: "panic_breathing" },
      { label: "أعاني من صعوبة شديدة في النوم", action: "insomnia_help" },
      { label: "كيف أختار الطبيب الأنسب لي؟", action: "choose_therapist" },
      { label: "تقييم مستوى القلق والاكتئاب", action: "intake_start" },
    ],
  }
];

const TelehealthContext = createContext<TelehealthContextType | undefined>(undefined);

export const TelehealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultPatientUser);
  const [doctors, setDoctors] = useState<DoctorProfile[]>(mockDoctors);
  const [appointments, setAppointments] = useState<Appointment[]>(defaultAppointments);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalSessionRecord[]>(defaultClinicalRecords);
  const [intakeAssessments, setIntakeAssessments] = useState<IntakeAssessment[]>([]);
  const [courses] = useState<MentalHealthCourse[]>(mockCourses);
  const [books] = useState<MentalHealthBook[]>(mockBooks);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>(["course-1"]);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>(["book-1"]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(defaultWalletTransactions);
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>(defaultAIMessages);

  // Load from localStorage if available
  useEffect(() => {
    try {
      const savedAppts = localStorage.getItem("asmaa_appointments");
      if (savedAppts) setAppointments(JSON.parse(savedAppts));

      const savedRecords = localStorage.getItem("asmaa_clinical_records");
      if (savedRecords) setClinicalRecords(JSON.parse(savedRecords));

      const savedUser = localStorage.getItem("asmaa_current_user");
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
    } catch (e) {
      console.error("Failed loading from localStorage", e);
    }
  }, []);

  const switchUserRole = (role: UserRole) => {
    if (role === "PATIENT") {
      setCurrentUser(defaultPatientUser);
      localStorage.setItem("asmaa_current_user", JSON.stringify(defaultPatientUser));
    } else if (role === "DOCTOR") {
      setCurrentUser(defaultDoctorUser);
      localStorage.setItem("asmaa_current_user", JSON.stringify(defaultDoctorUser));
    } else {
      const adminUser: User = {
        ...defaultPatientUser,
        id: "admin-1",
        name: "مدير النظام الطبي",
        nameEn: "System Medical Admin",
        role: "ADMIN",
      };
      setCurrentUser(adminUser);
      localStorage.setItem("asmaa_current_user", JSON.stringify(adminUser));
    }
  };

  const bookAppointment = (newApptData: Omit<Appointment, "id">): Appointment => {
    const newId = `apt-${Date.now()}`;
    const newAppt: Appointment = {
      ...newApptData,
      id: newId,
    };
    const updated = [newAppt, ...appointments];
    setAppointments(updated);
    localStorage.setItem("asmaa_appointments", JSON.stringify(updated));

    // Deduct from wallet if paid via wallet
    if (newAppt.paymentMethod === "WALLET") {
      setCurrentUser((prev) => {
        const updatedUser = {
          ...prev,
          walletBalanceEGP: Math.max(0, prev.walletBalanceEGP - newAppt.pricePaid),
        };
        localStorage.setItem("asmaa_current_user", JSON.stringify(updatedUser));
        return updatedUser;
      });

      const tx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        userId: currentUser.id,
        type: "SESSION_PAYMENT",
        amount: -newAppt.pricePaid,
        currency: newAppt.currency,
        description: `حجز جلسة مع ${newAppt.doctorName}`,
        descriptionEn: `Session booking with ${newAppt.doctorName}`,
        date: new Date().toISOString(),
        status: "COMPLETED",
        referenceNumber: `PAY-${Date.now().toString().slice(-6)}`,
      };
      setWalletTransactions((prev) => [tx, ...prev]);
    }

    return newAppt;
  };

  const cancelAppointment = (id: string) => {
    const updated = appointments.map((apt) => {
      if (apt.id === id) {
        // Issue refund if cancelled
        const refundAmount = apt.pricePaid;
        setCurrentUser((prev) => ({
          ...prev,
          walletBalanceEGP: prev.walletBalanceEGP + refundAmount,
        }));
        const tx: WalletTransaction = {
          id: `tx-ref-${Date.now()}`,
          userId: currentUser.id,
          type: "SESSION_REFUND",
          amount: refundAmount,
          currency: apt.currency,
          description: `استرداد قيمة الجلسة الملغاة #${id}`,
          descriptionEn: `Refund for cancelled session #${id}`,
          date: new Date().toISOString(),
          status: "COMPLETED",
          referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
        };
        setWalletTransactions((prev) => [tx, ...prev]);

        return { ...apt, status: "CANCELLED" as const };
      }
      return apt;
    });
    setAppointments(updated);
    localStorage.setItem("asmaa_appointments", JSON.stringify(updated));
  };

  const addClinicalRecord = (recordData: Omit<ClinicalSessionRecord, "id" | "createdAt">): ClinicalSessionRecord => {
    const newRecord: ClinicalSessionRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...clinicalRecords];
    setClinicalRecords(updated);
    localStorage.setItem("asmaa_clinical_records", JSON.stringify(updated));
    return newRecord;
  };

  const saveIntakeAssessment = (intakeData: Omit<IntakeAssessment, "id" | "createdAt">): IntakeAssessment => {
    const newIntake: IntakeAssessment = {
      ...intakeData,
      id: `intake-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setIntakeAssessments((prev) => [newIntake, ...prev]);
    return newIntake;
  };

  const topUpWallet = (amount: number, currency: "EGP" | "USD" = "EGP", paymentMethod: string = "InstaPay") => {
    setCurrentUser((prev) => {
      const updatedUser = {
        ...prev,
        walletBalanceEGP: currency === "EGP" ? prev.walletBalanceEGP + amount : prev.walletBalanceEGP,
        walletBalanceUSD: currency === "USD" ? prev.walletBalanceUSD + amount : prev.walletBalanceUSD,
      };
      localStorage.setItem("asmaa_current_user", JSON.stringify(updatedUser));
      return updatedUser;
    });

    const tx: WalletTransaction = {
      id: `tx-top-${Date.now()}`,
      userId: currentUser.id,
      type: "DEPOSIT",
      amount,
      currency,
      description: `شحن رصيد المحفظة عبر ${paymentMethod}`,
      descriptionEn: `Wallet deposit via ${paymentMethod}`,
      date: new Date().toISOString(),
      status: "COMPLETED",
      referenceNumber: `DEP-${Date.now().toString().slice(-6)}`,
    };
    setWalletTransactions((prev) => [tx, ...prev]);
  };

  const purchaseCourse = (courseId: string): boolean => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return false;
    if (enrolledCourseIds.includes(courseId)) return true;

    if (currentUser.walletBalanceEGP >= course.priceEGP) {
      setCurrentUser((prev) => ({
        ...prev,
        walletBalanceEGP: prev.walletBalanceEGP - course.priceEGP,
      }));
      setEnrolledCourseIds((prev) => [...prev, courseId]);

      const tx: WalletTransaction = {
        id: `tx-crs-${Date.now()}`,
        userId: currentUser.id,
        type: "COURSE_PURCHASE",
        amount: -course.priceEGP,
        currency: "EGP",
        description: `شراء ماستركلاس: ${course.title}`,
        descriptionEn: `Enrolled in: ${course.titleEn}`,
        date: new Date().toISOString(),
        status: "COMPLETED",
        referenceNumber: `CRS-${Date.now().toString().slice(-6)}`,
      };
      setWalletTransactions((prev) => [tx, ...prev]);
      return true;
    }
    return false;
  };

  const purchaseBook = (bookId: string): boolean => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return false;
    if (purchasedBookIds.includes(bookId)) return true;

    if (currentUser.walletBalanceEGP >= book.priceEGP) {
      setCurrentUser((prev) => ({
        ...prev,
        walletBalanceEGP: prev.walletBalanceEGP - book.priceEGP,
      }));
      setPurchasedBookIds((prev) => [...prev, bookId]);

      const tx: WalletTransaction = {
        id: `tx-bk-${Date.now()}`,
        userId: currentUser.id,
        type: "BOOK_PURCHASE",
        amount: -book.priceEGP,
        currency: "EGP",
        description: `شراء كتاب إلكتروني: ${book.title}`,
        descriptionEn: `Purchased eBook: ${book.titleEn}`,
        date: new Date().toISOString(),
        status: "COMPLETED",
        referenceNumber: `BK-${Date.now().toString().slice(-6)}`,
      };
      setWalletTransactions((prev) => [tx, ...prev]);
      return true;
    }
    return false;
  };

  const sendAIMessage = (text: string) => {
    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setAiMessages((prev) => [...prev, userMsg]);

    // Check for crisis trigger
    const lower = text.toLowerCase();
    const isCrisis =
      lower.includes("انتحار") ||
      lower.includes("انهي حياتي") ||
      lower.includes("إيذاء نفسي") ||
      lower.includes("suicide") ||
      lower.includes("kill myself") ||
      lower.includes("die");

    setTimeout(() => {
      let botResponse: AIChatMessage;
      if (isCrisis) {
        botResponse = {
          id: `ai-crisis-${Date.now()}`,
          sender: "assistant",
          text: "⚠️ تنبيه أمان فوري: سلامتك هي أولويتنا القصوى المطلقة. إذا كنت تمر بضيق نفسي شديد أو تراودك أفكار لإيذاء نفسك، يرجى عدم البقاء بمفردك والتواصل فوراً مع الخط الساخن للأمانة العامة للصحة النفسية في مصر على الرقم المجاني 16328 (متاح 24/7) أو التوجه لأقرب مستشفى.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          triageFlag: "CRISIS_EMERGENCY",
          quickActions: [
            { label: "📞 الاتصال بالخط الساخن الوطني 16328", action: "call_hotline" },
            { label: "تفعيل تمارين التنفس للتهدئة الفورية", action: "panic_breathing" },
          ],
        };
      } else if (lower.includes("هلع") || lower.includes("panic") || lower.includes("خوف") || lower.includes("تنفس")) {
        botResponse = {
          id: `ai-resp-${Date.now()}`,
          sender: "assistant",
          text: "أنا معك الآن، تذكر أن نوبة الهلع مؤقتة وغير خطيرة جسدياً وإن كانت مزعجة. دعنا نهدئ ضربات القلب معاً: ضع يدك على بطنك، خذ شهيقاً عميقاً من الأنف لـ 4 ثوانٍ، احبس نفسك لـ 7 ثوانٍ، ثم ازفر ببطء شديد من الفم لـ 8 ثوانٍ.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          triageFlag: "EVALUATE",
          suggestedDoctorId: "doc-1",
          quickActions: [
            { label: "فتح أداة التنفس الإرشادي 4-7-8", action: "panic_breathing" },
            { label: "حجز موعد مع د. أسماء عبد الوهاب", action: "book_doc_1" },
          ],
        };
      } else if (lower.includes("نوم") || lower.includes("أرق") || lower.includes("sleep") || lower.includes("insomnia")) {
        botResponse = {
          id: `ai-resp-${Date.now()}`,
          sender: "assistant",
          text: "اضطرابات النوم ترتبط مباشرة بنشاط الجهاز العصبي وإفراز الكورتيزول. نوصيك بـ: 1) إبعاد الشاشات قبل النوم بساعة، 2) الحفاظ على درجة حرارة غرفة معتدلة تميل للبرودة، 3) إذا لم تنم خلال 20 دقيقة، غادر السرير واقرأ كتاباً بإضاءة خافتة.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          triageFlag: "STABLE",
          suggestedDoctorId: "doc-2",
          quickActions: [
            { label: "استشارة د. طارق منصور (استشاري اضطرابات النوم)", action: "book_doc_2" },
            { label: "بدء تقييم مقياس جودة النوم", action: "intake_start" },
          ],
        };
      } else {
        botResponse = {
          id: `ai-resp-${Date.now()}`,
          sender: "assistant",
          text: "شكراً لمشاركتك. في مركز أسما للصحة النفسية نوفر خططاً علاجية فردية تشمل العلاج المعرفي السلوكي (CBT)، دعم العلاقات الزوجية، والاستشارات الدوائية الآمنة. أنصحك بإجراء الاستبيان الطبي الذكي لنحدد لك الاستشاري الأنسب بدقة.",
          timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          triageFlag: "STABLE",
          quickActions: [
            { label: "بدء الاستبيان الطبي الذكي (3 دقائق)", action: "intake_start" },
            { label: "تصفح قائمة الأطباء والاستشاريين", action: "view_doctors" },
          ],
        };
      }
      setAiMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const toggleDoctorSlot = (doctorId: string, slotId: string) => {
    setDoctors((prev) =>
      prev.map((doc) => {
        if (doc.id === doctorId) {
          return {
            ...doc,
            availableSlots: doc.availableSlots.map((s) => (s.id === slotId ? { ...s, isBooked: !s.isBooked } : s)),
          };
        }
        return doc;
      })
    );
  };

  return (
    <TelehealthContext.Provider
      value={{
        currentUser,
        switchUserRole,
        doctors,
        appointments,
        clinicalRecords,
        intakeAssessments,
        courses,
        books,
        enrolledCourseIds,
        purchasedBookIds,
        walletTransactions,
        aiMessages,
        bookAppointment,
        cancelAppointment,
        addClinicalRecord,
        saveIntakeAssessment,
        topUpWallet,
        purchaseCourse,
        purchaseBook,
        sendAIMessage,
        toggleDoctorSlot,
      }}
    >
      {children}
    </TelehealthContext.Provider>
  );
};

export const useTelehealth = () => {
  const context = useContext(TelehealthContext);
  if (!context) {
    throw new Error("useTelehealth must be used within a TelehealthProvider");
  }
  return context;
};

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type TherapistGender = 'MALE' | 'FEMALE' | 'ANY';

export type SessionType = 'INDIVIDUAL' | 'COUPLES' | 'CHILD' | 'PSYCHIATRIC_EVAL' | 'GROUP_CIRCLE';

export type AppointmentStatus = 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'RESCHEDULED';

export type PaymentMethod = 
  | 'WALLET' 
  | 'CREDIT_CARD' 
  | 'FAWRY' 
  | 'INSTAPAY' 
  | 'VODAFONE_CASH';

export type TriageUrgency = 'STABLE' | 'EVALUATE' | 'CRISIS_EMERGENCY';

export type CurrencyCode = 'EGP' | 'USD' | 'SAR' | 'AED';

export interface User {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  phone: string;
  role: UserRole;
  walletBalanceEGP: number;
  walletBalanceUSD: number;
  avatar: string;
  medicalRecordNumber: string;
}

export interface DoctorSlot {
  id: string;
  startTimeUTC: string;
  endTimeUTC: string;
  isBooked: boolean;
}

export interface DoctorReview {
  id: string;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  fullNameEn: string;
  title: string;
  titleEn: string;
  licenseNumber: string;
  specialties: string[];
  specialtiesEn: string[];
  bio: string;
  bioEn: string;
  yearsOfExperience: number;
  sessionRateEGP: number;
  sessionRateUSD: number;
  rating: number;
  totalReviews: number;
  languages: string[];
  languagesEn: string[];
  avatar: string;
  audioIntroUrl?: string;
  videoIntroUrl?: string;
  methodologies: string[];
  methodologiesEn: string[];
  education: string[];
  educationEn: string[];
  availableSlots: DoctorSlot[];
  reviews: DoctorReview[];
  nextAvailableSlot: string;
  nextAvailableSlotEn: string;
  gender: 'MALE' | 'FEMALE';
}

export interface IntakeAssessment {
  id: string;
  patientId: string;
  patientName: string;
  primaryConcerns: string[];
  severityScore: number;
  urgencyLevel: TriageUrgency;
  preferredTherapistGender: TherapistGender;
  sessionType: SessionType;
  ageGroup: string;
  therapyHistory: string;
  medicationHistory: string;
  matchedDoctorIds: string[];
  notes?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorTitle: string;
  scheduledAtUTC: string;
  durationMinutes: 45 | 60;
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  pricePaid: number;
  currency: 'EGP' | 'USD';
  videoRoomId: string;
  meetingUrl: string;
  promoCodeApplied?: string;
  intakeId?: string;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface MentalStatusExam {
  appearanceAndBehavior: string;
  moodAndAffect: string;
  thoughtProcess: string;
  perception: string;
  cognitionAndOrientation: string;
  insightAndJudgement: string;
  riskAssessment: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface ClinicalSessionRecord {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  chiefComplaint: string;
  mentalStatusExam: MentalStatusExam;
  clinicalDiagnosisNotes: string;
  dsm5Codes: string[];
  prescription: PrescriptionItem[];
  nextSessionRecommendation: string;
  doctorSignature: string;
  createdAt: string;
}

export interface MentalHealthCourseModule {
  id: string;
  title: string;
  titleEn: string;
  duration: string;
  videoUrl?: string;
  isPreview: boolean;
}

export interface MentalHealthCourse {
  id: string;
  title: string;
  titleEn: string;
  instructorId: string;
  instructorName: string;
  instructorTitle: string;
  priceEGP: number;
  priceUSD: number;
  thumbnail: string;
  description: string;
  descriptionEn: string;
  rating: number;
  enrolledStudents: number;
  totalDuration: string;
  modules: MentalHealthCourseModule[];
}

export interface MentalHealthBook {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  description: string;
  descriptionEn: string;
  priceEGP: number;
  priceUSD: number;
  coverImage: string;
  pagesCount: number;
  category: string;
  categoryEn: string;
  sampleExcerpt: string;
  sampleExcerptEn: string;
  pdfUrl: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  triageFlag?: TriageUrgency;
  suggestedDoctorId?: string;
  quickActions?: Array<{ label: string; action: string }>;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'SESSION_PAYMENT' | 'SESSION_REFUND' | 'COURSE_PURCHASE' | 'BOOK_PURCHASE' | 'CIRCLE_PURCHASE';
  amount: number;
  currency: 'EGP' | 'USD';
  description: string;
  descriptionEn: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  referenceNumber: string;
}

export interface MoodLogEntry {
  id: string;
  patientId: string;
  moodScore: number;
  moodLabel: string;
  moodEmoji: string;
  emotions: string[];
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  sleepHours: number;
  notes: string;
  timestamp: string;
}

export interface CBTThoughtRecord {
  id: string;
  patientId: string;
  situation: string;
  automaticThought: string;
  distortionType: string;
  distortionTypeEn: string;
  rationalResponse: string;
  outcomeEmotion: string;
  reRating: number;
  createdAt: string;
}

export interface ClinicalAssessmentResult {
  id: string;
  patientId: string;
  assessmentType: 'PHQ9' | 'GAD7' | 'ASRS' | 'ISI';
  titleAr: string;
  titleEn: string;
  totalScore: number;
  maxScore: number;
  severityLevel: string;
  severityLevelEn: string;
  interpretationAr: string;
  interpretationEn: string;
  recommendationsAr: string[];
  completedAt: string;
}

export interface SafetyPlan {
  id: string;
  patientId: string;
  warningSigns: string[];
  internalCopingStrategies: string[];
  socialDistractions: Array<{ name: string; contact?: string }>;
  trustedContacts: Array<{ name: string; phone: string; relationship: string }>;
  professionalResources: Array<{ name: string; phone: string; address?: string }>;
  environmentSafetySteps: string[];
  updatedAt: string;
}

export interface TherapyHomeworkTask {
  id: string;
  patientId: string;
  doctorId: string;
  titleAr: string;
  titleEn: string;
  category: 'CBT_LOG' | 'BREATHING' | 'READING' | 'EXPOSURE' | 'MEDICATION';
  dueDate: string;
  isCompleted: boolean;
  notes?: string;
}

export interface DrugInteractionAlert {
  drugA: string;
  drugB: string;
  severity: 'MAJOR' | 'MODERATE' | 'MINOR';
  effectAr: string;
  effectEn: string;
  recommendationAr: string;
  recommendationEn: string;
}

export interface GroupSupportCircle {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  facilitatorName: string;
  facilitatorTitle: string;
  facilitatorAvatar: string;
  category: 'PANIC' | 'MATERNAL' | 'GRIEF' | 'BURNOUT' | 'OCD';
  scheduleAr: string;
  scheduleEn: string;
  priceEGP: number;
  maxParticipants: number;
  currentParticipants: number;
  durationMinutes: number;
  badgeAr: string;
  badgeEn: string;
}

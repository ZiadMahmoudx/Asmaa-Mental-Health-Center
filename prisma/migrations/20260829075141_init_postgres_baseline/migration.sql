-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(30) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "phone" VARCHAR(24) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(30) NOT NULL,
    "userId" VARCHAR(30) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "csrfTokenHash" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" VARCHAR(30) NOT NULL,
    "userId" VARCHAR(30) NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "destination" VARCHAR(190) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" VARCHAR(30) NOT NULL,
    "userId" VARCHAR(30) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "titleEn" VARCHAR(180),
    "licenseNumber" VARCHAR(60) NOT NULL,
    "specialtiesJson" TEXT NOT NULL DEFAULT '[]',
    "specialtiesEnJson" TEXT NOT NULL DEFAULT '[]',
    "concernTagsJson" TEXT NOT NULL DEFAULT '[]',
    "gender" VARCHAR(10),
    "bio" TEXT NOT NULL,
    "bioEn" TEXT,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "sessionPriceOnline" DECIMAL(10,2) NOT NULL,
    "sessionPriceOffline" DECIMAL(10,2) NOT NULL,
    "defaultDurationMins" INTEGER NOT NULL DEFAULT 45,
    "roomNumber" VARCHAR(30),
    "avatarUrl" VARCHAR(500),
    "isAcceptingPatients" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" VARCHAR(30) NOT NULL,
    "doctorId" VARCHAR(30) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutesUTC" INTEGER NOT NULL,
    "endMinutesUTC" INTEGER NOT NULL,
    "slotDurationMins" INTEGER NOT NULL DEFAULT 45,
    "isOnlineAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isOfflineAvailable" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ruleLockKey" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" VARCHAR(30) NOT NULL,
    "doctorId" VARCHAR(30) NOT NULL,
    "startsAtUTC" TIMESTAMP(3) NOT NULL,
    "endsAtUTC" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(255),
    "cancelledAt" TIMESTAMP(3),
    "createdById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "doctorId" VARCHAR(30) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "scheduledAtUTC" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT_PROOF',
    "priceEGP" DECIMAL(10,2) NOT NULL,
    "zoomMeetingUrl" VARCHAR(500),
    "zoomMeetingId" VARCHAR(80),
    "zoomPasscode" VARCHAR(60),
    "clinicNotes" TEXT,
    "slotLockKey" VARCHAR(40) NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" VARCHAR(500),
    "completedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "patientNotifiedAt" TIMESTAMP(3),
    "doctorNotifiedAt" TIMESTAMP(3),
    "rescheduledFromUTC" TIMESTAMP(3),
    "rescheduledAt" TIMESTAMP(3),
    "rescheduledById" VARCHAR(30),
    "rescheduleReason" VARCHAR(500),
    "patientRescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" VARCHAR(30),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_rooms" (
    "id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "floor" VARCHAR(30),
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30) NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "senderIdentifier" VARCHAR(120) NOT NULL,
    "transactionRef" VARCHAR(120),
    "amountClaimedEGP" DECIMAL(10,2),
    "receiptImageUrl" VARCHAR(500) NOT NULL,
    "receiptMimeType" VARCHAR(60) NOT NULL,
    "receiptSizeBytes" INTEGER NOT NULL,
    "receiptSha256" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNDER_REVIEW',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" VARCHAR(30),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30) NOT NULL,
    "doctorId" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT NOT NULL,
    "dsm5CodesJson" TEXT NOT NULL DEFAULT '[]',
    "prescriptionNotes" TEXT,
    "followUpPlan" TEXT,
    "riskLevel" VARCHAR(20),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_assessments" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "concernsJson" TEXT NOT NULL DEFAULT '[]',
    "ageGroup" VARCHAR(20) NOT NULL,
    "therapyHistory" VARCHAR(30) NOT NULL,
    "medicationHistory" VARCHAR(30) NOT NULL,
    "genderPreference" VARCHAR(10) NOT NULL DEFAULT 'ANY',
    "answersJson" TEXT NOT NULL DEFAULT '{}',
    "severityScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "urgencyLevel" VARCHAR(30) NOT NULL,
    "crisisFlagged" BOOLEAN NOT NULL DEFAULT false,
    "matchedDoctorIdsJson" TEXT NOT NULL DEFAULT '[]',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_assessments" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "scaleVersion" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "answersJson" TEXT NOT NULL DEFAULT '{}',
    "totalScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "severityBand" VARCHAR(30) NOT NULL,
    "riskItemEndorsed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_alerts" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "sourceId" VARCHAR(30) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "detail" VARCHAR(50) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" VARCHAR(30),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" VARCHAR(30),
    "outcome" VARCHAR(30),
    "resolutionNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_plans" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "warningSignsJson" TEXT NOT NULL DEFAULT '[]',
    "copingStrategiesJson" TEXT NOT NULL DEFAULT '[]',
    "socialDistractionsJson" TEXT NOT NULL DEFAULT '[]',
    "trustedContactsJson" TEXT NOT NULL DEFAULT '[]',
    "professionalContactsJson" TEXT NOT NULL DEFAULT '[]',
    "environmentStepsJson" TEXT NOT NULL DEFAULT '[]',
    "reasonsForLiving" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_credits" (
    "id" VARCHAR(30) NOT NULL,
    "patientId" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30),
    "amountEGP" DECIMAL(10,2) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(500),
    "issuedById" VARCHAR(30),
    "settledAt" TIMESTAMP(3),
    "settledById" VARCHAR(30),
    "settlementRef" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(30) NOT NULL,
    "actorId" VARCHAR(30),
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(60) NOT NULL,
    "metadata" TEXT,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "verification_tokens_userId_purpose_idx" ON "verification_tokens"("userId", "purpose");

-- CreateIndex
CREATE INDEX "verification_tokens_expiresAt_idx" ON "verification_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_userId_key" ON "doctor_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_licenseNumber_key" ON "doctor_profiles"("licenseNumber");

-- CreateIndex
CREATE INDEX "doctor_profiles_isAcceptingPatients_idx" ON "doctor_profiles"("isAcceptingPatients");

-- CreateIndex
CREATE INDEX "doctor_availability_doctorId_dayOfWeek_idx" ON "doctor_availability"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availability_window_lock_key" ON "doctor_availability"("doctorId", "dayOfWeek", "startMinutesUTC", "endMinutesUTC", "ruleLockKey");

-- CreateIndex
CREATE INDEX "availability_exceptions_doctorId_startsAtUTC_endsAtUTC_idx" ON "availability_exceptions"("doctorId", "startsAtUTC", "endsAtUTC");

-- CreateIndex
CREATE INDEX "availability_exceptions_createdById_idx" ON "availability_exceptions"("createdById");

-- CreateIndex
CREATE INDEX "appointments_patientId_scheduledAtUTC_idx" ON "appointments"("patientId", "scheduledAtUTC");

-- CreateIndex
CREATE INDEX "appointments_doctorId_scheduledAtUTC_idx" ON "appointments"("doctorId", "scheduledAtUTC");

-- CreateIndex
CREATE INDEX "appointments_status_holdExpiresAt_idx" ON "appointments"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "appointments_status_scheduledAtUTC_idx" ON "appointments"("status", "scheduledAtUTC");

-- CreateIndex
CREATE INDEX "appointments_rescheduledById_idx" ON "appointments"("rescheduledById");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_doctor_slot_lock_key" ON "appointments"("doctorId", "scheduledAtUTC", "slotLockKey");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_room_slot_lock_key" ON "appointments"("roomId", "scheduledAtUTC", "slotLockKey");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_rooms_name_key" ON "clinic_rooms"("name");

-- CreateIndex
CREATE INDEX "payment_proofs_status_uploadedAt_idx" ON "payment_proofs"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "payment_proofs_appointmentId_idx" ON "payment_proofs"("appointmentId");

-- CreateIndex
CREATE INDEX "payment_proofs_receiptSha256_idx" ON "payment_proofs"("receiptSha256");

-- CreateIndex
CREATE INDEX "payment_proofs_reviewedById_idx" ON "payment_proofs"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_records_appointmentId_key" ON "clinical_records"("appointmentId");

-- CreateIndex
CREATE INDEX "clinical_records_patientId_createdAt_idx" ON "clinical_records"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "clinical_records_doctorId_createdAt_idx" ON "clinical_records"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "intake_assessments_patientId_createdAt_idx" ON "intake_assessments"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "intake_assessments_urgencyLevel_createdAt_idx" ON "intake_assessments"("urgencyLevel", "createdAt");

-- CreateIndex
CREATE INDEX "intake_assessments_crisisFlagged_reviewedAt_idx" ON "intake_assessments"("crisisFlagged", "reviewedAt");

-- CreateIndex
CREATE INDEX "intake_assessments_reviewedById_idx" ON "intake_assessments"("reviewedById");

-- CreateIndex
CREATE INDEX "clinical_assessments_patientId_status_completedAt_idx" ON "clinical_assessments"("patientId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "clinical_assessments_type_status_completedAt_idx" ON "clinical_assessments"("type", "status", "completedAt");

-- CreateIndex
CREATE INDEX "clinical_assessments_riskItemEndorsed_status_completedAt_idx" ON "clinical_assessments"("riskItemEndorsed", "status", "completedAt");

-- CreateIndex
CREATE INDEX "safety_alerts_patientId_createdAt_idx" ON "safety_alerts"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "safety_alerts_acknowledgedAt_createdAt_idx" ON "safety_alerts"("acknowledgedAt", "createdAt");

-- CreateIndex
CREATE INDEX "safety_alerts_severity_resolvedAt_idx" ON "safety_alerts"("severity", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "safety_plans_patientId_key" ON "safety_plans"("patientId");

-- CreateIndex
CREATE INDEX "patient_credits_patientId_createdAt_idx" ON "patient_credits"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "patient_credits_kind_settledAt_idx" ON "patient_credits"("kind", "settledAt");

-- CreateIndex
CREATE INDEX "patient_credits_appointmentId_idx" ON "patient_credits"("appointmentId");

-- CreateIndex
CREATE INDEX "patient_credits_issuedById_idx" ON "patient_credits"("issuedById");

-- CreateIndex
CREATE INDEX "patient_credits_settledById_idx" ON "patient_credits"("settledById");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "clinic_rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduledById_fkey" FOREIGN KEY ("rescheduledById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_assessments" ADD CONSTRAINT "intake_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_assessments" ADD CONSTRAINT "intake_assessments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical_assessments" ADD CONSTRAINT "clinical_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "safety_alerts" ADD CONSTRAINT "safety_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "safety_alerts" ADD CONSTRAINT "safety_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "safety_alerts" ADD CONSTRAINT "safety_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_credits" ADD CONSTRAINT "patient_credits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_credits" ADD CONSTRAINT "patient_credits_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_credits" ADD CONSTRAINT "patient_credits_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_credits" ADD CONSTRAINT "patient_credits_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

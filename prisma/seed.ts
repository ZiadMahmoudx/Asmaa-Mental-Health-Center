/**
 * Database seed.
 *
 * Creates the accounts the platform cannot bootstrap itself: the admin who staffs
 * the verification desk, and the consultants whose calendars patients book
 * against. Self-registration only ever produces PATIENT accounts (see
 * auth.actions.ts), so DOCTOR and ADMIN identities have to originate here.
 *
 * Idempotent: every write is an upsert keyed on email or license number, so
 * running it repeatedly against a live database is safe.
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

/** 2 = Argon2id. Matches lib/auth/password.ts, so seeded hashes verify there. */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Seed passwords come from the environment so that a production seed never
 * hard-codes a known credential. The development fallback is intentionally
 * obvious, and the script refuses to use it when NODE_ENV is production.
 */
function seedPassword(variable: string, devFallback: string): string {
  const fromEnv = process.env[variable];
  if (fromEnv && fromEnv.length >= 10) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${variable} must be set (10+ characters) before seeding a production database.`,
    );
  }
  return devFallback;
}

/**
 * Cairo local hour -> UTC minutes-from-midnight.
 *
 * Egypt reintroduced daylight saving in 2023: the country runs UTC+2 in winter
 * and UTC+3 from the last Friday of April to the last Thursday of October. This
 * helper converts using the WINTER offset, because availability rules are stored
 * as fixed UTC anchors (see prisma/schema.prisma) and a fixed UTC anchor cannot
 * also be a fixed Cairo wall-clock time - one of the two has to move.
 *
 * The consequence is explicit and intended: a window seeded as 16:00 Cairo shows
 * to patients as 17:00 Cairo during the DST half of the year. The clinic keeps a
 * stable UTC calendar (no slot ever silently shifts, duplicates, or disappears on
 * the changeover night), and adjusts the affected windows in the doctor's agenda
 * screen at each switch if it wants the local hour held constant instead.
 */
const CAIRO_WINTER_OFFSET_HOURS = 2;

function cairoHourToUtcMinutes(
  hour: number,
  minute = 0,
  utcOffsetHours = CAIRO_WINTER_OFFSET_HOURS,
): number {
  const total = (hour - utcOffsetHours) * 60 + minute;
  return ((total % 1440) + 1440) % 1440;
}

async function main() {
  console.log("Seeding Asmaa Clinic database…");

  // ---------------------------------------------------------------- admin ---
  const adminPassword = await hash(seedPassword("SEED_ADMIN_PASSWORD", "AsmaaAdmin2026"), ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@asmaaclinic.com" },
    update: { role: "ADMIN", isActive: true },
    create: {
      fullName: "مدير النظام الطبي",
      email: "admin@asmaaclinic.com",
      phone: "+201001234567",
      passwordHash: adminPassword,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
  console.log(`  admin: ${admin.email}`);

  // -------------------------------------------------------------- doctors ---
  const doctorPassword = await hash(seedPassword("SEED_DOCTOR_PASSWORD", "AsmaaDoctor2026"), ARGON2_OPTIONS);

  const doctorSeeds = [
    {
      fullName: "د. أسماء عبد الوهاب",
      email: "dr.asmaa@asmaaclinic.com",
      phone: "+201118889900",
      licenseNumber: "EGY-PSY-84920",
      title: "مؤسس المركز واستشاري أول الطب النفسي وعلاج الإدمان",
      titleEn: "Founder & Senior Consultant Psychiatrist",
      specialties: [
        "الاكتئاب الحاد",
        "اضطرابات القلق ونوبات الهلع",
        "اضطراب ثنائي القطب",
        "العلاج المعرفي السلوكي",
      ],
      specialtiesEn: ["Major Depression", "Anxiety & Panic Disorders", "Bipolar Disorder", "CBT"],
      // ConcernTag values from lib/content/intake.ts — what the triage
      // questionnaire matches patients against.
      concernTags: ["anxiety", "panic", "depression", "trauma", "addiction", "sleep"],
      gender: "FEMALE",
      bio: "استشاري أول الطب النفسي، دكتوراه من جامعة القاهرة وعضوية الكلية الملكية البريطانية (MRCPsych)، بخبرة تتجاوز 18 عاماً في الاضطرابات الوجدانية والقلق والصدمات النفسية.",
      bioEn:
        "Senior Consultant Psychiatrist, MD Cairo University, MRCPsych (UK). 18+ years treating mood disorders, anxiety and complex trauma.",
      yearsOfExperience: 18,
      sessionPriceOnline: 850,
      sessionPriceOffline: 950,
      roomNumber: "3A",
      /** Cairo hours; converted to UTC below. 0 = Sunday. */
      windows: [
        { dayOfWeek: 0, startHour: 16, endHour: 20, online: true, offline: true },
        { dayOfWeek: 1, startHour: 16, endHour: 20, online: true, offline: false },
        { dayOfWeek: 2, startHour: 12, endHour: 16, online: true, offline: true },
        { dayOfWeek: 3, startHour: 16, endHour: 20, online: true, offline: false },
      ],
    },
    {
      fullName: "د. طارق منصور",
      email: "dr.tarek@asmaaclinic.com",
      phone: "+201119876543",
      licenseNumber: "EGY-PSY-73104",
      title: "استشاري الطب النفسي والعلاج المعرفي للبالغين",
      titleEn: "Consultant Psychiatrist & Adult Cognitive Therapist",
      specialties: ["الوسواس القهري", "القلق الاجتماعي", "الأرق واضطرابات النوم"],
      specialtiesEn: ["OCD", "Social Anxiety", "Insomnia & Sleep Disorders"],
      concernTags: ["ocd", "anxiety", "sleep", "burnout", "panic"],
      gender: "MALE",
      bio: "استشاري الطب النفسي، ماجستير جامعة عين شمس وزمالة البورد العربي، متخصص في علاج الوسواس القهري بتقنية التعرض ومنع الاستجابة (ERP).",
      bioEn:
        "Consultant Psychiatrist, MSc Ain Shams, Arab Board Fellow. Specialises in ERP for OCD and sleep rhythm restoration.",
      yearsOfExperience: 14,
      sessionPriceOnline: 700,
      sessionPriceOffline: 800,
      roomNumber: "2B",
      windows: [
        { dayOfWeek: 1, startHour: 18, endHour: 22, online: true, offline: false },
        { dayOfWeek: 3, startHour: 18, endHour: 22, online: true, offline: true },
        { dayOfWeek: 6, startHour: 11, endHour: 15, online: true, offline: true },
      ],
    },
    {
      fullName: "أ. نورهان السيد",
      email: "nourhan@asmaaclinic.com",
      phone: "+201002345678",
      licenseNumber: "EGY-PSY-61220",
      title: "أخصائية أولى علم النفس الإكلينيكي",
      titleEn: "Senior Clinical Psychologist",
      specialties: ["العلاج الأسري", "الاستشارات الزوجية", "دعم ما بعد الولادة"],
      specialtiesEn: ["Family Therapy", "Couples Counselling", "Postpartum Support"],
      concernTags: ["relationships", "depression", "trauma", "burnout"],
      gender: "FEMALE",
      bio: "أخصائية أولى علم النفس الإكلينيكي، ماجستير الإرشاد النفسي، متخصصة في العلاج الأسري والاستشارات الزوجية ودعم الأمهات الجدد.",
      bioEn:
        "Senior Clinical Psychologist, MSc Counselling Psychology. Focused on family systems, couples work and postpartum support.",
      yearsOfExperience: 9,
      sessionPriceOnline: 600,
      sessionPriceOffline: 650,
      roomNumber: "1C",
      windows: [
        { dayOfWeek: 0, startHour: 10, endHour: 14, online: true, offline: true },
        { dayOfWeek: 2, startHour: 17, endHour: 21, online: true, offline: false },
        { dayOfWeek: 4, startHour: 10, endHour: 14, online: true, offline: true },
      ],
    },
  ];

  for (const seed of doctorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { role: "DOCTOR", isActive: true },
      create: {
        fullName: seed.fullName,
        email: seed.email,
        phone: seed.phone,
        passwordHash: doctorPassword,
        role: "DOCTOR",
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        title: seed.title,
        titleEn: seed.titleEn,
        specialtiesJson: JSON.stringify(seed.specialties),
        specialtiesEnJson: JSON.stringify(seed.specialtiesEn),
        concernTagsJson: JSON.stringify(seed.concernTags),
        gender: seed.gender,
        bio: seed.bio,
        bioEn: seed.bioEn,
        sessionPriceOnline: new Prisma.Decimal(seed.sessionPriceOnline),
        sessionPriceOffline: new Prisma.Decimal(seed.sessionPriceOffline),
        roomNumber: seed.roomNumber,
        isAcceptingPatients: true,
      },
      create: {
        userId: user.id,
        licenseNumber: seed.licenseNumber,
        title: seed.title,
        titleEn: seed.titleEn,
        specialtiesJson: JSON.stringify(seed.specialties),
        specialtiesEnJson: JSON.stringify(seed.specialtiesEn),
        concernTagsJson: JSON.stringify(seed.concernTags),
        gender: seed.gender,
        bio: seed.bio,
        bioEn: seed.bioEn,
        yearsOfExperience: seed.yearsOfExperience,
        sessionPriceOnline: new Prisma.Decimal(seed.sessionPriceOnline),
        sessionPriceOffline: new Prisma.Decimal(seed.sessionPriceOffline),
        roomNumber: seed.roomNumber,
        defaultDurationMins: 45,
      },
    });

    for (const window of seed.windows) {
      const startMinutesUTC = cairoHourToUtcMinutes(window.startHour);
      const endMinutesUTC = cairoHourToUtcMinutes(window.endHour);

      await prisma.doctorAvailability.upsert({
        where: {
          doctorId_dayOfWeek_startMinutesUTC_endMinutesUTC_ruleLockKey: {
            doctorId: profile.id,
            dayOfWeek: window.dayOfWeek,
            startMinutesUTC,
            endMinutesUTC,
            ruleLockKey: "ACTIVE",
          },
        },
        update: {
          isActive: true,
          isOnlineAvailable: window.online,
          isOfflineAvailable: window.offline,
          ruleLockKey: "ACTIVE",
        },
        create: {
          doctorId: profile.id,
          dayOfWeek: window.dayOfWeek,
          startMinutesUTC,
          endMinutesUTC,
          slotDurationMins: 45,
          isOnlineAvailable: window.online,
          isOfflineAvailable: window.offline,
          ruleLockKey: "ACTIVE",
        },
      });
    }

    console.log(`  doctor: ${seed.fullName} (${seed.windows.length} weekly windows)`);
  }

  // ------------------------------------------------------------- patients ---
  if (process.env.NODE_ENV !== "production") {
    const patientPassword = await hash(
      seedPassword("SEED_PATIENT_PASSWORD", "AsmaaPatient2026"),
      ARGON2_OPTIONS,
    );

    const patient = await prisma.user.upsert({
      where: { email: "sara.mahmoud@example.com" },
      update: {},
      create: {
        fullName: "سارة محمود",
        email: "sara.mahmoud@example.com",
        phone: "+201002223333",
        passwordHash: patientPassword,
        role: "PATIENT",
      },
    });
    console.log(`  demo patient: ${patient.email}`);
  }

  // ------------------------------------------------------------- clinic rooms ---
  const rooms = [
    { name: "غرفة الاستشارات ١", floor: "الدور الأول", capacity: 1, notes: "غرفة الجلسات الفردية الرئيسية" },
    { name: "غرفة الاستشارات ٢", floor: "الدور الأول", capacity: 1, notes: "غرفة الاستشارات النفسية" },
    { name: "غرفة الاستشارات ٣", floor: "الدور الثاني", capacity: 1, notes: "غرفة الجلسات الخاصة" },
  ];

  for (const r of rooms) {
    await prisma.clinicRoom.upsert({
      where: { name: r.name },
      update: { floor: r.floor, capacity: r.capacity },
      create: r,
    });
  }
  console.log(`  rooms: seeded ${rooms.length} clinic rooms`);

  console.log("Seed complete.");
  console.log(
    "\nDevelopment sign-in:\n" +
      "  admin@asmaaclinic.com     / AsmaaAdmin2026\n" +
      "  dr.asmaa@asmaaclinic.com  / AsmaaDoctor2026\n" +
      "  sara.mahmoud@example.com  / AsmaaPatient2026\n" +
      "(override via SEED_ADMIN_PASSWORD / SEED_DOCTOR_PASSWORD / SEED_PATIENT_PASSWORD)",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

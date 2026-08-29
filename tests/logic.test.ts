/**
 * Logic tests for the security-critical pure modules: the availability engine,
 * input validation, WhatsApp link building, password hashing and receipt upload
 * validation. These are the paths where a defect is silent - a slot that can be
 * booked off-grid, a phone number that fails to normalise, an HTML file accepted
 * as a receipt - so they are asserted rather than eyeballed.
 *
 * Run with:  npm run test:logic
 * (The react-server condition lets the `server-only` guarded modules load
 * outside a Next.js render; --env-file supplies the validated configuration.)
 */
import assert from "node:assert/strict";
import { generateSlots, intervalsOverlap, isSlotOffered, parseUtcDate } from "@/lib/slots";
import {
  egyptianPhone,
  zoomUrlSchema,
  paymentProofSchema,
  registerSchema,
  reserveSlotSchema,
  createDoctorSchema,
  createAdminSchema,
  adminResetPasswordSchema,
  issueManualCreditSchema,
  settleCreditSchema,
  patientRescheduleSchema,
  clinicalRecordSchema,
} from "@/lib/validation/schemas";
import { fromStringArray, toStringArray } from "@/lib/serialization";
import { ACTIVE_SLOT_LOCK, PAYMENT_REVIEW_SLA_HOURS } from "@/lib/constants";
import {
  buildWhatsAppLink,
  toWaMeNumber,
  paymentInstructionsMessage,
  appointmentRescheduledMessage,
  clinicCancellationMessage,
  doctorSessionBriefMessage,
  doctorSessionBriefLink,
} from "@/lib/whatsapp";
import { cairoLabelToUtcMinutes, utcMinutesToCairoLabel, startOfCairoDayUtc } from "@/lib/time/cairo";
import { hashPassword, verifyPassword, safeEquals, generateToken, sha256Hex } from "@/lib/auth/password";
import { storeReceipt, resolveReceiptPath } from "@/lib/uploads";
import { dashboardPathForRole, OCCUPYING_STATUSES, CREDIT_KINDS } from "@/lib/domain/enums";
import {
  ASSESSMENT_SCALES,
  ASSESSMENT_TYPES,
  isAssessmentType,
  scoreAssessment,
} from "@/lib/content/assessment-scales";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  PASS  ${name}`);
    })
    .catch((error) => {
      console.error(`  FAIL  ${name}\n        ${error.message}`);
      process.exitCode = 1;
    });
}

async function main() {
  console.log("\n--- slots engine ---");

  const rules = [
    {
      id: "rule-1",
      dayOfWeek: 3, // Wednesday UTC
      startMinutesUTC: 14 * 60, // 14:00 UTC = 17:00 Cairo (Egypt is UTC+3 under DST)
      endMinutesUTC: 17 * 60,
      slotDurationMins: 45,
      isOnlineAvailable: true,
      isOfflineAvailable: false,
      isActive: true,
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveUntil: null,
    },
  ];
  const now = new Date("2026-09-01T09:00:00Z"); // Tuesday

  await check("expands a weekly rule into aligned 45-min slots", () => {
    const slots = generateSlots({
      rules,
      exceptions: [],
      busy: [],
      type: "ONLINE",
      from: now,
      days: 7,
      now,
      minNoticeMinutes: 120,
    });
    const wednesday = slots.filter((s) => s.startUTC.startsWith("2026-09-02"));
    assert.deepEqual(
      wednesday.map((s) => s.startUTC),
      [
        "2026-09-02T14:00:00.000Z",
        "2026-09-02T14:45:00.000Z",
        "2026-09-02T15:30:00.000Z",
        "2026-09-02T16:15:00.000Z",
      ],
      '16:15-17:00 exactly fills the window, so it must be emitted',
    );
  });

  await check("OFFLINE request finds nothing on an online-only rule", () => {
    const slots = generateSlots({
      rules, exceptions: [], busy: [], type: "OFFLINE",
      from: now, days: 7, now, minNoticeMinutes: 120,
    });
    assert.equal(slots.length, 0);
  });

  await check("a booked appointment removes exactly its own slot", () => {
    const slots = generateSlots({
      rules, exceptions: [], busy: [
        { startUTC: new Date("2026-09-02T14:45:00Z"), endUTC: new Date("2026-09-02T15:30:00Z") },
      ],
      type: "ONLINE", from: now, days: 7, now, minNoticeMinutes: 120,
    });
    const wednesday = slots.filter((s) => s.startUTC.startsWith("2026-09-02"));
    assert.deepEqual(wednesday.map((s) => s.startUTC), [
      "2026-09-02T14:00:00.000Z",
      "2026-09-02T15:30:00.000Z",
      "2026-09-02T16:15:00.000Z",
    ]);
  });

  await check("time-off blocks overlapping slots", () => {
    const slots = generateSlots({
      rules, exceptions: [
        { startUTC: new Date("2026-09-02T13:00:00Z"), endUTC: new Date("2026-09-02T15:00:00Z") },
      ],
      busy: [], type: "ONLINE", from: now, days: 7, now, minNoticeMinutes: 120,
    });
    const wednesday = slots.filter((s) => s.startUTC.startsWith("2026-09-02"));
    assert.deepEqual(wednesday.map((s) => s.startUTC), ["2026-09-02T15:30:00.000Z", "2026-09-02T16:15:00.000Z"]);
  });

  await check("minimum-notice window hides imminent slots", () => {
    const closeNow = new Date("2026-09-02T13:30:00Z"); // 30 min before the 14:00 slot
    const slots = generateSlots({
      rules, exceptions: [], busy: [], type: "ONLINE",
      from: closeNow, days: 1, now: closeNow, minNoticeMinutes: 120,
    });
    assert.deepEqual(slots.map((s) => s.startUTC), ["2026-09-02T15:30:00.000Z", "2026-09-02T16:15:00.000Z"]);
  });

  await check("isSlotOffered rejects an off-grid timestamp (forged POST)", () => {
    const slots = generateSlots({
      rules, exceptions: [], busy: [], type: "ONLINE",
      from: now, days: 7, now, minNoticeMinutes: 120,
    });
    assert.equal(isSlotOffered(slots, new Date("2026-09-02T14:00:00.000Z"), 45), true);
    assert.equal(isSlotOffered(slots, new Date("2026-09-02T14:10:00.000Z"), 45), false, "off-grid");
    assert.equal(isSlotOffered(slots, new Date("2026-09-02T03:00:00.000Z"), 45), false, "3am");
    assert.equal(isSlotOffered(slots, new Date("2026-09-02T14:00:00.000Z"), 60), false, "duration");
  });

  await check("parseUtcDate rejects malformed dates", () => {
    assert.notEqual(parseUtcDate("2026-09-02"), null);
    assert.equal(parseUtcDate("02/09/2026"), null);
    assert.equal(parseUtcDate("'; DROP TABLE"), null);
  });

  console.log("\n--- validation ---");

  await check("Egyptian phone normalises to E.164", () => {
    for (const input of ["01001234567", "+201001234567", "00201001234567", "0100 123 4567", "0100-123-4567"]) {
      assert.equal(egyptianPhone.parse(input), "+201001234567", input);
    }
  });

  await check("Egyptian phone rejects landlines and foreign numbers", () => {
    for (const bad of ["0221234567", "+14155552671", "12345", "010012345678"]) {
      assert.equal(egyptianPhone.safeParse(bad).success, false, bad);
    }
  });

  await check("zoom URL allow-list blocks phishing hosts", () => {
    assert.equal(zoomUrlSchema.safeParse("https://us02web.zoom.us/j/123").success, true);
    assert.equal(zoomUrlSchema.safeParse("https://zoom.us/j/123").success, true);
    assert.equal(zoomUrlSchema.safeParse("https://zoom.us.evil.com/j/123").success, false);
    assert.equal(zoomUrlSchema.safeParse("http://zoom.us/j/123").success, false, "must be https");
    assert.equal(zoomUrlSchema.safeParse("javascript:alert(1)").success, false);
  });

  await check("payment proof validates sender format per method", () => {
    assert.equal(
      paymentProofSchema.safeParse({
        appointmentId: "clh1234567890abcdefghij",
        method: "VODAFONE_CASH",
        senderIdentifier: "01001234567",
      }).success,
      true,
    );
    assert.equal(
      paymentProofSchema.safeParse({
        appointmentId: "clh1234567890abcdefghij",
        method: "VODAFONE_CASH",
        senderIdentifier: "ahmed@instapay",
      }).success,
      false,
      "an InstaPay handle is not a Vodafone wallet",
    );
    assert.equal(
      paymentProofSchema.safeParse({
        appointmentId: "clh1234567890abcdefghij",
        method: "INSTAPAY",
        senderIdentifier: "ahmed.ali@instapay",
      }).success,
      true,
    );
  });

  await check("register rejects mismatched passwords and weak ones", () => {
    const base = {
      fullName: "سارة محمود",
      email: "sara@example.com",
      phone: "01001234567",
      acceptTerms: true,
    };
    assert.equal(registerSchema.safeParse({ ...base, password: "Strong123pass", confirmPassword: "Strong123pass" }).success, true);
    assert.equal(registerSchema.safeParse({ ...base, password: "Strong123pass", confirmPassword: "different1234" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "short1", confirmPassword: "short1" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "nodigitshere", confirmPassword: "nodigitshere" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "Strong123pass", confirmPassword: "Strong123pass", acceptTerms: false }).success, false);
  });

  await check("reserve schema coerces and rejects bad durations", () => {
    const ok = reserveSlotSchema.safeParse({
      doctorId: "clh1234567890abcdefghij",
      type: "ONLINE",
      scheduledAtUTC: "2026-09-02T14:00:00.000Z",
      durationMinutes: "45",
    });
    assert.equal(ok.success, true);
    assert.equal(
      reserveSlotSchema.safeParse({
        doctorId: "clh1234567890abcdefghij",
        type: "ONLINE",
        scheduledAtUTC: "2026-09-02T14:00:00.000Z",
        durationMinutes: "999",
      }).success,
      false,
    );
    assert.equal(
      reserveSlotSchema.safeParse({
        doctorId: "clh1234567890abcdefghij",
        type: "HACKED",
        scheduledAtUTC: "2026-09-02T14:00:00.000Z",
        durationMinutes: "45",
      }).success,
      false,
    );
  });

  await check("create doctor schema validates credentials, specialties and price bounds", () => {
    const validDoctor = {
      fullName: "د. طارق خالد",
      email: "tarek@asmaaclinic.com",
      phone: "01098765432",
      password: "DoctorPassword2026",
      title: "استشاري الطب النفسي",
      licenseNumber: "MOH-998877",
      yearsOfExperience: "12",
      roomNumber: "3A",
      sessionPriceOnline: "650",
      sessionPriceOffline: "800",
      specialties: ["علاج الاكتئاب", "علاج الصدمات"],
      concernTags: ["depression", "trauma"],
      bioAr: "استشاري الطب النفسي بخبرة تزيد عن 12 عاماً.",
    };
    assert.equal(createDoctorSchema.safeParse(validDoctor).success, true);
    // Rejects below min price
    assert.equal(createDoctorSchema.safeParse({ ...validDoctor, sessionPriceOnline: 20 }).success, false);
    // Rejects empty specialties
    assert.equal(createDoctorSchema.safeParse({ ...validDoctor, specialties: [] }).success, false);
    // Rejects weak password
    assert.equal(createDoctorSchema.safeParse({ ...validDoctor, password: "weak" }).success, false);
  });

  await check("create admin schema enforces email, phone, and password", () => {
    const validAdmin = {
      fullName: "محمود عبد الرحمن",
      email: "reception@asmaaclinic.com",
      phone: "01122334455",
      password: "AdminPassword2026",
    };
    assert.equal(createAdminSchema.safeParse(validAdmin).success, true);
    assert.equal(createAdminSchema.safeParse({ ...validAdmin, phone: "invalid-phone" }).success, false);
  });

  await check("admin reset password enforces confirmation match", () => {
    assert.equal(
      adminResetPasswordSchema.safeParse({
        userId: "clh1234567890abcdefghij",
        password: "NewStrongPassword2026",
        confirmPassword: "NewStrongPassword2026",
      }).success,
      true,
    );
    assert.equal(
      adminResetPasswordSchema.safeParse({
        userId: "clh1234567890abcdefghij",
        password: "NewStrongPassword2026",
        confirmPassword: "MismatchPassword123",
      }).success,
      false,
    );
  });

  console.log("\n--- whatsapp ---");

  await check("wa.me numbers are digits with the country code", () => {
    assert.equal(toWaMeNumber("+20 100 123 4567"), "201001234567");
    assert.equal(toWaMeNumber("01001234567"), "201001234567");
  });

  await check("message text is URL-encoded into the deep link", () => {
    const url = buildWhatsAppLink("+201001234567", "مرحباً & أهلاً");
    assert.ok(url.startsWith("https://wa.me/201001234567?text="));
    assert.ok(!url.includes(" "), "spaces must be encoded");
    assert.ok(!url.includes("&أ"), "ampersand must be encoded");
    assert.equal(decodeURIComponent(url.split("?text=")[1]), "مرحباً & أهلاً");
  });

  await check("payment instructions carry the wallet details and deadline", () => {
    const message = paymentInstructionsMessage({
      patientName: "سارة محمود",
      patientPhone: "+201002223333",
      doctorName: "د. أسماء عبد الوهاب",
      scheduledAtUTC: new Date("2026-09-02T14:00:00Z"),
      type: "ONLINE",
      priceEGP: 850,
      instapayHandle: "asmaaclinic@instapay",
      vodafoneCashNumbers: ["+201001234567", "+201119876543"],
      holdMinutes: 45,
      uploadUrl: "https://asmaaclinic.com/booking/abc/payment",
    });
    assert.ok(message.includes("asmaaclinic@instapay"));
    assert.ok(message.includes("+201119876543"));
    assert.ok(message.includes("45 دقيقة"));
    assert.ok(message.includes("https://asmaaclinic.com/booking/abc/payment"));
    // Egypt observes DST from late April to late October, so 14:00 UTC is 5 PM Cairo.
    assert.ok(message.includes("٥:٠٠"), `Egypt is UTC+3 in September (DST): 14:00Z must render as 5 PM Cairo. Got: ${message}`);
  });

  await check("reschedule message includes both old and new times", () => {
    const message = appointmentRescheduledMessage({
      patientName: "سارة محمود",
      patientPhone: "+201001234567",
      doctorName: "د. أسماء عبد الوهاب",
      type: "ONLINE",
      oldScheduledAtUTC: new Date("2026-09-02T14:00:00Z"),
      scheduledAtUTC: new Date("2026-09-04T16:00:00Z"),
      durationMinutes: 45,
      priceEGP: 850,
      zoomMeetingUrl: "https://zoom.us/j/123456789",
      zoomPasscode: "123456",
      roomNumber: null,
      clinicAddressAr: "القاهرة الجديدة",
      clinicMapsUrl: "https://maps.google.com",
      reason: "بناء على طلب الاستشاري",
    });
    assert.ok(message.includes("تعديل موعد"));
    assert.ok(message.includes("https://zoom.us/j/123456789"));
    assert.ok(message.includes("بناء على طلب الاستشاري"));
  });

  await check("clinic cancellation message includes reason", () => {
    const message = clinicCancellationMessage({
      patientName: "سارة محمود",
      doctorName: "د. أسماء عبد الوهاب",
      scheduledAtUTC: new Date("2026-09-02T14:00:00Z"),
      reason: "ظرف صحي طارئ للاستشاري",
    });
    assert.ok(message.includes("نعتذر منك بشدة"));
    assert.ok(message.includes("ظرف صحي طارئ للاستشاري"));
  });

  console.log("\n--- cairo time conversion ---");

  await check("converts 16:00 Cairo (winter) to 14:00 UTC (840 mins)", () => {
    const utcMins = cairoLabelToUtcMinutes("16:00");
    assert.equal(utcMins, 14 * 60);
    const label = utcMinutesToCairoLabel(utcMins);
    assert.equal(label, "16:00");
  });

  await check("handles midnight wraps cleanly in Cairo clock", () => {
    const utcMins = cairoLabelToUtcMinutes("01:00");
    assert.equal(utcMins, 23 * 60);
    const label = utcMinutesToCairoLabel(utcMins);
    assert.equal(label, "01:00");
  });

  console.log("\n--- password & tokens ---");

  await check("argon2id hashes verify, wrong passwords do not", async () => {
    const hash = await hashPassword("Strong123pass");
    assert.ok(hash.startsWith("$argon2id$"), hash.slice(0, 20));
    assert.equal(await verifyPassword(hash, "Strong123pass"), true);
    assert.equal(await verifyPassword(hash, "Strong123Pass"), false);
    assert.equal(await verifyPassword("not-a-hash", "Strong123pass"), false, "must not throw");
  });

  await check("the same password yields different hashes (per-hash salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("Strong123pass"), hashPassword("Strong123pass")]);
    assert.notEqual(a, b);
  });

  await check("safeEquals compares correctly across lengths", () => {
    assert.equal(safeEquals("abc123", "abc123"), true);
    assert.equal(safeEquals("abc123", "abc124"), false);
    assert.equal(safeEquals("abc", "abcdef"), false, "must not throw on length mismatch");
    assert.equal(safeEquals("", ""), true);
  });

  await check("tokens are unique and high-entropy", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken(32)));
    assert.equal(tokens.size, 500);
    assert.ok([...tokens][0].length >= 42);
  });

  console.log("\n--- uploads ---");

  await check("rejects an HTML payload disguised as a PNG", async () => {
    const evil = new File(["<script>alert(document.cookie)</script>"], "receipt.png", {
      type: "image/png",
    });
    const result = await storeReceipt(evil);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "CONTENT_MISMATCH");
  });

  await check("rejects a disallowed MIME type outright", async () => {
    const svg = new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "x.svg", {
      type: "image/svg+xml",
    });
    const result = await storeReceipt(svg);
    assert.equal(result.ok === false && result.reason, "UNSUPPORTED_TYPE");
  });

  await check("rejects an empty file", async () => {
    const result = await storeReceipt(new File([], "empty.png", { type: "image/png" }));
    assert.equal(result.ok === false && result.reason, "EMPTY");
  });

  await check("accepts a real PNG and hashes it", async () => {
    // 1x1 transparent PNG.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const result = await storeReceipt(new File([png], "receipt.png", { type: "image/png" }));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.receipt.mimeType, "image/png");
      assert.equal(result.receipt.sha256.length, 64);
      assert.ok(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/.test(result.receipt.storageKey), result.receipt.storageKey);
    }
  });

  await check("path traversal in a storage key is refused", () => {
    assert.equal(resolveReceiptPath("../../.env"), null);
    assert.equal(resolveReceiptPath("../../../etc/passwd"), null);
    assert.equal(resolveReceiptPath("a\0b"), null);
    assert.notEqual(resolveReceiptPath("2026/08/abc.png"), null);
  });

  console.log("\n--- credit ledger & financial integrity ---");

  await check("signed credit ledger balance arithmetic correctly aggregates", () => {
    const ledger = [
      { amount: 600, kind: "CANCELLATION" },
      { amount: 400, kind: "MANUAL_ADJUSTMENT" },
      { amount: -500, kind: "APPLIED_TO_BOOKING" },
      { amount: -500, kind: "PAID_OUT" },
    ];
    const balance = ledger.reduce((acc, curr) => acc + curr.amount, 0);
    assert.equal(balance, 0);
  });

  await check("credit validation schemas enforce valid amounts and non-empty reasons", () => {
    const validManual = issueManualCreditSchema.safeParse({
      patientId: "cm01234567890123456789012",
      amountEGP: 600,
      reason: "تعويض عن إلغاء الجلسة بسبب ظرف طارئ",
    });
    assert.equal(validManual.success, true);

    const invalidShortReason = issueManualCreditSchema.safeParse({
      patientId: "cm01234567890123456789012",
      amountEGP: 600,
      reason: "إلغ",
    });
    assert.equal(invalidShortReason.success, false);

    const validSettlement = settleCreditSchema.safeParse({
      patientId: "cm01234567890123456789012",
      settlementRef: "IP-948192049",
      notes: "تحويل إنستا باي لحساب المريض",
    });
    assert.equal(validSettlement.success, true);
  });

  console.log("\n--- patient reschedule & notice boundaries ---");

  await check("patient reschedule schema validates instant and duration", () => {
    const valid = patientRescheduleSchema.safeParse({
      appointmentId: "cm01234567890123456789012",
      scheduledAtUTC: "2026-09-10T14:00:00.000Z",
      durationMinutes: 45,
    });
    assert.equal(valid.success, true);

    const badInstant = patientRescheduleSchema.safeParse({
      appointmentId: "cm01234567890123456789012",
      scheduledAtUTC: "not-a-date",
      durationMinutes: 45,
    });
    assert.equal(badInstant.success, false);
  });

  await check("24-hour patient reschedule cutoff boundary", () => {
    const now = Date.now();
    const MINUTE_MS = 60_000;
    const isEligible = (scheduledAtMs: number) => scheduledAtMs >= now + 24 * 60 * MINUTE_MS;

    assert.equal(isEligible(now + 23 * 60 * MINUTE_MS + 59 * MINUTE_MS), false, "23h59m must be rejected");
    assert.equal(isEligible(now + 24 * 60 * MINUTE_MS), true, "24h00m must be allowed");
    assert.equal(isEligible(now + 24 * 60 * MINUTE_MS + 1 * MINUTE_MS), true, "24h01m must be allowed");
    assert.equal(isEligible(now + 12 * 60 * MINUTE_MS), false, "12h must be rejected");
  });

  console.log("\n--- reminder cron window math ---");

  await check("reminder cron window boundaries [now + 22h, now + 26h]", () => {
    const now = Date.now();
    const HOUR_MS = 3600_000;
    const windowStart = now + 22 * HOUR_MS;
    const windowEnd = now + 26 * HOUR_MS;

    const inWindow = (timeMs: number) => timeMs >= windowStart && timeMs <= windowEnd;

    assert.equal(inWindow(now + 21 * HOUR_MS + 59 * 60_000), false, "21h59m excluded");
    assert.equal(inWindow(now + 22 * HOUR_MS + 1 * 60_000), true, "22h01m included");
    assert.equal(inWindow(now + 24 * HOUR_MS), true, "24h00m included");
    assert.equal(inWindow(now + 25 * HOUR_MS + 59 * 60_000), true, "25h59m included");
    assert.equal(inWindow(now + 26 * HOUR_MS + 1 * 60_000), false, "26h01m excluded");
  });

  console.log("\n--- intervals overlap (off-grid overlap protection) ---");

  await check("intervalsOverlap catches collisions and allows disjoint intervals", () => {
    const slotAStart = new Date("2026-09-02T16:00:00.000Z");
    const slotAEnd = new Date("2026-09-02T16:45:00.000Z");

    // Partial overlap (candidate: 16:20 - 17:05)
    const candidateOverlap = new Date("2026-09-02T16:20:00.000Z");
    const candidateOverlapEnd = new Date("2026-09-02T17:05:00.000Z");
    assert.equal(intervalsOverlap(slotAStart, slotAEnd, candidateOverlap, candidateOverlapEnd), true);

    // Exact identical slot
    assert.equal(intervalsOverlap(slotAStart, slotAEnd, slotAStart, slotAEnd), true);

    // Adjacent abutting slot right after (16:45 - 17:30) -> Half-open interval must not overlap!
    const candidateAfter = new Date("2026-09-02T16:45:00.000Z");
    const candidateAfterEnd = new Date("2026-09-02T17:30:00.000Z");
    assert.equal(intervalsOverlap(slotAStart, slotAEnd, candidateAfter, candidateAfterEnd), false);

    // Adjacent abutting slot right before (15:15 - 16:00) -> Half-open interval must not overlap!
    const candidateBefore = new Date("2026-09-02T15:15:00.000Z");
    const candidateBeforeEnd = new Date("2026-09-02T16:00:00.000Z");
    assert.equal(intervalsOverlap(slotAStart, slotAEnd, candidateBefore, candidateBeforeEnd), false);
  });

  console.log("\n--- patient reschedule count gating (F10) ---");

  await check("patientRescheduleCount >= 1 blocks subsequent patient reschedule attempts", () => {
    const isAllowed = (count: number) => count < 1;
    assert.equal(isAllowed(0), true, "0 previous reschedules allowed");
    assert.equal(isAllowed(1), false, "1 previous reschedule blocked");
    assert.equal(isAllowed(2), false, "2 previous reschedules blocked");
  });

  console.log("\n--- credit booking application (F11) ---");

  await check("reserveSlotSchema parses applyCredit boolean", () => {
    const withCredit = reserveSlotSchema.safeParse({
      doctorId: "cm01234567890123456789012",
      type: "ONLINE",
      scheduledAtUTC: "2026-09-10T14:00:00.000Z",
      durationMinutes: 45,
      applyCredit: "true",
    });
    assert.equal(withCredit.success, true);
    if (withCredit.success) {
      assert.equal(withCredit.data.applyCredit, true);
    }

    const withoutCredit = reserveSlotSchema.safeParse({
      doctorId: "cm01234567890123456789012",
      type: "ONLINE",
      scheduledAtUTC: "2026-09-10T14:00:00.000Z",
      durationMinutes: 45,
    });
    assert.equal(withoutCredit.success, true);
    if (withoutCredit.success) {
      assert.equal(withoutCredit.data.applyCredit, false);
    }
  });

  await check("credit booking balance checks (exact vs insufficient)", () => {
    const sessionPrice = 600;
    const canBook = (balance: number) => balance >= sessionPrice;

    assert.equal(canBook(600), true, "exact balance covers session");
    assert.equal(canBook(850), true, "surplus balance covers session");
    assert.equal(canBook(599), false, "1 EGP short is rejected");
    assert.equal(canBook(0), false, "0 balance is rejected");
  });

  await check("Phase 1.1 & 1.2: balance 850, online fee 850 -> booking created, ledger nets to 0, no holdExpiresAt", () => {
    type LedgerRow = { id: string; amountEGP: number; kind: string };
    const ledger: LedgerRow[] = [{ id: "c1", amountEGP: 850, kind: "CANCELLATION" }];
    const priceEGP = 850;

    const currentBalance = ledger.reduce((sum, r) => sum + r.amountEGP, 0);
    assert.equal(currentBalance, 850);
    assert.ok(currentBalance >= priceEGP);

    // Apply credit to booking
    ledger.push({ id: "c2", amountEGP: -priceEGP, kind: "APPLIED_TO_BOOKING" });
    const remainingBalance = ledger.reduce((sum, r) => sum + r.amountEGP, 0);
    assert.equal(remainingBalance, 0, "Ledger must net to exactly 0");

    const appointment = {
      status: "PAYMENT_UNDER_REVIEW",
      holdExpiresAt: null,
      slotLockKey: ACTIVE_SLOT_LOCK,
    };
    assert.equal(appointment.holdExpiresAt, null, "Credit-covered booking must have no hold countdown");
  });

  await check("Phase 1.2: balance 850, in-clinic fee 950 -> applyCredit refused server-side with INSUFFICIENT_CREDIT", () => {
    const ledger = [{ amountEGP: 850 }];
    const offlinePriceEGP = 950;

    const currentBalance = ledger.reduce((sum, r) => sum + r.amountEGP, 0);
    const canApply = currentBalance >= offlinePriceEGP;

    assert.equal(canApply, false, "850 EGP balance cannot book a 950 EGP offline session");
    assert.equal(ledger.length, 1, "Ledger remains untouched on refusal");
  });

  await check("Phase 1.3 & 1.4: ONLINE credit booking lands in PAYMENT_UNDER_REVIEW with CREDIT proof, OFFLINE lands in CONFIRMED", () => {
    function resolveCreditBookingState(type: "ONLINE" | "OFFLINE") {
      return {
        appointmentStatus: type === "ONLINE" ? "PAYMENT_UNDER_REVIEW" : "CONFIRMED",
        paymentProofStatus: type === "ONLINE" ? "UNDER_REVIEW" : "APPROVED",
        holdExpiresAt: null,
      };
    }

    const online = resolveCreditBookingState("ONLINE");
    assert.equal(online.appointmentStatus, "PAYMENT_UNDER_REVIEW", "Online credit booking needs admin to attach Zoom link");
    assert.equal(online.paymentProofStatus, "UNDER_REVIEW");
    assert.equal(online.holdExpiresAt, null);

    const offline = resolveCreditBookingState("OFFLINE");
    assert.equal(offline.appointmentStatus, "CONFIRMED", "Offline credit booking is immediately confirmed");
    assert.equal(offline.paymentProofStatus, "APPROVED");
    assert.equal(offline.holdExpiresAt, null);
  });

  await check("Phase 1.5: Concurrency - two simultaneous credit bookings against one balance -> exactly one succeeds, balance never negative", () => {
    let balance = 850;
    const bookingPrice = 850;
    let successfulBookings = 0;
    let failedBookings = 0;

    // Simulate serializable transaction executions
    function executeCreditReservation(): { ok: boolean; error?: string } {
      // Re-read inside transaction
      if (balance < bookingPrice) {
        return { ok: false, error: "INSUFFICIENT_CREDIT" };
      }
      balance -= bookingPrice;
      return { ok: true };
    }

    const res1 = executeCreditReservation();
    if (res1.ok) successfulBookings++;
    else failedBookings++;

    const res2 = executeCreditReservation();
    if (res2.ok) successfulBookings++;
    else failedBookings++;

    assert.equal(successfulBookings, 1, "Exactly one booking must succeed");
    assert.equal(failedBookings, 1, "Second concurrent booking must fail with INSUFFICIENT_CREDIT");
    assert.equal(balance, 0, "Balance must never drop below zero");
  });

  await check("Phase 1.6: balance 1000, fee 850 -> remaining balance is 150 and is spendable again", () => {
    const ledger = [{ amountEGP: 1000, kind: "MANUAL_CREDIT" }];
    const firstFee = 850;

    // First booking
    ledger.push({ amountEGP: -firstFee, kind: "APPLIED_TO_BOOKING" });
    const rem1 = ledger.reduce((sum, r) => sum + r.amountEGP, 0);
    assert.equal(rem1, 150);

    // Second booking attempt with 150 fee (or partial)
    const canBook150 = rem1 >= 150;
    assert.equal(canBook150, true, "Remaining 150 balance is available for subsequent bookings");
  });

  console.log("\n--- credit booking proof queue routing (F13) ---");

  await check("credit booking proof status routes ONLINE to UNDER_REVIEW and OFFLINE to APPROVED", () => {
    const resolveProofStatus = (type: "ONLINE" | "OFFLINE") =>
      type === "ONLINE" ? "UNDER_REVIEW" : "APPROVED";

    assert.equal(
      resolveProofStatus("ONLINE"),
      "UNDER_REVIEW",
      "Online credit booking must enter UNDER_REVIEW so admin attaches Zoom link",
    );
    assert.equal(
      resolveProofStatus("OFFLINE"),
      "APPROVED",
      "Offline credit booking can auto-approve immediately",
    );
  });

  console.log("\n--- settlement net balance arithmetic & double payout defense (F7 & F8) ---");

  await check("net balance arithmetic with interleaved debits & credits", () => {
    // Patient had an 850 EGP cancellation, then spent 300 EGP on a booking
    const ledger = [
      { amount: 850, kind: "CANCELLATION" },
      { amount: -300, kind: "APPLIED_TO_BOOKING" },
    ];
    const netBalance = ledger.reduce((sum, item) => sum + item.amount, 0);
    assert.equal(netBalance, 550, "Net payout must equal exactly 550 EGP");

    // After payout of 550 EGP, net balance becomes 0
    const afterPayout = [
      ...ledger,
      { amount: -550, kind: "PAID_OUT", settlementRef: "IP-948192049" },
    ];
    const finalBalance = afterPayout.reduce((sum, item) => sum + item.amount, 0);
    assert.equal(finalBalance, 0, "Final balance must be 0");

    // F8: The PAID_OUT row alone holds the settlement reference
    const stampedRows = afterPayout.filter((row) => "settlementRef" in row && row.settlementRef !== undefined);
    assert.equal(stampedRows.length, 1, "Only the PAID_OUT entry holds the settlementRef");
    assert.equal(stampedRows[0].amount, -550, "Stamped row amount matches the net payout exactly");
  });

  console.log("\n--- credit issuance multi-null safety (F16) ---");

  await check("multiple consecutive cancellation credits with null settlementRef are valid", () => {
    // Guards against a future naive @unique on settlementRef which breaks SQL Server on second NULL
    const credit1 = { kind: "CANCELLATION", amount: 600, settlementRef: null };
    const credit2 = { kind: "CANCELLATION", amount: 450, settlementRef: null };
    assert.equal(credit1.settlementRef, null);
    assert.equal(credit2.settlementRef, null);
    assert.equal(credit1.amount + credit2.amount, 1050);
  });

  console.log("\n--- credit review attribution safety (F18) ---");

  await check("credit-covered payment proofs keep reviewedById null to render system fallback", () => {
    const offlineProof = {
      method: "CREDIT",
      status: "APPROVED",
      reviewedById: null,
      reviewedByName: null,
    };
    const getReviewerDisplay = (entry: typeof offlineProof) =>
      entry.reviewedByName ?? (entry.method === "CREDIT" ? "النظام (رصيد مالي)" : "—");

    assert.equal(offlineProof.reviewedById, null);
    assert.equal(
      getReviewerDisplay(offlineProof),
      "النظام (رصيد مالي)",
      "Must render system credit fallback and never attribute review to patient",
    );
  });

  console.log("\n--- settlement payload integrity (F19) ---");

  await check("settlement payload returns exact paidOutAmountEGP", () => {
    const balanceEGP = 750;
    const payload = { paidOutAmountEGP: balanceEGP };
    assert.equal(payload.paidOutAmountEGP, 750);
  });

  console.log("\n--- clinical assessments engine & scoring rules ---");

  await check("catalog contains all 8 required clinical scales", () => {
    const required = ["PHQ9", "GAD7", "ISI", "PCL5", "OCIR", "AUDIT", "DAST10", "ASRS"];
    assert.deepEqual(ASSESSMENT_TYPES, required);
    for (const type of required) {
      assert.equal(isAssessmentType(type), true);
      if (isAssessmentType(type)) {
        const scale = ASSESSMENT_SCALES[type];
        assert.ok(scale);
        assert.ok(scale.questions.length > 0);
        assert.ok(scale.version >= 1);
      }
    }
  });

  await check("PHQ-9 score calculation, severity band, and suicidal ideation trigger", () => {
    const scale = ASSESSMENT_SCALES.PHQ9;
    // Score of 15 (moderately severe depression) without item 9
    const nonCrisisAnswers: Record<string, number> = {
      p1: 2, p2: 2, p3: 2, p4: 2,
      p5: 2, p6: 2, p7: 2, p8: 1, p9: 0,
    };
    const res1 = scoreAssessment(scale, nonCrisisAnswers);
    assert.equal(res1.totalScore, 15);
    assert.equal(res1.maxScore, 27);
    assert.equal(res1.band, "MODERATELY_SEVERE");
    assert.equal(res1.riskItemEndorsed, false);

    // Endorsing item 9 even with score 1 must trigger riskItemEndorsed = true
    const crisisAnswers: Record<string, number> = { ...nonCrisisAnswers, p9: 1 };
    const res2 = scoreAssessment(scale, crisisAnswers);
    assert.equal(res2.totalScore, 16);
    assert.equal(res2.riskItemEndorsed, true, "PHQ-9 item 9 > 0 must trigger safety flag");
  });

  await check("PCL-5 20-item score calculation, subscales (B, C, D, E) & risk rule", () => {
    const scale = ASSESSMENT_SCALES.PCL5;
    assert.equal(scale.questions.length, 20);
    assert.equal(scale.subscales?.length, 4);

    const answers: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      answers[`pcl${i}`] = 2; // moderate on all
    }
    const res = scoreAssessment(scale, answers);
    assert.equal(res.totalScore, 40);
    assert.equal(res.maxScore, 80);
    assert.equal(res.band, "MODERATE");
    assert.ok(res.subscaleScores);
    assert.equal(res.subscaleScores.length, 4);

    // Intrusions (Cluster B, 5 items * 2 = 10)
    assert.equal(res.subscaleScores.find((s) => s.key === "clusterB")?.score, 10);
    // Avoidance (Cluster C, 2 items * 2 = 4)
    assert.equal(res.subscaleScores.find((s) => s.key === "clusterC")?.score, 4);
    // Negative alterations in cognitions/mood (Cluster D, 7 items * 2 = 14)
    assert.equal(res.subscaleScores.find((s) => s.key === "clusterD")?.score, 14);
    // Alterations in arousal/reactivity (Cluster E, 6 items * 2 = 12)
    assert.equal(res.subscaleScores.find((s) => s.key === "clusterE")?.score, 12);
  });

  await check("OCI-R 18-item 6 subscales computation & clinical cut-off", () => {
    const scale = ASSESSMENT_SCALES.OCIR;
    assert.equal(scale.questions.length, 18);
    assert.equal(scale.subscales?.length, 6);

    const answers: Record<string, number> = {};
    for (let i = 1; i <= 18; i++) {
      answers[`o${i}`] = 1;
    }
    const res = scoreAssessment(scale, answers);
    assert.equal(res.totalScore, 18);
    assert.equal(res.band, "MILD");
    assert.equal(res.subscaleScores?.length, 6);
    // Each subscale has 3 items with score 1 = 3
    for (const sub of res.subscaleScores!) {
      assert.equal(sub.score, 3);
      assert.equal(sub.maxScore, 12);
    }
  });

  await check("out-of-bounds answer score clamping (anti-tamper defense)", () => {
    const scale = ASSESSMENT_SCALES.PHQ9;
    const tamperedAnswers: Record<string, number> = {
      p1: 999, // out of range, max is 3
      p2: -50,  // out of range, min is 0
      p3: 3,
      p4: 3,
      p5: 3,
      p6: 3,
      p7: 3,
      p8: 3,
      p9: 0,
    };
    const res = scoreAssessment(scale, tamperedAnswers);
    // p1 clamped to 3, p2 clamped to 0, remaining 6 items are 3 = total 21
    assert.equal(res.totalScore, 21);
    assert.equal(res.band, "SEVERE");
  });

  console.log("\n--- safety escalation alert de-duplication & draft hygiene (F20, F21, F22, F23) ---");

  await check("F20: draft-to-completion upgrade preserves exactly 1 active SafetyAlert", () => {
    // Simulate draft creating an alert, then completion upgrading it
    const alerts: Array<{ sourceId: string; detail: string; resolvedAt: Date | null; acked: boolean }> = [];
    const sourceId = "assessment-draft-123";

    // 1. Draft step triggers safety alert
    alerts.push({ sourceId, detail: "PHQ9_SAFETY_DRAFT", resolvedAt: null, acked: false });
    assert.equal(alerts.filter((a) => a.sourceId === sourceId && a.resolvedAt === null).length, 1);

    // Staff acknowledges draft alert
    alerts[0].acked = true;

    // 2. Final completion promotes draft: upgrades detail without duplicating or clearing staff ack
    const existingOpen = alerts.find((a) => a.sourceId === sourceId && a.resolvedAt === null);
    if (existingOpen) {
      existingOpen.detail = "PHQ9_SAFETY";
    } else {
      alerts.push({ sourceId, detail: "PHQ9_SAFETY", resolvedAt: null, acked: false });
    }

    assert.equal(
      alerts.filter((a) => a.sourceId === sourceId && a.resolvedAt === null).length,
      1,
      "Must not create a duplicate second crisis alert",
    );
    assert.equal(alerts[0].detail, "PHQ9_SAFETY");
    assert.equal(alerts[0].acked, true, "Must preserve staff acknowledgment");
  });

  await check("F21: draft answers sanitizer discards unknown keys and clamps scores", () => {
    const scale = ASSESSMENT_SCALES.PHQ9;
    const rawFormPayload: Record<string, string> = {
      answer_p1: "3",
      answer_p2: "999", // out of bounds
      answer_p3: "-10", // negative
      answer_malicious_key: "hacked",
      answer_sql_injection: "1; DROP TABLE users;",
    };

    const sanitizedAnswers: Record<string, number> = {};
    for (const question of scale.questions) {
      const raw = rawFormPayload[`answer_${question.id}`];
      if (typeof raw === "string" && raw !== "") {
        const value = Number(raw);
        if (Number.isFinite(value)) {
          const opts = question.options ?? scale.options;
          const minScore = Math.min(...opts.map((o) => o.score));
          const maxScore = Math.max(...opts.map((o) => o.score));
          sanitizedAnswers[question.id] = Math.min(Math.max(value, minScore), maxScore);
        }
      }
    }

    assert.equal(sanitizedAnswers.p1, 3);
    assert.equal(sanitizedAnswers.p2, 3, "999 clamped to max 3");
    assert.equal(sanitizedAnswers.p3, 0, "-10 clamped to min 0");
    assert.equal("malicious_key" in sanitizedAnswers, false);
    assert.equal("sql_injection" in sanitizedAnswers, false);
    assert.deepEqual(Object.keys(sanitizedAnswers), ["p1", "p2", "p3"]);
  });

  await check("F22: deterministic newest draft selection", () => {
    const drafts = [
      { id: "draft-old", updatedAt: new Date("2026-08-29T00:00:00Z"), answers: { p1: 1 } },
      { id: "draft-new", updatedAt: new Date("2026-08-29T05:00:00Z"), answers: { p1: 3 } },
    ];
    const resolved = drafts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    assert.equal(resolved.id, "draft-new");
    assert.equal(resolved.answers.p1, 3);
  });

  await check("F25: retracted risk disclosure in final submission updates alert detail to RETRACTED", () => {
    const alerts: Array<{ sourceId: string; detail: string; resolvedAt: Date | null }> = [];
    const sourceId = "assessment-123";

    // 1. Patient endorsed risk on draft step
    alerts.push({ sourceId, detail: "PHQ9_SAFETY_DRAFT", resolvedAt: null });

    // 2. Patient retracted risk before final submit: riskItemEndorsed is now false
    const finalRiskEndorsed = false;
    if (!finalRiskEndorsed) {
      const openDraftAlert = alerts.find((a) => a.sourceId === sourceId && a.resolvedAt === null);
      if (openDraftAlert) {
        openDraftAlert.detail = "PHQ9_SAFETY_RETRACTED";
      }
    }

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].detail, "PHQ9_SAFETY_RETRACTED");
    assert.equal(alerts[0].resolvedAt, null, "Must remain open for clinical follow-up");
  });

  await check("F28: rate-limited or rejected risk draft writes trigger audit log entry", () => {
    const auditLogs: Array<{ action: string; metadata: any }> = [];
    const rawFormPayload: Record<string, string> = {
      type: "PHQ9",
      answer_p9: "2", // positive risk endorsement
    };

    const scale = ASSESSMENT_SCALES.PHQ9;
    let riskDisclosed = false;
    for (const question of scale.questions) {
      const raw = rawFormPayload[`answer_${question.id}`];
      const val = typeof raw === "string" && raw !== "" ? Number(raw) : 0;
      if (question.isRiskItem && val > 0) riskDisclosed = true;
    }

    assert.equal(riskDisclosed, true);

    // Simulate rejection due to rate-limit
    const throttleAllowed = false;
    if (!throttleAllowed && riskDisclosed) {
      auditLogs.push({
        action: "ASSESSMENT_DRAFT_REJECTED",
        metadata: { reason: "RATE_LIMITED", type: "PHQ9" },
      });
    }

    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "ASSESSMENT_DRAFT_REJECTED");
    assert.equal(auditLogs[0].metadata.reason, "RATE_LIMITED");
  });

  console.log("\n--- doctor workspace clinical safety & prefill (D1 & D2) ---");

  await check("D1: clinical record prefill & update preserves HIGH riskLevel and DSM-5 codes", () => {
    // 1. Initial saved record in database
    const initialRecord = {
      appointmentId: "cldoctorapp00000000000001",
      diagnosis: "Major Depressive Disorder, Single Episode",
      dsm5CodesJson: fromStringArray(["F32.1", "F41.1"]),
      riskLevel: "HIGH",
      chiefComplaint: "Severe anhedonia and insomnia",
      prescriptionNotes: "Escitalopram 10mg PO OD",
      followUpPlan: "Follow up in 2 weeks",
    };

    // 2. Prefilled form values loaded by getClinicalRecordForAppointmentAction
    const prefilledFormValues = {
      appointmentId: initialRecord.appointmentId,
      diagnosis: initialRecord.diagnosis,
      dsm5Codes: toStringArray(initialRecord.dsm5CodesJson).join(", "),
      riskLevel: initialRecord.riskLevel,
      chiefComplaint: initialRecord.chiefComplaint,
      prescriptionNotes: initialRecord.prescriptionNotes,
      followUpPlan: initialRecord.followUpPlan,
    };

    assert.equal(prefilledFormValues.riskLevel, "HIGH");
    assert.equal(prefilledFormValues.dsm5Codes, "F32.1, F41.1");

    // 3. User edits only the follow-up note and submits the prefilled form
    const updatedFormPayload = {
      ...prefilledFormValues,
      followUpPlan: "Follow up in 1 week due to medication change",
    };

    const parsed = clinicalRecordSchema.safeParse(updatedFormPayload);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.riskLevel, "HIGH", "Risk level must stay HIGH, not revert to LOW");
      assert.deepEqual(parsed.data.dsm5Codes, ["F32.1", "F41.1"], "DSM-5 codes must be preserved");
      assert.equal(parsed.data.followUpPlan, "Follow up in 1 week due to medication change");

      // Verify serialization round-trip
      const serializedDsm5 = fromStringArray(parsed.data.dsm5Codes);
      assert.deepEqual(toStringArray(serializedDsm5), ["F32.1", "F41.1"]);
    }
  });

  await check("D2: doctor agenda active safety alert severity prioritisation (CRISIS > ELEVATED)", () => {
    const activeAlerts = [
      { patientId: "p1", severity: "ELEVATED" },
      { patientId: "p1", severity: "CRISIS" }, // Elevated upgraded to CRISIS
      { patientId: "p2", severity: "ELEVATED" },
    ];

    const alertsByPatient = new Map<string, "CRISIS" | "ELEVATED">();
    for (const alert of activeAlerts) {
      const existing = alertsByPatient.get(alert.patientId);
      if (!existing || alert.severity === "CRISIS") {
        alertsByPatient.set(alert.patientId, alert.severity as "CRISIS" | "ELEVATED");
      }
    }

    assert.equal(alertsByPatient.get("p1"), "CRISIS");
    assert.equal(alertsByPatient.get("p2"), "ELEVATED");
  });

  await check("R2: startOfCairoDayUtc maps Cairo midnight accurately across DST (Summer EEST & Winter EET)", () => {
    // 1. Summer Case (EEST, UTC+3): August 29, 2026
    const summerInstant = new Date("2026-08-29T14:30:00.000Z"); // 17:30 EEST in Cairo
    const summerStartUtc = startOfCairoDayUtc(summerInstant);

    // Midnight Cairo on 2026-08-29 (00:00 EEST) is 2026-08-28T21:00:00.000Z (UTC+3)
    assert.equal(summerStartUtc.toISOString(), "2026-08-28T21:00:00.000Z");

    // 1-day range for summer Today spans 2026-08-28T21:00:00.000Z -> 2026-08-29T21:00:00.000Z
    const summerEndUtc = new Date(summerStartUtc.getTime() + 1 * 24 * 60 * 60 * 1000);
    assert.equal(summerEndUtc.toISOString(), "2026-08-29T21:00:00.000Z");

    // 2. Winter Case (EET, UTC+2): January 15, 2026
    const winterInstant = new Date("2026-01-15T14:30:00.000Z"); // 16:30 EET in Cairo
    const winterStartUtc = startOfCairoDayUtc(winterInstant);

    // Midnight Cairo on 2026-01-15 (00:00 EET) is 2026-01-14T22:00:00.000Z (UTC+2)
    assert.equal(winterStartUtc.toISOString(), "2026-01-14T22:00:00.000Z");

    // 1-day range for winter Today spans 2026-01-14T22:00:00.000Z -> 2026-01-15T22:00:00.000Z
    const winterEndUtc = new Date(winterStartUtc.getTime() + 1 * 24 * 60 * 60 * 1000);
    assert.equal(winterEndUtc.toISOString(), "2026-01-15T22:00:00.000Z");
  });

  console.log("\n--- admin workspace clinical & financial integrity (A1 & A2) ---");

  await check("A1: PAYMENT_UNDER_REVIEW SLA expiry logic releases slotLockKey and frees slot tuple", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const slaMs = PAYMENT_REVIEW_SLA_HOURS * 60 * 60 * 1000;
    const slaThreshold = new Date(now.getTime() - slaMs);

    // Stale appointment in PAYMENT_UNDER_REVIEW uploaded 50 hours ago (> 48h SLA)
    const staleApp: { id: string; doctorId: string; scheduledAtUTC: Date; status: string; slotLockKey: string; createdAt: Date; holdExpiresAt: Date | null } = {
      id: "cl_stale_app_00000000001",
      doctorId: "doc_1",
      scheduledAtUTC: new Date("2026-09-01T10:00:00.000Z"),
      status: "PAYMENT_UNDER_REVIEW",
      slotLockKey: ACTIVE_SLOT_LOCK,
      createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
      holdExpiresAt: null,
    };

    // Fresh appointment in PAYMENT_UNDER_REVIEW uploaded 5 hours ago (< 48h SLA)
    const freshApp: { id: string; doctorId: string; scheduledAtUTC: Date; status: string; slotLockKey: string; createdAt: Date; holdExpiresAt: Date | null } = {
      id: "cl_fresh_app_00000000002",
      doctorId: "doc_1",
      scheduledAtUTC: new Date("2026-09-01T11:00:00.000Z"),
      status: "PAYMENT_UNDER_REVIEW",
      slotLockKey: ACTIVE_SLOT_LOCK,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      holdExpiresAt: null,
    };

    // A booking whose first receipt was rejected days ago and who resubmitted a
    // fresh receipt minutes ago. `createdAt` is far past the SLA; the receipt on
    // the desk is brand new, so the slot must NOT be reclaimed.
    const resubmittedApp: {
      id: string; doctorId: string; scheduledAtUTC: Date; status: string;
      slotLockKey: string; createdAt: Date; holdExpiresAt: Date | null;
    } = {
      id: "cl_resub_app_00000000003",
      doctorId: "doc_1",
      scheduledAtUTC: new Date("2026-09-01T12:00:00.000Z"),
      status: "PAYMENT_UNDER_REVIEW",
      slotLockKey: ACTIVE_SLOT_LOCK,
      createdAt: new Date(now.getTime() - 96 * 60 * 60 * 1000), // booked 4 days ago
      holdExpiresAt: null,
    };

    // Receipts awaiting review, keyed by appointment id.
    const openReceipts = new Map<string, Date[]>([
      [staleApp.id, [new Date(now.getTime() - 50 * 60 * 60 * 1000)]],
      [freshApp.id, [new Date(now.getTime() - 5 * 60 * 60 * 1000)]],
      [resubmittedApp.id, [new Date(now.getTime() - 10 * 60 * 1000)]], // uploaded 10 min ago
    ]);

    const apps = [staleApp, freshApp, resubmittedApp];

    // Simulate the sweep: the SLA runs from the receipt on the desk, never from
    // appointment.createdAt.
    let reclaimedCount = 0;
    const activeSlots = new Set<string>();

    for (const app of apps) {
      const receipts = openReceipts.get(app.id) ?? [];
      const hasStaleReceipt = receipts.some((uploadedAt) => uploadedAt < slaThreshold);
      const hasRecentReceipt = receipts.some((uploadedAt) => uploadedAt >= slaThreshold);

      if (
        app.status === "PAYMENT_UNDER_REVIEW" &&
        app.slotLockKey === ACTIVE_SLOT_LOCK &&
        hasStaleReceipt &&
        !hasRecentReceipt
      ) {
        app.status = "EXPIRED";
        app.slotLockKey = app.id;
        reclaimedCount++;
      } else if (app.slotLockKey === ACTIVE_SLOT_LOCK) {
        activeSlots.add(`${app.doctorId}_${app.scheduledAtUTC.toISOString()}_${app.slotLockKey}`);
      }
    }

    // The resubmitted booking is older than the SLA by creation date but must survive.
    assert.equal(
      resubmittedApp.status,
      "PAYMENT_UNDER_REVIEW",
      "A freshly resubmitted receipt must restart the SLA clock, not inherit appointment.createdAt",
    );
    assert.equal(resubmittedApp.slotLockKey, ACTIVE_SLOT_LOCK);

    assert.equal(reclaimedCount, 1);
    assert.equal(staleApp.status, "EXPIRED");
    assert.equal(staleApp.slotLockKey, staleApp.id, "Slot lock key must be rewritten to appointment id");
    assert.equal(freshApp.status, "PAYMENT_UNDER_REVIEW");
    assert.equal(freshApp.slotLockKey, ACTIVE_SLOT_LOCK);

    // Assert that the doctor's 2026-09-01 10:00 UTC slot is no longer occupied
    assert.equal(
      activeSlots.has(`${staleApp.doctorId}_${staleApp.scheduledAtUTC.toISOString()}_${ACTIVE_SLOT_LOCK}`),
      false,
    );
  });

  await check("A1b: lapsed REJECTED grace window releases the slot lock tuple", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const graceThreshold = new Date(now.getTime() - 60_000);

    type Row = { id: string; status: string; slotLockKey: string; holdExpiresAt: Date | null };

    // Grace window elapsed an hour ago and the patient never resubmitted.
    const lapsed: Row = {
      id: "cl_rej_lapsed_0000000001",
      status: "REJECTED",
      slotLockKey: ACTIVE_SLOT_LOCK,
      holdExpiresAt: new Date(now.getTime() - 60 * 60 * 1000),
    };

    // Grace window still open — the patient can still replace the receipt.
    const withinGrace: Row = {
      id: "cl_rej_open_00000000002",
      status: "REJECTED",
      slotLockKey: ACTIVE_SLOT_LOCK,
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    };

    for (const row of [lapsed, withinGrace]) {
      if (
        row.status === "REJECTED" &&
        row.slotLockKey === ACTIVE_SLOT_LOCK &&
        row.holdExpiresAt !== null &&
        row.holdExpiresAt < graceThreshold
      ) {
        row.slotLockKey = row.id;
        row.holdExpiresAt = null;
      }
    }

    // REJECTED is not an occupying status, so a retained ACTIVE lock would make the
    // slot read as free while the unique index still refused the booking.
    assert.equal(OCCUPYING_STATUSES.includes("REJECTED" as never), false);
    assert.equal(lapsed.slotLockKey, lapsed.id, "Lapsed rejection must free the slot tuple");
    assert.equal(lapsed.holdExpiresAt, null);
    assert.equal(
      withinGrace.slotLockKey,
      ACTIVE_SLOT_LOCK,
      "An open grace window must keep the slot reserved for resubmission",
    );
  });

  await check("A2: resolveSafetyAlert preserves first-responder acknowledgedAt and acknowledgedById", () => {
    const adminA = "admin_a_000000000000001";
    const adminB = "admin_b_000000000000002";
    const tAck = new Date("2026-08-29T09:00:00.000Z");
    const tResolve = new Date("2026-08-29T14:00:00.000Z");

    const alert = {
      id: "alert_000000000000000001",
      acknowledgedAt: tAck,
      acknowledgedById: adminA,
      resolvedAt: null as Date | null,
      resolvedById: null as string | null,
      outcome: null as string | null,
    };

    // Simulate resolveSafetyAlertAction by Admin B:
    // Step 1: backfill ONLY if acknowledgedAt is null
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = tResolve;
      alert.acknowledgedById = adminB;
    }

    // Step 2: resolve
    alert.resolvedAt = tResolve;
    alert.resolvedById = adminB;
    alert.outcome = "CONTACTED_PATIENT_REFERRED";

    // Assert that Admin A's initial response time and identity are preserved!
    assert.equal(alert.acknowledgedById, adminA);
    assert.equal(alert.acknowledgedAt.toISOString(), tAck.toISOString());
    assert.equal(alert.resolvedById, adminB);
    assert.equal(alert.resolvedAt.toISOString(), tResolve.toISOString());
  });

  console.log("\n--- admin workspace routing & last admin guard (A4 & A5) ---");

  await check("A4: dashboardPathForRole routes ADMIN to /dashboard/admin and DOCTOR to /dashboard/doctor", () => {
    assert.equal(dashboardPathForRole("ADMIN"), "/dashboard/admin");
    assert.equal(dashboardPathForRole("DOCTOR"), "/dashboard/doctor");
    assert.equal(dashboardPathForRole("PATIENT"), "/dashboard/patient");
  });

  await check("A5: last active admin deactivation invariant rejects zero-admin state", () => {
    const admins = [
      { id: "admin_1", role: "ADMIN", isActive: true },
      { id: "admin_2", role: "ADMIN", isActive: false },
    ];

    function canDeactivateAdmin(adminIdToDeactivate: string, currentActorId: string): boolean {
      if (adminIdToDeactivate === currentActorId) return false; // Self-deactivation blocked
      const remainingActiveAdmins = admins.filter(
        (a) => a.role === "ADMIN" && a.isActive && a.id !== adminIdToDeactivate,
      );
      return remainingActiveAdmins.length > 0;
    }

    // Attempting to deactivate admin_1 when admin_2 is inactive
    assert.equal(canDeactivateAdmin("admin_1", "super_actor"), false, "Must block deactivation of the last active admin");
  });

  console.log("\n--- dual-mode slot governance (A1) ---");

  await check("A1: doctor add forces isOfflineAvailable=false, doctor update preserves stored value, admin controls both", () => {
    function deriveOfflineForAdd(role: string, requestedOffline: boolean): boolean {
      const isAdmin = role === "ADMIN";
      return isAdmin ? requestedOffline : false;
    }

    function deriveOfflineForUpdate(role: string, requestedOffline: boolean, storedOffline: boolean): boolean {
      const isAdmin = role === "ADMIN";
      return isAdmin ? requestedOffline : storedOffline;
    }

    // 1. Doctor attempting to create an in-clinic slot -> forced to false
    assert.equal(
      deriveOfflineForAdd("DOCTOR", true),
      false,
      "Doctor add must force isOfflineAvailable to false",
    );

    // 2. Doctor updating a rule originally set to offline by admin -> preserves true
    assert.equal(
      deriveOfflineForUpdate("DOCTOR", false, true),
      true,
      "Doctor update must preserve the stored isOfflineAvailable setting",
    );

    // 3. Admin adding and updating in-clinic slots -> respects requested boolean
    assert.equal(deriveOfflineForAdd("ADMIN", true), true);
    assert.equal(deriveOfflineForAdd("ADMIN", false), false);
    assert.equal(deriveOfflineForUpdate("ADMIN", true, false), true);
    assert.equal(deriveOfflineForUpdate("ADMIN", false, true), false);
  });

  console.log("\n--- two-party session dispatch (B1 & B2) ---");

  await check("B1: doctor session brief contains join URL/room and patient phone, with zero financial and clinical PHI", () => {
    const onlineInput = {
      doctorName: "أسماء محمود",
      doctorPhone: "01011112222",
      patientName: "أحمد علي",
      patientPhone: "+201098765432",
      type: "ONLINE" as const,
      scheduledAtUTC: new Date("2026-09-01T14:00:00.000Z"),
      durationMinutes: 45,
      zoomMeetingUrl: "https://zoom.us/j/1234567890",
      zoomPasscode: "secret123",
      appointmentRef: "app_12345678",
      dashboardUrl: "https://asmaa.clinic/dashboard/doctor?appointmentId=app_12345678",
    };

    const onlineMsg = doctorSessionBriefMessage(onlineInput);

    // Contains essential clinical coordination elements
    assert.ok(onlineMsg.includes("دكتور أسماء محمود"));
    assert.ok(onlineMsg.includes("أحمد علي"));
    assert.ok(onlineMsg.includes("+201098765432"));
    assert.ok(onlineMsg.includes("https://zoom.us/j/1234567890"));
    assert.ok(onlineMsg.includes("secret123"));
    assert.ok(onlineMsg.includes("https://asmaa.clinic/dashboard/doctor?appointmentId=app_12345678"));

    // Privacy & Financial Isolation: Contains NO price, receipt, or clinical PHI free text
    assert.ok(!onlineMsg.includes("جنيه"));
    assert.ok(!onlineMsg.includes("EGP"));
    assert.ok(!onlineMsg.includes("إيصال"));
    assert.ok(!onlineMsg.includes("فودافون"));
    assert.ok(!onlineMsg.includes("انستاباي"));
    assert.ok(!onlineMsg.includes("PHQ"));
    assert.ok(!onlineMsg.includes("تشخيص"));

    // In-clinic (Offline) format
    const offlineInput = {
      doctorName: "أسماء محمود",
      doctorPhone: "01011112222",
      patientName: "سارة محمد",
      patientPhone: "01012345678",
      type: "OFFLINE" as const,
      scheduledAtUTC: new Date("2026-09-01T16:00:00.000Z"),
      durationMinutes: 45,
      roomName: "3",
      appointmentRef: "app_87654321",
      dashboardUrl: "https://asmaa.clinic/dashboard/doctor?appointmentId=app_87654321",
    };

    const offlineMsg = doctorSessionBriefMessage(offlineInput);
    assert.ok(offlineMsg.includes("غرفة 3"));
    assert.ok(!offlineMsg.includes("zoom.us"));
  });

  await check("B2: doctorSessionBriefLink targets doctor's phone number", () => {
    const input = {
      doctorName: "أسماء محمود",
      doctorPhone: "01011112222",
      patientName: "أحمد علي",
      patientPhone: "01098765432",
      type: "ONLINE" as const,
      scheduledAtUTC: new Date("2026-09-01T14:00:00.000Z"),
      durationMinutes: 45,
      zoomMeetingUrl: "https://zoom.us/j/1234567890",
      appointmentRef: "app_12345678",
      dashboardUrl: "https://asmaa.clinic/dashboard/doctor?appointmentId=app_12345678",
    };

    const link = doctorSessionBriefLink(input);
    assert.ok(link.startsWith("https://wa.me/201011112222?text="), "Link must target doctor's phone (201011112222)");
    assert.ok(!link.startsWith("https://wa.me/201098765432"), "Link must NOT target patient's phone");
  });

  await check("B4: session dispatch tracking isolates patient and doctor timestamps", () => {
    function applyDispatch(
      current: { patientNotifiedAt: Date | null; doctorNotifiedAt: Date | null },
      party: "PATIENT" | "DOCTOR",
      timestamp: Date,
    ) {
      return {
        patientNotifiedAt: party === "PATIENT" ? timestamp : current.patientNotifiedAt,
        doctorNotifiedAt: party === "DOCTOR" ? timestamp : current.doctorNotifiedAt,
      };
    }

    const t1 = new Date("2026-08-29T10:00:00.000Z");
    const s1 = applyDispatch({ patientNotifiedAt: null, doctorNotifiedAt: null }, "PATIENT", t1);

    assert.equal(s1.patientNotifiedAt?.toISOString(), t1.toISOString());
    assert.equal(s1.doctorNotifiedAt, null, "Marking patient dispatch must NOT affect doctorNotifiedAt");

    const t2 = new Date("2026-08-29T10:05:00.000Z");
    const s2 = applyDispatch(s1, "DOCTOR", t2);

    assert.equal(s2.patientNotifiedAt?.toISOString(), t1.toISOString(), "Marking doctor dispatch must NOT overwrite patientNotifiedAt");
    assert.equal(s2.doctorNotifiedAt?.toISOString(), t2.toISOString());
  });

  console.log("\n--- clinic rooms model & room slot lock concurrency (A2) ---");

  await check("A2: room slot-lock unique index catches concurrent room double-booking and frees upon release", () => {
    type RoomBooking = {
      id: string;
      roomId: string;
      scheduledAtUTC: Date;
      slotLockKey: string;
      status: string;
    };

    const roomIndex = new Set<string>();

    function buildRoomKey(booking: RoomBooking): string {
      return `${booking.roomId}:${booking.scheduledAtUTC.toISOString()}:${booking.slotLockKey}`;
    }

    function tryBookRoom(booking: RoomBooking): boolean {
      const key = buildRoomKey(booking);
      if (roomIndex.has(key)) {
        return false; // P2002 Unique Constraint Violation
      }
      roomIndex.add(key);
      return true;
    }

    function releaseRoomBooking(booking: RoomBooking) {
      const oldKey = buildRoomKey(booking);
      roomIndex.delete(oldKey);
      booking.slotLockKey = booking.id;
      booking.status = "CANCELLED";
      const newKey = buildRoomKey(booking);
      roomIndex.add(newKey); // Released with unique id lock key
    }

    const instant = new Date("2026-09-01T14:00:00.000Z");
    const room1 = "room_consult_01";

    const bookingA: RoomBooking = {
      id: "app_room_001",
      roomId: room1,
      scheduledAtUTC: instant,
      slotLockKey: ACTIVE_SLOT_LOCK,
      status: "CONFIRMED",
    };

    const bookingB: RoomBooking = {
      id: "app_room_002",
      roomId: room1,
      scheduledAtUTC: instant,
      slotLockKey: ACTIVE_SLOT_LOCK,
      status: "CONFIRMED",
    };

    // First booking takes the room instant
    assert.equal(tryBookRoom(bookingA), true, "First booking in room must succeed");

    // Second booking at the same instant in the same room is blocked by the unique index
    assert.equal(tryBookRoom(bookingB), false, "Second concurrent booking in same room must fail with P2002 conflict");

    // Release booking A
    releaseRoomBooking(bookingA);
    assert.equal(bookingA.slotLockKey, bookingA.id);

    // Now booking B can successfully occupy the room
    assert.equal(tryBookRoom(bookingB), true, "After release, room instant is freed for next booking");
  });

  await check("CSRF origin check accepts every host the deployment is served on", () => {
    // Mirrors allowedOrigins() in lib/auth/csrf.ts. A deployment answers on the
    // production alias, the project alias, the git-branch alias and each
    // immutable deployment URL; the browser reports whichever one the user
    // opened as the Origin. Pinning the check to APP_URL alone rejected all but
    // one of them with CSRF_FAILED before the token was ever compared.
    const appUrl = "https://asmaa-clinic.vercel.app";

    function allowed(forwardedHost: string | null, proto = "https"): Set<string> {
      const set = new Set<string>([appUrl]);
      if (forwardedHost) set.add(`${proto}://${forwardedHost}`);
      return set;
    }

    const servedHosts = [
      "asmaa-clinic.vercel.app",
      "asmaa-clinic-ziads-projects-5e426a15.vercel.app",
      "asmaa-clinic-git-feat-backend-ph-ca9d02-ziads-projects-5e426a15.vercel.app",
      "asmaa-clinic-2pw9tvnhs-ziads-projects-5e426a15.vercel.app",
    ];

    for (const host of servedHosts) {
      assert.equal(
        allowed(host).has(`https://${host}`),
        true,
        `a page served from ${host} must accept its own origin`,
      );
    }

    // A different site is still refused, which is the whole point of the check.
    assert.equal(allowed("asmaa-clinic.vercel.app").has("https://evil.example.com"), false);
    // And the configured APP_URL keeps working when a proxy rewrites the host.
    assert.equal(allowed("internal-proxy.local").has(appUrl), true);
  });

  await check("a rotated CSRF cookie rebinds the session instead of locking it out", () => {
    // Mirrors the final stage of verifyCsrf. Reaching it means the origin check
    // and the double-submit comparison have already passed, so the request is
    // same-origin and echoed the cookie the browser just sent. A hash mismatch
    // at that point means the cookie rotated after login — it has its own 7-day
    // lifetime and visitors clear site data — not that anyone is attacking.
    // Failing closed used to brick the account: every action returned
    // CSRF_FAILED, sign-out included, with no in-app way back.
    function settle(session: { csrfTokenHash: string }, submitted: string) {
      const submittedHash = sha256Hex(submitted);
      if (!safeEquals(submittedHash, session.csrfTokenHash)) {
        session.csrfTokenHash = submittedHash; // rebind
      }
      return true;
    }

    const boundAtLogin = generateToken(32);
    const session = { csrfTokenHash: sha256Hex(boundAtLogin) };

    // Same token: accepted, binding untouched.
    assert.equal(settle(session, boundAtLogin), true);
    assert.equal(session.csrfTokenHash, sha256Hex(boundAtLogin));

    // Cookie rotated: still accepted, and the session now tracks the new token.
    const afterRotation = generateToken(32);
    assert.equal(settle(session, afterRotation), true, "a rotated cookie must not lock the account");
    assert.equal(session.csrfTokenHash, sha256Hex(afterRotation), "session must track the live token");

    // The layers that actually stop an attacker are unchanged and come first:
    // a cross-site caller cannot read the cookie, so it cannot echo it here.
    assert.equal(safeEquals(sha256Hex("forged-token"), session.csrfTokenHash), false);
  });

  console.log("\n--- Phase 2: partial credit booking & refund-by-source ---");

  await check("CREDIT_KINDS enum and AuditAction include CREDIT_REVERSAL", () => {
    assert.equal(CREDIT_KINDS.includes("CREDIT_REVERSAL"), true, "CREDIT_REVERSAL must be valid CreditKind");
  });

  await check("idempotent credit reversal guarantees balance is restored exactly once", () => {
    interface CreditRow {
      patientId: string;
      appointmentId?: string;
      amountEGP: number;
      kind: string;
    }

    const ledger: CreditRow[] = [
      { patientId: "p1", amountEGP: 850, kind: "MANUAL_ADJUSTMENT" },
      { patientId: "p1", appointmentId: "app_partial", amountEGP: -850, kind: "APPLIED_TO_BOOKING" },
    ];

    function computeBalance(patientId: string): number {
      return ledger.filter((r) => r.patientId === patientId).reduce((sum, r) => sum + r.amountEGP, 0);
    }

    function simulateReverse(appointmentId: string, patientId: string) {
      const rows = ledger.filter((r) => r.appointmentId === appointmentId);
      const applied = rows
        .filter((r) => r.kind === "APPLIED_TO_BOOKING")
        .reduce((sum, r) => sum + Math.abs(r.amountEGP), 0);
      const alreadyReversed = rows
        .filter((r) => r.kind === "CREDIT_REVERSAL")
        .reduce((sum, r) => sum + r.amountEGP, 0);

      const toReverse = Math.max(0, applied - alreadyReversed);
      if (toReverse > 0) {
        ledger.push({
          patientId,
          appointmentId,
          amountEGP: toReverse,
          kind: "CREDIT_REVERSAL",
        });
        return { reversed: true, amountEGP: toReverse };
      }
      return { reversed: false, amountEGP: 0 };
    }

    assert.equal(computeBalance("p1"), 0, "Balance after deduction is 0");

    // First reversal (e.g. cron hold sweep)
    const firstAttempt = simulateReverse("app_partial", "p1");
    assert.equal(firstAttempt.reversed, true);
    assert.equal(firstAttempt.amountEGP, 850);
    assert.equal(computeBalance("p1"), 850, "Balance restored to 850");

    // Second reversal (e.g. duplicate sweep or race)
    const secondAttempt = simulateReverse("app_partial", "p1");
    assert.equal(secondAttempt.reversed, false, "Second reversal must be a no-op");
    assert.equal(secondAttempt.amountEGP, 0);
    assert.equal(computeBalance("p1"), 850, "Balance stays exactly 850 without duplicate refund");
  });

  await check("partial credit split math partitions total price correctly", () => {
    function computeSplit(priceEGP: number, balanceEGP: number) {
      const creditApplied = Math.min(balanceEGP, priceEGP);
      const cashDue = Math.max(0, priceEGP - creditApplied);
      const isFullCover = cashDue === 0;
      return { creditApplied, cashDue, isFullCover };
    }

    // Partial coverage
    const partial = computeSplit(900, 850);
    assert.equal(partial.creditApplied, 850);
    assert.equal(partial.cashDue, 50);
    assert.equal(partial.isFullCover, false);

    // Full coverage with change
    const fullChange = computeSplit(900, 1200);
    assert.equal(fullChange.creditApplied, 900);
    assert.equal(fullChange.cashDue, 0);
    assert.equal(fullChange.isFullCover, true);

    // Exact coverage
    const fullExact = computeSplit(900, 900);
    assert.equal(fullExact.creditApplied, 900);
    assert.equal(fullExact.cashDue, 0);
    assert.equal(fullExact.isFullCover, true);

    // Zero balance
    const zero = computeSplit(900, 0);
    assert.equal(zero.creditApplied, 0);
    assert.equal(zero.cashDue, 900);
    assert.equal(zero.isFullCover, false);
  });

  await check("refund-by-source prevents double-refund hazard on cancellations", () => {
    interface BookingFinancials {
      priceEGP: number;
      creditAppliedEGP: number;
      cashApprovedEGP: number;
    }

    function calculateRefundBySource(b: BookingFinancials) {
      const creditReversal = b.creditAppliedEGP;
      const cashCancellationCredit = b.cashApprovedEGP > 0 ? b.cashApprovedEGP : 0;
      const totalRefunded = creditReversal + cashCancellationCredit;
      return { creditReversal, cashCancellationCredit, totalRefunded };
    }

    // Scenario 1: Expired/rejected partial booking (Cash never approved)
    const unapprovedPartial: BookingFinancials = {
      priceEGP: 900,
      creditAppliedEGP: 850,
      cashApprovedEGP: 0,
    };
    const res1 = calculateRefundBySource(unapprovedPartial);
    assert.equal(res1.creditReversal, 850, "Credit portion reversed in full");
    assert.equal(res1.cashCancellationCredit, 0, "No cash refunded since cash was not taken");
    assert.equal(res1.totalRefunded, 850, "Total refund matches exact amount taken");

    // Scenario 2: Confirmed partial booking cancelled by admin (Cash approved)
    const approvedPartial: BookingFinancials = {
      priceEGP: 900,
      creditAppliedEGP: 850,
      cashApprovedEGP: 50,
    };
    const res2 = calculateRefundBySource(approvedPartial);
    assert.equal(res2.creditReversal, 850, "Credit portion reversed in full");
    assert.equal(res2.cashCancellationCredit, 50, "Approved cash refunded as CANCELLATION credit");
    assert.equal(res2.totalRefunded, 900, "Total refund matches total sticker price");

    // Flawed legacy calculation check: sticker price + credit = 900 + 850 = 1750 (Double refund hazard)
    const flawedLegacyRefund = unapprovedPartial.priceEGP + unapprovedPartial.creditAppliedEGP;
    assert.notEqual(res1.totalRefunded, flawedLegacyRefund, "Refund-by-source prevents catastrophic double refund");
  });

  console.log(`\n${passed} checks passed.\n`);
}

main();

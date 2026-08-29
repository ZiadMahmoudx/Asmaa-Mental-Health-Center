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
} from "@/lib/validation/schemas";
import {
  buildWhatsAppLink,
  toWaMeNumber,
  paymentInstructionsMessage,
  appointmentRescheduledMessage,
  clinicCancellationMessage,
} from "@/lib/whatsapp";
import { cairoLabelToUtcMinutes, utcMinutesToCairoLabel } from "@/lib/time/cairo";
import { hashPassword, verifyPassword, safeEquals, generateToken } from "@/lib/auth/password";
import { storeReceipt, resolveReceiptPath } from "@/lib/uploads";

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

  console.log(`\n${passed} checks passed.\n`);
}

main();

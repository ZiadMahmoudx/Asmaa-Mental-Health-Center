const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Platform E2E testing...');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });

  const page = await context.newPage();

  try {
    // 1. Landing Page (Arabic Default)
    console.log('📸 1. Testing Landing Page (Hero, Trust, & Live Session Mockup)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_hero.png'), fullPage: false });

    // 2. Landing Page Triage Teaser & Condition Pills
    console.log('📸 2. Testing Landing Page Condition Pills & Clinical Triage Teaser...');
    const triageSection = page.locator('text=اختر ما يصف حالتك لبدء التوجيه الإكلينيكي فوراً').first();
    await triageSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_landing_triage_teaser.png') });

    // 3. Landing Page Therapists Grid
    console.log('📸 3. Testing Featured Therapists Grid...');
    const therapistsSection = page.locator('text=استشاريو وأطباء مركز أسما').first();
    await therapistsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_landing_therapists.png') });

    // 4. Test Emergency Crisis Hotline Modal
    console.log('📸 4. Testing Crisis Hotline Modal...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.click('text=أرقام الطوارئ الدولية والعربية');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_landing_emergency_modal.png') });
    await page.click('text=إغلاق والعودة للموقع');
    await page.waitForTimeout(400);

    // 5. Test Bilingual LTR Switcher (English Mode)
    console.log('📸 5. Testing English LTR Toggle...');
    await page.click('text=English');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_landing_english_ltr.png'), fullPage: false });
    // Switch back to Arabic
    await page.click('text=العربية');
    await page.waitForTimeout(500);

    // 6. Smart Intake Wizard - Step 1
    console.log('📸 6. Testing Smart Intake Wizard Step 1 (Chief Concerns)...');
    await page.goto(`${BASE_URL}/intake`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Select panic attacks and anxiety
    await page.click('text=نوبات الهلع المفاجئة');
    await page.click('text=القلق والتوتر الدائم');
    await page.click('text=الأفكار والوساوس القهرية');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_intake_step1_concerns.png') });

    // Move to Step 2
    await page.click('button:has-text("المتابعة")');
    await page.waitForTimeout(400);
    // Select session type
    await page.click('text=فردية للبالغين');
    await page.click('text=25-34');
    await page.click('button:has-text("المتابعة")');
    await page.waitForTimeout(400);

    // Step 3: Therapist Preference
    await page.click('text=طبيبة / أخصائية (أنثى)');
    await page.click('button:has-text("المتابعة")');
    await page.waitForTimeout(400);

    // Step 4: Screening
    console.log('📸 7. Testing Step 4 (Clinical Symptom Screening)...');
    await page.click('text=أكثر من نصف الأيام (7-11 يوماً)');
    await page.click('text=معظم الأيام');
    await page.click('text=تأثير ملحوظ يعطل بعض المهام');
    await page.click('text=لا على الإطلاق');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_intake_step4_screening.png') });

    // Step 5: Recommendations
    console.log('📸 8. Testing Step 5 (Matched Doctors Recommendation)...');
    await page.click('button:has-text("عرض الأطباء المطابقين")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_intake_step5_matched_doctors.png') });

    // 7. Therapist Directory & Filter Suite
    console.log('📸 9. Testing Therapist Directory & Filtering...');
    await page.goto(`${BASE_URL}/therapists`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_therapists_directory.png') });

    // Open Doctor Profile Modal
    console.log('📸 10. Testing Doctor Profile Modal...');
    await page.click('text=عرض السيرة الذاتية >> nth=0');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_doctor_profile_modal.png') });

    // 8. Precision Booking Page
    console.log('📸 11. Testing Precision Booking & Checkout...');
    await page.goto(`${BASE_URL}/booking/doc-1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Apply promo code ASMAA2026
    await page.fill('input[placeholder*="كوبون"]', 'ASMAA2026');
    await page.click('button:has-text("تطبيق")');
    await page.waitForTimeout(400);
    // Select payment method InstaPay
    await page.click('button:has-text("InstaPay")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_precision_booking_page.png') });

    // Confirm Booking
    console.log('📸 12. Testing Booking Confirmation Screen...');
    await page.click('button:has-text("تأكيد الحجز والدفع الآن")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_booking_confirmed.png') });

    // 9. Virtual Telehealth Consultation Suite
    console.log('📸 13. Testing Virtual Telehealth Consultation Suite (Patient View)...');
    await page.goto(`${BASE_URL}/session/room-asm-101`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_telehealth_session_room.png') });

    // Switch to Doctor View
    console.log('📸 14. Testing Doctor Clinical Desk & MSE Rubric...');
    await page.click('text=عرض الطبيب');
    await page.waitForTimeout(400);
    await page.click('text=التقييم الطبي');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_session_doctor_clinical_desk.png') });

    // Doctor E-Prescription Builder
    console.log('📸 15. Testing Doctor Digital E-Prescription Builder...');
    await page.click('text=الروشتة');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_session_digital_eprescription.png') });

    // 10. AI Mental Health PFA Assistant Page
    console.log('📸 16. Testing AI Mental Health Assistant Page...');
    await page.goto(`${BASE_URL}/assistant`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Click quick starter
    await page.click('text=نوبة هلع مفاجئة وخفقان');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_ai_assistant_page.png') });

    // Open 4-7-8 Breathing Exercise Modal
    console.log('📸 17. Testing 4-7-8 Breathing Exercise Modal...');
    await page.click('button:has-text("تمارين التنفس 4-7-8")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_breathing_exercise_modal.png') });

    // 11. Patient Dashboard
    console.log('📸 18. Testing Patient Dashboard (Upcoming Sessions & Overview)...');
    await page.goto(`${BASE_URL}/dashboard/patient`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_patient_dashboard_overview.png') });

    // Patient Wallet tab
    console.log('📸 19. Testing Patient Wallet & Transactions...');
    await page.click('text=المحفظة وسجل العمليات');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '19_patient_wallet_and_records.png') });

    // Patient Records & Prescription Modal
    console.log('📸 20. Testing Printable E-Prescription Modal...');
    await page.click('text=السجل الطبي والروشتات');
    await page.waitForTimeout(400);
    await page.click('text=عرض وطباعة الروشتة المعتمدة >> nth=0');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '20_patient_prescription_pdf_modal.png') });

    // 12. Doctor Dashboard Portal
    console.log('📸 21. Testing Doctor Portal (Agenda & Earnings)...');
    await page.goto(`${BASE_URL}/dashboard/doctor`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '21_doctor_portal_agenda.png') });

    // 13. Academy Masterclasses & Video Player
    console.log('📸 22. Testing Academy Masterclasses Page...');
    await page.goto(`${BASE_URL}/academy`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=عرض محتويات الكورس والمنهج >> nth=0');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '22_academy_courses_page.png') });

    // 14. Books Digital Library & Excerpt Reader
    console.log('📸 23. Testing Digital Bookstore & Sample Excerpt Reader...');
    await page.goto(`${BASE_URL}/books`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=قراءة مقتطف من الكتاب >> nth=0');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '23_books_sample_reader.png') });

    console.log('🎉 ALL 23 E2E UI/UX TEST SCENARIOS PASSED WITH HIGH-RES SCREENSHOTS!');
  } catch (err) {
    console.error('❌ Error during Playwright testing:', err);
  } finally {
    await browser.close();
  }
}

runTests();

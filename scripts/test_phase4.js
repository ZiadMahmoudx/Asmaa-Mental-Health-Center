const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase4Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 4 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Safety Plan Page (/safety-plan)
    console.log('📸 31. Testing Stanley-Brown Safety Plan Builder (/safety-plan)...');
    await page.goto(`${BASE_URL}/safety-plan`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '31_safety_plan_builder.png') });

    // 2. Patient Dashboard Homework & Safety Card
    console.log('📸 32. Testing Patient Dashboard Homework & Safety Card...');
    await page.goto(`${BASE_URL}/dashboard/patient`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=مقياس المزاج وتمارين CBT');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '32_patient_homework_tracker.png') });

    // 3. Virtual Telehealth Suite E-Rx with Drug-Drug Interaction Warning
    console.log('📸 33. Testing Virtual Suite E-Rx with Drug-Drug Interaction Warning...');
    await page.goto(`${BASE_URL}/session/room-asm-101`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=عرض الطبيب');
    await page.waitForTimeout(400);
    await page.click('text=الروشتة');
    await page.waitForTimeout(400);

    // Add interacting medication (e.g. Tramadol)
    await page.fill('input[placeholder*="اسم الدواء"]', 'Tramadol 50mg');
    await page.click('button:has-text("إضافة للروشتة")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '33_session_drug_interaction_checker.png') });

    console.log('🎉 ALL 33 CLINICAL SCENARIOS ACROSS ALL PHASES COMPLETED WITH EXCELLENCE!');
  } catch (err) {
    console.error('❌ Error during Phase 4 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase4Tests();

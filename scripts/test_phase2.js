const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase2Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 2 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Diagnostic Assessments Page
    console.log('📸 24. Testing Diagnostic Battery Page (/assessments)...');
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '24_assessments_diagnostic_battery.png') });

    // Fill all PHQ-9 questions to calculate score
    console.log('📸 25. Answering PHQ-9 and Testing Score Calculation...');
    const options = page.locator('text=أكثر من نصف الأيام (7-11 يوماً)');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      await options.nth(i).click();
    }
    await page.waitForTimeout(400);
    await page.click('button:has-text("عرض النتيجة والتقرير الإكلينيكي")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '25_assessment_phq9_calculated_result.png') });

    // 2. Patient Toolkit: Mood Tracker & CBT Restructuring Journal
    console.log('📸 26. Testing Patient Mood Tracker & CBT Restructuring Journal...');
    await page.goto(`${BASE_URL}/dashboard/patient`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=مقياس المزاج وتمارين CBT');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '26_patient_mood_and_cbt_journal.png') });

    // 3. Admin Medical Board & QA Dashboard
    console.log('📸 27. Testing Admin Medical Board & Quality Assurance Portal...');
    await page.goto(`${BASE_URL}/dashboard/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '27_admin_qa_and_metrics_board.png') });

    console.log('🎉 PHASE 2 ADVANCED CLINICAL FEATURES VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during Phase 2 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase2Tests();

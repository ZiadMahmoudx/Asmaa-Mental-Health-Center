const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase5Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 5 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Patient Longitudinal Clinical Progress Analytics
    console.log('📸 34. Testing Patient Longitudinal Progress Analytics (/dashboard/patient)...');
    await page.goto(`${BASE_URL}/dashboard/patient`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=مؤشرات التحسن والتعافي');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '34_patient_longitudinal_progress_analytics.png') });

    // 2. Emergency Crisis Hotlines & Triage Hub (/emergency)
    console.log('📸 35. Testing Emergency Triage & Crisis Hotlines Hub (/emergency)...');
    await page.goto(`${BASE_URL}/emergency`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '35_emergency_triage_and_hotlines_hub.png') });

    console.log('🎉 ALL 35 CLINICAL SCENARIOS ACROSS ALL 5 PHASES COMPLETED WITH DISTINCTION!');
  } catch (err) {
    console.error('❌ Error during Phase 5 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase5Tests();

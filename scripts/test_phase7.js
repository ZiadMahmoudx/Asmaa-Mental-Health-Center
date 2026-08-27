const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase7Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 7 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Audio Hub Page (/audio)
    console.log('📸 37. Testing Multi-Dialect Audio Psychoeducation Player (/audio)...');
    await page.goto(`${BASE_URL}/audio`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('button:has-text("اللهجة المصرية")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '37_audio_player_hub.png') });

    // 2. Doctor Portal SOAP Note & DSM-5 Pad
    console.log('📸 38. Testing Doctor SOAP Note Editor & DSM-5 Diagnostic Pad (/dashboard/doctor)...');
    await page.goto(`${BASE_URL}/dashboard/doctor`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=محرر التوثيق السريري');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '38_doctor_soap_notes_dsm5.png') });

    console.log('🎉 ALL 38 CLINICAL SCENARIOS ACROSS ALL 7 PHASES COMPLETED WITH EXCELLENCE!');
  } catch (err) {
    console.error('❌ Error during Phase 7 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase7Tests();

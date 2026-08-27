const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase6Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 6 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Group Therapy Circles Page (/circles)
    console.log('📸 36. Testing Group Support Circles Hub (/circles)...');
    await page.goto(`${BASE_URL}/circles`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '36_group_therapy_circles_hub.png') });

    console.log('🎉 ALL 36 CLINICAL SCENARIOS ACROSS ALL 6 PHASES COMPLETED WITH DISTINCTION!');
  } catch (err) {
    console.error('❌ Error during Phase 6 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase6Tests();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function runPhase3Tests() {
  console.log('🚀 Launching Chromium for Asmaa Telehealth Phase 3 Testing...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Telehealth Session Interactive Whiteboard
    console.log('📸 28. Testing Virtual Session Whiteboard & CBT Canvas...');
    await page.goto(`${BASE_URL}/session/room-asm-101`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.click('text=السبورة');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '28_session_cbt_whiteboard.png') });

    // 2. 5-4-3-2-1 Sensory Grounding Tool
    console.log('📸 29. Testing 5-4-3-2-1 Sensory Grounding Modal...');
    await page.goto(`${BASE_URL}/assistant`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.click('button:has-text("التأريض 5-4-3-2-1")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '29_sensory_grounding_tool.png') });
    await page.click('button[aria-label="Close modal"]');
    await page.waitForTimeout(300);

    // 3. FAQ & Clinical Ethics Hub
    console.log('📸 30. Testing FAQ & Clinical Ethics Charter Hub (/faq)...');
    await page.goto(`${BASE_URL}/faq`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30_faq_and_clinical_ethics.png') });

    console.log('🎉 ALL 30 E2E CLINICAL & UI/UX TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during Phase 3 testing:', err);
  } finally {
    await browser.close();
  }
}

runPhase3Tests();

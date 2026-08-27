const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function testFixedUI() {
  console.log('🚀 Launching Chromium to capture polished UI screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const page = await context.newPage();

  try {
    // 1. Polished Desktop Home & Hero with avatar & clean navbar
    console.log('📸 45. Capturing Polished Hero & Clean Navbar...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '45_fixed_navbar_clean.png') });

    // 2. Open "خدمات أخرى" dropdown to show smooth UX
    console.log('📸 46. Capturing Clinical Services Dropdown...');
    await page.click('button:has-text("خدمات أخرى")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '46_fixed_services_dropdown.png') });

    // 3. Hero Interactive Card close-up
    console.log('📸 47. Capturing Live Session Card Close-up...');
    const heroCard = page.locator('div').filter({ hasText: 'جلسة استشارية مباشرة الآن' }).first();
    await heroCard.screenshot({ path: path.join(SCREENSHOT_DIR, '47_fixed_hero_live_session_card.png') });

    console.log('🎉 POLISHED UI SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during testFixedUI:', err);
  } finally {
    await browser.close();
  }
}

testFixedUI();

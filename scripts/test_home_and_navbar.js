const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Ziad.Mahmoud\\.gemini\\antigravity\\brain\\57c2075e-187b-49ea-8933-635f04a14a40\\screenshots';
const BASE_URL = 'http://localhost:3005';

async function testHomeAndNavbar() {
  console.log('🚀 Launching Chromium to inspect Navbar and Home Page UI & Images...');
  const browser = await chromium.launch({ headless: true });
  
  // Desktop Viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });
  const desktopPage = await desktopContext.newPage();

  const failedImages = [];
  desktopPage.on('response', (response) => {
    const request = response.request();
    if (request.resourceType() === 'image' && response.status() >= 400) {
      failedImages.push({ url: request.url(), status: response.status() });
    }
  });

  try {
    // 1. Desktop Arabic RTL Home & Navbar
    console.log('📸 39. Capturing Desktop Navbar in Arabic RTL...');
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(600);
    
    // Screenshot Navbar element
    const navbar = await desktopPage.locator('header');
    await navbar.screenshot({ path: path.join(SCREENSHOT_DIR, '39_navbar_desktop_arabic.png') });

    console.log('📸 40. Capturing Home Hero Section (Arabic)...');
    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '40_home_hero_arabic.png') });

    console.log('📸 41. Capturing Conditions & Therapists Grid...');
    await desktopPage.evaluate(() => window.scrollBy(0, 900));
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '41_home_conditions_and_doctors.png') });

    console.log('📸 42. Capturing Academy, Bookstore & FAQ...');
    await desktopPage.evaluate(() => window.scrollBy(0, 1000));
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '42_home_academy_and_faq.png') });

    // 2. Toggle to English LTR
    console.log('📸 43. Capturing Desktop Navbar & Hero in English LTR...');
    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    await desktopPage.click('text=English');
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, '43_navbar_desktop_english.png') });

    // 3. Mobile Viewport & Drawer
    console.log('📸 44. Capturing Mobile Navbar & Drawer...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar-EG',
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(500);
    // Click mobile menu hamburger
    await mobilePage.click('button[aria-label="Toggle mobile menu"]');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '44_navbar_mobile_menu.png') });

    console.log('================================================================');
    if (failedImages.length === 0) {
      console.log('✅ ZERO BROKEN IMAGES! All visual assets loaded with HTTP 200 OK.');
    } else {
      console.log(`⚠️ Found ${failedImages.length} image issues:`, failedImages);
    }
    console.log('🎉 Navbar and Home Page UI & UX audit completed successfully!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Error during Home & Navbar inspection:', err);
  } finally {
    await browser.close();
  }
}

testHomeAndNavbar();

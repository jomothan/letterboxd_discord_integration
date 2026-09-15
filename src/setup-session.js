import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import os from 'os';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const PROFILE_DIR = path.join(os.homedir(), '.letterboxd-bot-session-puppeteer');
const COOKIES_FILE = path.join(process.cwd(), 'src', 'cookies.json');

(async () => {
  console.log('🎬 Letterboxd Bot — Setting up session...\n');

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: PROFILE_DIR,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // Inject cookies if available
  if (fs.existsSync(COOKIES_FILE)) {
    console.log('🍪 Loading cookies from src/cookies.json...');
    const rawCookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    const cookies = rawCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expirationDate ?? -1,
      httpOnly: c.httpOnly ?? false,
      secure: c.secure ?? false,
      sameSite: convertSameSite(c.sameSite),
    }));
    await page.setCookie(...cookies);
    console.log(`✅ Loaded ${cookies.length} cookies\n`);
  }

  await page.goto('https://letterboxd.com/', { waitUntil: 'domcontentloaded' });

  const signInLink = await page.$('a.navlink[href="/sign-in/"]');
  if (!signInLink) {
    console.log('✅ Already logged in via cookies!');
  } else {
    console.log('⚠️  Not logged in. Please log in manually in the browser window.');
  }

  console.log('\nPress ENTER once you can see your Letterboxd feed/profile...\n');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await browser.close();
  console.log('✅ Session saved! Now run: npm start');
  process.exit(0);
})();

function convertSameSite(value) {
  switch (value) {
    case 'strict': return 'Strict';
    case 'lax': return 'Lax';
    case 'no_restriction': return 'None';
    default: return 'Lax';
  }
}

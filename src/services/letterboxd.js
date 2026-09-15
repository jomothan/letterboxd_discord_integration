import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import os from 'os';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const LETTERBOXD_BASE = 'https://letterboxd.com';
const PROFILE_DIR = path.join(os.homedir(), '.letterboxd-bot-session-puppeteer');
const COOKIES_FILE = path.join(process.cwd(), 'src', 'cookies.json');

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: PROFILE_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });
  }
  return browser;
}

async function getPage() {
  const b = await getBrowser();
  const page = await b.newPage();

  if (fs.existsSync(COOKIES_FILE)) {
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
  }

  return page;
}

function convertSameSite(value) {
  switch (value) {
    case 'strict': return 'Strict';
    case 'lax': return 'Lax';
    case 'no_restriction': return 'None';
    default: return 'Lax';
  }
}

async function ensureLoggedIn(page) {
  await page.goto(`${LETTERBOXD_BASE}/`, { waitUntil: 'domcontentloaded' });
  const signInLink = await page.$('a.navlink[href="/sign-in/"]');
  if (signInLink) {
    throw new Error('Not logged in to Letterboxd. Make sure src/cookies.json is present and valid.');
  }
  console.log('[auth] Logged in successfully');
}

export async function logToLetterboxd({ filmSlug, filmTitle, filmYear, rating, review, liked }) {
  const page = await getPage();

  try {
    await ensureLoggedIn(page);
    const filmUrl = await navigateToFilm(page, filmSlug, filmTitle, filmYear);
    await openLogDialog(page);
    if (review) await setReview(page, review);
    if (liked) await setLiked(page);
    await saveEntry(page, rating);
    await page.close();
    return { success: true, filmUrl };
  } catch (err) {
    await page.close();
    throw err;
  }
}

async function navigateToFilm(page, slug, title, year) {
  // Helper to get the year from the current Letterboxd film page
  const getPageYear = async () => {
    return await page.evaluate(() => {
      const yearLink = document.querySelector('a[href*="/films/year/"]');
      if (yearLink) return yearLink.innerText.trim();
      const small = document.querySelector('h1 small, .film-title-wrapper small, small.number');
      if (small) return small.innerText.trim();
      return null;
    });
  };

  const is404 = () => page.url().includes('/404') || page.url().includes('/error');

  // Step 1: Try plain slug
  await page.goto(`${LETTERBOXD_BASE}/film/${slug}/`, { waitUntil: 'domcontentloaded' });

  if (!is404()) {
    if (year) {
      const pageYear = await getPageYear();
      console.log('[film] Plain slug year:', pageYear, '| Expected:', year);
      if (!pageYear || pageYear.includes(year)) {
        // Correct year or couldn't detect — use this page
        console.log('[film] Navigated to:', page.url());
        return page.url();
      }
      // Wrong year — fall through to try year slug
    } else {
      console.log('[film] Navigated to:', page.url());
      return page.url();
    }
  }

  // Step 2: Try slug with year appended
  if (year) {
    await page.goto(`${LETTERBOXD_BASE}/film/${slug}-${year}/`, { waitUntil: 'domcontentloaded' });
    if (!is404()) {
      console.log('[film] Navigated to year slug:', page.url());
      return page.url();
    }
  }

  // Step 3: Fall back to Letterboxd search
  const searchUrl = `${LETTERBOXD_BASE}/search/films/${encodeURIComponent(title)}/`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

  const results = await page.$$('.film-summary');
  let matched = false;

  for (const result of results) {
    const yearEl = await result.$('.metadata');
    if (yearEl && year) {
      const yearText = await yearEl.evaluate(el => el.innerText);
      if (yearText.includes(year)) {
        await result.$eval('a', a => a.click());
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        matched = true;
        break;
      }
    }
  }

  if (!matched && results.length > 0) {
    await results[0].$eval('a', a => a.click());
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  if (!matched && results.length === 0) {
    throw new Error(`Could not find "${title}" on Letterboxd.`);
  }

  console.log('[film] Navigated to:', page.url());
  return page.url();
}

async function openLogDialog(page) {
  console.log('[dialog] Current URL:', page.url());
  await new Promise(r => setTimeout(r, 2500));

  let firstClick = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a, button'));
    const logBtn = all.find(el => {
      const text = el.innerText?.trim().toLowerCase();
      return text?.includes('review or log') || text?.includes('log again') || text?.includes('add review');
    });
    if (!logBtn) return null;
    logBtn.click();
    return logBtn.innerText.trim();
  });

  if (!firstClick) {
    await new Promise(r => setTimeout(r, 2000));
    firstClick = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const logBtn = all.find(el => {
        const text = el.innerText?.trim().toLowerCase();
        return text?.includes('review or log') || text?.includes('log again') || text?.includes('add review');
      });
      if (!logBtn) return null;
      logBtn.click();
      return logBtn.innerText.trim();
    });
    if (!firstClick) throw new Error('Could not find the log button.');
  }

  console.log('[dialog] First click:', firstClick);

  // If submenu appeared, click "Review or log again"
  // Only trigger submenu for "Log again / edit review..." or "Log again / add review..."
// "Review or log again..." is a direct button with no submenu
  if (firstClick.toLowerCase().includes('log again') && (firstClick.toLowerCase().includes('edit review') || firstClick.toLowerCase().includes('add review'))) {
    await new Promise(r => setTimeout(r, 800));

    const secondClick = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const btn = all.find(el => {
        const text = el.innerText?.trim().toLowerCase();
        return (text?.includes('review or log') || text?.includes('log again'))
          && !text?.includes('edit review')
          && !text?.includes('add review');
      });
      if (!btn) {
        const texts = all.map(el => el.innerText?.trim()).filter(t => t && t.length < 50);
        return `not found — available: ${texts.join(' | ')}`;
      }
      btn.click();
      return btn.innerText.trim();
    });

    console.log('[dialog] Second click:', secondClick);
    if (typeof secondClick === 'string' && secondClick.startsWith('not found')) {
      throw new Error(`Submenu: ${secondClick}`);
    }
  }

  await page.waitForSelector('input[name="rating"]', { timeout: 8_000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('[dialog] Diary form ready');
}

async function setReview(page, review) {
  await page.type('textarea[name="review"]', review);
  console.log('[review] Review filled');
}

async function setLiked(page) {
  await page.evaluate(() => {
    const likeCheckbox = document.querySelector('input[name="liked"]');
    if (likeCheckbox && !likeCheckbox.checked) {
      likeCheckbox.click();
    }
  });
  console.log('[liked] Film liked');
}

async function saveEntry(page, rating) {
  await new Promise(r => setTimeout(r, 1000));

  const internalRating = rating ? Math.round(rating * 2) : 0;

  const result = await page.evaluate((r) => {
    if (r > 0 && typeof jQuery !== 'undefined') {
      jQuery('.rateit.js-rateit').rateit('value', r);
    }
    const ratingInput = document.querySelector('input[name="rating"]');
    if (ratingInput && r > 0) {
      ratingInput.removeAttribute('style');
      ratingInput.value = String(r);
      ratingInput.setAttribute('value', String(r));
      ratingInput.style.display = 'none';
    }

    const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
    const saveBtn = buttons.find(b => b.innerText.trim() === 'Save');
    if (!saveBtn) return { clicked: false, error: 'no save button' };

    saveBtn.click();
    return { clicked: true, ratingValue: ratingInput?.value };
  }, internalRating);

  console.log('[save] Result:', JSON.stringify(result));
  if (!result.clicked) throw new Error(`Save failed: ${result.error}`);
  await new Promise(r => setTimeout(r, 2_000));
  console.log('[save] Entry saved');
}

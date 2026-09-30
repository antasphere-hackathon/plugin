#!/usr/bin/env node
/*
 * Check the vote presentation the way the other participants will see it:
 * on a phone (390×844) and on a laptop (1280×720), one screenshot per screen.
 *
 *   node <plugin>/skills/vote/scripts/check.mjs decks/vote
 *       checks decks/vote/dist/ (what render.mjs wrote)
 *   node <plugin>/skills/vote/scripts/check.mjs decks/vote --deck decks/vote/deck
 *       checks a deck started from the organizer's template
 *
 * Screenshots go to <dir>/check/<size>-<n>.png. Exit 1, one line per problem:
 * a request to anything but the deck's own files, a page that scrolls, a
 * screen whose content does not fit, text under 16px on the phone, dots that
 * do not match the screens, a screen that did not change on ArrowRight, a tap
 * zone or a dot that does not move, an image that did not load, a cover that
 * needs a script to show, a deck over 5 MB. Exit 4: Playwright is missing.
 *
 * Playwright is resolved as the demo skill's play.mjs does: the clone's own
 * node_modules first, else ~/.cache/antasphere-hackathon/playwright
 * (PLAYWRIGHT_PREFIX overrides it).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const deckAt = args.indexOf('--deck');
const positional = args.filter((a, i) => !a.startsWith('--') && (deckAt < 0 || i !== deckAt + 1));
const dir = path.resolve(positional[0] ?? 'decks/vote');
const deck = path.resolve(deckAt >= 0 ? args[deckAt + 1] ?? '' : path.join(dir, 'dist'));
const entry = path.join(deck, 'index.html');
if (!fs.existsSync(entry)) {
  console.error(`${path.relative(process.cwd(), entry)}: missing (run render.mjs first)`);
  process.exit(2);
}
const shots = path.join(dir, 'check');
fs.rmSync(shots, { recursive: true, force: true });
fs.mkdirSync(shots, { recursive: true });

// ─── Playwright ──────────────────────────────────────────────────────────────
function loadPlaywright() {
  const cacheDir = path.join(os.homedir(), '.cache', 'antasphere-hackathon');
  const prefixes = [process.cwd(), process.env.PLAYWRIGHT_PREFIX, path.join(cacheDir, 'playwright')].filter(Boolean);
  for (const p of prefixes) {
    try {
      return createRequire(path.join(p, 'package.json'))('playwright');
    } catch {
      /* next */
    }
  }
  console.error(
    'Playwright is not installed. Run:\n' +
      '  npm i --prefix ~/.cache/antasphere-hackathon/playwright playwright@1\n' +
      '  npx --prefix ~/.cache/antasphere-hackathon/playwright playwright install chromium'
  );
  process.exit(4);
}
const { chromium } = loadPlaywright();

const problems = [];
const fail = (m) => problems.push(m);

// ─── the weight ──────────────────────────────────────────────────────────────
const MAX = 5 * 1024 * 1024;
const sizeOf = (p) =>
  fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((n, f) => n + sizeOf(path.join(p, f)), 0) : fs.statSync(p).size;
const bytes = sizeOf(deck);
if (bytes > MAX) fail(`${path.relative(process.cwd(), deck)} is ${(bytes / 1048576).toFixed(1)} MB, over 5 MB: shrink the images`);

// ─── the plays ───────────────────────────────────────────────────────────────
const url = pathToFileURL(entry).href;
const LOCAL = /^(file|data|blob|about):/;
const SIZES = [
  { name: 'phone', width: 390, height: 844, minFont: 16 },
  { name: 'laptop', width: 1280, height: 720, minFont: 0 }
];
const browser = await chromium.launch();
let screenCount = 0;
let shotCount = 0;

/** What the page says about itself, read in the page. */
const read = (minFont) => {
  const de = document.documentElement;
  const screens = [...document.querySelectorAll('#deck .screen')];
  const current = screens.find((s) => s.classList.contains('is-current')) ?? null;
  const small = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || el.closest('script, style')) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < minFont) small.push(`"${n.textContent.trim().slice(0, 40)}" at ${px.toFixed(1)}px`);
  }
  return {
    screens: screens.length,
    current: current ? screens.indexOf(current) + 1 : 0,
    dots: document.querySelectorAll('.dots button').length,
    overflowX: de.scrollWidth > de.clientWidth,
    overflowY: de.scrollHeight > de.clientHeight,
    cut: current ? current.scrollHeight > current.clientHeight + 1 || current.scrollWidth > current.clientWidth + 1 : false,
    broken: [...(current ?? document).querySelectorAll('img')].filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    small
  };
};
const settle = (page) =>
  page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))));

for (const size of SIZES) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('request', (r) => {
    if (!LOCAL.test(r.url())) fail(`${size.name}: a request to ${r.url()}: the deck must load nothing from outside its folder`);
  });
  page.on('pageerror', (e) => fail(`${size.name}: a script error: ${String(e.message).split('\n')[0]}`));
  await page.goto(url, { waitUntil: 'load' });
  await settle(page);

  let state = await page.evaluate(read, size.minFont);
  const total = state.screens;
  if (!total) {
    fail(`${size.name}: no screen rendered`);
    await context.close();
    continue;
  }
  screenCount = total;
  if (state.dots !== total) fail(`${size.name}: ${state.dots} dots for ${total} screens`);
  if (state.current !== 1) fail(`${size.name}: the first screen is not the one showing on load`);

  for (let n = 1; n <= total; n++) {
    if (n > 1) {
      const before = state.current;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
      state = await page.evaluate(read, size.minFont);
      if (state.current !== before + 1) fail(`${size.name}: ArrowRight on screen ${before} did not show screen ${before + 1}`);
    }
    await page.screenshot({ path: path.join(shots, `${size.name}-${n}.png`) });
    shotCount++;
    const where = `${size.name}, screen ${n}`;
    if (state.overflowX || state.overflowY) fail(`${where}: the page scrolls (${state.overflowX ? 'sideways' : ''}${state.overflowX && state.overflowY ? ' and ' : ''}${state.overflowY ? 'down' : ''})`);
    if (state.cut) fail(`${where}: the content does not fit the screen, shorten the text`);
    for (const src of state.broken) fail(`${where}: the image ${src} did not load`);
    for (const s of state.small) fail(`${where}: text under ${size.minFont}px: ${s}`);
  }

  // The other ways in: a tap on each half, a dot, the keys that jump.
  const at = async (fx) => {
    await page.mouse.click(Math.round(size.width * fx), Math.round(size.height * 0.45));
    await page.waitForTimeout(60);
    return (await page.evaluate(read, 0)).current;
  };
  await page.keyboard.press('Home');
  if ((await page.evaluate(read, 0)).current !== 1) fail(`${size.name}: Home did not go back to the first screen`);
  if ((await at(0.8)) !== 2) fail(`${size.name}: a tap on the right of the screen did not go to the next one`);
  if ((await at(0.2)) !== 1) fail(`${size.name}: a tap on the left of the screen did not go back`);
  await page.locator('.dots button').nth(total - 1).click();
  if ((await page.evaluate(read, 0)).current !== total) fail(`${size.name}: the last dot did not show the last screen`);
  await context.close();
}

// ─── the cover without scripting ────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const shown = await page.evaluate(() => {
    const first = document.querySelector('#deck .screen');
    return !!first && getComputedStyle(first).visibility === 'visible' && first.innerText.trim().length > 0;
  });
  if (!shown) fail('without scripting the cover does not show: render the screens into the file (render.mjs)');
  await context.close();
}
await browser.close();

if (problems.length) {
  console.error([...new Set(problems)].map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`ok · ${screenCount} screens · ${shotCount} screenshots in ${path.relative(process.cwd(), shots) || shots}/`);

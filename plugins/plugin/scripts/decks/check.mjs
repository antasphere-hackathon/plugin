#!/usr/bin/env node
/*
 * Check a filled deck the way its readers will see it, before it is published.
 *
 *   node <plugin>/scripts/decks/check.mjs decks/vote     # checks decks/vote/deck/
 *   node <plugin>/scripts/decks/check.mjs decks/pitch
 *   node <plugin>/scripts/decks/check.mjs decks/demo
 *
 * The slide decks (pitch, vote) are walked at 1280 × 720, slide by slide, and on a phone (390 × 844),
 * screen by screen; the demo page is read whole at 1440 × 900 with every episode open, its step
 * player opened once, and on a phone. Screenshots go to <folder>/check/. Exit 1, one line per
 * problem: a request to anything but the deck's own files, the brand's faces not loaded, a text that
 * runs out of its slide, a phone screen wider than the phone or taller than its screen, text under
 * 16 px on the phone, an image that did not load, a step without its screenshot, a deck over its
 * weight (5 MB for the vote, 12 MB otherwise). Exit 4: Playwright is missing.
 *
 * Playwright is resolved as the demo's play.mjs does: the clone's own node_modules first, else
 * ~/.cache/antasphere-hackathon/playwright (PLAYWRIGHT_PREFIX overrides it).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(process.argv[2] ?? '.');
const deck = path.join(dir, 'deck');
const entry = path.join(deck, 'index.html');
if (!fs.existsSync(entry)) {
  console.error(`${path.relative(process.cwd(), entry)}: missing (start the deck from the template, then fill.mjs)`);
  process.exit(2);
}
const shots = path.join(dir, 'check');
fs.rmSync(shots, { recursive: true, force: true });
fs.mkdirSync(shots, { recursive: true });

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
const html = fs.readFileSync(entry, 'utf8');
const slides = /id="deck-content"/.test(html);
const isVote = slides && /"pitch"\s*:\s*\{/.test(html) && /"moment"\s*:/.test(html);

// ─── the weight ──────────────────────────────────────────────────────────────
const sizeOf = (p) =>
  fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((n, f) => n + sizeOf(path.join(p, f)), 0) : fs.statSync(p).size;
const MAX = (isVote ? 5 : 12) * 1024 * 1024;
const bytes = sizeOf(deck);
if (bytes > MAX)
  fail(`${path.relative(process.cwd(), deck)} is ${(bytes / 1048576).toFixed(1)} MB, over ${MAX / 1048576} MB: compress the screenshots (JPEG, 1440 px wide)`);

const browser = await chromium.launch();
const url = pathToFileURL(entry).href;
const LOCAL = /^(file|data|blob|about):/;
async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('request', (r) => {
    if (!LOCAL.test(r.url())) fail(`${width}×${height}: a request outside the deck: ${r.url()}`);
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(500);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/['"]/g, '')));
  if (!loaded.includes('Sentient') || !loaded.includes('Synonym')) fail(`${width}×${height}: the brand's faces (Sentient, Synonym) did not load: start the deck from the template again`);
  return page;
}
const brokenImages = (page, scope) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(`${sel} img`)].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    scope
  );
// Text under the phone's minimum (16 px on a slide, the page's own 15 px on the demo): the labels in
// capitals (.over, .eyebrow) and the chrome are the brand's and stay small.
const SMALL_TEXT = (sel, min) => `
  [...document.querySelectorAll('${sel} :is(p, li, h1, h2, h3, a, span.gap)')]
    .filter((el) => el.offsetParent && !el.closest('.over, .m-ident, .m-bar, .eyebrow, .meta, .foot'))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < ${min} - 0.5)
    .map((el) => el.textContent.trim().slice(0, 40))`;

if (slides) {
  // ─── the stage, slide by slide ─────────────────────────────────────────────
  const page = await open(1280, 720);
  const total = await page.evaluate(() => document.querySelectorAll('#stage > .slide').length);
  for (let n = 1; n <= total; n++) {
    await page.evaluate((n) => (location.hash = '#' + n), n);
    await page.waitForTimeout(750);
    const out = await page.evaluate((n) => {
      const s = document.querySelectorAll('#stage > .slide')[n - 1];
      const box = s.getBoundingClientRect();
      const over = [...s.querySelectorAll('h1, h2, h3, p, li, figure, .stack, .gaps, .dia')]
        .filter((el) => el.offsetParent)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > box.right + 2 || r.bottom > box.bottom + 2 || r.left < box.left - 2 || r.top < box.top - 2;
        })
        .map((el) => el.textContent.trim().slice(0, 40) || el.tagName.toLowerCase());
      return { current: s.classList.contains('is-current'), over };
    }, n);
    if (!out.current) fail(`laptop: slide ${n} does not show when asked for`);
    for (const t of out.over) fail(`laptop, slide ${n}: runs out of the slide: "${t}" (shorten it)`);
    for (const src of await brokenImages(page, `#stage > .slide:nth-of-type(${n})`)) fail(`laptop, slide ${n}: the image ${src} did not load`);
    await page.screenshot({ path: path.join(shots, `laptop-${n}.png`) });
  }
  await page.close();

  // ─── the phone, screen by screen ───────────────────────────────────────────
  const phone = await open(390, 844);
  const screens = await phone.evaluate(() => document.querySelectorAll('.m-deck > .m-slide').length);
  if (screens !== total) fail(`phone: ${screens} screens for ${total} slides`);
  for (let n = 1; n <= screens; n++) {
    await phone.evaluate((n) => {
      const r = document.querySelector('.m-deck');
      r.scrollTo({ left: (n - 1) * r.clientWidth, behavior: 'instant' });
    }, n);
    await phone.waitForTimeout(350);
    const out = await phone.evaluate(
      ({ n, small }) => {
        const s = document.querySelectorAll('.m-deck > .m-slide')[n - 1];
        return { wide: s.scrollWidth > s.clientWidth + 1, tall: s.scrollHeight > s.clientHeight + 1, small: eval(small) };
      },
      { n, small: SMALL_TEXT(`.m-deck > .m-slide:nth-of-type(${n})`, 16) }
    );
    if (out.wide) fail(`phone, screen ${n}: wider than the phone`);
    if (out.tall) fail(`phone, screen ${n}: taller than the screen, it scrolls (shorten its text)`);
    for (const t of out.small) fail(`phone, screen ${n}: text under 16 px: "${t}"`);
    for (const src of await brokenImages(phone, `.m-deck > .m-slide:nth-of-type(${n})`)) fail(`phone, screen ${n}: the image ${src} did not load`);
    await phone.screenshot({ path: path.join(shots, `phone-${n}.png`) });
  }
  await phone.close();
  if (!problems.length) console.log(`ok · ${total} slides · ${total + screens} screenshots in ${path.relative(process.cwd(), shots)}/`);
} else {
  // ─── the demo page: every episode open, the player once, the phone ─────────
  const page = await open(1440, 900);
  const episodes = await page.evaluate(() => document.querySelectorAll('.episode').length);
  if (!episodes) fail('no episode on the page: is this the Demo deck template?');
  if (episodes > 3) fail(`${episodes} episodes: three at most`);
  for (const b of await page.$$('.toggle-ep[aria-expanded="false"]')) await b.click();
  await page.waitForTimeout(600);
  const missing = await page.evaluate(() => [...document.querySelectorAll('.step')].filter((s) => s.querySelector('.shot.missing') && !/:/.test(s.querySelector('.shot.missing').textContent)).map((s) => s.id));
  for (const id of missing) fail(`${id}: no screenshot and no noshot reason (play the step again, or say why in noshot)`);
  for (const src of await brokenImages(page, 'main, .page')) fail(`the image ${src} did not load`);
  await page.screenshot({ path: path.join(shots, 'laptop-page.png'), fullPage: true });
  const play = await page.$('.play-ep');
  if (play) {
    await play.click();
    await page.waitForTimeout(900);
    const on = await page.evaluate(() => document.getElementById('player').classList.contains('on') && !!document.getElementById('pl-img').naturalWidth);
    if (!on) fail('the step player did not open on the first episode with its screenshot');
    await page.screenshot({ path: path.join(shots, 'laptop-player.png') });
  }
  await page.close();
  const phone = await open(390, 844);
  for (const b of await phone.$$('.toggle-ep[aria-expanded="false"]')) await b.click();
  await phone.waitForTimeout(600);
  const out = await phone.evaluate((small) => ({ wide: document.scrollingElement.scrollWidth > innerWidth + 1, small: eval(small) }), SMALL_TEXT('.page', 15));
  if (out.wide) fail('phone: the page is wider than the phone');
  for (const t of out.small) fail(`phone: text under 15 px: "${t}"`);
  await phone.screenshot({ path: path.join(shots, 'phone-page.png'), fullPage: true });
  await phone.close();
  if (!problems.length) console.log(`ok · ${episodes} episodes · screenshots in ${path.relative(process.cwd(), shots)}/`);
}
await browser.close();
if (problems.length) {
  console.error([...new Set(problems)].join('\n'));
  process.exit(1);
}

#!/usr/bin/env node
/*
 * Fill a deck started from the organizer's template with the team's content.
 *
 *   node <plugin>/scripts/decks/fill.mjs pitch decks/pitch     # decks/pitch/pitch.json → decks/pitch/deck/
 *   node <plugin>/scripts/decks/fill.mjs vote  decks/vote      # decks/vote/vote.json   → decks/vote/deck/
 *   node <plugin>/scripts/decks/fill.mjs demo  decks/demo      # decks/demo/guide.json + screens/ → decks/demo/deck/
 *
 * `deck/` is what `slideless template start "<title>" <dir>/deck` wrote. The content file beside it is
 * the team's source (committed); `deck/` is rebuilt from it (git-ignored: it carries the brand's faces).
 *
 * Pitch and vote are slide decks: the content goes into the deck's JSON block `deck-content`, the
 * images it names are copied into `deck/assets/` under fixed names, and the slides are written into
 * the file with the template's own `deckSlides` function, so the first slide shows before any script
 * runs. The demo is a page: guide.json and the screenshots are copied into `deck/` and the template's
 * own renderer (`deck/scripts/render.mjs`) writes `deck/index.html`.
 *
 * Exit 2, one line per problem: an empty field, a text too long for its slide, too many or too few
 * lines, a missing image, a link that is not https, a deck that is not the template it should be.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const [kind, dirArg] = process.argv.slice(2);
const KINDS = ['pitch', 'vote', 'demo'];
const fail = (lines) => {
  console.error([].concat(lines).join('\n'));
  process.exit(2);
};
if (!KINDS.includes(kind)) fail('usage: fill.mjs <pitch|vote|demo> <folder>   (the folder holding the content file and deck/)');
const dir = path.resolve(dirArg ?? `decks/${kind}`);
const deck = path.join(dir, 'deck');
const shown = (p) => path.relative(process.cwd(), p) || '.';
if (!fs.existsSync(path.join(deck, 'index.html')))
  fail(`${shown(deck)}: no deck yet. Start it first: slideless template start "<the ${kind} template's title>" ${shown(deck)} --workspace <id>`);

const CONTENT = { pitch: 'pitch.json', vote: 'vote.json', demo: 'guide.json' }[kind];
const contentPath = path.join(dir, CONTENT);
if (!fs.existsSync(contentPath)) fail(`no ${CONTENT} in ${shown(dir)}`);
let c;
try {
  c = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
} catch (e) {
  fail(`${CONTENT}: ${e.message}`);
}

// ─── the checks ──────────────────────────────────────────────────────────────
const problems = [];
const get = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c);
const text = (key, max, { optional = false } = {}) => {
  const v = get(key);
  if (v == null && optional) return;
  if (typeof v !== 'string' || !v.trim()) problems.push(`${CONTENT}: "${key}" is empty`);
  else if (v.length > max) problems.push(`${CONTENT}: "${key}" is ${v.length} characters, keep it under ${max} (it must fit its slide)`);
};
const list = (key, min, max, each) => {
  const v = get(key);
  if (!Array.isArray(v) || v.length < min || v.length > max)
    problems.push(`${CONTENT}: "${key}" needs ${min} to ${max} entries, has ${Array.isArray(v) ? v.length : 'none'}`);
  else if (each) v.forEach((x, i) => each(`${key}.${i}`, x));
};
const https = (key) => {
  const v = get(key);
  if (v == null) return;
  let ok = false;
  try {
    ok = new URL(v).protocol === 'https:';
  } catch {
    /* not a URL */
  }
  if (!ok) problems.push(`${CONTENT}: "${key}" must be an https:// link or null, not ${v}`);
};
const IMAGE = /\.(jpe?g|png|webp|gif|svg)$/i;
const image = (key, base = dir) => {
  const v = get(key);
  if (typeof v !== 'string' || !v.trim()) return problems.push(`${CONTENT}: "${key}" is empty`);
  if (/^[a-z]+:/i.test(v) || path.isAbsolute(v)) return problems.push(`${CONTENT}: "${key}" must be a file path relative to ${shown(base)}, not ${v}`);
  if (!IMAGE.test(v)) return problems.push(`${CONTENT}: "${key}" must be a .jpg, .png, .webp, .gif or .svg image`);
  if (!fs.existsSync(path.resolve(base, v))) return problems.push(`${CONTENT}: "${key}" names ${v}, which does not exist`);
  return path.resolve(base, v);
};
const lang = () => {
  if (!['en', 'fr', 'nl'].includes(String(c.lang))) problems.push(`${CONTENT}: "lang" is en, fr or nl`);
};

const images = {};
if (kind === 'vote') {
  lang();
  text('team', 40);
  text('product', 24); // the platform's own limit: the Vote page's tiles show it
  text('oneLiner', 140);
  text('occasion', 60);
  for (const [k, max] of Object.entries({ who: 60, need: 90, category: 40, benefit: 90, alternative: 90, difference: 90 })) text(`pitch.${k}`, max);
  images.does = image('does.image');
  images.moment = image('moment.image');
  text('moment.text', 120);
  list('members', 1, 8, (k) => text(k, 40));
  https('demoUrl');
}
if (kind === 'pitch') {
  lang();
  text('team', 40);
  text('product', 24);
  text('oneLiner', 140);
  text('occasion', 60);
  list('members', 1, 8, (k) => text(k, 40));
  text('problem.person', 90);
  text('problem.text', 90);
  if (c.stake != null) {
    text('stake.number', 6);
    text('stake.unit', 40);
    text('stake.text', 120, { optional: true });
  }
  images.built = image('built.image');
  text('built.text', 90);
  text('how.title', 30);
  text('how.headline', 90);
  list('how.steps', 3, 4, (k) => {
    text(`${k}.title`, 16);
    text(`${k}.sub`, 18);
  });
  if (c.how?.check != null) {
    text('how.check.label', 24);
    text('how.check.text', 40);
  }
  images.demo = image('demo.image');
  text('demo.text', 90);
  text('demo.fallback', 120, { optional: true });
  for (const k of ['works', 'missing', 'then']) text(`next.${k}`, 90);
  text('close.line', 90);
  https('close.demoUrl');
}
if (kind === 'demo') {
  if (!['en', 'fr'].includes(String(c.lang))) problems.push(`${CONTENT}: "lang" is en or fr`);
  text('team', 40);
  text('title', 24);
  text('subtitle', 140);
  text('occasion', 60);
  list('episodes', 1, 3, (k, ep) => {
    text(`${k}.title`, 50);
    text(`${k}.situation`, 220);
    list(`${k}.steps`, 2, 6, (sk, st) => {
      text(`${sk}.do`, 160);
      text(`${sk}.see`, 200);
      if (st && st.noshot) text(`${sk}.noshot`, 60);
      else image(`${sk}.shot`);
    });
  });
  if (c.notFinished != null) list('notFinished', 0, 3, (k) => text(k, 90));
}
if (problems.length) fail(problems);

// ─── the demo: the page's own renderer ───────────────────────────────────────
if (kind === 'demo') {
  if (!fs.existsSync(path.join(deck, 'scripts/render.mjs')))
    fail(`${shown(deck)}: not the Demo deck template (no scripts/render.mjs)`);
  fs.rmSync(path.join(deck, 'screens'), { recursive: true, force: true });
  const guide = structuredClone(c);
  guide.episodes.forEach((ep, k) => {
    ep.n = k + 1;
    for (const st of ep.steps) {
      if (st.noshot || !st.shot) continue;
      const dest = path.join('screens', path.basename(st.shot));
      fs.mkdirSync(path.join(deck, 'screens'), { recursive: true });
      fs.copyFileSync(path.resolve(dir, st.shot), path.join(deck, dest));
      st.shot = dest;
    }
  });
  fs.writeFileSync(path.join(deck, 'guide.json'), JSON.stringify(guide, null, 2) + '\n');
  execFileSync(process.execPath, [path.join(deck, 'scripts/render.mjs')], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(shown(path.join(deck, 'index.html')));
  process.exit(0);
}

// ─── pitch and vote: the JSON block and the slides, one engine ──────────────
const entry = path.join(deck, 'index.html');
let html = fs.readFileSync(entry, 'utf8');
const BLOCK = /(<script type="application\/json" id="deck-content">)[\s\S]*?(<\/script>)/;
const SLIDES = /(<!-- slides:start -->)[\s\S]*?(<!-- slides:end -->)/;
const SCREENS = /(<!-- screens:start -->)[\s\S]*?(<!-- screens:end -->)/;
const RENDER = /<script id="deck-render">([\s\S]*?)<\/script>/;
const SIG = /(<div id="stage"[^>]*data-sig=")[^"]*(")/;
if (![BLOCK, SLIDES, SCREENS, RENDER, SIG].every((re) => re.test(html)))
  fail(`${shown(entry)}: not a hackathon slide template (no deck-content block, slide markers or deck-render script)`);

fs.mkdirSync(path.join(deck, 'assets'), { recursive: true });
const content = structuredClone(c);
for (const [name, src] of Object.entries(images)) {
  const dest = `assets/${name}${path.extname(src).toLowerCase()}`;
  for (const f of fs.readdirSync(path.join(deck, 'assets'))) {
    if (f.startsWith(`${name}.`) && `assets/${f}` !== dest) fs.rmSync(path.join(deck, 'assets', f));
  }
  if (path.resolve(deck, dest) !== src) fs.copyFileSync(src, path.join(deck, dest));
  content[name].image = dest;
}
const box = {};
vm.runInNewContext(`${RENDER.exec(html)[1]}\nthis.deckSlides = deckSlides; this.deckSig = deckSig;`, box);
const json = JSON.stringify(content, null, 1).replace(/</g, '\\u003c');
const out = box.deckSlides(content);
html = html
  .replace(BLOCK, (_, a, b) => `${a}\n${json}\n${b}`)
  .replace(SLIDES, (_, a, b) => `${a}\n${out.stage}\n${b}`)
  .replace(SCREENS, (_, a, b) => `${a}\n${out.mobile}\n${b}`)
  .replace(SIG, (_, a, b) => `${a}${box.deckSig(json)}${b}`)
  .replace(/<html lang="[^"]*"/, `<html lang="${String(content.lang).replace(/[^\w-]/g, '')}"`);
fs.writeFileSync(entry, html);
console.log(shown(entry));

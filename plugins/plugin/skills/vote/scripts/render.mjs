#!/usr/bin/env node
/*
 * Fill the vote presentation from decks/vote/vote.json.
 *
 *   node <plugin>/skills/vote/scripts/render.mjs decks/vote
 *       the skill's own template → decks/vote/dist/ (index.html + assets/)
 *   node <plugin>/skills/vote/scripts/render.mjs decks/vote --into decks/vote/deck
 *       fills a deck started with `slideless template start` in place
 *
 * One engine: the content goes into the JSON block `vote-content`, and the
 * screens are rendered into the file with the template's own `voteScreens`
 * function, so the cover shows before any script runs. The images the content
 * names (paths relative to the folder holding vote.json) are copied to
 * assets/does.<ext> and assets/moment.<ext>.
 *
 * Exit 2, one line per problem: an empty required field, a line count out of
 * range, a text too long for the screen, a missing image, a demo link that is
 * not https, a target that is not a vote template.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const intoAt = args.indexOf('--into');
const into = intoAt >= 0 ? args[intoAt + 1] : null;
if (intoAt >= 0 && !into) {
  console.error('--into needs a folder');
  process.exit(2);
}
const positional = args.filter((a, i) => !a.startsWith('--') && (intoAt < 0 || i !== intoAt + 1));
const dir = path.resolve(positional[0] ?? 'decks/vote');
const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');

const fail = (lines) => {
  console.error([].concat(lines).join('\n'));
  process.exit(2);
};

// ─── the content ─────────────────────────────────────────────────────────────
const votePath = path.join(dir, 'vote.json');
if (!fs.existsSync(votePath)) fail(`no vote.json in ${dir}`);
let c;
try {
  c = JSON.parse(fs.readFileSync(votePath, 'utf8'));
} catch (e) {
  fail(`vote.json: ${e.message}`);
}

const problems = [];
const text = (key, value, max) => {
  if (typeof value !== 'string' || !value.trim()) problems.push(`vote.json: "${key}" is empty`);
  else if (value.length > max) problems.push(`vote.json: "${key}" is ${value.length} characters, keep it under ${max} (it must fit a phone)`);
};
const lines = (key, value, min, maxCount, max) => {
  if (!Array.isArray(value) || value.length < min || value.length > maxCount)
    problems.push(`vote.json: "${key}" needs ${min} to ${maxCount} lines, has ${Array.isArray(value) ? value.length : 'none'}`);
  else value.forEach((v, i) => text(`${key}[${i}]`, v, max));
};
const IMAGE = /\.(jpe?g|png|webp|gif|svg)$/i;
const images = {};
const image = (key, value) => {
  if (typeof value !== 'string' || !value.trim()) return problems.push(`vote.json: "${key}" is empty`);
  if (/^[a-z]+:/i.test(value) || path.isAbsolute(value)) return problems.push(`vote.json: "${key}" must be a file path relative to ${path.relative(process.cwd(), dir) || '.'}, not ${value}`);
  if (!IMAGE.test(value)) return problems.push(`vote.json: "${key}" must be a .jpg, .png, .webp, .gif or .svg image`);
  const src = path.resolve(dir, value);
  if (!fs.existsSync(src)) return problems.push(`vote.json: "${key}" names ${value}, which does not exist`);
  images[key] = src;
};

text('lang', c.lang, 5);
text('team', c.team, 40);
text('product', c.product, 32);
text('oneLiner', c.oneLiner, 140);
text('forWhom', c.forWhom, 80);
text('problem.person', c.problem?.person, 80);
text('problem.text', c.problem?.text, 200);
image('does.image', c.does?.image);
lines('does.lines', c.does?.lines, 1, 3, 90);
image('moment.image', c.moment?.image);
text('moment.text', c.moment?.text, 140);
if (c.built !== null && c.built !== undefined) lines('built.lines', c.built?.lines, 1, 3, 90);
text('why.line', c.why?.line, 120);
lines('why.members', c.why?.members, 1, 8, 40);
if (c.demoUrl !== null && c.demoUrl !== undefined) {
  let ok = false;
  try {
    ok = new URL(c.demoUrl).protocol === 'https:';
  } catch {
    /* not a URL */
  }
  if (!ok) problems.push(`vote.json: "demoUrl" must be an https:// link or null, not ${c.demoUrl}`);
}
if (problems.length) fail(problems);

// ─── the target ──────────────────────────────────────────────────────────────
const out = path.resolve(into ?? path.join(dir, 'dist'));
const base = into ? path.join(out, 'index.html') : path.join(TEMPLATE, 'index.html');
if (!fs.existsSync(base)) fail(`${base}: missing (start the deck from the template first)`);
let html = fs.readFileSync(base, 'utf8');
const BLOCK = /(<script type="application\/json" id="vote-content">)[\s\S]*?(<\/script>)/;
const SCREENS = /(<!-- screens:start -->)[\s\S]*?(<!-- screens:end -->)/;
const RENDER = /<script id="vote-render">([\s\S]*?)<\/script>/;
const SIG = /(<main id="deck"[^>]*data-sig=")[^"]*(")/;
if (!BLOCK.test(html) || !SCREENS.test(html) || !RENDER.test(html) || !SIG.test(html))
  fail(`${path.relative(process.cwd(), base)}: not a vote template (no vote-content block, screens markers or vote-render script)`);

// ─── the images: assets/does.<ext>, assets/moment.<ext> ─────────────────────
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
const content = structuredClone(c);
for (const [key, src] of Object.entries(images)) {
  const name = key.split('.')[0];
  const dest = `assets/${name}${path.extname(src).toLowerCase()}`;
  for (const f of fs.readdirSync(path.join(out, 'assets'))) {
    if (f.startsWith(`${name}.`) && `assets/${f}` !== dest) fs.rmSync(path.join(out, 'assets', f));
  }
  if (path.resolve(out, dest) !== src) fs.copyFileSync(src, path.join(out, dest));
  content[name].image = dest;
}
if (content.built && !content.built.lines?.length) content.built = null;

// ─── the file: the JSON block and the screens, one engine ───────────────────
const sandbox = {};
vm.runInNewContext(`${RENDER.exec(html)[1]}\nthis.voteScreens = voteScreens; this.voteSig = voteSig;`, sandbox);
const json = JSON.stringify(content).replace(/</g, '\\u003c');
const screens = sandbox.voteScreens(content);
html = html
  .replace(BLOCK, (_, a, b) => `${a}\n${json}\n${b}`)
  .replace(SCREENS, (_, a, b) => `${a}\n${screens}\n${b}`)
  .replace(SIG, (_, a, b) => `${a}${sandbox.voteSig(json)}${b}`)
  .replace(/<html lang="[^"]*">/, `<html lang="${String(content.lang).replace(/[^\w-]/g, '')}">`);
fs.writeFileSync(path.join(out, 'index.html'), html);
const written = path.join(out, 'index.html');
const shown = path.relative(process.cwd(), written);
console.log(shown.startsWith('..') ? written : shown);

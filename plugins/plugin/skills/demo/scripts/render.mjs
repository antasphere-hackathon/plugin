#!/usr/bin/env node
/*
 * Render a demo deck from decks/demo/demo.json and decks/demo/screens/ into
 * decks/demo/dist/ (index.html + the screenshots beside it), ready for
 * `slideless push decks/demo/dist`.
 *
 *   node <plugin>/skills/demo/scripts/render.mjs decks/demo
 *
 * The layout is the plugin's fallback demo layout: a cover, how to open the
 * app, one slide per step (what to do, the screenshot, what you should see),
 * the one thing to try, and what is not finished. One slide at a time; the
 * arrow keys, a click or a swipe move on. No external request: the page is
 * system fonts and inline CSS, so it renders the same in the Slideless viewer.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? 'decks/demo');
const demoPath = path.join(dir, 'demo.json');
if (!fs.existsSync(demoPath)) {
  console.error(`no demo.json in ${dir}`);
  process.exit(2);
}
const demo = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
const results = fs.existsSync(path.join(dir, 'results.json'))
  ? JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'))
  : { steps: [] };
const shotOf = (n) => results.steps.find((s) => s.step === n)?.shot ?? null;

const problems = [];
for (const key of ['title', 'oneLiner']) if (!demo[key]) problems.push(`demo.json: "${key}" is empty`);
if (!Array.isArray(demo.steps) || demo.steps.length === 0) problems.push('demo.json: no steps');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(2);
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// `quoted` words in a step become <b>: the exact labels of the screen.
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<b>$1</b>');

const out = path.join(dir, 'dist');
fs.mkdirSync(path.join(out, 'screens'), { recursive: true });

const slides = [];
slides.push(`<section class="cover">
  <p class="eyebrow">${esc(demo.team ?? '')}${demo.team ? ' · ' : ''}Demo</p>
  <h1>${esc(demo.title)}</h1>
  <p class="lede">${rich(demo.oneLiner)}</p>
  ${demo.forWhom ? `<p class="who">For ${rich(demo.forWhom)}</p>` : ''}
  <p class="hint">→ to start</p>
</section>`);

if (demo.app?.open || demo.app?.signIn) {
  slides.push(`<section>
  <p class="eyebrow">Before you start</p>
  <h2>How to open it</h2>
  ${demo.app.open ? `<p class="big">${rich(demo.app.open)}</p>` : ''}
  ${demo.app.signIn ? `<p class="big">${rich(demo.app.signIn)}</p>` : ''}
</section>`);
}

demo.steps.forEach((step, i) => {
  const n = i + 1;
  const shot = step.shot === false ? null : shotOf(n) ?? `${String(n).padStart(2, '0')}.jpg`;
  const src = shot && fs.existsSync(path.join(dir, 'screens', shot)) ? shot : null;
  if (src) fs.copyFileSync(path.join(dir, 'screens', src), path.join(out, 'screens', src));
  else if (step.shot !== false) console.error(`step ${n}: no screenshot (run play.mjs first)`);
  slides.push(`<section class="step">
  <div class="text">
    <p class="eyebrow">Step ${n} of ${demo.steps.length}</p>
    <h2>${esc(step.title)}</h2>
    <p class="do">${rich(step.do)}</p>
    ${step.see ? `<p class="see"><span>You should see</span>${rich(step.see)}</p>` : ''}
  </div>
  ${src ? `<figure><img src="screens/${esc(src)}" alt="${esc(step.title)}" loading="lazy"></figure>` : ''}
</section>`);
});

if (demo.tryThis?.text) {
  slides.push(`<section>
  <p class="eyebrow">The one thing to try</p>
  <h2>${esc(demo.tryThis.title ?? 'Try this')}</h2>
  <p class="big">${rich(demo.tryThis.text)}</p>
</section>`);
}

if (Array.isArray(demo.notFinished) && demo.notFinished.length) {
  slides.push(`<section>
  <p class="eyebrow">Honestly</p>
  <h2>Not finished yet</h2>
  <ul>${demo.notFinished.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>
</section>`);
}

const html = `<!doctype html>
<html lang="${esc(demo.lang ?? 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(demo.title)} · Demo</title>
<style>
:root { --paper:#f4f1ea; --ink:#1d1b18; --muted:#6b645a; --accent:#7a6652; --line:#ddd6c9; --top:var(--slideless-topbar,0px); }
@media (prefers-color-scheme: dark) { :root { --paper:#171512; --ink:#f1ece3; --muted:#a39a8c; --accent:#c9b49c; --line:#332e27; } }
* { box-sizing:border-box; margin:0; }
html,body { height:100%; background:var(--paper); color:var(--ink); font:18px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
main { position:fixed; inset:var(--top) 0 0 0; }
section { position:absolute; inset:0; display:none; flex-direction:column; justify-content:center; padding:6vh 7vw; gap:1.2rem; }
section.on { display:flex; }
section.step { flex-direction:row; align-items:center; gap:4vw; }
section.step .text { flex:0 0 32%; display:flex; flex-direction:column; gap:1rem; }
figure { flex:1; min-width:0; }
figure img { width:100%; max-height:78vh; object-fit:contain; object-position:left center; border:1px solid var(--line); border-radius:10px; box-shadow:0 12px 40px rgba(0,0,0,.12); }
.eyebrow { font-size:.8rem; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); }
h1 { font-size:clamp(2.4rem,6vw,4.6rem); line-height:1.05; letter-spacing:-.02em; }
h2 { font-size:clamp(1.6rem,3vw,2.4rem); line-height:1.15; letter-spacing:-.01em; }
.lede { font-size:clamp(1.2rem,2vw,1.6rem); max-width:40ch; }
.who,.hint { color:var(--muted); }
.big { font-size:1.3rem; max-width:52ch; }
.do { font-size:1.15rem; }
.see { color:var(--muted); border-left:3px solid var(--accent); padding-left:.8rem; }
.see span { display:block; font-size:.75rem; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); }
ul { font-size:1.2rem; padding-left:1.2rem; display:grid; gap:.5rem; }
nav { position:fixed; right:1.2rem; bottom:1rem; color:var(--muted); font-size:.85rem; }
@media (max-width: 800px) { section.step { flex-direction:column; align-items:stretch; overflow:auto; justify-content:flex-start; } section.step .text { flex:none; } }
</style>
</head>
<body>
<main>
${slides.join('\n')}
</main>
<nav><span id="n">1</span> / ${slides.length}</nav>
<script>
const s = [...document.querySelectorAll('section')]; let i = 0;
const go = (k) => { i = Math.max(0, Math.min(s.length - 1, k)); s.forEach((x, j) => x.classList.toggle('on', j === i)); document.getElementById('n').textContent = i + 1; history.replaceState(null, '', '#' + (i + 1)); };
addEventListener('keydown', (e) => { if (['ArrowRight','PageDown',' '].includes(e.key)) go(i + 1); if (['ArrowLeft','PageUp'].includes(e.key)) go(i - 1); if (e.key === 'Home') go(0); if (e.key === 'End') go(s.length - 1); });
addEventListener('click', (e) => { if (e.target.closest('a')) return; go(e.clientX > innerWidth / 3 ? i + 1 : i - 1); });
let x0 = null; addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }); addEventListener('touchend', (e) => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) go(d < 0 ? i + 1 : i - 1); x0 = null; });
go((parseInt(location.hash.slice(1), 10) || 1) - 1);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(JSON.stringify({ ok: true, out, slides: slides.length }));

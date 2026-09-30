#!/usr/bin/env node
/*
 * The plugin's CI check, no dependency: the marketplace and the plugin
 * manifests parse and agree, every skill has a SKILL.md whose frontmatter
 * names the skill as its folder and carries a description, every skill is in
 * the README (its table and its layout), no skill passes a credential flag
 * to the CLI, and every script a skill names exists and parses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const problems = [];
const fail = (m) => problems.push(m);
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  } catch (e) {
    fail(`${p}: ${e.message}`);
    return null;
  }
};
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const market = readJson('.claude-plugin/marketplace.json');
if (market) {
  if (!KEBAB.test(market.name ?? '')) fail('marketplace.json: name must be kebab-case');
  if (!market.owner?.name) fail('marketplace.json: owner.name is required');
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) fail('marketplace.json: no plugins');
  for (const entry of market.plugins ?? []) {
    if (!KEBAB.test(entry.name ?? '')) fail(`marketplace.json: plugin name "${entry.name}" must be kebab-case`);
    if (typeof entry.source !== 'string' || !entry.source.startsWith('./'))
      fail(`marketplace.json: ${entry.name}: source must be a relative path starting with ./`);
    const dir = path.join(root, entry.source ?? '');
    const manifestPath = path.relative(root, path.join(dir, '.claude-plugin/plugin.json'));
    const manifest = readJson(manifestPath);
    if (!manifest) continue;
    if (manifest.name !== entry.name) fail(`${manifestPath}: name "${manifest.name}" differs from the marketplace's "${entry.name}"`);
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) fail(`${manifestPath}: version must be x.y.z`);
    if (entry.version) fail(`marketplace.json: ${entry.name}: keep the version in plugin.json only`);

    const skillsDir = path.join(dir, 'skills');
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    for (const skill of fs.readdirSync(skillsDir)) {
      // Every skill is in the README's table and its layout, so a new one is never shipped undocumented.
      if (!readme.includes(`\`/${entry.name}:${skill}\``)) fail(`README.md: the skill table does not name /${entry.name}:${skill}`);
      if (!readme.includes(`skills/${skill}/SKILL.md`)) fail(`README.md: the layout does not list skills/${skill}/SKILL.md`);
      const file = path.join(skillsDir, skill, 'SKILL.md');
      const rel = path.relative(root, file);
      if (!fs.existsSync(file)) {
        fail(`${rel}: missing`);
        continue;
      }
      const text = fs.readFileSync(file, 'utf8');
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (!fm) {
        fail(`${rel}: no frontmatter`);
        continue;
      }
      const fields = Object.fromEntries(
        fm[1].split('\n').filter((l) => /^[a-z-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()])
      );
      if (fields.name !== skill) fail(`${rel}: name "${fields.name}" must be the folder's "${skill}"`);
      if (!fields.description || fields.description.length < 60) fail(`${rel}: description missing or too short to trigger`);
      if (fields.description && fields.description.length > 1024) fail(`${rel}: description longer than 1024 characters`);
      // A skill never hands a credential to the CLI (the README's promise): no API key or token flag in a command.
      for (const m of text.matchAll(/hackathon [^\n`]*--(api-key|token)\b/g)) fail(`${rel}: passes a credential flag (${m[0]})`);
      for (const m of text.matchAll(/skills\/[a-z-]+\/scripts\/[\w.-]+/g)) {
        const p = path.join(dir, m[0]);
        if (!fs.existsSync(p)) fail(`${rel}: names ${m[0]}, which does not exist`);
      }
    }
    const scripts = path.join(skillsDir, 'demo', 'scripts');
    for (const f of fs.existsSync(scripts) ? fs.readdirSync(scripts) : []) {
      const p = path.join(scripts, f);
      if (f.endsWith('.mjs')) {
        try {
          execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
        } catch (e) {
          fail(`${path.relative(root, p)}: ${String(e.stderr).split('\n')[0]}`);
        }
      } else if (f.endsWith('.json')) {
        readJson(path.relative(root, p));
      }
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✓ the marketplace, the plugin and its skills are consistent');

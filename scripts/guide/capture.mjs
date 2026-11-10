// Takes the real screenshots used in the user guide from the running, built app.
// Usage: npm run build && npx vite preview --port 4173 &  node scripts/guide/capture.mjs <outDir>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/npm-tools/node_modules/playwright'); }
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const URL = process.env.GUIDE_URL_BASE || 'http://localhost:4173/';
const rounds = JSON.parse(readFileSync(resolve('src/data/rounds.json'), 'utf8')).rounds;
const answers = new Map(); rounds.forEach((r) => r.categories.forEach((c) => c.questions.forEach((q) => answers.set(q.question, q.answer))));

const browser = await pw.chromium.launch();
const mk = async (w, h, dsf) => { const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.goto(URL); await p.waitForTimeout(900); return p; };
// tall = grow the window to fit the page so the sticky header is drawn once, at the top.
const snap = async (p, name, { tall = 0 } = {}) => { if (tall) { await p.setViewportSize({ width: 390, height: tall }); await p.evaluate(() => window.scrollTo(0, 0)); } await p.waitForTimeout(name === '04-rounds' ? 3200 : 800); await p.screenshot({ path: resolve(out, `${name}.jpg`), type: 'jpeg', quality: 88 }); if (tall) await p.setViewportSize({ width: 390, height: 844 }); console.log('shot', name); };
const names = ['Ama', 'Kofi', 'Esi'];
const start = async (p, multi) => {
  await p.getByRole('button', { name: /start playing/i }).click(); await p.waitForTimeout(300);
  if (multi) {
    await p.getByRole('radio', { name: /multiplayer/i }).click(); await p.getByRole('button', { name: /more players/i }).click(); await p.waitForTimeout(200);
    for (let i = 0; i < 3; i++) await p.getByLabel(`Player ${i + 1} name`).fill(names[i]);
  } else await p.getByLabel('Your name').fill('Ama');
};
const answerCorrect = async (p) => {
  const q = (await p.locator('.qcard__text, .qcard h2, .qcard p').first().innerText()).trim();
  const ans = [...answers.entries()].find(([k]) => k.trim() === q)?.[1];
  const o = ans ? p.locator('.opt', { hasText: ans }).first() : p.locator('.opt').first();
  await o.click();
};

// 01 home (desktop)
let p = await mk(1280, 760, 1.5); await snap(p, '01-home'); await p.context().close();

// 02 setup + 03 rules
p = await mk(390, 844, 2); await start(p, true); await snap(p, '02-setup');
await p.getByRole('button', { name: /game rules/i }).click(); await p.waitForTimeout(400);
for (const re of [/50\/50/i, /double or nothing/i, /streak/i]) { const sw = p.getByRole('switch', { name: re }).first(); if (await sw.count()) await sw.click().catch(() => {}); }
await snap(p, '03-rules', { tall: 1500 }); await p.context().close();

// multiplayer game
p = await mk(390, 844, 2); await start(p, true);
await p.getByRole('button', { name: /choose a round/i }).click(); await snap(p, '04-rounds', { tall: 1500 });
await p.locator('.rcard').nth(1).click(); await p.waitForTimeout(700);
// play a few tiles: buzz, answer (some right, some wrong)
const play = async (idx, who, right, last) => {
  const tiles = p.locator('.tile:not(:disabled)'); await tiles.nth(idx).click(); await p.waitForTimeout(500);
  if (last === 'buzz') await snap(p, '06-buzz');
  await p.getByRole('button', { name: new RegExp(`${who} buzz in`) }).click(); await p.waitForTimeout(400);
  if (last === 'buzz') await snap(p, '07-answer');
  if (right) await answerCorrect(p); else await p.locator('.opt').first().click().catch(() => {});
  if (last === 'buzz') { await p.waitForTimeout(600); await snap(p, '08-reveal'); }
  await p.waitForTimeout(500);
  const back = p.getByRole('button', { name: /back to the board|next/i }).first(); await back.click().catch(() => {}); await p.waitForTimeout(500);
};
// first question: capture buzz/answer/reveal states (tile 3 = a 30 pointer in the first column)
await play(2, 'Kofi', true, 'buzz');
await play(0, 'Ama', true); await play(6, 'Esi', true); await play(1, 'Kofi', true); await play(12, 'Ama', true);
await p.setViewportSize({ width: 1280, height: 900 }); await snap(p, '05-board');
await p.setViewportSize({ width: 390, height: 844 });
await p.getByRole('button', { name: /open scoreboard/i }).click().catch(async () => { await p.locator('.icon-btn--label').first().click(); }); await snap(p, '09-scores');
await p.getByRole('button', { name: /go back/i }).click(); await p.waitForTimeout(500);
await p.getByRole('button', { name: /go back/i }).click(); await p.waitForTimeout(700);
await p.getByRole('button', { name: /finish game/i }).first().click().catch((e) => console.log('finish?', e.message.slice(0, 50))); await snap(p, '13-final', { tall: 1250 });
await p.context().close();

// builder
p = await mk(390, 844, 2); await start(p, false); await p.getByRole('button', { name: /choose a round/i }).click(); await p.waitForTimeout(600);
await p.getByText('Build your own board').first().click(); await p.waitForTimeout(600);
const topics = p.locator('.topic'); for (let i = 0; i < 5; i++) await topics.nth(i * 4).click().catch(() => {});
await p.evaluate(() => window.scrollTo(0, 0)); await snap(p, '12-builder', { tall: 1250 }); await p.context().close();

// quick-fire
p = await mk(390, 844, 2); await start(p, false);
await p.getByRole('radio', { name: /quick-fire/i }).click(); await p.waitForTimeout(300);
await p.getByRole('button', { name: /start quick-fire/i }).click(); await p.waitForTimeout(600); await snap(p, '10-quick-ready');
await p.locator('.qf__ready').getByRole('button', { name: /start/i }).click().catch((e) => console.log('qf start', e.message.slice(0, 60))); await p.waitForTimeout(900); await snap(p, '11-quick-play');
await browser.close();

#!/usr/bin/env node
// Later-moment screenshots for before/after art sheets (batch G, Nov 2026), named like tools/polish/survey.js play shots.
//   node tools/w31/deep-shots.js <out dir> <code[@era]> <t1,t2,...> [<code[@era]> <times> ...] [--root=<repo folder>]
//   code: a level code (31-1); 30-1@3 jumps The Time Thief to era 3 (0-9) first. Math.random is seeded inside step()
//   only, so the same tree gives the same run and the drawing can't change it. --root picks another checkout (default:
//   this one), so the same script takes the "before" pictures from main.
// Writes <out>/wNN/<code>-<Name>-laptop-1-play-[eE-]<t>s.png at 1280x760, the computer at both seats.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const all = process.argv.slice(2), args = all.filter(a => !a.startsWith('--'));
const rootArg = all.find(a => a.startsWith('--root='));
const root = rootArg ? path.resolve(rootArg.slice(7)) : path.resolve(__dirname, '..', '..');
const out = path.resolve(args[0]);
const jobs = []; for (let i = 1; i + 1 < args.length; i += 2) jobs.push([args[i], args[i + 1].split(',').map(Number)]);
(async () => {
  const browser = await chromium.launch();
  for (const [spec, times] of jobs) {
    const [code, era] = spec.split('@');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(() => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      const seeded = gen(7919); const other = gen(12345);
      window.__inStep = false;
      Math.random = () => (window.__inStep ? seeded() : other());
    });
    await page.goto('file://' + path.join(root, 'index.html'));
    await page.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
    await page.waitForTimeout(300);
    const info = await page.evaluate(({ code, era }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
      document.getElementById('overlay').classList.add('hidden');
      G.manual = true; G.cpuOn = [true, true];
      window.__inStep = true; P.loadLevel(i); window.__inStep = false;
      G.introT = 0;
      if (era !== undefined) { const TT = P.MODES.timethief.test; window.__inStep = true; TT.jump(+era, {}); window.__inStep = false; G.cpuOn = [true, true]; }
      return { name: P.LEVELS[i].name, world: P.LEVELS[i].world + 1 };
    }, { code, era });
    const dir = path.join(out, 'w' + String(info.world).padStart(2, '0')); fs.mkdirSync(dir, { recursive: true });
    const slug = code + '-' + info.name.replace(/[^A-Za-z0-9]+/g, '-');
    let simT = 0;
    for (const t of times) {
      const mode = await page.evaluate(async dt => {
        const P = window.__pipbo, G = P.G, n = Math.round(dt / P.DT);
        window.__inStep = true;
        for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT);
        window.__inStep = false;
        return G.mode;
      }, t - simT);
      simT = t;
      await page.waitForTimeout(120);
      const f = path.join(dir, `${slug}-laptop-1-play-${era !== undefined ? 'e' + era + '-' : ''}${t}s.png`);
      await page.screenshot({ path: f });
      if (mode !== 'play') break;
    }
    if (errs.length) console.log(spec, 'errors:', errs.slice(0, 3));
    console.log(spec, 'done');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });

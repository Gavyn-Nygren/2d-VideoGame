#!/usr/bin/env node
// Later-room screenshots for the art passes: for each level, every room/stretch/phase is loaded with nextRoom(), the
// computer plays both seats for a few seconds (Math.random seeded so before/after match), and a laptop-size picture is
// saved as <out>/wNN/<code>-<name>-laptop-1-play-room<k>-<t>s.png.
// Usage: node tools/w19/room-shots.js <codes, comma separated> --out=<dir> [--at=4,12] [--root=<repo folder>]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const codes = (args.find(a => !a.startsWith('--')) || '').split(',').filter(Boolean);
const out = path.resolve(opt('out', 'build/rooms')), at = opt('at', '4,12').split(',').map(Number);
const root = path.resolve(opt('root', path.join(__dirname, '..', '..')));
const only = opt('room', ''), evalJs = opt('eval', '');   // --room=4 shoots only that room; --eval runs JS (G, P in scope) after loading it
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('ERR', String(e.message)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let g = gen(4242); window.__reseed = () => { g = gen(4242); }; Math.random = () => g();
  });
  await page.addInitScript(js => { window.__evalJs = js; }, evalJs);
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
  await page.waitForTimeout(300);
  const list = await page.evaluate(() => window.__pipbo.LEVELS.map((l, i) => ({ i, code: window.__pipbo.levelCode(i), name: l.name, world: l.world + 1, rooms: (l.rooms || [l]).length })));
  for (const code of codes) {
    const lv = list.find(l => l.code === code); if (!lv) { console.log('no level', code); continue; }
    const dir = path.join(out, 'w' + String(+code.split('-')[0]).padStart(2, '0')); fs.mkdirSync(dir, { recursive: true });
    const slug = lv.code + '-' + lv.name.replace(/[^A-Za-z0-9]+/g, '-');
    for (let k = 0; k < lv.rooms; k++) {
      if (only && +only !== k + 1) continue;
      await page.evaluate(({ i, k }) => {
        window.__reseed();
        const P = window.__pipbo, G = P.G; document.getElementById('overlay').classList.add('hidden');
        G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); for (let n = 0; n < k; n++) P.nextRoom(); G.introT = 0;
        if (window.__evalJs) (new Function('G', 'P', window.__evalJs))(G, P);
      }, { i: lv.i, k });
      let simT = 0;
      for (const t of at) {
        await page.evaluate(async dt => {
          const P = window.__pipbo, G = P.G; const n = Math.round(dt / P.DT);
          for (let q = 0; q < n && G.mode === 'play'; q++) { P.step(P.DT); if (q % 600 === 599) await new Promise(r => setTimeout(r, 0)); }
        }, t - simT);
        simT = t;
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(dir, `${slug}-laptop-1-play-room${k + 1}-${t}s.png`) });
      }
      console.log(code, 'room', k + 1, 'of', lv.rooms);
    }
  }
  await browser.close();
})();

#!/usr/bin/env node
// Slinky Stairs course check: for every hop (step -> next step) in every flight, the green meter band from the middle
// and from both ends of the step it flops from, whether the middle-of-the-band arc passes through another step, and the
// star counts. Prints problems; exits 1 if any hop can't be made.
// Usage: node tools/w24/slinky-check.js [--all]   (--all prints every hop)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const all = process.argv.includes('--all');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate((all) => {
    const P = window.__pipbo, M = P.MODES.slinky, D = M.SLK, def = P.LEVELS.find(l => l.name === 'Slinky Stairs');
    const out = []; let bad = 0, stars = 0;
    def.rooms.forEach((room, ri) => {
      const c = M.compile(room); stars += c.starsAll;
      out.push(`Flight ${ri + 1} ${room.title}: ${c.steps.length} steps, ${c.starsAll} stars, bottom ${c.bottom | 0}`);
      const st = { t: 0, c };
      for (const a of c.steps) for (const ni of a.next) {
        const tg = c.steps[ni], spring = a.kind === 'spring';
        const zs = [a.x0 + D.edge, a.cx, a.x1 - D.edge].map(x => M.zone(st, x, a.y, spring, tg));
        const zc = zs[1], w = zc.hi - zc.lo;
        // the arc from the middle at the band's middle: does it cross another step's box?
        let hit = null, x = a.cx + zc.dir * 4, y = a.y - 2;
        const vx = zc.dir * (D.vxMin + zc.mc * (D.vxMax - D.vxMin)) * (spring ? D.springK : 1); let vy = -(spring ? D.springVy : D.vy0);
        const tp = M.posAt(tg, zc.tl);
        for (let i = 0; i < 400; i++) {
          const dt = 1 / 240; vy += D.g * dt; x += vx * dt; y += vy * dt;
          if (vy > 0 && y >= tp.y && x > tp.x0 && x < tp.x1) break;
          for (const s of c.steps) if (s !== a && s !== tg && x > s.x0 - 14 && x < s.x1 + 14 && y > s.y - 26 && y < s.y + s.h + 10) hit = hit || s.i;
          if (y > tg.y + 400) { hit = hit || 'miss'; break; }
        }
        const ends = zs.map(z => z.lo <= 1 && z.hi >= 0 && z.hi > z.lo ? 'ok' : 'NO').join('/');
        const cw = Math.min(1, zc.hi) - Math.max(0, zc.lo), prob = cw < (tg.w <= D.tinyW ? 0.08 : 0.14) || hit != null || ends.includes('NO');
        if (prob) bad++;
        if (prob || all) out.push(`  ${prob ? 'BAD ' : '    '}${a.i}(${a.kind} ${a.cx | 0},${a.y}) -> ${tg.i}(${tg.kind} ${tg.cx | 0},${tg.y}) band ${zc.lo.toFixed(2)}..${zc.hi.toFixed(2)} mc ${zc.mc.toFixed(2)} ends ${ends}${hit != null ? ' HITS ' + hit : ''}`);
      }
    });
    out.push('stars in all: ' + stars);
    return { out, bad };
  }, all);
  console.log(r.out.join('\n'));
  if (errors.length) console.log('ERRORS', errors.join('\n'));
  await b.close(); process.exit(r.bad || errors.length ? 1 : 0);
})();

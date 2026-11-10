#!/usr/bin/env node
// 30-1 era 'davinci' (Leonardo's Flying Machine): checks the hand-made course (TTHVINCI_COURSE) in headless Chromium.
//   node tools/w30/davinci-course.js
// For every stretch it walks the page trail (tthVinciPath) and checks that
//   - the machine's box on the trail is at least CLEAR px from every tower, washing line, dome, cloud and banner,
//     at least GROUND px over the ground and never above the soft ceiling;
//   - the trail is never steeper than the machine can climb or dive at cruising speed;
//   - every flock of pigeons flies at least BIRDS px away from the trail where it meets the machine, and never near
//     a take-off or a landing; every gust cloud can be out-climbed; no obstacle stands in a take-off or landing run;
//   - the pages lie on the trail, none inside an obstacle.
// Prints one line per stretch (length, obstacles, pages, tightest gap) and every problem; exit code 1 on a problem.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const CLEAR = 44, GROUND = 50, BIRDS = 50;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(({ CLEAR, GROUND, BIRDS }) => {
    /* global TTHVINCI, TTHVINCI_COURSE, tthVinciCompile, tthVinciPath, tthVinciGap, tthVinciGround */
    const K = TTHVINCI, c = tthVinciCompile(), bad = [], lines = [];
    const cruise = 2 * K.beat.push / K.drag;   // level speed at 2 beats a second
    for (let k = 0; k < 3; k++) {
      const S = TTHVINCI_COURSE[k], a = c.X[k], b = k < 2 ? c.perches[k].x : a + K.chase.open + 300;
      const from = a + 330, to = k < 2 ? b - K.perch.reach : b;
      let tight = 999, tightAt = 0, steep = 0, low = 999;
      for (let x = from; x <= to; x += 4) {
        const y = tthVinciPath(c, x);
        if (y < K.top + 4) bad.push(`stretch ${k + 1}: the trail is above the ceiling at ${x - a} (y ${Math.round(y)})`);
        const gy = Math.min(tthVinciGround(c, x - 14), tthVinciGround(c, x + 22)) - (y + K.hh);
        if (gy < low) low = gy;
        if (gy < GROUND) bad.push(`stretch ${k + 1}: the trail is ${Math.round(gy)} px over the ground at ${x - a}`);
        for (const ob of c.obs) {
          const gp = tthVinciGap(ob, x, y);
          if (gp === null) continue;
          if (gp < tight) { tight = gp; tightAt = x - a; }
          if (gp < CLEAR) bad.push(`stretch ${k + 1}: ${ob.kind} at ${Math.round((ob.x0 + ob.x1) / 2 - a)}: the trail is ${Math.round(gp)} px from it at ${x - a}`);
        }
        const sl = (tthVinciPath(c, x + 4) - y) / 4;
        steep = Math.max(steep, Math.abs(sl));
        // climbing: K.climb px/s at the climbing speed (beats minus the nose-up drag); diving: K.dive
        const vUp = (2 * K.beat.push - K.upSlow) / K.drag;
        if (sl < 0 && -sl * vUp > K.climb * 0.86) bad.push(`stretch ${k + 1}: too steep a climb at ${x - a} (${(-sl).toFixed(2)})`);
        if (sl > 0 && sl * K.vMax > K.dive * 0.95) bad.push(`stretch ${k + 1}: too steep a dive at ${x - a} (${sl.toFixed(2)})`);
      }
      for (const ob of c.obs) {
        if (ob.k !== k) continue;
        if (ob.x0 < a + 480) bad.push(`stretch ${k + 1}: ${ob.kind} too close to the take-off (${Math.round(ob.x0 - a)})`);
        if (k < 2 && ob.x1 > b - K.perch.reach - 150) bad.push(`stretch ${k + 1}: ${ob.kind} in the landing run (${Math.round(ob.x1 - a)})`);
      }
      for (const f of c.flocks) {
        if (f.k !== k) continue;
        if (f.x < a + 1200) bad.push(`stretch ${k + 1}: pigeons too close to the take-off (${f.x - a})`);
        if (k < 2 && f.x > b - K.perch.reach - 350) bad.push(`stretch ${k + 1}: pigeons too close to the landing (${f.x - a})`);
        for (let x = f.x - 200; x <= f.x + 200; x += 10) {   // (they meet the machine within about 160 px of f.x)
          const d = Math.abs(tthVinciPath(c, x) - f.y) - K.flock.r - K.hh;
          if (d < BIRDS) { bad.push(`stretch ${k + 1}: pigeons at ${f.x - a}: only ${Math.round(d)} px from the trail at ${x - a}`); break; }
        }
      }
      const pg = c.pages.filter(q => q.k === k);
      for (const q of pg) for (const ob of c.obs) { const gp = tthVinciGap(ob, q.x, q.y); if (gp !== null && gp < 20) bad.push(`stretch ${k + 1}: a page inside a ${ob.kind} at ${q.x - a}`); }
      lines.push(`stretch ${k + 1} "${S.name}": ${S.len} px (about ${Math.round(S.len / (cruise * 1.12))} s), ${c.obs.filter(o => o.k === k).length} obstacles, ${c.flocks.filter(f => f.k === k).length} flocks, ` +
        `${pg.length} pages, tightest gap ${Math.round(tight)} px at ${Math.round(tightAt)}, lowest ${Math.round(low)} px over the ground, steepest ${steep.toFixed(2)}`);
    }
    for (const z of c.zones) if (z.kind === 'down' && K.down > K.climb * 0.7) bad.push('a storm gust is stronger than the climb');
    if (K.chase.open + 300 > TTHVINCI_COURSE[2].len) bad.push('the piazza opens after the end of the trail');
    return { lines, bad: [...new Set(bad)], pages: c.pages.length, end: c.end, cruise: Math.round(cruise) };
  }, { CLEAR, GROUND, BIRDS });
  console.log(out.lines.join('\n'));
  console.log(`course ${out.end} px, ${out.pages} pages, level cruise ${out.cruise} px/s`);
  for (const b of out.bad.slice(0, 40)) console.log('PROBLEM: ' + b);
  if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
  console.log(out.bad.length ? `${out.bad.length} problem(s)` : 'course ok');
  await browser.close();
  process.exit(out.bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

#!/usr/bin/env node
// "One thumb" check for the touch layout (each player's 4 arrows + round button sit in ONE corner cluster): the
// computer pair plays each era, but each player may hold only ONE of: ◀▶ strip, ▲, ▼, round button at a time. When
// the brain wants several, the thumb hops between them (--hop s per button). Compares with the unfiltered run.
//   node tools/w30/int-thumb.js [eras] [--hop=0.14] [--max=420] [--seed=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
(async () => {
  const eras = pos[0] ? pos[0].split(',') : ORDER;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; const r = gen(1); Math.random = () => r(); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  for (const era of eras) for (const thumb of [false, true]) {
    const r = await page.evaluate(({ era, thumb, hop, max, seed }) => {
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true; P.cpuSetCfg('players', 2); G.cpuOn = [true, true];
      TT.jump(TT.TTH_ORDER.indexOf(era), { seed }); G.cpuOn = [true, true];
      const S = [{ cur: null, t: 0, i: 0 }, { cur: null, t: 0, i: 0 }]; let multi = [0, 0];
      CPU.filter = !thumb ? null : (p, out, dt) => {
        const s = S[p.id], want = [];
        if (out.left || out.right) want.push('move'); if (out.jump || out.up) want.push('jump'); if (out.down) want.push('down'); if (out.act) want.push('act');
        if (want.length > 1) multi[p.id] += dt;
        s.t -= dt;
        if (!want.includes(s.cur) || (want.length > 1 && s.t <= 0)) { s.i++; s.cur = want.length ? want[s.i % want.length] : null; s.t = hop; }
        const o = {};
        if (s.cur === 'move') { o.left = out.left; o.right = out.right; } else if (s.cur === 'jump') o.jump = out.jump || true; else if (s.cur === 'down') o.down = true; else if (s.cur === 'act') o.act = out.act;
        return o;
      };
      const st0 = G.mst; let t = 0;
      while (t < max && G.mode === 'play' && G.mst === st0 && !G.mst.cut) { P.step(P.DT); t += P.DT; }
      CPU.filter = null;
      const st = G.mst;
      return { era, thumb, t: Math.round(t), won: !!(st && st.cut) || G.mode !== 'play', bumps: st0.stats.bumps.concat(st0.stats.team), help: st0.stats.help.length, multi: multi.map(x => Math.round(x)) };
    }, { era, thumb, hop: +opt('hop', 0.14), max: +opt('max', 420), seed: +opt('seed', 1) });
    console.log(JSON.stringify(r));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });

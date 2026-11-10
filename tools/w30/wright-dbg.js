#!/usr/bin/env node
// Era 'wright' debug: plays with the computer pair and prints the 2.5 s before every counted team bump (10 lines a
// second: mode, Flyer x / y / vy / tilt / power / heat, the engineer's and balancer's keys, every hazard near it).
//   node tools/w30/wright-dbg.js [--seed=1] [--kind=bag|gull|sand|scrape] [--max=3]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(({ seed, kind, max }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, DT = P.DT;
    window.__seed(seed * 7919); G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null;
    TT.jump(TT.TTH_ORDER.indexOf('wright'), {});
    const st = G.mst, buf = [], res = [];
    let team = 0, kinds = {};
    for (let n = 0; n < 400 / DT && !st.cut && res.length < max; n++) {
      P.step(DT);
      const ph = st.ph;
      if (n % 12 === 0) {
        const e = G.players[ph.eng].input, b = G.players[ph.bal].input;
        buf.push(`${st.phT.toFixed(1)} ${ph.mode} f${ph.flight + 1} d ${ph.d | 0} y ${ph.y | 0} vy ${ph.vy | 0} tilt ${ph.tilt.toFixed(2)} pw ${ph.spin.toFixed(2)} heat ${ph.heat.toFixed(2)}${ph.hot > 0 ? ' HOT' : ''} eng[${e.jump ? 'U' : ''}${e.down ? 'D' : ''}] bal[${b.left ? 'L' : ''}${b.right ? 'R' : ''}] gust ${ph.gust ? ph.gust.kind + (ph.gust.tel > 0 ? '(tel)' : '') : '-'} | ` +
          ph.obs.map(o => (o.kind === 'gulls' ? `${o.hi ? 'HI' : 'LO'} dx ${(o.x - ph.x) | 0} y ${o.y0 | 0}-${o.y1 | 0}${o.scat ? ' scat' : ''}` : `bag ${o.state} dx ${(o.x - ph.x) | 0} y ${o.y | 0} ty ${o.ty | 0}`)).join('; '));
        if (buf.length > 26) buf.shift();
      }
      if (st.stats.team !== team) {
        team = st.stats.team;
        const k = Object.keys(st.stats.kinds).find(q => st.stats.kinds[q] !== (kinds[q] || 0));
        kinds = Object.assign({}, st.stats.kinds);
        if (!kind || k === kind) res.push('--- ' + k + ' at ' + st.phT.toFixed(1) + ' s\n' + buf.join('\n'));
      }
    }
    return res.join('\n') + '\nera ' + st.phT.toFixed(1) + ' s ' + JSON.stringify(st.stats.kinds);
  }, { seed: +opt('seed', 1), kind: opt('kind', ''), max: +opt('max', 3) });
  console.log(out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });

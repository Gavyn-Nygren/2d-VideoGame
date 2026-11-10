#!/usr/bin/env node
// A trace of era 'vikings' of 30-1 (Viking Voyage): the computer plays (like tools/w30/play.js) and the script prints
// one line every --every seconds (state, stretch, distance, speed, water, lane, the lookout, the wave) plus every news
// line, gold help and Thief line as it happens. For tuning and for finding stalls.
//   node tools/w30/vikings-trace.js [--who=pair|noisy|kid|idle] [--seed=1] [--clumsy=0|1] [--max=400] [--every=2] [--from=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), seed = +opt('seed', 1), clumsy = +opt('clumsy', 0), maxT = +opt('max', 400), every = +opt('every', 2), from = +opt('from', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(({ who, seed, clumsy, maxT, every, from }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    window.__seed(seed * 7919); window.__inStep = true;
    G.manual = true; P.CPU.errs.clear();
    const idleId = clumsy ? 1 : 0;
    G.cpuOn = who === 'idle' ? [idleId !== 0, idleId !== 1] : [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, q: [] };
    P.CPU.filter = (who !== 'noisy' && who !== 'kid') ? null : (p, o, dt) => {   // (the same clumsy person as play.js)
      if (p.id !== clumsy) return o;
      if (who === 'kid') {
        nz.q.push({ t: G.time + 0.5, out: o }); let o2 = {};
        while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out;
        if (nz.q.length > 200) nz.q.shift();
        o = nz.last = (Object.keys(o2).length ? o2 : nz.last) || {};
        o = Object.assign({}, o);
      }
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      nz.next -= dt;
      if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      nz.wnext -= dt;
      if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
      if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
      if (Math.random() < 0.15 * dt) o.jump = true;
      if (Math.random() < 0.1 * dt) o.act = true;
      return o;
    };
    TT.jump(TT.TTH_ORDER.indexOf('vikings'), { intro: false });
    const st = G.mst, lines = [], n1 = Math.round(maxT / P.DT), ev = Math.max(1, Math.round(every / P.DT));
    let news = null, say = null, ended = '';
    for (let n = 0; n < n1 && !ended; n++) {
      if (who === 'idle') for (const key in G.players[idleId].input) G.players[idleId].input[key] = false;
      P.step(P.DT);
      const ph = st.ph, t = (n * P.DT).toFixed(1);
      if (st.news && st.news !== news) { news = st.news; if (n * P.DT >= from) lines.push(`${t}  NEWS${news.gold ? ' (gold)' : ''}: ${news.text}`); }
      if (st.say && st.say !== say) { say = st.say; if (n * P.DT >= from) lines.push(`${t}  THIEF: ${say.text}`); }
      if (n % ev === 0 && n * P.DT >= from) {
        const L = ph.L, F = ph.fin, w = F && F.wave;
        lines.push(`${t}  ${ph.state} k${ph.k} row=${ph.rower} dist ${Math.round(ph.dist)} v ${Math.round(ph.v)} water ${ph.water.toFixed(2)}${ph.swamped ? ' SWAMPED' : ''} lane ${ph.lane} vis ${Math.round(ph.vis)}  L x${Math.round(L.x)} h${Math.round(L.h)}${L.onMast ? ' mast' : ''}` +
          (F ? `  grabs ${F.grabs} fails ${F.fails} tease ${F.tease.toFixed(1)}${F.gold ? ' GOLD' : ''}${w ? ` wave sx ${Math.round(w.sx)}${w.broke ? ' broke' : ''}${w.got ? ' got' : ''}${w.swiped ? ' swiped' : ''}` : ''}${F.reach ? ' REACH' : ''}` : '') +
          `  bumps ${st.stats.team} ${JSON.stringify(st.stats.kinds)}`);
      }
      if (G.mst !== st) ended = 'restarted'; else if (st.cut) ended = 'portal at ' + st.phT.toFixed(1);
    }
    window.__inStep = false;
    lines.push(`END: ${ended || 'NOT ENDED'}  stats ${JSON.stringify(st.stats.vikings)}  help ${JSON.stringify(st.stats.help)}  cpu errors ${[...P.CPU.errs].join(',') || 'none'}`);
    return lines;
  }, { who, seed, clumsy, maxT, every, from });
  console.log(out.join('\n'));
  if (errors.length) console.log('PAGE MESSAGES:\n' + errors.slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });

#!/usr/bin/env node
// Words-on-screen dump for 30-1: every hint bubble, news line, Thief line, act label, legend, badge, computer bubble
// and pop word per era, per device / player-count config, with the time it first showed.
//   node tools/w30/int-words.js <cfg> [eras] [--max=200] [--seed=1]
//   cfg: solo0-kb solo1-kb 2p-kb 2p-pad 2p-touch solo0-touch solo1-touch solo0-pad solo1-pad
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
(async () => {
  const cfg = pos[0] || '2p-kb', eras = pos[1] ? pos[1].split(',') : ORDER;
  const [pl, dev] = cfg.split('-'), touch = dev === 'touch';
  const browser = await chromium.launch();
  const ctx = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (touch) await page.evaluate(() => { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); });
  for (const era of eras) {
    const r = await page.evaluate(({ era, pl, dev, max, seed }) => {
      /* global G, CPU, Pads, cpuBrainFor, cpuInfo, cpuApply, setKind, refreshGlyphs */
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true;
      if (pl === '2p') { P.cpuSetCfg('players', 2); }
      else { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', +pl.slice(4)); }
      if (dev === 'pad') { Pads.slots = pl === '2p' ? [0, 1] : [0]; setKind('pad'); }
      TT.jump(TT.TTH_ORDER.indexOf(era), { seed, intro: true });
      if (pl === '2p') G.cpuOn = [false, false];
      const hs = [{}, {}], brain = cpuBrainFor(G.level.def);
      for (const p of G.players) if (!G.cpuOn[p.id] && brain.reset) brain.reset(hs[p.id], p, cpuInfo(p));
      const seen = {}, out = [];
      const note = (ch, txt, t) => { if (!txt) return; const k = ch + '|' + txt; if (seen[k]) { seen[k].n++; seen[k].last = t; return; } seen[k] = { ch, txt, t, n: 1 }; out.push(seen[k]); };
      const st0 = G.mst; let t = 0, n = 0, endCut = 0;
      const card = { tip: G.level.def.tip, title: G.level.def.title };
      while (t < max && G.mode === 'play' && G.mst === st0 && G.mst.phase === era) {
        for (const p of G.players) if (!G.cpuOn[p.id]) {
          let o = {};
          if (G.introT <= 0) o = brain.think(hs[p.id], p, G.players[1 - p.id], P.DT, cpuInfo(p)) || {};
          cpuApply(p, o);
        }
        P.step(P.DT); t += P.DT; n++;
        const st = G.mst; if (!st || !st.hints) break;
        const T = Math.round(st.phT * 10) / 10;
        for (let k = 0; k < 2; k++) { const h = st.hints[k]; if (h) note('hint' + '[' + 'PB'[k] + ']' + (h.gold ? '*' : ''), h.text, T); const b = CPU.bubbles[k]; if (b && b.t > 0) note('cpu[' + 'PB'[k] + ']', b.text, T); }
        if (st.news) note('news' + (st.news.gold ? '*' : ''), st.news.text, T);
        if (st.say) note('say', st.say.text, T);
        for (const q of st.pops) note('pop', q.text, T);
        const a = G.level.def.act; note('labels', (a.labels || [a.label, a.label]).join(' / '), T);
        const ph = TT.TTH_PHASES ? TT.TTH_PHASES[era] : null;
        try { const ro = TTH_PHASES[era].roles && TTH_PHASES[era].roles(st); if (ro && st.badgeT > 0) note('badge', ro.join(' / '), T); } catch (e) { note('ERR', String(e), T); }
        try { const ht = TTH_PHASES[era].hudText && TTH_PHASES[era].hudText(st); if (ht) note('hudText', String(ht).replace(/\d+/g, '#'), T); } catch (e) { /* */ }
        if (n % 30 === 0) {
          const lg = Array.from(document.querySelectorAll('[data-leg]')).filter(el => el.offsetParent !== null).map(el => el.dataset.leg + ': ' + el.innerText.replace(/\s+/g, ' ')).join('  ||  ');
          note('legend', lg, T);
          const tb = Array.from(document.querySelectorAll('.tbtn-act')).filter(el => el.offsetParent !== null).map(el => el.textContent + '(' + el.style.fontSize + ')').join(' , ');
          note('touchbtn', tb, T);
        }
        if (st.cut) { if (++endCut > 240) break; }
      }
      return { era, card, t: Math.round(t), phase: G.mst && G.mst.phase, cut: G.mst && G.mst.cut && G.mst.cut.kind, bumps: G.mst && G.mst.stats.bumps.concat(G.mst.stats.team), out };
    }, { era, pl, dev, max: +opt('max', 220), seed: +opt('seed', 1) });
    console.log(`\n===== ${cfg} ${r.era}  (ran ${r.t}s, cut ${r.cut}, bumps ${r.bumps})  tip: ${r.card.tip}`);
    for (const o of r.out) console.log(`  ${String(o.t).padStart(6)}  ${o.ch.padEnd(10)} ${o.txt}${o.n > 1 ? '' : '  (1 tick)'}`);
  }
  if (errs.length) console.log('PAGE MESSAGES:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });

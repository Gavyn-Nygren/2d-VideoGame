#!/usr/bin/env node
// Throwing Star Duel: scripted "people" against the computer.
//   node tools/w29/starduel-kid.js [--who=kid|masher|ducker|sharp|idle] [--skill=easy|normal|hard] [--side=0|1] [--n=10]
// kid:    slow reactions (about 0.45 s), dodges the right way two times in three, never deflects, throws mostly high.
// masher: hammers the action button and never dodges.   ducker: holds duck, mashes low throws, hops low stars.
// avg:    an everyday grown-up: 0.3 s reactions, dodges right 85% of the time, never deflects, throws like the kid.
// sharp:  0.2 s reactions, nearly always dodges right, no deflects, throws high+low pairs and duck feints (out-thinks Hard).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const n = +opt('n', 10), who = opt('who', 'kid'), skill = opt('skill', 'easy'), side = +opt('side', 0);
  const r = await page.evaluate(async ({ n, who, skill, side }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel'), M = P.MODES.starduel;
    const out = { wins: [0, 0, 0], rounds: [0, 0], secs: [], bonks: [0, 0], deflects: [0, 0], whiffs: [0, 0], helps: 0 };
    for (let seed = 1; seed <= n; seed++) {
      window.__seed(seed * 7919);
      G.manual = true; P.CPU.skillOf = [skill, skill]; G.cpuOn = side ? [true, false] : [false, true];
      delete G.results[i]; P.loadLevel(i); G.introT = 0;
      const me = G.players[side], S = { seen: {}, next: 1, q: [], actHeld: false };
      const press = () => { me.pendingAct = true; me.input.act = true; };
      let k = 0;
      while (G.mode === 'play' && k < 120 * 900) {
        const st = G.mst, inp = me.input, dt = P.DT;
        for (const key in inp) inp[key] = false;
        if (st.pl && G.match && G.match.phase === 'live' && !st.res && who !== 'idle') {
          const D = st.pl[side], pl = M.plan(st, side), now = G.time;
          const react = who === 'sharp' ? 0.2 : who === 'avg' ? 0.3 : 0.45, right = who === 'sharp' ? 0.93 : who === 'avg' ? 0.85 : 0.66;
          let down = false;
          if (who === 'masher') { if (Math.floor(now / 0.15) !== Math.floor((now - dt) / 0.15)) press(); }
          else {
            const s = pl.star;
            if (who === 'ducker') down = true;
            if (s) {
              const key = s.id + ':' + s.bounces;
              let m = S.seen[key];
              if (!m) m = S.seen[key] = { at: now + react * (0.8 + Math.random() * 0.4), ok: Math.random() < right };
              if (now >= m.at) {
                const low = s.lane === 1, dodgeLow = m.ok ? low : !low;
                if (who === 'ducker') { if (low && pl.tti < 0.2 && pl.grounded) me.pendingJump = true; }
                else if (dodgeLow) { if (pl.tti < 0.2 && pl.grounded) me.pendingJump = true; }
                else if (pl.tti < 0.4) down = true;
              }
            }
            // throws (never while a star is close: that would be a swing)
            S.next -= dt;
            if (S.q.length) {
              const q = S.q[0]; q.t -= dt;
              if (q.t <= 0) { if (q.low) down = true; if (q.t <= -0.08 && (!pl.inZone) && pl.canThrow && D.duck === !!q.low) { if (!q.feint) press(); S.q.shift(); } if (q.t < -0.6) S.q.shift(); }
            } else if (S.next <= 0 && !pl.inZone) {
              if (who === 'sharp') {
                const r = Math.random();
                if (r < 0.4) S.q.push({ t: 0, low: false }, { t: 0.3, low: true });
                else if (r < 0.7) S.q.push({ t: 0, low: true, feint: true }, { t: 0.12, low: false });
                else S.q.push({ t: 0, low: Math.random() < 0.5 });
                S.next = 1.1 + Math.random() * 0.6;
              } else if (who === 'ducker') { S.q.push({ t: 0, low: true }); S.next = 0.35; }
              else { S.q.push({ t: 0, low: Math.random() < 0.25 }); if (Math.random() < 0.25) S.q.push({ t: 0.15, low: false }); S.next = 0.9 + Math.random() * 1.3; }
            }
          }
          inp.down = down;
        }
        P.step(P.DT); k++;
        if (k % 2400 === 0) await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[i];
      if (!res) { out.wins[2]++; continue; }
      out.wins[res.winner < 0 ? 2 : res.winner === side ? 0 : 1]++;
      for (const h of G.match.history) { out.secs.push(h.secs); if (h.winner >= 0) out.rounds[h.winner === side ? 0 : 1]++; }
      const s = G.mst.stat;
      for (const key of ['bonks', 'deflects', 'whiffs']) { out[key][0] += s[key][side]; out[key][1] += s[key][1 - side]; }
      out.helps += G.mst.stats.helps;
    }
    return out;
  }, { n, who, skill, side });
  const avg = r.secs.reduce((a, b) => a + b, 0) / (r.secs.length || 1);
  console.log(`${who} (as ${side ? 'Bo' : 'Pip'}) vs ${skill}, ${n} matches: person ${r.wins[0]}  computer ${r.wins[1]}  unfinished ${r.wins[2]}   rounds ${r.rounds.join('-')}  avg round ${avg.toFixed(1)}s`);
  console.log(`   person/computer: bonks landed ${r.bonks.join('/')}  deflects ${r.deflects.join('/')}  whiffs ${r.whiffs.join('/')}  gold helps ${r.helps}`);
  if (errs.length) console.log('  ERRORS:', errs.slice(0, 5));
  await browser.close();
})();

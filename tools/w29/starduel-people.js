#!/usr/bin/env node
// Throwing Star Duel: scripted "people" against the computer (second-pass test set).
//   node tools/w29/starduel-people.js --who=<type> [--skill=easy|normal|hard] [--side=0|1|both] [--n=10]
// Types (reaction time / how often the dodge is the right way / deflects?):
//   kid      0.45 s, 66% right, no deflects, throws mostly high, slowly
//   avg      0.3 s, 85% right, no deflects        sharp  0.2 s, 93% right, high+low pairs and duck feints, no deflects
//   swinger  0.28 s, 85% right, tries to deflect half the stars with +-0.07 s timing noise (an everyday player who parries)
//   perfect  deflects every star at the right height in its last 0.05 s (the best possible timing)
//   masher   hammers the action every 0.15 s and never dodges     thrower  throws whenever it can, never dodges
//   ducker   holds duck, throws low as fast as it can, hops every low star (0.3 s reactions)
//   holder   holds ▶ (walks to the middle) and mashes the action     idle  presses nothing
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
  const n = +opt('n', 10), who = opt('who', 'kid'), skill = opt('skill', 'easy'), sides = opt('side', 'both') === 'both' ? [0, 1] : [+opt('side', 0)];
  for (const side of sides) {
    const r = await page.evaluate(async ({ n, who, skill, side }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel'), M = P.MODES.starduel;
      const out = { wins: [0, 0, 0], rounds: [0, 0], secs: [], bonks: [0, 0], deflects: [0, 0], whiffs: [0, 0], helps: 0, rally: 0 };
      const T = { kid: [0.45, 0.66, 0], avg: [0.3, 0.85, 0], sharp: [0.2, 0.93, 0], swinger: [0.28, 0.85, 0.5], perfect: [0.1, 1, 1], ducker: [0.3, 1, 0] }[who] || [0.3, 0.85, 0];
      for (let seed = 1; seed <= n; seed++) {
        window.__seed(seed * 7919 + side * 31);
        G.manual = true; P.CPU.skillOf = [skill, skill]; G.cpuOn = side ? [true, false] : [false, true];
        delete G.results[i]; P.loadLevel(i); G.introT = 0;
        const me = G.players[side], S = { seen: {}, next: 1, q: [] };
        const press = () => { me.pendingAct = true; me.input.act = true; };
        let k = 0;
        while (G.mode === 'play' && k < 120 * 900) {
          const st = G.mst, inp = me.input, dt = P.DT;
          for (const key in inp) inp[key] = false;
          if (st.pl && G.match && G.match.phase === 'live' && !st.res && who !== 'idle') {
            const D = st.pl[side], pl = M.plan(st, side), now = G.time;
            const [react, right, swingP] = T;
            let down = false;
            if (who === 'masher' || who === 'holder') {
              if (Math.floor(now / 0.15) !== Math.floor((now - dt) / 0.15)) press();
              if (who === 'holder') { if (side) inp.left = true; else inp.right = true; }
            } else if (who === 'thrower') {
              if (pl.canThrow && !pl.inZone) press();
            } else {
              const s = pl.star;
              if (who === 'ducker') down = true;
              if (s) {
                const key = s.id + ':' + s.bounces;
                let m = S.seen[key];
                if (!m) m = S.seen[key] = { at: now + react * (0.8 + Math.random() * 0.4), ok: Math.random() < right, swing: Math.random() < swingP, aim: who === 'perfect' ? 0.05 : 0.09 + (Math.random() - 0.5) * 0.14 };
                if (now >= m.at) {
                  const low = s.lane === 1, dodgeLow = m.ok ? low : !low;
                  if (m.swing && !m.done) {
                    if (low && pl.tti < 0.4) down = true;
                    if (pl.tti <= m.aim && pl.grounded && D.duck === low) { press(); m.done = true; }
                  } else if (who === 'ducker') { if (low && pl.tti < 0.2 && pl.grounded) me.pendingJump = true; }
                  else if (dodgeLow) { if (pl.tti < 0.2 && pl.grounded) me.pendingJump = true; }
                  else if (pl.tti < 0.4) down = true;
                }
              }
              S.next -= dt;
              if (S.q.length) {
                const q = S.q[0]; q.t -= dt;
                if (q.t <= 0) { if (q.low) down = true; if (q.t <= -0.08 && (!pl.inZone) && pl.canThrow && D.duck === !!q.low) { if (!q.feint) press(); S.q.shift(); } if (q.t < -0.6) S.q.shift(); }
              } else if (S.next <= 0 && !pl.inZone) {
                if (who === 'sharp' || who === 'perfect') {
                  const r = Math.random();
                  if (r < 0.4) S.q.push({ t: 0, low: false }, { t: 0.3, low: true });
                  else if (r < 0.7) S.q.push({ t: 0, low: true, feint: true }, { t: 0.12, low: false });
                  else S.q.push({ t: 0, low: Math.random() < 0.5 });
                  S.next = 1.1 + Math.random() * 0.6;
                } else if (who === 'ducker') { S.q.push({ t: 0, low: true }); S.next = 0.35; }
                else { S.q.push({ t: 0, low: Math.random() < (who === 'kid' ? 0.25 : 0.4) }); if (Math.random() < 0.25) S.q.push({ t: 0.15, low: false }); S.next = (who === 'kid' ? 1.4 : 0.9) + Math.random() * 1.3; }
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
        out.helps += G.mst.stats.helps; out.rally = Math.max(out.rally, s.rally);
      }
      return out;
    }, { n, who, skill, side });
    const avg = r.secs.reduce((a, b) => a + b, 0) / (r.secs.length || 1);
    console.log(`${who} as ${side ? 'Bo ' : 'Pip'} vs ${skill}, ${n}: person ${r.wins[0]}  cpu ${r.wins[1]}  unfinished ${r.wins[2]}  rounds ${r.rounds.join('-')}  avg round ${avg.toFixed(1)}s | bonks landed ${r.bonks.join('/')} deflects ${r.deflects.join('/')} whiffs ${r.whiffs.join('/')} helps ${r.helps} rally ${r.rally}`);
  }
  if (errs.length) console.log('  ERRORS:', errs.slice(0, 5));
  await browser.close();
})();

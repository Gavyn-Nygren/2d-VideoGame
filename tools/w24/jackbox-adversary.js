#!/usr/bin/env node
// 24-2 Jack-in-the-Box Launch: an adversarial review. Scripted "people" try to break the level: kids who hold ▲ the
// whole time or press it right at the pop, a jumper who does nothing in the air, a cranker who aims the wrong way, a
// very slow cranker, a person who takes the computer's job, a wanderer, a person who stops for 40 s and comes back,
// a restart mid-level. "pair:" scenarios run two computers with CPU.filter changing one seat; "solo:" scenarios run
// 1-player mode with a scripted person (the `person` function below plays like a careful person, using G.mst.plan).
// Each line says what should happen and what did. Usage: node tools/w24/jackbox-adversary.js [--only=a,b] [--seed=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const only = opt('only', '').split(',').filter(Boolean), seed = +opt('seed', 1);
const RND = `(S.r = ((S.r || 7) * 1103515245 + 12345) % 2147483648) / 2147483648`;
// a careful scripted person (solo scenarios): returns held keys for player id this step
const PERSON = `
  const D = P.MODES.jackbox.JBOX, pl = st.plan || {}, o = {};
  if (st.state !== 'play' || G.introT > 0) return o;
  if (id === st.cranker) {
    if (st.phase === 'crank' && !st.pop) {
      if (st.box.tilt !== pl.tilt && (S.tt = (S.tt || 0) + 1) % 30 < 2) { if (pl.tilt < st.box.tilt) o.left = true; else o.right = true; }
      const bt = (G.time - st.beat0) / D.beatT, slot = Math.round(bt), off = G.time - (st.beat0 + slot * D.beatT);
      if (slot >= 0 && slot !== st.lastSlot && off > -0.04 && off < 0.06) o.act = true;
    } else if (st.phase === 'hook' && st.yoyo && st.yoyo.t > 1.2) o.act = (S.k = (S.k || 0) + 1) % 20 < 3;
  } else {
    if (st.phase === 'crank') o.down = st.note >= st.c.tune.length / 2 || !!st.pop;
    else if (st.phase === 'fly') { if (pl.steer > 0) o.right = true; else if (pl.steer < 0) o.left = true; if (pl.hop) o.up = true; }
    else if (st.phase === 'yoyo') { if (pl.walk > 0) o.right = true; else if (pl.walk < 0) o.left = true; if (pl.atHook) o.act = (S.k = (S.k || 0) + 1) % 30 < 3; }
    else if (st.phase === 'haul') o.act = (S.k = (S.k || 0) + 1) % 24 < 3;
  }
  return o;`;
const SCEN = {
  // a kid jumper who holds ▲ all through the tune and the flight (thinks ▲ is "jump!"): the hop must not be wasted
  // by a press made in the box, and the level must still clear
  holdUpPip: { kind: 'pair', max: 900, want: 'clear', f: `if (p.id !== 0 || p.id !== st.jumper || (st.phase !== 'crank' && st.phase !== 'fly')) return o; const q = Object.assign({}, o); q.jump = true; return q;` },
  // a jumper who presses ▲ right as the lid pops (much too early) every time
  earlyHopBo: { kind: 'pair', max: 900, want: 'clear', f: `if (p.id !== 1 || p.id !== st.jumper) return o; if (st.phase === 'fly') { const q = Object.assign({}, o); q.jump = st.flyT < 0.12 ? 'tap' : false; return q; } return o;` },
  // a young kid jumper who never presses anything in the box or in the air (the cranker is the computer): must clear
  // (the computer aims so well that it needs none; badAimNoSteer is the hard version)
  passiveKidBo: { kind: 'pair', max: 1200, want: 'clear', f: `if (p.id !== 1 || p.id !== st.jumper || (st.phase !== 'crank' && st.phase !== 'fly' && st.phase !== 'boing')) return o; return {};` },
  // a cranker who always aims hard left and never stops (the jumper steers): must still clear
  badAimPip: { kind: 'pair', max: 900, want: 'clear', f: `if (p.id !== 0 || p.id !== st.cranker || st.phase !== 'crank') return o; const q = Object.assign({}, o); q.right = false; q.left = true; return q;` },
  // a cranker who aims hard right with a jumper who never steers: gold pad pull should get them there
  badAimNoSteer: { kind: 'pair', max: 1500, want: 'clear', help: true, f: `if (p.id === 0 && p.id === st.cranker && st.phase === 'crank') { const q = Object.assign({}, o); q.left = false; q.right = true; return q; } if (p.id === st.jumper && st.phase === 'fly') return {}; return o;` },
  // a very slow cranker: one press every 1.4 s at random beat offsets
  slowCrankBo: { kind: 'pair', max: 1200, want: 'clear', f: `if (p.id !== 1 || p.id !== st.cranker || st.phase !== 'crank') return o; const q = Object.assign({}, o); S.c = (S.c || 0) + dt; q.act = false; if (S.c > 1.4) { S.c = 0; q.act = 'tap'; } return q;` },
  // the cranker presses the action as fast as possible (every other step) for the whole tune
  turboCrankPip: { kind: 'pair', max: 900, want: 'clear', f: `if (p.id !== 0 || p.id !== st.cranker || st.phase !== 'crank') return o; const q = Object.assign({}, o); S.f = !S.f; q.act = S.f; return q;` },
  // two mashers on every button: may clear only slowly (Bronze)
  masherBoth2: { kind: 'pair', max: 900, want: 'slow', f: `const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 };` },
  // 1-player: a careful person and the computer
  soloPip: { kind: 'solo', human: 0, max: 900, want: 'clear', f: PERSON },
  soloBo: { kind: 'solo', human: 1, max: 900, want: 'clear', f: PERSON },
  // 1-player: the person plays, stops for 40 s at 35 s, then plays on: the clock must not count the break
  breakPip: { kind: 'solo', human: 0, max: 900, want: 'clear', pause: [35, 75], f: PERSON },
  // 1-player: the person only ever cranks (action on the beat, any job): may clear (it is pressing the action)
  alwaysCrankBo: { kind: 'solo', human: 1, max: 900, want: 'any', f: `const D = P.MODES.jackbox.JBOX, o = {}; if (st.beat0 == null) return o; const bt = (G.time - st.beat0) / D.beatT, off = bt - Math.round(bt); o.act = Math.abs(off) < 0.05; return o;` },
  // 1-player: the person wanders with the arrows and ▲ ▼, never the action: the computer must not climb alone
  wanderPip: { kind: 'solo', human: 0, max: 500, want: 'stuck', f: `const o = {}, u = (G.time % 5) / 5; o.left = u < 0.3; o.right = u > 0.55 && u < 0.8; o.up = (G.time % 1.3) < 0.2; o.down = (G.time % 2.1) < 0.4; return o;` },
  // 1-player: the person does the computer's job too (as jumper presses ◀ ▶ like aiming, as cranker holds ▼): stuck
  wrongJobBo: { kind: 'solo', human: 1, max: 500, want: 'stuck', f: `const o = {}; if (st.cranker === 1) { o.down = true; o.up = (G.time % 1) < 0.2; } else { o.left = (G.time % 2) < 1; o.right = !o.left; } return o;` },
  // a restart mid-level and a different level in between: the state starts fresh every time
  restart: { kind: 'restart', max: 60, want: 'fresh', f: `return o;` },
};
(async () => {
  const browser = await chromium.launch();
  let wrong = 0;
  for (const [name, sc] of Object.entries(SCEN)) {
    if (only.length && !only.includes(name)) continue;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(s => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      Math.random = gen(s * 7919);
    }, seed);
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const r = await page.evaluate(({ sc, seed }) => {
      const P = window.__pipbo, G = P.G, S = { r: seed * 99991 % 2147483647 + 1 };
      const idx = P.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch');
      G.manual = true;
      const msgs = [];
      let n = 0, lastMsg = null, early = 0, hopsWasted = 0, prevHop = false;
      const watch = () => {
        const st = G.mst, m = st.msg;
        if (m && m.text !== lastMsg) { lastMsg = m.text; msgs.push(Math.round(n * P.DT) + 's s' + (G.room + 1) + ': ' + m.text); }
        if (!m) lastMsg = null;
        const h = st.hints[st.jumper];
        if (h && /Not yet/.test(h.text) && h.t === 0) early++;
        if (st.phase === 'fly' && st.j.hop && !prevHop && st.flyT < 0.05) hopsWasted++;
        prevHop = st.phase === 'fly' && st.j.hop;
      };
      if (sc.kind === 'restart') {
        G.cpuOn = [true, true]; P.CPU.idleStop = 1e9;
        P.loadLevel(idx);
        for (let i = 0; i < 50 / P.DT; i++) P.step(P.DT);
        const mid = { room: G.room, stars: G.mst.stats.stars, phase: G.mst.phase, t: Math.round(G.time) };
        P.loadLevel(idx);
        const a = { room: G.room, stars: G.mst.stats.stars, boings: G.mst.stats.boings, li: G.mst.li, phase: G.mst.phase, t: G.time, cam: Math.round(G.mst.cam), got: G.mst.c.stars.filter(s => s.got).length };
        P.loadLevel(idx - 1 >= 0 ? idx - 1 : idx + 1);
        for (let i = 0; i < 5 / P.DT; i++) P.step(P.DT);
        P.loadLevel(idx);
        for (let i = 0; i < 2 / P.DT; i++) P.step(P.DT);
        const b = { room: G.room, stars: G.mst.stats.stars, li: G.mst.li, phase: G.mst.phase, notes: G.mst.stats.notes.flat().reduce((x, y) => x + y, 0), labels: Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent).join(',') };
        const fresh = a.room === 0 && a.stars === 0 && a.boings === 0 && a.li === 0 && a.phase === 'crank' && a.got === 0 && b.room === 0 && b.li === 0 && b.stars === 0;
        return { fresh, mid, a, b };
      }
      const fn = new Function('p', sc.kind === 'solo' ? '_o' : 'o', 'dt', 'st', 'S', 'G', 'P', 'id', sc.f);
      if (sc.kind === 'pair') {
        G.cpuOn = [true, true]; P.CPU.idleStop = 1e9;
        P.CPU.filter = (p, o, dt) => fn(p, o, dt, G.mst, S, G, P, p.id);
      } else { P.CPU.cfg.players = 1; P.CPU.cfg.human = sc.human; P.cpuApplyCfg(); }
      P.loadLevel(idx);
      const h = sc.human, hp = G.players[h];
      let pauseSteps = 0;
      while (n < sc.max / P.DT && G.mode === 'play') {
        if (sc.kind === 'solo') {
          const tt = n * P.DT, paused = sc.pause && tt >= sc.pause[0] && tt < sc.pause[1];
          if (paused) pauseSteps++;
          const want = paused ? {} : fn(hp, null, P.DT, G.mst, S, G, P, h) || {};
          const inp = hp.input;
          const j = !!(want.up || want.jump), a = !!want.act;
          if (j && !inp.jump) hp.pendingJump = true;
          if (a && !inp.act) hp.pendingAct = true;
          inp.left = !!want.left; inp.right = !!want.right; inp.down = !!want.down; inp.up = j; inp.jump = j; inp.act = a;
        }
        P.step(P.DT); n++;
        watch();
      }
      const st = G.mst;
      return { mode: G.mode, steps: n, t: Math.round(G.time), real: Math.round(n * P.DT), pause: Math.round(pauseSteps * P.DT), room: G.room, li: st.li, phase: st.phase, stats: st.stats, all: st.allStars, msgs, early, hopsWasted,
        res: G.results[idx] && G.results[idx], waiting: st.waiting };
    }, { sc, seed });
    let ok, line;
    if (sc.kind === 'restart') {
      ok = r.fresh;
      line = `${ok ? 'ok  ' : 'BAD '} ${name.padEnd(13)} mid ${JSON.stringify(r.mid)} after reload ${JSON.stringify(r.a)} after another level ${JSON.stringify(r.b)}`;
    } else {
      const cleared = r.mode === 'clear' || r.mode === 'result';
      const s = r.stats, medal = r.res && r.res.stats ? (r.res.stats.find(x => x.label === 'Medal') || {}).value : '-';
      ok = sc.want === 'any' || (sc.want === 'clear' && cleared) || (sc.want === 'stuck' && !cleared) || (sc.want === 'slow' && (!cleared || (r.t > 240 && medal === 'Bronze')));
      if (sc.help && !s.helps) ok = false;
      if (sc.pause && cleared && !(r.real - r.t > r.pause - 15)) ok = false;
      if (cleared && r.res && Math.abs(r.res.time - (s.finishT || r.res.time)) > 0.5) ok = false;
      line = `${ok ? 'ok  ' : 'BAD '} ${name.padEnd(13)} ${cleared ? 'CLEAR' : 'stuck'} clock ${r.t}s (real ${r.real}s${r.pause ? ', break ' + r.pause + 's' : ''}) shelf ${r.room + 1} launch ${r.li} ${r.phase}` +
        ` stars ${s.stars}/${r.all} boings ${s.boings} bumps ${s.bumps} helps ${s.helps} tooEarly ${r.early} hopAtPop ${r.hopsWasted} medal ${medal}` +
        (r.res ? ` resultTime ${r.res.time.toFixed(1)} finishT ${s.finishT.toFixed(1)}` : '') + (r.waiting ? ' (taking a break)' : '');
      if (r.msgs.length) line += '\n      ' + r.msgs.slice(0, 24).join(' | ');
    }
    if (!ok) wrong++;
    console.log(line);
    if (errors.length) { console.log('      ERRORS: ' + errors.slice(0, 5).join(' | ')); wrong++; }
    await page.close();
  }
  await browser.close();
  console.log(wrong ? wrong + ' scenario(s) wrong' : 'all scenarios as wanted');
  process.exit(wrong ? 1 : 0);
})();

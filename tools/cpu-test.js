#!/usr/bin/env node
// Bot test for the computer partner: plays levels in headless Chromium with the computer at the controls and reports
// how each one ended. Needs Playwright (require('playwright')) and Chromium.
//
// Usage (from the repo folder):
//   node tools/cpu-test.js [levels] [--who=pair|noisy|solo|idle] [--skill=easy|normal|hard] [--skills=easy,hard]
//                          [--max=600] [--seeds=1,2,3] [--json]
//   levels: level codes or indexes, comma separated (1-1,4-2,12), or "all" (default)
//   --who=pair   the computer plays both characters (default): team levels must clear, versus matches must finish
//   --who=idle   the computer plays Bo, Pip presses nothing: the computer must not clear a team level alone (and must
//                not get stuck in an error); versus: the computer should win
//   --who=noisy  the computer plays both, but Pip is made clumsy like a distracted person: it stops for 1-4 s now and
//                then, reacts 0.25 s late, and sometimes jumps or presses the action for no reason. Bo must still get
//                the level done with this partner (team) or beat it most of the time (versus, at the same skill).
//   --who=solo   the computer plays Bo, Pip is the simple "follow and copy" test bot below (rough stand-in for a person)
//   --skills     a skill per player (Pip,Bo), e.g. --skills=easy,hard to check that Hard beats Easy in versus levels
//   --max        simulated seconds before giving up (default 600)
//   --seeds      runs every level once per seed, with Math.random made repeatable (default: one run, seed 1)
// Prints one line per level: code, name, how it ended, simulated time, and any errors the page logged.
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const flag = k => args.includes('--' + k);
const levelsArg = args.find(a => !a.startsWith('--')) || 'all';
const who = opt('who', 'pair'), skill = opt('skill', 'normal'), maxT = +opt('max', 600);
const seeds = opt('seeds', opt('seed', '1')).split(',').map(Number);
const skills = (opt('skills', '') || skill + ',' + skill).split(',');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  // a repeatable Math.random; window.__seed(n) restarts it
  await page.addInitScript(() => { let x = 1; window.__seed = s => { x = (s >>> 0) || 1; }; Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const list = await page.evaluate(() => window.__pipbo.LEVELS.map((l, i) => ({ i, code: window.__pipbo.levelCode(i), name: l.name, kind: l.kind })));
  const want = levelsArg === 'all' ? list : levelsArg.split(',').map(s => list.find(l => l.code === s || String(l.i) === s)).filter(Boolean);
  const results = [];
  for (const lv of want) for (const seed of seeds) {
    errors.length = 0;
    const t0 = Date.now();
    const r = await page.evaluate(async ({ i, who, skills, maxT, seed }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = skills.slice();
      P.CPU.errs.clear();
      G.cpuOn = who === 'pair' || who === 'noisy' ? [true, true] : [false, true];
      // the clumsy partner for --who=noisy (Pip only)
      const nz = { pause: 0, next: 3 + Math.random() * 6, lag: [] };
      P.CPU.filter = who !== 'noisy' ? null : (p, out, dt) => {
        if (p.id !== 0) return out;
        nz.lag.push(Object.assign({}, out));
        if (nz.lag.length > 30) out = nz.lag.shift(); else out = {};
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt;
        if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        if (Math.random() < 0.15 * dt) out.jump = true;
        if (Math.random() < 0.1 * dt) out.act = true;
        return out;
      };
      P.loadLevel(i);
      const pip = G.players[0];
      // the simple test person for --who=solo: walk toward the partner, jump when the partner jumps or when blocked,
      // press the action now and then
      const solo = () => {
        const o = G.players[1], inp = pip.input;
        for (const k in inp) inp[k] = false;
        if (!pip.alive) return;
        const dx = (o.x - pip.x);
        inp.left = dx < -40; inp.right = dx > 40;
        const jump = (o.vy < -200 && Math.random() < 0.5) || (Math.abs(pip.vx) < 5 && (inp.left || inp.right) && Math.random() < 0.05);
        if (jump && !pip.prevJump) pip.pendingJump = true;
        pip.prevJump = jump; inp.jump = jump;
        const act = Math.random() < 0.02;
        if (act && !pip.prevAct && G.level.def.act) pip.pendingAct = true;
        pip.prevAct = act; inp.act = act;
      };
      const steps = Math.round(maxT / P.DT);
      let n = 0, rooms = 0, lastRoom = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          if (who === 'solo') solo();
          else if (who === 'idle') { for (const key in pip.input) pip.input[key] = false; }
          P.step(P.DT);
          if (G.room !== lastRoom) { rooms++; lastRoom = G.room; }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[i] || null;
      const out = { mode: G.mode, simT: Math.round(n * P.DT), room: G.room || 0, rooms: (LEVELS => LEVELS[i].rooms ? LEVELS[i].rooms.length : 1)(P.LEVELS), cpuErrs: [...P.CPU.errs] };
      if (res) {
        out.kind = res.kind;
        if (res.kind === 'versus') { out.winner = res.winner; out.rounds = res.rounds; out.history = res.history && res.history.map(h => h.winner + ':' + h.reason); }
        else { out.time = Math.round(res.time); out.falls = res.falls; if (res.pong) out.pong = res.pong.score; if (res.golf) out.golf = res.golf.strokes; }
        out.stats = res.stats;
      }
      if (G.match) out.match = { round: G.match.round, wins: G.match.wins, phase: G.match.phase };
      return out;
    }, { i: lv.i, who, skills, maxT, seed });
    r.seed = seed; r.code = lv.code; r.name = lv.name; r.levelKind = lv.kind; r.errors = errors.slice(0, 5); r.wallS = Math.round((Date.now() - t0) / 100) / 10;
    results.push(r);
    if (!flag('json')) {
      const end = r.kind === 'versus' ? `match over: ${r.winner < 0 ? 'draw' : ['Pip', 'Bo'][r.winner]} ${r.rounds && r.rounds.join('-')}`
        : r.kind === 'team' ? `CLEARED in ${r.time}s, falls ${r.falls}${r.pong ? ' pong ' + r.pong.join('-') : ''}${r.golf ? ' golf ' + r.golf.join('+') : ''}`
        : `not finished (room ${r.room + 1}/${r.rooms}${r.match ? ', round ' + r.match.round + ' ' + r.match.wins.join('-') : ''})`;
      console.log(`${r.code.padEnd(5)} ${r.name.padEnd(26)} s${seed} ${end}  [sim ${r.simT}s, wall ${r.wallS}s]${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${r.errors.length ? ' PAGE ERR ' + r.errors.join(' | ').slice(0, 300) : ''}`);
    }
  }
  // one summary line per level when it ran with several seeds
  if (seeds.length > 1 && !flag('json')) {
    console.log('--- summary (' + who + ', skills ' + skills.join('/') + ')');
    for (const lv of want) {
      const rs = results.filter(r => r.code === lv.code);
      const team = rs.filter(r => r.kind === 'team'), vs = rs.filter(r => r.kind === 'versus');
      const avg = a => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : '-');
      const bits = [];
      if (lv.kind === 'team') bits.push(`cleared ${team.length}/${rs.length}`, `avg ${avg(team.map(r => r.time))}s`);
      else bits.push(`finished ${vs.length}/${rs.length}`, `Pip wins ${vs.filter(r => r.winner === 0).length}`, `Bo wins ${vs.filter(r => r.winner === 1).length}`, `draws ${vs.filter(r => r.winner < 0).length}`);
      const errs = rs.filter(r => r.errors.length || r.cpuErrs.length).length;
      console.log(`${lv.code.padEnd(5)} ${lv.name.padEnd(26)} ${bits.join(', ')}${errs ? ', ERRORS in ' + errs : ''}`);
    }
  }
  if (flag('json')) console.log(JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

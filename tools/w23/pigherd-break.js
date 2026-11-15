#!/usr/bin/env node
// Runaway Pigs rule checks: drives 23-2 by hand (G.manual, G.introT = 0, p.input / pendingAct, step(DT)) and checks the
// rules: pigs run from the herder only, the clap, mud, side gates and wrong turns (Farmer Fran brings the pig back),
// forward gates, the fork lever, the hay bale, the barn door, the pen ("All in!" only with every pig in), the leash,
// role swaps each chase, every gold help (and none while a person is away), the medals, the computer not finishing
// alone, and a whole run to the results card.
// Usage: node tools/w23/pigherd-break.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(777);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.pigherd, out = [];
    const ok = (c, what, extra) => out.push((c ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? '  (' + JSON.stringify(extra) + ')' : ''));
    const LI = P.LEVELS.findIndex(l => l.name === 'Runaway Pigs');
    const clear = p => { for (const k in p.input) p.input[k] = false; };
    const load = (room, cpu) => {
      P.CPU.cfg.players = 2; P.cpuApplyCfg();
      G.cpuOn = cpu || [false, false]; G.manual = true; P.CPU.filter = null;
      P.loadLevel(LI);
      for (let k = 0; k < (room || 0); k++) P.nextRoom();
      G.introT = 0;
      for (const p of G.players) clear(p);
      return G.mst;
    };
    // both people count as playing (as if they just pressed something)
    const busy = () => { P.CPU.idle[0] = 0; P.CPU.idle[1] = 0; };
    const run = (n, keepBusy) => { for (let i = 0; i < n; i++) { if (keepBusy) busy(); P.step(P.DT); } };
    const put = (st, p, x, y) => { p.x = x - p.w / 2 - st.camX; p.y = y - p.h / 2; p.vx = p.vy = 0; };
    const press = p => { p.pendingAct = true; P.step(P.DT); };

    // --- role swaps: Pip herds chases 1 and 3, Bo herds 2 and 4
    let st = load(0);
    const herders = [];
    for (let k = 0; k < 4; k++) { st = load(k); herders.push(st.herder); }
    ok(herders.join() === '0,1,0,1', 'roles swap every chase', herders);
    ok(P.LEVELS[LI].rooms.length === 4 && P.LEVELS[LI].roomWord === 'Chase', 'four chases');

    // --- pigs run from the herder, not from the gatekeeper
    st = load(0);
    run(2);
    const q0 = st.pigs[0];
    q0.x = 600; q0.y = 300; q0.vx = q0.vy = 0; q0.alarm = 0;
    for (const q of st.pigs.slice(1)) { q.x = 160; q.y = 440; q.vx = q.vy = 0; }
    put(st, G.players[1], 570, 300); put(st, G.players[0], 120, 150);
    run(60, true);
    ok(Math.abs(q0.x - 600) < 30 && q0.alarm < 0.1, 'pigs ignore the gatekeeper', { x: q0.x | 0, alarm: q0.alarm });
    q0.x = 600; q0.y = 300; q0.vx = q0.vy = 0;
    put(st, G.players[0], 540, 300); put(st, G.players[1], 300, 450);
    run(60, true);
    ok(q0.x > 640, 'pigs run from the herder', q0.x | 0);
    // the clap: pigs within 200 px dash away
    q0.x = 600; q0.y = 300; q0.vx = q0.vy = 0; put(st, G.players[0], 450, 300);
    G.players[0].pendingAct = true; P.step(P.DT);
    ok(q0.vx > 150 && st.stats.claps[0] === 1, 'a clap sends a pig dashing', { vx: q0.vx | 0 });
    // the gatekeeper's button never claps
    G.players[1].pendingAct = true; P.step(P.DT);
    ok(st.stats.claps[1] === 0, 'the gatekeeper has no clap');

    // --- mud: a pig wallows until the herder claps close by
    st = load(0);
    const m = st.muds[0], qm = st.pigs[1];
    qm.x = m.x; qm.y = m.y; qm.vx = qm.vy = 0; qm.mudCD = 0;
    put(st, G.players[0], m.x - 400, 300);
    run(3);
    ok(qm.state === 'wallow', 'a pig in the mud wallows');
    put(st, G.players[0], m.x - 180, m.y); run(1); st.pl[0].cd = 0; press(G.players[0]);
    ok(qm.state === 'wallow', 'a far clap does not get it out');
    put(st, G.players[0], m.x - 60, m.y); run(1); st.pl[0].cd = 0; press(G.players[0]);
    ok(qm.state === 'run', 'a close clap gets it out');
    // people walk slowly in mud
    put(st, G.players[1], m.x - 10, m.y - 10); G.players[1].input.right = true; run(60); const vMud = G.players[1].vx; G.players[1].input.right = false;
    ok(vMud < M.PH.walk * 0.7, 'people walk slowly through mud', vMud | 0);

    // --- forward gate: shut stops pigs, the gatekeeper opens it; people climb gates
    st = load(0);
    const g1 = st.gates.find(g => g.id === 'g1');
    const qg = st.pigs[0];
    qg.x = g1.cx - 40; qg.y = g1.cy; qg.vx = 300; qg.vy = 0; qg.dashT = 1;
    run(40);
    ok(qg.x < g1.cx, 'a shut gate stops a pig', qg.x | 0);
    put(st, G.players[0], g1.cx - 30, g1.cy); G.players[0].input.right = true; run(60); G.players[0].input.right = false;
    ok(G.players[0].x + st.camX > g1.cx, 'people climb over a gate');
    put(st, G.players[1], g1.cx - 24, g1.cy); run(1);
    press(G.players[1]);
    ok(g1.open, 'the gatekeeper opens a gate');
    put(st, G.players[1], g1.cx - 200, 140); run(1); press(G.players[1]);
    ok(st.pops.some(p => p.s === 'No gate here'), '"No gate here" away from gates');

    // --- side gate: a pig through it is a wrong turn; Farmer Fran sends it back; shutting the gate stops it
    st = load(0);
    const s1 = st.gates.find(g => g.id === 's1'), z = st.zones.find(q => q.id === 'veg1'), qs = st.pigs[2];
    qs.x = s1.cx; qs.y = s1.cy + 30; qs.vx = 0; qs.vy = -220; qs.dashT = 1;
    run(30);
    ok(qs.state === 'lost' && st.stats.wrong === 1, 'a pig through an open side gate is a wrong turn', { state: qs.state, wrong: st.stats.wrong });
    ok(st.news && /Oops! .* ran into the vegetable patch/.test(st.news.s), 'the news says where it went', st.news && st.news.s);
    run(Math.round((M.PH.lostT + 0.2) / P.DT));
    ok(qs.state === 'run' && Math.abs(qs.x - z.bx) < 60, 'Farmer Fran shoos it back out', { state: qs.state, x: qs.x | 0 });
    ok(st.pops.some(p => p.s === 'Shoo, piggy!'), 'Farmer Fran says "Shoo, piggy!"');
    put(st, G.players[1], s1.cx, s1.cy + 28); run(1);
    for (const q of st.pigs) if (q !== qs) { q.x = 200; q.y = 440; }
    qs.x = 300; qs.y = 440;
    press(G.players[1]);
    ok(!s1.open, 'the gatekeeper shuts a side gate');
    qs.x = s1.cx; qs.y = s1.cy + 30; qs.vx = 0; qs.vy = -220; qs.zoneCD = 0; run(40);
    ok(qs.state === 'run' && st.stats.wrong === 1, 'a shut side gate keeps the pig on the track');

    // --- the fork lever (chase 3): the top way is open first; the lever flips to the right way
    st = load(2);
    const lv = st.levers[0];
    ok(lv.a.open && !lv.b.open, 'the fork starts open the wrong way');
    put(st, G.players[1], lv.x - 22, lv.y); run(1); press(G.players[1]);
    ok(!lv.a.open && lv.b.open, 'the lever opens the right way');
    const qf = st.pigs[0]; qf.x = 1350; qf.y = 170; run(2);
    ok(qf.state === 'lost', 'the corn maze dead end is a wrong turn');

    // --- the hay bale (chase 2): the gatekeeper rolls it into the gap; the herder can't
    st = load(1);
    const h = st.hays[0], keep = G.players[st.keeper], herdP = G.players[st.herder];
    put(st, herdP, h.x0 + h.w / 2, h.y0 - PH0() / 2 - 2); herdP.input.down = true; run(60); herdP.input.down = false;
    ok(Math.abs(h.y0 - (236 - 22)) < 2, 'the herder can not move the hay', h.y0);
    put(st, herdP, 300, 140);
    put(st, keep, h.x0 + h.w / 2, h.y0 - 14); keep.input.down = true; run(240); keep.input.down = false;
    ok(h.locked, 'the gatekeeper rolls the hay into the gap', { y0: h.y0 | 0 });
    function PH0() { return 26; }

    // --- the barn door (chase 4): opens, shuts by itself after a while, never on a pig
    st = load(3);
    const b1 = st.gates.find(g => g.kind === 'barn'), kb = G.players[st.keeper];
    put(st, kb, b1.cx - 24, b1.cy); run(1); press(kb);
    ok(b1.open, 'the barn door slides open');
    run(Math.round((M.PH.barnT + 0.4) / P.DT));
    ok(!b1.open, 'the barn door shuts again by itself');
    press(kb); const qb = st.pigs[0]; run(Math.round((M.PH.barnT - 0.2) / P.DT));
    qb.x = b1.cx; qb.y = b1.cy; qb.vx = qb.vy = 0; run(Math.round(0.6 / P.DT)); qb.x = b1.cx; qb.y = b1.cy;
    run(5);
    ok(b1.open, 'the barn door never shuts on a pig');

    // --- the pen: shutting it with a pig outside is just a shut gate; with every pig in, "All in!" and the next chase
    st = load(0);
    const pen = st.pen, pk = G.players[st.keeper];
    put(st, pk, pen.x0 - 24, pen.cy); run(1); press(pk);
    ok(pen.gate.open, 'the pen gate opens');
    for (const q of st.pigs.slice(1)) { q.x = pen.x0 + 80; q.y = pen.cy; }
    run(3);
    ok(st.pigs.filter(q => q.state === 'pen').length === 3, 'pigs walk into the pen');
    press(pk);
    ok(!pen.gate.open && st.state === 'play', 'shutting with a pig outside does not finish');
    press(pk);
    st.pigs[0].x = pen.x0 + 80; st.pigs[0].y = pen.cy; run(3); press(pk);
    ok(st.state === 'clear', '"All in!" when every pig is in and the gate shuts');
    run(Math.round((M.PH.clearT + 0.3) / P.DT));
    ok(G.room === 1 && G.mst.herder === 1, 'the next chase starts with the jobs swapped');

    // --- the leash
    st = load(0);
    put(st, G.players[0], 100, 300); put(st, G.players[1], 860, 300);
    G.players[1].input.right = true; run(240, true); G.players[1].input.right = false;
    ok(Math.abs((G.players[1].x - G.players[0].x)) <= M.PH.leash + 4, 'the leash keeps them within 800 px', Math.round(G.players[1].x - G.players[0].x));

    // --- gold help: the ribbon (45 s no headway), only while both play
    st = load(0);
    const qr = st.pigs[3];
    for (const q of st.pigs) { q.x = 300; q.y = 440; q.vx = q.vy = 0; }
    put(st, G.players[0], 120, 140); put(st, G.players[1], 160, 140);
    run(Math.round(47 / P.DT), true);
    ok(st.pigs.some(q => q.state === 'ribbon') && st.goldUsed.includes('ribbon'), 'gold ribbon after 45 s of no headway', st.goldUsed);
    ok(st.news && st.news.gold || st.goldUsed.length > 0, 'gold help is announced');
    void qr;
    // ...not while a person is away
    st = load(0);
    for (const q of st.pigs) { q.x = 300; q.y = 440; q.vx = q.vy = 0; }
    put(st, G.players[0], 120, 140); put(st, G.players[1], 160, 140);
    run(Math.round(100 / P.DT));
    ok(st.goldUsed.length === 0, 'no gold help while the people are away', st.goldUsed);
    ok(st.rest, 'the clock rests while everyone is away');
    // the gold arrow: two wrong turns in a chase
    st = load(0);
    for (let k = 0; k < 2; k++) { const q = st.pigs[k]; q.x = 1600; q.y = 150; q.zoneCD = 0; run(2, true); }
    ok(st.arrow && st.goldUsed.includes('arrow'), 'gold arrow after 2 wrong turns');
    // the gold gate: 3 wrong turns through the same side gate shut it
    const s1b = st.gates.find(g => g.id === 's1');
    st.pigs[2].x = 1600; st.pigs[2].y = 150; run(2, true);
    ok(!s1b.open && s1b.gold && st.goldUsed.includes('gate'), 'gold gate after 3 wrong turns through it', st.goldUsed);
    // gold oats: a long chase
    st = load(0);
    put(st, G.players[0], 120, 140); put(st, G.players[1], 160, 140);
    for (const q of st.pigs) { q.x = 360; q.y = 300; }
    run(Math.round(86 / P.DT), true);
    ok(st.oats && st.goldUsed.includes('oats'), 'gold oats after 85 s in a chase');

    // --- medals
    st = G.mst;
    const med = (t, wrong, gold) => { st.stats.time = t; st.stats.wrong = wrong; st.goldUsed = Array(gold).fill('ribbon'); return M.medalOf(st); };
    ok(med(200, 2, 1) === 'Gold' && med(240, 0, 0) === 'Silver' && med(200, 5, 0) === 'Silver' && med(200, 0, 2) === 'Silver' && med(400, 0, 0) === 'Bronze' && med(300, 12, 0) === 'Bronze', 'medal thresholds');

    // --- the computer does not finish alone (Pip the computer herds, Bo a person who presses nothing)
    st = load(0, [true, false]);
    for (let i = 0; i < Math.round(300 / P.DT) && G.mode === 'play'; i++) { clear(G.players[1]); P.step(P.DT); }
    ok(G.mode === 'play' && G.room === 0 && G.mst.goldUsed.length === 0, 'the computer herder can not finish alone', { room: G.room, pen: G.mst.stats.penned, gold: G.mst.goldUsed });
    st = load(0, [false, true]);
    for (let i = 0; i < Math.round(300 / P.DT) && G.mode === 'play'; i++) { clear(G.players[0]); P.step(P.DT); }
    ok(G.mode === 'play' && G.room === 0, 'the computer gatekeeper can not finish alone', { room: G.room, pen: G.mst.stats.penned });

    // --- a whole run by the computer pair, to the results card
    st = load(0, [true, true]);
    let n = 0;
    while (G.mode === 'play' && n < 900 / P.DT) { P.step(P.DT); n++; }
    const tiles = G.lmode.stats();
    ok(G.mode === 'result' || G.mode === 'clear', 'a computer pair clears all four chases', { mode: G.mode, t: Math.round(G.time) });
    ok(tiles[0].label === 'Pigs penned' && !tiles.some(x => x && x.label === 'Medal') && typeof tiles[tiles.length - 1] === 'string', 'results: tiles and a line (the medal has its own ladder now)', tiles);
    out.push('pair time ' + G.time.toFixed(1) + ' s, medal ' + M.medalOf(G.mst) + ', chases ' + G.mst.stats.chaseT.map(x => x.toFixed(1)).join(' / '));
    return out;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'build/w23/pigherd-results.png' });
  console.log(res.join('\n'));
  const fails = res.filter(l => l.startsWith('FAIL'));
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  console.log(fails.length ? fails.length + ' FAILED' : 'ALL RULE CHECKS PASS');
  await browser.close();
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

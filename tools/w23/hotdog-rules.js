#!/usr/bin/env node
// Hot Dog Stand Rush rule checks: drives 23-3 directly (G.manual, G.introT = 0, p.x / p.pendingAct / p.input, step(DT))
// and checks every rule: the grill (raw, golden, burnt), bun, toppings, the pass shelf, taking orders, handing over
// (right and wrong), lemonade (green, early, spill), walk-offs, the three gold helps, the rest, the zones, role swaps and
// action labels, the medal thresholds, and a full computer-pair run to the results card. Prints ok / FAIL per check.
// Usage: node tools/w23/hotdog-rules.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.hotdog, HD = M.HD, out = [];
    const ok = (c, msg) => out.push((c ? 'ok   ' : 'FAIL ') + msg);
    const idx = P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush');
    const fresh = room => {
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(idx); for (let k = 0; k < (room || 0); k++) P.nextRoom(); G.introT = 0;
      const st = G.mst; st.arrT = 1e9;   // (no fairgoers unless a check adds one)
      return st;
    };
    // keep both "people" busy (so the stand never rests) unless a check wants idleness
    const busy = () => { P.CPU.idle[0] = 0; P.CPU.idle[1] = 0; };
    const run = (s, keep = true) => { for (let i = 0; i < Math.round(s * 120); i++) { if (keep) busy(); P.step(P.DT); } };
    const at = (id, x) => { const p = G.players[id]; p.x = x - p.w / 2; p.vx = 0; };
    const press = id => { G.players[id].pendingAct = true; run(1 / 60); };
    const pops = st => st.pops.map(q => q.s).join('|');
    const addCust = (st, order) => {
      st.custN++;
      const c = { id: st.custN, look: 'farmer', skin: '#f6d2b4', shirt: 0, x: 1010, spot: -1, state: 'queue', order, got: order.map(() => false), taken: false, pat: 40, patMax: 40, t: 0, walkT: 0, say: '', sayT: 0, shake: 0, stars: 0 };
      st.queue.push(c); st.stats.seen++; run(3); return c;
    };

    /* ---- the cook ---- */
    let st = fresh(0);
    const cook = st.cook, serv = st.serv;
    ok(cook === 0 && serv === 1, 'shift 1: Pip cooks, Bo serves');
    at(cook, HD.grill[0]); press(cook);
    ok(st.grill[0] && !st.grill[0].burnt, 'action at an empty grill spot puts a sausage on');
    press(cook);
    ok(!st.hold && /Not ready/.test(pops(st)), 'a raw sausage can\'t be picked up ("Not ready yet!")');
    run(HD.cookT + 0.1);
    ok(M.sausageState(st, st.grill[0]) === 'golden', 'golden after ' + HD.cookT + ' s');
    press(cook);
    ok(st.hold && st.hold.kind === 'sausage' && !st.hold.burnt && !st.grill[0], 'action picks up the golden sausage');
    at(cook, HD.tops.k); press(cook);
    ok(st.hold.kind === 'sausage', 'a topping needs a bun first');
    at(cook, HD.bun); press(cook);
    ok(st.hold.kind === 'dog' && st.hold.tops === '', 'the bun basket makes a hot dog');
    at(cook, HD.tops.k); press(cook);
    ok(st.hold.tops === 'k', 'ketchup goes on');
    run(1); st.pops = []; press(cook);
    ok(st.hold.tops === 'k' && /Already has ketchup/.test(pops(st)), 'the same topping twice: "Already has ketchup!"');
    at(cook, HD.tops.r); press(cook);
    ok(st.hold.tops === 'k', 'no relish bottle in the Morning shift (relish comes later)');
    at(cook, HD.cookHi - 5); G.players[cook].input.right = true; run(0.5); G.players[cook].input.right = false;
    ok(G.players[cook].x + G.players[cook].w / 2 <= HD.cookHi + 0.5, 'the cook is kept in the kitchen when walking');
    at(cook, HD.shelf - 25); press(cook);
    ok(!st.hold && st.shelf[0] === 'D:k' && st.stats.made[0] === 1, 'the pass shelf takes the hot dog (made +1)');
    // burnt -> Biscuit, and the gold timer after two in a row
    at(cook, HD.grill[1]); press(cook);
    at(cook, HD.grill[2]); press(cook);
    run(HD.cookT + HD.goodT + 0.2);
    ok(st.grill[1].burnt && st.grill[2].burnt && st.stats.burnt === 2, 'golden goes burnt after ' + HD.goodT + ' s');
    ok(st.goldTimer && st.news && /Gold timer/.test(st.news.s), 'two burnt in a row: the gold timer, announced (' + (st.news && st.news.s) + ')');
    at(cook, HD.grill[1]); press(cook);
    ok(st.hold && st.hold.burnt, 'a burnt sausage can be picked up');
    at(cook, HD.bun); press(cook);
    ok(st.hold.burnt, 'a burnt sausage won\'t go in a bun');
    at(cook, HD.biscuit); press(cook);
    ok(!st.hold && st.stats.biscuit === 1 && st.biscuit.eat > 0, 'Biscuit eats it ("Woof! Yum!")');
    at(cook, HD.grill[3]); press(cook); run(HD.cookT + 0.2);
    const gs = st.grill[3]; ok(M.goldenLeft(st, gs) > HD.goodT + 1, 'gold timer: golden lasts ' + HD.goodGold + ' s');

    /* ---- the server ---- */
    st = fresh(0);
    const c1 = addCust(st, ['D:k']);
    ok(c1.state === 'hi' && c1.spot === 0, 'a fairgoer walks up to the first window spot (order not taken yet)');
    at(serv, HD.spots[0]); press(serv);
    ok(c1.taken && c1.state === 'wait' && st.stats.taken[1] === 1, 'the action at a fairgoer takes the order (ticket on the board)');
    ok(M.plan(st).needs.length === 1, 'the order board needs one hot dog');
    st.shelf[0] = 'D:m'; st.shelf[1] = 'D:k';
    ok(M.plan(st).needs.length === 0, 'a matching hot dog on the shelf covers the ticket');
    at(serv, HD.shelf + 25); press(serv);
    ok(st.hands.length === 1 && st.hands[0] === 'D:k', 'the server picks the hot dog an order needs from the shelf');
    press(serv);
    ok(st.hands.length === 2 && st.hands[1] === 'D:m', 'two hands: a second pick-up');
    at(serv, HD.spots[0]); press(serv);
    ok(c1.state === 'happy' && st.stats.happy === 1 && st.hands.join() === 'D:m' && c1.stars === 3, 'the right one: "Yum!", happy, 3 stars, the wrong one stays in hand');
    const c2 = addCust(st, ['D:km', 'L']);
    at(serv, HD.spots[c2.spot]); press(serv); press(serv);
    ok(c2.got.every(g => !g) && c2.say === 'Not mine!', 'a wrong hot dog: "Not mine!", kindly handed back');
    at(serv, HD.shelf + 25); press(serv);
    ok(st.hands.length === 0 && st.shelf.includes('D:m'), 'nothing to pick up: the action puts a held one back on the shelf');
    // lemonade
    st.room = Object.assign({}, st.room, { lemon: 0.5 });
    at(serv, HD.jug); G.players[serv].input.act = true; press(serv); run(0.4);
    G.players[serv].input.act = false; run(0.05);
    ok(st.cup > 0.1 && st.cup < HD.greenLo && st.hands.length === 0, 'letting go early keeps a half-full cup at the jug (' + st.cup.toFixed(2) + ')');
    G.players[serv].input.act = true; press(serv);
    while (st.cup < 0.78) run(1 / 120);
    G.players[serv].input.act = false; run(0.05);
    ok(st.hands[0] === 'L' && st.cup === 0 && st.stats.lemon[1] === 1, 'topped up and let go in the green: a lemonade');
    st.hands = [];
    for (let k = 0; k < 2; k++) { G.players[serv].input.act = true; press(serv); run(1.9); G.players[serv].input.act = false; run(0.05); }
    ok(st.stats.spills === 2 && st.goldJug && /Gold jug/.test(st.news.s), 'over the top spills; two spills give the gold jug, announced');
    G.players[serv].input.act = true; press(serv); run(1.5); G.players[serv].input.act = false; run(0.05);
    ok(st.hands[0] === 'L', 'the gold jug stops by itself in the green');
    st.hands = ['L', 'D:km'];
    at(serv, HD.spots[c2.spot]); press(serv);
    ok(c2.state === 'happy', 'a two-item order is happy once both are handed over');

    /* ---- walk-offs and the gold bell ---- */
    st = fresh(0);
    const w1 = addCust(st, ['D:k']), w2 = addCust(st, ['D:m']), w3 = addCust(st, ['D:']);
    w1.pat = 3; w2.pat = 4; w3.pat = 30; run(5);
    ok(w1.state === 'leave' && w2.state === 'leave' && st.stats.missed === 2, 'patience runs out: "Maybe later!", walks off, counted as missed');
    ok(st.bell && w3.pat > w3.patMax * 0.95 && /Gold bell/.test(st.news.s), 'two walk-offs in a row ring the gold bell (everyone at the window back to full patience)');
    const p0 = w3.pat; run(1); ok(Math.abs((p0 - w3.pat) - HD.bellDrain) < 0.02, 'gold bell: patience drains slower');
    ok(st.queue.length === 0, 'the line moves up to free spots');

    /* ---- the line, bigger orders ---- */
    st = fresh(2);
    st.room = Object.assign({}, st.room, { two: 0, three: 0, maxDogs: 3, bigAt: 2 });
    for (let k = 0; k < 3; k++) addCust(st, ['D:k']);
    st.queue.push({ fake: 1 }, { fake: 2 });
    st.seed = 12345; const before = st.queue.length;
    st.arrT = 0; run(1 / 60); st.arrT = 1e9;
    const nc = st.queue[before];
    ok(nc && nc.order.filter(k => k[0] === 'D').length === 2 && nc.bigger, 'a fairgoer who arrives while the line is long orders one more hot dog');
    ok(nc.patMax > st.room.patience, 'a bigger order comes with more patience');

    /* ---- rest: the stand waits when every person is idle ---- */
    st = fresh(0);
    addCust(st, ['D:k']);
    const L0 = st.left;
    P.CPU.idle[0] = P.CPU.idle[1] = 20; run(3, false);
    ok(st.rest && st.left === L0, 'every person idle 15 s: the stand waits (the shift clock stops)');
    P.CPU.idle[0] = 0; run(1);
    ok(!st.rest && st.left < L0, 'a press brings the clock back');

    /* ---- shifts: the clock, last orders, swaps, labels ---- */
    st = fresh(0);
    st.arrT = 0;
    run(st.left + 0.5);
    ok(st.state === 'last', 'the shift clock runs out: "Last orders!"');
    for (let k = 0; k < 12 * 120 && G.mst === st && st.state !== 'clear'; k++) { busy(); P.step(P.DT); }
    ok(st.state === 'clear' && st.stats.shifts.length === 1, 'last orders end (window empty or 10 s): the shift summary');
    run(HD.clearT + 0.2);
    st = G.mst;
    ok(G.room === 1 && st.cook === 1 && st.serv === 0, 'shift 2: the jobs swap (Bo cooks)');
    const labels = [...document.querySelectorAll('[data-actlabel]')].map(e => e.textContent).join(',');
    ok(/serve/.test(labels) && /cook/.test(labels), 'action labels follow the jobs (' + labels + ')');
    ok(st.room.lemon > 0 && st.room.tops === 'kmr', 'Lunch Rush adds relish and lemonade');

    /* ---- medals ---- */
    st = fresh(0);
    const S = st.stats;
    Object.assign(S, { happy: 20, missed: 2, stars: 50, goals: 3 }); ok(M.medalOf(st) === 'Gold', 'Gold: 91% happy, 3 goals, 2.5 stars each');
    Object.assign(S, { happy: 20, missed: 2, stars: 50, goals: 2 }); ok(M.medalOf(st) === 'Silver', '2 goals is Silver');
    Object.assign(S, { happy: 20, missed: 5, stars: 50, goals: 4 }); ok(M.medalOf(st) === 'Silver', '80% happy is Silver');
    Object.assign(S, { happy: 9, missed: 0, stars: 27, goals: 1 }); ok(M.medalOf(st) === 'Bronze', '9 happy (under half the goals) is Bronze');
    Object.assign(S, { happy: 12, missed: 9, stars: 30, goals: 1 }); ok(M.medalOf(st) === 'Bronze', '57% happy is Bronze');
    return out;
  });
  console.log(res.join('\n'));
  // a full computer pair to the results card
  const card = await page.evaluate(async () => {
    const P = window.__pipbo, G = P.G;
    G.cpuOn = [true, true]; G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
    let n = 0;
    while (G.mode === 'play' && n < 120 * 400) { for (let k = 0; k < 600 && G.mode === 'play'; k++, n++) P.step(P.DT); await new Promise(r => setTimeout(r, 0)); }
    G.manual = false;
    return { mode: G.mode, t: Math.round(G.time) };
  });
  await page.waitForTimeout(2200);
  const txt = await page.evaluate(() => document.getElementById('overlay').innerText.replace(/\s+/g, ' ').slice(0, 400));
  await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build', 'w23', 'hotdog-results.png') });
  const okCard = /Happy customers/i.test(txt) && /Medal/i.test(txt) && !/\bTime\b/i.test(txt);
  console.log((okCard ? 'ok   ' : 'FAIL ') + 'computer pair plays to the results card (' + card.t + ' s): ' + txt);
  const bad = res.filter(l => l.startsWith('FAIL')).length + (okCard ? 0 : 1);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  console.log(bad ? bad + ' FAILED' : 'all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

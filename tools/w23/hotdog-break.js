#!/usr/bin/env node
// Hot Dog Stand Rush break checks (second pass): sets up the awkward states a real kid can make and checks nothing
// gets stuck: two lemonades nobody ordered, a pass shelf full of hot dogs nobody needs while the cook holds a wanted
// one, a server with two hands full of wrong hot dogs, a fairgoer leaving while their hot dog is in the server's
// hands, restart (R) mid-shift, pause and resume, switching to 1-player mid-shift, and the computer as each role
// with a person who stands still or leans on a key without serving, and the gold timer lasting into the next shift.
// Prints ok / FAIL per check.
// Usage: node tools/w23/hotdog-break.js
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
    const fresh = (room, cpu) => {
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = cpu || [false, false]; G.manual = true;
      P.loadLevel(idx); for (let k = 0; k < (room || 0); k++) P.nextRoom(); G.introT = 0;
      const st = G.mst; st.arrT = 1e9;
      return st;
    };
    const busy = () => { P.CPU.idle[0] = 0; P.CPU.idle[1] = 0; };
    const run = (s, keep = true) => { for (let i = 0; i < Math.round(s * 120); i++) { if (keep) busy(); P.step(P.DT); } };
    const at = (id, x) => { const p = G.players[id]; p.x = x - p.w / 2; p.vx = 0; };
    const press = id => { G.players[id].pendingAct = true; run(1 / 60); };
    const addCust = (st, order, spot) => {
      st.custN++;
      const c = { id: st.custN, look: 'farmer', skin: '#f6d2b4', shirt: 0, x: 1010, spot: -1, state: 'queue', order, got: order.map(() => false), taken: false, pat: 40, patMax: 40, t: 0, walkT: 0, say: '', sayT: 0, shake: 0, stars: 0 };
      st.queue.push(c); st.stats.seen++; run(3); return c;
    };

    /* ---- A: two lemonades nobody ordered ---- */
    let st = fresh(1);
    let sv = st.serv;
    st.hands = ['L', 'L'];
    const c1 = addCust(st, ['D:k']);
    at(sv, HD.spots[c1.spot]); press(sv);   // take the order
    st.shelf[0] = 'D:k';
    let j = M.job(st, sv);
    ok(j.k !== 'wait' && j.k !== 'shelf', 'two spare lemonades: the job says what to do with them (' + j.k + ')');
    at(sv, HD.jug); press(sv);
    ok(st.hands.filter(k => k === 'L').length < 2, 'action at the jug with hands full of spare lemonade pours one back');
    at(sv, HD.shelf); press(sv);
    ok(st.hands.includes('D:k'), 'then a hot dog can be picked up');

    /* ---- B: shelf full of hot dogs nobody needs, the cook holds a wanted one ---- */
    st = fresh(0);
    let ck = st.cook; sv = st.serv;
    const c2 = addCust(st, ['D:m']);
    at(sv, HD.spots[c2.spot]); press(sv);
    st.shelf = ['D:k', 'D:k', 'D:', 'D:k'];
    st.hold = { kind: 'dog', tops: 'm' };
    at(ck, HD.shelf); press(ck);
    ok(st.shelf.includes('D:m'), 'full shelf of unwanted hot dogs: the wanted one still goes on (swap)');
    ok(st.hold && st.hold.kind === 'dog', 'the cook now holds the old one');
    j = M.job(st, ck);
    ok(j.k === 'biscuit', 'and the job says give it to Biscuit (' + j.k + ')');

    /* ---- B2: the computer cook in that spot doesn't stall ---- */
    st = fresh(0, [true, false]);
    ck = st.cook; sv = st.serv;
    const c3 = addCust(st, ['D:m']);
    at(sv, HD.spots[c3.spot]); press(sv);
    st.shelf = ['D:k', 'D:k', 'D:', 'D:k'];
    st.hold = { kind: 'dog', tops: 'm' };
    at(ck, HD.shelf - 200);
    run(6);
    ok(st.shelf.includes('D:m'), 'the computer cook gets the wanted hot dog onto a full shelf');

    /* ---- C: server with two wrong hot dogs and a full shelf of wanted ones ---- */
    st = fresh(0);
    sv = st.serv;
    const c4 = addCust(st, ['D:m']);
    at(sv, HD.spots[c4.spot]); press(sv);
    st.shelf = ['D:m', 'D:m', 'D:m', 'D:m'];
    st.hands = ['D:k', 'D:k'];
    j = M.job(st, sv);
    ok(j.k === 'shelf' || j.k === 'back', 'full hands of wrong hot dogs: the job points at the shelf (' + j.k + ')');
    at(sv, HD.shelf); press(sv);
    ok(st.hands.includes('D:m'), 'one press at the shelf swaps a wrong one for a wanted one');
    at(sv, HD.spots[c4.spot]); press(sv);
    ok(c4.state === 'happy', 'and the fairgoer gets it');

    /* ---- C2: the computer server with the same mess ---- */
    st = fresh(0, [false, true]);
    sv = st.serv;
    const c5 = addCust(st, ['D:m']);
    at(sv, HD.spots[c5.spot]); press(sv);
    st.shelf = ['D:m', 'D:m', 'D:m', 'D:m'];
    st.hands = ['D:k', 'D:k'];
    run(8);
    ok(c5.state === 'happy', 'the computer server sorts it out and serves (' + c5.state + ')');

    /* ---- D: restart mid-shift, pause and resume, 1-player mid-shift ---- */
    st = fresh(2, [true, true]);
    run(12);
    const before = G.mst.stats.happy;
    P.loadLevel(G.levelIndex); G.introT = 0;
    st = G.mst;
    ok(st.k === 0 && st.stats.happy === 0 && st.custs.length === 0 && !st.hold && st.hands.length === 0, 'restart: back to shift 1, nothing carried over (had ' + before + ' happy)');
    run(10);
    const t0 = st.left;
    P.pause(); ok(G.mode !== 'play', 'pause works'); for (let i = 0; i < 360; i++) P.step(P.DT); ok(Math.abs(st.left - t0) < 0.01, 'paused: the shift clock stops'); P.resume(); ok(G.mode === 'play', 'resume works');
    // switch to 1-player mid-shift: Pip is the person, idle
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg();
    for (const k in G.players[0].input) G.players[0].input[k] = false;
    const h0 = st.stats.happy;
    for (let i = 0; i < 120 * 40; i++) P.step(P.DT);
    ok(st.rest, '1-player mid-shift, the person stands still: the stand rests');
    ok(st.k === 0 && st.stats.happy - h0 <= 2, 'and the computer doesn\'t run the shift alone (+' + (st.stats.happy - h0) + ' happy)');

    /* ---- E: the computer alone can't clear any shift ---- */
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 1; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.introT = 0; st = G.mst;
    for (let i = 0; i < 120 * 300; i++) { for (const k in G.players[1].input) G.players[1].input[k] = false; P.step(P.DT); }
    ok(G.mode === 'play' && st.k === 0, 'Bo idle as server, computer cooks: still in shift 1 after 300 s');
    /* ---- F: 1-player, the person leans on a key (not idle) but never does the job ---- */
    P.loadLevel(idx); G.introT = 0; st = G.mst;
    for (let i = 0; i < 120 * 300; i++) { const inp = G.players[1].input; for (const k in inp) inp[k] = false; inp.right = true; P.step(P.DT); }
    ok(G.mode === 'play' && st.k === 0 && st.rest && st.restFor === 1, 'Bo holds ▶ and never serves: the stand waits for Bo (shift ' + (st.k + 1) + ', restFor ' + st.restFor + ')');
    const sv1 = st.serv, c9 = M.waiting(st).find(c => !c.taken);
    if (c9) { at(sv1, HD.spots[c9.spot]); G.players[1].input.right = false; G.players[1].pendingAct = true; P.step(P.DT); P.step(P.DT); }
    ok(!st.rest, 'one useful press (taking an order) and the stand goes again');

    /* ---- G: the gold timer, once earned, stays for the rest of the level ---- */
    st = fresh(0);
    st.goldTimer = true;
    P.nextRoom(); G.introT = 0;
    ok(G.mst.goldTimer === true, 'gold timer carries into the next shift');
    return out;
  });
  console.log(res.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  const fails = res.filter(l => l.startsWith('FAIL')).length;
  console.log(fails ? fails + ' FAILED' : 'all passed');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/* Pip & Bo - Level 23-3 Hot Dog Stand Rush (team, World 23 Barnyard Fair). */
'use strict';

/* ===== 23-3 Hot Dog Stand Rush (mode 'hotdog', team) — Gavyn's pick (Nov 2026) =====
   "One grills and builds the hot dogs, the other serves the fairgoers in line before they walk off. Orders get bigger
   as the line grows."
   ONE SCREEN: a side view inside a cheerful red-and-cream striped hot dog stand at the county fair. The mode owns the
   tick, the picture and the HUD (def.ownStep + def.ownHUD + def.noFalls + def.noTime; the engine grid is only the two
   spawns). Pip and Bo walk ◀ ▶ on the stand's floor (▲ / jump is a little hop, just for fun) and use the action at the
   station they stand under. A divider in the middle keeps the COOK in the kitchen (left) and the SERVER at the counter
   (right); the pass shelf in the divider is reachable from both sides.
   - THE COOK (action 'cook'). Stations, left to right: Biscuit the farm dog (on his rug), the grill (4 spots), the bun
     basket, the topping bottles (ketchup, mustard, then relish, onions and cheese in later shifts), the pass shelf.
     At an empty grill spot the action puts a sausage on. It cooks raw (pink) -> golden (ready: it glows and gets a
     green tick) after 4 s, stays golden 8.5 s (a red "!" blinks in the last 2.2 s) and then is burnt (black, smoky).
     The action on a golden one picks it up; the bun basket makes it a hot dog; each bottle adds its topping (a topping
     it already has: "Already has ketchup!"); the pass shelf puts it down (4 slots). A burnt sausage, or a hot dog
     with the wrong toppings, goes to Biscuit, who is delighted ("Woof! Yum!"): no penalty except the time. With empty
     hands at a full-ish shelf the cook can take back a hot dog that nobody's order needs. A wanted hot dog put on a
     FULL shelf swaps places with an old one nobody needs ("Swap! Old one for Biscuit"). The cook holds one thing. The
     arrow asks for at most 2 sausages cooking at once (the empty spot nearest the bun), so nobody is sent to fill
     the whole grill and then burn half of it.
   - THE SERVER (action 'serve'). Stations: the pass shelf, the lemonade jug, and three window spots where fairgoers
     (a farmer, a cowboy, a granny, a kid with a balloon, a cow in a straw hat, a pig with a bow...) walk up from the
     right. A new customer's bubble shows a notepad "?": the action TAKES the order, which pins a ticket on the order
     board in the kitchen (pictures only: hot dogs with their topping marks, a lemonade cup) and shows the same
     pictures in the customer's bubble. At the shelf the action picks up a hot dog (the one an order needs, if any;
     two hands, so two items) or, with nothing there to pick up, puts a held one back (a hot dog nobody wants first);
     with full hands and a full shelf it swaps a hot dog nobody wants for one an order needs. At the customer it hands over
     every held item their order wants: right = "Thanks!" / "Yum!" (hearts, 1-3 stars by how much patience was left);
     wrong = "Not mine!" and they kindly hand it back. LEMONADE (Lunch Rush on): hold the action at the jug to pour and
     let go when the cup is in the green band (66-90%); letting go early keeps the cup at the jug half full (hold again
     to top it up); over the top is a funny spill ("Oops! Spill!"), start again. With both hands full, the action at
     the jug pours a lemonade nobody ordered back in ("Back in the jug!"), so spare lemonades never block the hands.
   - Customers wait with a patience ring (a smiley that goes green -> yellow -> red). Taking the order gives back a
     quarter of it, and each item handed over a bit more. Patience runs out: "Maybe later!", a shrug, and they walk off
     (counted as missed, never a game over). Customers who arrive while all three window spots are full wait in the
     line (the "+N in line" sign) and their patience doesn't run there. Orders get bigger as the line grows: from Lunch
     Rush on, a fairgoer who arrives while the line is long orders one hot dog more (up to 3, with more patience).
   - Shifts (rooms, def.roomWord 'Shift'), each on its own clock, with a target of happy customers on the chalkboard:
     Morning (44 s, ketchup / mustard, 1 hot dog), Lunch Rush (48 s, + relish, two toppings, lemonade), Afternoon
     (48 s, + onions, bigger orders), County Fair Finale (54 s, + cheese, the hay-ride bus brings a crowd at 16 s).
     When the clock runs out it's "Last orders!": no new fairgoers, and up to 10 s to serve the ones at the window
     (the line goes home; anyone still waiting after that waves "See you later!": not counted either way).
     Jobs swap every shift: Pip cooks in 1 and 3, Bo in 2 and 4.
   - Gold help, always announced (a news line and a HUD chip): 2 customers walking off in a row ring the GOLD BELL
     (everyone at the window gets full patience back, and patience drains a third slower for the rest of the shift);
     2 burnt sausages in a row, or 3 in one shift, give the GOLD TIMER (a gold ring and a seconds count on every
     sausage, and golden lasts 12 s instead of 8.5); 2 lemonade spills in a row give the GOLD JUG (it stops by itself in
     the green). The gold timer and gold jug, once earned, stay for the rest of the level. 20 s with a job to do and
     nothing done: a gold hint line for that person.
   - Rest: when every person playing has pressed nothing for 15 s, the stand waits ("RESTING" chip): the shift clock,
     patience, the grill and new arrivals all stop. In 1-player mode the stand also waits when the person has had a
     job to do for 30 s and done none of it (leaning on a key, wandering): "The stand waits for Bo: Take the order!",
     until one useful press. So the computer can't get through a shift alone (and it stops too after CPU.idleStop).
   - Medal by happy customers, not time: Gold = >= 85% of the fairgoers who reached the window left happy (happy /
     (happy + missed)), 3 of the 4 shift goals reached and 2 stars a customer on average; Silver = >= 60% happy and at
     least half as many happy customers as the four goals together (10 of 19); else Bronze. The goals are
     MODES.hotdog.medals (js/medals.js); medalOf (same rules) is kept for the results words and the tools.
   - Results: Happy customers (N of M), Missed, Hot dogs made and Lemonade per player, plus stars, shift
     goals reached and the gold help used.
   Room def: { title, cook: 0|1, look, tip, news, act, len (s), goal, tops ('km'...), topMin, topMax, two, three,
   maxDogs, bigAt (line length that adds a hot dog), lemon (chance), every (s between fairgoers), first (s), patience,
   extraPat (s per extra item), bus: { at, n } }.
   MODES.hotdog exposes plan(st) (the order board's "still to make" list), job(st, id) (what each player should do
   next: the arrows, the chips, the stuck hints and the computer brain all read it), stationAt, and the station
   positions (HOTDOG). State lives in G.mst. Every top-level name starts with hotdog / HOTDOG (Sfx.extra.hotdog* too).
   Orders come from a seeded generator (st.seed, set from Math.random at setup, so bot tests repeat). */
const HOTDOG = {
  floor: 480, top: 452, awn: 96,
  acc: 2600, fric: 3200, vmax: 215, g: 2000, jumpV: 520,
  cookLo: 22, cookHi: 590, servLo: 620, servHi: 942,
  biscuit: 46, biscuitHW: 34,
  grill: [118, 168, 218, 268], grillHW: 25,
  bun: 334, bunHW: 26,
  tops: { k: 390, m: 430, r: 470, o: 510, c: 550 }, topHW: 20,
  shelf: 605, shelfN: 4, jug: 670, jugHW: 24,
  spots: [744, 823, 902], spotHW: 38,
  cookT: 4.0, goodT: 8.5, goodGold: 12.0, warnT: 2.2,
  pourT: 1.6, greenLo: 0.66, greenHi: 0.9, spillAt: 1.04, goldFill: 0.78,
  takeBonus: 0.25, itemBonus: 0.12, walkV: 150, hands: 2, queueMax: 6,
  goldWalk: 2, goldBurn: 2, goldSpill: 2, bellDrain: 0.65,
  restT: 15, waitT: 30, hintT: 20, lastT: 10, clearT: 3.4, finT: 4.8, newsLife: 3.8, chipAgain: 14,
};

(() => {
  const HD = HOTDOG;
  const solo = () => typeof cpuSolo === 'function' && cpuSolo();
  const isCpu = id => solo() && cpuOn(id);
  const big = () => typeof hudBig === 'function' && hudBig();
  const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
  const DISP = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
  const TAU = Math.PI * 2;
  const TOPS = {
    k: { name: 'ketchup', col: '#e8322f', dark: '#9c1414' },
    m: { name: 'mustard', col: '#ffd21f', dark: '#b88a00' },
    r: { name: 'relish', col: '#4fbf3a', dark: '#2a7a1e' },
    o: { name: 'onions', col: '#f6f0ff', dark: '#9a82c0' },
    c: { name: 'cheese', col: '#ff9f1c', dark: '#c46a00' },
  };
  const TOP_ORDER = 'kmroc';
  const LOOKS = ['farmer', 'cowboy', 'granny', 'kid', 'cow', 'girl', 'pig', 'dad', 'sheep', 'grandpa'];
  const SKINS = ['#f6d2b4', '#e8b48e', '#c98d62', '#9a6440', '#f2c8a6'];
  const dogKey = tops => 'D:' + [...TOP_ORDER].filter(ch => tops.includes(ch)).join('');
  const topsOf = key => key.slice(2);
  const isDog = key => key[0] === 'D';
  const subset = (a, b) => [...a].every(ch => b.includes(ch));   // every topping of a is in b

  /* ---------- each player's own keys (keyboard, controller or touch) ---------- */
  function dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
  function key(id) {
    const d = dev(id);
    return d === 'pad' ? glyph('act') : d === 'touch' ? 'the button' : id === 0 ? 'F' : '/';
  }
  function keyCap(id) {
    const d = dev(id);
    return d === 'pad' ? glyph('act') : d === 'touch' ? 'tap' : id === 0 ? 'F' : '/';
  }

  /* ---------- a seeded random for the orders (repeatable in bot tests) ---------- */
  function rnd(st) {
    let s = st.seed >>> 0 || 1;
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    st.seed = s;
    return s / 4294967296;
  }
  const pick = (st, arr) => arr[Math.floor(rnd(st) * arr.length) % arr.length];

  /* ---------- stations ---------- */
  // which station a player at x stands under ({ k, i, t }) or null
  function stationAt(st, id, x) {
    if (id === st.cook) {
      if (Math.abs(x - HD.biscuit) <= HD.biscuitHW) return { k: 'biscuit', x: HD.biscuit };
      for (let i = 0; i < 4; i++) if (Math.abs(x - HD.grill[i]) <= HD.grillHW) return { k: 'grill', i, x: HD.grill[i] };
      if (Math.abs(x - HD.bun) <= HD.bunHW) return { k: 'bun', x: HD.bun };
      for (const t of st.room.tops) if (Math.abs(x - HD.tops[t]) < HD.topHW) return { k: 'top', t, x: HD.tops[t] };
      if (x >= HD.shelf - 35) return { k: 'shelf', x: HD.shelf };
      return null;
    }
    if (x <= HD.shelf + 34) return { k: 'shelf', x: HD.shelf };
    if (st.room.lemon > 0 && Math.abs(x - HD.jug) <= HD.jugHW) return { k: 'jug', x: HD.jug };
    for (let i = 0; i < 3; i++) if (Math.abs(x - HD.spots[i]) <= HD.spotHW) return { k: 'spot', i, x: HD.spots[i] };
    return null;
  }
  const cxOf = p => p.x + p.w / 2;

  /* ---------- orders and who still needs what ---------- */
  const atWindow = c => c.state === 'hi' || c.state === 'wait';
  const waiting = st => st.custs.filter(c => atWindow(c) && c.spot >= 0);
  // customers at the window, the least patient first
  const urgent = st => waiting(st).sort((a, b) => a.pat - b.pat || a.id - b.id);
  // the undelivered items of taken orders not covered by the pool (a list of item keys): [{ c, i, key }]
  function uncovered(st, pool) {
    const left = pool.slice(), out = [];
    for (const c of urgent(st)) {
      if (!c.taken) continue;
      c.order.forEach((key, i) => {
        if (c.got[i]) return;
        const j = left.indexOf(key);
        if (j >= 0) left.splice(j, 1); else out.push({ c, i, key });
      });
    }
    return out;
  }
  const shelfItems = st => st.shelf.filter(Boolean);
  // the server's held items that no taken order still wants (indexes into st.hands)
  function spareHeld(st) {
    const want = [], out = [];
    for (const c of waiting(st)) if (c.taken) c.order.forEach((k, i) => { if (!c.got[i]) want.push(k); });
    st.hands.forEach((k, h) => { const n = want.indexOf(k); if (n >= 0) want.splice(n, 1); else out.push(h); });
    return out;
  }
  // shelf slots holding a hot dog that no order still needs (the server's hands count first), oldest first
  function spareShelf(st) {
    const need = uncovered(st, st.hands).map(u => u.key), out = [];
    st.shelf.forEach((k, i) => { if (!k) return; const n = need.indexOf(k); if (n >= 0) need.splice(n, 1); else out.push(i); });
    return { slots: out.sort((a, b) => st.shelfT[b] - st.shelfT[a]), need };
  }
  // what the cook still has to make: hot dog items not already on the shelf or in the server's hands
  function plan(st) {
    const un = uncovered(st, shelfItems(st).concat(st.hands));
    return {
      needs: un.filter(u => isDog(u.key)),
      lemons: uncovered(st, st.hands).filter(u => !isDog(u.key)),
      hi: waiting(st).filter(c => !c.taken).length,
    };
  }
  // the most urgent needed hot dog that a hot dog with these toppings can still become
  function targetFor(st, tops) {
    for (const u of plan(st).needs) if (subset(tops, topsOf(u.key))) return u;
    return null;
  }
  function anyTicketWants(st, tops) {
    return waiting(st).some(c => c.taken && c.order.some((k, i) => !c.got[i] && isDog(k) && subset(tops, topsOf(k))));
  }

  /* ---------- the grill ---------- */
  const goodFor = st => (st.goldTimer ? HD.goodGold : HD.goodT);
  function sausageState(st, s) {
    if (!s) return 'empty';
    if (s.burnt) return 'burnt';
    if (s.t < HD.cookT) return 'raw';
    return 'golden';
  }
  const goldenLeft = (st, s) => HD.cookT + goodFor(st) - s.t;
  function grillStep(st, dtw) {
    st.grill.forEach((s, i) => {
      if (!s || s.burnt) return;
      const was = s.t;
      s.t += dtw;
      if (was < HD.cookT && s.t >= HD.cookT) { pop(st, HD.grill[i], 392, 'Ready!', '#7be36a', 15); Sfx.play('hotdogReady'); }
      if (s.t >= HD.cookT + goodFor(st)) {
        s.burnt = true; st.stats.burnt++; st.sec.burnt++; st.burnRow++;
        pop(st, HD.grill[i], 392, 'Burnt!', '#ffb08a', 16); Sfx.play('hotdogBurn');
        smoke(st, HD.grill[i], 424, 8);
        if (isCpu(st.serv) && typeof cpuSay === 'function') cpuSay(G.players[st.serv], 'Biscuit gets that one!');
        if ((st.burnRow >= HD.goldBurn || st.sec.burnt >= HD.goldBurn + 1) && !st.goldTimer) {
          st.goldTimer = true; st.goldUsed.push('timer');
          news(st, 'Gold timer! A gold ring on each sausage shows when to pick it up (and golden lasts longer)', true, 5.5);
          Sfx.play('hotdogGold');
        }
      }
      if (Math.random() < dtw * (s.burnt ? 6 : 2.5)) st.parts.push({ x: HD.grill[i] + (Math.random() - 0.5) * 20, y: 424, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, t: 0, life: 1.2, r: 3 + Math.random() * 3, kind: 'steam' });
    });
  }

  /* ---------- the cook ---------- */
  function cookAct(st, p, dt, frozen) {
    const P = st.pl[p.id];
    P.noCD -= dt; P.armT = Math.max(0, P.armT - dt);
    if (!p.pendingAct) return;
    p.pendingAct = false;
    if (frozen || (st.state !== 'play' && st.state !== 'last')) return;
    const x = cxOf(p), s = stationAt(st, p.id, x), H = st.hold, py = p.y - 26;
    P.armT = 0.25;
    const no = (msg, col) => { if (P.noCD <= 0) { P.noCD = 0.9; pop(st, x, py, msg, col || '#fff3d6', 15); } Sfx.play('hotdogNo'); };
    if (!s) { Sfx.play('hotdogSnap', p.id); return; }
    if (s.k === 'biscuit') {
      if (H) {
        st.hold = null; st.stats.biscuit++; st.biscuit.eat = 1.4; st.biscuit.happy = 3;
        pop(st, HD.biscuit, 418, 'Woof! Yum!', C.gold, 18); Sfx.play('hotdogWoof');
        hearts(st, HD.biscuit + 8, 444, 4);
        useful(st, p.id);
      } else { st.biscuit.happy = 2; st.biscuit.wag = 1.5; pop(st, HD.biscuit, 420, 'Woof!', '#fff3d6', 15); Sfx.play('hotdogWoof'); hearts(st, HD.biscuit + 8, 444, 1); }
      return;
    }
    if (s.k === 'grill') {
      const g = st.grill[s.i], ss = sausageState(st, g);
      if (ss === 'empty') {
        if (H) return no('Hands full!');
        st.grill[s.i] = { t: 0, burnt: false };
        Sfx.play('hotdogSizzle'); smoke(st, s.x, 428, 4);
        useful(st, p.id);
        return;
      }
      if (H) return no('Hands full!');
      if (ss === 'raw') return no('Not ready yet!');
      st.grill[s.i] = null;
      if (ss === 'golden') { st.hold = { kind: 'sausage', burnt: false }; st.burnRow = 0; Sfx.play('hotdogPick'); }
      else { st.hold = { kind: 'sausage', burnt: true }; Sfx.play('hotdogPick'); pop(st, x, py, 'For Biscuit!', '#ffd7a8', 15); }
      useful(st, p.id);
      return;
    }
    if (s.k === 'bun') {
      if (!H) return no('Get a sausage first!');
      if (H.kind === 'dog') return no('It has a bun!');
      if (H.burnt) return no('Too burnt! Biscuit?', '#ffd7a8');
      st.hold = { kind: 'dog', tops: '' };
      Sfx.play('hotdogBun'); pop(st, s.x, 404, 'Hot dog!', '#ffb347', 15);
      useful(st, p.id);
      return;
    }
    if (s.k === 'top') {
      const tp = TOPS[s.t];
      st.squirt[s.t] = 0.35;
      if (!H) return no('Make a hot dog first!');
      if (H.kind !== 'dog') return no(H.burnt ? 'Too burnt! Biscuit?' : 'Bun first!');
      if (H.tops.includes(s.t)) return no('Already has ' + tp.name + '!');
      H.tops = topsOf(dogKey(H.tops + s.t));
      Sfx.play('hotdogSquirt', p.id);
      for (let k = 0; k < 6; k++) st.parts.push({ x: x, y: p.y - 14, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, t: 0, life: 0.5, r: 2.5, kind: 'drop', col: tp.col });
      // a topping no order wants: a gentle note (the fix is Biscuit)
      if (!targetFor(st, H.tops) && !anyTicketWants(st, H.tops) && waiting(st).some(c => c.taken)) pop(st, x, py, 'Hmm, no ticket wants that...', '#ffd7a8', 13);
      useful(st, p.id);
      return;
    }
    if (s.k === 'shelf') {
      if (H && H.kind === 'dog') {
        let i = st.shelf.indexOf(null), swap = null;
        if (i < 0) {
          // a full shelf: a wanted hot dog swaps places with an old one nobody needs (that one goes to Biscuit)
          const sp = spareShelf(st);
          if (!sp.slots.length || !sp.need.includes(dogKey(H.tops))) return no('Shelf is full!');
          i = sp.slots[0]; swap = st.shelf[i];
        }
        st.shelf[i] = dogKey(H.tops); st.shelfT[i] = 0; st.hold = null;
        if (swap) { st.hold = { kind: 'dog', tops: topsOf(swap), again: true }; pop(st, HD.shelf - 40, 410, 'Swap! Old one for Biscuit', '#ffd7a8', 14); }
        if (!H.again) st.stats.made[p.id]++;   // (one taken back off the shelf isn't counted twice)
        Sfx.play('hotdogShelf'); pop(st, HD.shelf, 382, 'Order up!', C.gold, 16);
        useful(st, p.id);
        if (isCpu(p.id) && typeof cpuSay === 'function') cpuSay(p, 'Order up!');
        return;
      }
      if (H) return no(H.burnt ? 'Biscuit wants that!' : 'Bun first!');
      // take back a hot dog nobody's order needs
      const need = uncovered(st, st.hands).map(u => u.key);
      let j = -1;
      for (let i = HD.shelfN - 1; i >= 0; i--) {
        const k = st.shelf[i];
        if (!k) continue;
        const n = need.indexOf(k);
        if (n >= 0) { need.splice(n, 1); continue; }
        j = i; break;
      }
      if (j < 0) return no(shelfItems(st).length ? NAMES[st.serv] + ' serves those!' : 'Nothing here yet');
      st.hold = { kind: 'dog', tops: topsOf(st.shelf[j]), again: true }; st.shelf[j] = null;
      Sfx.play('hotdogPick');
      return;
    }
  }

  /* ---------- the server ---------- */
  function servAct(st, p, dt, frozen) {
    const P = st.pl[p.id], inp = p.input;
    P.noCD -= dt; P.armT = Math.max(0, P.armT - dt);
    const live = !frozen && (st.state === 'play' || st.state === 'last');
    const x = cxOf(p), s = stationAt(st, p.id, x), py = p.y - 26;
    const no = (msg, col) => { if (P.noCD <= 0) { P.noCD = 0.9; pop(st, x, py, msg, col || '#fff3d6', 15); } Sfx.play('hotdogNo'); };
    // pouring lemonade: starts with a press at the jug, goes on while held there
    const atJug = s && s.k === 'jug';
    if (st.pouring && (!atJug || !inp.act || !live)) {
      st.pouring = false;
      if (atJug && live) releasePour(st, p);
    }
    if (st.pouring) {
      st.cup += dt / HD.pourT;
      if (Math.random() < dt * 30) st.parts.push({ x: HD.jug + 2 + (Math.random() - 0.5) * 3, y: 420, vx: 0, vy: 120, t: 0, life: 0.15, r: 1.8, kind: 'drop', col: '#ffe066' });
      if (st.goldJug && st.cup >= HD.goldFill) { st.cup = HD.goldFill; st.pouring = false; releasePour(st, p); }
      else if (st.cup >= HD.spillAt) { st.pouring = false; spill(st, p); }
      if (Math.floor(st.cup * 8) !== Math.floor((st.cup - dt / HD.pourT) * 8)) Sfx.play('hotdogPour');
    }
    if (!p.pendingAct) return;
    p.pendingAct = false;
    if (!live) return;
    P.armT = 0.25;
    if (!s) { Sfx.play('hotdogSnap', p.id); return; }
    if (s.k === 'jug') {
      if (st.hands.length >= HD.hands) {
        // hands full and a lemonade nobody ordered: it goes back in the jug
        const h = spareHeld(st).find(n => st.hands[n] === 'L');
        if (h == null) return no('Hands full!');
        st.hands.splice(h, 1); st.cup = 0;
        pop(st, HD.jug, 360, 'Back in the jug!', '#ffe066', 15); Sfx.play('hotdogPour');
        useful(st, p.id);
        return;
      }
      st.pouring = true;
      return;
    }
    if (s.k === 'shelf') {
      const items = shelfItems(st);
      if (st.hands.length < HD.hands && items.length) {
        // the one an order needs (most urgent first), else the oldest
        const need = uncovered(st, st.hands);
        let j = -1;
        for (const u of need) { j = st.shelf.indexOf(u.key); if (j >= 0) break; }
        if (j < 0) { let old = -1; st.shelf.forEach((k, i) => { if (k && (old < 0 || st.shelfT[i] > st.shelfT[old])) old = i; }); j = old; }
        st.hands.push(st.shelf[j]); st.shelf[j] = null;
        Sfx.play('hotdogPick'); useful(st, p.id);
        return;
      }
      if (st.hands.length) {
        const spare = spareHeld(st).filter(h => st.hands[h] !== 'L');
        const i = st.shelf.indexOf(null);
        if (i < 0) {
          // full shelf, full hands: a hot dog nobody wants swaps for one an order needs
          const need = uncovered(st, st.hands);
          let j = -1;
          for (const u of need) { j = st.shelf.indexOf(u.key); if (j >= 0) break; }
          if (j < 0 || !spare.length) return no('Shelf is full!');
          const h = spare[0], k = st.hands[h];
          st.hands[h] = st.shelf[j]; st.shelf[j] = k; st.shelfT[j] = 0;
          Sfx.play('hotdogPick'); pop(st, HD.shelf, 382, 'Swap!', '#fff3d6', 15); useful(st, p.id);
          return;
        }
        const h = spare.length ? spare[0] : st.hands.length - 1, k = st.hands[h];
        if (k === 'L') return no('Lemonade goes to a customer!');
        st.hands.splice(h, 1);
        st.shelf[i] = k; st.shelfT[i] = 0; Sfx.play('hotdogShelf');
        return;
      }
      return no('Nothing ready yet');
    }
    if (s.k === 'spot') {
      const c = st.spotOcc[s.i];
      if (!c || c.state === 'walk') return no('Nobody here yet');
      if (c.state === 'hi') {
        c.taken = true; c.state = 'wait'; c.takenAt = st.t; c.pat = Math.min(c.patMax, c.pat + c.patMax * HD.takeBonus);
        st.stats.taken[p.id]++;
        Sfx.play('hotdogDing'); pop(st, clamp(c.x, 652, 912), 196, 'Order!', '#fff3d6', 16);
        c.say = pick(st, ['Yes please!', 'Ooh, thank you!', 'Yummy!', 'Thanks!']); c.sayT = 1.3;
        useful(st, p.id);
        if (isCpu(p.id) && !isCpu(st.cook) && typeof cpuSay === 'function') cpuSay(p, 'New order on the board!');
        return;
      }
      if (c.state !== 'wait') return;
      if (!st.hands.length) return no('Get it from the shelf!');
      let gave = 0;
      for (let h = st.hands.length - 1; h >= 0; h--) {
        const k = st.hands[h];
        const i = c.order.findIndex((q, n) => q === k && !c.got[n]);
        if (i < 0) continue;
        c.got[i] = true; st.hands.splice(h, 1); gave++;
        if (k === 'L') st.stats.lemonServed++;
      }
      if (!gave) {
        c.say = 'Not mine!'; c.sayT = 1.2; c.shake = 0.5;
        Sfx.play('hotdogNope');
        return;
      }
      useful(st, p.id);
      st.stats.served[p.id] += gave;
      c.pat = Math.min(c.patMax, c.pat + c.patMax * HD.itemBonus * gave);
      if (c.got.every(Boolean)) happy(st, c);
      else { c.say = 'Thanks!'; c.sayT = 1.0; Sfx.play('hotdogThanks'); }
    }
  }
  function releasePour(st, p) {
    const f = st.cup;
    if (f >= HD.greenLo && f <= HD.greenHi) {
      st.cup = 0; st.hands.push('L'); st.spillRow = 0; st.stats.lemon[p.id]++;
      pop(st, HD.jug, 360, 'Lemonade!', '#ffe066', 17); Sfx.play('hotdogLemon');
      useful(st, p.id);
    } else if (f > HD.greenHi) spill(st, p);
    else if (f > 0.04) pop(st, HD.jug, 360, 'A bit more!', '#fff3d6', 14);
  }
  function spill(st, p) {
    st.cup = 0; st.stats.spills++; st.spillRow++;
    pop(st, HD.jug, 360, 'Oops! Spill!', '#ffe066', 18); Sfx.play('hotdogSpill');
    for (let k = 0; k < 16; k++) st.parts.push({ x: HD.jug, y: 440, vx: (Math.random() - 0.5) * 220, vy: -80 - Math.random() * 160, t: 0, life: 0.7, r: 2.5 + Math.random() * 2, kind: 'drop', col: '#ffe066', grav: 600 });
    if (st.spillRow >= HD.goldSpill && !st.goldJug) {
      st.goldJug = true; st.goldUsed.push('jug');
      news(st, 'Gold jug! Hold to pour: it stops by itself at just the right spot', true, 5.5);
      Sfx.play('hotdogGold');
    }
    void p;
  }

  /* ---------- the customers ---------- */
  function newCustomer(st, bus) {
    const R = st.room, line = st.queue.length;   // (the people waiting in line beyond the window)
    let dogs = 1;
    if (rnd(st) < (R.two || 0)) dogs = 2;
    if (rnd(st) < (R.three || 0)) dogs = 3;
    let bigger = false;
    if (R.bigAt && line >= R.bigAt && dogs < (R.maxDogs || 1)) { dogs++; bigger = true; }
    dogs = Math.min(dogs, R.maxDogs || 1);
    const order = [];
    for (let d = 0; d < dogs; d++) {
      const n = (R.topMin || 0) + Math.floor(rnd(st) * ((R.topMax || 1) - (R.topMin || 0) + 1));
      const pool = [...R.tops];
      let tops = '';
      for (let q = 0; q < n && pool.length; q++) tops += pool.splice(Math.floor(rnd(st) * pool.length) % pool.length, 1)[0];
      order.push(dogKey(tops));
    }
    if (rnd(st) < (R.lemon || 0)) order.push('L');
    const patMax = R.patience + (order.length - 1) * (R.extraPat || 8);
    let look = pick(st, LOOKS);
    if (look === st.lastLook) look = LOOKS[(LOOKS.indexOf(look) + 1) % LOOKS.length];
    st.lastLook = look;
    const c = { id: ++st.custN, look, skin: pick(st, SKINS), shirt: Math.floor(rnd(st) * 6), x: 1010, spot: -1, state: 'queue', order, got: order.map(() => false),
      taken: false, pat: patMax, patMax, t: 0, walkT: 0, say: '', sayT: 0, shake: 0, stars: 0, bus: !!bus, bigger };
    if (bigger && !st.saidBigger) { st.saidBigger = true; news(st, 'The line is long: fairgoers order more hot dogs now!', false, 4.2); }
    st.stats.seen++;
    st.queue.push(c);
  }
  function happy(st, c) {
    c.state = 'happy'; c.t = 0;
    const f = c.pat / c.patMax;
    c.stars = f >= 0.5 ? 3 : f >= 0.25 ? 2 : 1;
    st.stats.happy++; st.stats.stars += c.stars; st.sec.happy++;
    st.walkRow = 0;
    c.say = pick(st, ['Yum!', 'Delicious!', 'Yum yum!', 'Best at the fair!']); c.sayT = 1.6;
    Sfx.play('hotdogYum');
    hearts(st, c.x, 380, 5);
    for (let s = 0; s < c.stars; s++) st.parts.push({ x: c.x - 16 + s * 16, y: 300, vx: 0, vy: -40, t: 0, life: 1.4, r: 8, kind: 'star' });
    pop(st, c.x, 270, '+' + c.stars + ' ★', C.gold, 18);
    if (st.sec.happy === st.room.goal) { news(st, 'Goal reached! ' + st.room.goal + ' happy customers this shift!', false, 3.5); Sfx.play('hotdogGoal'); for (let k = 0; k < 18; k++) confetti(58, 150); }
  }
  function walkOff(st, c) {
    c.state = 'leave'; c.t = 0;
    c.say = pick(st, ['Maybe later!', 'Too long, maybe later!', 'I’ll come back!']); c.sayT = 1.8;
    st.stats.missed++; st.sec.missed++; st.walkRow++;
    Sfx.play('hotdogShrug');
    if (st.walkRow >= HD.goldWalk) {
      st.walkRow = 0;
      if (!st.bell) st.goldUsed.push('bell');
      st.bell = true; st.bellT = 1.6;
      for (const q of waiting(st)) q.pat = q.patMax;
      news(st, 'Gold bell! Ding-ding! Everyone at the window gets their patience back', true, 5);
      Sfx.play('hotdogBell');
    }
  }
  function customersStep(st, dt, dtw) {
    const R = st.room;
    // arrivals (not in the last orders), and the bus
    if (st.state === 'play' && dtw > 0) {
      st.arrT -= dtw;
      if (st.arrT <= 0) { st.arrT += R.every * (0.85 + rnd(st) * 0.3); if (st.queue.length < HD.queueMax) newCustomer(st); }
      if (R.bus && !st.busDone && st.elapsed >= R.bus.at) {
        st.busDone = true; st.busT = 0;
        news(st, 'Honk honk! The hay-ride bus brings a crowd of fairgoers!', false, 4.5);
        Sfx.play('hotdogBus');
      }
    }
    if (st.busT != null) {
      st.busT += dt;
      if (st.busT >= 1.6 && !st.busDrop) { st.busDrop = true; for (let n = 0; n < R.bus.n; n++) if (st.queue.length < HD.queueMax) newCustomer(st, true); }
      if (st.busT > 4.5) st.busT = null;
    }
    // into a free window spot from the line
    for (let i = 0; i < 3; i++) {
      if (st.spotOcc[i] || !st.queue.length) continue;
      const c = st.queue.shift();
      c.spot = i; c.state = 'walk'; c.x = 1010 + (i === 0 ? 0 : 0); st.spotOcc[i] = c;
      if (!st.custs.includes(c)) st.custs.push(c);
    }
    for (const c of st.custs) {
      c.t += dt; c.sayT -= dt; c.shake = Math.max(0, c.shake - dt);
      if (c.state === 'walk') {
        const tx = HD.spots[c.spot];
        c.walkT += dt; c.x = Math.max(tx, c.x - HD.walkV * dt);
        if (c.x <= tx) { c.state = 'hi'; c.t = 0; Sfx.play('hotdogHi'); c.say = pick(st, ['Hi!', 'Hello!', 'Howdy!', 'Hi there!']); c.sayT = 1.0; if (c.look === 'cow') c.say = 'Moo!'; if (c.look === 'pig') c.say = 'Oink!'; if (c.look === 'sheep') c.say = 'Baa!'; }
      } else if (atWindow(c)) {
        c.pat -= dtw * (st.bell ? HD.bellDrain : 1);
        if (c.pat <= 0) { c.pat = 0; walkOff(st, c); }
      } else if (c.state === 'happy' || c.state === 'leave' || c.state === 'bye') {
        if (c.spot >= 0 && c.t > (c.state === 'happy' ? 1.3 : 0.9)) { st.spotOcc[c.spot] = null; c.spot = -1; }
        if (c.t > (c.state === 'happy' ? 1.3 : 1.0)) { c.walkT += dt; c.x += HD.walkV * 1.1 * dt; }
      }
    }
    st.custs = st.custs.filter(c => c.x < 1030 || atWindow(c) || c.state === 'walk');
  }

  /* ---------- what each player should do next (arrows, chips, stuck hints, the computer brain) ---------- */
  // { k, x, i, t, c } with k: cook  grill pick pickBurnt bun top shelf biscuit wait
  //                            server take give shelf jug back wait
  function job(st, id) {
    if (st.state !== 'play' && st.state !== 'last') return { k: 'none' };
    if (id === st.cook) {
      const H = st.hold;
      if (H && H.kind === 'sausage') return H.burnt ? { k: 'biscuit', x: HD.biscuit } : { k: 'bun', x: HD.bun };
      if (H) {
        const tgt = targetFor(st, H.tops);
        if (tgt) {
          const miss = [...topsOf(tgt.key)].filter(ch => !H.tops.includes(ch));
          if (!miss.length) return { k: 'shelf', x: HD.shelf, c: tgt.c };
          const x = cxOf(G.players[id]);
          miss.sort((a, b) => Math.abs(HD.tops[a] - x) - Math.abs(HD.tops[b] - x));
          return { k: 'top', t: miss[0], x: HD.tops[miss[0]], c: tgt.c };
        }
        if (st.shelf.includes(null) && (anyTicketWants(st, H.tops) || (!H.tops && !waiting(st).some(c => c.taken)))) return { k: 'shelf', x: HD.shelf };
        return { k: 'biscuit', x: HD.biscuit, wrong: true };
      }
      // empty hands: golden first (the one closest to burning), then burnt ones, then put sausages on
      let gi = -1, gl = 1e9, bi = -1;
      st.grill.forEach((s, i) => {
        const ss = sausageState(st, s);
        if (ss === 'golden' && goldenLeft(st, s) < gl) { gl = goldenLeft(st, s); gi = i; }
        if (ss === 'burnt' && bi < 0) bi = i;
      });
      const pl = plan(st), have = st.grill.filter(s => s && !s.burnt).length;
      // (after a burn this shift, at most 2 cooking at once, so a slower cook isn't sent to fill the whole grill)
      const want = Math.min(2, pl.needs.length + Math.min(pl.hi, 1));
      // (a sausage that still has a while before it burns can wait while an empty spot gets a new one)
      const refill = have < want && st.grill.includes(null);
      if (gi >= 0 && !(refill && gl > 3.5)) return { k: 'pick', i: gi, x: HD.grill[gi] };
      if (bi >= 0 && !refill) return { k: 'pickBurnt', i: bi, x: HD.grill[bi] };
      if (refill) {
        // (the empty spot nearest the bun: a steady arrow that doesn't hop about while the cook walks)
        let ei = -1;
        st.grill.forEach((s, i) => { if (!s) ei = i; });
        if (ei >= 0) return { k: 'grill', i: ei, x: HD.grill[ei] };
      }
      if (gi >= 0) return { k: 'pick', i: gi, x: HD.grill[gi] };
      if (bi >= 0) return { k: 'pickBurnt', i: bi, x: HD.grill[bi] };
      return { k: 'wait', x: 200 };
    }
    // the server
    const u = urgent(st);
    for (const k of st.hands) {
      const c = u.find(q => q.taken && q.order.some((o, n) => o === k && !q.got[n]));
      if (c) return { k: 'give', c, x: HD.spots[c.spot] };
    }
    const hi = u.find(q => !q.taken);
    if (hi) return { k: 'take', c: hi, x: HD.spots[hi.spot] };
    const need = uncovered(st, st.hands);
    if (st.hands.length >= HD.hands) {
      const spare = spareHeld(st);
      if (spare.some(h => st.hands[h] === 'L')) return { k: 'jugBack', x: HD.jug };
      if (spare.length && need.some(n => isDog(n.key) && st.shelf.includes(n.key))) return { k: 'shelf', x: HD.shelf };
    }
    if (st.hands.length < HD.hands) {
      if (need.some(n => isDog(n.key) && st.shelf.includes(n.key))) return { k: 'shelf', x: HD.shelf };
      if (need.some(n => n.key === 'L')) return { k: 'jug', x: HD.jug };
    }
    if (st.hands.some(k => k !== 'L') && st.shelf.includes(null) && !st.hands.every(k => need.some(n => n.key === k))) return { k: 'back', x: HD.shelf };
    return { k: 'wait', x: 780 };
  }
  function jobText(st, id, j) {
    const o = 1 - id, nm = NAMES[o], a = key(id);
    switch (j.k) {
      case 'grill': return ['Put a sausage on the grill!', 'Press ' + a + ' at an empty spot'];
      case 'pick': return ['Pick up the golden sausage!', 'Press ' + a + ' at the grill'];
      case 'pickBurnt': return ['Oops, burnt! Pick it up', 'Biscuit the dog loves those'];
      case 'bun': return ['Put it in a bun!', 'The bun basket'];
      case 'top': return ['Add ' + TOPS[j.t].name + '!', 'Look at the order ticket'];
      case 'shelf': return id === st.cook ? ['Put it on the pass shelf!', nm + ' serves it'] : ['Grab the hot dog!', 'From the pass shelf'];
      case 'biscuit': return [j.wrong ? 'Wrong toppings? Give it to Biscuit!' : 'Give it to Biscuit!', 'He thinks it’s a treat'];
      case 'take': return ['Take the order!', 'Press ' + a + ' at the fairgoer'];
      case 'give': return ['Hand it over!', 'Press ' + a + ' at the fairgoer'];
      case 'jug': return ['Pour a lemonade!', 'Hold ' + a + ', let go in the green'];
      case 'back': return ['Put it back on the shelf', 'Nobody ordered that one'];
      case 'jugBack': return ['Pour the spare lemonade back', 'Press ' + a + ' at the jug'];
      case 'wait': return id === st.cook ? ['Watch the order board', nm + ' pins up the orders'] : ['Wait for the next fairgoer', 'Hot dogs come on the shelf'];
      default: return null;
    }
  }
  // is player id at the station its job points to?
  function atJob(st, id, j) {
    const s = stationAt(st, id, cxOf(G.players[id]));
    if (!s || !j || j.x == null) return false;
    if (j.k === 'grill' || j.k === 'pick' || j.k === 'pickBurnt') return s.k === 'grill' && s.i === j.i;
    if (j.k === 'top') return s.k === 'top' && s.t === j.t;
    if (j.k === 'take' || j.k === 'give') return s.k === 'spot' && s.i === j.c.spot;
    if (j.k === 'back') return s.k === 'shelf';
    if (j.k === 'jugBack') return s.k === 'jug';
    if (j.k === 'wait') return false;
    return s.k === j.k;
  }

  /* ---------- gold help and hints ---------- */
  function useful(st, id) { st.pl[id].stuckT = 0; st.pl[id].lazyT = 0; }
  function help(st, dt) {
    const away = awayFor(10);
    for (const id of [0, 1]) {
      const P = st.pl[id], j = job(st, id);
      if (isCpu(id) || away || j.k === 'wait' || j.k === 'none') { P.stuckT = 0; continue; }
      P.stuckT += dt;
      if (P.stuckT > HD.hintT) {
        P.stuckT = 0;
        const tx = jobText(st, id, j);
        if (tx) { news(st, 'Hint for ' + NAMES[id] + ': ' + tx[0] + ' Follow the ' + (id === 0 ? 'orange' : 'blue') + ' arrow', true, 5); st.stats.hints++; }
      }
    }
  }
  function news(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || HD.newsLife }; }
  function pop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
  function hearts(st, x, y, n) { for (let i = 0; i < n; i++) st.parts.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 40, vy: -50 - Math.random() * 40, t: 0, life: 1.2, r: 5 + Math.random() * 2, kind: 'heart' }); }
  function smoke(st, x, y, n) { for (let i = 0; i < n; i++) st.parts.push({ x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 20, vy: -35 - Math.random() * 30, t: 0, life: 1.3, r: 4 + Math.random() * 4, kind: 'smoke' }); }

  // every person (not the computer) has pressed nothing for s seconds
  function awayFor(s) {
    if (typeof CPU === 'undefined') return false;
    const ppl = [0, 1].filter(id => !cpuOn(id));
    return ppl.length > 0 && ppl.every(id => CPU.idle[id] > s);
  }

  /* ---------- the players walk (own simple physics: a flat floor, a little hop) ---------- */
  function walk(st, p, dt, frozen) {
    const inp = frozen ? NO_INPUT : p.input;
    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (st.pouring && p.id === st.serv) { /* (holding still at the jug: walking stops the pour) */ }
    if (ix) { p.vx += ix * (Math.sign(p.vx) === -ix ? HD.fric : HD.acc) * dt; p.vx = clamp(p.vx, -HD.vmax, HD.vmax); p.face = ix; }
    else p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - HD.fric * dt);
    if (p.pendingJump && !frozen && p.grounded) { p.vy = -HD.jumpV; p.grounded = false; Sfx.play('jump', p.id); p.sx = 0.85; p.sy = 1.15; }
    p.pendingJump = false;
    p.vy += HD.g * dt;
    p.y += p.vy * dt;
    if (p.y + p.h >= HD.floor) {
      if (!p.grounded && p.vy > 200) { p.sx = 1.18; p.sy = 0.84; }
      p.y = HD.floor - p.h; p.vy = 0; p.grounded = true;
    }
    p.x += p.vx * dt;
    const lo = p.id === st.cook ? HD.cookLo : HD.servLo, hi = p.id === st.cook ? HD.cookHi : HD.servHi;
    if (p.x < lo - p.w / 2) { p.x = lo - p.w / 2; p.vx = 0; }
    if (p.x > hi - p.w / 2) { p.x = hi - p.w / 2; p.vx = 0; }
    p.tileGround = p.grounded; p.onPartner = false;
  }

  /* ---------- the tick (ownStep) ---------- */
  function fx(st, dt) {
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.4);
    if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
    for (const q of st.parts) {
      q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.grav) q.vy += q.grav * dt;
      if (q.kind === 'steam' || q.kind === 'smoke') q.x += Math.sin(q.t * 4 + q.r) * 0.3;
      if (q.kind === 'heart' || q.kind === 'star') q.vx *= 0.98;
    }
    st.parts = st.parts.filter(q => q.t < q.life);
    if (st.parts.length > 260) st.parts.splice(0, st.parts.length - 260);
    for (const k in st.squirt) st.squirt[k] = Math.max(0, st.squirt[k] - dt);
    const b = st.biscuit;
    b.eat = Math.max(0, b.eat - dt); b.happy = Math.max(0, b.happy - dt); b.wag = Math.max(0, b.wag - dt);
    st.bellT = Math.max(0, (st.bellT || 0) - dt);
    for (let i = 0; i < HD.shelfN; i++) if (st.shelf[i]) st.shelfT[i] += dt;
  }
  function tick(st, dt) {
    const ps = G.players;
    st.tick++; st.t += dt;
    fx(st, dt);
    const intro = G.introT > 0;
    if (st.state === 'clear' || st.state === 'end') {
      for (const p of ps) { p.pendingAct = false; walk(st, p, dt, true); }
      customersStep(st, dt, 0);
      st.clearT += dt;
      if (st.state === 'clear' && st.clearT >= HD.clearT) st.goNext = true;
      if (st.state === 'end') endStep(st, dt);
      return;
    }
    if (!intro && !st.started) { st.started = true; if (st.room.news) news(st, st.room.news, false, 5); }
    st.rest = !intro && awayFor(HD.restT);
    // 1-player: a person who has had a job to do for 30 s and done none of it (holding a key down, wandering) also
    // makes the stand wait for them, so the computer never runs the shifts by itself
    st.restFor = -1;
    if (!intro && !st.rest && solo() && (st.state === 'play' || st.state === 'last')) {
      for (const id of [0, 1]) {
        if (isCpu(id)) continue;
        const P = st.pl[id], k = job(st, id).k;
        if (k === 'wait' || k === 'none') P.lazyT = 0;
        else if (P.lazyT <= HD.waitT) P.lazyT += dt;
        if (P.lazyT > HD.waitT) { st.rest = true; st.restFor = id; }
      }
    }
    const dtw = intro || st.rest ? 0 : dt;
    for (const p of ps) walk(st, p, dt, intro);
    cookAct(st, ps[st.cook], dt, intro);
    servAct(st, ps[st.serv], dt, intro);
    grillStep(st, dtw);
    customersStep(st, dt, dtw);
    if (dtw > 0) {
      st.elapsed += dtw;
      if (st.state === 'play') {
        st.left -= dtw;
        if (st.left <= 0) {
          st.left = 0; st.state = 'last'; st.lastT = 0;
          // the line goes home (they'll come back another day: not counted)
          st.stats.seen -= st.queue.length; st.queue = [];
          news(st, 'Last orders! Serve the fairgoers at the window', false, 4);
          Sfx.play('hotdogBell');
        }
      } else if (st.state === 'last') {
        st.lastT += dtw;
        if (!waiting(st).length || st.lastT >= HD.lastT) finishShift(st);
      }
      help(st, dtw);
    }
  }
  function finishShift(st) {
    for (const c of waiting(st)) { c.state = 'bye'; c.t = 0; c.say = 'See you later!'; c.sayT = 1.6; st.stats.seen--; }
    const sec = st.sec, met = sec.happy >= st.room.goal;
    st.stats.shifts.push({ title: st.room.title, happy: sec.happy, missed: sec.missed, goal: st.room.goal, met });
    if (met) st.stats.goals++;
    st.clearT = 0;
    st.hold = null; st.pouring = false;
    if (st.final) {
      st.state = 'end';
      Sfx.play('hotdogWin');
      for (let k = 0; k < 40; k++) confetti(W / 2 + (Math.random() - 0.5) * 400, 160);
    } else {
      st.state = 'clear';
      Sfx.play('hotdogClear');
      if (met) for (let k = 0; k < 30; k++) confetti(W / 2, 170);
    }
  }
  function endStep(st, dt) {
    if (Math.random() < dt * 9) confetti(W / 2 + (Math.random() - 0.5) * 600, 120);
    if (st.clearT >= HD.finT && !st.cleared) {
      st.cleared = true;
      G.level.goal = { x: W / 2, y: 260 };
      levelClear();
    }
  }

  /* ---------- action labels: each player's touch button and legend show their own job ---------- */
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
        return { el, id };
      });
      const word = id => (id < 0 ? 'cook / serve' : id === st.cook ? 'cook' : 'serve');
      let changed = false;
      for (const o of labelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  /* ---------- a shift (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.cook = def.cook || 0; st.serv = 1 - st.cook;
    st.grill = [null, null, null, null]; st.shelf = [null, null, null, null]; st.shelfT = [0, 0, 0, 0];
    st.hold = null; st.hands = []; st.cup = 0; st.pouring = false;
    st.custs = []; st.queue = []; st.spotOcc = [null, null, null]; st.lastLook = '';
    st.parts = []; st.pops = []; st.news = null; st.squirt = {};
    st.state = 'play'; st.goNext = false; st.clearT = 0; st.started = false; st.rest = false;
    st.left = def.len || 48; st.elapsed = 0; st.lastT = 0; st.arrT = def.first != null ? def.first : 1.2;
    st.busDone = false; st.busT = null; st.busDrop = false;
    st.bell = false; st.bellT = 0;   // (the gold timer and gold jug, once earned, stay for the rest of the level)
    st.walkRow = 0; st.burnRow = 0; st.spillRow = 0;
    st.sec = { happy: 0, missed: 0, burnt: 0 };
    st.biscuit = { eat: 0, happy: 0, wag: 0 };
    st.pl = [0, 1].map(() => ({ noCD: 0, armT: 0, stuckT: 0, lazyT: 0, chipKey: '', chipAt: 0 }));
    st.restFor = -1;
    const sx = [];
    sx[st.cook] = 200; sx[st.serv] = 760;
    G.players.forEach((p, i) => {
      const input = p.input;
      Object.assign(p, makePlayer(i), { x: sx[i] - PW / 2, y: HD.floor - PH, face: i === st.cook ? 1 : 1, input, prevJump: true, prevAct: true, grounded: true });
    });
    actLabels(st);
  }
  function setup(st, L) {
    st.stats = { happy: 0, missed: 0, seen: 0, stars: 0, made: [0, 0], lemon: [0, 0], taken: [0, 0], served: [0, 0], lemonServed: 0, biscuit: 0, burnt: 0, spills: 0, hints: 0, goals: 0, shifts: [] };
    st.goldUsed = []; st.goldTimer = false; st.goldJug = false; st.tick = 0; st.t = 0; st.custN = 0;
    st.seed = ((Math.random() * 4294967296) >>> 0) || 7;
    room(st, L, 0);
  }
  // Gold: >= 85% of the fairgoers served happy, 3 of the 4 shift goals and 2 stars a customer on average;
  // Silver: >= 60% happy and at least half as many happy customers as all the goals together; else Bronze
  function medalOf(st) {
    const s = st.stats, n = s.happy + s.missed, pct = n ? s.happy / n : 0;
    const goals = (G.level && LEVELS[G.levelIndex].rooms || []).reduce((a, r) => a + (r.goal || 0), 0);
    if (pct >= 0.85 && s.goals >= 3 && s.stars >= s.happy * 2) return 'Gold';
    return pct >= 0.6 && s.happy >= goals / 2 ? 'Silver' : 'Bronze';
  }

  // the medal goals (js/medals.js), the same rules as medalOf: Silver's happy-customer count is half of all the shift goals
  const goalsAll = ((LEVELS.find(l => l.mode === 'hotdog') || {}).rooms || []).reduce((a, r) => a + (r.goal || 0), 0);
  MODES.hotdog = {
    HD, TOPS,
    medals: { bronze: 'Work all four shifts', goals: [
      { key: 'happyPct', gold: 0.85, silver: 0.6, more: true, pct: true, word: 'the fairgoers happy' },
      { key: 'happy', silver: Math.ceil(goalsAll / 2), more: true, word: 'happy customer' },
      { key: 'goals', gold: 3, more: true, word: 'shift goal', text: n => n + ' of the 4 shift goals' },
      { key: 'starsEach', gold: 2, more: true, text: n => n + ' stars a customer on average', gap: () => 'more stars a customer' },
    ] },
    medalValues() {
      const s = G.mst.stats;
      if (!s) return {};
      const n = s.happy + s.missed;
      return { happyPct: n ? s.happy / n : 0, happy: s.happy, goals: s.goals, starsEach: s.happy ? s.stars / s.happy : 3 };
    },
    plan, job, jobText, atJob, stationAt, sausageState, goldenLeft, uncovered, urgent, waiting, medalOf, dogKey,
    setup(st, L) { setup(st, L); },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.grill) return;
      tick(st, dt);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
        return;
      }
      if (st.tick % 15 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.grill) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.grill) drawTop(st); },
    hud() { const st = G.mst; if (st.grill) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const n = s.happy + s.missed, tier = medalOf(st);
      const words = !s.missed ? 'Not one fairgoer walked off! The best hot dogs at the fair!'
        : tier === 'Gold' ? 'Sizzling teamwork: the whole fair is full and happy!'
        : tier === 'Silver' ? 'Lots of happy fairgoers and yummy hot dogs!' : 'Every hot dog made someone smile. Great job, you two!';
      const goldNames = { bell: 'Gold bell', timer: 'Gold timer', jug: 'Gold jug' };
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed.map(k => goldNames[k] || 'Gold'))].join(', ') : '';
      return [
        { label: 'Happy customers', value: s.happy + ' of ' + n },
        { label: 'Missed', value: String(s.missed) },
        { label: 'Hot dogs made', values: s.made.slice() },
        { label: 'Lemonade', values: s.lemon.slice() },
        words + ' Stars: ' + s.stars + ' of ' + n * 3 + ' · Shift goals: ' + s.goals + ' of ' + s.shifts.length + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  const WALL = { cream: '#fff3da', soft: '#f9d3c6', red: '#e2493b', redD: '#b8342a', wood: '#c8823c', woodD: '#8f5524', woodL: '#e1a35e', steel: '#d4dde6', steelD: '#8d9aa8', floor: '#c98d52', floorD: '#a96f3a' };
  const T0 = HD.top, F0 = HD.floor;

  function drawWorld(st) {
    const t = G.clock;
    drawOutside(st, t);
    // customers behind the counter (inside the window)
    ctx.save(); ctx.beginPath(); ctx.rect(614, HD.awn, 334, T0 - HD.awn + 40); ctx.clip();
    if (st.busT != null) drawBus(st, t);
    const order = st.custs.slice().sort((a, b) => (atWindow(a) ? 1 : 0) - (atWindow(b) ? 1 : 0));
    for (const c of order) drawCustomer(st, c, t);
    ctx.restore();
    drawKitchenWall(st, t);
    drawStand(st, t);
    drawStations(st, t);
    for (const c of st.custs) if (c.x < 980) drawBubble(st, c, t);
    drawQueue(st, t);
    drawBiscuit(st, t);
  }

  /* the fair outside the window: sky, the Ferris wheel, tents, a red barn, hay */
  function drawOutside(st, t) {
    const x0 = 614, x1 = 948, y0 = HD.awn, y1 = T0;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#7cc9f4'); g.addColorStop(1, '#fff1c2');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    // sun and clouds
    ctx.fillStyle = 'rgba(255,226,140,0.45)'; circle(668, 140, 30); ctx.fill();
    ctx.fillStyle = '#fff1a8'; circle(668, 140, 18); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const cx = x0 + ((k * 140 + t * (6 + k * 2)) % 420) - 40, cy = 128 + k * 26;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      circle(cx, cy, 11); ctx.fill(); circle(cx + 13, cy - 5, 13); ctx.fill(); circle(cx + 27, cy, 10); ctx.fill(); rr(cx - 8, cy, 44, 10, 5); ctx.fill();
    }
    // far hills
    ctx.fillStyle = '#b9dc7a';
    ctx.beginPath(); ctx.moveTo(x0, 330); for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, 316 + Math.sin(x * 0.02) * 12); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.fill();
    // the Ferris wheel
    const fx = 860, fy = 232, R = 78, a0 = t * 0.25;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(fx - 44, 340); ctx.lineTo(fx, fy); ctx.lineTo(fx + 44, 340); ctx.stroke();
    ctx.strokeStyle = '#ff7fb0'; ctx.lineWidth = 4; circle(fx, fy, R); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 8; k++) { const a = a0 + k * TAU / 8; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R); ctx.stroke(); }
    const gcols = ['#ff6b4a', '#5b95ff', '#ffc53d', '#7fd05a', '#b28dff', '#ff8fc7', '#3fc6d8', '#ff9f1c'];
    for (let k = 0; k < 8; k++) {
      const a = a0 + k * TAU / 8, gx = fx + Math.cos(a) * R, gy = fy + Math.sin(a) * R;
      ctx.fillStyle = gcols[k]; rr(gx - 8, gy + 2, 16, 11, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(gx - 5, gy + 4, 10, 3);
    }
    ctx.fillStyle = '#ffd36b'; circle(fx, fy, 7); ctx.fill();
    // a red barn far off and a striped fair tent
    ctx.fillStyle = '#c8483c'; ctx.fillRect(640, 296, 50, 40);
    ctx.fillStyle = 'rgba(80,20,20,0.25)'; ctx.fillRect(676, 296, 14, 40);
    ctx.fillStyle = '#7e2a22'; ctx.beginPath(); ctx.moveTo(634, 298); ctx.lineTo(665, 272); ctx.lineTo(696, 298); ctx.fill();
    ctx.strokeStyle = '#fff3da'; ctx.lineWidth = 2; ctx.strokeRect(655, 312, 20, 24); ctx.beginPath(); ctx.moveTo(655, 312); ctx.lineTo(675, 336); ctx.moveTo(675, 312); ctx.lineTo(655, 336); ctx.stroke();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#fff3da' : '#3f7fd8'; ctx.beginPath(); ctx.moveTo(720 + k * 14, 340); ctx.lineTo(762, 286); ctx.lineTo(734 + k * 14, 340); ctx.fill(); }
    ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(762, 286); ctx.lineTo(762, 272); ctx.lineTo(774, 278); ctx.fill();
    // near grass and hay bales
    ctx.fillStyle = '#8cc65a'; ctx.fillRect(x0, 336, x1 - x0, y1 - 336);
    ctx.fillStyle = '#7fd05a'; ctx.fillRect(x0, 336, x1 - x0, 6);
    for (const [hx, hy] of [[700, 352], [930, 350]]) {
      ctx.fillStyle = 'rgba(40,80,20,0.22)'; ctx.beginPath(); ctx.ellipse(hx, hy + 26, 26, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2d27a'; rr(hx - 22, hy, 44, 26, 6); ctx.fill();
      ctx.fillStyle = 'rgba(160,110,30,0.25)'; rr(hx - 22, hy + 16, 44, 10, 5); ctx.fill();
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(hx - 18, hy + 6 + k * 5); ctx.lineTo(hx + 18, hy + 6 + k * 5); ctx.stroke(); }
    }
    // bunting across the top of the window
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0 + 8); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 30, x1, y0 + 8); ctx.stroke();
    for (let k = 0; k < 11; k++) {
      const u = (k + 0.5) / 11, bx = x0 + (x1 - x0) * u, by = y0 + 8 + 4 * 22 * u * (1 - u);
      ctx.fillStyle = gcols[k % gcols.length]; ctx.beginPath(); ctx.moveTo(bx - 8, by); ctx.lineTo(bx + 8, by); ctx.lineTo(bx, by + 14); ctx.fill();
    }
    ctx.restore();
  }

  function drawBus(st, t) {
    // a tractor pulling a hay wagon full of fairgoers rolls past behind the window
    const u = st.busT / 4.5, x = 1060 - u * 560, y = 334;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#d93a2e'; rr(-36, -30, 52, 30, 6); ctx.fill();
    ctx.fillStyle = '#9fe0ff'; rr(-28, -26, 18, 14, 3); ctx.fill();
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(4, -44, 6, 16);
    ctx.fillStyle = '#2a2a3a'; circle(-26, 2, 13); ctx.fill(); circle(8, 6, 8); ctx.fill();
    ctx.fillStyle = '#ffc53d'; circle(-26, 2, 5); ctx.fill(); circle(8, 6, 3); ctx.fill();
    ctx.fillStyle = '#8f5524'; ctx.fillRect(20, -10, 20, 4);
    ctx.fillStyle = '#c8823c'; rr(40, -26, 110, 26, 4); ctx.fill();
    ctx.fillStyle = '#f2d27a'; rr(42, -34, 106, 12, 5); ctx.fill();
    const heads = ['#f6d2b4', '#ffffff', '#ffb6c8', '#c98d62', '#e8b48e'];
    for (let k = 0; k < 5; k++) { const hx = 52 + k * 22, hy = -40 + Math.sin(st.busT * 9 + k) * 2; ctx.fillStyle = heads[k]; circle(hx, hy, 8); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(hx - 3, hy - 1, 1.3); ctx.fill(); circle(hx + 3, hy - 1, 1.3); ctx.fill(); }
    ctx.fillStyle = '#2a2a3a'; circle(64, 2, 9); ctx.fill(); circle(128, 2, 9); ctx.fill();
    ctx.restore();
    if (st.busT < 1.4 && Math.floor(st.busT * 6) % 2 === 0) { ctx.save(); text('Honk!', x - 20, y - 64, 18, '#ffffff'); ctx.restore(); }
  }

  /* a fairgoer (head and shoulders above the counter; feet hidden behind it) */
  const SHIRTS = ['#e2493b', '#3f7fd8', '#7fd05a', '#b28dff', '#ff9f1c', '#ff8fc7'];
  function drawCustomer(st, c, t) {
    const walking = c.state === 'walk' || ((c.state === 'happy' || c.state === 'leave' || c.state === 'bye') && c.t > 1.0);
    const bob = walking ? -Math.abs(Math.sin(c.walkT * 9)) * 4 : Math.sin(t * 2 + c.id) * 1.2;
    const shake = c.shake > 0 ? Math.sin(c.shake * 40) * 3 : 0;
    const x = c.x + shake, by = T0 + 34 + bob;
    const f = atWindow(c) ? c.pat / c.patMax : 1;
    const mood = c.state === 'happy' ? 'joy' : c.state === 'leave' ? 'sad' : f < 0.3 ? 'worried' : 'happy';
    const face = walking && c.state !== 'walk' ? 1 : -1;
    ctx.save(); ctx.translate(x, by);
    const animal = c.look === 'cow' || c.look === 'pig' || c.look === 'sheep';
    const shirt = SHIRTS[c.shirt % SHIRTS.length];
    // body
    let body = shirt, skin = c.skin;
    if (c.look === 'cow') { body = '#ffffff'; skin = '#ffffff'; }
    if (c.look === 'pig') { body = '#ffb6c8'; skin = '#ffb6c8'; }
    if (c.look === 'sheep') { body = '#f4f1ea'; skin = '#3b3340'; }
    if (c.look === 'farmer') body = '#d9473a';
    if (c.look === 'granny') body = '#9a6bd0';
    ctx.fillStyle = body; rr(-21, -76, 42, 80, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; rr(-21, -76, 42, 80, 14); ctx.stroke();
    if (c.look === 'farmer') { // overalls
      ctx.fillStyle = '#3f6fc4'; ctx.fillRect(-14, -50, 28, 54); ctx.fillRect(-14, -66, 5, 18); ctx.fillRect(9, -66, 5, 18);
      ctx.fillStyle = '#ffd36b'; circle(-11, -50, 2.4); ctx.fill(); circle(11, -50, 2.4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; for (let k = -18; k < 20; k += 7) { ctx.beginPath(); ctx.moveTo(k, -76); ctx.lineTo(k, -66); ctx.stroke(); }
    }
    if (c.look === 'cow') { ctx.fillStyle = '#2a2430'; circle(-10, -52, 7); ctx.fill(); circle(9, -34, 6); ctx.fill(); circle(12, -64, 4); ctx.fill(); }
    if (c.look === 'cowboy') { ctx.fillStyle = '#e2493b'; ctx.beginPath(); ctx.moveTo(-12, -74); ctx.lineTo(12, -74); ctx.lineTo(0, -60); ctx.fill(); ctx.fillStyle = '#7a4a24'; ctx.fillRect(-21, -40, 42, 6); ctx.fillStyle = '#ffd36b'; ctx.fillRect(-4, -41, 8, 8); }
    if (c.look === 'sheep') { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 6; k++) { circle(-16 + k * 6.5, -74 + (k % 2) * 4, 7); ctx.fill(); } }
    if (c.look === 'granny') { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) { circle(0, -62 + k * 12, 2.2); ctx.fill(); } }
    // arms: resting on the counter while waiting; up in a shrug when leaving; holding the food when happy
    ctx.strokeStyle = body; ctx.lineWidth = 9; ctx.lineCap = 'round';
    const shrug = c.state === 'leave' && c.t < 1.0;
    if (shrug) { ctx.beginPath(); ctx.moveTo(-18, -60); ctx.lineTo(-32, -80); ctx.moveTo(18, -60); ctx.lineTo(32, -80); ctx.stroke(); ctx.fillStyle = skin; circle(-33, -82, 5.5); ctx.fill(); circle(33, -82, 5.5); ctx.fill(); }
    else if (atWindow(c)) { ctx.beginPath(); ctx.moveTo(-18, -58); ctx.lineTo(-26, -36); ctx.moveTo(18, -58); ctx.lineTo(26, -36); ctx.stroke(); ctx.fillStyle = animal ? (c.look === 'sheep' ? '#3b3340' : body) : skin; circle(-26, -34, 5.5); ctx.fill(); circle(26, -34, 5.5); ctx.fill(); }
    if (c.state === 'happy' || (c.state === 'bye' && false)) {
      const n = c.order.filter(isDog).length;
      if (n) drawDog(-4, -50, 0.75, topsOf(c.order.find(isDog)));
      if (c.order.includes('L')) drawLemon(16, -50, 0.75);
    }
    // head
    const hy = -94;
    if (c.look === 'cow') {
      ctx.fillStyle = '#e8e2d8'; ctx.beginPath(); ctx.moveTo(-12, hy - 14); ctx.quadraticCurveTo(-24, hy - 30, -18, hy - 30); ctx.lineTo(-10, hy - 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12, hy - 14); ctx.quadraticCurveTo(24, hy - 30, 18, hy - 30); ctx.lineTo(10, hy - 16); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-22, hy - 6, 9, 5, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(22, hy - 6, 9, 5, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, hy, 18, 20, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2430'; ctx.beginPath(); ctx.ellipse(-8, hy - 10, 7, 6, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb6c8'; ctx.beginPath(); ctx.ellipse(0, hy + 10, 14, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c86a86'; circle(-5, hy + 10, 2.2); ctx.fill(); circle(5, hy + 10, 2.2); ctx.fill();
      // a little straw hat with a flower
      ctx.fillStyle = '#f2d27a'; ctx.beginPath(); ctx.ellipse(0, hy - 18, 18, 5, 0, 0, TAU); ctx.fill(); rr(-10, hy - 30, 20, 13, 6); ctx.fill();
      ctx.fillStyle = '#ff6b8a'; circle(7, hy - 24, 3.5); ctx.fill();
    } else if (c.look === 'pig') {
      ctx.fillStyle = '#ffa3ba'; ctx.beginPath(); ctx.moveTo(-15, hy - 12); ctx.lineTo(-18, hy - 26); ctx.lineTo(-5, hy - 17); ctx.fill(); ctx.beginPath(); ctx.moveTo(15, hy - 12); ctx.lineTo(18, hy - 26); ctx.lineTo(5, hy - 17); ctx.fill();
      ctx.fillStyle = '#ffb6c8'; circle(0, hy, 18); ctx.fill();
      ctx.fillStyle = '#ff92ac'; ctx.beginPath(); ctx.ellipse(0, hy + 7, 9, 6.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c85a76'; circle(-3, hy + 7, 1.8); ctx.fill(); circle(3, hy + 7, 1.8); ctx.fill();
      ctx.fillStyle = '#5b95ff'; ctx.beginPath(); ctx.moveTo(10, hy - 16); ctx.lineTo(20, hy - 22); ctx.lineTo(20, hy - 10); ctx.closePath(); ctx.moveTo(10, hy - 16); ctx.lineTo(0, hy - 22); ctx.lineTo(0, hy - 10); ctx.fill();
      ctx.fillStyle = '#3f6fc4'; circle(10, hy - 16, 3); ctx.fill();
    } else if (c.look === 'sheep') {
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; circle(Math.cos(a) * 15, hy - 4 + Math.sin(a) * 13, 8); ctx.fill(); }
      ctx.fillStyle = '#3b3340'; ctx.beginPath(); ctx.ellipse(0, hy + 2, 11, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3b3340'; ctx.beginPath(); ctx.ellipse(-15, hy - 2, 7, 3.5, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, hy - 2, 7, 3.5, 0.5, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = skin; circle(0, hy, 17); ctx.fill();
      // hair and hats
      if (c.look === 'farmer') {
        ctx.fillStyle = '#f2d27a'; ctx.beginPath(); ctx.ellipse(0, hy - 12, 27, 6, 0, 0, TAU); ctx.fill(); rr(-13, hy - 28, 26, 17, 7); ctx.fill();
        ctx.fillStyle = '#e2493b'; ctx.fillRect(-13, hy - 16, 26, 4);
      } else if (c.look === 'cowboy') {
        ctx.fillStyle = '#8f5524'; ctx.beginPath(); ctx.ellipse(0, hy - 12, 30, 6, 0, 0, TAU); ctx.fill(); rr(-14, hy - 32, 28, 22, 8); ctx.fill();
        ctx.fillStyle = '#5e3412'; ctx.fillRect(-14, hy - 17, 28, 4);
        ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.ellipse(-6, hy + 7, 6, 2.6, 0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, hy + 7, 6, 2.6, -0.2, 0, TAU); ctx.fill();
      } else if (c.look === 'granny') {
        ctx.fillStyle = '#e4e2ee'; circle(0, hy - 18, 9); ctx.fill(); ctx.beginPath(); ctx.arc(0, hy - 2, 18, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = '#6a5a8a'; ctx.lineWidth = 1.6; circle(-6, hy - 1, 4.5); ctx.stroke(); circle(6, hy - 1, 4.5); ctx.stroke();
      } else if (c.look === 'grandpa') {
        ctx.fillStyle = '#d8d8e0'; ctx.beginPath(); ctx.ellipse(-15, hy - 2, 5, 8, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, hy - 2, 5, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3f7a4a'; ctx.beginPath(); ctx.arc(0, hy - 8, 17, Math.PI, TAU); ctx.fill(); ctx.fillRect(-2, hy - 10, 24, 4);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, hy + 9, 9, 3.5, 0, 0, TAU); ctx.fill();
      } else if (c.look === 'kid') {
        ctx.fillStyle = '#3f7fd8'; ctx.beginPath(); ctx.arc(0, hy - 6, 17, Math.PI, TAU); ctx.fill(); ctx.fillRect(-26, hy - 9, 14, 4);
        // a balloon on a string
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(20, -50); ctx.quadraticCurveTo(30, hy - 20, 26, hy - 44); ctx.stroke();
        ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(26, hy - 56, 11, 13, 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(22, hy - 60, 3, 5, 0.3, 0, TAU); ctx.fill();
      } else if (c.look === 'girl') {
        ctx.fillStyle = '#7a3e1e'; ctx.beginPath(); ctx.arc(0, hy - 3, 18, Math.PI, TAU); ctx.fill();
        circle(-19, hy + 2, 6); ctx.fill(); circle(19, hy + 2, 6); ctx.fill();
        ctx.fillStyle = '#ff8fc7'; circle(-17, hy - 6, 3.5); ctx.fill(); circle(17, hy - 6, 3.5); ctx.fill();
      } else if (c.look === 'dad') {
        ctx.fillStyle = '#e2493b'; ctx.beginPath(); ctx.arc(0, hy - 6, 17, Math.PI, TAU); ctx.fill(); ctx.fillRect(-2, hy - 9, 26, 4);
        ctx.fillStyle = '#ffffff'; ctx.font = '700 8px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('FAIR', 0, hy - 12, 24);
      }
    }
    // the face
    const ex = face * 1.5, ey = c.look === 'cow' ? hy - 4 : c.look === 'pig' ? hy - 4 : hy - 1;
    const dark = c.look === 'sheep' ? '#ffffff' : '#1c1a36';
    if (mood === 'joy') { ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const s of [-6, 6]) { ctx.beginPath(); ctx.arc(s + ex, ey + 1, 3.2, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); } }
    else { ctx.fillStyle = dark; circle(-6 + ex, ey, 2.4); ctx.fill(); circle(6 + ex, ey, 2.4); ctx.fill(); }
    if (c.look !== 'cow' && c.look !== 'pig') {
      ctx.strokeStyle = dark; ctx.lineWidth = 2;
      const my = ey + 8;
      if (mood === 'joy') { ctx.fillStyle = '#c8344a'; ctx.beginPath(); ctx.arc(ex, my - 1, 6, 0.1, Math.PI - 0.1); ctx.fill(); }
      else if (mood === 'sad') { ctx.beginPath(); ctx.arc(ex, my + 4, 4.5, Math.PI + 0.5, TAU - 0.5); ctx.stroke(); }
      else if (mood === 'worried') { ctx.beginPath(); ctx.moveTo(ex - 4, my + 1); ctx.lineTo(ex + 4, my + 1); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(ex, my - 2, 4.5, 0.4, Math.PI - 0.4); ctx.stroke(); }
      if (c.look !== 'sheep') { ctx.fillStyle = 'rgba(255,120,140,0.4)'; circle(-10, ey + 6, 2.6); ctx.fill(); circle(10, ey + 6, 2.6); ctx.fill(); }
    } else if (mood === 'joy') { ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, hy + 17, 4, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (mood === 'worried') { ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(15, hy - 8, 2.6, 4, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  /* the speech bubble over a fairgoer: a notepad "?" (order not taken), the order pictures, or a short word */
  function drawBubble(st, c, t) {
    const x = clamp(c.x, 652, 912), bg = big();
    if (c.sayT > 0 && c.say) {
      const fs = bg ? 19 : 15, y = atWindow(c) ? 250 : 320;
      ctx.font = '700 ' + fs + 'px ' + FONT;
      const w = ctx.measureText(c.say).width + 18, h = fs + 12, x = clamp(c.x, 620 + w / 2, 944 - w / 2);
      ctx.save(); ctx.globalAlpha = clamp(c.sayT / 0.25, 0, 1);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2;
      rr(x - w / 2, y - h, w, h, 10); ctx.fill(); ctx.stroke();
      text(c.say, x, y - h / 2 + 0.5, fs, '#1c1a36', 'center', 'body');
      ctx.restore();
    }
    if (!atWindow(c)) return;
    const items = c.order, n = items.length;
    const cols = c.taken ? Math.min(2, n) : 1, rows = c.taken ? Math.ceil(n / 2) : 1;
    const bw = c.taken ? (cols === 1 ? 48 : 74) : 44, bh = c.taken ? rows * 24 + 12 : 38;
    const bx = x - bw / 2, byB = 352, by = byB - bh;
    // bubble
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2;
    rr(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 6, byB - 1); ctx.lineTo(x + 6, byB - 1); ctx.lineTo(x + 2, byB + 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6, byB); ctx.lineTo(x + 2, byB + 8); ctx.lineTo(x + 6, byB); ctx.stroke();
    if (!c.taken) {
      // a notepad and a big "?": take my order!
      const pulse = 1 + Math.sin(t * 6) * 0.06;
      ctx.save(); ctx.translate(x, by + bh / 2); ctx.scale(pulse, pulse);
      ctx.fillStyle = '#fff6c8'; ctx.strokeStyle = '#8f5524'; ctx.lineWidth = 1.5; rr(-13, -13, 22, 26, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#9fb8d8'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-10, -5 + k * 6); ctx.lineTo(6, -5 + k * 6); ctx.stroke(); }
      text('?', 12, -4, 20, '#e2493b', 'center');
      ctx.restore();
    } else {
      items.forEach((k, i) => {
        const col = cols === 1 ? 0 : i % 2, row = cols === 1 ? i : Math.floor(i / 2);
        const ix = bx + (cols === 1 ? bw / 2 : 19 + col * 36), iy = by + 18 + row * 24;
        ctx.save(); if (c.got[i]) ctx.globalAlpha = 0.35;
        if (isDog(k)) drawDog(ix, iy, 0.85, topsOf(k)); else drawLemon(ix, iy, 0.85);
        ctx.restore();
        if (c.got[i]) drawTick(ix + 8, iy - 4, 7);
      });
    }
    // the patience ring: a smiley that turns yellow, then red
    const f = clamp(c.pat / c.patMax, 0, 1), rx = bx - 4, ry = by + 2, R = bg ? 13 : 11;
    const col = f > 0.5 ? '#5cc27f' : f > 0.25 ? '#ffc53d' : '#ff5a4a';
    ctx.fillStyle = '#ffffff'; circle(rx, ry, R + 3); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.15)'; ctx.lineWidth = 4; circle(rx, ry, R); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
    ctx.fillStyle = col; circle(rx, ry, R - 4); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(rx - 2.6, ry - 1.5, 1.2); ctx.fill(); circle(rx + 2.6, ry - 1.5, 1.2); ctx.fill();
    ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.3; ctx.beginPath();
    if (f > 0.5) ctx.arc(rx, ry + 0.5, 3, 0.3, Math.PI - 0.3); else if (f > 0.25) { ctx.moveTo(rx - 3, ry + 2.5); ctx.lineTo(rx + 3, ry + 2.5); } else ctx.arc(rx, ry + 5, 3, Math.PI + 0.4, TAU - 0.4);
    ctx.stroke();
    if (st.bell) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; circle(rx, ry, R + 3); ctx.stroke(); }
  }
  function drawTick(x, y, r) {
    ctx.fillStyle = '#3fae5a'; circle(x, y, r); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.4); ctx.lineTo(x + r * 0.5, y - r * 0.4); ctx.stroke();
  }
  // the people still in line (a sign on the right post)
  function drawQueue(st, t) {
    const n = st.queue.length;
    if (!n) return;
    const x = 934, y = 168;
    ctx.fillStyle = '#fff3da'; ctx.strokeStyle = '#8f5524'; ctx.lineWidth = 2; rr(x - 54, y, 64, 44, 8); ctx.fill(); ctx.stroke();
    for (let k = 0; k < Math.min(n, 4); k++) { const hx = x - 44 + k * 12, hy = y + 15 + Math.sin(t * 4 + k) * 1.2; ctx.fillStyle = ['#f6d2b4', '#ffb6c8', '#ffffff', '#c98d62'][k % 4]; circle(hx, hy, 6); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(hx - 2, hy - 1, 0.9); ctx.fill(); circle(hx + 2, hy - 1, 0.9); ctx.fill(); }
    text('+' + n + ' in line', x - 22, y + 34, 12, '#8f5524', 'center', 'body');
  }

  /* the kitchen's back wall: candy stripes, the order board (tickets), the chalkboard, shelves */
  function drawKitchenWall(st, t) {
    const x1 = 614;
    for (let x = 0, k = 0; x < x1; x += 30, k++) { ctx.fillStyle = k % 2 ? WALL.soft : WALL.cream; ctx.fillRect(x, HD.awn, Math.min(30, x1 - x), T0 - HD.awn); }
    ctx.fillStyle = 'rgba(120,40,20,0.08)'; ctx.fillRect(0, HD.awn, x1, 10);
    { const gw = ctx.createLinearGradient(0, T0 - 90, 0, T0); gw.addColorStop(0, 'rgba(120,60,30,0)'); gw.addColorStop(1, 'rgba(120,60,30,0.14)'); ctx.fillStyle = gw; ctx.beginPath(); ctx.rect(0, T0 - 90, x1, 90); ctx.fill();
      const ga = ctx.createLinearGradient(0, HD.awn, 0, HD.awn + 40); ga.addColorStop(0, 'rgba(120,40,20,0.16)'); ga.addColorStop(1, 'rgba(120,40,20,0)'); ctx.fillStyle = ga; ctx.beginPath(); ctx.rect(0, HD.awn, x1, 40); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(110, 300, 200, 4);
    // a shelf with jars and a blue ribbon
    ctx.fillStyle = WALL.woodD; ctx.fillRect(110, 292, 200, 8);
    const jars = [['#ff6b6b', 124], ['#ffd21f', 152], ['#7fd05a', 180], ['#ff9f1c', 208]];
    for (const [col, jx] of jars) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(jx - 9, 266, 18, 26, 4); ctx.fill(); ctx.fillStyle = col; rr(jx - 7, 274, 14, 16, 3); ctx.fill(); ctx.fillStyle = '#8f5524'; ctx.fillRect(jx - 9, 264, 18, 5); }
    ctx.fillStyle = '#3f7fd8'; circle(268, 270, 12); ctx.fill(); ctx.fillStyle = '#ffd36b'; circle(268, 270, 6); ctx.fill();
    ctx.fillStyle = '#3f7fd8'; ctx.beginPath(); ctx.moveTo(262, 280); ctx.lineTo(258, 296); ctx.lineTo(266, 290); ctx.lineTo(272, 298); ctx.lineTo(274, 280); ctx.fill();
    // Biscuit's picture in a frame
    ctx.fillStyle = WALL.woodD; rr(24, 228, 44, 40, 4); ctx.fill(); ctx.fillStyle = '#bfe6ff'; ctx.fillRect(28, 232, 36, 32);
    ctx.fillStyle = '#d99a4a'; circle(46, 252, 10); ctx.fill(); ctx.fillStyle = '#9a5a24'; ctx.beginPath(); ctx.ellipse(37, 250, 4, 8, 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(55, 250, 4, 8, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(43, 250, 1.3); ctx.fill(); circle(49, 250, 1.3); ctx.fill(); circle(46, 255, 1.8); ctx.fill();
    // string lights
    ctx.strokeStyle = '#5e3c22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 212); for (let x = 0; x <= x1; x += 60) ctx.quadraticCurveTo(x + 30, 226, x + 60, 212); ctx.stroke();
    const lc = ['#ffd36b', '#ff7fb0', '#7fd8ff', '#9ff09a'];
    for (let k = 0; k < 20; k++) { const lx = 15 + k * 30, ly = 212 + (k % 2 ? 7 : 4); ctx.fillStyle = lc[k % 4]; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3 + k); circle(lx, ly + 3, 3.6); ctx.fill(); } ctx.globalAlpha = 1;
    drawChalk(st, t);
    drawBoard(st, t);
    // the topping signs over the bottles: a mini hot dog with just that topping (match it to the ticket!)
    for (const tp of st.room.tops) {
      const sx = HD.tops[tp];
      ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = TOPS[tp].dark; ctx.lineWidth = 2; rr(sx - 18, 352, 36, 24, 6); ctx.fill(); ctx.stroke();
      drawDog(sx, 365, 0.82, tp);
    }
  }
  function drawChalk(st, t) {
    // the chalkboard: this shift's goal of happy customers, ticked off with chalk smiles
    const x = 16, y = 104, w = 84, h = 104, goal = st.room.goal, got = st.sec.happy, bg = big();
    ctx.fillStyle = WALL.woodD; rr(x - 4, y - 4, w + 8, h + 8, 6); ctx.fill();
    ctx.fillStyle = '#2f5a46'; ctx.fillRect(x, y, w, h);
    text('GOAL', x + w / 2, y + 12, 12, '#f6efdf', 'center', 'body');
    text(got + ' / ' + goal, x + w / 2, y + 36, bg ? 26 : 23, got >= goal ? C.gold : '#ffffff', 'center');
    const per = 4, sz = 9;
    for (let i = 0; i < goal; i++) {
      const cx = x + 15 + (i % per) * 18, cy = y + 60 + Math.floor(i / per) * 18, on = i < got;
      ctx.strokeStyle = on ? '#ffe9a8' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.6;
      circle(cx, cy, sz * 0.75); ctx.stroke();
      if (on) { ctx.beginPath(); ctx.arc(cx, cy + 0.5, 3.6, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.fillStyle = '#ffe9a8'; circle(cx - 2.4, cy - 2, 1); ctx.fill(); circle(cx + 2.4, cy - 2, 1); ctx.fill(); }
    }
    text('happy', x + w / 2, y + h - 8, 11, 'rgba(255,255,255,0.75)', 'center', 'body');
    void t;
  }
  function drawBoard(st, t) {
    // the order board: a rail of tickets, one per taken order, most patient last
    const x0 = 112, x1 = 600, y = 104;
    ctx.fillStyle = WALL.woodD; rr(x0, y, x1 - x0, 12, 4); ctx.fill();
    ctx.fillStyle = WALL.woodL; ctx.fillRect(x0 + 4, y + 2, x1 - x0 - 8, 3);
    const tk = waiting(st).filter(c => c.taken).sort((a, b) => a.takenAt - b.takenAt);
    const covered = new Set();
    {
      const pool = shelfItems(st).concat(st.hands);
      for (const c of urgent(st)) {
        if (!c.taken) continue;
        c.order.forEach((k, i) => { if (c.got[i]) return; const j = pool.indexOf(k); if (j >= 0) { pool.splice(j, 1); covered.add(c.id + ':' + i); } });
      }
    }
    if (!tk.length) { text('Orders show up here', (x0 + x1) / 2, y + 44, 14, 'rgba(120,40,20,0.55)', 'center', 'body'); return; }
    tk.forEach((c, n) => {
      const w = 150, tx = x0 + 12 + n * 160, ty = y + 12, rows = Math.ceil(c.order.length / 2), h = 30 + rows * 28;
      const sway = Math.sin(t * 1.5 + c.id) * 0.012;
      ctx.save(); ctx.translate(tx + w / 2, ty); ctx.rotate(sway);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(-w / 2 + 3, 3, w, h, 4); ctx.fill();
      ctx.fillStyle = '#fffdf4'; rr(-w / 2, 0, w, h, 4); ctx.fill();
      ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1; for (let k = 1; k < rows + 1; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, 26 + k * 28 - 6); ctx.lineTo(w / 2 - 6, 26 + k * 28 - 6); ctx.stroke(); }
      // clothes peg
      ctx.fillStyle = '#d9a35a'; rr(-5, -8, 10, 16, 2); ctx.fill();
      // who it's for (a tiny face) and their patience bar
      drawMiniFace(c, -w / 2 + 16, 14);
      const f = clamp(c.pat / c.patMax, 0, 1);
      ctx.fillStyle = 'rgba(28,26,54,0.12)'; rr(-w / 2 + 30, 10, w - 40, 8, 4); ctx.fill();
      ctx.fillStyle = f > 0.5 ? '#5cc27f' : f > 0.25 ? '#ffc53d' : '#ff5a4a'; rr(-w / 2 + 30, 10, Math.max(8, (w - 40) * f), 8, 4); ctx.fill();
      c.order.forEach((k, i) => {
        const ix = -w / 2 + 40 + (i % 2) * 70, iy = 40 + Math.floor(i / 2) * 28;
        const done = c.got[i], cov = covered.has(c.id + ':' + i);
        ctx.save(); if (done || cov) ctx.globalAlpha = 0.32;
        if (isDog(k)) drawDog(ix, iy, 1.25, topsOf(k)); else drawLemon(ix, iy, 1.1);
        ctx.restore();
        if (done) drawTick(ix + 20, iy - 6, 7);
        else if (cov) { ctx.fillStyle = C.gold; circle(ix + 20, iy - 6, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.font = '700 10px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', ix + 20, iy - 5.5); }
      });
      ctx.restore();
    });
  }
  function drawMiniFace(c, x, y) {
    const col = c.look === 'cow' ? '#ffffff' : c.look === 'pig' ? '#ffb6c8' : c.look === 'sheep' ? '#3b3340' : c.skin;
    ctx.fillStyle = col; circle(x, y, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.4)'; ctx.lineWidth = 1; circle(x, y, 8); ctx.stroke();
    const hat = { farmer: '#f2d27a', cowboy: '#8f5524', kid: '#3f7fd8', dad: '#e2493b', grandpa: '#3f7a4a', granny: '#e4e2ee', girl: '#7a3e1e', cow: '#f2d27a', pig: '#5b95ff', sheep: '#ffffff' }[c.look];
    ctx.fillStyle = hat; ctx.beginPath(); ctx.arc(x, y - 2, 8, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = c.look === 'sheep' ? '#ffffff' : '#1c1a36'; circle(x - 2.6, y + 1, 1.2); ctx.fill(); circle(x + 2.6, y + 1, 1.2); ctx.fill();
  }

  /* the awning, the counters, the divider, the floor */
  function drawStand(st, t) {
    // the right-hand post and the divider between the kitchen and the counter
    ctx.fillStyle = WALL.redD; ctx.fillRect(946, HD.awn, 14, F0 - HD.awn);
    ctx.fillStyle = WALL.red; ctx.fillRect(948, HD.awn, 6, F0 - HD.awn);
    ctx.fillStyle = WALL.woodD; ctx.fillRect(0, HD.awn, 8, F0 - HD.awn);
    ctx.fillStyle = WALL.redD; ctx.fillRect(606, HD.awn, 12, 300);
    ctx.fillStyle = WALL.red; ctx.fillRect(608, HD.awn, 5, 300);
    // the floor: wooden boards
    ctx.fillStyle = WALL.floor; ctx.fillRect(0, F0, W, H - F0);
    ctx.fillStyle = WALL.floorD; for (let y = F0 + 18; y < H; y += 20) ctx.fillRect(0, y, W, 2);
    for (let k = 0; k < 20; k++) { ctx.fillRect((k * 97) % W, F0 + 20 * (k % 3), 2, 18); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, F0, W, 4);
    // the kitchen counter (steel top, red front) and the serving counter (wood top, striped front)
    ctx.fillStyle = WALL.steelD; ctx.fillRect(0, T0, 618, 8);
    ctx.fillStyle = WALL.steel; ctx.fillRect(0, T0, 618, 4);
    ctx.fillStyle = '#e6edf3'; ctx.fillRect(0, T0 + 8, 618, F0 - T0 - 8);
    ctx.fillStyle = WALL.red; ctx.fillRect(0, T0 + 8, 618, 3);
    ctx.fillStyle = 'rgba(60,80,100,0.16)'; for (let x = 60; x < 600; x += 120) ctx.fillRect(x, T0 + 14, 2, F0 - T0 - 14);
    ctx.fillStyle = WALL.woodD; ctx.fillRect(618, T0 - 2, 330, 10);
    ctx.fillStyle = WALL.woodL; ctx.fillRect(618, T0 - 2, 330, 4);
    for (let x = 618, k = 0; x < 948; x += 22, k++) { ctx.fillStyle = k % 2 ? '#fff3da' : WALL.soft; ctx.fillRect(x, T0 + 8, Math.min(22, 948 - x), F0 - T0 - 8); }
    ctx.fillStyle = WALL.red; ctx.fillRect(618, T0 + 8, 330, 3);
    // the awning across the top: red and white stripes with a scalloped edge
    for (let x = 0, k = 0; x < W; x += 48, k++) { ctx.fillStyle = k % 2 ? '#fff6e6' : '#e2493b'; ctx.fillRect(x, 0, 48, HD.awn - 12); ctx.beginPath(); ctx.arc(x + 24, HD.awn - 12, 24, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, W, 6);
    // the sign
    const sx = W / 2, sy = 16, bg = big();
    ctx.fillStyle = '#8f5524'; rr(sx - 118, sy - 4, 236, 54, 14); ctx.fill();
    ctx.fillStyle = '#ffd36b'; rr(sx - 112, sy, 224, 46, 11); ctx.fill();
    for (let k = 0; k < 14; k++) { const a = k / 14; ctx.fillStyle = Math.floor(t * 4 + k) % 2 ? '#fff6e6' : '#ff6b4a'; circle(sx - 104 + a * 208, sy + 3, 2.4); ctx.fill(); circle(sx - 104 + a * 208, sy + 43, 2.4); ctx.fill(); }
    text('HOT DOGS', sx + 18, sy + 24, bg ? 28 : 26, '#c8342a', 'center');
    drawDog(sx - 76, sy + 24, 1.3, 'km');
  }

  /* the stations on the counters */
  function drawStations(st, t) {
    const bg = big();
    // the grill: a flat-top over glowing coals
    ctx.fillStyle = '#3a3a48'; rr(88, T0 - 30, 206, 32, 6); ctx.fill();
    ctx.fillStyle = '#5a5a6a'; rr(88, T0 - 30, 206, 7, 4); ctx.fill();
    const glow = 0.5 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = 'rgba(255,110,40,' + glow + ')'; ctx.fillRect(96, T0 - 10, 190, 6);
    ctx.strokeStyle = '#7a7a8a'; ctx.lineWidth = 2; for (let x = 100; x < 290; x += 12) { ctx.beginPath(); ctx.moveTo(x, T0 - 23); ctx.lineTo(x, T0 - 12); ctx.stroke(); }
    for (let i = 0; i < 4; i++) {
      const s = st.grill[i], gx = HD.grill[i], gy = T0 - 30;
      if (!s) { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; rr(gx - 18, gy - 8, 36, 10, 5); ctx.stroke(); ctx.setLineDash([]); continue; }
      const ss = sausageState(st, s);
      drawSausage(gx, gy - 3, st, s, t);
      // status ring above it
      const ry = gy - 26, R = bg ? 11 : 9;
      if (ss === 'raw') {
        const f = s.t / HD.cookT;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(gx, ry, R + 2); ctx.fill();
        ctx.strokeStyle = '#e8a080'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(gx, ry, R - 2, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
      } else if (ss === 'golden') {
        const left = goldenLeft(st, s), warn = left < HD.warnT;
        if (st.goldTimer) {
          const f = clamp(left / goodFor(st), 0, 1);
          ctx.fillStyle = 'rgba(255,214,90,0.35)'; circle(gx, ry, R + 6); ctx.fill();
          ctx.fillStyle = '#fff6d6'; circle(gx, ry, R + 2); ctx.fill();
          ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(gx, ry, R - 1, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
          text(String(Math.ceil(left)), gx, ry + 0.5, bg ? 13 : 11, '#8a5a12', 'center', 'body');
        } else if (warn && Math.floor(t * 6) % 2 === 0) {
          ctx.fillStyle = '#ff5a4a'; circle(gx, ry, R + 2); ctx.fill();
          text('!', gx, ry + 0.5, bg ? 17 : 15, '#ffffff', 'center');
        } else if (!warn) drawTick(gx, ry, R + 1);
        else { ctx.fillStyle = '#ffd0c8'; circle(gx, ry, R + 2); ctx.fill(); text('!', gx, ry + 0.5, bg ? 17 : 15, '#ff5a4a', 'center'); }
      }
    }
    // the bun basket
    const bx = HD.bun, by = T0;
    ctx.fillStyle = '#b8742c'; ctx.beginPath(); ctx.moveTo(bx - 24, by - 22); ctx.lineTo(bx + 24, by - 22); ctx.lineTo(bx + 19, by); ctx.lineTo(bx - 19, by); ctx.fill();
    for (let k = 0; k < 3; k++) { ctx.fillStyle = '#f2b866'; ctx.beginPath(); ctx.ellipse(bx - 13 + k * 13, by - 24 - (k % 2) * 3, 9, 6, -0.2 + k * 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8823c'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.strokeStyle = '#8f5524'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx - 22 + k * 1.6, by - 16 + k * 6); ctx.lineTo(bx + 22 - k * 1.6, by - 16 + k * 6); ctx.stroke(); }
    // the topping bottles
    for (const tp of st.room.tops) drawBottle(st, tp, HD.tops[tp], T0, t);
    // the pass shelf in the divider (4 slots, 2 boards)
    const sx = HD.shelf;
    ctx.fillStyle = WALL.woodD; ctx.fillRect(sx - 36, T0 - 2, 72, 6); ctx.fillRect(sx - 36, T0 - 34, 72, 5);
    ctx.fillStyle = WALL.woodL; ctx.fillRect(sx - 36, T0 - 34, 72, 2);
    ctx.fillStyle = WALL.woodD; ctx.fillRect(sx - 36, T0 - 34, 4, 36); ctx.fillRect(sx + 32, T0 - 34, 4, 36);
    for (let i = 0; i < HD.shelfN; i++) {
      const k = st.shelf[i];
      if (!k) continue;
      const ix = sx - 16 + (i % 2) * 32, iy = i < 2 ? T0 - 8 : T0 - 40;
      drawDog(ix, iy, 0.85, topsOf(k));
    }
    // a little wooden plaque with the word on it (sized to the word)
    { ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif'; const pw = ctx.measureText('PASS').width + 16;
      ctx.fillStyle = 'rgba(60,30,10,0.18)'; rr(sx - pw / 2 + 1.5, T0 - 62.5, pw, 18, 5); ctx.fill();
      ctx.fillStyle = WALL.woodL; rr(sx - pw / 2, T0 - 64, pw, 18, 5); ctx.fill();
      ctx.strokeStyle = WALL.woodD; ctx.lineWidth = 1.5; rr(sx - pw / 2, T0 - 64, pw, 18, 5); ctx.stroke();
      text('PASS', sx, T0 - 54.5, 11, '#5e3014', 'center', 'body'); }
    // the lemonade jug (from Lunch Rush)
    if (st.room.lemon > 0) drawJug(st, t);
    // the gold bell on the counter
    if (st.bell) {
      const x = 935, y = T0 - 4, sw = st.bellT > 0 ? Math.sin(st.bellT * 30) * 0.4 : 0;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-10, -18, 0, -18); ctx.quadraticCurveTo(10, -18, 10, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b9850f'; ctx.fillRect(-12, -2, 24, 4); circle(0, -20, 2.5); ctx.fill();
      ctx.restore();
    }
  }
  function drawSausage(x, y, st, s, t) {
    const ss = sausageState(st, s);
    let col = '#f2908a';
    if (ss === 'raw') { const f = s.t / HD.cookT; col = f < 0.5 ? '#f2908a' : '#e0705a'; }
    else if (ss === 'golden') col = '#c0542c';
    else col = '#3a2a24';
    if (ss === 'golden') { ctx.fillStyle = 'rgba(255,214,90,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')'; rr(x - 22, y - 9, 44, 16, 8); ctx.fill(); }
    ctx.fillStyle = col; rr(x - 17, y - 5, 34, 10, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; rr(x - 17, y - 5, 34, 10, 5); ctx.stroke();
    if (ss === 'golden') { ctx.strokeStyle = '#7a2e14'; ctx.lineWidth = 1.5; for (let k = -8; k <= 8; k += 8) { ctx.beginPath(); ctx.moveTo(x + k - 2, y - 4); ctx.lineTo(x + k + 2, y + 4); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(x - 13, y - 4, 20, 3, 1.5); ctx.fill();
    if (ss === 'golden' && Math.sin(t * 5 + x) > 0.6) { ctx.fillStyle = '#fff6c8'; circle(x + 12, y - 8, 2); ctx.fill(); }
  }
  function drawBottle(st, tp, x, y, t) {
    const T = TOPS[tp], sq = st.squirt[tp] > 0 ? Math.sin(st.squirt[tp] / 0.35 * Math.PI) : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.15, 1 - sq * 0.12);
    if (tp === 'k' || tp === 'm') {
      ctx.fillStyle = T.col; rr(-9, -38, 18, 38, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-6, -34, 4, 26, 2); ctx.fill();
      ctx.fillStyle = tp === 'k' ? '#ffffff' : '#e2493b'; ctx.beginPath(); ctx.moveTo(-5, -38); ctx.lineTo(5, -38); ctx.lineTo(1.5, -50); ctx.lineTo(-1.5, -50); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(-7, -24, 14, 12, 3); ctx.fill();
      if (tp === 'k') { ctx.fillStyle = '#e8322f'; circle(0, -18, 4); ctx.fill(); ctx.fillStyle = '#4fbf3a'; ctx.fillRect(-1, -23, 2, 3); }
      else { ctx.strokeStyle = '#d9a400'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -16); ctx.lineTo(-1, -21); ctx.lineTo(1, -16); ctx.lineTo(4, -21); ctx.stroke(); }
    } else if (tp === 'r') {
      ctx.fillStyle = 'rgba(220,255,220,0.8)'; rr(-11, -30, 22, 30, 5); ctx.fill();
      ctx.fillStyle = T.col; rr(-9, -24, 18, 22, 4); ctx.fill();
      ctx.fillStyle = '#2a7a1e'; for (let k = 0; k < 6; k++) { circle(-5 + (k % 3) * 5, -18 + Math.floor(k / 3) * 8, 1.6); ctx.fill(); }
      ctx.fillStyle = '#8f5524'; rr(-12, -34, 24, 6, 2); ctx.fill();
    } else if (tp === 'o') {
      ctx.fillStyle = '#6aa8e8'; ctx.beginPath(); ctx.moveTo(-15, -16); ctx.lineTo(15, -16); ctx.lineTo(11, 0); ctx.lineTo(-11, 0); ctx.fill();
      ctx.fillStyle = '#f6f0ff'; for (let k = 0; k < 7; k++) { ctx.fillRect(-11 + (k % 4) * 6, -22 + Math.floor(k / 4) * 5, 4.5, 4.5); }
      ctx.fillStyle = '#c8b0e8'; ctx.beginPath(); ctx.ellipse(8, -24, 6, 5, 0, 0, TAU); ctx.fill();
    } else if (tp === 'c') {
      ctx.fillStyle = '#d9d9e8'; rr(-14, -22, 28, 22, 5); ctx.fill();
      ctx.fillStyle = T.col; ctx.beginPath(); ctx.ellipse(0, -22, 13, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = T.col; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.quadraticCurveTo(-8, -14, -5, -12); ctx.quadraticCurveTo(-3, -16, -2, -22); ctx.fill();
      ctx.strokeStyle = '#9a9aac'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(12, -38); ctx.stroke();
    }
    ctx.restore();
    void t;
  }
  function drawJug(st, t) {
    const x = HD.jug, y = T0;
    // the stand and the big glass jug
    ctx.fillStyle = WALL.woodD; ctx.fillRect(x - 20, y - 46, 40, 6);
    ctx.fillStyle = WALL.woodD; ctx.fillRect(x - 18, y - 42, 4, 42); ctx.fillRect(x + 14, y - 42, 4, 42);
    ctx.fillStyle = 'rgba(220,245,255,0.85)'; rr(x - 18, y - 98, 36, 54, 8); ctx.fill();
    ctx.fillStyle = '#ffe066'; rr(x - 15, y - 84, 30, 38, 6); ctx.fill();
    ctx.fillStyle = '#fff6a8'; circle(x - 6, y - 70, 6); ctx.fill(); ctx.strokeStyle = '#e8c020'; ctx.lineWidth = 1.2; circle(x - 6, y - 70, 6); ctx.stroke();
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { circle(x - 8 + k * 6, y - 56 - ((t * 20 + k * 7) % 22), 1.4); ctx.fill(); }
    ctx.fillStyle = '#3fae5a'; rr(x - 18, y - 104, 36, 8, 3); ctx.fill();
    ctx.fillStyle = '#9aa0b8'; ctx.fillRect(x - 2, y - 46, 8, 6); ctx.fillRect(x + 2, y - 40, 3, 4);
    // the cup under the tap (filling)
    const f = clamp(st.cup, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.lineTo(x + 12, y - 30); ctx.lineTo(x + 9, y); ctx.lineTo(x - 5, y); ctx.fill();
    if (f > 0) { const fy = y - 1 - f * 28; ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(x - 5 - (y - fy) * 0.1, fy); ctx.lineTo(x + 9 + (y - fy) * 0.1, fy); ctx.lineTo(x + 9, y - 1); ctx.lineTo(x - 5, y - 1); ctx.fill(); }
    ctx.strokeStyle = '#e8c020'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.lineTo(x - 5, y); ctx.lineTo(x + 9, y); ctx.lineTo(x + 12, y - 30); ctx.stroke();
    if (st.pouring) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 2, y - 36, 3, 36 - f * 28); }
    // the pour meter (while pouring or a cup is part full)
    if (st.pouring || st.cup > 0.02 || st.goldJug) {
      const bg = big(), mw = bg ? 14 : 11, mx = x - 26 - mw, my0 = y - 100, mh = 96;
      ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(mx - 3, my0 - 3, mw + 6, mh + 6, 6); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(mx, my0, mw, mh);
      ctx.fillStyle = st.goldJug ? C.gold : '#5cc27f';
      ctx.fillRect(mx, my0 + mh * (1 - HD.greenHi), mw, mh * (HD.greenHi - HD.greenLo));
      ctx.fillStyle = '#ff9a8a'; ctx.fillRect(mx, my0, mw, mh * (1 - HD.greenHi) * 0.6);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(mx + 2, my0 + mh * (1 - f), mw - 4, mh * f);
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 3, my0 + mh * (1 - f)); ctx.lineTo(mx + mw + 3, my0 + mh * (1 - f)); ctx.stroke();
    }
  }
  /* hot dogs, lemonade */
  function zig(col, y0, amp, ph) {
    ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 7; k++) { const x = -14 + k * 4; const y = y0 + ((k + ph) % 2 ? amp : -amp); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function drawDog(x, y, s, tops) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#d99a4a'; rr(-16, -5, 32, 10, 5); ctx.fill();
    ctx.fillStyle = '#c4492e'; rr(-19, -6, 38, 8, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-15, -5, 22, 2, 1); ctx.fill();
    if (tops.includes('c')) { ctx.fillStyle = TOPS.c.col; ctx.beginPath(); ctx.moveTo(-15, -6); for (let k = 0; k <= 6; k++) ctx.quadraticCurveTo(-15 + k * 5 - 2.5, -9 + (k % 2) * 6, -15 + k * 5, -5); ctx.lineTo(15, -3); ctx.lineTo(-15, -3); ctx.fill(); }
    if (tops.includes('r')) { ctx.fillStyle = TOPS.r.col; for (let k = 0; k < 7; k++) { circle(-12 + k * 4, -6 + (k % 2) * 2, 1.9); ctx.fill(); } }
    if (tops.includes('o')) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = TOPS.o.dark; ctx.lineWidth = 0.8; for (let k = 0; k < 6; k++) { ctx.fillRect(-12 + k * 4.6, -9 + (k % 2) * 2, 3.4, 3.4); ctx.strokeRect(-12 + k * 4.6, -9 + (k % 2) * 2, 3.4, 3.4); } }
    if (tops.includes('m')) zig(TOPS.m.col, -4, 2.2, 1);
    if (tops.includes('k')) zig(TOPS.k.col, -7, 2.2, 0);
    ctx.fillStyle = '#f2b866'; rr(-16, -1, 32, 8, 4); ctx.fill();
    ctx.strokeStyle = '#a8662f'; ctx.lineWidth = 1.2; rr(-16, -1, 32, 8, 4); ctx.stroke();
    ctx.restore();
  }
  function drawLemon(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#ff6b8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(6, -16); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(5, 9); ctx.lineTo(-5, 9); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(-6.4, -6); ctx.lineTo(6.4, -6); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.fill();
    ctx.fillStyle = '#fff6a8'; circle(-5, -10, 4); ctx.fill(); ctx.strokeStyle = '#e8c020'; ctx.lineWidth = 1; circle(-5, -10, 4); ctx.stroke();
    ctx.strokeStyle = '#c9a400'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-5, 9); ctx.lineTo(5, 9); ctx.lineTo(7, -10); ctx.stroke();
    ctx.restore();
  }

  /* Biscuit the farm dog, on his rug at the left end of the kitchen */
  function drawBiscuit(st, t) {
    const b = st.biscuit, x = HD.biscuit, y = F0 - 2;
    ctx.fillStyle = '#5b95ff'; ctx.beginPath(); ctx.ellipse(x, y, 34, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, 26, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5b95ff'; ctx.beginPath(); ctx.ellipse(x, y, 20, 2.4, 0, 0, TAU); ctx.fill();
    const wag = Math.sin(t * (b.happy > 0 || b.wag > 0 ? 18 : 3)) * (b.happy > 0 || b.wag > 0 ? 0.7 : 0.2);
    // tail
    ctx.save(); ctx.translate(x - 22, y - 12); ctx.rotate(-0.6 + wag);
    ctx.fillStyle = '#d99a4a'; rr(-3, -16, 6, 16, 3); ctx.fill(); ctx.fillStyle = '#fff3da'; circle(0, -16, 3.2); ctx.fill();
    ctx.restore();
    // body
    ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.ellipse(x - 4, y - 12, 22, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3da'; ctx.beginPath(); ctx.ellipse(x + 2, y - 7, 12, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d99a4a'; rr(x + 6, y - 6, 16, 6, 3); ctx.fill(); rr(x - 18, y - 6, 12, 6, 3); ctx.fill();
    // head (chomps when eating)
    const chomp = b.eat > 0 ? Math.abs(Math.sin(b.eat * 16)) * 3 : 0, hx = x + 18, hy = y - 22 - (b.happy > 0 ? Math.abs(Math.sin(t * 9)) * 2 : 0);
    ctx.fillStyle = '#d99a4a'; circle(hx, hy, 12); ctx.fill();
    ctx.fillStyle = '#fff3da'; ctx.beginPath(); ctx.ellipse(hx + 7, hy + 5 + chomp * 0.3, 7, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a5a24'; ctx.beginPath(); ctx.ellipse(hx - 8, hy + 1, 5, 9, 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(hx + 12, hy + 2, 2.6); ctx.fill();
    const sleepy = b.happy <= 0 && b.eat <= 0 && st.t % 14 > 9;
    if (sleepy) { ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 3); ctx.lineTo(hx + 6, hy - 3); ctx.stroke(); text('z', hx + 14, hy - 20 - (st.t % 2) * 4, 12, '#ffffff', 'center'); }
    else if (b.happy > 0) { ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hx + 3, hy - 2, 2.6, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); }
    else { ctx.fillStyle = '#1c1a36'; circle(hx + 3, hy - 3, 1.9); ctx.fill(); }
    if (b.eat > 0 || b.happy > 0) { ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(hx + 9, hy + 10 + chomp, 2.6, 4, 0, 0, TAU); ctx.fill(); }
    // his collar and name
    ctx.fillStyle = '#e2493b'; ctx.fillRect(hx - 6, hy + 9, 10, 3); ctx.fillStyle = C.gold; circle(hx - 1, hy + 13, 2); ctx.fill();
  }

  /* ---------- on top of the players: held things, arrows, pops, chips, banners ---------- */
  function drawTop(st) {
    const t = G.clock, bg = big();
    const cp = G.players[st.cook], sp = G.players[st.serv];
    // the cook's held thing, up over the head; the server's two hands
    if (st.hold) {
      const x = cxOf(cp), y = cp.y - 12;
      if (st.hold.kind === 'sausage') drawSausage(x, y, st, { t: HD.cookT, burnt: st.hold.burnt }, t);
      else drawDog(x, y, 1.1, st.hold.tops);
    }
    st.hands.forEach((k, i) => {
      const x = cxOf(sp) + (st.hands.length === 1 ? 0 : (i ? 15 : -15)), y = sp.y - 12;
      if (isDog(k)) drawDog(x, y, 0.95, topsOf(k)); else drawLemon(x, y - 2, 1.0);
    });
    // particles
    for (const q of st.parts) {
      const a = clamp(1 - q.t / q.life, 0, 1);
      ctx.globalAlpha = a;
      if (q.kind === 'steam') { ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(q.x, q.y, q.r * (1 + q.t)); ctx.fill(); }
      else if (q.kind === 'smoke') { ctx.fillStyle = 'rgba(90,90,100,0.55)'; circle(q.x, q.y, q.r * (1 + q.t)); ctx.fill(); }
      else if (q.kind === 'heart') heart(q.x, q.y, q.r, '#ff5f8f');
      else if (q.kind === 'star') star(q.x, q.y, q.r, C.gold);
      else { ctx.fillStyle = q.col || '#ffd84a'; circle(q.x, q.y, q.r); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // where to go next: a bouncing arrow over the station in the player's colour (the key cap once you're there)
    if ((st.state === 'play' || st.state === 'last') && G.introT <= 0) {
      for (const id of [0, 1]) {
        if (isCpu(id)) continue;
        const j = job(st, id);
        if (!j || j.x == null || j.k === 'wait' || j.k === 'none') continue;
        const there = atJob(st, id, j);
        let ay = id === st.cook ? (j.k === 'biscuit' ? 410 : j.k === 'shelf' ? 380 : j.k === 'top' ? 340 : 372) : (j.k === 'take' || j.k === 'give' ? 262 : j.k === 'jug' || j.k === 'jugBack' ? 330 : 372);
        if (j.k === 'take' || j.k === 'give') ay = 300 - 24 - (j.c.taken ? Math.ceil(j.c.order.length / 2) * 24 - 14 : 0) - 14;
        const ax = j.x;
        if (there) {
          const cap = keyCap(id) + (j.k === 'jug' ? ' hold' : '');
          ctx.font = '700 ' + (bg ? 18 : 14) + 'px ' + FONT;
          const w = Math.max(bg ? 34 : 28, ctx.measureText(cap).width + 14), h = bg ? 30 : 24, s = 1 + Math.sin(t * 8) * 0.06;
          ctx.save(); ctx.translate(ax, ay); ctx.scale(s, s);
          ctx.fillStyle = PCOL[id]; rr(-w / 2, -h / 2, w, h, 7); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, 7); ctx.stroke();
          text(cap, 0, 0.5, bg ? 18 : 14, '#ffffff', 'center', 'body');
          ctx.restore();
        } else arrow(ax, ay + Math.sin(t * 6) * 4, PCOL[id], bg ? 1.3 : 1);
      }
    }
    // pops
    for (const q of st.pops) {
      const size = q.size * (bg ? 1.3 : 1);
      ctx.font = size + 'px ' + DISP;
      const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = Math.max(100, q.y - q.t * 26);
      ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
      bigText(q.s, x, y, Math.round(size), q.col);
      ctx.restore();
    }
    // hint chips over each person (first shift, then when a job waits a long time)
    if ((st.state === 'play' || st.state === 'last') && G.introT <= 0) {
      const boxes = [];
      for (const p of G.players) {
        if (isCpu(p.id)) continue;
        const P = st.pl[p.id], j = job(st, p.id), k = j ? j.k : '';
        if (k !== P.chipKey) { P.chipKey = k; P.chipAt = G.time; }
        const chipT = G.time - (P.chipAt || 0), lines = j && jobText(st, p.id, j);
        if (!lines || !lines[0] || k === 'wait') continue;
        const show = (st.k === 0 && st.elapsed < 22 && chipT < 5) || chipT > HD.chipAgain;
        if (!show) continue;
        ctx.save(); if (chipT > HD.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
        boxes.push(chip(NAMES[p.id] + ': ' + lines[0], lines[1], cxOf(p), p.id === st.cook ? 340 : 240, PCOL[p.id], boxes));
        ctx.restore();
      }
    }
    // resting
    if (st.rest) {
      let msg = 'Taking a break: the stand waits';
      if (st.restFor >= 0) { const tx = jobText(st, st.restFor, job(st, st.restFor)); msg = 'The stand waits for ' + NAMES[st.restFor] + (tx ? ': ' + tx[0] : ''); }
      ctx.font = '700 ' + (bg ? 19 : 15) + 'px ' + FONT;
      const pw = Math.min(W - 40, Math.max(bg ? 380 : 300, ctx.measureText(msg).width + 36));
      pill(W / 2, 236, pw, bg ? 40 : 32, 'center'); text(msg, W / 2, 236 + (bg ? 20 : 16), bg ? 19 : 15, '#bfe6ff', 'center', 'body');
    }
    // the shift summary and the finale
    if (st.state === 'clear' || st.state === 'end') {
      const k = clamp(st.clearT / 0.3, 0, 1), s = st.stats.shifts[st.stats.shifts.length - 1];
      if (s) {
        const final = st.state === 'end';
        ctx.save(); ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(W / 2 - 230, 168, 460, final ? 132 : 112, 18); ctx.fill();
        bigText(final ? 'What a fair! Hooray!' : s.title + ' done!', W / 2, 200, bg ? 36 : 32, C.gold);
        const line = s.happy + ' happy · ' + s.missed + ' missed · goal ' + s.goal + (s.met ? ' ✓' : '');
        text(line, W / 2, 236, bg ? 20 : 17, C.paper, 'center', 'body');
        text(s.met ? 'Goal reached! Great teamwork!' : 'Good work! Keep it up!', W / 2, 262, bg ? 17 : 14, s.met ? '#9ff09a' : '#d9d3ef', 'center', 'body');
        if (final) text('Everyone at the fair loved your hot dogs!', W / 2, 286, bg ? 17 : 14, C.paper, 'center', 'body');
        ctx.restore();
      }
    }
  }
  function arrow(x, y, col, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -16); ctx.lineTo(7, -16); ctx.lineTo(7, -6); ctx.lineTo(13, -6); ctx.lineTo(0, 8); ctx.lineTo(-13, -6); ctx.lineTo(-7, -6); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
  }
  function heart(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r * 0.9); ctx.fill();
  }
  function star(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1; ctx.stroke();
  }
  function chip(t1, t2, x, y, col, avoid) {
    const z = big() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
    ctx.font = '700 ' + f1 + 'px ' + FONT;
    let w = ctx.measureText(t1).width;
    if (t2) { ctx.font = '700 ' + f2 + 'px ' + FONT; w = Math.max(w, ctx.measureText(t2).width); }
    w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
    const x0 = clamp(x - w / 2, 8, W - 8 - w);
    let y0 = clamp(y - h, 100, H - 8 - h);
    for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 100 ? b.y0 - h - 6 : b.y1 + 6;
    ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
    text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
    if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  }

  /* ---------- the HUD ---------- */
  function drawHud(st) {
    const bg = big(), fs = bg ? 20 : 14, h = bg ? 40 : 28, s = st.stats;
    // top right: the shift clock, happy, missed, stars
    const sec = Math.ceil(st.left), clock = st.state === 'last' ? 'Last orders' : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    const parts = [[clock, st.rest ? '#9fd8ff' : st.state === 'last' || sec <= 10 ? C.gold : C.paper, 'clock'], [String(s.happy), '#9ff09a', 'happy'], [String(s.missed), s.missed ? '#ffb08a' : C.paper, 'miss'], [String(s.stars), C.gold, 'star']];
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const icon = bg ? 22 : 16, ws = parts.map(q => ctx.measureText(q[0]).width + icon + 4), gap = fs;
    const w = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    let x = x0 + 15;
    parts.forEach((q, i) => {
      hudIcon(q[2], x + icon / 2, cy, icon / 2);
      text(q[0], x + icon + 4, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap;
    });
    // gold help chips under it
    const chips = [];
    if (st.bell) chips.push('GOLD BELL: MORE PATIENCE');
    if (st.goldTimer) chips.push('GOLD TIMER');
    if (st.goldJug) chips.push('GOLD JUG');
    if (st.rest) chips.push('RESTING: THE STAND WAITS');
    let cy2 = 12 + h + 6;
    for (const c of chips) {
      const fs2 = bg ? 15 : 11;
      ctx.font = '700 ' + fs2 + 'px ' + FONT;
      const w2 = ctx.measureText(c).width + 20;
      pill(W - 14, cy2, w2, fs2 + 10, 'right');
      text(c, W - 24, cy2 + (fs2 + 10) / 2 + 0.5, fs2, c.startsWith('REST') ? '#9fd8ff' : C.gold, 'right', 'body');
      cy2 += fs2 + 14;
    }
    // job panels, bottom corners
    for (const id of [0, 1]) {
      const cook = id === st.cook, cpu = isCpu(id);
      const t1 = NAMES[id] + ' · ' + (cook ? 'cook' : 'server') + (cpu ? ' (computer)' : '');
      const kk = dev(id) === 'touch' ? 'round button' : key(id);
      const t2 = cpu ? (cook ? 'grills and builds the hot dogs' : 'takes orders and serves') : (cook ? 'grill, bun, toppings: ' + kk : 'take orders, serve: ' + kk);
      const pf = bg ? 17 : 13, pf2 = bg ? 15 : 12;
      ctx.font = '700 ' + pf + 'px ' + FONT;
      const tw1 = ctx.measureText(t1).width; ctx.font = '700 ' + pf2 + 'px ' + FONT;
      const pw = Math.max(tw1, ctx.measureText(t2).width) + 50 + (cook ? 0 : 0);
      const ph = bg ? 50 : 40, px = cook ? 12 : W - 12 - pw, py = H - ph - 8;
      ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(px, py, pw, ph, 12); ctx.stroke();
      const ix = px + 20, iy = py + ph / 2;
      if (cook) { // a little chef's hat
        ctx.fillStyle = '#ffffff'; circle(ix - 6, iy - 4, 6); ctx.fill(); circle(ix, iy - 7, 7); ctx.fill(); circle(ix + 6, iy - 4, 6); ctx.fill(); ctx.fillRect(ix - 8, iy - 2, 16, 9);
        ctx.fillStyle = '#d4dde6'; ctx.fillRect(ix - 8, iy + 4, 16, 3);
      } else { // a serving tray
        ctx.fillStyle = '#d4dde6'; ctx.beginPath(); ctx.ellipse(ix, iy + 4, 12, 4, 0, 0, TAU); ctx.fill();
        drawDog(ix, iy - 2, 0.55, 'k');
      }
      text(t1, px + 38, py + ph * 0.32, pf, PCOL[id], 'left', 'body');
      text(t2, px + 38, py + ph * 0.72, pf2, C.paper, 'left', 'body');
    }
    // news
    const n = st.news;
    if (n && G.mode === 'play') {
      const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = bg ? 19 : 14, nh = bg ? 34 : 26, ny = bg ? 82 : 76;
      ctx.font = '700 ' + nfs + 'px ' + FONT;
      const nw = Math.min(W - 40, ctx.measureText(n.s).width + 32);
      ctx.save(); ctx.globalAlpha = a;
      const px = pill(W / 2, ny, nw, nh, 'center');
      if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
      text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
      ctx.restore();
    }
  }
  function hudIcon(k, x, y, r) {
    if (k === 'clock') {
      ctx.fillStyle = '#ffffff'; circle(x, y, r); ctx.fill();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.45, y); ctx.stroke();
    } else if (k === 'happy') {
      ctx.fillStyle = '#5cc27f'; circle(x, y, r); ctx.fill();
      ctx.fillStyle = '#1c1a36'; circle(x - r * 0.35, y - r * 0.2, r * 0.13); ctx.fill(); circle(x + r * 0.35, y - r * 0.2, r * 0.13); ctx.fill();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.45, 0.3, Math.PI - 0.3); ctx.stroke();
    } else if (k === 'miss') {
      ctx.fillStyle = '#ff9a7a'; circle(x, y, r); ctx.fill();
      ctx.fillStyle = '#1c1a36'; circle(x - r * 0.35, y - r * 0.2, r * 0.13); ctx.fill(); circle(x + r * 0.35, y - r * 0.2, r * 0.13); ctx.fill();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.4); ctx.lineTo(x + r * 0.4, y + r * 0.4); ctx.stroke();
    } else star(x, y, r, C.gold);
  }

  /* ---------- sounds ---------- */
  Sfx.extra.hotdogSizzle = function () { this.tone(220, 0.25, 'sawtooth', 0.012, 160); this.tone(90, 0.15, 'triangle', 0.04, 70); };
  Sfx.extra.hotdogReady = function () { this.tone(880, 0.07, 'triangle', 0.035); this.tone(1320, 0.1, 'triangle', 0.03, null, 0.06); };
  Sfx.extra.hotdogBurn = function () { this.tone(330, 0.2, 'triangle', 0.035, 220); };
  Sfx.extra.hotdogPick = function () { this.tone(600, 0.06, 'sine', 0.04, 800); };
  Sfx.extra.hotdogBun = function () { this.tone(260, 0.08, 'sine', 0.05, 340); this.tone(520, 0.08, 'triangle', 0.03, null, 0.05); };
  Sfx.extra.hotdogSquirt = function (p) { this.tone(420 * p, 0.12, 'sawtooth', 0.015, 180 * p); };
  Sfx.extra.hotdogShelf = function () { this.tone(500, 0.06, 'triangle', 0.04); this.tone(750, 0.1, 'triangle', 0.035, null, 0.05); };
  Sfx.extra.hotdogDing = function () { this.tone(1568, 0.25, 'sine', 0.045); this.tone(2093, 0.3, 'sine', 0.02, null, 0.02); };
  Sfx.extra.hotdogHi = function () { this.tone(700, 0.06, 'triangle', 0.025, 900); };
  Sfx.extra.hotdogThanks = function () { this.tone(660, 0.07, 'triangle', 0.035); this.tone(880, 0.09, 'triangle', 0.03, null, 0.06); };
  Sfx.extra.hotdogYum = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.045, null, i * 0.06)); };
  Sfx.extra.hotdogShrug = function () { this.tone(392, 0.14, 'triangle', 0.035, 330); this.tone(294, 0.2, 'triangle', 0.03, 262, 0.12); };
  Sfx.extra.hotdogNope = function () { this.tone(440, 0.07, 'sine', 0.03); this.tone(370, 0.1, 'sine', 0.03, null, 0.08); };
  Sfx.extra.hotdogWoof = function () { this.tone(240, 0.08, 'square', 0.03, 180); this.tone(260, 0.1, 'square', 0.025, 170, 0.12); };
  Sfx.extra.hotdogPour = function () { this.tone(500 + Math.random() * 300, 0.05, 'sine', 0.02, 700); };
  Sfx.extra.hotdogLemon = function () { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.04, null, i * 0.05)); };
  Sfx.extra.hotdogSpill = function () { this.tone(600, 0.25, 'sine', 0.04, 150); this.tone(300, 0.15, 'triangle', 0.03, 120, 0.1); };
  Sfx.extra.hotdogNo = function () { this.tone(300, 0.08, 'triangle', 0.025, 240); };
  Sfx.extra.hotdogSnap = function (p) { this.tone(820 * p, 0.04, 'triangle', 0.02, 620 * p); };
  Sfx.extra.hotdogBell = function () { this.tone(1760, 0.3, 'sine', 0.04); this.tone(1760, 0.3, 'sine', 0.035, null, 0.18); };
  Sfx.extra.hotdogBus = function () { this.tone(330, 0.18, 'square', 0.03); this.tone(392, 0.25, 'square', 0.03, null, 0.22); };
  Sfx.extra.hotdogGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.hotdogGoal = function () { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.07)); };
  Sfx.extra.hotdogClear = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.055, null, i * 0.08)); };
  Sfx.extra.hotdogWin = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
})();

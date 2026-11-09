/* Pip & Bo - Computer partner brain for 24-4 Pillow Fort Battle (mode 'pillowfort'). */
'use strict';

(() => {
  /* The computer is the other fort's builder and tosser. It presses the same keys a person does: ◀ ▶ walk, ▲ jump (to
     climb its fort), the action (pick up, build, or hold to aim and let go to toss).
     Every "react" seconds (Hard 0.12 s, Normal 0.3 s, Easy 0.6 s) it looks again and picks a job:
       empty hands  walk to a toy on its own side (walking over picks it up). Which toy: Hard and Normal want a pillow
                    when their teddy is wobbly or their fort is behind, otherwise a plushie (specials first); Easy
                    just goes to the nearest one. Nothing to grab: wait by the middle of its side.
       a plushie    try a few spots on its side (where it stands, near the rug line, by its own fort) and, for each, a
                    sweep of charges, flying each toss in its head with the level's own flight rule
                    (MODES.pillowfort.test.path, the same maths the toss follows). Each landing is scored: the other
                    teddy (very good), the column under him (good), blocks shielding him or the top of the front
                    wall (fine), the carpet (bad). Hard takes the best; Normal the best most of the time; Easy aims
                    at any block it likes and is happy with a quick tap now and then (the self-aiming lob).
                    It walks to the spot, stands still, holds the action to the charge it wants and lets go.
                    Mistakes: the charge it lets go at wobbles (Easy ±0.07, Normal ±0.025, Hard ±0.006).
       a pillow     (after 6 s with nowhere at all to build it puts it down with ▼ and leaves it a while)
                    pick a column of its own fort: the teddy column when he's wobbly (Comfy!), else the lowest
                    column shielding the teddy, else the front wall (Easy: the column nearest it). It stands next
                    to that column facing it (on the carpet or on the next column, found with cpuNav), checks the
                    ghost spot (MODES.pillowfort.test.placeSpot) and presses the action; after 4 s of trying it
                    builds wherever the ghost is.
     Easy also has lapses: it stops for a second now and then, like a kid watching the other fort.
     What it reads: the toys lying about, the forts and teddies (all on screen), its own hands. Never the other
     player's keys. It talks (1-player mode only) in short bubbles: "Fwump!", "Wobble wobble!", "Pillow time!". */
  const SK = {
    easy: { react: 0.8, jit: 0.12, smart: 0.1, tap: 0.7, lapse: 0.3, lapseT: 1.3, buildWant: 0.35, spots: 1, settle: 0.6, dawdle: 0.6, floorOnly: true, admire: 1.1 },
    normal: { react: 0.3, jit: 0.03, smart: 0.75, tap: 0.05, lapse: 0.06, lapseT: 0.7, buildWant: 0.5, spots: 2, settle: 0.25 },
    hard: { react: 0.12, jit: 0.006, smart: 1, tap: 0, lapse: 0, lapseT: 0, buildWant: 0.55, spots: 3, settle: 0.12 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T_ = () => MODES.pillowfort.test;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const side = k => (k === 0 ? [44, 466] : [494, 916]);           // the x range of its own side (player centre)
  const navOpts = k => ({ avoid: tx => (k === 0 ? tx >= 16 : tx <= 15), key: 'pfside' + k, tol: 5 });

  // a fake player body at x (centre) on its own floor/fort for flying tosses in its head
  function bodyAt(p, x) {
    const q = { id: p.id, x: x - p.w / 2, y: p.y, w: p.w, h: p.h, face: p.face };
    if (x !== p.x + p.w / 2) {
      const c = Math.floor(x / T), i = T_().idx(p.id, c), top = i >= 0 ? T_().topY(p.id, i) : T_().PFB.floorY;
      q.y = top - p.h;
    }
    return q;
  }
  // score where a toss lands (hit is from the flight rule)
  function scoreHit(ms, k, hit, sk) {
    if (!hit) return -50;
    const o = 1 - k, td = ms.ted[o];
    if (hit.kind === 'ted') return 100;
    if (hit.kind === 'block') {
      const col = ms.fort[o][hit.i];
      if (hit.i === td.i) return 70 + (col.length <= 2 ? 20 : 0);
      // blocks that stand between its toss and the teddy (in front of him, taller than his feet)
      const shield = hit.i > td.i && hit.j >= ms.fort[o][td.i].length - 1;
      return (shield ? 45 : 25) + (hit.j === col.length - 1 ? 5 : 0) + (sk.smart < 0.5 ? Math.random() * 30 : 0);
    }
    if (hit.kind === 'floor') return -20;
    return -30;
  }
  // the best toss from a spot: { c (charge), sc, hit }
  function bestToss(ms, p, x, sk) {
    const k = p.id, q = bodyAt(p, x);
    let best = null;
    for (let c = 0; c <= 1.0001; c += 0.025) {
      const pts = T_().path(ms, k, T_().launch(q, c, 0), 2.6, 1), e = pts[pts.length - 1];
      const sc = scoreHit(ms, k, e && e.hit, sk) - c * 2;
      if (!best || sc > best.sc) best = { c, sc, hit: e && e.hit };
    }
    return best;
  }
  function pickTossPlan(ms, p, sk) {
    const k = p.id, sd = side(k), cx = p.x + p.w / 2, d = k === 0 ? 1 : -1;
    const spots = [cx];
    if (sk.spots >= 2) spots.push(k === 0 ? sd[1] - 12 : sd[0] + 12);
    if (sk.spots >= 3) spots.push(k === 0 ? 285 : 675, cx + d * 60);
    let best = null;
    for (const x of spots) {
      const xx = clamp(x, sd[0], sd[1]);
      const b = bestToss(ms, p, xx, sk);
      b.x = xx; b.sc -= Math.abs(xx - cx) * 0.03;
      if (!best || b.sc > best.sc) best = b;
    }
    // Normal sometimes (Easy often) settles for any block, not the best
    if (Math.random() > sk.smart) { const b = bestToss(ms, p, cx, { smart: 0 }); b.x = cx; return b; }
    return best;
  }
  // which column to build on, and where to stand to do it
  function pickBuild(st, ms, p, sk, info) {
    const k = p.id, f = ms.fort[k], td = ms.ted[k], d = k === 0 ? 1 : -1, cand = [];
    const ht = f[td.i].length, now = info.time;
    for (let i = 0; i < 7; i++) {
      const h = f[i].length; if (h >= 8 || (st.bad && st.bad[i] > now)) continue;
      let sc = 0;
      if (i === td.i) sc = td.wob > 0 && !ms.lay.wob && f[i + 1].length >= ht + 2 ? 90 + td.wob * 10 : h < 2 ? 60 : 5;
      else if (i === td.i + 1) sc = h < ht + 2 ? 100 : h < ht + 3 ? 30 : 0;           // the shield in front of him
      else if (i > td.i + 1) sc = 25 + (i === 6 ? 6 : 0) - h * 3 + (f[i - 1].length - h > 2 ? 30 : 0); // steps up to it
      else sc = 8 - h;
      if (sk.smart < 0.5) sc = i >= 5 ? 50 - h : 10 + Math.random() * 20;
      cand.push({ i, sc });
    }
    cand.sort((a, b) => b.sc - a.sc);
    return cand.length ? cand[0].i : 6;
  }
  // stand next to column i (on the side toward the middle when it can), facing it
  function standFor(ms, p, i) {
    const k = p.id, d = k === 0 ? 1 : -1, c = T_().colOf(k, i);
    const sc = c + d, si = T_().idx(k, sc);
    const top = si >= 0 ? T_().topY(k, si) : T_().PFB.floorY;
    return { x: sc * T + T / 2 - d * 3, feet: top, face: -d };
  }

  cpuBrain('pillowfort', {
    reset(st) { st.plan = null; st.t = 0; st.lapse = 0; },
    think(st, p, o, dt, info) {
      const out = {}, ms = info.mst;
      if (!ms || !ms.pl || info.frozen || !p.alive) { st.plan = null; return out; }
      const sk = skOf(info.skill), k = p.id, s = ms.pl[k], d = k === 0 ? 1 : -1, cx = p.x + p.w / 2;
      st.t = (st.t || 0) + dt;
      if (s.dizzy > 0) { st.plan = null; return out; }
      // aiming: hold until the charge it wants, then let go
      if (s.aim) {
        const P = st.plan;
        if (!P || P.job !== 'toss') return {};                  // (let go: a quick tap)
        if (s.holdT + dt >= P.want - dt * 0.5) return {};
        return { act: true };
      }
      if (st.lapse > 0) { st.lapse -= dt; return out; }
      st.walkOn = sk.dawdle && cpuChance(3, dt) ? Math.random() < sk.dawdle : st.walkOn !== false;
      if (sk.lapse && cpuChance(sk.lapse, dt)) { st.lapse = sk.lapseT * (0.5 + Math.random()); return out; }
      st.re = (st.re || 0) - dt;
      const hold = s.hold, isB = hold && T_().isBlock(hold.t);
      // re-plan every reaction time, or when what's in hand changed
      const sig = hold ? hold.t : 'none';
      if (!st.plan || st.plan.sig !== sig || st.re <= 0) {
        st.re = sk.react * (0.7 + Math.random() * 0.6);
        if (!st.plan || st.plan.sig !== sig || st.plan.job === 'fetch' || st.plan.job === 'wait') st.plan = this.plan(st, ms, p, sk, sig, info);
      }
      const P = st.plan;
      if (!P) return out;
      // Easy looks at a new toy for a moment before doing anything with it
      if (sk.admire && hold && s.pickT < sk.admire * (P.adm || (P.adm = 0.5 + Math.random()))) return out;
      if (P.job === 'toss') {
        if (!P.ready) {
          const at = Math.abs(cx - P.x) <= 6;
          if (!at) { const m = cpuNav(st, p, P.x, P.feet, navOpts(k)); P.walkT = (P.walkT || 0) + dt; if (P.walkT > 3) P.x = cx; return m; }
          if (!p.grounded || Math.abs(p.vx) > 20) return out;
          P.settle = (P.settle || 0) + dt;
          if (P.settle < sk.settle) return out;
          // look once more from right here (things moved), then start
          const b = P.tap ? { c: 0 } : bestToss(ms, p, cx, sk);
          P.want = P.tap ? 0 : T_().PFB.tapT + clamp(b.c + gauss() * sk.jit, 0, 1) * T_().PFB.chargeT;
          P.ready = true; P.pressT = 0;
          if (b.hit && b.hit.kind === 'ted') cpuSay(p, 'Wobble wobble!');
          return { act: true };
        }
        // the press didn't take (a pause after the last toss): let go and press again
        P.pressT += dt;
        if (P.pressT > 0.08) { P.ready = false; P.settle = 0; return {}; }
        return { act: true };
      }
      if (P.job === 'build') {
        P.t = (P.t || 0) + dt;
        const spot = T_().placeSpot(ms, p);
        if (!spot.why && (spot.i === P.i || P.t > 3.5) && (p.grounded || P.t > 3.5)) { st.plan = null; return { act: true }; }
        // can't get there: forget that column for a while and build at the front instead
        if (P.t > 3.5 && !P.gaveUp) { (st.bad || (st.bad = {}))[P.i] = info.time + 8; P.gaveUp = true; P.i = 6; }
        // nowhere at all to build (every column full or out of reach): put it down and go for a plushie instead
        if (P.t > 6 && spot.why) { st.skip = { id: ms.nid, until: info.time + 10 }; st.plan = null; return { down: true }; }
        if (P.t > 8) { st.plan = this.plan(st, ms, p, sk, sig, info); return out; }
        const sp = standFor(ms, p, P.i);
        const m = cpuNav(st, p, sp.x, sp.feet, navOpts(k));
        // arrived, facing the wrong way: a tiny step toward the column turns round
        if (st.nav && st.nav.status === 'arrived' && p.grounded && p.face !== sp.face) { m.left = sp.face < 0; m.right = sp.face > 0; }
        return m;
      }
      if (P.job === 'fetch') {
        const it = ms.items.find(x => x.id === P.id);
        if (!it) { st.plan = null; return out; }
        const m = cpuNav(st, p, it.x, Math.floor((it.y + 11) / T) * T + 0.01, navOpts(k));
        if (sk.dawdle && !st.walkOn && p.grounded) { m.left = m.right = false; m.jump = false; }
        if (Math.abs(it.x - cx) < 14 && Math.abs(it.y - (p.y + p.h / 2)) < 40) m.act = 'tap';
        P.t = (P.t || 0) + dt; if (P.t > 5) st.plan = null;
        return m;
      }
      if (P.job === 'wait') { cpuSeek(out, p, P.x, 8); return out; }
      return out;
    },
    plan(st, ms, p, sk, sig, info) {
      const k = p.id, s = ms.pl[k], sd = side(k), cx = p.x + p.w / 2, d = k === 0 ? 1 : -1;
      if (s.hold) {
        if (T_().isBlock(s.hold.t)) return { job: 'build', sig, i: pickBuild(st, ms, p, sk, info) };
        if (Math.random() < sk.tap) return { job: 'toss', sig, x: cx, feet: p.y + p.h, tap: true };
        const b = pickTossPlan(ms, p, sk);
        return { job: 'toss', sig, x: b.x, feet: bodyAt(p, b.x).y + p.h };
      }
      // which toy to fetch
      const skip = st.skip && st.skip.until > info.time ? st.skip.id : -1;   // a pillow it just put down for having nowhere to build
      const mine = ms.items.filter(it => it.id !== skip && it.x > sd[0] - 14 && it.x < sd[1] + 14 && (it.rest || it.vy > -50) && (!sk.floorOnly || it.y > 440));
      if (!mine.length) return { job: 'wait', sig, x: k === 0 ? 380 : 580 };
      const td = ms.ted[k], behind = T_().count(ms, k) < T_().count(ms, 1 - k) - 2;
      const wantB = sk.smart >= 0.5 && ((td.wob > 0 && !ms.lay.wob) || behind || Math.random() < sk.buildWant * 0.4);
      let best = null, bs = -1e9;
      for (const it of mine) {
        const dist = Math.abs(it.x - cx) + Math.abs(it.y - p.y) * 1.5;
        let sc = -dist;
        if (sk.smart >= 0.5) {
          const isB = T_().isBlock(it.t);
          if (isB === wantB) sc += 220;
          if (it.t === 'teddy' || it.t === 'ball') sc += 60;
        }
        if (sc > bs) { bs = sc; best = it; }
      }
      if (best.t === 'teddy' || best.t === 'ball') cpuSay(p, best.t === 'teddy' ? 'Big teddy!' : 'Bouncy ball!');
      return { job: 'fetch', sig, id: best.id };
    },
  });
})();

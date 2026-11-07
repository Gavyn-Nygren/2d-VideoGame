/* Pip & Bo - Computer partner brain for 21-3 Cloud Bridge Builder. */
'use strict';

(() => {
  /* How the computer plays Cloud Bridge Builder (MODES.cloudbridge)
     It works in world coordinates (p.x + camX) and reads what a person sees: the islands, the cloud blocks and how
     melted they look, the flags, the windsock and the lift. G.mst.caller says whose job is calling this stretch. It
     plans around the team's current gap (MODES.cloudbridge.curGap: the first gap not yet crossed by both), using the
     level's own chain() (where you can walk from a surface: cloud steps, walking down, the auto-step, a rainbow spring)
     and spot() (where a flag would go).
     CALLER:
       - (A lift comes down when someone walks into its side from the island below: the computer does that when its
         partner parks on top of a raised lift and nothing happens for a while.)
       - Not across yet: walk to the front edge of the walkable chain and plant a flag (a tap of the action) once the
         builder is close enough to reach it (250 px from its funnel; just under the full reach when the builder is
         already across) and no flag or puff is still waiting. It never steps onto a cloud lift before the builder is
         close behind it, and it waits on a lift until the lift is all the way up. When a star hangs over the next
         spot, it holds the action and taps ▲ to aim the flag higher, then jumps for the star from that cloud.
       - Across but the builder isn't: if the builder's chain reaches this island it waits a little way in; otherwise it
         turns round and builds back toward the builder from the far island (flags in front of where it faces), stopping
         when the gap left is short enough for the builder to jump.
     BUILDER:
       - Puffs (a tap) whenever the oldest waiting flag is in reach, facing it, and the windsock says the calm will last
         the whole flight (it never puffs into a gust or a coming one). Follows 75 px behind the caller along its chain,
         never past the chain's end; walks toward a flag that's out of reach; steps off a cloud that is about to pop.
       - Already across while the caller isn't (the caller took a Boing): stands at the near edge of the far island
         facing back, so it can puff to the caller's flags from there.
       - Jumps a short gap (up to 100 px) onto a reverse bridge the caller built back toward it.
     Both walk onto the goal island at the end (caller past the flag, builder before it). The caller can't make clouds
     and the builder can't place them without flags, so it can never cross a gap alone.
     With a person it says short things in 1-player mode only ("Puff it!", "Come closer!", "Call a cloud!", "Turn round
     and call!", "Wind! Wait...", "Hop on the lift!"). Team brains always play at full skill. */
  const M = () => MODES.cloudbridge;
  const world = (st, p) => Object.assign({}, p, { x: p.x + st.camX });
  const cxw = (st, p) => p.x + p.w / 2 + st.camX;
  const seek = (out, st, p, tx, dead) => cpuSeek(out, p, tx - st.camX, dead == null ? 4 : dead);
  const gapAt = (st, x) => st.gaps.find(g => x >= g.x0 - 12 && x <= g.x1 + 12) || null;

  // a short gap ahead of the end of a chain that a running jump clears (onto a surface no higher than a step)
  function hopAhead(st, end, list) {
    for (const q of list) {
      if (q === end) continue;
      const d = q.x0 - end.x1;
      if (d > 12 && d <= 100 && q.top >= end.top - 30 && q.top <= end.top + 80) return q;
    }
    return null;
  }
  // walk along to world x tx (the chain is already clamped by the caller of this); a jump over a short hop
  function walk(out, st, p, tx, dead) { return seek(out, st, p, tx, dead); }
  function windOK(st, n, m) {
    const mod = M(), CB = mod.CB, c = mod.markC(m), g = gapAt(st, c.x);
    if (g && g.gold) return true;
    const T = CB.puffT0 + Math.hypot(c.x - n.x, c.y - n.y) / CB.puffV;
    const lo = Math.min(n.x, c.x) - 20, hi = Math.max(n.x, c.x) + 20;
    for (const z of st.zones) {
      if (z.kind !== 'wind' || z.x1 < lo || z.x0 > hi) continue;
      const w = mod.windState(st, z);
      if (w.s !== 'calm' || w.left < T + 0.2) return false;
    }
    return true;
  }
  const say = (p, human, s, secs) => { if (human) cpuSay(p, s, secs); };

  function caller(S, st, p, o, dt, info, out) {
    const mod = M(), CB = mod.CB, P = st.pl[p.id], O = st.pl[o.id], human = !info.partnerCpu;
    const g = mod.curGap(st), wp = world(st, p), me = cxw(st, p);
    if (!g) return toGoal(st, p, out, true);
    const A = st.isles[g.a], B = st.isles[g.b], across = P.best >= g.b, oAcross = O.best >= g.b;
    const ground = P.ground;
    const waiting = st.marks.some(m => !m.puffing) || st.puffs.length > 0;
    // finishing an aimed flag: hold the action, tap ▲ / ▼ until the ghost sits right, then let go
    if (S.aim != null) {
      const a = P.aim;
      // (first the press that starts aiming, then hold until the game shows the aim; once it's planted, done)
      if (!a) { if (S.aimSeen || (S.aimT += dt) > 0.1) { S.aim = null; S.aimSeen = false; } else out.act = true; return out; }
      S.aimSeen = true;
      out.act = true;
      if (a.off > S.aim) out.jump = 'tap';
      else if (a.off < S.aim) { S.dn = !S.dn; out.down = S.dn; }
      else out.act = false;
      return out;
    }
    if (!p.grounded) {
      // in the air: keep steering toward where we were going (a jump for a star goes straight up)
      if (S.tx != null && S.jumpT <= 0) walk(out, st, p, S.tx, 6);
      return out;
    }
    if (!ground) return out;
    const list = mod.surfaces(st);
    if (!across) {
      const ch = mod.chain(st, ground, 1, list);
      // a star right above where we stand (on a raised cloud): jump for it
      for (const s of st.stars) {
        if (s.got || S.skip.includes(s) || Math.abs(s.x - me) > 30 || ground.top > s.y + 150 || ground.top < s.y) continue;
        S.starT += dt;
        if (S.starT > 4) { S.skip.push(s); continue; }
        if (Math.abs(s.x - me) > 8) { walk(out, st, p, clamp(s.x, ground.x0 + 12, ground.x1 - 12), 3); if (Math.abs(clamp(s.x, ground.x0 + 12, ground.x1 - 12) - me) > 6) return out; }
        S.jumpT = 0.4; out.jump = true; return out;
      }
      if (mod.reaches(ch, B)) {
        let tx = Math.min(B.x1 - 24, B.x0 + 90);
        if (B.spring != null && Math.abs(tx - B.spring) < 34) tx = B.x0 + 20;
        // a star over the bridge ahead of us that we're standing under: go get it first
        S.tx = tx; walk(out, st, p, tx, 4);
        return out;
      }
      const end = ch.end;
      // a lift: wait for the builder before hopping on, and ride it all the way up
      if (ground.kind === 'lift' && ground.top > ground.high + 0.5) { S.tx = (ground.x0 + ground.x1) / 2 + 20; walk(out, st, p, S.tx, 6); say(p, human, 'Going up!'); return out; }
      if (end.kind === 'lift' && ground !== end) {
        // the builder parked on top of it: walk into its side, which calls it down (with the builder on it)
        if (O.ground === end && end.top <= end.high + 0.5) { S.tx = end.x0 + 6; walk(out, st, p, S.tx, 2); say(p, human, 'Lift, come down for me!'); return out; }
        const bx = cxw(st, o), close = bx > end.x0 - 160 && !O.boing;
        S.liftWait = (S.liftWait || 0) + dt;
        if (!close && S.liftWait < (human ? 7 : 20)) { S.tx = end.x0 - 14; walk(out, st, p, S.tx, 4); say(p, human, 'Hop on the lift with me!'); return out; }
        S.tx = end.x1 - 16; walk(out, st, p, S.tx, 4); return out;
      }
      S.liftWait = 0;
      const tx = end.x1 - 16;
      S.tx = tx;
      if (Math.abs(me - tx) > 6 || end !== ground) { walk(out, st, p, tx, 3); return out; }
      if (p.face < 0) { out.right = true; return out; }
      if (Math.abs(p.vx) > 30) return out;
      if (waiting) {
        if (human && st.marks.some(m => !m.puffing && (m.t > 2.5))) say(p, true, 'Puff it! Press the button!');
        return out;
      }
      const sp = mod.spot(st, wp, 0);
      if (sp.why) { if (sp.why === 'room' && end.kind !== 'lift') say(p, human, 'Wait for the lift!'); return out; }
      // the builder must be able to reach it (it can stand right at the edge when it's already across)
      const n = mod.nozzle(st, world(st, o)), c = { x: (sp.x0 + sp.x1) / 2, y: sp.top + CB.bh / 2 };
      const reach = oAcross ? CB.range - 12 : 250;
      if (O.boing || Math.hypot(n.x - c.x, n.y - c.y) > reach) { say(p, human, 'Come closer!'); return out; }
      // a star over this spot: aim higher
      for (const s of st.stars) {
        if (s.got || Math.abs(s.x - c.x) > 40) continue;
        for (let off = -1; off >= -2; off--) {
          const q = mod.spot(st, wp, off);
          if (!q.why && q.top <= s.y + 146) { S.aim = off; S.aimT = 0; S.aimSeen = false; out.act = true; return out; }
        }
      }
      out.act = 'tap';
      return out;
    }
    // across: the builder still has to come over
    if (!oAcross) {
      const og = O.ground;
      if (O.boing || (og && mod.reaches(mod.chain(st, og, 1, list), B)) || !og) {
        let tx = Math.min(B.x1 - 24, B.x0 + 90);
        if (B.spring != null && Math.abs(tx - B.spring) < 34) tx = B.x0 + 20;
        S.tx = tx; walk(out, st, p, tx, 5); return out;
      }
      // build back toward the builder from this island
      const bEnd = mod.chain(st, og, 1, list).end;
      const back = mod.chain(st, B, -1, list);
      let stand = B;
      for (const s of back.path) { if (s.kind || s.life > 2.2) stand = s; else break; }
      const left = back.path[back.path.length - 1];
      // short enough for the builder to jump: wait
      if (left.x0 - bEnd.x1 <= 100 && left.top >= bEnd.top - 30 && left.top <= bEnd.top + 80) { say(p, human, 'Jump over!'); return out; }
      const tx = stand.x0 + 14;
      S.tx = tx;
      if (Math.abs(me - tx) > 6 || ground !== stand) { walk(out, st, p, tx, 3); return out; }
      if (p.face > 0) { out.left = true; return out; }
      if (Math.abs(p.vx) > 30 || waiting) return out;
      const sp = mod.spot(st, wp, 0);
      if (sp.why) return out;
      const n = mod.nozzle(st, world(st, o)), c = { x: (sp.x0 + sp.x1) / 2, y: sp.top + CB.bh / 2 };
      if (Math.hypot(n.x - c.x, n.y - c.y) > CB.range - 12) return out;
      say(p, human, 'I’ll call clouds back to you!');
      out.act = 'tap';
      return out;
    }
    return out;
  }

  function builder(S, st, p, o, dt, info, out) {
    const mod = M(), CB = mod.CB, P = st.pl[p.id], O = st.pl[o.id], human = !info.partnerCpu;
    const g = mod.curGap(st), wp = world(st, p), me = cxw(st, p);
    // puff whenever a waiting flag is in reach (facing it), and the wind allows
    const m = mod.target(st, wp);
    const mw = st.marks.find(q => !q.puffing);
    if (mw && p.alive) {
      // (it turns to face a flag only while standing still: see the end of this function)
      if (m) {
        if (windOK(st, mod.nozzle(st, wp), m)) { if (P.cd <= 0) out.act = 'tap'; }
        else say(p, human, 'Wind! Wait…', 1.2);
      } else if (human && mw.t > 3 && !mod.target(st, Object.assign({}, wp, { face: -p.face }))) say(p, true, 'I can’t reach! Come back!', 1.4);
    }
    if (!g) return toGoal(st, p, out, false);
    if (!p.grounded) { if (S.tx != null) walk(out, st, p, S.tx, 6); return out; }
    const ground = P.ground;
    if (!ground) return out;
    const A = st.isles[g.a], B = st.isles[g.b], across = P.best >= g.b, oAcross = O.best >= g.b;
    const list = mod.surfaces(st), ch = mod.chain(st, ground, 1, list);
    const cx = cxw(st, o);
    // parked on top of a lift while the caller still waits below it: hop off so the lift can sink back for them
    if (ground.kind === 'lift' && ground.top <= ground.high + 0.5 && O.ground !== ground && cx < ground.x0 && !O.boing) {
      S.tx = ground.x0 - 40; walk(out, st, p, S.tx, 4); return out;
    }
    if (across) {
      if (!oAcross && !O.boing) {
        // the caller is back on the near side: stand at our near edge facing back, ready to puff over the gap
        const tx = B.x0 + 14;
        S.tx = tx;
        if (Math.abs(me - tx) > 6) { walk(out, st, p, tx, 3); return out; }
        if (p.face > 0 && !out.act) out.left = true;
        return out;
      }
      return out;
    }
    // the caller sits on a raised lift above us and calls no flag: walk into its side so it comes down for us
    const L = st.lifts.find(q => Math.abs(ch.end.x1 - q.x0) < 2 && ch.end.kind === 'isle');
    if (L && O.ground === L && L.top < L.low - 30 && !mw && !st.puffs.length && ground === ch.end) {
      S.liftT = (S.liftT || 0) + dt;
      if (S.liftT > 3) { S.tx = L.x0 + 6; walk(out, st, p, S.tx, 2); say(p, human, 'Bring the lift down for me!', 1.6); return out; }
    } else S.liftT = 0;
    // on a lift: ride it (stand in the middle)
    if (ground.kind === 'lift' && Math.abs(ground.vy) > 1) { S.tx = (ground.x0 + ground.x1) / 2 - 20; walk(out, st, p, S.tx, 6); return out; }
    let tx;
    if (mod.reaches(ch, B)) tx = oAcross ? B.x0 + 40 : Math.min(cx - 75, B.x0 + 40);
    else {
      tx = Math.min(cx - 75, ch.end.x1 - 14);
      // a waiting flag out of reach: walk toward it
      if (mw && !m) tx = Math.min(ch.end.x1 - 14, Math.max(tx, mod.markC(mw).x - 150));
      // a short hop onto the caller's reverse bridge: jump it
      const hop = oAcross && hopAhead(st, ch.end, list);
      if (hop) {
        tx = hop.x0 + 30;
        const edge = ch.end.x1;
        out.right = true;
        if (edge - (me + 11) < 6 && ground === ch.end) { out.jump = true; S.jumpT = 0.4; }
        S.tx = tx;
        return out;
      }
    }
    // don't stand on a cloud that's about to pop when there's somewhere better ahead
    if (!ground.kind && ground.life < 0.9) {
      const i = ch.path.indexOf(ground);
      if (ch.path[i + 1]) tx = Math.max(tx, ch.path[i + 1].x0 + 30);
    }
    // never past the end of where we can walk
    if (!mod.reaches(ch, B)) tx = Math.min(tx, ch.end.x1 - 14);
    // never walk back off the island behind us into the gap
    tx = Math.max(tx, (ch.path[0] && ch.path[0].x0 + 14) || tx);
    S.tx = tx;
    walk(out, st, p, tx, 5);
    // standing still: face the caller (so the cloud machine points the way the clouds go)
    if (!out.left && !out.right && Math.abs(p.vx) < 30) { const want = mw ? (mod.markC(mw).x < me ? -1 : 1) : cx < me - 4 ? -1 : 1; if (p.face !== want) { out.left = want < 0; out.right = want > 0; } }
    if (human) {
      const atEdge = Math.abs(me - (ch.end.x1 - 14)) < 10 && !mod.reaches(ch, B);
      if (atEdge && !mw && !st.puffs.length) say(p, true, oAcross ? 'Turn round and call a cloud for me!' : 'Call a cloud!', 1.6);
    }
    return out;
  }

  // the goal island: both walk on (the caller past the flag, the builder before it)
  function toGoal(st, p, out, isCaller) {
    const gi = st.goalIsle, fx = gi.castle ? gi.x0 + 150 : gi.x0 + (gi.x1 - gi.x0) * 0.62;
    const tx = clamp(fx + (isCaller ? 40 : -50), gi.x0 + 20, gi.x1 - 20);
    seek(out, st, p, tx, 6);
    return out;
  }

  cpuBrain('cloudbridge', {
    reset(S) { S.aim = null; S.aimT = 0; S.aimSeen = false; S.dn = false; S.tx = null; S.liftWait = 0; S.liftT = 0; S.jumpT = 0; S.starT = 0; S.skip = []; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.isles || info.intro || st.state !== 'play' || G.introT > M().CB.introHold) return out;
      if (st.pl[p.id].boing || !p.alive) { S.aim = null; S.jumpT = 0; return out; }
      // boinged up by a rainbow spring: steer onto the high island beside it
      if (!p.grounded && st.pl[p.id].springT < 1.2) { out.right = true; return out; }
      const r = p.id === st.caller ? caller(S, st, p, o, dt, info, out) : builder(S, st, p, o, dt, info, out);
      // (a jump is held long enough to be a full one)
      if (S.jumpT > 0) { S.jumpT -= dt; if (!p.grounded || r.jump) r.jump = true; }
      return r;
    },
  });
})();

/* Pip & Bo - Computer partner brain for 14-3 Tar Pit Pull (mode 'tarpit'). */
'use strict';

(() => {
  /* It reads the level's own state (G.mst: the zones between the tar crossings, each crossing's kind and lead, the
     vines, stumps, horns, logs and Gerty) and plays with buttons only. Every room is a row of crossings, left to right;
     the crossing the two of you work on is the one at the lower of your two zones.
       Someone in the goo next to my zone: go to the edge, throw the lasso (a tap of the action once in reach), then hold
       the action and walk away from the goo until SHLORP.
       Me in the goo: wade toward my partner; stuck, hold toward a puller, or wiggle while help can come (in a shallow
       puddle wiggling pops me out). With no one to pull me I let the tar take me back to my rock (a Bloop).
       Both on the same bank: the crossing's lead goes and the other helps.
         tied vine: walk under the tip, jump to grab; the helper waits out of the way.
         push vine: grab, then the helper stands by and taps the action to push.
         pass vine (out of reach): the helper holds the action at the hook stump; the swinger jumps for it once drawn in.
         Gerty: the helper holds the action at the leaf horn; the crosser runs over her back once she lies down.
       One across: tied/push, the one across waits at the edge and pulls the other one out of the goo they wade into;
         pass, the one across hooks the far stump, waits for the other to stand at the grab spot and lets go (the vine
         swings over), the other jumps for it; Gerty, the one across holds the far horn.
       Riding: pump the way the vine swings and let go over the far bank or log (steering the landing in the air).
       Both across everything: into the cave.
     With a person, it does its job and waits; if the person does the other job (rides, hooks, calls) it swaps, and if
     nothing happens for a while it offers to swap. It talks in short bubbles in 1-player mode only. */
  const say = (S, p, text) => { if (S.badge && S.badge.t >= 3 && S.roomT > 2.5) cpuSay(p, text); };
  const react = info => 0.12 + (1 - info.skill) * 0.3;
  // the player thinking right now (so the little helpers below can hold a jump and pick a side)
  let CUR = null;
  // hold the jump button for a while (a tap only makes a tiny hop: letting go early cuts a jump short)
  function hold(secs) { const st = CUR.st; if ((st.jT || 0) <= 0 && (st.jCool || 0) <= 0) st.jT = secs; }

  // move the player toward x on the ground, hopping over shallow puddles on the way
  function go(S, out, p, x, dead = 3) {
    const done = cpuSeek(out, p, x, dead);
    if (p.grounded && (out.left || out.right)) {
      const dir = out.right ? 1 : -1, cx = cpuCx(p);
      for (const rg of S.regions) {
        if (!rg.shallow) continue;
        const near = dir > 0 ? rg.x0 - cx : cx - rg.x1;
        const past = dir > 0 ? x > rg.x1 : x < rg.x0;
        if (near > 2 && near < 34 && past && Math.abs(p.vx) > 140) { hold(0.3); break; }
      }
    }
    return done;
  }
  // a standing spot that keeps clear of shallow puddles (and inside the zone)
  function spot(S, zi, x) {
    const z = S.zones[zi];
    if (z) x = clamp(x, z.x0 + (z.log >= 0 ? 12 : 16), z.x1 - (z.log >= 0 ? 12 : 16));
    // (on this player's side of the puddle, so it doesn't have to cross it)
    const from = CUR ? cpuCx(CUR.p) : x;
    for (const rg of S.regions) if (rg.shallow && x > rg.x0 - 16 && x < rg.x1 + 16) x = from < (rg.x0 + rg.x1) / 2 ? rg.x0 - 16 : rg.x1 + 16;
    return x;
  }
  // the goo the partner is in: a crossing (with its zones either side) or a shallow puddle inside a zone
  function gooOf(S, o) {
    const ox = cpuCx(o);
    for (const cr of S.cross) if (ox > cr.x0 - 2 && ox < cr.x1 + 2) return { cr, x0: cr.x0, x1: cr.x1, zN: cr.k, zF: cr.k + 1 };
    const rg = tarRegionAt(S, ox);
    if (rg) { const zi = tarZoneAt(S, ox); return { cr: null, x0: rg.x0, x1: rg.x1, zN: zi, zF: zi }; }
    return null;
  }

  /* ---------- pulling a partner out ---------- */
  function pull(S, st, p, o, ps, os, out, dt, info) {
    const ln = S.line;
    if (ln && ln.from === p.id) {
      // hold on and walk away from the goo
      out.act = true;
      const z = S.zones[ps.zone], tx = z ? clamp(ln.cx0 + ln.dir * 70, z.x0 + 10, z.x1 - 10) : ln.cx0 + ln.dir * 70;
      cpuSteer(out, p, tx, 3);
      say(S, p, 'Heave-ho!');
      return out;
    }
    if (ln) return null;
    const g = gooOf(S, o);
    if (!g) return null;
    let x;
    if (ps.zone === g.zF && g.zF !== g.zN) x = g.x1 + 14;
    else if (ps.zone === g.zN && g.zF !== g.zN) x = g.x0 - 14;
    else if (ps.zone === g.zN) x = cpuCx(p) < (g.x0 + g.x1) / 2 ? g.x0 - 14 : g.x1 + 14;
    else return null;
    x = spot(S, ps.zone, x);
    const reach = tarReach(S) - 16, dx = Math.abs(cpuCx(o) - cpuCx(p)), dy = Math.abs(o.y - p.y);
    const inReach = dx <= reach && dy <= TAR.reachDy - 10;
    if (!inReach || Math.abs(cpuCx(p) - x) > 40) go(S, out, p, x, 4);
    const ready = cpuFor(st, 'throw', inReach && p.grounded, dt);
    if (ready > react(info)) out.act = 'tap';
    if (inReach) say(S, p, 'Grab my vine!');
    return out;
  }

  /* ---------- in the goo ---------- */
  function wade(S, st, p, o, ps, os, out, dt) {
    const ln = S.line;
    if (ln && ln.to === p.id) { out.right = ln.dir > 0; out.left = ln.dir < 0; return out; }
    const helper = o.alive && !os.inTar && !os.fly;
    const rg0 = tarRegionAt(S, cpuCx(p));
    if (rg0 && rg0.shallow) {
      // a puddle: hop out toward the side I was heading (sticky hops while fresh, else wiggle-pop)
      const dir = cpuCx(p) > (rg0.x0 + rg0.x1) / 2 ? 1 : -1;   // (the nearer edge)
      if (!ps.stuck) { out.right = dir > 0; out.left = dir < 0; if (ps.goo < TAR.gooStuck - 0.1) out.jump = 'tap'; return out; }
      st.wigT = (st.wigT || 0) - dt;
      if (st.wigT <= 0) { st.wigT = 0.13; st.wigD = st.wigD > 0 ? -1 : 1; }
      out.right = st.wigD > 0; out.left = st.wigD < 0;
      return out;
    }
    if (!ps.stuck) {
      // wade toward the partner (a puller), else toward the bank ahead
      const dir = helper ? (cpuCx(o) >= cpuCx(p) ? 1 : -1) : 1;
      out.right = dir > 0; out.left = dir < 0;
      return out;
    }
    const rg = tarRegionAt(S, cpuCx(p));
    const shallow = !!(rg && rg.shallow);
    // someone who can come and pull me: next to this goo, out of it
    const g = gooOf(S, p);
    const canHelp = helper && tarFree(os) && g && (os.zone === g.zN || os.zone === g.zF);
    if (shallow || canHelp) {
      st.wigT = (st.wigT || 0) - dt;
      if (st.wigT <= 0) { st.wigT = 0.13; st.wigD = st.wigD > 0 ? -1 : 1; }
      out.right = st.wigD > 0; out.left = st.wigD < 0;
    }
    if (!shallow) {
      if (canHelp) say(S, p, 'Pull me out!');
      if (cpuChance(0.25, dt)) out.jump = 'tap';   // ("Help! Pull me!")
    }
    return out;
  }

  /* ---------- riding a vine ---------- */
  function ride(S, st, p, o, ps, os, out, dt, info) {
    const v = ps.ride, cr = S.cross[v.cross];
    // a push vine with no push coming (the pusher fell in, or wandered off): swing back home and let go there
    const pushed = v.kind !== 'push' || v.Acap >= v.pushA * 0.98;
    const pusher = tarFree(os) && os.zone === cr.k && Math.abs(cpuCx(o) - v.tieN.x) < 110;
    const waited = cpuFor(st, 'noPush', !pushed && !pusher, dt);
    const home = !pushed && (os.inTar || waited > (info.partnerCpu ? 2.5 : 7));
    const tz = S.zones[home ? cr.k : cr.k + 1];
    if (!tz) return out;
    if (home) {
      if (v.om < -0.02) out.left = true; else if (v.om > 0.02) out.right = true;
      if (cpuCx(p) < tz.x1 - 16 && cpuCx(p) > tz.x0 + 10 && v.om <= 0.05) { out.jump = 'tap'; st.land = clamp(cpuCx(p) - 10, tz.x0 + 20, tz.x1 - 24); }
      return out;
    }
    const cx = cpuCx(p), log = tz.log >= 0;
    const a = tz.x0 + (log ? 12 : 6), b = tz.x1 - (log ? 12 : 10);
    // pump: push the way the vine swings
    if (v.om > 0.02) out.right = true; else if (v.om < -0.02) out.left = true;
    // a push vine: hang on and wait for the push (a push needs us near the bottom)
    if (cx >= a && cx <= b && v.om >= -0.05) {
      out.jump = 'tap';
      st.land = clamp(cx + 14, tz.x0 + (log ? 22 : 30), tz.x1 - (log ? 22 : 30));
    }
    return out;
  }

  /* ---------- who does which job at a crossing ---------- */
  function role(S, st, cr, p, o, os, info, dt) {
    st.swap = st.swap || {};
    let mine = (cr.lead === p.id) !== !!st.swap[cr.k] ? 'go' : 'help';
    // the partner is doing a job: take the other one
    if (os.ride && os.ride.cross === cr.k) mine = 'help';
    else if (os.hooking && os.hooking.cross === cr.k) mine = 'go';
    else if (os.calling) mine = 'go';
    // a person who doesn't do their job for a while: offer to swap
    if (!info.partnerCpu) {
      const t = cpuFor(st, 'swap' + cr.k, !os.ride && !os.hooking && !os.calling && !os.inTar, dt);
      if (t > 11) { st.swap[cr.k] = !st.swap[cr.k]; st['_for_swap' + cr.k] = 0; say(S, p, 'Let’s swap jobs!'); }
    }
    return mine;
  }

  /* ---------- the crossing jobs ---------- */
  function sameBank(S, st, p, o, ps, os, cr, out, dt, info) {
    const job = role(S, st, cr, p, o, os, info, dt), v = cr.vine;
    if (cr.kind === 'gerty') {
      const gt = S.gerty;
      if (job === 'help') {
        const h = S.horns.find(q => q.cross === cr.k && q.side === 'N');
        if (!h) return out;
        if (go(S, out, p, h.x, 3) || Math.abs(cpuCx(p) - h.x) < 14) { if (p.grounded) out.act = true; }
        if (!info.partnerCpu) say(S, p, 'I’ll call Gerty! You cross!');
        return out;
      }
      return gertyRun(S, st, p, o, cr, out, info, dt);
    }
    if (cr.kind === 'pass') {
      if (job === 'help') {
        const s = S.stumps.find(q => q.cross === cr.k && q.side === 'N');
        if (!s) return out;
        const at = go(S, out, p, s.x, 3) || Math.abs(cpuCx(p) - s.x) < 14;
        // hold the hook until the partner swings off; never grab the vine again once they're on it
        if (at && p.grounded && !os.ride && (v.state === 'rest' || v.state === 'free' || (v.state === 'hooked' && v.hk && v.hk.by === p.id))) out.act = true;
        if (v.state === 'hooked' && v.hk && v.hk.ready && !info.partnerCpu) say(S, p, 'Jump and grab it!');
        return out;
      }
      const x = spot(S, cr.k, v.tieN.x - 6);
      go(S, out, p, x, 3);
      const near = Math.abs(cpuCx(p) - x) < 10;
      if (near && p.grounded && v.state === 'hooked' && v.hk && v.hk.by !== p.id && v.hk.ready) { hold(0.35); out.up = true; }
      else if (!p.grounded) out.up = true;
      if (v.state === 'rest' && !info.partnerCpu) say(S, p, 'Hook the vine for me?');
      return out;
    }
    // tied and push vines
    if (job === 'help') {
      if (cr.kind === 'push') {
        const x = spot(S, cr.k, v.tieN.x - 38);
        go(S, out, p, x, 4);
        const riding = os.ride === v;
        const ok = riding && v.pushCD <= 0 && Math.abs(v.th) < v.pushA * 0.9 && v.Acap < v.pushA && Math.abs(cpuCx(o) - cpuCx(p)) < TAR.pushReach - 6;
        if (cpuFor(st, 'push', ok && p.grounded, dt) > react(info)) out.act = 'tap';
        if (!riding && !info.partnerCpu) say(S, p, 'Grab the vine, I’ll push!');
        return out;
      }
      go(S, out, p, spot(S, cr.k, v.tieN.x - 54), 4);
      if (!os.ride && !info.partnerCpu) say(S, p, 'Your turn to swing!');
      return out;
    }
    return grabTied(S, st, p, o, os, cr, out, info, dt);
  }
  function grabTied(S, st, p, o, os, cr, out, info, dt) {
    const v = cr.vine, x = spot(S, cr.k, v.tieN.x - 2);
    if (v.state !== 'tied') { go(S, out, p, spot(S, cr.k, x - 40), 4); return out; }
    // a push vine: let the pusher get close first (a person pusher: just go)
    if (cr.kind === 'push' && info.partnerCpu && Math.abs(cpuCx(o) - x) > 70) { go(S, out, p, spot(S, cr.k, x - 30), 4); return out; }
    go(S, out, p, x, 3);
    if (Math.abs(cpuCx(p) - x) < 9 && p.grounded) { hold(0.35); out.up = true; }
    else if (!p.grounded) out.up = true;
    if (cr.kind === 'push' && !info.partnerCpu) say(S, p, 'Push me!');
    return out;
  }
  // cross on Gerty's back once she lies down (and keep going once started)
  function gertyRun(S, st, p, o, cr, out, info, dt) {
    const gt = S.gerty, wait = spot(S, cr.k, gt.x0 - 18), far = spot(S, cr.k + 1, S.zones[cr.k + 1].x0 + 46);
    const onBank = cpuCx(p) < gt.x0 + 6;
    if (st.gRun && onBank && gt.d < TAR.gSolid) st.gRun = false;
    if (!st.gRun && onBank && gt.d >= 0.97 && gt.called && cpuFor(st, 'gWait', true, dt) > react(info)) st.gRun = true;
    if (!st.gRun) { st['_for_gWait'] = gt.d >= 0.97 && gt.called ? st['_for_gWait'] : 0; go(S, out, p, wait, 4); if (!info.partnerCpu && !gt.called) say(S, p, 'Blow the horn for me?'); return out; }
    go(S, out, p, far, 6);
    return out;
  }
  // the partner is across, I'm behind
  function behind(S, st, p, o, ps, os, cr, out, dt, info) {
    const v = cr.vine;
    if (cr.kind === 'gerty') return gertyRun(S, st, p, o, cr, out, info, dt);
    if (cr.kind === 'pass') {
      const x = spot(S, cr.k, v.tieN.x - 6);
      go(S, out, p, x, 3);
      const tp = tarTip(v), near = Math.abs(cpuCx(p) - x) < 12;
      // the thrown vine comes over: jump for it as it swings close
      const coming = v.state === 'free' && v.lock !== p.id && tp.x < v.tieN.x + 34 && v.om <= 0.4 && tp.y > p.y - 80;
      if (near && p.grounded && coming) { hold(0.35); out.up = true; }
      else if (!p.grounded) out.up = true;
      if (!info.partnerCpu) say(S, p, v.state === 'rest' ? 'Throw me the vine!' : 'Ready!');
      return out;
    }
    // tied/push: wade in once the partner waits at the far edge to pull
    const oAt = !os.inTar && o.grounded && os.zone === cr.k + 1 && cpuCx(o) - cr.x1 < 80;
    const edge = spot(S, cr.k, cr.x0 - 16);
    if (oAt && cpuFor(st, 'wadeIn', true, dt) > react(info) + 0.2) {
      out.right = true;   // (walk off the edge into the goo)
      return out;
    }
    if (!oAt) st['_for_wadeIn'] = 0;
    go(S, out, p, edge, 4);
    if (!info.partnerCpu && oAt) say(S, p, 'Here I come!');
    return out;
  }
  // I'm across, the partner is behind
  function ahead(S, st, p, o, ps, os, cr, out, dt, info) {
    const v = cr.vine;
    if (cr.kind === 'gerty') {
      const h = S.horns.find(q => q.cross === cr.k && q.side === 'F');
      if (!h) return out;
      if (go(S, out, p, h.x, 3) || Math.abs(cpuCx(p) - h.x) < 14) { if (p.grounded) out.act = true; }
      if (!info.partnerCpu) say(S, p, 'Gerty’s down! Cross!');
      return out;
    }
    if (cr.kind === 'pass') {
      const s = S.stumps.find(q => q.cross === cr.k && q.side === 'F');
      if (!s) return out;
      const at = go(S, out, p, s.x, 3) || Math.abs(cpuCx(p) - s.x) < 14;
      const oReady = !os.inTar && o.grounded && os.zone === cr.k && Math.abs(cpuCx(o) - (v.tieN.x - 6)) < 26;
      const mine = v.state === 'hooked' && v.hk && v.hk.by === p.id;
      if (mine) {
        // fully drawn: let go once the partner stands ready (the vine swings over to them)
        if (!(v.hk.ready && oReady && cpuFor(st, 'letGo', true, dt) > react(info))) out.act = true;
        else st.thrownT = G.time;
        if (v.hk.ready && !oReady && !info.partnerCpu) say(S, p, 'Stand by the edge!');
        return out;
      }
      st['_for_letGo'] = 0;
      const since = G.time - (st.thrownT || -99);
      const period = 2 * Math.PI * Math.sqrt(v.r / TAR.vineG);
      if (at && p.grounded && !os.ride && (v.state === 'rest' || (v.state === 'free' && v.throwT <= 0)) && since > period + 0.8) out.act = true;
      return out;
    }
    // tied/push: wait at the edge; pull() takes over once they're in the goo
    const x = spot(S, cr.k + 1, cr.x1 + 16);
    go(S, out, p, x, 4);
    if (!info.partnerCpu) say(S, p, 'Hop in the tar! I’ll pull!');
    return out;
  }

  cpuBrain('tarpit', {
    reset(st) { for (const k of Object.keys(st)) delete st[k]; },
    think(st, p, o, dt, info) {
      CUR = { st, p };
      const out = this.decide(st, p, o, dt, info);
      // a held jump
      if ((st.jT || 0) > 0) { st.jT -= dt; out.jump = true; if (st.jT <= 0) st.jCool = 0.05; }
      else if ((st.jCool || 0) > 0) { st.jCool -= dt; out.jump = false; }
      // (the way I was walking before any goo: that's the side to climb out on)
      const ps = G.mst && G.mst.pl && G.mst.pl[p.id];
      if (ps && !ps.inTar && !ps.gooey && p.grounded) { if (out.right) st.exitDir = 1; else if (out.left) st.exitDir = -1; }
      return out;
    },
    decide(st, p, o, dt, info) {
      const S = G.mst, out = {};
      if (!S || !S.pl || !S.cross || info.intro || S.phase !== 'play' || G.introT > TAR.introHold || !p.alive) return out;
      const ps = S.pl[p.id], os = S.pl[o.id];
      if (ps.fly) return out;
      if (ps.ride) { st.jT = 0; return ride(S, st, p, o, ps, os, out, dt, info); }
      if (ps.inTar) return wade(S, st, p, o, ps, os, out, dt);
      // a sticky hop or pop out of a puddle: steer onto the bank beside it
      if (ps.gooey && !p.grounded) {
        for (const rg of S.regions) if (rg.shallow && cpuCx(p) > rg.x0 - 14 && cpuCx(p) < rg.x1 + 14) {
          const dir = cpuCx(p) > (rg.x0 + rg.x1) / 2 ? 1 : -1;
          cpuSteer(out, p, dir > 0 ? rg.x1 + 18 : rg.x0 - 18, 2);
          return out;
        }
      }
      // in the air after letting go of a vine: steer onto the landing
      if (st.land != null) {
        if (p.grounded) st.land = null;
        else { cpuSteer(out, p, st.land, 4); return out; }
      }
      if (os.inTar && !os.fly) { const r = pull(S, st, p, o, ps, os, out, dt, info); if (r) return r; }
      if (os.fly) return out;
      const last = S.cross.length;
      if (ps.zone >= last && os.zone >= last) {
        const d = S.exit;
        if (d) { go(S, out, p, d.x + d.w / 2, 5); say(S, p, 'Into the cave!'); }
        return out;
      }
      const cr = S.cross[Math.min(ps.zone, os.zone)];
      if (!cr) return out;
      if (ps.zone === os.zone) return sameBank(S, st, p, o, ps, os, cr, out, dt, info);
      if (ps.zone < os.zone) return behind(S, st, p, o, ps, os, cr, out, dt, info);
      return ahead(S, st, p, o, ps, os, cr, out, dt, info);
    },
  });
})();

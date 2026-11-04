/* Pip & Bo - Computer partner brain for 11-1 Synchro Diving (mode 'dive'). */
'use strict';

/* 11-1 Synchro Diving. Both divers dive every time; the sync judge (who counts double) compares the two, so the
   computer's whole plan is to do the dive the card calls AND to do it together with its partner.
   - Ready: once the card has been up a moment it presses ▲ (ready). Nothing starts until the partner is ready too; with
     a person it waits as long as it takes (a short "Ready when you are!" bubble after a while).
   - Count: on the springboard it bounces on the beat, but with a person it bounces only to keep level with them (it
     presses late in the beat window, after it can see whether the person bounced; a person a bounce ahead is caught up
     on the next beat), so both fly just as high and land together. It takes off on GO; with a person it takes off right
     after it sees them jump, or, if they are late, a little later than they usually are (it learns their lateness from
     earlier dives; at most 0.35 s after GO).
   - Air: fixed calls: with a person it does each move just after the person starts the same move (like following a
     lead), and only goes on its own when waiting longer would leave too little time; with a computer partner both go at
     once, back to back. It tucks (▼) only when the flips would not fit open (or to copy a person who tucks), and lets go
     of ▼ before the water. A Mirror dive it leads: it picks as many moves as its partner can still copy in time (fewer,
     with gaps, for a person), and says "Copy me!". A Mirror dive it follows: it copies each move it sees the lead start,
     after a reaction time, unless that move could not finish before the water (a clean entry beats a copied belly flop).
   - Skill only changes reaction time a little (easy 0.21 s, hard 0.12 s); it plays well at every skill.
   It reads only what a person sees: the call card, the count, both divers' poses and moves, the height (when it will
   reach the water: d.t0 + d.T, which is what the eye judges from the height) and the judges' cards. */
(() => {
  const D = () => MODES.dive.DIVE;
  const lagOf = s => 0.26 - 0.14 * s;
  const dur = (type, tuck) => MODES.dive.moveDur(type, tuck);
  // press a button for one step (the next step lets go, so the next press is a fresh one)
  function tap(out, p, key) { if (!CPU.last[p.id][key]) out[key] = true; }
  // a short bubble for the person, at most one every few seconds
  function say(st, p, text, gap = 4) {
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap) return;
    if (st.saidN && st.saidN[text] >= 2) return;
    st.saidT = G.time; st.saidN = st.saidN || {}; st.saidN[text] = (st.saidN[text] || 0) + 1;
    cpuSay(p, text, 1.8);
  }
  // the moves the computer leads in a Mirror dive: as many as the follower can still copy before the water
  function leadPlan(m, me, info) {
    const cands = [['twist', 'flip', 'flip', 'twist'], ['flip', 'twist', 'flip', 'twist'], ['flip', 'flip', 'twist', 'flip']], T = me.T;
    const person = !info.partnerCpu, lag = person ? 0.36 : lagOf(1) + 0.04, gap = person ? 0.12 : 0.04;
    let best = [];
    // the longest that fits (a twist first when it fits, then a flip first): more moves, up to the max, score more
    for (let n = 1; n <= m.dv.max; n++) for (const cand of cands) {
      const seq = cand.slice(0, n);
      if (best.length >= n) break;
      // lead timeline (flips tucked), then the follower's (open flips for a person, tucked for a computer)
      let lt = 0.15, fEnd = 0;
      for (const ty of seq) {
        const ls = lt, ld = dur(ty, 1);
        lt = ls + ld + gap;
        const fs = Math.max(ls + lag, fEnd), fd = dur(ty, person ? 0 : 1);
        fEnd = fs + fd;
      }
      if (fEnd + 0.16 <= T) best = seq;
    }
    return best.length ? best : ['flip'];
  }

  function ready(st, p, o, m, dt, info) {
    const out = {};
    if (m.ready[p.id]) {
      if (!info.partnerCpu && !m.ready[o.id] && m.waitT > 4) say(st, p, 'Ready when you are!', 6);
      return out;
    }
    if (m.t < D().cardT) return out;
    if (st.readyAt == null) st.readyAt = G.time + 0.25 + (1 - info.skill) * 0.4 + Math.random() * 0.3;
    if (G.time >= st.readyAt) tap(out, p, 'jump');
    return out;
  }

  function board(st, p, o, m, me, pd, info) {
    const out = {}, Dv = D(), now = G.time, B = Dv.beat, go = MODES.dive.go(m);
    if (m.dv.spring) {
      for (let k = 0; k <= 2; k++) {
        const Lk = m.c0 + k * B;
        if (me.bounced[k] || (me.wob && me.wob[k]) || now > Lk + Dv.bounceWin - 0.012) continue;
        if (now < Lk - Dv.bounceWin) break;
        let want, at;
        if (info.partnerCpu) {
          want = true;
          if (st.jit == null || st.jitK !== m.k * 10 + k) { st.jitK = m.k * 10 + k; st.jit = (Math.random() - 0.5) * 0.08 * (1.3 - info.skill); }
          at = Lk + st.jit;
        } else {
          // keep level with the person: bounce when they already did on this beat, or when they are a bounce ahead
          want = pd.bounced[k] || pd.bounce > me.bounce;
          at = Lk + 0.085;
        }
        if (want && now >= at) { tap(out, p, 'jump'); return out; }
        break;
      }
    }
    if (st.toAt == null) {
      // with a person: wait a little longer than they usually take (it jumps right after it sees them jump, below),
      // so a late jumper still gets a takeoff together; never more than 0.35 s after GO
      st.toAt = info.partnerCpu ? go + (Math.random() - 0.5) * 0.06 * (1.3 - info.skill) : go + clamp((st.late == null ? 0.1 : st.late) + 0.12, 0.12, 0.35);
    }
    // a person who jumped first: go right after them
    if (!info.partnerCpu && pd.state === 'air') st.toAt = Math.min(st.toAt, Math.max(now, pd.t0 + 0.03));
    if (now >= Math.max(st.toAt, go - Dv.goWin + 0.01)) tap(out, p, 'jump');
    if (now < go - 0.5 && !st.toldGo && !info.partnerCpu && m.k === 0) { st.toldGo = true; say(st, p, 'Jump on GO!', 3); }
    return out;
  }

  function air(st, p, o, m, me, pd, info) {
    const out = {}, Dv = D(), now = G.time, tE = me.t0 + me.T, left = tE - now, lag = lagOf(info.skill), dv = m.dv;
    const margin = 0.15, mirror = dv.mirror != null, leadMe = dv.mirror === p.id;
    let seq;
    if (!mirror) seq = dv.call;
    else if (leadMe) { if (!st.plan) st.plan = leadPlan(m, me, info); seq = st.plan; }
    else seq = pd.moves.map(x => x.type);
    const i = me.moves.length, c = me.cur;
    // time still needed for the moves left (the one in progress included), open or tucked
    const restOf = tuck => (c ? (1 - c.p) * dur(c.type, tuck) : 0) + seq.slice(i).reduce((s, ty) => s + dur(ty, tuck), 0);
    const needTuck = restOf(0) > left - margin;
    // the next move: when to start it
    let go = false, type = null;
    if (!c && i < seq.length && !st.skip) {
      type = seq[i];
      const ownAt = Math.max(me.t0 + 0.12, me.lastEnd + 0.03);
      if (mirror && !leadMe) {
        const lm = pd.moves[i];
        if (now >= lm.s + lag) {
          if (left - dur(type, 1) - 0.1 < 0) st.skip = true; else go = true;
        }
      } else if (info.partnerCpu || leadMe) {
        go = now >= ownAt + (leadMe && !info.partnerCpu && i > 0 ? 0.12 : 0);
      } else {
        // a person partner: follow them when they start the same move; otherwise wait a little, never too long
        const pm = pd.moves[i], spare = left - restOf(1) - margin;
        if (pm && pm.type === type) go = now >= Math.min(pm.s + lag, ownAt + Math.max(0, spare));
        else go = now >= ownAt + clamp(spare - 0.1, 0, 0.3);
        if (left - restOf(1) - margin < 0.02) go = true;
      }
      if (left - dur(type, 1) - 0.06 < 0) { go = false; st.skip = true; }
    }
    // tuck: for flips that would not fit open, or to match a person who tucks
    const flipNow = (c && c.type === 'flip') || (go && type === 'flip') || (!c && seq[i] === 'flip' && i < seq.length && !st.skip);
    const copyTuck = !info.partnerCpu && pd.state === 'air' && pd.tuck > 0.5 && pd.cur && pd.cur.type === 'flip';
    out.down = flipNow && (needTuck || copyTuck || (leadMe && mirror)) && left > 0.12;
    if (go) {
      if (type === 'flip') tap(out, p, 'jump');
      else if (p.id === 0) tap(out, p, 'left'); else tap(out, p, 'right');
    }
    if (leadMe && !info.partnerCpu && !st.toldLead) { st.toldLead = true; say(st, p, 'Copy me!', 1); }
    return out;
  }

  // after a dive: learn how late the person takes off, and a word about what went wrong (1-player mode only)
  function judged(st, p, o, m, info) {
    if (st.judgedK === m.k || !m.cards) return;
    st.judgedK = m.k;
    if (info.partnerCpu) return;
    const pd = m.d[o.id], go = MODES.dive.go(m);
    if (pd.t0 != null && !pd.slip) st.late = st.late == null ? clamp(pd.t0 - go, 0, 0.3) : 0.6 * st.late + 0.4 * clamp(pd.t0 - go, 0, 0.3);
    const k = m.cards.kinds[o.id];
    if (pd.slip) say(st, p, 'Jump on GO!', 1);
    else if (k === 'flop') say(st, p, 'Finish spinning before the water!', 1);
    else if (k === 'cannon') say(st, p, 'Let go of ' + MODES.dive.key(o.id, 'down') + ' before the water!', 1);
    else if (m.cards.S >= 8.5) say(st, p, 'We were in sync!', 1);
    else if (pd.moves.length === 0 && (m.dv.mirror === o.id || (m.dv.call && m.dv.call.length))) say(st, p, 'Flip with ' + MODES.dive.key(o.id, 'jump') + ' in the air!', 1);
    else if (m.dv.mirror === o.id) say(st, p, 'Nice moves!', 1);
  }

  cpuBrain('dive', {
    reset(st) { st.late = null; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.d || !m.dv || info.intro) return {};
      if (st.k !== m.k) { st.k = m.k; st.readyAt = null; st.toAt = null; st.plan = null; st.skip = false; st.toldLead = false; st.jit = null; }
      const me = m.d[p.id], pd = m.d[o.id];
      if (m.phase === 'ready') return ready(st, p, o, m, dt, info);
      if (m.phase === 'count') {
        if (me.state === 'board') return board(st, p, o, m, me, pd, info);
        if (me.state === 'air') return air(st, p, o, m, me, pd, info);
        return {};
      }
      if (m.phase === 'judge') judged(st, p, o, m, info);
      if (m.phase === 'ready' || m.phase === 'climb') return {};
      return {};
    },
  });
})();

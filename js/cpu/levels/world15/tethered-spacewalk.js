/* Pip & Bo - Computer partner brain for 15-1 Tethered Spacewalk (mode 'spacewalk'). */
'use strict';

/* 15-1 Tethered Spacewalk. Pip and Bo are tied together in zero gravity; whoever holds a handhold (holding the action)
   is the anchor and spins the floater round to the next handhold, then they swap. The brain follows the mode's own plan
   (MODES.spacewalk.plan: the same next handhold or panel the gold guide ring shows) and plays whichever job it has
   right now, so it never cares who started it:
   - Anchor (holding on, partner floating): keeps holding the action, reels the tether to the target's distance and spins
     the floater the short way round (the long way when a rock, the satellite core or the hull is in the way), easing
     off as it gets there so the floater stops on the target. On a panel it holds the floater there while it bolts.
   - Floater: holds the action as it reaches the target handhold (or a panel: it keeps holding until the panel is
     fixed), and uses its small suit puff to finish the last bit or brake. With a person anchor who doesn't spin, it
     puffs the whole way, slowly, and asks "Spin me round!".
   - Both holding: the one further back lets go (as the plan says). With a person who should let go, it waits and says
     "Let go! I've got it!". A person who grabs the wrong thing just changes the plan.
   - Both drifting: grabs a handhold in reach; otherwise waits for Bleep the tow robot.
   It never fixes a panel or moves on without the person holding on at some point (the mode needs an anchored partner
   for every bolt), so it can't clear the level alone. Skill only changes how quickly it reacts. It reads what is on the
   screen: the handholds, panels, rocks and the tether. */
(() => {
  const K = () => SPACEWALK;
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 8))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  // would the floater bump into something going round the anchor at radius r from angle a0 by `span` (signed)?
  function arcBlocked(m, ax, ay, r, a0, span) {
    const R = K().bodyR + 6, n = Math.max(2, Math.ceil(Math.abs(span) / 0.12));
    for (let i = 1; i <= n; i++) {
      const a = a0 + span * i / n, x = ax + Math.cos(a) * r, y = ay + Math.sin(a) * r;
      for (const k of m.rocks) if (k.solid && Math.hypot(x - k.cx, y - k.cy) < k.r + R) return true;
      for (const s of m.sats) if (Math.hypot(x - s.x, y - s.y) < s.r + R) return true;
      for (const h of m.hull) if (x > h.x - R && x < h.x + h.w + R && y > h.y - R && y < h.y + h.h + R) return true;
    }
    return false;
  }

  /* ---------- the anchor: spin and reel the floater onto the target ---------- */
  function anchor(st, p, o, m, plan, dt, info) {
    const S = K(), me = m.pl[p.id], f = m.pl[o.id], out = { act: true };
    const tg = plan.target;
    if (!tg) {
      // nowhere to go from here (a rock drifted off): let go after a while and let Bleep tow us back
      if (plan.noPath && m.noPathT > 5 && (info.partnerCpu || m.noPathT > 9)) out.act = false;
      return out;
    }
    const dx = f.x - me.x, dy = f.y - me.y, d = Math.hypot(dx, dy) || 0.001;
    const tx = tg.x - me.x, ty = tg.y - me.y, rT = Math.hypot(tx, ty);
    const Lm = MODES.spacewalk.Lmax(m);
    // the tether length we want: the target's distance (pulled right in for the airlock)
    const Lw = clamp(tg.kind === 'lock' ? S.Lmin : rT, S.Lmin, Lm);
    if (m.L > Lw + 3) out.jump = true; else if (m.L < Lw - 3) out.down = true;
    // the angle to go
    const th = Math.atan2(dy, dx), thT = Math.atan2(ty, tx), e = wrap(thT - th);
    const vt = (f.vx * -dy + f.vy * dx) / d, w = vt / d;   // the floater's turn rate (+ = the ▶ way)
    if (d < 22) return out;
    // the short way, unless something is in the way and the long way is clear (decided once per target)
    const key = tg.kind + ':' + (tg.hold ? tg.hold.id : tg.panel ? tg.panel.id : 'lk');
    if (st.dirKey !== key || Math.abs(e) < 0.05) {
      const r = Math.max(d, Lw), sh = e, lg = e > 0 ? e - Math.PI * 2 : e + Math.PI * 2;
      st.dir = Math.abs(e) < 0.05 ? 0 : arcBlocked(m, me.x, me.y, r, th, sh) && !arcBlocked(m, me.x, me.y, r, th, lg) ? Math.sign(lg) : Math.sign(sh);
      st.dirKey = key;
    }
    let left = st.dir > 0 ? (e >= 0 ? e : e + Math.PI * 2) : st.dir < 0 ? (e <= 0 ? -e : Math.PI * 2 - e) : 0;
    if (left > Math.PI * 1.9) left = 0;
    const r = Math.max(d, 30), k = clamp((d / m.L - 0.25) / 0.5, 0.35, 1), alpha = S.spinA * k / r, wMax = (st.fast ? 280 : 250) / r;
    let wDes = st.dir * Math.min(wMax, Math.sqrt(2 * alpha * 0.7 * left));
    if (left < 0.05) wDes = 0;
    // too close in to swing out: keep it turning gently, so it flies out to the tether's length
    if (d < Lw - 16 && Math.abs(e) < 0.4 && tg.kind !== 'lock') wDes = (st.dir || 1) * Math.max(Math.abs(wDes), 0.9);
    const tol = 0.06 + (1 - info.skill) * 0.05;
    if (w < wDes - tol) out.right = true; else if (w > wDes + tol) out.left = true;
    // a person floater near the target who doesn't grab: say so (now and then)
    if (!info.partnerCpu) {
      const near = Math.hypot(tg.x - f.x, tg.y - f.y);
      st.nearT = near < MODES.spacewalk.grabR(m) * 1.4 && !f.want ? (st.nearT || 0) + dt : 0;
      if (st.nearT > 1.2) say(st, p, tg.kind === 'panel' ? 'Hold grab to fix it!' : 'Grab the handle!');
    }
    return out;
  }

  /* ---------- the floater: grab the target, bolt a panel, puff a little ---------- */
  function floater(st, p, o, m, plan, dt, info) {
    const S = K(), me = m.pl[p.id], a = m.pl[o.id], out = {};
    const tg = plan.target, gR = MODES.spacewalk.grabR(m), fR = MODES.spacewalk.fixR(m);
    if (!tg) return out;
    const dist = Math.hypot(tg.x - me.x, tg.y - me.y), sp = Math.hypot(me.vx, me.vy);
    // a moment late on easy
    const close = cpuLag(st, 'close', dist, 0.02 + (1 - info.skill) * 0.06);
    if (tg.kind === 'hold' && close < gR * 0.85) out.act = true;
    // any handhold in reach that is nearer the goal than the anchor's is a fine grab too
    if (!out.act && a.hold != null) {
      const da = plan.dist[a.hold];
      for (const h of m.holds) if (plan.dist[h.i] < da && !m.pl.some(q => q.hold === h.i) && Math.hypot(h.x - me.x, h.y - me.y) < gR * 0.7) out.act = true;
    }
    if (tg.kind === 'panel' && dist < fR * 0.85) out.act = true;
    // the suit puff: the last bit to the target, a brake on a panel, or all the way when the anchor doesn't spin
    if (a.spin || st.spinSeen == null) st.spinSeen = G.time;
    const anchorSpins = info.partnerCpu || G.time - st.spinSeen < 2.5;
    let push = null;
    if (tg.kind === 'panel' && dist < fR) push = { x: (tg.x - me.x) * 3 - me.vx, y: (tg.y - me.y) * 3 - me.vy };
    else if (tg.kind === 'lock' || dist < 60 || !anchorSpins) {
      const vWant = Math.min(tg.kind === 'lock' ? 90 : 110, dist * 2.2), ux = (tg.x - me.x) / (dist || 1), uy = (tg.y - me.y) / (dist || 1);
      push = { x: ux * vWant - me.vx, y: uy * vWant - me.vy };
      if (!anchorSpins && dist > 60 && !info.partnerCpu) say(st, p, 'Spin me round! ◀ ▶', 8);
    }
    if (push && Math.hypot(push.x, push.y) > 30 && me.fuel > (dist < 60 ? 0.05 : 0.35)) {
      const n = Math.hypot(push.x, push.y), px = push.x / n, py = push.y / n;
      out.right = px > 0.38; out.left = px < -0.38; out.down = py > 0.38; out.jump = py < -0.38;
    }
    return out;
  }

  cpuBrain('spacewalk', {
    reset(st) { st.dir = 0; st.dirKey = null; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.pl || info.intro || m.tow || m.fin) return {};
      const plan = MODES.spacewalk.plan(m), me = m.pl[p.id], him = m.pl[o.id];
      // both holding: the one further back lets go
      if (me.hold != null && him.hold != null) {
        if (plan.releaser === p.id) {
          st.relT = (st.relT || 0) + dt;
          if (st.relT > 0.08 + (1 - info.skill) * 0.25) return {};
          return { act: true };
        }
        st.relT = 0;
        if (!info.partnerCpu && G.time - Math.max(me.since, him.since) > 2.5) say(st, p, 'Let go! I\'ve got it!');
        return { act: true };
      }
      st.relT = 0;
      if (me.hold != null) return anchor(st, p, o, m, plan, dt, info);
      if (him.hold != null) return floater(st, p, o, m, plan, dt, info);
      // both drifting: grab a handhold in reach (the plan's best one)
      const tg = plan.target, gR = MODES.spacewalk.grabR(m);
      if (tg && Math.hypot(tg.x - me.x, tg.y - me.y) < gR * 0.9) return { act: true };
      for (const h of m.holds) if (Math.hypot(h.x - me.x, h.y - me.y) < gR * 0.8 && !m.pl.some(q => q.hold === h.i)) return { act: true };
      return {};
    },
  });
})();

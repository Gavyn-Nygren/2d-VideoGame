/* Pip & Bo - Computer partner brain for 13-1 Pumpkin Patch Roll (mode 'pumpkin'). */
'use strict';

/* 13-1 Pumpkin Patch Roll. One pushes the giant pumpkin, one rides on top; the room def says who pushes (m.pusher) and
   the jobs swap every room, so the brain plays the job it has this room. It reads what the prompts and panels show
   (MODES.pumpkin.needs: the hill under the pumpkin, the next steep down into water or mud, rocks, gusts) and the
   balance bar, and presses keys like a person.
   - Pusher: walks up behind the pumpkin and walks into it (push), and hops rocks at its feet. On the crest before a
     steep down into a pond or a ditch it leapfrogs (jump while touching) to the front and holds it back (walks into it
     from in front) all the way down and over the bridge, then leapfrogs back behind it for the next climb.
   - Rider: picks a spot on the balance bar (LEAN on climbs, BRAKE on the steep downs and when a dry hill gets fast, a
     little forward to tip it over a crest, the top otherwise) and steps toward it, looking a moment ahead at how the
     roll, the slide off the top and any gust will move it (what the bar on screen shows). It hugs (▼) briefly over
     rocks while its arms are fresh, and stands into a gust it sees coming.
   Waiting for a slow person: it never does the person's job. As the pusher it keeps holding the pumpkin on a climb
   until the person leans, and as the rider it rolls the pumpkin on from a crest only once the person is in front.
   With a person it says what it needs in a short bubble ("Lean forward!", "Leapfrog in front!"), not too often.
   Skill only changes reaction time a little (easy is a bit later to switch its lean). It reads only what is on
   screen: the course, the pumpkin, the balance bar and the sticky boots it has. */
(() => {
  const P = () => PUMPKIN;
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 8))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }

  /* ---------- the pusher ---------- */
  function pusher(st, p, o, m, nd, dt, info) {
    const Pc = P(), pk = m.pk, pu = m.pu, out = {};
    if (pu.frog) return out;
    // a rock right at my feet the way I'm walking: hop it (and keep walking while in the air)
    const wdir = nd.pusher === 'push' || nd.pusher === 'front' ? (pu.side < 0 ? 1 : 0) : nd.pusher === 'behind' ? -1 : 0;
    if (pu.air) { out.right = wdir > 0; out.left = wdir < 0; return out; }
    if (wdir && MODES.pumpkin.rockAhead(m, pu.x, wdir, 10 + (1 - info.skill) * 6)) { out.jump = 'tap'; out.right = wdir > 0; out.left = wdir < 0; return out; }
    const gapB = pu.x - (pk.x - Pc.D), gapF = (pk.x + Pc.D) - pu.x;   // >0: how far the pusher is from touching
    let want = nd.pusher;
    // a person rider who isn't leaning on a climb: keep holding the pumpkin there, and say so
    if (want === 'push') {
      if (pu.side < 0) out.right = true;
      if (!info.partnerCpu && nd.onUp && pk.v < 8 && m.rd.phi < Pc.leanFull) say(st, p, 'Lean forward! Push with me!');
      return out;
    }
    if (want === 'front') {
      // walk up to it, then leapfrog the moment we touch
      const touching = Math.abs(pu.x - (pk.x - Pc.D)) <= Pc.frogReach - 8 && !pu.air;
      if (touching) { st.frogAsk = (st.frogAsk || 0) + dt; if (st.frogAsk > 0.05 + (1 - info.skill) * 0.15) { out.jump = 'tap'; st.frogAsk = 0; } }
      else out.right = gapB < -2;
      return out;
    }
    if (want === 'hold') {
      out.left = true;   // walk into it from the front (no force unless it rolls faster than a slow walk)
      if (!info.partnerCpu && nd.onDown && pk.v > Pc.vBack + 30 && m.rd.phi > -Pc.leanFull * 0.5) say(st, p, 'Lean back! Brake!');
      return out;
    }
    if (want === 'behind') {
      const touching = Math.abs(pu.x - (pk.x + Pc.D)) <= Pc.touch - 2 && !pu.air;
      if (touching && Math.abs(pk.v) < 60) out.jump = 'tap';
      else if (!touching) out.left = gapF < -2;
      void gapF;
      return out;
    }
    return out;
  }

  /* ---------- the rider ---------- */
  function rider(st, p, o, m, nd, dt, info) {
    const Pc = P(), pk = m.pk, rd = m.rd, out = {};
    const boots = MODES.pumpkin.boots(m), lim = boots.lim, red = lim * Pc.red, sticky = boots.carry;
    // what to do, seen a moment late on easy
    const need = cpuLag(st, 'need', nd.rider, 0.05 + (1 - info.skill) * 0.18);
    // where to stand on the balance bar: LEAN, BRAKE, a little forward to tip it over a crest, or the top
    let T = need === 'fwd' ? 0.5 : need === 'back' ? -0.5 : need === 'nudge' ? 0.22 : 0;
    // a gust is coming: stand a little into it
    const g = nd.gust;
    if (g && g.state === 'warn' && g.t > 0.8) T -= g.dir * 0.22;
    // how the bar is moving if I stand still (the roll carries me, off the top I slide, a gust blows)
    const off = Math.abs(rd.phi), omega = pk.v / Pc.R;
    let drift = Pc.carry * omega * sticky;
    if (off > Pc.flat) drift += Math.sign(rd.phi) * (Pc.tip * (off - Pc.flat) + (off > red ? Pc.redTip * (off - red) : 0)) * boots.tip;
    if (g && g.state === 'blow') drift += g.dir * Pc.gustPush * (g.str || 1) * sticky;
    const pred = rd.phi + drift * (0.28 + (1 - info.skill) * 0.12);
    // hug over a rock, briefly, while the arms are fresh and I'm near the top
    const hug = need === 'hug' && !rd.tired && rd.hugT < Pc.hugMax - 0.35 && off < 0.4;
    let dir = 0;
    if (!hug) { if (pred < T - 0.07) dir = 1; else if (pred > T + 0.07) dir = -1; }
    out.left = dir < 0; out.right = dir > 0; out.down = hug;
    // a person pusher: say what the pumpkin needs from them
    if (!info.partnerCpu) {
      const pu = m.pu;
      if (nd.pusher === 'front' && !pu.frog) say(st, p, 'Leapfrog in front of me!');
      else if (nd.pusher === 'hold' && nd.onDown && pk.v > Pc.vBack + 30 && pu.act >= 0) say(st, p, 'Hold it back! Too fast!');
      else if (nd.pusher === 'behind' && Math.abs(pk.v) < 20 && nd.downD > 300) say(st, p, 'Hop back behind and push!');
      else if (nd.pusher === 'push' && nd.onUp && pu.act <= 0 && pk.v < 10) say(st, p, 'Push! I\'ll lean!');
      else if (nd.rider === 'nudge' && pu.side > 0 && pk.v < 10) say(st, p, 'Ready? Here we go!');
    }
    return out;
  }

  cpuBrain('pumpkin', {
    reset(st) { st.frogAsk = 0; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.pk || info.intro || m.pk.state !== 'roll' || m.pk.lock > 0) return {};
      const nd = MODES.pumpkin.needs(m);
      return p.id === m.pusher ? pusher(st, p, o, m, nd, dt, info) : rider(st, p, o, m, nd, dt, info);
    },
  });
})();

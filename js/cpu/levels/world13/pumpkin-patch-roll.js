/* Pip & Bo - Computer partner brain for 13-1 Pumpkin Patch Roll (mode 'pumpkin'). */
'use strict';

/* 13-1 Pumpkin Patch Roll. One pushes the giant pumpkin, one rides on top; the room def says who pushes (m.pusher) and
   the jobs swap every room, so the brain plays the job it has this room. It reads what the prompts and panels show
   (MODES.pumpkin.needs: the hill under the pumpkin, the next steep down into water or mud, rocks, gusts) and the
   balance bar, and presses keys like a person.
   - Pusher: walks up behind the pumpkin and walks into it (push). Just after a climb, when a steep down into a pond or
     a ditch is next, it leapfrogs (jump while touching) to the front and holds it back (walks into it from in front)
     all the way down and over the bridge, then leapfrogs back behind it for the next climb.
   - Rider: leans forward (▶) on steep climbs, back (◀) on the steep downs and over the bridges, hugs (▼) over rocks,
     leans into gusts, and otherwise steps against the roll to stay near the top. It always steps back toward the top
     when it gets near the red end of the bar.
   Waiting for a slow person: it never does the person's job. As the pusher it keeps holding the pumpkin on a climb
   until the person leans, and as the rider it rolls the pumpkin on from a crest only once the person is in front.
   With a person it says what it needs in a short bubble ("Lean forward!", "Leapfrog in front!"), not too often.
   Skill only changes reaction time a little (easy is a bit later to switch its lean). It reads only what is on
   screen: the course, the pumpkin and the balance bar. */
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
      const touching = Math.abs(pu.x - (pk.x - Pc.D)) <= Pc.touch - 2 && !pu.air;
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
    const lim = m.sticky ? Pc.stickyMax : Pc.phiMax;
    // what to do, seen a moment late on easy
    let need = cpuLag(st, 'need', nd.rider, 0.05 + (1 - info.skill) * 0.18);
    let dir = 0, hug = false;
    if (need === 'fwd') dir = 1;          // (holding ▶ walks to the forward lean and stays there)
    else if (need === 'back') dir = -1;
    else if (need === 'hug') hug = true;
    else {
      // stay near the top: step against the roll (with a little dead zone, like a person)
      const lead = rd.phi + Pc.carry * (pk.v / Pc.R) * 0.25;
      if (lead > 0.1) dir = -1; else if (lead < -0.1) dir = 1;
    }
    // a gust: lean into it (hold against it until it has blown past)
    if (nd.gust && (nd.gust.state === 'blow' || nd.gust.state === 'warn' && nd.gust.t > 0.9)) {
      const g = nd.gust.dir;
      if (need !== 'fwd' && need !== 'back') { dir = g > 0 ? (rd.phi > -0.3 ? -1 : 0) : (rd.phi < 0.3 ? 1 : 0); hug = false; }
      else if (Math.sign(dir || 0) === g) dir = 0;   // the gust does that lean for us
    }
    // never near the red: step back toward the top
    if (rd.phi > lim * 0.66) { dir = -1; hug = false; }
    if (rd.phi < -lim * 0.66) { dir = 1; hug = false; }
    out.left = dir < 0; out.right = dir > 0; out.down = hug;
    // a person pusher: say what the pumpkin needs from them
    if (!info.partnerCpu) {
      const pu = m.pu;
      if (nd.pusher === 'front' && nd.downD < 160 && !pu.frog) say(st, p, 'Leapfrog in front of me!');
      else if (nd.pusher === 'hold' && nd.onDown && pk.v > Pc.vBack + 30 && pu.act >= 0) say(st, p, 'Hold it back! Too fast!');
      else if (nd.pusher === 'behind' && Math.abs(pk.v) < 20 && nd.downD > 300) say(st, p, 'Hop back behind and push!');
      else if (nd.pusher === 'push' && nd.onUp && pu.act <= 0 && pk.v < 10) say(st, p, 'Push! I\'ll lean!');
      else if (need === 'center' && nd.rider === 'fwd' && pu.side > 0 && pk.v < 10) say(st, p, 'Ready? Here we go!');
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

/* Pip & Bo - Computer partner: san francisco quake. */
'use strict';

/* 9-2 San Francisco 1906 Quake. Each player has their own street, and the crossings go left to right
   (quakeActive: the next bridge, its crosser X on that street and its holder H on the other one), so the job is
   never a choice:
   - holder: walk to the crank, hold the action, and balance the ball with ◀ ▶ (a PD controller on what the gauge
     shows, with a push against the crosser's and the crates' weight, feathered like a person tapping a key).
     Crates on the plank are tipped off first (to the far end) while nobody is on it. On a cable car it pulls (▶)
     while the crosser is aboard.
   - crosser: wait at the near end until the plank is held up and level and, with a person holding, the rumble is
     calm long enough to get across (the HUD seismograph shows the waves); then tiptoe across without stopping,
     pushing any crates along. A cable car: hop in, stand in the middle, hop out at the far end once it docks.
   - all across: the upper player drops down the gap at the end and both stand in the door.
   Skill sets reaction time and how finely it feathers the keys (a little less steady on Easy, never a bad partner).
   Reads only what is on screen: the gauge, the plank, the crates, the cable car and the seismograph. */
(() => {
  const near = (a, b, d) => Math.abs(a - b) <= d;
  // a short bubble for the person: at most one every 6 s, the same words again only after twice as long each time
  // (st.said is cleared at every new crossing), and nothing while the person is away from the keys
  function say(st, p, info, text) {
    if (info.partnerCpu || info.partnerIdle > 20 || G.time - (st.saidT == null ? -99 : st.saidT) < 6) return;
    const S = st.said || (st.said = {}), k = S[text] || { n: 0, t: -99 };
    if (G.time - k.t < Math.min(30, 6 * Math.pow(2, k.n))) return;
    S[text] = { n: k.n + 1, t: G.time }; st.saidT = G.time; cpuSay(p, text, 2);
  }
  // walk along my street to x, never onto a crack that isn't bridged (unless crossing it is my job)
  function walk(st, p, m, x, crossing, dead = 3) {
    const out = {}, ln = quakeLaneOf(p), cx = cpuCx(p);
    for (const br of m.bridges) {
      if (br.lane !== ln || br.done || br === crossing) continue;
      if (br.kind === 'car' && st.aboard === br) continue;
      if (cx <= br.x0 && x > br.x0 - 14) x = br.x0 - 14;
      if (cx >= br.x1 && x < br.x1 + 14) x = br.x1 + 14;
    }
    cpuSeek(out, p, x, dead);
    return out;
  }
  // the rumble as the HUD shows it: calm enough to start a crossing of `secs` seconds? (the calm between waves
  // lasts at least cfg.calm[0] and a warning comes before the next one, a rhythm a player soon learns)
  function calm(m, info, secs = 0) {
    const w = m.wave;
    if (w.phase === 'wait') return true;
    return w.phase === 'calm' && w.t < m.cfg.calm[0] + QUAKE.warnT - secs - 0.3 - (1 - info.skill) * 0.8;
  }

  /* ---------- holding ---------- */
  function hold(st, p, o, m, br, dt, info) {
    const cr = br.crank, P = m.pl[p.id];
    if (quakeLaneOf(p) !== cr.lane) return {};
    const at = p.grounded && !P.on && near(cpuCx(p), cr.x, 10) && near(cpuFeet(p), cr.y, 3);
    if (!at && P.grip !== br) { st.feather = null; return walk(st, p, m, cr.x, null, 2); }
    const out = { act: true };
    if (P.grip !== br) {
      // grab it: a fresh press while standing on the crank
      if (CPU.last[p.id].act && cpuFor(st, 'noGrip', true, dt) > 0.2) { out.act = false; st._for_noGrip = 0; }
      return out;
    }
    cpuFor(st, 'noGrip', false, dt);
    if (br.kind === 'car') {
      // pull while the crosser is aboard; otherwise let it roll back down to them
      const aboard = m.pl[o.id].on === br;
      out.right = aboard && !br.parked;
      if (!aboard && br.s < 0.05 && cpuFor(st, 'askCar', true, dt) > 4) say(st, p, info, 'Hop in the car!');
      return out;
    }
    if (br.up < 1) return out;
    // balance: what the gauge shows, a moment late (reaction time)
    const lag = 0.22 - info.skill * 0.16;
    const b = cpuLag(st, 'b', br.b, lag), v = cpuLag(st, 'v', br.v, lag);
    const rider = quakeRiding(m, o, br);
    const crates = br.crates.filter(c => !c.gone);
    // tip the crates off the far end while nobody is on and the crosser waits anyway (a rumble, or not there yet);
    // in a calm it keeps the plank level so the crosser can go (they push the crates along)
    const ox = cpuCx(o), there = quakeLaneOf(o) === br.lane && ox > br.x0 - 40 && ox < br.x0 + 4;
    const tipping = crates.length && !rider && !m.pl[o.id].on && (!there || !calm(m, info, 3));
    const goal = tipping ? 1 : 0;
    let load = 0;
    if (rider) load += clamp((cpuCx(o) - br.cx) / br.hw, -1, 1) * QUAKE.Kload;
    for (const c of crates) load += clamp(c.u / br.hw, -1, 1) * QUAKE.Kcrate;
    if (br.gold) load *= QUAKE.goldLoad;
    const u = -(3.2 * (b - goal) + 1.3 * v) - load / QUAKE.Kin;
    // feathered: hold the key for part of each short beat
    const beat = 0.12 - info.skill * 0.07;
    const F = st.feather || (st.feather = { t: 0, on: 0, dir: 0 });
    F.t -= dt;
    if (F.t <= 0) { F.t = beat; F.dir = Math.abs(u) < 0.08 ? 0 : Math.sign(u); F.on = Math.min(1, Math.abs(u)) * beat; }
    if (F.dir && F.on > 0) { F.on -= dt; out.right = F.dir > 0; out.left = F.dir < 0; }
    // the crosser (a person) waits at the near end: tell them when it's a good time
    if (!rider && !crates.length && Math.abs(b) < 0.3 && calm(m, info, 3)) {
      const ox = cpuCx(o), waiting = quakeLaneOf(o) === br.lane && ox < br.x0 + 4 && ox > br.x0 - 5 * T;
      if (cpuFor(st, 'askGo', waiting && info.partnerIdle > 1.5, dt) > 2) say(st, p, info, 'Walk across!');
    }
    return out;
  }

  /* ---------- crossing ---------- */
  function cross(st, p, o, m, br, dt, info) {
    const P = m.pl[p.id], cx = cpuCx(p);
    if (quakeLaneOf(p) !== br.lane) return {};
    if (br.kind === 'car') {
      if (P.on === br) st.aboard = br;
      else if (p.grounded) st.aboard = null;
      if (st.aboard === br) {
        // in the car: stand in the middle; out at the far end once it docks
        if (br.parked) return walk(st, p, m, br.x1 + 30, br, 4);
        if (br.held < 0 && cpuFor(st, 'askPull', true, dt) > 3) say(st, p, info, 'Pull me across!');
        return walk(st, p, m, br.carX + QUAKE.carW / 2, br, 4);
      }
      // hop in while it waits at my side
      if (br.s < 0.05) return walk(st, p, m, br.carX + QUAKE.carW / 2, br, 4);
      return walk(st, p, m, br.x0 - 20, null, 4);
    }
    // on the plank (or already started): keep tiptoeing across
    if (P.on === br || (cx > br.x0 - 4 && cx < br.x1 + 14 && st.going)) {
      st.going = true;
      const out = walk(st, p, m, br.x1 + 26, br, 2);
      out.left = false; out.right = true;
      return out;
    }
    st.going = false;
    // (how long the holder has kept the ball in the green, as the gauge shows)
    const steady = cpuFor(st, 'steady', br.up >= 1 && br.held >= 0 && Math.abs(br.b) < QUAKE.green, dt);
    const wait = br.x0 - 20;
    if (!near(cx, wait, 6)) return walk(st, p, m, wait, null, 3);
    const out = walk(st, p, m, wait, null, 3);
    const held = br.up >= 1 && br.held >= 0;
    const secs = (br.x1 + 26 - cx) / (PHYS.maxRun * QUAKE.tiptoe) + 0.3;
    // start in a calm long enough to get across (crates get pushed along), or any time once the holder has kept the
    // ball in the green for a while (rumble or not) and nobody slipped on this bridge yet
    const ok = held && Math.abs(br.b) < 0.3 && !P.whoa && (calm(m, info, secs) || (steady > 3.5 - info.skill && !br.whoas));
    if (cpuFor(st, 'ready', ok, dt) > 0.15 + (1 - info.skill) * 0.4) { st.going = true; out.right = true; out.left = false; }
    if (!held && cpuFor(st, 'askHold', true, dt) > 4) say(st, p, info, 'Hold the crank!');
    return out;
  }

  cpuBrain('quake', {
    think(st, p, o, dt, info) {
      const m = info.mst, out = {};
      if (!m || !m.bridges || !p.alive || info.intro) return out;
      const A = quakeActive(m);
      if (st.sayFor !== (A && A.br)) { st.sayFor = A && A.br; st.said = null; }   // (a new crossing: fresh bubbles)
      const P = m.pl[p.id];
      if (P.whoa) { st.going = false; return out; }
      if (!A) {
        // all across: the upper player drops down the gap at the end, then both stand in the door
        const d = G.level.door;
        if (!d) return out;
        if (quakeLaneOf(p) === 0) return m.gateOpen ? walk(st, p, m, (m.gate[0] ? m.gate[0].c * T : W - 60) + 30, null, 4) : out;
        // side by side in the door: the half on my side of the partner (players can't pass each other, so neither
        // walks into the other); still stuck against them outside the door: hop over
        const c = d.x + d.w / 2, dx = cpuCx(p) - cpuCx(o);
        const side = Math.abs(dx) < 1 ? (m.lanePl[0] === p.id ? 1 : -1) : Math.sign(dx);
        const out = walk(st, p, m, c + side * 13, null, 3);
        const inDoor = Math.abs(cpuCx(p) - c) < d.w / 2 - 4;
        if (!inDoor && cpuFor(st, 'blocked', p.grounded && Math.abs(p.x - (st.lastX == null ? -99 : st.lastX)) < 0.2 && (out.left || out.right), dt) > 0.8) { st._for_blocked = 0; out.jump = true; }
        st.lastX = p.x;
        return out;
      }
      if (A.H === p.id && A.br.crank) return hold(st, p, o, m, A.br, dt, info);
      if (A.X === p.id) return cross(st, p, o, m, A.br, dt, info);
      return out;
    },
  });
})();

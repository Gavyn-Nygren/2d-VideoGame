/* Pip & Bo - Computer partner: king of the hill. */
'use strict';

(() => {
  /* King of the Hill is head-to-head: the computer plays against you. It sees you a moment late (longer on easy).
     - Getting up: cpuNav walks and hops up the steps (it hops over the spring pads in the Springs round).
     - On top alone: it stands a little toward your side of the summit, faces you and waits for you to come up.
     - Both on top, or you on top: it walks at you and punches. Right next to you it jabs; from a little farther it winds
       up a charged punch and lets go when you are in reach (the glove lunges forward for big ones). Against a glove
       that is puffed up (charging) or golden, it either hops over it or winds up its own (wind-ups shrug jabs off).
     - Golden Glove round: when the glove appears nearer to it than to you, it fetches it, then jabs (a gold jab is a
       MEGA).
     Skill: easy reacts late, stops now and then, lets go of a charge when it "feels" ready (often too early or too far:
     a wobbly miss) and rarely dodges. Normal and hard also wait out the moment after a hit when jabs bounce off, and
     punish your wobbly misses; hard reacts quickly, times its big punches, hops over yours and comes down on your
     head. It reads the glove states you can see (puffed up, wobbling, gold) and, from normal up, the short safe moment
     after a hit (a person learns that rhythm), all seen with the same small delay. */
  // a number for each skill: easy, normal, hard (in between for other skills)
  const by = (s, e, n, h) => (s <= 0.7 ? e + (n - e) * clamp((s - 0.35) / 0.35, 0, 1) : n + (h - n) * clamp((s - 0.7) / 0.3, 0, 1));
  const SK = s => ({
    lag: by(s, 0.36, 0.2, 0.15),  // how late it sees you (s): hard is about as quick as a sharp person, never quicker
    dawdle: by(s, 0.6, 0.18, 0),   // a short stop this often per second (none on hard)
    jab: by(s, 2.5, 8, 14),        // how eagerly it punches when you're in reach (per second)
    wind: 0.1 + 0.45 * s,          // ...and how often that is a wind-up instead of a jab (wind-ups shrug jabs off)
    charge: by(s, 1.44, 2.28, 3.6),// how eagerly it winds up when you're a little way off (per second)
    blind: 0.85 - 0.75 * s,        // chance a wind-up is let go on feel instead of when you're in reach
    dodge: 0.1 + 0.75 * s,         // chance it hops over a big charged punch coming its way
    gold: 0.35 + 0.65 * s,         // chance it goes for a golden glove near it
    guard: 0.2 + 0.25 * s,         // how far toward your side of the summit it stands (share of half the zone)
  });
  const K = () => MODES.koth.K;
  // what it sees of a player (it reads this a moment late)
  function look(q) {
    const s = G.mst.pl[q.id];
    return { x: q.x, y: q.y, vx: q.vx, face: q.face, alive: q.alive, stun: q.stun, on: MODES.koth.inZone(q),
      charge: s.gold ? 1 : s.hold >= K().tapT ? s.charge : -1, wob: s.wob > 0, // (a golden glove punches like a full charge)
      arm: s.hold >= 0 && s.charge >= K().armorAt, safe: s.safe > 0 };
  }
  // walk to x on the hilltop and coast to a stop there (braking with the keys would turn it around every step)
  function walkTo(out, p, x) {
    const d = x - cpuCx(p), v = p.vx;
    if (Math.abs(d) <= 6) return true;
    if (Math.sign(v) === Math.sign(d) && (v * v) / (2 * PHYS.fricG) >= Math.abs(d) - 4) return false;
    out.left = d < 0; out.right = d > 0;
    return false;
  }
  // a fresh press of the glove: jab (let go at once) or a wind-up let go later
  function startPunch(st, kind, want, blind) { st.pm = { kind, t: 0, want, blind }; }

  cpuBrain('koth', {
    noIdleStop: true, // its own idle stop is in think()
    reset(st) { st.pm = null; st.round = -1; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.pl) return out;
      const sk = SK(info.skill), s = mst.pl[p.id], KK = K();
      // a new round (or the banner / countdown): let go of everything
      if (M.round !== st.round || M.phase !== 'live') {
        st.pm = null; st.rel = 0; st.dawT = 0; st.jumpT = 0; st.dodgeFor = null; st.goldFor = null; st._lag_o = null;
        if (M.phase === 'live') st.round = M.round; else return out;
      }
      if (!p.alive) { st.pm = null; return out; }
      // the person walked away: it keeps playing past the level's own idle limit (a match against nobody takes about
      // 55 s, so it still ends), then stops, and the level pauses itself 40 s later
      if (!info.partnerCpu && info.partnerIdle > KK.idlePause + 50) { st.pm = null; return out; }
      const ov = cpuLag(st, 'o', look(o), sk.lag);
      const pcx = cpuCx(p), ocx = ov.x + PW / 2, dir = ocx >= pcx ? 1 : -1;
      const gap = Math.max(0, Math.abs(ocx - pcx) - PW), vOk = ov.alive && Math.abs(ov.y - p.y) < 36;
      const x0 = mst.zoneX0 + mst.zx, x1 = mst.zoneX1 - mst.zx, top = mst.sumTop, hx = mst.hx;
      const onTop = p.grounded && Math.abs(cpuFeet(p) - top) < 2 && pcx > mst.zoneX0 - 6 && pcx < mst.zoneX1 + 6;
      const meOn = MODES.koth.inZone(p);
      const facing = p.face === dir;
      st.rel = Math.max(0, (st.rel || 0) - dt);

      /* ---- the glove ---- */
      if (st.pm) {
        const pm = st.pm;
        pm.t += dt;
        if (pm.kind === 'jab') {
          // pressed until the wind-up starts, then let go at once: a jab
          if (s.hold >= 0 || pm.t > 0.05) { st.pm = null; st.rel = 0.04; } else out.act = true;
        } else if (s.hold < 0 && pm.t > 0.05) {
          st.pm = null; st.rel = 0.04;           // fired by itself, knocked out of it, or never started
        } else {
          out.act = true;
          const pw = s.gold ? 1 : s.hold < KK.tapT ? 0 : s.charge;
          const range = MODES.koth.reach(p.id, pw) + (pw >= KK.lungeMin ? 36 * pw : 0);
          const closing = (ov.vx * -dir) * 0.06;  // you walking into it helps
          const ready = s.hold >= KK.tapT + 0.02 && pw >= pm.want;
          let fire;
          if (pm.blind) fire = ready;            // easy: lets go when it feels ready, wherever you are
          else fire = s.hold >= KK.tapT + 0.02 && facing && vOk && gap - closing <= range - 3 && (pw >= Math.min(pm.want, 0.5) || gap < 8);
          if (fire) { out.act = false; st.pm = null; st.rel = 0.06; }
        }
      }

      // easy and normal stop for a moment now and then (not in the middle of a wind-up)
      if (st.dawT > 0) { st.dawT -= dt; if (!st.pm) return out; }
      else if (!st.pm && cpuChance(sk.dawdle, dt)) st.dawT = 0.25 + Math.random() * 0.5;

      /* ---- where to go ---- */
      let tx = null, nav = false, navFeet = top, close = false, fight = false;
      const g = mst.gold;
      if (g && !s.gold && mst.twist === 'gold') {
        // a golden glove: fetch it when it's nearer to it than to you (decided once per glove)
        if (st.goldFor !== g) { st.goldFor = g; st.goldGo = Math.random() < sk.gold && Math.abs(g.x - pcx) < Math.abs(g.x - ocx) + 60; }
        if (st.goldGo && !(meOn && !ov.on && M.timeLeft < 20)) { tx = g.x; navFeet = g.y + 15; nav = true; }
      }
      if (tx === null) {
        if (!onTop) { tx = ov.on ? clamp(ocx, x0 + 10, x1 - 10) : clamp(hx + Math.sign(ocx - hx) * 20, x0 + 12, x1 - 12); nav = true; }
        else if (ov.on || (vOk && gap < 60)) {
          // fight: walk into jab reach (a little farther while it is still winding up)
          const want = st.pm && st.pm.kind === 'charge' ? 4 : 8;
          // already in reach: stand (braking toward a spot it is already on made it flip left-right every step when pushed)
          fight = true;
          tx = gap > want ? ocx - dir * (PW + want) : pcx;
          if (!meOn) tx = clamp(tx, x0 + 6, x1 - 6);
          close = (gap <= want && meOn) || Math.abs(tx - pcx) <= 5;
        } else {
          // guard: a little toward your side of the summit, inside the zone
          const half = (x1 - x0) / 2, side = Math.sign(ocx - hx) || 1;
          tx = clamp(hx + side * sk.guard * half, x0 + 14, x1 - 14);
        }
      }
      let mv;
      if (nav) {
        const springs = mst.twist === 'springs' ? mst.springs : null;
        mv = cpuNav(st, p, tx, navFeet, { tol: 6, key: springs ? 'spr' : '',
          avoid: springs ? (cx, cy) => springs.some(sp => sp.tx === cx && sp.ty === cy) : null }) || {};
      } else { mv = {}; if (fight) { if (!close) cpuSeek(mv, p, tx, 3); } else walkTo(mv, p, tx); }
      out.left = mv.left; out.right = mv.right; out.down = mv.down;
      if (st.jumpT > 0) { st.jumpT -= dt; out.jump = true; } else out.jump = mv.jump;

      // turn to face you when you're close and it is standing still
      if (vOk && gap < 140 && !out.left && !out.right && !facing && p.grounded && (fight || Math.abs(p.vx) < 40)) { out.left = dir < 0; out.right = dir > 0; }

      /* ---- hop over a big charged punch (or a golden glove) ---- */
      const theirReach = ov.charge > 0 ? MODES.koth.reach(o.id, ov.charge) + 36 * ov.charge : 0;
      if (ov.charge >= 0.55 && ov.face === -dir && vOk && p.grounded && !st.pm && gap < theirReach + 18) {
        const key = Math.floor(G.time / 2); // one roll per wind-up (roughly)
        if (st.dodgeFor !== key) { st.dodgeFor = key; st.dodgeGo = Math.random() < sk.dodge; }
        if (st.dodgeGo && gap > 4) { st.jumpT = 0.22; out.jump = true; out.left = dir < 0; out.right = dir > 0; st.dodgeGo = false; st.hop = true; }
      }
      // in the air after that hop: hard steers to come down on your head (a stomp knocks the charge out of you)
      if (p.grounded) st.hop = false;
      else if (st.hop && info.skill > 0.8 && p.vy > 0) { const a = {}; cpuSeek(a, p, ocx, 2); out.left = a.left; out.right = a.right; }

      /* ---- start a punch ---- */
      const canStart = !st.pm && st.rel <= 0 && s.hold < 0 && s.cd <= 0 && s.wob <= 0 && s.act <= 0 && p.stun <= 0 && !out.act;
      // normal and hard learn the rhythm: a jab right after a hit bounces off (you're briefly safe), so they wait for it
      const safe = info.skill > 0.6 && ov.safe; // (as it saw it a moment ago, like everything else about you)
      if (canStart && vOk && ov.stun <= 0.05) {
        const reach0 = MODES.koth.reach(p.id, 0) - 3;
        if (s.gold) { if (gap <= reach0 && facing) startPunch(st, 'jab'); }
        else if (ov.wob && gap < 70 && info.skill > 0.6) startPunch(st, 'charge', 0.6, false); // you missed a big one: punish it
        else if (safe && gap <= reach0) { /* wait a moment */ }
        else if (gap <= reach0 && facing) {
          // right next to you: jab, or against a puffed-up glove (it shrugs jabs off) wind up too
          if (cpuChance(sk.jab, dt)) {
            if (Math.random() < sk.wind * (ov.arm ? 1.5 : 1)) startPunch(st, 'charge', 0.55, Math.random() < sk.blind);
            else startPunch(st, 'jab');
          }
        } else if (gap < 110 && (ov.on || meOn || onTop) && cpuChance(sk.charge, dt)) {
          const blind = Math.random() < sk.blind;
          startPunch(st, 'charge', blind ? 0.25 + Math.random() * 0.75 : gap > 50 ? 1 : 0.6, blind);
        }
        if (st.pm) out.act = true;
      }
      // the person walked off and it holds the hill: once a match it says what to do
      if (!info.partnerCpu && cpuFor(st, 'still', info.partnerIdle > 0, dt) > 8 && meOn && !st.said) { st.said = true; cpuSay(p, 'Knock me off!'); }
      return out;
    },
  });
})();

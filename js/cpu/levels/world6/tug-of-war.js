/* Pip & Bo - Computer partner: tug of war. */
'use strict';

(() => {
  /* The computer plays the rope like a person mashing the pull button:
       holding    it mashes at its own speed (easy about 3 presses a second, hard about 7) and, on the beats it tries,
                  times one press on the frog's BOOM (it hears the drum's steady rhythm, so it knows when the next one is
                  due; easy and normal are a bit early or late, and easy skips many beats and just mashes). It holds back its
                  mash just before a BOOM it means to hit, so the timed press is the first one in the window.
       dug in     by its own mud (the gold "Dig in!") normal and hard press steadily (5-6 a second, which pulls as hard
                  there as a fast mash) and now and then let a BOOM go by instead of holding back for it.
       goodies    normal and hard jump off for a crate that lands on their side when they can afford the trip (their toes
                  are far from the mud, the walk there and back is short) and grab the rope again with the action; easy
                  sometimes jumps off for one it shouldn't (a kid loves goodies).
       tickled    nothing works, so it just waits.
     Skill sets the mash speed, the beat timing, how many beats it tries and how wisely it goes for crates. */
  const SK = { // mash presses/s, rate wobble, share of beats tried, timing spread (s), crate sense, wild crate chance,
    //            rope lost before a crate trip is worth it, the press gap (s) when dug in (0: keeps mashing), share of the
    //            beats it still holds back for when dug in (a steady press there is worth about as much)
    easy: { rate: 3.3, wob: 0.45, beatP: 0.25, sig: 0.14, crate: 0.4, wild: 0.3, margin: 30, dig: 0, digBeat: 1 },
    normal: { rate: 5.8, wob: 0.3, beatP: 0.7, sig: 0.07, crate: 0.75, wild: 0, margin: 40, dig: 0.16, digBeat: 0.85 },
    hard: { rate: 7.0, wob: 0.15, beatP: 0.85, sig: 0.05, crate: 1, wild: 0, margin: 35, dig: 0.16, digBeat: 0.85 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;   // about N(0, 1), cheap

  // a fresh round (the round clock went back to 0): forget the old plan
  function newRound(S, st) { S.t0 = st.t; S.next = 0; S.beatId = -1; S.beatAt = null; S.mode = 'hold'; S.crate = null; S.skip = new Set(); }

  // where the crate will be when it lands (a person sees it sway and fall; the sway is regular)
  function landX(st, c) {
    const K = st.K;
    if (c.landed) return c.x;
    const tl = c.t + (TUG.floorY - K.crateR - c.y) / K.crateVy;
    return c.xc + c.sway * Math.sin(K.swayW * tl + c.ph);
  }
  // can player k reach x on its own half? (free players keep to their side of the middle line)
  const reachable = (k, x) => (k === 0 ? x < TUG.mid + 6 : x > TUG.mid - 6);

  // should we let go for this crate? what it is worth (px of rope, roughly) against the rope we lose while off it
  const VALUE = { feather: 130, spinach: 100, drum: 45 };
  function crateWorth(S, st, p, k, info, sk) {
    const c = st.crate, K = st.K;
    if (!c || S.skip.has(c.born)) return false;
    if (S.roll !== c.born) { S.roll = c.born; S.sense = Math.random() < sk.crate; S.wild = Math.random() < sk.wild; }
    const x = landX(st, c);
    if (!reachable(k, x) || !(S.sense || S.wild)) { S.skip.add(c.born); return false; }
    const home = tugBodyX(st, k), dist = Math.abs(x - home), inMud = Math.max(0, st.mud - Math.abs(x - TUG.mid));
    const walk = (dist - inMud) / PHYS.maxRun + inMud / (PHYS.maxRun * K.mudRun);
    const fall = c.landed ? 0 : (TUG.floorY - K.crateR - c.y) / K.crateVy;
    if (walk + 0.3 > fall + K.crateFloat - c.lt - 0.4) { S.skip.add(c.born); return false; }   // gone before we get there
    // wait until it is low enough to walk under it (a person waits to see where it comes down)
    if (fall > walk + 0.6) return false;
    const off = 2 * walk + 0.8, oPulls = st.hold[1 - k] && st.tickle[1 - k] <= 0;
    const cost = oPulls ? off * 32 * K.freeMul : 0, gap = tugGap(st, k);
    S.skip.add(c.born);
    if (S.wild) return gap > cost + 20;
    if (st.t > K.spreadAt + 18) return false;              // the mud closes in on both: no time for walks
    return gap - cost > sk.margin && (VALUE[c.type] || 0) > cost * 0.8;
  }

  cpuBrain('tug', {
    noIdleStop: true, // the level has no idle pause: a match against nobody plays out and ends (the computer wins)
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.beat || !st.K || !m || m.phase !== 'live') { S.t0 = null; return out; }
      if (S.t0 == null || st.t < S.lastT) newRound(S, st);
      S.lastT = st.t;
      const k = p.id, K = st.K, sk = skOf(info.skill), b = st.beat, t = st.t;
      if (st.tickle[k] > 0) return out;                     // giggling: nothing works

      if (st.hold[k]) {
        S.mode = 'hold';
        // a crate worth the trip: push toward the middle and jump (that lets go even mid-mash)
        if (st.crate && S.crate !== st.crate.born && crateWorth(S, st, p, k, info, sk)) S.crate = st.crate.born;
        if (st.crate && S.crate === st.crate.born) {
          if (k === 0) out.right = true; else out.left = true;
          out.jump = 'tap';
          return out;
        }
        // the next BOOM: try it or not (decided once per beat), and when to press it
        if (S.beatId !== b.id) {
          S.beatId = b.id;
          S.beatAt = Math.random() < sk.beatP ? b.next + clamp(gauss() * sk.sig, -K.winE + 0.01, K.winL - 0.01) : null;
        }
        // dug in (the gold "Dig in!" by its mud): a steady 5-6 presses a second pulls as hard as a fast mash there and
        // makes a press in the window a Good heave, so normal and hard stop mashing fast
        const dug = sk.dig && tugGap(st, k) < K.digGap;
        if (dug && S.beatAt != null && S.digRoll !== b.id) { S.digRoll = b.id; if (Math.random() > sk.digBeat) S.beatAt = null; }
        let press = false;
        if (S.beatAt != null && st.used[k] !== b.id) {
          if (t >= S.beatAt) { press = true; S.beatAt = null; }
          else if (t >= b.next - K.winE - 0.01) return out;  // hold the mash: the timed press must come first in the window
        }
        if (!press && t >= S.next) press = true;
        if (press) {
          out.act = 'tap';
          const r = sk.rate * (1 + (Math.random() - 0.5) * 2 * sk.wob);
          S.next = t + Math.max(dug ? sk.dig + Math.random() * 0.04 : 1 / 10.5, 1 / r);
        }
        return out;
      }

      // off the rope: get the crate, then walk back and grab the rope end again
      const c = st.crate, home = tugBodyX(st, k);
      if (c && c.born === S.crate && reachable(k, landX(st, c))) {
        const x = landX(st, c), px = cpuCx(p);
        cpuSteer(out, p, clamp(x, k === 0 ? 0 : TUG.mid + 14, k === 0 ? TUG.mid - 14 : W), 5);
        // jump into it while it falls overhead
        if (!c.landed && Math.abs(c.x - px) < 18 && c.y + K.crateR > p.y - 105 && c.y < p.y && p.grounded) out.jump = 'tap';
        return out;
      }
      S.crate = null;
      if (cpuSteer(out, p, home, 6) && p.grounded) { out.left = out.right = false; out.act = 'tap'; }
      else if (Math.abs(home - cpuCx(p)) < K.grabR - 4 && p.grounded) out.act = 'tap';
      return out;
    },
  });
})();

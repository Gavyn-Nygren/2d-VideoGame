/* Pip & Bo - Computer partner: ice age glacier. */
'use strict';

/* 9-3 Ice Age Glacier. Both ride one floe; the room def says who steers (m.steer) and who hops (m.hop), and the jobs
   swap at every crack, so the brain just plays the seat it sits in this room.
   - Steerer: pushes off at the top, then plans speed from the hazards ahead on the roads it will take (the same ones
     the signs and the prompts over the heads show): it brakes (◀) early enough to be SLOW at the first bump crest and
     through the whole bump field, pushes (▶) when a wide crevasse is the next thing that needs a speed, and brakes for
     a gentle stop at the finish snowbank. At a fork it picks the road with more snowflakes (▲ high / ▼ low).
   - Hopper: hops (jump) when a crevasse's near rim is inside the hop zone (the gold HOP! prompt), at a wide one as
     late as it safely can while the floe is still too slow (so a slow steerer gets every moment to push), and ducks
     (▼) through icicle arches, letting go for a moment if its legs would get tired under a very slow floe.
   - Both: the hopper also hops for snowflakes up in a hop arc (and gold ones) where nothing else is near. Skill only
     shifts timing a little (easy brakes earlier, hops less evenly in the zone, lets a few flake arcs go by).
   It never presses the other seat's keys (the level would nudge it). With a person, it talks only when it helps:
   a steerer who is too slow for a big gap or too fast for bumps, a hopper who just missed a hop or an arch.
   The level's own idle rule (10 s with no press from anyone): when the person's own prompts have gone unanswered for
   10 s, the computer stops too, so the floe gets chilly and waits as it would for two people.
   Reads only what is on screen (hazards, signs, prompts, the speed meter). */
(() => {
  const Gc = () => GLACIER;
  // a short bubble for the person, at most one every few seconds (less and less often for the same words, and
  // for many bubbles in one room)
  function say(st, p, text, gap = 5) {
    if (G.mst && G.mst.afk) return; // (the floe is stopped, waiting for someone to press: 'Hop now!' would contradict it)
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 6))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }
  // the distance the floe needs to brake from v down to `to` (plus a reaction margin)
  const brakeDist = (v, to, margin) => Math.max(0, (v * v - to * to) / (2 * Gc().brake)) + v * 0.06 + margin;
  // the snowflakes a road of a fork is worth (gold counts 5)
  function roadValue(m, fk, path) {
    let n = 0;
    for (const fl of m.c.flakes) if (fl.path === path && fl.x >= fk.x0 && fl.x <= fk.x1) n += fl.gold ? Gc().goldVal : 1;
    return n;
  }

  /* ---------- the steerer ---------- */
  function steer(st, p, o, m, dt, info) {
    const G0 = Gc(), f = m.f, out = {};
    if (f.state === 'wait') {
      // push off once the card is gone (a moment later on easy)
      if (G.introT > 0) { st.pushT = 0; return out; }
      st.pushT = (st.pushT || 0) + dt;
      out.right = st.pushT > 0.25 + (1 - info.skill) * 0.6;
      return out;
    }
    if (f.state !== 'slide') return out;
    // a fork ahead: pick the road with more snowflakes (ties: the low road), after a short look
    const fk = glacierForkNear(m);
    if (fk) {
      if (st.road == null || st.roadFk !== fk.i) {
        st.roadFk = fk.i; st.roadT = 0;
        const hi = roadValue(m, fk, 1), lo = roadValue(m, fk, 0);
        st.road = hi > lo ? 1 : 0;
      }
      st.roadT += dt;
      const last = CPU.last[p.id];
      if (st.roadT > 0.3 + (1 - info.skill) * 0.5 && m.forkChoice[fk.i] !== st.road && !last.up && !last.down) {
        if (st.road) out.up = true; else out.down = true;
      }
    }
    // speed: the nearest hazard that needs a speed decides
    const v = f.v, ahead = glacierAhead(m, 1000);
    let want = 0;
    for (const h of ahead) {
      if (h.kind === 'mog') {
        if (f.x > h.x1 + 4) continue;
        const crest = h.crests.find(cx => cx > f.x - 2);
        if (crest == null) continue;
        const d = crest - f.x;
        if (f.x > h.x0 - 12 || d <= brakeDist(v, G0.brakeTo, 30 + (1 - info.skill) * 30)) want = -1;
        // (no push straight into a bump field: coast until it is time to brake)
        else if (v > G0.slowMax + 30 && d < brakeDist(v, G0.brakeTo, 140)) want = -1;
        break;
      }
      if (h.kind === 'gap' && h.wide && h.help < 2) {
        if (h.x0 - f.x < -G0.coyote) continue;
        // FAST, but not flat out: a little over the FAST mark leaves the hopper more time to react
        st.pushing = v < (st.pushing ? G0.fastMin + 35 : G0.fastMin + 20);
        want = st.pushing ? 1 : 0;
        break;
      }
    }
    // the finish: a gentle stop in the snowbank
    const fin = m.c.finish;
    if (fin && want === 0) {
      const d = fin.x - 70 - G0.FL / 2 - f.x;
      if (d < brakeDist(v, G0.brakeTo, 60)) want = -1;
    }
    out.left = want < 0; out.right = want > 0;
    // a person hopper who just missed: say what to do
    if (!info.partnerCpu) {
      const nd = glacierNeeds(m);
      const gp = ahead.find(h => h.kind === 'gap' && h.help < 2 && h.x0 - f.x > -G0.coyote);
      if (nd.hopNow && gp && gp.fails > 0 && !f.air && st.toldGap !== gp.fails + ':' + gp.x0) { st.toldGap = gp.fails + ':' + gp.x0; say(st, p, 'Hop now!', 2); }
      else if (nd.duckNow && m.c.arches[0].concat(m.c.arches[1]).some(a => a.hit)) say(st, p, 'Duck!');
    }
    return out;
  }

  // the high snowflakes ahead on our road: the group (flakes in a row) whose hop point the floe is at now, or null
  function flakeHop(st, m, v, info) {
    const f = m.f, fls = m.c.flakes;
    for (let i = 0; i < fls.length; i++) {
      const fl = fls[i];
      if (fl.got || fl.h < 60 || fl.x < f.x - 20 || fl.x > f.x + 420 || fl.path !== glacierPathAt(m, fl.x)) continue;
      let j = i;
      while (j + 1 < fls.length && fls[j + 1].path === fl.path && fls[j + 1].x - fls[j].x < 44 && fls[j + 1].h >= 60) j++;
      const mid = (fl.x + fls[j].x) / 2, at = mid - v * 0.27;
      if (f.x < at - 4) return null;
      if (f.x > at + 30) { i = j; continue; }
      // easy now and then lets a group go by
      const key = m.k + ':' + i;
      if (st.flakeKey !== key) { st.flakeKey = key; st.flakeSkip = Math.random() < (1 - info.skill) * 0.45; }
      return st.flakeSkip ? null : fl;
    }
    return null;
  }

  /* ---------- the hopper ---------- */
  function hop(st, p, o, m, dt, info) {
    const G0 = Gc(), f = m.f, out = {};
    if (f.state !== 'slide') { st.hopAt = null; return out; }
    const v = f.v, ahead = glacierAhead(m, 900);
    // duck: from just before the icicles reach the floe until they are past it
    const arch = ahead.find(h => h.kind === 'arch' && !h.broken);
    let duck = false;
    if (arch) {
      const lo = arch.x0 - G0.FL / 2 + 14, hi = arch.x1 + G0.FL / 2 - 14;
      if (f.x >= lo - (v * 0.16 + 10) && f.x <= hi + 4) duck = true;
    }
    // legs getting tired under a crawling floe: let go for one step (the duck barely drops) so the timer starts again
    if (duck && f.duckHold > G0.duckMax - 0.25) duck = false;
    out.down = duck;
    // hop: the next crevasse on our road
    const gp = ahead.find(h => h.kind === 'gap' && h.help < 2 && h.x0 - f.x > -G0.coyote);
    if (gp && !f.air && f.lock <= 0 && !duck) {
      const d = gp.x0 - f.x, zone = Math.max(G0.zone, v * G0.zoneT);
      // where in the zone to hop: a little random, wider on easy (always inside the zone)
      if (st.hopGap !== gp || st.hopFails !== gp.fails) {
        st.hopGap = gp; st.hopFails = gp.fails;
        const spread = 0.25 + (1 - info.skill) * 0.25;
        st.hopAt = zone * (0.55 + (Math.random() - 0.5) * spread);
      }
      let at = Math.min(st.hopAt, zone - 6);
      // a big gap and still too slow: wait for the steerer until the last safe moment
      if (gp.wide && v < G0.fastMin - G0.tol) at = 16;
      if (d <= at) out.jump = 'tap';
    }
    // snowflakes up in a hop arc (and gold ones): hop so the top of the hop meets them, where nothing else is near
    if (!out.jump && !duck && !f.air && f.lock <= 0) {
      const fl = flakeHop(st, m, v, info);
      if (fl && ahead.every(h => h.x0 - f.x > v * 0.6 + 200 || h.x1 + G0.FL / 2 < f.x - 4)) out.jump = 'tap';
    }
    // a person steerer who isn't at the speed the next hazard needs: say so
    if (!info.partnerCpu) {
      const nd = glacierNeeds(m), sp = nd.speed;
      if (sp && sp.need === 'fast' && v < G0.fastMin - G0.tol && sp.d < v * 1.1) say(st, p, 'Go FAST!');
      else if (sp && sp.need === 'slow' && v > G0.slowMax + 10 && sp.d > 0 && sp.d < brakeDist(v, G0.brakeTo, v * 0.3) && f.leanIn >= 0 && f.lock <= 0) say(st, p, 'Slow down!');
    }
    return out;
  }

  // does the partner's seat have something to do right now (a prompt over their head)? miss: a press is needed now
  // (a hop or duck in its zone, or the floe off the speed the next hazard needs; a fork is a free choice)
  function partnerJob(m, o) {
    const nd = glacierNeeds(m), f = m.f, G0 = GLACIER;
    if (o.id === m.steer) {
      const sp = nd.speed, near = sp && sp.d < f.v * G0.sayFast;
      const off = near && sp.d < f.v * 1.2 && (sp.need === 'slow' ? f.v > G0.slowMax + G0.tol : f.v < G0.fastMin - G0.tol);
      return { job: !!(nd.fork || near), miss: !!off };
    }
    return { job: !!(nd.hop || nd.duck), miss: !!(nd.hopNow || nd.duckNow) };
  }

  cpuBrain('glacier', {
    reset(st) { st.slideIdle = 0; st.pIdlePrev = 0; st.missed = false; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.f || info.intro && m.f.state !== 'wait') return {};
      // the person walked away: once they have pressed nothing for the level's 10 s although a press of theirs was
      // needed (time with nothing for them to do doesn't count), or after 10 s of their prompts showing unanswered,
      // stop too, so the floe gets chilly and waits as it would for two people
      if (!info.partnerCpu) {
        if (info.partnerIdle < st.pIdlePrev || info.partnerIdle === 0) { st.slideIdle = 0; st.missed = false; }
        else if (m.f.state === 'slide') {
          const pj = partnerJob(m, o);
          if (pj.job) st.slideIdle += dt;
          if (pj.miss) st.missed = true;
        }
        st.pIdlePrev = info.partnerIdle;
        if (st.slideIdle > GLACIER.afkT || (st.missed && info.partnerIdle > GLACIER.afkT + 1)) return {};
      }
      return p.id === m.steer ? steer(st, p, o, m, dt, info) : hop(st, p, o, m, dt, info);
    },
  });
})();

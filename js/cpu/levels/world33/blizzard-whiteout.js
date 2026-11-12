/* Pip & Bo - Computer partner brain for 33-3 Blizzard Whiteout (mode 'whiteout'). */
'use strict';

(() => {
  /* 33-3 Blizzard Whiteout (MODES.whiteout): G.mst.flare holds the flare, G.mst.ice the pick. Both jobs read
     MODES.whiteout.plan(st), the same plan the prompts and the HUD chips read, and the plan only uses what has been lit
     or shown by lightning, so the computer plays fair (but it remembers).
     FLARE: walks a little ahead of the partner, lights each obstacle while the ice hero works on it, raises the flare
       when the yeti shows up (and to see across a crevasse field, lowering it to jump), fetches a fresh flare when it
       burns low.
     ICE: never goes past the edge of the light; swings at the nearest lit wall, slope, drift or icicle, digs out
       snowed-in crates.
     Both crouch in gusts, jump crevasses one at a time, brace at once when the partner falls, climb out when they fall,
     warm up at cairns, and jump for snow probes up on rocks. With a person partner: when the rope has been taut for
     0.5 s and the person is pulling the other way, the computer gives way and follows them (no tug-of-war). It says
     what it needs ("Brace!", "Raise the flare!") and after 6 s of waiting shows "Over here!". It can't finish alone:
     the level takes a break after 12 s with no person pressing anything. Team brains always play at full skill. */
  const M = () => MODES.whiteout;
  cpuBrain('whiteout', {
    reset(S) { S.wait = 0; S.jumpT = 0; S.tapT = 0; S.taut = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pts || info.intro || st.state !== 'go' || st.waiting || st.slipT > 0) return out;
      const pl = M().plan(st), me = st.h[p.id], isF = p.id === st.flare, job = isF ? pl.flare : pl.ice, other = st.h[1 - p.id];
      S.jumpT -= dt; S.tapT -= dt;
      // fallen in: climb
      if (me.st === 'fall' || me.st === 'hang') { out.up = true; out.jump = true; talk(S, p, st, pl, dt, info, me, other); return out; }
      if (job.act === true && (job.why === 'brace' || job.why === 'braced')) { out.act = true; talk(S, p, st, pl, dt, info, me, other); return out; }
      // in the air: keep going the way it jumped (never stop or raise the flare over a crevasse)
      if (!me.grounded && Math.abs(me.vx) > 40) { if (me.vx > 0) out.right = true; else out.left = true; return out; }
      if (job.down) { out.down = true; talk(S, p, st, pl, dt, info, me, other); return out; }
      let tx = job.x;
      // no tug-of-war with a person: give way when they pull against a taut rope
      if (!info.partnerCpu) {
        const oi = G.players[other.id].input, away = (other.x > me.x && oi.right) || (other.x < me.x && oi.left);
        S.taut = st.tautNow && away ? S.taut + dt : Math.max(0, S.taut - dt * 2);
        if (S.taut > 0.5 && job.why !== 'jump') tx = other.x + (other.x > me.x ? -40 : 40);
      }
      const dx = tx - me.x, busy = me.dig || (job.act === true && job.why === 'dig' && Math.abs(dx) < 10);
      if (!busy && me.pushT <= 0 && me.stun <= 0) {
        // (let go early enough to stop on the spot: the hero slows at 1800 px/s per s)
        const dead = job.act || job.jump || job.why === 'jump' ? 4 : 8, stop = me.vx * me.vx / 3600;
        // walking along with a moving partner: keep pace instead of stopping and starting
        const ov = other.vx, pace = Math.abs(ov) > 100 && Math.abs(dx) < 44 && (job.why === 'follow' || job.why === 'go' || job.why === 'light') && Math.sign(ov) === Math.sign(me.vx || ov);
        if (pace) { if (ov > 0) out.right = true; else out.left = true; }
        else if (Math.abs(dx) > dead && !(Math.sign(me.vx) === Math.sign(dx) && stop >= Math.abs(dx) - dead * 0.5)) { if (dx > 0) out.right = true; else out.left = true; }
      }
      // a crevasse right in front: jump it at speed if the target is across, else don't walk in
      const dir = out.right ? 1 : out.left ? -1 : 0;
      if (dir && me.grounded) {
        const g = M().gapAt(st, me.x + dir * 18) || M().gapAt(st, me.x + dir * 8);
        if (g) {
          const beyond = dir > 0 ? tx > g.x1 : tx < g.x0;
          // (a slow jump falls short, but the partner across braces and the rope brings you up on their side)
          if (beyond && (Math.abs(me.vx) > 130 || M().gapAt(st, me.x + dir * 8))) { if (S.jumpT <= 0 && !(isF && st.raised)) { out.jump = 'tap'; S.jumpT = 0.4; } }
          else if (!beyond) out.right = out.left = false;
        }
      }
      if (job.act === 'tap') { if (S.tapT <= 0 && Math.abs(me.vx) < 60) { out.act = 'tap'; S.tapT = 0.36; } }
      else if (job.act) out.act = true;
      if (job.jump && S.jumpT <= 0) { out.jump = 'tap'; S.jumpT = 0.4; }
      talk(S, p, st, pl, dt, info, me, other);
      return out;
    },
  });
  // with a person partner: say what's needed, and "Over here!" after 6 s of waiting
  function talk(S, p, st, pl, dt, info, me, other) {
    if (info.partnerCpu) return;
    const isF = p.id === st.flare, job = isF ? pl.flare : pl.ice, oj = isF ? pl.ice : pl.flare;
    const waiting = Math.abs(me.vx) < 10 && (job.why === 'wait' || job.why === 'light' || job.why === 'warm' || job.why === 'braced' || (job.why === 'follow' && Math.abs(job.x - me.x) < 10));
    S.wait = waiting ? S.wait + dt : 0;
    if (me.st === 'hang' || me.st === 'fall') cpuSay(p, st.catch && st.catch.braced ? 'Hold on, climbing!' : 'Brace! Brace!', 1.2);
    else if (job.why === 'braced') cpuSay(p, 'I\'ve got you! Climb up!', 1.2);
    else if (oj.why === 'yeti' && !st.raised) cpuSay(p, 'Raise the flare! Hold it high!', 1.4);
    else if (oj.why === 'gust' && other.st !== 'crouch') cpuSay(p, 'Crouch! Here comes the wind!', 1.2);
    else if (S.wait > 6) cpuSay(p, 'Over here!', 1.4);
    else if (st.cold < 0.3) cpuSay(p, 'Brrr! To the cairn!', 1.4);
    else if (!isF && job.why === 'pick' && Math.abs(st.h[st.flare].x - me.x) > st.lightR - 30) cpuSay(p, 'Bring the light over here!', 1.4);
    else if (oj.why === 'pick' && pl.stage === 'wall') cpuSay(p, 'Smash the ice wall!', 1.2);
    else if (oj.why === 'dig') cpuSay(p, 'There\'s a crate under the snow!', 1.4);
  }
})();

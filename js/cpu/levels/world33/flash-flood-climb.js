/* Pip & Bo - Computer partner brain for 33-2 Flash Flood Climb (mode 'floodclimb'). */
'use strict';

(() => {
  /* 33-2 Flash Flood Climb (MODES.floodclimb): G.mst.rope is the rope hero this stretch, G.mst.boost the boost hero.
     Both jobs read MODES.floodclimb.plan(st), the same plan the prompts and the HUD chips read. The plan works out
     which ledge both heroes are on and what the next climb needs:
     BOOST stage (both on ledge j): the boost hero walks to the boost spot under the next ledge's end and holds the
       action to crouch; the rope hero stands next to it and jumps once it is crouched. A boulder on the way is shoved
       first. The rope hero takes a gauge on the ledge or its shelf first while the water is well below.
     ROPE stage (the rope hero one ledge up): the rope hero holds the action at the ring until the boost hero has
       climbed all the way up; the boost hero walks under the rope, jumps to grab it and holds ▲.
     LIFT stage (Mine Scaffold): the rope hero steps into the cage, the boost hero holds the action at the crank, the
       rope hero steps off at the top (and the rope stage follows).
     DOWN: if the rope hero has fallen below, the boost hero walks off its ledge's open end to join them.
     It waits out a spout's gush, never lets go of a rope with someone on it, says what it needs to a person partner
     ("Crouch at the X!", "Grab the rope!"), and after 6 s of waiting for a person shows "Over here!". It can't finish
     alone: the level takes a break after 12 s with no person pressing anything. Team brains always play at full skill. */
  const M = () => MODES.floodclimb;
  cpuBrain('floodclimb', {
    reset(S) { S.wait = 0; S.jumpT = 0; S.shelf = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.ledges || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), me = st.h[p.id], rope = p.id === st.rope, job = rope ? pl.rope : pl.boost;
      if (me.st === 'swept' || me.stun > 0) return out;
      S.jumpT -= dt;
      // on the rope: climb
      if (me.st === 'rope') { out.up = true; out.jump = true; return out; }
      // holding the rope: keep holding while the partner is on it or coming
      if (me.st === 'hold' && (pl.stage === 'rope' || st.h[1 - p.id].st === 'rope')) { out.act = true; waitTalk(S, p, st, pl, dt, info); return out; }
      let tx = job.x;
      // a gauge detour for the rope hero while setting up a boost
      const g = rope && (pl.stage === 'boost' || (pl.stage === 'lift' && pl.rope.why === 'gauge')) && pl.gauge;
      if (g) {
        tx = g.x;
        if (g.shelf && Math.abs(me.x - g.x) < 14 && me.grounded && me.y > g.shelf.y + 10 && S.jumpT <= 0) { out.jump = 'tap'; S.jumpT = 0.5; }
        // on the shelf: step off toward the job
        if (g.shelf && me.grounded && Math.abs(me.y - g.shelf.y) < 2) tx = job.x;
      }
      const dx = tx - me.x, still = (rope && job.act && me.st === 'hold') || (!rope && (me.st === 'crouch' || me.st === 'crank'));
      if (!still && me.pushT <= 0) {
        // (let go early enough to stop on the spot: the hero slows at 2400 px/s per s)
        const dead = job.act || job.jump || (pl.stage === 'boost' && !g) ? 3 : 6, stop = me.vx * me.vx / 4800;
        if (Math.abs(dx) > dead && !(Math.sign(me.vx) === Math.sign(dx) && stop >= Math.abs(dx) - dead * 0.5)) { if (dx > 0) out.right = true; else out.left = true; }
      }
      // (stop before crouching or cranking: the action only works standing still)
      if (job.act === 'tap') out.act = 'tap';
      else if (job.act && Math.abs(me.vx) < 40) out.act = true;
      else if (job.act) out.act = false;
      if (job.jump && S.jumpT <= 0) { out.jump = 'tap'; S.jumpT = 0.4; }
      waitTalk(S, p, st, pl, dt, info);
      return out;
    },
  });
  // waiting for a person partner: say what's needed, and "Over here!" after 6 s
  function waitTalk(S, p, st, pl, dt, info) {
    if (info.partnerCpu) return;
    const me = st.h[p.id], o = st.h[1 - p.id], rope = p.id === st.rope;
    const waiting = (rope && me.st === 'hold' && o.st !== 'rope') || (!rope && me.st === 'crouch') || (!rope && me.st === 'crank' && pl.boost.why !== 'crank');
    S.wait = waiting ? S.wait + dt : 0;
    if (S.wait > 6) cpuSay(p, 'Over here!', 1.4);
    else if (pl.waterGap < 80) cpuSay(p, 'Hurry, the water!', 1.2);
    else if (!rope && me.st === 'crouch') cpuSay(p, 'Jump from next to me!', 1.4);
    else if (rope && me.st === 'hold' && o.st !== 'rope') cpuSay(p, 'Grab the rope!', 1.4);
    else if (rope && pl.stage === 'boost' && o.st !== 'crouch' && Math.abs(me.x - pl.rope.x) < 12) cpuSay(p, 'Crouch here and boost me!', 1.4);
    else if (pl.stage === 'lift' && rope && pl.rope.why === 'ride') cpuSay(p, 'Crank me up!', 1.2);
  }
})();

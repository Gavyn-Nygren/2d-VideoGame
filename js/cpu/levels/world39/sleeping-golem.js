/* Pip & Bo - Computer partner brain for 39-2 Sleeping Golem (mode 'cavegolem'). */
'use strict';

(() => {
  /* 39-2 Sleeping Golem (MODES.cavegolem): both read MODES.cavegolem.plan(st), the same plan the prompts and chips read.
     plan.mv[id] is one step along the body toward this hero's goal (the shard for the puller, its teal ear crystal for
     the soother, a spot beside a loose shard for both): walk to a local x, climb up or down, wait for the arm lift.
     Order of business each tick: crouch when a scratching hand or a low arch is about to pass (plan.crouch), step away
     from a roof-crystal marker or a venting crack (plan.dodge), hold on through a stomp (plan.hold) or, as a ringer
     outside a hollow, hop over it (plan.hop); then the job.
     PULLER: at the shard it pulls while the chime rings. With a person soother who has not rung for 6 s it pulls in
       bursts (while Rage is under 0.6) so it is never stuck, and says "Ring, please!".
     SOOTHER: at the ear crystal it rings (always: ringing only ever helps). A mite on the crystal: it jumps on it.
     HEAVE: it presses within a moment of the partner; two computers: the puller leads and the soother follows at once.
       With a person, it calls "Heave on 3!" and presses every 2.5 s so the person can join in. */
  const M = () => MODES.cavegolem;
  cpuBrain('cavegolem', {
    reset(s) { s.heaveT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, id = p.id;
      if (!st || !st.h || info.intro || st.state !== 'go' || st.waiting) return out;
      const h = st.h[id];
      if (h.mode === 'tumble' || h.mode === 'air' || h.knockT > 0 || h.stunT > 0) return out;
      const pl = M().plan(st), solo = !info.partnerCpu, sh = pl.shard;
      if (!sh) return out;
      if (pl.crouch[id]) { out.down = true; if (pl.hold[id]) out.act = true; return out; }
      if (pl.dodge[id]) { if (pl.dodge[id] > 0) out.right = true; else out.left = true; return out; }
      if (pl.hop[id]) { out.jump = 'tap'; return out; }
      // hold on (at the shard or a ring spot ▼ + action, so it holds without pulling or ringing)
      // (always ▼ + action on a ledge: near a shard or a teal crystal the action alone pulls or rings, and a ringer is
      // shaken off; on a climb the action alone holds)
      if (pl.hold[id]) { out.act = true; if (h.mode === 'stand') out.down = true; return out; }
      const job = pl.act[id], oid = 1 - id;
      if (job === 'pull') {
        const ringing = st.h[st.soother].ring;
        if (pl.ringSafe) out.act = true;
        else if (ringing) { /* the ringer is about to hop a stomp: wait a moment */ }
        else if (solo && st.T - st.ringT > 6 && st.rage < 0.6) { out.act = true; cpuSay(p, 'Ring, please!', 1.6); }
        else if (solo) cpuSay(p, 'Ring the chime, please!', 1.6);
        return out;
      }
      if (job === 'ring') { out.act = true; return out; }
      if (job === 'pop') { out.jump = 'tap'; return out; }
      if (job === 'heave') {
        const theirs = st.T - st.heave[oid];
        if (theirs >= 0 && theirs < 0.3) { out.act = 'tap'; return out; }
        if (info.partnerCpu) { if (id === st.puller && pl.act[oid] === 'heave') out.act = 'tap'; return out; }
        s.heaveT += dt;
        if (s.heaveT > 1.5) cpuSay(p, 'Heave on 3! 1... 2... 3!', 1.2);
        if (s.heaveT > 2.5) { s.heaveT = 0; out.act = 'tap'; }
        return out;
      }
      s.heaveT = 0;
      const mv = pl.mv[id];
      if (!mv || pl.freeze[id] || (pl.noJump[id] && mv.k === 'up' && h.mode === 'stand')) return out; // (a roof crystal marker close by: stay out of it until it lands)
      if (mv.k === 'walk') { if (mv.x > h.lx + 2) out.right = true; else if (mv.x < h.lx - 2) out.left = true; }
      else if (mv.k === 'wait' && Math.abs(mv.x - h.lx) > 4) { if (mv.x > h.lx) out.right = true; else out.left = true; }
      // (just off a climb: let go for a moment before starting the next one, as a person has to)
      else if (mv.k === 'up') { if (!(h.mode === 'stand' && h.climbLock)) out.jump = true; }
      else if (mv.k === 'down') { if (!(h.mode === 'stand' && h.climbLock)) out.down = true; }
      if (solo && id === st.soother && st.h[oid].mode !== 'tumble' && M().atShard(st, st.h[oid]) && !pl.act[id]) cpuSay(p, 'Coming! Wait for my chime', 1.6);
      return out;
    },
  });
})();

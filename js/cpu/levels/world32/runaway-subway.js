/* Pip & Bo - Computer partner brain for 32-1 Runaway Subway (mode 'subway'). */
'use strict';

(() => {
  /* 32-1 Runaway Subway (MODES.subway): G.mst.zoom says who is the speedster this stretch; the other is the strong hero.
     Both jobs read MODES.subway.plan(st), the same plan the prompts and the HUD chips read.
     SPEEDSTER: runs to the next glowing lever and holds the action to pull it, but only starts a pull when the strong
       hero is under the girder spot (or the girder is already held) and no crate will arrive before the pull is done;
       a crate about to hit means let go and jump. It hops tokens that hang just ahead when nothing is coming.
     BOTH fetch every token on their own track first (coinFor): missed ones behind the next lever, and the whole last
       car before its lever (pulling the last lever stops the train); a high token means stand under it and jump.
     STRONG HERO: walks to the spot over the next lever before the pull starts, holds the action as soon as a girder is
       coming and keeps holding it until the lever clunks; ducks (▼) just before a pipe reaches it.
     With a person partner it says what it needs ("I'm under it, pull!", "Hold it up!"). It can't finish alone: the
     level takes a break after 12 s with no person pressing anything, and the shared idle stop (CPU.idleStop) waits as
     well. Team brains always play at full skill. */
  const M = () => MODES.subway;
  // the token this hero should fetch next (null: none, get on with the levers). Tokens of a car sit between its
  // lever and the next car's, so ones behind the next lever were missed; past the last lever, sweep before pulling it.
  function coinFor(st, me, zoom, L) {
    if (!L) return null;
    const last = st.levers.filter(l => !l.done).length === 1, floor = zoom ? 448 : 228;
    let best = null, bd = 1e9;
    for (const q of st.toks) {
      if (q.got || q.roof === zoom || (!last && q.x > L.x + 20)) continue;
      const d = Math.abs(q.x - me.x);
      if (d < bd) { bd = d; best = q; }
    }
    return best && { x: best.x, hi: best.y < floor - 60 };
  }
  cpuBrain('subway', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.levers || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), me = st.run[p.id], zoom = p.id === st.zoom, job = zoom ? pl.zoom : pl.lift;
      if (me.stun > 0) return out;
      let tx = job.x;
      // tokens: go for every one on my own track (roof or walkway) while the lever job can wait: ones left behind
      // the next lever, and before the last lever of a stretch all the rest (the train stops once it's pulled)
      const coin = !(me.pulling || job.act || job.down || job.jump || me.st === 'hold' || (!zoom && st.beam)) && coinFor(st, me, zoom, pl.L);
      if (coin) tx = coin.x;
      const dx = tx - me.x;
      const still = (zoom && (me.pulling || job.act)) || (!zoom && (me.st === 'hold' || job.down));
      if (!still) { if (dx > 6) out.right = true; else if (dx < -6) out.left = true; }
      if (job.act) out.act = true;
      if (job.down) out.down = true;
      if (job.jump) out.jump = 'tap';
      // a high token: stop under it and jump straight up
      if (coin && coin.hi && me.grounded && Math.abs(dx) < 14 && Math.abs(me.vx) < 90 && (zoom ? pl.crateT > 0.5 : pl.pipeT > 0.5)) out.jump = 'tap';
      // a token hanging just ahead: hop for it when nothing is coming and we're not busy
      if (!out.jump && !still && me.grounded && (zoom ? pl.crateT > 0.9 : pl.pipeT > 0.9)) {
        const roof = !zoom, dir = out.right ? 1 : out.left ? -1 : 0;
        if (dir && st.toks.some(q => !q.got && q.roof === roof && (q.y < me.y - 60) && (q.x - me.x) * dir > 8 && (q.x - me.x) * dir < 40)) out.jump = 'tap';
      }
      if (!info.partnerCpu) {
        if (zoom && pl.stage === 'pull' && !pl.ready) cpuSay(p, 'Stand over my lever and catch the girder!', 1.4);
        else if (!zoom && pl.ready && pl.L && !st.run[st.zoom].pulling && Math.abs(st.run[st.zoom].x - pl.L.x) < 30) cpuSay(p, 'I\'m under it! Pull!', 1.2);
        else if (zoom && st.beam && st.beam.state !== 'held') cpuSay(p, 'Catch it!', 1.0);
        else if (!zoom && st.beam && st.beam.state === 'held') cpuSay(p, 'Got it! Keep pulling!', 1.2);
      }
      return out;
    },
  });
})();

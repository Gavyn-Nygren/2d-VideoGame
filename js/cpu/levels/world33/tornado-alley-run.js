/* Pip & Bo - Computer partner brain for 33-1 Tornado Alley Run (mode 'tornadorun'). */
'use strict';

(() => {
  /* 33-1 Tornado Alley Run (MODES.tornadorun): G.mst.drv is the driver this stretch, G.mst.spt the spotter. Both jobs
     read MODES.tornadorun.plan(st), the same plan the prompts and the HUD chips read.
     DRIVER: looks at how much free road each lane has (a cow counts in every lane it may wander into) and changes one
       lane at a time when its lane closes up within 1.7 s and a neighbour is clearly better. It sticks with a lane for
       at least 0.3 s (no twitching), honks as a broken bridge arrives (and otherwise only when the tornado is close and
       no bridge is due), and eases forward when the road is calm. It never changes lane while the dish is loose.
     SPOTTER: watches the junk that lands soonest: aims at it (one step at a time, like a person), swings when it is
       about 0.3 s from landing, holds the action to brace for a cow, ducks for a low bridge and aims straight up to swing
       the loose dish back on. It keeps an aim target for at least 0.3 s.
     It talks to a person partner ("Cow! Brace!", "Bridge out, honk!"). It can't finish alone: the level takes a break
     after 12 s with no person pressing anything, and the shared idle stop (CPU.idleStop) waits as well. Team brains
     always play at full skill. */
  const M = () => MODES.tornadorun;
  cpuBrain('tornadorun', {
    reset(S) { S.laneT = 0; S.aimT = 0; S.aimTo = 3; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.obs || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st);
      S.laneT -= dt; S.aimT -= dt;
      if (p.id === st.drv) {
        if (pl.drv.lane !== st.lane && S.laneT <= 0 && Math.abs(st.laneF - st.lane) < 0.05) {
          if (pl.drv.lane < st.lane) out.jump = 'tap'; else out.down = true;
          S.laneT = 0.3;
        }
        if (pl.drv.horn) out.act = 'tap';
        if (st.vx < pl.drv.x - 12) out.right = true; else if (st.vx > pl.drv.x + 12) out.left = true;
        if (!info.partnerCpu) {
          const f = pl.spt.f;
          if (f && f.size === 'cow' && f.T - f.t < 1.2) cpuSay(p, 'A cow! Hold to brace!', 1.2);
          else if (f && f.size === 'large' && f.T - f.t < 1.0) cpuSay(p, 'Big one! Swing!', 1.0);
          else if (pl.low < 1.6) cpuSay(p, 'Low bridge! Duck!', 1.2);
          else if (st.dish) cpuSay(p, 'Aim up and fix the dish!', 1.2);
        }
        return out;
      }
      // the spotter
      const O = st.spot;
      if (pl.spt.down) { out.down = true; return out; }
      if (S.aimT <= 0 || pl.spt.why === 'dish') { S.aimTo = pl.spt.aim; S.aimT = 0.3; }
      // hold the direction until the aim gets there (the game steps it one notch at a time)
      if (O.aim !== S.aimTo && !(O.sw >= 0 && O.sw < 0.32)) { if (S.aimTo > O.aim) out.right = true; else out.left = true; }
      if (pl.spt.act === 'tap') out.act = 'tap';
      else if (pl.spt.act === 'hold') out.act = true;
      if (!info.partnerCpu) {
        if (pl.ramp < 1.6 && st.hornCd <= 0) cpuSay(p, 'Bridge out! Honk!', 1.2);
        else if (pl.low < 1.8 && st.lane !== 1) cpuSay(p, 'Middle lane for the bridge!', 1.2);
        else if (pl.drv.lane !== st.lane && pl.drv.clear[st.lane] < 1.0) cpuSay(p, pl.drv.lane < st.lane ? 'Move up a lane!' : 'Move down a lane!', 1.0);
      }
      return out;
    },
  });
})();

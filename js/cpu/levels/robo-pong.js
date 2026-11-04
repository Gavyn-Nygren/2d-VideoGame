/* Pip & Bo - Computer partner: 2-3 Robo Pong. */
'use strict';

(() => {
  /* The computer is one of the two paddles on the team side (Pip top half, Bo bottom half).
     - It watches the ball a moment late (reaction time) and works out where it will cross the paddle line, bouncing off
       the walls, the way a person traces it with their eyes. Its read is a bit off, more for steep balls and wall
       bounces and fast balls, and less on hard. It is further off while the ball is far and firms up as it comes close,
       but some of the misread is left when the ball arrives: that is how it misses.
     - A ball heading into its half: it meets it, a little off centre on purpose to send it at an angle, away from where
       Robo's paddle is (sharper on hard). A ball heading into the partner's half: it waits at the edge of its own half
       nearest the line, in case the partner's ball is close to it. Ball going away: back to the middle of its half.
     - It moves with full presses and lets go early to stop on the spot (the paddle brakes by itself). */
  // its misread when the ball arrives (px, about 3x the spread): a little always, more for steep balls, wall bounces
  // and fast balls, and less the higher the skill (x (skill - info.skill))
  const PONG_CPU = { err: 10, steep: 80, bounce: 30, fast: 1.5, skill: 1.4 };
  const FACE = () => PONG.padX + PONG.padW + PONG.r; // where the ball's centre is when it meets our paddles
  const ROBO = () => PONG.aiX - PONG.r;

  // where a ball (x, y, vx, vy) crosses x = tx, bouncing off the top and bottom walls; n = wall bounces on the way
  function predict(s, tx) {
    const lo = PONG.top + PONG.r, span = PONG.bot - PONG.r - lo;
    if (Math.abs(s.vx) < 1) return { y: s.y, n: 0, t: Infinity };
    const t = Math.max(0, (tx - s.x) / s.vx), u = s.y + s.vy * t - lo;
    let y = (u % (2 * span) + 2 * span) % (2 * span);
    if (y > span) y = 2 * span - y;
    return { y: y + lo, n: Math.floor(Math.abs(u) / span + (u < 0 ? 1 : 0)), t };
  }
  // a bell-shaped random number, -1..1 (spread about 1/3)
  const bell = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  cpuBrain('pong', {
    reset(st) { st.ballId = -1; st.err = 0; st.aim = 0; },
    think(st, p, o, dt, info) {
      const out = {}, P = G.pong;
      if (!P || info.intro) return out;
      const k = p.id, pd = P.pads[k], b = P.ball, sk = info.skill, half = PONG.padH / 2;
      const lo = (k === 0 ? PONG.top : PONG.mid) + half, hi = (k === 0 ? PONG.mid : PONG.bot) - half; // where its centre can go
      // what it sees: the ball as it was a moment ago
      const react = 0.2 - 0.1 * sk;
      const seen = cpuLag(st, 'ball', { x: b.x, y: b.y, vx: b.vx, vy: b.vy, live: P.phase === 'play', rally: P.rally }, react);
      let target = (lo + hi) / 2 + (k === 0 ? 1 : -1) * 20; // home: the middle of its half, a little toward the line
      if (seen.live && seen.vx < 0) {
        const at = predict(seen, FACE());
        // a new ball coming our way (after each hit): how far off its read is, and where on the paddle it means to hit
        const id = P.score[0] * 1000 + P.score[1] * 100000 + seen.rally;
        if (id !== st.ballId) {
          st.ballId = id;
          const steep = Math.abs(seen.vy / seen.vx), fast = seen.vx ? Math.abs(seen.vx) / PONG.speed : 1;
          // (the misread it is left with when the ball arrives; the read is worse while the ball is far)
          const sig = (PONG_CPU.err + PONG_CPU.steep * steep + PONG_CPU.bounce * at.n) * Math.pow(fast, PONG_CPU.fast) * (PONG_CPU.skill - sk);
          st.err = bell() * sig;
          // aim off centre: sharper on hard. It keeps a margin so its own wobble seldom makes it miss.
          const sure = 0.6 * sig + 2;
          const mag = Math.max(0, Math.min(0.45 + 0.45 * sk, 0.25 + Math.random() * 1.2 * sk) * (half + PONG.r) - sure);
          // which way: the return that lands farther from Robo's paddle (easy just picks one)
          const ai = P.ai.y + pongAiH() / 2;
          const land = off => { const a = off / (half + PONG.r) * PONG.maxAngle * Math.PI / 180; return predict({ x: FACE(), y: at.y, vx: 1, vy: Math.tan(a) }, ROBO()).y; };
          const s = sk < 0.5 ? (Math.random() < 0.5 ? 1 : -1) : Math.abs(land(mag) - ai) > Math.abs(land(-mag) - ai) ? 1 : -1;
          st.aim = s * mag;
        }
        // its read firms up as the ball comes close
        const near = clamp((seen.x - FACE()) / 500, 0, 1), left = st.err * (1 + 1.5 * near);
        const y = at.y + left;
        // inside its half (with the paddle's reach): meet it; otherwise wait at the edge nearest the ball
        target = y - st.aim;
        if (target < lo - half || target > hi + half) target = y;
      }
      target = clamp(target, lo, hi);
      // full presses, letting go in time to stop on the spot (the paddle brakes at PONG.padAcc)
      const c = pd.y + half, d = target - c, stop = pd.vy * pd.vy / (2 * PONG.padAcc), dead = 3 + (1 - sk) * 3;
      if (d > dead && !(pd.vy > 0 && stop >= d - 1)) out.down = true;
      else if (d < -dead && !(pd.vy < 0 && stop >= -d - 1)) out.up = true;
      return out;
    },
  });
})();

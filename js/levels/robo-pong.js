/* Pip & Bo - Levels: Robo Pong, including the robot opponent and its drawing. */
'use strict';

/* ---------- Robo Pong: Pip and Bo share one side against a robot paddle ---------- */
// Pip guards the top half of the left side and Bo the bottom half. Robo's paddle is 50% longer
// and can go anywhere on its side. Every paddle or wall hit speeds the ball up by 1% (it compounds), and the
// speed goes back to normal after each point. First to 7 wins.
const PONG = {
  top: 60, bot: 510, mid: 285,          // the court between the walls; mid splits Pip's half from Bo's
  padW: 16, padH: 64, aiScale: 1.5,     // Robo's paddle is 1.5x as long
  padX: 40, aiX: 960 - 40 - 16,         // left edge of the paddles
  padSpeed: 590, padAcc: 7000,
  r: 9, speed: 590, speedUp: 0.01,      // ball radius, base speed, +1% per hit (compounding)
  maxAngle: 50, target: 7, serveT: 1.1, pointT: 1.4,
  serveToRobo: true,                    // every serve goes to Robo first, so you never have to return a serve cold
  serveMin: 8, serveMax: 16,            // serve angle range (deg), up or down: never straight at the line between Pip and Bo
  aiSpeed: 260, aiAcc: 2400, aiReact: 0.14,
  aiAim: 0.68,                          // Robo dares to hit up to this share of its half-length off centre (its sharpest angle)
  aiSharp: 0.95, aiPatience: 14, aiPush: 0.03, aiDare: 0.005, aiEase: 0.35, // chance of a sharp return; per hit after aiPatience hits: +aiPush chance, +aiDare sharper; -aiEase chance per point it's ahead
  aiErr: 2.3, aiSteep: 29, aiBounce: 9, // how far off Robo reads a ball (px): a little always, more the steeper it is, more per wall bounce
  aiSafe: 0.4,                          // it keeps this many times its read error between the ball and its paddle edge (fades in long rallies)
  aiLate: 0.08,                         // Robo only fixes its misread this long (s) before the ball arrives, so it lunges at hard ones
  aiCatchup: 1, aiSlip: 0.015,          // per point Robo is ahead: it reads hard balls this much worse, and this chance it fumbles one
  aiFight: 0.5,                         // per point Robo is behind: it reads hard balls this much better
  aiAdapt: 2.8, aiFormRef: 0.92, aiLevelMin: 0.45, aiLevelMax: 3.05, // plays to your level: per 10% of balls you return below aiFormRef, it reads hard balls this much worse (and better above it, down to aiLevelMin)
  aiHelpMax: 5,                         // but form and score together never make it read hard balls more than this much worse
  aiFirst: 1,                           // chance its return of the serve is a gentle one, so every point starts with a fair ball
  aiFirstSpread: 0.5, aiFirstErr: 1,    // that gentle ball goes to the middle of Pip's or Bo's half, give or take this share of a quarter court; Robo's read error on it (x aiErr)
  aiFast: 0.9,                          // the faster the ball has got this point, the worse Robo reads it: +this share of its read error per 100% faster
  aiPick: 2,                            // how many spots on your side Robo weighs for a return; it takes the one farthest from your paddles
  aiPress: 0.3, aiPressAim: 0.36,       // plays to your level in its returns too: per step of level below 1 (you return nearly everything), +this chance of a sharp return and +this sharper
  aiGentleFrom: 2, aiGentle: 2,         // and once its level is above aiGentleFrom (you've been missing a lot), it goes gentler (and safer) aiGentle times as fast
};
PONG.rand = Math.random; // tests can swap in a seeded random
const pongAiH = () => PONG.padH * PONG.aiScale;
function setupPong() {
  const P = { score: [0, 0], phase: 'serve', t: 0, serveDir: -1, rally: 0, form: PONG.aiFormRef, longest: 0, hits: [0, 0], aiHits: 0, last: -1, msg: null, hintT: 7,
    pads: [{ y: (PONG.top + PONG.mid - PONG.padH) / 2, vy: 0, hitT: 0 }, { y: (PONG.mid + PONG.bot - PONG.padH) / 2, vy: 0, hitT: 0 }],
    ai: { y: (PONG.top + PONG.bot - pongAiH()) / 2, vy: 0, err: 0, aim: 0, react: 0, hitT: 0 },
    ball: { x: W / 2, y: (PONG.top + PONG.bot) / 2, vx: 0, vy: 0, speed: PONG.speed, trail: [] } };
  G.pong = P;
  // nobody runs around in this one: you ARE the paddles
  for (const p of G.players) Object.assign(p, makePlayer(p.id), { alive: false, respawnT: Infinity, prevJump: true });
  pongServe(PONG.serveToRobo ? 1 : -1);
}
function pongServe(dir) {
  const P = G.pong, b = P.ball;
  Object.assign(b, { x: W / 2, y: (PONG.top + PONG.bot) / 2, vx: 0, vy: 0, speed: PONG.speed, trail: [] });
  P.phase = 'serve'; P.t = 0; P.serveDir = dir; P.rally = 0;
}
function pongLaunch() {
  const P = G.pong, b = P.ball;
  const a = (PONG.rand() < 0.5 ? -1 : 1) * (PONG.serveMin + PONG.rand() * (PONG.serveMax - PONG.serveMin)) * Math.PI / 180;
  b.vx = P.serveDir * b.speed * Math.cos(a); b.vy = b.speed * Math.sin(a);
  P.phase = 'play'; P.t = 0;
  if (b.vx > 0) pongAiPlan();
  Sfx.play('serve');
}
// Robo's plan for the ball now coming its way: how far off its read of the ball is (err) and where on its paddle it
// means to hit it (aim, which sets the angle of the return).
function pongAiPlan() {
  const P = G.pong, ai = P.ai, b = P.ball, d = P.score[1] - P.score[0], lead = Math.max(0, d);
  const g = (PONG.rand() + PONG.rand() + PONG.rand() - 1.5) * 2; // roughly -3..3, bell shaped
  const at = pongPredict(PONG.aiX - PONG.r), edge = pongAiH() / 2 + PONG.r;
  // it reads flat balls well and misjudges steep ones and ones that bounce off a wall on the way;
  // when it's ahead it gets careless (and now and then fumbles one), when it's behind it concentrates
  // it also plays to your level: the more balls you've been missing lately, the worse it reads the hard ones
  // and the faster the ball has got this point, the worse it reads every ball
  const fast = 1 + PONG.aiFast * (b.speed / PONG.speed - 1);
  const hard = PONG.aiSteep * Math.abs(b.vy / b.vx) + PONG.aiBounce * at.n, read = (PONG.aiErr + hard) * fast;
  const level = clamp(1 + PONG.aiAdapt * (PONG.aiFormRef - P.form) * 10, PONG.aiLevelMin, PONG.aiLevelMax);
  ai.err = g * fast * (PONG.aiErr + hard * Math.min(PONG.aiHelpMax, level * (d > 0 ? 1 + d * PONG.aiCatchup : 1 / (1 - d * PONG.aiFight))));
  // the return: it only dares to hit off-centre when it's sure of the ball (it keeps aiSafe times its read error
  // clear of its paddle edge). Usually it sends the ball to some spot on your side; sometimes a sharp angle. The
  // longer the rally goes, the more often and the sharper it goes for it, and the less careful it is; when it's ahead
  // it goes for it less often. It looks at where your paddles are and picks the more open of a few spots (aiPick)
  const long = Math.max(0, P.rally - PONG.aiPatience);
  // press > 0: you're returning nearly everything, so it pushes harder; < 0: you've been missing a lot, so it plays gentler
  const press = level < 1 ? 1 - level : -Math.max(0, level - PONG.aiGentleFrom) * PONG.aiGentle;
  const safe = Math.max(0, edge - PONG.aiSafe * Math.max(0, 1 - long / PONG.aiPatience) * read);
  const picks = Math.max(1, Math.floor(PONG.aiPick) + (PONG.rand() < PONG.aiPick % 1 ? 1 : 0));
  // its return of the serve is a friendly one: a gentle ball to near the middle of Pip's or Bo's half
  const quarter = (PONG.mid - PONG.top) / 2;
  if (P.rally === 0 && PONG.rand() < PONG.aiFirst) {
    ai.aim = clamp(pongAimFor(at.y, (PONG.rand() < 0.5 ? PONG.top : PONG.mid) + quarter * (1 - PONG.aiFirstSpread + 2 * PONG.aiFirstSpread * PONG.rand())), -safe, safe);
    ai.err = g * PONG.aiErr * PONG.aiFirstErr; // and it takes care over it, so it really does go there
  }
  else if (PONG.rand() < PONG.aiSharp + long * PONG.aiPush - lead * PONG.aiEase + press * PONG.aiPress) {
    const s = Math.min(safe, clamp(PONG.aiAim + long * PONG.aiDare + press * PONG.aiPressAim, 0.2, 0.95) * edge);
    ai.aim = (picks > 1 ? pongOpen(pongLand(at.y, s)) > pongOpen(pongLand(at.y, -s)) : PONG.rand() < 0.5) ? s : -s;
  } else {
    let best = -1;
    for (let i = 0; i < picks; i++) {
      const aim = clamp(pongAimFor(at.y, PONG.top + PONG.r + PONG.rand() * (PONG.bot - PONG.top - 2 * PONG.r)), -safe, safe);
      const open = pongOpen(pongLand(at.y, aim));
      if (open > best) { best = open; ai.aim = aim; }
    }
  }
  // a fumble: it ends up just a little too far off and misses by a whisker
  if (PONG.rand() < PONG.aiSlip * lead) ai.err = (PONG.rand() < 0.5 ? -1 : 1) * (edge + 10 + 25 * PONG.rand()) - ai.aim;
  ai.react = P.rally === 0 ? 0 : PONG.aiReact; // it watches the serve all the way, so its gentle ball goes where it means it to
}
// where Robo's return, met at height yh with this aim, crosses your paddles (bouncing off the walls)
function pongLand(yh, aim) {
  const lo = PONG.top + PONG.r, span = PONG.bot - PONG.r - lo, dx = PONG.aiX - PONG.padX - PONG.padW - 2 * PONG.r;
  const a = -aim / (pongAiH() / 2 + PONG.r) * PONG.maxAngle * Math.PI / 180;
  const y = ((yh + Math.tan(a) * dx - lo) % (2 * span) + 2 * span) % (2 * span);
  return (y > span ? 2 * span - y : y) + lo;
}
// how far a spot on your side is from the nearer of your two paddles right now
const pongOpen = (y) => Math.min(...G.pong.pads.map(pd => Math.abs(y - pd.y - PONG.padH / 2)));
// how far from the ball Robo's paddle centre should be (px) to send a ball it meets at height yh back to height ty
function pongAimFor(yh, ty) {
  const lo = PONG.top + PONG.r, hi = PONG.bot - PONG.r, dx = PONG.aiX - PONG.padX - PONG.padW - 2 * PONG.r;
  let a = Infinity;
  for (const y of [ty, 2 * lo - ty, 2 * hi - ty]) { const t = Math.atan2(y - yh, dx); if (Math.abs(t) < Math.abs(a)) a = t; } // straight, or off a wall
  return -clamp(a / (PONG.maxAngle * Math.PI / 180), -PONG.aiAim, PONG.aiAim) * (pongAiH() / 2 + PONG.r);
}
// where the ball will cross x (bouncing off the top and bottom walls), and how many wall bounces that takes
function pongPredict(x) {
  const b = G.pong.ball, lo = PONG.top + PONG.r, span = PONG.bot - PONG.r - lo;
  if (Math.abs(b.vx) < 1) return { y: b.y, n: 0 };
  const u = b.y + b.vy * Math.max(0, (x - b.x) / b.vx) - lo;
  let y = (u % (2 * span) + 2 * span) % (2 * span);
  if (y > span) y = 2 * span - y;
  return { y: y + lo, n: Math.floor(Math.abs(u) / span + (u < 0 ? 1 : 0)) };
}
function pongAI(dt) {
  const P = G.pong, ai = P.ai, b = P.ball, h = pongAiH();
  let target = (PONG.top + PONG.bot) / 2; // wait in the middle
  if (P.phase === 'play' && b.vx > 0) {
    ai.react -= dt;
    // it heads for where it reads the ball will arrive, and only fixes its misread in the last aiLate seconds
    const late = clamp((PONG.aiX - PONG.r - b.x) / b.vx / PONG.aiLate, 0, 1);
    target = ai.react > 0 ? ai.y + h / 2 : pongPredict(PONG.aiX - PONG.r).y + ai.aim + ai.err * late;
  }
  const d = target - (ai.y + h / 2);
  const want = clamp(d * 9, -PONG.aiSpeed, PONG.aiSpeed);
  ai.vy = approach(ai.vy, want, PONG.aiAcc * dt);
  ai.y += ai.vy * dt;
  if (ai.y < PONG.top) { ai.y = PONG.top; ai.vy = 0; }
  if (ai.y > PONG.bot - h) { ai.y = PONG.bot - h; ai.vy = 0; }
}
function pongBounce(dir, cy, half, who) {
  const P = G.pong, b = P.ball;
  const off = clamp((b.y - cy) / (half + PONG.r), -1, 1);
  const a = off * PONG.maxAngle * Math.PI / 180;
  b.speed *= 1 + PONG.speedUp;
  b.vx = dir * b.speed * Math.cos(a); b.vy = b.speed * Math.sin(a);
  P.rally++; P.last = who;
  if (who < 2) {
    P.hits[who]++; P.pads[who].hitT = 0.25;
    P.form += (1 - P.form) * 0.1; // how well you've been returning balls lately (about the last ten)
    pongAiPlan();
    Sfx.play('paddle', who); rumble(who, 0.15, 0.45, 70);
  } else { P.aiHits++; P.ai.hitT = 0.25; Sfx.play('robo'); }
  for (let k = 0; k < 6; k++) G.particles.push({ x: b.x - dir * PONG.r, y: b.y, vx: dir * (60 + PONG.rand() * 140), vy: (PONG.rand() - 0.5) * 220, life: 0.3, max: 0.3, col: who < 2 ? PCOL[who] : '#c6cbe0', size: 3 + PONG.rand() * 2, grav: 0, kind: 'dot' });
}
function pongPoint(side) {
  const P = G.pong, b = P.ball;
  P.score[side]++; P.longest = Math.max(P.longest, P.rally);
  if (side === 1) P.form -= P.form * 0.1;
  P.phase = P.score[side] >= PONG.target ? 'over' : 'point'; P.t = 0;
  b.trail.length = 0; // no frozen ghost balls at the edge while the point sinks in
  const won = P.phase === 'over';
  P.msg = { text: side === 0 ? (won ? 'Pip & Bo win!' : 'Point, Pip & Bo!') : (won ? 'Robo wins!' : 'Robo scores!'), col: side === 0 ? C.gold : '#ff8a98', t: PONG.pointT };
  burst(clamp(b.x, 20, W - 20), b.y, side === 0 ? C.gold : '#c6cbe0', 16);
  if (!reduceMotion) G.shake = 0.2;
  if (side === 0) { Sfx.play('pointUs'); rumble(0, 0.2, 0.5, 160); rumble(1, 0.2, 0.5, 160); }
  else { Sfx.play('pointRobo'); rumble(0, 0.5, 0.3, 200); rumble(1, 0.5, 0.3, 200); }
  P.serveDir = PONG.serveToRobo || side === 0 ? 1 : -1; // the next serve goes to whoever lost the point (or always to Robo)
}
function pongStep(dt) {
  const P = G.pong, b = P.ball, r = PONG.r;
  P.t += dt; P.hintT -= dt;
  if (P.msg) { P.msg.t -= dt; if (P.msg.t <= 0) P.msg = null; }
  // the two of you: up and down, each in your own half
  for (let k = 0; k < 2; k++) {
    const inp = G.players[k].input, pd = P.pads[k];
    const dir = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
    pd.vy = approach(pd.vy, dir * PONG.padSpeed, PONG.padAcc * dt);
    const lo = k === 0 ? PONG.top : PONG.mid, hi = (k === 0 ? PONG.mid : PONG.bot) - PONG.padH;
    pd.y += pd.vy * dt;
    if (pd.y < lo) { pd.y = lo; pd.vy = 0; }
    if (pd.y > hi) { pd.y = hi; pd.vy = 0; }
    pd.hitT -= dt;
    G.players[k].pendingJump = false;
  }
  P.ai.hitT -= dt;
  pongAI(dt);
  if (P.phase === 'serve') { if (P.t >= PONG.serveT && G.introT <= 0) pongLaunch(); return; }
  if (P.phase === 'point') { if (P.t >= PONG.pointT) pongServe(P.serveDir); return; }
  if (P.phase === 'over') { if (P.t >= PONG.pointT) levelClear(); return; }
  // the ball, in small steps so it can't skip through a paddle
  const n = Math.max(1, Math.ceil(b.speed * dt / 4));
  for (let i = 0; i < n; i++) {
    const px = b.x;
    b.x += b.vx * dt / n; b.y += b.vy * dt / n;
    if (b.y - r < PONG.top || b.y + r > PONG.bot) {
      const up = b.y + r > PONG.bot;
      b.y = up ? PONG.bot - r : PONG.top + r;
      b.speed *= 1 + PONG.speedUp;
      const m = b.speed / Math.hypot(b.vx, b.vy);
      b.vx *= m; b.vy = (up ? -1 : 1) * Math.abs(b.vy) * m;
      Sfx.play('wall');
    }
    if (b.vx < 0) {
      const face = PONG.padX + PONG.padW, crossed = b.x - r <= face && px - r >= face - 0.5;
      for (let k = 0; k < 2; k++) {
        const pd = P.pads[k];
        // the face, or the round end of the paddle once the ball is past the face (a steep ball, or a
        // paddle that got there just in time): either way it's a hit, never a ball sliding through it
        const nx = clamp(b.x, PONG.padX, face), ny = clamp(b.y, pd.y, pd.y + PONG.padH);
        const hit = crossed ? b.y + r >= pd.y && b.y - r <= pd.y + PONG.padH
          : b.x >= PONG.padX && b.x - r < face && (b.x - nx) ** 2 + (b.y - ny) ** 2 <= r * r;
        if (hit) { if (crossed) b.x = face + r; pongBounce(1, pd.y + PONG.padH / 2, PONG.padH / 2, k); break; }
      }
    } else {
      const face = PONG.aiX, h = pongAiH();
      if (b.x + r >= face && px + r <= face + 0.5 && b.y + r >= P.ai.y && b.y - r <= P.ai.y + h) { b.x = face - r; pongBounce(-1, P.ai.y + h / 2, h / 2, 2); }
    }
    if (b.x + r < 0) { pongPoint(1); return; }
    if (b.x - r > W) { pongPoint(0); return; }
  }
  if ((G.tickN & 3) === 0) { b.trail.push([b.x, b.y]); if (b.trail.length > 8) b.trail.shift(); }
}

function pongKeys(id) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  return pad ? 'stick ↑ ↓' : touch ? '▲ ▼' : id === 0 ? 'W  S' : '↑  ↓';
}
// a paddle with a face: Pip and Bo stretched tall, and Robo
function drawPaddleFace(x, y, w, h, who) {
  const P = G.pong, b = P.ball;
  const cx = x + w / 2, ey = y + Math.min(22, h * 0.28);
  const lx = clamp((b.x - cx) / 300, -1, 1) * 2.2, ly = clamp((b.y - ey) / 200, -1, 1) * 2;
  if (who < 2) {
    const col = PCOL[who], dark = PDARK[who];
    if (who === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const ex of [x + 3, x + w - 3]) { circle(ex, y + 1, 5); ctx.fill(); ctx.stroke(); } }
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
    rr(x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x + 3, y + 3, 4, h - 6, 2); ctx.fill();
    if (who === 0) {
      ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 1, y - 6); ctx.stroke();
      ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(cx + 5, y - 8, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const ex of [cx - 3.5, cx + 3.5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + lx * 0.5, ey, 3, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + lx, ey + ly * 0.6, 1.7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(cx, ey + 9, 2.2); ctx.fill();
  } else {
    // Robo: a metal paddle with a visor and an antenna
    ctx.strokeStyle = '#5d6485'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y - 10); ctx.stroke();
    ctx.fillStyle = (G.clock % 1) < 0.5 ? '#ff5a6e' : '#ffd25e'; circle(cx, y - 12, 3.2); ctx.fill();
    ctx.fillStyle = '#c6cbe0'; ctx.strokeStyle = '#5d6485'; ctx.lineWidth = 2.5;
    rr(x, y, w, h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(x + 3, y + 3, 4, h - 6, 2); ctx.fill();
    ctx.fillStyle = '#5d6485';
    for (let k = 1; k <= 3; k++) ctx.fillRect(x + 4, y + h - 8 * k - 4, w - 8, 2);
    ctx.fillStyle = '#2b2f4a'; rr(x + 2, ey - 7, w - 4, 14, 4); ctx.fill();
    ctx.fillStyle = '#ff5a6e'; circle(cx + lx * 0.8, ey + ly * 1.2, 3.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,90,110,0.35)'; circle(cx + lx * 0.8, ey + ly * 1.2, 6); ctx.fill();
  }
}
function drawPong() {
  const P = G.pong, b = P.ball;
  // the court: centre line, and each player's half on the left
  ctx.save();
  ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(0, PONG.top, W, PONG.bot - PONG.top);
  // a painted court: soft stripes, side lines, a centre circle and spot
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < W; x += 120) ctx.fillRect(x, PONG.top, 60, PONG.bot - PONG.top);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, PONG.top + 3); ctx.lineTo(W, PONG.top + 3); ctx.moveTo(0, PONG.bot - 3); ctx.lineTo(W, PONG.bot - 3); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  circle(W / 2, (PONG.top + PONG.bot) / 2, 64); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(W / 2, (PONG.top + PONG.bot) / 2, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,107,74,0.10)'; ctx.fillRect(0, PONG.top, 110, PONG.mid - PONG.top);
  ctx.fillStyle = 'rgba(91,149,255,0.10)'; ctx.fillRect(0, PONG.mid, 110, PONG.bot - PONG.mid);
  ctx.setLineDash([12, 12]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(W / 2, PONG.top + 8); ctx.lineTo(W / 2, PONG.bot); ctx.stroke();
  ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(28,26,54,0.35)';
  ctx.beginPath(); ctx.moveTo(0, PONG.mid); ctx.lineTo(110, PONG.mid); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 0.5;
  text('Pip', 84, PONG.top + 18, 16, C.pip, 'center');
  text('Bo', 84, PONG.bot - 16, 16, C.bo, 'center');
  ctx.globalAlpha = 1;
  // paddles
  for (let k = 0; k < 2; k++) {
    const pd = P.pads[k], sq = pd.hitT > 0 ? 3 * pd.hitT / 0.25 : 0;
    drawPaddleFace(PONG.padX - sq, pd.y, PONG.padW, PONG.padH, k);
  }
  const sqa = P.ai.hitT > 0 ? 3 * P.ai.hitT / 0.25 : 0;
  drawPaddleFace(PONG.aiX + sqa, P.ai.y, PONG.padW, pongAiH(), 2);
  // how to move, at the start (under the ball, so the pills never hide it)
  if (P.hintT > 0) {
    ctx.save(); ctx.globalAlpha = clamp(P.hintT / 0.6, 0, 1);
    for (let k = 0; k < 2; k++) {
      const s = NAMES[k] + (cpuSolo() && cpuOn(k) ? ' is the computer' : ': ' + pongKeys(k) + ' to move');
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(s).width + 26, y = k === 0 ? (PONG.top + PONG.mid) / 2 : (PONG.mid + PONG.bot) / 2;
      pill(PONG.padX + 34, y - 13, w, 26);
      text(s, PONG.padX + 47, y + 0.5, 13, PCOL[k], 'left', 'body');
    }
    ctx.restore();
  }
  // ball and its trail
  if (P.phase !== 'serve' || (P.t * 4) % 1 < 0.6) {
    b.trail.forEach(([tx, ty], k) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + 0.05 * k) + ')'; circle(tx, ty, PONG.r * (0.5 + k / 16)); ctx.fill(); });
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; circle(b.x + 2, b.y + 3, PONG.r); ctx.fill();
    ctx.fillStyle = '#fffaf0'; circle(b.x, b.y, PONG.r); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(b.x, b.y, PONG.r); ctx.stroke();
  }
}
function drawPongHUD() {
  const P = G.pong;
  // the score
  pill(W / 2, 10, 316, 40, 'center');
  ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  let x = W / 2 - 50;
  for (const [t, c] of [['Bo', C.bo], [' & ', C.gold], ['Pip', C.pip]]) { text(t, x, 30.5, 17, c, 'right'); x -= ctx.measureText(t).width; }
  text(String(P.score[0]), W / 2 - 22, 30.5, 26, C.paper, 'center');
  text('–', W / 2, 30.5, 20, 'rgba(246,239,223,0.6)', 'center');
  text(String(P.score[1]), W / 2 + 22, 30.5, 26, C.paper, 'center');
  text('Robo', W / 2 + 50, 30.5, 17, '#c6cbe0', 'left');
  ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
  pill(W - 14, 14, 92, 24, 'right');
  text('First to ' + PONG.target, W - 60, 26.5, 12, C.gold, 'center', 'body');
  if (P.msg) {
    ctx.save(); ctx.globalAlpha = clamp(P.msg.t / 0.3, 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(W / 2 - 150, 200, 300, 56, 16); ctx.fill();
    text(P.msg.text, W / 2, 229, 26, P.msg.col, 'center');
    ctx.restore();
  }
}

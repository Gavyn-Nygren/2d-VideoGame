/* Pip & Bo - Computer opponent brain for 33-4 Twister Tag (mode 'twistertag'). */
'use strict';

(() => {
  /* 33-4 Twister Tag (MODES.twistertag): the computer is a twister too, reading MODES.twistertag.plan(st, id). It makes
     a new choice every reaction time (Easy 0.45 s, Normal 0.25 s, Hard 0.12 s, a little random) and steers there:
     FLEE when the other twister is 3+ sizes bigger and close (Normal and Hard dash away when it gets near);
     HUNT when it is 3+ sizes bigger itself (Hard aims where the other is going and cuts it off from the middle);
     otherwise GROW: the best thing it can lift for its value and distance (Hard really wants the shed; Easy just takes
     the nearest thing, even one too big to lift, drifts off somewhere every 4-8 s and only runs when it is close).
     It shoots (dash) when the other twister is lined up and close and the hit would let it swallow, or would knock back
     a twister that is nearly 3 bigger with a small thing; Hard leads its shots. A dash spits out its biggest thing, so
     it dashes away only at the last moment. Easy never dashes.
     It steers around the pond and the power lines and keeps off the wall cloud; Easy wanders into the pond now and
     then. Normal and Hard leave a thing alone while a power line is in the way to it (Easy goes for it and is zapped). Versus brains use the Opponent setting (info.skill). */
  const M = () => MODES.twistertag;
  cpuBrain('twistertag', {
    reset(S) { S.t = 0; S.dx = 0; S.dy = 0; S.fire = false; S.wet = false; S.mode = ''; S.wander = 0; S.wanderT = 3 + Math.random() * 3; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.tw || info.frozen) return out;
      const sk = info.skill, easy = sk < 0.5, hard = sk > 0.9;
      const pl = M().plan(st, p.id), A = pl.me;
      if (A.eaten || pl.them.eaten) return out;
      S.t -= dt;
      if (S.t <= 0) { S.lastDt = S.t0 || 0.25; S.t = S.t0 = (easy ? 0.45 : hard ? 0.12 : 0.25) * (0.8 + Math.random() * 0.4); decide(S, pl, easy, hard); }
      if (S.dx > 0.38) out.right = true; else if (S.dx < -0.38) out.left = true;
      if (S.dy > 0.38) out.down = true; else if (S.dy < -0.38) out.up = true;
      if (S.fire) { out.act = 'tap'; S.fire = false; }
      return out;
    },
  });
  function decide(S, pl, easy, hard) {
    const A = pl.me, B = pl.them, P = pl.pond, Bd = pl.bounds;
    let gx = 0, gy = 0;
    const toward = (x, y, w) => { const dx = x - A.x, dy = (y - A.y) * 1.3, d = Math.hypot(dx, dy) || 1; gx += dx / d * w; gy += dy / d * w; };
    const away = (x, y, w) => toward(2 * A.x - x, 2 * A.y - y, w);
    S.mode = 'grow';
    // Easy drifts off somewhere now and then
    S.wanderT = (S.wanderT === undefined ? 4 : S.wanderT) - S.lastDt;
    if (easy && S.wanderT <= 0) { S.wanderT = 4 + Math.random() * 4; S.wander = 1 + Math.random() * 1.2; S.wx = K2(Bd.x0, Bd.x1, Math.random()); S.wy = K2(Bd.y0, Bd.y1, Math.random()); }
    if (S.wander > 0) { S.wander -= S.lastDt; toward(S.wx, S.wy, 1); }
    else if (pl.threat && pl.dist < (easy ? 170 : 300)) {
      // run, toward open ground away from it
      S.mode = 'flee';
      away(B.x, B.y, 1.4);
      toward((Bd.x0 + Bd.x1) / 2, (Bd.y0 + Bd.y1) / 2, 0.35);
      // (a dash spits out its biggest thing, so it only dashes away at the last moment)
      if (!easy && pl.dashReady && pl.dist < pl.coreR(B) + (hard ? 40 : 24)) S.fire = 'escape';
    } else if (pl.prey) {
      S.mode = 'hunt';
      const lead = hard ? 0.5 : 0.15, tx = B.x + B.vx * lead, ty = B.y + B.vy * lead;
      // Hard cuts it off: comes in from the middle side, so it gets pinned to the edge
      if (hard && pl.dist > 120) { const cx = (Bd.x0 + Bd.x1) / 2, cy = (Bd.y0 + Bd.y1) / 2; toward(K2(tx, cx, 0.2), K2(ty, cy, 0.2), 1); }
      else toward(tx, ty, 1);
    } else {
      // grow: the best thing to suck up
      let best = null, bs = -1;
      for (const c of pl.objs) {
        if (pl.inPond(c.o.x, c.o.y)) continue;
        let s;
        if (easy) s = 1 / (c.d + 30);
        else {
          if (!c.lift) continue;
          // never steer through a power line for it (Easy does, and gets zapped)
          if (wired(pl, A, c.o)) continue;
          s = c.o.v / (c.d + 90);
          if (hard && c.o.kind === 'shed') s *= 1.7;
          // not the ones the other twister is about to take
          const dB = Math.hypot(c.o.x - B.x, (c.o.y - B.y) * 1.3);
          // Hard only races for things it will reach first; Normal gives up on ones the other is right on top of
          if (hard) { if (dB < c.d * 0.9) s *= 0.25; }
          else if (dB < c.d * 0.6) s *= 0.5;
          // Hard keeps out of reach of a twister that is nearly 3 bigger
          if (hard && B.size >= A.size + 2 && Math.hypot(c.o.x - B.x, (c.o.y - B.y) * 1.3) < pl.pullR(B) + 80) s *= 0.2;
        }
        if (s > bs) { bs = s; best = c.o; }
      }
      if (best) toward(best.x, best.y, 1);
      else toward((Bd.x0 + Bd.x1) / 2, (Bd.y0 + Bd.y1) / 2, 0.6);
      // a twister that is nearly 3 bigger keeps a little away
      if (B.size >= A.size + 2 && pl.dist < 200) away(B.x, B.y, 0.6);
    }
    // shooting: lined up, close, and the thing it spits is small (or the hit would let it swallow)
    if (!easy && S.mode !== 'flee' && pl.dashReady && A.held.length && pl.dist < 330) {
      const big = Math.max(...A.held.map(o => o.v)), lead = hard ? pl.dist / 640 : 0;
      const tx = B.x + B.vx * lead - A.x, ty = B.y + B.vy * lead - A.y;
      // (spitting costs its size: worth it when the hit opens a swallow, or knocks back a twister that is nearly 3 bigger)
      const worth = A.size - big >= B.size - 2 + 3 || (B.size >= A.size + (hard ? 1 : 2) && big <= 1);
      if (worth) {
        // aim one of the eight directions at it, fire when that's close enough
        const a = Math.atan2(ty, tx), q = Math.round(a / (Math.PI / 4)) * (Math.PI / 4), off = Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q)));
        if (off < (hard ? 0.28 : 0.2)) {
          const fx = Math.cos(q), fy = Math.sin(q);
          if (Math.abs(A.fx - fx) < 0.2 && Math.abs(A.fy - fy) < 0.2) S.fire = 'shot';
          else { gx = fx * 3; gy = fy * 3; }
        }
      }
    }
    // keep off the pond (Easy wanders in now and then), the power lines and the wall cloud
    S.wet = easy && Math.random() < 0.1 ? !S.wet : S.wet && easy;
    const pd = Math.hypot((A.x - P.x) / (P.rx + 50), (A.y - P.y) / (P.ry + 40));
    if (!S.wet && pd < 1.25) { const w = (1.25 - pd) * 4; away(P.x, P.y, w); }
    if (A.spout && !S.wet) away(P.x, P.y, 2);
    // (pushed straight off the nearest point of the line, harder the closer it is: a twister drifts about 40 px before it turns;
    // it looks where it will be in a third of a second too, so it turns in time)
    const zr = pl.coreR(A) * 0.7 + 6, ahead = { x: A.x + A.vx * 0.35, y: A.y + A.vy * 0.35 };
    for (const [a, b] of pl.lines) {
      const d = Math.min(pl.segDist(A, a, b), easy ? 1e9 : pl.segDist(ahead, a, b));
      if (d >= zr + 75) continue;
      const lx = b.x - a.x, ly = b.y - a.y, u = Math.max(0, Math.min(1, ((A.x - a.x) * lx + (A.y - a.y) * ly) / (lx * lx + ly * ly)));
      away(a.x + lx * u, a.y + ly * u, (zr + 75 - d) / (easy ? 30 : 14));
    }
    const m = 70;
    if (A.x < Bd.x0 + m) gx += (Bd.x0 + m - A.x) / 30; if (A.x > Bd.x1 - m) gx -= (A.x - Bd.x1 + m) / 30;
    if (A.y < Bd.y0 + m * 0.6) gy += (Bd.y0 + m * 0.6 - A.y) / 20; if (A.y > Bd.y1 - m * 0.6) gy -= (A.y - Bd.y1 + m * 0.6) / 20;
    const n = Math.hypot(gx, gy);
    if (n < 0.05) { S.dx = 0; S.dy = 0; return; }
    S.dx = gx / n; S.dy = gy / n;
    // an escape dash goes the way it is running
    if (S.fire === 'escape') S.fire = true;
    // never dash into a power line (a dash flies about 180 px)
    if (S.fire) {
      const qx = S.dx > 0.38 ? 1 : S.dx < -0.38 ? -1 : 0, qy = S.dy > 0.38 ? 1 : S.dy < -0.38 ? -1 : 0, qn = Math.hypot(qx, qy) || 1;
      if (wired(pl, A, { x: A.x + qx / qn * 200, y: A.y + qy / qn * 200 })) S.fire = false;
    }
  }
  const K2 = (a, b, u) => a + (b - a) * u;
  // is a power line on the straight way from the twister to this thing (or right next to the thing)?
  function wired(pl, A, o) {
    const need = pl.coreR(A) * 0.7 + 6 + 30, dx = o.x - A.x, dy = o.y - A.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10));
    for (const [a, b] of pl.lines) for (let k = 1; k <= n; k++) if (pl.segDist({ x: A.x + dx * k / n, y: A.y + dy * k / n }, a, b) < need) return true;
    return false;
  }
})();

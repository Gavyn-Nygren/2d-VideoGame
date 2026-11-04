/* Pip & Bo - Computer partner: 12-4 Ice Hockey (versus). */
'use strict';

/* The computer skates like a person on the keyboard: 8 directions and the action button. Each step it picks a job:
   - Attack (it has a puck): carry it toward a shooting spot to one side of the far net, picking the side away from the
     other skater. Every step it checks each of the 8 directions it could face: a shot that way (the level's own aim
     help and the skater's glide included) must cross the goal line inside the posts, miss the goalie robot (wherever
     the robot could slide to while the shot flies) and miss the other skater's body and stick (and the snowman).
     When one is good enough it turns that way and taps; with room and time it charges a slapshot instead. Pressed
     close by the other skater, it shoots at any open chance or swerves away. Waiting at its spot with no line (a Big
     Puck shrinks the gap) it settles for less, tries the other side, then a spot nearer the middle, and after about
     3.5 s takes its best shot. A slapshot only starts with a line or while facing the far net, and never fires toward
     its own half (it turns round first).
   - Defend (the other skater has the puck): get goal-side, between the puck and its own net, then skate at the puck
     and poke check when its stick can reach. Standing in the lane also blocks (a carried puck pops loose on a body).
   - Loose puck: skate to where the puck will be (it glides), or wait outside a crease while a robot sweeps it.
   With two pucks it chases a loose one unless the other skater is carrying one near its net.
   Getting about: each net (crease in front, frame box behind) is an obstacle; it takes the shortest way through a few
   corner points round it (route). If its keys are down but it hardly moves for 0.4 s, it sidesteps for a moment.
   It sees the puck and the other skater a little late (cpuLag): easy reacts slowly, sometimes hesitates, misjudges
   its aim (it shoots believing a slightly wrong angle), pokes less often and rarely charges a slapshot; hard reacts in
   about 0.13 s and only shoots at clear chances. It never reads hidden state: only what is on the ice. Speech bubbles
   (1-player mode only) after goals, never while the person is away (noIdleStop turns off the core's own check). The level has no idle pause, so it keeps playing when the person walks away
   (noIdleStop): rounds end at the bell and a match against nobody plays out (the computer wins). */
(() => {
  const SK = { // per skill: reaction lag (s), shot margin wanted (px), poke chance per look, slapshot chance, hesitation
    // chance per s, how far ahead it leads a loose puck, how hard it chases
    // seeBot: the chance it shoots round the goalie robot this time (otherwise it just shoots at the net, like a beginner)
    // range: the farthest it shoots from (px); back: it gets goal-side on defence (easy just chases the puck)
    easy: { lag: 0.7, margin: 2, poke: 0.15, slap: 0.1, hesitate: 0.8, lead: 0.4, chase: 0.55, seeBot: 0.15, range: 450, back: false },
    normal: { lag: 0.22, margin: 5, poke: 0.7, slap: 0.3, hesitate: 0.08, lead: 0.8, chase: 0.95, seeBot: 0.6, range: 360, back: true },
    hard: { lag: 0.13, margin: 7, poke: 0.95, slap: 0.45, hesitate: 0, lead: 1, chase: 1, seeBot: 1, range: 340, back: true },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const A = () => MODES.hockey.test, Rk = () => A().HOCKEY_RINK;
  const angD = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const DIRS = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k * Math.PI / 4);

  // press the 8-way keys nearest to (ex, ey)
  function keys(out, ex, ey) {
    out.left = out.right = out.up = out.down = false;
    if (Math.hypot(ex, ey) < 1e-6) return;
    const q = Math.round(Math.atan2(ey, ex) / (Math.PI / 4)) * (Math.PI / 4), ux = Math.cos(q), uy = Math.sin(q);
    out.right = ux > 0.3; out.left = ux < -0.3; out.down = uy > 0.3; out.up = uy < -0.3;
  }
  /* a waypoint round the nets: each net is an obstacle made of its crease (a half disc on the ice side, which skaters
     can't enter) and its frame box behind the goal line. The skater takes the shortest way through a few corner points
     round each net (in front of the crease, beside the net, in the lane behind it). */
  const CREASE_T = 78, BOX_T = 14; // obstacle sizes for the "is this line clear" test (the skater's own radius included)
  function segHits(x0, y0, x1, y1, g) {
    const R = Rk(), P = A().HOCKEY, inn = g < R.cx ? 1 : -1, dx = x1 - x0, dy = y1 - y0;
    // the crease: the part of the segment inside the disc, then is any of it on the ice side?
    const fx = x0 - g, fy = y0 - R.cy, a = dx * dx + dy * dy || 1e-9, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - CREASE_T * CREASE_T;
    const disc = b * b - 4 * a * c;
    if (disc > 0) {
      const sq = Math.sqrt(disc), t0 = Math.max(0, (-b - sq) / (2 * a)), t1 = Math.min(1, (-b + sq) / (2 * a));
      if (t0 < t1 && ((x0 + dx * t0 - g) * inn > 0 || (x0 + dx * t1 - g) * inn > 0)) return true;
    }
    // the frame box, grown by about the skater's radius (rounded, so a skater touching it is never "inside")
    const bx0 = Math.min(g, g - inn * P.netD), bx1 = Math.max(g, g - inn * P.netD), by0 = R.cy - P.mouth - 3, by1 = R.cy + P.mouth + 3;
    let lo = 0, hi = 1, cut = true;
    for (const [o, d, mn, mx] of [[x0, dx, bx0, bx1], [y0, dy, by0, by1]]) {
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) cut = false; continue; }
      let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
      lo = Math.max(lo, ta); hi = Math.min(hi, tb); if (lo > hi) cut = false;
    }
    if (cut) return true;
    const ptBox = (px, py) => Math.hypot(px - clamp(px, bx0, bx1), py - clamp(py, by0, by1));
    const L = Math.sqrt(a), ux = dx / L, uy = dy / L;
    let m = Math.min(ptBox(x0, y0), ptBox(x1, y1));
    for (const cx of [bx0, bx1]) for (const cy of [by0, by1]) m = Math.min(m, segDist(x0, y0, ux, uy, L, cx, cy));
    return m < BOX_T;
  }
  const clear = (x0, y0, x1, y1) => !Rk().gl.some(g => segHits(x0, y0, x1, y1, g));
  let NODES = null;
  function nodes() {
    if (NODES) return NODES;
    const R = Rk(), P = A().HOCKEY; NODES = [];
    for (const g of R.gl) {
      const inn = g < R.cx ? 1 : -1, back = g - inn * (P.netD + 24);
      for (const s of [-1, 1]) NODES.push({ x: g + inn * 40, y: R.cy + s * 100 }, { x: g - inn * 10, y: R.cy + s * 80 }, { x: back, y: R.cy + s * 76 });
    }
    return NODES;
  }
  function route(x, y, tx, ty) {
    if (clear(x, y, tx, ty)) return { x: tx, y: ty };
    // shortest path over start, the corner points and the target (a tiny Dijkstra)
    const N = [{ x, y }, ...nodes(), { x: tx, y: ty }], n = N.length, dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false);
    dist[0] = 0;
    for (;;) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === n - 1) break;
      done[u] = true;
      for (let v = 1; v < n; v++) {
        if (done[v]) continue;
        const w = dist[u] + Math.hypot(N[v].x - N[u].x, N[v].y - N[u].y);
        if (w < dist[v] && clear(N[u].x, N[u].y, N[v].x, N[v].y)) { dist[v] = w; prev[v] = u; }
      }
    }
    if (prev[n - 1] < 0) { // the target is tucked against a net: head for the nearest corner point it can see
      let best = null, bd = Infinity;
      for (const q of nodes()) { const d = Math.hypot(q.x - x, q.y - y) + Math.hypot(q.x - tx, q.y - ty); if (d < bd && clear(x, y, q.x, q.y)) { bd = d; best = q; } }
      return best && Math.hypot(best.x - x, best.y - y) > 12 ? { x: best.x, y: best.y } : { x: tx, y: ty };
    }
    let v = n - 1; while (prev[v] !== 0) v = prev[v];
    return { x: N[v].x, y: N[v].y };
  }
  // keep a target point out of the creases and inside the boards
  function legal(x, y) {
    const R = Rk();
    for (const g of R.gl) {
      const dx = x - g, dy = y - R.cy, d = Math.hypot(dx, dy), dir = g < R.cx ? 1 : -1;
      if (dx * dir > -30 && d < 86) { const l = d || 1; x = g + dx / l * 86; y = R.cy + dy / l * 86; if (d < 1e-3) x = g + dir * 86; }
    }
    return { x: clamp(x, R.x0 + 24, R.x1 - 24), y: clamp(y, R.y0 + 24, R.y1 - 24) };
  }
  // skate toward (tx, ty), going round the creases; arrive slowly unless `fast`
  function skateTo(out, me, tx, ty, fast, push) {
    const w = route(me.x, me.y, tx, ty), dx = w.x - me.x, dy = w.y - me.y, d = Math.hypot(dx, dy);
    const final = w.x === tx && w.y === ty;
    const want = fast || !final ? 260 : Math.min(260, Math.sqrt(2 * 420 * Math.max(0, d - 6)));
    let vx = d > 1 ? dx / d * want : 0, vy = d > 1 ? dy / d * want : 0;
    if (push) { vx += push.x; vy += push.y; }
    const ex = vx - me.vx, ey = vy - me.vy;
    if (Math.hypot(ex, ey) > 22) keys(out, ex, ey);
    return d;
  }

  // the aim help as the level applies it to a keyboard shot (see hockeyShoot)
  function assisted(P, me, px, py, a) {
    const R = Rk(), k = 1 - me.id, gl = R.gl[k], dir = k ? -1 : 1, inner = P.mouth - P.post - P.puckR - 3;
    if ((gl - px) * dir < 0 && Math.abs(gl - px) > 60) {
      const aLo = Math.atan2(R.cy - inner - py, gl - px), aHi = Math.atan2(R.cy + inner - py, gl - px);
      const dLo = angD(a, aLo), dHi = angD(a, aHi);
      const inside = Math.sign(dLo) !== Math.sign(dHi) && Math.abs(dLo) + Math.abs(dHi) < Math.PI;
      if (!inside) { const d = Math.abs(dLo) < Math.abs(dHi) ? dLo : dHi; if (Math.abs(d) <= P.assist) a += d; }
    }
    return a;
  }
  // distance from point (cx, cy) to the shot path from (sx, sy) along (ux, uy) for length L
  function segDist(sx, sy, ux, uy, L, cx, cy) {
    const t = clamp((cx - sx) * ux + (cy - sy) * uy, 0, L);
    return Math.hypot(sx + ux * t - cx, sy + uy * t - cy);
  }
  /* how good a shot facing angle a would be right now (px of room to spare; below 0 = it won't score).
     view: what the computer sees of the other skater (lagged). err: its aim misjudgement. */
  function shotRoom(st, P, me, a, v, view, seeBot) {
    const R = Rk(), k = 1 - me.id, gl = R.gl[k], dir = me.id ? -1 : 1, b = st.bots[k];
    const reach = P.reach + (me.lucky ? P.luckyReach * 0.5 : 0);
    const sx = me.x + Math.cos(a) * reach, sy = me.y + Math.sin(a) * reach;
    if ((gl - sx) * dir < 40) return -99;
    const aa = assisted(P, me, sx, sy, a);
    let vx = Math.cos(aa) * v + me.vx * P.carryShare, vy = Math.sin(aa) * v + me.vy * P.carryShare;
    if (vx * dir <= 50) return -99;
    const sp = Math.hypot(vx, vy), ux = vx / sp, uy = vy / sp;
    const pr = P.puckR, inner = P.mouth - P.post - pr - 1;
    const tG = (gl - sx) / vx, yG = sy + vy * tG;
    let room = inner - Math.abs(yG - R.cy);
    if (room < 0) return room;
    const L = sp * tG;
    // the goalie robot: wherever it could slide to (after its reaction) before the puck passes it
    const bx = gl - dir * P.botX, tB = Math.max(0, (bx - sx) / vx), free = Math.max(0, tB - P.botDelay * 0.85);
    const lo = clamp(b.y - P.botV * free, R.cy - P.botRange, R.cy + P.botRange), hi = clamp(b.y + P.botV * free, R.cy - P.botRange, R.cy + P.botRange);
    if (seeBot) {
      let bd = 1e9;
      for (let i = 0; i <= 6; i++) bd = Math.min(bd, segDist(sx, sy, ux, uy, L, bx, lo + (hi - lo) * i / 6));
      room = Math.min(room, bd - b.r - pr);
    }
    // the other skater: body, and the stick (it catches a puck slower than catchV)
    if (view) {
      const tO = 0.25;
      const ox = view.x + view.vx * tO, oy = view.y + view.vy * tO;
      room = Math.min(room, segDist(sx, sy, ux, uy, L, ox, oy) - (P.r + pr + 2));
      if (sp < P.catchV + 40) {
        const blx = ox + Math.cos(view.a) * P.reach, bly = oy + Math.sin(view.a) * P.reach;
        room = Math.min(room, segDist(sx, sy, ux, uy, L, blx, bly) - (P.catchR + pr + 4));
      }
    }
    // the snowman (where it will be when the puck crosses the middle)
    if (P.snowman && st.snow) {
      const tc = (R.cx - sx) / vx;
      if (tc > 0 && tc < tG) room = Math.min(room, segDist(sx, sy, ux, uy, L, st.snow.x, st.snow.y + st.snow.vy * tc) - P.snowR - pr - 4);
    }
    return room;
  }
  // the best of the 8 directions for a shot of speed v: { a, room }
  function bestShot(st, P, me, v, view, seeBot) {
    let best = { a: me.a, room: shotRoom(st, P, me, me.a, v, view, seeBot), now: true };
    for (const q of DIRS) {
      if (Math.abs(angD(me.a, q)) > 2.2) continue; // (turning round takes too long with a defender about)
      const r = shotRoom(st, P, me, q, v, view, seeBot);
      if (r > best.room + 1.5) best = { a: q, room: r, now: false };
    }
    return best;
  }
  const shotV = (P, me, charge) => {
    const pow = charge < P.tapT ? 0 : clamp((charge - P.tapT) / (P.slapT - P.tapT), 0, 1);
    return (P.shotV + (P.slapV - P.shotV) * pow) * P.shotK * (me.lucky ? P.luckyShot : 1);
  };

  // where a loose puck will be after t s (it glides and slows a little)
  function puckAt(P, q, t) {
    const k = Math.max(0, 1 - (P.puckDrag * 0.5) * t);
    return legal(q.x + q.vx * t * k, q.y + q.vy * t * k);
  }
  function interceptT(P, me, q, lead) {
    for (let t = 0; t <= 1.6; t += 0.05) {
      const at = puckAt(P, q, t * lead), d = Math.hypot(at.x - me.x, at.y - me.y) - P.reach;
      if (d <= 40 + t * 235) return { t, at };
    }
    return { t: 1.6, at: puckAt(P, q, 1.6 * lead) };
  }

  /* ---------- the jobs ---------- */
  function attack(S, out, st, P, me, view, sk, info) {
    const R = Rk(), k = 1 - me.id, gl = R.gl[k], dir = me.id ? -1 : 1;
    const od = view ? Math.hypot(view.x - me.x, view.y - me.y) : 999;
    if (S.seeBot == null) S.seeBot = Math.random() < sk.seeBot;
    const err = S.seeBot;
    // already charging a slapshot: turn to the best line and let go when the power is there and the line is open
    if (me.charge >= 0 && S.tapping) { S.tapping = false; out.act = false; keys(out, Math.cos(me.a), Math.sin(me.a)); return; } // a quick shot: let go
    if (me.charge >= 0) {
      if (S.slapFor == null) S.slapFor = 0.5;
      const v = shotV(P, me, me.charge), bs = bestShot(st, P, me, v, view, err);
      // no line at all (it is facing away): turn toward the far net's middle, however far round that is
      const aNet = Math.atan2(R.cy - me.y, gl - me.x), wrong = Math.cos(me.a) * dir < 0.25;
      if (bs.room <= -99) keys(out, Math.cos(aNet), Math.sin(aNet)); else keys(out, Math.cos(bs.a), Math.sin(bs.a));
      const ready = me.charge >= S.slapFor || od < 80;
      // (the forced release never goes off while it faces its own half: the level's auto-fire at 1.6 s is later)
      const fire = (ready && bs.now && bs.room >= sk.margin) || (me.charge > 1.35 && !wrong) || (od < 55 && bs.now && bs.room > -2);
      out.act = !fire;
      if (fire) { S.seeBot = null; S.shotT = G.time; }
      return;
    }
    const v = shotV(P, me, 0), bs = bestShot(st, P, me, v, view, err);
    const pressed = od < 75 && view && (view.x - me.x) * dir > -20;
    // patience: standing at its spot with no line (a big puck, a still goalie) it settles for less, then for anything
    const hold = S.holdT || 0;
    const want = (pressed ? Math.max(-1, sk.margin - 6) : sk.margin) - (hold > 0.8 ? (hold - 0.8) * 6 : 0);
    // a slapshot: from range, with nobody close
    const dGoal = Math.abs(gl - me.x);
    if (S.slapPlan == null) S.slapPlan = Math.random() < sk.slap;
    const facing = Math.abs(angD(me.a, Math.atan2(R.cy - me.y, gl - me.x))) < 1;
    if (S.slapPlan && od > 170 && dGoal < 330 && dGoal > 150 && (bs.room > -10 || facing)) {
      S.slapFor = 0.45 + Math.random() * 0.45; S.tapping = false;
      out.act = true; keys(out, Math.cos(bs.a), Math.sin(bs.a));
      return;
    }
    if ((bs.room >= want || (hold > 3.5 && bs.room > -40)) && dGoal < sk.range) {
      keys(out, Math.cos(bs.a), Math.sin(bs.a));
      if (bs.now || Math.abs(angD(me.a, bs.a)) < 0.05) { out.act = 'tap'; S.tapping = true; S.seeBot = null; S.slapPlan = null; S.shotT = G.time; S.holdT = 0; }
      return;
    }
    // carry the puck to a spot to one side of the net, on the side away from the other skater
    if (S.side == null || (G.time > (S.sideT || 0) && view && Math.sign(view.y - R.cy) === S.side && Math.abs(view.y - R.cy) > 40 && (view.x - me.x) * dir > 0)) {
      S.side = view ? (view.y > R.cy ? -1 : 1) : (me.y > R.cy ? 1 : -1); S.sideT = G.time + 1.2;
    }
    // (after a while at one spot with no shot it tries the other side, then a spot nearer the middle)
    if (hold > 1.6 && !S.moved) { S.moved = 1; S.side = -S.side; S.sideT = G.time + 2; }
    else if (hold > 2.6 && S.moved === 1) { S.moved = 2; S.sideT = G.time + 2; }
    const spot = S.moved === 2 ? legal(gl - dir * 190, R.cy + S.side * 45) : legal(gl - dir * 135, R.cy + S.side * 98);
    const dSpot = Math.hypot(spot.x - me.x, spot.y - me.y);
    S.holdT = dSpot < 60 && Math.hypot(me.vx, me.vy) < 120 ? hold + info.dt : Math.max(0, hold - info.dt * 0.5);
    // swerve round the other skater when it's in the way
    let push = null;
    if (view && od < 110) {
      const ax = me.x - view.x, ay = me.y - view.y, l = Math.hypot(ax, ay) || 1, f = (110 - od) / 110 * 260;
      push = { x: ax / l * f, y: ay / l * f };
    }
    skateTo(out, me, spot.x, spot.y, true, push);
    // past the spot (too close or behind): come back out
    if ((me.x - gl) * dir > -95) skateTo(out, me, gl - dir * 170, R.cy + S.side * 80, true, push);
  }
  function defend(S, out, st, P, me, q, view, sk, info) {
    const R = Rk(), gl = R.gl[me.id], N = { x: gl, y: R.cy };
    const lagK = info.skill >= 0.9 ? 0.18 : 0.1;
    const qx = q.x + q.vx * lagK, qy = q.y + q.vy * lagK;
    const qn = Math.hypot(qx - N.x, qy - N.y), mn = Math.hypot(me.x - N.x, me.y - N.y);
    const ux = (qx - N.x) / (qn || 1), uy = (qy - N.y) / (qn || 1);
    const lane = Math.abs((me.x - N.x) * -uy + (me.y - N.y) * ux); // how far off the puck-to-net line
    const goalSide = mn < qn - 10 && lane < 55;
    const d = Math.hypot(qx - me.x, qy - me.y);
    if (goalSide || d < 60 || !sk.back) {
      skateTo(out, me, qx, qy, true);
      const face = Math.abs(angD(me.a, Math.atan2(q.y - me.y, q.x - me.x)));
      if (d < P.pokeReach + P.pokeR + 6 && face < 0.6 && me.cd <= 0 && (S.pokeLook = (S.pokeLook || 0) - info.dt) <= 0) {
        S.pokeLook = 0.12;
        if (Math.random() < sk.poke) out.act = 'tap';
      }
    } else {
      const t = legal(N.x + ux * Math.max(100, qn - 55), N.y + uy * Math.max(100, qn - 55));
      skateTo(out, me, t.x, t.y, true);
    }
  }
  function chase(S, out, st, P, me, q, sk) {
    const R = Rk(), it = interceptT(P, me, q, sk.lead);
    // a puck resting in a crease: wait at its edge for the robot's sweep
    let at = it.at;
    for (const g of R.gl) if (Math.hypot(q.x - g, q.y - R.cy) < 80 && (q.x - g) * (g < R.cx ? 1 : -1) > 0) at = legal(q.x + (q.x - g) * 0.4, q.y + (q.y - R.cy) * 0.6);
    // aim the blade at it: stand back by the stick's reach along the way in
    skateTo(out, me, at.x, at.y, true);
  }

  cpuBrain('hockey', {
    bubbleHidden: true,
    noIdleStop: true, // the level has no idle pause: a match against nobody plays out and ends (the computer wins)
    bubblePos(p) { const st = G.mst, s = st && st.sk && st.sk[p.id]; return s ? { x: s.x, y: s.y - 62 } : null; },
    reset(S) { S.goals = null; },
    think(S, p, o, dt, info) {
      const out = plan(S, p, o, dt, info), st = info.mst, me = st && st.sk && st.sk[p.id];
      if (!me || info.frozen || st.phase !== 'play') { S.stuckT = S.unstickT = 0; return out; }
      // stuck (keys down but hardly moving, e.g. against a net frame): sidestep for a moment
      const sp = Math.hypot(me.vx, me.vy), pushing = out.left || out.right || out.up || out.down;
      if (pushing && sp < 20) S.stuckT = (S.stuckT || 0) + dt; else if (sp > 40) S.stuckT = 0;
      if (S.stuckT > 0.4 && !(S.unstickT > 0)) {
        const R = Rk(), g = Math.abs(me.x - R.gl[0]) < Math.abs(me.x - R.gl[1]) ? R.gl[0] : R.gl[1], inn = g < R.cx ? 1 : -1;
        if (Math.abs(me.x - g) < 150 && Math.abs(me.y - R.cy) < 160) {
          const sy = Math.sign(me.y - R.cy) || 1, behind = (me.x - g) * inn < 0;
          S.unstick = { x: behind ? me.x : me.x + inn * 40, y: R.cy + sy * (A().HOCKEY.mouth + A().HOCKEY.r + 40) };
        } else { // (against a skater or the boards: step aside)
          const a = Math.atan2(me.vy, me.vx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
          S.unstick = legal(me.x + Math.cos(a) * 60, me.y + Math.sin(a) * 60);
        }
        S.unstickT = 0.4; S.stuckT = 0;
      }
      if (S.unstickT > 0) {
        S.unstickT -= dt;
        const ex = S.unstick.x - me.x, ey = S.unstick.y - me.y;
        if (Math.hypot(ex, ey) > 10) keys(out, ex, ey); else S.unstickT = 0;
      }
      return out;
    },
  });
  function plan(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.sk || !st.P || !st.pucks) return out;
      info.dt = dt;
      const sk = skOf(info.skill), P = st.P, me = st.sk[p.id], op = st.sk[o.id];
      // bubbles after goals (1-player mode only)
      // (only when a goal count went up: a new round puts both back to 0; and never while the person is away)
      if (S.goals && (st.goals[0] > S.goals[0] || st.goals[1] > S.goals[1]) && !(info.partnerIdle > CPU.idleStop)) {
        const mine = st.goals[p.id] > S.goals[p.id];
        cpuSay(p, mine ? 'Woohoo!' : 'Nice shot!', 1.6);
      }
      S.goals = st.goals.slice();
      if (info.frozen || st.phase !== 'play') { S.startT = 0.15 + (1 - info.skill) * 0.3; S.slapPlan = null; return out; }
      if ((S.startT = (S.startT || 0) - dt) > 0) return out;
      if (sk.hesitate && me.puck < 0 && (S.pauseT = (S.pauseT || 0) - dt) <= 0 && Math.random() < sk.hesitate * dt) S.pauseT = 0.3 + Math.random() * 0.4;
      if (S.pauseT > 0 && me.puck < 0) return out;
      // what it sees (a little late)
      const lag = sk.lag;
      const view = cpuLag(S, 'op', { x: op.x, y: op.y, vx: op.vx, vy: op.vy, a: op.a, puck: op.puck }, lag);
      const pucks = cpuLag(S, 'pk', st.pucks.map(q => ({ i: q.i, x: q.x, y: q.y, vx: q.vx, vy: q.vy, carrier: q.carrier, inNet: q.inNet, drop: q.drop })), lag);
      if (me.puck >= 0) {
        attack(S, out, st, P, me, view, sk, info);
        if (sk.chase < 1 && Math.random() > sk.chase) out.left = out.right = out.up = out.down = false; // (easy skates slower)
        return out;
      }
      S.slapPlan = null; S.tapping = false; S.slapFor = null; S.seeBot = null; S.holdT = 0; S.moved = 0;
      // pick the puck to go for
      const R = Rk();
      let free = null, ft = 1e9, carried = null;
      for (const q of pucks) {
        if (q.inNet >= 0) continue;
        const live = st.pucks[q.i];
        if (live && live.carrier === me.id) continue;
        if (q.carrier === o.id) { carried = q; continue; }
        const it = interceptT(P, me, q, sk.lead);
        if (it.t < ft) { ft = it.t; free = q; }
      }
      if (carried && free) {
        const threat = Math.hypot(carried.x - R.gl[me.id], carried.y - R.cy);
        if (threat < 380 || ft > 0.9) free = null; else carried = null;
      }
      if (carried) defend(S, out, st, P, me, carried, view, sk, info);
      else if (free) {
        // a slow chaser on easy, now and then
        chase(S, out, st, P, me, free, sk);
        if (sk.chase < 1 && Math.random() > sk.chase) out.left = out.right = out.up = out.down = false;
      } else {
        const t = legal((R.gl[me.id] + R.cx) / 2, R.cy);
        skateTo(out, me, t.x, t.y, false);
      }
      return out;
  }
})();

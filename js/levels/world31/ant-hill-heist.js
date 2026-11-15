/* Pip & Bo - Level 31-2 Ant Hill Heist (team, World 31 Shrunk in the Backyard). */
'use strict';

/* ===== 31-2 Ant Hill Heist (mode 'antheist', team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "sneak a giant cookie crumb out of the ant tunnels. It takes two to carry it, so you move together and
   freeze when soldier ants pass."
   Side view of the tunnels inside an ant hill; the camera follows the crumb to the right. The mode owns the tick, the
   camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   THE CRUMB is as big as both of them. Pip holds the left end over their head, Bo the right end. It only moves well
     when BOTH push the same way (◀ ▶): 130 px/s, quiet. One pushing alone DRAGS it (35 px/s) and after half a second
     the scrape makes a noise ring that wakes sleeping soldiers. Pushing opposite ways is a tug: nothing moves.
   FREEZE: hold ▼ to drop down under the crumb (it is just a crumb lying there). A frozen player can't push.
   LIFT: a step up in the tunnel stops the crumb. Both press ▲ within 0.4 s of each other to heave it up the step.
   SOLDIER ANTS (red, big jaws) walk upside down on the ceiling. Each one feels with its feelers 150 px ahead of its
     head and 60 px behind (the green-yellow glow under it shows the zone when you are near). While the crumb or a
     carrier is in an ant's zone, its "?" fills: fast if the crumb moves (0.5 s), slowly if someone is standing up
     (1.6 s), and it empties if both are frozen. Full = "!" and GOTCHA: the ant drops down, grabs the crumb and the
     soldiers haul it (and you) back to the last checkpoint flag (counted as Caught; a soft fail, 2 s of calm after).
     An ant that has felt all over the frozen crumb and walked on is FOOLED ("Just a crumb...", a green tick): it
     ignores the crumb for S.foolT s, so one good freeze gets you past each patrol ant.
     Patrol ants walk back and forth and stop at the ends to turn. Sleeping soldiers lie in side chambers and wake up for
     7 s (they look around, zone 170 px) when a scrape is heard within 320 px. March shafts drop a column of soldiers
     through the tunnel every few seconds (a drum "tromp tromp" warns 2 s before); while the column comes through,
     anyone within 70 px of the shaft must be frozen.
   SUGAR GRAINS sparkle in the tunnel: the crumb picks them up as it passes (43 in all).
   STRETCHES: The Way In, Nursery Hall (sleepers), Marching Shafts, The Queen's Gate (everything; out into the sun).
   GOLD HELP (only while both are playing, announced, counted): caught twice in one stretch = gold sugar dust on the
     crumb dazzles the ants' feelers (zones shrink to 60%) for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the ants wait and the clock stops.
   MEDAL goals (MODES.antheist.medals, js/medals.js): Gold <= S.goldT, caught <= 1 and >= 75% of the sugar;
   Silver <= S.silverT and caught <= 5.
   MODES.antheist.plan(st) says what to do now (go, wait, freeze, lift) by running the ants' own rules a moment ahead;
   the prompts, the HUD chips and the computer brain all read it.
   Everything lives inside this block; sounds are Sfx.extra.antheist*. */
(() => {
  const K = SHRUNK, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    base: 400, tunH: 190, crumbW: 116, crumbH: 52, carry: 46, push: 130, drag: 35, dragNoise: 0.5, noiseR: 320,
    front: 150, back: 60, sleepFront: 170, wakeT: 7, shaftR: 70, susMove: 0.5, susStand: 1.6, susDrain: 0.8,
    liftWin: 0.4, liftT: 0.45, turn: 0.8, foolT: 6, foolMin: 0.4, grabT: 1.6, calm: 2.0, warnT: 2, sugarR: 70, idleWait: 12, goldZone: 0.6,
    goldT: 255, silverT: 450,
  };

  /* ---------- the course ----------
     tokens: 'r300' tunnel for 300 px; 'u40' a step up of 40 px here; 'n40' a step down; 'A320:60' a patrol ant walking
     from here to 320 px on at 60 x 1.3 px/s ('A320:60:-1' starts at the far end); 'Z' a sleeping soldier in a chamber here;
     'M7:3' a march shaft here (a column every 7 s, 3 s long); 's' a sugar grain, 'S' three in a row; 'C' a checkpoint. */
  function compile(def) {
    const c = { floor: [], ants: [], sleepers: [], shafts: [], sugar: [], cps: [180], endX: 0 };
    let x = 0, y = S.base, seg = { x0: -400, y };
    for (const tok of def.course) {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      if (k === 'r') x += a[0];
      else if (k === 'u' || k === 'n') { seg.x1 = x; c.floor.push(seg); y += k === 'u' ? -a[0] : a[0]; seg = { x0: x, y }; }
      else if (k === 'A') c.ants.push({ a: x, b: x + a[0], v: (a[1] || 60) * 1.3, x: a[2] < 0 ? x + a[0] : x, face: a[2] < 0 ? -1 : 1, pause: 0, sus: 0, fool: 0, over: 0, t: K.hash(x) * 5 });
      else if (k === 'Z') c.sleepers.push({ x, y, awake: 0, sus: 0, face: -1, t: K.hash(x) * 5 });
      else if (k === 'M') c.shafts.push({ x, per: a[0] || 7, dur: a[1] || 3, ph: K.hash(x + 3) * (a[0] || 7), sus: 0, warned: false });
      else if (k === 's') c.sugar.push({ x, y: 0, got: false });
      else if (k === 'S') for (let i = 0; i < 3; i++) c.sugar.push({ x: x + i * 34, y: 0, got: false });
      else if (k === 'C') c.cps.push(x);
    }
    c.endX = x + 120;
    seg.x1 = x + 2000; c.floor.push(seg);
    const fl = xx => { for (const s of c.floor) if (xx >= s.x0 && xx < s.x1) return s.y; return S.base; };
    for (const q of c.sugar) q.y = fl(q.x) - 18;
    for (const q of c.ants) q.y0 = fl((q.a + q.b) / 2);
    c.fl = fl;
    return c;
  }
  // where a patrol ant will be `ahead` seconds from now (its own rules, so the plan can look ahead)
  function antAt(q, ahead) {
    let x = q.x, f = q.face, p = q.pause, t = ahead;
    while (t > 0) {
      if (p > 0) { const u = Math.min(p, t); p -= u; t -= u; if (p <= 0) f = -f; continue; }
      const end = f > 0 ? q.b : q.a, d = Math.abs(end - x), u = Math.min(t, d / q.v);
      x += f * q.v * u; t -= u;
      if (t > 0) p = S.turn;
    }
    return { x, face: p > 0 ? f : f };
  }
  const shaftOn = (st, sh, ahead = 0) => ((st.clock + ahead + sh.ph) % sh.per) < sh.dur;
  const shaftWarn = (st, sh) => !shaftOn(st, sh) && ((st.clock + sh.ph) % sh.per) > sh.per - S.warnT;

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.title = def.title || '';
    st.c = compile(def);
    st.cr = { x: 180, y: st.c.fl(180), vy: 0, lift: 0, ly0: 0, ly1: 0, moved: 0, drag: 0, frozen: [false, false], push: [0, 0], shake: 0 };
    st.cp = 180; st.liftAt = [-9, -9];
    st.grab = null; st.calm = 0; st.rc = { caught: 0 }; st.gold = false;
    st.noise = []; st.tromp = 0;
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.segStart = G.time; st.clock = st.clock || 0;
    st.cam = { x: 0 };
    K.fx(st); mirror(st);
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && !st.grab && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go' && !st.grab;
    if (!st.waiting) st.clock += dt;
    if (st.calm > 0) st.calm -= dt;
    carry(st, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (!st.waiting) ants(st, dt, live);
    if (st.grab) grabStep(st, dt);
    if (live) { sugar(st); checkpoint(st); goal(st); }
    if (st.state === 'end') endStep(st, dt);
    for (const n of st.noise) n.t += dt;
    st.noise = st.noise.filter(n => n.t < 0.9);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  const zoneScale = st => (st.gold ? S.goldZone : 1);
  function carry(st, dt, live) {
    const cr = st.cr, c = st.c;
    cr.moved = 0;
    if (cr.shake > 0) cr.shake -= dt;
    if (cr.lift > 0) {
      cr.lift -= dt;
      const u = K.smooth(1 - cr.lift / S.liftT);
      cr.y = K.lerp(cr.ly0, cr.ly1, u) - Math.sin(u * Math.PI) * 20;
      if (cr.lift <= 0) { cr.y = cr.ly1; Sfx.play('shrunkThud'); }
      return;
    }
    for (const id of [0, 1]) {
      const p = G.players[id], i = live ? p.input : NO_INPUT;
      const fz = !!i.down;
      if (fz && !cr.frozen[id] && live) Sfx.play('antheistHush', id);
      cr.frozen[id] = fz;
      cr.push[id] = fz ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (live && p.pendingJump && !fz) { st.liftAt[id] = st.clock; Sfx.play('antheistHup', id); }
    }
    // lift together at a step
    const front = cr.x + S.crumbW / 2, back = cr.x - S.crumbW / 2;
    const stepR = c.fl(front + 2) < cr.y - 1, stepL = c.fl(back - 2) < cr.y - 1;
    if (live && (stepR || stepL) && st.liftAt.every(t => st.clock - t < S.liftWin) && !cr.frozen[0] && !cr.frozen[1]) {
      const dir = stepR ? 1 : -1, nx = cr.x + dir * 20, ny = Math.min(c.fl(nx + S.crumbW / 2 - 1), c.fl(nx - S.crumbW / 2 + 1));
      cr.lift = S.liftT; cr.ly0 = cr.y; cr.ly1 = c.fl(dir > 0 ? front + 2 : back - 2); cr.x += dir * 22; st.liftAt = [-9, -9];
      Sfx.play('antheistHeave'); K.pop(st, cr.x, cr.y - 120, 'Heave!', '#ffffff', 22); st.stats.lifts++;
      return;
    }
    let v = 0;
    const [a, b] = cr.push;
    if (a && a === b) v = a * S.push;
    else if (a && b && a !== b) { K.hintOnce(st, 'tug', 0, 'Tug of war! Push the same way'); K.hintOnce(st, 'tug1', 1, 'Push the same way as ' + NAMES[0]); }
    else if (a || b) {
      v = (a || b) * S.drag;
      cr.drag += dt;
      if (cr.drag > S.dragNoise) {
        cr.drag = 0.15; noise(st, cr.x, 'scrape');
        const lone = a ? 0 : 1;
        K.hint(st, lone, cpuOn(1 - lone) ? 'Scrape! Push together!' : 'Scrape! Push with ' + NAMES[1 - lone] + '!');
      }
    }
    if (!(a || b) || (a && a === b)) cr.drag = Math.max(0, cr.drag - dt);
    if (!live) v = 0;
    if (v) {
      // a step up in the way stops the crumb (lift it); a step down it just drops
      const nx = cr.x + v * dt, edge = v > 0 ? nx + S.crumbW / 2 : nx - S.crumbW / 2;
      if (c.fl(edge) < cr.y - 1) { v = 0; if (live) K.hintOnce(st, 'step' + Math.round(edge / 50), cpuHuman() == null ? 0 : cpuHuman(), 'A step! Both press ' + K.key(cpuHuman() == null ? 0 : cpuHuman(), 'up') + ' together'); }
      else if (nx < 60) v = 0;
      else { cr.x = nx; cr.moved = Math.abs(v); }
    }
    // the crumb rests on the highest floor under it, and drops down a step once it is all the way past the edge
    const sup = Math.min(c.fl(cr.x - S.crumbW / 2 + 4), c.fl(cr.x + S.crumbW / 2 - 4));
    if (sup > cr.y + 0.5) { cr.vy += 1600 * dt; cr.y = Math.min(sup, cr.y + cr.vy * dt); if (cr.y >= sup) { cr.vy = 0; Sfx.play('shrunkThud'); } }
    else { cr.vy = 0; cr.y = Math.min(cr.y, sup); }
  }
  function noise(st, x, kind) {
    st.noise.push({ x, y: st.cr.y - 40, t: 0, kind });
    Sfx.play('antheistScrape');
    st.stats.scrapes++;
    for (const z of st.c.sleepers) if (Math.abs(z.x - x) < S.noiseR) {
      if (z.awake <= 0) { K.pop(st, z.x, z.y - 90, '!', '#ff6a5a', 30); Sfx.play('antheistWake'); }
      z.awake = S.wakeT; z.face = x > z.x ? 1 : -1;
    }
  }
  // the crumb and its two carriers, as a span [x0, x1]
  const span = (st, x = st.cr.x) => [x - S.crumbW / 2 - 6, x + S.crumbW / 2 + 6];
  const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
  function zoneOf(st, ax, face, front, back) {
    const s = zoneScale(st);
    return face > 0 ? [ax - back * s, ax + front * s] : [ax - front * s, ax + back * s];
  }
  function ants(st, dt, live) {
    const c = st.c, cr = st.cr, sp = span(st), frozen = cr.frozen[0] && cr.frozen[1];
    const sense = (q, inZone) => {
      if (!live || st.calm > 0) { q.sus = Math.max(0, q.sus - dt / S.susDrain); return; }
      if (inZone) {
        if (cr.moved > 0 || cr.lift > 0) q.sus += dt / S.susMove;
        else if (!frozen) q.sus += dt / S.susStand;
        else q.sus = Math.max(0, q.sus - dt / S.susDrain);
        if (q.sus > 0.05 && !q.said) { q.said = true; Sfx.play('antheistSniff'); }
      } else { q.sus = Math.max(0, q.sus - dt / S.susDrain); if (q.sus <= 0) q.said = false; }
      if (q.sus >= 1 && !st.grab) caught(st, q);
    };
    for (const q of c.ants) {
      q.t += dt;
      if (live || st.grab) {
        if (q.pause > 0) { q.pause -= dt; if (q.pause <= 0) q.face = -q.face; }
        else {
          const end = q.face > 0 ? q.b : q.a;
          q.x += q.face * q.v * dt;
          if ((q.face > 0 && q.x >= end) || (q.face < 0 && q.x <= end)) { q.x = end; q.pause = S.turn; }
        }
      }
      const z = zoneOf(st, q.x, q.face, S.front, S.back);
      q.near = Math.abs(q.x - cr.x) < 420;
      // fooled: an ant that felt all over the frozen crumb and walked on takes it for a plain crumb and pays it no
      // more attention for S.foolT s (so one good freeze always gets you past an ant: no being passed again and again)
      if (q.fool > 0) { if (live) q.fool -= dt; q.zone = null; q.over = 0; q.sus = Math.max(0, q.sus - dt / S.susDrain); continue; }
      q.zone = z;
      const inZ = overlaps(z[0], z[1], sp[0], sp[1]);
      if (live && st.calm <= 0) {
        if (inZ) q.over = frozen && q.over >= 0 ? q.over + dt : -1;
        else {
          if (q.over >= S.foolMin && q.sus < 0.05) { q.fool = S.foolT; q.zone = null; Sfx.play('antheistFlag'); K.pop(st, q.x, q.y0 - S.tunH + 132, 'Just a crumb...', '#d9ffd0', 18); st.stats.fooled = (st.stats.fooled || 0) + 1; }
          q.over = 0;
        }
      }
      sense(q, inZ);
    }
    for (const q of c.sleepers) {
      q.t += dt;
      if (q.awake > 0) {
        if (live) q.awake -= dt;
        if (Math.sin(q.t * 1.3) > 0.97) q.face = -q.face;
        const z = zoneOf(st, q.x, q.face, S.sleepFront, S.back);
        q.zone = z; sense(q, overlaps(z[0], z[1], sp[0], sp[1]));
        if (q.awake <= 0) { q.sus = 0; K.pop(st, q.x, q.y - 80, 'zzz', '#d8e8ff', 18); }
      } else { q.zone = null; q.sus = 0; }
    }
    for (const sh of c.shafts) {
      const on = shaftOn(st, sh), warn = shaftWarn(st, sh);
      if (warn && !sh.warned) { sh.warned = true; if (Math.abs(sh.x - cr.x) < 700) { Sfx.play('antheistDrum'); K.pop(st, sh.x, S.base - 200, 'tromp tromp...', '#ffd0a0', 18); } }
      if (on) sh.warned = false;
      const z = [sh.x - S.shaftR * zoneScale(st), sh.x + S.shaftR * zoneScale(st)];
      sh.zone = on ? z : null;
      sense(sh, on && overlaps(z[0], z[1], sp[0], sp[1]));
    }
  }
  function caught(st, q) {
    st.stats.caught++; st.rc.caught++;
    st.grab = { t: 0, x0: st.cr.x, y0: st.cr.y, by: q, dest: st.cp };
    G.shake = Math.max(G.shake || 0, 0.4);
    Sfx.play('antheistGotcha'); Sfx.play('shrunkSquee');
    K.pop(st, st.cr.x, st.cr.y - 150, 'GOTCHA!', '#ff6a5a', 36);
    st.cr.frozen = [false, false];
  }
  function grabStep(st, dt) {
    const g = st.grab, cr = st.cr;
    g.t += dt;
    cr.shake = 0.2;
    if (g.t > 0.5) {
      const u = K.smooth((g.t - 0.5) / (S.grabT - 0.5));
      cr.x = K.lerp(g.x0, g.dest, u);
      cr.y = Math.min(st.c.fl(cr.x - S.crumbW / 2 + 4), st.c.fl(cr.x + S.crumbW / 2 - 4));
    }
    if (g.t >= S.grabT) {
      st.grab = null; st.calm = S.calm; cr.x = g.dest; cr.y = Math.min(st.c.fl(cr.x - S.crumbW / 2 + 4), st.c.fl(cr.x + S.crumbW / 2 - 4)); cr.vy = 0;
      for (const q of st.c.ants) { q.sus = 0; q.fool = 0; q.over = 0; }
      for (const q of st.c.sleepers) { q.sus = 0; q.awake = 0; }
      for (const q of st.c.shafts) q.sus = 0;
      // patrol ants right over the checkpoint walk on, so you don't land in a zone
      for (const q of st.c.ants) if (Math.abs(q.x - cr.x) < 200) { q.x = q.x < cr.x ? Math.max(q.a, cr.x - 260) : Math.min(q.b, cr.x + 260); q.face = q.x < cr.x ? -1 : 1; }
      K.msg(st, st.rc.caught === 1 ? 'Dragged back to the flag! Freeze ▼ when an ant\'s "?" fills' : 'Back to the flag. Wait for the ant to pass, then sneak behind it', '#ffffff', 3.6);
      if (st.rc.caught >= 2 && !st.gold && K.both(st)) { st.gold = true; K.goldHelp(st, 'Gold sugar dust! The ants\' feelers are dazzled: smaller zones'); }
    }
  }
  function sugar(st) {
    const sp = span(st);
    for (const q of st.c.sugar) {
      if (q.got || q.x < sp[0] - 4 || q.x > sp[1] + 4) continue;
      q.got = true; st.sugar++;
      Sfx.play('shrunkPop', 1 + (st.sugar % 5) * 0.06); K.spark(st, q.x, q.y, 5, ['#ffffff', '#fff6d0']);
    }
  }
  function checkpoint(st) {
    for (const x of st.c.cps) if (x > st.cp && st.cr.x >= x) { st.cp = x; Sfx.play('antheistFlag'); K.pop(st, x, st.c.fl(x) - 150, 'Checkpoint!', '#d9ffd0', 18); }
  }
  function goal(st) {
    if (st.cr.x < st.c.endX) return;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('shrunkCheer');
    K.pop(st, st.c.endX, st.cr.y - 170, last ? 'Out into the sunshine! The crumb is ours!' : 'Through! Onward!', '#ffffff', 26);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('antheistFanfare'); K.confetti(st, st.cr.x, st.cr.y - 160, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.cr.x - st.cam.x, y: st.cr.y - 80 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }
  function cam(st, dt) {
    const want = clamp(st.cr.x - W * 0.4, 0, st.c.endX + 300 - W);
    st.cam.x = K.lerp(st.cam.x, want, Math.min(1, dt * 5));
    st.cam.y = K.lerp(st.cam.y || 0, clamp(st.cr.y - S.base, -200, 200), Math.min(1, dt * 4));
  }
  const carrierX = (st, id) => st.cr.x + (id ? 1 : -1) * 38;
  function mirror(st) {
    for (const id of [0, 1]) K.place(id, carrierX(st, id) - st.cam.x, st.cr.y - (st.cam.y || 0) - 30);
  }

  /* ---------- what to do next ----------
     plan(st): { act: 'go' | 'wait' | 'freeze' | 'lift' | 'end', why, threat (the ant or shaft that matters most), soon (s) }
     It runs the ants' own movement a moment ahead: 'go' only if pushing for the next 0.4 s keeps the crumb out of every
     awake zone; 'freeze' if a zone is on the crumb now or will be within 0.6 s even standing still; else 'wait'. */
  function plan(st) {
    const c = st.c, cr = st.cr;
    if (st.state !== 'go') return { act: 'end' };
    const sc = zoneScale(st);
    // is the crumb (moving at v) in some zone during [0, T]?
    const hit = (v, T, slack) => {
      for (let k = 0; k <= T / 0.1; k++) {
        const t = k * 0.1, sp = span(st, cr.x + v * t);
        sp[0] -= slack; sp[1] += slack;
        for (const q of c.ants) { if (q.fool > t) continue; const a = antAt(q, t), z = zoneOf(st, a.x, a.face, S.front, S.back); if (overlaps(z[0], z[1], sp[0], sp[1])) return { q, t }; }
        for (const q of c.sleepers) if (q.awake > t) { const z = zoneOf(st, q.x, q.face, S.sleepFront, S.back); if (overlaps(z[0], z[1], sp[0], sp[1])) return { q, t }; }
        for (const sh of c.shafts) if (shaftOn(st, sh, t) && overlaps(sh.x - S.shaftR * sc, sh.x + S.shaftR * sc, sp[0], sp[1])) return { q: sh, t };
      }
      return null;
    };
    const now = hit(0, 0.6, 10);
    if (now) return { act: 'freeze', why: now.q.per ? 'march' : 'ant', threat: now.q, soon: now.t };
    const front = cr.x + S.crumbW / 2;
    if (c.fl(front + 2) < cr.y - 1) {
      const h = hit(0, 1.0, 20);
      return h ? { act: 'wait', why: 'lift', threat: h.q } : { act: 'lift', why: 'step' };
    }
    const ahead = hit(S.push, 0.4, 6);
    if (ahead) return { act: 'wait', why: ahead.q.per ? 'march' : 'ant', threat: ahead.q, soon: ahead.t };
    return { act: 'go', why: 'clear' };
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const cx = st.cam.x, cy = st.cam.y || 0, t = st.clock, c = st.c;
    // the hill's inside: packed earth
    ctx.fillStyle = '#3a2618'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-Math.round(cx), -Math.round(cy));
    const x0 = cx - 40, x1 = cx + W + 40;
    // earth grain
    for (let i = Math.floor(x0 / 70); i <= Math.ceil(x1 / 70); i++) for (let j = 0; j < 8; j++) {
      const gx = i * 70 + K.hash(i * 9 + j) * 60, gy = cy + j * 70 + K.hash(i * 7 + j * 3) * 60;
      ctx.fillStyle = j % 2 ? '#4a3222' : '#33210f'; ctx.beginPath(); ctx.ellipse(gx, gy, 6 + K.hash(i + j) * 10, 3 + K.hash(i - j) * 5, K.hash(i * j), 0, TAU); ctx.fill();
    }
    // the tunnel: a lighter band between floor and ceiling, with rounded humps
    ctx.fillStyle = '#7a5434';
    ctx.beginPath();
    let first = true;
    for (let x = Math.floor(x0 / 20) * 20; x <= x1; x += 20) { const y = c.fl(x) + 6; if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
    for (let x = Math.ceil(x1 / 20) * 20; x >= x0; x -= 20) ctx.lineTo(x, c.fl(x) - S.tunH - 10 + Math.sin(x * 0.013) * 12);
    ctx.closePath(); ctx.fill();
    // shading: dark under the ceiling, warmer near the floor, packed-earth speckles
    ctx.save(); ctx.lineJoin = 'round';
    const ceil = () => { ctx.beginPath(); let f = true; for (let x = Math.floor(x0 / 20) * 20; x <= x1; x += 20) { const y = c.fl(x) - S.tunH - 10 + Math.sin(x * 0.013) * 12; if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); } };
    const flo = () => { ctx.beginPath(); let f = true; for (let x = Math.floor(x0 / 20) * 20; x <= x1; x += 20) { const y = c.fl(x) + 6; if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); } };
    ceil(); ctx.strokeStyle = 'rgba(30,16,8,0.22)'; ctx.lineWidth = 90; ctx.stroke(); ctx.lineWidth = 44; ctx.stroke();
    flo(); ctx.strokeStyle = 'rgba(255,214,150,0.06)'; ctx.lineWidth = 120; ctx.stroke();
    ctx.restore();
    for (let i = Math.floor(x0 / 90); i <= Math.ceil(x1 / 90); i++) {
      const px = i * 90 + K.hash(i + 31) * 70, fy = c.fl(px), py = fy - 30 - K.hash(i + 32) * (S.tunH - 70);
      ctx.fillStyle = 'rgba(60,34,18,0.35)'; ctx.beginPath(); ctx.ellipse(px, py, 3 + K.hash(i + 33) * 4, 2 + K.hash(i + 34) * 2, 0, 0, TAU); ctx.fill();
      if (K.hash(i + 35) < 0.35) { ctx.fillStyle = '#9a8a78'; ctx.beginPath(); ctx.ellipse(px + 20, fy + 14 + K.hash(i) * 30, 10, 7, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(px + 17, fy + 11 + K.hash(i) * 30, 4, 2, 0.3, 0, TAU); ctx.fill(); }
    }
    // the floor edge
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 6; ctx.beginPath(); first = true;
    for (let x = Math.floor(x0 / 10) * 10; x <= x1; x += 10) { const y = c.fl(x) + 3; if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
    ctx.stroke();
    // roots hanging from the ceiling, glow mushrooms for light
    for (let i = Math.floor(x0 / 260); i <= Math.ceil(x1 / 260); i++) {
      const rx = i * 260 + K.hash(i + 5) * 120, ry = c.fl(rx) - S.tunH - 4;
      ctx.strokeStyle = '#a07850'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry - 10); ctx.quadraticCurveTo(rx + 10, ry + 30, rx - 4, ry + 50 + K.hash(i) * 30); ctx.stroke();
      if (K.hash(i + 9) < 0.5) {
        const mx = rx + 60, my = c.fl(mx) + 2;
        const lg = ctx.createRadialGradient(mx, my - 12, 4, mx, my - 12, 120);
        lg.addColorStop(0, 'rgba(150,255,200,0.28)'); lg.addColorStop(1, 'rgba(150,255,200,0)');
        ctx.fillStyle = lg; ctx.fillRect(mx - 120, my - 132, 240, 140);
        ctx.fillStyle = '#d8ffe8'; ctx.fillRect(mx - 2, my - 12, 4, 12); ctx.fillStyle = '#7affc0'; ctx.beginPath(); ctx.ellipse(mx, my - 12, 9, 6, 0, Math.PI, 0); ctx.fill();
      }
    }
    // checkpoint flags (a toothpick with a leaf)
    for (const x of c.cps) {
      if (x < x0 || x > x1) continue;
      const fy = c.fl(x), got = st.cp >= x;
      ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - 90); ctx.stroke();
      ctx.fillStyle = got ? '#8fe3b0' : '#c8b890'; ctx.beginPath(); ctx.moveTo(x, fy - 90); ctx.lineTo(x + 30, fy - 80); ctx.lineTo(x, fy - 68); ctx.fill();
    }
    // march shafts: a hole in the ceiling going up
    for (const sh of c.shafts) {
      if (sh.x < x0 - 80 || sh.x > x1 + 80) continue;
      const ty = c.fl(sh.x) - S.tunH - 10;
      ctx.fillStyle = '#6a4a2c'; ctx.fillRect(sh.x - 44, cy - 20, 88, ty - cy + 30);
      if (sh.zone || shaftWarn(st, sh)) { ctx.fillStyle = sh.zone ? 'rgba(255,90,60,0.16)' : 'rgba(255,200,120,0.12)'; ctx.fillRect(sh.x - S.shaftR * zoneScale(st), ty, 2 * S.shaftR * zoneScale(st), c.fl(sh.x) - ty); }
    }
    // sleeper chambers (alcoves dug back into the wall)
    for (const z of c.sleepers) {
      if (z.x < x0 - 100 || z.x > x1 + 100) continue;
      ctx.fillStyle = '#5a3c24'; ctx.beginPath(); ctx.ellipse(z.x, z.y - 40, 90, 60, 0, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#f4ead8'; ctx.beginPath(); ctx.ellipse(z.x - 60 + k * 14, z.y - 8, 6, 9, 0.3, 0, TAU); ctx.fill(); }
    }
    // the way out
    const ex = c.endX + 60, ey = c.fl(ex);
    const g = ctx.createRadialGradient(ex + 60, ey - 120, 10, ex + 60, ey - 120, 200);
    g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(ex - 140, ey - 320, 400, 330);
    // sugar
    for (const q of c.sugar) if (!q.got && q.x > x0 && q.x < x1) {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(0.4 + K.hash(q.x) * 0.5); ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
      if (Math.sin(t * 3 + q.x) > 0.8) { ctx.fillStyle = '#ffffff'; K.star(q.x + 7, q.y - 8, 4, 1.5, 0); ctx.fill(); }
    }
    ctx.restore();
  }
  // a soldier ant, feet line at (x, y): up = 1 on the floor, -1 upside down on the ceiling
  function ant(x, y, face, t, o = {}) {
    const up = o.up || 1, s = o.s || 1, walk = o.walk === undefined ? t * 10 : o.walk;
    ctx.save(); ctx.translate(x, y); ctx.scale(face * s, up * s);
    const body = o.col || '#b8281e', dark = '#5a120c';
    // legs
    ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const lx = -14 + k * 14, sw = Math.sin(walk + k * 2.1) * 6;
      ctx.beginPath(); ctx.moveTo(lx, -18); ctx.lineTo(lx + sw - 6, -30); ctx.lineTo(lx + sw - 10, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, -18); ctx.lineTo(lx - sw + 6, -28); ctx.lineTo(lx - sw + 8, 0); ctx.stroke();
    }
    // abdomen, thorax, head
    ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-30, -24, 20, 14, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-2, -22, 11, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(22, -26, 14, 12, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
    // eye and jaws
    const mad = o.mad || 0;
    ctx.fillStyle = mad > 0.5 ? '#ffec5a' : '#1a0a08'; circle(27, -30, 4); ctx.fill();
    if (mad > 0.5) { ctx.strokeStyle = '#1a0a08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(22, -37); ctx.lineTo(32, -33); ctx.stroke(); }
    const jaw = 0.3 + Math.sin(t * (mad > 0.5 ? 20 : 4)) * 0.2 * (0.5 + mad);
    ctx.strokeStyle = '#3a0a06'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(34, -24); ctx.quadraticCurveTo(46, -24 - jaw * 12, 50, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, -20); ctx.quadraticCurveTo(46, -18 + jaw * 10, 48, -12); ctx.stroke();
    // feelers
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    for (const k of [0, 1]) { const w = Math.sin(t * 6 + k * 2) * 6; ctx.beginPath(); ctx.moveTo(26, -36); ctx.quadraticCurveTo(36 + w, -58, 50 + w + k * 6, -52 + k * 4); ctx.stroke(); }
    ctx.restore();
  }
  function susMark(x, y, sus, t) {
    if (sus <= 0.02) return;
    const r = 15, red = sus > 0.6;
    ctx.fillStyle = 'rgba(20,10,6,0.75)'; circle(x, y, r + 3); ctx.fill();
    ctx.fillStyle = red ? '#ff5a4a' : '#ffd84a';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(sus, 0, 1)); ctx.closePath(); ctx.fill();
    text(red ? '!' : '?', x, y + 1, 18 + (red ? Math.sin(t * 20) * 2 : 0), '#ffffff', 'center');
  }
  function drawTop(st) {
    const cx = st.cam.x, cy = st.cam.y || 0, t = st.clock, c = st.c, cr = st.cr;
    ctx.save(); ctx.translate(-Math.round(cx), -Math.round(cy));
    const near = q => Math.abs(q.x - cr.x) < 520;
    // zones (only near the crumb)
    const zone = (z, top, bot, hot) => { if (!z) return; ctx.fillStyle = hot ? 'rgba(255,90,60,0.18)' : 'rgba(220,255,120,0.11)'; ctx.fillRect(z[0], top, z[1] - z[0], bot - top); };
    for (const q of c.ants) if (near(q)) { const fy = c.fl(q.x); zone(q.zone, fy - S.tunH + 10, fy, q.sus > 0.05); }
    for (const q of c.sleepers) if (q.zone && near(q)) zone(q.zone, q.y - S.tunH + 10, q.y, q.sus > 0.05);
    // the crumb and its carriers
    const fz = cr.frozen[0] && cr.frozen[1], lowered = (cr.frozen[0] ? 1 : 0) + (cr.frozen[1] ? 1 : 0);
    const by = cr.y, sh = cr.shake > 0 ? Math.sin(t * 60) * 3 : 0;
    for (const id of [0, 1]) {
      const px = carrierX(st, id), f = cr.frozen[id];
      const walk = cr.moved > 0 ? Math.sin(t * 14 + id * 3) * 0.12 : 0;
      if (!f) K.hero(id, px, by, { face: cr.push[id] || (id ? -1 : 1), rot: walk, sy: 1, vy: 0 });
    }
    const ty = by - (fz ? S.crumbH : lowered ? S.crumbH + 14 : S.crumbH + S.carry - 18), tilt = (cr.frozen[0] && !cr.frozen[1] ? -0.18 : cr.frozen[1] && !cr.frozen[0] ? 0.18 : 0);
    drawCrumb(cr.x + sh, ty, tilt, t);
    if (!fz) for (const id of [0, 1]) if (!cr.frozen[id]) {
      // hands up on the crumb
      const px = carrierX(st, id);
      ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2;
      circle(px - 7, by - 30, 3.6); ctx.fill(); ctx.stroke(); circle(px + 7, by - 30, 3.6); ctx.fill(); ctx.stroke();
    }
    if (fz) { // two pairs of feet peeking out
      for (const id of [0, 1]) { const px = carrierX(st, id); ctx.fillStyle = PDARK[id]; rr(px - 9, by - 5, 7, 5, 2); ctx.fill(); rr(px + 2, by - 5, 7, 5, 2); ctx.fill(); }
    }
    // ants
    for (const q of c.ants) {
      if (q.x < cx - 120 || q.x > cx + W + 120) continue;
      const ceil = c.fl(q.x) - S.tunH - 4;
      ant(q.x, ceil, q.face, q.t, { up: -1, s: 1.35, walk: q.pause > 0 ? 0 : q.t * 10, mad: q.sus });
      susMark(q.x + q.face * 14, ceil + 88, q.sus, t);
      if (q.fool > 0) { ctx.globalAlpha = Math.min(1, q.fool); ctx.fillStyle = 'rgba(28,26,54,0.75)'; circle(q.x + q.face * 14, ceil + 88, 13); ctx.fill(); text('✓', q.x + q.face * 14, ceil + 89, 16, '#8fe3b0', 'center'); ctx.globalAlpha = 1; }
    }
    for (const q of c.sleepers) {
      if (q.x < cx - 140 || q.x > cx + W + 140) continue;
      if (q.awake > 0) { ant(q.x, q.y, q.face, q.t, { walk: 0, s: 1.2, mad: q.sus }); susMark(q.x, q.y - 80, q.sus, t); }
      else {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(0.08); ant(0, 0, -1, 0, { walk: 0, s: 1.15 }); ctx.restore();
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(q.t * 2); text('z', q.x - 20 + Math.sin(q.t) * 6, q.y - 60 - (q.t * 12 % 30), 18, '#d8e8ff', 'center'); ctx.globalAlpha = 1;
      }
    }
    for (const sh of c.shafts) {
      if (sh.x < cx - 140 || sh.x > cx + W + 140) continue;
      if (!shaftOn(st, sh)) continue;
      const u = ((st.clock + sh.ph) % sh.per) / sh.dur, fy = c.fl(sh.x);
      // a column: ants climbing down the shaft, crossing the floor, and on down the far hole
      for (let k = 0; k < 5; k++) {
        const v = u * 5 - k * 0.6;
        if (v < 0 || v > 2) continue;
        const ay = K.lerp(fy - S.tunH - 60, fy, clamp(v, 0, 1));
        ctx.save(); ctx.translate(sh.x + (k % 2 ? 14 : -14), ay); ctx.rotate(Math.PI / 2); ant(0, 0, 1, sh.ph + st.clock + k, { s: 0.75, mad: sh.sus }); ctx.restore();
      }
      susMark(sh.x, fy - S.tunH + 30, sh.sus, t);
    }
    // a grabbing ant
    if (st.grab) { const g = st.grab, u = clamp(g.t / 0.5, 0, 1); ant(cr.x + 20, K.lerp(c.fl(cr.x) - S.tunH, cr.y - 80, u), -1, t, { mad: 1, up: u < 1 ? -1 : 1 }); }
    // noise rings
    for (const n of st.noise) { ctx.strokeStyle = 'rgba(255,220,160,' + (1 - n.t / 0.9) * 0.7 + ')'; ctx.lineWidth = 3; circle(n.x, n.y, 30 + n.t * S.noiseR); ctx.stroke(); }
    K.drawParts(st, cx);
    ctx.restore();
    K.drawPops(st, cx, cy);
  }
  function drawCrumb(x, y, tilt, t) {
    ctx.save(); ctx.translate(x, y + S.crumbH / 2); ctx.rotate(tilt);
    const w = S.crumbW, h = S.crumbH;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, h / 2 + 2, w / 2 + 4, 6, 0, 0, TAU); ctx.fill();
    // a broken-off wedge of chocolate chip cookie: round baked edge on top, crumbly broken edges at the sides
    const g = ctx.createLinearGradient(0, -h / 2 - 8, 0, h / 2);
    g.addColorStop(0, '#e8b064'); g.addColorStop(0.55, '#d4924a'); g.addColorStop(1, '#a8682c');
    ctx.fillStyle = g; ctx.strokeStyle = '#7a4a1c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 2, h / 2);
    ctx.lineTo(-w / 2 - 2, h / 2 - 10); ctx.lineTo(-w / 2 + 4, h / 2 - 18); ctx.lineTo(-w / 2, -h / 2 + 18); ctx.lineTo(-w / 2 + 8, -h / 2 + 8);
    ctx.quadraticCurveTo(0, -h / 2 - 14, w / 2 - 8, -h / 2 + 6);
    ctx.lineTo(w / 2 + 1, -h / 2 + 16); ctx.lineTo(w / 2 - 5, -2); ctx.lineTo(w / 2 + 2, 8); ctx.lineTo(w / 2 - 2, h / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // a golden top crust and little baked cracks
    ctx.strokeStyle = 'rgba(255,224,160,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 12, -h / 2 + 8); ctx.quadraticCurveTo(0, -h / 2 - 8, w / 2 - 14, -h / 2 + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,24,0.5)'; ctx.lineWidth = 1.5;
    for (const [dx, dy] of [[-24, -6], [14, 10], [36, -10]]) { ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + 6, dy + 4); ctx.lineTo(dx + 4, dy + 10); ctx.stroke(); }
    // the broken sides show the crumbly inside
    ctx.fillStyle = 'rgba(240,196,130,0.8)';
    for (const [dx, dy] of [[-w / 2 + 5, 4], [-w / 2 + 7, 14], [w / 2 - 6, -12], [w / 2 - 5, 12]]) { circle(dx, dy, 2.2); ctx.fill(); }
    // chocolate chips, with a shine
    for (const [dx, dy, r] of [[-32, 2, 8], [2, -12, 7], [28, 8, 9], [-8, 14, 6], [42, -10, 5], [-44, -12, 5]]) {
      ctx.fillStyle = '#4a2410'; ctx.beginPath(); ctx.moveTo(dx - r, dy + r * 0.6); ctx.quadraticCurveTo(dx - r * 0.6, dy - r, dx, dy - r * 1.05); ctx.quadraticCurveTo(dx + r * 0.6, dy - r, dx + r, dy + r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,190,0.45)'; circle(dx - r * 0.3, dy - r * 0.4, r * 0.25); ctx.fill();
    }
    // sugar sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy] of [[-40, 14], [-16, -4], [20, 16], [46, 4], [10, 2]]) { circle(dx, dy, 1.4 + 0.6 * Math.sin(t * 3 + dx)); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.sugar + ' / ' + st.totalSugar;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffffff', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), cr = st.cr;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    for (const id of [0, 1]) {
      const bx = K.panel(id, id ? 'right end' : 'left end', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(id, 'right') + 'PUSH', pl.act === 'go' && cr.push[id] <= 0, cr.push[id] > 0, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(id, 'down') + 'FREEZE', pl.act === 'freeze' && !cr.frozen[id], cr.frozen[id], z);
      K.chip(x0 + 2 * (cw + 6 * z), cy, cw, chh, kk(id, 'up') + 'LIFT', pl.act === 'lift', st.clock - st.liftAt[id] < S.liftWin, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting || st.grab) return;
    const P = K.prompter(st), cx = st.cam.x, cy = st.cam.y || 0;
    for (const id of [0, 1]) {
      let s = null, col = C.gold, pulse = false;
      if (pl.act === 'freeze') { s = cr.frozen[id] ? 'Frozen... stay still' : 'FREEZE! ' + K.key(id, 'down'); pulse = !cr.frozen[id]; col = cr.frozen[id] ? '#d9ffd0' : C.gold; }
      else if (pl.act === 'lift') { s = 'Lift together! ' + K.key(id, 'up'); pulse = true; }
      else if (pl.act === 'wait') { s = pl.why === 'march' ? 'Wait for the column...' : 'Wait for the ant...'; col = '#ffe7a8'; }
      else if (pl.act === 'go') { if (cr.push[id] <= 0 && !(cr.moved > 0)) { s = 'Push ' + K.key(id, 'right') + ' together'; col = '#ffe7a8'; } }
      P.say(id, s, carrierX(st, id) - cx + (id ? 30 : -30), cr.y - cy - 104, col, pulse);
    }
  }

  MODES.antheist = {
    S, compile, plan, antAt,
    medals: { bronze: 'Carry the crumb out of the ant hill', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'caught', gold: 1, silver: 5, text: n => (!n ? 'Never caught' : n === 1 ? 'Caught at most once' : `Caught at most ${n} times`), gap: (v, n) => { const d = Math.max(1, Math.ceil(v - n)); return `caught ${d} fewer time${d === 1 ? '' : 's'}`; } },
      { key: 'sugar', gold: 0.75, more: true, pct: true, word: 'the sugar' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { caught: s.caught, sugar: st.sugar / (st.totalSugar || 1) } : {}; },
    setup(st, L) {
      st.stats = { caught: 0, lifts: 0, scrapes: 0, helps: 0, roomT: [] };
      st.sugar = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalSugar = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).sugar.length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Sugar grains', value: st.sugar + ' of ' + st.totalSugar },
        { label: 'Caught', value: String(s.caught) },
        { label: 'Lifts', value: String(s.lifts) },
      ];
      out.push(s.scrapes ? 'Scrapes heard by the ants: ' + s.scrapes + '. Push together to stay quiet!' : 'Not one scrape all the way: perfect teamwork!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  SHRUNK.defs.antheist = {
    name: 'Ant Hill Heist', world: 30, kind: 'team', mode: 'antheist', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Tunnel',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> push <kbd>S</kbd> freeze <kbd>W</kbd> lift',
      bo: '<kbd>←</kbd><kbd>→</kbd> push <kbd>↓</kbd> freeze <kbd>↑</kbd> lift',
      pad: 'stick pushes, down freezes, <span data-glyph="a"></span> lifts,',
    },
    tip: 'Push ▶ together to carry the crumb. When a soldier ant\'s "?" fills, FREEZE ▼! Both press ▲ to lift it up steps.',
    map: K.stubMap(),
    rooms: [
      { title: 'The Way In',
        tip: 'Push together, quietly. Freeze ▼ under the crumb while an ant feels its way over you. When it walks on ("Just a crumb..."), go!',
        course: ['r420', 'S', 'r200', 'A360:55', 'r300', 's', 'r340', 'C', 'r180', 'u40', 'r220', 'S', 'r160', 'A420:65:-1', 'r340', 's', 'r360', 'C', 'r200', 'n50', 'r180', 'S', 'r240'] },
      { title: 'Nursery Hall',
        tip: 'Soldiers sleep here. Never drag the crumb alone: the scrape wakes them up!',
        course: ['r380', 'S', 'r160', 'Z', 'r260', 's', 'r160', 'A360:60', 'r620', 'C', 'r200', 'Z', 'r200', 'u40', 'r200', 'S', 'r140', 'A400:70:-1', 'r680', 'C', 'r160', 's', 'r160', 'u40', 'r160', 'Z', 'r200', 'S', 'r240'] },
      { title: 'Marching Shafts',
        tip: 'Tromp tromp! A column of soldiers is coming down a shaft. Freeze if you\'re under it!',
        course: ['r380', 'S', 'r220', 'M7:2.6', 'r380', 's', 'A340:60', 'r560', 'C', 'r160', 'M6:2.4', 'r200', 'u40', 'r220', 'S', 'r180', 'M7:3', 'r300', 'C', 'r200', 'n44', 'r200', 'S', 'r300'] },
      { title: 'The Queen\'s Gate',
        tip: 'The last tunnel and the way out! Ants, sleepers and marching columns: freeze, wait, then go together.',
        course: ['r380', 'S', 'r160', 'A380:65', 'r240', 'Z', 'r400', 'C', 'r140', 's', 'r160', 'M6:2.6', 'r240', 'u44', 'r200', 'S', 'r160', 'A420:72:-1', 'r260', 'Z', 'r440', 'C', 'r160', 'M7:3', 'r260', 's', 'u40', 'r200', 'S', 'r300'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.antheistHush = function (p) { this.tone(p ? 600 : 680, 0.06, 'sine', 0.02, p ? 420 : 480); };
  Sfx.extra.antheistHup = function (p) { this.tone(p ? 330 : 380, 0.08, 'triangle', 0.03, p ? 440 : 500); };
  Sfx.extra.antheistHeave = function () { this.tone(220, 0.16, 'sawtooth', 0.03, 440); this.tone(520, 0.1, 'triangle', 0.03, 700, 0.12); };
  Sfx.extra.antheistScrape = function () { this.tone(140, 0.22, 'sawtooth', 0.035, 110); this.tone(900, 0.12, 'square', 0.012, 700, 0.03); };
  Sfx.extra.antheistWake = function () { this.tone(300, 0.12, 'square', 0.035, 600); this.tone(600, 0.16, 'square', 0.035, 900, 0.12); };
  Sfx.extra.antheistSniff = function () { [900, 1100].forEach((f, i) => this.tone(f, 0.04, 'sine', 0.02, f * 0.9, i * 0.07)); };
  Sfx.extra.antheistGotcha = function () { this.tone(180, 0.25, 'sawtooth', 0.05, 90); this.tone(1200, 0.08, 'square', 0.03, 600, 0.02); };
  Sfx.extra.antheistDrum = function () { [0, 0.22, 0.6, 0.82].forEach(d => this.tone(70, 0.12, 'sine', 0.08, 50, d)); };
  Sfx.extra.antheistFlag = function () { this.tone(660, 0.08, 'triangle', 0.03); this.tone(880, 0.12, 'triangle', 0.03, null, 0.07); };
  Sfx.extra.antheistFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();

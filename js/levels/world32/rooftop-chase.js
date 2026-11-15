/* Pip & Bo - Level 32-3 Rooftop Chase (team, World 32 Superhero City). */
'use strict';

/* ===== 32-3 Rooftop Chase (mode 'roofchase', team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "chase a jewel thief. One hero swings on web-lines across the gaps, and the other turns invisible to get
   past guard drones."
   Night, high over the city. A jewel thief in a striped mask runs across the rooftops ahead, dropping jewels; the camera
   follows Pip and Bo to the right. The mode owns the tick, the camera and the picture (def.ownStep + ownHUD + noFalls);
   the engine grid is only spawns. World px; every building is a solid block from its roof down.
   BOTH run ◀ ▶ and jump ▲: small gaps between buildings, steps, air-conditioner boxes and vents are plain jumps.
   THE WEB-SLINGER (power: web lines) gets both of them over the WIDE gaps. At the edge of one, tap the action ('web'):
     a web line shoots up to the hook over the gap (a water tower, a sign, a crane). The partner taps their action next
     to the web-slinger to hold on, and off they swing. Tap the action again to let go: "Let go!" lights up while a
     let-go would land you on the far roof. Hang on too long and you swing back to the start; let go too early and you
     drop: the web catches you both and hauls you back up (a Slip).
   THE GHOST (power: invisibility) HOLDS the action ('vanish') to turn invisible, and anyone right next to them (holding
     hands) turns invisible too. The power meter drains (faster for two) and refills while visible. GUARD DRONES patrol
     some roofs with searchlights: anyone seen in a beam for a moment is SPOTTED: an alarm, a net, and both are sent
     back to the roof before that drone (Spotted). The web-slinger can't vanish alone; the ghost can't cross a wide gap.
   FALLING into a gap: the web catches you and pulls you back to the last roof you stood on (a Slip).
   JEWELS the thief dropped: on the roofs, up high, and some hanging right where a good swing goes.
   STRETCHES (jobs swap each stretch): Moonlit Roofs (Pip webs), Neon Alley (Bo), The Building Site (Pip), Clock Tower
     (Bo; the thief is cornered at the end: GOTCHA!).
   GOLD HELP (only while both are playing, announced, counted): 3 slips or spots in a stretch = gold goggles: the drone
     beams get narrower and the ghost's meter lasts twice as long for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the drones hover still and the clock stops.
   MEDAL goals (MODES.roofchase.medals, js/medals.js): Gold <= S.goldT with <= 2 slips+spots and >= 70% of the jewels;
   Silver <= S.silverT with <= 8.
   MODES.roofchase.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.roofchase*. */
(() => {
  const K = HEROCITY, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    runV: 240, acc: 2400, jumpV: 560, g: 1800, maxFall: 1100, bw: 22, bh: 26, edgeR: 76, grabR: 46, hangH: 26, push: 300,
    shareR: 52, drainOne: 0.12, drainTwo: 0.19, refill: 0.2, refillWait: 0.5, relockAt: 0.3, cone: 0.22, sweep: 0.42,
    seeR: 600, seeT: 0.25, netT: 1.2, rescueT: 0.9, leash: 520, jewelR: 22, idleWait: 12, goldT: 200, silverT: 360,
  };

  /* ---------- the course ----------
     tokens: 'R300:380' a building 300 wide with its roof at y 380; 'g70' a small gap (jump it); 'G240' a wide gap with a
     hook over it (web); 'a120' an air-conditioner box 120 px into the last building; 'v200' a vent there; 'T150' a water
     tower (scenery); 'n200' an antenna; 'D60:520' a guard drone patrolling from 60 to 520 px into the last building
     (its beams reach across neighbours); 'j120:40' a jewel 120 px in, 40 px up; 'J' three jewels along the next wide
     gap's swing. */
  function compile(def) {
    const c = { b: [], props: [], deco: [], gaps: [], drones: [], jewels: [], endX: 0 };
    let x = 0, last = null, pendJ = false;
    for (const tok of def.course) {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      if (k === 'R') { last = { x0: x, x1: x + a[0], top: a[1], seed: c.b.length * 7 + 3 }; c.b.push(last); x += a[0]; }
      else if (k === 'g') { c.gaps.push({ a: x, b: x + a[0], wide: false }); x += a[0]; }
      else if (k === 'G') {
        const g = { a: x, b: x + a[0], wide: true };
        c.gaps.push(g); x += a[0];
        if (pendJ) { g.jewels = true; pendJ = false; }
      }
      else if (k === 'a') c.props.push({ kind: 'ac', x0: last.x0 + a[0], x1: last.x0 + a[0] + 44, top: last.top - 30, base: last.top });
      else if (k === 'v') c.props.push({ kind: 'vent', x0: last.x0 + a[0], x1: last.x0 + a[0] + 30, top: last.top - 38, base: last.top });
      else if (k === 'T') c.deco.push({ kind: 'tower', x: last.x0 + a[0], y: last.top });
      else if (k === 'n') c.deco.push({ kind: 'antenna', x: last.x0 + a[0], y: last.top });
      else if (k === 'D') c.drones.push({ xa: last.x0 + a[0], xb: last.x0 + a[1], y: 0, x: last.x0 + a[0], dir: 1, ph: K.hash(x) * 6, see: [0, 0], alarm: 0 });
      else if (k === 'j') c.jewels.push({ x: last.x0 + a[0], y: last.top - (a[1] || 30), got: false, col: Math.floor(K.hash(x + a[0]) * 3) });
      else if (k === 'J') pendJ = true;
    }
    c.endX = x - 220;
    // the hooks over the wide gaps, the drones' height and their safe ends
    for (const g of c.gaps) {
      if (!g.wide) continue;
      const L = c.b.find(b => Math.abs(b.x1 - g.a) < 1), R = c.b.find(b => Math.abs(b.x0 - g.b) < 1);
      g.L = L; g.R = R; g.ax = (g.a + g.b) / 2 + 10; g.ay = Math.min(L.top, R.top) - 230;
      if (g.jewels) for (let i = 0; i < 3; i++) { const u = (i - 1) * 0.32; c.jewels.push({ x: g.ax + Math.sin(u) * 250, y: g.ay + Math.cos(u) * 250 - 6, got: false, col: i }); }
    }
    for (const d of c.drones) {
      const tops = c.b.filter(b => b.x1 > d.xa - 60 && b.x0 < d.xb + 60).map(b => b.top);
      d.y = Math.min(...tops) - 230; d.enter = d.xa - 230; d.exit = d.xb + 230;
    }
    return c;
  }
  const roofAt = (c, x) => c.b.find(b => x >= b.x0 && x <= b.x1) || null;
  const boxes = c => c.b.map(b => ({ x0: b.x0, x1: b.x1, top: b.top, bot: 4000 })).concat(c.props.map(p => ({ x0: p.x0, x1: p.x1, top: p.top, bot: p.base })));

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, job, x, y) => ({ id, job, x, y, vx: 0, vy: 0, face: 1, grounded: true, st: 'run', t: 0, stun: 0, sq: 0, safeX: x, safeY: y, inv: false, rx0: 0, ry0: 0, rx1: 0, ry1: 0, rt: 0 });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.web = def.web || 0; st.gho = 1 - st.web; st.title = def.title || '';
    st.c = compile(def); st.box = boxes(st.c);
    const top0 = st.c.b[0].top;
    st.run = [0, 1].map(id => newRunner(id, id === st.web ? 'web' : 'ghost', id === st.web ? 150 : 110, top0));
    st.meter = 1; st.lock = false; st.offT = 1; st.swing = null; st.net = null;
    st.thief = { x: 640, y: top0, vy: 0, t: 0, fly: 0 };
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false; st.gold = false;
    st.rc = { bad: 0 }; st.segStart = G.time; st.clock = st.clock || 0;
    st.cam = { x: 0, y: 0 };
    K.fx(st); labels(st); mirror(st);
    K.msg(st, k === 0 ? 'Stop, thief! After those jewels!' : 'There he goes! After him!', '#ffffff', 2.6);
  }
  function labels(st) { const w = []; w[st.web] = 'web'; w[st.gho] = 'vanish'; K.actLabels(w, 'web'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) power(st, dt);
    for (const r of st.run) runner(st, r, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { swingStep(st, dt); drones(st, dt); jewels(st); leash(st); goal(st); }
    if (st.net) netStep(st, dt);
    thief(st, dt);
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // the ghost's power: hold to vanish, the meter drains (more for two) and refills while visible
  function power(st, dt) {
    const Gh = st.run[st.gho], Wb = st.run[st.web], i = G.players[st.gho].input;
    const can = Gh.stun <= 0 && Gh.st === 'run' && !st.lock;
    const want = i.act && can;
    if (want && !Gh.inv) Sfx.play('roofchaseVanish');
    Gh.inv = want && st.meter > 0;
    const share = Gh.inv && Wb.st === 'run' && Math.abs(Wb.x - Gh.x) < S.shareR && Math.abs(Wb.y - Gh.y) < 100 && Wb.stun <= 0;
    Wb.inv = share;
    if (Gh.inv) {
      st.offT = 0;
      st.meter -= dt * (share ? S.drainTwo : S.drainOne) * (st.gold ? 0.5 : 1);
      if (st.meter <= 0) { st.meter = 0; st.lock = true; Gh.inv = false; Wb.inv = false; Sfx.play('roofchaseFizz'); K.pop(st, Gh.x, Gh.y - 60, 'Out of power!', '#ffd0c8', 20); }
    } else {
      st.offT += dt;
      if (st.offT > S.refillWait) st.meter = Math.min(1, st.meter + dt * S.refill);
      if (st.lock && st.meter >= S.relockAt) st.lock = false;
    }
    if (i.act && st.lock && G.players[st.gho].pendingAct) K.hint(st, Gh.id, 'Recharging... wait a moment', 1.4);
  }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.sq > 0) r.sq = Math.max(0, r.sq - dt * 4);
    if (r.stun > 0) { r.stun -= dt; r.vx = approach(r.vx, 0, 900 * dt); }
    if (r.st === 'rescue') { rescueStep(st, r, dt); return; }
    if (r.st === 'swing' && r.job === 'web' && live && r.stun <= 0 && G.players[r.id].pendingAct && st.swing && st.swing.state === 'swing') { if (st.swing.th > 0) letGo(st); return; }
    if (r.st === 'swing' || r.st === 'fly' || r.st === 'ride' || r.st === 'net') return;
    const p = G.players[r.id], ok = live && r.stun <= 0, i = ok ? p.input : NO_INPUT, jump = ok && p.pendingJump, act = ok && p.pendingAct;
    if (r.job === 'web' && act) webPress(st, r);
    if (r.job === 'ghost' && act && st.swing && st.swing.state === 'ready') grab(st, r);
    if (r.st === 'aim') { r.vx = 0; fall(st, r, dt); return; }
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) r.face = want;
    if (r.stun <= 0) r.vx = approach(r.vx, want * S.runV, (r.grounded ? S.acc : S.acc * 0.55) * dt);
    if (jump && r.grounded) { r.vy = -S.jumpV; r.grounded = false; Sfx.play('roofchaseJump', r.id); }
    moveX(st, r, dt);
    fall(st, r, dt);
  }
  function moveX(st, r, dt) {
    const hw = S.bw / 2;
    let nx = r.x + r.vx * dt;
    for (const b of st.box) {
      if (r.y <= b.top + 0.5 || r.y - S.bh >= b.bot) continue;
      if (nx + hw > b.x0 && nx - hw < b.x1) { if (r.x <= (b.x0 + b.x1) / 2) nx = Math.min(nx, b.x0 - hw); else nx = Math.max(nx, b.x1 + hw); r.vx = 0; }
    }
    r.x = clamp(nx, 20, st.c.endX + 400);
  }
  function fall(st, r, dt) {
    const hw = S.bw / 2;
    if (r.grounded) {
      const on = st.box.some(b => r.x + hw > b.x0 + 1 && r.x - hw < b.x1 - 1 && Math.abs(r.y - b.top) < 1);
      if (on) { const R = roofAt(st.c, r.x); if (R && r.x > R.x0 + 14 && r.x < R.x1 - 14 && Math.abs(r.y - R.top) < 1) { r.safeX = r.x; r.safeY = r.y; } return; }
      r.grounded = false;
    }
    r.vy = Math.min(S.maxFall, r.vy + S.g * dt);
    const ny = r.y + r.vy * dt;
    if (r.vy >= 0) {
      for (const b of st.box) {
        if (r.y <= b.top + 0.5 && ny >= b.top && r.x + hw > b.x0 + 1 && r.x - hw < b.x1 - 1) { r.y = b.top; r.vy = 0; r.grounded = true; r.sq = 0.6; return; }
      }
    } else {
      for (const b of st.box) if (b.bot < 1000 && r.y - S.bh >= b.bot - 0.5 && ny - S.bh < b.bot && r.x + hw > b.x0 && r.x - hw < b.x1) { r.vy = 0; return; }
    }
    r.y = ny;
    if (r.y > 640) dropped(st, r);
  }
  function dropped(st, r) {
    st.stats.slips++; st.rc.bad++;
    r.st = 'rescue'; r.rt = 0; r.rx0 = r.x; r.ry0 = Math.min(r.y, 700); r.rx1 = r.safeX; r.ry1 = r.safeY; r.vx = 0; r.vy = 0; r.inv = false;
    Sfx.play('roofchaseThwip'); Sfx.play('shrunkSquee');
    K.pop(st, r.x, 420, 'Thwip! Caught!', PCOL[st.web], 24);
    goldCheck(st);
  }
  function rescueStep(st, r, dt) {
    r.rt += dt;
    const u = clamp(r.rt / S.rescueT, 0, 1);
    r.x = K.lerp(r.rx0, r.rx1, K.smooth(u)); r.y = K.lerp(r.ry0, r.ry1, K.smooth(u)) - Math.sin(u * Math.PI) * 140;
    if (u >= 1) { r.st = 'run'; r.x = r.rx1; r.y = r.ry1; r.grounded = true; r.vy = 0; r.sq = 1; r.stun = 0.25; }
  }

  /* ---------- the web swing ---------- */
  // the wide gap whose near edge the web-slinger stands at
  function gapAt(st, r) {
    if (!r.grounded) return null;
    return st.c.gaps.find(g => g.wide && r.x <= g.a && g.a - r.x <= S.edgeR && Math.abs(r.y - g.L.top) < 1) || null;
  }
  function webPress(st, r) {
    const sw = st.swing;
    // (a second press straight after the first is ignored, so mashing the button doesn't undo the web line; and
    // there's no letting go before the swing passes its lowest point, where it could only drop them)
    if (sw && sw.state === 'ready') { if (sw.t > 0.5) { st.swing = null; r.st = 'run'; Sfx.play('roofchaseSnip'); } return; }
    if (sw && sw.state === 'swing') { if (sw.th > 0) letGo(st); return; }
    if (r.st !== 'run' || !r.grounded) return;
    const g = gapAt(st, r);
    if (!g) {
      const near = st.c.gaps.find(q => q.wide && r.x <= q.a && q.a - r.x < 240);
      K.hintOnce(st, near ? 'webEdge' + st.k : 'webWhere' + st.k, r.id, near ? 'Closer to the edge, then ' + K.key(r.id, 'act') : 'Web lines are for the wide gaps');
      return;
    }
    st.swing = { g, state: 'ready', t: 0 };
    r.st = 'aim'; r.vx = 0; r.face = 1;
    Sfx.play('roofchaseThwip'); K.part(st, g.ax, g.ay, 0, 0, 0.4, '#ffffff', 6, 0, 'star');
    K.sound(st, g.ax + 40, g.ay - 40, 'THWIP!', { size: 30 });
    if (!K.quiet(st.gho)) K.hint(st, st.gho, 'Hold on to ' + NAMES[r.id] + ': ' + K.key(st.gho, 'act') + ' next to them');
  }
  function grab(st, r) {
    const sw = st.swing, Wb = st.run[st.web];
    if (Math.abs(r.x - Wb.x) > S.grabR || Math.abs(r.y - Wb.y) > 30 || !r.grounded) { K.hint(st, r.id, 'Get right next to ' + NAMES[Wb.id] + '!', 1.6); return; }
    const g = sw.g, px = Wb.x, py = Wb.y - 13, dx = px - g.ax, dy = py - g.ay;
    sw.state = 'swing'; sw.t = 0; sw.len = Math.hypot(dx, dy); sw.th = Math.atan2(dx, dy); sw.th0 = sw.th;
    // a push off the edge: enough to come up well above the far roof (a higher roof needs a harder push)
    const rise = Math.max(0, Wb.y - g.R.top) + 50, cap = Math.sqrt(Math.max(1, 2 * S.g * sw.len * (Math.cos(sw.th0) - 0.12)));
    sw.w = Math.min(cap, Math.max(S.push, Math.sqrt(2 * S.g * rise))) / sw.len;
    sw.x0 = Wb.x; sw.y0 = Wb.y;
    Wb.st = 'swing'; r.st = 'swing'; Wb.inv = false; r.inv = false;
    if (st.hints) st.hints[r.id] = null;
    Sfx.play('roofchaseSwing'); st.stats.swings++;
    swingPos(st);
  }
  function swingPos(st) {
    const sw = st.swing, g = sw.g, Wb = st.run[st.web], Gh = st.run[st.gho];
    const hx = g.ax + Math.sin(sw.th) * sw.len, hy = g.ay + Math.cos(sw.th) * sw.len;
    Wb.x = hx; Wb.y = hy + 13; Gh.x = hx - 4; Gh.y = hy + 13 + S.hangH;
    Wb.face = sw.w >= 0 ? 1 : -1; Gh.face = Wb.face;
  }
  // where a let-go right now would land: { x, ok (on the far roof, clear of the edge) }
  function predict(st) {
    const sw = st.swing;
    if (!sw || sw.state !== 'swing') return null;
    const g = sw.g, hw = S.bw / 2, h = DT;
    // the same steps as flyStep: move x against the boxes, then fall onto a top
    let x = g.ax + Math.sin(sw.th) * sw.len, y = g.ay + Math.cos(sw.th) * sw.len + 13;
    const vx = sw.len * sw.w * Math.cos(sw.th);
    let vy = -sw.len * sw.w * Math.sin(sw.th);
    for (let k = 0; k < 240; k++) {
      const nx = x + vx * h;
      for (const b of st.box) if (y > b.top + 0.5 && y - S.bh < b.bot && nx + hw > b.x0 && nx - hw < b.x1) return { x: nx, ok: false };
      x = nx;
      vy = Math.min(S.maxFall, vy + S.g * h);
      const ny = y + vy * h;
      if (vy >= 0) for (const b of st.box) if (y <= b.top + 0.5 && ny >= b.top && x + hw > b.x0 + 1 && x - hw < b.x1 - 1) {
        const R = st.c.b.find(q => q.top === b.top && x >= q.x0 - 30 && x <= q.x1 + 30);
        return { x, ok: R === g.R && x - 4 > g.b + 16, b: R || b };
      }
      y = ny;
      if (y > 620) return { x, ok: false };
    }
    return { x, ok: false };
  }
  function swingStep(st, dt) {
    const sw = st.swing;
    if (!sw) { flyStep(st, dt); return; }
    sw.t += dt;
    if (sw.state === 'ready') {
      const Wb = st.run[st.web];
      if (Wb.st !== 'aim' || Wb.stun > 0) { st.swing = null; if (Wb.st === 'aim') Wb.st = 'run'; }
      return;
    }
    if (sw.state !== 'swing') return;
    // a pendulum (with a little extra push on the way out so the far roof is always in reach)
    sw.w += -(S.g / sw.len) * Math.sin(sw.th) * dt;
    const th0 = sw.th;
    sw.th += sw.w * dt;
    if (th0 < 0 && sw.th >= 0) K.sound(st, sw.g.ax, sw.g.ay + sw.len - 110, 'WHOOSH!', { size: 26, c1: '#ffffff', c2: '#19a89a' });
    swingPos(st);
    const pr = predict(st);
    sw.good = !!(pr && pr.ok);
    // swung all the way back: drop off at the start again
    if (sw.w < 0 && sw.th <= sw.th0) {
      const Wb = st.run[st.web], Gh = st.run[st.gho];
      st.swing = null;
      Wb.st = 'run'; Gh.st = 'run'; Wb.x = sw.x0; Wb.y = sw.y0; Gh.x = sw.x0 - 30; Gh.y = sw.y0; Wb.grounded = Gh.grounded = true; Wb.vx = Gh.vx = 0; Wb.vy = Gh.vy = 0;
      K.msg(st, 'Swung back! Let go when it says "Let go!"', '#ffffff', 2.4);
    }
  }
  function letGo(st) {
    const sw = st.swing, Wb = st.run[st.web], Gh = st.run[st.gho];
    const vx = sw.len * sw.w * Math.cos(sw.th), vy = -sw.len * sw.w * Math.sin(sw.th);
    st.swing = null;
    // the web-slinger flies; the ghost keeps hold of them until they land together
    st.fly = { g: sw.g, x0: sw.x0, y0: sw.y0 };
    Wb.st = 'fly'; Wb.vx = vx; Wb.vy = vy; Wb.grounded = false;
    Gh.st = 'ride'; Gh.grounded = false;
    Sfx.play('roofchaseRelease');
  }
  function flyStep(st, dt) {
    const f = st.fly;
    if (!f) return;
    const Wb = st.run[st.web], Gh = st.run[st.gho], hw = S.bw / 2;
    moveX(st, Wb, dt);
    Wb.vy = Math.min(S.maxFall, Wb.vy + S.g * dt);
    const ny = Wb.y + Wb.vy * dt;
    let landed = false;
    if (Wb.vy >= 0) for (const b of st.box) if (Wb.y <= b.top + 0.5 && ny >= b.top && Wb.x + hw > b.x0 + 1 && Wb.x - hw < b.x1 - 1) { Wb.y = b.top; landed = true; break; }
    if (!landed) Wb.y = ny;
    Gh.x = Wb.x - 4; Gh.y = Wb.y + S.hangH; Gh.face = Wb.face;
    if (landed) {
      st.fly = null;
      Wb.st = 'run'; Wb.vy = 0; Wb.grounded = true; Wb.sq = 1; Wb.vx *= 0.3;
      const R = roofAt(st.c, Wb.x) || st.c.b.find(b => Math.abs(b.top - Wb.y) < 1 && Wb.x >= b.x0 - 12 && Wb.x <= b.x1 + 12);
      Gh.st = 'run'; Gh.grounded = true; Gh.vy = 0; Gh.vx = 0; Gh.sq = 1; Gh.y = Wb.y;
      Gh.x = R ? clamp(Wb.x - 26, R.x0 + 14, R.x1 - 14) : Wb.x;
      Sfx.play('cityThud'); K.dust(st, Wb.x, Wb.y, null, 6);
      if (R && R !== f.g.L) K.pop(st, Wb.x, Wb.y - 70, ['Nice swing!', 'Thwip!', 'Made it!'][st.stats.swings % 3], '#ffffff', 22);
    } else if (Wb.y > 640) {
      // too early: the web catches both and pulls them back up to where they swung from
      st.fly = null;
      st.stats.slips++; st.rc.bad++;
      for (const [r, dx] of [[Wb, 0], [Gh, -30]]) {
        r.st = 'rescue'; r.rt = 0; r.rx0 = r.x; r.ry0 = Math.min(r.y, 700); r.rx1 = f.x0 + dx; r.ry1 = f.y0; r.vx = 0; r.vy = 0; r.inv = false;
      }
      Sfx.play('roofchaseThwip'); Sfx.play('shrunkSquee');
      K.pop(st, Wb.x, 420, 'Too soon! Thwip!', PCOL[st.web], 24);
      goldCheck(st);
    }
  }

  /* ---------- drones ---------- */
  const beamA = (st, d) => Math.sin(st.clock * 1.6 + d.ph) * S.sweep;
  function drones(st, dt) {
    for (const d of st.c.drones) {
      d.x += d.dir * 70 * dt;
      if (d.x > d.xb) { d.x = d.xb; d.dir = -1; } else if (d.x < d.xa) { d.x = d.xa; d.dir = 1; }
      if (d.alarm > 0) d.alarm -= dt;
      const a = beamA(st, d), half = S.cone * (st.gold ? 0.6 : 1);
      for (const r of st.run) {
        const lit = r.st === 'run' && !r.inv && seen(d, a, half, r);
        d.see[r.id] = lit ? d.see[r.id] + dt : Math.max(0, d.see[r.id] - dt * 2);
        if (d.see[r.id] >= S.seeT && !st.net) spotted(st, d, r);
      }
    }
  }
  function seen(d, a, half, r) {
    const dx = r.x - d.x, dy = r.y - 13 - (d.y + 12);
    if (dy <= 0 || Math.hypot(dx, dy) > S.seeR) return false;
    return Math.abs(Math.atan2(dx, dy) + a) < half;
  }
  function spotted(st, d, r) {
    st.stats.spots++; st.rc.bad++;
    d.alarm = 2; d.see = [0, 0];
    st.net = { d, t: 0, x: r.x, y: r.y };
    Sfx.play('cityAlarm');
    K.pop(st, r.x, r.y - 90, 'SPOTTED!', '#ff8a7a', 28);
    K.sound(st, d.x, d.y + 60, 'ZZT!', { size: 26, c1: '#7af0ff', c2: '#e8222e' });
    for (const q of st.run) { q.st = 'net'; q.vx = 0; q.inv = false; }
    if (st.swing) st.swing = null;
    goldCheck(st);
  }
  function netStep(st, dt) {
    const n = st.net;
    if (n.t < 0.3 && n.t + dt >= 0.3) K.sound(st, n.x, n.y - 70, 'SNAG!', { size: 26, c1: '#ffffff', c2: '#e8222e' });
    n.t += dt;
    if (n.t < S.netT) return;
    st.net = null;
    // both go back to the roof before that drone
    const cp = n.d.enter - 30, R = roofAt(st.c, cp) || st.c.b[0];
    st.run.forEach((q, i) => { q.st = 'run'; q.x = clamp(cp - i * 26, R.x0 + 16, R.x1 - 16); q.y = R.top; q.grounded = true; q.vy = 0; q.sq = 1; q.stun = 0.2; });
    K.msg(st, st.rc.bad <= 1 ? 'Caught in a net! Hold hands and vanish to sneak past.' : 'Back to the start of that roof. Sneak past together!', '#ffffff', 3);
  }
  function goldCheck(st) {
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold goggles! Drone beams are narrower and the vanish meter lasts twice as long');
    }
  }
  function jewels(st) {
    for (const r of st.run) {
      if (r.st === 'rescue' || r.st === 'net') continue;
      for (const q of st.c.jewels) {
        if (q.got || Math.abs(q.x - r.x) > S.jewelR || Math.abs(q.y - (r.y - 13)) > S.jewelR + 8) continue;
        q.got = true; st.jewel++;
        Sfx.play('cityPop', 1.1 + (st.jewel % 5) * 0.06); K.spark(st, q.x, q.y, 6, ['#9fe8ff', '#ffffff', '#ff9fd5']);
      }
    }
  }
  function leash(st) {
    const [a, b] = st.run;
    if (a.st !== 'run' || b.st !== 'run') return;
    const front = a.x > b.x ? a : b, back = front === a ? b : a;
    if (front.x - back.x > S.leash) { front.x = back.x + S.leash; front.vx = Math.min(front.vx, 0); K.hintOnce(st, 'leash' + front.id + st.k, front.id, 'Wait for ' + NAMES[back.id] + '!'); }
  }
  function goal(st) {
    const c = st.c;
    if (!st.run.every(r => r.grounded && r.st === 'run' && r.x >= c.endX - 30)) return;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('cityCheer');
    if (last) { st.thief.caught = true; Sfx.play('roofchaseThwip'); K.sound(st, st.thief.x, st.thief.y - 110, 'GOTCHA!', { size: 40, life: 1.4 }); K.focusAt(st, st.thief.x, st.thief.y - 24); }
    K.pop(st, c.endX + 120, c.b[c.b.length - 1].top - 200, last ? 'Webbed up with the jewels!' : 'He jumped to the next block! Swap powers!', '#ffffff', 26);
    for (const r of st.run) { r.vx = 0; r.inv = false; }
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('roofchaseFanfare'); K.confetti(st, st.c.endX + 120, st.c.b[st.c.b.length - 1].top - 160, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.endX + 120 - st.cam.x, y: 300 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }
  // the thief: runs ahead along the roofs (only for show), waits at the end of the stretch
  function thief(st, dt) {
    const T = st.thief, c = st.c, lead = Math.max(st.run[0].x, st.run[1].x);
    T.t += dt;
    if (T.caught) return;
    const lastB = c.b[c.b.length - 1];
    const goal = st.state === 'end' && !st.lastRoom ? lastB.x1 + 400 : Math.min(lead + 480, lastB.x1 - 60);
    const v = st.state === 'end' && !st.lastRoom ? 420 : clamp((goal - T.x) * 2, -40, 300);
    T.x += v * dt; T.vx = v;
    const R = roofAt(c, T.x), top = R ? R.top : 700;
    // hops gaps in a high arc
    if (!R || T.y < top - 1 || T.vy !== 0) {
      if (T.vy === 0 && R === null) T.vy = -520;
      T.vy += 1500 * dt; T.y += T.vy * dt;
      if (R && T.y >= top && T.vy > 0) { T.y = top; T.vy = 0; }
      if (T.y > 700) { T.y = top; T.vy = 0; }
    } else T.y = top;
    if (T.t > 1 && Math.random() < dt * 0.3 && st.state === 'go') K.pop(st, T.x, T.y - 60, ['Catch me if you can!', 'Too slow, heroes!', 'Ha ha ha!', 'These jewels are mine!'][Math.floor(Math.random() * 4)], '#ffd6f0', 16, { from: T });
  }

  /* ---------- the camera ---------- */
  function cam(st, dt) {
    const xs = st.run.map(r => r.x), mid = (xs[0] + xs[1]) / 2, lead = Math.max(...xs), back = Math.min(...xs);
    let want = Math.max(mid - W * 0.4, lead - W + 180);
    want = Math.min(want, back - 110);
    want = clamp(want, 0, st.c.endX + 420 - W);
    st.cam.x = K.lerp(st.cam.x, want, Math.min(1, dt * 5));
  }
  function mirror(st) {
    for (const r of st.run) K.place(r.id, r.x - st.cam.x, Math.min(r.y, 560));
  }

  /* ---------- what to do next ----------
     plan(st): { O (the next thing in the way: { kind: 'gap', g } or { kind: 'drone', d }), stage ('run' | 'web' |
       'grab' | 'swing' | 'sneak' | 'charge'), web: { x, act ('tap' | true), why }, ghost: { x, act, why },
       land (where a let-go now would land) } */
  // a spot on a roof: x itself, or the start of the next roof (forward) / the end of the one before (back)
  function onRoof(c, x, fwd) {
    const R = roofAt(c, x);
    if (R) return clamp(x, Math.min(R.x0 + 20, R.x1), Math.max(R.x1 - 20, R.x0));
    if (fwd) { const b = c.b.find(q => q.x0 > x); return b ? b.x0 + 30 : x; }
    const b = c.b.slice().reverse().find(q => q.x1 < x); return b ? b.x1 - 30 : x;
  }
  function plan(st) {
    const c = st.c, Wb = st.run[st.web], Gh = st.run[st.gho], back = Math.min(Wb.x, Gh.x);
    const out = { O: null, stage: 'run', web: { x: c.endX + 40 }, ghost: { x: c.endX + 10 }, land: null };
    const sw = st.swing;
    if (sw && sw.state === 'swing') {
      out.stage = 'swing'; out.O = { kind: 'gap', g: sw.g };
      const pr = predict(st); out.land = pr;
      out.web = { x: Wb.x, act: pr && pr.ok && pr.x > sw.g.b + 30 ? 'tap' : false, why: 'swing' };
      out.ghost = { x: Gh.x, why: 'hold' };
      return out;
    }
    // the next wide gap or drone ahead of the one at the back
    let O = null, ox = 1e9;
    for (const g of c.gaps) if (g.wide && g.b > back + 4 && g.a < ox) { O = { kind: 'gap', g }; ox = g.a; }
    for (const d of c.drones) if (d.exit > back + 4 && d.enter < ox) { O = { kind: 'drone', d }; ox = d.enter; }
    if (!O) return out;
    out.O = O;
    if (O.kind === 'gap') {
      const g = O.g, spot = g.a - 22;
      out.stage = sw && sw.state === 'ready' ? 'grab' : 'web';
      const pastW = Wb.x > g.b, pastG = Gh.x > g.b;
      if (pastW && pastG) { out.stage = 'run'; return out; }
      if (pastW || pastG) {
        // (only after a rescue mix-up) the one over waits; the other comes back to the near side and both start again
        out.web = { x: pastW ? g.b + 40 : spot, why: 'wait' }; out.ghost = { x: pastG ? g.b + 40 : spot - 28, why: 'wait' };
        return out;
      }
      const near = Math.abs(Gh.x - spot) < 150 && Gh.grounded;
      out.web = { x: spot, act: !sw && Math.abs(Wb.x - spot) < 12 && Wb.grounded && near ? 'tap' : false, why: 'web' };
      out.ghost = { x: (sw ? Wb.x : spot) - 26, why: 'grab' };
      if (sw && sw.state === 'ready') out.ghost.act = Math.abs(Gh.x - Wb.x) < S.grabR - 8 && Gh.grounded ? 'tap' : false;
      return out;
    }
    const d = O.d;
    // a drone: meet before its beams reach, vanish together (holding hands) and walk past
    const inside = back > d.enter - 4;
    const need = (d.exit - Math.max(back, d.enter)) / S.runV * S.drainTwo * (st.gold ? 0.5 : 1) + 0.12;
    if (!inside) {
      // (a little to spare before starting, so a meter right at the line doesn't flick between wait and go)
      const enough = st.meter >= 1 || st.meter >= need + (Gh.inv ? 0 : 0.08);
      out.stage = enough && !st.lock ? 'sneak' : 'charge';
      const meet = onRoof(c, d.enter - 12, false);
      const together = Math.abs(Gh.x - meet) < 30 && Math.abs(Wb.x - (meet - 26)) < 30;
      out.ghost = { x: meet, why: 'meet' }; out.web = { x: meet - 26, why: 'meet' };
      // vanish at the meeting spot, and only set off once the two are holding hands (sharing the power)
      if (out.stage === 'sneak' && (together || Gh.inv)) {
        out.ghost = { x: Wb.inv ? onRoof(c, d.exit + 44, true) : Gh.x, act: true, why: 'sneak' };
        out.web = { x: Gh.x - 24, why: 'hand' };
      }
      return out;
    }
    out.stage = 'sneak';
    const lag = Gh.x - Wb.x;
    // (the ghost leads far enough past the beams that the web-slinger, a step behind, is past them too)
    out.ghost = { x: lag > S.shareR - 14 ? Gh.x : onRoof(c, d.exit + 44, true), act: true, why: 'sneak' };
    out.web = { x: Gh.x - 24, why: 'hand' };
    if (Wb.x > Gh.x + 10) out.web.x = Gh.x + 14;
    return out;
  }

  /* ---------- drawing (the comic-book look: ink outlines, flat colours, halftone dots) ---------- */
  const INK = K.INK;
  const THEME = [
    { sky: {}, line: {} },                                                         // Moonlit Roofs
    { sky: {}, line: { neon: 1 }, sign: ['PIZZA', 'NEON', 'HERO', 'POW!', 'OPEN'] }, // Neon Alley: more neon
    { sky: { dawn: true }, line: { site: true }, crane: true },                      // The Building Site: cranes, an orange dawn
    { sky: { deep: true }, line: {}, clock: true },                                // Clock Tower: deeper navy, the tower comes closer
  ];
  function draw(st) {
    const cx = st.cam.x, t = st.clock, th = THEME[st.k % THEME.length];
    K.sky(cx, t, Object.assign({ mode: 'night', moonX: 720, moonY: 92, beams: true }, th.sky));
    const line = Object.assign({ base: 470 }, th.line);
    if (th.clock) {
      // the clock tower in the distance comes closer, then gives way to the real one at the end of the stretch
      line.clock = 0.7 * clamp(cx / Math.max(1, st.c.endX - W * 0.6), 0, 1);
      line.clockA = clamp((st.c.endX + 180 - cx - W) / 300, 0, 1);
    }
    K.skyline(cx, t, line);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    // the hooks over the wide gaps
    for (const g of st.c.gaps) if (g.wide && g.ax > cx - 300 && g.ax < cx + W + 300) drawHook(st, g, t, th);
    // buildings
    for (const b of st.c.b) {
      if (b.x1 < cx - 40 || b.x0 > cx + W + 40) continue;
      const sign = th.sign && K.hash(b.seed) < 0.6 ? th.sign[Math.floor(K.hash(b.seed + 1) * th.sign.length)] : null;
      K.facade(b.x0, b.top, b.x1 - b.x0, { seed: b.seed, fire: K.hash(b.seed + 2) < 0.4, sign });
    }
    // scenery on the roofs
    for (const q of st.c.deco) {
      if (q.x < cx - 120 || q.x > cx + W + 120) continue;
      if (q.kind === 'tower') K.waterTower(q.x, q.y, 0.9); else K.antenna(q.x, q.y, 90, t);
    }
    for (const p of st.c.props) {
      if (p.x1 < cx - 40 || p.x0 > cx + W + 40) continue;
      if (p.kind === 'ac') K.ac(p.x0, p.base, p.x1 - p.x0, p.base - p.top, t); else K.vent(p.x0, p.base, p.x1 - p.x0, p.base - p.top);
    }
    // the finish: the clock tower top in the last stretch, a rooftop door otherwise
    const lb = st.c.b[st.c.b.length - 1];
    if (th.clock) clockTop(st.c.endX + 180, lb.top, t);
    else {
      const x = lb.x1 - 160, y = lb.top;
      ctx.fillStyle = INK; ctx.fillRect(x + 5, y - 66, 70, 66);
      K.inkRect(x, y - 70, 70, 70, '#19a89a', 2);
      K.inkRect(x - 4, y - 76, 78, 8, '#5fe0cc', 2);
      K.inkRect(x + 18, y - 54, 34, 54, '#0c5c56', 1.5);
      circle(x + 46, y - 26, 3); K.inkFill('#ffe14a', 1);
    }
    ctx.restore();
  }
  // the clock tower the thief is cornered on: inked stone, a cream face, a red roof
  function clockTop(x, y, t) {
    ctx.fillStyle = INK; ctx.fillRect(x - 64, y - 214, 140, 214);
    K.inkRect(x - 70, y - 220, 140, 220, '#3e7fb0', 2.5);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 70, y - 220, 140, 220); ctx.clip(); K.dotFadeX(y - 220, y, x + 20, x + 70, '#1f4a78', 8, 0.6); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let k = 0; k < 6; k++) { const by = y - 80 + k * 13; ctx.moveTo(x - 60, by); ctx.lineTo(x - 40, by); ctx.moveTo(x + 36, by + 6); ctx.lineTo(x + 58, by + 6); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 84, y - 220); ctx.lineTo(x, y - 300); ctx.lineTo(x + 84, y - 220); ctx.closePath(); K.inkFill('#d8322e', 2.5);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - 84, y - 220); ctx.lineTo(x, y - 300); ctx.lineTo(x + 84, y - 220); ctx.closePath(); ctx.clip(); K.dotFadeX(y - 300, y - 220, x + 10, x + 84, '#8e1018', 7, 0.6); ctx.restore();
    circle(x, y - 150, 50); K.inkFill('#ffe14a', 3);
    circle(x, y - 150, 42); K.inkFill('#fff3d6', 2);
    ctx.fillStyle = INK;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; ctx.fillRect(x + Math.cos(a) * 35 - 2, y - 150 + Math.sin(a) * 35 - 2, 4, 4); }
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 150); ctx.lineTo(x + Math.sin(t * 0.5) * 24, y - 150 - Math.cos(t * 0.5) * 24); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 150); ctx.lineTo(x + Math.sin(t * 6) * 34, y - 150 - Math.cos(t * 6) * 34); ctx.stroke();
    ctx.lineCap = 'butt';
    circle(x, y - 150, 4); K.inkFill('#e8222e', 1.5);
  }
  function drawHook(st, g, t, th) {
    const x = g.ax, y = g.ay;
    if (th.crane) {
      // a crane arm reaching over the gap with a hook, an orange inked truss
      K.inkRect(x - 260, y - 46, 380, 8, '#ffb02e', 2.5);
      const truss = () => { ctx.beginPath(); for (let k = -260; k < 120; k += 20) { ctx.moveTo(x + k, y - 46); ctx.lineTo(x + k + 10, y - 60); ctx.lineTo(x + k + 20, y - 46); } ctx.moveTo(x - 260, y - 60); ctx.lineTo(x + 120, y - 60); };
      K.edge(truss, '#ffb02e', 2.5);
      const cable = () => { ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 6); };
      K.edge(cable, '#ffffff', 1.6);
      ctx.beginPath(); rr(x - 9, y - 9, 18, 11, 3); K.inkFill('#ffe14a', 2);
    } else if (th.sign) {
      // a big neon sign hanging over the alley on a bar
      const bar = () => { ctx.beginPath(); ctx.moveTo(x - 160, y - 30); ctx.lineTo(x + 30, y - 30); ctx.lineTo(x, y); };
      K.edge(bar, '#5fe0cc', 3);
      ctx.fillStyle = INK; ctx.fillRect(x - 115, y - 15, 90, 70);
      K.inkRect(x - 120, y - 20, 90, 70, '#1c2470', 2.5);
      const on = Math.sin(t * 9 + x) > -0.85, word = ['EAT', 'HERO', 'POW!', 'JAZZ'][Math.floor(K.hash(x) * 4)];
      K.word(word, x - 75, y + 15, 26, on ? '#7af0ff' : '#2a4a8a', { lw: on ? 5 : 3, shadow: 0 });
      if (on) { ctx.strokeStyle = '#ff5ab4'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 113, y - 13, 76, 56); }
    } else {
      // a flagpole sticking out from a cornice, with a ring and a pennant
      const pole = () => { ctx.beginPath(); ctx.moveTo(g.a - 10, y + 60); ctx.lineTo(x, y); };
      K.edge(pole, '#d8dcf0', 3.5);
      ctx.beginPath(); ctx.moveTo(x - 30, y + 18); ctx.lineTo(x - 30, y + 46 + Math.sin(t * 4) * 4); ctx.lineTo(x - 74, y + 34); ctx.closePath(); K.inkFill(PCOL[(st.k + 1) % 2], 2);
    }
    // the hook ring: inked, yellow with spikes when the web-slinger can use it
    const Wb = st.run[st.web], near = gapAt(st, Wb) === g;
    if (near) K.spikes(x, y, 20, '#ffe14a', t, 10);
    ctx.lineWidth = 7; ctx.strokeStyle = INK; circle(x, y, 8); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = near ? '#ffe14a' : '#ffffff'; circle(x, y, 8); ctx.stroke();
  }
  function drawDrone(st, d, t) {
    const a = beamA(st, d), half = S.cone * (st.gold ? 0.6 : 1), x = d.x, y = d.y + Math.sin(t * 3 + d.ph) * 4;
    // the searchlight: a flat printed cone with a dot screen, inked edges
    const alarm = d.alarm > 0, lit = d.see[0] > 0 || d.see[1] > 0;
    const col = alarm ? '#ff3b4a' : lit ? '#ffe14a' : '#d6f4ff', len = 560;
    ctx.save(); ctx.translate(x, y + 12);
    const cone = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-a - half) * len, Math.cos(-a - half) * len); ctx.lineTo(Math.sin(-a + half) * len, Math.cos(-a + half) * len); ctx.closePath(); };
    cone(); ctx.globalAlpha = 0.22; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); cone(); ctx.clip(); ctx.globalAlpha = 0.55; K.dotScreen(-len, 0, len, len, col, 9, 1.8); ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-a - half) * len, Math.cos(-a - half) * len); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-a + half) * len, Math.cos(-a + half) * len); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // the drone: an inked round body, two rotors, a red eye
    for (const ox of [-30, 30]) {
      const arm = () => { ctx.beginPath(); ctx.moveTo(x + ox * 0.6, y); ctx.lineTo(x + ox, y - 10); };
      K.edge(arm, '#5f6aa0', 3);
      ctx.beginPath(); ctx.ellipse(x + ox, y - 12, 4 + 16 * Math.abs(Math.sin(t * 40 + ox)), 3, 0, 0, TAU); K.inkFill('#d6f4ff', 1.5);
    }
    ctx.beginPath(); rr(x - 26, y - 6, 52, 18, 9); K.inkFill('#3a4478', 2.5);
    ctx.fillStyle = '#7a8ad0'; ctx.fillRect(x - 18, y - 4, 36, 4);
    circle(x, y + 6, 6); K.inkFill(alarm && Math.sin(t * 20) > 0 ? '#ff3b30' : lit ? '#ffb02e' : '#ff5a5a', 1.5);
    ctx.fillStyle = '#ffffff'; circle(x - 1.5, y + 4.5, 1.8); ctx.fill();
    if (lit && !alarm) K.word('?', x, y - 30, 26, '#ffe14a', { lw: 5, shadow: 2 });
    if (alarm) K.word('!', x, y - 30, 30, '#ff3b4a', { lw: 5, shadow: 2 });
  }
  function drawThief(st, t) {
    const T = st.thief;
    if (T.x < st.cam.x - 60 || T.x > st.cam.x + W + 60) return;
    const x = T.x, y = T.y, run = Math.abs(T.vx || 0) > 20;
    ctx.save(); ctx.translate(x, y);
    if (T.caught) {
      // webbed up: a white cocoon with inked web strands
      ctx.beginPath(); ctx.ellipse(0, -22, 16, 24, 0, 0, TAU); K.inkFill('#ffffff', 2.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; for (let k = -18; k < 0; k += 6) { ctx.beginPath(); ctx.moveTo(-15, -22 + k); ctx.lineTo(15, -18 + k + 6); ctx.stroke(); }
      circle(0, -42, 9); K.inkFill('#f2c8a0', 2);
      ctx.fillStyle = INK; ctx.fillRect(-8, -46, 16, 5); ctx.beginPath(); ctx.arc(0, -46, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(-3, -43.5, 1.6); ctx.fill(); circle(3, -43.5, 1.6); ctx.fill();
      ctx.restore(); return;
    }
    const leg = run ? Math.sin(t * 18) * 8 : 0;
    const legs = () => { ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-5 + leg, 0); ctx.moveTo(3, -16); ctx.lineTo(5 - leg, 0); };
    ctx.lineCap = 'round'; K.edge(legs, '#3a3a58', 3.5);
    // striped shirt
    ctx.beginPath(); rr(-9, -36, 18, 22, 5); K.inkFill('#ffffff', 2);
    ctx.fillStyle = INK; for (let k = 0; k < 4; k++) ctx.fillRect(-8, -33 + k * 5, 16, 2.4);
    // the loot sack over a shoulder
    circle(-12, -36, 10); K.inkFill('#e08a2e', 2);
    K.word('$', -12, -36, 13, '#ffe14a', { lw: 3, shadow: 0 });
    // head, cap and mask
    circle(2, -44, 8); K.inkFill('#f2c8a0', 2);
    ctx.fillStyle = INK; ctx.fillRect(-6, -47, 16, 4); ctx.beginPath(); ctx.arc(2, -48, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(5, -45, 1.6); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const q of st.c.jewels) {
      // jewels: flat inked gems with a white facet, no soft halo
      if (q.got || q.x < cx - 40 || q.x > cx + W + 40) continue;
      const yy = q.y + Math.sin(t * 3 + q.x) * 3, col = ['#7af0ff', '#ff5ab4', '#5ff07a'][q.col];
      ctx.beginPath(); ctx.moveTo(q.x, yy - 11); ctx.lineTo(q.x + 10, yy - 3); ctx.lineTo(q.x, yy + 11); ctx.lineTo(q.x - 10, yy - 3); ctx.closePath(); K.inkFill(col, 2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(q.x - 4, yy - 6); ctx.lineTo(q.x + 2, yy - 6); ctx.lineTo(q.x - 2, yy); ctx.fill();
    }
    drawThief(st, t);
    // the web line: white with an ink edge
    const sw = st.swing, Wb = st.run[st.web];
    if (sw) {
      const web = () => { ctx.beginPath(); ctx.moveTo(sw.g.ax, sw.g.ay); ctx.lineTo(Wb.x + (sw.state === 'ready' ? 8 : 0), Wb.y - 22); };
      K.edge(web, '#ffffff', 2.5);
      // the web splat on the hook
      const splat = () => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.moveTo(sw.g.ax, sw.g.ay); ctx.lineTo(sw.g.ax + Math.cos(a) * 13, sw.g.ay + Math.sin(a) * 13); } };
      K.edge(splat, '#ffffff', 1.8);
    }
    for (const r of st.run) if (r.st === 'rescue') { const web = () => { ctx.beginPath(); ctx.moveTo(r.rx1, r.ry1 - 160); ctx.lineTo(r.x, r.y - 22); }; K.edge(web, '#ffffff', 2); }
    // holding hands while invisible
    const Gh = st.run[st.gho];
    if (Gh.inv && Wb.inv) { ctx.strokeStyle = '#d6f4ff'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(Gh.x, Gh.y - 12); ctx.lineTo(Wb.x, Wb.y - 12); ctx.stroke(); ctx.setLineDash([]); }
    for (const r of st.run) drawRunner(st, r, t);
    for (const d of st.c.drones) if (d.x > cx - 300 && d.x < cx + W + 300) drawDrone(st, d, t);
    if (st.net) {
      const n = st.net, u = clamp(n.t / 0.3, 0, 1);
      for (const r of st.run) {
        const x = r.x, y = r.y - 14, s = 22 * u;
        const net = () => { ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(x - s, y + k * s / 2.5); ctx.lineTo(x + s, y + k * s / 2.5); ctx.moveTo(x + k * s / 2.5, y - s); ctx.lineTo(x + k * s / 2.5, y + s); } };
        K.edge(net, '#ffffff', 1.6);
      }
    }
    // a let-go marker while swinging: a flat green landing spot
    if (sw && sw.state === 'swing' && sw.good) { const pr = predict(st); if (pr) { ctx.beginPath(); ctx.ellipse(pr.x, (pr.b ? pr.b.top : 400) - 2, 18, 5, 0, 0, TAU); K.inkFill('#5ff07a', 2); } }
    K.drawParts(st, cx);
    ctx.restore();
    K.drawPops(st, cx, 0);
    K.drawWords(st, cx, 0, st.run);
  }
  function drawRunner(st, r, t) {
    let sy = 1 - r.sq * 0.18, rot = 0;
    const sw = st.swing;
    if (r.st === 'swing' && sw) rot = -sw.th * 0.8;
    else if (r.st === 'rescue') rot = Math.sin(r.rt * 18) * 0.3;
    else if (!r.grounded || r.st === 'fly') rot = r.face * clamp(r.vy / 2000, -0.2, 0.2);
    else if (Math.abs(r.vx) > 20) rot = r.face * 0.08;
    if (r.grounded && r.st === 'run' && !r.inv) { ctx.fillStyle = 'rgba(20,18,28,0.45)'; ctx.beginPath(); ctx.ellipse(r.x, r.y, 13, 4, 0, 0, TAU); ctx.fill(); }
    const inv = r.inv, alpha = inv ? 0.22 + 0.08 * Math.sin(t * 9 + r.id) : 1;
    if (r.st === 'swing' && r.job === 'ghost') { const Wb = st.run[st.web]; const hand = () => { ctx.beginPath(); ctx.moveTo(r.x, r.y - 22); ctx.lineTo(Wb.x, Wb.y - 2); }; K.edge(hand, PCOL[r.id], 3); }
    K.suit(r.id, r.x, r.y, { face: r.face, rot, sy, sx: 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.stun > 0 || r.st === 'net', alpha, vanish: inv, kit: r.job === 'web' ? 'web' : 'ghost', capeV: clamp(Math.abs(r.vx) / 280 + (r.st === 'swing' ? 0.8 : 0.2), 0, 1), arms: r.st === 'swing' && r.job === 'web' ? 'up' : null });
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    K.pills(st);
    const timeX0 = K.counter(st, fmtTime(G.time), '💎 ' + st.jewel + ' / ' + st.totalJewel);
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Wn = st.web, Gn = st.gho, Wb = st.run[Wn], Gh = st.run[Gn], sw = st.swing;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Wn, 'web-slinger', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, cw = bx.w - 24 * z, x0 = bx.x + 12 * z;
      const word = sw && sw.state === 'swing' ? 'LET GO' : sw ? 'CANCEL' : 'WEB LINE';
      K.chip(x0, cy, cw, chh, kk(Wn, 'act') + word, !!pl.web.act || (sw && sw.state === 'swing' && sw.good), !!sw && sw.state === 'ready', z);
    }
    {
      const bx = K.panel(Gn, 'ghost', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, x0 = bx.x + 12 * z, cw = (bx.w - 24 * z) * 0.52;
      K.chip(x0, cy, cw, chh, kk(Gn, 'act') + (sw && sw.state === 'ready' ? 'HOLD ON' : 'VANISH'), !!pl.ghost.act && !Gh.inv, Gh.inv, z);
      K.meter(x0 + cw + 8 * z, cy + chh / 2 - 5 * z, bx.w - 24 * z - cw - 8 * z, 10 * z, st.meter, st.lock ? '#e8222e' : '#5fe0cc');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => Math.min(r.y, 520) - 46;
    {
      let s = null, col = C.gold, pulse = false;
      if (sw && sw.state === 'swing') { s = sw.good ? 'Let go! ' + K.key(Wn, 'act') : 'Wait...'; pulse = sw.good; col = sw.good ? C.gold : '#ffe7a8'; }
      else if (sw) { s = 'Wait for ' + NAMES[Gn] + ' to hold on'; col = '#ffe7a8'; }
      else if (pl.stage === 'web') { s = pl.web.act ? 'Web line! ' + K.key(Wn, 'act') : Math.abs(Wb.x - pl.web.x) < 30 ? 'Wait for ' + NAMES[Gn] : 'To the edge ' + K.key(Wn, pl.web.x > Wb.x ? 'right' : 'left'); pulse = !!pl.web.act; col = pl.web.act ? C.gold : '#ffe7a8'; }
      else if (pl.stage === 'sneak' || pl.stage === 'charge') { s = Wb.inv ? 'Stay close to ' + NAMES[Gn] + '!' : pl.stage === 'charge' ? 'Wait: ' + NAMES[Gn] + ' is recharging' : 'Hold hands with ' + NAMES[Gn]; col = Wb.inv ? '#bff6ff' : '#ffe7a8'; }
      if (Wb.st === 'run' || Wb.st === 'aim' || Wb.st === 'swing') P.say(Wn, s, sx(Wb), sy(Wb), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (sw && sw.state === 'ready') { s = Math.abs(Gh.x - Wb.x) < S.grabR ? 'Hold on! ' + K.key(Gn, 'act') : 'Get next to ' + NAMES[Wn] + ' ' + K.key(Gn, Wb.x > Gh.x ? 'right' : 'left'); pulse = Math.abs(Gh.x - Wb.x) < S.grabR; }
      else if (sw) s = null;
      else if (pl.stage === 'sneak') { s = Gh.inv ? 'Keep holding ' + K.key(Gn, 'act') : 'Hold ' + K.key(Gn, 'act') + ' to vanish together'; col = Gh.inv ? '#bff6ff' : C.gold; pulse = !Gh.inv; }
      else if (pl.stage === 'charge') { s = 'Let the meter fill up'; col = '#ffe7a8'; }
      else if (pl.stage === 'web') { s = 'Stay by ' + NAMES[Wn]; col = '#ffe7a8'; }
      if (Gh.st === 'run') P.say(Gn, s, sx(Gh), sy(Gh), col, pulse);
    }
  }

  MODES.roofchase = {
    S, compile, plan, predict, roofAt,
    medals: { bronze: 'Catch the jewel thief', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'bad', gold: 2, silver: 8, text: n => (n ? `${n} or fewer slips and spots` : 'No slips and spots'), gap: (v, n) => `${Math.max(1, Math.ceil(v - n))} fewer slips and spots` },
      { key: 'jewels', gold: 0.7, more: true, pct: true, word: 'the jewels' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { bad: s.slips + s.spots, jewels: st.jewel / (st.totalJewel || 1) } : {}; },
    setup(st, L) {
      st.stats = { swings: 0, slips: 0, spots: 0, helps: 0, roomT: [] };
      st.jewel = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalJewel = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).jewels.length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.goldUsed = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    printPage() { if (G.mst.c) K.page(); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Jewels back', value: st.jewel + ' of ' + st.totalJewel },
        { label: 'Web swings', value: String(s.swings) },
        { label: 'Spotted', value: String(s.spots) },
      ];
      out.push('Slips: ' + s.slips + '. The jewel thief is webbed up and the jewels are going back to the museum!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = w => ({ label: 'web', labels: w === 0 ? ['web', 'vanish'] : ['vanish', 'web'] });
  HEROCITY.defs.roofchase = {
    name: 'Rooftop Chase', world: 31, kind: 'team', mode: 'roofchase', ownStep: true, ownHUD: true, ownPills: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Catch the jewel thief! The web-slinger swings you both over wide gaps; the ghost holds the action to vanish past drones.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Moonlit Roofs', narr: 'AFTER THAT THIEF!', web: 0, act: acts(0),
        tip: 'Pip: tap the action at a wide gap for a web line. Bo: tap the action next to Pip to hold on. Pip: tap again to let go!',
        course: ['R560:380', 'a300', 'j200:30', 'j420:90', 'g80', 'R320:360', 'v140', 'j160:40', 'J', 'G230', 'R420:380', 'T200', 'j120:30', 'j300:30', 'g90', 'R560:350',
          'D300:480', 'j150:30', 'g70', 'R520:370', 'a240', 'n400', 'j100:100', 'J', 'G250', 'R560:380', 'j200:30'] },
      { title: 'Neon Alley', narr: 'DOWN NEON ALLEY!', web: 1, act: acts(1),
        tip: 'Swap powers! Bo webs, Pip vanishes. Guard drones sweep the roofs: hold hands and vanish to slip past.',
        course: ['R520:370', 'a260', 'j200:30', 'g80', 'R360:340', 'j180:90', 'J', 'G240', 'R560:370', 'D320:500', 'j120:30', 'j320:30', 'g70', 'R300:390',
          'v200', 'J', 'G270', 'R420:360', 'j200:100', 'g90', 'R620:380', 'D320:520', 'j160:30', 'j360:30', 'g80', 'R520:370'] },
      { title: 'The Building Site', narr: 'ACROSS THE BUILDING SITE!', web: 0, act: acts(0),
        tip: 'Cranes over the gaps! Pip webs, Bo vanishes. Let go when it says "Let go!" to land on the far roof.',
        course: ['R520:380', 'v260', 'j200:40', 'J', 'G260', 'R380:350', 'a160', 'j120:90', 'g90', 'R760:380', 'D300:460', 'j220:30', 'J', 'G290', 'R360:340', 'j120:30',
          'g80', 'R420:370', 'T120', 'j300:90', 'J', 'G270', 'R1000:380', 'D300:460', 'a760', 'j200:30', 'j420:30'] },
      { title: 'Clock Tower', narr: 'CORNERED AT THE CLOCK TOWER!', web: 1, act: acts(1),
        tip: 'The thief is trapped at the clock tower! Bo webs, Pip vanishes. Everything you learned, all at once!',
        course: ['R520:370', 'a240', 'j180:30', 'J', 'G270', 'R620:340', 'D320:440', 'j200:30', 'g80', 'R380:370', 'v160', 'j120:100', 'J', 'G300', 'R680:380',
          'D320:460', 'j300:30', 'g90', 'R360:350', 'j180:30', 'J', 'G280', 'R720:370', 'D300:440', 'a540', 'j120:30', 'g70', 'R680:360', 'j200:30'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.roofchaseJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.roofchaseThwip = function () { this.tone(1800, 0.08, 'sawtooth', 0.02, 500); this.tone(600, 0.06, 'triangle', 0.02, 900, 0.05); };
  Sfx.extra.roofchaseSnip = function () { this.tone(700, 0.05, 'triangle', 0.02, 400); };
  Sfx.extra.roofchaseSwing = function () { this.tone(300, 0.5, 'sine', 0.03, 700); };
  Sfx.extra.roofchaseRelease = function () { this.tone(800, 0.1, 'triangle', 0.03, 1200); };
  Sfx.extra.roofchaseVanish = function () { this.tone(1200, 0.18, 'sine', 0.02, 400); this.tone(1600, 0.12, 'sine', 0.012, 600, 0.05); };
  Sfx.extra.roofchaseFizz = function () { this.tone(400, 0.25, 'sawtooth', 0.02, 120); };
  Sfx.extra.roofchaseFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();

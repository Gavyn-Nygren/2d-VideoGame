/* Pip & Bo - Level 41-2 Page Turner Chase (team, World 41 Pop-Up Storybook, 3D). The rules.

   Somebody has picked the book up to read it, and they read fast. A giant hand (the Reader, in a striped pyjama
   sleeve) rolls each page up behind Pip and Bo, pressing every pop-up flat as it comes. They run for it, left to
   right across four spreads, while the next scenes of the story fold up out of the paper in front of them. The book's
   paper machinery is in the way, and every piece takes two: one pulls the tab so the other can cross, then the other
   returns the favour from the far side.

   THE ROLL: one number, st.rollX (the curl's leading edge). It waits out a head start at the start of each spread,
     then moves right at the spread's speed (never over 55% of a run), stops 1.5 s at the gutter (the hand shifts its
     grip), and presses everything it reaches flat.
   FLAT: a player the Roll touches (or who falls into a gap) is pressed flat ("Flat!"). If the partner is free, the
     cut-out flutters down 2 units ahead of them and pops back into 3D 1.2 s after the Flat. Both flat within 1.2 s:
     the spread rewinds to the last bookmark (both flutter there, the Roll goes back 12 units behind it, the pieces
     after it are put back). After two rewinds on one spread the Roll slows by a quarter for the rest of that spread,
     with a gold banner ("The reader is getting sleepy"). Gold help is announced, never hidden.
   POP-UPS AHEAD: the scenery within 14 units ahead of the lead player unfolds out of the page (the picture only;
     what can be stood on or run into is solid from the start). The state is st.chunkT: for each 1-unit strip of
     the spread, the spread clock when it was reached (and st.foldT when the Roll reached it), so a run with drawing
     off is identical.
   MACHINERY (act = pull): a free player within 1 unit of a tab who holds the action button works it, standing still
     (the ship's long tab is walked). Every piece takes two, and nothing can lock: a player left behind is taken by the
     Roll and set down beside the partner (one Flat).
     Bridge: slides out over a gap while a tab is held (0.5 s); 0.4 s after letting go it slides back (a player still
       on it is carried to the nearer bank, never dropped).
     Flap: a tall flap across the route (portcullis, great wave, door); held open from a tab on either side; it never
       shuts on anybody (they are eased out to the nearer side first).
     Twin tabs: two tabs about 4 apart that work only when both are held together for 0.3 s; then the thing stays up
       (a drawbridge, a stair over a wall, or on the last page The End's night sky, the finish).
     Wheel: hold it and push right to turn it (1.4 s for a full turn) and a plank (the castle's turntable) or a beam of
       paper light (the lighthouse) is laid over a gap; it stays while held and goes 0.4 s after letting go (anybody
       on it carried off first). The far side has a plain tab (castle) or a second wheel (lighthouse).
     Ship: a galleon on a slot over the sea. Holding the long tab at the page's edge and walking it back sails the
       ship across (it goes twice as far as the walk, the walker slowed to a heave); empty and unheld it sails home;
       a tab on the far rocks pulls it across from there.
   HAZARDS: sliders (paper figures on sticks sliding across the corridor on a beat; a hit is a Bump: knocked back 1.5,
     sat down 0.5 s, counted on the results card only); gaps (a Flat); wave crests (stepping stones sliding across a
     gap of sea); the reading finger (from page 2: a round shadow grows on printed text for 1.3 s with a hum, then the
     fingertip presses for 0.7 s: under it when it lands is a Flat; never during a camera swing, one at a time).
   CAMERA: a rail along the pair, three-quarter view turned 20 degrees to look ahead; K3D.heading (which way up walks)
     is st.camH, set here from game state. One straight dash per spread swings it round behind (30 degrees a second
     at most; not with reduced motion).
   SPREADS: rooms. Both on the dog-ear (the glowing folded corner) turns the page (2.5 s, jump skips).
   Layouts: popchase-pages.js (POPCHASE). Pictures: popchase-art.js (loaded with the 3D kit). Brain:
   js/cpu/levels/world41/page-turner-chase.js. Sounds: Sfx.extra.popchase*.
*/
(() => {
  const PC = POPCHASE;
  const S = {
    reveal: 14, unfold: 0.35, flatT: 1.2, pinT: 0.45, both: 1.2, rewindT: 1.6, back: 12, gutterStop: 1.5,
    leash: 9, bumpBack: 1.5, bumpT: 0.2, sitT: 0.5, bumpImmune: 1.0, gold: 0.75, turnT: 2.5, turnFade: 0.8, dogR: 1.55, dogHold: 0.3,
    bridgeV: 2, letGo: 0.4, carryV: 4.5, fallY: -0.8, ahead: 2, swingRate: Math.PI / 6,
    flapV: 3, twinT: 0.3, turnFull: 1.4, wheelDrop: 0.8, heave: 0.3, shipBack: 0.6, shipPull: 0.6,
    fingerShadow: 1.3, fingerPress: 0.7, fingerLift: 0.5, fingerR: 1.45, endT: 3.4,
  };
  PC.S = S;
  const H34 = -20 * Math.PI / 180, HCHASE = -Math.PI / 2;  // the camera's two headings
  PC.H34 = H34; PC.HCHASE = HCHASE;
  const WORM = [
    'Bookworm: "Somebody\'s reading us! Run, and don\'t let the page catch you!"',
    'Bookworm: "A castle! Two tabs, two of you. Pull together!"',
    'Bookworm: "All hands! The sea won\'t hold still, and neither will the reader."',
    'Bookworm: "Last page! If we reach The End, they\'ll have to go to sleep!"',
  ];

  // the spread clock (seconds since this spread started; game state, never wall-clock time)
  const live = p => p.pc && p.pc.mode === 'run';
  const lead = st => Math.max(...G.players.map(p => (p.b3 ? p.b3.x : -1e9)));

  /* ---------- a spread ---------- */
  function spread(st, k) {
    const L3 = PC.build(k);
    st.k = k; st.L3 = L3; st.T = 0;
    st.rollX = -L3.pw - 1; st.rollWait = L3.def.roll.head; st.gutter = false; st.gutterT = 0;
    st.rewinds = 0; st.gold = false; st.goldT = 0;
    st.revealX = -1e9; st.chunkT = new Float32Array(Math.ceil(L3.pw * 2) + 4).fill(-1); st.foldT = new Float32Array(st.chunkT.length).fill(-1);
    st.mark = 0; L3.marks[0].on = true;
    st.turn = null; st.dogT = 0; st.msg = null; st.hinted = {};
    st.camH = (L3.swing && !reduceMotion && L3.start.x > L3.swing[0]) ? HCHASE : H34; st.swingOn = false; K3D.heading = st.camH;
    st.fwip = { n: 0, t: -9 };
    st.finger = null; st.fingerN = 0; st.fingerWait = L3.def.fingerEvery ? L3.def.fingerEvery[0] : 0;
    st.ending = null; st.alone = {};
    // the finger's fingertip, while it presses, is a solid post (no running through it)
    st.fingerSol = MOVER3.add(L3.world, { x: 0, z: 0, w: 1.6, d: 1.6, y0: -0.2, y1: PC.WALL_TOP, ghost: true, finger: true });
    crestsStep(st, 0);
    const m = L3.start;
    G.players.forEach((p, id) => {
      MOVER3.spawn(p, m.x + 0.6, 0, m.z + (id ? 1.1 : -0.3));
      p.b3.heading = Math.PI / 2; p.alive = true;
      p.pc = { mode: 'run', t: 0, bumpT: 0, sitT: 0, immune: 0, hold: null, kx: 0 };
    });
    reveal(st);
  }
  PC.spread = spread;

  /* ---------- pop-ups: which strips have unfolded or been rolled flat ---------- */
  const chunkOf = (st, x) => Math.floor(x + st.L3.pw + 2);
  PC.chunkOf = chunkOf;
  function reveal(st) {
    const want = lead(st) + S.reveal;
    if (want <= st.revealX) return;
    const a = Math.max(0, chunkOf(st, st.revealX)), b = Math.min(st.chunkT.length - 1, chunkOf(st, want));
    let n = 0;
    for (let c = a; c <= b; c++) if (st.chunkT[c] < 0) { st.chunkT[c] = st.T; n++; }
    st.revealX = want;
    // paper fwips, rising in pitch while a run of them keeps coming
    if (n && st.T > 0.2) { if (st.T - st.fwip.t > 0.8) st.fwip.n = 0; if (st.T - st.fwip.t > 0.12) { Sfx.play('popchaseFwip', Math.min(st.fwip.n++, 8)); st.fwip.t = st.T; } }
  }
  function fold(st) {
    const b = Math.min(st.foldT.length - 1, chunkOf(st, st.rollX + 1.2));
    for (let c = 0; c <= b; c++) if (st.foldT[c] < 0) { st.foldT[c] = st.T; if (st.chunkT[c] >= 0 && c % 3 === 0) Sfx.play('popchaseSlap'); }
  }

  /* ---------- the Roll ---------- */
  function rollSpeed(st) { return PC.RUN * st.L3.def.roll.speed * (st.gold ? S.gold : 1); }
  function rollStep(st, dt) {
    if (st.turn || st.finished || st.ending) return;
    if (st.rollWait > 0) { st.rollWait -= dt; return; }
    if (!st.gutter && st.rollX >= -0.1) { st.gutter = true; st.gutterT = S.gutterStop; Sfx.play('popchaseKnuckle'); }
    if (st.gutterT > 0) { st.gutterT -= dt; return; }
    let nx = st.rollX + rollSpeed(st) * dt;
    if (!st.gutter) nx = Math.min(nx, 0);
    // never past the dog-ear's corner (the turn waits for both)
    st.rollX = Math.min(nx, st.L3.pw - 0.8);
    // its paper rumble, louder as it nears the rear player
    if ((st.rumbleT = (st.rumbleT || 0) - dt) <= 0) {
      st.rumbleT = 0.6;
      const xs = G.players.filter(live).map(p => p.b3.x);
      if (xs.length) Sfx.play('popchaseRoll', clamp(1 - (Math.min(...xs) - st.rollX) / 16, 0, 1));
    }
  }

  /* ---------- tabs ---------- */
  // the tab a free, standing player is working (holding the action within reach), or null
  function tabFor(st, p) {
    const b = p.b3;
    // the ship's long tab: the walker keeps hold of it as long as they stay along it
    const was = p.pc.hold;
    if (was && was.t.strip && live(p) && p.input.act && Math.abs(b.z - was.t.z) < PC.TAB_R && b.x > was.pc.sx1 - PC.TAB_R && b.x < was.pc.sx0 + PC.TAB_R) return was;
    if (!live(p) || !p.input.act || !b.ground || p.pc.bumpT > 0 || p.pc.sitT > 0) return null;
    let best = null, bd = PC.TAB_R;
    for (const pc of st.L3.pieces) for (const t of pc.tabs) {
      const d = Math.hypot(b.x - t.x, b.z - t.z);
      if (d < bd && Math.abs(b.y) < 0.4) { bd = d; best = { pc, t }; }
    }
    return best;
  }
  // the nearest tab a free player could work right now (for the button prompt)
  PC.tabNear = function (st, p) {
    if (!live(p) || !p.b3) return null;
    for (const pc of st.L3.pieces) for (const t of pc.tabs) if (Math.hypot(p.b3.x - t.x, p.b3.z - t.z) < PC.TAB_R) return { pc, t };
    return null;
  };

  /* ---------- the machinery ---------- */
  const onSol = (b, sol) => b && b.ground && b.on === sol;
  function pieceStep(st, pc, dt) {
    const held = G.players.some(p => p.pc.hold && p.pc.hold.pc === pc);
    if (pc.kind === 'bridge') {
      const riders = G.players.filter(p => live(p) && (onSol(p.b3, pc.sol) || (!p.b3.ground && p.b3.x > pc.x0 - 0.2 && p.b3.x < pc.x0 + pc.len * pc.e + 0.2 && p.b3.y > -0.5 && Math.abs(p.b3.z - pc.z) < PC.HALF)));
      if (held) pc.wait = S.letGo;
      else if (pc.wait > 0) pc.wait -= dt;
      const was = pc.e;
      if (held) pc.e = Math.min(1, pc.e + S.bridgeV * dt);
      else if (pc.wait <= 0) {
        if (riders.length) {
          // carried to the nearer bank, never dropped
          for (const p of riders) if (p.b3.ground) {
            const mid = pc.x0 + pc.len / 2, dir = p.b3.x < mid ? -1 : 1;
            p.b3.x += dir * S.carryV * dt; MOVER3.push(st.L3.world, p.b3);
          }
        } else pc.e = Math.max(0, pc.e - S.bridgeV * dt);
      }
      if ((was === 0) !== (pc.e === 0) || (was < 1 && pc.e === 1)) Sfx.play('popchaseSlide');
      const w = pc.len * pc.e + 0.4;
      pc.sol.ghost = pc.e < 0.02; pc.sol.w = w; pc.sol.x = pc.x0 - 0.4 + w / 2;
    } else if (pc.kind === 'flap') flapStep(st, pc, held, dt);
    else if (pc.kind === 'twin') twinStep(st, pc, dt);
    else if (pc.kind === 'wheel') wheelStep(st, pc, dt);
    else if (pc.kind === 'ship') shipStep(st, pc, dt);
  }
  const holders = pc => G.players.filter(p => p.pc.hold && p.pc.hold.pc === pc);
  // a flap: open while held; shuts 0.4 s after letting go, but never on anybody (they are eased out first)
  function flapStep(st, pc, held, dt) {
    const was = pc.e;
    if (held) { pc.wait = S.letGo; pc.e = Math.min(1, pc.e + S.flapV * dt); }
    else if (pc.wait > 0) pc.wait -= dt;
    else {
      const inside = G.players.filter(p => live(p) && Math.abs(p.b3.x - pc.x) < 0.25 + MOVER3.r + 0.1 && Math.abs(p.b3.z - pc.z) < PC.HALF + 0.3);
      if (inside.length) for (const p of inside) { p.b3.x += (p.b3.x < pc.x ? -1 : 1) * S.carryV * dt; MOVER3.push(st.L3.world, p.b3); }
      else pc.e = Math.max(0, pc.e - S.flapV * dt);
    }
    if (was < 0.5 && pc.e >= 0.5) Sfx.play('popchaseFlap');
    pc.sol.ghost = pc.e > 0.8;
  }
  // twin tabs: both held at once for 0.3 s and the thing pops up and stays
  function twinStep(st, pc, dt) {
    if (pc.popped) { pc.e = Math.min(1, pc.e + dt * 2.5); return; }
    const hs = holders(pc), both = hs.length === 2 && hs[0].pc.hold.t !== hs[1].pc.hold.t;
    pc.both = both ? pc.both + dt : 0;
    pc.e = both ? Math.min(0.2, pc.both) : Math.max(0, pc.e - dt);
    // one pulling alone for a while: the Bookworm says how
    if (hs.length === 1 && !both) { pc.lone = (pc.lone || 0) + dt; if (pc.lone > 1.5 && !pc.loneSaid) { pc.loneSaid = true; say(st, 'Bookworm: "Both tabs at once!"', 3); } }
    else pc.lone = 0;
    if (pc.both >= S.twinT) {
      pc.popped = true; Sfx.play('popchaseTwin');
      if (pc.does === 'drawbridge') pc.sol.ghost = false;
      else if (pc.does === 'stair') { pc.wall.ghost = true; for (const q of pc.stair) q.ghost = false; for (const p of G.players) if (live(p)) MOVER3.push(st.L3.world, p.b3); }
      else if (pc.does === 'end') startEnding(st);
    }
  }
  // the wheel: turned by pushing right while holding it (a plain tab raises it by itself); laid at a full turn
  function wheelStep(st, pc, dt) {
    const L3 = st.L3, hs = holders(pc), was = pc.e;
    if (hs.length) {
      pc.wait = S.letGo;
      for (const p of hs) {
        if (p.pc.hold.t.wheel) { const d = p.pc.push || { x: 0, z: 0, s: 0 }, q = PC.pointAt(L3, p.pc.hold.t.s), fwd = (d.x * q.dx + d.z * q.dz) * d.s; pc.e = clamp(pc.e + fwd * dt / S.turnFull, 0, 1); pc.turning = Math.abs(fwd) > 0.2; }
        else pc.e = Math.min(1, pc.e + dt / 1.0);
      }
    } else {
      pc.turning = false;
      const riders = G.players.filter(p => live(p) && (onSol(p.b3, pc.sol) || (!p.b3.ground && p.b3.x > pc.x0 - 0.2 && p.b3.x < pc.x1 + 0.2 && p.b3.y > -0.5 && Math.abs(p.b3.z - pc.z) < PC.HALF)));
      if (pc.wait > 0) pc.wait -= dt;
      else if (riders.length && pc.e >= 1) {
        for (const p of riders) if (p.b3.ground) { const dir = p.b3.x < pc.x0 + pc.len / 2 ? -1 : 1; p.b3.x += dir * S.carryV * dt; MOVER3.push(L3.world, p.b3); }
      } else pc.e = Math.max(0, pc.e - S.wheelDrop * dt);
    }
    if (pc.turning && Math.floor(pc.e * 8) !== Math.floor(was * 8)) Sfx.play('popchaseWheel');
    if (was < 1 && pc.e >= 1) Sfx.play('popchaseSlide');
    pc.sol.ghost = pc.e < 0.999;
  }
  // the ship: walked across from the long tab, pulled across from the far tab, sails home when empty and unheld
  function shipStep(st, pc, dt) {
    const L3 = st.L3, hs = holders(pc), strip = hs.find(p => p.pc.hold.t.strip), far = hs.find(p => !p.pc.hold.t.strip);
    const riders = G.players.filter(p => live(p) && onSol(p.b3, pc.sol));
    let u = pc.u;
    // (the first 0.4 of the walk takes up the slack, so a hand resting on the tab does not nudge the ship)
    if (strip) u = clamp((pc.sx0 - 0.4 - strip.b3.x) / (pc.sx0 - 0.4 - pc.sx1), 0, 1);
    else if (far) u = Math.min(1, u + S.shipPull * dt);
    else if (!riders.length && !G.players.some(p => live(p) && !p.b3.ground && Math.abs(p.b3.x - pc.sol.x) < pc.half + 0.3 && Math.abs(p.b3.z - pc.z) < PC.HALF)) u = Math.max(0, u - S.shipBack * dt);
    if (u !== pc.u) {
      const nx = pc.home + (pc.far - pc.home) * u;
      MOVER3.movePlat(L3.world, pc.sol, nx - pc.sol.x, 0, 0, G.players.filter(p => live(p)).map(p => p.b3));
      if (Math.floor(u * 6) !== Math.floor(pc.u * 6)) Sfx.play('popchaseWheel');
      pc.u = u;
    }
    pc.e = u;
    if (!strip) pc.tabs[0].x = u > 0 ? pc.sx0 - 0.4 - u * (pc.sx0 - 0.4 - pc.sx1) : pc.sx0;
    else pc.tabs[0].x = clamp(strip.b3.x, pc.sx1, pc.sx0);
  }
  // wave crests: stepping stones sliding across the corridor, carrying whoever stands on them
  function crestsStep(st) {
    const L3 = st.L3;
    for (const c of L3.crests) {
      const z = c.zc + c.amp * Math.sin((st.T + c.phase) * Math.PI * 2 / c.period);
      if (z !== c.sol.z) MOVER3.movePlat(L3.world, c.sol, 0, 0, z - c.sol.z, G.players.filter(p => live(p)).map(p => p.b3));
    }
  }
  PC.crestZ = (c, T) => c.zc + c.amp * Math.sin((T + c.phase) * Math.PI * 2 / c.period);

  /* ---------- the reading finger ---------- */
  // a seeded 0..1 from the spread's own count (game state)
  const hash = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  function fingerStep(st, dt) {
    const L3 = st.L3, every = L3.def.fingerEvery;
    if (!every || !L3.fingerSpots.length) return;
    const f = st.finger;
    if (!f) {
      if (st.swingOn || st.rewindT > 0 || st.turn || st.ending) return;
      if ((st.fingerWait -= dt) > 0) return;
      const xs = G.players.filter(live).map(p => p.b3.x);
      if (!xs.length) return;
      const rear = Math.min(...xs), front = Math.max(...xs), aim = front + 3;
      const tabs = L3.pieces.flatMap(pc => pc.tabs), ok = L3.fingerSpots.filter(q => q.x > rear - 1 && q.x < front + 9 && q.x > st.rollX + 3
        && !tabs.some(t => Math.hypot(t.x - q.x, t.z - q.z) < 1.6) && !L3.marks.some(m => Math.hypot(m.x - q.x, m.z - q.z) < 1.6));
      if (!ok.length) { st.fingerWait = 1; return; }
      ok.sort((a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim));
      const q = ok[0];
      st.finger = { x: q.x, z: q.z, t: 0, ph: 'shadow' };
      Sfx.play('popchaseHum');
      if (!st.fingerSaid) { st.fingerSaid = true; say(st, 'Bookworm: "Mind the finger!"', 3); }
      return;
    }
    f.t += dt;
    if (f.ph === 'shadow' && f.t >= S.fingerShadow) {
      f.ph = 'press'; f.t = 0; Sfx.play('popchasePress');
      for (const p of G.players) if (live(p) && p.b3.y < 1.2 && Math.hypot(p.b3.x - f.x, p.b3.z - f.z) < S.fingerR) flatten(st, p, 'finger');
      Object.assign(st.fingerSol, { x: f.x, z: f.z, ghost: false });
      for (const p of G.players) if (live(p)) MOVER3.push(L3.world, p.b3);
    } else if (f.ph === 'press' && f.t >= S.fingerPress) { f.ph = 'lift'; f.t = 0; st.fingerSol.ghost = true; }
    else if (f.ph === 'lift' && f.t >= S.fingerLift) {
      st.finger = null; st.fingerN++;
      st.fingerWait = every[0] + hash(st.fingerN + st.k * 31) * (every[1] - every[0]);
    }
  }

  /* ---------- the finish (the last page's twin tabs under The End) ---------- */
  function startEnding(st) {
    st.ending = { t: 0 }; st.stats.pageT[st.k] = st.T;
    say(st, 'The End!', 3.4, true);
    Sfx.play('popchaseTheEnd'); Sfx.play('popchaseYawn');
  }
  function endingStep(st, dt) {
    const e = st.ending;
    e.t += dt;
    for (const p of G.players) { p.pendingJump = false; if (live(p)) MOVER3.step(p, st.L3.world, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false }); }
    if (e.t >= S.endT && !st.finished) { st.finished = true; levelClear(); }
  }

  /* ---------- sliders ---------- */
  // a slider's beat: wait at one end, its slot glows (tell, 0.7 s, a rising note), slide across (1.1 s), wait...
  function sliderAt(sl, T) {
    const P = sl.period, h = P / 2, t = ((T + sl.phase) % P + P) % P, half = t < h ? 0 : 1, u = t - half * h;
    const slide = 1.1, tellT = 0.7, w = h - slide;
    let pos, tell = 0, moving = false;
    if (u < w) { pos = half; tell = u > w - tellT ? (u - (w - tellT)) / tellT : 0; }
    else { const k = (u - w) / slide; pos = half + (1 - 2 * half) * (k * k * (3 - 2 * k)); moving = true; }
    return { pos, tell, moving, dir: half ? -1 : 1 };
  }
  PC.sliderAt = sliderAt;
  function slidersStep(st, dt) {
    for (const sl of st.L3.sliders) {
      const a = sliderAt(sl, st.T), was = sl.tell;
      sl.pos = a.pos; sl.tell = a.tell; sl.moving = a.moving;
      sl.zNow = sl.z0 + (sl.z1 - sl.z0) * a.pos;
      if (was === 0 && a.tell > 0 && Math.abs(lead(st) - sl.x) < 16) Sfx.play('popchaseTell');
      if (!a.moving) continue;
      for (const p of G.players) {
        const b = p.b3;
        if (!live(p) || p.pc.immune > 0 || b.y > 1.1) continue;
        if (Math.abs(b.x - sl.x) < 0.55 && Math.abs(b.z - sl.zNow) < 0.62) bump(st, p, sl);
      }
    }
  }
  function bump(st, p, sl) {
    const pc = p.pc;
    pc.bumpT = S.bumpT; pc.sitT = S.sitT; pc.immune = S.bumpImmune; pc.hold = null;
    // knocked back along the route (or sideways, the way the figure was sliding, if back is a gap)
    const b = p.b3, back = PC.pointAt(st.L3, Math.max(0, PC.progress(st.L3, b.x, b.z) - S.bumpBack));
    let kx = back.x - b.x, kz = back.z - b.z;
    if (!PC.standable(st.L3, back.x, back.z, b.y)) { kx = 0; kz = (sl.dir || 1) * S.bumpBack; }
    pc.kx = kx / S.bumpT; pc.kz = kz / S.bumpT;
    st.stats.bumps++; Sfx.play('popchaseBump', p.id);
    if (st.fx) st.fx.push({ kind: 'bump', x: b.x, y: b.y + 1, z: b.z, t: 0 });
  }

  /* ---------- Flat ---------- */
  function flatten(st, p, why) {
    const pc = p.pc, b = p.b3, o = G.players[1 - p.id];
    pc.mode = 'flat'; pc.t = 0; pc.why = why; pc.hold = null;
    pc.from = { x: b.x, y: b.y, z: b.z, h: b.heading };
    pc.flatAt = st.T;
    st.stats.flats++; st.stats.pageFlats[st.k]++;
    Sfx.play('popchaseFlat', p.id);
    if (st.fx) st.fx.push({ kind: 'flat', x: b.x, y: Math.max(0, b.y) + 1.2, z: b.z, t: 0, id: p.id });
    const op = o.pc;
    if (op.mode !== 'run' && !(op.mode === 'fly' && op.rewind) && st.T - (op.flatAt != null ? op.flatAt : -9) < S.both) rewind(st);
    else if (op.mode === 'run') pc.to = landSpot(st, o);
    else pc.to = null; // the partner is popping back up: land beside them when they do
  }
  // where a fluttering cut-out lands: 2 units ahead of the partner along the route, on floor they can walk to
  function landSpot(st, o) {
    const L3 = st.L3, b = o.b3, s0 = PC.progress(L3, b.x, b.z);
    for (const ds of [S.ahead, 1.5, 1, 0.5]) {
      const q = PC.pointAt(L3, s0 + ds);
      for (const side of [0, 0.7, -0.7]) {
        const x = q.x - q.dz * side, z = q.z + q.dx * side;
        if (x > st.rollX + 1.5 && PC.walkable(L3, b, { x, z }, b.y)) return { x, y: b.y, z };
      }
    }
    for (const [dx, dz] of [[0, 0.8], [0, -0.8], [0.8, 0], [-0.8, 0]]) if (PC.standable(L3, b.x + dx, b.z + dz, b.y) && b.x + dx > st.rollX + 1) return { x: b.x + dx, y: b.y, z: b.z + dz };
    return { x: b.x, y: b.y, z: b.z + 0.01 };
  }
  function rewind(st) {
    const L3 = st.L3, m = L3.marks[st.mark];
    st.rewinds++; st.stats.rewinds++;
    G.players.forEach(p => {
      const pc = p.pc;
      if (pc.mode === 'run') { pc.from = { x: p.b3.x, y: p.b3.y, z: p.b3.z, h: p.b3.heading }; pc.flatAt = st.T; st.stats.flats++; st.stats.pageFlats[st.k]++; }
      pc.mode = 'fly'; pc.rewind = true; pc.t = Math.max(pc.t, 0);
      pc.to = { x: m.x + 0.6, y: 0, z: m.z + (p.id ? 1.1 : -0.3) };
    });
    st.rewindT = S.rewindT;
    st.rollX = Math.min(st.rollX, m.x - S.back); st.rollWait = 0;
    if (m.x <= 0.5) st.gutter = st.rollX >= 0 ? st.gutter : false;
    // the pop-ups between the bookmark and the players stand up again; the pieces after it are put back
    const c0 = Math.max(0, chunkOf(st, st.rollX + 1.2));
    for (let c = c0; c < st.foldT.length; c++) st.foldT[c] = -1;
    for (const pc of L3.pieces) {
      if (pc.tabs[0].x <= m.x && !(pc.kind === 'ship' && pc.x0 > m.x)) continue;
      pc.e = 0; pc.wait = 0;
      if (pc.kind === 'ship') { MOVER3.movePlat(L3.world, pc.sol, pc.home - pc.sol.x, 0, 0, []); pc.u = 0; pc.tabs[0].x = pc.sx0; }
      else if (pc.kind === 'flap') pc.sol.ghost = false;
      else if (pc.kind === 'twin') { if (pc.does === 'end') continue; pc.popped = false; pc.both = 0; if (pc.sol) pc.sol.ghost = true; if (pc.wall) { pc.wall.ghost = false; for (const q of pc.stair) q.ghost = true; } }
      else if (pc.sol) pc.sol.ghost = true;
    }
    if (st.finger) { st.finger = null; st.fingerSol.ghost = true; st.fingerWait = 3; }
    Sfx.play('popchaseRewind');
    if (st.rewinds >= 2 && !st.gold) {
      st.gold = true; st.goldT = 4; st.stats.gold++;
      say(st, 'The reader is getting sleepy', 4, true); Sfx.play('popchaseYawn');
    }
  }
  function flatStep(st, p, dt) {
    const pc = p.pc, o = G.players[1 - p.id];
    pc.t += dt;
    if (pc.mode === 'flat') {
      if (!pc.to && o.pc.mode === 'run') pc.to = landSpot(st, o);
      if (pc.t >= S.pinT && pc.to) { pc.mode = 'fly'; Sfx.play('popchaseFlutter', p.id); }
      return;
    }
    if (pc.mode === 'fly') {
      const end = pc.rewind ? S.rewindT : S.flatT;
      if (pc.t >= end) {
        const q = pc.to;
        MOVER3.spawn(p, q.x, q.y, q.z); p.b3.heading = Math.PI / 2;
        p.pc = { mode: 'run', t: 0, bumpT: 0, sitT: 0, immune: 0.6, hold: null, kx: 0, popT: 0 };
        Sfx.play('popchasePop', p.id);
        if (st.fx) st.fx.push({ kind: 'pop', x: q.x, y: q.y + 0.5, z: q.z, t: 0 });
      }
    }
  }
  PC.flatPose = function (st, p) {
    // where the cut-out is drawn: pressed onto the curl, then fluttering down to its landing spot
    const pc = p.pc, f = pc.from;
    if (pc.mode === 'flat' || !pc.to) return { x: Math.max(f.x, st.rollX - 0.2), y: f.y, z: f.z, k: 0, flat: true };
    const end = pc.rewind ? S.rewindT : S.flatT, start = pc.rewind ? 0 : S.pinT, k = clamp((pc.t - start) / (end - start), 0, 1);
    return { x: f.x + (pc.to.x - f.x) * k, y: f.y + (pc.to.y - f.y) * k + Math.sin(k * Math.PI) * 3.2, z: f.z + (pc.to.z - f.z) * k, k, flat: k < 0.9 };
  };

  /* ---------- talk ---------- */
  function say(st, text, secs = 3, gold = false) { st.msg = { text, t: secs, max: secs, gold }; }
  PC.say = say;

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.L3) return;
    if (G.introT > 0) { for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; } return; }
    st.T += dt;
    if (st.msg && (st.msg.t -= dt) <= 0) st.msg = null;
    if (st.fx) { for (const f of st.fx) f.t += dt; st.fx = st.fx.filter(f => f.t < 1.2); }
    if (st.turn) { turnStep(st, dt); return; }
    if (st.ending) { endingStep(st, dt); return; }
    if (st.rewindT > 0) st.rewindT -= dt;
    else rollStep(st, dt);
    const L3 = st.L3, ps = G.players;
    // who is working a tab (decided before anyone moves)
    for (const p of ps) {
      const h = live(p) ? tabFor(st, p) : null;
      if (h && (!p.pc.hold || p.pc.hold.t !== h.t)) Sfx.play('popchaseTab', p.id);
      p.pc.hold = h;
    }
    crestsStep(st);
    // the soft leash: the leader is slowed when 9 ahead along the route, the rear player never dragged
    const prog = ps.map(p => (live(p) ? PC.progress(L3, p.b3.x, p.b3.z) : null));
    for (const p of ps) {
      const pc = p.pc;
      if (!live(p)) { flatStep(st, p, dt); continue; }
      pc.immune = Math.max(0, pc.immune - dt);
      if (pc.bumpT > 0) {
        pc.bumpT -= dt;
        const b = p.b3; b.x += pc.kx * dt; b.z += pc.kz * dt; b.vx = b.vz = 0; MOVER3.push(L3.world, b);
        p.pendingJump = false;
        MOVER3.step(p, L3.world, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false, teeter: false });
        continue;
      }
      if (pc.sitT > 0) { pc.sitT -= dt; p.pendingJump = false; MOVER3.step(p, L3.world, dt, { dir: { x: 0, z: 0, s: 0 }, jump: false }); continue; }
      let dir = K3D.moveDir(p), speed = 1;
      pc.push = dir;
      // holding a tab: standing still (a wheel is turned by the push), except the ship's long tab, walked at a heave
      if (pc.hold && pc.hold.t.strip) { speed = S.heave; p.pendingJump = false; }
      else if (pc.hold) { dir = { x: 0, z: 0, s: 0 }; p.pendingJump = false; }
      const o = ps[1 - p.id], me = prog[p.id], them = prog[o.id];
      // (not while the one behind is working a tab for them or riding the ship: the rider must be able to step off and pull)
      if (them != null && !o.pc.hold && !(o.b3.ground && o.b3.on && o.b3.on.ship) && me - them > S.leash - 1.2 && dir.s > 0) {
        const q = PC.pointAt(L3, me), fwd = dir.x * q.dx + dir.z * q.dz;
        if (fwd > 0) speed = clamp((S.leash + 0.3 - (me - them)) / 1.5, 0.05, 1);
      }
      MOVER3.step(p, L3.world, dt, { dir, speed, jump: !(pc.hold && pc.hold.t.strip) });
      if (p.b3.whoa) Sfx.play('popchaseWhoa', p.id);
      if (p.b3.land) Sfx.play('land');
    }
    if (live(ps[0]) && live(ps[1])) MOVER3.separate(ps[0].b3, ps[1].b3);
    for (const pc of L3.pieces) pieceStep(st, pc, dt);
    slidersStep(st, dt);
    fingerStep(st, dt);
    // the Roll and gaps
    for (const p of ps) {
      if (!live(p)) continue;
      const b = p.b3;
      if (b.x - MOVER3.r < st.rollX) flatten(st, p, 'roll');
      else if (b.y < S.fallY) flatten(st, p, 'fall');
    }
    // the closest call: the smallest gap between a free player and the Roll's edge (once it is moving)
    if (st.rollWait <= 0) for (const p of ps) if (live(p)) st.stats.closest = Math.min(st.stats.closest, p.b3.x - MOVER3.r - st.rollX);
    // bookmarks: the lead player passing one lights it (the rewind point)
    for (let i = st.mark + 1; i < L3.marks.length; i++) {
      const m = L3.marks[i];
      if (ps.some(p => live(p) && p.b3.x > m.x - 0.4)) { st.mark = i; m.on = true; Sfx.play('popchaseMark'); }
    }
    reveal(st); fold(st);
    // hints: the Bookworm names a piece the first time the pair reaches it
    for (const pc of L3.pieces) if (pc.tip && !st.hinted[pc.i] && ps.some(p => live(p) && Math.abs(p.b3.x - pc.tabs[0].x) < 5)) { st.hinted[pc.i] = true; say(st, 'Bookworm: "' + pc.tip + '"', 4); }
    dogEar(st, dt);
    camStep(st, dt);
  }

  /* ---------- the camera's heading (game state: which way "up" walks) ---------- */
  function camStep(st, dt) {
    const sw = st.L3.swing, lx = lead(st);
    st.swingOn = !!sw && !reduceMotion && lx > sw[0] && lx < sw[1] + 1;
    const want = st.swingOn ? HCHASE : H34, d = want - st.camH, m = S.swingRate * dt;
    st.camH += clamp(d, -m, m);
    K3D.heading = st.camH;
  }

  /* ---------- the dog-ear and the page turn ---------- */
  function dogEar(st, dt) {
    const d = st.L3.dogEar;
    if (!d) return;
    const on = G.players.map(p => live(p) && p.b3.ground && Math.hypot(p.b3.x - d.x, p.b3.z - d.z) < S.dogR);
    st.dogOn = on;
    if (on[0] && on[1]) {
      st.dogT += dt;
      if (st.dogT >= S.dogHold) {
        st.turn = { t: 0, dur: reduceMotion ? S.turnFade : S.turnT, from: G.players.map(p => ({ x: p.b3.x, z: p.b3.z })) };
        st.stats.pageT[st.k] = st.T;
        Sfx.play('popchaseDogEar'); Sfx.play('popchasePageTurn');
      }
    } else st.dogT = 0;
  }
  function turnStep(st, dt) {
    const tr = st.turn;
    tr.t += dt;
    const skip = tr.t > 0.4 && G.players.some(p => p.pendingJump);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (tr.t >= tr.dur || skip) {
      if (st.k < PC.pages.length - 1) nextRoom();
      else if (!st.finished) { st.finished = true; levelClear(); }
    }
  }

  /* ---------- the mode ---------- */
  MODES.popchase = {
    S, scene3dOpts: { bg: '#241a22', fov: 26, far: 700 },
    medals: { bronze: 'Reach The End', goals: [{ key: 'time', gold: 250, silver: 380 }, { key: 'flats', gold: 1, silver: 5, word: 'flat' }] },
    medalValues() { const st = G.mst; return { flats: st.stats ? st.stats.flats : 0 }; },
    setup(st) {
      st.stats = { flats: 0, bumps: 0, closest: 1e9, pageFlats: [0, 0, 0, 0], rewinds: 0, gold: 0, pageT: [] };
      st.fx = [];
      K3D.heading = H34;
      spread(st, 0);
    },
    room(k) { const st = G.mst; spread(st, k); },
    step(dt) { tick(G.mst, dt); },
    scene3d(K) { if (PC.art) PC.art.scene(K, G.mst); },
    draw3d(K, dt) { if (PC.art) PC.art.draw(K, G.mst, dt); },
    drawTop() { if (PC.art) PC.art.drawTop(G.mst); },
    hud() { hud(G.mst); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const close = s.closest > 1e8 ? 'never close' : s.closest < 0.4 ? 'a whisker' : s.closest < 1 ? 'half a step' : s.closest < 2 ? 'one step' : Math.round(s.closest) + ' steps';
      const out = [
        { label: 'Flats', value: String(s.flats) },
        { label: 'Bumps', value: String(s.bumps) },
        { label: 'Closest call', value: close },
      ];
      const worst = s.pageFlats.indexOf(Math.max(...s.pageFlats));
      if (s.pageFlats[worst] > 0) out.push('Most Flats on ' + PC.pages[worst].title + ' (' + s.pageFlats[worst] + ').');
      if (s.gold) out.push('The reader got sleepy ' + s.gold + (s.gold === 1 ? ' time' : ' times') + ' (gold help).');
      return out;
    },
  };

  /* ---------- the HUD (flat, over the 3D picture) ---------- */
  function hud(st) {
    if (!st.L3) return;
    // time and Flats, top middle (nothing in the top-right corner: the pause button)
    const t = G.time, mm = Math.floor(t / 60), ss = Math.floor(t % 60);
    const label = mm + ':' + String(ss).padStart(2, '0');
    pill(W / 2, 12, 176, 30, 'center');
    text(label, W / 2 - 46, 28, 16, C.paper, 'center', 'body');
    // a little flat paper figure, then the count
    ctx.save(); ctx.translate(W / 2 + 18, 27); ctx.rotate(-0.25);
    ctx.fillStyle = '#f3ead2'; rr(-9, -6, 18, 12, 3); ctx.fill(); ctx.strokeStyle = '#2b2130'; ctx.lineWidth = 1.2; rr(-9, -6, 18, 12, 3); ctx.stroke();
    ctx.fillStyle = '#2b2130'; ctx.beginPath(); ctx.arc(-3, -1, 1.3, 0, Math.PI * 2); ctx.arc(3, -1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    text('Flats ' + st.stats.flats, W / 2 + 32, 28, 15, C.paper, 'left', 'body');
    if (PC.art && PC.art.hud) PC.art.hud(st);
    // the Bookworm and the gold help speak in one banner under the top bar
    if (st.msg) {
      const a = clamp(st.msg.t / 0.4, 0, 1) * clamp((st.msg.max - st.msg.t) / 0.25, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.min(W - 60, ctx.measureText(st.msg.text).width + 40);
      ctx.fillStyle = st.msg.gold ? 'rgba(120,84,10,0.92)' : 'rgba(23,25,29,0.86)'; rr(W / 2 - w / 2, 52, w, 32, 16); ctx.fill();
      if (st.msg.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(W / 2 - w / 2, 52, w, 32, 16); ctx.stroke(); }
      text(st.msg.text, W / 2, 68.5, 15, st.msg.gold ? '#ffe9a8' : C.paper, 'center', 'body');
      ctx.restore();
    }
  }

  /* ---------- the level ---------- */
  const legend = {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move <kbd>Space</kbd> jump <kbd>F</kbd> pull or hold a tab',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> move <kbd>Right Shift</kbd> jump <kbd>/</kbd> pull or hold a tab',
  };
  PC.def = {
    name: 'Page Turner Chase', world: 40, kind: 'team', mode: 'popchase', outfit: 'popchase',
    view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Page',
    legend,
    tip: 'The page is rolling up behind you. Run, and work the tabs for each other.',
    howTo: ['Run right. Don\'t let the page roll you up.', 'Hold a tab so your partner can cross.', 'Then they hold one for you.'],
    act: { label: 'pull' },
    map: Array.from({ length: 18 }, (_, y) => (y === 16 ? '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10) : '.'.repeat(32))),
    rooms: PC.pages.map((p, k) => ({ title: p.title, tip: WORM[k] || p.title })),
  };

  /* ---------- sounds (paper, the Reader) ---------- */
  const X = Sfx.extra;
  X.popchaseFwip = function (pitch, n) { const f = 500 + (n || 0) * 70; this.noise(0.09, { type: 'bandpass', f: f * 3, to: f * 6, q: 1.4, vol: 0.03 }); this.tone(f, 0.06, 'triangle', 0.012, f * 1.6); };
  X.popchaseSlap = function () { this.noise(0.12, { type: 'lowpass', f: 1800, to: 300, vol: 0.06 }); this.tone(110, 0.1, 'sine', 0.04, 60); };
  X.popchaseFlat = function (pitch) { this.tone(900 * pitch, 0.12, 'square', 0.03, 300 * pitch); this.noise(0.18, { type: 'lowpass', f: 2200, to: 200, vol: 0.07 }); this.tone(1400 * pitch, 0.08, 'sine', 0.03, 2200 * pitch, 0.08); };
  X.popchaseFlutter = function () { for (let i = 0; i < 5; i++) this.noise(0.05, { type: 'bandpass', f: 2600 + i * 200, q: 2, vol: 0.018, delay: i * 0.09 }); };
  X.popchasePop = function (pitch) { this.tone(420 * pitch, 0.07, 'sine', 0.06, 900 * pitch); this.noise(0.05, { type: 'highpass', f: 2000, vol: 0.02 }); };
  X.popchaseTab = function () { this.noise(0.06, { type: 'bandpass', f: 1600, q: 1.5, vol: 0.04 }); this.tone(300, 0.05, 'triangle', 0.03, 380); };
  X.popchaseSlide = function () { this.noise(0.35, { type: 'bandpass', f: 900, to: 1500, q: 1.2, vol: 0.04 }); };
  X.popchaseBump = function (pitch) { this.tone(200 * pitch, 0.12, 'square', 0.04, 120 * pitch); this.noise(0.08, { type: 'lowpass', f: 900, vol: 0.05 }); };
  X.popchaseTell = function () { this.tone(330, 0.6, 'sine', 0.018, 660); };
  X.popchaseKnuckle = function () { for (let i = 0; i < 3; i++) this.noise(0.03, { type: 'highpass', f: 2500, vol: 0.06, delay: i * 0.07 }); this.tone(90, 0.3, 'sine', 0.05, 70, 0.2); };
  X.popchaseYawn = function () { this.tone(220, 1.4, 'sawtooth', 0.02, 140); this.tone(330, 1.2, 'sine', 0.02, 180, 0.1); this.noise(1.2, { type: 'lowpass', f: 700, to: 300, vol: 0.03 }); };
  X.popchaseDogEar = function () { [660, 880, 1100].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.04, null, i * 0.07)); };
  X.popchasePageTurn = function () { this.noise(1.0, { type: 'bandpass', f: 1200, to: 400, q: 0.8, vol: 0.07 }); this.tone(150, 0.5, 'sine', 0.03, 80, 0.4); };
  X.popchaseMark = function () { this.tone(990, 0.2, 'sine', 0.04); this.tone(1480, 0.3, 'sine', 0.02, null, 0.06); };
  X.popchaseRewind = function () { this.noise(0.8, { type: 'bandpass', f: 700, to: 2400, q: 1, vol: 0.06 }); };
  X.popchaseWhoa = function (pitch) { this.tone(520 * pitch, 0.16, 'triangle', 0.03, 700 * pitch); };
  X.popchaseFlap = function () { this.noise(0.22, { type: 'lowpass', f: 1400, to: 500, vol: 0.06 }); this.tone(160, 0.18, 'sine', 0.04, 110); };
  X.popchaseTwin = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.035, null, i * 0.06)); this.noise(0.3, { type: 'bandpass', f: 1500, to: 3000, q: 1, vol: 0.04 }); };
  X.popchaseWheel = function () { this.noise(0.04, { type: 'bandpass', f: 2200, q: 3, vol: 0.035 }); this.tone(240, 0.04, 'square', 0.012); };
  X.popchaseHum = function () { this.tone(70, 1.3, 'sine', 0.05, 90); this.tone(140, 1.3, 'triangle', 0.015, 180); };
  X.popchasePress = function () { this.tone(90, 0.3, 'sine', 0.08, 50); this.noise(0.2, { type: 'lowpass', f: 600, to: 120, vol: 0.08 }); };
  X.popchaseThunder = function () { this.noise(1.6, { type: 'lowpass', f: 900, to: 90, vol: 0.09 }); this.tone(55, 1.2, 'sine', 0.05, 40, 0.1); };
  X.popchaseTheEnd = function () { [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.035, null, i * 0.14)); };
  X.popchaseRoll = function (pitch, near) { const k = clamp(near || 0, 0, 1); this.noise(0.5, { type: 'lowpass', f: 300 + k * 500, to: 200 + k * 300, vol: 0.012 + k * 0.05 }); };

  PC.files = ['js/levels/world41/popchase-outfits.js', 'js/levels/world41/popchase-art.js'];
  for (const f of PC.files) if (!K3D.files.includes(f)) K3D.files.push(f);

  // register: World 41 (index 40). 41-1's js/levels/world41/world.js sets the world and adds 41-1 first; until it
  // lands, this sets a stand-in world entry with the same name so 41-2 can be played.
  if (!WORLDS[40]) WORLDS[40] = { name: 'Pop-Up Storybook', blurb: 'Tumble into a giant pop-up book where the pages fold up around you!',
    theme: { skyTop: '#2e2840', skyBot: '#5a4a62', hillFar: '#3e3550', hillNear: '#2e2840', sun: 'rgba(255,220,150,0.9)', sunGlow: 'rgba(255,200,120,0.3)',
      stone: '#8a6a52', stoneLight: '#a2826a', stoneEdge: '#4a3a30', grass: '#9cc77a', grassDark: '#5f8a4a', plank: '#c79a62', plankDark: '#8a6234', rope: '#e8d8b0', ropeDark: '#9a8460' } };
  LEVELS.push(PC.def);
})();

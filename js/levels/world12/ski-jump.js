/* Pip & Bo - Level 12-3 Ski Jump (team). */
'use strict';

/* ===== 12-3 Ski Jump (mode 'skijump', World 12 "Winter Games", teamwork) ======================================
   Side view of a big ski jump. One player is the JUMPER: press jump (or the action) to push off the start bar, hold ▼
   on the in-run to tuck (faster), press jump at the take-off edge (timing matters: just before the lip is perfect),
   lean with ◀ ▶ in the air to keep a steady flight pose against the wobble (too far either way is wobbly: less lift
   and style points off), and press ▼ just before touching down for a telemark landing (style).
   The other is the WIND CREW on the catwalk under the landing hill: they start in the crew hut at its left end (out of
   reach of every fan), ◀ ▶ run, jump hops, and the action at a giant fan turns it on (a press = a short blast, hold =
   keep it going; a held button also starts each fresh fan the crew reaches). A fan only helps while the jumper flies over it, and it puffs out if it runs too long, so turning
   it on too early does nothing.
   Distance needs fan pushes: even a perfect jump with no fans lands short of the green line (one player alone can
   never count a jump). A jump that lands short of the green line is a "Fluff!" tumble into soft snow and is tried
   again; after 2 / 3 / 5 short tries the fans get announced gold help ("Lucky / Super / Mega tailwind"): they blow
   harder, reach the crew from farther away and show a gold NOW! marker (the cart gets a bigger tank, the night gust
   calms). The help only makes fans stronger, fades out between the green and the K line (so a helped jump lands
   near the K line, not past the hill) and counts distance points only up to the K line.
   4 hills (rooms), 2 jumps each, roles swap every jump (Pip jumps first on every hill, so each player jumps 4 times):
     Normal Hill: 3 fans.   Large Hill: 4 fans, snowflake rings.   Night Hill: floodlights, rings, and a Gust-o-matic
     that blows a headwind over one marked fan: start that fan before the jumper gets there to block it (once
     blocked, the gust stays off for that jump).
     Fan Cart Cliff: a soft snow pit cuts the landing hill; the crew drives one fan on a rail cart (hold to blow once
     the jumper is in the air) with a small air tank per jump, full again before every take-off.
   Score per jump: distance points (60 at the K line, ± per metre) + style (3 penguin judges, 6-20 each) + 5 per ring.
   Telemark: only the first ▼ press in the air (after its first 0.2 s) counts, and it must come within 0.5 s of touchdown.
   Stars per hill (1 for both jumps counted, 2 and 3 by the hill's points), 12 in all; def.noTime.
   def.ownStep: the mode runs the whole tick. The players stay alive; the jumper is hidden while the engine draws
   the players (draw) and drawn on skis in drawTop. Only MODES.skijump and Sfx.extra.skijump* are visible outside.
   MODES.skijump.api has helpers (hill geometry, distances, key names) for the computer brain and bot tests. */
{
  const SKI = {
    // in-run (px, s): accel along the track = inG * sin(slope) - drag * v²
    inG: 80, dragUp: 0.0018, dragTuck: 0.0011, tuckRate: 5,
    // take-off: a press this long before the lip is perfect; window = earliest press that still counts; late window
    bestT: 0.07, window: 0.32, qSpan: 0.4, lateWin: 0.22, pop: 30, popV: 5,
    // flight: gravity, lift and drag (∝ v²), leaning, the wobble and its limits
    g: 130, kL: 0.0011, kD: 0.0009, leanLift: 45, leanFwd: 18, leanRate: 1.8, unstable: 0.5, wobAmp: 0.55,
    wobbly: 0.5, whoa: 0.95, crash: 0.92, poseMax: 1.3,
    // fans: push (px/s²) while the jumper is over one, how far a fan blows, how close the crew must stand
    fanUp: 48, fanFwd: 15, fanReach: 54, crewReach: 34, crewReachLucky: 60,
    pulse: 0.7, pulseLucky: [1.0, 1.0, 1.2, 1.5], helpReach: [1, 1.25, 1.5, 2.0], airT: 1.5, airRefill: 0.5, outT: 1.4, spinUp: 6, spinDown: 3.2,
    help: [0, 1.1, 1.9, 2.7],                  // extra fan strength: normal, Lucky / Super / Mega tailwind (gold help)
    helpTries: [2, 3, 5], helpNames: ['', 'Lucky tailwind', 'Super tailwind', 'Mega tailwind'], helpGust: [1, 0.5, 0.2, 0],
    helpSettle: 4, helpDrop: 320, helpFall: [-30, 50],   // a helped jump loses its lift and comes down by the K line; help lifts falling flights
    cartAir: 1.3, cartAirHelp: [1, 1.3, 1.6, 2], cartAcc: 1200, cartMax: 300, cartReach: 62, cartMul: 0.9,
    crewAcc: 1900, crewMax: 255, hopV: 330, hopG: 1300, catDrop: 56,
    // gusts (Night Hill): headwind and down push while the jumper is in the gust zone, unless its fan blows
    gustX: 45, gustY: 45, gustPose: 0.9, gustWarn: 0.4,
    // landing and scoring
    teleWin: 0.5, ringR: 21, ringPts: 5, slideG: 80, slideFric: 30, kmh: 0.74,
    // flow
    introLock: 0.6, judgeT: 3.8, shortT: 2.6, tallyT: 3.6, maxAir: 9,
  };
  const K = SKI;
  const D2R = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const SJ_GOLD = '#ffc53d', SJ_GREEN = '#3fcf72';

  /* ---------- the hills (px; u = px to the right of the take-off lip) ----------
     gate: start bar; inA / inLen: the straight in-run; arcLen: the curve to the table; tA / tLen: the table.
     Landing: drops `drop` under the lip, then slopes at landA: a knoll to k1, steep to k2, flattening to k3 (outrun).
     K / green: lines in metres; kU: where the K line is (u); perM: points per metre; fans: u of each fan;
     cat: catwalk [from u, to u] (the crew hut is at its left end, left of the lip); gap: [u0, u1] soft snow pit (no landing); gust: the fan index the gust blows over. */
  const SJ_HILLS = {
    normal: { gate: [52, 132], inA: 40, inLen: 150, arcLen: 60, tA: 10, tLen: 34, drop: 10, landA: 35, k1: 70, k2: 290, k3: 430,
      K: 95, green: 76, kU: 270, perM: 2, fans: [60, 150, 240], cat: [-44, 330] },
    large: { gate: [44, 122], inA: 40, inLen: 160, arcLen: 60, tA: 10, tLen: 34, drop: 10, landA: 34, k1: 70, k2: 320, k3: 470,
      K: 110, green: 84, kU: 305, perM: 1.8, fans: [55, 135, 215, 295], cat: [-44, 340] },
    night: { gate: [52, 132], inA: 40, inLen: 150, arcLen: 60, tA: 10, tLen: 34, drop: 10, landA: 35, k1: 70, k2: 300, k3: 440,
      K: 90, green: 78, kU: 245, perM: 2, fans: [55, 140, 225, 310], gust: 2, cat: [-44, 330] },
    cliff: { gate: [52, 132], inA: 40, inLen: 150, arcLen: 60, tA: 10, tLen: 34, drop: 10, landA: 34, k1: 90, k2: 310, k3: 450,
      K: 108, green: 80, kU: 290, perM: 1.8, fans: [], cart: true, gap: [120, 205], cat: [-44, 350] },
  };

  function sjBuildHill(key) {
    const H0 = SJ_HILLS[key] || SJ_HILLS.normal, h = Object.assign({ key }, H0);
    // in-run, sampled every px of track
    const pts = [];
    let x = H0.gate[0], y = H0.gate[1];
    const total = H0.inLen + H0.arcLen + H0.tLen;
    for (let s = 0; s <= total; s++) {
      const a = (s < H0.inLen ? H0.inA : s < H0.inLen + H0.arcLen ? lerp(H0.inA, H0.tA, (s - H0.inLen) / H0.arcLen) : H0.tA) * D2R;
      pts.push({ x, y, a });
      x += Math.cos(a); y += Math.sin(a);
    }
    h.inPts = pts; h.inTotal = pts.length - 1;
    h.E = { x: pts[h.inTotal].x, y: pts[h.inTotal].y };
    h.tableStart = H0.inLen + H0.arcLen;
    // landing hill: y, slope and arc length for every px of u
    const n = Math.ceil(W + 80 - h.E.x), ys = new Float32Array(n + 1), as = new Float32Array(n + 1), arc = new Float32Array(n + 1);
    let yy = h.E.y + H0.drop, ar = 0;
    for (let u = 0; u <= n; u++) {
      const th = H0.landA * D2R * (u < H0.k1 ? smooth(u / H0.k1) : u < H0.k2 ? 1 : 1 - smooth((u - H0.k2) / (H0.k3 - H0.k2)));
      ys[u] = yy; as[u] = th; arc[u] = ar;
      yy += Math.tan(th); ar += 1 / Math.cos(th);
    }
    h.ys = ys; h.as = as; h.arc = arc; h.n = n;
    h.mpp = H0.K / arc[H0.kU];                 // metres per px of hill
    h.greenU = sjUofDist(h, H0.green); h.kLineU = H0.kU;
    h.cat0 = h.E.x + H0.cat[0]; h.cat1 = h.E.x + H0.cat[1];
    h.outY = ys[Math.min(n, H0.k3)];
    h.stopX = W - 150;
    return h;
  }
  const sjU = (h, x) => clamp(x - h.E.x, 0, h.n);
  function sjHillY(h, x) {
    if (x < h.E.x) return h.E.y + h.drop;
    const u = sjU(h, x), i = Math.floor(u), f = u - i;
    return i >= h.n ? h.ys[h.n] : h.ys[i] + (h.ys[i + 1] - h.ys[i]) * f;
  }
  const sjSlope = (h, x) => h.as[Math.round(sjU(h, x))];
  const sjInGap = (h, x) => !!h.gap && x - h.E.x > h.gap[0] && x - h.E.x < h.gap[1];
  // where the jumper touches down: the hill, or the soft snow at the bottom of the pit
  const sjSurf = (h, x) => sjHillY(h, x) + (sjInGap(h, x) ? 34 : 0);
  function sjDist(h, x) {
    const u = sjU(h, x), i = Math.floor(u), f = u - i;
    return (i >= h.n ? h.arc[h.n] : h.arc[i] + (h.arc[i + 1] - h.arc[i]) * f) * h.mpp;
  }
  function sjUofDist(h, m) { for (let u = 0; u <= h.n; u++) if (h.arc[u] * h.mpp >= m) return u; return h.n; }
  const sjCatY = (h, x) => sjHillY(h, clamp(x, h.cat0, h.cat1)) + K.catDrop;
  function sjInAt(h, s) {
    const i = clamp(Math.floor(s), 0, h.inTotal - 1), f = clamp(s - i, 0, 1), a = h.inPts[i], b = h.inPts[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: a.a + (b.a - a.a) * f };
  }

  /* ---------- input: each player's own presses ---------- */
  function sjInput(p) {
    const i = p.input;
    return { left: !!i.left, right: !!i.right, down: !!i.down, jump: !!i.jump, act: !!i.act };
  }
  const sjCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  // each player's own device, by the framework's rule (ui.js actKey)
  const sjDev = id => { try { return actKey(id); } catch (e) { return 'kb'; } };
  // key names for hints, on each player's own device
  function sjKey(id, what) {
    const d = sjDev(id);
    if (d === 'pad') return { go: glyph('a'), tuck: 'down', lean: 'stick', fan: glyph('act'), run: 'stick' }[what];
    if (d === 'touch') return { go: '▲', tuck: '▼', lean: '◀ ▶', fan: 'the fan button', run: '◀ ▶' }[what];
    return (id === 0 ? { go: 'W', tuck: 'S', lean: 'A D', fan: 'F', run: 'A D' } : { go: '↑', tuck: '↓', lean: '← →', fan: '/', run: '← →' })[what];
  }

  /* ---------- one jump: setup ---------- */
  function sjRoom(st, k) {
    const D = G.level.def;
    st.k = k; st.n = 0; st.tries = 0;
    st.hill = sjBuildHill(D.hill);
    st.night = !!D.night;
    st.hillPts = [null, null];
    sjJump(st, false);
  }
  function sjJump(st, retry) {
    const D = G.level.def, h = st.hill;
    st.tries = retry ? st.tries + 1 : 0;
    st.help = K.helpTries.filter(n => st.tries >= n).length;
    st.jumper = st.n % 2; st.crew = 1 - st.jumper;
    st.phase = 'gate'; st.t = 0;
    const g = h.inPts[0];
    st.j = { x: g.x, y: g.y, ang: g.a, s: 0, v: 0, tuck: 0, vx: 0, vy: 0, pose: 0, t: 0, pressed: false, early: false, tte: 0,
      popped: false, q: 0, toWord: '', teleAt: -9, wobT: 0, whoaT: 0, fanT: 0, rings: 0, vs: 0, roll: 0, crash: false,
      tele: false, dist: 0, ph1: Math.random() * 6, ph2: Math.random() * 6, sit: 1, lean: 0, skiA: g.a, hop: 0, tumble: 0 };
    st.cart = !!h.cart;
    st.crewS = { x: h.cat0 + 16, vx: 0, hop: 0, vh: 0, face: 1 };
    st.fans = st.cart ? [{ x: st.crewS.x, y: sjCatY(h, st.crewS.x), air: 1, pow: 0, pulse: 0, out: 0, spin: 0, cart: true }]
      : h.fans.map(u => ({ x: h.E.x + u, y: sjCatY(h, h.E.x + u), air: 1, pow: 0, pulse: 0, out: 0, spin: Math.random() * 6 }));
    st.gust = h.gust != null && st.fans[h.gust] ? { fan: h.gust, x0: st.fans[h.gust].x - 62, x1: st.fans[h.gust].x + 62, state: 'idle', t: 0, hit: false, blocked: false } : null;
    const rl = (D.rings && D.rings[st.n]) || [];
    st.rings = rl.map(([u, hh]) => ({ x: h.E.x + u, y: sjHillY(h, h.E.x + u) - hh, got: false, pop: 0 }));
    st.score = null; st.cards = null;
    st.fx = []; st.windT = 0; st.cartWait = false; st.cartEmpty = false;
    if (retry) {
      const nj = NAMES[st.jumper], nc = NAMES[st.crew], cpuJ = sjCpu(st.jumper), cpuC = sjCpu(st.crew);
      const sub = st.help ? 'Gold help: ' + K.helpNames[st.help] + '! ' + nc + "'s fans blow " + (st.help > 1 ? 'extra ' : '') + 'hard' + (st.gust ? ' and calm the gust.' : '.')
        : cpuC ? nc + "'s fans push you past the green line!"
        : st.cart ? nc + ': drive under ' + nj + ', blow once ' + nj + ' flies!' : nc + ': blow the fans as ' + nj + ' flies over!';
      st.banner = { text: cpuJ ? nj + ' tries again!' : 'Try again, ' + nj + '!', sub, col: st.help ? SJ_GOLD : C.paper, t: 2.8, max: 2.8 };
      if (st.help) Sfx.play('skijumpLucky');
    } else if (st.n > 0) {
      st.banner = { text: 'Swap jobs!', sub: NAMES[st.jumper] + ' jumps, ' + NAMES[st.crew] + ' runs the ' + (st.cart ? 'fan cart' : 'fans'), col: PCOL[st.jumper], t: 2.6, max: 2.6 };
      Sfx.play('skijumpSwap');
    } else st.banner = null;
    st.prev = [{ jump: true, act: true, down: false }, { jump: true, act: true, down: false }];
    st.idle = st.idle || [0, 0];
    sjActLabels(st);
    sjPlace(st);
  }
  // the players' p.x / p.y follow what the level draws (name tags, the computer's bubbles)
  function sjPlace(st) {
    const jp = G.players[st.jumper], cp = G.players[st.crew], j = st.j, c = st.crewS;
    for (const p of G.players) { p.alive = true; p.respawnT = 0; p.vx = 0; p.vy = 0; p.stun = 0; p.pendingJump = false; }
    jp.x = j.x - PW / 2; jp.y = j.y - PH - 4; jp.face = 1;
    cp.x = c.x - PW / 2; cp.y = sjCatY(st.hill, c.x) - PH - c.hop - (st.cart ? 12 : 0); cp.face = c.face;
    cp.vy = c.vh ? -c.vh : 0;
  }

  // the touch buttons and the top-bar legend name each player's own action (jump / fan) for this jump
  let sjLabelEls = null;
  function sjActLabels(st) {
    const word = id => (id === st.jumper ? 'jump' : 'fan');
    G.level.def.act = { label: 'fan', labels: [word(0), word(1)] };   // (this room's own copy of the def)
    try {
      if (!sjLabelEls || !sjLabelEls.every(o => document.contains(o.el))) sjLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of sjLabelEls) {
        const want = o.id < 0 ? 'jump/fan' : word(o.id);
        if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
      }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  function sjFx(st, x, y, text, col, size) { st.fx.push({ x, y, text, col: col || C.paper, size: size || 22, t: 1.3 }); }

  /* ---------- the live tick ---------- */
  function sjStep(st, dt) {
    st.t += dt; st.clock = (st.clock || 0) + dt;
    for (const f of st.fx) { f.t -= dt; f.y -= 24 * dt; }
    st.fx = st.fx.filter(f => f.t > 0);
    if (st.banner) { st.banner.t -= dt; if (st.banner.t <= 0) st.banner = null; }
    for (const r of st.rings) r.pop = Math.max(0, r.pop - dt);
    const locked = G.introT > K.introLock;
    const ins = G.players.map(sjInput);
    const fr = ins.map((a, k) => {
      const pv = st.prev[k], o = { jump: a.jump && !pv.jump, act: a.act && !pv.act, down: a.down && !pv.down };
      st.prev[k] = { jump: a.jump, act: a.act, down: a.down };
      st.idle[k] = a.left || a.right || a.down || a.jump || a.act ? 0 : st.idle[k] + dt;
      return o;
    });
    const J = st.jumper, Cr = st.crew, j = st.j;
    if (st.phase !== 'tally') { sjCrew(st, ins[Cr], fr[Cr], dt, locked); sjFans(st, ins[Cr], fr[Cr], dt, locked); }
    switch (st.phase) {
      case 'gate':
        j.tuck = approach(j.tuck, ins[J].down && !locked ? 1 : 0, dt * K.tuckRate);
        if (!locked && (fr[J].jump || fr[J].act)) {
          st.phase = 'inrun'; st.t = 0; j.sit = 0; j.v = 15;
          Sfx.play('skijumpGo', J); rumble(J, 0.1, 0.3, 80);
        }
        break;
      case 'inrun': sjInrun(st, j, ins[J], fr[J], dt); break;
      case 'air': sjAir(st, j, ins[J], fr[J], dt); break;
      case 'out': case 'short': case 'judge':
        sjSlide(st, j, dt);
        if (st.phase === 'out' && j.vs < 6) { st.phase = 'judge'; st.t = 0; }
        else if (st.phase === 'judge' && st.t >= K.judgeT) sjAfterJudge(st);
        else if (st.phase === 'short' && st.t >= K.shortT) sjJump(st, true);
        break;
      case 'tally':
        if (st.t >= K.tallyT) {
          if (st.k < (G.level.def.roomCount || 1) - 1) nextRoom();
          else { G.level.goal = { x: st.hill.stopX, y: st.hill.outY - 40 }; levelClear(); }
          return;
        }
        break;
    }
    // the judges' cards flip up one by one
    if (st.phase === 'judge' && st.cards) {
      const n = Math.min(3, Math.floor((st.t - 0.35) / 0.32) + 1);
      if (n > st.cardsUp) { st.cardsUp = n; Sfx.play('skijumpCard'); }
    }
    sjPlace(st);
  }

  function sjInrun(st, j, a, f, dt) {
    const h = st.hill;
    j.tuck = approach(j.tuck, a.down ? 1 : 0, dt * K.tuckRate);
    if (j.tuck > 0.8) st.stats.tuckT[st.jumper] += dt;
    const P = sjInAt(h, j.s), drag = lerp(K.dragUp, K.dragTuck, j.tuck);
    j.v += (K.inG * Math.sin(P.a) - drag * j.v * j.v) * dt;
    j.s += j.v * dt;
    if ((f.jump || f.act) && !j.pressed) {
      j.pressed = true; j.tte = (h.inTotal - j.s) / Math.max(1, j.v);
      if (j.tte > K.window) { j.early = true; j.hop = 0.25; sjFx(st, j.x, j.y - 40, 'Too early!', '#d9d3ef', 18); Sfx.play('skijumpEarly'); }
    }
    j.hop = Math.max(0, j.hop - dt);
    if (j.s >= h.inTotal) {
      // off the lip: the speed carries on along the table
      j.x = h.E.x; j.y = h.E.y; j.vx = j.v * Math.cos(h.tA * D2R); j.vy = j.v * Math.sin(h.tA * D2R);
      j.kmh = Math.round(j.v * K.kmh);
      st.phase = 'air'; st.t = 0; j.t = 0;
      if (j.pressed) {
        if (j.early) sjPop(st, j, 0.25, 'Too early!', '#d9d3ef');
        else {
          const q = clamp(1 - Math.abs(j.tte - K.bestT) / K.qSpan, 0.3, 1);
          sjPop(st, j, q, q > 0.85 ? 'Perfect take-off!' : q > 0.6 ? 'Good take-off!' : 'A bit early!', q > 0.85 ? SJ_GOLD : C.paper);
        }
      }
    } else { j.x = P.x; j.y = P.y; j.ang = P.a; j.skiA = P.a; j.lean = 0.15 + 0.55 * j.tuck; }
  }
  function sjPop(st, j, q, word, col) {
    j.popped = true; j.q = q; j.toWord = word;
    j.vy -= K.pop * q; j.vx += K.popV * q;
    j.pose = (1 - q) * 0.45 * (Math.random() < 0.5 ? -1 : 1);
    if (q > 0) Sfx.play(q > 0.85 ? 'skijumpPerfect' : 'skijumpTakeoff', st.jumper);
    if (q > 0.85) { st.stats.perfect[st.jumper]++; rumble(st.jumper, 0.2, 0.5, 120); }
    // above and behind the lip, clear of the pose needle the jumper needs now
    sjFx(st, st.hill.E.x - 40, st.hill.E.y - 116, word, col || C.paper, q > 0.85 ? 22 : 18);
  }

  // forces from the fans (and the gust) at the jumper; also used by bot tests
  function sjFanPush(st, x, y, vy) {
    let ax = 0, ay = 0, best = 0, who = -1;
    const h = st.hill;
    // gold help: an extra, wider push that holds a dropping jumper up until the green line, then fades out by the K line.
    // A jumper gliding flat gets none of it, so help lifts a short jump to about the K line, never over the hill.
    let extra = 0;
    if (st.help && h) {
      // only a jumper who is dropping gets it (one gliding flat is already doing fine)
      const low = smooth((vy - K.helpFall[0]) / (K.helpFall[1] - K.helpFall[0]));
      const near = 1 - smooth((sjDist(h, x) - h.green) / Math.max(1, h.K - h.green));
      extra = (K.help[st.help] || 1) * low * near;
    }
    st.fans.forEach((fan, i) => {
      if (fan.pow <= 0.02) return;
      const R0 = fan.cart ? K.cartReach : K.fanReach, R1 = R0 * (K.helpReach[st.help] || 1), dx = x - fan.x;
      if (Math.abs(dx) > Math.max(R0, R1) || y > fan.y - 14) return;
      const hi = 1 - smooth((fan.y - y - 200) / 60);   // the wind cone ends about 260 px above the fan
      const prof = R => (Math.abs(dx) < R ? 1 - (dx / R) * (dx / R) : 0);
      const k = fan.pow * (prof(R0) + extra * prof(R1)) * (fan.cart ? K.cartMul : 1) * hi;
      ay -= K.fanUp * k; ax += K.fanFwd * k;
      if (k > best) { best = k; who = i; }
    });
    return { ax, ay, k: best, fan: who };
  }
  function sjAir(st, j, a, f, dt) {
    const h = st.hill;
    j.t += dt;
    if (!j.popped) {
      if (f.jump || f.act) sjPop(st, j, Math.max(0.15, 0.6 - j.t * 2), 'A bit late!', '#d9d3ef');
      // from Super tailwind on, a missed take-off gets a small gold hop, so a jumper who can't find the edge still flies
      else if (j.t > K.lateWin) { if (st.help >= 2) sjPop(st, j, 0.8, 'Tailwind hop!', SJ_GOLD); else sjPop(st, j, 0, 'No jump!', '#d9d3ef'); }
    }
    if (f.down && j.teleAt < 0 && j.t > 0.2) j.teleAt = j.t;   // only the first ▼ in the air counts
    // the flight pose: the wobble pushes it, leaning pushes back, and it tips further the further it leans
    const lean = (a.right ? 1 : 0) - (a.left ? 1 : 0);
    const drift = K.wobAmp * (0.7 * Math.sin(j.t * 1.9 + j.ph1) + 0.45 * Math.sin(j.t * 3.3 + j.ph2));
    let shove = 0, gx = 0, gy = 0;
    // the Gust-o-matic (Night Hill) wakes up as the jumper comes near its zone
    const gu = st.gust;
    if (gu) {
      if (gu.state === 'idle' && j.x > gu.x0 - 120) { gu.state = 'warn'; gu.t = 0; Sfx.play('skijumpWarn'); }
      else if (gu.state === 'warn') { gu.t += dt; if (gu.t >= K.gustWarn) { gu.state = 'blow'; gu.t = 0; Sfx.play('skijumpGust'); } }
      else if (gu.state === 'blow') {
        gu.t += dt;
        if (j.x > gu.x1 + 20) gu.state = 'done';
        else if (j.x > gu.x0 && j.x < gu.x1) {
          if (gu.blocked || st.fans[gu.fan].pow > 0.45) {
            if (!gu.blocked) { gu.blocked = true; st.stats.blocks++; sjFx(st, j.x, j.y - 100, 'Blocked!', SJ_GREEN, 20); Sfx.play('skijumpBlock'); }
          } else {
            const gm = K.helpGust[st.help] == null ? 1 : K.helpGust[st.help];
            gx = -K.gustX * gm; gy = K.gustY * gm; shove = K.gustPose * gm;
            if (!gu.hit) { gu.hit = true; sjFx(st, j.x, j.y - 100, 'Gust!', '#ff8a7a', 20); }
          }
        }
      }
    }
    j.pose = clamp(j.pose + (lean * K.leanRate + drift + j.pose * K.unstable + shove) * dt, -K.poseMax, K.poseMax);
    const ap = Math.abs(j.pose);
    if (ap > K.wobbly) j.wobT += dt;
    if (ap > K.whoa) j.whoaT += dt;
    // lift (across the flight path) and drag (against it); leaning back floats, leaning forward zooms, too far wobbles
    const v = Math.max(1, Math.hypot(j.vx, j.vy)), dx = j.vx / v, dy = j.vy / v;
    const wob = Math.max(0, ap - K.wobbly);
    const cL = (1 - 0.3 * j.pose) * Math.max(0.25, 1 - wob * 1.1), cD = (1 - 0.35 * j.pose) * (1 + wob * 1.6);
    // a helped jump (gold tailwind) settles down soon after the K line instead of flying over the whole hill
    const mid = (h.green + h.K) / 2, past = st.help ? smooth((sjDist(h, j.x) - mid) / (h.K - mid + K.helpSettle)) : 0;
    const L = K.kL * v * v * cL * (j.popped || j.t > 0.05 ? 1 : 0.6) * (1 - 0.8 * past), Dg = K.kD * v * v * cD;
    const fp = sjFanPush(st, j.x, j.y, j.vy);
    if (fp.k > 0.05) { j.fanT += dt; st.stats.fanT[st.crew] += dt; }
    // leaning back floats up (and slows a little), leaning forward dives (and speeds up a little): steering for rings
    const pl = clamp(j.pose, -K.wobbly, K.wobbly);
    const ax = L * dy - Dg * dx + fp.ax + gx + K.leanFwd * pl - 60 * past, ay = K.g - L * dx - Dg * dy + fp.ay + gy + K.leanLift * pl + K.helpDrop * past;
    j.vx += ax * dt; j.vy += ay * dt;
    j.vx = Math.max(20, j.vx);
    j.x += j.vx * dt; j.y += j.vy * dt;
    const path = Math.atan2(j.vy, j.vx);
    j.skiA = path - 0.32 + j.pose * 0.28; j.lean = 1.0 + j.pose * 0.45; j.ang = j.skiA;
    // snowflake rings
    for (const r of st.rings) if (!r.got && Math.hypot(j.x - r.x, j.y - 8 - r.y) < K.ringR) {
      r.got = true; r.pop = 0.6; j.rings++; st.stats.rings++;
      sjFx(st, r.x, r.y - 24, '+' + K.ringPts, SJ_GOLD, 20); Sfx.play('skijumpRing'); burst(r.x, r.y, '#ffffff', 10);
    }
    // touch down
    if (j.y >= sjSurf(st.hill, j.x) || j.x >= h.stopX - 10 || j.t > K.maxAir) sjLand(st, j);
  }

  function sjLand(st, j) {
    const h = st.hill, D = G.level.def;
    j.y = sjSurf(h, j.x);
    const gap = sjInGap(h, j.x);
    j.dist = Math.round(sjDist(h, j.x) * 2) / 2;
    j.tele = j.teleAt >= 0 && j.t - j.teleAt <= K.teleWin && j.teleAt > 0;
    j.crash = Math.abs(j.pose) > K.crash;
    const sp = Math.hypot(j.vx, j.vy);
    j.vs = sp * 0.8; j.ang = sjSlope(h, j.x); j.skiA = j.ang; j.lean = 0.3;
    st.t = 0;
    puff(j.x, j.y, 14, 'rgba(255,255,255,0.95)');
    if (gap || j.dist < h.green) {
      // short: a soft tumble, then the same jump again
      st.phase = 'short'; j.tumble = 1; j.vs = gap ? 0 : Math.min(j.vs, 80);
      st.stats.shorts++;
      sjFx(st, j.x, j.y - 46, 'Fluff!', C.paper, 30);
      st.shortWhy = gap ? 'Into the soft snow pit!' : 'Short of the green line (' + h.green + ' m)';
      Sfx.play('skijumpFluff'); G.shake = 0.12;
      return;
    }
    // a counted jump: the judges score its style
    st.phase = 'out';
    if (j.crash) { j.tumble = 1; sjFx(st, j.x, j.y - 46, 'Fluff!', C.paper, 28); Sfx.play('skijumpFluff'); }
    else if (j.tele) { sjFx(st, j.x, j.y - 46, 'Telemark!', SJ_GOLD, 24); Sfx.play('skijumpTele', st.jumper); st.stats.teles[st.jumper]++; }
    else Sfx.play('skijumpLand');
    rumble(st.jumper, 0.25, 0.4, 140);
    const dq = j.q > 0.85 ? 0 : j.q > 0.6 ? 0.5 : j.q > 0.3 ? 1 : j.q > 0 ? 1.5 : 2.5;
    const df = Math.min(5, j.wobT * 2 + j.whoaT * 3);
    const dl = j.crash ? 7 : j.tele ? 0 : 2;
    const cards = [0, 1, 2].map(() => clamp(Math.round((20 - dq - df - dl + (Math.random() - 0.5)) * 2) / 2, 6, 20));
    const style = cards[0] + cards[1] + cards[2];
    // a jump flown with gold help counts its distance only up to the K line: the help gets you there, not the stars
    const raw = Math.max(0, Math.round((60 + (j.dist - h.K) * h.perM) * 2) / 2), dpts = st.help ? Math.min(60, raw) : raw;
    const total = dpts + style + j.rings * K.ringPts;
    st.cards = cards; st.cardsUp = 0;
    st.score = { dist: j.dist, dpts, style, rings: j.rings, total, k: j.dist >= h.K, tele: j.tele, crash: j.crash, who: st.jumper, capped: raw > dpts };
    st.hillPts[st.n] = total; st.total += total;
    st.stats.longest[st.jumper] = Math.max(st.stats.longest[st.jumper], j.dist);
    st.stats.jumps++;
    if (j.dist >= h.K) { st.stats.kLines++; Sfx.play('skijumpK'); }
    if (j.dist > (st.best || 0)) st.best = j.dist;
  }
  function sjSlide(st, j, dt) {
    const h = st.hill;
    if (st.phase === 'short' && sjInGap(h, j.x)) { j.vs = 0; j.roll += dt * 2; return; }
    const sl = sjSlope(h, j.x);
    j.vs += (K.slideG * Math.sin(sl) - K.slideFric - (j.tumble ? 55 : 0)) * dt;
    if (j.x > h.stopX - 120) j.vs = Math.min(j.vs, Math.max(0, (h.stopX - j.x) * 1.4));
    j.vs = Math.max(0, j.vs);
    j.x = Math.min(h.stopX, j.x + j.vs * Math.cos(sl) * dt);
    j.y = sjHillY(h, j.x); j.ang = sl; j.skiA = sl;
    j.lean = j.tele ? 0.45 : 0.25;
    if (j.tumble) j.roll += j.vs * dt / 14;
    if (j.vs < 6 && j.tumble && st.phase !== 'short') j.tumble = Math.max(0.01, j.tumble - dt * 2);
  }
  function sjAfterJudge(st) {
    if (st.n === 0) { st.n = 1; sjJump(st, false); return; }
    // the hill is done: its stars
    const D = G.level.def, pts = st.hillPts[0] + st.hillPts[1], s = D.stars || [200, 235];
    const stars = 1 + (pts >= s[0] ? 1 : 0) + (pts >= s[1] ? 1 : 0);
    st.hillStars[st.k] = stars; st.hillTotal[st.k] = pts;
    st.phase = 'tally'; st.t = 0; st.tallyStars = 0;
    Sfx.play('skijumpHill');
  }

  /* ---------- the wind crew and the fans ---------- */
  function sjCrew(st, a, f, dt, locked) {
    const c = st.crewS, h = st.hill;
    const dir = locked ? 0 : (a.right ? 1 : 0) - (a.left ? 1 : 0);
    const max = st.cart ? K.cartMax : K.crewMax, acc = st.cart ? K.cartAcc : K.crewAcc;
    if (dir) { c.vx = approach(c.vx, dir * max, acc * dt); c.face = dir; } else c.vx = approach(c.vx, 0, acc * 1.3 * dt);
    c.x += c.vx * dt;
    if (c.x < h.cat0 + 10) { c.x = h.cat0 + 10; c.vx = 0; }
    if (c.x > h.cat1 - 10) { c.x = h.cat1 - 10; c.vx = 0; }
    if (!locked && f.jump && c.hop <= 0 && !st.cart) { c.vh = K.hopV; c.hop = 0.01; Sfx.play('jump', st.crew); }
    if (c.hop > 0) { c.hop += c.vh * dt; c.vh -= K.hopG * dt; if (c.hop <= 0) { c.hop = 0; c.vh = 0; } }
    if (Math.abs(c.vx) > 1) st.stats.runPx[st.crew] += Math.abs(c.vx) * dt;
  }
  const sjBlowing = st => st.phase === 'gate' || st.phase === 'inrun' || st.phase === 'air';
  function sjNearFan(st) {
    const c = st.crewS, reach = st.help ? K.crewReachLucky : K.crewReach;
    let best = null, bd = 1e9;
    for (const fan of st.fans) { const d = Math.abs(fan.x - c.x); if (d <= reach && d < bd) { bd = d; best = fan; } }
    return best;
  }
  function sjFans(st, a, f, dt, locked) {
    const c = st.crewS, live = sjBlowing(st) && !locked;
    if (st.cart) {
      const cart = st.fans[0];
      cart.x = c.x; cart.y = sjCatY(st.hill, c.x);
      // the cart blows only while the jumper flies (the tank stays full until take-off)
      const flying = st.phase === 'air', want = live && flying && a.act && cart.air > 0;
      if (live && !flying && f.act && !st.cartWait) { st.cartWait = true; sjFx(st, c.x, cart.y - 70, 'Wait till ' + NAMES[st.jumper] + ' flies!', '#d9d3ef', 15); }
      if (live && flying && a.act && cart.air <= 0 && !st.cartEmpty) { st.cartEmpty = true; sjFx(st, c.x, cart.y - 70, 'Tank empty!', '#d9d3ef', 16); }
      if (want) {
        cart.air = Math.max(0, cart.air - dt / (K.cartAir * (K.cartAirHelp[st.help] || 1)));
        if (!cart.on) Sfx.play('skijumpFan', st.crew);
        if (cart.air <= 0) Sfx.play('skijumpPuff');
      }
      cart.on = want;
      cart.pow = approach(cart.pow, want ? 1 : 0, dt * (want ? K.spinUp : K.spinDown));
      cart.spin += cart.pow * dt * 30;
      return;
    }
    const near = sjNearFan(st);
    if (!a.act) st.heldOn = null;
    if (live && near) {
      // a fresh press starts the fan; so does a held button reaching a fan it hasn't started yet (kids hold buttons)
      const start = f.act || (a.act && st.heldOn !== near && near.out <= 0 && near.pulse <= 0 && near.air > 0);
      if (start) {
        st.heldOn = near;
        if (near.out > 0) sjFx(st, near.x, near.y - 70, 'Still puffed out!', '#d9d3ef', 15);
        else { near.pulse = Math.max(near.pulse, st.help ? K.pulseLucky[st.help] : K.pulse); Sfx.play('skijumpFan', st.crew); st.stats.blasts[st.crew]++; }
      } else if (a.act && near.out <= 0 && near.pulse > 0) near.pulse = Math.max(near.pulse, 0.12);   // holding keeps it going
    }
    for (const fan of st.fans) {
      if (!sjBlowing(st)) fan.pulse = 0;
      fan.pulse = Math.max(0, fan.pulse - dt);
      fan.out = Math.max(0, fan.out - dt);
      const want = fan.pulse > 0 && fan.out <= 0 && fan.air > 0;
      if (want) {
        fan.air -= dt / K.airT;
        if (fan.air <= 0) {
          fan.air = 0; fan.out = K.outT; fan.pulse = 0;
          sjFx(st, fan.x, fan.y - 70, 'Puffed out!', '#d9d3ef', 16); Sfx.play('skijumpPuff');
        }
      } else fan.air = Math.min(1, fan.air + dt * K.airRefill);
      fan.pow = approach(fan.pow, want ? 1 : 0, dt * (want ? K.spinUp : K.spinDown));
      fan.spin += (fan.pow * 30 + 0.4) * dt;
    }
  }

  /* ---------- drawing ---------- */
  function sjStarPath(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function sjDrawSky(st) {
    const night = st.night;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, night ? '#0b1433' : C.skyTop); g.addColorStop(1, night ? '#33508a' : C.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (night) {
      for (let i = 0; i < 60; i++) {
        const hs = hash(i, 7), x = hs % W, y = (hs >> 10) % 300;
        ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(G.clock * 1.3 + i));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6d8'; circle(800, 92, 30); ctx.fill();
      ctx.fillStyle = '#0b1433'; circle(814, 84, 26); ctx.fill();
    } else {
      ctx.fillStyle = C.sunGlow; circle(820, 96, 62); ctx.fill();
      ctx.fillStyle = C.sun; circle(820, 96, 40); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const x = ((i * 263 + G.clock * (5 + i * 2)) % (W + 220)) - 110, y = 60 + ((i * 83) % 110), s = 0.7 + (i % 2) * 0.35;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 7); ctx.arc(x + 22 * s, y - 8 * s, 22 * s, 0, 7); ctx.arc(x + 46 * s, y, 17 * s, 0, 7); ctx.rect(x, y, 46 * s, 17 * s); ctx.fill();
      }
    }
    // far mountains with snowy tops
    const peaks = [[-40, 330, 120], [120, 250, 150], [300, 300, 130], [470, 230, 170], [660, 280, 140], [840, 240, 160], [1010, 310, 120]];
    for (const [px, py, pw] of peaks) {
      ctx.fillStyle = night ? '#24365f' : C.hillFar;
      ctx.beginPath(); ctx.moveTo(px - pw, 420); ctx.lineTo(px, py); ctx.lineTo(px + pw, 420); ctx.closePath(); ctx.fill();
      ctx.fillStyle = night ? '#4c6496' : '#ffffff';
      ctx.beginPath(); ctx.moveTo(px - pw * 0.32, py + 44); ctx.lineTo(px, py); ctx.lineTo(px + pw * 0.32, py + 44);
      ctx.lineTo(px + pw * 0.12, py + 36); ctx.lineTo(px, py + 48); ctx.lineTo(px - pw * 0.14, py + 34); ctx.closePath(); ctx.fill();
    }
    // a row of snowy pines far back
    for (let i = 0; i < 26; i++) {
      const x = i * 40 + (hash(i, 3) % 20), y = 404 + (hash(i, 5) % 18), s = 0.8 + (hash(i, 9) % 5) / 10;
      ctx.fillStyle = night ? '#1b3a3f' : '#3f7d68';
      ctx.beginPath(); ctx.moveTo(x, y - 34 * s); ctx.lineTo(x + 12 * s, y); ctx.lineTo(x - 12 * s, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = night ? '#9fb3d6' : '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y - 34 * s); ctx.lineTo(x + 5 * s, y - 20 * s); ctx.lineTo(x - 5 * s, y - 20 * s); ctx.closePath(); ctx.fill();
    }
  }
  function sjDrawHill(st) {
    const h = st.hill, night = st.night, E = h.E;
    const snowA = night ? '#c9d6f0' : '#ffffff', snowB = night ? '#7f95c4' : '#cfe4f6';
    // one snowy mountain: under the in-run tower, then the landing hill
    const g = ctx.createLinearGradient(0, E.y - 60, 0, H);
    g.addColorStop(0, snowA); g.addColorStop(1, snowB);
    ctx.fillStyle = g;
    const mt = sjMountain(h);
    ctx.beginPath(); ctx.moveTo(-10, H); ctx.lineTo(-10, mt.y0); ctx.quadraticCurveTo(mt.cx, mt.cy, E.x, mt.y1);
    for (let x = E.x; x <= W + 10; x += 6) ctx.lineTo(x, sjHillY(h, x));
    ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
    // a soft shadow line along the landing hill
    ctx.strokeStyle = night ? 'rgba(40,60,110,0.35)' : 'rgba(120,160,205,0.35)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = E.x; x <= W + 10; x += 6) ctx.lineTo(x, sjHillY(h, x) + 14);
    ctx.stroke();
    // the snow pit (Fan Cart Cliff)
    if (h.gap) {
      const x0 = E.x + h.gap[0], x1 = E.x + h.gap[1];
      ctx.fillStyle = night ? '#2c3a62' : '#7fa4c8';
      ctx.beginPath(); ctx.moveTo(x0, sjHillY(h, x0));
      ctx.lineTo(x0 + 6, sjHillY(h, x0 + 6) + 46); ctx.lineTo(x1 - 6, sjHillY(h, x1 - 6) + 46); ctx.lineTo(x1, sjHillY(h, x1)); ctx.closePath(); ctx.fill();
      // fluffy snow at the bottom
      ctx.fillStyle = snowA;
      for (let x = x0 + 9; x < x1 - 4; x += 11) { circle(x, sjHillY(h, x) + 40 + Math.sin(x) * 2, 8); ctx.fill(); }
      const mx = (x0 + x1) / 2;
      text('snow pit', mx, sjHillY(h, mx) + 22, 12, '#ffffff', 'center', 'body');
    }
    // the landing zone: green from the green line, gold from the K line
    const band = (u0, u1, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath();
      for (let u = u0; u <= u1; u += 4) { const x = E.x + u; if (sjInGap(h, x)) continue; ctx.lineTo(x, sjHillY(h, x) + 3); }
      ctx.stroke();
    };
    band(h.greenU, h.kLineU, 'rgba(63,207,114,0.55)');
    band(h.kLineU, Math.min(h.n, h.k3), 'rgba(255,197,61,0.6)');
    // metre ticks every 10 m
    ctx.strokeStyle = night ? 'rgba(220,230,255,0.5)' : 'rgba(93,127,168,0.45)'; ctx.lineWidth = 2;
    for (let m = 10; m < h.K + 40; m += 10) {
      const u = sjUofDist(h, m), x = E.x + u; if (u >= h.n || sjInGap(h, x)) continue;
      const y = sjHillY(h, x); ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + 9); ctx.stroke();
    }
    // the line boards
    const board = (u, label, col) => {
      const x = E.x + u, y = sjHillY(h, x);
      ctx.fillStyle = col; ctx.fillRect(x - 1.5, y - 30, 3, 30);
      ctx.font = '13px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(label).width + 12;
      rr(x - w / 2, y - 48, w, 19, 6); ctx.fill();
      text(label, x, y - 38, 13, '#1c1a36', 'center');
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 4, y + 1); ctx.lineTo(x + 4, y + 1 + Math.tan(sjSlope(h, x)) * 8); ctx.stroke();
    };
    board(h.greenU, h.green + ' m', SJ_GREEN);
    board(h.kLineU, 'K ' + h.K, SJ_GOLD);
    // little flags along the outrun
    for (let i = 0; i < 6; i++) {
      const x = E.x + h.k3 - 30 + i * 30; if (x > W - 135) break;
      const y = sjHillY(h, x);
      ctx.fillStyle = '#6b6f8a'; ctx.fillRect(x, y - 30, 2, 30);
      ctx.fillStyle = [C.pip, C.bo, SJ_GOLD, SJ_GREEN][i % 4];
      ctx.beginPath(); ctx.moveTo(x + 2, y - 30); ctx.lineTo(x + 16 + Math.sin(G.clock * 4 + i) * 2, y - 25); ctx.lineTo(x + 2, y - 20); ctx.closePath(); ctx.fill();
    }
  }
  function sjDrawInrun(st) {
    const h = st.hill, pts = h.inPts, E = h.E, night = st.night;
    // tower legs
    ctx.strokeStyle = night ? '#43507a' : '#8a97b8'; ctx.lineWidth = 4;
    for (let s = 20; s < h.inTotal - 10; s += 46) {
      const p = pts[s], gy = sjTowerGround(h, p.x);
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 8); ctx.lineTo(p.x, gy); ctx.stroke();
      const q = pts[Math.min(h.inTotal, s + 46)];
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, gy - 4); ctx.lineTo(q.x, q.y + 10); ctx.stroke(); ctx.lineWidth = 4;
    }
    // the track: a deck with an icy groove and a rail
    const line = (off, col, lw) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let s = 0; s <= h.inTotal; s += 3) { const p = pts[s]; ctx.lineTo(p.x - Math.sin(p.a) * off, p.y + Math.cos(p.a) * off); }
      ctx.lineTo(E.x, E.y + off); ctx.stroke();
    };
    line(7, night ? '#4b5a88' : '#6d7fa8', 10);
    line(2, night ? '#b8c8ec' : '#f4fbff', 5);
    line(1, night ? 'rgba(130,160,220,0.9)' : 'rgba(120,170,220,0.8)', 1.5);
    // the take-off zone on the table: gold stripes
    for (let s = h.inTotal - 40; s < h.inTotal; s += 8) {
      const p = pts[s]; ctx.fillStyle = (s / 8) % 2 < 1 ? SJ_GOLD : '#ffffff';
      ctx.save(); ctx.translate(p.x, p.y + 6); ctx.rotate(p.a); ctx.fillRect(0, -2, 8, 5); ctx.restore();
    }
    // the table lip
    ctx.fillStyle = night ? '#4b5a88' : '#6d7fa8'; ctx.fillRect(E.x - 3, E.y + 2, 4, h.drop + 2);
    // the start hut and bar
    const g0 = pts[0];
    ctx.fillStyle = night ? '#6a3f4a' : '#c0584a'; rr(g0.x - 36, g0.y - 30, 28, 28, 4); ctx.fill();
    ctx.fillStyle = night ? '#d9c98a' : '#ffe8a6'; ctx.fillRect(g0.x - 30, g0.y - 23, 10, 8);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(g0.x - 40, g0.y - 28); ctx.lineTo(g0.x - 22, g0.y - 42); ctx.lineTo(g0.x - 4, g0.y - 28); ctx.closePath(); ctx.fill();
    const lit = st.phase === 'gate' ? (G.introT > K.introLock ? '#ff5f6d' : SJ_GREEN) : '#ffffff55';
    ctx.fillStyle = lit; circle(g0.x - 15, g0.y - 19, 3.5); ctx.fill();
    ctx.strokeStyle = '#3a3f5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g0.x - 6, g0.y - 2); ctx.lineTo(g0.x + 14, g0.y + 12); ctx.stroke();
  }
  // the mountain line under the in-run: a curve from the left edge to the foot of the take-off table
  const sjMountain = h => ({ y0: h.gate[1] + 110, cx: h.E.x * 0.55, cy: h.E.y + h.drop - 4, y1: h.E.y + h.drop });
  function sjTowerGround(h, x) {
    const m = sjMountain(h), x0 = -10, y0 = m.y0, cx = m.cx, cy = m.cy, x1 = h.E.x, y1 = m.y1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) { const t = (lo + hi) / 2, xx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1; if (xx < x) lo = t; else hi = t; }
    const t = lo;
    return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
  }
  function sjDrawFloodlights(st) {
    const h = st.hill;
    for (const u of [60, 220, 380]) {
      const x = h.E.x + u + 30, by = sjHillY(h, h.E.x + u) - 4, top = by - 150;
      ctx.fillStyle = 'rgba(255,248,210,0.10)';
      ctx.beginPath(); ctx.moveTo(x - 8, top); ctx.lineTo(x - 110, sjHillY(h, x - 110) + 2); ctx.lineTo(x + 90, sjHillY(h, x + 90) + 2); ctx.lineTo(x + 8, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b3556'; ctx.fillRect(x - 2, top, 4, by - top);
      ctx.fillStyle = '#fff6c8'; rr(x - 12, top - 8, 24, 10, 3); ctx.fill();
    }
  }
  function sjDrawCatwalk(st) {
    const h = st.hill, night = st.night;
    const x0 = h.cat0, x1 = h.cat1;
    // the crew hut at the left end, where the fan crew starts each jump
    const hy = sjCatY(h, x0);
    ctx.fillStyle = night ? '#6a3f4a' : '#c0584a'; rr(x0 - 6, hy - 30, 30, 30, 4); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x0 - 10, hy - 28); ctx.lineTo(x0 + 9, hy - 42); ctx.lineTo(x0 + 28, hy - 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = night ? '#d9c98a' : '#ffe8a6'; ctx.fillRect(x0, hy - 22, 8, 7);
    // posts
    ctx.fillStyle = night ? '#5a4a3c' : C.plankDark;
    for (let x = x0 + 6; x < x1; x += 34) ctx.fillRect(x - 2, sjCatY(h, x), 4, 18);
    // deck and rail
    ctx.strokeStyle = night ? '#7a6248' : C.plankDark; ctx.lineWidth = 7; ctx.beginPath();
    for (let x = x0; x <= x1; x += 5) ctx.lineTo(x, sjCatY(h, x) + 2);
    ctx.stroke();
    ctx.strokeStyle = night ? '#a88a62' : C.plank; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = x0; x <= x1; x += 5) ctx.lineTo(x, sjCatY(h, x));
    ctx.stroke();
    if (st.cart) {
      ctx.strokeStyle = '#6d7fa8'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = x0; x <= x1; x += 5) ctx.lineTo(x, sjCatY(h, x) - 3);
      ctx.stroke();
    }
  }
  function sjDrawFan(st, fan, i) {
    const lucky = st.help > 0, h = st.hill;
    const gustFan = st.gust && st.gust.fan === i;
    const x = fan.x, base = fan.cart ? fan.y - 14 : fan.y;
    if (fan.cart) {
      // the rail cart
      ctx.fillStyle = '#c0584a'; rr(x - 22, fan.y - 16, 44, 14, 4); ctx.fill();
      ctx.fillStyle = '#2b3556'; circle(x - 13, fan.y - 1, 5); ctx.fill(); circle(x + 13, fan.y - 1, 5); ctx.fill();
    }
    // the stand
    ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 3, base - 16, 6, 16);
    ctx.fillRect(x - 10, base - 4, 20, 4);
    // the head, facing up the hill to blow at the jumper
    const fy = base - 27;
    ctx.save(); ctx.translate(x, fy); ctx.scale(1, 0.62);
    const rim = lucky ? SJ_GOLD : fan.out > 0 ? '#9aa3bd' : gustFan ? '#ff7a6b' : '#e9eef9';
    ctx.fillStyle = '#2e3a5e'; circle(0, 0, 18); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 4; circle(0, 0, 18); ctx.stroke();
    ctx.fillStyle = fan.pow > 0.2 ? '#cfe8ff' : '#9fb3d6';
    for (let b = 0; b < 3; b++) {
      const a = fan.spin + b * 2.094;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 7.5, Math.sin(a) * 7.5, 7.5, 3.8, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rim; circle(0, 0, 4); ctx.fill();
    ctx.restore();
    // the near-fan ring: the crew can switch this one on now
    if (st.phase !== 'tally' && !fan.cart && sjNearFan(st) === fan) {
      ctx.strokeStyle = PCOL[st.crew]; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.clock * 6);
      ctx.beginPath(); ctx.ellipse(x, fy, 24, 17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // air meter
    const air = fan.air;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(x - 16, base + 6 + (fan.cart ? 12 : 0), 32, 6, 3); ctx.fill();
    ctx.fillStyle = fan.out > 0 ? '#ff8a7a' : lucky ? SJ_GOLD : '#7fd6ff';
    if (air > 0.02) { rr(x - 16, base + 6 + (fan.cart ? 12 : 0), 32 * air, 6, 3); ctx.fill(); }
    if (gustFan && !fan.cart) {
      // a windsock marks the gust zone's fan
      ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 28, base - 30, 2, 30);
      const fl = st.gust.state === 'blow' ? -1 : 1, wv = Math.sin(G.clock * 6) * 2;
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = s % 2 ? '#ffffff' : '#ff5f6d';
        ctx.fillRect(x - 26 + (fl < 0 ? -9 * (s + 1) - 2 : 9 * s), base - 30 + s * 0.8 + wv * (s / 4), 9, 8 - s * 1.1);
      }
    }
  }
  function sjDrawWind(st) {
    const lucky = st.help > 0;
    for (const fan of st.fans) {
      if (fan.pow <= 0.05) continue;
      const R = (fan.cart ? K.cartReach : K.fanReach) * (K.helpReach[st.help] || 1), base = (fan.cart ? fan.y - 14 : fan.y) - 36, top = Math.max(60, base - 250);
      ctx.save(); ctx.globalAlpha = 0.18 * fan.pow;
      ctx.fillStyle = lucky ? SJ_GOLD : '#ffffff';
      ctx.beginPath(); ctx.moveTo(fan.x - 16, base); ctx.lineTo(fan.x - R, top); ctx.lineTo(fan.x + R, top); ctx.lineTo(fan.x + 16, base); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.75 * fan.pow; ctx.strokeStyle = lucky ? SJ_GOLD : '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const ph = ((G.clock * 1.6 + i * 0.2) % 1), y = base - ph * (base - top), w = 16 + (R - 16) * ph;
        const xx = fan.x + (i - 2) / 2 * w;
        ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + 2, y - 16); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function sjDrawGust(st) {
    const gu = st.gust; if (!gu) return;
    const h = st.hill, mx = W - 50, my = 210;
    const shake = gu.state === 'warn' ? Math.sin(G.clock * 60) * 2 : 0;
    // the Gust-o-matic: a grumpy cloud on a pole
    ctx.fillStyle = '#2b3556'; ctx.fillRect(mx - 3, my, 6, sjHillY(h, mx) - my);
    ctx.save(); ctx.translate(mx + shake, my);
    ctx.fillStyle = '#d6def2';
    ctx.beginPath(); ctx.arc(-14, 0, 18, 0, 7); ctx.arc(6, -10, 20, 0, 7); ctx.arc(22, 4, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#9aa6c8'; rr(-46, -6, 22, 12, 4); ctx.fill();
    ctx.fillStyle = C.ink; circle(-4, -4, 2.5); ctx.fill(); circle(10, -4, 2.5); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(0, -7); ctx.moveTo(14, -10); ctx.lineTo(6, -7); ctx.stroke();
    ctx.beginPath(); ctx.arc(3, 8, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    const lamp = gu.state === 'warn' ? (Math.sin(G.clock * 30) > 0 ? '#ff5f6d' : '#ffe0e0') : gu.state === 'blow' ? '#ff5f6d' : '#5a6488';
    ctx.fillStyle = lamp; circle(6, -30, 5); ctx.fill();
    ctx.restore();
    text('Gust-o-matic', mx - 4, my + 30, 11, '#dfe8ff', 'center', 'body');
    // the gust zone
    const zy0 = sjHillY(h, gu.x0) - 170, zy1 = sjHillY(h, gu.x1);
    if (gu.state === 'blow') {
      ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffb3a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const ph = (G.clock * 2.2 + i * 0.13) % 1, x = gu.x1 + 30 - ph * (gu.x1 - gu.x0 + 60), y = zy0 + 20 + (i * 37) % Math.max(40, zy1 - zy0 - 30);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26, y + 6); ctx.stroke();
      }
      ctx.restore();
    } else if (st.phase === 'gate' || st.phase === 'inrun' || (st.phase === 'air' && gu.state !== 'done')) {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffb3a8'; ctx.lineWidth = 2;
      ctx.strokeRect(gu.x0, zy0, gu.x1 - gu.x0, Math.max(40, sjHillY(h, (gu.x0 + gu.x1) / 2) - zy0 - 30));
      ctx.restore();
    }
  }
  function sjDrawRing(r, night) {
    if (r.got && r.pop <= 0) return;
    ctx.save(); ctx.translate(r.x, r.y);
    if (r.got) { ctx.globalAlpha = r.pop / 0.6; ctx.scale(1 + (0.6 - r.pop), 1 + (0.6 - r.pop)); }
    const wob = Math.sin(G.clock * 2 + r.x) * 0.08;
    ctx.rotate(wob);
    ctx.strokeStyle = night ? '#bfe6ff' : '#5fb6ff'; ctx.lineWidth = 5; circle(0, 0, K.ringR - 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(0, 0, K.ringR - 2); ctx.stroke();
    // little snowflake spikes around it
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(c * (K.ringR + 1), s * (K.ringR + 1)); ctx.lineTo(c * (K.ringR + 8), s * (K.ringR + 8)); ctx.stroke();
    }
    ctx.restore();
  }
  function sjDrawPenguins(st) {
    const h = st.hill, judging = st.phase === 'judge' && st.cards;
    for (let i = 0; i < 3; i++) {
      const x = W - 108 + i * 34, y = sjHillY(h, x);
      const hop = judging && st.cardsUp > i ? Math.max(0, Math.sin(G.clock * 9 + i)) * 3 : 0;
      ctx.save(); ctx.translate(x, y - hop);
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.ellipse(-5, 0, 5, 2.5, 0, 0, 7); ctx.ellipse(5, 0, 5, 2.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#23263f'; ctx.beginPath(); ctx.ellipse(0, -14, 11, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -11, 7, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(-3.5, -22, 2.6); ctx.fill(); circle(3.5, -22, 2.6); ctx.fill();
      ctx.fillStyle = C.ink; circle(-3, -22, 1.3); ctx.fill(); circle(3, -22, 1.3); ctx.fill();
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(3, -18); ctx.lineTo(0, -14); ctx.closePath(); ctx.fill();
      // a scarf in a judge colour
      ctx.fillStyle = ['#ff5f6d', SJ_GOLD, '#5b95ff'][i]; ctx.fillRect(-8, -16, 16, 3);
      // the score card
      if (judging && st.cardsUp > i) {
        ctx.fillStyle = '#6b6f8a'; ctx.fillRect(9, -44, 2, 30);
        ctx.fillStyle = '#ffffff'; rr(-4, -64, 28, 22, 4); ctx.fill();
        ctx.strokeStyle = '#23263f'; ctx.lineWidth = 1.5; rr(-4, -64, 28, 22, 4); ctx.stroke();
        const v = st.cards[i];
        text(v % 1 ? v.toFixed(1) : String(v), 10, -52.5, v % 1 ? 11 : 14, C.ink, 'center');
      }
      ctx.restore();
    }
    text('Judges', W - 74, sjHillY(h, W - 74) + 14, 11, st.night ? '#dfe8ff' : '#5d7fa8', 'center', 'body');
  }
  // a skier: (x, y) under the boots, skiA the skis' angle, lean how far the body tips forward from upright on the skis
  function sjDrawSkier(id, j, st) {
    const col = PCOL[id], dark = PDARK[id];
    if (j.tumble > 0.02) {
      // a big soft snowball with the jumper peeking out
      const r = 15 + 4 * j.tumble;
      ctx.save(); ctx.translate(j.x, j.y - r + 2);
      ctx.save(); ctx.rotate(j.roll);
      ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -8); ctx.lineTo(20, 10); ctx.moveTo(-18, 12); ctx.lineTo(22, -6); ctx.stroke();
      ctx.fillStyle = '#ffffff'; circle(0, 0, r); ctx.fill();
      ctx.fillStyle = 'rgba(160,190,220,0.5)'; circle(-5, 6, r * 0.5); ctx.fill();
      ctx.restore();
      ctx.fillStyle = col; circle(0, -r + 3, 7); ctx.fill();
      ctx.fillStyle = C.ink; circle(-3, 2, 1.8); ctx.fill(); circle(3, 2, 1.8); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 6, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
      return;
    }
    const tuck = st.phase === 'inrun' || st.phase === 'gate' ? j.tuck : 0;
    ctx.save(); ctx.translate(j.x, j.y - (j.hop > 0 ? Math.sin(j.hop / 0.25 * Math.PI) * 6 : 0)); ctx.rotate(j.skiA);
    // skis (in a V while flying)
    const flying = st.phase === 'air';
    const ski = (rot, alpha) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha;
      ctx.fillStyle = dark; rr(-18, -1.5, 40, 4, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(20, -1.5); ctx.quadraticCurveTo(27, -3, 26, -7); ctx.lineTo(23, -5); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    if (flying) ski(-0.16, 0.65);
    if (j.tele && st.phase !== 'air') { ctx.save(); ctx.translate(7, 0); ski(0, 0.7); ctx.restore(); }
    ski(0, 1);
    // the body tips forward over the skis
    ctx.rotate(j.lean);
    const bw = 20, bh = 26 - 9 * tuck - (j.sit ? 6 : 0);
    ctx.translate(0, -2);
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.2;
    if (id === 1) { circle(-bw / 2 + 4, -bh + 1, 4.5); ctx.fill(); ctx.stroke(); circle(bw / 2 - 4, -bh + 1, 4.5); ctx.fill(); ctx.stroke(); }
    rr(-bw / 2, -bh, bw, bh, 7); ctx.fill(); ctx.stroke();
    // helmet and goggles
    ctx.fillStyle = dark; rr(-bw / 2 + 1, -bh, bw - 2, 7, 5); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(-bw / 2 + 2, -bh + 7, bw - 4, 7, 3.5); ctx.fill();
    ctx.fillStyle = C.ink; circle(3, -bh + 10.5, 2); ctx.fill(); circle(-4, -bh + 10.5, 2); ctx.fill();
    if (id === 0) { ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4, -bh - 4, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
    // a bib number
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(-5, -bh + 15, 10, 8, 2); ctx.fill();
    text(String(id + 1), 0, -bh + 19.3, 7, C.ink, 'center', 'body');
    ctx.restore();
  }
  function sjDrawPose(st, j) {
    if (st.phase !== 'air' || G.introT > 0) return;
    const sc = hudBig() ? 1.35 : 1, x = j.x, y = j.y - 44 * sc;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    // an arc: green in the middle, orange where it gets wobbly; the needle is the pose (left = back, right = forward)
    const R = 18, A = 1.05;
    const arc = (a0, a1, col) => { ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2 + a0, -Math.PI / 2 + a1); ctx.stroke(); };
    arc(-A, A, 'rgba(255,138,122,0.9)');
    arc(-A * K.wobbly / K.poseMax, A * K.wobbly / K.poseMax, 'rgba(63,207,114,0.95)');
    const na = -Math.PI / 2 + A * j.pose / K.poseMax;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(na) * (R + 4), Math.sin(na) * (R + 4)); ctx.stroke();
    ctx.fillStyle = C.ink; circle(0, 0, 2.5); ctx.fill();
    ctx.restore();
  }

  function sjDrawWorld(st) {
    sjDrawSky(st);
    sjDrawHill(st);
    if (st.night) sjDrawFloodlights(st);
    sjDrawInrun(st);
    sjDrawPenguins(st);
    sjDrawGust(st);
    sjDrawWind(st);
    sjDrawCatwalk(st);
    st.fans.forEach((f, i) => sjDrawFan(st, f, i));
    for (const r of st.rings) sjDrawRing(r, st.night);
    // the gold NOW! marker (gold help): the fan the jumper is about to fly over
    if (st.help && st.phase === 'air' && !st.cart) {
      const j = st.j;
      const next = st.fans.find(f => f.x > j.x - 20 && f.x < j.x + 150 && f.pow < 0.5);
      if (next) {
        const y = next.y - 78 + Math.sin(G.clock * 10) * 3;
        ctx.fillStyle = SJ_GOLD; ctx.beginPath(); ctx.moveTo(next.x - 8, y); ctx.lineTo(next.x + 8, y); ctx.lineTo(next.x, y + 10); ctx.closePath(); ctx.fill();
        bigText('NOW!', next.x, y - 12, 16, SJ_GOLD);
      }
    }
  }
  function sjDrawTop(st) {
    const j = st.j;
    sjDrawSkier(st.jumper, j, st);
    // the landing hint: ▼ flashes just before touchdown
    if (st.phase === 'air' && j.popped && G.introT <= 0) {
      const h = st.hill, hgt = sjSurf(h, j.x) - j.y, close = j.vy - j.vx * Math.tan(sjSlope(h, j.x));
      const tl = close > 1 ? hgt / close : 9;
      if (tl < 0.55 && !sjCpu(st.jumper)) {
        const ok = j.teleAt > 0 && j.t - j.teleAt < K.teleWin;
        ctx.save(); ctx.globalAlpha = ok ? 0.5 : 0.95;
        bigText(sjKey(st.jumper, 'tuck') === 'down' ? '▼' : sjKey(st.jumper, 'tuck'), j.x + 30, j.y - 6, hudBig() ? 22 : 16, ok ? SJ_GREEN : SJ_GOLD);
        ctx.restore();
      }
    }
    for (const f of st.fx) { ctx.save(); ctx.globalAlpha = clamp(f.t / 0.3, 0, 1); bigText(f.text, f.x, f.y, f.size * (hudBig() ? 1.25 : 1), f.col); ctx.restore(); }
    sjDrawPose(st, j);   // after the words, so the needle is always on top
  }

  /* ---------- HUD ---------- */
  function sjHint(st) {
    const J = st.jumper, Cr = st.crew, j = st.j, nj = NAMES[J], nc = NAMES[Cr];
    if (G.introT > 0) return null;
    const jh = () => {
      if (sjCpu(J)) return [nj + ' skis and jumps', PCOL[J]];
      if (st.phase === 'gate') return [nj + ': ' + sjKey(J, 'go') + ' to go!', PCOL[J]];
      if (st.phase === 'inrun') return [nj + ': ' + (j.tuck < 0.5 ? 'hold ' + sjKey(J, 'tuck') + ' to tuck, ' : '') + sjKey(J, 'go') + ' at the gold edge!', PCOL[J]];
      if (st.phase === 'air') return [nj + ': ' + (sjDev(J) === 'pad' ? 'tilt the stick' : sjKey(J, 'lean')) + ' to keep the needle green, ' + sjKey(J, 'tuck') + ' to land', PCOL[J]];
      return null;
    };
    const ch = () => {
      if (sjCpu(Cr)) return [nc + (st.cart ? ' drives the fan cart' : ' runs the fans'), PCOL[Cr]];
      if (!sjBlowing(st)) return null;
      const run = sjDev(Cr) === 'pad' ? 'stick' : sjKey(Cr, 'run'), push = sjDev(Cr) === 'touch' ? 'tap ' : 'press ';
      if (st.cart) return [nc + ': ' + run + ' to drive, hold ' + sjKey(Cr, 'fan') + ' under ' + nj + (st.phase === 'air' ? ' to blow' : ' once ' + nj + ' flies'), PCOL[Cr]];
      const gu = st.gust;
      if (gu && !gu.blocked && gu.state !== 'done' && st.phase === 'air' && j.x > gu.x0 - 220) return [nc + ': start the red fan now to block the gust!', PCOL[Cr]];
      if (!sjNearFan(st) && st.phase !== 'air') return [nc + ': ' + run + ' to run to a fan, then ' + push + sjKey(Cr, 'fan') + ' as ' + nj + ' flies over', PCOL[Cr]];
      return [nc + ': ' + push + sjKey(Cr, 'fan') + ' at a fan as ' + nj + ' flies over', PCOL[Cr]];
    };
    return [jh(), ch()].filter(Boolean);
  }
  function sjHud(st) {
    const big = hudBig(), sc = big ? 1.3 : 1, D = G.level.def;
    // top right: who jumps, this hill's jumps and the stars so far
    const ph = 28 * sc;
    const lab = NAMES[st.jumper] + ' jumps · ' + (st.n + 1) + ' of 2';
    ctx.font = '700 ' + (14 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const lw = ctx.measureText(lab).width;
    const px = pill(W - 14, 12, lw + 34 * sc, ph, 'right');
    ctx.fillStyle = PCOL[st.jumper]; circle(px + 14 * sc, 12 + ph / 2, 5 * sc); ctx.fill();
    text(lab, px + 24 * sc, 12 + ph / 2 + 0.5, 14 * sc, C.paper, 'left', 'body');
    const so = st.hillStars.reduce((a, b) => a + b, 0);
    const s2 = 'Stars ' + so + ' / 12  ·  ' + fmtPts(st.total) + ' pts';
    ctx.font = '700 ' + (12 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(s2).width + 20 * sc;
    pill(W - 14, 12 + ph + 4, w2, 20 * sc, 'right');
    text(s2, W - 14 - w2 / 2, 12 + ph + 4 + 10 * sc + 0.5, 12 * sc, C.gold, 'center', 'body');
    // hints: what each player does now (their own keys)
    const hints = sjHint(st) || [];
    let hy = big ? 12 + ph + 30 * sc : 78;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const roomR = 14 + ctx.measureText('Room ' + ((D.roomIndex || 0) + 1) + ' of ' + (D.roomCount || 1) + ': ' + (D.title || '')).width + 44;
    for (const [t, col] of hints) {
      ctx.font = '700 ' + (13 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const sw = ctx.measureText(t).width + 30 * sc;
      const leftMin = big ? 14 : (hy < 76 ? roomR + 8 : 14);
      const hx = clamp(W / 2 + 40, leftMin + sw / 2, W - 14 - sw / 2);
      pill(hx, hy, sw, 22 * sc, 'center');
      ctx.fillStyle = col; circle(hx - sw / 2 + 11 * sc, hy + 11 * sc, 4 * sc); ctx.fill();
      text(t, hx + 5 * sc, hy + 11.5 * sc, 13 * sc, C.paper, 'center', 'body');
      hy += 26 * sc;
    }
    // live readout under the hints: speed on the in-run, metres in the air
    const j = st.j;
    if (st.phase === 'inrun' || st.phase === 'air') {
      const v = st.phase === 'inrun' ? Math.round(j.v * K.kmh) + ' km/h' : (Math.round(sjDist(st.hill, j.x) * 2) / 2).toFixed(1) + ' m';
      bigText(v, W / 2 + 40, hy + 16 * sc, 24 * sc, st.phase === 'air' && sjDist(st.hill, j.x) >= st.hill.green ? (sjDist(st.hill, j.x) >= st.hill.K ? SJ_GOLD : SJ_GREEN) : C.paper);
    }
    // the swap / try-again banner
    if (st.banner) {
      const b = st.banner, a = clamp(Math.min(b.t / 0.3, (b.max - b.t) / 0.2), 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      const by = big ? 230 : 200;
      bigText(b.text, W / 2 + 60, by, 30 * sc, b.col);
      ctx.font = '700 ' + (14 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const bw = ctx.measureText(b.sub).width + 30;
      pill(W / 2 + 60, by + 20 * sc, bw, 24 * sc, 'center');
      text(b.sub, W / 2 + 60, by + 32 * sc, 14 * sc, b.col === SJ_GOLD ? SJ_GOLD : C.paper, 'center', 'body');
      ctx.restore();
    }
    // the score card after a counted jump
    if ((st.phase === 'judge' || st.phase === 'out') && st.score) {
      const s = st.score, a = clamp(st.phase === 'out' ? 1 : 1, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      const cx = W / 2 + 70, cy = big ? 215 : 190;
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-170, -34, 340, st.phase === 'judge' && st.t > 1.4 ? 92 : 62, 16); ctx.fill();
      ctx.strokeStyle = s.k ? SJ_GOLD : SJ_GREEN; ctx.lineWidth = 2.5; rr(-170, -34, 340, st.phase === 'judge' && st.t > 1.4 ? 92 : 62, 16); ctx.stroke();
      text(s.dist.toFixed(1) + ' m', -60, -12, 26, s.k ? SJ_GOLD : SJ_GREEN, 'center');
      text(s.capped ? 'Tailwind: counts to the K line' : s.k ? 'Past the K line!' : 'Past the green line!', -60, 14, 12, s.capped ? SJ_GOLD : '#d9d3ef', 'center', 'body');
      text(s.crash ? 'Fluff! Soft landing' : s.tele ? 'Telemark landing' : 'Two-feet landing', 70, -12, 13, s.tele ? SJ_GOLD : C.paper, 'center', 'body');
      text(s.rings ? s.rings + ' ring' + (s.rings > 1 ? 's' : '') + ' (+' + s.rings * K.ringPts + ')' : (NAMES[s.who] + ' jumped'), 70, 10, 12, s.rings ? SJ_GOLD : '#d9d3ef', 'center', 'body');
      if (st.phase === 'judge' && st.t > 1.4) {
        text(fmtPts(s.dpts) + ' distance  +  ' + fmtPts(s.style) + ' style' + (s.rings ? '  +  ' + s.rings * K.ringPts : '') + '  =  ' + fmtPts(s.total), 0, 42, 15, C.paper, 'center', 'body');
      }
      ctx.restore();
    }
    // a short jump
    if (st.phase === 'short' && st.t > 0.5) {
      ctx.save(); ctx.globalAlpha = clamp((st.t - 0.5) / 0.25, 0, 1);
      const cx = W / 2 + 70, cy = big ? 215 : 190;
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-180, -34, 360, 70, 16); ctx.fill();
      text((Math.round(st.j.dist * 2) / 2).toFixed(1) + ' m · ' + st.shortWhy, 0, -12, 15, C.paper, 'center', 'body');
      const tipS = sjCpu(st.crew) ? NAMES[st.crew] + "'s fans push you farther. Again!"
        : st.cart ? NAMES[st.crew] + ': drive under ' + NAMES[st.jumper] + ' and hold to blow once ' + NAMES[st.jumper] + ' flies!' : NAMES[st.crew] + ': turn the fans on as ' + NAMES[st.jumper] + ' flies over!';
      text(tipS, 0, 14, 13, '#d9d3ef', 'center', 'body');
      ctx.restore();
    }
    // the hill's tally card
    if (st.phase === 'tally') {
      const a = clamp(st.t / 0.25, 0, 1), last = st.k >= (D.roomCount || 1) - 1;
      ctx.save(); ctx.globalAlpha = a;
      const cx = W / 2 + 40, cy = big ? 230 : 200;
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-210, -62, 420, 140, 20); ctx.fill();
      text(D.title + ' done!', 0, -36, 26, C.paper, 'center');
      text(fmtPts(st.hillTotal[st.k]) + ' points · ' + NAMES[0] + ' ' + fmtPts(st.hillPts[0]) + ', ' + NAMES[1] + ' ' + fmtPts(st.hillPts[1]), 0, -8, 14, '#d9d3ef', 'center', 'body');
      const n = Math.min(st.hillStars[st.k], Math.floor(st.t / 0.35));
      if (n > (st.tallyStars || 0)) { st.tallyStars = n; Sfx.play('skijumpStar'); }
      for (let k = 0; k < 3; k++) {
        const on = k < st.tallyStars;
        ctx.fillStyle = on ? SJ_GOLD : 'rgba(246,239,223,0.2)'; sjStarPath(-50 + k * 50, 26, on ? 17 : 15); ctx.fill();
      }
      text(last ? 'Total: ' + fmtPts(st.total) + ' points!' : 'Next: ' + D.rooms[st.k + 1].title, 0, 60, 14, '#d9d3ef', 'center', 'body');
      ctx.restore();
    }
  }
  const fmtPts = v => (Math.round(v * 2) / 2).toFixed(v % 1 ? 1 : 0);

  MODES.skijump = {
    CFG: SKI, HILLS: SJ_HILLS,
    setup(st, L) {
      Object.assign(st, { total: 0, hillStars: [0, 0, 0, 0], hillTotal: [0, 0, 0, 0], clock: 0, fx: [], idle: [0, 0],
        stats: { longest: [0, 0], teles: [0, 0], perfect: [0, 0], fanT: [0, 0], blasts: [0, 0], tuckT: [0, 0], runPx: [0, 0],
          rings: 0, shorts: 0, jumps: 0, kLines: 0, blocks: 0 } });
      L.grid = L.grid.map(r => r.map(() => '.'));
      sjRoom(st, 0);
    },
    room(k, L) { L.grid = L.grid.map(r => r.map(() => '.')); sjRoom(G.mst, k); },
    step(dt) { if (G.mst.j) sjStep(G.mst, dt); },
    // the engine draws the players between draw() and drawTop(): the jumper is hidden then and drawn on skis in drawTop
    draw() {
      const st = G.mst; if (!st.j) return;
      sjDrawWorld(st);
      st.hid = st.jumper; G.players[st.jumper].alive = false;
    },
    drawTop() {
      const st = G.mst;
      if (st.hid != null) { G.players[st.hid].alive = true; st.hid = null; }
      if (st.j) sjDrawTop(st);
    },
    hud() { if (G.mst.j) sjHud(G.mst); },
    stats() {
      const st = G.mst, s = st.stats, stars = st.hillStars.reduce((a, b) => a + b, 0);
      const medal = stars >= 10 ? 'Gold medal' : stars >= 7 ? 'Silver medal' : 'Bronze medal';
      return [
        { label: 'Stars', value: stars + ' of 12' },
        { label: 'Points', value: fmtPts(st.total) },
        { label: 'Longest jump (m)', values: s.longest.map(m => m.toFixed(1)) },
        { label: 'Telemarks', values: s.teles.slice() },
        medal + '! ' + (stars >= 10 ? 'Flying champions!' : stars >= 7 ? 'Super soaring!' : 'Great teamwork on the hill!') +
          (s.rings ? ' Rings: ' + s.rings + '.' : ''),
      ];
    },
    // for the computer brain and bot tests
    api: { build: sjBuildHill, hillY: sjHillY, surf: sjSurf, slope: sjSlope, dist: sjDist, uOfDist: sjUofDist, catY: sjCatY,
      inAt: sjInAt, inGap: sjInGap, fanPush: sjFanPush, nearFan: sjNearFan, keys: sjKey, input: sjInput },
  };

  Sfx.extra.skijumpGo = function (p) { this.tone(330 * p, 0.1, 'triangle', 0.05, 520 * p); this.tone(200, 0.3, 'sawtooth', 0.012, 120, 0.05); };
  Sfx.extra.skijumpEarly = function () { this.tone(300, 0.08, 'triangle', 0.04, 240); };
  Sfx.extra.skijumpTakeoff = function (p) { this.tone(420 * p, 0.16, 'square', 0.035, 760 * p); };
  Sfx.extra.skijumpPerfect = function (p) { [660, 880, 1175].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.05, null, i * 0.05)); this.tone(500 * p, 0.2, 'square', 0.025, 900 * p); };
  Sfx.extra.skijumpFan = function (p) { this.tone(140 * p, 0.25, 'sawtooth', 0.02, 260 * p); this.tone(1800, 0.12, 'sine', 0.008, 900); };
  Sfx.extra.skijumpPuff = function () { this.tone(400, 0.2, 'sine', 0.04, 120); };
  Sfx.extra.skijumpLand = function () { this.tone(160, 0.08, 'triangle', 0.06, 90); this.tone(1200, 0.12, 'sawtooth', 0.008, 400); };
  Sfx.extra.skijumpTele = function (p) { this.tone(160, 0.08, 'triangle', 0.06, 90); [784, 1047].forEach((f, i) => this.tone(f * p, 0.12, 'triangle', 0.05, null, 0.05 + i * 0.07)); };
  Sfx.extra.skijumpFluff = function () { this.tone(520, 0.18, 'sine', 0.05, 160); this.tone(260, 0.25, 'triangle', 0.04, 120, 0.08); };
  Sfx.extra.skijumpRing = function () { [1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.045, null, i * 0.04)); };
  Sfx.extra.skijumpCard = function () { this.tone(900, 0.04, 'square', 0.03, 1200); };
  Sfx.extra.skijumpK = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.035, null, 0.2 + i * 0.06)); };
  Sfx.extra.skijumpStar = function () { this.tone(1175, 0.09, 'triangle', 0.05); this.tone(1568, 0.14, 'triangle', 0.05, null, 0.06); };
  Sfx.extra.skijumpHill = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.08)); };
  Sfx.extra.skijumpSwap = function () { [523, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.08)); };
  Sfx.extra.skijumpLucky = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.05)); };
  Sfx.extra.skijumpWarn = function () { [880, 660].forEach((f, i) => this.tone(f, 0.08, 'square', 0.03, null, i * 0.1)); };
  Sfx.extra.skijumpGust = function () { this.tone(300, 0.5, 'sawtooth', 0.02, 120); };
  Sfx.extra.skijumpBlock = function () { this.tone(500, 0.06, 'square', 0.035, 900); this.tone(1200, 0.1, 'triangle', 0.04, null, 0.05); };
}

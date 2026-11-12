/* Pip & Bo - Level 35-1 Moonwick Academy: class 11 'exam' (Final Exam: The Big Mistake). */
'use strict';

/* ===== 35-1 class 11: Final Exam, The Big Mistake (WIZ_PHASES.exam) ==============================================
   "Just a little one of each, dears." The spells tangle, hit her bottomless ink pot and wake THE BLOT: a huge glossy
   ink monster with two white eyes and a mouth like a spill. It swallows her armchair (she floats inside, teacup and
   all) and floods the school. The scary part: big, fast, loud.

   PART 1, THE FLOOD (scrolling right). The Blot rolls after them from the left. 8 gates, one per class, each in its
   spell's colour and announced ("LIFT, dears!"). Every gate is two jobs, alternating who gets which:
   - CASTER (action word "cast"): stands in the gate's spell circle and HOLDS the action: the spell holds the way open
     (a frost bridge over an ink pool, a lifted slab, a light in the dark, a shrunk keyhole, a fish-safe pool...).
   - RUNNER (action word "pull"): gets across while it is held and pulls the lever behind, which sets the spell for
     good and opens the gate door; then both run on.
   Falling into an ink pool is a "Gloop!" (that player's Oops, back to the gate). The Blot has a gap meter like the
   lawnmower's: it hurries when far behind and eases when close (WIZEXAM.blot). Caught: "GLOOP!", both swallowed and
   spat out at the gate, the Blot backs off: a team Oops. GOLD HELP after 2 Oops at one gate: a gold tea splash slows
   it for 20 s.
   PART 2, THE GREAT HALL (a fixed arena, the Blot filling the right wall). 3 rounds. Each round an attack set
   (WIZEXAM.attackT s): ink waves along the floor (jump them), ink bolts (hold the action for a shield bubble), and
   grabbing arms (a ring on the floor first: step out). A hit knocks that player down for 1.5 s; both down at once is
   an Oops and the attack set starts again. Then it rears up and an eye glows: the LIFTER holds the action in the lift
   circle (the stolen armchair's pull holds the eye open); the STRIKER climbs the spell steps and casts at the eye
   (round 1 Flame, 2 Door, 3 Brew). The jobs swap each round. After round 3 it shrinks to a small embarrassed puddle
   and she pops it in a jar: "It can be the school pet."
   NEVER ALONE. A held spell does nothing without a runner; a lever can't be reached without the spell; the eye only
   opens for the lifter and only the striker can reach it. The start of each gate and of each round are safe spots.
   Stats (st.stats.exam): gates, gloops, hits.   Names: wizEx* / WIZEXAM* (Sfx.extra.wizEx*). */
const WIZEXAM = {
  floor: 430, gate0: 600, gateW: 900, gates: 8,
  circle: 120, barrier: [300, 380], lever: 540, door: 720,
  blot: { start: 140, far: 700, near: 350, fast: 230, mid: 70, slow: 16, back: 650, gold: 0.4, goldT: 20 },
  attackT: 13, every: 1.5, down: 1.5,
  wave: { v: 300, h: 34, w: 46 }, bolt: { v: 330, r: 12 }, arm: { warn: 1.0, w: 96, slam: 0.4 },
  hallW: 960,
};
const WIZEXAM_GATES = [
  { spell: 'frost', kind: 'pool', say: 'FROST, dears! Freeze a bridge!' }, { spell: 'lift', kind: 'wall', say: 'LIFT, dears! Up with the slab!' },
  { spell: 'glow', kind: 'wall', say: 'GLOW! It\'s pitch dark in there!' }, { spell: 'size', kind: 'wall', say: 'SHRINK! Through the keyhole!' },
  { spell: 'morph', kind: 'pool', say: 'MORPH! A fish for the moat!' }, { spell: 'shield', kind: 'wall', say: 'SHIELD! Ink bolts!' },
  { spell: 'door', kind: 'pool', say: 'DOOR! Draw a way over!' }, { spell: 'zoom', kind: 'pool', say: 'ZOOM! Broom across!' },
];
const WIZEXAM_FIN = [{ key: 'flame', word: 'FLAME!' }, { key: 'door', word: 'DOOR!' }, { key: 'brew', word: 'BREW!' }];
const wizExGx = k => WIZEXAM.gate0 + k * WIZEXAM.gateW;
const wizExHallX = () => wizExGx(WIZEXAM.gates) + 200;

function wizExSetup(st, L) {
  const ph = st.ph, K = WIZEXAM, F = K.floor;
  ph.first = L.def.first || 0; ph.t = 0; ph.part = 1; ph.gate = 0; ph.held = false; ph.blot = K.blot.start; ph.gold = 0; ph.gulp = 0;
  ph.gates = WIZEXAM_GATES.map((g, k) => Object.assign({ x: wizExGx(k), fixed: false, said: false }, g));
  ph.mode = 'intro'; ph.modeT = 0;
  wizExSolids(ph);
  const ps = G.players;
  ps.forEach((p, i) => Object.assign(p, { x: 380 + i * 50 - p.w / 2, y: F - p.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true }));
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { gates: s.gates || 0, gloops: s.gloops || 0, hits: s.hits || 0 });
  Object.assign(st.hm, { x: 560, y: 240, s: 0.85, face: -1, pose: 'talk' });
  wizSay(st, 'The final exam! Just a little one of each spell, dears...', 3);
}
// the floor (with the ink pools), the barriers and the gate doors, rebuilt when one opens
function wizExSolids(ph) {
  const K = WIZEXAM, F = K.floor, S = ph.solids = [];
  let x = -400;
  for (const g of ph.gates) {
    const [b0, b1] = K.barrier.map(d => g.x + d);
    if (g.kind === 'pool') { S.push({ x0: x, y0: F, x1: b0, y1: F + 200, kind: 'floor' }); x = b1; g.bridge = { x0: b0, y0: F, x1: b1, y1: F + 14, kind: 'bridge', g, off: !(ph.held && ph.gate === ph.gates.indexOf(g)) && !g.fixed }; S.push(g.bridge); }
    else { g.wall = { x0: b0 + 20, y0: F - 220, x1: b1 - 20, y1: F, kind: 'wall', g, off: g.fixed || (ph.held && ph.gate === ph.gates.indexOf(g)) }; S.push(g.wall); }
    g.doorR = { x0: g.x + K.door - 14, y0: F - 260, x1: g.x + K.door + 14, y1: F, kind: 'door', off: g.fixed };
    S.push(g.doorR);
  }
  S.push({ x0: x, y0: F, x1: wizExHallX() + K.hallW + 400, y1: F + 200, kind: 'floor' });
  ph.hallSteps = [];
}
function wizExRoles(ph) {
  if (ph.part === 1) { const c = (ph.first + ph.gate) % 2; return { a: c, b: 1 - c }; }   // a: CASTER, b: RUNNER
  const l = (ph.first + ph.round) % 2; return { a: l, b: 1 - l };   // a: LIFTER, b: STRIKER
}
function wizExPlan(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, out = [null, null], R = wizExRoles(ph);
  if (ph.mode !== 'run' && ph.mode !== 'attack' && ph.mode !== 'eye') return [{ why: 'wait', x: ps[0].x + 11 }, { why: 'wait', x: ps[1].x + 11 }];
  if (ph.part === 1) {
    const g = ph.gates[ph.gate], c = ps[R.a], r = ps[R.b], rcx = r.x + r.w / 2, ccx = c.x + c.w / 2;
    if (!g) return [{ why: 'go', x: wizExHallX() + 300 }, { why: 'go', x: wizExHallX() + 400 }];
    if (g.fixed) { out[R.a] = { why: 'go', x: g.x + K.door + 90 }; out[R.b] = { why: 'go', x: g.x + K.door + 150 }; return out; }
    const onCircle = Math.abs(ccx - (g.x + K.circle)) < 34 && c.grounded;
    out[R.a] = { why: 'cast', x: g.x + K.circle, hold: onCircle && rcx > g.x + K.circle + 40 && rcx < g.x + K.lever + 30 };
    if (!onCircle) out[R.b] = { why: 'wait', x: g.x + K.barrier[0] - 60 };
    else if (rcx < g.x + K.lever - 12 || rcx > g.x + K.lever + 30) out[R.b] = { why: ph.held ? 'cross' : 'wait', x: ph.held || rcx > g.x + K.barrier[1] ? g.x + K.lever : g.x + K.barrier[0] - 50 };
    else out[R.b] = { why: 'pull', x: g.x + K.lever, tap: 'act' };
    return out;
  }
  // PART 2: dodge first, then the jobs
  for (const p of ps) {
    const cx = p.x + p.w / 2, me = { why: 'dodge', x: cx };
    let danger = false;
    for (const a of ph.attacks) {
      if (a.kind === 'wave' && a.x > cx - 40 && a.x - cx < 120 && p.grounded) { me.jump = true; danger = true; }
      if (a.kind === 'bolt' && Math.abs(a.y - (p.y + p.h / 2)) < 40 && a.x - cx < 240 && a.x > cx - 20) { me.shield = true; danger = true; }
      if (a.kind === 'arm' && a.t > 0 && Math.abs(a.x - cx) < K.arm.w / 2 + 30) { me.x = a.x + (cx < a.x ? -1 : 1) * (K.arm.w / 2 + 50); if (me.x < ph.hx + 60) me.x = a.x + K.arm.w / 2 + 50; if (me.x > ph.hx + 640) me.x = a.x - K.arm.w / 2 - 50; danger = true; }
    }
    out[p.id] = danger ? me : null;
  }
  const H0 = ph.hx;
  if (ph.mode === 'attack') {
    for (const id of [0, 1]) if (!out[id]) out[id] = { why: 'wait', x: H0 + (id === R.a ? 200 : 380) };
    return out;
  }
  const l = ps[R.a], s = ps[R.b], lOn = Math.abs(l.x + l.w / 2 - (H0 + 150)) < 34 && l.grounded;
  if (!out[R.a]) out[R.a] = { why: 'lift', x: H0 + 150, hold: lOn };
  if (!out[R.b]) {
    const steps = ph.hallSteps, scx = s.x + s.w / 2, feet = s.y + s.h;
    let k = steps.findIndex(q => s.grounded && Math.abs(feet - q.y0) < 3 && scx > q.x0 && scx < q.x1);
    const onFloor = s.grounded && Math.abs(feet - F) < 3;
    const top = steps[steps.length - 1];
    if (k === steps.length - 1) out[R.b] = { why: 'strike', x: (top.x0 + top.x1) / 2 + 30, tap: ph.eyeOpen ? 'act' : null };
    else { const nx = onFloor || k < 0 ? steps[0] : steps[k + 1], from = onFloor || k < 0 ? null : steps[k]; out[R.b] = { why: 'climb', x: from ? (nx.x0 + Math.min(from.x1, (steps[k + 2] || { x0: 1e9 }).x0)) / 2 : (nx.x0 + steps[1].x0) / 2, jumpTo: nx, from }; }
  }
  return out;
}
function wizExCam(st, dt) {
  const ph = st.ph, ps = G.players;
  if (ph.part === 2) st.cam.x += (ph.hx - st.cam.x) * Math.min(1, (dt || 0) * 3);
  else { const mid = (ps[0].x + ps[1].x) / 2 + 11, want = Math.max(mid - W / 2 + 60, ph.blot - 120); st.cam.x += (want - st.cam.x) * Math.min(1, (dt || 0) * 3); }
  st.cam.y = 0;
  const c = st.hm;
  if (ph.mode === 'intro') return;
  if (ph.part === 2) { c.x = (ph.hx || 0) + 900; c.y = 250 + Math.sin(ph.t * 2) * 10; c.s = 0.6; c.face = -1; return; }   // (inside the Blot, armchair and all)
  c.x = ph.blot - 80; c.y = 230 + Math.sin(ph.t * 2) * 12; c.face = 1; c.pose = 'sip';
}
function wizExGloop(st, word) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, g = ph.gates[ph.gate];
  if (!wizTeamOops(st, { word, x: ph.blot + 60, y: 200, kind: 'blot' })) return;
  ph.gulp = 0.8; Sfx.play('wizExGloop'); wizStats(st).gloops++;
  const gx = g ? g.x : wizExHallX();
  ph.blot = Math.min(ph.blot, gx - K.blot.back); ph.held = false;
  G.players.forEach((p, i) => Object.assign(p, { x: gx + 20 + i * 40, y: F - p.h, vx: 0, vy: 0, grounded: true, inked: 2 }));
  st.cam.x = gx - 200;
  const n = wizMiss(st, 'g' + ph.gate);
  if (n >= 2 && wizGoldOnce(st, 'tea' + ph.gate, 'A gold tea splash! The Blot slows right down for 20 s.')) ph.gold = K.blot.goldT;
  else if (n >= 4 && n % 2 === 0) ph.gold = K.blot.goldT;
}
function wizExStep(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players;
  ph.t += dt; ph.modeT += dt; ph.gold = Math.max(0, ph.gold - dt); ph.gulp = Math.max(0, ph.gulp - dt);
  for (const p of ps) if (p.inked) p.inked = Math.max(0, p.inked - dt);
  if (st.idle) { wizExCoast(st, dt); return; }
  if (ph.mode === 'intro') {
    // the demonstration goes wrong: sparks, the ink pot, the Blot rises and swallows her chair
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; wizBody(p, dt, ph.solids, { still: true }); }
    const c = st.hm;
    if (ph.modeT > 0.4 && !ph.i1) { ph.i1 = true; c.pose = 'cast'; for (const k of Object.keys(WIZ_SPELLS)) wizSparks(c.x - 60 + Math.random() * 120, c.y - 40, k, 4); Sfx.play('wizExTangle'); }
    if (ph.modeT > 1.6 && !ph.i2) { ph.i2 = true; wizSay(st, 'Oh dear. Oh DEAR. Not the ink pot!', 2.2); Sfx.play('wizExRoar'); if (!reduceMotion) G.shake = 0.4; }
    if (ph.modeT > 3.2) { ph.mode = 'run'; ph.modeT = 0; ph.blot = 60; wizNews(st, 'RUN! The Blot is loose! Each gate: one holds the spell, the other pulls the lever.'); Sfx.play('wizBell'); }
    wizExCam(st, dt); return;
  }
  if (ph.part === 1) wizExFlood(st, dt); else wizExHall(st, dt);
  wizExCam(st, dt);
  const cx = st.cam.x;
  if (ph.part === 1) for (const p of ps) { if (p.x < cx + 4) p.x = cx + 4; if (p.x > cx + W - 4 - p.w) p.x = cx + W - 4 - p.w; }
}
function wizExFlood(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, R = wizExRoles(ph), g = ph.gates[ph.gate];
  const caster = ps[R.a], runner = ps[R.b];
  // the CASTER holds the gate's spell from the circle
  const ccx = caster.x + caster.w / 2;
  const onCircle = g && Math.abs(ccx - (g.x + K.circle)) < 36 && caster.grounded;
  const holding = !!(g && !g.fixed && onCircle && caster.input.act);
  if (holding !== ph.held) { ph.held = holding; if (holding) Sfx.play('wizSpell_' + (g.spell === 'size' ? 'size' : g.spell)); }
  if (g) { if (g.bridge) g.bridge.off = !(ph.held || g.fixed); if (g.wall) g.wall.off = ph.held || g.fixed; }
  if (g && g.wall && !g.wall.off) for (const p of ps) { const r = g.wall; if (p.x + p.w > r.x0 && p.x < r.x1 && p.y + p.h > r.y0) { p.x = p.x + p.w / 2 < (r.x0 + r.x1) / 2 ? r.x0 - p.w : r.x1; } }
  caster.pendingAct = false;
  // the RUNNER pulls the lever
  if (runner.pendingAct) {
    runner.pendingAct = false;
    if (g && !g.fixed && Math.abs(runner.x + runner.w / 2 - (g.x + K.lever)) < 30 && runner.grounded) {
      g.fixed = true; ph.held = false; wizStats(st).gates++; Sfx.play('wizExLever'); Sfx.play('wizDoor');
      wizPop(st, g.x + K.lever, F - 110, 'Clunk! The gate opens!', '#ffd23f', 18); wizSparks(g.x + K.barrier[0] + 40, F - 40, g.spell, 14);
      g.doorR.off = true; if (g.bridge) g.bridge.off = false; if (g.wall) g.wall.off = true;
    }
  }
  for (const p of ps) wizBody(p, dt, ph.solids);
  // ink pools: a fall in is a Gloop for that player
  for (const p of ps) if (p.y > F + 30) {
    const gg = g || ph.gates[ph.gates.length - 1];
    if (!wizOops(st, p, { word: 'Gloop!', kind: 'ink', to: { x: gg.x + 60, y: F } })) Object.assign(p, { x: gg.x + 60 - p.w / 2, y: F - p.h, vx: 0, vy: 0 });
    wizStats(st).gloops++; Sfx.play('wizExGloop');
    const n = wizMiss(st, 'g' + ph.gate);
    if (n >= 2 && wizGoldOnce(st, 'tea' + ph.gate, 'A gold tea splash! The Blot slows right down for 20 s.')) ph.gold = K.blot.goldT;
  }
  // the gate announced when someone nears it; the next gate once both are through the door
  if (g && !g.said && Math.max(ps[0].x, ps[1].x) > g.x - 200) { g.said = true; wizNews(st, g.say, false, 2.6); Sfx.play('wizSpell_' + g.spell); wizHint(st, R.a, 'Stand in the circle and HOLD ' + wizKey(R.a, 'act'), { cpu: 'I\'ll hold the spell!' }); wizHint(st, R.b, 'Get across and pull the lever: ' + wizKey(R.b, 'act'), { cpu: 'I\'ll get the lever!' }); }
  if (g && g.fixed && ps.every(p => p.x > g.x + K.door + 20)) {
    ph.gate++; ph.held = false;
    if (ph.gate >= K.gates) { ph.part = 2; ph.mode = 'hallIn'; ph.modeT = 0; wizNews(st, 'Into the Great Hall!', false, 2); }
    else { wizSwap(st); }
  }
  // the Blot: hurries when far behind, eases when close
  const rear = Math.min(ps[0].x, ps[1].x), gap = rear - ph.blot, B = K.blot;
  let v = gap > B.far ? B.fast : gap > B.near ? B.mid : B.slow;
  if (ph.gold > 0) v *= B.gold;
  ph.blot += v * dt;
  if (ph.gulp <= 0 && ps.some(p => p.x < ph.blot + 10)) wizExGloop(st, 'GLOOP!');
  if (ph.part === 2) wizExHallSetup(st);
  wizExHints(st);
}
function wizExHints(st) {
  const ph = st.ph, P = wizExPlan(st), R = wizExRoles(ph);
  if (ph.part !== 1 || !ph.gates[ph.gate]) return;
  if (!st.hints[R.a] && P[R.a] && P[R.a].hold === false && P[R.a].why === 'cast' && P[R.b] && P[R.b].why === 'wait') wizHint(st, R.a, 'Into the circle! Hold ' + wizKey(R.a, 'act'), { cpu: 'Holding the spell!', life: 1.4 });
  if (!st.hints[R.b] && P[R.b] && P[R.b].tap === 'act') wizHint(st, R.b, 'Pull! ' + wizKey(R.b, 'act'), { cpu: 'Pulling!', life: 1.2 });
}
/* ----- PART 2: the Great Hall ----- */
function wizExHallSetup(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, H0 = ph.hx = wizExHallX();
  ph.round = 0; ph.attacks = []; ph.atkT = 0; ph.spawnT = 0.8; ph.down = [0, 0]; ph.eyeOpen = false; ph.rear = 0; ph.jarT = 0;
  ph.solids.push({ x0: H0 - 30, y0: F - 400, x1: H0, y1: F, kind: 'hallwall' }, { x0: H0 + 700, y0: F - 600, x1: H0 + 1000, y1: F, kind: 'blot' });
  ph.hallSteps = [{ x0: H0 + 290, y0: F - 90, x1: H0 + 480, y1: F - 76, one: true, off: true }, { x0: H0 + 380, y0: F - 176, x1: H0 + 600, y1: F - 162, one: true, off: true }, { x0: H0 + 480, y0: F - 262, x1: H0 + 690, y1: F - 248, one: true, off: true }];   // (they overlap: jump straight up through the one above)
  ph.solids.push(...ph.hallSteps);
  ph.eye = { x: H0 + 730, y: F - 320 };
}
function wizExHit(st, p, word) {
  const ph = st.ph, K = WIZEXAM;
  if (ph.down[p.id] > 0 || st.safe[p.id] > 0) return;
  ph.down[p.id] = K.down; wizStats(st).hits++;
  knock(p, (p.x + p.w / 2 < ph.hx + 700 ? -1 : 1) * 200, -300, K.down, 0);
  wizPop(st, p.x + p.w / 2, p.y - 20, word, '#c8b8ff', 18); Sfx.play('wizExSplat');
  if (ph.down[0] > 0 && ph.down[1] > 0) {
    if (wizTeamOops(st, { word: 'Both down! Again!', x: ph.hx + 380, y: 200, kind: 'blot' })) {
      ph.attacks = []; ph.atkT = 0; ph.spawnT = 1.2; ph.mode = 'attack'; ph.modeT = 0; ph.eyeOpen = false; for (const q of ph.hallSteps) q.off = true;
      const n = wizMiss(st, 'h' + ph.round);
      if (n >= WIZ.goldAfter && wizGoldOnce(st, 'hall' + ph.round, 'Gold tea! The attacks come slower this round.')) ph.slow = ph.round + 1;
    }
  }
}
function wizExHall(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, R = wizExRoles(ph), H0 = ph.hx;
  if (ph.mode === 'hallIn') {
    for (const p of ps) wizBody(p, dt, ph.solids, { still: true });
    if (ph.modeT > 1.2) {
      ps.forEach((p, i) => Object.assign(p, { x: H0 + 160 + i * 60, y: F - p.h, vx: 0, vy: 0, face: 1 })); st.cam.x = H0;
      ph.mode = 'attack'; ph.modeT = 0; ph.atkT = 0; Sfx.play('wizExRoar');
      wizNews(st, 'The Great Hall! Jump the waves, shield the bolts (hold ' + 'the action), step out of the rings!', false, 3.4);
      wizSay(st, 'Help! I\'m in its tummy! Mind the ink!', 2.4);
    }
    ph.blot = H0 - 600;
    return;
  }
  for (const k of [0, 1]) ph.down[k] = Math.max(0, ph.down[k] - dt);
  ph.rear = Math.max(0, ph.rear - dt);
  // jobs: shields (any player holding the action in an attack), the lift (eye phase)
  for (const p of ps) { p.shield = ph.mode === 'attack' && !!p.input.act && ph.down[p.id] <= 0; }
  const l = ps[R.a], s = ps[R.b];
  const lOn = Math.abs(l.x + l.w / 2 - (H0 + 150)) < 36 && l.grounded;
  ph.eyeOpen = ph.mode === 'eye' && lOn && !!l.input.act;
  if (s.pendingAct && ph.mode === 'eye') {
    const top = ph.hallSteps[2], feet = s.y + s.h;
    if (s.grounded && Math.abs(feet - top.y0) < 4) {
      if (ph.eyeOpen) wizExStrike(st, s);
      else wizPop(st, ph.eye.x, ph.eye.y - 40, 'It\'s shut! Hold the Lift!', '#ffffff', 15);
    }
  }
  for (const p of ps) p.pendingAct = false;
  for (const p of ps) wizBody(p, dt, ph.solids);
  for (const p of ps) { if (p.x < H0 + 2) p.x = H0 + 2; if (p.x > H0 + 690 - p.w) p.x = H0 + 690 - p.w; }
  if (ph.mode === 'attack') {
    ph.atkT += dt; ph.spawnT -= dt;
    if (ph.spawnT <= 0 && ph.atkT < K.attackT - 1) { ph.spawnT = K.every * (ph.slow === ph.round + 1 ? 1.6 : 1) * (1.1 - ph.round * 0.1); wizExSpawn(st); }
    if (ph.atkT >= K.attackT && !ph.attacks.length) {
      ph.mode = 'eye'; ph.modeT = 0; Sfx.play('wizExRoar'); for (const q of ph.hallSteps) q.off = false;
      wizNews(st, 'It rears up! An eye glows!', false, 2.2);
      wizHint(st, R.a, 'Stand in the lift circle and HOLD ' + wizKey(R.a, 'act') + ' to hold the eye open', { cpu: 'I\'ll hold it open!' });
      wizHint(st, R.b, 'Climb the steps and cast at the eye: ' + wizKey(R.b, 'act'), { cpu: 'Up I go!' });
    }
  } else if (ph.mode === 'shrink') {
    ph.jarT += dt;
    if (ph.jarT > 1.0 && !ph.j1) { ph.j1 = true; wizSay(st, 'Well! You\'re just a little puddle, aren\'t you.', 2.4); Sfx.play('wizExPop'); }
    if (ph.jarT > 3.4 && !ph.j2) { ph.j2 = true; ph.mode = 'done'; wizPhaseDone(st, { say: 'Into the jar. It can be the school pet. You PASSED!' }); }
  }
  // the attacks
  for (const a of ph.attacks) {
    a.t -= dt;
    if (a.kind === 'wave') { a.x -= K.wave.v * dt; for (const p of ps) if (p.grounded && Math.abs(p.x + p.w / 2 - a.x) < K.wave.w / 2 + 8 && p.y + p.h > F - K.wave.h) wizExHit(st, p, 'Splosh!'); if (a.x < H0 - 40) a.dead = true; }
    else if (a.kind === 'bolt') {
      a.x += a.vx * dt;
      for (const p of ps) if (Math.abs(p.x + p.w / 2 - a.x) < 14 + K.bolt.r && Math.abs(p.y + p.h / 2 - a.y) < 18 + K.bolt.r) { if (p.shield) { a.vx = Math.abs(a.vx); a.back = true; Sfx.play('wizExBounce'); wizPop(st, a.x, a.y - 20, 'Bounce!', '#9ad0ff', 14); } else if (!a.back) { wizExHit(st, p, 'Splat!'); a.dead = true; } }
      if (a.x < H0 - 30 || a.x > H0 + 700) a.dead = true;
    } else if (a.kind === 'arm') {
      if (a.t <= 0 && !a.slammed) { a.slammed = true; Sfx.play('wizExSlam'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.12); for (const p of ps) if (Math.abs(p.x + p.w / 2 - a.x) < K.arm.w / 2 + 6 && p.y + p.h > F - 70) wizExHit(st, p, 'Grabbed!'); }
      if (a.t < -K.arm.slam) a.dead = true;
    }
  }
  ph.attacks = ph.attacks.filter(a => !a.dead);
  wizExHallHints(st);
}
function wizExSpawn(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, H0 = ph.hx;
  const n = (ph.spawnN = (ph.spawnN || 0) + 1), kind = ['wave', 'bolt', 'arm'][(n + ph.round) % 3];
  const tgt = ps[n % 2];
  if (kind === 'wave') ph.attacks.push({ kind, x: H0 + 690, t: 9 });
  else if (kind === 'bolt') { const y = tgt.y + tgt.h / 2; ph.attacks.push({ kind, x: H0 + 690, y: clamp(y, F - 200, F - 13), vx: -K.bolt.v, t: 9 }); Sfx.play('wizExSpit'); }
  else ph.attacks.push({ kind, x: clamp(tgt.x + tgt.w / 2, H0 + 60, H0 + 640), t: K.arm.warn });
}
function wizExStrike(st, s) {
  const ph = st.ph, f = WIZEXAM_FIN[ph.round];
  wizSparks(ph.eye.x, ph.eye.y, f.key, 24); Sfx.play('wizSpell_' + f.key); Sfx.play('wizExRoar');
  wizPop(st, ph.eye.x, ph.eye.y - 50, f.word, '#ffd23f', 26); if (!reduceMotion) G.shake = 0.3;
  ph.round++; ph.attacks = []; ph.eyeOpen = false; for (const q of ph.hallSteps) q.off = true;
  if (ph.round >= 3) { ph.mode = 'shrink'; ph.jarT = 0; wizNews(st, 'The Blot shrinks!', false, 2); return; }
  ph.mode = 'attack'; ph.modeT = 0; ph.atkT = 0; ph.spawnT = 1.2; wizSwap(st);
  wizNews(st, 'Round ' + (ph.round + 1) + ' of 3! It\'s angrier now.', false, 2.4);
}
function wizExHallHints(st) {
  const ph = st.ph, P = wizExPlan(st);
  for (const id of [0, 1]) {
    if (st.hints[id] || !P[id]) continue;
    if (P[id].jump) wizHint(st, id, 'Jump the wave! ' + wizKey(id, 'up'), { cpu: 'Hop!', life: 1 });
    else if (P[id].shield) wizHint(st, id, 'Shield! Hold ' + wizKey(id, 'act'), { cpu: 'Shield up!', life: 1 });
  }
}
function wizExCoast(st, dt) {
  const ph = st.ph;
  if (!ph.solids) { wizCoast(dt); return; }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; wizBody(p, dt || 0, ph.solids, { still: true }); }
  wizExCam(st, dt || 0);
}

/* ---------- drawing ---------- */
const WIZEXAM_C = { ink: '#14121e', inkHi: '#3a3650', inkSh: '#5a5478', wall: '#4a4060', wallDk: '#2e2840', floor: '#6a5a48' };
function wizExDrawBlobEdge(x, t, h) {
  // the flood's front: a wall of ink with drips and two white eyes
  const C2 = WIZEXAM_C;
  ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(x - 1400, -20); ctx.lineTo(x, -20);
  for (let y = 0; y <= h + 30; y += 30) ctx.lineTo(x + Math.sin(t * 3 + y * 0.05) * 24 + (y > h - 60 ? 40 : 0), y);
  ctx.lineTo(x - 1400, h + 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C2.inkHi; for (let k = 0; k < 6; k++) { circle(x - 40 + Math.sin(t * 2 + k) * 10, 60 + k * 64, 10); ctx.fill(); }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - 70, 170, 26, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 150, 160, 22, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C2.ink; circle(x - 62, 178, 10); ctx.fill(); circle(x - 144, 168, 9); ctx.fill();
  ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.ellipse(x - 100, 300, 50, 26 + Math.sin(t * 5) * 8, 0, 0, Math.PI * 2); ctx.fill();
}
function wizExDrawBack(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, C2 = WIZEXAM_C, cx = st.cam.x, t = G.clock;
  wizScreen(st, () => { const g = ctx.createLinearGradient(0, 0, 0, F); g.addColorStop(0, '#2a2240'); g.addColorStop(1, '#4a3a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
  // the school's corridor wall: windows and portraits, ink dripping from the ceiling
  ctx.fillStyle = C2.wall; ctx.fillRect(cx - 40, 40, W + 80, F - 40);
  for (let x = Math.floor((cx - 40) / 240) * 240; x < cx + W + 240; x += 240) {
    ctx.fillStyle = '#1a2a4a'; rr(x + 60, 110, 70, 120, 34); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; circle(x + 95, 140, 6); ctx.fill();
    ctx.fillStyle = C2.ink; const d = (t * 40 + x) % 120; rr(x + 180, 40, 10, 20 + d * 0.3, 5); ctx.fill(); circle(x + 185, 60 + d * 1.2, 5); ctx.fill();
  }
  ctx.fillStyle = C2.wallDk; ctx.fillRect(cx - 40, 0, W + 80, 44);
  // the floor
  for (const r of ph.solids) if (r.kind === 'floor' && r.x1 > cx - 40 && r.x0 < cx + W + 40) { ctx.fillStyle = C2.floor; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, H - r.y0); ctx.fillStyle = '#8a7458'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 6); }
  // the Great Hall
  if (ph.part === 2 || cx + W > wizExHallX() - 100) {
    const H0 = wizExHallX();
    ctx.fillStyle = '#3a2a4a'; ctx.fillRect(H0 - 30, 0, K.hallW + 400, F);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = '#2a3a6a'; rr(H0 + 60 + k * 160, 70, 80, 160, 40); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = '#c8a040'; ctx.fillRect(H0 - 30, F - 400, 30, 400);
  }
}
function wizExDraw(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, cx = st.cam.x, t = G.clock;
  ctx.lineJoin = 'round';
  if (ph.part === 1) for (const g of ph.gates) {
    if (g.x + 800 < cx || g.x > cx + W + 100) continue;
    const sp = WIZ_SPELLS[g.spell] || WIZ_SPELLS.zoom, [b0, b1] = K.barrier.map(d => g.x + d), active = ph.gates[ph.gate] === g;
    // the circle
    ctx.save(); ctx.strokeStyle = sp.col; ctx.lineWidth = 4; ctx.globalAlpha = g.fixed ? 0.3 : 0.6 + 0.4 * Math.sin(t * 5); ctx.beginPath(); ctx.ellipse(g.x + K.circle, F - 2, 34, 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // the obstacle
    if (g.kind === 'pool') {
      ctx.fillStyle = WIZEXAM_C.ink; ctx.fillRect(b0, F + 6, b1 - b0, H - F); ctx.fillStyle = WIZEXAM_C.inkSh; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(b0 + 14 + k * 24 + Math.sin(t * 2 + k) * 4, F + 14, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      if (!g.bridge.off) { ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(b0, F, b1 - b0, 14); ctx.strokeRect(b0, F, b1 - b0, 14); }
    } else {
      const r = g.wall, open = r.off, h = open ? 24 : 220;
      ctx.fillStyle = g.spell === 'glow' ? '#0a0814' : WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.fillRect(r.x0, F - h, r.x1 - r.x0, h); ctx.strokeRect(r.x0, F - h, r.x1 - r.x0, h);
      if (!open && g.spell === 'size') { ctx.fillStyle = '#1a1a1a'; circle((r.x0 + r.x1) / 2, F - 60, 8); ctx.fill(); ctx.fillRect((r.x0 + r.x1) / 2 - 4, F - 60, 8, 20); }
      if (!open && g.spell === 'shield') { ctx.fillStyle = WIZEXAM_C.ink; for (let k = 0; k < 3; k++) { circle((r.x0 + r.x1) / 2, F - 180 + ((t * 120 + k * 60) % 180), 7); ctx.fill(); } }
      if (open && active) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = sp.col; ctx.fillRect(r.x0 - 10, F - 230, r.x1 - r.x0 + 20, 230); ctx.restore(); }
    }
    // the lever and the gate door
    const lv = g.x + K.lever; ctx.fillStyle = WIZC.woodDk; ctx.fillRect(lv - 6, F - 40, 12, 40); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lv, F - 36); ctx.lineTo(lv + (g.fixed ? 22 : -22), F - 70); ctx.stroke(); ctx.fillStyle = '#ff5f6d'; circle(lv + (g.fixed ? 22 : -22), F - 70, 7); ctx.fill();
    const d = g.doorR; if (!g.fixed) { ctx.fillStyle = WIZC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); }
    else { ctx.fillStyle = WIZC.woodDk; ctx.fillRect(d.x0 - 30, d.y0, 12, d.y1 - d.y0); }
    // the gate's sign: its spell star
    ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(g.x + K.door, F - 290, 18); ctx.fill(); ctx.stroke(); text(sp.name, g.x + K.door, F - 316, 14, '#ffffff', 'center');
  }
  if (ph.part === 2) wizExDrawHall(st);
}
function wizExDrawHall(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, t = G.clock, H0 = ph.hx, C2 = WIZEXAM_C;
  const shrink = ph.mode === 'shrink' || ph.mode === 'done' ? clamp((ph.jarT || 0) / 1.2, 0, 1) : 0;
  // the Blot: a huge glossy mound filling the right wall (shrinking at the end)
  if (shrink < 1) {
    ctx.save(); ctx.translate(H0 + 840, F); ctx.scale(1 - shrink * 0.9, 1 - shrink * 0.9);
    const rear = ph.mode === 'eye' ? -60 : 0;
    ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(-200, 0); ctx.quadraticCurveTo(-220, -300 + rear, -60, -420 + rear); ctx.quadraticCurveTo(80, -480 + rear, 200, -380); ctx.lineTo(200, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C2.inkHi; circle(-90, -330 + rear, 26); ctx.fill(); circle(-150, -180, 18); ctx.fill();
    // eyes (the round's one glowing when it rears)
    const eyeOpen = ph.mode !== 'eye' || ph.eyeOpen ? 1 : 0.25;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-110, -320 + rear, 30, 38 * eyeOpen, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-10, -340 + rear, 26, 34, 0, 0, Math.PI * 2); ctx.fill();
    if (ph.mode === 'eye') { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(-110, -320 + rear, 44, 50, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = C2.ink; circle(-104, -316 + rear, 12 * eyeOpen); ctx.fill(); circle(-4, -334 + rear, 10); ctx.fill();
    ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.ellipse(-70, -180, 70, 30 + Math.sin(t * 4) * 10, 0, 0, Math.PI * 2); ctx.fill();
    // her armchair inside, floating, with the teacup
    ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = WIZC.chair; rr(40, -260 + Math.sin(t * 2) * 8, 60, 60, 10); ctx.fill(); ctx.restore();
    ctx.restore();
  } else {
    // the little puddle in a jar
    ctx.fillStyle = 'rgba(200,230,255,0.45)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(H0 + 600, F - 70, 60, 70, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.ellipse(H0 + 630, F - 12, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(H0 + 622, F - 18, 5); ctx.fill(); circle(H0 + 638, F - 18, 5); ctx.fill();
  }
  // the lift circle, the steps
  if (ph.mode === 'eye') { ctx.save(); ctx.strokeStyle = WIZ_SPELLS.lift.col; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); ctx.beginPath(); ctx.ellipse(H0 + 150, F - 2, 34, 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  for (const q of ph.hallSteps) if (!q.off) { const f = WIZEXAM_FIN[Math.min(2, ph.round)], sp = WIZ_SPELLS[f.key]; ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(q.x0, q.y0, q.x1 - q.x0, 14, 5); ctx.fill(); ctx.stroke(); }
  if (ph.mode === 'eye' && ph.eyeOpen) { ctx.strokeStyle = WIZ_SPELLS.lift.col; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(H0 + 150, F - 30); ctx.quadraticCurveTo(H0 + 400, F - 420, ph.eye.x - 10, ph.eye.y); ctx.stroke(); ctx.setLineDash([]); }
  // attacks
  for (const a of ph.attacks) {
    if (a.kind === 'wave') { ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(a.x - K.wave.w / 2, F); ctx.quadraticCurveTo(a.x - 10, F - K.wave.h - 10, a.x + K.wave.w / 2, F - 6); ctx.lineTo(a.x + K.wave.w / 2 + 30, F); ctx.closePath(); ctx.fill(); ctx.fillStyle = C2.inkSh; circle(a.x - 6, F - K.wave.h + 4, 5); ctx.fill(); }
    else if (a.kind === 'bolt') { ctx.fillStyle = a.back ? '#7ac0ff' : C2.ink; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(a.x, a.y, K.bolt.r); ctx.fill(); ctx.stroke(); }
    else if (a.kind === 'arm') {
      if (!a.slammed) { ctx.save(); ctx.strokeStyle = '#ff5f6d'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 18); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, F - 2, K.arm.w / 2, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      else { ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(H0 + 700, 120); ctx.quadraticCurveTo(a.x + 60, 60, a.x + 20, F - 60); ctx.lineTo(a.x - K.arm.w / 2, F); ctx.lineTo(a.x + K.arm.w / 2, F); ctx.lineTo(a.x + 40, F - 50); ctx.quadraticCurveTo(a.x + 90, 90, H0 + 700, 160); ctx.closePath(); ctx.fill(); }
    }
  }
}
function wizExDrawTop(st) {
  const ph = st.ph, K = WIZEXAM, t = G.clock;
  for (const p of G.players) {   // (players are in screen coords here: + the camera)
    const px = p.x + st.cam.x + p.w / 2, py = p.y + st.cam.y;
    if (p.shield) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = WIZ_SPELLS.shield.col; circle(px, py + p.h / 2, 26); ctx.fill(); ctx.restore(); }
    if (p.inked > 0) { ctx.fillStyle = 'rgba(20,18,30,0.6)'; circle(px - 4, py + 6, 5); ctx.fill(); circle(px + 6, py + 14, 4); ctx.fill(); }
    if (ph.part === 2 && ph.down && ph.down[p.id] > 0) text('zZ', px, py - 20 - Math.sin(t * 4) * 3, 14, '#c8b8ff', 'center');
  }
  if (ph.part === 1 && ph.mode !== 'intro') {
    wizExDrawBlobEdge(ph.blot, t, K.floor);
    if (ph.gulp > 0) { ctx.fillStyle = 'rgba(20,18,30,' + ph.gulp + ')'; ctx.fillRect(st.cam.x, 0, W, H); }
  } else if (ph.mode === 'intro') {
    const k = clamp((ph.modeT - 1.4) / 1.6, 0, 1);
    if (k > 0) { ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.ellipse(st.hm.x, K.floor, 80 + k * 200, k * 260, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(st.hm.x - 40, K.floor - k * 200, 14 * k); ctx.fill(); circle(st.hm.x + 30, K.floor - k * 210, 12 * k); ctx.fill(); }
  }
}
function wizExHud(st) {
  const ph = st.ph, K = WIZEXAM, big = wizBig(), z = big ? 1.3 : 1;
  if (ph.part === 1 && ph.mode === 'run') {
    // the gap meter: how close the Blot is to the rear wizard
    const ps = G.players, gap = Math.min(ps[0].x, ps[1].x) + st.cam.x - ph.blot, k = clamp(gap / 900, 0, 1);
    const x = 24, y = H - 46;
    ctx.fillStyle = 'rgba(30,20,66,0.8)'; rr(x - 4, y - 4, 168 * z, 20 * z, 8); ctx.fill();
    ctx.fillStyle = k < 0.3 ? '#ff5f6d' : k < 0.6 ? '#ffd23f' : '#9fe07f'; rr(x, y, 160 * z * k, 12 * z, 5); ctx.fill();
    text('The Blot', x + 2, y - 8, 12 * z, '#ffffff', 'left', 'body');
    if (ph.gold > 0) text('Gold tea ' + Math.ceil(ph.gold) + 's', W / 2, H - 22, 14 * z, C.gold, 'center', 'body');
  }
}

WIZ_PHASES.exam = {
  setup(st, L) { wizExSetup(st, L); },
  step(st, dt) { wizExStep(st, dt); },
  coast(st, dt) { wizExCoast(st, dt); },
  plan(st) { return wizExPlan(st); },
  labels(st) { const ph = st.ph, R = wizExRoles(ph); return [0, 1].map(id => (ph.part === 1 ? (id === R.a ? 'cast' : 'pull') : ph.mode === 'eye' ? (id === R.a ? 'lift' : 'cast') : 'shield')); },
  roles(st) { const ph = st.ph, R = wizExRoles(ph); return [0, 1].map(id => (ph.part === 1 ? (id === R.a ? 'Hold!' : 'Lever!') : ph.mode === 'eye' ? (id === R.a ? 'Lift!' : 'Strike!') : 'Dodge!')); },
  legend(st) { const ph = st.ph; return ph.part === 1 ? { pip: 'hold the spell / pull the lever', bo: 'hold the spell / pull the lever', pad: 'action holds the spell or pulls,' } : { pip: 'dodge, shield, lift, strike', bo: 'dodge, shield, lift, strike', pad: 'action shields, lifts or strikes,' }; },
  hudText(st) { const ph = st.ph; return ph.part === 1 ? 'Gate ' + Math.min(8, ph.gate + 1) + ' of 8' : 'Round ' + Math.min(3, (ph.round || 0) + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return ph.part === 1 ? { n: ph.gate, of: 11 } : { n: 8 + (ph.round || 0), of: 11 }; },
  drawBack(st) { wizExDrawBack(st); },
  draw(st) { wizExDraw(st); },
  drawTop(st) { wizExDrawTop(st); },
  hud(st) { wizExHud(st); },
  statLine(st) { const s = st.stats.exam; return s && s.gates ? 'Exam: ' + s.gates + ' gates, ' + (s.hits || 0) + ' ink splats' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizExTangle = function () { [880, 660, 990, 520, 1175].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, f * 0.6, i * 0.06)); };
Sfx.extra.wizExRoar = function () { this.tone(70, 0.8, 'sawtooth', 0.06, 45); this.tone(110, 0.6, 'square', 0.03, 60, 0.1); };
Sfx.extra.wizExGloop = function () { this.tone(200, 0.3, 'sine', 0.06, 60); this.tone(90, 0.3, 'sawtooth', 0.03, 50, 0.1); };
Sfx.extra.wizExLever = function () { this.tone(300, 0.08, 'square', 0.04, 200); };
Sfx.extra.wizExSplat = function () { this.tone(160, 0.15, 'sawtooth', 0.04, 80); };
Sfx.extra.wizExBounce = function () { this.tone(800, 0.1, 'sine', 0.035, 1300); };
Sfx.extra.wizExSlam = function () { this.tone(60, 0.25, 'square', 0.06, 40); };
Sfx.extra.wizExSpit = function () { this.tone(400, 0.08, 'sawtooth', 0.025, 200); };
Sfx.extra.wizExPop = function () { this.tone(600, 0.06, 'sine', 0.04, 1200); };

/* ---------- the room ---------- */
wizRoom('exam', {
  act: { label: 'cast', labels: ['cast', 'pull'] },
  tip: 'The Blot is loose! At each gate one holds the spell in the circle, the other gets across and pulls the lever.',
  legend: { pip: 'hold the spell / pull the lever', bo: 'hold the spell / pull the lever', pad: 'action holds the spell or pulls,' },
  map: WIZ_EMPTY_MAP,
});

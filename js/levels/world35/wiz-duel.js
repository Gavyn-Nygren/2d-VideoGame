/* Pip & Bo - Level 35-1 Moonwick Academy: class 12 'duel' (Graduation Duel, versus inside the team level). */
'use strict';

/* ===== 35-1 class 12: Graduation Duel (WIZ_PHASES.duel) ==========================================================
   The moonlit courtyard. A friendly duel for Top of the Class: like 30-1's race home, a versus section inside the team
   level whose result is a line on the results card, not a pass or fail (the level completes whoever wins).
   FORMAT. Best of 3 rounds (WIZDUEL.roundT s each). Pip on the left side, Bo on the right, a low wall and the fountain
   between them; each side has two floating stepping stones (three heights). 5 hat stars each per round; losing all 5
   loses the round. Time up: more stars wins; a tie goes to sudden death ("next hit wins").
   CONTROLS (the same for both). Left / right walk on your own side, up jumps (through a stone from below; walk off its end to
   get down), DOWN (held) holds a SHIELD bubble (drains in 2.5 s, refills in 3 s; a spark that hits it in its first 0.25 s bounces back).
   The action: tapped, a SPARK straight across at your height (0.45 s rest; the low wall stops floor-level sparks);
   held WIZDUEL.big.hold s and let go, a BIG BOLT that arcs over the wall at the rival (it breaks a shield).
   TOKENS: every 10 s each side gets a spell token at a random height; walking into it loads a one-shot trick fired
   with the next action press (shown over the head): FROST (the rival's side is icy for 4 s), SHRINK (the rival is
   tiny for 4 s: harder to hit, their sparks fizzle), MORPH (the rival is a frog for 3 s: only hops, no casting), DOOR
   (your spark comes out of a door behind the rival).
   ROUNDS: 1 the Courtyard; 2 the Fountain (it rises and falls and blocks the middle height on a rhythm); 3 Moonlight
   (the stones drift, and the thunderpuff wanders through sneezing a bolt across the top height, warned first). Hits
   are sparkles and a spinning hat. GOLD HELP: whoever lost round 1 starts round 2 with a gold star (one extra).
   Stats (st.stats.duel): wins [pip, bo], champ (the winner's id), hits [pip, bo].   Names: wizDu* / WIZDUEL*. */
const WIZDUEL = {
  floor: 430, mid: 480, wallH: 60, wallW: 100, sideL: [60, 430], sideR: [530, 900],
  stones: [{ side: 0, x0: 100, x1: 260, h: 88 }, { side: 0, x0: 220, x1: 380, h: 176 }, { side: 1, x0: 700, x1: 860, h: 88 }, { side: 1, x0: 580, x1: 740, h: 176 }],
  roundT: 60, sdT: 15, stars: 5, wins: 2,
  spark: { v: 620, rest: 0.45, r: 9 }, big: { hold: 0.7, g: 900, vy: -560, r: 14, t: 1.15 },
  shield: { drain: 2.5, fill: 3, bounce: 0.25, r: 24 },
  token: { every: 10, life: 9 }, trick: { frost: 4, shrink: 4, morph: 3 },
  fountain: { on: 2.2, off: 2.2, y0: 300, y1: 372 }, drift: { amp: 16, period: 4 }, sneeze: { every: 7, warn: 1.1, y: 430 - 200 },
  invuln: 0.7,
};
const WIZDUEL_TRICKS = ['frost', 'size', 'morph', 'door'];
const WIZDUEL_ROUNDS = ['The Courtyard', 'The Fountain', 'Moonlight'];

function wizDuSetup(st, L) {
  const ph = st.ph;
  ph.round = 0; ph.wins = [0, 0]; ph.mode = 'ready'; ph.modeT = 0; ph.t = 0; ph.champ = -1; ph.extra = [0, 0];
  const s = wizStats(st); Object.assign(s, { wins: [0, 0], hits: [0, 0] }); delete s.champ;
  Object.assign(st.hm, { x: 480, y: 120, s: 0.7, face: 1, pose: 'talk' });
  st.cam = { x: 0, y: 0 };
  wizDuRound(st);
  wizSay(st, 'Graduation! A friendly duel for Top of the Class. Best of three!', 3);
}
function wizDuRound(st) {
  const ph = st.ph, K = WIZDUEL, F = K.floor;
  ph.time = K.roundT; ph.sd = false; ph.bolts = []; ph.tokens = []; ph.tokT = [3, 3]; ph.sneezeT = K.sneeze.every; ph.sneeze = null; ph.mode = 'ready'; ph.modeT = 0; ph.winner = -1;
  ph.stars = [K.stars + ph.extra[0], K.stars + ph.extra[1]];
  ph.solids = [{ x0: 0, y0: F, x1: W, y1: F + 200, kind: 'floor' }, { x0: K.mid - K.wallW / 2, y0: F - K.wallH, x1: K.mid + K.wallW / 2, y1: F, kind: 'wall' }];
  ph.stones = K.stones.map(s => ({ x0: s.x0, x1: s.x1, y0: F - s.h, y1: F - s.h + 14, base: F - s.h, one: true, side: s.side, dy: 0, kind: 'stone' }));
  ph.solids.push(...ph.stones);
  ph.p = [0, 1].map(() => ({ shield: 0, bar: 1, up: 0, rest: 0, hold: 0, trick: null, icy: 0, tiny: 0, frog: 0, hit: 0, spin: 0 }));
  G.players.forEach((p, i) => Object.assign(p, { x: (i ? 800 : 160) - p.w / 2, y: F - p.h, vx: 0, vy: 0, grounded: true, face: i ? -1 : 1, alive: true, stun: 0 }));
  wizNews(st, 'Round ' + (ph.round + 1) + ': ' + WIZDUEL_ROUNDS[Math.min(2, ph.round)] + '!', false, 2.2);
}
const wizDuSide = p => (p.id === 0 ? WIZDUEL.sideL : WIZDUEL.sideR);
// a player's level: 0 the floor, 1 the low stone, 2 the high stone (by the feet)
function wizDuLevel(st, p) { const g = p.ground; if (!p.grounded || !g) return -1; if (g.kind !== 'stone') return 0; return g.base < WIZDUEL.floor - 120 ? 2 : 1; }
// the bolt hit box of a player (tiny: half size)
function wizDuBox(st, p) { const q = st.ph.p[p.id], k = q.tiny > 0 ? 0.5 : 1, cx = p.x + p.w / 2, by = p.y + p.h; return { x0: cx - p.w * k / 2, x1: cx + p.w * k / 2, y0: by - p.h * k, y1: by }; }
function wizDuFire(st, p, big) {
  const ph = st.ph, K = WIZDUEL, q = ph.p[p.id], o = G.players[1 - p.id], dir = p.id === 0 ? 1 : -1, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (q.trick) {
    const tr = q.trick, oq = ph.p[o.id]; q.trick = null; Sfx.play('wizSpell_' + (tr === 'size' ? 'size' : tr));
    wizSparks(cx, cy - 20, tr === 'size' ? 'size' : tr, 12);
    if (tr === 'frost') { oq.icy = K.trick.frost; wizPop(st, o.x + o.w / 2, o.y - 30, 'Icy!', '#bfe8ff', 18); }
    else if (tr === 'size') { oq.tiny = K.trick.shrink; wizPop(st, o.x + o.w / 2, o.y - 30, 'Tiny!', '#ffd0f0', 18); }
    else if (tr === 'morph') { oq.frog = K.trick.morph; wizPop(st, o.x + o.w / 2, o.y - 30, 'Ribbit!', '#9fe07f', 18); }
    else if (tr === 'door') { const sx = o.id === 0 ? K.sideL[0] + 4 : K.sideR[1] - 4; ph.bolts.push({ kind: 'spark', x: sx, y: o.y + o.h / 2, vx: (o.id === 0 ? 1 : -1) * K.spark.v, from: p.id, door: 0.5 }); wizPop(st, sx, o.y - 20, 'Door!', '#c8b8ff', 16); }
    q.rest = K.spark.rest; return;
  }
  if (q.frog > 0) return;
  if (big) {
    const tx = o.x + o.w / 2, vx = clamp((tx - cx) / K.big.t, -560, 560);
    ph.bolts.push({ kind: 'big', x: cx, y: cy - 6, vx: Math.abs(vx) < 160 ? dir * 160 : vx, vy: K.big.vy, from: p.id }); Sfx.play('wizDuBig');
  } else { ph.bolts.push({ kind: 'spark', x: cx + dir * 14, y: cy, vx: dir * K.spark.v, from: p.id, fizz: q.tiny > 0 }); Sfx.play('wizDuSpark'); }
  q.rest = K.spark.rest; p.face = dir;
}
function wizDuHit(st, id, word) {
  const ph = st.ph, K = WIZDUEL, q = ph.p[id], p = G.players[id];
  if (q.hit > 0 || ph.mode !== 'fight') return;
  q.hit = K.invuln; q.spin = 0.6; ph.stars[id] = Math.max(0, ph.stars[id] - 1); wizStats(st).hits[1 - id]++;
  wizPop(st, p.x + p.w / 2, p.y - 30, word || 'Zap!', '#ffe14a', 18); burst(p.x + p.w / 2, p.y + 6, '#ffe14a', 10); Sfx.play('wizDuHit');
  if (ph.sd || ph.stars[id] <= 0) wizDuRoundOver(st, 1 - id);
}
function wizDuRoundOver(st, w) {
  const ph = st.ph;
  if (ph.mode !== 'fight') return;
  ph.mode = 'over'; ph.modeT = 0; ph.winner = w;
  if (w >= 0) { ph.wins[w]++; wizStats(st).wins = ph.wins.slice(); wizNews(st, NAMES[w] + ' wins round ' + (ph.round + 1) + '!', false, 2.4); Sfx.play('wizCheer'); }
}
function wizDuStep(st, dt) {
  const ph = st.ph, K = WIZDUEL, F = K.floor, ps = G.players;
  ph.t += dt; ph.modeT += dt;
  if (st.idle) { wizDuCoast(st, dt); return; }
  if (ph.mode === 'ready') { for (const p of ps) { p.pendingJump = p.pendingAct = false; wizBody(p, dt, ph.solids, { still: true }); } if (ph.modeT > 1.6) { ph.mode = 'fight'; ph.modeT = 0; Sfx.play('wizBell'); wizNews(st, 'Duel!', false, 1); } return; }
  if (ph.mode === 'over') {
    for (const p of ps) { p.pendingJump = p.pendingAct = false; wizBody(p, dt, ph.solids, { still: true }); }
    if (ph.modeT > 2.4) {
      const w = ph.wins.findIndex(n => n >= K.wins);
      if (w >= 0) { ph.mode = 'done'; ph.champ = w; const s = wizStats(st); s.champ = w; s.wins = ph.wins.slice(); wizCelebrate(st, 1.5); wizPhaseDone(st, { say: NAMES[w] + ' is Top of the Class! Well duelled, both of you.' }); }
      else { if (ph.round === 0 && ph.winner >= 0) { ph.extra = [0, 0]; ph.extra[1 - ph.winner] = 1; wizGoldOnce(st, 'duelstar', NAMES[1 - ph.winner] + ' starts round 2 with a gold star!'); } else ph.extra = [0, 0]; ph.round++; wizDuRound(st); }
    }
    return;
  }
  if (ph.mode === 'done') { for (const p of ps) { p.pendingJump = p.pendingAct = false; wizBody(p, dt, ph.solids, { still: true }); } return; }
  // the clock; sudden death on a tie
  ph.time -= dt;
  if (ph.time <= 0) {
    if (!ph.sd && ph.stars[0] !== ph.stars[1]) wizDuRoundOver(st, ph.stars[0] > ph.stars[1] ? 0 : 1);
    else if (!ph.sd) { ph.sd = true; ph.time = K.sdT; wizNews(st, 'Sudden death! Next hit wins!', false, 2); Sfx.play('wizBell'); }
    else ph.time = K.sdT;   // (sudden death goes on until a hit)
    if (ph.mode !== 'fight') return;
  }
  // the stones drift (round 3), the fountain (round 2)
  for (const s of ph.stones) { const y = ph.round >= 2 ? s.base + Math.sin(ph.t * Math.PI * 2 / K.drift.period) * K.drift.amp : s.base; s.dy = y - s.y0; s.y0 = y; s.y1 = y + 14; }
  ph.fount = ph.round === 1 ? (ph.t % (K.fountain.on + K.fountain.off)) < K.fountain.on : false;
  // the players
  for (const p of ps) {
    const q = ph.p[p.id];
    for (const k of ['rest', 'icy', 'tiny', 'frog', 'hit', 'spin']) q[k] = Math.max(0, q[k] - dt);
    // the shield: down held (not as a frog)
    const want = !!p.input.down && q.frog <= 0 && q.bar > 0.05;
    if (want && !q.shield) { q.shield = 1; q.up = 0; Sfx.play('wizDuShield'); } else if (!want) q.shield = 0;
    if (q.shield) { q.up += dt; q.bar = Math.max(0, q.bar - dt / K.shield.drain); if (q.bar <= 0) q.shield = 0; } else q.bar = Math.min(1, q.bar + dt / K.shield.fill);
    // the action: a tap is a spark; held long enough and let go, a big bolt
    if (p.input.act && q.frog <= 0) q.hold += dt;
    if (p.pendingAct) { p.pendingAct = false; if (q.trick && q.rest <= 0) wizDuFire(st, p, false); }
    if (!p.input.act && q.hold > 0) { if (q.rest <= 0 && !q.shield && q.frog <= 0) wizDuFire(st, p, q.hold >= K.big.hold); q.hold = 0; }
    // moving: walk (slow behind the shield; slippery when icy; a frog only hops)
    const vx0 = p.vx, real = p.input;
    wizBody(p, dt, ph.solids, { ctl: (pp, d) => {
      const inp = Object.assign({}, real, { down: false });   // (down is the shield here: it never drops you through a stone)
      if (q.frog > 0) { if ((inp.left || inp.right) && pp.grounded) inp.jump = true; if (pp.grounded && !inp.jump) { inp.left = inp.right = false; } }
      pp.input = inp; if (q.frog > 0 && inp.jump && pp.grounded) pp.pendingJump = true;
      control(pp, d);
      if (q.shield) pp.vx *= 0.5;
      if (q.icy > 0 && pp.grounded) pp.vx = vx0 + (pp.vx - vx0) * 0.06;
    } });
    p.input = real;
    const [a, b] = wizDuSide(p);
    if (p.x < a) { p.x = a; p.vx = 0; } if (p.x > b - p.w) { p.x = b - p.w; p.vx = 0; }
    if (q.tiny > 0) { p.sx = 0.6; p.sy = 0.6; }
    // tokens
    for (const t of ph.tokens) if (!t.taken && t.side === p.id && Math.abs(p.x + p.w / 2 - t.x) < 22 && Math.abs(p.y + p.h / 2 - t.y) < 30) { t.taken = true; q.trick = t.kind; Sfx.play('wizDuToken'); wizPop(st, t.x, t.y - 24, WIZ_SPELLS[t.kind === 'size' ? 'size' : t.kind].name + '!', '#ffffff', 16); }
  }
  ph.tokens = ph.tokens.filter(t => !t.taken && (t.life -= dt) > 0);
  for (const id of [0, 1]) if ((ph.tokT[id] -= dt) <= 0) {
    ph.tokT[id] = K.token.every;
    const lv = Math.floor(MODES.wizschool.rand() * 3), s = lv ? ph.stones.find(q => q.side === id && (lv === 2) === (q.base < F - 120)) : null;
    const x = s ? (s.x0 + s.x1) / 2 + (MODES.wizschool.rand() - 0.5) * 60 : (id ? 620 + MODES.wizschool.rand() * 200 : 100 + MODES.wizschool.rand() * 200);
    ph.tokens.push({ side: id, x, y: (s ? s.base : F) - 20, kind: WIZDUEL_TRICKS[Math.floor(MODES.wizschool.rand() * 4)], life: K.token.life });
  }
  // the thunderpuff's sneeze (round 3) across the top height
  if (ph.round >= 2) {
    ph.sneezeT -= dt;
    if (!ph.sneeze && ph.sneezeT <= K.sneeze.warn) { ph.sneeze = { t: K.sneeze.warn, dir: ph.round % 2 ? -1 : 1 }; Sfx.play('wizDuWarn'); }
    if (ph.sneeze) { ph.sneeze.t -= dt; if (ph.sneeze.t <= 0 && !ph.sneeze.fired) { ph.sneeze.fired = true; ph.sneezeT = K.sneeze.every; Sfx.play('wizBeastSneeze'); for (const p of ps) { const bx = wizDuBox(st, p); if (bx.y0 < K.sneeze.y + 16 && bx.y1 > K.sneeze.y - 16) wizDuHit(st, p.id, 'A-choo!'); } } if (ph.sneeze.t < -0.4) ph.sneeze = null; }
  }
  // the bolts
  for (const b of ph.bolts) {
    if (b.door > 0) { b.door -= dt; continue; }
    b.x += b.vx * dt;
    if (b.kind === 'big') { b.vy += K.big.g * dt; b.y += b.vy * dt; if (b.y > F) { b.dead = true; puff(b.x, F - 4, 6, 'rgba(255,225,74,0.8)'); } }
    // the low wall stops a spark at floor height; the fountain blocks the middle height
    if (b.kind === 'spark') {
      if (Math.abs(b.x - K.mid) < K.wallW / 2 && b.y > F - K.wallH) { b.dead = true; puff(b.x, b.y, 5, 'rgba(255,255,255,0.7)'); continue; }
      if (ph.fount && Math.abs(b.x - K.mid) < 26 && b.y > K.fountain.y0 - 40 && b.y < K.fountain.y1) { b.dead = true; puff(b.x, b.y, 6, 'rgba(160,210,255,0.9)'); continue; }
    }
    if (b.x < -40 || b.x > W + 40) { b.dead = true; continue; }
    const tgtId = b.back ? b.from : 1 - b.from, p = ps[tgtId], q = ph.p[tgtId], bx = wizDuBox(st, p), r = b.kind === 'big' ? K.big.r : K.spark.r;
    if (b.x + r > bx.x0 && b.x - r < bx.x1 && b.y + r > bx.y0 && b.y - r < bx.y1) {
      if (q.shield) {
        if (b.kind === 'big') { q.shield = 0; q.bar = 0; b.dead = true; wizPop(st, p.x + p.w / 2, p.y - 30, 'Shield broken!', '#ffffff', 16); Sfx.play('wizDuBreak'); }
        else if (q.up < K.shield.bounce && !b.back) { b.back = true; b.vx = -b.vx; b.from = tgtId; b.back = false; wizPop(st, p.x + p.w / 2, p.y - 30, 'Bounce!', '#9ad0ff', 16); Sfx.play('wizExBounce'); }
        else { b.dead = true; Sfx.play('wizDuBlock'); }
      } else { b.dead = true; if (!b.fizz) wizDuHit(st, tgtId); else wizPop(st, b.x, b.y - 16, 'fizzle', '#ffffff', 12); }
    }
  }
  ph.bolts = ph.bolts.filter(b => !b.dead);
  wizDuHints(st);
}
function wizDuHints(st) {
  const ph = st.ph;
  if (ph.t > 1 && ph.t < 4 && ph.round === 0) for (const id of [0, 1]) if (!st.hints[id]) wizHint(st, id, 'Tap ' + wizKey(id, 'act') + ' to cast, hold ' + wizKey(id, 'down') + ' to shield', { life: 3 });
}
function wizDuCoast(st, dt) {
  const ph = st.ph;
  if (!ph.solids) { wizCoast(dt); return; }
  for (const p of G.players) { p.pendingJump = p.pendingAct = false; wizBody(p, dt || 0, ph.solids, { still: true }); }
}
// the plan the brain reads: per player, where the rival is, what is coming
function wizDuPlan(st) {
  const ph = st.ph, ps = G.players, out = [null, null];
  for (const p of ps) {
    const o = ps[1 - p.id], lv = wizDuLevel(st, p), olv = wizDuLevel(st, o);
    out[p.id] = { lv, olv, rest: ph.p[p.id].rest, trick: ph.p[p.id].trick, bar: ph.p[p.id].bar, frog: ph.p[p.id].frog > 0 };
  }
  return out;
}

/* ---------- drawing ---------- */
function wizDuDrawBack(st) {
  const ph = st.ph, K = WIZDUEL, F = K.floor, t = G.clock;
  wizScreen(st, () => wizDusk(t, 0, 0, { skyY: F }));
  // the courtyard: flagstones, the arches, the low wall, the fountain
  ctx.fillStyle = '#5a5470'; ctx.fillRect(0, F, W, H - F); ctx.fillStyle = '#6e6888'; for (let x = 0; x < W; x += 60) ctx.fillRect(x + 2, F + 4, 56, 10);
  ctx.fillStyle = '#3e3858'; for (let x = 40; x < W; x += 180) { ctx.beginPath(); ctx.moveTo(x, F); ctx.lineTo(x, F - 170); ctx.arc(x + 50, F - 170, 50, Math.PI, 0); ctx.lineTo(x + 100, F); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(K.mid - K.wallW / 2, F - K.wallH, K.wallW, K.wallH); ctx.strokeRect(K.mid - K.wallW / 2, F - K.wallH, K.wallW, K.wallH);
  ctx.fillStyle = '#7aa0d8'; rr(K.mid - 30, F - K.wallH - 14, 60, 16, 6); ctx.fill(); ctx.stroke();
  if (ph.fount) { const g = ctx.createLinearGradient(0, K.fountain.y0 - 40, 0, F - K.wallH); g.addColorStop(0, 'rgba(200,230,255,0.4)'); g.addColorStop(1, 'rgba(120,170,240,0.85)'); ctx.fillStyle = g; ctx.fillRect(K.mid - 18, K.fountain.y0 - 40 + Math.sin(t * 9) * 4, 36, F - K.wallH - K.fountain.y0 + 40); }
  else if (ph.round === 1) { ctx.fillStyle = 'rgba(160,200,255,0.7)'; circle(K.mid, F - K.wallH - 18 + Math.sin(t * 9) * 3, 8); ctx.fill(); }
}
function wizDuDraw(st) {
  const ph = st.ph, K = WIZDUEL, F = K.floor, t = G.clock;
  for (const s of ph.stones) { ctx.fillStyle = WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(s.x0, s.y0, s.x1 - s.x0, 16, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(200,220,255,0.25)'; ctx.beginPath(); ctx.ellipse((s.x0 + s.x1) / 2, s.y0 + 30, (s.x1 - s.x0) / 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const tk of ph.tokens) { const sp = WIZ_SPELLS[tk.kind === 'size' ? 'size' : tk.kind], bob = Math.sin(t * 4 + tk.x) * 4; ctx.save(); ctx.globalAlpha = tk.life < 2 ? 0.5 + 0.5 * Math.sin(t * 14) : 1; ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(tk.x, tk.y + bob, 12); ctx.fill(); ctx.stroke(); text(sp.name[0], tk.x, tk.y + bob + 5, 13, C.ink, 'center'); ctx.restore(); }
  // the thunderpuff in the background (round 3) and its sneeze line
  if (ph.round >= 2) {
    const x = 480 + Math.sin(ph.t * 0.4) * 300, y = 120;
    wizBeastDrawPuff(x, y, 0.45, Math.cos(ph.t * 0.4) > 0 ? 1 : -1, { run: true });
    if (ph.sneeze && ph.sneeze.t > 0) { ctx.save(); ctx.strokeStyle = '#ffe14a'; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 20); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, K.sneeze.y); ctx.lineTo(W, K.sneeze.y); ctx.stroke(); ctx.restore(); bigText('!', x, y - 50, 26, '#ff5f6d', 1); }
    else if (ph.sneeze) { ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, K.sneeze.y); for (let xx = 0; xx <= W; xx += 40) ctx.lineTo(xx, K.sneeze.y + Math.sin(xx * 0.7 + t * 40) * 10); ctx.stroke(); }
  }
}
function wizDuDrawTop(st) {
  const ph = st.ph, K = WIZDUEL, t = G.clock;
  for (const b of ph.bolts) {
    if (b.door > 0) { ctx.fillStyle = '#c8b8ff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(b.x - 12, b.y - 22, 24, 40, 10); ctx.fill(); ctx.stroke(); continue; }
    if (b.kind === 'big') { ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(b.x, b.y, K.big.r); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,210,63,0.35)'; circle(b.x - b.vx * 0.04, b.y - b.vy * 0.04, K.big.r * 0.8); ctx.fill(); }
    else { ctx.fillStyle = b.fizz ? '#c8c8d8' : b.from === 0 ? '#ff9a8a' : '#8ac9ff'; circle(b.x, b.y, K.spark.r); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.04, b.y); ctx.stroke(); }
  }
  for (const p of G.players) {   // (players are in screen coords here; the camera doesn't move in the duel)
    const q = ph.p[p.id], cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (q.shield) { ctx.save(); ctx.globalAlpha = q.up < K.shield.bounce ? 0.65 : 0.4; ctx.fillStyle = WIZ_SPELLS.shield.col; circle(cx, cy, K.shield.r); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    if (q.icy > 0) { ctx.fillStyle = 'rgba(190,232,255,0.6)'; ctx.fillRect(cx - 18, p.y + p.h - 3, 36, 4); }
    if (q.frog > 0) { ctx.fillStyle = 'rgba(110,200,90,0.75)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h - 10, 16, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(cx - 6, p.y + p.h - 20, 4); ctx.fill(); circle(cx + 6, p.y + p.h - 20, 4); ctx.fill(); }
    if (q.trick) { const sp = WIZ_SPELLS[q.trick === 'size' ? 'size' : q.trick]; ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(cx, p.y - 46, 9); ctx.fill(); ctx.stroke(); }
    if (q.hold > 0.15 && !q.shield) { const k = clamp(q.hold / K.big.hold, 0, 1); ctx.strokeStyle = k >= 1 ? '#ffd23f' : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
    if (q.spin > 0) { ctx.save(); ctx.translate(cx, p.y - 30 - (0.6 - q.spin) * 40); ctx.rotate(q.spin * 20); ctx.fillStyle = '#ffe14a'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a + 0.6) * 3.5, Math.sin(a + 0.6) * 3.5); } ctx.fill(); ctx.restore(); }
  }
}
function wizDuHud(st) {
  const ph = st.ph, K = WIZDUEL, big = wizBig(), z = big ? 1.3 : 1;
  const star = (x, y, on, gold) => { ctx.fillStyle = on ? (gold ? '#ffd23f' : '#fff3c4') : 'rgba(255,255,255,0.18)'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * 9 * z, y + Math.sin(a) * 9 * z); ctx.lineTo(x + Math.cos(a + 0.63) * 4 * z, y + Math.sin(a + 0.63) * 4 * z); } ctx.fill(); };
  for (const id of [0, 1]) {
    const n = K.stars + ph.extra[id], x0 = id ? W - 30 - (n - 1) * 22 * z : 30, y = 110;
    for (let i = 0; i < n; i++) star(x0 + i * 22 * z, y, i < ph.stars[id], i >= K.stars);
    const q = ph.p[id], bx = id ? W - 30 - 100 * z : 22;
    ctx.fillStyle = 'rgba(30,20,66,0.8)'; rr(bx, y + 16, 100 * z, 7 * z, 3); ctx.fill(); ctx.fillStyle = WIZ_SPELLS.shield.col; rr(bx, y + 16, 100 * z * q.bar, 7 * z, 3); ctx.fill();
    text(NAMES[id] + '  ' + '●'.repeat(ph.wins[id]) + '○'.repeat(Math.max(0, K.wins - ph.wins[id])), id ? W - 24 : 24, y + 44, 14 * z, '#ffffff', id ? 'right' : 'left', 'body');
  }
  const tm = Math.max(0, Math.ceil(ph.time));
  text(ph.sd ? 'Next hit wins!' : tm + 's', W / 2, 200, (ph.sd ? 18 : 22) * z, ph.sd || tm <= 10 ? '#ff9a8a' : '#ffffff', 'center');
}

WIZ_PHASES.duel = {
  setup(st, L) { wizDuSetup(st, L); },
  step(st, dt) { wizDuStep(st, dt); },
  coast(st, dt) { wizDuCoast(st, dt); },
  plan(st) { return wizDuPlan(st); },
  labels: () => ['cast', 'cast'],
  roles: () => ['Duel!', 'Duel!'],
  legend: () => ({ pip: '<kbd>S</kbd> shield, tap / hold to cast', bo: '<kbd>↓</kbd> shield, tap / hold to cast', pad: 'down shields, tap or hold the action to cast,' }),
  hudText(st) { const ph = st.ph; return 'Round ' + (ph.round + 1) + ' (best of 3)'; },
  progress: () => null,
  drawBack(st) { wizDuDrawBack(st); },
  draw(st) { wizDuDraw(st); },
  drawTop(st) { wizDuDrawTop(st); },
  hud(st) { wizDuHud(st); },
  statLine(st) { const s = st.stats.duel; return s && s.champ != null && s.champ >= 0 ? 'Top of the Class: ' + NAMES[s.champ] + ' (' + s.wins[s.champ] + '-' + s.wins[1 - s.champ] + ')' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizDuSpark = function () { this.tone(900, 0.08, 'square', 0.025, 1400); };
Sfx.extra.wizDuBig = function () { this.tone(300, 0.3, 'sawtooth', 0.035, 900); };
Sfx.extra.wizDuHit = function () { [1200, 900, 1500].forEach((f, i) => this.tone(f, 0.06, 'triangle', 0.035, null, i * 0.05)); };
Sfx.extra.wizDuShield = function () { this.tone(500, 0.1, 'sine', 0.03, 700); };
Sfx.extra.wizDuBlock = function () { this.tone(300, 0.08, 'triangle', 0.03, 200); };
Sfx.extra.wizDuBreak = function () { this.tone(1400, 0.2, 'sawtooth', 0.03, 300); };
Sfx.extra.wizDuToken = function () { [880, 1320].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.035, null, i * 0.06)); };
Sfx.extra.wizDuWarn = function () { [600, 800].forEach((f, i) => this.tone(f, 0.08, 'square', 0.025, null, i * 0.12)); };

/* ---------- the room ---------- */
wizRoom('duel', {
  jobs: {
    duelist: { title: 'Duelist', act: 'cast', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> shield (hold)',
      howTo: ['Tap cast for a spark. Hold, then let go for a big bolt.'] },
  },
  act: { label: 'cast', labels: ['cast', 'cast'] },
  tip: 'The graduation duel, best of three! Tap to cast a spark, hold and let go for a big bolt, hold down to shield.',
  legend: { pip: '<kbd>S</kbd> shield, tap / hold to cast', bo: '<kbd>↓</kbd> shield, tap / hold to cast', pad: 'down shields, tap or hold the action to cast,' },
  map: WIZ_EMPTY_MAP,
});

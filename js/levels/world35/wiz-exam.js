/* Pip & Bo - Level 35-1 Moonwick Academy: class 11 'exam' (Final Exam: The Big Mistake). */
'use strict';

/* ===== 35-1 class 11: Final Exam, The Big Mistake (WIZ_PHASES.exam) ==============================================
   "Just a little one of each, dears." The spells tangle, hit her bottomless ink pot and wake THE BLOT: a huge glossy
   ink monster with two white eyes and a mouth like a spill. It swallows her armchair (she floats inside, teacup and
   all, still giving advice) and floods the school. The scary part: big, fast and loud (the bell clangs, ink drips from
   the ceilings, its arms reach for the rear wizard).

   PART 1, THE FLOOD (scrolling right). The Blot rolls after them from the left with a gap meter like 31-1's mower: it
   hurries when far behind, eases when close, and creeps when right behind (WIZEXAM.blot). 8 GATES, each a small
   version of its class, played with that class's own spell code (the class's functions run on a small state shaped like
   that class's own: wizExWith), in its spell's colour and announced ("LIFT, dears!"). Who gets which job alternates:
     1 Frost and Flame  FROST holds the action to lay an ice bridge over an ink pool (wizFFFrost); FLAME holds the
                        action to burn the thorn door (wizFFFlame). The flame melts ice too: aim it.
     2 Levitation       the LIFTER holds the action to float the slab up beside a wall (focus meter as in Class 2);
                        the RIDER rides it, steps onto the wall, drops down the far side and pulls the lever.
     3 Light Spell      the LIGHT holds the action to glow (up raises the light); the CLIMBER creeps and can't jump
                        in the dark, jumps up two shelves in the light and pulls the gate lever. Ink shadows creep in.
     4 Shrink and Grow  the ZAPPER arms Shrink (down) and zaps (wizSizeZap); the tiny one hops into the keyhole, walks
                        through and pulls the little lever behind the door.
     5 Shape Shifting   a FROG for the tall hedge (the frog pulls the rope that opens the hedge gate), then the jobs swap
                        and a FISH swims the moat (and pulls the drawbridge rope). The caster's dial: up / down.
     6 Shield Charm     ink bolts rain from the ceiling: the SHIELDER holds the bubble (up tilts the thick patch up, so
                        drops bounce off for free); the ZAPPER aims (up / down, 5 steps) and zaps the door's 3 seals
                        from inside the bubble. Hit outside it: back to the gate's start (both inside 5 s: an Oops).
     7 Portal Class     a broken stair: the DRAWER stamps an IN door down here and an OUT door up on the landing; the
                        JUMPER walks through and drops the ladder for the DRAWER.
     8 Broom Flying     out of the window onto one broom (wizBroomKick, wizBroomDrawRide): the STEERER climbs and dives
                        under ink curtains, over ink geysers and through the Great Hall's window; the KICKER kicks.
   Fails: falling into ink (or the moat as the wrong animal three times) is that player's Oops, back to the gate's start.
   Caught by the Blot: "GLOOP!", both swallowed and spat out at the gate's start looking inky, the Blot backs off, a
   team Oops. GOLD HELP after WIZEXAM.goldAt (2) Oops at one gate: a gold tea splash slows the Blot for 20 s, and that
   gate's spell gets kinder for the rest of it (announced): longer ice, slower tiring, a bigger light, longer sizes, a
   blinking dial, a stronger bubble, longer doors, a broom that levels itself.
   After one more miss (goldAt + 1) the gate is STUCK (wizExMissed): the Blot waits in the doorway behind it (g.x - 260)
   until the gate opens, and the Frost and Flame ice stops melting. The scrolling never pushes a slow pair into the ink.

   PART 2, THE GREAT HALL (a wide arena that scrolls a little; the Blot fills the far wall, bigger than ever, with
   Thimblewick floating inside it). 3 ROUNDS. Each round first an ATTACK SET (WIZEXAM.attackT s), all telegraphed, and
   both players have every spell: the action casts whatever answers what is coming at you:
     ink waves along the floor   FROST it solid (it stops as an ice lump) or jump it
     ink bolts                   hold the action: SHIELD (a bolt bounced back makes it flinch: the set ends 1 s sooner)
     grabbing arms (a red ring)  FLAME it (it shrivels) or step out of the ring
     falling candelabra          a shadow grows on the floor first: step out
     LIGHTS OUT (rounds 2, 3)    it covers the windows: the round's LIFTER holds the action to GLOW; ink shadows creep
                                 at anyone outside the light
   A hit knocks that player down for 1.5 s; both down at once is an Oops and the attack set starts again (each round's
   start is a safe spot). Then it rears up and an eye glows: the LIFTER holds the action in the lift circle (the Lift on
   the swallowed armchair stretches the Blot and holds the eye open, a focus meter as in Class 2) and the STRIKER gets to
   the eye with the round's own trick and casts the finishing spell:
     round 1  FROST its ink falls into steps (they melt after 9 s), climb, and FLAME the open eye (hold 0.8 s)
     round 2  its arms hold up chalk plates: the STRIKER stamps an IN door down low and an OUT door up above the eye
              (only they can help themselves now), walks through, and casts DOOR at the eye
     round 3  the thunderpuff gallops in: ride it, feed it a pepper pod at the gate of arms (it charges through), and
              toss the leftover Brew into the eye at the top of its leap
   EYE GOLD: after WIZEXAM.eyeGoldT (35) s at one eye, round 1's steps stop melting and round 2's doors last 1.8x.
   The jobs swap each round. After round 3 the Blot shrinks to a small embarrassed puddle with big eyes, burps out the
   armchair, and she pops it in a jar: "It can be the school pet."
   NEVER ALONE. Every gate and every round needs both jobs: nothing in a gate moves on for one player, the eye only opens
   for the lifter and only the striker can reach it.
   Stats (st.stats.exam): gates, gloops, hits, plus the class functions' own counters.   Names: wizEx* / WIZEXAM*
   (Sfx.extra.wizEx*). Test hook: MODES.wizschool.test.examAt('g3' | 'r1') skips to a gate or a round. */
const WIZEXAM = {
  floor: 430, ceil: 44, gate0: 600,
  blot: { start: 140, far: 700, near: 350, close: 220, fast: 230, mid: 70, slow: 10, creep: 4, back: 650, gold: 0.4, goldT: 20 },
  goldAt: 2,
  bellEvery: 6.5,
  hall: { w: 1100, front: 800, camMax: 140, circle: 200, circleR: 46 },
  eye: { x: 840, y: 330, r: 34 },
  attackT: 14, every: 1.5, down: 1.5, eyeGoldT: 35,
  wave: { v: 300, h: 34, w: 46, ice: 4, frost: 170 },
  bolt: { v: 330, r: 12, flinch: 1 },
  arm: { warn: 1.1, w: 96, slam: 0.4, reach: 150 },
  candle: { warn: 1.3, r: 44 },
  dark: { t: 6.5, r: 130, every: 1.1, v: 85, at: [null, 3.5, 3] },
  steps: [[470, 600, 90], [550, 680, 180], [630, 760, 270]],
  plates: { reach: 640, life: 10, sway: 20, period: 5 },
  puff: { v: 270, charge: 470, leapAt: 640, leapV: 720, g: 1800, leapVx: 120, arms: 520, win: [260, 50], tumble: 1.1 },
};
const WIZEXAM_FIN = [{ key: 'flame', word: 'FLAME!' }, { key: 'door', word: 'DOOR!' }, { key: 'brew', word: 'BREW!' }];
const WIZEXAM_ATTACKS = [['wave', 'bolt', 'arm'], ['wave', 'candle', 'bolt', 'arm'], ['arm', 'wave', 'bolt', 'candle', 'wave']];
const wizExCx = p => p.x + p.w / 2;
const wizExFeet = p => p.y + p.h;
// run a class's own function on a small state shaped like that class's (st.ph is swapped for the call)
function wizExWith(st, sub, fn) { const real = st.ph; st.ph = sub; try { return fn(); } finally { st.ph = real; } }
// a player's own control with some keys taken away (the jump button is "up" for these jobs)
function wizExCtl(o) {
  return (q, d) => { const real = q.input; q.input = Object.assign({}, real, o); if (o.jump === false) q.pendingJump = false; try { control(q, d); } finally { q.input = real; } };
}
const WIZEX_NOJUMP = wizExCtl({ jump: false, up: false });
const WIZEX_NOJUMPDOWN = wizExCtl({ jump: false, up: false, down: false });
// a fresh press of up (W / ↑ / ▲ / stick up) or down, per player
function wizExEdge(o, p, key) { const now = key === 'up' ? wizUp(p) : !!p.input.down, k = key + p.id, was = !!o[k]; o[k] = now; return now && !was; }
const wizExKey = (id, what) => wizKey(id, what);
// both on to the next gate
function wizExGoOn(g) { return [{ why: 'go', x: g.x + g.w + 20 }, { why: 'go', x: g.x + g.w + 56 }]; }

/* ======================================== THE GATES ======================================== */
/* A gate kind: { key, spell, w, say, jobs [A, B] (badges), words [A, B] (action words), legend [A, B], goldText,
   build(g), solids(g), reset(g) (after a gloop), finish(g) (done: left safe to walk back over), open(g),
   step(st, g, dt, A, B) (moves both players), plan(st, g, A, B) -> [plan A, plan B], hide(g) -> [A, B],
   draw(st, g) (world coords; players are in screen coords there), drawTop(st, g) }.
   A is the player with the gate's first job: (room first + gate number) alternates it. g.prev: the solids of the gates
   behind (open now), so nobody falls through the floor walking back. */
const WIZEX_FF = {
  key: 'frostflame', spell: 'frost', w: 820, say: 'FROST and FLAME, dears! A bridge, then the thorns!',
  jobs: ['Frost!', 'Flame!'], words: ['frost', 'flame'], legend: ['hold: ice bridge', 'hold: flame jet'], goldText: 'the ice lasts longer',
  build(g) {
    const x = g.x, F = WIZEXAM.floor, K = WIZFF;
    g.pool = { x0: x + 220, x1: x + 460, n: 6, ice: [0, 0, 0, 0, 0, 0], part: 0 };
    g.thorn = { x0: x + 620, y0: F - 150, x1: x + 644, y1: F, kind: 'thorn', burn: 0 };
    g.sub = { pools: [g.pool], pieces: [], solids: [g.thorn], gold: false };
    g.base = [{ x0: x - 40, y0: F, x1: g.pool.x0, y1: F + 300 }, { x0: g.pool.x1, y0: F, x1: x + g.w + 40, y1: F + 300 }, { x0: g.pool.x0, y0: F + K.depth, x1: g.pool.x1, y1: F + K.depth + 40 }];
    g.holdT = 0; g.jet = false;
  },
  solids(g) {
    const K = WIZFF, F = WIZEXAM.floor, o = g.pool, S = g.base.slice();
    if (!g.thorn.off) S.push(g.thorn);
    for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) S.push({ x0: o.x0 + i * K.tile, y0: F, x1: o.x0 + (i + 1) * K.tile, y1: F + 16, kind: 'ice' });
    return S;
  },
  reset(g) { g.pool.ice.fill(0); },
  finish(g) { g.pool.ice.fill(1e9); },
  open: g => !!g.thorn.off,
  step(st, g, dt, A, B) {
    const K = WIZFF, o = g.pool;
    g.sub.gold = !!g.gold;
    if (g.stuck) for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) o.ice[i] = 1e9;   // (stuck here: the ice stays)
    for (let i = 0; i < o.n; i++) if (o.ice[i] > 0 && o.ice[i] < 1e8) { const was = o.ice[i]; o.ice[i] = Math.max(0, was - dt); if (was > K.crack && o.ice[i] <= K.crack) Sfx.play('wizFFCrack'); }
    if (A.pendingAct) { wizExWith(st, g.sub, () => wizFFFrost(st, A, true)); g.holdT = K.holdEvery; }
    else if (A.input.act && (g.holdT -= dt) <= 0) { wizExWith(st, g.sub, () => wizFFFrost(st, A, false)); g.holdT = K.holdEvery; }
    A.pendingAct = false;
    if (B.pendingAct) Sfx.play('wizFFJet');
    B.pendingAct = false;
    g.jet = !!B.input.act;
    if (g.jet) wizExWith(st, g.sub, () => wizFFFlame(st, B, dt));
    const S = g.prev.concat(this.solids(g));
    for (const p of [A, B]) wizBody(p, dt, S);
    for (const p of [A, B]) if (wizExFeet(p) > WIZEXAM.floor + 30 && wizExCx(p) > o.x0 - 10 && wizExCx(p) < o.x1 + 10) wizExFell(st, p, 'Gloop! Into the ink.', g.x + 110 + (p === A ? 40 : 0));
  },
  plan(st, g, A, B) {
    const o = g.pool, F = WIZEXAM.floor, th = g.thorn;
    const across = p => wizExCx(p) > o.x1 + 6 && p.grounded && wizExFeet(p) <= F + 1;
    const iced = x => { if (x < o.x0 || x >= o.x1) return true; const i = Math.floor((x - o.x0) / WIZFF.tile); return o.ice[i] > 0.6; };
    let PA, PB;
    const ax = wizExCx(A), bx = wizExCx(B);
    if (th.off) {
      // (the thorns are gone; whoever is still on the near side crosses on fresh ice: the FROST player lays it)
      const [GA, GB] = wizExGoOn(g);
      PA = across(A) ? GA : { why: 'frost', x: o.x1 + 50, hold: ax > o.x0 - 40 && ax < o.x1 + 30, say: 'Hold ' + wizExKey(A.id, 'act') + ' to freeze a bridge over the ink!' };
      PB = across(B) ? (across(A) ? GB : { why: 'wait', x: o.x1 + 60 }) : { why: 'cross', x: iced(bx + 26) && ax > bx ? o.x1 + 40 : Math.min(bx, o.x0 - 20) };
      return [PA, PB];
    }
    if (!across(B)) {
      // FROST walks just ahead of FLAME, laying the bridge (the ice runs out after 5 s: the bridge is laid fresh for them)
      PA = { why: 'frost', x: clamp(bx + 70, o.x0 - 6, o.x1 + 50), hold: ax > o.x0 - 40 && ax < o.x1 + 30, say: 'Hold ' + wizExKey(A.id, 'act') + ' to freeze a bridge over the ink!' };
      // (FLAME crosses right behind FROST, never ahead of the new ice)
      if (bx > o.x0 - 4) PB = { why: 'cross', x: ax > o.x1 + 6 ? (iced(bx + 26) ? o.x1 + 40 : bx) : Math.min(ax - 26, iced(bx + 26) ? o.x1 + 40 : bx), say: 'Stay right behind your partner on the ice!' };
      else PB = { why: 'wait', x: iced(o.x0 + 10) && iced(o.x0 + 50) && ax > bx + 20 ? o.x1 + 40 : o.x0 - 30, say: 'Cross on the ice right behind your partner!' };
    } else {
      const fx = th.x0 - 60;
      PB = { why: 'burn', x: fx, face: 1, hold: Math.abs(bx - fx) < 30 && B.face > 0, say: 'Hold ' + wizExKey(B.id, 'act') + ' to burn the thorns!' };
      PA = across(A) ? { why: 'wait', x: th.x0 - 150 } : { why: 'frost', x: o.x1 + 50, hold: ax > o.x0 - 40 };
    }
    return [PA, PB];
  },
  hide: () => [false, false],
  draw(st, g) {
    const K = WIZFF, F = WIZEXAM.floor, o = g.pool, t = G.clock, C2 = WIZEXAM_C;
    wizExDrawInk(o.x0, o.x1, F + 4, t);
    for (let i = 0; i < o.n; i++) if (o.ice[i] > 0) {
      const x0 = o.x0 + i * K.tile, crack = o.ice[i] < K.crack;
      { const C2 = WIZFF_C, x = x0; // (art pass) the same frozen tile as Frost and Flame (cached)
        RICH.pic('wizice4|' + Math.round(K.tile - 2), K.tile - 2, 16, (c, w, h) => {
          c.save(); RICH.rr(c, 0, 0, w, h, 4); c.clip();
          const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f2fbff'); g.addColorStop(0.45, C2.ice); g.addColorStop(1, '#b8e0f4'); c.fillStyle = g; c.fillRect(0, 0, w, h);
          c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.moveTo(3, 3); c.lineTo(w * 0.45, 3); c.lineTo(w * 0.3, 7); c.lineTo(3, 7); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(120,180,220,0.55)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(w * 0.6, 2); c.lineTo(w * 0.7, 9); c.lineTo(w * 0.62, 14); c.moveTo(w * 0.7, 9); c.lineTo(w * 0.86, 11); c.stroke();
          c.fillStyle = 'rgba(90,150,200,0.25)'; c.fillRect(0, h - 3, w, 3); c.restore();
        }, x + 1, F);
        ctx.strokeStyle = C2.iceDk; ctx.lineWidth = 2; rr(x + 1, F, K.tile - 2, 16, 4); ctx.stroke(); }
      if (crack) { ctx.strokeStyle = '#5a86a8'; ctx.beginPath(); ctx.moveTo(x0 + 8, F + 3); ctx.lineTo(x0 + 18, F + 10); ctx.lineTo(x0 + 26, F + 4); ctx.stroke(); }
    }
    const th = g.thorn;
    if (!th.off) {
      const k = clamp(th.burn / K.burn, 0, 1);
      ctx.fillStyle = k > 0.3 ? '#5a4a2a' : WIZFF_C.thorn; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(th.x0, th.y0, th.x1 - th.x0, th.y1 - th.y0, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = WIZFF_C.thornDk;
      for (let y = th.y0 + 10; y < th.y1; y += 18) for (const d of [-1, 1]) { const bx = d < 0 ? th.x0 : th.x1; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + d * 10, y + 5); ctx.lineTo(bx, y + 10); ctx.fill(); }
      if (k > 0) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#ff9a3c'; for (let n = 0; n < 4; n++) { circle(th.x0 + 12 + Math.sin(t * 9 + n) * 8, th.y1 - 20 - n * 30 - (t * 60 % 30), 6 * k); ctx.fill(); } ctx.restore(); }
    } else { ctx.fillStyle = 'rgba(40,30,20,0.6)'; ctx.beginPath(); ctx.ellipse((th.x0 + th.x1) / 2, F - 3, 26, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    // the flame jet (the flame player is in screen coords here)
    const ids = g.ids;
    if (g.jet && ids) { const p = G.players[ids[1]], cx = p.x + p.w / 2 + st.cam.x, f = p.face || 1; wizExDrawJet(cx + f * 6, p.y + st.cam.y + p.h / 2, f, K.jet, t); }
    void C2;
  },
};

const WIZEX_LIFT = {
  key: 'lift', spell: 'lift', w: 820, say: 'LIFT, dears! Float the slab up over the wall!',
  jobs: ['Lift!', 'Ride!'], words: ['lift', 'pull'], legend: ['hold: lift the slab', 'ride it, pull the lever'], goldText: 'the lifter tires more slowly',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.wall = { x0: x + 430, y0: F - 300, x1: x + 480, y1: F, kind: 'portcullis' };
    g.slab = { x: x + 310, y: F, w: 110, h: 16, dx: 0, dy: 0, lit: 0 };
    g.lever = { x: x + 620, pulled: false };
    g.focus = 1; g.tired = false; g.held = false; g.rise = 0;
    g.base = [{ x0: x - 40, y0: F, x1: x + 310, y1: F + 300 }, { x0: x + 420, y0: F, x1: x + g.w + 40, y1: F + 300 }, { x0: x + 310, y0: F + 16, x1: x + 420, y1: F + 60 }, { x0: x + 310, y0: F, x1: x + 420, y1: F + 16, under: true }];
  },
  top: () => WIZEXAM.floor - 320,
  slabRect(g) { const s = g.slab; return { x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h, dx: s.dx, dy: s.dy, src: s, slab: true }; },
  // (a stone post on the slab's back end, so a rider who wanders back doesn't step off high up)
  postRect(g) { const s = g.slab; return { x0: s.x, y0: s.y - 30, x1: s.x + 10, y1: s.y, dx: s.dx, dy: s.dy, src: s, kind: 'post' }; },
  solids(g) { const S = g.base.slice(); if (!g.wall.off) S.push(g.wall); S.push(this.slabRect(g)); if (g.slab.y < WIZEXAM.floor - 24) S.push(this.postRect(g)); return S; },
  reset(g) { g.slab.y = WIZEXAM.floor; g.slab.dy = 0; g.focus = 1; g.tired = false; },
  finish(g) { g.slab.y = WIZEXAM.floor; g.slab.dy = 0; },
  open: g => g.lever.pulled,
  step(st, g, dt, A, B) {
    const K = WIZLIFT, F = WIZEXAM.floor, s = g.slab;
    const onSlab = p => p.grounded && p.ground && p.ground.slab;
    const holding = !!A.input.act && A.grounded && !onSlab(A) && wizExCx(A) < g.wall.x0 && Math.abs(wizExCx(A) - (s.x + s.w / 2)) < K.reach;
    if (A.input.act && onSlab(A) && !g.saidRide) { g.saidRide = true; wizHint(st, A.id, 'You can\'t lift a slab you\'re standing on!', { cpu: 'Hopping off!' }); }
    if (g.tired) { g.focus = Math.min(1, g.focus + K.focus.fill * dt); if (g.focus >= K.focus.wake) { g.tired = false; Sfx.play('wizDing'); } }
    const lifting = holding && !g.tired && !g.lever.pulled;
    if (lifting) { g.focus -= K.focus.drain * (g.gold ? 0.5 : 1) * dt; if (g.focus <= 0) { g.focus = 0; g.tired = true; wizPop(st, wizExCx(A), A.y - 30, 'Puff! Rest...', '#d9c6ff', 16); Sfx.play('wizLiftTired'); } }
    else if (!g.tired) g.focus = Math.min(1, g.focus + K.focus.fill * dt);
    if (lifting && !g.held) Sfx.play('wizSpell_lift');
    g.held = lifting;
    // (nobody is squashed in the slot under a sinking slab)
    let ny = clamp(s.y + (lifting ? -K.slab.up : K.slab.sink) * dt, this.top(), F);
    for (const p of [A, B]) if (p.x + p.w > s.x && p.x < s.x + s.w && p.y >= s.y + s.h - 2) ny = Math.min(ny, Math.max(s.y, p.y - s.h));   // (it stops on a head under it)
    s.dy = ny - s.y; s.dx = 0; s.y = ny;
    s.lit = lifting ? Math.min(1, s.lit + dt * 6) : Math.max(0, s.lit - dt * 3);
    A.pendingAct = A.pendingAct && !holding;
    const S = g.prev.concat(this.solids(g));
    wizBody(A, dt, S, { ctl: (p, d) => { const real = p.input; if (real.act && p.grounded && !g.lever.pulled) p.input = NO_INPUT; try { control(p, d); } finally { p.input = real; } } });
    wizBody(B, dt, S);
    for (const p of [A, B]) if (wizExFeet(p) > F + 1) Object.assign(p, { y: F - p.h, vy: 0, grounded: true, ground: g.base[1] });   // (never inside the floor)
    for (const p of [A, B]) {
      if (!p.pendingAct) continue;
      p.pendingAct = false;
      if (!g.lever.pulled && Math.abs(wizExCx(p) - g.lever.x) < 26 && p.grounded && wizExFeet(p) > F - 2) {
        g.lever.pulled = true; g.wall.off = true; Sfx.play('wizExLever'); Sfx.play('wizDoor');
        wizPop(st, g.lever.x, F - 110, 'Clunk! The gate rises!', '#ffd23f', 18); wizSparks((g.wall.x0 + g.wall.x1) / 2, F - 150, 'lift', 14);
      }
    }
  },
  plan(st, g, A, B) {
    const F = WIZEXAM.floor, s = g.slab, w = g.wall, sc = s.x + s.w / 2, bx = wizExCx(B);
    if (g.lever.pulled) return wizExGoOn(g);
    const onSlab = B.grounded && B.ground && B.ground.slab, onWall = B.grounded && B.ground === w;
    const well = onSlab && bx > s.x + 14 && bx < s.x + s.w - 10;   // (well on it, not on its very edge: then the lift starts)
    let PA = { why: 'wait', x: s.x - 60 }, PB;
    if (bx > w.x1 - 4 && !onWall) PB = { why: 'pull', x: g.lever.x, tap: Math.abs(bx - g.lever.x) < 20 && B.grounded ? 'act' : null, say: 'Pull the lever: ' + wizExKey(B.id, 'act') };
    else if (onWall) PB = { why: 'go', x: w.x1 + 40 };
    else if (onSlab && s.y <= w.y0 - 2) { PB = { why: 'step', x: w.x0 + 34, say: 'Step onto the wall!' }; PA = { why: 'lift', x: s.x - 60, dead: 40, hold: !g.tired }; }
    else if (onSlab && (well || s.y < F - 20)) {
      PB = { why: 'ride', x: sc + 10, dead: 20, say: 'Ride the slab up, then step onto the wall!' };
      PA = { why: 'lift', x: s.x - 60, dead: 40, hold: !g.tired, say: 'Hold ' + wizExKey(A.id, 'act') + ' to lift the slab!' };
    } else PB = { why: 'board', x: sc + 10, dead: 20, say: 'Stand on the stone slab!' };
    return [PA, PB];
  },
  hide: () => [false, false],
  draw(st, g) {
    const F = WIZEXAM.floor, s = g.slab, w = g.wall, t = G.clock, sp = WIZ_SPELLS.lift;
    // the track
    ctx.save(); ctx.strokeStyle = sp.col; ctx.globalAlpha = 0.25 + 0.5 * s.lit; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    for (const dx of [6, s.w - 6]) { ctx.beginPath(); ctx.moveTo(s.x + dx, F); ctx.lineTo(s.x + dx, this.top() - 10); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#1a1626'; ctx.fillRect(s.x, F, s.w, 16);
    // the slab
    if (s.lit > 0) { ctx.save(); ctx.globalAlpha = 0.5 * s.lit; ctx.fillStyle = sp.glow; rr(s.x - 8, s.y - 8, s.w + 16, s.h + 16, 10); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#8e88b0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(s.x, s.y, s.w, s.h, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b8b2d8'; ctx.fillRect(s.x + 4, s.y + 3, s.w - 8, 3);
    if (s.y < F - 24) { ctx.fillStyle = '#8e88b0'; rr(s.x, s.y - 30, 10, 32, 3); ctx.fill(); ctx.stroke(); }
    // the portcullis (it rises into the ceiling once the lever is pulled)
    const up = w.off ? Math.min(1, (g.rise = Math.min(1, g.rise + 0.03))) : 0, y0 = w.y0 - up * 260;
    ctx.fillStyle = WIZEXAM_C.wallDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(w.x0, y0, w.x1 - w.x0, w.y1 - w.y0); ctx.strokeRect(w.x0, y0, w.x1 - w.x0, w.y1 - w.y0);
    ctx.strokeStyle = '#5a5470'; ctx.lineWidth = 4; for (let x = w.x0 + 10; x < w.x1; x += 15) { ctx.beginPath(); ctx.moveTo(x, y0 + 4); ctx.lineTo(x, y0 + (w.y1 - w.y0) - 4); ctx.stroke(); }
    for (let y = y0 + 30; y < y0 + (w.y1 - w.y0); y += 50) { ctx.beginPath(); ctx.moveTo(w.x0 + 3, y); ctx.lineTo(w.x1 - 3, y); ctx.stroke(); }
    wizExDrawLever(g.lever.x, F, g.lever.pulled, t);
    // the lifter's focus
    if (g.ids && (g.held || g.focus < 1)) { const p = G.players[g.ids[0]]; wizExDrawFocus(p.x + p.w / 2 + st.cam.x, p.y + st.cam.y - 30, g.focus, g.tired); }
  },
};

const WIZEX_GLOW = {
  key: 'glow', spell: 'glow', w: 900, say: 'GLOW, dears! It\'s pitch dark in there!',
  jobs: ['Light!', 'Climb!'], words: ['glow', 'pull'], legend: ['hold: glow, up raises it', 'climb in the light, pull'], goldText: 'the light is bigger',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.dark = [x + 120, x + 770];
    g.step = { x0: x + 330, x1: x + 430, y0: F - 85, y1: F - 71, one: true, kind: 'shelf' };
    g.ledge = { x0: x + 380, x1: x + 580, y0: F - 165, y1: F - 151, one: true, kind: 'shelf' };
    g.lever = { x: x + 480, y: F - 165, pulled: false };
    g.gate = { x0: x + 650, x1: x + 666, y0: WIZEXAM.ceil, y1: F, kind: 'gate' };
    g.base = [{ x0: x - 40, y0: F, x1: x + g.w + 40, y1: F + 300 }, g.step, g.ledge];
    g.on = false; g.raise = 0; g.shadows = []; g.spawnT = 3; g.grab = [0, 0]; g.rise = 0;
  },
  solids(g) { const S = g.base.slice(); if (!g.gate.off) S.push(g.gate); return S; },
  reset(g) { g.shadows = []; g.raise = 0; g.grab = [0, 0]; },
  finish(g) { g.shadows = []; g.on = false; },
  open: g => g.lever.pulled,
  R: g => WIZGLOW.r * (g.gold ? WIZGLOW.goldK : 1),
  center(g, ox = 0, oy = 0) { const p = G.players[g.ids[0]]; return { x: p.x + ox + p.w / 2 + (p.face || 1) * 12, y: p.y + oy + p.h / 2 - 4 - g.raise }; },
  inDark: (g, p) => wizExCx(p) > g.dark[0] && wizExCx(p) < g.dark[1] && !g.lever.pulled,
  lit(g, p) {
    if (!this.inDark(g, p)) return true;
    if (!g.on) return false;
    const c = this.center(g);
    return Math.hypot(wizExCx(p) - c.x, p.y + p.h / 2 - c.y) < this.R(g) * 0.92;
  },
  step(st, g, dt, A, B) {
    const K = WIZGLOW, F = WIZEXAM.floor;
    const on = !!A.input.act;
    if (on && !g.on) Sfx.play('wizSpell_glow');
    g.on = on;
    const want = on ? (wizUp(A) ? K.raise : A.input.down ? 0 : g.raise) : 0;
    g.raise = approach(g.raise, want, K.raiseV * dt);
    A.pendingAct = false;
    for (const k of [0, 1]) g.grab[k] = Math.max(0, g.grab[k] - dt);
    const lit = this.lit(g, B);
    g.bLit = lit;
    const S = g.prev.concat(this.solids(g));
    const grabbed = (q, d, fn) => { if (g.grab[q.id] > 0) { const real = q.input; q.input = NO_INPUT; q.pendingJump = false; try { control(q, d); } finally { q.input = real; } } else fn(q, d); };
    wizBody(A, dt, S, { ctl: (q, d) => grabbed(q, d, WIZEX_NOJUMP) });
    wizBody(B, dt, S, { ctl: (q, d) => grabbed(q, d, (q2, d2) => { if (lit) control(q2, d2); else { WIZEX_NOJUMP(q2, d2); q2.vx = clamp(q2.vx, -K.creep, K.creep); } }) });
    if (B.pendingAct || A.pendingAct) {
      for (const p of [A, B]) if (p.pendingAct && !g.lever.pulled && Math.abs(wizExCx(p) - g.lever.x) < 22 && Math.abs(wizExFeet(p) - g.lever.y) < 4 && p.grounded) {
        g.lever.pulled = true; g.gate.off = true; Sfx.play('wizGlowLever'); Sfx.play('wizGlowGate');
        wizPop(st, g.lever.x, g.lever.y - 50, 'Clunk! The gate opens!', '#ffd23f', 16);
      }
      A.pendingAct = B.pendingAct = false;
    }
    // ink shadows creep in from the dark toward whoever is outside the light
    if (!g.lever.pulled && (g.spawnT -= dt) <= 0) { g.spawnT = 4.5; g.shadows.push({ x: Math.max(g.dark[0], st.cam.x) + 10, y: F - 12, vx: 0, t: 0, eye: Math.random() * 6 }); }
    const c = this.center(g), R = this.R(g);
    for (const s of g.shadows) {
      s.t += dt;
      if (s.die != null) { s.die -= dt; continue; }
      let tgt = null, bd = 1e9;
      for (const p of [A, B]) if (!this.lit(g, p) && wizExFeet(p) > F - 22) { const d = Math.abs(wizExCx(p) - s.x); if (d < bd) { bd = d; tgt = p; } }
      s.vx = approach(s.vx, tgt ? Math.sign(wizExCx(tgt) - s.x) * K.shadow.v : 0, 300 * dt);
      s.x += s.vx * dt;
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (g.on && d < R * 0.5) { s.die = 0.4; puff(s.x, s.y, 6, 'rgba(30,20,50,0.8)'); Sfx.play('wizGlowPlink'); continue; }
      if (g.on && d < R * K.shadow.repel) s.x += Math.sign(s.x - c.x || -1) * K.shadow.push * dt;
      for (const p of [A, B]) if (s.die == null && g.grab[p.id] <= 0 && !this.lit(g, p) && Math.abs(wizExCx(p) - s.x) < 18 && wizExFeet(p) > s.y - 10) {
        g.grab[p.id] = K.grab.t; s.die = 0.4; Sfx.play('wizGlowGrab'); wizPop(st, wizExCx(p), p.y - 20, 'Grabbed! Wriggle...', '#c8b8ff', 14);
      }
      if (s.t > 14) s.die = 0.4;
    }
    g.shadows = g.shadows.filter(s => s.die == null || s.die > 0);
  },
  plan(st, g, A, B) {
    if (g.lever.pulled) return wizExGoOn(g);
    const bx = wizExCx(B), lit = this.lit(g, B), ground = B.grounded ? B.ground : null;
    let PB, spot = bx;
    if (ground === g.ledge) { spot = g.lever.x; PB = { why: 'pull', x: spot, tap: Math.abs(bx - spot) < 18 ? 'act' : null, say: 'Pull the lever: ' + wizExKey(B.id, 'act') }; }
    else if (!lit && B.grounded) PB = ground === g.step ? { why: 'dark', x: bx, say: 'Wait for the light!' } : { why: 'dark', x: this.center(g).x, say: 'Creep into the light!' };
    else if (ground === g.step) { spot = g.step.x0 + 75; PB = { why: 'climb', x: spot, jump: Math.abs(bx - spot) < 16, say: 'Jump up to the top shelf: ' + wizExKey(B.id, 'jump') }; }
    else if (B.grounded) { spot = (g.step.x0 + g.step.x1) / 2; PB = { why: 'climb', x: spot, dead: 20, jump: bx > g.step.x0 + 14 && bx < g.step.x1 - 14, say: 'Jump up the shelves in the light: ' + wizExKey(B.id, 'jump') }; }
    else PB = { why: 'air', x: bx };
    // the LIGHT goes under the climber's next spot (or to them, in the dark) and raises the light to their height
    const tx = !lit && !(ground && ground.one) ? bx - 12 : (B.grounded ? spot : bx) - 12;
    const PA = { why: 'light', x: clamp(tx, g.x + 40, g.gate.x0 - 30), hold: true, say: 'Hold ' + wizExKey(A.id, 'act') + ' to glow, ' + wizExKey(A.id, 'up') + ' raises the light!' };
    const want = clamp((A.y + A.h / 2 - 4) - (B.y + B.h / 2), 0, WIZGLOW.raise);
    if (g.raise < want - 10) PA.up = true; else if (g.raise > want + 10) PA.down = true;
    return [PA, PB];
  },
  hide: () => [false, false],
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, gt = g.gate;
    for (const s of [g.step, g.ledge]) { ctx.fillStyle = WIZC.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(s.x0, s.y0, s.x1 - s.x0, 12, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = WIZC.woodDk; ctx.fillRect(s.x0 + 8, s.y0 + 12, 6, 14); ctx.fillRect(s.x1 - 14, s.y0 + 12, 6, 14); }
    wizExDrawLever(g.lever.x, g.lever.y, g.lever.pulled, t);
    const up = gt.off ? (g.rise = Math.min(1, g.rise + 0.03)) : 0, y0 = gt.y0 - up * 400;
    ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 5; for (let x = gt.x0 + 2; x <= gt.x1; x += 7) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + (gt.y1 - gt.y0)); ctx.stroke(); }
  },
  drawTop(st, g) {
    if (!g.ids || g.lever.pulled && g.rise >= 1) return;
    const F = WIZEXAM.floor, t = G.clock, cs = this.center(g, st.cam.x, st.cam.y), R = this.R(g);
    // the dark stretch: pitch black but the light (players are in screen coords between ticks: cs is world coords)
    const fade = g.lever.pulled ? 1 - g.rise : 1;
    wizExDark(st, g.dark[0], g.dark[1], g.on ? [{ x: cs.x, y: cs.y, r: R }] : [], 0.97 * fade, [G.players[g.ids[0]]]);
    if (g.on) { ctx.save(); ctx.globalAlpha = 0.1 * fade; ctx.fillStyle = '#ffe9a0'; circle(cs.x, cs.y, R * 0.9); ctx.fill(); ctx.restore(); }
    const fd = G.players[g.ids[1]];
    if (!g.bLit && this.inDark(g, { x: fd.x + st.cam.x, w: fd.w })) { ctx.save(); ctx.strokeStyle = 'rgba(200,190,255,0.35)'; ctx.lineWidth = 2; rr(fd.x + st.cam.x, fd.y + st.cam.y, fd.w, fd.h, 6); ctx.stroke(); ctx.restore(); }
    if (!g.lever.pulled) { ctx.fillStyle = 'rgba(255,220,120,' + (0.4 + 0.3 * Math.sin(t * 5)) + ')'; circle(g.lever.x - 14, g.lever.y - 30, 2.5); ctx.fill(); }
    for (const s of g.shadows) wizExDrawShadow(s, t);
    void F;
  },
};

const WIZEX_SIZE = {
  key: 'size', spell: 'size', w: 820, say: 'SHRINK, dears! Through the keyhole!',
  jobs: ['Zap!', 'Shrink!'], words: ['zap', 'pull'], legend: ['down arms Shrink, then zap', 'tiny: through the keyhole'], goldText: 'sizes last longer',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.door = { x0: x + 430, x1: x + 480 };
    g.top = { x0: x + 430, y0: WIZEXAM.ceil, x1: x + 480, y1: F - 40, kind: 'door' };
    g.sill = { x0: x + 430, y0: F - 28, x1: x + 480, y1: F, kind: 'door' };
    g.plug = { x0: x + 430, y0: F - 40, x1: x + 480, y1: F - 28, kind: 'plug' };
    g.stepR = { x0: x + 398, y0: F - 28, x1: x + 430, y1: F, kind: 'doorstep' };
    g.lever = { x: x + 600, pulled: false };
    g.base = [{ x0: x - 40, y0: F, x1: x + g.w + 40, y1: F + 300 }, g.stepR];
    g.sub = { zap: 0, siz: 1, size: 'normal', armed: null, armT: 0, sizeT: 0, bellT: 0, carry: false, gold: false, solids: [] };
    g.edge = {}; g.swing = 0;
  },
  solids(g, size = 'normal') { const S = g.base.slice(); if (!g.lever.pulled) { S.push(g.top, g.sill); if (size !== 'tiny') S.push(g.plug); } return S; },
  reset(g) { Object.assign(g.sub, { size: 'normal', armed: null, armT: 0, sizeT: 0 }); },
  finish(g) { this.reset(g); },
  open: g => g.lever.pulled,
  step(st, g, dt, A, B) {
    const K = WIZSIZE, sub = g.sub, F = WIZEXAM.floor;
    sub.zap = A.id; sub.siz = B.id; sub.gold = !!g.gold;
    if (wizExEdge(g.edge, A, 'up')) { sub.armed = 'grow'; sub.armT = K.arm; Sfx.play('wizSizeArm'); }
    if (wizExEdge(g.edge, A, 'down')) { sub.armed = 'shrink'; sub.armT = K.arm; Sfx.play('wizSizeArm'); }
    if (sub.armed && (sub.armT -= dt) <= 0) sub.armed = null;
    const solFor = size => g.prev.concat(this.solids(g, size));
    sub.solids = solFor(sub.size);
    if (A.pendingAct) wizExWith(st, sub, () => wizSizeZap(st));
    A.pendingAct = false;
    // the size runs out (a tiny one inside the keyhole keeps its size until there is room)
    if (sub.size !== 'normal') {
      const was = sub.sizeT;
      sub.sizeT = Math.max(0, was - dt);
      if (sub.sizeT <= K.bell && Math.ceil(sub.sizeT) !== Math.ceil(was) && sub.sizeT > 0) Sfx.play('wizSizeTick');
      if (sub.sizeT <= 0) { sub.solids = solFor('normal'); if (wizExWith(st, sub, () => wizSizeFits(st, B, 'normal')) != null) wizExWith(st, sub, () => wizSizeSet(st, 'normal')); }
    }
    wizBody(A, dt, solFor('normal'), g.lever.pulled ? {} : { ctl: WIZEX_NOJUMPDOWN });
    sub.solids = solFor(sub.size);
    wizExWith(st, sub, () => wizSizeMove(st, B, dt, sub.size));
    if (B.pendingAct && !g.lever.pulled && Math.abs(wizExCx(B) - g.lever.x) < 22 && B.grounded && wizExFeet(B) > F - 2) {
      g.lever.pulled = true; Sfx.play('wizSizeLever'); Sfx.play('wizDoor'); g.swing = 0;
      wizPop(st, g.lever.x, F - 60, 'Click! The door unlocks!', '#ffd23f', 16); wizSparks(g.door.x0 + 25, F - 60, 'size', 12);
    }
    B.pendingAct = false;
  },
  plan(st, g, A, B) {
    const sub = g.sub, ax = wizExCx(A), bx = wizExCx(B);
    const near = Math.hypot(bx - ax, (B.y + B.h / 2) - (A.y + A.h / 2)) < WIZSIZE.range - 30;
    const zap = want => (sub.armed === want ? { tap: 'act' } : want === 'shrink' ? { downTap: true } : want === 'grow' ? { upTap: true } : sub.armed ? {} : { tap: 'act' });
    if (g.lever.pulled) {
      const [PA, PB] = wizExGoOn(g);
      if (sub.size !== 'normal' && near && bx > g.door.x1 + 4) Object.assign(PA, zap('normal'), { x: ax });
      return [PA, PB];
    }
    if (sub.size === 'tiny') {
      const PB = bx < g.door.x1 + 6 ? { why: 'keyhole', x: g.door.x1 + 40, hop: true, say: 'You\'re tiny! Hop up and through the keyhole!' }
        : { why: 'pull', x: g.lever.x, tap: Math.abs(bx - g.lever.x) < 18 && B.grounded ? 'act' : null, say: 'Pull the little lever: ' + wizExKey(B.id, 'act') };
      const PA = { why: 'wait', x: g.x + 300 };
      if (sub.sizeT < 3 && bx < g.door.x0 - 4 && near) Object.assign(PA, zap('shrink'));
      return [PA, PB];
    }
    const PB = { why: 'wait', x: g.x + 340 };
    const PA = { why: 'zap', x: g.x + 300, say: 'Press ' + wizExKey(A.id, 'down') + ' to arm Shrink, then zap: ' + wizExKey(A.id, 'act') };
    if (near) Object.assign(PA, zap(sub.size === 'giant' ? 'normal' : 'shrink'));
    return [PA, PB];
  },
  hide(g) { const h = [false, false]; if (g.ids && g.sub.size !== 'normal') h[g.ids[1]] = true; return h; },
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, d = g.door, sp = WIZ_SPELLS.size;
    if (!g.lever.pulled || g.swing < 1) {
      const k = g.lever.pulled ? (g.swing = Math.min(1, g.swing + 0.04)) : 0;
      ctx.save(); ctx.translate(d.x0, 0); ctx.scale(1 - k * 0.85, 1);
      ctx.fillStyle = '#7a4a2a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(0, WIZEXAM.ceil, d.x1 - d.x0, F - WIZEXAM.ceil); ctx.strokeRect(0, WIZEXAM.ceil, d.x1 - d.x0, F - WIZEXAM.ceil);
      ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 2; for (let y = WIZEXAM.ceil + 40; y < F; y += 60) { ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(d.x1 - d.x0 - 4, y); ctx.stroke(); }
      ctx.fillStyle = '#d9a441'; circle(25, F - 160, 14); ctx.fill(); ctx.stroke();
      // the keyhole (a tiny one fits through its slot)
      ctx.fillStyle = '#0c0814'; circle(25, F - 52, 9); ctx.fill(); ctx.beginPath(); ctx.moveTo(17, F - 40); ctx.lineTo(33, F - 40); ctx.lineTo(29, F - 52); ctx.lineTo(21, F - 52); ctx.fill(); ctx.fillRect(0, F - 40, d.x1 - d.x0, 12);
      if (!g.lever.pulled) { ctx.save(); ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 4); ctx.strokeStyle = sp.col; ctx.lineWidth = 2; ctx.strokeRect(-2, F - 42, d.x1 - d.x0 + 4, 16); ctx.restore(); }
      ctx.restore();
    }
    const s = g.stepR; ctx.fillStyle = WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, 3); ctx.fill(); ctx.stroke();
    // the little lever behind the door
    const lx = g.lever.x; ctx.fillStyle = WIZC.woodDk; ctx.fillRect(lx - 4, F - 18, 8, 18); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, F - 16); ctx.lineTo(lx + (g.lever.pulled ? 12 : -12), F - 32); ctx.stroke(); ctx.fillStyle = sp.col; circle(lx + (g.lever.pulled ? 12 : -12), F - 32, 4); ctx.fill();
    if (!g.ids) return;
    const sub = g.sub, z = G.players[g.ids[0]], zx = z.x + z.w / 2 + st.cam.x, zy = z.y + st.cam.y;
    if (sub.armed) { const up = sub.armed === 'grow'; ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); const ay = zy - 30; if (up) { ctx.moveTo(zx, ay - 12); ctx.lineTo(zx + 9, ay); ctx.lineTo(zx - 9, ay); } else { ctx.moveTo(zx, ay + 4); ctx.lineTo(zx + 9, ay - 8); ctx.lineTo(zx - 9, ay - 8); } ctx.closePath(); ctx.fill(); ctx.stroke(); text(up ? 'GROW' : 'SHRINK', zx, ay - 20, 11, '#ffffff', 'center', 'body'); }
    if (sub.size !== 'normal') {
      const p = G.players[g.ids[1]], x = p.x + p.w / 2 + st.cam.x, y = p.y + p.h + st.cam.y;
      wizDrawHero(p.id, x, y, { s: WIZSIZE.box[sub.size][1] / 26, face: p.face || 1 });
      const k = clamp(sub.sizeT / (g.gold ? WIZSIZE.goldLife : WIZSIZE.life), 0, 1), r = sub.size === 'tiny' ? 12 : 44;
      ctx.save(); ctx.strokeStyle = sub.sizeT < WIZSIZE.bell && Math.sin(t * 14) > 0 ? '#ff5f6d' : sp.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - (sub.size === 'tiny' ? 5 : 32), r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  },
};

const WIZEX_MORPH = {
  key: 'morph', spell: 'morph', w: 1150, say: 'MORPH, dears! A frog for the hedge!',
  jobs: ['Morph!', 'Shift!'], words: ['morph', 'pull'], legend: ['up / down: the shape, then cast', 'frog jumps, fish swims, pull'], goldText: 'the right shape blinks gold',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.hedge = { x0: x + 330, x1: x + 360, y0: F - 190, y1: F, kind: 'hedge' };
    g.pad0 = { x0: x + 430, x1: x + 482 }; g.rope0 = x + 505;
    g.moat = { x0: x + 640, x1: x + 900 };
    g.bridge = { x0: x + 640, y0: F, x1: x + 900, y1: F + 14, kind: 'bridge', off: true };
    g.pad1 = { x0: x + 930, x1: x + 982 }; g.rope1 = x + 1005;
    g.base = [{ x0: x - 40, y0: F, x1: g.moat.x0, y1: F + 300 }, { x0: g.moat.x1, y0: F, x1: x + g.w + 40, y1: F + 300 }, { x0: g.moat.x0, y0: F + 120, x1: g.moat.x1, y1: F + 160 }];
    g.part = 0; g.wrong = 0;
    g.sub = { shape: 'plain', pools: [g.moat], shSolids: [], dashT: 0, flopT: 0, float: 0, batY: null, cast: 0, shift: 1, dial: 0, morphT: 0, gold: false };
    g.edge = {};
  },
  solids(g) { const S = g.base.slice(); if (!g.hedge.off) S.push(g.hedge); if (!g.bridge.off) S.push(g.bridge); return S; },
  reset(g) { Object.assign(g.sub, { shape: 'plain', float: 0, batY: null }); },
  finish(g) { this.reset(g); g.bridge.off = false; },
  open: g => !g.bridge.off,
  // [caster, shifter] now: the first job casts at the hedge, then they swap for the moat
  who(g, A, B) { return g.part ? [B, A] : [A, B]; },
  step(st, g, dt, A, B) {
    const sub = g.sub, F = WIZEXAM.floor, [ca, sh] = this.who(g, A, B);
    sub.cast = ca.id; sub.shift = sh.id; sub.gold = !!g.gold;
    sub.morphT = Math.max(0, sub.morphT - dt);
    if (wizExEdge(g.edge, ca, 'up')) { sub.dial = (sub.dial + 2) % 3; Sfx.play('wizMorphDial'); }
    if (wizExEdge(g.edge, ca, 'down')) { sub.dial = (sub.dial + 1) % 3; Sfx.play('wizMorphDial'); }
    if (ca.pendingAct) wizExWith(st, sub, () => wizMorphCast(st));
    ca.pendingAct = false;
    const S = g.prev.concat(this.solids(g));
    wizBody(ca, dt, S, { ctl: WIZEX_NOJUMPDOWN });
    sub.shSolids = S;
    wizExWith(st, sub, () => wizMorphBody(st, sh, dt));
    const scx = wizExCx(sh), inMoat = x => x > g.moat.x0 && x < g.moat.x1;
    // a bat won't fly over water
    if (sub.shape === 'bat' && inMoat(scx)) { wizExWith(st, sub, () => wizMorphSet(st, 'plain')); wizPop(st, scx, sh.y - 20, 'Bats hate water! Plop!', '#d8c8ff', 14); }
    // the round plain pad turns them back
    const pad = g.part ? g.pad1 : g.pad0;
    if (sub.shape !== 'plain' && sh.grounded && scx > pad.x0 && scx < pad.x1) { wizExWith(st, sub, () => wizMorphSet(st, 'plain')); puff(scx, sh.y + sh.h / 2, 8, 'rgba(255,143,208,0.8)'); }
    // the moat: only a fish swims (three wrong goes are an Oops)
    for (const p of [ca, sh]) {
      if (!inMoat(wizExCx(p)) || wizExFeet(p) < F + 18 || (p === sh && sub.shape === 'fish')) continue;
      g.wrong++; wizStats(st).wrong = (wizStats(st).wrong || 0) + 1; Sfx.play('wizMorphGlub');
      if (p === sh) wizExWith(st, sub, () => wizMorphSet(st, 'plain'));
      const back = g.moat.x0 - 70 - (p === ca ? 40 : 0);
      if (g.wrong % 3 === 0) wizExFell(st, p, 'Glub! Oops!', back);
      else { wizPop(st, wizExCx(p), F - 30, p === sh && sub.shape !== 'plain' ? 'Glub! Wrong animal!' : 'Glub!', '#bfe0ff', 18); Object.assign(p, { x: back - p.w / 2, y: F - p.h - 2, vx: 0, vy: -200, grounded: false }); }
    }
    // the ropes
    if (sh.pendingAct && sub.shape === 'plain' && sh.grounded) {
      if (g.part === 0 && !g.hedge.off && Math.abs(scx - g.rope0) < 24) { g.hedge.off = true; Sfx.play('wizMorphRope'); Sfx.play('wizDoor'); wizPop(st, g.hedge.x0 + 15, F - 210, 'The hedge gate swings open!', '#ffd23f', 16); }
      if (g.part === 1 && g.bridge.off && Math.abs(scx - g.rope1) < 24) { g.bridge.off = false; Sfx.play('wizMorphRope'); Sfx.play('wizDoor'); wizPop(st, (g.moat.x0 + g.moat.x1) / 2, F - 60, 'Down comes the drawbridge!', '#ffd23f', 16); }
    }
    sh.pendingAct = false;
    // the swap, once both are through the hedge
    if (g.part === 0 && g.hedge.off && [A, B].every(p => wizExCx(p) > g.hedge.x1 + 10)) {
      g.part = 1; wizSwap(st); wizNews(st, 'Swap! Now a FISH for the moat!', false, 2.6);
      wizHint(st, B.id, 'Turn your partner into a fish: ' + wizExKey(B.id, 'up') + ' ' + wizExKey(B.id, 'down') + ' and ' + wizExKey(B.id, 'act'), { cpu: 'Fish time!' });
    }
  },
  plan(st, g, A, B) {
    const sub = g.sub, F = WIZEXAM.floor, [ca, sh] = this.who(g, A, B), sx = wizExCx(sh);
    const near = Math.hypot(sx - wizExCx(ca), sh.y - ca.y) < WIZMORPH.range - 20;
    const dialTo = want => { const i = WIZMORPH.shapes.indexOf(want); return sub.dial === i ? null : (i - sub.dial + 3) % 3 === 1 ? { downTap: true } : { upTap: true }; };
    const cast = (want, ok) => { if (!ok || sub.shape === want) return {}; return dialTo(want) || (sub.morphT <= 0 ? { tap: 'act' } : {}); };
    const say = (w) => 'Turn your partner into a ' + w + ': ' + wizExKey(ca.id, 'up') + ' / ' + wizExKey(ca.id, 'down') + ' picks, ' + wizExKey(ca.id, 'act') + ' casts';
    if (g.part === 0) {
      const hx = g.hedge.x0, jx = hx - 100, padC = (g.pad0.x0 + g.pad0.x1) / 2;
      if (g.hedge.off) return [{ why: 'go', x: g.hedge.x1 + 50 }, { why: 'go', x: g.hedge.x1 + 90 }];
      let PS, PC;
      if (sx > g.hedge.x1) PS = sub.shape !== 'plain' ? { why: 'pad', x: padC } : { why: 'rope', x: g.rope0, tap: Math.abs(sx - g.rope0) < 20 && sh.grounded ? 'act' : null, say: 'Pull the rope: ' + wizExKey(sh.id, 'act') };
      else if (sub.shape === 'frog') {
        if (!sh.grounded) PS = { why: 'leap', x: padC };
        else if (Math.abs(sx - jx) < 10) PS = { why: 'leap', x: padC, jump: 'tap', right: true };
        else PS = { why: 'frog', x: jx, dead: 3, say: 'Froggy! A run-up, then jump the hedge: ' + wizExKey(sh.id, 'jump') };
      } else PS = { why: 'wait', x: hx - 120 };
      PC = sx > g.hedge.x1 ? { why: 'wait', x: hx - 60 } : Object.assign({ why: 'morph', x: hx - 190, say: say('frog') }, cast('frog', sx < hx && near));
      return [PC, PS];
    }
    const mx0 = g.moat.x0, mx1 = g.moat.x1;
    if (!g.bridge.off) return wizExGoOn(g);
    const inW = sx > mx0 && sx < mx1 && wizExFeet(sh) > F - 6;   // (a fish floats at the top)
    let PS;
    if (sx > mx1 + 4 && !inW) PS = sub.shape !== 'plain' ? { why: 'pad', x: (g.pad1.x0 + g.pad1.x1) / 2 } : { why: 'rope', x: g.rope1, tap: Math.abs(sx - g.rope1) < 20 && sh.grounded ? 'act' : null, say: 'Pull the drawbridge rope: ' + wizExKey(sh.id, 'act') };
    else if (sub.shape === 'fish') PS = inW ? { why: 'swim', x: mx1 + 80, up: sx > mx0 + 30, say: 'Swim across, ' + wizExKey(sh.id, 'up') + ' leaps out!' } : { why: 'flop', x: mx0 + 60 };
    else PS = { why: 'wait', x: mx0 - 40 };
    const PC = sx > mx1 ? { why: 'wait', x: mx0 - 60 } : Object.assign({ why: 'morph', x: mx0 - 110, say: say('fish') }, cast('fish', sx < mx0 + 4 && near));
    return [PS, PC];
  },
  hide(g) { const h = [false, false]; if (g.ids && g.sub.shape !== 'plain') h[g.sub.shift] = true; return h; },
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, sub = g.sub, hd = g.hedge, sp = WIZ_SPELLS.morph;
    // the moat (water, with the drawbridge)
    ctx.fillStyle = WIZMORPH_C.water; ctx.fillRect(g.moat.x0, F + 4, g.moat.x1 - g.moat.x0, 120);
    ctx.strokeStyle = WIZMORPH_C.waterTop; ctx.lineWidth = 2; ctx.beginPath(); for (let x = g.moat.x0; x <= g.moat.x1; x += 10) ctx.lineTo(x, F + 6 + Math.sin(t * 3 + x * 0.1) * 2); ctx.stroke();
    if (!g.bridge.off) { ctx.fillStyle = WIZMORPH_C.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(g.bridge.x0, F, g.bridge.x1 - g.bridge.x0, 14); ctx.strokeRect(g.bridge.x0, F, g.bridge.x1 - g.bridge.x0, 14); for (let x = g.bridge.x0 + 20; x < g.bridge.x1; x += 20) { ctx.beginPath(); ctx.moveTo(x, F); ctx.lineTo(x, F + 14); ctx.stroke(); } }
    else { ctx.save(); ctx.translate(g.moat.x1, F); ctx.rotate(-1.3); ctx.fillStyle = WIZMORPH_C.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(0, 0, 120, 12); ctx.strokeRect(0, 0, 120, 12); ctx.restore(); }
    // the hedge with its little gate
    ctx.fillStyle = WIZMORPH_C.hedge; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(hd.x0 - 6, hd.y0, hd.x1 - hd.x0 + 12, hd.y1 - hd.y0, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = WIZMORPH_C.hedgeDk; for (let y = hd.y0 + 16; y < hd.y1 - 10; y += 26) { circle(hd.x0 + 6, y, 6); ctx.fill(); circle(hd.x1 - 6, y + 12, 6); ctx.fill(); }
    if (hd.off) { ctx.fillStyle = '#1e3a22'; ctx.fillRect(hd.x0 - 2, F - 70, hd.x1 - hd.x0 + 4, 70); ctx.save(); ctx.translate(hd.x1 + 2, F - 70); ctx.scale(0.25, 1); ctx.fillStyle = WIZMORPH_C.wood; ctx.fillRect(0, 0, 34, 70); ctx.restore(); }
    else { ctx.fillStyle = WIZMORPH_C.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(hd.x0 - 2, F - 70, hd.x1 - hd.x0 + 4, 70); ctx.strokeRect(hd.x0 - 2, F - 70, hd.x1 - hd.x0 + 4, 70); }
    // pads and ropes
    for (const [pd, rx, on] of [[g.pad0, g.rope0, !hd.off], [g.pad1, g.rope1, g.bridge.off]]) {
      ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = sp.col; ctx.beginPath(); ctx.ellipse((pd.x0 + pd.x1) / 2, F - 2, (pd.x1 - pd.x0) / 2, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = WIZMORPH_C.rope; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, WIZEXAM.ceil + 10); ctx.lineTo(rx, F - (on ? 50 : 30)); ctx.stroke(); ctx.fillStyle = '#c96a5a'; circle(rx, F - (on ? 50 : 30), 6); ctx.fill();
    }
    if (!g.ids) return;
    // the shifter's animal, and the caster's dial
    const sh = G.players[sub.shift], ca = G.players[sub.cast];
    if (sub.shape !== 'plain') wizMorphDrawAnimal(sub.shape, sh.x + sh.w / 2 + st.cam.x, sh.y + sh.h + st.cam.y, sh.face || 1, sh.id === 0 ? '#ff9a3c' : '#5aa8ff', t, sub.float > 0);
    const bx = ca.x + ca.w / 2 + st.cam.x, by = ca.y + st.cam.y - 46;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(bx - 46, by - 20, 92, 34, 14); ctx.fill(); ctx.stroke();
    WIZMORPH.shapes.forEach((s, i) => {
      const x = bx - 30 + i * 30, sel = sub.dial === i, gold = g.gold && s === (g.part ? 'fish' : 'frog') && Math.sin(t * 8) > 0;
      if (sel || gold) { ctx.strokeStyle = gold ? C.gold : sp.dark; ctx.lineWidth = 2.5; circle(x, by - 3, 13); ctx.stroke(); }
      ctx.save(); ctx.globalAlpha = sel ? 1 : 0.45; wizMorphDrawAnimal(s, x, by + 8, 1, sp.col, t, false); ctx.restore();
    });
  },
};

const WIZEX_SHIELD = {
  key: 'shield', spell: 'shield', w: 900, say: 'SHIELD, dears! It\'s raining ink bolts!',
  jobs: ['Shield!', 'Zap!'], words: ['shield', 'zap'], legend: ['hold: bubble, up tilts it', 'up / down aims, zap the seals'], goldText: 'the bubble lasts longer',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.zone = [x + 150, x + 770];
    g.door = { x0: x + 780, x1: x + 806, y0: WIZEXAM.ceil, y1: F, kind: 'seals' };
    g.seals = [F - 20, F - 80, F - 140].map(y => ({ x: x + 778, y, hit: false }));
    g.spot = x + 464;
    g.base = [{ x0: x - 40, y0: F, x1: x + g.w + 40, y1: F + 300 }];
    Object.assign(g, { on: false, bar: 1, popped: false, tilt: 'fwd', aim: 3, restT: 0, bolts: [], rain: [], rainT: 1.2, knockAt: [-99, -99], edge: {}, swing: 0 });
  },
  solids(g) { const S = g.base.slice(); if (!this.open(g)) S.push(g.door); return S; },
  reset(g) { Object.assign(g, { bar: 1, popped: false, on: false, rain: [], bolts: [], rainT: 1.2 }); },
  finish(g) { g.rain = []; g.bolts = []; g.on = false; },
  open: g => g.seals.every(s => s.hit),
  c(A) { return { x: wizExCx(A), y: A.y + A.h / 2 - 6 }; },
  inB(g, A, p) { if (!g.on) return false; const c = this.c(A); return Math.hypot(wizExCx(p) - c.x, p.y + p.h / 2 - c.y) < WIZSH.r - 6; },
  mouth: B => ({ x: wizExCx(B) + 12, y: B.y + 6 }),
  pop(st, g, A) { const c = this.c(A); g.on = false; g.popped = true; g.bar = 0; wizPop(st, c.x, c.y - 60, 'Crack!', '#ffd23f', 20); Sfx.play('wizShCrack'); for (let i = 0; i < 10; i++) puff(c.x + Math.cos(i) * WIZSH.r, c.y + Math.sin(i) * WIZSH.r, 4, 'rgba(255,220,100,0.8)'); },
  knock(st, g, p) {
    const back = g.zone[0] - 60, other = g.knockAt[1 - p.id];
    g.knockAt[p.id] = st.phT; Sfx.play('wizShKnock');
    if (st.phT - other < WIZSH.both) { g.knockAt = [-99, -99]; wizExFell(st, p, 'Splat! Both of you. Oops!', back); return; }
    wizPop(st, wizExCx(p), p.y - 20, 'Splat! Back to the door.', '#c8b8ff', 15);
    Object.assign(p, { x: back - p.w / 2, y: WIZEXAM.floor - p.h - 2, vx: 0, vy: -220, grounded: false, inked: 1.5 });
  },
  step(st, g, dt, A, B) {
    const K = WIZSH, F = WIZEXAM.floor, drainT = K.drain * 1.6 * (g.gold ? 1.6 : 1);
    const want = !!A.input.act && !g.popped && !this.open(g);
    if (want && !g.on) Sfx.play('wizShUp');
    g.on = want;
    if (g.on) { g.bar -= dt / drainT; if (g.bar <= 0) this.pop(st, g, A); }
    else { g.bar = Math.min(1, g.bar + dt / K.refill); if (g.popped && g.bar >= 1) { g.popped = false; Sfx.play('wizShReady'); } }
    g.tilt = g.on && wizUp(A) ? 'up' : 'fwd';
    A.pendingAct = false;
    if (wizExEdge(g.edge, B, 'up')) { g.aim = Math.max(0, g.aim - 1); Sfx.play('wizShAim'); }
    if (wizExEdge(g.edge, B, 'down')) { g.aim = Math.min(4, g.aim + 1); Sfx.play('wizShAim'); }
    g.restT = Math.max(0, g.restT - dt);
    if (B.pendingAct && !this.open(g)) {
      const m = this.mouth(B);
      if (g.restT > 0) { /* resting */ }
      else if (!this.inB(g, A, B)) { wizPop(st, m.x, m.y - 20, 'Fizzle! Get in the bubble.', '#ffffff', 14); Sfx.play('wizShFizz'); g.restT = K.rest; }
      else { const a = Math.atan(K.aims[g.aim]); g.bolts.push({ x: m.x, y: m.y, vx: Math.cos(a) * K.bolt, vy: Math.sin(a) * K.bolt, t: 0 }); g.restT = K.rest; wizStats(st).bolts = (wizStats(st).bolts || 0) + 1; Sfx.play('wizShZap'); }
    }
    B.pendingAct = false;
    const S = g.prev.concat(this.solids(g));
    for (const p of [A, B]) { const slow = p === A && g.on ? 0.55 : 1; wizBody(p, dt, S, { ctl: (q, d) => { WIZEX_NOJUMPDOWN(q, d); const m = PHYS.maxRun * slow; q.vx = clamp(q.vx, -m, m); } }); }
    // ink drops from the ceiling (a ripple first), on whoever is in the hall
    const inZone = p => wizExCx(p) > g.zone[0] && wizExCx(p) < g.zone[1];
    if (!this.open(g) && (inZone(A) || inZone(B)) && (g.rainT -= dt) <= 0) {
      g.rainT = 1.15 * (g.gold ? 1.4 : 1) * (0.85 + Math.random() * 0.3);
      const ps = [A, B].filter(inZone), p = ps[Math.floor(Math.random() * ps.length)];
      g.rain.push({ x: clamp(wizExCx(p) + (Math.random() * 100 - 50), g.zone[0], g.zone[1]), y: WIZEXAM.ceil + 6, warn: K.warn, vy: 0 });
      Sfx.play('wizShWarn');
    }
    const c = this.c(A);
    for (const r of g.rain) {
      if (r.warn > 0) { r.warn -= dt; continue; }
      r.vy = Math.min(520, r.vy + 900 * dt); r.y += r.vy * dt;
      if (g.on && Math.hypot(r.x - c.x, r.y - c.y) < K.r) {
        const ang = Math.atan2(r.y - c.y, r.x - c.x), patch = g.tilt === 'up' && ang < -Math.PI / 4 && ang > -3 * Math.PI / 4;
        r.dead = true; wizStats(st).blocks = (wizStats(st).blocks || 0) + 1;
        if (patch) { Sfx.play('wizShBounce'); wizSparks(r.x, r.y, 'shield', 6); }
        else { g.bar -= K.hit; Sfx.play('wizShBlock'); if (g.bar <= 0) this.pop(st, g, A); }
        continue;
      }
      for (const p of [A, B]) if (!r.dead && r.x > p.x - 6 && r.x < p.x + p.w + 6 && r.y > p.y - 6 && r.y < p.y + p.h && !this.inB(g, A, p)) { r.dead = true; this.knock(st, g, p); }
      if (!r.dead && r.y > F) { r.dead = true; puff(r.x, F - 4, 6, 'rgba(30,24,50,0.85)'); Sfx.play('wizExSplat'); }
    }
    g.rain = g.rain.filter(r => !r.dead);
    // the zapper's bolts: into the seals
    for (const b of g.bolts) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
      for (const s of g.seals) if (!s.hit && !b.dead && Math.hypot(b.x - s.x, b.y - s.y) < K.gemR) {
        s.hit = true; b.dead = true; burst(s.x, s.y, '#ffc93c', 10); Sfx.play('wizShHit'); wizPop(st, s.x - 24, s.y - 24, 'Crack!', '#ffd23f', 16);
        if (this.open(g)) { Sfx.play('wizShFall'); Sfx.play('wizDoor'); wizPop(st, g.door.x0, F - 200, 'The seals break! The door opens!', '#ffd23f', 18); g.rain = []; }
      }
      if (!b.dead && b.x > g.door.x0 - 2) { b.dead = true; puff(b.x, b.y, 4, 'rgba(180,220,255,0.8)'); }
      if (b.t > 1.5 || b.y > F) b.dead = true;
    }
    g.bolts = g.bolts.filter(b => !b.dead);
  },
  plan(st, g, A, B) {
    if (this.open(g)) return wizExGoOn(g);
    const K = WIZSH, ax = wizExCx(A), bx = wizExCx(B), inB = this.inB(g, A, B), z0 = g.zone[0];
    const PA = { why: 'shield', x: g.spot - 34, hold: (ax > z0 - 70 || bx > z0 - 40) && !g.popped, say: 'Hold ' + wizExKey(A.id, 'act') + ' for the bubble, ' + wizExKey(A.id, 'up') + ' tilts it up to bounce the drops!' };
    PA.up = PA.hold;
    if (g.popped) Object.assign(PA, { x: Math.min(ax, z0 - 40), hold: false, up: false });
    let PB;
    if (!g.on && bx < z0 - 20) PB = { why: 'wait', x: z0 - 40 };
    else if (!inB) PB = { why: 'bubble', x: ax + 26, say: 'Stay in the bubble!' };
    else {
      PB = { why: 'zap', x: Math.min(g.spot, ax + 30), say: 'Aim with ' + wizExKey(B.id, 'up') + ' / ' + wizExKey(B.id, 'down') + ', zap the seals: ' + wizExKey(B.id, 'act') };
      const seal = g.seals.find(s => !s.hit), m = this.mouth(B);
      if (seal && Math.abs(bx - g.spot) < 50) {
        const dist = seal.x - m.x, slope = (seal.y - m.y) / dist;
        let best = 0; K.aims.forEach((a, i) => { if (Math.abs(a - slope) < Math.abs(K.aims[best] - slope)) best = i; });
        if (g.aim > best) PB.upTap = true; else if (g.aim < best) PB.downTap = true;
        else if (Math.abs(K.aims[best] - slope) * dist < 18 && g.restT <= 0) PB.tap = 'act';
      }
    }
    return [PA, PB];
  },
  hide: () => [false, false],
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, d = g.door, sp = WIZ_SPELLS.shield;
    const open = this.open(g), k = open ? (g.swing = Math.min(1, g.swing + 0.04)) : 0;
    if (k < 1) {
      ctx.save(); ctx.translate(d.x0, 0); ctx.scale(1 - k * 0.85, 1);
      ctx.fillStyle = '#5a4a3a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(0, d.y0, d.x1 - d.x0, d.y1 - d.y0); ctx.strokeRect(0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      ctx.restore();
    }
    for (const s of g.seals) {
      if (open && k >= 1) break;
      ctx.fillStyle = s.hit ? '#3a3040' : sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(s.x + 6, s.y, 13); ctx.fill(); ctx.stroke();
      if (!s.hit) { ctx.save(); ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 5 + s.y); ctx.strokeStyle = sp.col; ctx.lineWidth = 3; circle(s.x + 6, s.y, 19); ctx.stroke(); ctx.restore(); }
      else { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - 2, s.y - 8); ctx.lineTo(s.x + 8, s.y + 2); ctx.lineTo(s.x + 2, s.y + 9); ctx.stroke(); }
    }
    // ink drops: the ripple on the ceiling and the shadow on the floor, then the drop
    for (const r of g.rain) {
      if (r.warn > 0) { const a = 1 - r.warn / WIZSH.warn; ctx.fillStyle = 'rgba(20,18,30,' + (0.25 + 0.4 * a) + ')'; ctx.beginPath(); ctx.ellipse(r.x, F - 2, 10 + 10 * a, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(200,190,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, WIZEXAM.ceil + 6, 6 + 10 * a, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.moveTo(r.x, r.y - 22); ctx.quadraticCurveTo(r.x + 11, r.y, r.x, r.y + 9); ctx.quadraticCurveTo(r.x - 11, r.y, r.x, r.y - 22); ctx.fill(); ctx.fillStyle = WIZEXAM_C.inkSh; circle(r.x - 3, r.y - 2, 2.5); ctx.fill(); }
    }
    for (const b of g.bolts) { ctx.fillStyle = '#9ad8ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(b.x, b.y, 6); ctx.fill(); ctx.stroke(); }
    if (!g.ids) return;
    const A = G.players[g.ids[0]], B = G.players[g.ids[1]], cx = A.x + A.w / 2 + st.cam.x, cy = A.y + A.h / 2 - 6 + st.cam.y;
    if (g.on) {
      ctx.save(); ctx.globalAlpha = 0.22 + 0.1 * g.bar; ctx.fillStyle = sp.col; circle(cx, cy, WIZSH.r); ctx.fill(); ctx.restore();
      ctx.strokeStyle = sp.col; ctx.lineWidth = 2.5; circle(cx, cy, WIZSH.r); ctx.stroke();
      ctx.strokeStyle = sp.dark; ctx.lineWidth = 7; ctx.beginPath(); if (g.tilt === 'up') ctx.arc(cx, cy, WIZSH.r - 3, -3 * Math.PI / 4, -Math.PI / 4); else ctx.arc(cx, cy, WIZSH.r - 3, -Math.PI / 6, Math.PI / 6); ctx.stroke();
    }
    wizExDrawFocus(cx, A.y + st.cam.y - 30, g.bar, g.popped, sp.col);
    // the zapper's aim line
    const mx = B.x + B.w / 2 + 12 + st.cam.x, my = B.y + 6 + st.cam.y, a = Math.atan(WIZSH.aims[g.aim]);
    ctx.save(); ctx.strokeStyle = 'rgba(154,216,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * 120, my + Math.sin(a) * 120); ctx.stroke(); ctx.restore();
    if (!open) { ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 4); ctx.strokeStyle = sp.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g.spot, F - 2, 28, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  },
};

const WIZEX_DOOR = {
  key: 'door', spell: 'door', w: 1000, say: 'DOOR, dears! The stairs are broken: draw a way up!',
  jobs: ['Draw!', 'Jump!'], words: ['door', 'pull'], legend: ['up / down picks a plate, stamp doors', 'walk through, pull the rope'], goldText: 'doors last longer',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.land = { x0: x + 520, x1: x + 860, y0: F - 170, y1: F, kind: 'landing' };
    g.plates = [{ x: x + 200, y: F }, { x: x + 330, y: F }, { x: x + 640, y: F - 170 }];
    g.ladder = x + 506; g.rope = x + 790; g.roped = false; g.drop = 0;
    // (rubble steps down the landing's far side: whoever drops off it can climb back up to the rope)
    g.rub = [{ x0: x + 860, x1: x + 910, y0: F - 115, y1: F, kind: 'rubble' }, { x0: x + 910, x1: x + 960, y0: F - 60, y1: F, kind: 'rubble' }];
    g.base = [{ x0: x - 40, y0: F, x1: x + g.w + 40, y1: F + 300 }, g.land, ...g.rub];
    Object.assign(g, { sel: null, inD: null, outD: null, inside: 0, edge: {}, saidNot: 0 });
  },
  solids(g) { return g.base; },
  reset(g) { g.inD = g.outD = null; },
  finish(g) { g.inD = g.outD = null; },
  open: g => g.roped,
  reach(g, A) { const cx = wizExCx(A), cy = A.y + A.h / 2; return g.plates.filter(q => Math.hypot(q.x - cx, q.y - 12 - cy) < WIZPO.reach + 10).sort((a, b) => a.x - b.x); },
  selQ(g, A, reach) { if (g.sel && reach.includes(g.sel)) return g.sel; let best = null, bd = 1e9; for (const q of reach) { const k = Math.hypot(q.x - wizExCx(A), (q.y - wizExFeet(A)) * 0.5); if (k < bd) { bd = k; best = q; } } return (g.sel = best); },
  onLadder(g, A) { return g.roped && Math.abs(wizExCx(A) - g.ladder) < 14 && wizExFeet(A) > g.land.y0 - 2 && wizExFeet(A) <= WIZEXAM.floor + 2; },
  stamp(st, g, A, life) {
    if (g.inD && g.outD) { g.inD = g.outD = null; Sfx.play('wizPoClear'); wizPop(st, wizExCx(A), A.y - 24, 'Wiped!', '#ffffff', 14); return; }
    const q = this.selQ(g, A, this.reach(g, A));
    if (!q) { wizPop(st, wizExCx(A), A.y - 24, 'No plate in reach!', '#ffffff', 14); return; }
    if (g.inD && g.inD.q === q) return;
    const door = { q, t: life };
    if (!g.inD) g.inD = door; else { g.outD = door; g.inD.t = life; }
    wizStats(st).doors = (wizStats(st).doors || 0) + 1; Sfx.play(g.outD ? 'wizPoOut' : 'wizPoIn'); wizSparks(q.x, q.y - 20, 'door', 10);
  },
  step(st, g, dt, A, B) {
    const K = WIZPO, F = WIZEXAM.floor, life = K.life * (g.gold ? 2 : 1);
    if (g.outD) { g.inD.t -= dt; if (g.inD.t <= 0) { g.inD = g.outD = null; Sfx.play('wizPoClear'); } }
    g.inside = Math.max(0, g.inside - dt); g.saidNot = Math.max(0, g.saidNot - dt);
    const onL = this.onLadder(g, A), up = wizUp(A), dn = !!A.input.down;
    const reach = this.reach(g, A), q0 = this.selQ(g, A, reach);
    const eu = wizExEdge(g.edge, A, 'up'), ed = wizExEdge(g.edge, A, 'down');
    if (!onL && reach.length) {
      const i = reach.indexOf(q0), n = reach.length;
      if (eu) { g.sel = reach[(i + n - 1) % n]; Sfx.play('wizPoTick'); }
      if (ed) { g.sel = reach[(i + 1) % n]; Sfx.play('wizPoTick'); }
    }
    if (A.pendingAct) this.stamp(st, g, A, life);
    A.pendingAct = false;
    const S = g.prev.concat(this.solids(g));
    if (onL && (up || dn)) {
      A.vx = 0; A.vy = 0; A.x = g.ladder - A.w / 2; A.y += (up ? -1 : 1) * K.climb * dt; A.grounded = false; A.ground = null;
      if (wizExFeet(A) <= g.land.y0) { A.y = g.land.y0 - A.h; A.x = g.land.x0 + 2; A.grounded = true; A.ground = g.land; }
      if (wizExFeet(A) > F) { A.y = F - A.h; A.grounded = true; }
    } else if (onL && !A.grounded && wizExFeet(A) < F - 2) { A.vx = 0; A.vy = 0; }
    else wizBody(A, dt, S, { ctl: WIZEX_NOJUMPDOWN });
    if (B.pendingAct && !g.roped && Math.abs(wizExCx(B) - g.rope) < 24 && B.grounded && B.ground === g.land) { g.roped = true; Sfx.play('wizPoRope'); wizPop(st, g.rope, g.land.y0 - 60, 'The ladder drops!', '#ffd23f', 16); }
    B.pendingAct = false;
    const vx0 = B.vx;
    wizBody(B, dt, S);
    if (g.inD && g.outD) for (const k of ['inD', 'outD']) { const q = g[k].q; if (Math.abs(wizExCx(A) - q.x) < 10 && Math.abs(wizExFeet(A) - q.y) < 4 && g.saidNot <= 0) { g.saidNot = 1.5; wizPop(st, q.x, q.y - 56, 'Not you, dear!', '#ffffff', 14); } }
    if (g.inD && g.outD && g.inside <= 0) {
      const q = g.inD.q;
      if (Math.abs(wizExCx(B) - q.x) < 10 && Math.abs(wizExFeet(B) - q.y) < 6) {
        const o = g.outD.q, v = vx0 || (B.face || 1) * 120;
        wizStats(st).trips = (wizStats(st).trips || 0) + 1; Sfx.play('wizPoWhoosh'); puff(wizExCx(B), B.y + B.h / 2, 8, 'rgba(111,108,255,0.8)');
        Object.assign(B, { x: o.x - B.w / 2 + (v >= 0 ? 14 : -14), y: o.y - B.h, vx: v, vy: 0, grounded: true, ground: null });
        g.inside = 0.5; puff(o.x, o.y - 20, 8, 'rgba(220,220,240,0.9)');
      }
    }
  },
  plan(st, g, A, B) {
    const onLand = p => p.grounded && p.ground === g.land, [, P1, P2] = g.plates, ax = wizExCx(A), bx = wizExCx(B), stand = g.x + 400;
    if (g.roped) {
      const PA = onLand(A) || ax > g.land.x1 ? { why: 'go', x: g.x + g.w + 20 } : this.onLadder(g, A) ? { why: 'climb', x: g.ladder, up: true, say: 'Climb the ladder: ' + wizExKey(A.id, 'up') } : { why: 'ladder', x: g.ladder, dead: 4, say: 'Climb the ladder: ' + wizExKey(A.id, 'up') };
      const PB = onLand(A) || ax > g.land.x1 ? { why: 'go', x: g.x + g.w + 56 } : { why: 'wait', x: g.land.x1 - 30 };
      return [PA, PB];
    }
    if (!onLand(B) && bx > g.land.x1 - 4) return [{ why: 'wait', x: stand }, { why: 'back', x: g.rope, hop: true, say: 'Climb back up the rubble to the rope!' }];
    if (onLand(B)) return [{ why: 'wait', x: stand }, { why: 'rope', x: g.rope, tap: Math.abs(bx - g.rope) < 18 ? 'act' : null, say: 'Pull the rope for the ladder: ' + wizExKey(B.id, 'act') }];
    const good = g.inD && g.outD && g.outD.q === P2 && g.inD.q !== P2;
    const PB = good ? { why: 'door', x: g.inD.q.x + (bx < g.inD.q.x ? 40 : -40), say: 'Walk into the IN door!' } : { why: 'wait', x: g.x + 260 };
    const PA = { why: 'draw', x: stand, say: wizExKey(A.id, 'up') + ' / ' + wizExKey(A.id, 'down') + ' picks a plate, ' + wizExKey(A.id, 'act') + ' stamps: IN down here, then OUT up top' };
    if (!good && Math.abs(ax - stand) < 30) {
      const reach = this.reach(g, A), sel = this.selQ(g, A, reach);
      const want = g.outD ? null : g.inD ? (g.inD.q === P2 ? null : P2) : P1;
      if (!want) PA.tap = 'act';
      else if (sel !== want && reach.includes(want)) Object.assign(PA, reach.indexOf(want) < reach.indexOf(sel) ? { upTap: true } : { downTap: true });
      else if (sel === want) PA.tap = 'act';
    }
    return [PA, PB];
  },
  hide: () => [false, false],
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, l = g.land, sp = WIZ_SPELLS.door;
    // the broken stair: a stone landing, rubble where the steps were
    ctx.fillStyle = WIZC.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(l.x0, l.y0, l.x1 - l.x0, l.y1 - l.y0); ctx.strokeRect(l.x0, l.y0, l.x1 - l.x0, l.y1 - l.y0);
    ctx.strokeStyle = WIZEXAM_C.wallDk; ctx.lineWidth = 1.5; for (let y = l.y0 + 28; y < F; y += 28) { ctx.beginPath(); ctx.moveTo(l.x0, y); ctx.lineTo(l.x1, y); ctx.stroke(); }
    ctx.fillStyle = WIZC.stone; for (const [dx, h] of [[-90, 20], [-60, 34], [-120, 12]]) { rr(l.x0 + dx, F - h, 34, h, 4); ctx.fill(); ctx.stroke(); }
    for (const r of g.rub) { ctx.fillStyle = WIZC.stone; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = WIZEXAM_C.wallDk; circle(r.x0 + 16, r.y0 + 18, 5); ctx.fill(); }
    // the ladder: up on the landing until the rope drops it
    const k = g.roped ? (g.drop = Math.min(1, g.drop + 0.05)) : 0, lx = g.ladder, top = l.y0 - 10, bot = top + (F - top) * k + (1 - k) * 30;
    ctx.strokeStyle = WIZC.wood; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx - 10, top); ctx.lineTo(lx - 10, bot); ctx.moveTo(lx + 10, top); ctx.lineTo(lx + 10, bot); ctx.stroke();
    ctx.lineWidth = 3; for (let y = top + 12; y < bot; y += 20) { ctx.beginPath(); ctx.moveTo(lx - 10, y); ctx.lineTo(lx + 10, y); ctx.stroke(); }
    ctx.strokeStyle = WIZMORPH_C.rope; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.rope, WIZEXAM.ceil + 10); ctx.lineTo(g.rope, l.y0 - (g.roped ? 30 : 50)); ctx.stroke(); ctx.fillStyle = '#c96a5a'; circle(g.rope, l.y0 - (g.roped ? 30 : 50), 6); ctx.fill();
    // the chalk plates, the ring, the doors
    for (const q of g.plates) { ctx.save(); ctx.globalAlpha = 0.75; ctx.strokeStyle = '#e8e4f8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); rr(q.x - 17, q.y - 50, 34, 50, 14); ctx.stroke(); ctx.restore(); }
    if (!g.roped && g.sel) { const q = g.sel; ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.strokeStyle = sp.col; ctx.lineWidth = 3; rr(q.x - 21, q.y - 54, 42, 56, 16); ctx.stroke(); ctx.restore(); }
    if (g.inD) wizPoDrawDoor(g.inD.q.x, g.inD.q.y, 'in', t, g.inD.t, false);
    if (g.outD) wizPoDrawDoor(g.outD.q.x, g.outD.q.y, 'out', t, g.outD.t, false);
  },
};

const WIZEX_BROOM = {
  key: 'broom', spell: 'zoom', w: 1950, say: 'ZOOM, dears! Out of the window, onto the broom!',
  jobs: ['Steer!', 'Kick!'], words: ['steer', 'kick'], legend: ['up climbs, down dives', 'kick: a steady beat'], goldText: 'the broom levels out by itself',
  build(g) {
    const x = g.x, F = WIZEXAM.floor;
    g.mountX = x + 200; g.endX = x + 1860;
    g.items = [
      { kind: 'ring', x: x + 330, y: F - 150 },
      { kind: 'curtain', x: x + 520, w: 56, bottom: F - 150 },
      { kind: 'ring', x: x + 730, y: F - 190 },
      { kind: 'pillar', x: x + 940, w: 56, top: F - 170 },
      { kind: 'ring', x: x + 1150, y: F - 160 },
      { kind: 'curtain', x: x + 1360, w: 56, bottom: F - 170 },
      { kind: 'ring', x: x + 1570, y: F - 180 },
      { kind: 'wall', x: x + 1760, w: 30, gap0: F - 270, gap1: F - 120 },
    ];
    g.base = [{ x0: x - 40, y0: F, x1: x + g.w + 40, y1: F + 300 }];
    g.sub = { x: g.mountX + 40, y: F - 110, v: 0, vy: 0, live: 0, sinceKick: 0, kickAnim: 0, grounded: false, spin: 0, grace: 0, hot: 0, kicks: [], t: 0, steer: 0, kick: 1, mode: 'mount', modeT: 0, swing: 0 };
    g.safe = { x: g.mountX + 40, y: F - 150 }; g.bonkN = 0; g.bonkAt = null; g.tow = 0;
  },
  solids(g) { return g.base; },
  reset(g) { const b = g.sub; Object.assign(b, { x: g.safe.x, y: g.safe.y, v: 0, vy: 0, live: 0, spin: 0, grace: 1.5, hot: 0, kicks: [] }); if (b.mode !== 'mount') b.mode = 'wait'; },
  finish() {},
  open: g => g.sub.mode === 'done',
  target(g) {
    const b = g.sub, F = WIZEXAM.floor, K = WIZBROOM.box;
    const o = g.items.find(q => q.kind !== 'ring' && q.x + q.w / 2 > b.x + K.x0 - 10);
    if (!o) return { y: F - 190 };
    if (o.kind === 'curtain') return { y: o.bottom + K.top + 22, o };
    if (o.kind === 'pillar') return { y: o.top - K.bot - 26, o };
    return { y: (o.gap0 + o.gap1) / 2 + (K.top - K.bot) / 2, o };
  },
  seat(g, A, B) {
    const b = g.sub;
    for (const [p, sx] of [[A, 24], [B, -26]]) Object.assign(p, { x: b.x + sx - p.w / 2, y: b.y - 2 - p.h, vx: 0, vy: 0 });
  },
  bonk(st, g) {
    const b = g.sub;
    if (!wizTeamOops(st, { word: 'Splat! Ink!', x: b.x, y: b.y - 40, kind: 'broom' })) return;
    b.spin = WIZBROOM.spinT; Sfx.play('wizBroomBonk');
    if (g.bonkAt === g.safe.x) g.bonkN++; else { g.bonkAt = g.safe.x; g.bonkN = 1; }
    wizExMissed(st);
  },
  step(st, g, dt, A, B) {
    const K = WIZBROOM, F = WIZEXAM.floor, b = g.sub;
    b.steer = A.id; b.kick = B.id; b.t += dt; b.modeT += dt;
    b.hot = Math.max(0, b.hot - dt); b.grace = Math.max(0, b.grace - dt); b.sinceKick += dt; b.kickAnim = Math.max(0, b.kickAnim - dt);
    if (b.mode === 'mount') {
      const S = g.prev.concat(this.solids(g));
      for (const p of [A, B]) { p.pendingAct = false; wizBody(p, dt, S); if (p.x + p.w > g.mountX + 60) { p.x = g.mountX + 60 - p.w; p.vx = Math.min(0, p.vx); } }
      if ([A, B].every(p => wizExCx(p) > g.mountX - 40)) {
        b.mode = 'wait'; b.modeT = 0; Sfx.play('wizWhoosh');
        wizHint(st, B.id, 'Kick to fly! ' + wizExKey(B.id, 'act') + ', a steady beat', { cpu: 'Hold on, here we go!' });
        wizHint(st, A.id, 'Steer: ' + wizExKey(A.id, 'up') + ' climbs, ' + wizExKey(A.id, 'down') + ' dives', { cpu: 'I\'ll steer!' });
      }
      return;
    }
    const kickP = B.pendingAct; B.pendingAct = false; A.pendingAct = false; A.pendingJump = false; B.pendingJump = false;
    if (b.mode === 'done') { this.seat(g, A, B); return; }
    if (b.spin > 0) {
      b.spin -= dt;
      if (b.spin <= 0) {
        Object.assign(b, { x: g.safe.x, y: g.safe.y, v: 150, vy: 0, live: 0.6, grace: K.graceT, grounded: false });
        if (g.bonkN >= K.towAfter) { const nr = g.items.find(o => o.kind === 'ring' && o.x > b.x + 20); g.tow = nr ? nr.x + 10 : b.x + 300; g.bonkN = 0; wizHelp(st, 'A gold tow! Thimblewick\'s teacup pulls you on.'); }
      }
      this.seat(g, A, B); return;
    }
    if (kickP && (b.mode === 'fly' || b.mode === 'wait')) { if (b.mode === 'wait') { b.mode = 'fly'; Sfx.play('wizSpell_zoom'); } wizExWith(st, b, () => wizBroomKick(st, B)); }
    if (b.mode === 'wait') { this.seat(g, A, B); return; }
    const KK = K.kick;
    if (b.live > 0) { b.live -= dt; b.v -= b.v * KK.dragLive * dt; } else b.v = Math.max(0, b.v - KK.dragDead * dt);
    const up = wizUp(A), down = !!A.input.down && !up;
    let want = up ? K.steer.up : down ? K.steer.down : 0;
    if (!up && !down && g.gold) want = clamp((this.target(g).y - b.y) * 1.6, -110, 110);
    if (b.live <= 0 && b.v < KK.droop) want = Math.max(want, K.steer.droopV);
    b.vy += (want - b.vy) * Math.min(1, K.steer.k * dt);
    b.x += b.v * dt; b.y += b.vy * dt;
    if (b.y < K.ceil + K.box.top) { b.y = K.ceil + K.box.top; b.vy = Math.max(0, b.vy); }
    if (b.y > F - 10) { b.y = F - 10; b.vy = 0; if (!b.grounded) { b.grounded = true; Sfx.play('wizBroomLand'); } b.v = Math.max(0, b.v - 260 * dt); if (b.v < 20 && b.sinceKick > 1.2) wizHint(st, B.id, 'Kick to fly again! ' + wizExKey(B.id, 'act'), { cpu: 'Up we go!', life: 1.5 }); }
    else if (b.grounded && b.vy < 0) b.grounded = false;
    if (g.tow && b.x < g.tow) b.grace = Math.max(b.grace, 0.3); else g.tow = 0;
    for (const o of g.items) {
      if (o.kind === 'ring') { if (!o.got && b.x > o.x) { o.got = true; g.safe = { x: o.x + 10, y: o.y }; Sfx.play('wizBroomRing'); b.v = Math.min(K.kick.vMax, b.v + K.ring.puff); } continue; }
      if (b.grace > 0) continue;
      const bx0 = b.x + K.box.x0, bx1 = b.x + K.box.x1, by0 = b.y - K.box.top, by1 = b.y + K.box.bot;
      if (bx1 < o.x - o.w / 2 || bx0 > o.x + o.w / 2) continue;
      if (o.kind === 'curtain' ? by0 < o.bottom : o.kind === 'pillar' ? by1 > o.top : (by0 < o.gap0 || by1 > o.gap1)) { this.bonk(st, g); break; }
    }
    if (b.x > g.endX) { b.mode = 'done'; Sfx.play('wizBroomLand'); }
    this.seat(g, A, B);
  },
  plan(st, g, A, B) {
    const b = g.sub;
    if (b.mode === 'mount') return [{ why: 'mount', x: g.mountX - 10 }, { why: 'mount', x: g.mountX + 20 }];
    const t = this.target(g), dy = b.y + b.vy * 0.2 - t.y;
    return [{ why: 'steer', y: t.y, up: dy > 10, down: dy < -10, say: wizExKey(A.id, 'up') + ' climbs, ' + wizExKey(A.id, 'down') + ' dives: under the ink, over the geysers!' },
      { why: 'kick', kick: b.mode === 'wait' || b.mode === 'fly', say: 'Kick! ' + wizExKey(B.id, 'act') + ', a steady beat' }];
  },
  hide(g) { return g.sub.mode === 'mount' ? [false, false] : [true, true]; },
  draw(st, g) {
    const F = WIZEXAM.floor, t = G.clock, b = g.sub;
    // the window they climb out of, then the courtyard: ink curtains from the gutters, ink geysers, the hall's window
    ctx.fillStyle = '#1a2a4a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(g.mountX - 40, F - 230, 120, 230, 50); ctx.fill(); ctx.stroke();
    for (const o of g.items) {
      if (o.kind === 'ring') { if (!o.got) wizExDrawRing(o.x, o.y, t); continue; }
      const x0 = o.x - o.w / 2;
      if (o.kind === 'curtain') { ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.moveTo(x0 - 6, 0); ctx.lineTo(x0 + o.w + 6, 0); for (let k = 0; k <= 4; k++) { const xx = x0 + o.w + 6 - k * (o.w + 12) / 4; ctx.lineTo(xx, o.bottom + Math.sin(t * 3 + k * 1.7) * 6 + (k % 2 ? 8 : 0)); } ctx.closePath(); ctx.fill(); ctx.fillStyle = WIZEXAM_C.inkSh; circle(x0 + 12, o.bottom - 30, 4); ctx.fill(); const dy = (t * 160 + o.x) % 160; circle(x0 + o.w / 2, o.bottom + dy, 5); ctx.fill(); }
      else if (o.kind === 'pillar') { ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.moveTo(x0, F); for (let k = 0; k <= 6; k++) ctx.lineTo(x0 + k * o.w / 6, o.top + Math.sin(t * 7 + k * 1.3) * 8 + (k % 2 ? 0 : 10)); ctx.lineTo(x0 + o.w, F); ctx.closePath(); ctx.fill(); ctx.fillStyle = WIZEXAM_C.inkHi; for (let k = 0; k < 3; k++) { circle(o.x + Math.sin(t * 5 + k) * 14, o.top - 10 - ((t * 120 + k * 30) % 60), 4); ctx.fill(); } }
      else { ctx.fillStyle = '#3a2a4a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(x0, 0, o.w + 400, o.gap0); ctx.fillRect(x0, o.gap1, o.w + 400, F - o.gap1); ctx.strokeRect(x0, -4, o.w, o.gap0 + 4); ctx.strokeRect(x0, o.gap1, o.w, F - o.gap1); ctx.fillStyle = 'rgba(255,233,168,0.18)'; ctx.fillRect(x0, o.gap0, o.w, o.gap1 - o.gap0); }
    }
    if (b.mode !== 'mount') wizExWith(st, b, () => wizBroomDrawRide(st));
    else { ctx.save(); ctx.translate(b.x, b.y + Math.sin(t * 4) * 4); ctx.strokeStyle = WIZBROOM_C.stick; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(62, -4); ctx.stroke(); ctx.fillStyle = WIZBROOM_C.straw; ctx.beginPath(); ctx.moveTo(-58, -4); ctx.lineTo(-96, -14); ctx.lineTo(-96, 14); ctx.lineTo(-58, 5); ctx.closePath(); ctx.fill(); ctx.restore(); }
  },
};
const WIZEXAM_GATES = [WIZEX_FF, WIZEX_LIFT, WIZEX_GLOW, WIZEX_SIZE, WIZEX_MORPH, WIZEX_SHIELD, WIZEX_DOOR, WIZEX_BROOM];
function wizExGateX(k) { let x = WIZEXAM.gate0; for (let i = 0; i < k; i++) x += WIZEXAM_GATES[i].w; return x; }
const wizExHallX = () => wizExGateX(WIZEXAM_GATES.length);

/* ======================================== THE FLOW ======================================== */
function wizExSetup(st, L) {
  const ph = st.ph, K = WIZEXAM, F = K.floor;
  Object.assign(ph, { first: L.def.first || 0, t: 0, part: 1, gate: 0, blot: K.blot.start, gold: 0, gulp: 0, bellT: 3, mode: 'intro', modeT: 0, hintSay: [null, null], hintT: [0, 0], roar: 0 });
  ph.gates = WIZEXAM_GATES.map((kind, k) => { const g = { k, kind, x: wizExGateX(k), w: kind.w, said: false, gold: false, prev: [], ids: null }; kind.build(g); return g; });
  ph.start = [{ x0: -400, y0: F, x1: K.gate0 + 40, y1: F + 300, kind: 'floor' }];
  ph.solids = ph.start;
  const ps = G.players;
  ps.forEach((p, i) => Object.assign(p, { x: 380 + i * 50 - p.w / 2, y: F - p.h, vx: 0, vy: 0, grounded: true, face: 1, alive: true, inked: 0, shield: false }));
  st.cam = { x: 0, y: 0 };
  const s = wizStats(st);
  for (const k of ['gates', 'gloops', 'hits', 'frosts', 'burns', 'zaps', 'casts', 'wrong', 'bolts', 'blocks', 'doors', 'trips', 'hot']) s[k] = s[k] || 0;
  Object.assign(st.hm, { x: 560, y: 240, s: 0.85, face: -1, pose: 'talk', hidden: false, sayAt: null });
  wizSay(st, 'The final exam! Just a little one of each spell, dears...', 3);
}
function wizExRoles(ph) {
  if (ph.part === 1) { const c = (ph.first + ph.gate) % 2; return { a: c, b: 1 - c }; }   // a: the gate's first job
  const l = (ph.first + (ph.round || 0)) % 2; return { a: l, b: 1 - l };                  // a: LIFTER (and the GLOW in lights out), b: STRIKER
}
// the solids under everybody now: the start, the gates behind (open), and the current gate's own
function wizExPrev(ph) {
  const out = ph.start.slice();
  for (let k = Math.max(0, ph.gate - 2); k < ph.gate; k++) { const g = ph.gates[k]; out.push(...g.kind.solids(g)); }
  const nx = ph.gates[ph.gate + 1];   // (and the next one's floor, for whoever runs ahead)
  if (nx) out.push(...nx.kind.solids(nx));
  return out;
}
function wizExPlan(st) {
  const ph = st.ph, ps = G.players;
  if (!ph.gates) return [null, null];
  const wait = () => [{ why: 'wait', x: wizExCx(ps[0]) }, { why: 'wait', x: wizExCx(ps[1]) }];
  if (ph.mode !== 'run' && ph.mode !== 'attack' && ph.mode !== 'eye') return wait();
  if (ph.part === 2) return wizExHallPlan(st);
  const g = ph.gates[ph.gate];
  if (!g) return [{ why: 'go', x: wizExHallX() + 300 }, { why: 'go', x: wizExHallX() + 400 }];
  const R = wizExRoles(ph), A = ps[R.a], B = ps[R.b], out = [null, null];
  g.ids = [R.a, R.b];
  const [PA, PB] = g.kind.plan(st, g, A, B);
  out[R.a] = PA; out[R.b] = PB;
  return out;
}
function wizExCam(st, dt) {
  const ph = st.ph, ps = G.players, K = WIZEXAM, k = Math.min(1, (dt || 0) * 3);
  if (ph.part === 2) {
    const mid = (ps[0].x + ps[1].x) / 2 + 11, want = clamp(mid - W / 2 + 80, ph.hx, ph.hx + K.hall.camMax);
    st.cam.x += (want - st.cam.x) * (ph.mode === 'hallIn' ? 1 : k);
  } else {
    const g = ph.gates[ph.gate], b = g && g.kind === WIZEX_BROOM && g.sub.mode !== 'mount' ? g.sub : null;
    const mid = b ? b.x + 160 : (ps[0].x + ps[1].x) / 2 + 11, want = Math.max(mid - W / 2 + 60, ph.blot - 120);
    st.cam.x += (want - st.cam.x) * k;
  }
  st.cam.y = 0;
  // Thimblewick floats inside the Blot from the moment it swallows her chair (drawn by this class, inside it)
  const c = st.hm;
  if (ph.mode === 'intro') return;
  c.hidden = true;
  const at = wizExHmAt(st);
  c.x = at.x; c.y = at.y; c.s = at.s; c.face = at.face; c.pose = 'wobble'; c.mood = 'shocked';
  c.sayAt = { x: clamp(at.x - st.cam.x, 70, W - 70), y: clamp(at.y - 60, 120, H - 80), r: 26 };
}
function wizExHmAt(st) {
  const ph = st.ph, F = WIZEXAM.floor;
  if (ph.part === 2) { const sh = ph.mode === 'shrink' || ph.mode === 'done' ? clamp((ph.jarT || 0) / 1.2, 0, 1) : 0; return { x: ph.hx + 1010 - sh * 300, y: F - 170 + Math.sin(ph.t * 2) * 10 + sh * 100, s: 0.6, face: -1 }; }
  return { x: ph.blot - 190, y: 300 + Math.sin(ph.t * 2) * 12, s: 0.55, face: 1 };
}
function wizExGloop(st, word) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, g = ph.gates[ph.gate];
  if (!wizTeamOops(st, { word, x: ph.blot + 60, y: 200, kind: 'blot' })) return;
  ph.gulp = 0.9; Sfx.play('wizExGloop'); Sfx.play('wizExRoar'); wizStats(st).gloops++;
  const gx = g ? g.x : wizExHallX();
  ph.blot = Math.min(ph.blot, gx - K.blot.back);
  if (g) g.kind.reset(g);
  G.players.forEach((p, i) => Object.assign(p, { x: gx + 40 + i * 40, y: F - p.h, vx: 0, vy: 0, grounded: true, inked: 2 }));
  st.cam.x = gx - 200;
  wizSay(st, ['Blub! Run, dears, RUN!', 'It spat you out. Rude. Go on!', 'Mind its tummy. Quickly now!'][wizStats(st).gloops % 3], 2.2);
  wizExMissed(st);
}
// an Oops for one player at the current gate (into the ink, or the moat as the wrong animal): back to `x`
function wizExFell(st, p, word, x) {
  const F = WIZEXAM.floor;
  if (!wizOops(st, p, { word, kind: 'ink', to: { x, y: F } })) Object.assign(p, { x: x - p.w / 2, y: F - p.h, vx: 0, vy: 0, grounded: true });
  p.inked = 1.5;
  wizStats(st).gloops++; Sfx.play('wizExGloop');
  wizExMissed(st);
}
// gold help: after WIZEXAM.goldAt Oops at one gate, gold tea (the Blot slows) and that gate's spell gets kinder
function wizExMissed(st) {
  const ph = st.ph, g = ph.gates[ph.gate];
  if (ph.part !== 1 || !g) return;
  const n = wizMiss(st, 'g' + ph.gate);
  if (n >= WIZEXAM.goldAt && wizGoldOnce(st, 'tea' + ph.gate, 'Gold tea! The Blot slows down for 20 s, and ' + g.kind.goldText + '.')) { ph.gold = WIZEXAM.blot.goldT; g.gold = true; }
  else if (n >= WIZEXAM.goldAt + 2 && n % 2 === 0) ph.gold = WIZEXAM.blot.goldT;
  g.miss = n;
  // (a gate that keeps going wrong: the Blot gets stuck in the doorway behind it, so nobody loops here for ever)
  if (n >= WIZEXAM.goldAt + 1 && !g.stuck) { g.stuck = true; wizHelp(st, 'The Blot is stuck in the doorway! Take your time at this gate.'); }
}
function wizExStep(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players;
  ph.t += dt; ph.modeT += dt; ph.gold = Math.max(0, ph.gold - dt); ph.gulp = Math.max(0, ph.gulp - dt); ph.roar = Math.max(0, ph.roar - dt);
  for (const p of ps) if (p.inked) p.inked = Math.max(0, p.inked - dt);
  if (st.idle) { wizExCoast(st, dt); return; }
  if (ph.mode === 'intro') {
    // the demonstration goes wrong: sparks, the ink pot, the Blot rises and swallows her chair
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; wizBody(p, dt, ph.solids, { still: true }); }
    const c = st.hm;
    if (ph.modeT > 0.4 && !ph.i1) { ph.i1 = true; c.pose = 'cast'; for (const k of Object.keys(WIZ_SPELLS)) wizSparks(c.x - 60 + Math.random() * 120, c.y - 40, k, 4); Sfx.play('wizExTangle'); }
    if (ph.modeT > 1.6 && !ph.i2) { ph.i2 = true; c.pose = 'shock'; wizSay(st, 'Oh dear. Oh DEAR. Not the ink pot!', 2.2); Sfx.play('wizExRoar'); ph.roar = 1; if (!reduceMotion) G.shake = 0.5; }
    if (ph.modeT > 2.4) { const k = clamp((ph.modeT - 2.4) / 0.8, 0, 1); c.y = 240 - k * 40; c.x = 560 - k * 260; c.alpha = 1 - k * 0.3; }
    if (ph.modeT > 3.4) {
      ph.mode = 'run'; ph.modeT = 0; ph.blot = 60; st.hm.alpha = 1;
      wizNews(st, 'RUN! The Blot is loose! 8 spell gates: every one needs both of you.', false, 3.4); Sfx.play('wizBell'); Sfx.play('wizExRoar');
      wizSay(st, 'Help! I\'m in its tummy! Run, and use your spells!', 2.6);
    }
    wizExCam(st, dt); return;
  }
  if (ph.part === 1) wizExFlood(st, dt); else wizExHall(st, dt);
  wizExCam(st, dt);
  wizExHints(st, dt);
}
function wizExFlood(st, dt) {
  const ph = st.ph, K = WIZEXAM, ps = G.players, R = wizExRoles(ph), g = ph.gates[ph.gate];
  const A = ps[R.a], B = ps[R.b];
  g.ids = [R.a, R.b]; g.prev = wizExPrev(ph);
  ph.solids = g.prev.concat(g.kind.solids(g));
  // the gate is announced when someone nears it
  if (!g.said && Math.max(wizExCx(A), wizExCx(B)) > g.x - 160) {
    g.said = true; wizNews(st, g.kind.say, false, 2.8); Sfx.play('wizSpell_' + (g.kind.spell === 'size' ? 'size' : g.kind.spell)); wizShowBadges(st);
    const P = g.kind.plan(st, g, A, B);
    if (P[0] && P[0].say) wizHint(st, A.id, P[0].say, { cpu: g.kind.jobs[0].replace('!', '') === 'Frost' ? 'I\'ll freeze the ink!' : 'My job: ' + g.kind.jobs[0].toLowerCase(), life: 3.4 });
    if (P[1] && P[1].say) wizHint(st, B.id, P[1].say, { cpu: 'My job: ' + g.kind.jobs[1].toLowerCase(), life: 3.4 });
  }
  g.kind.step(st, g, dt, A, B);
  // (a safety net: nobody falls out of the world)
  for (const p of ps) if (wizExFeet(p) > K.floor + 220) wizExFell(st, p, 'Gloop!', g.x + 40 + p.id * 30);
  // nobody walks off the screen (the Blot is on the left)
  const hid = g.kind.hide(g), cx = st.cam.x;
  for (const p of ps) if (!hid[p.id]) { if (p.x < cx + 4) p.x = cx + 4; if (p.x > cx + W - 4 - p.w) p.x = cx + W - 4 - p.w; }
  // the gate is done once it is open and both are through
  const doneB = g.kind === WIZEX_BROOM ? g.sub.mode === 'done' : g.kind.open(g) && ps.every(p => wizExCx(p) > g.x + g.w - 40);
  if (doneB) {
    g.kind.finish(g); wizStats(st).gates++;
    ph.gate++;
    if (ph.gate >= K.gates()) { ph.part = 2; ph.mode = 'hallIn'; ph.modeT = 0; wizExHallSetup(st); wizNews(st, 'Through the window, into the Great Hall!', false, 2); Sfx.play('wizExRoar'); return; }
    wizSwap(st);
    wizReact(st, 'happy', ['Splendid! Keep running!', 'Well cast! Next gate!', 'That\'s my students! On you go!', 'Ooh, it\'s gaining. Hurry!'][ph.gate % 4], 1.8);
  }
  // the Blot: hurries when far behind, eases when close, creeps when right behind
  const rear = Math.min(ps[0].x, ps[1].x), gap = rear - ph.blot, Bk = K.blot;
  let v = gap > Bk.far ? Bk.fast : gap > Bk.near ? Bk.mid : gap > Bk.close ? Bk.slow : Bk.creep;
  if (ph.gold > 0) v *= Bk.gold;
  ph.blot += v * dt;
  if (g && g.stuck) ph.blot = Math.min(ph.blot, g.x - 260);
  if (ph.gulp <= 0 && ps.some(p => p.x < ph.blot + 10)) wizExGloop(st, 'GLOOP!');
  // the school bell clangs, and it roars now and then
  if ((ph.bellT -= dt) <= 0) { ph.bellT = K.bellEvery; Sfx.play('wizBell'); if (gap < 420) { Sfx.play('wizExRoar'); ph.roar = 0.8; if (!reduceMotion) G.shake = Math.max(G.shake, 0.15); } }
}
WIZEXAM.gates = () => WIZEXAM_GATES.length;
// hint bubbles for the people: the plan's own words, when it changes (and again every 7 s)
function wizExHints(st, dt) {
  const ph = st.ph;
  if (ph.mode !== 'run' && ph.mode !== 'attack' && ph.mode !== 'eye') return;
  const P = wizExPlan(st);
  for (const id of [0, 1]) {
    const q = P[id];
    ph.hintT[id] += dt;
    if (!q || !q.say) { ph.hintSay[id] = null; continue; }
    if (st.hints[id] || (q.say === ph.hintSay[id] && ph.hintT[id] < 7)) continue;
    ph.hintSay[id] = q.say; ph.hintT[id] = 0;
    wizHint(st, id, q.say, { life: 2.6 });
  }
}

/* ======================================== PART 2: THE GREAT HALL ======================================== */
function wizExHallSetup(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, H0 = ph.hx = wizExHallX();
  Object.assign(ph, { round: 0, attacks: [], humps: [], shadows: [], flames: [], atkT: 0, spawnT: 0.8, spawnN: 0, down: [0, 0], castK: [null, null], eyeOpen: false, focus: 1, tired: false,
    darkT: 0, darkDone: false, shadowT: 0, glowOn: false, jarT: 0, flinch: 0, burnT: 0, tumbles: 0, toss: null, inD: null, outD: null, sel: null, inside: 0, puff: null, rear: 0, edge: {} });
  ph.hallBase = [
    { x0: H0 - 200, y0: F, x1: H0 + K.hall.w + 400, y1: F + 300, kind: 'floor' },
    { x0: H0 - 40, y0: -400, x1: H0, y1: F, kind: 'hallwall' },
    { x0: H0 + K.hall.front, y0: -400, x1: H0 + 1600, y1: F, kind: 'blot' },
  ];
  ph.steps = K.steps.map(([a, b, h]) => ({ x0: H0 + a, x1: H0 + b, y0: F - h, y1: F - h + 14, one: true, ice: 0, cx: H0 + (a + b) / 2, kind: 'icestep' }));
  { const t = ph.steps[2]; ph.lip = { x0: t.x1, x1: t.x1 + 16, y0: t.y0 - 44, y1: t.y1, kind: 'lip' }; }   // (an ink lump: nobody walks off the top step's far end)
  ph.ledgeH = { x0: H0 + 690, x1: H0 + 790, y0: F - 290, y1: F - 276, one: true, kind: 'armledge' };
  ph.palm = { x0: H0 + 530, x1: H0 + 590, y0: F - 150, y1: F - 136, one: true, kind: 'palm' };
  ph.eye = { x: H0 + K.eye.x, y: F - K.eye.y };
  ph.solids = ph.hallBase;
}
function wizExHallSolids(ph) {
  const S = ph.hallBase.concat(ph.humps);
  if (ph.mode === 'eye' && ph.round === 0) { for (const s of ph.steps) if (s.ice > 0) S.push(s); if (ph.steps[2].ice > 0) S.push(ph.lip); }
  if (ph.mode === 'eye' && ph.round === 1) S.push(ph.ledgeH, ph.palm);
  return S;
}
function wizExHit(st, p, word) {
  const ph = st.ph, K = WIZEXAM;
  if (ph.down[p.id] > 0 || st.safe[p.id] > 0) return;
  if (ph.puff && ph.puff.rider && p.id === wizExRoles(ph).b) return;
  ph.down[p.id] = K.down; wizStats(st).hits++; ph.castK[p.id] = null; p.shield = false;
  knock(p, (wizExCx(p) < ph.hx + K.hall.front - 100 ? -1 : 1) * 200, -300, K.down, 0);
  wizPop(st, wizExCx(p), p.y - 20, word, '#c8b8ff', 18); Sfx.play('wizExSplat'); rumble(p.id, 0.5, 0.3, 200);
  if (ph.down[0] > 0 && ph.down[1] > 0) {
    if (wizTeamOops(st, { word: 'Both down! Again!', x: ph.hx + 380, y: 200, kind: 'blot' })) {
      wizExAttackStart(st, 1.2);
      const n = wizMiss(st, 'h' + ph.round);
      wizSay(st, ['Up you get! It\'s only ink.', 'Oof. Again, dears, together!', 'Watch what it does first!'][n % 3], 2.2);
      if (n >= WIZ.goldAfter && wizGoldOnce(st, 'hall' + ph.round, 'Gold tea! The attacks come slower this round.')) ph.slow = ph.round + 1;
    }
  }
}
function wizExAttackStart(st, delay) {
  const ph = st.ph;
  Object.assign(ph, { mode: 'attack', modeT: 0, atkT: 0, spawnT: delay, attacks: [], humps: [], shadows: [], flames: [], darkT: 0, darkDone: false, eyeOpen: false, castK: [null, null], toss: null, puff: null, inD: null, outD: null });
  for (const s of ph.steps) s.ice = 0;
}
function wizExHall(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, H0 = ph.hx;
  if (ph.mode === 'hallIn') {
    for (const p of ps) { p.pendingAct = p.pendingJump = false; }
    if (ph.modeT > 1.2) {
      ps.forEach((p, i) => Object.assign(p, { x: H0 + 160 + i * 60, y: F - p.h, vx: 0, vy: 0, face: 1, grounded: true, ground: null }));
      st.cam.x = H0; wizExAttackStart(st, 1.4); Sfx.play('wizExRoar'); ph.roar = 1.2; if (!reduceMotion) G.shake = 0.5;
      wizNews(st, 'The Great Hall! The action casts what you need: FROST waves, SHIELD bolts, FLAME arms!', false, 4);
      wizSay(st, 'It\'s ENORMOUS in here! Mind the ink, dears!', 2.6);
    }
    ph.blot = H0 - 600;
    return;
  }
  for (const k of [0, 1]) ph.down[k] = Math.max(0, ph.down[k] - dt);
  ph.flinch = Math.max(0, ph.flinch - dt);
  for (const f of ph.flames) f.t -= dt;
  ph.flames = ph.flames.filter(f => f.t > 0);
  for (const h of ph.humps) { h.t -= dt; if (h.t <= 0) { puff((h.x0 + h.x1) / 2, F - 14, 6, 'rgba(220,240,255,0.9)'); Sfx.play('wizFFMelt'); } }
  ph.humps = ph.humps.filter(h => h.t > 0);
  if (ph.mode === 'attack') wizExAttackStep(st, dt);
  else if (ph.mode === 'eye') wizExEyeStep(st, dt);
  else {
    for (const p of ps) { p.pendingAct = false; p.shield = false; wizBody(p, dt, wizExHallSolids(ph), { still: true }); }
    if (ph.mode === 'shrink') {
      ph.jarT += dt;
      if (ph.jarT > 1.0 && !ph.j1) { ph.j1 = true; wizSay(st, 'Well! You\'re just a little puddle, aren\'t you.', 2.4); Sfx.play('wizExPop'); }
      if (ph.jarT > 2.2 && !ph.j3) { ph.j3 = true; st.hm.hidden = false; st.hm.sayAt = null; Object.assign(st.hm, { x: H0 + 700, y: F - 120, s: 0.7, face: -1, pose: 'cheer', mood: 'happy' }); Sfx.play('wizExPop'); }
      if (ph.jarT > 3.6 && !ph.j2) { ph.j2 = true; ph.mode = 'done'; wizPhaseDone(st, { say: 'Into the jar. It can be the school pet. You PASSED!' }); }
    }
  }
  for (const p of ps) if (!(ph.puff && ph.puff.rider && p.id === wizExRoles(ph).b)) { if (p.x < H0 + 2) p.x = H0 + 2; if (p.x > H0 + K.hall.front - 4 - p.w) p.x = H0 + K.hall.front - 4 - p.w; }
}
// what the action casts in an attack set: FLAME a near arm, FROST a wave rolling at you, else SHIELD (held). The
// round's LIFTER holds GLOW while the lights are out.
function wizExCast(st, p, glowJob) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, cx = wizExCx(p);
  if (glowJob) { Sfx.play('wizSpell_glow'); return 'glow'; }
  const arm = ph.attacks.find(a => a.kind === 'arm' && !a.slammed && Math.abs(a.x - cx) < K.arm.reach);
  if (arm) {
    p.face = arm.x >= cx ? 1 : -1; arm.dead = true; ph.flames.push({ id: p.id, f: p.face, t: 0.35 });
    Sfx.play('wizFFBurn'); wizPop(st, arm.x, F - 90, 'Shrivel!', '#ffb070', 18); wizStats(st).burns++; burst(arm.x, F - 30, '#ff9a3c', 10); return 'flame';
  }
  const wave = ph.attacks.find(a => a.kind === 'wave' && a.x > cx - 20 && a.x - cx < K.wave.frost);
  if (wave) {
    wave.dead = true; ph.humps.push({ x0: wave.x - K.wave.w / 2, x1: wave.x + K.wave.w / 2, y0: F - K.wave.h, y1: F, t: K.wave.ice, kind: 'hump' });
    Sfx.play('wizFFIce'); wizSparks(wave.x, F - 20, 'frost', 10); wizPop(st, wave.x, F - 60, 'Frozen!', '#dff4ff', 16); wizStats(st).frosts++; return 'frost';
  }
  Sfx.play('wizShUp'); return 'shield';
}
function wizExAttackStep(st, dt) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, R = wizExRoles(ph), H0 = ph.hx;
  // lights out (rounds 2 and 3): it covers the windows; the LIFTER glows
  const at = K.dark.at[ph.round];
  if (at != null && !ph.darkDone && ph.atkT >= at) {
    ph.darkT = K.dark.t * (ph.slow === ph.round + 1 ? 0.75 : 1); ph.darkDone = true; ph.shadowT = 0.9; ph.attacks = ph.attacks.filter(a => a.kind === 'wave');
    wizNews(st, 'LIGHTS OUT! It covered the windows! ' + ['Pip', 'Bo'][R.a] + ', hold the action to GLOW!', false, 3);
    wizHint(st, R.a, 'Hold ' + wizExKey(R.a, 'act') + ' to GLOW! Keep your partner in the light!', { cpu: 'I\'ll make light! Stay close!', life: 3 });
    Sfx.play('wizExRoar'); ph.roar = 1;
  }
  const dark = ph.darkT > 0;
  if (dark) { ph.darkT -= dt; if (ph.darkT <= 0) { ph.darkT = 0; wizNews(st, 'The windows clear!', false, 1.6); for (const s of ph.shadows) puff(s.x, s.y, 5, 'rgba(30,20,50,0.8)'); ph.shadows = []; } }
  // casting
  for (const p of ps) {
    const id = p.id, downNow = ph.down[id] > 0;
    if (!p.input.act || downNow) ph.castK[id] = null;
    if (p.pendingAct && !downNow) ph.castK[id] = wizExCast(st, p, dark && id === R.a);
    p.pendingAct = false;
    if (dark && id === R.a && p.input.act && !downNow && ph.castK[id] === 'shield') ph.castK[id] = 'glow';
    if (!dark && ph.castK[id] === 'glow') ph.castK[id] = 'shield';
    p.shield = ph.castK[id] === 'shield';
  }
  ph.glowOn = dark && ph.castK[R.a] === 'glow';
  const sol = wizExHallSolids(ph);
  for (const p of ps) wizBody(p, dt, sol);
  // the attack set
  ph.atkT += dark ? dt * 0.5 : dt; ph.spawnT -= dt;
  if (ph.spawnT <= 0 && ph.atkT < K.attackT - 1) { ph.spawnT = K.every * (ph.slow === ph.round + 1 ? 1.6 : 1) * (1.1 - ph.round * 0.12) * (dark ? 1.5 : 1); wizExSpawn(st, dark); }
  for (const a of ph.attacks) {
    a.t -= dt;
    if (a.kind === 'wave') {
      a.x -= K.wave.v * dt;
      for (const h of ph.humps) if (a.x > h.x0 - 6 && a.x < h.x1 + 6) { a.dead = true; puff(a.x, F - 16, 6, 'rgba(30,24,50,0.85)'); }
      if (!a.dead) for (const p of ps) if (p.grounded && Math.abs(wizExCx(p) - a.x) < K.wave.w / 2 + 8 && wizExFeet(p) > F - K.wave.h) wizExHit(st, p, 'Splosh!');
      if (a.x < H0 - 40) a.dead = true;
    } else if (a.kind === 'bolt') {
      a.x += a.vx * dt;
      for (const p of ps) if (!a.back && Math.abs(wizExCx(p) - a.x) < 14 + K.bolt.r && Math.abs(p.y + p.h / 2 - a.y) < 18 + K.bolt.r) {
        if (p.shield) { a.vx = Math.abs(a.vx) * 1.2; a.back = true; Sfx.play('wizExBounce'); wizPop(st, a.x, a.y - 20, 'Bounce!', '#9ad0ff', 14); wizStats(st).blocks++; }
        else { wizExHit(st, p, 'Splat!'); a.dead = true; }
      }
      if (a.back && a.x > H0 + K.hall.front + 10) { a.dead = true; ph.flinch = 0.6; ph.atkT += K.bolt.flinch; Sfx.play('wizExRoar'); wizPop(st, H0 + K.hall.front + 40, a.y - 30, 'OW! It flinches!', '#ffd23f', 18); burst(a.x, a.y, '#9ad0ff', 10); }
      if (a.x < H0 - 30) a.dead = true;
    } else if (a.kind === 'arm') {
      if (a.t <= 0 && !a.slammed) { a.slammed = true; Sfx.play('wizExSlam'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.14); for (const p of ps) if (Math.abs(wizExCx(p) - a.x) < K.arm.w / 2 + 6 && wizExFeet(p) > F - 70) wizExHit(st, p, 'Grabbed!'); }
      if (a.t < -K.arm.slam) a.dead = true;
    } else if (a.kind === 'candle') {
      if (a.t <= 0 && !a.fell) { a.fell = true; Sfx.play('wizExSlam'); Sfx.play('wizExCrash'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.18); burst(a.x, F - 10, '#ffd23f', 12); for (const p of ps) if (Math.abs(wizExCx(p) - a.x) < K.candle.r + 8) wizExHit(st, p, 'Clang!'); }
      if (a.t < -0.6) a.dead = true;
    }
  }
  ph.attacks = ph.attacks.filter(a => !a.dead);
  // in the dark: ink shadows creep at anyone outside the light (the light puffs them away)
  if (dark) {
    if ((ph.shadowT -= dt) <= 0) { ph.shadowT = K.dark.every * (ph.slow === ph.round + 1 ? 1.5 : 1); ph.spawnN++; ph.shadows.push({ x: ph.spawnN % 2 ? H0 + K.hall.front - 20 : H0 + 20, y: F - 12, vx: 0, eye: Math.random() * 6 }); }
    const gl = ps[R.a], c = { x: wizExCx(gl), y: gl.y + gl.h / 2 - 10 }, r = K.dark.r;
    for (const s of ph.shadows) {
      if (s.die != null) { s.die -= dt; continue; }
      let tgt = null, bd = 1e9;
      for (const p of ps) if (!wizExLitHall(ph, p)) { const d = Math.abs(wizExCx(p) - s.x); if (d < bd) { bd = d; tgt = p; } }
      s.vx = approach(s.vx, tgt ? Math.sign(wizExCx(tgt) - s.x) * K.dark.v : 0, 300 * dt); s.x += s.vx * dt;
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (ph.glowOn && d < r * 0.6) { s.die = 0.4; puff(s.x, s.y, 6, 'rgba(30,20,50,0.8)'); Sfx.play('wizGlowPlink'); continue; }
      if (ph.glowOn && d < r) s.x += Math.sign(s.x - c.x || 1) * 180 * dt;
      for (const p of ps) if (s.die == null && !wizExLitHall(ph, p) && Math.abs(wizExCx(p) - s.x) < 18 && wizExFeet(p) > F - 30) { s.die = 0.4; wizExHit(st, p, 'Grabbed in the dark!'); }
    }
    ph.shadows = ph.shadows.filter(s => s.die == null || s.die > 0);
  }
  if (ph.atkT >= K.attackT && !ph.attacks.length && ph.darkT <= 0) wizExEyeStart(st);
}
const wizExLitHall = (ph, p) => ph.darkT <= 0 || (ph.glowOn && Math.hypot(wizExCx(p) - wizExCx(G.players[wizExRoles(ph).a]), p.y - G.players[wizExRoles(ph).a].y) < WIZEXAM.dark.r * 0.9);
function wizExSpawn(st, dark) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, H0 = ph.hx;
  const seq = WIZEXAM_ATTACKS[ph.round], n = (ph.spawnN = ph.spawnN + 1), kind = dark ? 'wave' : seq[n % seq.length];
  const tgt = ps[n % 2], tx = clamp(wizExCx(tgt), H0 + 60, H0 + K.hall.front - 60);
  if (kind === 'wave') ph.attacks.push({ kind, x: H0 + K.hall.front - 10, t: 9 });
  else if (kind === 'bolt') { ph.attacks.push({ kind, x: H0 + K.hall.front - 20, y: clamp(tgt.y + tgt.h / 2, F - 200, F - 13), vx: -K.bolt.v, t: 9 }); Sfx.play('wizExSpit'); }
  else if (kind === 'arm') ph.attacks.push({ kind, x: tx, t: K.arm.warn });
  else ph.attacks.push({ kind: 'candle', x: tx, t: K.candle.warn });
}
function wizExEyeStart(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, R = wizExRoles(ph);
  Object.assign(ph, { mode: 'eye', modeT: 0, eyeGold: false, eyeOpen: false, focus: 1, tired: false, burnT: 0, castK: [null, null], toss: null, inD: null, outD: null, sel: null, shadows: [] });
  Sfx.play('wizExRoar'); ph.roar = 1.2; if (!reduceMotion) G.shake = 0.35;
  const lift = 'Stand in the lift circle and HOLD ' + wizExKey(R.a, 'act') + ': the Lift holds its eye open!';
  wizHint(st, R.a, lift, { cpu: 'I\'ll hold its eye open!', life: 3.4 });
  if (ph.round === 0) {
    for (const s of ph.steps) s.ice = 0;
    wizNews(st, 'It rears up! FROST its ink falls into steps, climb, and FLAME the eye!', false, 3.6);
    wizHint(st, R.b, 'Freeze the ink falls into steps: ' + wizExKey(R.b, 'act') + ', then climb!', { cpu: 'Up the ice I go!', life: 3.4 });
  } else if (ph.round === 1) {
    wizNews(st, 'Its arms hold up chalk plates! Draw a door up to its eye and cast DOOR!', false, 3.6);
    wizHint(st, R.b, wizExKey(R.b, 'up') + ' / ' + wizExKey(R.b, 'down') + ' picks a plate, ' + wizExKey(R.b, 'act') + ' stamps: IN low, OUT high!', { cpu: 'I\'ll draw my own doors!', life: 3.4 });
  } else {
    ph.puff = { x: ph.hx - 140, y: F, mode: 'enter', vy: 0, t: 0, rider: false, bottle: true, armsUp: true, fed: false, face: 1, tt: 0 };
    ph.tumbles = 0;
    wizNews(st, 'The thunderpuff gallops in! Ride it, PEPPER at the arms, toss the BREW into the eye!', false, 3.8);
    wizHint(st, R.b, 'Climb on the thunderpuff!', { cpu: 'Hup! I\'ll ride!', life: 3 });
    Sfx.play('wizBeastRumble');
  }
}
function wizExEyeStep(st, dt) {
  const ph = st.ph, K = WIZEXAM, ps = G.players, R = wizExRoles(ph), L = ps[R.a], S = ps[R.b], H0 = ph.hx, FK = WIZLIFT.focus;
  // the LIFTER: the Lift on the armchair inside holds its eye open (a focus meter, as in Class 2)
  const lOn = Math.abs(wizExCx(L) - (H0 + K.hall.circle)) < K.hall.circleR && L.grounded;
  const holding = lOn && !!L.input.act;
  if (ph.tired) { ph.focus = Math.min(1, ph.focus + FK.fill * dt); if (ph.focus >= FK.wake) { ph.tired = false; Sfx.play('wizDing'); } }
  const lifting = holding && !ph.tired;
  if (lifting) { ph.focus -= FK.drain * dt; if (ph.focus <= 0) { ph.focus = 0; ph.tired = true; wizPop(st, wizExCx(L), L.y - 30, 'Puff! Rest...', '#d9c6ff', 16); Sfx.play('wizLiftTired'); } }
  else if (!ph.tired) ph.focus = Math.min(1, ph.focus + FK.fill * dt);
  if (lifting && !ph.eyeOpen) Sfx.play('wizSpell_lift');
  ph.eyeOpen = lifting;
  // (a long fight at the eye: gold help, the ice steps or the doors last much longer)
  if (ph.modeT > WIZEXAM.eyeGoldT && ph.round < 2 && !ph.eyeGold && wizGoldOnce(st, 'eye' + ph.round, ph.round ? 'Gold chalk! Your doors last much longer.' : 'Gold frost! New ice steps never melt now.')) ph.eyeGold = true;
  L.pendingAct = false; L.shield = false; S.shield = false;
  const sol = wizExHallSolids(ph);
  wizBody(L, dt, sol, { ctl: (p, d) => { const real = p.input; if (real.act && p.grounded && lOn) p.input = NO_INPUT; try { control(p, d); } finally { p.input = real; } } });
  if (ph.round === 0) wizExR1(st, dt, S, sol); else if (ph.round === 1) wizExR2(st, dt, S, sol); else wizExR3(st, dt, S, sol);
}
// round 1: FROST the ink falls into steps, climb, FLAME the eye
const wizExFlameReach = (ph, S) => S.face > 0 && ph.eye.x > wizExCx(S) && wizExCx(S) + 6 + WIZFF.jet >= ph.eye.x - WIZEXAM.eye.r && Math.abs(ph.eye.y - (S.y + S.h / 2)) < 80;
function wizExR1(st, dt, S, sol) {
  const ph = st.ph, F = WIZEXAM.floor, life = ph.eyeGold ? 1e6 : WIZFF.pillar * (wizHasGold(st, 'hall0') ? 1.6 : 1);
  for (const s of ph.steps) if (s.ice > 0) { const was = s.ice; s.ice = Math.max(0, was - dt); if (was > WIZFF.crack && s.ice <= WIZFF.crack) Sfx.play('wizFFCrack'); if (s.ice <= 0) Sfx.play('wizFFMelt'); }
  const cx = wizExCx(S);
  if (!S.input.act) ph.castK[S.id] = null;
  if (S.pendingAct) {
    const on = S.grounded && ph.steps.find(s => S.ground === s);
    if (wizExFlameReach(ph, S) && (ph.eyeOpen || !on)) { ph.castK[S.id] = 'flame'; Sfx.play('wizFFJet'); if (!ph.eyeOpen) wizPop(st, ph.eye.x, ph.eye.y - 56, 'It\'s shut! Hold the Lift!', '#ffffff', 15); }
    else if (wizExFlameReach(ph, S)) { on.ice = life; Sfx.play('wizFFIce'); wizSparks(on.cx, on.y0 + 10, 'frost', 8); ph.castK[S.id] = 'frost'; wizPop(st, ph.eye.x, ph.eye.y - 56, 'It\'s shut! Hold the Lift!', '#ffffff', 15); }
    else {
      // the nearest liquid ink fall ahead (or else the one running out soonest) freezes into a step
      const f = S.face || 1, near = ph.steps.filter(s => Math.abs(s.cx - cx) <= 150 && (s.cx - cx) * f >= -50);
      const liquid = near.filter(s => s.ice <= 0).sort((a, b) => Math.abs(a.cx - cx) - Math.abs(b.cx - cx));
      const s = liquid[0] || near.sort((a, b) => a.ice - b.ice)[0];
      if (s) { s.ice = life; Sfx.play('wizFFIce'); wizSparks(s.cx, s.y0 + 10, 'frost', 12); wizStats(st).frosts++; } else Sfx.play('wizFFFizz');
      ph.castK[S.id] = 'frost';
    }
  }
  S.pendingAct = false;
  wizBody(S, dt, sol);
  ph.jet = ph.castK[S.id] === 'flame' && !!S.input.act;
  if (ph.jet && ph.eyeOpen && wizExFlameReach(ph, S)) {
    ph.burnT += dt; if (Math.random() < 0.4) puff(ph.eye.x - 20 + Math.random() * 40, ph.eye.y - 10 + Math.random() * 20, 5, 'rgba(255,140,60,0.9)');
    if (ph.burnT >= WIZFF.burn) wizExStrike(st, S);
  }
  // (the liquid ink falls only splash: being knocked down under them again and again was too much for a slow climber)
}
// round 2: chalk plates on its arms; the STRIKER draws its own doors and casts DOOR from above the eye
function wizExPlates(ph) {
  const K = WIZEXAM.plates, F = WIZEXAM.floor, H0 = ph.hx, s = Math.sin(ph.t * Math.PI * 2 / K.period);
  return { L: { k: 'L', x: H0 + 420 + s * K.sway, y: F }, M: { k: 'M', x: H0 + 560, y: F - 150 }, H: { k: 'H', x: H0 + 735 + s * 10, y: F - 290 } };
}
function wizExReach(ph, S) {
  const P = wizExPlates(ph), cx = wizExCx(S), cy = S.y + S.h / 2;
  return ['L', 'M', 'H'].filter(k => Math.hypot(P[k].x - cx, P[k].y - 12 - cy) < WIZEXAM.plates.reach).sort((a, b) => P[a].x - P[b].x);
}
function wizExSel(ph, S, reach) {
  if (ph.sel && reach.includes(ph.sel)) return ph.sel;
  const P = wizExPlates(ph); let best = null, bd = 1e9;
  for (const k of reach) { const d = Math.hypot(P[k].x - wizExCx(S), (P[k].y - wizExFeet(S)) * 0.5); if (d < bd) { bd = d; best = k; } }
  return (ph.sel = best);
}
const wizExNearEye = (ph, S) => Math.hypot(ph.eye.x - wizExCx(S), ph.eye.y - (S.y + S.h / 2)) < 170;
function wizExR2(st, dt, S, sol) {
  const ph = st.ph, K = WIZEXAM.plates, life = K.life * (wizHasGold(st, 'hall1') ? 1.6 : 1) * (ph.eyeGold ? 1.8 : 1);
  if (ph.outD) { ph.inD.t -= dt; if (ph.inD.t <= 0) { ph.inD = ph.outD = null; Sfx.play('wizPoClear'); } }
  ph.inside = Math.max(0, ph.inside - dt);
  const onH = S.grounded && S.ground === ph.ledgeH, reach = wizExReach(ph, S), sel = wizExSel(ph, S, reach);
  const eu = wizExEdge(ph.edge, S, 'up'), ed = wizExEdge(ph.edge, S, 'down');
  if (!onH && reach.length) { const i = reach.indexOf(sel), n = reach.length; if (eu) { ph.sel = reach[(i + n - 1) % n]; Sfx.play('wizPoTick'); } if (ed) { ph.sel = reach[(i + 1) % n]; Sfx.play('wizPoTick'); } }
  if (S.pendingAct) {
    if (onH || wizExNearEye(ph, S)) { if (ph.eyeOpen) wizExStrike(st, S); else wizPop(st, ph.eye.x, ph.eye.y - 56, 'It\'s shut! Hold the Lift!', '#ffffff', 15); }
    else if (ph.inD && ph.outD) { ph.inD = ph.outD = null; Sfx.play('wizPoClear'); wizPop(st, wizExCx(S), S.y - 24, 'Wiped!', '#ffffff', 14); }
    else if (!sel) wizPop(st, wizExCx(S), S.y - 24, 'No plate in reach!', '#ffffff', 14);
    else if (!(ph.inD && ph.inD.q === sel)) {
      const door = { q: sel, t: life };
      if (!ph.inD) ph.inD = door; else { ph.outD = door; ph.inD.t = life; }
      const P = wizExPlates(ph)[sel]; wizStats(st).doors++; Sfx.play(ph.outD ? 'wizPoOut' : 'wizPoIn'); wizSparks(P.x, P.y - 20, 'door', 10);
    }
  }
  S.pendingAct = false;
  const vx0 = S.vx;
  wizBody(S, dt, sol, { ctl: WIZEX_NOJUMPDOWN });
  if (ph.inD && ph.outD && ph.inside <= 0) {
    const P = wizExPlates(ph), q = P[ph.inD.q];
    if (Math.abs(wizExCx(S) - q.x) < 12 && Math.abs(wizExFeet(S) - q.y) < 6) {
      const o = P[ph.outD.q], v = Math.sign(vx0 || 1) * 40;
      wizStats(st).trips++; Sfx.play('wizPoWhoosh'); puff(wizExCx(S), S.y + S.h / 2, 8, 'rgba(111,108,255,0.8)');
      Object.assign(S, { x: o.x - S.w / 2, y: o.y - S.h, vx: v, vy: 0, grounded: true, ground: null });
      ph.inside = 0.6; puff(o.x, o.y - 20, 8, 'rgba(220,220,240,0.9)');
    }
  }
}
// round 3: the thunderpuff gallops in. Ride, PEPPER at the gate of arms, toss the BREW at the top of the leap.
function wizExR3(st, dt, S, sol) {
  const ph = st.ph, K = WIZEXAM.puff, F = WIZEXAM.floor, H0 = ph.hx, u = ph.puff, arms = H0 + K.arms;
  if (!u) return;
  u.t += dt;
  const win0 = arms - K.win[0] - (ph.goldPepper ? 120 : 0), win1 = arms - K.win[1];
  const press = S.pendingAct; S.pendingAct = false;
  if (press && u.rider) {
    if (u.mode === 'run' && !u.fed) {
      if (u.x >= win0) { u.fed = true; u.mode = 'charge'; Sfx.play('wizBeastMunch'); Sfx.play('wizBeastHup'); wizPop(st, u.x, F - 140, 'Pepper! CHARGE!', '#ff5a3a', 20); }
      else wizPop(st, u.x, F - 140, 'Not yet: at the arms!', '#ffffff', 14);
    } else if (u.mode === 'leap' && u.bottle) {
      u.bottle = false;
      ph.toss = { t: 0, x0: u.x + 20, y0: u.y - 110, ok: ph.eyeOpen };
      Sfx.play('wizCaulToss');
    }
  }
  switch (u.mode) {
    case 'enter': u.x += 320 * dt; if (u.x >= H0 + 70) { u.x = H0 + 70; u.mode = 'wait'; u.t = 0; } break;
    case 'wait':
      if (!u.rider && Math.abs(wizExCx(S) - u.x) < 50 && S.grounded) { u.rider = true; u.t = 0; Sfx.play('wizBeastHup'); wizPop(st, u.x, F - 130, 'Hup!', '#ffffff', 18); if (!u.said) { u.said = true; wizSay(st, 'Catch, dear! The leftover Brew from the cellars!', 2.4); } }
      if (u.rider && u.t > 0.6) { u.mode = 'run'; u.fed = false; u.armsUp = true; u.bottle = true; Sfx.play('wizBeastRumble'); }
      break;
    case 'run': u.x += K.v * dt; if (u.x >= win1 && !u.fed) { u.mode = 'tumble'; u.tt = K.tumble; ph.tumbles++; Sfx.play('wizBeastTumble'); wizPop(st, arms, F - 150, 'Bonk! It needs a pepper pod first!', '#ffffff', 16); if (ph.tumbles >= 2 && wizGoldOnce(st, 'pepper', 'Gold pepper! Feed it anywhere on the gold stretch.')) ph.goldPepper = true; } break;
    case 'charge':
      u.x += K.charge * dt;
      if (u.armsUp && u.x >= arms - 40) { u.armsUp = false; Sfx.play('wizBeastSmash'); burst(arms, F - 80, '#3a3650', 16); wizPop(st, arms, F - 170, 'SMASH!', '#ffd23f', 24); if (!reduceMotion) G.shake = 0.25; }
      if (u.x >= H0 + K.leapAt) { u.mode = 'leap'; u.vy = -K.leapV; Sfx.play('wizBeastJump'); }
      break;
    case 'leap': u.x += K.leapVx * dt; u.vy += K.g * dt; u.y += u.vy * dt; if (u.y >= F) { u.y = F; u.vy = 0; u.mode = 'back'; u.face = -1; Sfx.play('wizBeastLand'); } break;
    case 'back': u.x -= K.v * dt; if (u.x <= H0 + 70) { u.x = H0 + 70; u.mode = 'wait'; u.t = 0; u.face = 1; if (!u.bottle) { u.bottle = true; wizSay(st, 'Here, another bottle. Aim for the eye!', 2); } } break;
    case 'tumble': u.tt -= dt; u.x = Math.max(H0 + 70, u.x - 200 * dt); if (u.tt <= 0) { u.mode = 'back'; u.face = -1; } break;
  }
  if (ph.toss) {
    ph.toss.t += dt;
    if (ph.toss.t >= 0.4) { const ok = ph.toss.ok; ph.toss = null; if (ok) wizExStrike(st, S); else { burst(ph.eye.x, ph.eye.y + 40, '#7ee07a', 12); wizPop(st, ph.eye.x, ph.eye.y - 56, 'Splash! Its eye was shut!', '#ffffff', 15); Sfx.play('wizCaulSplish'); } return; }
  }
  if (u.rider) Object.assign(S, { x: u.x + 8 * u.face - S.w / 2, y: u.y - WIZBEAST.body.h + 14 - S.h, vx: 0, vy: 0, grounded: true, ground: null });
  else wizBody(S, dt, sol);
}
function wizExStrike(st, s) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, f = WIZEXAM_FIN[ph.round];
  wizSparks(ph.eye.x, ph.eye.y, f.key, 26); Sfx.play('wizSpell_' + f.key); Sfx.play('wizExRoar'); ph.roar = 1.4;
  wizPop(st, ph.eye.x, ph.eye.y - 60, f.word, '#ffd23f', 30); if (!reduceMotion) G.shake = 0.4;
  wizSay(st, ['Ooh! Right in the eye! It hates that!', 'A door in its face! Ha!', 'The Brew! Look, it\'s shrinking!'][ph.round], 2.4);
  if (ph.puff && ph.puff.rider) Object.assign(s, { x: ph.hx + 300 - s.w / 2, y: F - s.h, vx: 0, vy: 0, grounded: true, ground: null });
  ph.round++;
  if (ph.round >= 3) { Object.assign(ph, { mode: 'shrink', jarT: 0, attacks: [], shadows: [], puff: null, eyeOpen: false, darkT: 0 }); wizNews(st, 'The Blot shrinks!', false, 2); return; }
  wizExAttackStart(st, 1.4); wizSwap(st);
  wizNews(st, 'Round ' + (ph.round + 1) + ' of 3! It\'s angrier now' + (ph.round === 1 ? ', and it wants the lights off.' : '. Everything at once!'), false, 2.8);
}
function wizExReady(ph, S) {
  if (ph.round === 0) { const top = ph.steps[2]; return S.grounded && S.ground === top; }
  if (ph.round === 1) return (S.grounded && S.ground === ph.ledgeH) || wizExNearEye(ph, S);
  const u = ph.puff; return !!(u && u.rider && (u.mode === 'charge' || u.mode === 'leap'));
}
function wizExHallPlan(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, R = wizExRoles(ph), H0 = ph.hx, out = [null, null];
  const lo = H0 + 30, hi = H0 + K.hall.front - 30;
  if (ph.mode === 'attack') {
    const dark = ph.darkT > 0;
    for (const p of ps) {
      const id = p.id, cx = wizExCx(p), me = { why: 'dodge', x: cx };
      if (ph.down[id] > 0) { out[id] = { why: 'down', x: cx }; continue; }
      const glowJob = dark && id === R.a;
      let danger = false;
      const arm = !glowJob && ph.attacks.find(a => a.kind === 'arm' && !a.slammed && Math.abs(a.x - cx) < K.arm.reach - 12 && a.t > 0.12);
      const wave = ph.attacks.find(a => a.kind === 'wave' && a.x > cx - 10 && a.x - cx < 150);
      const bolt = ph.attacks.find(a => a.kind === 'bolt' && !a.back && Math.abs(a.y - (p.y + p.h / 2)) < 40 && a.x - cx < 260 && a.x > cx - 20);
      const candle = ph.attacks.find(a => a.kind === 'candle' && !a.fell && Math.abs(a.x - cx) < K.candle.r + 30);
      if (arm) { me.tap = 'act'; me.cast = 'flame'; danger = true; }
      else if (wave && p.grounded && !glowJob && wave.x - cx > 60) { me.tap = 'act'; me.cast = 'frost'; danger = true; }
      else if (bolt && !glowJob) { me.hold = true; me.cast = 'shield'; danger = true; }
      else if (wave && p.grounded && wave.x - cx < 70) { me.jump = true; danger = true; }
      if (candle) { let x = candle.x + (cx < candle.x ? -1 : 1) * (K.candle.r + 50); if (x < lo || x > hi) x = candle.x - Math.sign(x - candle.x) * (K.candle.r + 50); me.x = clamp(x, lo, hi); danger = true; }
      out[id] = danger ? me : null;
    }
    if (dark) {
      const g = ps[R.a], o = ps[R.b], far = Math.abs(wizExCx(o) - wizExCx(g)) > 80, gp = out[R.a] || (far ? { why: 'glow', x: clamp(wizExCx(o) - 20, lo, hi), dead: 30 } : { why: 'glow' });   // (the light stands still once the partner is in it: they come to the light, it doesn't chase them)
      out[R.a] = Object.assign(gp, { why: 'glow', hold: true, cast: 'glow', say: 'Hold ' + wizExKey(R.a, 'act') + ' to GLOW! Keep your partner in the light!' });
      delete out[R.a].tap;
      if (!out[R.b]) out[R.b] = { why: 'light', x: clamp(wizExCx(g) + 30, lo, hi), dead: 20, say: 'Stay in the light!' };
      else if (out[R.b].x === wizExCx(o)) out[R.b].x = clamp(wizExCx(g) + 30, lo, hi);
    }
    for (const id of [0, 1]) if (!out[id]) out[id] = { why: 'wait', x: H0 + (id === R.a ? 230 : 430) };
    return out;
  }
  if (ph.mode !== 'eye') return [{ why: 'wait', x: wizExCx(ps[0]) }, { why: 'wait', x: wizExCx(ps[1]) }];
  const L = ps[R.a], S = ps[R.b], lOn = Math.abs(wizExCx(L) - (H0 + K.hall.circle)) < K.hall.circleR - 4 && L.grounded, sx = wizExCx(S);
  out[R.a] = { why: 'lift', x: H0 + K.hall.circle, dead: 24, hold: lOn && wizExReady(ph, S) && !ph.tired, say: 'Stand in the lift circle and HOLD ' + wizExKey(R.a, 'act') + ' when your partner is ready!' };
  let P;
  if (ph.round === 0) {
    const k = ph.steps.findIndex(s => S.grounded && S.ground === s);
    if (!S.grounded) P = { why: 'air', x: sx };   // (mid-jump: straight up through the step above)
    else if (k === 2) {
      P = { why: 'flame', x: ph.steps[2].x0 + 75, face: 1, hold: ph.eyeOpen, cast: 'flame', say: 'FLAME the eye: hold ' + wizExKey(S.id, 'act') + ' while it\'s open!' };
      if (!ph.eyeOpen && ph.steps[2].ice < 3.5) P.tap = 'act';   // (the eye is shut: the action freezes the step again)
    }
    else {
      const nx = ph.steps[k + 1], cur = k >= 0 ? ph.steps[k] : null;
      if (nx.ice < 1.2 || (cur && cur.ice < 1.2)) {
        const fx = k < 0 ? nx.x0 - 40 : cur.cx;   // (the frost reaches 150 px ahead: anywhere on a step will do)
        P = { why: 'frost', x: fx, face: 1, dead: k < 0 ? 5 : 30, tap: Math.abs(sx - fx) < (k < 0 ? 30 : 50) && S.face > 0 ? 'act' : null, say: 'Face the ink fall and FROST it: ' + wizExKey(S.id, 'act') };
      } else {
        const jx = k < 0 ? nx.x0 + 50 : k === 0 ? H0 + 575 : H0 + 655;
        P = { why: 'climb', x: jx, jump: Math.abs(sx - jx) < (k < 0 ? 30 : 20), say: 'Jump up the ice steps: ' + wizExKey(S.id, 'jump') };
      }
    }
  } else if (ph.round === 1) {
    const onH = S.grounded && S.ground === ph.ledgeH, Pl = wizExPlates(ph);
    if (onH) P = { why: 'cast', x: ph.ledgeH.x1 - 22, tap: ph.eyeOpen ? 'act' : null, say: 'Cast DOOR at the eye: ' + wizExKey(S.id, 'act') + ' (when it\'s open)' };
    else {
      const good = ph.inD && ph.outD && ph.outD.q === 'H' && ph.inD.q === 'L';
      if (good) P = { why: 'door', x: Pl.L.x + (sx < Pl.L.x ? 40 : -40), say: 'Walk into the IN door!' };
      else {
        const stand = H0 + 360;
        P = { why: 'draw', x: stand, say: wizExKey(S.id, 'up') + ' / ' + wizExKey(S.id, 'down') + ' picks a plate, ' + wizExKey(S.id, 'act') + ' stamps: IN low, then OUT up high' };
        if (Math.abs(sx - stand) < 30) {
          const reach = wizExReach(ph, S), sel = wizExSel(ph, S, reach), want = ph.outD ? null : ph.inD ? (ph.inD.q === 'L' ? 'H' : null) : 'L';
          if (!want) P.tap = 'act';
          else if (sel !== want && reach.includes(want)) Object.assign(P, reach.indexOf(want) < reach.indexOf(sel) ? { upTap: true } : { downTap: true });
          else if (sel === want) P.tap = 'act';
        }
      }
    }
  } else {
    const u = ph.puff;
    if (!u || u.mode === 'enter') P = { why: 'wait', x: H0 + 260 };
    else if (!u.rider) P = { why: 'mount', x: u.mode === 'wait' ? u.x : H0 + 260, say: 'Climb on the thunderpuff!' };
    else {
      const arms = H0 + WIZEXAM.puff.arms, win0 = arms - WIZEXAM.puff.win[0] - (ph.goldPepper ? 120 : 0);
      P = { why: 'ride', x: sx, say: 'At the arms: PEPPER (' + wizExKey(S.id, 'act') + '). At the top of the leap: toss the BREW!' };
      if (u.mode === 'run' && !u.fed && u.x >= win0 + 30) P.tap = 'act';
      if (u.mode === 'leap' && u.bottle && ph.eyeOpen && Math.abs(u.vy) < 250) P.tap = 'act';
    }
  }
  out[R.b] = P;
  return out;
}
function wizExCoast(st, dt) {
  const ph = st.ph;
  if (!ph.solids) { wizCoast(dt); return; }
  const g = ph.part === 1 && ph.gates && ph.gates[ph.gate];
  const seated = g && g.kind === WIZEX_BROOM && g.sub.mode !== 'mount';
  const rider = ph.part === 2 && ph.puff && ph.puff.rider ? wizExRoles(ph).b : -1;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; if (!seated && p.id !== rider) wizBody(p, dt || 0, ph.part === 2 && ph.hallBase ? wizExHallSolids(ph) : ph.solids, { still: true }); }
  wizExCam(st, dt || 0);
}

/* ======================================== DRAWING ======================================== */
const WIZEXAM_C = { ink: '#14121e', inkHi: '#3a3650', inkSh: '#5a5478', wall: '#4a4060', wallDk: '#2e2840', floor: '#6a5a48' };
let wizExDarkCv = null;
// darkness over world x0..x1 with soft holes (holes: [{ x, y, r }] world coords); keep: players drawn faintly
function wizExDark(st, x0, x1, holes, alpha, keep) {
  if (alpha <= 0) return;
  if (!wizExDarkCv) wizExDarkCv = document.createElement('canvas');
  if (wizExDarkCv.width !== W || wizExDarkCv.height !== H) { wizExDarkCv.width = W; wizExDarkCv.height = H; }
  const g = wizExDarkCv.getContext('2d'), cx = st.cam.x, sx0 = clamp(x0 - cx, 0, W), sx1 = clamp(x1 - cx, 0, W);
  if (sx1 <= sx0) return;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(6,3,14,' + alpha + ')'; g.fillRect(sx0, 0, sx1 - sx0, H);
  g.globalCompositeOperation = 'destination-out';
  for (const o of holes) { const hx = o.x - cx, hy = o.y - st.cam.y, gr = g.createRadialGradient(hx, hy, o.r * 0.55, hx, hy, o.r * 1.05); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(hx, hy, o.r * 1.05, 0, Math.PI * 2); g.fill(); }
  for (const p of keep || []) { const lx = p.x + p.w / 2, ly = p.y + p.h / 2, gl = g.createRadialGradient(lx, ly, 8, lx, ly, 36); gl.addColorStop(0, 'rgba(0,0,0,0.85)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 36, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(st.cam.x, st.cam.y); ctx.drawImage(wizExDarkCv, 0, 0, W, H); ctx.restore();
}
function wizExDrawShadow(s, t) {
  const a = s.die != null ? Math.max(0, s.die / 0.4) : 1, blink = Math.sin(t * 3 + s.eye) > 0.96;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(14,8,26,0.92)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 16 + Math.sin(t * 8 + s.eye) * 2, 12, 0, 0, Math.PI * 2); ctx.fill();
  for (let n = -1; n <= 1; n += 2) { ctx.beginPath(); ctx.moveTo(s.x + n * 10, s.y + 6); ctx.lineTo(s.x + n * 16 + Math.sin(t * 10 + n) * 3, s.y + 12); ctx.lineTo(s.x + n * 4, s.y + 10); ctx.fill(); }
  if (!blink) { ctx.fillStyle = '#ffffff'; const d = Math.sign(s.vx || 1) * 2; circle(s.x - 5 + d, s.y - 3, 3); ctx.fill(); circle(s.x + 5 + d, s.y - 3, 3); ctx.fill(); }
  ctx.restore();
}
function wizExDrawInk(x0, x1, y, t) {
  ctx.fillStyle = WIZEXAM_C.ink; ctx.fillRect(x0, y, x1 - x0, H - y);
  ctx.fillStyle = WIZEXAM_C.inkSh; for (let x = x0 + 14; x < x1 - 8; x += 34) { ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 2 + x) * 4, y + 9, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 6, y + 2, (x1 - x0) * 0.3, 2);
}
function wizExDrawJet(x, y, f, len, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
  const gr = ctx.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(255,240,140,0.95)'); gr.addColorStop(0.5, 'rgba(255,150,60,0.85)'); gr.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -4); for (let k = 0; k <= 6; k++) ctx.lineTo(k * len / 6, -6 - k * 2.5 + Math.sin(t * 30 + k) * 3); for (let k = 6; k >= 0; k--) ctx.lineTo(k * len / 6, 6 + k * 2.5 + Math.sin(t * 27 + k) * 3); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function wizExDrawLever(x, y, pulled, t) {
  ctx.fillStyle = WIZC.woodDk; ctx.fillRect(x - 6, y - 40, 12, 40); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 36); ctx.lineTo(x + (pulled ? 22 : -22), y - 70); ctx.stroke();
  ctx.fillStyle = pulled ? '#7ee07a' : '#ff5f6d'; circle(x + (pulled ? 22 : -22), y - 70, 7); ctx.fill();
  if (!pulled) { ctx.save(); ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 5); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; circle(x - 22, y - 70, 12); ctx.stroke(); ctx.restore(); }
}
function wizExDrawFocus(x, y, k, tired, col = WIZ_SPELLS.lift.col) {
  ctx.fillStyle = 'rgba(30,20,66,0.8)'; rr(x - 26, y - 5, 52, 10, 5); ctx.fill();
  ctx.fillStyle = tired ? '#ff8a8a' : col; rr(x - 24, y - 3, 48 * clamp(k, 0, 1), 6, 3); ctx.fill();
}
function wizExDrawRing(x, y, t) {
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.8, lx = x + Math.cos(a) * 46, ly = y - 19 + Math.sin(a) * 46; ctx.fillStyle = '#ffd86b'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(lx - 5, ly - 7, 10, 14, 3); ctx.fill(); ctx.stroke(); }
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffd86b'; circle(x, y - 19, 44); ctx.fill(); ctx.restore();
}
function wizExDrawBack(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, C2 = WIZEXAM_C, cx = st.cam.x, t = G.clock;
  wizScreen(st, () => { const g = ctx.createLinearGradient(0, 0, 0, F); g.addColorStop(0, '#221a36'); g.addColorStop(1, '#3e3050'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
  // the school's corridors: windows, portraits whose eyes follow the Blot, ink dripping from the ceiling
  ctx.fillStyle = C2.wall; ctx.fillRect(cx - 40, 40, W + 80, F - 40);
  // stone courses, a dado rail and darker wainscot panels low on the wall
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let y = 80, r = 0; y < F - 110; y += 40, r++) { ctx.moveTo(cx - 40, y); ctx.lineTo(cx + W + 40, y); for (let x = Math.floor((cx - 40) / 90) * 90 + (r % 2) * 45; x < cx + W + 40; x += 90) { ctx.moveTo(x, y); ctx.lineTo(x, y + 40); } }
  ctx.stroke();
  ctx.fillStyle = C2.wallDk; ctx.fillRect(cx - 40, F - 100, W + 80, 100);
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx - 40, F - 106, W + 80, 8); ctx.fillStyle = 'rgba(255,230,180,0.2)'; ctx.fillRect(cx - 40, F - 106, W + 80, 2);
  for (let x = Math.floor((cx - 40) / 120) * 120; x < cx + W + 40; x += 120) { ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2; ctx.strokeRect(x + 12, F - 86, 96, 72); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(x + 14, F - 84, 96, 72); }
  for (let x = Math.floor((cx - 40) / 240) * 240; x < cx + W + 240; x += 240) {
    ctx.fillStyle = '#5a4a3a'; rr(x + 54, 104, 82, 132, 40); ctx.fill();
    const wg = ctx.createLinearGradient(0, 110, 0, 230); wg.addColorStop(0, '#16224a'); wg.addColorStop(1, '#2e3a6a');
    ctx.fillStyle = wg; rr(x + 60, 110, 70, 120, 34); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,233,168,0.2)'; circle(x + 95, 140, 12); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; circle(x + 95, 140, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,40,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 95, 112); ctx.lineTo(x + 95, 230); ctx.moveTo(x + 60, 176); ctx.lineTo(x + 130, 176); ctx.stroke();
    ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x + 52, 230, 86, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 163, 123, 44, 56);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 160, 120, 44, 56); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x + 160, 120, 44, 3); ctx.fillStyle = '#c8b090'; ctx.fillRect(x + 166, 126, 32, 44);
    ctx.fillStyle = '#7a6a8a'; ctx.beginPath(); ctx.moveTo(x + 170, 170); ctx.quadraticCurveTo(x + 182, 150, x + 194, 170); ctx.fill();
    const look = ph.part === 1 ? -2 : 0; ctx.fillStyle = '#ffffff'; circle(x + 176, 142, 3); ctx.fill(); circle(x + 188, 142, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(x + 176 + look, 142, 1.5); ctx.fill(); circle(x + 188 + look, 142, 1.5); ctx.fill();
    ctx.fillStyle = C2.ink; const d = (t * 40 + x) % 120; rr(x + 220, 40, 10, 20 + d * 0.3, 5); ctx.fill(); circle(x + 225, 60 + d * 1.2, 5); ctx.fill();
  }
  ctx.fillStyle = C2.wallDk; ctx.fillRect(cx - 40, 0, W + 80, 44);
  for (const r of ph.solids) if ((r.kind === 'floor' || r.kind === undefined) && r.y0 === F && r.x1 > cx - 40 && r.x0 < cx + W + 40) {
    // (art pass) the exam corridor floor: an oak sill with nicks over big sandstone flags with chips, cracks and specks,
    // darker towards the front (a cached strip pinned to the world, clipped to this floor)
    const a = Math.max(r.x0, cx - 40), b = Math.min(r.x1, cx + W + 40), fh = Math.ceil(H - r.y0);
    ctx.save(); ctx.beginPath(); ctx.rect(a, r.y0, b - a, H - r.y0); ctx.clip();
    RICH.strip('wizexfloor|' + fh, a, b, r.y0, fh, 256, (c, gx, w, h) => {
      RICH.flags(c, 0, 8, w, h - 8, { col: C2.floor, course: 32, len: 70, seed: 21, gx, fade: 0.3 });
      RICH.boards(c, 0, 0, w, 8, { col: '#8a7458', bh: 8, len: 180, seed: 3, gx, nails: false });
      c.fillStyle = 'rgba(255,235,190,0.3)'; c.fillRect(0, 0, w, 2); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 8, w, 2);
    });
    ctx.restore(); }
  if (ph.part === 2 || cx + W > wizExHallX() - 100) wizExDrawHallBack(st);
}
function wizExDrawHallBack(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, H0 = wizExHallX(), t = G.clock, dark = ph.part === 2 && ph.darkT > 0;
  ctx.fillStyle = '#3a2a4a'; ctx.fillRect(H0 - 30, 0, K.hall.w + 600, F);
  ctx.fillStyle = '#2e2240'; for (let k = 0; k < 6; k++) ctx.fillRect(H0 + 20 + k * 150, 0, 26, F);
  for (let k = 0; k < 4; k++) {
    const wx = H0 + 70 + k * 170;
    ctx.fillStyle = '#2a3a6a'; rr(wx, 70, 80, 160, 40); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    if (dark || (ph.part === 2 && ph.mode === 'attack' && K.dark.at[ph.round] != null && !ph.darkDone && ph.atkT > K.dark.at[ph.round] - 1.2)) { ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.moveTo(wx - 4, 66); ctx.lineTo(wx + 84, 66); for (let n = 0; n <= 4; n++) ctx.lineTo(wx + 84 - n * 22, 230 + Math.sin(t * 3 + n + k) * 6); ctx.closePath(); ctx.fill(); }
  }
  // banners and the candelabra overhead
  for (let k = 0; k < 3; k++) { const bx = H0 + 150 + k * 230; ctx.fillStyle = ['#8a3a4a', '#3a5a8a', '#4a7a4a'][k]; ctx.beginPath(); ctx.moveTo(bx, 40); ctx.lineTo(bx + 40, 40); ctx.lineTo(bx + 40, 120); ctx.lineTo(bx + 20, 106); ctx.lineTo(bx, 120); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#c8a040'; ctx.fillRect(H0 - 30, F - 400, 30, 400);
}
// the flood's front: a wall of ink taller than the corridor, arms reaching for the rear wizard, two huge white eyes
function wizExDrawFlood(st) {
  const ph = st.ph, F = WIZEXAM.floor, t = G.clock, x = ph.blot, C2 = WIZEXAM_C, ps = G.players;
  const rear = Math.min(ps[0].x, ps[1].x) + st.cam.x, gap = rear - x, near = clamp(1 - gap / 500, 0, 1);
  ctx.save();
  if (ph.roar > 0 && !reduceMotion) ctx.translate(Math.sin(t * 60) * 3 * ph.roar, 0);
  ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(x - 1600, -20); ctx.lineTo(x - 40, -20);
  for (let y = -20; y <= H + 30; y += 24) ctx.lineTo(x + Math.sin(t * 3 + y * 0.05) * 26 + Math.sin(t * 1.3 + y * 0.013) * 18 + (y > F - 80 ? 50 : 0) + (y < 60 ? -30 : 0), y);
  ctx.lineTo(x - 1600, H + 40); ctx.closePath(); ctx.fill();
  // arms reaching ahead (longer when it is close)
  for (let k = 0; k < 3; k++) {
    const ay = 150 + k * 110, reach = 70 + near * 120 + Math.sin(t * 2.2 + k * 2) * 40;
    ctx.beginPath(); ctx.moveTo(x - 10, ay - 22); ctx.quadraticCurveTo(x + reach * 0.6, ay - 40 + Math.sin(t * 3 + k) * 20, x + reach, ay + Math.sin(t * 4 + k) * 16); ctx.quadraticCurveTo(x + reach * 0.5, ay + 30, x - 10, ay + 22); ctx.closePath(); ctx.fill();
    for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.ellipse(x + reach + Math.cos(n * 2.1 + t * 3) * 10, ay + Math.sin(n * 2.1 + t * 3) * 10 + Math.sin(t * 4 + k) * 16, 7, 4, n, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = C2.inkHi; for (let k = 0; k < 7; k++) { circle(x - 60 + Math.sin(t * 2 + k) * 12, 40 + k * 62, 10 + (k % 3) * 3); ctx.fill(); }
  // Thimblewick floats inside, armchair, teacup and all, behind the glossy ink
  const c = st.hm;
  if (c.x > st.cam.x - 80) {
    wizDrawHm(Object.assign({}, c, { hidden: false, alpha: 0.85 }));
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = C2.ink; circle(c.x, c.y - 40, 62); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(200,200,255,0.4)'; ctx.lineWidth = 2; circle(c.x, c.y - 40, 64 + Math.sin(t * 3) * 3); ctx.stroke();
  }
  // the eyes: huge, white, following the rear wizard; the mouth opens like a spill
  const ey = 170, look = clamp((rear - x) / 300, -1, 1) * 6;
  for (const [ex, rx, ry] of [[x - 80, 34, 44], [x - 190, 28, 38]]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey + (ex === x - 80 ? 0 : -14), rx, ry * (Math.sin(t * 0.7) > 0.97 ? 0.15 : 1), 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C2.ink; circle(ex + 8 + look, ey + 8 + (ex === x - 80 ? 0 : -14), rx * 0.4); ctx.fill(); }
  const mo = 30 + Math.sin(t * 5) * 10 + near * 30;
  ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.moveTo(x - 160, 300); ctx.quadraticCurveTo(x - 90, 300 + mo * 2, x - 20, 300); ctx.quadraticCurveTo(x - 90, 300 - mo * 0.4, x - 160, 300); ctx.fill();
  ctx.fillStyle = C2.ink; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 140 + k * 34, 300); ctx.lineTo(x - 128 + k * 34, 300 + mo * (0.8 + (k % 2) * 0.5)); ctx.lineTo(x - 116 + k * 34, 300); ctx.fill(); }
  ctx.restore();
  // drips from the ceiling ahead of it, and a red edge when it is close
  for (let k = 0; k < 4; k++) { const dx = x + 80 + k * 90, d = (t * 120 + k * 47) % 200; ctx.fillStyle = C2.ink; rr(dx, 40, 8, 10 + d * 0.15, 4); ctx.fill(); circle(dx + 4, 50 + d * 1.6, 5); ctx.fill(); }
  if (near > 0.3) wizScreen(st, () => { const g = ctx.createLinearGradient(0, 0, 160, 0); g.addColorStop(0, 'rgba(200,40,60,' + (0.35 * (near - 0.3)) + ')'); g.addColorStop(1, 'rgba(200,40,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 160, H); });
}
function wizExDraw(st) {
  const ph = st.ph, cx = st.cam.x;
  ctx.lineJoin = 'round';
  if (ph.part === 1) for (const g of ph.gates) {
    if (g.x + g.w + 200 < cx || g.x > cx + W + 200) continue;
    g.kind.draw(st, g);
    // the gate's sign: its spell, over the entrance
    const sp = WIZ_SPELLS[g.kind.spell] || WIZ_SPELLS.zoom, sx = g.x + 60;
    // (a hanging plaque below the top HUD band, sized to its words)
    const label = g.k + 1 + '. ' + (g.kind.key === 'frostflame' ? 'Frost + Flame' : sp.name), sy = 150;
    text('', 0, 0, 14, '#ffffff', 'left', 'body'); const tw = ctx.measureText(label).width;
    ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 4, 44); ctx.lineTo(sx - 4, sy - 16); ctx.moveTo(sx + tw + 20, 44); ctx.lineTo(sx + tw + 20, sy - 14); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(sx - 18, sy - 14 + 4, tw + 52, 28, 14); ctx.fill();
    ctx.fillStyle = '#2a2238'; ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 2; rr(sx - 18, sy - 14, tw + 52, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(sx, sy, 16); ctx.fill(); ctx.stroke();
    wizDrawSpellIcon(g.kind.key === 'frostflame' ? 'frostflame' : WIZ_ORDER.find(k => WIZ_CLASSES[k].spell === g.kind.spell) || 'broom', sx, sy, 11);
    text(label, sx + 24, sy + 1, 14, '#ffffff', 'left', 'body');
  }
  if (ph.part === 2) wizExDrawHall(st);
}
// the huge Blot in the Great Hall (it rears in the eye phase; Thimblewick floats in its tummy)
function wizExDrawHallBlot(st, shrink) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, t = G.clock, H0 = ph.hx, C2 = WIZEXAM_C, k = 1 - shrink * 0.92;
  const rear = ph.mode === 'eye' ? -50 : 0, fl = ph.flinch > 0 ? Math.sin(t * 50) * 8 : 0;
  ctx.save(); ctx.translate(H0 + K.hall.front + 120 + fl, F); ctx.scale(k, k);
  if (ph.roar > 0 && !reduceMotion) ctx.translate(Math.sin(t * 50) * 4 * ph.roar, 0);
  ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(-170, 0);
  ctx.quadraticCurveTo(-210, -260 + rear, -140, -420 + rear); ctx.quadraticCurveTo(-60, -560 + rear, 120, -540 + rear); ctx.quadraticCurveTo(320, -520, 420, -380); ctx.lineTo(500, 0); ctx.closePath(); ctx.fill();
  // drips off its chin and gloss
  for (let n = 0; n < 5; n++) { const dx = -180 + n * 26, d = (t * 50 + n * 37) % 70; ctx.beginPath(); ctx.ellipse(dx, -120 + n * 18 + d, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C2.inkHi; circle(-110, -380 + rear, 30); ctx.fill(); circle(-160, -200, 18); ctx.fill(); circle(60, -470 + rear, 22); ctx.fill();
  ctx.restore();
  // Thimblewick inside (drawn in world coords), behind a glossy layer
  const c = st.hm;
  if (shrink < 0.5) {
    wizDrawHm(Object.assign({}, c, { hidden: false, alpha: 0.85 }));
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = C2.ink; circle(c.x, c.y - 40, 70); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(200,200,255,0.4)'; ctx.lineWidth = 2; circle(c.x, c.y - 40, 72 + Math.sin(t * 3) * 3); ctx.stroke();
    if (ph.mode === 'eye' && ph.eyeOpen) { ctx.strokeStyle = WIZ_SPELLS.lift.col; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(H0 + K.hall.circle, F - 34); ctx.quadraticCurveTo(H0 + 600, F - 480, c.x, c.y - 30); ctx.stroke(); ctx.setLineDash([]); }
  }
  // the eyes (the round's one glows when it rears; it is propped wide while the Lift holds it)
  ctx.save(); ctx.translate(H0 + K.hall.front + 120 + fl, F); ctx.scale(k, k); ctx.translate(-(H0 + K.hall.front + 120), -F);
  const e = ph.eye, open = ph.mode !== 'eye' ? 1 : ph.eyeOpen ? 1.25 : 0.2, rearY = ph.mode === 'eye' ? -50 : 0;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(e.x, e.y + rearY + 30, K.eye.r + 6, (K.eye.r + 14) * open, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.x + 120, e.y + rearY + 4, 30, 40, 0, 0, Math.PI * 2); ctx.fill();
  if (ph.mode === 'eye') { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(e.x, e.y + rearY + 30, K.eye.r + 20, K.eye.r + 28, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  const px = clamp((wizExCx(G.players[0]) + st.cam.x - e.x) / 400, -1, 0) * 8;
  ctx.fillStyle = C2.ink; circle(e.x + px, e.y + rearY + 36, 13 * Math.min(1, open)); ctx.fill(); circle(e.x + 114 + px, e.y + rearY + 10, 11); ctx.fill();
  // the mouth
  const mo = 34 + Math.sin(t * 4) * 12 + (ph.roar > 0 ? 30 : 0);
  ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.ellipse(e.x + 50, F - 170, 80, mo, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C2.ink; for (let n = 0; n < 5; n++) { ctx.beginPath(); ctx.moveTo(e.x - 20 + n * 30, F - 170 - mo); ctx.lineTo(e.x - 8 + n * 30, F - 170 - mo * 0.4); ctx.lineTo(e.x + 4 + n * 30, F - 170 - mo); ctx.fill(); }
  ctx.restore();
}
function wizExDrawHall(st) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, t = G.clock, H0 = ph.hx, C2 = WIZEXAM_C;
  if (!ph.attacks) return;
  const shrink = ph.mode === 'shrink' || ph.mode === 'done' ? clamp((ph.jarT || 0) / 1.2, 0, 1) : 0;
  if (shrink < 1) wizExDrawHallBlot(st, shrink);
  else {
    // the little puddle in a jar, and the armchair it burped out
    ctx.fillStyle = WIZC.chair; rr(H0 + 690, F - 60, 70, 60, 12); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,0.45)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(H0 + 560, F - 70, 60, 70, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.ellipse(H0 + 590, F - 12, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(H0 + 582, F - 20, 6); ctx.fill(); circle(H0 + 598, F - 20, 6); ctx.fill(); ctx.fillStyle = C2.ink; circle(H0 + 583, F - 19, 2.5); ctx.fill(); circle(H0 + 599, F - 19, 2.5); ctx.fill();
    ctx.fillStyle = '#c9a46a'; ctx.fillRect(H0 + 556, F - 78, 68, 10);
  }
  // the lift circle
  if (ph.mode === 'eye') { ctx.save(); ctx.strokeStyle = WIZ_SPELLS.lift.col; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); ctx.beginPath(); ctx.ellipse(H0 + K.hall.circle, F - 2, K.hall.circleR, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  // round 1: the ink falls and the ice steps
  if (ph.mode === 'eye' && ph.round === 0) for (const s of ph.steps) {
    if (s.ice > 0) {
      const crack = s.ice < WIZFF.crack && Math.sin(t * 20) > 0;
      ctx.fillStyle = 'rgba(223,244,255,0.85)'; ctx.strokeStyle = WIZFF_C.iceDk; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y0); ctx.lineTo(s.x1 - 14, F); ctx.lineTo(s.x0 + 14, F); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = crack ? '#ff8a8a' : '#ffffff'; ctx.fillRect(s.x0 + 6, s.y0 + 3, s.x1 - s.x0 - 12, 3);
    } else {
      ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(s.cx - 16, 0); ctx.lineTo(s.cx + 16, 0); for (let y = 0; y <= F; y += 30) ctx.lineTo(s.cx + 16 + Math.sin(t * 6 + y * 0.1) * 4, y); for (let y = F; y >= 0; y -= 30) ctx.lineTo(s.cx - 16 + Math.sin(t * 6 + y * 0.1 + 1) * 4, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C2.inkSh; for (let n = 0; n < 3; n++) { circle(s.cx + Math.sin(n * 2) * 6, (t * 260 + n * 140) % F, 4); ctx.fill(); }
      ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.strokeRect(s.x0, s.y0, s.x1 - s.x0, 14); ctx.restore();
    }
  }
  if (ph.mode === 'eye' && ph.round === 0 && ph.steps[2].ice > 0) { const l = ph.lip; ctx.fillStyle = 'rgba(223,244,255,0.9)'; ctx.strokeStyle = WIZFF_C.iceDk; ctx.lineWidth = 2; rr(l.x0, l.y0, l.x1 - l.x0, l.y1 - l.y0, 6); ctx.fill(); ctx.stroke(); }
  // round 2: the arms holding the chalk plates, the ledge above the eye
  if (ph.mode === 'eye' && ph.round === 1) {
    const P = wizExPlates(ph);
    ctx.fillStyle = C2.ink;
    for (const [x0, y0, x1, y1, w] of [[H0 + K.hall.front, F - 200, P.L.x + 26, F - 4, 22], [H0 + K.hall.front, F - 260, (ph.palm.x0 + ph.palm.x1) / 2, ph.palm.y0 + 10, 18], [H0 + K.hall.front, F - 300, (ph.ledgeH.x0 + ph.ledgeH.x1) / 2, ph.ledgeH.y0 + 10, 20]]) { ctx.beginPath(); ctx.moveTo(x0, y0 - w); ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 80, x1, y1 - w / 2); ctx.lineTo(x1, y1 + w / 2); ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 40, x0, y0 + w); ctx.closePath(); ctx.fill(); }
    for (const s of [ph.ledgeH, ph.palm]) { ctx.fillStyle = C2.inkHi; rr(s.x0, s.y0, s.x1 - s.x0, 14, 6); ctx.fill(); }
    for (const k of ['L', 'M', 'H']) { const q = P[k]; ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#e8e4f8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); rr(q.x - 17, q.y - 50, 34, 50, 14); ctx.stroke(); ctx.restore(); }
    if (ph.sel) { const q = P[ph.sel]; ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.strokeStyle = WIZ_SPELLS.door.col; ctx.lineWidth = 3; rr(q.x - 21, q.y - 54, 42, 56, 16); ctx.stroke(); ctx.restore(); }
    if (ph.inD) wizPoDrawDoor(P[ph.inD.q].x, P[ph.inD.q].y, 'in', t, ph.inD.t, false);
    if (ph.outD) wizPoDrawDoor(P[ph.outD.q].x, P[ph.outD.q].y, 'out', t, ph.outD.t, false);
  }
  // round 3: the gate of arms, the thunderpuff, the bottle
  if (ph.mode === 'eye' && ph.round === 2 && ph.puff) {
    const u = ph.puff, arms = H0 + K.puff.arms;
    if (u.armsUp) { ctx.fillStyle = C2.ink; for (let n = 0; n < 4; n++) { const ax = arms - 20 + n * 14 + Math.sin(t * 3 + n) * 4; ctx.beginPath(); ctx.moveTo(ax - 8, F); ctx.quadraticCurveTo(ax + Math.sin(t * 2 + n) * 20, F - 120, ax + 6, F - 190 - n * 10); ctx.lineTo(ax + 12, F); ctx.closePath(); ctx.fill(); } }
    const win0 = arms - K.puff.win[0] - (ph.goldPepper ? 120 : 0), win1 = arms - K.puff.win[1];
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = ph.goldPepper ? C.gold : '#ff5a3a'; ctx.fillRect(win0, F - 4, win1 - win0, 6); ctx.restore();
    wizBeastDrawPuff(u.x, u.y, 0.8, u.face, { run: u.mode === 'run' || u.mode === 'charge' || u.mode === 'back' || u.mode === 'enter', mouth: u.mode === 'charge', stat: u.mode === 'charge' ? 1 : 0.2 });
    if (u.mode === 'charge') { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; for (let n = 0; n < 4; n++) { ctx.beginPath(); ctx.moveTo(u.x - 60 - n * 10, u.y - 56 + n * 12); ctx.lineTo(u.x - 110 - n * 10, u.y - 56 + n * 12); ctx.stroke(); } }
    const S = G.players[wizExRoles(ph).b];
    if (u.rider) {
      wizDrawHero(S.id, u.x + 8 * u.face, u.y - WIZBEAST.body.h * 0.8 + 14, { face: u.face });
      if (u.bottle) { ctx.save(); ctx.translate(u.x + 8 * u.face + 14 * u.face, u.y - WIZBEAST.body.h * 0.8 - 6); ctx.fillStyle = 'rgba(126,224,122,0.9)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c9a46a'; ctx.fillRect(-3, -14, 6, 6); ctx.restore(); }
      if (u.mode === 'run' && !u.fed) wizBeastDrawSnack('pepper', u.x + 60, u.y - 110, 0.9, u.x >= win0 && Math.sin(t * 12) > 0);
    }
    if (ph.toss) { const k = clamp(ph.toss.t / 0.4, 0, 1), bx = ph.toss.x0 + (ph.eye.x - ph.toss.x0) * k, by = ph.toss.y0 + (ph.eye.y + 20 - ph.toss.y0) * k - Math.sin(k * Math.PI) * 60; ctx.save(); ctx.translate(bx, by); ctx.rotate(k * 8); ctx.fillStyle = 'rgba(126,224,122,0.95)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
  }
  // the frozen waves
  for (const h of ph.humps) { ctx.fillStyle = WIZFF_C.ice; ctx.strokeStyle = WIZFF_C.iceDk; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(h.x0, F); ctx.quadraticCurveTo((h.x0 + h.x1) / 2 - 6, h.y0 - 14, h.x1, F - 6); ctx.lineTo(h.x1 + 14, F); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // attacks
  for (const a of ph.attacks) {
    if (a.kind === 'wave') { ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(a.x - K.wave.w / 2, F); ctx.quadraticCurveTo(a.x - 10, F - K.wave.h - 14, a.x + K.wave.w / 2, F - 6); ctx.lineTo(a.x + K.wave.w / 2 + 34, F); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(a.x - 8, F - K.wave.h + 6, 3); ctx.fill(); circle(a.x + 2, F - K.wave.h + 8, 3); ctx.fill(); }
    else if (a.kind === 'bolt') { ctx.fillStyle = a.back ? '#7ac0ff' : C2.ink; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(a.x, a.y, K.bolt.r); ctx.fill(); ctx.stroke(); if (!a.back) { ctx.fillStyle = 'rgba(20,18,30,0.5)'; circle(a.x + 16, a.y, 7); ctx.fill(); circle(a.x + 28, a.y, 4); ctx.fill(); } }
    else if (a.kind === 'arm') {
      if (!a.slammed) { ctx.save(); ctx.strokeStyle = '#ff5f6d'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 18); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, F - 2, K.arm.w / 2, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); const k = clamp(1 - a.t / K.arm.warn, 0, 1); ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(H0 + K.hall.front, 140); ctx.quadraticCurveTo((H0 + K.hall.front + a.x) / 2, 40, a.x + 30, 60 + k * 80); ctx.lineTo(a.x - 10, 70 + k * 80); ctx.quadraticCurveTo((H0 + K.hall.front + a.x) / 2, 70, H0 + K.hall.front, 180); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = C2.ink; ctx.beginPath(); ctx.moveTo(H0 + K.hall.front, 120); ctx.quadraticCurveTo(a.x + 60, 60, a.x + 20, F - 60); ctx.lineTo(a.x - K.arm.w / 2, F); ctx.lineTo(a.x + K.arm.w / 2, F); ctx.lineTo(a.x + 40, F - 50); ctx.quadraticCurveTo(a.x + 90, 90, H0 + K.hall.front, 160); ctx.closePath(); ctx.fill(); }
    } else if (a.kind === 'candle') {
      const k = a.fell ? 1 : clamp(1 - a.t / K.candle.warn, 0, 1), y = a.fell ? F - 30 : 50 + k * k * (F - 120);
      ctx.fillStyle = 'rgba(20,18,30,' + (0.2 + 0.5 * k) + ')'; ctx.beginPath(); ctx.ellipse(a.x, F - 2, K.candle.r * (0.5 + 0.5 * k), 8, 0, 0, Math.PI * 2); ctx.fill();
      if (!a.fell) { ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, 0); ctx.lineTo(a.x, y - 20); ctx.stroke(); }
      ctx.fillStyle = '#c8a040'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(a.x - 36, y - 6, 72, 10, 4); ctx.fill(); ctx.stroke();
      for (const dx of [-30, -10, 10, 30]) { ctx.fillStyle = '#f2e6d0'; ctx.fillRect(a.x + dx - 3, y - 20, 6, 14); ctx.fillStyle = '#ffd23f'; circle(a.x + dx, y - 24, 3); ctx.fill(); }
    }
  }
  // flame jets in the attack sets
  for (const f of ph.flames) { const p = G.players[f.id]; wizExDrawJet(p.x + p.w / 2 + st.cam.x + f.f * 6, p.y + p.h / 2 + st.cam.y, f.f, WIZFF.jet, t); }
  if (ph.mode === 'eye' && ph.round === 0 && ph.jet) { const S = G.players[wizExRoles(ph).b]; wizExDrawJet(S.x + S.w / 2 + st.cam.x + 6, S.y + S.h / 2 + st.cam.y, 1, WIZFF.jet, t); }
}
function wizExDrawTop(st) {
  const ph = st.ph, K = WIZEXAM, t = G.clock;
  for (const p of G.players) {   // (players are in screen coords here: + the camera)
    if (!p.alive) continue;
    const px = p.x + st.cam.x + p.w / 2, py = p.y + st.cam.y;
    if (p.shield) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = WIZ_SPELLS.shield.col; circle(px, py + p.h / 2, 26); ctx.fill(); ctx.restore(); ctx.strokeStyle = WIZ_SPELLS.shield.dark; ctx.lineWidth = 2; circle(px, py + p.h / 2, 26); ctx.stroke(); }
    if (p.inked > 0) { ctx.fillStyle = 'rgba(20,18,30,0.6)'; circle(px - 4, py + 6, 5); ctx.fill(); circle(px + 6, py + 14, 4); ctx.fill(); }
    if (ph.part === 2 && ph.down && ph.down[p.id] > 0) text('zZ', px, py - 20 - Math.sin(t * 4) * 3, 14, '#c8b8ff', 'center');
  }
  if (ph.part === 1 && ph.mode !== 'intro') {
    const g = ph.gates[ph.gate];
    if (g && g.kind.drawTop) g.kind.drawTop(st, g);
    wizExDrawFlood(st);
    if (ph.gulp > 0) { ctx.fillStyle = 'rgba(20,18,30,' + Math.min(1, ph.gulp) + ')'; ctx.fillRect(st.cam.x, 0, W, H); }
  } else if (ph.mode === 'intro') {
    const k = clamp((ph.modeT - 1.4) / 1.8, 0, 1), c = st.hm;
    if (k > 0) {
      const bx = 560, F = K.floor;
      ctx.fillStyle = WIZEXAM_C.ink; ctx.beginPath(); ctx.ellipse(bx, F, 90 + k * 320, k * 380, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(bx - 60, F - k * 280, 24 * k, 32 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(bx + 50, F - k * 300, 20 * k, 28 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WIZEXAM_C.ink; circle(bx - 56, F - k * 276, 9 * k); ctx.fill(); circle(bx + 54, F - k * 296, 8 * k); ctx.fill();
      if (ph.modeT > 2.4) { wizDrawHm(Object.assign({}, c, { hidden: false })); ctx.save(); ctx.globalAlpha = clamp((ph.modeT - 2.4) / 0.8, 0, 0.6); ctx.fillStyle = WIZEXAM_C.ink; circle(c.x, c.y - 40, 64); ctx.fill(); ctx.restore(); }
    }
  }
  // lights out in the Great Hall
  if (ph.part === 2 && ph.darkT > 0) {
    const R = wizExRoles(ph), gl = G.players[R.a], fade = Math.min(1, (K.dark.t - ph.darkT) / 0.4, ph.darkT / 0.4);
    wizExDark(st, ph.hx - 60, ph.hx + 1400, ph.glowOn ? [{ x: gl.x + gl.w / 2 + st.cam.x, y: gl.y + gl.h / 2 - 10 + st.cam.y, r: K.dark.r }] : [], 0.96 * fade, [G.players[0], G.players[1]]);
    if (ph.glowOn) { ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffe9a0'; circle(gl.x + gl.w / 2 + st.cam.x, gl.y + gl.h / 2 - 10 + st.cam.y, K.dark.r); ctx.fill(); ctx.restore(); }
    for (const s of ph.shadows) wizExDrawShadow(s, t);
    for (const a of ph.attacks) if (a.kind === 'wave') { ctx.fillStyle = '#ffffff'; circle(a.x - 8, K.floor - K.wave.h + 6, 3); ctx.fill(); circle(a.x + 2, K.floor - K.wave.h + 8, 3); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ph.eye.x, ph.eye.y + 30, 20, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(ph.eye.x + 120, ph.eye.y + 4, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
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
  if (ph.part === 2 && ph.mode === 'eye') {
    const L = G.players[wizExRoles(ph).a];
    wizExDrawFocus(L.x + L.w / 2, L.y - 34, ph.focus, ph.tired);
  }
}

WIZ_PHASES.exam = {
  setup(st, L) { wizExSetup(st, L); },
  step(st, dt) { wizExStep(st, dt); },
  coast(st, dt) { wizExCoast(st, dt); },
  plan(st) { return wizExPlan(st); },
  labels(st) {
    const ph = st.ph, R = wizExRoles(ph);
    if (!ph.gates) return null;
    if (ph.part === 1) {
      const g = ph.gates[ph.gate], kd = g.kind, w = [null, null];
      if (kd === WIZEX_MORPH && g.part) { w[R.a] = 'pull'; w[R.b] = 'morph'; } else { w[R.a] = kd.words[0]; w[R.b] = kd.words[1]; }
      return w;
    }
    const w = ['cast', 'cast'];
    if (ph.mode === 'attack' && ph.darkT > 0) w[R.a] = 'glow';
    if (ph.mode === 'eye') { w[R.a] = 'lift'; w[R.b] = ['frost', 'door', 'feed'][ph.round] || 'cast'; }
    return w;
  },
  roles(st) {
    const ph = st.ph, R = wizExRoles(ph);
    if (!ph.gates) return null;
    const w = [null, null];
    if (ph.part === 1) { const g = ph.gates[ph.gate], kd = g.kind; if (kd === WIZEX_MORPH && g.part) { w[R.a] = 'Shift!'; w[R.b] = 'Morph!'; } else { w[R.a] = kd.jobs[0]; w[R.b] = kd.jobs[1]; } return w; }
    if (ph.mode === 'eye') { w[R.a] = 'Lift!'; w[R.b] = 'Strike!'; return w; }
    w[R.a] = ph.darkT > 0 ? 'Glow!' : 'Dodge!'; w[R.b] = 'Dodge!';
    return w;
  },
  legend(st) {
    const ph = st.ph, R = wizExRoles(ph);
    if (!ph.gates) return null;
    const lg = ['', ''];
    if (ph.part === 1) { const g = ph.gates[ph.gate], kd = g.kind, sw = kd === WIZEX_MORPH && g.part; lg[R.a] = kd.legend[sw ? 1 : 0]; lg[R.b] = kd.legend[sw ? 0 : 1]; return { pip: lg[0], bo: lg[1], pad: 'action casts the gate\'s spell,' }; }
    if (ph.mode === 'eye') { lg[R.a] = 'hold in the circle: Lift'; lg[R.b] = ['frost steps, flame the eye', 'stamp doors, cast Door', 'ride, pepper, toss'][ph.round] || 'strike'; return { pip: lg[0], bo: lg[1], pad: 'action lifts or strikes,' }; }
    return { pip: 'frost waves, shield bolts, flame arms', bo: 'frost waves, shield bolts, flame arms', pad: 'action casts what you need,' };
  },
  hudText(st) { const ph = st.ph; if (!ph.gates) return ''; return ph.part === 1 ? 'Gate ' + Math.min(8, ph.gate + 1) + ' of 8' : 'Round ' + Math.min(3, (ph.round || 0) + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; if (!ph.gates) return null; return ph.part === 1 ? { n: ph.gate, of: 11 } : { n: 8 + (ph.round || 0), of: 11 }; },
  hide(st) {
    const ph = st.ph;
    if (!ph.gates || ph.mode === 'intro') return false;
    if (ph.part === 1) { const g = ph.gates[ph.gate]; return g ? g.kind.hide(g) : false; }
    const h = [false, false]; if (ph.puff && ph.puff.rider && ph.mode === 'eye') h[wizExRoles(ph).b] = true; return h;
  },
  headLift(st, p) {
    const ph = st.ph;
    if (!ph.gates || ph.part !== 1) return ph.puff && ph.puff.rider && p.id === wizExRoles(ph).b ? 0 : 0;
    const g = ph.gates[ph.gate];
    if (g && g.kind === WIZEX_SIZE && g.ids && p.id === g.ids[1]) return g.sub.size === 'tiny' ? -16 : g.sub.size === 'giant' ? 40 : 0;
    return 0;
  },
  present(st, p) { const ph = st.ph; return !!(ph.gates && ph.part === 2 && ph.puff && ph.puff.rider && p.id === wizExRoles(ph).b); },
  drawBack(st) { if (st.ph.gates) wizExDrawBack(st); },
  draw(st) { if (st.ph.gates) wizExDraw(st); },
  drawTop(st) { if (st.ph.gates) wizExDrawTop(st); },
  hud(st) { if (st.ph.gates) wizExHud(st); },
  statLine(st) { const s = st.stats.exam; return s && s.gates ? 'Exam: ' + s.gates + ' gates, ' + (s.hits || 0) + ' ink splats' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizExTangle = function () { [880, 660, 990, 520, 1175].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, f * 0.6, i * 0.06)); };
Sfx.extra.wizExRoar = function () { this.tone(70, 0.9, 'sawtooth', 0.07, 40); this.tone(110, 0.7, 'square', 0.035, 55, 0.1); this.tone(52, 1.0, 'sawtooth', 0.04, 34, 0.2); };
Sfx.extra.wizExGloop = function () { this.tone(200, 0.3, 'sine', 0.06, 60); this.tone(90, 0.3, 'sawtooth', 0.03, 50, 0.1); };
Sfx.extra.wizExLever = function () { this.tone(300, 0.08, 'square', 0.04, 200); };
Sfx.extra.wizExSplat = function () { this.tone(160, 0.15, 'sawtooth', 0.04, 80); };
Sfx.extra.wizExBounce = function () { this.tone(800, 0.1, 'sine', 0.035, 1300); };
Sfx.extra.wizExSlam = function () { this.tone(60, 0.25, 'square', 0.06, 40); };
Sfx.extra.wizExCrash = function () { [1200, 900, 1500].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.025, f * 0.5, i * 0.04)); };
Sfx.extra.wizExSpit = function () { this.tone(400, 0.08, 'sawtooth', 0.025, 200); };
Sfx.extra.wizExPop = function () { this.tone(600, 0.06, 'sine', 0.04, 1200); };

/* ---------- the room ---------- */
wizRoom('exam', {
  act: { label: 'cast', labels: ['cast', 'cast'] },
  tip: 'The Blot is loose! Eight spell gates, each needing both of you, then the Great Hall.',
  legend: { pip: 'cast the gate\'s spell', bo: 'cast the gate\'s spell', pad: 'action casts,' },
  map: WIZ_EMPTY_MAP,
});

// skip to a gate ('g0'..'g7') or a round ('r0'..'r2') of the exam (bot tests)
function wizExSkipTo(st, where) {
  const ph = st.ph, K = WIZEXAM, F = K.floor, ps = G.players, m = /^([gr])(\d)$/.exec(where || '');
  if (!m || !ph.gates) return false;
  const n = +m[2];
  ph.mode = 'run'; ph.modeT = 0; ph.i1 = ph.i2 = true; st.say = null;
  if (m[1] === 'g') {
    for (let k = 0; k < n; k++) { const g = ph.gates[k]; g.said = true; g.kind.finish(g); }
    ph.gate = Math.min(n, K.gates() - 1);
    const g = ph.gates[ph.gate];
    ps.forEach((p, i) => Object.assign(p, { x: g.x + 10 + i * 40, y: F - p.h, vx: 0, vy: 0, grounded: true }));
    ph.blot = g.x - 600; st.cam.x = g.x - 300;
  } else {
    ph.gate = K.gates(); ph.part = 2; wizExHallSetup(st); ph.round = Math.min(2, n); ph.mode = 'hallIn'; ph.modeT = 99;
  }
  wizExCam(st, 1);
  return true;
}
MODES.wizschool.test.examAt = where => { const st = G.mst; let ok = false; wizInWorld(st, () => { ok = wizExSkipTo(st, where); }); return ok; };

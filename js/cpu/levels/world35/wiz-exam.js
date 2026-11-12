/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'exam' (Final Exam: The Big Mistake). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-exam.js): the class's own wizExPlan(st) gives each player one small step at a
   time (the same plan the hint bubbles show a person), and this brain only follows it, like a person reading the hint:
     x / dead   walk there (stop within dead px)            right      keep pushing right (a frog's run-up)
     face       turn that way once there                    hop        hop when pushing into something
     hold       hold the action (cast: the spell it must be: a wrong one is let go and pressed again)
     tap 'act'  press the action (at a human pace, 0.3 s)    up / down  hold up (W / ↑) or down
     upTap / downTap   one press of up / down (a dial, a plate, an aim)
     jump       true: press, and hold while rising (a full jump); 'tap': one short press
   The broom gate: STEER (why 'steer': up / down toward the plan's height, seen 0.12 s late) and KICK (why 'kick': a steady
   beat, like the Broom Flying class). Each gate needs both jobs, so it never clears a gate alone. */
const WIZEX_SPOTS = new Set(['pull', 'rope', 'lift', 'shield', 'zap', 'frost', 'flame', 'burn', 'climb', 'ladder', 'frog', 'draw', 'cast', 'morph', 'step', 'door']);
const WIZEX_PUZZLE = new Set(['draw', 'zap', 'morph', 'cast']);
WIZ_BRAINS.exam = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.gates || !ph.solids) return out;
    const P = wizExPlan(S)[p.id];
    if (!P) return out;
    if (P.why === 'steer') {
      const dir = wizBrainLate(bst, 'dir', P.up ? -1 : P.down ? 1 : 0, 0.12);
      if (dir < 0) out.up = true; else if (dir > 0) out.down = true;
      return out;
    }
    if (P.why === 'kick') {
      const g = ph.gates[ph.gate], b = g && g.sub;
      if (!b || !P.kick || b.spin > 0 || b.hot > 0) return out;
      if (b.mode === 'wait') { if ((bst.wait = (bst.wait || 0) + DT) > 0.6) { out.act = 'tap'; bst.wait = 0; } return out; }
      bst.tapT = (bst.tapT || 0) - DT;
      if (b.sinceKick >= (bst.beat || 0.5) && bst.tapT <= 0) { out.act = 'tap'; bst.tapT = 0.45; bst.n = (bst.n || 0) + 1; bst.beat = 0.5 + ((bst.n * 0.37) % 1) * 0.06; }
      return out;
    }
    // walking
    if (P.x != null) {
      const dead = P.dead != null ? P.dead : 5, d = Math.abs(P.x - wizExCx(p));
      const there = wizBrainSeek(out, p, P.x, dead);
      // close to a spot: short steps with a pause between, so a slow reaction doesn't overshoot it again and again
      // (a slow person sees the bubble and the world half a second late: steps short enough not to run past it)
      if (WIZEX_SPOTS.has(P.why) && d > dead && d < 150 && p.grounded) {
        bst.pulse = (bst.pulse || 0) - DT; if (bst.pulse <= 0) bst.pulse = 0.5;
        if (bst.pulse < (d < 60 ? 0.42 : 0.3)) { out.left = out.right = false; }
      }
      if (there && P.face && Math.sign(p.face || 1) !== P.face) { out.left = P.face < 0; out.right = P.face > 0; }
    }
    if (P.right) { out.right = true; out.left = false; }
    // no dithering: turning round takes a moment (a plan spot can hop from one side to the other between two steps,
    // e.g. when the partner stands right at the rim of the light)
    const dir = out.right ? 1 : out.left ? -1 : 0;
    bst.turnT = (bst.turnT || 0) - DT;
    if (dir && bst.dir && dir !== bst.dir && bst.turnT > 0) out.left = out.right = false;
    else if (dir) { if (dir !== bst.dir) bst.turnT = 0.3; bst.dir = dir; }
    if (P.hop || (!P.jump && (out.left || out.right))) wizBrainHop(bst, out, p);   // (a step in the way: hop it)
    // the action
    bst.rel = Math.max(0, (bst.rel || 0) - DT); bst.actT = (bst.actT || 0) - DT; bst.dialT = (bst.dialT || 0) - DT;   // (the clocks run every step)
    // a puzzle press (a plate, a dial, an aim): one at a time, then wait to see it take, so a slow hand never piles them up
    const slow = WIZEX_PUZZLE.has(P.why) ? 0.65 : 0.3;
    if (P.hold) {
      const k = ph.castK && ph.castK[p.id];
      if (P.cast && k && k !== P.cast && P.cast !== 'glow') bst.rel = 0.12;   // the wrong spell: let go and press again
      if (bst.rel <= 0) out.act = true;
    } else if (P.tap === 'act' && bst.actT <= 0) { out.act = 'tap'; bst.actT = slow; bst.dialT = Math.max(bst.dialT || 0, slow); }
    // up / down: held, or one press at a time
    if (P.up) out.up = true;
    if (P.down) out.down = true;
    if ((P.upTap || P.downTap) && bst.dialT <= 0) { if (P.upTap) out.up = true; else out.down = true; bst.dialT = Math.max(0.28, slow); bst.actT = Math.max(bst.actT, slow); }
    // jumping: a full jump holds the key while rising
    if (P.jump === 'tap') out.jump = 'tap';
    else if (P.jump && p.grounded) { out.jump = true; bst.rising = true; }
    else if (bst.rising) { if (!p.grounded && p.vy < 0) out.jump = true; else if (!p.grounded) bst.rising = false; }
    if (p.grounded && !P.jump) bst.rising = false;
    return out;
  },
};

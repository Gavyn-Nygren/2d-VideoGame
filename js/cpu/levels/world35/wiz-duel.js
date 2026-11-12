/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'duel' (Graduation Duel, versus). */
'use strict';

/* The computer is the RIVAL here (versus inside the team level), at the saved Opponent setting (info.vs: 0.35 / 0.7 / 1).
   It climbs to the rival's height (jumping up through a stone from below, walking off a stone's end to get down), taps
   a spark when the heights line up, holds a big bolt when the rival sits on the floor (or, on Hard, behind a shield),
   shields a spark coming at its height (and dodges a big bolt), grabs spell tokens and fires them at once, keeps off
   the top height before the thunderpuff sneezes and holds its sparks while the fountain is up.
   Skill: Easy 0.45 s to react, shields 30% of sparks, never a big bolt; Normal 0.28 s, 65%, sometimes; Hard 0.14 s,
   90%, a big bolt to break a shield. */
const WIZDU_SK = vs => ({ react: vs >= 0.95 ? 0.14 : vs >= 0.6 ? 0.28 : 0.45, shield: vs >= 0.95 ? 0.9 : vs >= 0.6 ? 0.65 : 0.3, big: vs >= 0.95 ? 1 : vs >= 0.6 ? 0.5 : 0, think: vs >= 0.95 ? 0.5 : vs >= 0.6 ? 0.8 : 1.3 });
// where to stand: [floor, low stone, high stone]; the stops on the way between them (see WIZDUEL.stones)
const WIZDU_SPOT = [[160, 180, 320], [800, 780, 640]];
function wizDuRoute(id, lv, want) {
  const L = id === 0;
  if (lv === want) return { x: WIZDU_SPOT[id][want] };
  if (lv === 0) return { x: L ? 180 : 780, jump: true };              // under the low stone: jump up onto it
  if (lv === 1) return want === 2 ? { x: L ? 240 : 720, jump: true } // under the high stone's overlap: jump straight up
    : { x: L ? 312 : 648 };                                          // walk off the low stone's inner end
  return want === 1 ? { x: L ? 198 : 762 } : { x: L ? 410 : 550 };  // off the high stone onto the low one / to the floor
}
function wizDuGo(out, p, tx, dead) {
  const cx = p.x + p.w / 2;
  if (Math.abs(tx - cx) > dead) { if (tx > cx) out.right = true; else out.left = true; }
}
WIZ_BRAINS.duel = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph, K = WIZDUEL;
    if (!ph.p || ph.mode !== 'fight') { bst.charge = 0; return out; }
    const sk = bst.sk || (bst.sk = WIZDU_SK(info.vs)), q = ph.p[p.id], oq = ph.p[o.id], id = p.id;
    const P = wizDuPlan(S)[id], lv = P.lv, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    // what the rival is doing, seen late
    const olvNow = P.olv >= 0 ? P.olv : (bst.olv != null ? bst.olv : 0);
    const olv = wizBrainLate(bst, 'olv', olvNow, sk.react); bst.olv = olvNow;
    // ---- defending: a spark coming at my height (shield), a big bolt coming down near me (dodge or shield)
    bst.seen = bst.seen || new Map();
    let threat = null, dodge = 0;
    const box = wizDuBox(S, p);
    for (const b of ph.bolts) {
      if (b.door > 0 || 1 - b.from !== id) continue;
      const toward = (b.vx > 0) === (cx > b.x);
      if (!toward) continue;
      if (!bst.seen.has(b)) bst.seen.set(b, { t: 0, roll: Math.random() });
      const s = bst.seen.get(b); s.t += DT;
      if (s.t < sk.react) continue;
      if (b.kind === 'spark') {
        const tt = Math.abs(b.x - cx) / Math.abs(b.vx);
        if (b.y + K.spark.r > box.y0 && b.y - K.spark.r < box.y1 && tt < 0.45 && s.roll < sk.shield) threat = threat || 'spark';
      } else {
        // where the arc comes down to my height
        const a = K.big.g / 2, bb = b.vy, c = b.y - cy, disc = bb * bb - 4 * a * c;
        if (disc < 0) continue;
        const tt = (-bb + Math.sqrt(disc)) / (2 * a), lx = b.x + b.vx * tt;
        if (Math.abs(lx - cx) < 46 && s.roll < sk.shield) {
          if (sk.big >= 1 || q.bar < 0.5) dodge = lx > cx ? -1 : 1; else if (tt < 0.35) threat = 'big';
        }
      }
    }
    for (const b of bst.seen.keys()) if (!ph.bolts.includes(b)) bst.seen.delete(b);
    if (threat && q.bar > 0.1 && !P.frog) { out.down = true; bst.charge = 0; return out; }
    // ---- where to be
    bst.thinkT = (bst.thinkT || 0) - DT;
    const sneezeSoon = ph.round >= 2 && (ph.sneeze || ph.sneezeT < 2.4);
    if (bst.thinkT <= 0 || (sneezeSoon && bst.want === 2)) {
      bst.thinkT = sk.think * (0.7 + Math.random() * 0.6);
      bst.tok = null;
      const tk = ph.tokens.find(t => t.side === id && t.life > 3);
      if (tk && !q.trick && Math.random() < 0.4 + 0.5 * info.vs) { bst.tok = tk; bst.want = tk.y < K.floor - 120 - 20 ? 2 : tk.y < K.floor - 40 ? 1 : 0; }
      else if (olv >= 1) bst.want = olv;
      else bst.want = sk.big > 0 ? 1 : (Math.random() < 0.5 ? 1 : 2);
      if (sneezeSoon && bst.want === 2) { bst.want = 1; bst.tok = null; }
    }
    if (bst.tok && (bst.tok.taken || !ph.tokens.includes(bst.tok))) { bst.tok = null; bst.thinkT = 0.2; }
    const want = bst.want != null ? bst.want : 1;
    if (lv >= 0) {
      const R = wizDuRoute(id, lv, want), tx = lv === want && bst.tok ? bst.tok.x : R.x;
      wizDuGo(out, p, tx, R.jump ? 6 : 8);
      if (R.jump && Math.abs(tx - cx) < 10 && Math.abs(p.vx) < 40) { delete out.left; delete out.right; out.jump = true; bst.hop = true; }
    } else if (bst.hop && p.vy < 0) out.jump = true;   // (held: the full jump)
    if (p.grounded && !out.jump) bst.hop = false;
    if (dodge) { delete out.left; delete out.right; out[dodge > 0 ? 'right' : 'left'] = true; }
    // ---- attacking
    if (P.frog) { bst.charge = 0; return out; }
    if (q.trick) { if (q.rest <= 0 && wizBrainLate(bst, 'trick', true, sk.react) && wizBrainTap(bst, 'tk', 0.3)) out.act = 'tap'; return out; }
    bst._late_trick = null;
    const obox = wizDuBox(S, o);
    const lined = cy > obox.y0 - 4 && cy < obox.y1 + 4 && !(ph.fount && cy > K.fountain.y0 - 40 && cy < K.fountain.y1) && !(cy > K.floor - K.wallH);
    const bigWanted = sk.big > 0 && (olv === 0 || (sk.big >= 1 && oq.shield && oq.bar > 0.3) || (bst.waitT || 0) > 4 / sk.big);
    bst.waitT = lined ? 0 : (bst.waitT || 0) + DT;
    if (bst.charge > 0 || (bigWanted && q.rest <= 0 && p.grounded && !lined)) {
      bst.charge = (bst.charge || 0) + DT;
      if (bst.charge < K.big.hold + 0.08) { out.act = true; return out; }
      bst.charge = 0; bst.waitT = 0; return out;   // let go: the bolt flies
    }
    if (wizBrainLate(bst, 'lined', lined, sk.react) && lined && q.rest <= 0 && wizBrainTap(bst, 'sp', 0.12)) out.act = 'tap';
    return out;
  },
};

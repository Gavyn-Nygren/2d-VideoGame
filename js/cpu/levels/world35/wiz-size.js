/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'size' (Shrink and Grow). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-size.js). The jobs swap at each room door (S.ph.zap keeps normal size,
   S.ph.siz changes size); the computer plays its player's job, reading the class's plan(st).
   - ZAPPER: walks behind the SIZER (short of a shut wall, the well or the junk), arms the wand with one press of up or
     down and zaps when the size is wrong, or again with 2 s left while the SIZER is still mid-task; tiptoes past the
     cat (holding down).
   - SIZER: waits short of the obstacle until it has the size it needs, then: tiny tiptoes past the cat and pulls the
     levers; giant walks the bookcase up to the high shelf, lifts the ZAPPER onto its head and wades the junk; normal
     climbs the bookcase step. Hops whatever it walks into. */
function wizSizeBrainPress(bst, out, key) {
  bst.pr = (bst.pr || 0) - DT;
  if (bst.pr <= 0) bst.pr = 0.26;
  if (bst.pr > 0.13) out[key] = true;
}
function wizSizeBrainGo(out, p, tx, dead = 6) {
  const cx = p.x + p.w / 2;
  if (Math.abs(tx - cx) > dead) { if (tx > cx) out.right = true; else out.left = true; }
}
function wizSizeBrainZap(bst, p, out, S, P) {
  // (arming SHRINK while tiptoeing: stand still, let go of down, press it again)
  const rearm = P.tap === 'down' && P.hold === 'down';
  if (!S.ph.carry && !rearm) wizSizeBrainGo(out, p, P.x, 8);
  if (P.hold === 'down' && !rearm) out.down = true;
  if (P.tap === 'act') { if (wizBrainTap(bst, 'zap', 0.45)) out.act = 'tap'; }
  else if (P.tap) wizSizeBrainPress(bst, out, P.tap);
  else bst.pr = 0;
  if (P.why === 'closer') wizBrainSay(bst, p, 'closer', 'Wait for me, I need to be close to zap you!', 10);
  return S.ph.carry ? out : wizBrainHop(bst, out, p);
}
function wizSizeBrainSiz(bst, p, out, S, P) {
  const ph = S.ph;
  if (P.why === 'shove') { out.right = true; return out; }
  wizSizeBrainGo(out, p, P.x, ph.size === 'tiny' ? 3 : 6);
  if (P.tiptoe) out.down = true;
  if (P.tap === 'act' && wizBrainTap(bst, 'act', 0.5)) out.act = 'tap';
  if (P.why === 'wait' && P.need && P.need !== ph.size) wizBrainSay(bst, p, 'want' + P.need, P.need === 'tiny' ? 'Make me tiny, please!' : P.need === 'giant' ? 'Make me a giant!' : 'Back to normal, please!', 12);
  return wizBrainHop(bst, out, p);
}
WIZ_BRAINS.size = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.pieces || ph.swapT > 0) return out;
    const P = wizSizePlan(S)[p.id];
    if (!P) return out;
    return p.id === ph.zap ? wizSizeBrainZap(bst, p, out, S, P) : wizSizeBrainSiz(bst, p, out, S, P);
  },
};

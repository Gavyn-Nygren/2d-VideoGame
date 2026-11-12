/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'portal' (Portal Class). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-portal.js). The jobs swap on ledges 4 and 6 (S.ph.dr draws, S.ph.jp jumps);
   the computer plays its player's job, reading the class's plan(st).
   - DRAWER: walks until the right plate is in reach, moves the chalk ring one press at a time and stamps the IN door,
     then the OUT door (on the clock-hand ledge only when the hand is well away); once the rope is pulled it climbs the
     ladder (holding up).
   - JUMPER: waits beside the IN door until both doors are up (and the pendulum is out of the way), then walks in; for
     a pad it walks off the ledge and steers onto the low pad; on the new ledge it pulls the rope. */
function wizPoBrainGo(out, p, tx, dead = 5) {
  const cx = p.x + p.w / 2;
  if (Math.abs(tx - cx) > dead) { if (tx > cx) out.right = true; else out.left = true; }
}
WIZ_BRAINS.portal = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.steps || ph.swapT > 0 || ph.done) return out;
    const P = wizPoPlan(S)[p.id];
    if (!P) return out;
    if (p.id === ph.dr) {
      wizPoBrainGo(out, p, P.x, P.why === 'climb' ? 3 : 6);
      if (P.why === 'climb') { out.up = true; if (P.up) { delete out.left; delete out.right; } return out; }   // (up held all the way: it grabs the ladder in passing)
      // one press at a time, then wait to see it take (the ring move or the door) before the next
      const seen = (ph.selQ ? ph.selQ.k : -1) + ':' + (ph.inD ? ph.inD.q.k : -1) + ':' + (ph.outD ? ph.outD.q.k : -1);
      if (bst.hold > 0) { bst.hold -= DT; out[bst.key] = true; if (bst.hold <= 0) bst.wait = { seen: bst.seen0, t: 1.0 }; return out; }
      if (bst.wait) { bst.wait.t -= DT; if (bst.wait.seen === seen && bst.wait.t > 0) return out; bst.wait = null; }
      if (P.tap === 'act') { out.act = 'tap'; bst.wait = { seen, t: 1.0 }; }
      else if (P.tap) { bst.key = P.tap; bst.hold = 0.1; bst.seen0 = seen; out[P.tap] = true; }
      return out;
    }
    // the JUMPER
    if (P.why === 'fly') return out;
    wizPoBrainGo(out, p, P.x, P.why === 'through' ? 3 : 6);
    if (P.tap === 'act' && wizBrainTap(bst, 'rope', 0.4)) out.act = 'tap';
    if (P.why === 'drop') wizBrainSay(bst, p, 'drop', 'Geronimo!', 20);
    return out;
  },
};

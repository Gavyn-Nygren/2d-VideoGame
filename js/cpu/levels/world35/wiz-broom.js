/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'broom' (Broom Flying). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-broom.js). The jobs are fixed per stretch (S.ph.steer at the front, S.ph.kick
   at the back) and swap at the landing platforms, so the computer plays whichever seat its player sits in, reading the
   class's own plan(st) (the same plan the hint bubbles use).
   - STEERER: climbs or dives toward the plan's height (the next lantern ring, over hedges and chimney smoke, under
     washing lines and the waterfall, through the bell tower's gap), seen 0.12 s late, and swats a vane or a sheet when
     it is in reach. It leans against a gust it sees pushing.
   - KICKER: a steady kick every 0.5 s (a little uneven, like a person), never while the bristles are hot. If the person
     steers and is far off the plan's height (slow to react), it kicks a little slower so the broom doesn't outrun them.
   It never clears alone: no kicks, no flight; nobody steering flies level into the first hedge. */
function wizBroomBrainSteer(bst, p, out, S) {
  const ph = S.ph;
  if (ph.mode !== 'fly') return out;
  const P = wizBroomPlan(S)[p.id];
  let want = P.y;
  // a gust: lean against it early
  for (const o of ph.items) if (o.kind === 'gust' && o.x - o.w / 2 - ph.x < 120 && o.x + o.w / 2 > ph.x) want -= o.dir * 30;
  const dy = ph.y + ph.vy * 0.3 - want, dir = wizBrainLate(bst, 'dir', dy > 10 ? -1 : dy < -10 ? 1 : 0, 0.12);
  if (dir < 0) out.jump = true; else if (dir > 0) out.down = true;
  if (P.tap && wizBrainLate(bst, 'swat', true, 0.1)) out.act = 'tap';
  // what the kicker (the person) should do
  if (ph.live <= 0 && ph.v < WIZBROOM.kick.droop + 30) wizBrainSay(bst, p, 'kick', 'Kick! Nice and steady.', 8);
  else if (ph.hot > 0) wizBrainSay(bst, p, 'hot', 'Not so fast! One-two, one-two.', 9);
  return out;
}
function wizBroomBrainKick(bst, p, out, S, info) {
  const ph = S.ph;
  if (ph.mode === 'swap' || ph.mode === 'land' || ph.mode === 'done' || ph.spin > 0 || ph.hot > 0) return out;
  if (ph.mode === 'wait') { if ((bst.wait = (bst.wait || 0) + DT) > 0.6) { out.act = 'tap'; bst.wait = 0; } return out; }
  let beat = 0.5;
  if (!info.partnerCpu) {
    const P = wizBroomPlan(S)[ph.steer];
    if (Math.abs(ph.y - P.y) > 70) beat = 0.66;   // the person is behind on the steering: ease off
  }
  if (ph.sinceKick >= (bst.beat || beat)) { out.act = 'tap'; bst.n = (bst.n || 0) + 1; bst.beat = beat + ((bst.n * 0.37) % 1) * 0.06; }
  if (ph.mode === 'fly') {
    const P = wizBroomPlan(S)[ph.steer];
    if (P.hold === 'up' && Math.abs(ph.y - P.y) > 60) wizBrainSay(bst, p, 'up', 'Climb! Up, up!', 7);
    else if (P.hold === 'down' && Math.abs(ph.y - P.y) > 60) wizBrainSay(bst, p, 'down', 'Dive! Down we go!', 7);
    else if (P.tap) wizBrainSay(bst, p, 'swat', 'Swat it with your hat!', 7);
  }
  return out;
}
WIZ_BRAINS.broom = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.items) return out;
    return p.id === ph.steer ? wizBroomBrainSteer(bst, p, out, S) : wizBroomBrainKick(bst, p, out, S, info);
  },
};

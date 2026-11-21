/* Pip & Bo - Level 43-3 Claw Machine Rescue: the map (numbers only, no three.js). Read by the rules, the brain and the
   scenery, so all three agree on where everything is.

   Frame: 1 unit = 1 tile. The climb goes AWAY from the glass front: forward is -Z, up is +Y, x runs across the machine
   (the side glass is at x = +-16). The rail's distance s is -z along the climb (s = 0 at z = 0), so "further up the
   mountain" is a bigger s. The mountain is AUTHORED ground: boxes and ramps (MOVER3 solids) that the scenery covers in
   heaps of prizes. Only the marked toys, the slides and the basket move.

   M.solids    { x, z, w, d, y0, y1, rot, ramp?, look }  look says how the scenery dresses it: 'heap' (a heap of prizes:
               its top is walkable plush), 'wall' (a tall heap nobody climbs), 'bean' (beanbag), 'box' (a prize carton),
               'shelf', 'trench' (the floor of a gap), 'lid' (a toy-box gate), 'step'
   M.toys      the toys the claw can pick up: { id, kind, x, y, z, rot, w, d, h, carrier?, handle: [lx, ly, lz] (a carrier's
               ribbon, ring or rim, in the toy's own frame), heavy?, bridge?, bouncy?, coil? (the snake lies coiled until
               first lifted), need (the obstacle that needs it) }. w is along the toy's local x, d along local z.
   M.snaps     spots a toy's ghost snaps to when the ring is near: { toy, x, y, z, rot, r }
   M.caps      capsules: { id, x, y, z, part, gold?, opt? (off the route: the Gold medal's ones), act (what the creature
               inside is doing), kind, col }
   M.levers    power levers: { id, x, y, z, lights (the rail's lit end after it) }
   M.rail      the rail: s0 (its back end), lit0 (lit at the start), y(s) (the carriage's height), u0/u1 (how far across)
   M.checks    checkpoints (beanbag ledges with a ticket flag): { id, x, y, z, s, part }
   M.sinks     sink spots (loose foam beans): { x0, x1, z0, z1 }
   M.buttons   floor buttons a heavy toy holds down: { id, x, y, z, r, opens (a solid id) }
   M.gates     the part gates (giant toy-box lids): { id, solid, key (the gold capsule that opens it) }
   M.obstacles in route order, for the brain and the checks: { id, kind, part, s, toy?, toys?, put?, wait: [x, z], cap?,
               lever?, done? } (kind: lift, bridge, lever, carry, dig, weight, cap)
   M.parts     { name, s0, s1 }
   Names are prefixed arcadeclaw. */
'use strict';

const ARCADECLAW_MAP = (function () {
  const M = { solids: [], toys: [], snaps: [], caps: [], levers: [], fuses: [], checks: [], sinks: [], fans: [], buttons: [], gates: [], obstacles: [], slides: [], hunts: [], jams: [] };
  const PI = Math.PI;
  let sid = 0;
  // a box from x0..x1, z0..z1 (either order), y0..y1
  const box = (x0, x1, z0, z1, y0, y1, look = 'heap', o = {}) => {
    const s = Object.assign({ id: o.id || 's' + (sid++), x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0), y0, y1, rot: 0, look }, o);
    M.solids.push(s); return s;
  };
  // a ramp across x0..x1 rising from yNear at zNear to yFar at zFar (forward, -z); its bottom is yb
  const rampZ = (x0, x1, zNear, zFar, yNear, yFar, yb, look = 'heap') => {
    const s = { id: 's' + (sid++), x: (x0 + x1) / 2, z: (zNear + zFar) / 2, w: Math.abs(zNear - zFar), d: Math.abs(x1 - x0), y0: yb, y1: Math.max(yNear, yFar), rot: PI / 2, ramp: { h0: yNear - yb, h1: yFar - yb }, look };
    M.solids.push(s); return s;
  };
  M.box = box; M.rampZ = rampZ;

  /* ================= Part 1: The Foothills (s about -8 to 72) =================
     The bottom of the heap: small prizes, soft colours, the glass front close behind. One thing taught at a time. */
  // A: the start, by the glass front. A wide plush floor with little bumps and a striped bouncy ball
  box(-7, 7, 20, -10, -4, 0, 'heap', { id: 'a-floor' });
  box(-14, -7, 20, -10, -4, 1.0, 'heap'); box(7, 14, 20, -10, -4, 1.0, 'heap');
  box(-2.6, -1.4, -3.4, -4.6, 0, 0.45, 'heap', { soft: 1 });   // little plush bumps (squash underfoot)
  box(1.9, 3.3, -2.4, -3.4, 0, 0.5, 'heap', { soft: 1 });
  box(-0.3, 0.9, -5.6, -6.6, 0, 0.4, 'heap', { soft: 1 });
  box(-4.25, -2.95, 4.65, 3.35, 0, 1.3, 'ball', { id: 'ball1', bouncy: 1 }); // the striped bouncy balls (far enough from
  // the corridor's walls that a bounce never reaches their tops)
  box(4.2, 5.6, -0.8, -2.2, 0, 1.2, 'ball', { id: 'ball0', bouncy: 1 });
  // B: the whale corridor: tall heaps either side (flat tops at 4.2 where Pip may park a toy)
  box(-3.5, 3.5, -10, -19, -4, 0, 'heap', { id: 'b-floor' });
  box(-14, -3.5, -10, -19, -4, 4.2, 'wall', { id: 'b-wallL' });
  box(3.5, 14, -10, -19, -4, 4.2, 'wall', { id: 'b-wallR' });
  // C: a landing, then the gap (a trench of loose prizes with a step to climb back out on the near side)
  box(-7, 7, -19, -21, -4, 0, 'heap', { id: 'c-land' });
  box(-14, -7, -19, -36, -4, 4.2, 'wall'); box(7, 14, -19, -36, -4, 4.2, 'wall');
  box(-7, 7, -21, -25, -4, -2.6, 'trench', { id: 'c-trench' });
  box(4.6, 7, -21, -22.1, -2.6, -1.3, 'step', { id: 'c-step' });
  // D: the far side of the gap to the foot of the ledge
  box(-7, 7, -25, -36, -4, 0, 'heap', { id: 'd-floor' });
  // E to G: the plateau above the ledge (3.5 high: too tall to jump), side heaps too tall to climb from it
  box(-8, 8, -36, -71, -4, 3.5, 'heap', { id: 'e-plateau' });
  box(-14, -8, -36, -80, -4, 7.2, 'wall'); box(8, 14, -36, -80, -4, 7.2, 'wall');
  // G: the toy box with the gold capsule: three walls and a front lid that lifts while its floor button is held down
  box(2.3, 5.7, -65.4, -65.7, 3.5, 6.3, 'box', { id: 'tb-back' });
  box(2.3, 2.6, -62.3, -65.7, 3.5, 6.3, 'box', { id: 'tb-left' });
  box(5.4, 5.7, -62.3, -65.7, 3.5, 6.3, 'box', { id: 'tb-right' });
  box(2.3, 5.7, -62.3, -65.7, 6.3, 6.5, 'box', { id: 'tb-top' });
  box(2.6, 5.4, -62.25, -62.55, 3.5, 6.3, 'lid', { id: 'tb-lid' });
  // the part gate: a giant toy-box lid standing across the way
  box(-8, 8, -70, -71, 3.5, 9.5, 'lid', { id: 'gate1' });
  box(-8, 8, -71, -84, -4, 3.5, 'heap', { id: 'p2-start' });
  // the whole way up: prizes piled against the side glass (too tall to climb) and the glass front behind the start
  box(-16.5, -14, 20, -90, -4, 9.0, 'wall', { id: 'glassL' }); box(14, 16.5, 20, -90, -4, 9.0, 'wall', { id: 'glassR' });
  box(-16.5, 16.5, 21, 20, -4, 40, 'glass', { id: 'front-glass' });

  M.toys.push(
    { id: 'whale', kind: 'whale', x: 0, y: 0, z: -14.6, rot: 0, w: 6.9, d: 2.8, h: 3.0, need: 'o-whale', col: '#7ab8e8' },
    { id: 'snake', kind: 'snake', x: -5.0, y: 0, z: -20.0, rot: PI / 2, w: 5.6, d: 0.9, h: 0.2, bridge: true, coil: { w: 1.6, d: 1.6, h: 0.7 }, need: 'o-bridge', col: '#8ad85a' },
    { id: 'duck', kind: 'duck', x: -3.0, y: 0, z: -33.4, rot: 0, w: 1.9, d: 1.9, h: 2.6, carrier: true, handle: [1.15, 1.25, 0], need: 'o-duck', col: '#ffd84a' },
    { id: 'dig-bear', kind: 'bear', x: -3.0, y: 4.7, z: -44.3, rot: 0.4, w: 1.3, d: 1.0, h: 1.3, need: 'o-dig1', col: '#c89a6a', loseEye: true },
    { id: 'dig-ball', kind: 'gball', x: -1.9, y: 3.5, z: -44.4, rot: 0, w: 1.1, d: 1.1, h: 1.1, need: 'o-dig1', col: '#ff6ab0' },
    { id: 'dig-block', kind: 'block', x: -3.9, y: 3.5, z: -43.4, rot: 0.3, w: 1.2, d: 1.2, h: 1.15, need: 'o-dig1', col: '#5ad8ff', letter: 'P' },
    { id: 'ring1', kind: 'ring', x: 5.3, y: 3.5, z: -47.6, rot: 0, w: 2.2, d: 2.2, h: 0.35, carrier: true, handle: [0, 0.3, 1.05], need: 'o-sink1', col: '#ff8ad8' },
    { id: 'robot', kind: 'robot', x: -5.6, y: 3.5, z: -59.0, rot: 0.3, w: 1.5, d: 1.4, h: 2.4, heavy: true, need: 'o-weight1', col: '#9aa4b8' },
  );
  M.snaps.push({ toy: 'snake', x: 0, y: 0, z: -23.0, rot: PI / 2, r: 2.2 });
  // the capsule under the dig toys is a solid the bear rests on (a capsule is 1.2 across)
  M.caps.push(
    { id: 'c1', x: 2.6, y: 0, z: -8.0, part: 0, act: 'wave', kind: 0, col: '#5aff8a' },
    { id: 'c2', x: 3.4, y: 0, z: -27.6, part: 0, act: 'knock', kind: 2, col: '#ff5ad6' },
    { id: 'c3', x: 1.6, y: 3.5, z: -39.4, part: 0, act: 'asleep', kind: 3, col: '#4ae8ff' },
    { id: 'c4', x: -3.0, y: 3.5, z: -44.2, part: 0, act: 'sulk', kind: 1, col: '#ffe24a', buried: true },
    { id: 'c5', x: 4.0, y: 3.5, z: -64.2, part: 0, gold: true, act: 'cards', kind: 4, col: '#ffd23a' },
  );
  M.levers.push(
    { id: 'L1', x: -2.2, y: 0, z: -31.6, lights: 57 },
    { id: 'L2', x: 5.6, y: 3.5, z: -56.6, lights: 82 },
  );
  M.sinks.push({ id: 'sink1', x0: -4.2, x1: 8, z0: -49, z1: -53, y: 3.5 });
  M.buttons.push({ id: 'btn1', x: -2.4, y: 3.5, z: -63.6, r: 0.95, opens: 'tb-lid' });
  M.gates.push({ id: 'gate1', solid: 'gate1', key: 'c5', part: 0 });
  M.checks.push(
    { id: 'k0', x: 0.8, y: 0, z: 1.5, part: 0 },
    { id: 'k1', x: -1.5, y: 0, z: -27.5, part: 0 },
    { id: 'k2', x: 0, y: 3.5, z: -41.0, part: 0 },
    { id: 'k3', x: -1, y: 3.5, z: -57.5, part: 0 },
    { id: 'k4', x: 0, y: 3.5, z: -73.5, part: 1 },
  );
  // the obstacles in route order (the brain and the checks read these)
  M.obstacles.push(
    { id: 'o-c1', kind: 'cap', part: 0, cap: 'c1', s: 7 },
    { id: 'o-whale', kind: 'lift', part: 0, s: 9.5, toy: 'whale', put: [8.6, -14.6, 0], wait: [0, -8.6], pass: -19.3 },
    { id: 'o-bridge', kind: 'bridge', part: 0, s: 20, toy: 'snake', put: [0, -23.0, PI / 2], wait: [2.6, -19.7], pass: -25.4 },
    { id: 'o-c2', kind: 'cap', part: 0, cap: 'c2', s: 26 },
    { id: 'o-L1', kind: 'lever', part: 0, lever: 'L1', s: 30 },
    { id: 'o-duck', kind: 'carry', part: 0, s: 33, toy: 'duck', put: [-1.6, -38.8, 0], wait: [-1.6, -33.4], passY: 3.3, pass: -36.4 },
    { id: 'o-c3', kind: 'cap', part: 0, cap: 'c3', s: 39 },
    { id: 'o-dig1', kind: 'dig', part: 0, s: 43, cap: 'c4', toys: ['dig-bear', 'dig-ball', 'dig-block'], puts: [[-6.2, -41.2, 0], [-5.9, -46.0, 0], [-6.3, -43.6, 0]], wait: [-1.2, -42.6] },
    { id: 'o-sink1', kind: 'sink', part: 0, s: 48, sink: 'sink1', toy: 'ring1', wait: [-5.4, -48.0] },
    { id: 'o-L2', kind: 'lever', part: 0, lever: 'L2', s: 55 },
    { id: 'o-weight1', kind: 'weight', part: 0, s: 59, toy: 'robot', put: [-2.4, -63.6, 0], wait: [1.0, -60.5], button: 'btn1' },
    { id: 'o-c5', kind: 'cap', part: 0, cap: 'c5', s: 63 },
    { id: 'o-gate1', kind: 'gate', part: 0, gate: 'gate1', s: 69, pass: -71.5 },
  );

  /* ================= the rail ================= */
  // the ground the rail follows along s (smoothed): the carriage rides RAIL_H above it
  // (beyond s 71 the profile is the planned climb of parts 2 to 4: the far scenery and the rail follow it already)
  const GROUND = [[-20, 0], [31, 0], [41, 3.5], [71, 3.5], [84, 3.5], [120, 9], [160, 16], [200, 24], [240, 34], [300, 36]];
  M.RAIL_H = 10.6;
  M.groundRef = s => {
    for (let i = 1; i < GROUND.length; i++) {
      const [s1, y1] = GROUND[i], [s0, y0] = GROUND[i - 1];
      if (s <= s1) { const u = Math.max(0, Math.min(1, (s - s0) / (s1 - s0))); return y0 + (y1 - y0) * u * u * (3 - 2 * u); }
    }
    return GROUND[GROUND.length - 1][1];
  };
  M.rail = { s0: -8, lit0: 31, u0: -9.2, u1: 9.2, sections: [[-8, 31], [31, 57], [57, 82]] };
  M.railY = s => M.groundRef(s) + M.RAIL_H;
  // s <-> world (the climb is straight along -z in part 1)
  M.sOf = (x, z) => -z;
  M.uOf = (x, z) => x;
  M.at = (s, u) => [u, -s];
  M.heading = s => 0;

  M.parts = [
    { name: 'The Foothills', s0: -10, s1: 71 },
    { name: 'Plush Mountain', s0: 71, s1: 160 },
    { name: 'The Capsule Wall', s0: 160, s1: 240 },
    { name: 'The Prize Chute', s0: 240, s1: 300 },
  ];
  M.start = { bo: [0.8, 0, 1.6], claw: [-1.6, 4.5] }; // Bo's feet; the claw's (u, s)
  M.bounds = { x0: -16, x1: 16, z0: -90, z1: 20 };
  M.capsTotal = 28; // the whole level (the parts still to be built add the rest)
  return M;
})();

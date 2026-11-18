/* Pip & Bo - World 41, level 4 Paper Alien Invasion: the route (where the page goes, what stands on it, when the
   aliens come). Plain data, no three.js: loaded with the game so the rules (paper-alien-invasion.js) and the bot tests
   run with drawing switched off. The 3D scenery (popaliens-scene.js) reads the same numbers.

   The march goes into the screen: toward -Z. x = 0 is the middle of the path; the path is about 30 units wide
   (PA.sideX either side). The camera's focus z (st.cz in the rules) only ever goes down (forward).

   PA_ROUTE.stretches   the four stretches, by z (headings for the builder, never shown on screen)
   PA_ROUTE.checks      bookmark checkpoints: { z (where the ribbon lies), cz (the camera's focus after a restart) }
   PA_ROUTE.solids      still things the heroes bump into: { x, z, w, d, h, rot, kind } (kind is for the scenery)
   PA_ROUTE.events      in order of z, each fires once when the camera's focus reaches ev.at (re-armed by a restart at a
                        checkpoint before it):
                          { at, spawn: [{ k: kind, x, z, hold, ... }] }   aliens (k: grunt folder carrier edger shield crab
                                                                          stamper lesson); hold: stand until a hero comes
                                                                          within that many units (blockade crowds)
                          { at, say: 'text' }                             the Bookworm, from the page edge
                          { at, tip: 'key' }                              a tip (the rules know the words)
                          { at, block: { stop, wall: [x0, x1, z], waves: [[spawns], ...] } }   a blockade: the camera
                                                                          stops at `stop` until every wave is beaten
                          { at, wide: secs }                              the camera eases back for a few seconds
   PA_ROUTE.pickups     cosmic grenades lying in plain sight: { x, z }
   PA_ROUTE.end         where the route ends for now (the bunker hatch, Stretch 4)
   Only Stretch 1 (the Margin Fields) is laid out until Gavyn has seen the look (the spec's look gate).
*/
'use strict';

const PA_ROUTE = (() => {
  const row = (k, n, z, x0, x1, o = {}) => Array.from({ length: n }, (_, i) => Object.assign({ k, x: n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1), z }, o));
  const clump = (k, n, cx, cz, r, o = {}) => Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996, d = r * Math.sqrt((i + 0.5) / n);
    return Object.assign({ k, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d }, o);
  });
  const R = {
    stretches: [
      { key: 'margin', name: 'The Margin Fields', z0: 4, z1: -150 },
      { key: 'letters', name: 'Letter City', z0: -150, z1: -320 },
      { key: 'crater', name: 'The Ink Crater', z0: -320, z1: -480 },
      { key: 'hill', name: 'Bunker Hill', z0: -480, z1: -600 },
    ],
    checks: [
      { z: 2, cz: 0 },
      { z: -44, cz: -42 },
      { z: -90, cz: -88 },
      { z: -122, cz: -120 },
    ],
    solids: [
      // eraser crumbs: rubbery pink-grey boulders at the sides of the path (round, but a box is how the feet see them)
      { kind: 'crumb', x: -9, z: -14, w: 1.6, d: 1.4, h: 1.0, rot: 0.4 },
      { kind: 'crumb', x: 10.5, z: -27, w: 2.2, d: 1.8, h: 1.3, rot: -0.3 },
      { kind: 'crumb', x: -6.5, z: -58, w: 1.3, d: 1.2, h: 0.8, rot: 1.1 },
      { kind: 'crumb', x: 7.5, z: -80, w: 1.8, d: 1.5, h: 1.1, rot: 0.2 },
      { kind: 'crumb', x: -11, z: -103, w: 2.0, d: 1.7, h: 1.2, rot: -0.7 },
      { kind: 'crumb', x: 4, z: -112, w: 1.2, d: 1.0, h: 0.7, rot: 0.9 },
      // the doodled flower's stalk (it stands tall at the side of the path)
      { kind: 'flower', x: 12.5, z: -64, w: 0.8, d: 0.8, h: 9, rot: 0 },
      // pencil notes in the margin: graphite strokes as tall as a fence, low enough to see over
      { kind: 'note', x: -12.5, z: -36, w: 0.5, d: 9, h: 0.55, rot: 0.05 },
      { kind: 'note', x: 12, z: -96, w: 0.5, d: 7, h: 0.55, rot: -0.08 },
    ],
    events: [
      { at: 0, say: "They're only paper! Keep moving, the bunker is at the far edge!" },
      { at: -4, tip: 'fire' },
      { at: -6, spawn: row('grunt', 3, -20, -3.5, 3.5) },
      { at: -20, spawn: row('grunt', 6, -34, -7.5, 7.5) },
      { at: -34, spawn: row('grunt', 6, -48, -8, 8).concat(row('grunt', 6, -51.5, -6.5, 9.5)) },
      { at: -48, spawn: [{ k: 'carrier', x: 6, z: -60 }] },
      { at: -50, spawn: clump('grunt', 12, -1, -72, 3.2, { hold: 8 }) },
      { at: -66, spawn: row('folder', 2, -82, -4, 4) },
      { at: -78, spawn: row('folder', 5, -94, -9, 9) },
      { at: -94, spawn: [{ k: 'lesson', x: 1.5, z: -106 }] },
      { at: -116, say: 'A wall of staples! Clear them out!' },
      { at: -118, block: { stop: -126, wall: [-16, 16, -134], waves: [
        row('grunt', 7, -137.5, -9, 9, { hold: 30 }).concat(row('grunt', 6, -140, -7.5, 7.5, { hold: 30 })),
        row('folder', 3, -146, -8, 8).concat(row('grunt', 5, -138, -6, 6, { hold: 30 })),
      ] } },
    ],
    pickups: [
      { x: -4.5, z: -64 },
      { x: 6, z: -110 },
      { x: -5, z: -118 },
    ],
    end: -152,
  };
  // the blockade walls are solids too (the rules take them away when the blockade is beaten)
  R.events.forEach((ev, i) => {
    if (!ev.block) return;
    const [x0, x1, z] = ev.block.wall;
    ev.block.solid = { kind: 'staples', x: (x0 + x1) / 2, z, w: x1 - x0, d: 0.9, h: 0.62, rot: 0, block: i };
    R.solids.push(ev.block.solid);
  });
  return R;
})();

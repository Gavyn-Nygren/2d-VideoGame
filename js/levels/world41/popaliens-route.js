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
   PA_ROUTE.end         where the camera stops for good (beside the bunker hatch, Stretch 4)
   PA_ROUTE.letters     Letter City's buildings: { ch, x, z, s (scale), h (height), boxes: [{ x, z, w, d, rot }] } (each
                        stroke of the letter is a box; they are solids, and they stop bolts and zaps: cover)
   PA_ROUTE.lines       every wall the march must pass through a gap in (lines of print, the folded-card steps of the
                        hill): { z, hd (half depth), gaps: [[x0, x1], ...] }; aliens and the computer partner head for
                        the nearest gap (paGate)
   PA_ROUTE.bang        the exclamation mark that topples into a bridge over a line of holes when its dot is shot
   PA_ROUTE.ink         the Ink Crater: the blot (an ellipse), the winding dry path across it and the dry islands
   PA_ROUTE.cone        where the saucer's searchlight sweeps in the crater (z range and the spots it rests on)
   PA_ROUTE.walker      the Scribble Walker's arena (the camera stops, the spots it strides between, the hatch)
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
      // Letter City (each ribbon lies in a street, clear of the letters)
      { z: -153, cz: -151 },
      { z: -195, cz: -193 },
      { z: -233, cz: -231 },
      { z: -263, cz: -261 },
      { z: -307, cz: -305 },
      // the Ink Crater (on the dry path)
      { z: -330, cz: -328 },
      { z: -372, cz: -370 },
      { z: -414, cz: -412 },
      { z: -452, cz: -450 },
      // Bunker Hill: before the climb, half way up, and before the Walker (its phases save too)
      { z: -483, cz: -481 },
      { z: -517, cz: -515 },
      { z: -549, cz: -547 },
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
      // ---- Stretch 2: Letter City ----
      { at: -144, wide: 4 },
      { at: -150, say: 'Into the words! Letters stop bolts, so use them as cover.' },
      // Edgers come down the long street between the first two lines of print: split up to either side
      { at: -156, spawn: [{ k: 'edger', x: -13, z: -170 }, { k: 'edger', x: 13, z: -172 }, { k: 'edger', x: 0, z: -174, hold: 10 }] },
      { at: -164, say: 'Stand on both sides of the thin ones!' },
      { at: -168, spawn: row('grunt', 4, -176, -10, 10) },
      // Shield aliens hold the crossing in the third line: the first crossed-beam lesson
      { at: -186, tip: 'cross' },
      { at: -186, spawn: [{ k: 'shield', x: -1.5, z: -201, hold: 9 }, { k: 'shield', x: 1.5, z: -201, hold: 9 }, { k: 'grunt', x: -8, z: -198 }, { k: 'grunt', x: 8, z: -198 }] },
      // Folders launch from the tops of the tall letters of the third line
      { at: -194, spawn: [{ k: 'folder', x: 0, z: 0, perch: 'L3' }, { k: 'folder', x: 0, z: 0, perch: 'D3' }, { k: 'folder', x: 0, z: 0, perch: 'H3' }] },
      { at: -206, spawn: row('grunt', 5, -216, -9, 9).concat([{ k: 'edger', x: -6, z: -218 }, { k: 'edger', x: 6, z: -218 }]) },
      { at: -214, spawn: [{ k: 'carrier', x: -9, z: -217 }] },
      // the exclamation mark over the line of holes: shoot its dot and it falls into a bridge (the holes can be jumped too)
      { at: -230, say: 'Holes! Jump them, or knock that big ! over to make a bridge.' },
      { at: -232, spawn: row('grunt', 4, -250, -8, 8).concat([{ k: 'shield', x: 0, z: -252 }]) },
      // the capital letter at the start of the paragraph is a tower, with the first Stamper on guard in its shadow
      { at: -246, spawn: [{ k: 'stamper', x: -4, z: -259 }] },
      { at: -248, say: 'A big one! Watch for its shadow and step out of it.' },
      // the paragraph break: the second blockade, everything so far, in three waves
      { at: -264, say: 'A wall of staples across the paragraph break!' },
      { at: -266, block: { stop: -272, wall: [-16, 16, -290], waves: [
        row('grunt', 6, -283, -9, 9, { hold: 30 }).concat([{ k: 'shield', x: -3, z: -281, hold: 30 }, { k: 'shield', x: 3, z: -281, hold: 30 }]),
        [{ k: 'edger', x: -8, z: -284 }, { k: 'edger', x: 8, z: -284 }, { k: 'edger', x: 0, z: -286 }].concat(row('folder', 3, -287, -10, 10)),
        row('grunt', 8, -284, -11, 11, { hold: 30 }).concat([{ k: 'carrier', x: 10, z: -280 }, { k: 'shield', x: 0, z: -282, hold: 30 }]),
      ] } },
      { at: -294, spawn: row('grunt', 5, -310, -10, 10).concat(row('folder', 2, -318, -6, 6)) },
      // ---- Stretch 3: the Ink Crater ----
      { at: -316, wide: 4 },
      { at: -320, say: "The saucer's light makes more of them. Don't stop in the light!" },
      { at: -322, spawn: [{ k: 'crab', x: -15, z: -340, dir: 1 }] },
      { at: -330, spawn: row('grunt', 4, -346, -6, 6) },
      { at: -338, spawn: [{ k: 'crab', x: 15, z: -356, dir: -1 }, { k: 'carrier', x: 6, z: -352 }] },
      { at: -348, spawn: row('folder', 3, -366, -8, 8) },
      { at: -362, spawn: [{ k: 'crab', x: -15, z: -380, dir: 1 }, { k: 'shield', x: 3, z: -382 }].concat(row('grunt', 3, -384, -7, 7)) },
      // two Stampers at once on the narrow dry path
      { at: -394, spawn: [{ k: 'stamper', x: -4, z: -410 }, { k: 'stamper', x: 6, z: -414 }] },
      { at: -396, say: 'Two big ones! Keep moving!' },
      { at: -420, spawn: [{ k: 'crab', x: 15, z: -432, dir: -1 }, { k: 'crab', x: -15, z: -437, dir: 1 }].concat(row('edger', 2, -436, -6, 6)) },
      { at: -434, spawn: [{ k: 'carrier', x: -7, z: -446 }, { k: 'carrier', x: 8, z: -448 }] },
      // the third blockade at the crater's far rim: the biggest crowd of the level (grenades lie ready before it)
      { at: -456, say: 'The whole crowd at the rim! Grenades, now!' },
      { at: -458, block: { stop: -462, wall: [-16, 16, -478], waves: [
        clump('grunt', 16, -5, -472, 3.4, { hold: 30 }).concat(clump('grunt', 10, 6, -471, 2.6, { hold: 30 })),
        clump('grunt', 12, 0, -473, 3, { hold: 30 }).concat(row('folder', 4, -476, -10, 10), [{ k: 'shield', x: -4, z: -469, hold: 30 }, { k: 'shield', x: 4, z: -469, hold: 30 }, { k: 'carrier', x: 11, z: -466 }]),
      ] } },
      // ---- Stretch 4: Bunker Hill ----
      { at: -476, wide: 4 },
      { at: -480, say: 'Up the hill to the bunker!' },
      { at: -484, spawn: row('grunt', 3, -503, -12, -6).concat([{ k: 'folder', x: 6, z: -506 }]) },
      { at: -498, spawn: row('grunt', 3, -517, 2, 11).concat(row('folder', 2, -522, -8, -2)) },
      { at: -512, spawn: row('grunt', 4, -533, -12, -2).concat([{ k: 'folder', x: 10, z: -536 }, { k: 'carrier', x: 12, z: -528 }]) },
      { at: -526, spawn: row('grunt', 3, -546, 1, 11).concat(row('folder', 2, -550, -6, 6)) },
      // the Scribble Walker
      { at: -551, boss: true },
      { at: -551, say: "It's flat too! Get one each side of it!" },
    ],
    pickups: [
      { x: -4.5, z: -64 },
      { x: 6, z: -110 },
      { x: -5, z: -118 },
      { x: 9, z: -258 },
      { x: -3, z: -268 },
      { x: 1, z: -342 },
      { x: -8, z: -398 },
      { x: -4, z: -450 },
      { x: 4, z: -452 },
      { x: 0, z: -455 },
      { x: 12, z: -500 },
      { x: -11, z: -545 },
      { x: 11, z: -546 },
    ],
    end: -590,
  };
  /* ---------- Letter City: lines of print as streets of letter buildings ---------- */
  // a stroke font on a 4 x 6 grid (y down = toward the viewer, so a letter reads the right way up from the camera)
  const FONT = {
    A: [[0, 6, 2, 0, 4, 6], [1, 4, 3, 4]], B: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [0, 0, 3, 0, 4, 1, 4, 2, 3, 3]],
    C: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5]], D: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 1, 3, 0, 0, 0]],
    E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]], F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
    G: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3, 2, 3]], H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
    I: [[2, 0, 2, 6], [0.8, 0, 3.2, 0], [0.8, 6, 3.2, 6]], K: [[0, 0, 0, 6], [4, 0, 0, 3.6], [1.4, 2.4, 4, 6]],
    L: [[0, 0, 0, 6, 4, 6]], M: [[0, 6, 0, 0, 2, 3, 4, 0, 4, 6]], N: [[0, 6, 0, 0, 4, 6, 4, 0]],
    O: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]], P: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3]],
    R: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3], [2, 3, 4, 6]],
    S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]], T: [[0, 0, 4, 0], [2, 0, 2, 6]],
    U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]], W: [[0, 0, 1, 6, 2, 3, 3, 6, 4, 0]], Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
  };
  const TALL = 'BDFHKLT';
  const LS = 0.7, THICK = 0.9;           // grid unit in world units; stroke thickness in grid units
  R.letters = []; R.lines = [];
  function glyph(ch, cx, cz, s, h, tag) {
    const boxes = [];
    for (const pl of FONT[ch] || []) for (let i = 0; i + 3 < pl.length; i += 2) {
      const x0 = cx + (pl[i] - 2) * s, z0 = cz + (pl[i + 1] - 3) * s, x1 = cx + (pl[i + 2] - 2) * s, z1 = cz + (pl[i + 3] - 3) * s;
      const len = Math.hypot(x1 - x0, z1 - z0);
      // a box along the stroke (rot turns the box's x axis toward the stroke, as MOVER3 reads rot)
      boxes.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: len + THICK * s, d: THICK * s, rot: -Math.atan2(z1 - z0, x1 - x0) });
    }
    const L = { ch, x: cx, z: cz, s, h, boxes, tag };
    R.letters.push(L);
    return L;
  }
  // a line of print centred on the path: letters in a word touch, a space is a gap to walk through
  function line(text, zc, gapW = 3.6) {
    const adv = 4 * LS + 0.2, words = text.split(' ');
    const width = words.reduce((w, wd) => w + wd.length * adv, 0) - 0.2 + (words.length - 1) * gapW;
    let x = -width / 2 + 2 * LS;
    const gaps = [], hd = 3 * LS + THICK * LS / 2;
    words.forEach((wd, wi) => {
      // the whole word is one block to walk round (no squeezing into the hollows between strokes)
      const wx0 = x - 2 * LS - THICK * LS / 2, wx1 = x + (wd.length - 1) * adv + 2 * LS + THICK * LS / 2;
      R.solids.push({ kind: 'word', x: (wx0 + wx1) / 2, z: zc, w: wx1 - wx0, d: hd * 2, h: 6.6, rot: 0, word: true });
      [...wd].forEach((ch, i) => {
        const tall = TALL.includes(ch), L = glyph(ch, x, zc, LS, tall ? 6.2 : 4.4, ch + (R.lines.length + 1));
        L.tall = tall; x += adv;
      });
      if (wi < words.length - 1) { const g0 = x - adv + 2 * LS + THICK * LS / 2 + 0.05; gaps.push([g0, g0 + gapW - THICK * LS - 0.1]); x += gapW - 0.2 + 0.2; }
    });
    R.lines.push({ z: zc, hd, gaps, kind: 'print', x0: -width / 2, x1: width / 2 });
  }
  line('ALL THE PAPER', -161);
  line('PEOPLE RAN TO', -183);
  line('SEE THE WILD', -205);
  line('SHIP LANDED', -226);
  // the capital at the start of the paragraph: a tower twice as big
  glyph('T', -10, -258, LS * 1.6, 9, 'CAP').cap = true;
  R.solids.push({ kind: 'word', x: -10, z: -258, w: 4 * LS * 1.6 + 1, d: 6 * LS * 1.6 + 1, h: 9, rot: 0, word: true });
  line('AND THE BOOK', -299);
  line('WORM SAID HI', -314);
  // the exclamation mark and its line of holes
  R.bang = { x: 7, z: -238, h: 9, holesZ: -244, holesHw: 0.75, bridge: { x: 7, z: -243.5, w: 1.8, d: 8 } };
  R.solids.push({ kind: 'bang', x: R.bang.x, z: R.bang.z, w: 0.9, d: 0.9, h: R.bang.h, rot: 0, bang: true });
  for (const L of R.letters) for (const b of L.boxes) R.solids.push({ kind: 'letter', x: b.x, z: b.z, w: b.w, d: b.d, h: L.h, rot: b.rot, cover: true });

  /* ---------- the Ink Crater ---------- */
  R.ink = {
    cx: 0, cz: -400, rx: 48, rz: 79,
    pathX: z => 4.5 * Math.sin((z + 320) * 0.045) + 1.5 * Math.sin((z + 320) * 0.11), pathHw: 2.4,
    islands: [[-9, -352, 3], [10, -374, 3.4], [-7, -418, 3], [10.5, -442, 3.2], [-10, -463, 3.4]],
  };
  R.inkAt = (x, z) => {
    const I = R.ink, ex = (x - I.cx) / I.rx, ez = (z - I.cz) / I.rz;
    if (ex * ex + ez * ez > 1) return false;
    if (Math.abs(x - I.pathX(z)) < I.pathHw) return false;
    for (const [ix, iz, ir] of I.islands) if (Math.hypot(x - ix, z - iz) < ir) return false;
    // the ribbons and restart spots are dry
    for (const c of R.checks) if (Math.abs(z - c.z) < 2.5 && c.z < -320 && c.z > -480) return false;
    return true;
  };
  R.cone = { z0: -326, z1: -458, spots: [[-8, 7], [6, 9], [-2, 6], [10, 10], [-11, 8], [3, 11], [-5, 9], [9, 7]], move: 2.6, rest: 2.6, popAt: 2.0 };

  /* ---------- Bunker Hill: folded-card steps up to the top, the Walker's arena and the hatch ---------- */
  const fold = (z, x0, x1) => {
    R.solids.push({ kind: 'fold', x: (x0 + x1) / 2, z, w: x1 - x0, d: 1.2, h: 4.2, rot: 0, cover: true });
    // the gap is the rest of the width (the walls reach past the sides of the path)
    const gaps = x0 > -16 ? [[-16, x0 - 0.1]] : [[x1 + 0.1, 16]];
    R.lines.push({ z, hd: 0.6, gaps, kind: 'fold', x0, x1 });
  };
  fold(-494, -20, 6.5); fold(-509, -6.5, 20); fold(-524, -20, 6.5); fold(-539, -6.5, 20);
  R.walker = { start: { x: 0, z: -578 }, stop12: -561, stop3: -569, spots: [[-6, -572], [6, -575], [0, -578], [-8, -576], [8, -571]], hatch: { x: 0, z: -585, r: 2.2 } };
  R.lines.sort((a, b) => b.z - a.z);

  // the blockade walls are solids too (the rules take them away when the blockade is beaten)
  R.events.forEach((ev, i) => {
    if (!ev.block) return;
    const [x0, x1, z] = ev.block.wall;
    ev.block.solid = { kind: 'staples', x: (x0 + x1) / 2, z, w: x1 - x0, d: 0.9, h: 0.62, rot: 0, block: i };
    R.solids.push(ev.block.solid);
  });
  return R;
})();

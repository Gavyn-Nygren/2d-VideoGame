#!/usr/bin/env node
// 5-4 Rising Lava: builds the four tall tower maps and writes js/levels/world5/rising-lava-map.js (the level def).
// The towers are laid out here with a few drawing calls in "height" coordinates (h = rows above the floor, the floor is
// h 0), so a flight of steps is one line instead of a dozen hand-typed map rows. Edit this file, then run
//   node tools/w5/lava-towers.js          (writes the map file and prints the towers)
//   node tools/w5/lava-check.js           (checks every flight can be climbed and no one can skip a partner's press)
// Map chars: see the header of js/levels/world5/rising-lava.js.
'use strict';
const fs = require('fs'), path = require('path');

// a tower whose top walkway is a plank row at height `top`; the door stands on it, the ceiling is 4 rows higher
function tower(top) {
  const N = top + 5, g = [];
  for (let r = 0; r < N; r++) g.push(Array.from({ length: 32 }, (_, c) => (c === 0 || c === 31 || r === 0 ? '#' : '.')));
  const row = h => N - 1 - h;
  const T = {
    N, top,
    set(c, h, ch) {
      if (c < 0 || c > 31 || h < 0 || h >= N) throw new Error('off the map: ' + c + ',' + h);
      const cur = g[row(h)][c];
      if (cur !== '.' && cur !== ch && !(ch === '#' && cur === '#')) throw new Error(`cell ${c},${h} already '${cur}', wanted '${ch}'`);
      g[row(h)][c] = ch;
    },
    fill(c0, c1, h, ch) { for (let c = c0; c <= c1; c++) T.set(c, h, ch); },
    rock(c0, c1, h) { T.fill(c0, c1, h, '#'); },
    plank(c0, c1, h) { T.fill(c0, c1, h, '='); },
    wall(c, h0, h1, w = 1) { for (let h = h0; h <= h1; h++) for (let k = 0; k < w; k++) T.set(c + k, h, '#'); },
    // 2-wide steps of group G: [[c, h], ...] (each step covers columns c and c+1); w: width
    steps(G, list, w = 2) { for (const [c, h, ww] of list) for (let k = 0; k < (ww || w); k++) T.set(c + k, h, G); },
    // a permanent colour pad (solid for its owner only): '{' Pip's orange, '}' Bo's blue
    pad(owner, c0, c1, h) { T.fill(c0, c1, h, owner ? '}' : '{'); },
    btn(ch, c, h) { T.set(c, h + 1, ch); },           // a button standing on the surface at height h
    spawn(k, c, h) { T.set(c, h + 1, String(k + 1)); },
    star(k, c, h) { T.set(c, h + 1, k ? '>' : '<'); },
    door(c) { T.set(c, top + 1, '$'); },
    ice(c, h) { T.set(c, h, '+'); },                  // an ice pop in the cell at height h
    // a team checkpoint on the surface at height h (the whole row counts); Pip's and Bo's spots
    cp(h, pipC, boC) { T.set(pipC, h + 1, '('); T.set(boC, h + 1, ')'); },
    rows() { return g.map(r => r.join('')); },
    row,
  };
  return T;
}

/* ===================== Tower 1: Warm Feet (44 rows) ===================== */
function warmFeet() {
  const t = tower(44);
  t.rock(1, 30, 0);
  // --- rows 0-13: two shafts with a wall between (Pip left, Bo right). Pip's button builds Bo's first steps ---
  t.wall(15, 1, 12, 2);
  t.spawn(0, 3, 0); t.spawn(1, 28, 0);
  t.btn('a', 7, 0);                                   // Pip's: blue steps up Bo's shaft
  t.steps('A', [[18, 2], [21, 4]]);
  t.rock(25, 30, 6); t.btn('o', 29, 6);               // Bo's: orange steps up Pip's shaft
  t.steps('O', [[12, 2], [9, 4]]);
  t.rock(1, 6, 6); t.btn('b', 2, 6);
  t.steps('B', [[28, 8], [25, 10]]);                  // Bo up to the checkpoint planks
  t.plank(1, 30, 13); t.btn('p', 20, 13);
  t.steps('P', [[2, 8], [5, 10]]);                    // Pip up to the checkpoint
  t.cp(13, 8, 24);
  // --- rows 13-28: the wall ends and the routes swap sides, right through each other's steps ---
  t.btn('c', 5, 13); t.btn('q', 26, 13);
  t.steps('C', [[18, 15], [14, 17], [11, 19], [8, 21]]);   // Bo goes up to the left
  t.steps('Q', [[12, 15], [16, 17], [19, 19], [22, 21]]);  // Pip goes up to the right
  t.rock(1, 6, 23); t.btn('r', 2, 23);
  t.rock(25, 30, 23); t.btn('d', 29, 23);
  t.steps('D', [[4, 25], [7, 27]]);
  t.steps('R', [[26, 25], [23, 27]]);
  t.plank(1, 30, 29);
  t.cp(29, 5, 22);
  // --- rows 29-44: plain leapfrog in one shaft, quicker ---
  t.btn('e', 13, 29);
  t.steps('E', [[17, 31]]);
  t.rock(20, 25, 33); t.btn('s', 24, 33);
  t.steps('S', [[10, 31], [7, 33], [4, 35]]);
  t.rock(1, 3, 37); t.btn('f', 1, 37);
  t.steps('F', [[27, 35], [24, 37], [21, 39]]);
  t.rock(14, 18, 41); t.btn('t', 15, 41);
  t.steps('T', [[6, 39], [9, 41]]);
  t.plank(1, 30, 44); t.door(15);
  return t;
}

/* ===================== Tower 2: Criss-Cross (50 rows) ===================== */
function crissCross() {
  const t = tower(50);
  t.rock(1, 30, 0);
  t.spawn(0, 2, 0); t.spawn(1, 29, 0);
  // --- rows 0-12: both press at once, then two long stairs that cross in the middle ---
  t.btn('a', 4, 0); t.btn('o', 27, 0);
  t.steps('A', [[23, 2], [20, 4], [17, 6], [14, 8], [11, 10]]);   // Bo: up to the left
  t.steps('O', [[7, 2], [10, 4], [13, 6], [16, 8], [19, 10]]);    // Pip: up to the right
  t.rock(1, 8, 12); t.rock(23, 30, 12);
  t.cp(12, 28, 3);
  // --- rows 12-25: the zipper. Each press makes the next flight for the other one, so you take turns ---
  t.btn('b', 30, 12);
  t.steps('B', [[9, 15], [12, 17]]); t.pad(1, 14, 15, 19); t.btn('q', 14, 19);
  t.steps('Q', [[21, 15], [18, 17]]); t.pad(0, 16, 17, 19); t.btn('c', 17, 19);
  t.steps('C', [[17, 21], [20, 23]]);
  t.steps('R', [[13, 21], [10, 23]]);
  t.ice(2, 15); t.ice(29, 15);                         // a jump up the side wall
  t.plank(1, 30, 25); t.btn('r', 23, 25); t.btn('s', 29, 25); t.btn('d', 2, 25);
  t.cp(25, 1, 30);
  // --- rows 25-37: up to two pads, press together, cross again ---
  t.steps('D', [[26, 27], [23, 29]]); t.pad(1, 18, 20, 31); t.btn('t', 20, 31);
  t.steps('S', [[4, 27], [7, 29]]); t.pad(0, 10, 12, 31); t.btn('e', 10, 31);
  t.steps('E', [[16, 33], [12, 35]]);
  t.steps('T', [[14, 33], [17, 35]]);
  t.rock(1, 9, 37); t.rock(20, 30, 37); t.btn('f', 29, 37); t.btn('u', 2, 37);
  t.cp(37, 27, 4);
  // --- rows 37-50: the double helix up to the door ---
  t.steps('F', [[10, 40], [13, 42], [16, 44], [19, 46], [22, 48]]);   // Bo: up to the right
  t.steps('U', [[18, 40], [15, 42], [12, 44], [9, 46], [6, 48]]);     // Pip: up to the left
  t.ice(14, 46);
  t.plank(1, 30, 50); t.door(15);
  return t;
}

/* ===================== Tower 3: Hold Tight (48 rows) ===================== */
// hold plates: o b p c q r f (the steps are there only while the owner stands on the plate)
function holdTight() {
  const t = tower(48);
  t.rock(1, 30, 0);
  t.spawn(0, 3, 0); t.spawn(1, 28, 0);
  // --- rows 0-14: Bo holds a plate, Pip climbs across to a button that builds Bo's way up ---
  t.btn('o', 27, 0);                                                  // Bo's plate: Pip's steps
  t.steps('O', [[5, 2], [8, 4], [11, 6], [14, 8], [17, 10]]);
  t.rock(20, 25, 12); t.btn('a', 24, 12);                             // Pip's button: Bo's steps
  t.steps('A', [[24, 3], [21, 5], [18, 7], [15, 9], [12, 11]]);
  t.plank(1, 30, 14);
  t.cp(14, 22, 13);
  // --- rows 14-33: the relay. Hold, cross, hold, cross; every plate sits on a ledge ---
  t.btn('b', 29, 14);                                                 // Pip holds: Bo goes up to the left
  t.steps('B', [[9, 16], [6, 18]]); t.rock(1, 5, 20); t.btn('p', 2, 20);
  t.steps('P', [[26, 16], [23, 18], [20, 20], [17, 22]]); t.rock(11, 16, 24); t.btn('c', 13, 24);
  t.steps('C', [[6, 23], [9, 25], [12, 27], [15, 29]]); t.rock(18, 22, 31); t.btn('q', 20, 31);
  t.steps('Q', [[9, 26], [6, 28], [3, 30]]);
  t.plank(1, 30, 33);
  t.cp(33, 6, 22);
  // --- rows 33-48: hold and dash. Long bridges; the button in the middle builds the holder's way on ---
  t.btn('r', 28, 33);                                                 // Bo holds: Pip's step and bridge
  t.steps('R', [[4, 35], [7, 37, 7]]); t.btn('e', 10, 37);            // Pip's button on the bridge: Bo's way up
  t.steps('E', [[26, 35], [23, 37]]);
  t.rock(16, 21, 39); t.btn('f', 17, 39);                             // Pip holds: Bo's step and bridge
  t.steps('F', [[13, 41], [4, 43, 7]]); t.btn('s', 7, 43);            // Bo's button on the bridge: Pip's way up
  t.rock(1, 2, 45);
  t.steps('S', [[22, 42], [25, 44], [28, 46]]);
  t.ice(8, 46);
  t.plank(1, 30, 48); t.door(15);
  return t;
}

/* ===================== Tower 4: Volcano Top (63 rows) ===================== */
// hold plates: c q. Surges only in the middle (the relay).
function volcanoTop() {
  const t = tower(63);
  t.rock(1, 30, 0);
  t.spawn(0, 3, 0); t.spawn(1, 28, 0);
  // --- rows 0-15: quick leapfrog, a button every flight ---
  t.btn('a', 13, 0);
  t.steps('A', [[17, 2]]);
  t.rock(20, 25, 4); t.btn('o', 24, 4);
  t.steps('O', [[10, 2], [7, 4], [4, 6]]);
  t.rock(1, 3, 8); t.btn('b', 1, 8);
  t.steps('B', [[27, 6], [24, 8], [21, 10]]);
  t.rock(14, 18, 12); t.btn('p', 15, 12);
  t.steps('P', [[6, 10], [9, 12]]);
  t.plank(1, 30, 15);
  t.cp(15, 10, 16);
  // --- rows 15-31: a hold-plate relay (two trades) while the lava surges ---
  t.btn('c', 29, 15);                                                         // Pip holds: Bo goes up to the left
  t.steps('C', [[11, 18], [8, 20], [5, 22]]);
  t.rock(1, 3, 24); t.btn('q', 2, 24);                                        // Bo holds: Pip's long flight
  t.steps('Q', [[26, 17], [23, 19], [20, 21], [17, 23], [14, 25], [11, 27], [8, 29]]);
  t.ice(24, 23);                                                              // a leap off the flight (the step below catches you)
  t.btn('h', 10, 31);                                                         // Pip's button at the top: Bo's way up
  t.steps('H', [[4, 27], [6, 29]]);
  t.plank(1, 30, 31); t.btn('d', 2, 31); t.btn('s', 29, 31);
  t.cp(31, 1, 30);
  // --- rows 31-56: pads, a crossing, then the double helix ---
  t.steps('D', [[26, 33], [23, 35]]); t.pad(1, 18, 20, 37); t.btn('t', 20, 37);
  t.steps('S', [[4, 33], [7, 35]]); t.pad(0, 10, 12, 37); t.btn('e', 10, 37);
  t.steps('E', [[16, 39], [12, 41]]);
  t.steps('T', [[14, 39], [17, 41]]);
  t.rock(1, 9, 43); t.rock(20, 30, 43); t.btn('f', 29, 43); t.btn('u', 2, 43);
  t.cp(43, 27, 4);
  t.steps('F', [[10, 46], [13, 48], [16, 50], [19, 52], [22, 54]]);
  t.steps('U', [[18, 46], [15, 48], [12, 50], [9, 52], [6, 54]]);
  t.ice(14, 45); t.ice(15, 51);
  t.plank(1, 30, 56);
  t.cp(56, 10, 20);
  // --- rows 56-63: the crater rim. One last leapfrog, then both stars open the hatch round the door ---
  t.btn('g', 3, 56);
  t.steps('G', [[25, 58], [22, 60]]);
  t.steps('V', [[4, 58], [7, 60]]);
  t.plank(1, 30, 63); t.btn('v', 29, 63);
  t.star(0, 4, 63); t.star(1, 27, 63);
  t.rock(13, 18, 66);
  for (const h of [64, 65]) { t.set(13, h, '@'); t.set(18, h, '@'); }
  t.door(15);
  return t;
}

const THEME = (skyTop, skyBot, extra) => Object.assign({ skyTop, skyBot, hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968',
  stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' }, extra || {});
// per tower: title, tip, theme, lava rules, hold plates, signs [x px, height h of the surface they hang above, text]
const TOWERS = [
  { key: 'warm', build: warmFeet, title: 'Warm Feet',
    tip: 'Orange buttons are Pip’s, blue ones are Bo’s. Each one makes steps for the other!',
    theme: THEME('#ffb08a', '#ffe6c4'), lava: { delay: 6, speed: 13 },
    signs: [[150, 2, 'Pip: step on your button!'], [150, 1.2, 'It makes steps for Bo'], [810, 2, 'Bo: climb, then press yours'], [810, 1.2, 'It makes steps for Pip'],
      [480, 16, 'Jump right through your partner’s color!'], [480, 46, 'Meet at the door!']] },
  { key: 'criss', build: crissCross, title: 'Criss-Cross',
    tip: 'Press your buttons at the same time, then climb. You pass right through each other’s blocks!',
    theme: THEME('#ff9f7e', '#ffdcb4'), lava: { delay: 5, speed: 16 },
    signs: [[480, 3, 'Press together, then climb!'], [480, 13.3, 'Take turns: each press builds the next flight'], [150, 13.3, 'Ice pop = frozen lava!']] },
  { key: 'hold', build: holdTight, title: 'Hold Tight', holds: 'obpcqrf',
    tip: 'Flat plates only work while you stand on them. Hold on: the lava can’t get you while you hold!',
    theme: THEME('#ff8f74', '#ffd2a6'), lava: { delay: 5, speed: 15, surge: { every: 8, warn: 1.5, time: 0.7, speed: 70 } },
    signs: [[810, 2.2, 'Bo: stay on your plate'], [810, 1.4, 'while Pip climbs across!'], [480, 16.3, 'Rumble? The lava jumps up!'],
      [480, 35.3, 'Hold on while your partner dashes!']] },
  { key: 'volcano', build: volcanoTop, title: 'Volcano Top', holds: 'cq',
    tip: 'Quick turns all the way up. At the top, stand on your star buttons together!',
    theme: THEME('#ff7d63', '#ffc895'), lava: { delay: 4, speed: 19, surge: { every: 9, warn: 1.5, time: 0.7, speed: 70, from: 15, to: 31 } },
    signs: [[480, 2.2, 'Quick turns all the way up!'], [480, 17.4, 'Hold your plate while your partner climbs!'], [720, 25.6, 'Leap for an ice pop?'],
      [255, 65.3, 'Both stand on'], [705, 65.3, 'your star buttons!']] },
];

// a small JS literal: { key: 'text', n: 1, sub: { ... } }
const q = v => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lit = v => (v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + lit(x)).join(', ') + ' }' : typeof v === 'string' ? q(v) : String(v));
// the level def file the game loads (after js/levels/world5/rising-lava.js)
function writeMapFile() {
  const out = [];
  out.push('/* Pip & Bo - Level 5-4 Rising Lava: the level def and its four tall towers (MODES.lava, js/levels/world5/rising-lava.js). */');
  out.push("'use strict';");
  out.push('');
  out.push('/* Made by tools/w5/lava-towers.js: edit the towers there and run it again (then node tools/w5/lava-check.js).');
  out.push('   Rows are top first; the comment after each row is its height above the tower floor. The stub in');
  out.push('   js/levels/level-list.js keeps 5-4 in its place in the level order; this fills it in. */');
  out.push("Object.assign(LEVELS.find(l => l.name === 'Rising Lava'), {");
  out.push("  ownStep: true, passPartners: true, roomWord: 'Tower',");
  out.push("  legend: { down: 'drop · hold: hop back', padDown: 'down drops, hold: back' },");
  out.push("  tip: 'Each button makes steps for your partner. Climb the tower before the lava does! Stuck? Hold down for a second to hop back.',");
  out.push('  switches: {}, signs: [],');
  out.push('  rooms: [');
  TOWERS.forEach((tw, i) => {
    const t = tw.build(), rows = t.rows();
    out.push(`    { // ---------- Tower ${i + 1}: ${tw.title} (${t.top} rows to climb) ----------`);
    out.push(`      title: ${q(tw.title)},`);
    out.push(`      tip: ${q(tw.tip)},`);
    out.push(`      theme: ${lit(tw.theme)},`);
    out.push(`      lava: ${lit(tw.lava)},`);
    if (tw.holds) out.push(`      holds: '${tw.holds}',`);
    out.push('      signs: [');
    for (const [x, h, text] of tw.signs || []) out.push(`        { x: ${x}, y: ${Math.round((t.N - 1 - h) * 30 + 15)}, text: ${q(text)} },`);
    out.push('      ],');
    out.push('      map: LAVA_DUMMY,');
    out.push('      climb: [');
    rows.forEach((r, k) => out.push(`        '${r}', // ${t.N - 1 - k}`));
    out.push('      ] },');
  });
  out.push('  ],');
  out.push('});');
  const file = path.resolve(__dirname, '..', '..', 'js', 'levels', 'world5', 'rising-lava-map.js');
  fs.writeFileSync(file, out.join('\n') + '\n');
  return file;
}

if (require.main === module) {
  for (const tw of TOWERS) {
    const t = tw.build();
    console.log('--- ' + tw.key + ' (' + t.N + ' rows)');
    t.rows().forEach((r, i) => console.log(r + '  h' + String(t.N - 1 - i).padStart(2)));
  }
  console.log('wrote ' + writeMapFile());
}
module.exports = { TOWERS, tower };

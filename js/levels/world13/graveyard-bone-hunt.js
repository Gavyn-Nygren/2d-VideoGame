/* Pip & Bo - Level 13-2 Graveyard Bone Hunt (team, World 13 Spooky Hollow). */
'use strict';

/* ===== MODES.bonehunt — 13-2 Graveyard Bone Hunt (World 13 "Spooky Hollow", team) =====
   Gavyn's pick: dig up a friendly skeleton's lost bones around a moonlit graveyard. Each bone you put back makes him a
   better helper: first a stepstool, then a ladder, then a bridge. Mr. Bones starts as a grinning skull in a little wagon.
   Four rooms, each with its own teamwork twist; every room needs both players:
     1 Front Gate      a head boost up to a crypt roof for his leg bone, then carry the big backbone together. -> STOOL
     2 Crooked Crypts  stack up on Mr. Bones (stool + a head) for his hip bone; one holds the creaky crank while the
                       other digs inside the gated crypt.                                                  -> LADDER
     3 Pumpkin Plot    climb Mr. Bones up the old tree for his funny bone; dig the giant ribcage together (both shovels
                       at once) and carry it home over the pumpkins.                                        -> BRIDGE
     4 Old Bell Tower  bridge the big open grave, stack up for his other arm, climb him to the belfry and pull both bell
                       ropes together: his hand (the bell's clapper!) and a top hat fly down. He dances. The end.
   The action is 'dig'. It digs a mound (3 digs, a big bone 6), grabs an end of a big bone (both lift it together; it
   drops with a "Clatter!" if you pull apart or one of you ends up much higher), calls Mr. Bones to a chalk X once he
   can be that shape (he hops over), and is held to turn the crank or pull a bell rope. Small bones are carried over
   your head. Touch Mr. Bones with a bone to put it back.
   While two carry a big bone, a jump by either is a jump for both, and carrying is a bit slower.
   On Mr. Bones the ladder, hold jump to climb and down to go down; at the top you step onto the ledge.
   Soft fails only: an open grave is "Boing!" (a springy mattress bounces you out, a puff of purple smoke, back to the
   last jack-o'-lantern YOU passed, or the room start: never across a grave to a lantern only the partner reached);
   holding down 1.2 s on the ground hops you back there too (stuck in a crypt). A dropped big bone lies where it fell
   (over a grave it pops back to where you lifted it). Mr. Bones won't move while someone is on him: "Hop off me
   first!" to the one on him, "Bo is on me! Hop off, Bo!" when it's the partner.
   Room 4's balcony (the arm bone) is out of jump reach from the tower top (a running jump falls about 25 px short),
   so it needs the stool and a head.
   Help, always gold and announced: after 30 s with no progress a gold arrow points at the next job and the next
   mound digs up at once (the giant ribcage then also takes lone digs); after 3 clatters a bone gets gold glue and
   can't slip; once Mr. Bones has a new shape, his chalk X glows gold if nobody calls him for a while.
   Map chars (parsed here, the rest of the game never sees them):
     #  earth   B  crypt / tower stone   W  tree trunk   S  little headstone (solid)   p  pumpkin (solid)   = planks
     d  small bone mound   D  big bone mound (def.mounds lists their bones in reading order)   h  Mr. Bones' start
     x  stool spot   y  ladder spot (against a wall)   z  bridge spot (at a grave's edge)   ~  open grave
     N  jack-o'-lantern checkpoint   g  crypt gate cells   r  the crank   !  a bell rope   E  the exit arch
   Room def: { title, tip, unlock ('stool' | 'ladder' | 'bridge' | 'done'), mounds: [{ piece, how, len, together }],
     bellPiece, exitVia, exitLabel, finale: { x, feet }, plan (the computer's order of jobs), stones (headstone
     epitaphs), decor: [{ k: 'grave' | 'tree' | 'owl' | 'ghost' | 'fence' | 'sign' ... }] }
   Every top-level name starts with bonehunt / BONEHUNT (Sfx.extra.bonehunt* too); all level state lives in G.mst. */
const BONEHUNT = {
  digSmall: 3, digBig: 6, digTogether: 5, togetherWin: 0.5, digCD: 0.14, digAnim: 0.28,
  bigReach: 22, bigSlack: 46, bigDy: 70, carryMax: 165, grabFeet: 6,
  climbUp: 150, climbDown: 175, downClimbT: 0.12,
  gateUp: 2.6, gateDown: 3.2, gateGrace: 0.25, crankReach: 24, gatePass: 0.5,
  ropeReach: 22, bellFill: 1.3,
  callReach: 24, hopT: 0.8,
  boingT: 0.55, backHold: 1.2, backShow: 0.15,
  exitHold: 0.35, leaveT: 0.95, danceT: 4.8,
  goldAfter: 30, glueAfter: 3, chalkGold: 14,
  hintGap: 5, hintLife: 3,
};
const BONEHUNT_SOLID = '#BWSp';
// what each bone is called and what Mr. Bones says when it goes back in
const BONEHUNT_PIECES = {
  leg1: { name: 'leg bone', line: 'A leg to stand on!' },
  spine: { name: 'backbone', line: 'My backbone! I feel so supported!' },
  hips: { name: 'hip bone', line: 'Hip hip hooray!' },
  leg2: { name: 'other leg', line: 'Two legs! Look, tiptoes!' },
  funny: { name: 'funny bone', line: 'My funny bone! Ha-ha-ha!' },
  ribs: { name: 'ribcage', line: 'My ribs! No ribbing, please!' },
  arm: { name: 'arm bone', line: 'Now I’m armed... with hugs!' },
  hand: { name: 'hand', line: 'A hand! Give me a hand!' },
};
const BONEHUNT_ALL = ['leg1', 'spine', 'hips', 'leg2', 'funny', 'ribs', 'arm', 'hand'];
const BONEHUNT_FORMS = { stool: 'STEPSTOOL', ladder: 'LADDER', bridge: 'BRIDGE' };

// the player's own key for hint bubbles: keyboard, controller or touch
function bonehuntKey(id, what) {
  const how = actKey(id);
  if (what === 'act') return how === 'pad' ? glyph('act') : how === 'touch' ? 'dig' : id === 0 ? 'F' : '/';
  if (what === 'jump') return how === 'pad' ? glyph('a') : how === 'touch' ? '▲' : id === 0 ? 'W' : '↑';
  return how === 'pad' ? 'down' : how === 'touch' ? '▼' : id === 0 ? 'S' : '↓';
}
// "Press F to dig" / "Tap dig to dig" / "Press X to dig"
function bonehuntPress(id, verb, hold) {
  const how = actKey(id), k = bonehuntKey(id, 'act');
  if (how === 'touch') return (hold ? 'Hold the dig button' : 'Tap dig') + ' to ' + verb;
  return (hold ? 'Hold ' : 'Press ') + k + ' to ' + verb;
}
// "Press W to jump up!" / "Tap ▲ to jump up!" (what: 'jump' or 'down')
function bonehuntPressKey(id, what, verb) {
  return (actKey(id) === 'touch' ? 'Tap ' : 'Press ') + bonehuntKey(id, what) + ' to ' + verb;
}
const bonehuntCx = p => p.x + p.w / 2;
const bonehuntFeet = p => p.y + p.h;
const bonehuntSolo = id => cpuSolo() && cpuOn(id);   // (1-player mode: this player is the computer)

/* ---------- the room: parse the map ---------- */
function bonehuntRoom(st, L) {
  const def = L.def, g = L.grid;
  st.sty = [];
  for (let r = 0; r < ROWS; r++) st.sty.push(new Array(COLS).fill(null));
  st.mounds = []; st.spots = []; st.pits = new Set(); st.pitCells = []; st.lanterns = []; st.ropes = [];
  st.home = null; st.stones = []; st.bones = []; st.flyers = [];
  const gateCells = [];
  let crank = null;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (BONEHUNT_SOLID.includes(ch)) { st.sty[r][c] = ch; g[r][c] = '#'; if (ch === 'S') st.stones.push({ c, r }); }
    else if (ch === 'd' || ch === 'D') { st.mounds.push({ c, r, big: ch === 'D' }); g[r][c] = '.'; }
    else if (ch === 'h') { st.home = { x: c * T + T / 2, feet: (r + 1) * T }; g[r][c] = '.'; }
    else if (ch === 'x' || ch === 'y' || ch === 'z') { st.spots.push({ type: { x: 'stool', y: 'ladder', z: 'bridge' }[ch], c, r }); g[r][c] = '.'; }
    else if (ch === '~') { st.pits.add(c + ',' + r); st.pitCells.push({ c, r }); g[r][c] = '.'; }
    else if (ch === 'N') { st.lanterns.push({ x: c * T + T / 2, feet: (r + 1) * T, lit: false, t: 0 }); g[r][c] = '.'; }
    else if (ch === 'g') { gateCells.push({ c, r }); g[r][c] = '#'; st.sty[r][c] = 'g'; }
    else if (ch === 'r') { crank = { x: c * T + T / 2, feet: (r + 1) * T }; g[r][c] = '.'; }
    else if (ch === '!') { st.ropes.push({ x: c * T + T / 2, feet: (r + 1) * T, pull: 0 }); g[r][c] = '.'; }
  }
  const solidAt = (c, r) => tile(c, r) === '#';
  // mounds, in reading order, get their bones from def.mounds
  st.mounds.forEach((m, i) => {
    const md = (def.mounds || [])[i] || {};
    Object.assign(m, { i, piece: md.piece || 'leg1', how: md.how || 'walk', together: !!md.together, len: md.len || (m.big ? 90 : 0),
      x: m.c * T + T / 2, feet: (m.r + 1) * T, digs: 0, done: false, shake: 0, sparkle: 0, gold: false, cfg: md });
    m.need = m.big ? (m.together ? BONEHUNT.digTogether : BONEHUNT.digBig) : BONEHUNT.digSmall;
    m.span = m.big ? m.len / 2 + 6 : 18;
  });
  // Mr. Bones' spots: the stool's cell, the ladder's column up the wall beside it, the bridge's cells over the grave
  for (const s of st.spots) {
    s.x = s.c * T + T / 2; s.feet = (s.r + 1) * T; s.glowT = 0; s.gold = false;
    if (s.type === 'ladder') {
      s.side = solidAt(s.c + 1, s.r) ? 1 : -1;
      let rr = s.r;
      while (rr > 0 && solidAt(s.c + s.side, rr - 1)) rr--;
      s.top = rr * T;
    } else if (s.type === 'bridge') {
      s.side = st.pits.has((s.c + 1) + ',' + (s.r + 1)) ? 1 : -1;
      s.cells = [];
      for (let c = s.c + s.side; c >= 0 && c < COLS && st.pits.has(c + ',' + (s.r + 1)); c += s.side) s.cells.push({ c, r: s.r + 1 });
      const cs = s.cells.map(k => k.c);
      s.x0 = Math.min(...cs) * T; s.x1 = (Math.max(...cs) + 1) * T; s.y0 = (s.r + 1) * T;
    }
  }
  // the gate: a column of cells; solid while it's down
  st.gate = null;
  if (gateCells.length) {
    const c = gateCells[0].c, rs = gateCells.map(k => k.r);
    st.gate = { c, r0: Math.min(...rs), r1: Math.max(...rs), x: c * T, open: 0, grace: 0, pass: false, crank: crank || { x: c * T - 150, feet: H - 60 },
      spin: 0, creakT: 0, held: -1, slams: 0, cells: gateCells };
    st.gate.y0 = st.gate.r0 * T; st.gate.y1 = (st.gate.r1 + 1) * T;
    // inside the crypt: the open run of cells behind the gate
    const dir = def.gateIn || (solidAt(c - 1, st.gate.r1) ? -1 : 1);
    let x1 = c + dir;
    while (x1 >= 0 && x1 < COLS && !solidAt(x1 + dir, st.gate.r1)) x1 += dir;
    st.gate.dir = dir; st.gate.in0 = Math.min(c + dir, x1) * T; st.gate.in1 = (Math.max(c + dir, x1) + 1) * T;
  }
  st.bell = st.ropes.length ? { meter: 0, rung: false, swing: 0, t: 0, alone: 0, bongs: 0, bongT: 0 } : null;
  // the exit arch: the engine's door, taken over (drawn and checked here)
  st.exit = L.door ? { ...L.door } : null; L.door = null; st.exitT = 0; st.inExit = [false, false]; st.leaving = null;
  st.spawns = L.spawns.map(s => ({ ...s }));
  st.check = -1;   // the last lit jack-o'-lantern (each player hops back to the last one they passed: st.pl[id].check)
  st.roomPieces = st.mounds.map(m => m.piece).concat(def.bellPiece ? [def.bellPiece] : []);
  st.roomDone = false; st.finale = null;
  st.pl = [0, 1].map(() => ({ lock: null, lockT: 0, climb: false, carry: null, hold: null, digT: 9, digCD: 0, lastDig: null, check: -1,
    hint: null, hintCD: 0, sayCD: 0, downT: 0, saved: null, waitJump: false, told: {}, idleT: 0, trapT: 0, boingY: 0 }));
  st.news = null; st.newsNext = null; st.pops = []; st.dirt = []; st.stuckT = 0; st.goldArrow = null; st.unlockT = 0;
  st.roomStart = G.time; st.tellT = 0; st.mrShakeT = 0;
  // Mr. Bones arrives with a hop from the left edge
  const hm = st.home || { x: 120, feet: H - 60 };
  const mr = st.mr;
  Object.assign(mr, { x: hm.x, feet: hm.feet, form: 'hop', spot: -1, flash: 0, say: null, bob: 0, dance: 0, face: 1,
    hop: { x0: -40, f0: hm.feet, x1: hm.x, f1: hm.feet, t: 0, dur: 1.1, to: 'home' } });
  st.cfg = def;
}

/* ---------- small rules ---------- */
const bonehuntDone = st => st.roomPieces.every(k => st.pieces[k]);
const bonehuntLeft = st => st.roomPieces.filter(k => !st.pieces[k]).length;
// the floor under x, at or below fromY (null over a grave or the bottom of the screen)
function bonehuntFloor(st, x, fromY) {
  const c = Math.floor(x / T);
  for (let r = Math.max(0, Math.floor((fromY - 2) / T)); r < ROWS; r++) {
    if (st.pits.has(c + ',' + r) && tile(c, r) !== '#') return null;
    if (tile(c, r) === '#' && (r === 0 || tile(c, r - 1) !== '#')) return r * T;
  }
  return null;
}
// p is standing on this mound (and it isn't dug yet)
function bonehuntMoundAt(st, p) {
  if (!p.alive || !p.grounded) return null;
  for (const m of st.mounds) if (!m.done && Math.abs(bonehuntFeet(p) - m.feet) < 4 && Math.abs(bonehuntCx(p) - m.x) <= m.span) return m;
  return null;
}
// an unlocked chalk X that p stands on
function bonehuntSpotAt(st, p) {
  if (!p.alive || !p.grounded) return -1;
  for (let k = 0; k < st.spots.length; k++) {
    const s = st.spots[k];
    if (st.forms[s.type] && Math.abs(bonehuntFeet(p) - s.feet) < 4 && Math.abs(bonehuntCx(p) - s.x) <= BONEHUNT.callReach) return k;
  }
  return -1;
}
// a free end of a big bone lying on the ground, within reach of p: { b, end }
function bonehuntEndAt(st, p) {
  if (!p.alive || !p.grounded) return null;
  let best = null, bd = 1e9;
  for (const b of st.bones) {
    if (b.kind !== 'big' || b.state !== 'ground' || Math.abs(bonehuntFeet(p) - b.feet) > BONEHUNT.grabFeet) continue;
    for (const end of [-1, 1]) {
      if (b.holds[1 - p.id] === end) continue;
      const d = Math.abs(bonehuntCx(p) - (b.x + end * b.len / 2));
      if (d <= BONEHUNT.bigReach && d < bd) { bd = d; best = { b, end }; }
    }
  }
  return best;
}
const bonehuntAtCrank = (st, p) => !!st.gate && p.alive && p.grounded && Math.abs(bonehuntCx(p) - st.gate.crank.x) <= BONEHUNT.crankReach && Math.abs(bonehuntFeet(p) - st.gate.crank.feet) < 4;
function bonehuntRopeAt(st, p) {
  if (!p.alive || !p.grounded) return -1;
  for (let k = 0; k < st.ropes.length; k++) { const r = st.ropes[k]; if (Math.abs(bonehuntCx(p) - r.x) <= BONEHUNT.ropeReach && Math.abs(bonehuntFeet(p) - r.feet) < 4) return k; }
  return -1;
}
const bonehuntInCrypt = (st, p) => !!st.gate && p.alive && bonehuntCx(p) > st.gate.in0 && bonehuntCx(p) < st.gate.in1 && bonehuntFeet(p) > st.gate.y0 && bonehuntFeet(p) <= st.gate.y1 + 2;
// Mr. Bones' body, to touch with a bone (null while he hops)
function bonehuntMrRect(st) {
  const mr = st.mr, s = st.spots[mr.spot];
  if (mr.form === 'hop' || (mr.form !== 'sit' && mr.form !== 'dance' && !s)) return null;
  if (mr.form === 'stool') return { x: s.c * T - 8, y: s.r * T - 12, w: T + 16, h: T + 12 };
  if (mr.form === 'ladder') return { x: s.x - 18, y: s.top - 10, w: 36, h: s.feet - s.top + 10 };
  if (mr.form === 'bridge') return { x: s.x0, y: s.y0 - 18, w: s.x1 - s.x0, h: 30 };
  return { x: mr.x - 20, y: mr.feet - 58, w: 40, h: 58 };
}
const bonehuntHits = (r, x, y, w, h) => !!r && x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y;
// the ladder Mr. Bones is right now (or null)
function bonehuntLadder(st) {
  const s = st.spots[st.mr.spot];
  return st.mr.form === 'ladder' && s ? s : null;
}
// p overlaps the ladder's column (anywhere between the ground and the top)
function bonehuntOnLadderCol(s, p) {
  return !!s && p.alive && Math.abs(bonehuntCx(p) - s.x) <= 13 && bonehuntFeet(p) > s.top - 1 && p.y < s.feet;
}
// is anyone standing on, climbing or inside Mr. Bones right now? (bonehuntWhoOnMr: their ids)
const bonehuntOnMr = st => bonehuntWhoOnMr(st).length > 0;
function bonehuntWhoOnMr(st) {
  const mr = st.mr, s = st.spots[mr.spot];
  if (!s || mr.form === 'sit' || mr.form === 'hop' || mr.form === 'dance') return [];
  return G.players.filter(p => {
    if (!p.alive) return false;
    const P = st.pl[p.id], f = bonehuntFeet(p);
    if (mr.form === 'ladder') return P.climb;
    // (standing on top, or stacked on someone who is; leaning on his side doesn't count)
    if (mr.form === 'stool') return rectHit(p, s.c * T, s.r * T - 3, T, 6) || (other(p).alive && p.onPartner && rectHit(other(p), s.c * T, s.r * T - 3, T, 6));
    return f <= s.y0 + 2 && f >= s.y0 - 3 && p.x + p.w > s.x0 && p.x < s.x1;
  }).map(p => p.id);
}
// the hop-back point: the last jack-o'-lantern this player passed (not one a partner lit across a grave), or the start
function bonehuntSpawnFor(st, id) {
  const ln = st.lanterns[st.pl[id].check];
  if (!ln) return { ...st.spawns[id] };
  return { x: ln.x + (id === 0 ? -34 : 12), y: ln.feet - PH };
}

/* ---------- words over heads, news, pops ---------- */
// ok (optional): the hint fades out as soon as it stops being true (the mound is dug, the bone is lifted...)
function bonehuntSay(st, p, text, force, ok) {
  if (!force && bonehuntSolo(p.id)) return;   // (1-player mode: no key hints over the computer's head)
  const P = st.pl[p.id];
  if (!force && P.hintCD > 0) return;
  if (P.hint && P.hint.text === text && P.hint.t < P.hint.life - 0.4) return;
  P.hint = { text, t: 0, life: BONEHUNT.hintLife, ok: ok || null };
  P.hintCD = BONEHUNT.hintGap;
}
// a hint said only once per room (per player and key)
function bonehuntTell(st, p, key, text) {
  const P = st.pl[p.id];
  if (P.told[key] || bonehuntSolo(p.id) || P.hintCD > 0) return;
  P.told[key] = true;
  bonehuntSay(st, p, text, true);
}
function bonehuntNews(st, text, gold, life = 3.2) {
  const n = { text, gold: !!gold, t: 0, life };
  if (!gold && st.news && st.news.gold && st.news.t < st.news.life - 0.3) { st.newsNext = n; return; }
  st.news = n;
  if (gold) Sfx.play('bonehuntGold');
}
function bonehuntPop(st, x, y, text, col, size = 18) {
  for (let n = 0; n < 3; n++) {
    const q = st.pops.find(o => o.t < 0.8 && Math.abs(o.x - x) < 80 && Math.abs(o.y - o.t / o.life * 26 - y) < 24);
    if (!q) break;
    y = q.y - q.t / q.life * 26 - 26;
  }
  st.pops.push({ x, y, text, col, size, t: 0, life: 1.1 });
}
// Mr. Bones' own speech bubble (shown in both modes)
function bonehuntMrSay(st, text, life = 2.4) {
  const s = st.mr.say;
  if (s && s.text === text && s.t < s.life - 0.5) return;
  st.mr.say = { text, t: 0, life };
}
function bonehuntProgress(st) { st.stuckT = 0; st.goldArrow = null; for (const m of st.mounds) m.gold = false; }

/* ---------- digging ---------- */
function bonehuntDirt(st, x, y, n, gold) {
  const R = MODES.bonehunt.rand;
  for (let k = 0; k < n; k++) st.dirt.push({ x: x + (R() - 0.5) * 16, y, vx: (R() - 0.5) * 170, vy: -120 - R() * 160, life: 0.5 + R() * 0.3, max: 0.8, size: 2 + R() * 3, gold: gold && R() < 0.6 });
}
function bonehuntDig(st, p, m) {
  const P = st.pl[p.id];
  if (P.digCD > 0) return;
  P.digCD = BONEHUNT.digCD; P.digT = 0;
  m.shake = 1;
  Sfx.play('bonehuntDig', p.id);
  bonehuntDirt(st, bonehuntCx(p) + p.face * 10, m.feet - 2, 6, m.gold);
  if (m.together && !m.gold) {
    // the giant ribcage only budges when both shovels go in at once
    const o = other(p), O = st.pl[o.id];
    if (O.lastDig && O.lastDig.m === m && !O.lastDig.used && G.time - O.lastDig.t <= BONEHUNT.togetherWin) {
      O.lastDig.used = true; P.lastDig = { m, t: G.time, used: true };
      m.digs++;
      bonehuntPop(st, m.x, m.feet - 44, m.digs >= m.need ? 'Heave-HO!' : 'Heave-ho!', C.gold, 18);
      Sfx.play('bonehuntHeave');
      rumble(0, 0.2, 0.3, 80); rumble(1, 0.2, 0.3, 80);
    } else {
      P.lastDig = { m, t: G.time, used: false };
      m.lone = (m.lone || 0) + 1;
      if (m.lone % 3 === 0) bonehuntPop(st, m.x, m.feet - 44, 'Too stuck! Dig together!', '#f3e9ff', 14);
    }
  } else m.digs += m.gold ? m.need : 1;
  st.stats.digs[p.id]++;
  if (m.digs >= m.need) bonehuntUnearth(st, m, p);
}
function bonehuntUnearth(st, m, p) {
  m.done = true; m.sparkle = 1;
  bonehuntProgress(st);
  const P = st.pl[p.id], info = BONEHUNT_PIECES[m.piece];
  Sfx.play('bonehuntUnearth');
  bonehuntDirt(st, m.x, m.feet - 4, 14, true);
  for (let k = 0; k < 10; k++) confetti(m.x, m.feet - 20);
  if (m.big) {
    const b = { kind: 'big', piece: m.piece, len: m.len, x: m.x, feet: m.feet, state: 'ground', holds: [0, 0], handY: m.feet - 8, ang: 0,
      fall: 0, home: { x: m.x, feet: m.feet }, clatters: 0, glue: false, m, liftT: 0, toldWalk: false };
    st.bones.push(b);
    bonehuntPop(st, m.x, m.feet - 50, 'The ' + info.name + '!', C.paper, 18);
    if (m.together) { st.stats.dug[0]++; st.stats.dug[1]++; } else st.stats.dug[p.id]++;
  } else {
    const free = !P.carry && !P.hold;
    const b = { kind: 'small', piece: m.piece, x: m.x, feet: m.feet, state: free ? 'carried' : 'ground', who: free ? p.id : -1, t: 0, m, told: false };
    st.bones.push(b);
    if (free) P.carry = b;
    st.stats.dug[p.id]++;
    bonehuntPop(st, m.x, m.feet - 50, 'A ' + info.name + '!', C.paper, 18);
  }
}

/* ---------- the big bones: grab an end, lift together, carry, clatter ---------- */
function bonehuntGrab(st, p, hit) {
  const P = st.pl[p.id], b = hit.b;
  if (P.carry) { bonehuntPop(st, bonehuntCx(p), p.y - 16, 'Hands full!', PCOL[p.id], 14); return; }
  P.hold = b; b.holds[p.id] = hit.end;
  Sfx.play('bonehuntGrab', p.id);
  if (b.holds[1 - p.id]) {
    b.state = 'carried'; b.liftT = 0; b.home = { x: b.x, feet: b.feet };
    bonehuntPop(st, b.x, b.feet - 56, 'Lift!', C.gold, 18);
    Sfx.play('bonehuntLift');
    rumble(0, 0.15, 0.3, 70); rumble(1, 0.15, 0.3, 70);
  } else bonehuntPop(st, bonehuntCx(p), p.y - 16, 'Oof! Heavy!', PCOL[p.id], 14);
}
// let go of a big bone; when it was up in the air it drops (clatter = by accident)
function bonehuntLetGo(st, p, why) {
  const P = st.pl[p.id], b = P.hold;
  if (!b) return;
  P.hold = null; b.holds[p.id] = 0;
  if (b.state !== 'carried') return;
  const o = other(p), O = st.pl[o.id];
  if (O.hold === b) { O.hold = null; b.holds[o.id] = 0; }
  b.state = 'ground';
  const fl = bonehuntFloor(st, b.x, b.handY - 4);
  const onPit = st.pits.has(Math.floor(b.x / T) + ',' + Math.floor(((fl == null ? H : fl) + 1) / T));
  if (fl == null || onPit) {
    // over a grave: poof, back to where it was lifted
    puff(b.x, b.handY, 10, 'rgba(178,120,255,0.9)');
    b.x = b.home.x; b.feet = b.home.feet; b.fall = 0;
    bonehuntPop(st, b.x, b.feet - 40, 'Poof!', '#d9b8ff', 16);
  } else {
    // it lies flat where someone can stand at both ends (not across a headstone or a pumpkin): the nearest such spot
    const y0 = b.handY - 4, floorAt = x => {
      let f = null;
      for (const e of [-1, -0.5, 0, 0.5, 1]) {
        const ex = x + e * b.len / 2, fe = bonehuntFloor(st, ex, y0);
        if (ex < 12 || ex > W - 12 || fe == null || st.pits.has(Math.floor(ex / T) + ',' + Math.floor((fe + 1) / T)) || (f != null && fe !== f)) return null;
        f = fe;
      }
      return f;
    };
    let ff = fl;
    for (let d = 0; d <= 200; d += 5) {
      const a = floorAt(b.x + d);
      if (a != null) { b.x += d; ff = a; break; }
      const c = floorAt(b.x - d);
      if (c != null) { b.x -= d; ff = c; break; }
    }
    b.fall = Math.max(0, ff - 8 - b.handY); b.feet = ff;
  }
  b.ang = 0;
  if (why) {
    st.stats.clatters++; b.clatters++;
    Sfx.play('bonehuntClatter');
    bonehuntPop(st, b.x, b.feet - 44, 'Clatter! ' + why, '#f3e9ff', 15);
    if (b.clatters >= BONEHUNT.glueAfter && !b.glue) {
      b.glue = true;
      bonehuntNews(st, 'Gold glue! The ' + BONEHUNT_PIECES[b.piece].name + ' won’t slip now', true, 3.6);
    }
  } else Sfx.play('bonehuntThud');
}
function bonehuntCarryStep(st, dt) {
  for (const b of st.bones) {
    if (b.kind !== 'big') continue;
    if (b.fall > 0) b.fall = Math.max(0, b.fall - dt * 900);
    if (b.state === 'ground') {
      // one holder alone: walk off (or hop) and you let go
      for (const p of G.players) {
        const end = b.holds[p.id];
        if (!end) continue;
        const P = st.pl[p.id];
        if (P.hold !== b || !p.alive || Math.abs(bonehuntCx(p) - (b.x + end * b.len / 2)) > BONEHUNT.bigReach + 12 || Math.abs(bonehuntFeet(p) - b.feet) > 10) bonehuntLetGo(st, p, null);
      }
      continue;
    }
    if (b.state !== 'carried') continue;
    const L = G.players.find(p => b.holds[p.id] === -1), R = G.players.find(p => b.holds[p.id] === 1);
    if (!L || !R || !L.alive || !R.alive) { if (L) bonehuntLetGo(st, L, 'Oops!'); else if (R) bonehuntLetGo(st, R, 'Oops!'); continue; }
    b.liftT += dt;
    const lx = bonehuntCx(L), rx = bonehuntCx(R), ly = L.y + 9, ry = R.y + 9;
    b.x = (lx + rx) / 2; b.handY = (ly + ry) / 2; b.ang = Math.atan2(ry - ly, Math.max(20, rx - lx));
    if (!b.glue && b.liftT > 0.1) {
      if (rx - lx > b.len + BONEHUNT.bigSlack) { bonehuntLetGo(st, L, 'Pulled apart!'); continue; }
      if (Math.abs(ry - ly) > BONEHUNT.bigDy) { bonehuntLetGo(st, L, 'Keep it level!'); continue; }
      if (rx < lx) { bonehuntLetGo(st, L, 'Tangled up!'); continue; }
    }
    // touch Mr. Bones with it: back in it goes
    const r = bonehuntMrRect(st), x0 = Math.min(lx, rx) - 10, y0 = Math.min(ly, ry) - 12;
    if (bonehuntHits(r, x0, y0, Math.abs(rx - lx) + 20, Math.abs(ry - ly) + 24)) {
      st.pl[L.id].hold = null; st.pl[R.id].hold = null; b.holds = [0, 0];
      bonehuntDeliver(st, b, [L.id, R.id], b.x, b.handY);
    }
  }
}
function bonehuntSmallStep(st, dt) {
  for (const b of st.bones) {
    if (b.kind !== 'small' || b.state === 'done') continue;
    b.t += dt;
    if (b.state === 'ground') {
      for (const p of G.players) {
        const P = st.pl[p.id];
        if (!p.alive || P.lock || P.carry || P.hold) continue;
        if (Math.abs(bonehuntCx(p) - b.x) < 18 && Math.abs(bonehuntFeet(p) - b.feet) < 12) {
          b.state = 'carried'; b.who = p.id; P.carry = b; b.t = 0;
          Sfx.play('bonehuntGrab', p.id);
          break;
        }
      }
      continue;
    }
    const p = G.players[b.who];
    if (!p) continue;
    b.x = bonehuntCx(p); b.feet = p.y - 4;
    if (!b.told && b.t > 0.6) { b.told = true; bonehuntTell(st, p, 'carry', 'Bring it to Mr. Bones!'); }
    if (!p.alive) continue;
    if (bonehuntHits(bonehuntMrRect(st), p.x - 4, p.y - 18, p.w + 8, p.h + 18)) {
      st.pl[p.id].carry = null;
      bonehuntDeliver(st, b, [p.id], b.x, p.y - 10);
    }
  }
}
// a bone goes back into Mr. Bones
function bonehuntDeliver(st, b, who, x, y) {
  b.state = 'done';
  st.flyers.push({ kind: 'piece', piece: b.piece, x0: x, y0: y, t: 0, dur: 0.4, who, big: b.kind === 'big', len: b.len || 0 });
}
function bonehuntPieceIn(st, piece, who) {
  if (st.pieces[piece]) return;
  st.pieces[piece] = true;
  st.stats.back++;
  bonehuntProgress(st);
  const mr = st.mr;
  mr.flash = 1; st.mrShakeT = 0.5;
  bonehuntMrSay(st, BONEHUNT_PIECES[piece].line, 2.8);
  Sfx.play('bonehuntClack');
  const r = bonehuntMrRect(st) || { x: mr.x - 20, y: mr.feet - 50, w: 40, h: 50 };
  for (let k = 0; k < 18; k++) confetti(r.x + r.w / 2, r.y + 10);
  for (const id of who) rumble(id, 0.2, 0.5, 120);
  if (!st.roomDone && bonehuntDone(st)) {
    st.roomDone = true; st.unlockT = 0;
    const u = st.cfg.unlock;
    if (u && BONEHUNT_FORMS[u]) {
      st.forms[u] = true;
      bonehuntNews(st, 'Mr. Bones can be a ' + BONEHUNT_FORMS[u] + ' now! Call him at his chalk X', false, 4.2);
      Sfx.play('bonehuntTada');
    }
  } else if (!st.roomDone) {
    const n = bonehuntLeft(st);
    bonehuntNews(st, n === 1 ? 'One more bone for Mr. Bones in here!' : n + ' more bones for Mr. Bones in here!', false, 2.6);
  }
}
function bonehuntFlyStep(st, dt) {
  for (const f of st.flyers) {
    f.t += dt;
    const r = bonehuntMrRect(st) || { x: st.mr.x - 20, y: st.mr.feet - 50, w: 40, h: 50 };
    f.x1 = r.x + r.w / 2; f.y1 = r.y + Math.min(24, r.h / 2);
    if (f.t >= f.dur && !f.done) {
      f.done = true;
      if (f.kind === 'hat') { st.hatOn = true; Sfx.play('bonehuntPop'); bonehuntMrSay(st, 'Ooh, a top hat! How dapper!', 2.6); }
      else bonehuntPieceIn(st, f.piece, f.who);
    }
  }
  st.flyers = st.flyers.filter(f => !f.done);
}

/* ---------- Mr. Bones: hop to a chalk X, become a stool, a ladder or a bridge ---------- */
function bonehuntPlace(st, k) {
  const s = st.spots[k], mr = st.mr, g = G.level.grid;
  mr.spot = k; mr.form = s.type; mr.x = s.type === 'bridge' ? (s.x0 + s.x1) / 2 : s.x; mr.feet = s.feet;
  if (s.type === 'stool') {
    g[s.r][s.c] = '#'; st.sty[s.r][s.c] = 'm';
    // anyone in the way is scooped up on top
    for (const p of G.players) if (p.alive && rectHit(p, s.c * T, s.r * T, T, T)) { p.y = s.r * T - p.h; p.vy = Math.min(0, p.vy); }
  } else if (s.type === 'bridge') for (const c of s.cells) { g[c.r][c.c] = '#'; st.sty[c.r][c.c] = 'm'; }
  Sfx.play('bonehuntRattle');
  puff(mr.x, mr.feet - 10, 8, 'rgba(240,230,255,0.9)');
  bonehuntProgress(st);
}
function bonehuntUnplace(st) {
  const mr = st.mr, s = st.spots[mr.spot], g = G.level.grid;
  if (s && (mr.form === 'stool' || mr.form === 'bridge')) {
    const cells = s.type === 'stool' ? [{ c: s.c, r: s.r }] : s.cells;
    for (const c of cells) { g[c.r][c.c] = '.'; st.sty[c.r][c.c] = null; }
  }
  if (s && mr.form === 'ladder') for (const P of st.pl) P.climb = false;
  mr.spot = -1; mr.form = 'sit';
}
function bonehuntHopTo(st, x, feet, to, dur = BONEHUNT.hopT) {
  const mr = st.mr;
  bonehuntUnplace(st);
  mr.hop = { x0: mr.x, f0: mr.feet, x1: x, f1: feet, t: 0, dur, to };
  mr.form = 'hop';
  mr.face = x >= mr.x ? 1 : -1;
  Sfx.play('bonehuntHop');
}
function bonehuntCall(st, p, k) {
  const mr = st.mr, s = st.spots[k];
  if (mr.form === 'hop' || mr.form === 'dance' || st.leaving || st.finale) return;
  if (mr.spot === k) { bonehuntMrSay(st, 'I’m right here!', 1.6); return; }
  const on = bonehuntWhoOnMr(st);
  if (on.length) {
    // (the caller is on him, or only the partner is: then say who to wait for)
    bonehuntMrSay(st, on.includes(p.id) ? 'Hop off me first!' : NAMES[on[0]] + ' is on me! Hop off, ' + NAMES[on[0]] + '!', 2.2);
    Sfx.play('bonehuntNope');
    return;
  }
  const x = s.type === 'bridge' ? (s.x0 + s.x1) / 2 : s.x;
  bonehuntHopTo(st, x, s.feet, k);
  bonehuntMrSay(st, s.type === 'stool' ? 'One stepstool, coming up!' : s.type === 'ladder' ? 'Ladder time! Stretch...' : 'Bridge time! Lie down...', 2.2);
  bonehuntPop(st, bonehuntCx(p), p.y - 16, 'Here, Mr. Bones!', PCOL[p.id], 14);
  Sfx.play('bonehuntCall', p.id);
  st.stats.calls++;
}
function bonehuntMrStep(st, dt) {
  const mr = st.mr;
  mr.flash = Math.max(0, mr.flash - dt * 1.5);
  mr.bob += dt;
  st.mrShakeT = Math.max(0, st.mrShakeT - dt);
  if (mr.say) { mr.say.t += dt; if (mr.say.t >= mr.say.life) mr.say = null; }
  if (mr.form === 'dance') mr.dance += dt;
  if (mr.form !== 'hop') return;
  const h = mr.hop;
  h.t += dt;
  const k = clamp(h.t / h.dur, 0, 1);
  mr.x = h.x0 + (h.x1 - h.x0) * k;
  const arc = 60 + Math.min(90, Math.abs(h.x1 - h.x0) * 0.18);
  mr.feet = h.f0 + (h.f1 - h.f0) * k - Math.sin(Math.PI * k) * arc;
  if (k < 1) return;
  mr.x = h.x1; mr.feet = h.f1;
  if (typeof h.to === 'number') bonehuntPlace(st, h.to);
  else if (h.to === 'dance') { mr.form = 'dance'; mr.dance = 0; mr.spot = -1; }
  else { mr.form = 'sit'; mr.spot = -1; if (h.to === 'home') Sfx.play('land'); }
  mr.hop = null;
}

/* ---------- the ladder: hold jump to climb, down to go down ---------- */
function bonehuntClimbPre(st, p, dt) {
  const P = st.pl[p.id], s = bonehuntLadder(st), inp = p.input;
  if (!s || !p.alive || P.lock || P.hold) { if (P.climb) P.climb = false; return; }
  const on = bonehuntOnLadderCol(s, p);
  if (!P.climb) {
    // start: jump held on the ladder (from the ground or in the air), or down held standing at its top
    const atTop = p.grounded && Math.abs(bonehuntFeet(p) - s.top) < 2 && Math.abs(bonehuntCx(p) - s.x) <= 22;
    if (on && inp.jump && bonehuntFeet(p) > s.top + 2) P.climb = true;
    else if (atTop && inp.down) {
      P.downT += 0;
      P.ladDown = (P.ladDown || 0) + dt;
      if (P.ladDown >= BONEHUNT.downClimbT) { P.climb = true; P.ladDown = 0; p.x = s.x - p.w / 2; p.y += 3; Sfx.play('bonehuntRattle'); }
    } else P.ladDown = 0;
    if (!P.climb) return;
    if (!P.told.climbed) P.told.climbed = true;
  }
  if (!on && !(Math.abs(bonehuntCx(p) - s.x) <= 22 && bonehuntFeet(p) >= s.top - 4)) { P.climb = false; return; }
  // steering off the ladder (left/right without jump or down) lets go
  if ((inp.left || inp.right) && !inp.jump && !inp.down) { P.climb = false; return; }
  const want = inp.jump ? -BONEHUNT.climbUp : inp.down ? BONEHUNT.climbDown : 0;
  p.vy = want - PHYS.g * DT;
  p.vx = 0; p.carryVx = 0;
  p.x += clamp(s.x - p.w / 2 - p.x, -260 * dt, 260 * dt);
  p.pendingJump = false; p.jumpBuf = 0; p.coyote = 0; p.jumping = false;
  P.climbAnim = (P.climbAnim || 0) + (want ? dt : 0);
  // the top: step onto the ledge
  if (inp.jump && bonehuntFeet(p) <= s.top + 2) {
    p.y = s.top - p.h; p.vy = 0;
    moveX(p, s.side * 17, true);
    P.climb = false;
    Sfx.play('land');
    return;
  }
  // the bottom
  if (p.grounded && !inp.jump) P.climb = false;
}

/* ---------- the crank and the creaky gate ---------- */
function bonehuntGateStep(st, dt) {
  const gt = st.gate;
  if (!gt) return;
  const holder = G.players.find(p => !st.pl[p.id].lock && !st.pl[p.id].hold && p.input.act && bonehuntAtCrank(st, p));
  gt.held = holder ? holder.id : -1;
  const blocked = G.players.some(p => p.alive && rectHit(p, gt.x + 1, gt.y0, T - 2, gt.y1 - gt.y0));
  if (holder) {
    const was = gt.open;
    gt.open = approach(gt.open, 1, BONEHUNT.gateUp * dt); gt.grace = BONEHUNT.gateGrace;
    gt.spin += dt * 7;
    gt.creakT -= dt;
    if (gt.open < 1 && gt.creakT <= 0) { gt.creakT = 0.32; Sfx.play('bonehuntCreak'); }
    if (was < 1 && gt.open >= 1) Sfx.play('bonehuntClick');
  } else if (gt.grace > 0) gt.grace -= dt;
  else gt.open = approach(gt.open, blocked ? Math.max(Math.min(gt.open, 0.62), BONEHUNT.gatePass + 0.05) : 0, BONEHUNT.gateDown * dt);
  const pass = gt.open >= BONEHUNT.gatePass;
  if (pass !== gt.pass) {
    gt.pass = pass;
    for (const c of gt.cells) G.level.grid[c.r][c.c] = pass ? '.' : '#';
    if (!pass) { Sfx.play('bonehuntClang'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.05); }
  }
}

/* ---------- the bell (Room 4): both ropes at once ---------- */
function bonehuntBellStep(st, dt) {
  const bl = st.bell;
  if (!bl) return;
  bl.t += dt; bl.bongT = Math.max(0, bl.bongT - dt);
  const at = G.players.map(p => (!st.pl[p.id].lock && !st.pl[p.id].hold && p.input.act ? bonehuntRopeAt(st, p) : -1));
  st.ropes.forEach((r, k) => { r.pull = approach(r.pull, at.includes(k) ? 1 : 0, dt * 6); });
  if (bl.rung) { bl.swing *= Math.pow(0.5, dt); return; }
  const both = at[0] >= 0 && at[1] >= 0 && at[0] !== at[1];
  if (both) {
    const was = bl.meter;
    bl.meter += dt; bl.alone = 0;
    if (Math.floor(was / 0.45) !== Math.floor(bl.meter / 0.45)) Sfx.play('bonehuntDing');
  } else {
    bl.meter = Math.max(0, bl.meter - dt * 0.5);
    bl.alone = at[0] >= 0 || at[1] >= 0 ? bl.alone + dt : 0;
    if (bl.alone > 0.9 && bl.alone - dt <= 0.9) {
      const k = at[0] >= 0 ? 0 : 1, p = G.players[k];
      bonehuntPop(st, st.ropes[at[k]].x, p.y - 26, 'Too heavy! Pull together!', '#f3e9ff', 14);
    }
  }
  bl.swing = Math.sin(bl.t * 5) * Math.min(1, bl.meter / BONEHUNT.bellFill) * 0.28;
  if (bl.meter >= BONEHUNT.bellFill) {
    bl.rung = true; bl.swing = 0.3; bl.bongT = 1.6;
    Sfx.play('bonehuntBong');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
    rumble(0, 0.5, 0.5, 260); rumble(1, 0.5, 0.5, 260);
    bonehuntProgress(st);
    st.owlAwake = 2.5;
    const bx = (st.ropes[0].x + st.ropes[st.ropes.length - 1].x) / 2, by = st.cfg.bellY || 150;
    bonehuntPop(st, bx, by + 52, 'BONG!', C.gold, 30);
    if (st.cfg.bellPiece) st.flyers.push({ kind: 'piece', piece: st.cfg.bellPiece, x0: bx, y0: by + 20, t: 0, dur: 1.3, who: [0, 1], big: false });
    st.flyers.push({ kind: 'hat', x0: bx, y0: by - 30, t: 0, dur: 1.7 });
    bonehuntMrSay(st, 'My hand! I was the bell’s clapper!', 2.8);
  }
}

/* ---------- graves, jack-o'-lanterns, hop back ---------- */
function bonehuntPitCheck(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.lock) continue;
    const c = Math.floor(bonehuntCx(p) / T), f = bonehuntFeet(p);
    const r = Math.floor((f - 8) / T);
    if (f > r * T + 8 && st.pits.has(c + ',' + r) && tile(c, r) !== '#') bonehuntBoing(st, p, true);
  }
}
// the springy coffin bounces p out of the grave (pit) or p hops back (hold down): purple smoke, back to the lantern
function bonehuntBoing(st, p, pit) {
  const P = st.pl[p.id];
  if (P.hold) bonehuntLetGo(st, p, pit ? 'Oops!' : null);
  P.lock = pit ? 'boing' : 'back'; P.lockT = pit ? BONEHUNT.boingT : 0.25; P.climb = false;
  if (pit) {
    st.stats.boings++;
    p.vy = -720; p.vx = 0; p.jumping = false;
    Sfx.play('bonehuntBoing', p.id);
    bonehuntPop(st, bonehuntCx(p), p.y - 10, 'Boing!', '#ffb36b', 22);
    const c = Math.floor(bonehuntCx(p) / T);
    st.springT = st.springT || {};
    st.springT[c] = 1;
  } else {
    bonehuntPop(st, bonehuntCx(p), p.y - 16, 'Hop back!', PCOL[p.id], 15);
    Sfx.play('bonehuntPoof', p.id);
  }
}
function bonehuntLocks(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.digCD = Math.max(0, P.digCD - dt); P.digT += dt; P.hintCD = Math.max(0, P.hintCD - dt); P.sayCD = Math.max(0, P.sayCD - dt);
    if (P.hint) {
      P.hint.t += dt;
      if (P.hint.ok && !P.hint.ok()) { P.hint.ok = null; P.hint.t = Math.max(P.hint.t, P.hint.life - 0.2); P.hintCD = Math.min(P.hintCD, 0.6); }
      if (P.hint.t >= P.hint.life) P.hint = null;
    }
    if (!P.lock) continue;
    P.lockT -= dt;
    if (P.lock === 'boing') p.vx = 0;
    if (P.lockT > 0) continue;
    P.lock = null;
    puff(bonehuntCx(p), p.y + p.h / 2, 14, 'rgba(178,120,255,0.92)');
    G.spawnPts[p.id] = bonehuntSpawnFor(st, p.id);
    respawn(p);
    puff(bonehuntCx(p), p.y + p.h / 2, 10, 'rgba(178,120,255,0.92)');
    Sfx.play('bonehuntPoof', p.id);
  }
}
function bonehuntLanterns(st, dt) {
  st.lanterns.forEach((ln, i) => {
    ln.t += dt;
    for (const p of G.players) {
      if (!p.alive || Math.abs(bonehuntCx(p) - ln.x) >= 40 || Math.abs(bonehuntFeet(p) - ln.feet) >= 50) continue;
      st.pl[p.id].check = i;
      if (ln.lit) continue;
      ln.lit = true; ln.t = 0; st.check = i;
      Sfx.play('bonehuntLantern');
      burst(ln.x, ln.feet - 40, '#ffb347', 10);
    }
  });
}
function bonehuntBack(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!P.lock && !P.climb && p.alive && p.grounded && p.input.down && !p.downLatch && !p.onOneWay) {
      P.downT += dt;
      if (P.downT >= BONEHUNT.backHold) { P.downT = 0; bonehuntBoing(st, p, false); }
    } else P.downT = 0;
    // trapped in the crypt with the gate down: tell them how to hop out (after a while)
    if (st.gate && bonehuntInCrypt(st, p) && !st.gate.pass && st.gate.held < 0) {
      P.trapT += dt;
      if (P.trapT > 7) { P.trapT = -20; bonehuntSay(st, p, 'Stuck? Hold ' + bonehuntKey(p.id, 'down') + ' to hop back out', true); }
    } else if (P.trapT > 0) P.trapT = 0;
  }
}

/* ---------- the exit, the finale ---------- */
function bonehuntExitStep(st, dt) {
  const d = st.exit;
  if (!d) return false;
  if (st.leaving) {
    st.leaving.t += dt;
    if (st.leaving.t >= BONEHUNT.leaveT) { st.stats.roomT.push(G.time - st.roomStart); nextRoom(); return true; }
    return false;
  }
  st.inExit = G.players.map(p => {
    if (!p.alive || st.pl[p.id].lock) return false;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h;
  });
  if (!(st.inExit[0] && st.inExit[1])) { st.exitT = 0; return false; }
  if (!st.roomDone) {
    if (st.tellT <= 0) { st.tellT = 4; bonehuntNews(st, 'Not yet! Mr. Bones still needs ' + bonehuntLeft(st) + (bonehuntLeft(st) === 1 ? ' bone' : ' bones') + ' from this room'); }
    return false;
  }
  st.exitT += dt;
  if (st.exitT < BONEHUNT.exitHold || bonehuntOnMr(st) || st.mr.form === 'hop') return false;
  st.leaving = { t: 0 };
  bonehuntHopTo(st, d.x + d.w / 2, d.y + d.h, 'exit', 0.8);
  bonehuntMrSay(st, 'Wait for me!', 1.6);
  Sfx.play('bonehuntGate');
  return false;
}
function bonehuntFinaleStep(st, dt) {
  if (!st.finale) {
    if (st.cfg.unlock === 'done' && bonehuntDone(st) && st.hatOn && !st.flyers.length) {
      st.finale = { t: 0, hopped: false };
      bonehuntNews(st, 'Mr. Bones is all back together!', false, 4.5);
    }
    return false;
  }
  const fn = st.finale, mr = st.mr;
  if (!fn.hopped) {
    if (bonehuntOnMr(st) || mr.form === 'hop') return false;
    fn.hopped = true;
    const fz = st.cfg.finale || { x: mr.x, feet: mr.feet };
    bonehuntHopTo(st, fz.x, fz.feet, 'dance', 0.9);
    return false;
  }
  if (mr.form !== 'dance') return false;
  if (fn.t === 0) { Sfx.play('bonehuntDance'); bonehuntMrSay(st, 'Ta-da! Thank you, Pip and Bo!', 3.2); }
  const was = fn.t;
  fn.t += dt;
  if (Math.floor(was / 0.5) !== Math.floor(fn.t / 0.5)) for (let k = 0; k < 10; k++) confetti(mr.x, mr.feet - 60);
  if (Math.floor(was / 1.6) !== Math.floor(fn.t / 1.6) && fn.t < 4) Sfx.play('bonehuntDance');
  if (fn.t >= BONEHUNT.danceT) { st.stats.roomT.push(G.time - st.roomStart); levelClear(); return true; }
  return false;
}

/* ---------- help: hints, the gold arrow and shovel, the glowing chalk X ---------- */
// the next job, for the gold arrow: { x, y, mound } (null when nothing to point at)
function bonehuntNextJob(st) {
  if (!st.roomDone) {
    const loose = st.bones.find(b => b.state === 'ground');
    if (loose) return { x: loose.x, y: loose.feet - 30 };
    const m = st.mounds.find(m2 => !m2.done && !st.pieces[m2.piece]);
    if (m) return { x: m.x, y: m.feet - 34, mound: m };
    if (st.bell && !st.bell.rung) return { x: st.ropes[0].x, y: st.ropes[0].feet - 70 };
    return null;
  }
  const via = st.cfg.exitVia, sp = st.spots.find(s => s.type === via);
  if (sp && st.mr.spot !== st.spots.indexOf(sp)) return { x: sp.x, y: sp.feet - 30, spot: sp };
  if (st.exit) return { x: st.exit.x + st.exit.w / 2, y: st.exit.y - 14 };
  return null;
}
function bonehuntHelp(st, dt) {
  if (G.introT > 0 || st.leaving || st.finale) return;
  st.stuckT += dt;
  st.tellT = Math.max(0, st.tellT - dt);
  if (st.stuckT >= BONEHUNT.goldAfter && !st.goldArrow) {
    const j = bonehuntNextJob(st);
    if (j) {
      st.goldArrow = j;
      if (j.mound) { j.mound.gold = true; bonehuntNews(st, 'Gold shovel! The glowing mound digs up in one go', true, 3.8); }
      else bonehuntNews(st, 'Follow the gold arrow!', true, 3);
    }
  }
  // a new shape and nobody calls him: his chalk X glows gold
  if (st.roomDone) {
    st.unlockT += dt;
    const via = st.cfg.exitVia, sp = st.spots.find(s => s.type === via);
    if (sp && st.unlockT > BONEHUNT.chalkGold && st.mr.spot !== st.spots.indexOf(sp) && !sp.gold) {
      sp.gold = true;
      bonehuntNews(st, 'Stand on the glowing X and press dig to call Mr. Bones!', true, 4);
    }
  }
}
function bonehuntHints(st, dt) {
  if (G.introT > 0 || st.leaving || st.finale) return;
  for (const p of G.players) {
    const P = st.pl[p.id], o = other(p), O = st.pl[o.id];
    if (!p.alive || P.lock || bonehuntSolo(p.id)) continue;
    const busy = p.input.left || p.input.right || p.input.jump || p.input.act;
    P.idleT = busy ? 0 : P.idleT + dt;
    const lad = bonehuntLadder(st);
    if (P.climb) { bonehuntTell(st, p, 'climb', 'Hold ' + bonehuntKey(p.id, 'jump') + ' to climb, ' + bonehuntKey(p.id, 'down') + ' to go down'); continue; }
    if (P.hold) {
      const b = P.hold, lying = () => P.hold === b && b.state === 'ground';
      if (b.state === 'ground' && P.idleT > 1.4) bonehuntSay(st, p, bonehuntSolo(o.id) ? NAMES[o.id] + ' is coming for the other end!' : NAMES[o.id] + ', grab the other end!', false, lying);
      if (b.state === 'carried' && !b.toldWalk) { b.toldWalk = true; bonehuntSay(st, p, 'Walk together! Jumps are shared', true); }
      continue;
    }
    const m = bonehuntMoundAt(st, p);
    if (m && P.idleT > 1.2) {
      const onIt = () => !m.done && bonehuntMoundAt(st, p) === m;
      if (m.together && !m.gold) bonehuntSay(st, p, (actKey(p.id) === 'touch' ? 'Tap dig' : 'Press ' + bonehuntKey(p.id, 'act')) + ' at the same time as ' + NAMES[o.id] + '!', false, onIt);
      else bonehuntSay(st, p, bonehuntPress(p.id, 'dig!'), false, onIt);
      continue;
    }
    const e = bonehuntEndAt(st, p);
    if (e && P.idleT > 0.8) { bonehuntSay(st, p, bonehuntPress(p.id, 'grab an end'), false, () => !P.hold && e.b.state === 'ground' && !!bonehuntEndAt(st, p)); continue; }
    if (st.gate && Math.abs(bonehuntCx(p) - st.gate.crank.x) < 50 && !st.gate.pass && Math.abs(bonehuntFeet(p) - st.gate.crank.feet) < 4) {
      bonehuntSay(st, p, bonehuntPress(p.id, 'crank the gate open', true), false, () => Math.abs(bonehuntCx(p) - st.gate.crank.x) < 60 && st.gate.held !== p.id);
      continue;
    }
    if (st.gate && st.gate.held === o.id && !bonehuntInCrypt(st, p) && Math.abs(bonehuntCx(p) - st.gate.x) < 110) { bonehuntTell(st, p, 'gatein', 'Quick, in you go! Dig it up!'); continue; }
    const k = bonehuntSpotAt(st, p);
    if (k >= 0 && st.mr.spot !== k && P.idleT > 0.6) { bonehuntSay(st, p, bonehuntPress(p.id, 'call Mr. Bones'), false, () => st.mr.spot !== k && st.mr.form !== 'hop' && bonehuntSpotAt(st, p) === k); continue; }
    if (lad && Math.abs(bonehuntCx(p) - lad.x) < 30 && Math.abs(bonehuntFeet(p) - lad.feet) < 4 && P.idleT > 0.5) { bonehuntSay(st, p, 'Hold ' + bonehuntKey(p.id, 'jump') + ' to climb Mr. Bones!', false, () => !P.climb && bonehuntLadder(st) === lad && bonehuntFeet(p) > lad.top + 30); continue; }
    const rp = bonehuntRopeAt(st, p);
    if (rp >= 0 && st.bell && !st.bell.rung && !p.input.act) { bonehuntSay(st, p, bonehuntPress(p.id, 'pull the rope', true), false, () => !st.bell.rung && bonehuntRopeAt(st, p) === rp); continue; }
    // mounds that need a boost or a stack: said near the foot of the wall
    for (const mm of st.mounds) {
      if (mm.done || !mm.cfg.foot || st.pieces[mm.piece]) continue;
      const f = mm.cfg.foot;
      if (Math.abs(bonehuntCx(p) - f.x) > 70 || Math.abs(bonehuntFeet(p) - f.feet) > 40 || bonehuntFeet(p) <= mm.feet + 2) continue;
      const unDug = () => !mm.done && bonehuntFeet(p) > mm.feet + 2;
      const onMe = () => o.alive && o.onPartner && Math.abs(bonehuntFeet(o) - p.y) < 3;   // (the partner is on my head)
      const was = p.onPartner, same = () => unDug() && p.onPartner === was && !onMe();
      if (onMe()) { bonehuntSay(st, p, 'Hold still! ' + NAMES[o.id] + ' jumps from your head', false, () => unDug() && onMe()); break; }
      if (mm.how === 'boost') bonehuntSay(st, p, p.onPartner ? bonehuntPressKey(p.id, 'jump', 'jump up!') : 'Too high! Hop on ' + NAMES[o.id] + '’s head', false, same);
      else if (mm.how === 'tower') {
        const s = st.spots.find(s2 => s2.type === 'stool');
        if (st.mr.form !== 'stool') bonehuntSay(st, p, 'Too high! Call Mr. Bones the stepstool here', false, () => unDug() && st.mr.form !== 'stool');
        else bonehuntSay(st, p, p.onPartner ? bonehuntPressKey(p.id, 'jump', 'jump up!') : (s && O && !o.onPartner && Math.abs(bonehuntFeet(o) - s.r * T) < 3 ? 'Hop on ' + NAMES[o.id] + '’s head!' : 'Stack up: one on Mr. Bones, one on top!'), false, same);
      } else if (mm.how === 'ladder' && st.mr.form !== 'ladder') bonehuntSay(st, p, 'Way up there! Call Mr. Bones the ladder', false, () => unDug() && st.mr.form !== 'ladder');
      break;
    }
  }
}

/* ---------- the mode ---------- */
MODES.bonehunt = {
  rand: Math.random,   // cosmetic randomness (dirt, fireflies); tests may swap in a seeded one
  setup(st, L) {
    st.stats = { dug: [0, 0], digs: [0, 0], boings: 0, clatters: 0, back: 0, calls: 0, roomT: [] };
    st.pieces = {}; st.forms = {}; st.hatOn = false; st.mr = {}; st.owlAwake = 0;
    // a level started at a later room (tests) gets the shapes and bones of the rooms before it
    bonehuntRoom(st, L);
  },
  room(k, L) {
    const st = G.mst;
    if (!st.stats) return;
    // (a room reached any other way than by clearing the last one still gets its shapes)
    const rooms = LEVELS[G.levelIndex].rooms || [];
    for (let i = 0; i < k; i++) { const r = rooms[i]; if (r.unlock && BONEHUNT_FORMS[r.unlock]) st.forms[r.unlock] = true; (r.mounds || []).forEach(m => { st.pieces[m.piece] = true; }); if (r.bellPiece) st.pieces[r.bellPiece] = true; }
    bonehuntRoom(st, L);
  },
  pre(dt) {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) {
      const P = st.pl[p.id], o = other(p);
      P.saved = null;
      if (P.lock) {
        // locked (boing, hop back): nothing you press counts
        P.saved = { ...p.input };
        for (const k in p.input) p.input[k] = false;
        p.pendingJump = false; p.jumpBuf = 0; p.pendingAct = false; P.waitJump = false;
        continue;
      }
      // no jumping off a head while the partner under you is in the air: the press waits until they land
      const onHead = p.onPartner && !p.tileGround;
      if (onHead && !o.grounded) {
        if (p.pendingJump || p.jumpBuf > 0) { P.waitJump = true; p.pendingJump = false; p.jumpBuf = 0; }
      } else if (P.waitJump) { if (p.input.jump) p.pendingJump = true; P.waitJump = false; }
      if (P.waitJump && !p.input.jump) P.waitJump = false;
      bonehuntClimbPre(st, p, dt);
    }
    // two carrying a big bone: a bit slower, and a jump by either is a jump for both
    for (const b of st.bones) {
      if (b.kind !== 'big' || b.state !== 'carried') continue;
      const [a, c] = G.players;
      for (const p of G.players) p.vx = clamp(p.vx, -BONEHUNT.carryMax + 20, BONEHUNT.carryMax - 20);
      if (!a.alive || !c.alive) continue;
      const jumpNow = (a.pendingJump || c.pendingJump) && a.grounded && c.grounded;
      if (jumpNow) { a.pendingJump = true; c.pendingJump = true; }
      const held = a.input.jump || c.input.jump;
      for (const p of G.players) {
        const P = st.pl[p.id];
        if (p.input.jump !== held) { if (!P.saved) P.saved = { ...p.input }; p.input.jump = held; }
      }
    }
  },
  step(dt) {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) { const P = st.pl[p.id]; if (P.saved) { Object.assign(p.input, P.saved); P.saved = null; } }
    for (const p of G.players) if (p.pendingAct) { p.pendingAct = false; bonehuntAct(st, p); }
    for (const m of st.mounds) { m.shake = Math.max(0, m.shake - dt * 5); m.sparkle = Math.max(0, m.sparkle - dt); }
    bonehuntCarryStep(st, dt);
    bonehuntSmallStep(st, dt);
    bonehuntGateStep(st, dt);
    bonehuntBellStep(st, dt);
    bonehuntMrStep(st, dt);
    bonehuntFlyStep(st, dt);
    bonehuntPitCheck(st);
    bonehuntLocks(st, dt);
    bonehuntLanterns(st, dt);
    bonehuntBack(st, dt);
    bonehuntHelp(st, dt);
    bonehuntHints(st, dt);
    bonehuntFx(st, dt);
    if (bonehuntFinaleStep(st, dt)) return;
    bonehuntExitStep(st, dt);
  },
  onRespawn(p) {
    const st = G.mst;
    if (!st.pl) return;
    const P = st.pl[p.id];
    if (P.hold) bonehuntLetGo(st, p, null);
    Object.assign(P, { lock: null, lockT: 0, climb: false, waitJump: false, downT: 0 });
  },
  draw() { bonehuntDraw(G.mst); },
  drawTop() { bonehuntDrawTop(G.mst); },
  hud() { bonehuntHud(G.mst); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const oops = s.boings + s.clatters, time = G.time;
    const medal = time <= 300 && oops <= 3 ? 'Gold' : time <= 480 && oops <= 9 ? 'Silver' : 'Bronze';
    const words = oops === 0 ? 'Not one boing or clatter. Smooth digging!' : s.clatters === 0 ? 'No bones dropped. Steady hands!'
      : s.boings === 0 ? 'No boings at all. Nice and careful!' : 'A few boings and clatters, and lots of teamwork!';
    return [
      { label: 'Bones dug', values: s.dug.slice() },
      { label: 'Boings', value: s.boings },
      { label: 'Clatters', value: s.clatters },
      { label: 'Medal', value: medal },
      'Mr. Bones is back together and dancing in his new top hat. ' + words,
    ];
  },
};
// one press of the action button: let go, call Mr. Bones, dig, grab an end (the crank and the ropes are held)
function bonehuntAct(st, p) {
  const P = st.pl[p.id];
  if (P.lock || P.climb || !p.alive || st.leaving) return;
  if (P.hold) { bonehuntLetGo(st, p, null); return; }
  const k = bonehuntSpotAt(st, p);
  if (k >= 0) { bonehuntCall(st, p, k); return; }
  const m = bonehuntMoundAt(st, p);
  if (m) { bonehuntDig(st, p, m); return; }
  const e = bonehuntEndAt(st, p);
  if (e) { bonehuntGrab(st, p, e); return; }
  if (bonehuntAtCrank(st, p) || bonehuntRopeAt(st, p) >= 0) return;
  // nothing here: a little shovel wiggle
  if (P.digCD <= 0) { P.digT = 0; P.digCD = BONEHUNT.digCD; Sfx.play('bonehuntSwish', p.id); }
}
function bonehuntFx(st, dt) {
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < q.life);
  if (st.news) { st.news.t += dt; if (st.news.t >= st.news.life) { st.news = st.newsNext || null; st.newsNext = null; } }
  for (const d of st.dirt) { d.life -= dt; d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
  st.dirt = st.dirt.filter(d => d.life > 0);
  if (st.dirt.length > 160) st.dirt.splice(0, st.dirt.length - 160);
  if (st.springT) for (const c in st.springT) st.springT[c] = Math.max(0, st.springT[c] - dt * 2.2);
  st.owlAwake = Math.max(0, (st.owlAwake || 0) - dt);
  // the top-right pills fade while someone is up at the bell (it hangs right under them) and while it rings
  const bl = st.bell, upTop = bl && G.players.some(p => p.alive && bonehuntFeet(p) <= st.ropes[0].feet + 4 && bonehuntCx(p) > st.ropes[0].x - 60);
  st.pillA = approach(st.pillA == null ? 1 : st.pillA, upTop || (bl && (bl.bongT > 0 || st.finale)) ? 0.22 : 1, dt * 3);
}

/* ---------- drawing ---------- */
const BONEHUNT_INK = '#2a1f45', BONEHUNT_BONE = '#f6f0de', BONEHUNT_BONE_EDGE = '#7d6f96';
let bonehuntSkyG = null;
// a cartoon bone from (x1, y1) to (x2, y2), w thick, with knobby ends
function bonehuntBoneShape(x1, y1, x2, y2, w, fill = BONEHUNT_BONE, edge = BONEHUNT_BONE_EDGE) {
  const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), r = w * 0.48;
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
  ctx.beginPath();
  ctx.rect(0, -w * 0.3, len, w * 0.6);
  for (const ex of [0, len]) for (const ey of [-r * 0.75, r * 0.75]) { ctx.moveTo(ex + r, ey); ctx.arc(ex, ey, r, 0, Math.PI * 2); }
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(2, w * 0.3); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}
// Mr. Bones' head: a round grinning skull with big friendly eyes
function bonehuntSkull(x, y, r, look = 0, blink = false, happy = 0) {
  ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.92, Math.PI * 2.08);
  ctx.lineTo(x + r * 0.62, y + r * 0.95); ctx.quadraticCurveTo(x, y + r * 1.15, x - r * 0.62, y + r * 0.95); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // eye sockets with shiny pupils
  for (const ex of [-0.4, 0.4]) {
    const cx = x + ex * r + look * r * 0.12, cy = y - r * 0.05;
    ctx.fillStyle = BONEHUNT_INK;
    if (blink) { ctx.fillRect(cx - r * 0.26, cy - 1, r * 0.52, 2.4); continue; }
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.27, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(cx + r * 0.08 + look * r * 0.06, cy - r * 0.1, r * 0.11); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,140,170,0.45)'; circle(x - r * 0.62, y + r * 0.35, r * 0.17); ctx.fill(); circle(x + r * 0.62, y + r * 0.35, r * 0.17); ctx.fill();
  ctx.fillStyle = BONEHUNT_INK;
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.22); ctx.lineTo(x - r * 0.1, y + r * 0.4); ctx.lineTo(x + r * 0.1, y + r * 0.4); ctx.closePath(); ctx.fill();
  // the toothy grin
  ctx.strokeStyle = BONEHUNT_INK; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y + r * 0.42, r * (0.42 + happy * 0.08), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.lineWidth = 1;
  for (const tx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(x + tx * r, y + r * 0.7); ctx.lineTo(x + tx * r, y + r * (0.83 + happy * 0.04)); ctx.stroke(); }
}
function bonehuntHat(x, y, s, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  ctx.fillStyle = '#1d1630'; ctx.strokeStyle = '#4b3d6e'; ctx.lineWidth = 1.5;
  rr(-14, -2, 28, 5, 2.5); ctx.fill(); ctx.stroke();
  rr(-9, -20, 18, 19, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8a3d'; ctx.fillRect(-9, -7, 18, 4);
  ctx.restore();
}
// the skeleton, standing (pose 'sit'), in the air ('hop') or dancing ('dance'), with only the bones he has back
function bonehuntDrawMrBody(st, x, feet, pose, t) {
  const P = st.pieces, legs = (P.leg1 ? 1 : 0) + (P.leg2 ? 1 : 0), shake = st.mrShakeT > 0 && !reduceMotion ? Math.sin(t * 60) * 1.5 : 0;
  const dance = pose === 'dance', hop = pose === 'hop';
  const bob = dance ? Math.abs(Math.sin(t * 7)) * 8 : hop ? 0 : Math.sin(t * 2.4) * 1.2;
  x += shake;
  const face = st.mr.face || 1;
  let hipY;
  ctx.lineCap = 'round';
  if (legs === 0) {
    // a little red wagon carries him about
    ctx.fillStyle = '#d6453b'; ctx.strokeStyle = '#7d2230'; ctx.lineWidth = 2;
    rr(x - 18, feet - 17, 36, 11, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 15, feet - 14, 30, 2);
    ctx.fillStyle = '#3a2f4f'; for (const wx of [-10, 10]) { circle(x + wx, feet - 4, 4.5); ctx.fill(); }
    ctx.fillStyle = '#c9c2d8'; for (const wx of [-10, 10]) { circle(x + wx, feet - 4, 1.6); ctx.fill(); }
    ctx.strokeStyle = '#7d2230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18 * face, feet - 12); ctx.lineTo(x + 28 * face, feet - 20); ctx.stroke();
    hipY = feet - 16;
  } else {
    hipY = feet - 22 - bob;
    const kick = dance ? Math.sin(t * 7) * 0.6 : hop ? 0.5 : 0;
    const legL = (dx, k) => { const kx = x + dx + Math.sin(k) * 10, ky = feet - 10 - bob * 0.5 + (hop ? -6 : 0); bonehuntBoneShape(x + dx * 0.5, hipY + 2, kx, ky, 5); bonehuntBoneShape(kx, ky, x + dx + Math.sin(k) * 4, feet - 2 - (hop ? 8 : 0) - (dance && k > 0.3 ? 6 : 0), 5);
      ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + dx + Math.sin(k) * 4 + 3 * Math.sign(dx || 1), feet - 2 - (hop ? 8 : 0) - (dance && k > 0.3 ? 6 : 0), 5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    if (P.leg1) legL(legs === 1 ? 0 : -6, kick);
    if (P.leg2) legL(6, -kick);
  }
  // pelvis, spine, ribs
  const neckY = hipY - 22;
  if (P.hips) { ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, hipY, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = BONEHUNT_BONE_EDGE; circle(x - 4, hipY, 1.5); ctx.fill(); circle(x + 4, hipY, 1.5); ctx.fill(); }
  if (P.spine) {
    ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { const vy = hipY - 3 - k * 4.4; rr(x - 3.5, vy - 2.2, 7, 4, 1.6); ctx.fill(); ctx.stroke(); }
  }
  if (P.ribs) {
    ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 4.6;
    for (let k = 0; k < 3; k++) { const ry = neckY + 5 + k * 5; ctx.beginPath(); ctx.ellipse(x, ry, 10 - k, 3.6, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    ctx.strokeStyle = BONEHUNT_BONE; ctx.lineWidth = 2.6;
    for (let k = 0; k < 3; k++) { const ry = neckY + 5 + k * 5; ctx.beginPath(); ctx.ellipse(x, ry, 10 - k, 3.6, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
  }
  // arms: waving when dancing
  const arm = (dir, has, hand) => {
    if (!has) return;
    const sh = { x: x + dir * 9, y: neckY + 4 };
    const wave = dance ? Math.sin(t * 8 + (dir > 0 ? 0 : 1.6)) * 0.9 : Math.sin(t * 1.8 + dir) * 0.15;
    const ang = (dir > 0 ? -0.5 : Math.PI + 0.5) + (dance ? -dir * 0.9 : dir * 1.6) + wave;
    const ex = sh.x + Math.cos(ang) * 13, ey = sh.y + Math.sin(ang) * 13;
    bonehuntBoneShape(sh.x, sh.y, ex, ey, 4.4);
    if (hand) { ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 1.4; circle(ex + Math.cos(ang) * 3, ey + Math.sin(ang) * 3, 3.6); ctx.fill(); ctx.stroke(); }
  };
  arm(1, P.funny, P.hand); arm(-1, P.arm, P.hand);
  // the head (on the spine, or sitting right in the wagon)
  const hy = (P.spine || legs ? neckY - 9 : feet - 27) - (dance ? Math.sin(t * 14) * 1.5 : 0);
  const near = G.players.reduce((a, p) => (Math.abs(bonehuntCx(p) - x) < Math.abs(a - x) ? bonehuntCx(p) : a), x + face * 100);
  const look = clamp((near - x) / 80, -1, 1);
  const blink = (t % 4.2) > 4.05 && pose !== 'dance';
  bonehuntSkull(x, hy, 12, look, blink, dance || st.mr.flash > 0 ? 1 : 0);
  if (st.hatOn) bonehuntHat(x + 1, hy - 10 - (dance ? Math.abs(Math.sin(t * 7)) * 5 : 0), 0.9, dance ? Math.sin(t * 7) * 0.2 : -0.12);
  ctx.lineCap = 'butt';
  if (st.mr.flash > 0) { ctx.save(); ctx.globalAlpha = st.mr.flash * 0.6; ctx.fillStyle = '#fff6c8'; circle(x, hipY - 12, 26 + (1 - st.mr.flash) * 20); ctx.fill(); ctx.restore(); }
}
// Mr. Bones as a stepstool (one cell), a ladder (up the wall) or a bridge (over the grave)
function bonehuntDrawForm(st, s, t) {
  const mr = st.mr, P = st.pieces;
  ctx.lineCap = 'round';
  if (mr.form === 'stool') {
    const x0 = s.c * T, y0 = s.r * T;
    bonehuntBoneShape(x0 + 5, y0 + 9, x0 + 2, y0 + T - 2, 5);
    bonehuntBoneShape(x0 + T - 5, y0 + 9, x0 + T - 2, y0 + T - 2, 5);
    bonehuntSkull(x0 + T / 2, y0 + 17, 9, 0, (t % 3.7) > 3.55, 1);
    bonehuntBoneShape(x0 + 2, y0 + 4, x0 + T - 2, y0 + 4, 8);
    if (st.hatOn) bonehuntHat(x0 + T + 4, y0 + 10, 0.55, 0.6);
  } else if (mr.form === 'ladder') {
    const x = s.x, top = s.top - 4, bot = s.feet - 2, wob = reduceMotion ? 0 : Math.sin(t * 2) * 0.8;
    bonehuntBoneShape(x - 10 + wob, bot, x - 10, top + 10, 5.5);
    bonehuntBoneShape(x + 10 + wob, bot, x + 10, top + 10, 5.5);
    for (let y = bot - 16; y > top + 14; y -= 22) bonehuntBoneShape(x - 10, y, x + 10, y, 4.2);
    // feet at the bottom, his head at the top, peeking at the climbers
    ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 1.5;
    for (const fx of [-13, 13]) { ctx.beginPath(); ctx.ellipse(x + fx, bot, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    const climber = G.players.find(p => st.pl[p.id].climb);
    bonehuntSkull(x - s.side * 3, top + 2, 11, climber ? clamp((bonehuntCx(climber) - x) / 30, -1, 1) : -s.side, (t % 4) > 3.85, 1);
    if (P.funny) bonehuntBoneShape(x + s.side * 8, top + 14, x + s.side * 20, top + 4, 4);
    if (st.hatOn) bonehuntHat(x - s.side * 3, top - 8, 0.8, -0.1);
  } else if (mr.form === 'bridge') {
    const y = s.y0 + 6, x0 = s.x0, x1 = s.x1, near = s.side > 0 ? x0 : x1, far = s.side > 0 ? x1 : x0, d = s.side;
    // ribs hang under him, then his long backbone is the bridge, head on the near bank and toes on the far one
    if (P.ribs) {
      ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 5;
      const mx = (x0 + x1) / 2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(mx + k * 14, y + 4, 6, 12, 0, 0, Math.PI); ctx.stroke(); }
      ctx.strokeStyle = BONEHUNT_BONE; ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(mx + k * 14, y + 4, 6, 12, 0, 0, Math.PI); ctx.stroke(); }
    }
    if (P.funny) bonehuntBoneShape(near + d * 34, y + 2, near + d * 44, y + 18, 4);
    bonehuntBoneShape(near + d * 8, y, far - d * 8, y, 10);
    ctx.fillStyle = BONEHUNT_BONE_EDGE;
    for (let xx = Math.min(near, far) + 26; xx < Math.max(near, far) - 20; xx += 12) { ctx.fillRect(xx, y - 1.5, 2, 3); }
    ctx.fillStyle = BONEHUNT_BONE; ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 1.5;
    for (const k of [-4, 4]) { ctx.beginPath(); ctx.ellipse(far + d * 2, y + k - 6, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    bonehuntSkull(near - d * 6, y - 8, 11, d * 0.6, (t % 4) > 3.85, 1);
    if (st.hatOn) bonehuntHat(near - d * 22, y - 2, 0.7, -d * 0.5);
  }
  ctx.lineCap = 'butt';
}
function bonehuntDrawMr(st, t) {
  const mr = st.mr;
  if (mr.form === 'stool' || mr.form === 'ladder' || mr.form === 'bridge') { bonehuntDrawForm(st, st.spots[mr.spot], t); return; }
  if (mr.form === 'hop') {
    const h = mr.hop, k = h ? clamp(h.t / h.dur, 0, 1) : 0;
    ctx.save(); ctx.translate(mr.x, mr.feet); ctx.rotate(reduceMotion ? 0 : Math.sin(k * Math.PI) * 0.25 * (mr.face || 1)); ctx.translate(-mr.x, -mr.feet);
    bonehuntDrawMrBody(st, mr.x, mr.feet, 'hop', t);
    ctx.restore();
    return;
  }
  // a soft shadow and the bones he has
  ctx.fillStyle = 'rgba(20,10,40,0.3)'; ctx.beginPath(); ctx.ellipse(mr.x, mr.feet, 18, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  bonehuntDrawMrBody(st, mr.x, mr.feet, mr.form === 'dance' ? 'dance' : 'sit', mr.form === 'dance' ? mr.dance : t);
}

/* ---------- the graveyard: sky, moon, hills, decor ---------- */
function bonehuntDrawBack(st, t) {
  if (!bonehuntSkyG) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#231a4a'); g.addColorStop(0.45, '#4a2f72'); g.addColorStop(0.78, '#a2557a'); g.addColorStop(1, '#f0915a');
    bonehuntSkyG = g;
  }
  ctx.fillStyle = bonehuntSkyG; ctx.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 46; i++) {
    const h = hash(i, 31), x = h % W, y = (h >> 10) % 260, tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + (h % 7) * 0.2) + i));
    ctx.fillStyle = 'rgba(255,245,220,' + (0.35 + 0.5 * tw).toFixed(3) + ')';
    ctx.fillRect(x, y, (h >> 20) % 3 === 0 ? 2.4 : 1.6, (h >> 20) % 3 === 0 ? 2.4 : 1.6);
  }
  // the big friendly harvest moon
  const mx = st.bell ? 560 : 810, my = 96;   // (Room 4: off to the side, so the gold bell isn't on the gold moon)
  ctx.fillStyle = 'rgba(255,170,90,0.12)'; circle(mx, my, 92); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,90,0.18)'; circle(mx, my, 70); ctx.fill();
  ctx.fillStyle = '#ffb867'; circle(mx, my, 50); ctx.fill();
  ctx.fillStyle = '#f7a352'; circle(mx - 16, my - 12, 9); ctx.fill(); circle(mx + 18, my + 14, 7); ctx.fill(); circle(mx + 10, my - 22, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(150,80,40,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(mx - 13, my + 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(mx + 13, my + 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, my + 14, 7, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.lineCap = 'butt';
  // wispy clouds over the moon
  ctx.fillStyle = 'rgba(200,170,230,0.22)';
  for (let i = 0; i < 3; i++) {
    const x = ((i * 337 + t * (4 + i * 2)) % (W + 300)) - 150, y = 70 + i * 48;
    ctx.beginPath(); ctx.ellipse(x, y, 70, 10, 0, 0, Math.PI * 2); ctx.ellipse(x + 40, y - 8, 36, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  // friendly bats doing slow loops
  for (let i = 0; i < 3; i++) {
    const sp = reduceMotion ? 0.02 : 0.05, ph = (t * sp + i * 0.37) % 1;
    const x = -40 + ph * (W + 80), y = 70 + i * 55 + Math.sin(ph * 14 + i) * 18;
    bonehuntBat(x, y, 0.8 + (i % 2) * 0.25, t * 10 + i);
  }
  // far hills with a little chapel, then the near hill
  ctx.fillStyle = '#3d2a62';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 352 + Math.sin(x * 0.006 + 1.1) * 26 + Math.sin(x * 0.017) * 9);
  ctx.lineTo(W, H); ctx.fill();
  if (G.room !== 3) {
    const cx = 610, cy = 330;
    ctx.fillRect(cx - 26, cy - 34, 52, 40); ctx.beginPath(); ctx.moveTo(cx - 32, cy - 34); ctx.lineTo(cx, cy - 58); ctx.lineTo(cx + 32, cy - 34); ctx.fill();
    ctx.fillRect(cx + 14, cy - 82, 14, 50); ctx.beginPath(); ctx.moveTo(cx + 10, cy - 82); ctx.lineTo(cx + 21, cy - 100); ctx.lineTo(cx + 32, cy - 82); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,0.75)'; ctx.fillRect(cx - 8, cy - 22, 7, 10); ctx.fillRect(cx + 4, cy - 22, 7, 10); ctx.fillRect(cx + 18, cy - 70, 6, 8);
  }
  ctx.fillStyle = '#2f2150';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 404 + Math.sin(x * 0.011 + 3.4) * 16 + Math.sin(x * 0.031 + 1) * 5);
  ctx.lineTo(W, H); ctx.fill();
  // the room's decor, back to front
  for (const d of st.cfg.decor || []) {
    if (d.k === 'fence') bonehuntFence(d.x0, d.x1, t);
    else if (d.k === 'tree') bonehuntTree(d.x, d.s || 1);
  }
  for (const d of st.cfg.decor || []) {
    if (d.k === 'grave') bonehuntGrave(d.x, d.text, d.tilt || 0);
    else if (d.k === 'pumpkins') bonehuntPatch(d.x, t);
    else if (d.k === 'sign') bonehuntSign(d.x, d.y, d.text);
  }
  for (const d of st.cfg.decor || []) {
    if (d.k === 'ghost') bonehuntGhost(d.x + Math.sin(t * 0.7 + d.x) * 14, d.y + Math.sin(t * 1.6 + d.x) * 6, t);
    else if (d.k === 'owl') bonehuntOwl(st, d.x, d.y, t);
  }
}
function bonehuntBat(x, y, s, ph) {
  const f = reduceMotion ? 0.4 : Math.sin(ph);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#1b1233';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 4, 0); ctx.quadraticCurveTo(d * 12, -8 - f * 6, d * 20, -2 - f * 8); ctx.quadraticCurveTo(d * 15, 0, d * 13, 3); ctx.quadraticCurveTo(d * 9, 1, d * 4, 4); ctx.fill(); }
  circle(0, 1, 5.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-3, -8); ctx.lineTo(-1, -4); ctx.moveTo(4, -3); ctx.lineTo(3, -8); ctx.lineTo(1, -4); ctx.fill();
  ctx.fillStyle = '#ffd77a'; circle(-2, 0, 1.2); ctx.fill(); circle(2, 0, 1.2); ctx.fill();
  ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 2, 1.6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.restore();
}
function bonehuntFence(x0, x1, t) {
  const y = 452;
  ctx.strokeStyle = '#25193d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y - 22); ctx.lineTo(x1, y - 24); ctx.moveTo(x0, y - 8); ctx.lineTo(x1, y - 9); ctx.stroke();
  ctx.fillStyle = '#25193d';
  for (let x = x0, k = 0; x <= x1; x += 22, k++) {
    const lean = Math.sin(k * 1.7) * 0.08, h = 34 + (k % 3) * 3;
    ctx.save(); ctx.translate(x, y + 26); ctx.rotate(lean);
    ctx.fillRect(-2, -h - 26, 4, h);
    ctx.beginPath(); ctx.moveTo(-4, -h - 26); ctx.lineTo(0, -h - 34); ctx.lineTo(4, -h - 26); ctx.fill();
    ctx.restore();
  }
}
function bonehuntTree(x, s) {
  ctx.save(); ctx.translate(x, 470); ctx.scale(s, s);
  ctx.strokeStyle = '#22173a'; ctx.lineCap = 'round';
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -70, 4, -130); ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(2, -96); ctx.quadraticCurveTo(26, -118, 52, -112); ctx.quadraticCurveTo(60, -110, 58, -122); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, -80); ctx.quadraticCurveTo(-30, -96, -44, -128); ctx.quadraticCurveTo(-46, -136, -38, -138); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(4, -128); ctx.quadraticCurveTo(14, -150, 4, -162); ctx.quadraticCurveTo(-2, -168, 6, -172); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.restore();
}
function bonehuntGrave(x, text, tilt) {
  const y = 470;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.fillStyle = '#6f6790'; ctx.strokeStyle = '#3f365e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-36, 6); ctx.lineTo(-36, -50); ctx.arc(0, -50, 36, Math.PI, 0); ctx.lineTo(36, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -50); ctx.arc(0, -50, 30, Math.PI, Math.PI * 1.4); ctx.lineTo(-22, 0); ctx.fill();
  ctx.fillStyle = '#5f9a52'; ctx.beginPath(); ctx.ellipse(0, 6, 42, 6, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#2a2145'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
  text.forEach((ln, k) => ctx.fillText(ln, 0, -58 + k * 14, 64));
  ctx.restore();
}
function bonehuntPatch(x, t) {
  for (const [dx, s] of [[-26, 0.8], [0, 1], [24, 0.7]]) bonehuntPumpkin(x + dx, 474, 11 * s, t, false);
}
function bonehuntSign(x, y, text) {
  ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = '#4a3324'; ctx.fillRect(x - 2, y + 8, 4, 30);
  ctx.fillStyle = '#8a5c3a'; ctx.strokeStyle = '#4a3324'; ctx.lineWidth = 2;
  rr(x - w / 2, y - 9, w, 18, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe6c2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
}
function bonehuntGhost(x, y, t) {
  ctx.save(); ctx.globalAlpha = 0.82;
  ctx.fillStyle = '#f4f0ff';
  ctx.beginPath(); ctx.moveTo(x - 14, y + 16); ctx.lineTo(x - 14, y); ctx.arc(x, y, 14, Math.PI, 0); ctx.lineTo(x + 14, y + 16);
  for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(x + 14 - k * 7 - 3.5, y + 22 + Math.sin(t * 6 + k) * 2, x + 14 - (k + 1) * 7, y + 16);
  ctx.fill();
  // a little wave
  const wv = Math.sin(t * 4) * 0.5;
  ctx.beginPath(); ctx.ellipse(x + 15, y + 2, 4, 7, 0.6 + wv, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = BONEHUNT_INK; circle(x - 5, y - 1, 2.2); ctx.fill(); circle(x + 5, y - 1, 2.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,170,0.6)'; circle(x - 8, y + 4, 2); ctx.fill(); circle(x + 8, y + 4, 2); ctx.fill();
  ctx.strokeStyle = BONEHUNT_INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y + 3, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}
function bonehuntOwl(st, x, y, t) {
  const awake = st.owlAwake > 0;
  ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.ellipse(x, y, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x - 8, y - 18); ctx.lineTo(x - 3, y - 11); ctx.moveTo(x + 10, y - 8); ctx.lineTo(x + 8, y - 18); ctx.lineTo(x + 3, y - 11); ctx.fill();
  ctx.fillStyle = '#d9b48a'; ctx.beginPath(); ctx.ellipse(x, y + 4, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f3dcc0'; circle(x - 5, y - 5, 5); ctx.fill(); circle(x + 5, y - 5, 5); ctx.fill();
  ctx.strokeStyle = BONEHUNT_INK; ctx.fillStyle = BONEHUNT_INK; ctx.lineWidth = 1.5;
  if (awake) { circle(x - 5, y - 5, 2.6); ctx.fill(); circle(x + 5, y - 5, 2.6); ctx.fill(); }
  else for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(x + ex, y - 6, 2.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x, y + 2); ctx.fill();
  ctx.fillStyle = '#3a2a22'; ctx.fillRect(x - 18, y + 13, 36, 4);
  if (awake) { text('Hoo!', x + 22, y - 18, 13, '#ffe6c2', 'left', 'display'); return; }
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.45 + k / 3) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
    text('z', x + 12 + ph * 16, y - 14 - ph * 26, 9 + ph * 6, '#e9e0ff', 'left', 'display');
  }
  ctx.globalAlpha = 1;
}
function bonehuntPumpkin(x, y, r, t, solid) {
  ctx.fillStyle = '#e8792c'; ctx.strokeStyle = '#9a4316'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(x - r * 0.45, y, r * 0.62, r * 0.85, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.45, y, r * 0.62, r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4f7a35'; ctx.fillRect(x - 1.5, y - r * 0.9 - 5, 3, 6);
  // a jack-o'-lantern grin (glowing on the big ones)
  const glow = solid ? 0.75 + 0.25 * Math.sin(t * 3 + x) : 0.55;
  ctx.fillStyle = 'rgba(255,224,120,' + glow.toFixed(3) + ')';
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.18); ctx.lineTo(x - r * 0.2, y - r * 0.42); ctx.lineTo(x - r * 0.1, y - r * 0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.45, y - r * 0.18); ctx.lineTo(x + r * 0.2, y - r * 0.42); ctx.lineTo(x + r * 0.1, y - r * 0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * 0.75, x + r * 0.5, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * 0.4, x - r * 0.5, y + r * 0.15); ctx.fill();
}

/* ---------- the tiles and the level's things ---------- */
function bonehuntCell(st, ch, c, r, t) {
  const x = c * T, y = r * T, h = hash(c, r);
  const solid = (cc, r2) => tile(cc, r2) === '#' && (!st.sty[r2] || st.sty[r2][cc] !== 'm');
  const top = !solid(c, r - 1);
  if (ch === 'S') {
    // a little headstone (a 1-tile step)
    ctx.fillStyle = '#7d7699'; ctx.strokeStyle = '#463d66'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 3, y + T); ctx.lineTo(x + 3, y + 10); ctx.arc(x + 15, y + 10, 12, Math.PI, 0); ctx.lineTo(x + 27, y + T); ctx.closePath(); ctx.fill(); ctx.stroke();
    const k = st.stones.findIndex(s => s.c === c && s.r === r), word = (st.cfg.stones || [])[k] || 'RIP';
    ctx.fillStyle = '#2a2145'; ctx.font = '700 8px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(word, x + 15, y + 15, 22);
    return;
  }
  if (ch === 'p') { bonehuntPumpkin(x + 15, y + 16, 13, t, true); return; }
  if (ch === 'B') {
    ctx.fillStyle = '#5d5578'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.strokeStyle = '#463e61'; ctx.lineWidth = 1.5;
    const off = r % 2 ? 0 : 15;
    ctx.beginPath(); ctx.moveTo(x, y + 15); ctx.lineTo(x + T, y + 15);
    ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + 15); ctx.moveTo(x + (off + 15) % 30, y + 15); ctx.lineTo(x + (off + 15) % 30, y + T); ctx.stroke();
    if (h % 5 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 3, y + 3, 10, 9); }
    if (top) { ctx.fillStyle = '#7f78a0'; ctx.fillRect(x, y, T, 4); ctx.fillStyle = '#6ea05e'; if (h % 3) { ctx.beginPath(); ctx.ellipse(x + 8 + (h % 12), y + 1, 7, 3, 0, Math.PI, 0); ctx.fill(); } }
    if (!solid(c - 1, r)) { ctx.fillStyle = '#3d3658'; ctx.fillRect(x, y, 2, T); }
    if (!solid(c + 1, r)) { ctx.fillStyle = '#3d3658'; ctx.fillRect(x + T - 2, y, 2, T); }
    return;
  }
  if (ch === 'W') {
    ctx.fillStyle = '#5a3b2e'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.strokeStyle = '#43291f'; ctx.lineWidth = 2;
    for (const gx of [7, 18, 26]) { ctx.beginPath(); ctx.moveTo(x + gx + Math.sin(r + gx) * 2, y); ctx.lineTo(x + gx + Math.sin(r + 1 + gx) * 2, y + T); ctx.stroke(); }
    if (h % 7 === 0) { ctx.fillStyle = '#3a241b'; ctx.beginPath(); ctx.ellipse(x + 15, y + 15, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (top) { ctx.fillStyle = '#c99a6a'; ctx.fillRect(x, y, T, 5); ctx.strokeStyle = '#8a6040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y + 2.5); ctx.lineTo(x + T - 2, y + 2.5); ctx.stroke(); }
    return;
  }
  // earth with a mossy top
  ctx.fillStyle = '#3b2c47'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  if (h % 3 === 0) { ctx.fillStyle = '#4a3958'; ctx.beginPath(); ctx.ellipse(x + 6 + (h % 16), y + 12 + ((h >> 4) % 12), 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  if (h % 11 === 0 && !top) { ctx.fillStyle = 'rgba(246,240,222,0.35)'; ctx.fillRect(x + 8, y + 14, 9, 2.5); }
  if (top) {
    ctx.fillStyle = '#41734a'; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = '#5f9a52'; ctx.fillRect(x, y, T, 5);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 3 + i * 10, y); ctx.lineTo(x + 6 + i * 10, y - 4 - (h >> i) % 3); ctx.lineTo(x + 9 + i * 10, y); ctx.fill(); }
  }
}
function bonehuntPlank(x, y) {
  ctx.fillStyle = '#4a3324'; ctx.fillRect(x, y + 2, T, 9);
  ctx.fillStyle = '#8a5c3a'; ctx.fillRect(x, y, T, 7);
  ctx.fillStyle = '#4a3324'; circle(x + 5, y + 3.5, 1.3); ctx.fill(); circle(x + T - 5, y + 3.5, 1.3); ctx.fill();
}
function bonehuntDrawPits(st, t) {
  // each grave: a dark hole, dirt sides and a springy coffin at the bottom
  const cols = {};
  for (const pc of st.pitCells) { const o = cols[pc.c] || (cols[pc.c] = { c: pc.c, top: pc.r }); o.top = Math.min(o.top, pc.r); }
  const list = Object.values(cols).sort((a, b) => a.c - b.c), runs = [];
  for (const o of list) { const r = runs[runs.length - 1]; if (r && r.c1 === o.c - 1 && r.top === o.top) r.c1 = o.c; else runs.push({ c0: o.c, c1: o.c, top: o.top }); }
  for (const r of runs) {
    const x0 = r.c0 * T, x1 = (r.c1 + 1) * T, y0 = r.top * T;
    ctx.fillStyle = '#2a1c42'; ctx.fillRect(x0, y0, x1 - x0, H - y0);
    ctx.fillStyle = 'rgba(255,170,90,0.08)'; ctx.fillRect(x0, H - 22, x1 - x0, 22);
    ctx.fillStyle = '#46305a'; ctx.fillRect(x0, y0, 6, H - y0); ctx.fillRect(x1 - 6, y0, 6, H - y0);
    ctx.fillStyle = '#5f9a52'; ctx.fillRect(x0 - 2, y0 - 1, 6, 4); ctx.fillRect(x1 - 4, y0 - 1, 6, 4);
    // a squishy striped mattress on two big springs (it bounces whoever lands on it): cosy, not a coffin
    const mid = (x0 + x1) / 2, sq = st.springT ? Math.max(...Array.from({ length: r.c1 - r.c0 + 1 }, (_, k) => st.springT[r.c0 + k] || 0)) : 0;
    const mw = Math.min(x1 - x0 - 24, 130), cy = H - 24 - (reduceMotion ? 0 : Math.sin(sq * Math.PI) * 16);
    ctx.strokeStyle = '#d9d2ea'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    for (const sx of [mid - mw * 0.3, mid + mw * 0.3]) {
      ctx.beginPath(); ctx.moveTo(sx, H);
      for (let k = 1; k <= 5; k++) ctx.lineTo(sx + (k % 2 ? 8 : -8), H - (k / 5) * (H - cy - 8));
      ctx.stroke();
    }
    ctx.fillStyle = '#ff9fca'; ctx.strokeStyle = '#a2527f'; ctx.lineWidth = 2;
    rr(mid - mw / 2, cy - 6, mw, 15, 7); ctx.fill(); ctx.stroke();
    ctx.save(); rr(mid - mw / 2 + 1, cy - 5, mw - 2, 13, 6); ctx.clip();
    ctx.fillStyle = '#ffd6ea'; for (let xx = mid - mw / 2 + 6; xx < mid + mw / 2; xx += 14) ctx.fillRect(xx, cy - 6, 6, 16);
    ctx.restore();
    ctx.fillStyle = '#a2527f'; for (let xx = mid - mw / 2 + 16; xx < mid + mw / 2 - 8; xx += 22) { circle(xx, cy + 1.5, 1.6); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b8aed0'; ctx.lineWidth = 1.5;
    rr(mid - mw / 2 + 4, cy - 13, 26, 10, 5); ctx.fill(); ctx.stroke();
    if (sq > 0.2 && !reduceMotion) { ctx.globalAlpha = sq; for (const d of [-1, 1]) text('✦', mid + d * (mw / 2 + 2), cy - 16 - sq * 8, 12, C.gold, 'center', 'body'); ctx.globalAlpha = 1; }
  }
}
function bonehuntDrawLantern(ln, t) {
  const x = ln.x, y = ln.feet;
  ctx.fillStyle = '#2a1d33'; ctx.fillRect(x - 2, y - 52, 4, 52); ctx.fillRect(x - 2, y - 52, 14, 3);
  ctx.strokeStyle = '#2a1d33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, y - 50); ctx.lineTo(x + 10, y - 44); ctx.stroke();
  if (ln.lit) {
    const g = 0.18 + 0.06 * Math.sin(t * 5 + x);
    ctx.fillStyle = 'rgba(255,170,70,' + g.toFixed(3) + ')'; circle(x + 10, y - 34, 26); ctx.fill();
  }
  ctx.save(); if (!ln.lit) ctx.globalAlpha = 0.65;
  bonehuntPumpkin(x + 10, y - 34, 10, t, ln.lit);
  ctx.restore();
}
function bonehuntDrawMound(st, m, t) {
  const left = 1 - m.digs / m.need, w = m.big ? m.len / 2 + 10 : 17, hgt = (m.big ? 16 : 12) * (0.35 + 0.65 * left);
  const sx = m.shake && !reduceMotion ? Math.sin(t * 70) * m.shake * 2 : 0, x = m.x + sx, y = m.feet + 1;
  if (m.gold) { ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.15 * Math.sin(t * 6)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, y - hgt / 2, w + 10, hgt + 10, 0, 0, Math.PI * 2); ctx.fill(); }
  // the bone peeks out as you dig
  if (left < 0.7) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - w, y - hgt - 20, w * 2, hgt + 18); ctx.clip();
    if (m.big) bonehuntBoneShape(x - m.len / 2 + 6, y - hgt + 2, x + m.len / 2 - 6, y - hgt + 4, 10);
    else bonehuntBoneShape(x - 9, y - hgt + 1, x + 9, y - hgt - 1, 6);
    ctx.restore();
  }
  ctx.fillStyle = '#5a3f33'; ctx.strokeStyle = '#3a2620'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, w, hgt, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6e4e3e'; ctx.beginPath(); ctx.ellipse(x - w * 0.2, y - hgt * 0.55, w * 0.45, hgt * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // sparkles say "dig here"
  for (let k = 0; k < (m.big ? 4 : 2); k++) {
    const ph = (t * 0.8 + k * 0.37 + m.i * 0.21) % 1, a = Math.sin(ph * Math.PI);
    const sx2 = x + (hash(m.c, k) % (w * 2)) - w, sy = y - hgt - 4 - ph * 16;
    ctx.globalAlpha = a; ctx.fillStyle = m.gold ? C.gold : '#fff2b0';
    ctx.beginPath(); ctx.moveTo(sx2, sy - 4); ctx.lineTo(sx2 + 1.2, sy - 1.2); ctx.lineTo(sx2 + 4, sy); ctx.lineTo(sx2 + 1.2, sy + 1.2); ctx.lineTo(sx2, sy + 4); ctx.lineTo(sx2 - 1.2, sy + 1.2); ctx.lineTo(sx2 - 4, sy); ctx.lineTo(sx2 - 1.2, sy - 1.2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the giant ribcage: two shovels stuck in it say "dig together"
  if (m.together && !m.done) {
    for (const d of [-1, 1]) {
      const sx3 = x + d * (w * 0.55);
      ctx.save(); ctx.translate(sx3, y - hgt * 0.6); ctx.rotate(d * 0.35);
      ctx.fillStyle = '#9a6a3e'; ctx.fillRect(-1.5, -26, 3, 22);
      ctx.fillStyle = '#c8c4d6'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(4, 6); ctx.lineTo(0, 9); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (m.digs > 0) {
      ctx.fillStyle = 'rgba(28,26,54,0.65)'; rr(x - 26, y - hgt - 42, 52, 10, 5); ctx.fill();
      ctx.fillStyle = C.gold; rr(x - 24, y - hgt - 40, 48 * (m.digs / m.need), 6, 3); ctx.fill();
    }
  }
}
// a chalk X where Mr. Bones can stand in (with a dotted outline of the shape he takes there)
function bonehuntDrawSpot(st, s, k, t) {
  const on = st.forms[s.type], here = st.mr.spot === k;
  if (here) return;
  const want = on && st.roomDone && s.type === st.cfg.exitVia;
  ctx.save();
  ctx.globalAlpha = on ? 0.75 + 0.25 * Math.sin(t * 4 + k) : 0.22;
  const col = s.gold ? C.gold : '#f4f0ff';
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x - 8, s.feet - 2); ctx.lineTo(s.x + 8, s.feet - 9); ctx.moveTo(s.x - 8, s.feet - 9); ctx.lineTo(s.x + 8, s.feet - 2); ctx.stroke();
  if (on) {
    ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.globalAlpha *= want || s.gold ? 0.8 : 0.4;
    if (s.type === 'stool') { ctx.strokeRect(s.c * T + 3, s.r * T + 3, T - 6, T - 8); }
    else if (s.type === 'ladder') { ctx.beginPath(); ctx.moveTo(s.x - 10, s.feet - 12); ctx.lineTo(s.x - 10, s.top); ctx.moveTo(s.x + 10, s.feet - 12); ctx.lineTo(s.x + 10, s.top); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(s.x0 + 4, s.y0 + 6); ctx.lineTo(s.x1 - 4, s.y0 + 6); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}
function bonehuntDrawGate(st, t) {
  const gt = st.gate;
  if (!gt) return;
  const x = gt.x, y0 = gt.y0, y1 = gt.y1, lift = gt.open * (y1 - y0 - 10);
  // the chain from the crank's wheel up to the gate
  const cx = gt.crank.x, cy = gt.crank.feet - 34;
  ctx.strokeStyle = '#8f88a8'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.quadraticCurveTo((cx + x) / 2, y0 - 40 + gt.open * 12, x + 15, y0 - 6); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#3d3658'; circle(x + 15, y0 - 6, 5); ctx.fill();
  // iron bars with little spear tips
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y0, T + 4, y1 - y0); ctx.clip();
  ctx.fillStyle = '#2a2240'; ctx.fillRect(x, y0, T, y1 - y0);
  ctx.fillStyle = 'rgba(255,190,110,0.12)'; ctx.fillRect(x, y0, T, y1 - y0);
  ctx.strokeStyle = '#a9a3c2'; ctx.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const bx = x + 4 + k * 7.3;
    ctx.beginPath(); ctx.moveTo(bx, y0 - lift); ctx.lineTo(bx, y1 - 4 - lift); ctx.stroke();
    ctx.fillStyle = '#a9a3c2'; ctx.beginPath(); ctx.moveTo(bx - 3, y1 - 4 - lift); ctx.lineTo(bx, y1 + 3 - lift); ctx.lineTo(bx + 3, y1 - 4 - lift); ctx.fill();
  }
  ctx.fillStyle = '#a9a3c2'; ctx.fillRect(x + 1, y0 + 20 - lift, T - 2, 3); ctx.fillRect(x + 1, y1 - 24 - lift, T - 2, 3);
  ctx.restore();
  // the crank: a post and a turning wheel
  ctx.fillStyle = '#4a3324'; ctx.fillRect(cx - 3, cy, 6, gt.crank.feet - cy);
  ctx.save(); ctx.translate(cx, cy - 4); ctx.rotate(gt.spin);
  ctx.strokeStyle = '#c0b9d6'; ctx.lineWidth = 3; circle(0, 0, 10); ctx.stroke();
  ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * 2.1) * 10, Math.sin(k * 2.1) * 10); ctx.stroke(); }
  ctx.fillStyle = '#ffb347'; circle(10, 0, 3.2); ctx.fill();
  ctx.restore();
}
function bonehuntDrawBell(st, t) {
  const bl = st.bell;
  if (!bl) return;
  const x0 = st.ropes[0].x, x1 = st.ropes[st.ropes.length - 1].x, bx = (x0 + x1) / 2, top = 60, by = st.cfg.bellY || 92;
  // the belfry's cosy back wall (so the bell reads clearly), lit warm once it rings
  const wx0 = x0 - 15, wx1 = x1 + 15, wy1 = st.ropes[0].feet;
  ctx.fillStyle = '#3b3358'; ctx.fillRect(wx0, top, wx1 - wx0, wy1 - top);
  ctx.strokeStyle = '#332c4e'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let y = top + 15, k = 0; y < wy1; y += 15, k++) {
    ctx.moveTo(wx0, y); ctx.lineTo(wx1, y);
    for (let x = wx0 + (k % 2 ? 0 : 15); x < wx1; x += 30) { ctx.moveTo(x, y - 15); ctx.lineTo(x, y); }
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,120,' + (bl.rung ? 0.22 : 0.08).toFixed(3) + ')'; circle(bx, by - 6, 56); ctx.fill();
  // a little round window with a star in it
  ctx.fillStyle = '#2a1f45'; circle(bx, wy1 - 52, 13); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.8)'; circle(bx + 3, wy1 - 55, 1.6); ctx.fill();
  // ropes from the yoke down to each handle
  st.ropes.forEach(r => {
    const end = r.feet - 34 + r.pull * 10;
    ctx.strokeStyle = '#d9b27a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx + (r.x < bx ? -18 : 18), top + 8); ctx.quadraticCurveTo(r.x, top + 40, r.x, end); ctx.stroke();
    ctx.fillStyle = '#c0392b'; rr(r.x - 4, end, 8, 14, 3); ctx.fill();
  });
  ctx.fillStyle = '#4a3324'; ctx.fillRect(bx - 34, top, 68, 8);
  ctx.save(); ctx.translate(bx, top + 8); ctx.rotate(bl.swing);
  // the clapper: Mr. Bones' hand, waving (until it falls out)
  if (!bl.rung) {
    ctx.strokeStyle = BONEHUNT_BONE_EDGE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(Math.sin(t * 3) * 3, by - top + 6); ctx.stroke();
    ctx.fillStyle = BONEHUNT_BONE; circle(Math.sin(t * 3) * 3, by - top + 10, 5); ctx.fill();
    for (let k = -1; k <= 1; k++) { ctx.fillRect(Math.sin(t * 3) * 3 + k * 3 - 1, by - top + 12, 2, 6); }
  }
  ctx.fillStyle = '#e0a73a'; ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-14, 30, -32, by - top + 4); ctx.lineTo(32, by - top + 4); ctx.quadraticCurveTo(14, 30, 10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,180,0.45)'; ctx.beginPath(); ctx.ellipse(-12, 26, 4, 14, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c98a22'; ctx.fillRect(-33, by - top, 66, 5);
  ctx.restore();
  if (bl.bongT > 0) {
    const k = 1 - bl.bongT / 1.6;
    ctx.strokeStyle = 'rgba(255,215,122,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 3;
    for (let n = 0; n < 2; n++) { circle(bx, by - 10, 30 + (k + n * 0.3) * 80); ctx.stroke(); }
  }
}
function bonehuntDrawExit(st, d, t) {
  const x = d.x + d.w / 2, y = d.y + d.h, open = st.roomDone;
  ctx.fillStyle = '#25193d';
  ctx.fillRect(d.x - 4, y - 70, 6, 70); ctx.fillRect(d.x + d.w - 2, y - 70, 6, 70);
  ctx.strokeStyle = '#25193d'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y - 66, d.w / 2 + 1, Math.PI, 0); ctx.stroke();
  ctx.lineWidth = 2;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x, y - 66, 8 + k * 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  // the gates: open (swung back) once Mr. Bones is ready, shut before
  ctx.strokeStyle = '#3b2c5c'; ctx.lineWidth = 2.5;
  const half = open ? 6 : d.w / 2 - 2;
  for (const side of [-1, 1]) {
    const gx = side < 0 ? d.x + 2 : d.x + d.w - 2;
    for (let k = 1; k <= 3; k++) { const bx = gx - side * k * half / 3.5; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y - 52); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(gx, y - 14); ctx.lineTo(gx - side * half, y - 14); ctx.moveTo(gx, y - 44); ctx.lineTo(gx - side * half, y - 44); ctx.stroke();
  }
  if (open) { ctx.fillStyle = 'rgba(255,215,122,' + (0.16 + 0.08 * Math.sin(t * 3)).toFixed(3) + ')'; ctx.fillRect(d.x + 6, y - 64, d.w - 12, 64); }
  // the lantern and the sign
  ctx.fillStyle = open ? '#ffcf6e' : '#8a7a6a'; rr(x - 5, y - 104, 10, 13, 3); ctx.fill();
  if (open) { ctx.fillStyle = 'rgba(255,200,110,0.22)'; circle(x, y - 98, 18); ctx.fill(); }
  const label = st.cfg.exitLabel;
  if (label) {
    ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.min(ctx.measureText(label).width + 22, 150);
    const sx = clamp(x, w / 2 + 4, W - w / 2 - 4);
    ctx.fillStyle = '#8a5c3a'; ctx.strokeStyle = '#4a3324'; ctx.lineWidth = 2; rr(sx - w / 2, y - 86, w, 16, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe6c2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label + ' →', sx, y - 77.5, w - 6);
  }
}
function bonehuntDrawBone(st, b, t) {
  if (b.state === 'done' || b.state === 'carried') return;
  if (b.kind === 'small') { if (b.state === 'ground') bonehuntBoneShape(b.x - 10, b.feet - 5, b.x + 10, b.feet - 7, 6.5); return; }
  const y = b.feet - 7 - b.fall;
  bonehuntBigBone(b, b.x - b.len / 2, y, b.x + b.len / 2, y, t);
  // grab handles glow at the ends
  for (const end of [-1, 1]) {
    if (b.holds[0] === end || b.holds[1] === end) continue;
    const ex = b.x + end * b.len / 2;
    ctx.fillStyle = 'rgba(255,215,122,' + (0.25 + 0.2 * Math.sin(t * 5 + end)).toFixed(3) + ')'; circle(ex, y, 11); ctx.fill();
  }
}
// a big bone (the backbone or the giant ribcage) from end to end
function bonehuntBigBone(b, x1, y1, x2, y2, t) {
  if (b.piece === 'ribs') {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1), hl = Math.hypot(x2 - x1, y2 - y1) / 2;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
    ctx.lineCap = 'round';
    for (const [w, col] of [[6, BONEHUNT_BONE_EDGE], [3.6, BONEHUNT_BONE]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(k * (hl / 4.2), 0, 7, 13, 0, Math.PI * 0.05, Math.PI * 1.95); ctx.stroke(); }
    }
    ctx.lineCap = 'butt';
    ctx.restore();
    bonehuntBoneShape(x1, y1 - 2, x2, y2 - 2, 8);
    return;
  }
  bonehuntBoneShape(x1, y1, x2, y2, 11);
  // vertebra bumps on the backbone
  ctx.fillStyle = BONEHUNT_BONE_EDGE;
  const n = 6;
  for (let k = 1; k < n; k++) { const f = k / n; ctx.fillRect(x1 + (x2 - x1) * f - 1, y1 + (y2 - y1) * f - 3.5, 2, 7); }
}
function bonehuntFireflies(st, t) {
  for (let i = 0; i < 12; i++) {
    const h = hash(i, 77 + G.room), x = (h % 900) + 30 + Math.sin(t * 0.4 + i) * 40, y = 300 + ((h >> 9) % 150) + Math.sin(t * 0.7 + i * 2) * 20;
    const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.3 + i * 1.7));
    ctx.fillStyle = 'rgba(255,230,120,' + (0.18 * a).toFixed(3) + ')'; circle(x, y, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,160,' + a.toFixed(3) + ')'; circle(x, y, 1.8); ctx.fill();
  }
}
function bonehuntDraw(st) {
  if (!st.pl) return;
  const t = G.clock, g = G.level.grid;
  bonehuntDrawBack(st, t);
  bonehuntDrawPits(st, t);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (ch === '=') { bonehuntPlank(c * T, r * T); continue; }
    if (ch !== '#') continue;
    const sty = st.sty[r][c];
    if (sty === 'm' || sty === 'g') continue;
    bonehuntCell(st, sty || '#', c, r, t);
  }
  if (st.exit) bonehuntDrawExit(st, st.exit, t);
  st.lanterns.forEach(ln => bonehuntDrawLantern(ln, t));
  bonehuntDrawGate(st, t);
  bonehuntDrawBell(st, t);
  st.spots.forEach((s, k) => bonehuntDrawSpot(st, s, k, t));
  for (const m of st.mounds) if (!m.done) bonehuntDrawMound(st, m, t);
  for (const b of st.bones) bonehuntDrawBone(st, b, t);
  bonehuntDrawMr(st, t);
  bonehuntFireflies(st, t);
}

/* ---------- over the players: shovels, carried bones, flying bones, words ---------- */
function bonehuntShovel(p, P, t) {
  const cx = bonehuntCx(p), dig = P.digT < BONEHUNT.digAnim, f = p.face || 1;
  ctx.save();
  if (dig) {
    const k = P.digT / BONEHUNT.digAnim, a = Math.sin(k * Math.PI);
    ctx.translate(cx + f * 12, p.y + 14 + a * 8); ctx.rotate(f * (0.5 + a * 0.7));
  } else { ctx.translate(cx - f * 9, p.y + 12); ctx.rotate(-f * 0.35); }
  ctx.fillStyle = '#9a6a3e'; ctx.fillRect(-1.3, -16, 2.6, 18);
  ctx.fillStyle = '#9a6a3e'; ctx.fillRect(-4, -18, 8, 2.5);
  ctx.fillStyle = '#c8c4d6'; ctx.strokeStyle = '#6d6788'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4.5, 2); ctx.lineTo(4.5, 2); ctx.lineTo(3.5, 9); ctx.lineTo(0, 12); ctx.lineTo(-3.5, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function bonehuntDrawTop(st) {
  if (!st.pl) return;
  const t = G.clock, big = hudBig();
  for (const p of G.players) {
    if (!p.alive) continue;
    const P = st.pl[p.id];
    if (!P.hold) bonehuntShovel(p, P, t);
    if (P.carry) bonehuntBoneShape(bonehuntCx(p) - 10, p.y - 7 + Math.sin(t * 6) * 1.2, bonehuntCx(p) + 10, p.y - 9 + Math.sin(t * 6) * 1.2, 6.5);
    if (P.climb) { ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 3; ctx.lineCap = 'round'; const s = Math.sin((P.climbAnim || 0) * 12) * 4; ctx.beginPath(); ctx.moveTo(p.x + 3, p.y + 10); ctx.lineTo(p.x - 1, p.y + 2 + s); ctx.moveTo(p.x + p.w - 3, p.y + 10); ctx.lineTo(p.x + p.w + 1, p.y + 2 - s); ctx.stroke(); ctx.lineCap = 'butt'; }
  }
  // big bones up in the air, between the two pairs of hands
  for (const b of st.bones) {
    if (b.kind !== 'big' || b.state !== 'carried') continue;
    const L = G.players.find(p => b.holds[p.id] === -1), R = G.players.find(p => b.holds[p.id] === 1);
    if (!L || !R) continue;
    const lx = bonehuntCx(L), rx = bonehuntCx(R), ly = L.y + 9, ry = R.y + 9, mx = (lx + rx) / 2, my = (ly + ry) / 2;
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang), hl = b.len / 2;
    if (b.glue) { ctx.strokeStyle = 'rgba(255,197,61,0.55)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx - ca * hl, my - sa * hl); ctx.lineTo(mx + ca * hl, my + sa * hl); ctx.stroke(); ctx.lineCap = 'butt'; }
    bonehuntBigBone(b, mx - ca * hl, my - sa * hl, mx + ca * hl, my + sa * hl, t);
    for (const p of [L, R]) { ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 1.5; circle(bonehuntCx(p), p.y + 10, 4.5); ctx.fill(); ctx.stroke(); }
    // stretched too far: the bone wobbles a warning
    const stretch = (rx - lx) - b.len;
    if (stretch > BONEHUNT.bigSlack * 0.55 && !b.glue) { ctx.fillStyle = '#ffffff'; text('!', mx, my - 22, 18 + Math.sin(t * 20) * 2, '#ffd77a', 'center', 'display'); }
  }
  // bones flying back into Mr. Bones, and the hat
  for (const f of st.flyers) {
    const k = clamp(f.t / f.dur, 0, 1), e = k * k * (3 - 2 * k);
    const x = f.x0 + ((f.x1 == null ? f.x0 : f.x1) - f.x0) * e, y = f.y0 + ((f.y1 == null ? f.y0 : f.y1) - f.y0) * e - Math.sin(Math.PI * k) * 50;
    if (f.kind === 'hat') { bonehuntHat(x, y, 0.9, Math.sin(k * 12) * 0.4); continue; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(k * 9);
    if (f.big) bonehuntBoneShape(-f.len / 4, 0, f.len / 4, 0, 9); else bonehuntBoneShape(-9, 0, 9, 0, 6);
    ctx.restore();
  }
  // Mr. Bones' speech bubble
  const mr = st.mr;
  if (mr.say && G.introT <= 0) {
    const s = mr.say, a = clamp(Math.min(s.t / 0.15, (s.life - s.t) / 0.3), 0, 1), fs = big ? 18 : 13;
    const r = bonehuntMrRect(st) || { x: mr.x - 20, y: mr.feet - 60, w: 40, h: 60 };
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + (big ? 22 : 16), h = fs + (big ? 14 : 10);
    const px = clamp(r.x + r.w / 2, w / 2 + 4, W - w / 2 - 4), by = Math.max(84, r.y - 18 - (st.hatOn ? 16 : 0)), y = by - h;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#7d6f96'; ctx.lineWidth = 2;
    rr(px - w / 2, y, w, h, 10); ctx.fill(); ctx.stroke();
    const tx = clamp(r.x + r.w / 2, px - w / 2 + 12, px + w / 2 - 12);
    ctx.beginPath(); ctx.moveTo(tx - 5, y + h - 1); ctx.lineTo(tx + 5, y + h - 1); ctx.lineTo(tx, y + h + 6); ctx.closePath(); ctx.fill();
    text(s.text, px, y + h / 2 + 0.5, fs, '#3b2a5c', 'center', 'body');
    ctx.restore();
  }
  // dirt
  for (const d of st.dirt) { ctx.globalAlpha = clamp(d.life / d.max * 1.6, 0, 1); ctx.fillStyle = d.gold ? C.gold : '#6e4e3e'; ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size); }
  ctx.globalAlpha = 1;
  // the gold arrow at the next job
  if (st.goldArrow) {
    const ga = st.goldArrow, bob = reduceMotion ? 0 : Math.sin(t * 5) * 5, y = ga.y - 12 + bob;
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ga.x, y + 12); ctx.lineTo(ga.x - 11, y - 2); ctx.lineTo(ga.x - 4, y - 2); ctx.lineTo(ga.x - 4, y - 14); ctx.lineTo(ga.x + 4, y - 14); ctx.lineTo(ga.x + 4, y - 2); ctx.lineTo(ga.x + 11, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // hold-down ring (hop back)
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.downT < BONEHUNT.backShow) continue;
    const f = clamp(P.downT / BONEHUNT.backHold, 0, 1), cx = bonehuntCx(p), rs = big ? 1.5 : 1, ry = p.y - 14 * rs;
    ctx.lineWidth = 3 * rs; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; circle(cx, ry, 9 * rs); ctx.stroke();
    ctx.strokeStyle = '#b278ff'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, ry, 9 * rs, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
  }
  // floating words: Boing!, Clatter!, Heave-ho!
  for (const q of st.pops) {
    const k = q.t / q.life, a = clamp((1 - k) / 0.3, 0, 1), s = (big ? 1.25 : 1) * (0.8 + 0.2 * Math.min(1, q.t / 0.12));
    ctx.save(); ctx.globalAlpha = a;
    bigText(q.text, clamp(q.x, 70, W - 70), Math.max(70, q.y - k * 26), q.size, q.col, s);
    ctx.restore();
  }
}
function bonehuntBoneIcon(x, y, s, on) {
  ctx.save(); ctx.globalAlpha = on ? 1 : 0.35;
  bonehuntBoneShape(x - 7 * s, y, x + 7 * s, y, 5 * s, on ? BONEHUNT_BONE : '#b9b0cf', on ? BONEHUNT_BONE_EDGE : '#6d6588');
  ctx.restore();
}
function bonehuntHud(st) {
  if (!st.pl) return;
  const big = hudBig(), fs = big ? 20 : 14, h = big ? 40 : 28, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  // top right: time and Mr. Bones' bones (and his hat)
  const tm = fmtTime(G.time), got = BONEHUNT_ALL.filter(k => st.pieces[k]).length, cnt = got + '/' + BONEHUNT_ALL.length;
  ctx.save(); ctx.globalAlpha = st.pillA == null ? 1 : st.pillA;
  ctx.font = font(fs);
  const tw = ctx.measureText(tm).width, nw = ctx.measureText(cnt).width, icon = fs * 1.4, gap = fs;
  const rw = 15 + tw + gap + icon + fs * 0.35 + nw + 15, rx = pill(W - 14, 12, rw, h, 'right'), cy = 12 + h / 2 + 0.5;
  text(tm, rx + 15, cy, fs, C.paper, 'left', 'body');
  bonehuntBoneIcon(rx + 15 + tw + gap + icon / 2, cy, fs / 14, true);
  text(cnt, rx + 15 + tw + gap + icon + fs * 0.35, cy, fs, got === BONEHUNT_ALL.length ? C.gold : C.paper, 'left', 'body');
  // this room's bones under it, filled in as they go back
  const rp = st.roomPieces, iw = big ? 30 : 22, rh = big ? 30 : 22;
  if (rp.length && G.mode === 'play') {
    const pw = 16 + rp.length * iw + (st.cfg.unlock && BONEHUNT_FORMS[st.cfg.unlock] ? (big ? 90 : 70) : 0);
    const px = pill(W - 14, 12 + h + 6, pw, rh, 'right');
    rp.forEach((k, i) => bonehuntBoneIcon(px + 8 + iw * (i + 0.5), 12 + h + 6 + rh / 2, big ? 1.25 : 0.95, !!st.pieces[k]));
    const u = st.cfg.unlock;
    if (u && BONEHUNT_FORMS[u]) text(st.roomDone ? BONEHUNT_FORMS[u] + '!' : '→ ' + u, px + 8 + iw * rp.length + 4, 12 + h + 6 + rh / 2 + 0.5, big ? 15 : 11, st.roomDone ? C.gold : '#d9d3ef', 'left', 'body');
  }
  ctx.restore();
  // top centre: news and gold help
  const n = st.news;
  let newsBox = null;
  if (n && G.mode === 'play' && G.introT <= 0) {
    const nfs = big ? 19 : 14, nh = big ? 36 : 28;
    ctx.font = font(nfs);
    const w = Math.min(ctx.measureText(n.text).width + 34, rx - 270);
    const x = clamp(W / 2, 260 + w / 2, rx - 10 - w / 2), y = 12;
    newsBox = [x - w / 2, x + w / 2, y + nh];
    const a = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    pill(x, y, w, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - w / 2, y, w, nh, nh / 2); ctx.stroke(); }
    ctx.font = font(nfs);
    const fsz = Math.min(nfs, nfs * (w - 30) / Math.max(1, ctx.measureText(n.text).width));
    text(n.text, x, y + nh / 2 + 0.5, fsz, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  if (G.mode !== 'play' || G.introT > 0) return;
  // hint bubbles over heads (under the feet when a top pill is in the way)
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 290) y = 80;
    if (x1 > rx - 6) y = Math.max(y, 12 + h + 6 + rh + 6);
    if (newsBox && x1 > newsBox[0] - 6 && x0 < newsBox[1] + 6) y = Math.max(y, newsBox[2] + 6);
    return y;
  };
  const placed = [];
  for (const p of G.players) {
    const P = st.pl[p.id], hn = P.hint;
    if (!hn || !p.alive) continue;
    const a = clamp(Math.min(hn.t, hn.life - hn.t) / 0.2, 0, 1), hfs = big ? 20 : 12;
    ctx.font = font(hfs);
    const tw2 = ctx.measureText(hn.text).width + (big ? 22 : 16), th = hfs + (big ? 14 : 10);
    const px = bonehuntCx(p), cx = clamp(px, tw2 / 2 + 4, W - tw2 / 2 - 4);
    let top = p.y - (P.carry ? 22 : 12) - th - 6, under = false;
    for (const r of placed) if (cx - tw2 / 2 < r[0] + r[2] && cx + tw2 / 2 > r[0] && top < r[1] + r[3] + 4 && top + th > r[1] - 4) top = r[1] - th - 8;
    if (top < clearTop(cx - tw2 / 2, cx + tw2 / 2)) { under = true; top = Math.min(p.y + p.h + 12, H - th - 4); }
    placed.push([cx - tw2 / 2, top, tw2, th]);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2;
    rr(cx - tw2 / 2, top, tw2, th, th / 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (under) { ctx.moveTo(px - 5, top + 1); ctx.lineTo(px + 5, top + 1); ctx.lineTo(px, top - 5); }
    else { ctx.moveTo(px - 5, top + th - 1); ctx.lineTo(px + 5, top + th - 1); ctx.lineTo(px, top + th + 5); }
    ctx.closePath(); ctx.fill();
    text(hn.text, cx, top + th / 2 + 0.5, hfs, C.ink, 'center', 'body');
    ctx.restore();
  }
}
MODES.bonehunt.test = { BONEHUNT, bonehuntDone, bonehuntSpotAt, bonehuntMoundAt, bonehuntEndAt, bonehuntOnMr, bonehuntLadder, bonehuntNextJob };

/* ---------- sounds ---------- */
Sfx.extra.bonehuntDig = function (pitch) { this.tone(180 * pitch, 0.07, 'square', 0.035, 110 * pitch); this.tone(900, 0.03, 'triangle', 0.02, 500, 0.02); };
Sfx.extra.bonehuntSwish = function (pitch) { this.tone(500 * pitch, 0.06, 'sine', 0.02, 260 * pitch); };
Sfx.extra.bonehuntUnearth = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.11, 'triangle', 0.05, null, i * 0.06)); this.tone(1568, 0.2, 'sine', 0.03, null, 0.24); };
Sfx.extra.bonehuntHeave = function () { this.tone(150, 0.14, 'square', 0.04, 110); this.tone(300, 0.08, 'triangle', 0.035, 420, 0.06); };
Sfx.extra.bonehuntGrab = function (pitch) { this.tone(420 * pitch, 0.05, 'triangle', 0.04, 620 * pitch); };
Sfx.extra.bonehuntLift = function () { [392, 494, 587].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.bonehuntClatter = function () { [0, 0.05, 0.1, 0.16].forEach((d, i) => this.tone(1200 - i * 180, 0.05, 'square', 0.03, 700 - i * 100, d)); this.tone(220, 0.18, 'triangle', 0.05, 120, 0.04); };
Sfx.extra.bonehuntThud = function () { this.tone(150, 0.12, 'triangle', 0.06, 90); };
Sfx.extra.bonehuntClack = function () { this.tone(1400, 0.03, 'square', 0.04); this.tone(1000, 0.04, 'square', 0.035, null, 0.04); [659, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, 0.09 + i * 0.06)); };
Sfx.extra.bonehuntRattle = function () { [0, 0.035, 0.07, 0.1, 0.13].forEach((d, i) => this.tone(1500 + (i % 2) * 300, 0.025, 'square', 0.025, null, d)); };
Sfx.extra.bonehuntHop = function () { this.tone(260, 0.16, 'sine', 0.06, 620); Sfx.extra.bonehuntRattle.call(this); };
Sfx.extra.bonehuntCall = function (pitch) { this.tone(700 * pitch, 0.07, 'triangle', 0.045, 900 * pitch); this.tone(900 * pitch, 0.09, 'triangle', 0.04, 1100 * pitch, 0.09); };
Sfx.extra.bonehuntNope = function () { this.tone(330, 0.08, 'square', 0.03, 260); this.tone(260, 0.1, 'square', 0.03, 200, 0.1); };
Sfx.extra.bonehuntCreak = function () { this.tone(140, 0.25, 'sawtooth', 0.022, 95); };
Sfx.extra.bonehuntClick = function () { this.tone(1100, 0.04, 'square', 0.03); };
Sfx.extra.bonehuntClang = function () { this.tone(520, 0.2, 'square', 0.035, 380); this.tone(1040, 0.12, 'triangle', 0.03, null, 0.02); };
Sfx.extra.bonehuntDing = function () { this.tone(880, 0.12, 'triangle', 0.03); };
Sfx.extra.bonehuntBong = function () { [0, 0.55, 1.1].forEach(d => { this.tone(196, 0.9, 'sine', 0.1, null, d); this.tone(392, 0.6, 'triangle', 0.04, null, d); this.tone(587, 0.4, 'sine', 0.025, null, d); }); };
Sfx.extra.bonehuntBoing = function (pitch) { this.tone(160 * pitch, 0.32, 'sine', 0.1, 640 * pitch); this.tone(320 * pitch, 0.2, 'triangle', 0.035, 900 * pitch, 0.06); };
Sfx.extra.bonehuntPoof = function (pitch) { this.tone(600 * pitch, 0.14, 'sine', 0.045, 1200 * pitch); this.tone(300, 0.1, 'sawtooth', 0.012, 160, 0.04); };
Sfx.extra.bonehuntLantern = function () { this.tone(660, 0.07, 'triangle', 0.045); this.tone(990, 0.12, 'triangle', 0.045, null, 0.06); };
Sfx.extra.bonehuntGate = function () { this.tone(180, 0.3, 'sawtooth', 0.02, 260); [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, null, 0.15 + i * 0.07)); };
Sfx.extra.bonehuntGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.bonehuntPop = function () { this.tone(500, 0.12, 'sine', 0.06, 1100); };
Sfx.extra.bonehuntTada = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.035, null, i * 0.09)); };
// a little skeleton jig (xylophone-ish)
Sfx.extra.bonehuntDance = function () { [659, 784, 659, 523, 587, 659, 784, 1047].forEach((f, i) => { this.tone(f, 0.09, 'triangle', 0.05, null, i * 0.18); this.tone(f * 2, 0.04, 'square', 0.012, null, i * 0.18); }); };

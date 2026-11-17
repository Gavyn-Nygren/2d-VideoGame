/* Pip & Bo - Level 35-1 Moonwick Academy: class 10 'beast' (Beast Taming, spell Tame). */
'use strict';

/* ===== 35-1 class 10: Beast Taming (WIZ_PHASES.beast) ===========================================================
   The cloud paddock, scrolling right: Pip and Bo ride one stampeding THUNDERPUFF (a small storm cloud with six stubby
   legs, a wide happy mouth and a static-crackling tail; original to this game). The fastest class. The class draws
   Pip and Bo itself (hide() is true): they sit on its back.

   THE TWO JOBS (room field `first` is the first RIDER; they swap at the two water troughs, where it stops to drink)
   - RIDER (front, action word "hup"): UP (wizUp) jumps (it floats a moment at the top: it's a cloud), DOWN ducks under
     branches and bridges, LEFT / RIGHT slow it down / speed it up inside a window. The action is "Hup!": a short
     charge (WIZBEAST.charge) that smashes hay walls and carries it over the long gaps (rest WIZBEAST.charge.rest s).
   - FEEDER (back, action word "feed"): HUNGER falls all the time. LEFT / RIGHT pick a snack in the bag (cloudberry,
     thunder bun, pepper pod) and the action tosses it. The thought bubble shows the snack it wants: the right one fills
     hunger, a wrong one is spat out, and a pepper pod nobody asked for makes it SNEEZE anyway (a bolt forward and a
     stumble). Before a storm gate or a flock of little puffs the bubble asks for pepper: the sneeze bolt breaks the
     gate / scatters the flock. Empty hunger: it bolts off to graze ("Munch..."), an Oops, back to the last post.
     STATIC rises with each jump and charge; the FEEDER holds DOWN to pet the tail and discharge it. At full static
     the next jump is a wild double-height bound.
   THE COURSE: three runs (the Paddock, Windy Ridge, the Storm Front), hand-made: fences, gaps (long ones need the
   charge), branches / low bridges, hay walls, storm gates, flocks, lightning that aims where the thunderpuff will be
   (a ring on the ground first), and a last huge leap onto the exam lawn. A post every ~900 px is the safe spot.
   FAILS. A fence, branch, hay wall, gate or lightning hit, or a missed gap: it tumbles into a fluffy heap, an Oops,
   back to the last post. GOLD HELP after WIZ.goldAfter Oops in one run: a gold bridle (hunger falls at half speed,
   static doesn't rise, 20 s); after twice that, golden horseshoes: it hops fences and gaps by itself for the rest of
   the run (both announced).
   NEVER ALONE. Nobody riding runs into the first fence; nobody feeding goes hungry and every storm gate stays shut.
   Stats (st.stats.beast): jumps, snacks, sneezes, smashes.   Names: wizBeast* / WIZBEAST* (Sfx.extra.wizBeast*). */
const WIZBEAST = {
  sx: 300, g: 440, len: 5400, gap: 900, start: 500,
  v: 270, vWin: 80, acc: 320,
  body: { w: 100, h: 84, duck: 46 },
  jump: { v: 700, g: 1800, float: 0.35, floatV: 150, wild: 1000 },
  charge: { v: 470, t: 0.8, rest: 2.2 },
  hunger: { fall: 3, feed: 35, low: 25, every: 0.35 },
  stat: { jump: 12, charge: 20, pet: 40, full: 100 },
  sneeze: { range: 560, stumble: 0.7, stumbleV: 140 },
  want: { pepper: 520, change: 7 },
  flock: { v: 90 },
  strike: { lead: 1.3, near: 700, r: 70, on: 0.3 },
  tumbleT: 1.1, graceT: 1.2, goldT: 20, drinkT: 2.0, post: 900,
};
const WIZBEAST_SNACKS = [{ key: 'berry', name: 'cloudberry', col: '#7a6aff' }, { key: 'bun', name: 'thunder bun', col: '#e8c27a' }, { key: 'pepper', name: 'pepper pod', col: '#ff5a3a' }];
// [kind, offset into the run, ...]: fence | gap w | branch | hay | gate | flock | strike | leap w (the last huge gap)
const WIZBEAST_COURSE = [
  [['fence', 600], ['fence', 1050], ['gap', 1450, 150], ['branch', 1850], ['fence', 2250], ['hay', 2700], ['gap', 3150, 160], ['gate', 3600],
    ['fence', 4000], ['branch', 4380], ['gap', 4750, 160], ['fence', 5250]],
  [['gap', 500, 160], ['branch', 880], ['flock', 1300], ['gap', 1750, 300], ['fence', 2350], ['branch', 2900], ['flock', 2950], ['gap', 3350, 160],
    ['hay', 3800], ['gate', 4300], ['gap', 4850, 300], ['branch', 5600]],
  [['strike', 500], ['hay', 950], ['gate', 1400], ['fence', 1800], ['strike', 2150], ['branch', 2550], ['hay', 2950], ['gate', 3400],
    ['gap', 3800, 160], ['strike', 4150], ['fence', 4550], ['gate', 4900], ['leap', 5250, 320]],
];
const WIZBEAST_NEWS = ['The Paddock: jump the fences, duck the branches. Feed it what it asks for!', 'Windy Ridge: long gaps need a "Hup!" charge. Pepper scatters the little puffs!', 'The Storm Front: lightning aims where you\'re going. Change speed or jump!'];
const wizBeastBase = k => WIZBEAST.start + k * (WIZBEAST.len + WIZBEAST.gap);
const wizBeastTroughX = k => wizBeastBase(k) + WIZBEAST.len + WIZBEAST.gap / 2;   // the trough after run k (k 0, 1)
const wizBeastRunAt = x => (x >= wizBeastBase(2) - 300 ? 2 : x >= wizBeastBase(1) - 300 ? 1 : 0);

function wizBeastSetup(st, L) {
  const ph = st.ph, K = WIZBEAST;
  ph.rider = L.def.first || 0; ph.feeder = 1 - ph.rider;
  ph.items = []; ph.posts = [];
  WIZBEAST_COURSE.forEach((list, k) => {
    const b = wizBeastBase(k);
    for (const it of list) {
      const o = { kind: it[0], x: b + it[1], run: k };
      if (o.kind === 'gap' || o.kind === 'leap') { o.w = it[2]; o.x0 = o.x; o.x1 = o.x + o.w; o.x = o.x + o.w / 2; }
      ph.items.push(o);
    }
  });
  // the posts: every WIZBEAST.post px, nudged on to clear ground with nothing just ahead
  const clear = x => ph.items.every(o => (o.kind === 'gap' || o.kind === 'leap' ? x < o.x0 - 200 || x > o.x1 + 100 : o.kind === 'strike' || x < o.x - 300 || x > o.x + 80));
  for (let k = 0; k < 3; k++) { const b = wizBeastBase(k); for (let x0 = b; x0 < b + K.len - 200; x0 += K.post) { let x = x0; while (!clear(x) && x < x0 + 600) x += 25; if (clear(x)) ph.posts.push({ x, run: k }); } }
  ph.end = wizBeastBase(2) + K.len + 200;
  ph.x = K.start - 200; ph.y = K.g; ph.vy = 0; ph.v = 0; ph.air = false; ph.duck = false; ph.wild = false;
  ph.run = 0; ph.mode = 'wait'; ph.modeT = 0; ph.t = 0;
  ph.hunger = 100; ph.static = 0; ph.sel = 0; ph.feedT = 0; ph.want = 'berry'; ph.wantT = 0; ph.spit = 0; ph.munch = 0;
  ph.chargeT = 0; ph.chargeRest = 0; ph.stumble = 0; ph.grace = 0; ph.tumble = 0; ph.gold = 0; ph.shoes = -1;
  ph.bolt = 0; ph.mouth = 0; ph.safe = ph.x; ph.upWas = false; ph.lWas = false; ph.rWas = false;
  const s = wizStats(st); Object.assign(s, { jumps: s.jumps || 0, snacks: s.snacks || 0, sneezes: s.sneezes || 0, smashes: s.smashes || 0 });
  st.cam = { x: ph.x - K.sx, y: 0 };
  Object.assign(st.hm, { x: ph.x + 470, y: 150, s: 0.8, face: -1, pose: 'talk' });
  wizSay(st, 'Beast Taming! Front rides, back feeds. Hold on to your hats!', 3);
  wizNews(st, WIZBEAST_NEWS[0]);
  wizBeastSeat(st);
}
// the riders sit on its back (p.x / p.y kept there for tags, hints and bubbles)
function wizBeastSeat(st) {
  const ph = st.ph, top = ph.y - (ph.duck ? WIZBEAST.body.duck : WIZBEAST.body.h) + 14;
  for (const p of G.players) { const sx = p.id === ph.rider ? 22 : -24; p.x = ph.x + sx - p.w / 2; p.y = top - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.alive = true; p.face = 1; }
}
// the ground under x: none over a gap
function wizBeastGap(ph, x) { for (const o of ph.items) if ((o.kind === 'gap' || o.kind === 'leap') && x > o.x0 + 20 && x < o.x1 - 20) return o; return null; }
// one jump's timing (seconds above height h, and the whole air time), worked out once per height
const WIZBEAST_AIR = {};
function wizBeastAir(h, vy0 = WIZBEAST.jump.v) {
  const key = h + ':' + vy0;
  if (WIZBEAST_AIR[key]) return WIZBEAST_AIR[key];
  const J = WIZBEAST.jump;
  let y = 0, vy = -vy0, t = 0, t1 = null, t2 = null;
  while (t < 3) { vy += J.g * (Math.abs(vy) < J.floatV ? J.float : 1) * DT; y += vy * DT; t += DT; if (-y > h && t1 == null) t1 = t; if (t1 != null && t2 == null && -y < h) t2 = t; if (y >= 0) break; }
  return (WIZBEAST_AIR[key] = { t1: t1 || 0, t2: t2 || t, T: t });
}
// what is ahead (from the body's front), nearest first
function wizBeastAhead(ph, from, to) {
  return ph.items.filter(o => !o.gone && (o.kind === 'gap' || o.kind === 'leap' ? o.x1 : o.x + 60) > ph.x + from && (o.kind === 'gap' || o.kind === 'leap' ? o.x0 : o.x - 60) < ph.x + to).sort((a, b) => (a.x0 || a.x) - (b.x0 || b.x));
}
function wizBeastWantNow(ph) {
  const K = WIZBEAST;
  for (const o of ph.items) if ((o.kind === 'gate' || o.kind === 'flock') && !o.gone && o.x - ph.x > 60 && o.x - ph.x < K.want.pepper) return 'pepper';
  return ph.want === 'pepper' ? 'berry' : ph.want;
}
// the plan: what a sensible RIDER and FEEDER do now
function wizBeastPlan(st) {
  const ph = st.ph, K = WIZBEAST, B = K.body, out = [null, null];
  const R = { why: 'ride', jump: false, duck: false, charge: false, spd: 0 }, Fd = { why: 'feed', pick: 0, toss: false, pet: false };
  out[ph.rider] = R; out[ph.feeder] = Fd;
  if (ph.mode !== 'run') return out;
  const v = Math.max(ph.v, 120), half = B.w / 2;
  for (const o of wizBeastAhead(ph, -half - 20, 700)) {
    const d = o.x - ph.x;
    if (o.kind === 'fence') {
      const a = wizBeastAir(52), lo = v * a.t1 + half + 12, hi = v * a.t2 - half - 12;
      if (d <= (lo + hi) / 2 && d > lo - 30) { R.jump = true; R.why = 'jump'; }
      break;
    }
    if (o.kind === 'gap' || o.kind === 'leap') {
      const d0 = o.x0 - ph.x, long = o.w > 200;
      if (long && d0 < 300 && d0 > -10 && ph.chargeRest <= 0 && ph.chargeT <= 0 && !ph.air) { R.charge = true; R.why = 'charge'; }
      const vv = ph.chargeT > 0 ? K.charge.v : v, T = wizBeastAir(0).T;
      if (d0 <= Math.min(50, vv * T - o.w + 10) && d0 > -30) { R.jump = true; R.why = 'jump'; }
      if (long && ph.chargeT <= 0 && ph.chargeRest > 0 && d0 > 0 && d0 < 600) R.spd = -1;   // (the charge isn't ready: slow down)
      break;
    }
    if (o.kind === 'branch') { if (d - 50 - half < 70 && d + 50 > -half) { R.duck = true; R.why = 'duck'; } if (d > 120) continue; break; }
    if (o.kind === 'hay') { if (d - half < K.charge.v * 0.55 && ph.chargeRest <= 0 && ph.chargeT <= 0) { R.charge = true; R.why = 'charge'; } else if (ph.chargeT <= 0 && ph.chargeRest > 0 && d < 700) R.spd = -1; break; }
    if (o.kind === 'gate' || o.kind === 'flock') { if (d < 700) R.spd = -1; R.why = 'wait'; if (d > 260) continue; break; }
    if (o.kind === 'strike' && o.warn > 0) {
      const tx = o.tx, at = ph.x + v * o.warn;
      if (Math.abs(at - tx) < K.strike.r + half + 20 && o.warn < 0.45 && !ph.air) { R.jump = true; R.why = 'jump'; }
      continue;
    }
  }
  if (ph.air || ph.static >= K.stat.full) R.jump = R.jump && !ph.air && !wizBeastBranchNear(ph);
  // the FEEDER: the snack it wants, pepper only when asked; pet the tail when the static is high and nothing's needed
  const want = wizBeastWantNow(ph), wi = WIZBEAST_SNACKS.findIndex(s => s.key === want);
  const need = want === 'pepper' || ph.hunger < 70;
  if (need) {
    if (ph.sel !== wi) { Fd.pick = ((wi - ph.sel + 3) % 3) === 1 ? 1 : -1; Fd.why = 'pick'; }
    else if (ph.feedT <= 0) { Fd.toss = true; Fd.why = want === 'pepper' ? 'pepper' : 'toss'; }
  } else if (ph.static > 45) { Fd.pet = true; Fd.why = 'pet'; }
  return out;
}
function wizBeastBranchNear(ph) { return ph.items.some(o => o.kind === 'branch' && o.x - ph.x > -80 && o.x - ph.x < 260); }
function wizBeastTumble(st, word) {
  const ph = st.ph;
  if (ph.grace > 0 || ph.tumble > 0) return;
  if (!wizTeamOops(st, { word, x: ph.x, y: ph.y - 110, kind: 'beast' })) return;
  ph.tumble = WIZBEAST.tumbleT; ph.v = 0; ph.chargeT = 0; Sfx.play('wizBeastTumble');
  const n = wizMiss(st, 'b' + ph.run);
  wizReact(st, 'calm', ['Gently! It\'s only a baby.', 'Fluffy landing, at least.', 'Steady the beast, dears.'][n % 3], 2);
  if (n >= WIZ.goldAfter && wizGoldOnce(st, 'bridle' + ph.run, 'Gold bridle! For 20 s it stays fed longer and the static stays down.')) ph.gold = WIZBEAST.goldT;
  if (n >= WIZ.goldAfter * 2 && wizGoldOnce(st, 'shoes' + ph.run, 'Golden horseshoes! It hops the fences and gaps by itself for the rest of this run.')) ph.shoes = ph.run;
}
function wizBeastJump(st, wild) {
  const ph = st.ph, K = WIZBEAST;
  ph.air = true; ph.vy = -(wild ? K.jump.wild : K.jump.v); ph.wild = wild; wizStats(st).jumps++;
  if (wild) { ph.static = 10; wizPop(st, ph.x, ph.y - 120, 'Wild bound!', '#ffe14a', 20); Sfx.play('wizBeastWild'); }
  else { if (ph.gold <= 0) ph.static = Math.min(K.stat.full, ph.static + K.stat.jump); Sfx.play('wizBeastJump'); }
}
function wizBeastSneeze(st, asked) {
  const ph = st.ph, K = WIZBEAST;
  wizStats(st).sneezes++; ph.bolt = 0.35; Sfx.play('wizBeastSneeze');
  wizPop(st, ph.x + 60, ph.y - 100, 'A-CHOO!', '#ffe14a', 22);
  for (const o of ph.items) if ((o.kind === 'gate' || o.kind === 'flock') && !o.gone && o.x - ph.x > 0 && o.x - ph.x < K.sneeze.range) { o.gone = true; o.goneT = 0; wizSparks(o.x, K.g - 80, 'tame', 14); wizPop(st, o.x, K.g - 160, o.kind === 'gate' ? 'Gate down!' : 'Scatter!', '#ffffff', 18); break; }
  if (!asked) { ph.stumble = K.sneeze.stumble; wizPop(st, ph.x, ph.y - 130, 'It didn\'t want pepper!', '#ff9a8a', 15); }
}
function wizBeastFeed(st, p) {
  const ph = st.ph, K = WIZBEAST, s = WIZBEAST_SNACKS[ph.sel], want = wizBeastWantNow(ph);
  if (ph.feedT > 0) return;
  ph.feedT = K.hunger.every; ph.mouth = 0.3;
  if (s.key === 'pepper') { wizBeastSneeze(st, want === 'pepper'); if (want === 'pepper') { ph.hunger = Math.min(100, ph.hunger + 10); } return; }
  if (s.key === want) {
    ph.hunger = Math.min(100, ph.hunger + K.hunger.feed); wizStats(st).snacks++; Sfx.play('wizBeastMunch');
    wizPop(st, ph.x + 40, ph.y - 100, 'Yum!', '#9fe07f', 16);
    ph.want = s.key === 'berry' ? 'bun' : 'berry'; if ((wizStats(st).snacks * 7) % 3 === 0) ph.want = s.key; ph.wantT = 0;
  } else { ph.spit = 0.6; Sfx.play('wizBeastSpit'); wizPop(st, ph.x + 40, ph.y - 100, 'Ptoo!', '#ffffff', 16); wizHint(st, p.id, 'It wants the ' + WIZBEAST_SNACKS.find(q => q.key === want).name + '!', { cpu: 'Wrong snack, sorry!' }); }
}
function wizBeastStep(st, dt) {
  const ph = st.ph, K = WIZBEAST, B = K.body, ps = G.players, rp = ps[ph.rider], fp = ps[ph.feeder];
  ph.t += dt; ph.modeT += dt;
  for (const p of ps) { p.vx = 0; p.vy = 0; }
  if (st.idle) { wizBeastCoast(st, dt); return; }
  for (const k of ['grace', 'gold', 'feedT', 'spit', 'mouth', 'bolt', 'stumble', 'chargeRest']) ph[k] = Math.max(0, ph[k] - dt);
  const hupP = rp.pendingAct, feedP = fp.pendingAct; rp.pendingAct = fp.pendingAct = false; rp.pendingJump = fp.pendingJump = false;
  for (const o of ph.items) if (o.gone && o.goneT != null) o.goneT += dt;
  if (ph.mode === 'drink') {
    if (ph.modeT >= K.drinkT) { ph.mode = 'wait'; ph.modeT = 0; wizNews(st, WIZBEAST_NEWS[ph.run]); }
    wizBeastSeat(st); wizBeastCam(st, dt); return;
  }
  if (ph.tumble > 0) {
    ph.tumble -= dt;
    if (ph.tumble <= 0) {
      const post = ph.posts.filter(q => q.x <= ph.x - 60).pop();
      ph.x = post ? post.x : wizBeastBase(ph.run); ph.y = K.g; ph.vy = 0; ph.air = false; ph.v = 0; ph.mode = 'wait'; ph.modeT = 0.4; ph.grace = K.graceT;
      ph.hunger = Math.max(ph.hunger, 70); ph.static = Math.min(ph.static, 40);
      for (const o of ph.items) if (o.x > ph.x && o.run === ph.run) { if (o.kind === 'strike') { o.warn = 0; o.done = false; o.hit = 0; } if ((o.kind === 'gate' || o.kind === 'flock' || o.kind === 'hay') && o.gone) { o.gone = false; o.goneT = null; } }
    }
    wizBeastSeat(st); wizBeastCam(st, dt); return;
  }
  if (ph.mode === 'wait') {
    ph.v = 0; ph.y = K.g;
    if (ph.modeT >= 1.2) { ph.mode = 'run'; ph.modeT = 0; Sfx.play('wizSpell_tame'); }
    wizBeastSeat(st); wizBeastCam(st, dt); return;
  }
  if (ph.mode === 'done') { ph.v = Math.max(0, ph.v - 300 * dt); ph.x += ph.v * dt; wizBeastSeat(st); wizBeastCam(st, dt); return; }
  // --- the RIDER ---
  const upNow = wizUp(rp), dn = !!rp.input.down && !upNow;
  const auto = ph.shoes === ph.run ? wizBeastPlan(st)[ph.rider] : null;
  if (((upNow && !ph.upWas) || (auto && auto.jump)) && !ph.air) wizBeastJump(st, ph.static >= K.stat.full && ph.gold <= 0);
  ph.upWas = upNow;
  ph.duck = (dn || !!(auto && auto.duck)) && !ph.air;
  if ((hupP || (auto && auto.charge)) && ph.chargeRest <= 0 && ph.chargeT <= 0) {
    ph.chargeT = K.charge.t; ph.chargeRest = K.charge.rest + K.charge.t; Sfx.play('wizBeastHup');
    wizPop(st, ph.x + 30, ph.y - 120, 'Hup!', '#ffd23f', 20);
    if (ph.gold <= 0) ph.static = Math.min(K.stat.full, ph.static + K.stat.charge);
  } else if (hupP && ph.chargeRest > 0) wizPop(st, ph.x + 30, ph.y - 120, 'Catching its breath...', '#ffffff', 13);
  // speed: inside a window around WIZBEAST.v, the charge, a stumble, hunger, a flock
  let want = K.v + K.vWin * ((rp.input.right ? 1 : 0) - (rp.input.left ? 1 : 0));
  if (ph.hunger < K.hunger.low) want = Math.min(want, 200);
  if (ph.stumble > 0) want = K.sneeze.stumbleV;
  if (ph.chargeT > 0) { ph.chargeT -= dt; ph.v = K.charge.v; }
  else if (!ph.air) ph.v = approach(ph.v, want, K.acc * dt);
  for (const o of ph.items) if (o.kind === 'flock' && !o.gone && Math.abs(o.x - ph.x) < 60 + B.w / 2) { ph.v = Math.min(ph.v, K.flock.v); if (!o.said) { o.said = true; wizPop(st, o.x, K.g - 90, 'Puff-puff!', '#ffffff', 15); } }
  // --- the FEEDER: the bag, the toss, petting ---
  const fl = !!fp.input.left, fr = !!fp.input.right;
  if (fl && !ph.lWas) { ph.sel = (ph.sel + 2) % 3; Sfx.play('wizBeastTick'); }
  if (fr && !ph.rWas) { ph.sel = (ph.sel + 1) % 3; Sfx.play('wizBeastTick'); }
  ph.lWas = fl; ph.rWas = fr;
  if (feedP) wizBeastFeed(st, fp);
  ph.petting = !!fp.input.down && !wizUp(fp);
  if (ph.petting) ph.static = Math.max(0, ph.static - K.stat.pet * dt);
  ph.hunger = Math.max(0, ph.hunger - K.hunger.fall * (ph.gold > 0 ? 0.5 : 1) * dt);
  ph.wantT += dt; if (ph.wantT > K.want.change) { ph.wantT = 0; ph.want = ph.want === 'berry' ? 'bun' : 'berry'; }
  if (ph.hunger <= 0) {
    ph.munch = 1.4; wizBeastTumble(st, 'Munch... it went grazing!');
    wizHint(st, ph.feeder, 'Feed it before it gets hungry! ' + wizKey(ph.feeder, 'act'), { cpu: 'Oops, I forgot to feed it!' });
    return;
  }
  // --- moving ---
  ph.x += ph.v * dt;
  if (ph.air) {
    const J = K.jump;
    ph.vy += J.g * (Math.abs(ph.vy) < J.floatV ? J.float : 1) * dt; ph.y += ph.vy * dt;
    if (ph.y >= K.g && ph.vy > 0 && !wizBeastGap(ph, ph.x)) { ph.y = K.g; ph.vy = 0; ph.air = false; ph.wild = false; Sfx.play('wizBeastLand'); }
  } else if (wizBeastGap(ph, ph.x)) { ph.air = true; ph.vy = 0; }
  if (ph.y > K.g + 60) { wizBeastTumble(st, 'Whoops! Down the gap.'); return; }
  // --- bumps ---
  const top = ph.y - (ph.duck ? B.duck : B.h), x0 = ph.x - B.w / 2, x1 = ph.x + B.w / 2;
  const hit = (a0, b0, a1, b1) => x1 > a0 && x0 < a1 && ph.y > b0 && top < b1;
  for (const o of ph.items) {
    if (o.gone || Math.abs(o.x - ph.x) > 800) continue;
    switch (o.kind) {
      case 'fence': if (hit(o.x - 8, K.g - 50, o.x + 8, K.g)) wizBeastTumble(st, 'Fence!'); break;
      case 'branch': if (hit(o.x - 50, -100, o.x + 50, K.g - 62)) wizBeastTumble(st, o.run === 1 ? 'Bridge! Duck!' : 'Branch! Duck!'); break;
      case 'hay': if (hit(o.x - 26, K.g - 190, o.x + 26, K.g)) { if (ph.chargeT > 0) { o.gone = true; o.goneT = 0; wizStats(st).smashes++; Sfx.play('wizBeastSmash'); wizPop(st, o.x, K.g - 200, 'Smash!', '#ffe08a', 22); burst(o.x, K.g - 80, '#e8c860', 16); } else wizBeastTumble(st, 'Hay wall! Hup through it!'); } break;
      case 'gate': if (hit(o.x - 14, -100, o.x + 14, K.g)) wizBeastTumble(st, 'Zap! The storm gate.'); break;
      case 'strike': {
        if (o.done) break;
        if (!o.warn && o.x - ph.x < K.strike.near) { o.warn = K.strike.lead; o.tx = ph.x + ph.v * K.strike.lead; Sfx.play('wizBeastRumble'); }
        else if (o.warn > 0) { o.warn -= dt; if (o.warn <= 0) { o.warn = 0; o.done = true; o.hit = K.strike.on; Sfx.play('wizBeastBolt'); if (!ph.air && Math.abs(ph.x - o.tx) < K.strike.r + B.w / 2 - 10) wizBeastTumble(st, 'Crackle! Lightning!'); } }
        break;
      }
    }
    if (o.hit > 0) o.hit -= dt;
  }
  if (ph.tumble > 0) return;
  // posts (safe spots), the troughs, the end
  for (const q of ph.posts) if (!q.passed && ph.x >= q.x) { q.passed = true; ph.safe = q.x; if (q.x > wizBeastBase(q.run) + 10) Sfx.play('wizTick'); }
  if (ph.run < 2 && ph.x >= wizBeastTroughX(ph.run) - 40) {
    ph.x = wizBeastTroughX(ph.run) - 40; ph.v = 0; ph.air = false; ph.y = K.g; ph.run++; ph.mode = 'drink'; ph.modeT = 0; ph.hunger = 100; ph.static = 0; ph.chargeRest = 0; ph.chargeT = 0;
    [ph.rider, ph.feeder] = [ph.feeder, ph.rider]; wizSwap(st); Sfx.play('wizBeastDrink');
    wizSay(st, 'A drink at the trough. Swap places!', 2.4);
  }
  if (ph.run === 2 && ph.x >= ph.end) { ph.mode = 'done'; wizPhaseDone(st, { say: 'What a ride! Tame is yours, and it likes you.' }); }
  wizBeastSeat(st); wizBeastCam(st, dt); wizBeastHints(st);
}
function wizBeastHints(st) {
  const ph = st.ph;
  if (ph.mode !== 'run' || ph.grace > 0) return;
  const P = wizBeastPlan(st), R = P[ph.rider], Fd = P[ph.feeder];
  if (!st.hints[ph.rider]) {
    if (R.why === 'jump') wizHint(st, ph.rider, 'Jump! ' + wizKey(ph.rider, 'up'), { cpu: 'Hup, over!', life: 1.2 });
    else if (R.why === 'duck') wizHint(st, ph.rider, 'Duck! ' + wizKey(ph.rider, 'down'), { cpu: 'Heads down!', life: 1.2 });
    else if (R.why === 'charge') wizHint(st, ph.rider, 'Charge! ' + wizKey(ph.rider, 'act'), { cpu: 'Hup! Hup!', life: 1.2 });
  }
  if (!st.hints[ph.feeder]) {
    if (Fd.why === 'pepper') wizHint(st, ph.feeder, 'Pepper! Make it sneeze at the gate! ' + wizKey(ph.feeder, 'act'), { cpu: 'Pepper time!', life: 1.4 });
    else if (ph.hunger < 40 && Fd.why === 'toss') wizHint(st, ph.feeder, 'It\'s hungry! Toss the snack: ' + wizKey(ph.feeder, 'act'), { cpu: 'Snack time!', life: 1.4 });
    else if (Fd.why === 'pet' && ph.static > 80) wizHint(st, ph.feeder, 'Too much static! Pet the tail: hold ' + wizKey(ph.feeder, 'down'), { cpu: 'Petting the tail!', life: 1.4 });
  }
}
function wizBeastCam(st, dt) {
  const ph = st.ph, c = st.hm;
  st.cam.x = ph.x - WIZBEAST.sx; st.cam.y = 0;
  c.x += (ph.x + 470 - c.x) * Math.min(1, (dt || 0) * 2); c.y = 150 + Math.sin(ph.t * 0.9) * 14; c.face = -1;
  if (c.pose === 'talk' && !st.say) c.pose = 'idle';
}
function wizBeastCoast(st, dt) {
  const ph = st.ph;
  if (!ph.items) { wizCoast(dt); return; }
  wizBeastSeat(st); wizBeastCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizBeastDrawBack(st) {
  const ph = st.ph, K = WIZBEAST, cx = st.cam.x, t = G.clock, k = wizBeastRunAt(cx + W / 2);
  wizScreen(st, () => {
    if (k < 2) wizDusk(t, cx, 0, { skyY: K.g + 4 });
    else { const g = ctx.createLinearGradient(0, 0, 0, K.g); g.addColorStop(0, '#2a2a40'); g.addColorStop(1, '#4a4a66'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // far hills
    ctx.fillStyle = k === 1 ? '#5a5a78' : k === 2 ? '#30304a' : '#4a7a6a';
    ctx.beginPath(); ctx.moveTo(0, K.g); for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, K.g - 70 - Math.sin((x + cx * 0.3) * 0.006) * 40 - Math.sin((x + cx * 0.3) * 0.017) * 14); ctx.lineTo(W, K.g); ctx.closePath(); ctx.fill();
    // a nearer, darker rise with a lit crest
    const near = k === 1 ? '#4c4c6a' : k === 2 ? '#262640' : '#3e6a5c';
    ctx.fillStyle = near; ctx.beginPath(); ctx.moveTo(0, K.g);
    for (let x = 0; x <= W + 40; x += 30) ctx.lineTo(x, K.g - 26 - Math.sin((x + cx * 0.55) * 0.011) * 16);
    ctx.lineTo(W + 40, K.g); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,220,0.14)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W + 40; x += 30) { const y = K.g - 26 - Math.sin((x + cx * 0.55) * 0.011) * 16; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    if (k === 2) { ctx.strokeStyle = 'rgba(180,190,230,0.35)'; ctx.lineWidth = 1.5; for (let n = 0; n < 40; n++) { const x = ((n * 97 + t * 60) % (W + 40)) - 20, y = ((n * 53 + t * 520) % (H + 20)) - 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke(); } }
  });
  // the ground (none over the gaps), the troughs
  // (art pass) each run's ground is a cached texture pinned to the world, drawn once per stretch of same-run columns
  // (clipped to it): turf and soil on the paddock, frosted flagstones on the cloud road, wet rock in the storm
  { let run = null;
    const gh = Math.ceil(H - K.g), flush = () => {
      if (!run) return;
      const { r, a, b } = run; run = null;
      if (r === 0) { wizLawn(a, K.g, b, H, { top: '#79c47e', body: '#5fae66', noFlowers: true }); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(a, K.g, b - a, H - K.g); ctx.clip();
      RICH.strip('wizbst' + r + '|' + gh, a, b, K.g, gh, 256, (c, gx, w, h) => {
        if (r === 1) { RICH.flags(c, 0, 7, w, h - 7, { col: '#8a8aa0', course: 22, len: 52, seed: 41, gx, fade: 0.35 }); RICH.flags(c, 0, 0, w, 7, { col: '#a8a8bc', course: 7, len: 64, seed: 42, gx }); c.fillStyle = 'rgba(255,255,255,0.55)'; for (let X = Math.ceil(gx / 11) * 11; X < gx + w; X += 11) { c.beginPath(); c.ellipse(X - gx + 5, 1, 4 + RICH.r(X, 5) * 4, 2 + RICH.r(X, 6) * 2, 0, 0, Math.PI * 2); c.fill(); } }
        else { RICH.rock(c, 0, 0, w, h, { col: '#4a5a5a', gx, seed: 43, wet: true }); c.fillStyle = '#5e7070'; c.fillRect(0, 0, w, 7); c.fillStyle = 'rgba(160,200,220,0.35)'; for (let X = Math.ceil(gx / 60) * 60; X < gx + w; X += 60) { if (RICH.r(X, 7) < 0.5) { c.beginPath(); c.ellipse(X - gx + 20, 4, 12, 2, 0, 0, Math.PI * 2); c.fill(); } } }
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, 0, w, 2); c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(0, 7, w, 3);
      });
      ctx.restore();
    };
    for (let xx = Math.floor((cx - 40) / 20) * 20; xx < cx + W + 40; xx += 20) {
      if (ph.items.some(o => (o.kind === 'gap' || o.kind === 'leap') && xx + 10 > o.x0 && xx + 10 < o.x1)) { flush(); continue; }
      const r = wizBeastRunAt(xx);
      if (run && run.r === r) run.b = xx + 21; else { flush(); run = { r, a: xx, b: xx + 21 }; }
    }
    flush(); }
  for (let xx = Math.floor((cx - 40) / 20) * 20; xx < cx + W + 40; xx += 20) {
    if (ph.items.some(o => (o.kind === 'gap' || o.kind === 'leap') && xx + 10 > o.x0 && xx + 10 < o.x1)) continue;
    const r = wizBeastRunAt(xx);
    const hh = hash(xx, 41);
    ctx.fillStyle = r === 1 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.14)';
    if (r === 0 && hh % 4 === 1) { ctx.fillStyle = '#79c47e'; ctx.beginPath(); ctx.moveTo(xx + 6, K.g + 1); ctx.lineTo(xx + 9, K.g - 5); ctx.lineTo(xx + 12, K.g + 1); ctx.fill(); }
    if (r === 1 && hh % 4 === 1) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(xx + 10, K.g + 1, 5); ctx.fill(); }
  }
  for (const o of ph.items) if ((o.kind === 'gap' || o.kind === 'leap') && o.x1 > cx - 40 && o.x0 < cx + W + 40) {
    ctx.fillStyle = 'rgba(200,220,255,0.35)'; for (let n = 0; n < 4; n++) { circle(o.x0 + 30 + n * (o.w - 60) / 3, K.g + 60 + Math.sin(t * 2 + n) * 6, 26); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x0, K.g); ctx.lineTo(o.x0, H); ctx.moveTo(o.x1, K.g); ctx.lineTo(o.x1, H); ctx.stroke();
  }
  for (let r = 0; r < 2; r++) {
    const tx = wizBeastTroughX(r);
    if (Math.abs(tx - (cx + W / 2)) > W) continue;
    // (art pass) a planked trough with iron bands and rippled water (cached)
    RICH.pic('wizbsttrough', 110, 44, (c, w, h) => {
      RICH.wood(c, 0, 0, w, h, { col: WIZC.woodDk, boards: 3, seam: 0, r: 6, seed: 3, edge: false });
      for (const x of [16, w - 22]) { c.fillStyle = '#3e3a48'; c.fillRect(x, 0, 6, h); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x, 0, 1.2, h); RICH.rivet(c, x + 3, 12, 1.1, '#5a5868'); RICH.rivet(c, x + 3, h - 10, 1.1, '#5a5868'); }
      c.fillStyle = '#6aaee8'; c.fillRect(8, 6, 94, 10); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(12, 7, 30, 1.5); c.fillRect(56, 9, 20, 1.2); c.fillStyle = 'rgba(30,70,120,0.35)'; c.fillRect(8, 14, 94, 2);
    }, tx + 10, K.g - 44);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(tx + 10, K.g - 44, 110, 44, 6); ctx.stroke();
    text('Swap!', tx + 65, K.g + 36, 16, '#ffe9a8', 'center');
  }
  for (const q of ph.posts) if (q.x > cx - 40 && q.x < cx + W + 40 && q.x > wizBeastBase(q.run) + 10) { RICH.pic('wizbstpost', 8, 70, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: WIZC.woodDk, vert: true, bw: 8, seed: 2, edge: false }); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 10, w, 10); }, q.x - 4, K.g - 70); ctx.fillStyle = q.passed ? '#ffd23f' : '#c8ccd8'; ctx.beginPath(); ctx.moveTo(q.x + 4, K.g - 70); ctx.lineTo(q.x + 30, K.g - 62); ctx.lineTo(q.x + 4, K.g - 54); ctx.fill(); }
  if (ph.end > cx && ph.end < cx + W + 400) { ctx.fillStyle = '#7ac47e'; ctx.fillRect(ph.end - 120, K.g, 2000, 8); text('The exam lawn', ph.end + 40, K.g + 40, 16, '#ffe9a8', 'center'); }
}
function wizBeastDraw(st) {
  const ph = st.ph, K = WIZBEAST, cx = st.cam.x, t = G.clock;
  ctx.lineJoin = 'round';
  for (const o of ph.items) {
    if (o.x < cx - 200 || o.x > cx + W + 200) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    switch (o.kind) {
      case 'fence': // (art pass) whitewashed, grained posts and rails with nails (cached)
        for (const dx of [-8, 8]) { RICH.pic('wizbstfpost', 8, 54, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: '#e8dcc0', vert: true, bw: 8, seed: 3, edge: false }); c.fillStyle = 'rgba(90,70,40,0.3)'; c.fillRect(0, h - 8, w, 8); }, o.x + dx - 4, K.g - 54); ctx.strokeRect(o.x + dx - 4, K.g - 54, 8, 54); }
        for (const ry of [K.g - 46, K.g - 26]) RICH.pic('wizbstfrail', 28, 8, (c, w, h) => { RICH.wood(c, 0, 0, w, h, { col: '#e8dcc0', seed: 4, edge: false }); RICH.nail(c, 6, 4, 1); RICH.nail(c, 22, 4, 1); }, o.x - 14, ry);
        ctx.fillStyle = '#e8dcc0'; ctx.strokeRect(o.x - 14, K.g - 46, 28, 8); ctx.strokeRect(o.x - 14, K.g - 26, 28, 8); break;
      case 'branch': {
        if (o.run === 1) { ctx.fillStyle = WIZC.stone; ctx.fillRect(o.x - 54, 0, 108, K.g - 62); ctx.strokeRect(o.x - 54, -4, 108, K.g - 58); ctx.fillStyle = WIZC.stoneDk; ctx.fillRect(o.x - 54, K.g - 80, 108, 18); }
        else { ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(o.x - 120, 0); ctx.quadraticCurveTo(o.x - 40, K.g - 120, o.x + 54, K.g - 70); ctx.stroke(); ctx.fillStyle = '#4f9a58'; for (let n = 0; n < 5; n++) { circle(o.x - 40 + n * 22, K.g - 76 + (n % 2) * 6, 13); ctx.fill(); } }
        break;
      }
      case 'hay': {
        if (o.gone) { ctx.fillStyle = '#e8c860'; for (let n = 0; n < 8; n++) { const a = n * 0.8, r = (o.goneT || 0) * 260; ctx.fillRect(o.x + Math.cos(a) * r, K.g - 90 + Math.sin(a) * r + (o.goneT || 0) * (o.goneT || 0) * 600, 14, 8); } break; }
        // (art pass) straw bales: combed straw in a shaded block with loose ends and two twine bands (cached)
        ctx.strokeStyle = C.ink; for (let n = 0; n < 4; n++) {
          RICH.pic('wizbsthay|' + (n % 2), 56, 46, (c, w, h) => {
            c.save(); RICH.rr(c, 0, 0, w, h, 6); c.clip();
            c.fillStyle = '#e8c860'; c.fillRect(0, 0, w, h);
            c.lineWidth = 1; for (let k = 0; k < 90; k++) { const x = RICH.r(n + 60, k) * w, y = RICH.r(n + 61, k) * h, l = 4 + RICH.r(n + 62, k) * 8; c.strokeStyle = RICH.r(n + 63, k) < 0.5 ? 'rgba(170,120,30,0.55)' : 'rgba(255,240,170,0.7)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (RICH.r(n + 64, k) - 0.5) * 3); c.stroke(); }
            c.fillStyle = 'rgba(120,80,20,0.25)'; c.fillRect(w - 10, 0, 10, h); c.fillRect(0, h - 7, w, 7); c.fillStyle = 'rgba(255,250,210,0.35)'; c.fillRect(0, 0, w, 3);
            for (const x of [15, w - 17]) { c.fillStyle = '#8a5a2a'; c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(255,230,180,0.4)'; c.fillRect(x, 0, 1, h); }
            c.restore();
          }, o.x - 28, K.g - 48 * (n + 1));
          rr(o.x - 28, K.g - 48 * (n + 1), 56, 46, 6); ctx.stroke(); }
        break;
      }
      case 'gate': {
        ctx.fillStyle = WIZC.stoneDk; ctx.fillRect(o.x - 40, K.g - 230, 18, 230); ctx.fillRect(o.x + 22, K.g - 230, 18, 230);
        if (o.gone && (o.goneT || 0) > 0.6) break;
        ctx.save(); if (o.gone) ctx.globalAlpha = 1 - (o.goneT || 0) / 0.6;
        ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 3;
        for (let n = 0; n < 4; n++) { ctx.beginPath(); let y = K.g - 220; ctx.moveTo(o.x - 22, y); while (y < K.g) { y += 18; ctx.lineTo(o.x + Math.sin(t * 30 + n * 7 + y) * 16, y); } ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'flock': {
        if (o.gone) { for (let n = 0; n < 5; n++) { const a = -0.4 - n * 0.5; wizBeastDrawPuff(o.x + Math.cos(a) * (o.goneT || 0) * 300, K.g - 30 + Math.sin(a) * (o.goneT || 0) * 300, 0.35); } break; }
        for (let n = 0; n < 5; n++) wizBeastDrawPuff(o.x - 50 + n * 25, K.g - 6 - Math.abs(Math.sin(t * 8 + n)) * 10, 0.32, n % 2 ? 1 : -1);
        break;
      }
      case 'strike': {
        if (o.warn > 0) { ctx.save(); ctx.strokeStyle = '#ffe14a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 20); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(o.tx, K.g, K.strike.r, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        if (o.hit > 0) { ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 6; ctx.beginPath(); let y = 0, x = o.tx; ctx.moveTo(x, y); while (y < K.g) { y += 40; x = o.tx + Math.sin(y * 13.1) * 24; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = 'rgba(255,250,200,0.5)'; circle(o.tx, K.g, K.strike.r); ctx.fill(); }
        break;
      }
    }
  }
}
// a thunderpuff (s 1 is the ridden one; little ones for the flocks)
function wizBeastDrawPuff(x, y, s, face = 1, o = {}) {
  const t = G.clock, h = (o.duck ? 0.6 : 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  // six stubby legs
  ctx.fillStyle = '#6a6e80'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  for (let n = 0; n < 6; n++) { const lx = -48 + n * 19, run = o.run ? Math.sin(t * 22 + n * 1.7) * 6 : 0; rr(lx - 6 + run, -18, 12, 18 - Math.max(0, run * 0.5), 5); ctx.fill(); ctx.stroke(); }
  // the tail, crackling
  ctx.strokeStyle = o.stat > 0.6 ? '#ffe14a' : '#b8bccc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-58, -40 * h); ctx.lineTo(-78, -56 * h); ctx.lineTo(-70, -60 * h); ctx.lineTo(-92, -78 * h); ctx.stroke();
  if (o.stat > 0.3) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; for (let n = 0; n < Math.ceil(o.stat * 4); n++) { const a = t * 13 + n * 1.9; ctx.beginPath(); ctx.moveTo(-92, -78 * h); ctx.lineTo(-92 + Math.cos(a) * 14, -78 * h + Math.sin(a) * 14); ctx.stroke(); } }
  // the fluffy body
  const bodyCol = o.gold ? '#f0e0a0' : '#c8ccd8', dk = o.gold ? '#c8a840' : '#9a9eb0';
  ctx.fillStyle = bodyCol; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  const puffs = [[-40, -44, 28], [-14, -60, 32], [16, -62, 32], [42, -46, 28], [0, -38, 40]];
  ctx.beginPath(); for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py * h); ctx.arc(px, py * h, r, 0, Math.PI * 2); } ctx.stroke();
  for (const [px, py, r] of puffs) { circle(px, py * h, r); ctx.fill(); }
  ctx.fillStyle = dk; circle(-20, -30 * h, 14); ctx.fill(); circle(18, -26 * h, 12); ctx.fill();
  // the face: a wide happy mouth (open while eating), eyes
  ctx.fillStyle = '#ffffff'; circle(44, -58 * h, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(46, -58 * h, 4); ctx.fill();
  ctx.fillStyle = '#5a2a3a'; ctx.beginPath();
  if (o.mouth) { ctx.ellipse(52, -36 * h, 14, 12, 0, 0, Math.PI * 2); } else { ctx.moveTo(34, -40 * h); ctx.quadraticCurveTo(52, -24 * h, 66, -42 * h); ctx.closePath(); }
  ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function wizBeastDrawRide(st) {
  const ph = st.ph, K = WIZBEAST, t = G.clock, blink = ph.grace > 0 && Math.sin(t * 30) > 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.55;
  if (ph.tumble > 0) { const k = 1 - ph.tumble / K.tumbleT; ctx.translate(ph.x, ph.y - 40); ctx.rotate(k * Math.PI * 2); ctx.translate(-ph.x, -(ph.y - 40)); }
  const tilt = ph.air ? clamp(ph.vy / 2400, -0.18, 0.18) : 0;
  ctx.translate(ph.x, ph.y); ctx.rotate(tilt); ctx.translate(-ph.x, -ph.y);
  if (ph.chargeT > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; for (let n = 0; n < 4; n++) { ctx.beginPath(); ctx.moveTo(ph.x - 70 - n * 10, ph.y - 70 + n * 16); ctx.lineTo(ph.x - 120 - n * 10, ph.y - 70 + n * 16); ctx.stroke(); } }
  wizBeastDrawPuff(ph.x, ph.y, 1, 1, { run: ph.mode === 'run' && !ph.air, duck: ph.duck, mouth: ph.mouth > 0 || ph.mode === 'drink' || ph.munch > 0, stat: ph.static / K.stat.full, gold: ph.gold > 0 || ph.shoes === ph.run });
  // the riders: front (rider, holding the ear tufts) and back (feeder, with the snack bag); they hop over at a swap
  const top = ph.y - (ph.duck ? K.body.duck : K.body.h) + 14;
  for (const p of G.players) {
    const front = p.id === ph.rider;
    let sx = front ? 22 : -24, sy = 0;
    if (ph.mode === 'drink' && ph.modeT < 0.9) { const k = clamp(ph.modeT / 0.9, 0, 1), from = front ? -24 : 22; sx = from + (sx - from) * k; sy = -Math.sin(k * Math.PI) * (front ? 44 : 28); }
    wizDrawHero(p.id, ph.x + sx, top + sy, { face: 1, sy: ph.duck && front ? 0.85 : 1 });
    if (!front) { ctx.fillStyle = '#a07a4a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(ph.x + sx - 26, top + sy - 20, 14, 16, 4); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
  // the sneeze bolt
  if (ph.bolt > 0) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.beginPath(); let x = ph.x + 60; ctx.moveTo(x, ph.y - 40); while (x < ph.x + K.sneeze.range) { x += 40; ctx.lineTo(x, ph.y - 40 + Math.sin(x * 0.9 + t * 40) * 18); } ctx.stroke(); }
  // the thought bubble: the snack it wants
  if (ph.mode === 'run' || ph.mode === 'wait') {
    const want = wizBeastWantNow(ph), s = WIZBEAST_SNACKS.find(q => q.key === want), bx = ph.x + 120, by = ph.y - 196;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(ph.x + 70, ph.y - 108, 5); ctx.fill(); ctx.stroke(); circle(ph.x + 90, ph.y - 136, 8); ctx.fill(); ctx.stroke(); circle(ph.x + 104, ph.y - 160, 10); ctx.fill(); ctx.stroke();
    rr(bx - 26, by - 22, 52, 40, 16); ctx.fill(); ctx.stroke();
    wizBeastDrawSnack(s.key, bx, by - 2, 1, want === 'pepper' && Math.sin(t * 12) > 0);
  }
}
function wizBeastDrawSnack(key, x, y, s = 1, flash = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  if (key === 'berry') { ctx.fillStyle = '#7a6aff'; for (const [dx, dy] of [[-5, 2], [5, 2], [0, -6]]) { circle(dx, dy, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#ffffff'; circle(-2, -8, 2); ctx.fill(); }
  else if (key === 'bun') { ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.ellipse(0, 2, 13, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(2, 1); ctx.lineTo(-2, 2); ctx.lineTo(3, 8); ctx.stroke(); }
  else { ctx.fillStyle = flash ? '#ffb090' : '#ff5a3a'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(12, -6, 6, 12); ctx.quadraticCurveTo(-10, 4, -4, -8); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4f9a58'; ctx.fillRect(-6, -12, 6, 5); }
  ctx.restore();
}
function wizBeastHud(st) {
  const ph = st.ph, big = wizBig(), z = big ? 1.3 : 1, fp = G.players[ph.feeder];
  // the FEEDER's bag (the picked snack ringed), and the hunger / static meters under it
  const x = fp.x + fp.w / 2 - 30, y = fp.y + fp.h + 112;
  ctx.save(); ctx.fillStyle = 'rgba(30,20,66,0.82)'; rr(x - 62 * z, y - 18 * z, 124 * z, 62 * z, 10); ctx.fill();
  WIZBEAST_SNACKS.forEach((s, i) => { const sx = x + (i - 1) * 38 * z; if (i === ph.sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; circle(sx, y, 16 * z); ctx.stroke(); } wizBeastDrawSnack(s.key, sx, y, z * 0.9); });
  const bar = (yy, k, col, label) => { ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(x - 52 * z, yy, 104 * z, 7 * z, 3); ctx.fill(); ctx.fillStyle = col; rr(x - 52 * z, yy, 104 * z * clamp(k, 0, 1), 7 * z, 3); ctx.fill(); text(label, x - 56 * z, yy + 6 * z, 9 * z, '#ffffff', 'right', 'body'); };
  bar(y + 20 * z, ph.hunger / 100, ph.hunger < WIZBEAST.hunger.low ? '#ff6a5a' : '#9fe07f', 'food');
  bar(y + 32 * z, ph.static / WIZBEAST.stat.full, ph.static > 80 ? '#ffe14a' : '#a8c8ff', 'zap');
  ctx.restore();
  if (ph.gold > 0) text('Gold bridle ' + Math.ceil(ph.gold) + 's', W / 2, H - 22, 14 * z, C.gold, 'center', 'body');
  else if (ph.shoes === ph.run) text('Golden horseshoes', W / 2, H - 22, 14 * z, C.gold, 'center', 'body');
}

WIZ_PHASES.beast = {
  bubbleHidden: true,
  setup(st, L) { wizBeastSetup(st, L); },
  step(st, dt) { wizBeastStep(st, dt); },
  coast(st, dt) { wizBeastCoast(st, dt); },
  hide: () => true,
  busy: () => true,
  headLift: () => 30,
  plan(st) { return wizBeastPlan(st); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.rider ? 'hup' : 'feed')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.rider ? 'Ride!' : 'Feed!')); },
  jobKeys(st) { return st.ph.rider === 1 ? ['feeder', 'rider'] : ['rider', 'feeder']; },
  legend(st) {
    const ph = st.ph, ride = k => (k ? '<kbd>↑</kbd> jump <kbd>↓</kbd> duck' : '<kbd>W</kbd> jump <kbd>S</kbd> duck'), feed = k => (k ? '<kbd>←</kbd><kbd>→</kbd> pick a snack' : '<kbd>A</kbd><kbd>D</kbd> pick a snack');
    return { pip: ph.rider === 0 ? ride(0) : feed(0), bo: ph.rider === 1 ? ride(1) : feed(1), pad: 'rider: up jumps, down ducks; feeder: left / right picks,' };
  },
  hudText(st) { const ph = st.ph; return 'Run ' + (ph.run + 1) + ' of 3'; },
  progress(st) { const ph = st.ph; return { n: ph.run + (ph.mode === 'done' ? 1 : 0), of: 3 }; },
  drawBack(st) { wizBeastDrawBack(st); },
  draw(st) { wizBeastDraw(st); },
  drawTop(st) { wizBeastDrawRide(st); },
  hud(st) { wizBeastHud(st); },
  statLine(st) { const s = st.stats.beast; return s && s.snacks ? s.snacks + ' snacks, ' + s.sneezes + ' sneezes' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizBeastJump = function () { this.tone(300, 0.15, 'sine', 0.035, 600); };
Sfx.extra.wizBeastWild = function () { this.tone(200, 0.3, 'sawtooth', 0.03, 900); this.tone(1400, 0.2, 'square', 0.012, 400, 0.05); };
Sfx.extra.wizBeastLand = function () { this.tone(120, 0.1, 'triangle', 0.04, 80); };
Sfx.extra.wizBeastHup = function () { this.tone(220, 0.08, 'square', 0.04, 330); this.tone(330, 0.1, 'square', 0.035, 440, 0.08); };
Sfx.extra.wizBeastSmash = function () { this.tone(160, 0.2, 'sawtooth', 0.045, 60); };
Sfx.extra.wizBeastTumble = function () { this.tone(400, 0.4, 'triangle', 0.04, 120); };
Sfx.extra.wizBeastTick = function () { this.tone(1000, 0.03, 'square', 0.015); };
Sfx.extra.wizBeastMunch = function () { [300, 260, 300].forEach((f, i) => this.tone(f, 0.05, 'square', 0.025, null, i * 0.07)); };
Sfx.extra.wizBeastSpit = function () { this.tone(500, 0.1, 'sawtooth', 0.025, 900); };
Sfx.extra.wizBeastSneeze = function () { this.tone(900, 0.1, 'sine', 0.03, 1200); this.tone(1600, 0.25, 'sawtooth', 0.03, 200, 0.12); };
Sfx.extra.wizBeastRumble = function () { this.tone(70, 0.6, 'sawtooth', 0.03, 50); };
Sfx.extra.wizBeastBolt = function () { this.tone(2000, 0.15, 'sawtooth', 0.04, 100); };
Sfx.extra.wizBeastDrink = function () { [500, 600, 500, 600].forEach((f, i) => this.tone(f, 0.06, 'sine', 0.025, null, i * 0.12)); };

/* ---------- the room ---------- */
wizRoom('beast', {
  jobs: {
    rider: { title: 'Rider', act: 'hup', legend: '<kbd>W</kbd> jump <kbd>S</kbd> duck <kbd>A</kbd><kbd>D</kbd> slow down, speed up',
      howTo: ['Hup charges through hay walls and over long gaps.'] },
    feeder: { title: 'Feeder', act: 'feed', legend: '<kbd>A</kbd><kbd>D</kbd> pick a snack <kbd>S</kbd> pet the tail',
      howTo: ['Feed the snack in its thought bubble. Pet the tail when the static is high.'] },
  },
  act: { label: 'hup', labels: ['hup', 'feed'] },
  tip: 'Front rides (up jumps, down ducks, "Hup!" charges), back feeds it the snack it asks for. Pepper makes it sneeze!',
  legend: { pip: '<kbd>W</kbd> jump <kbd>S</kbd> duck', bo: '<kbd>←</kbd><kbd>→</kbd> pick a snack', pad: 'rider: up jumps, down ducks; feeder: left / right picks,' },
  map: WIZ_EMPTY_MAP,
});

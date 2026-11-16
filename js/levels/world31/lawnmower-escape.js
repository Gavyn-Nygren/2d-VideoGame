/* Pip & Bo - Level 31-1 Lawnmower Escape (team, World 31 Shrunk in the Backyard). */
'use strict';

/* ===== 31-1 Lawnmower Escape (mode 'mowrun', team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "run ahead of a roaring mower through grass taller than you. One player cuts a path through the blades,
   and the other boosts you both over pebbles and sticks." (Gavyn, 2026-11-15: no more jumping off a partner's hands or
   being pulled up by the hand: the springer uses a springy grass blade and a dangling kite string instead.)
   Side view of the lawn at bug size; the camera follows Pip and Bo to the right. The mode owns the tick, the camera and
   the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns. World px, the ground is at S.ground.
   A giant red lawnmower roars along behind them. It never stops while you play: stand still too long and it catches up.
   BOTH run ◀ ▶ and jump ▲ (a plain jump clears the small stuff: acorn caps, bottle caps, little stones).
   THE CUTTER carries a rose thorn. A clump of tall grass blocks the way until the cutter chops through it: stand at the
     clump and tap the action ('chop'); each clump takes 3 to 6 chops (notches on the clump show how many are left).
   THE SPRINGER (st.bst; 'boost' is the old name in the code) works the springy grass. Pebbles and fallen sticks are far
     too tall to jump. A springy grass blade grows at the foot of each one: the springer stands there and HOLDS the
     action ('bend') to bend it down to the ground; the cutter runs onto its tip and jumps ▲, and the blade flings them
     up on top (SPROING!). A loop of old kite string is caught up there: the cutter, on top at the near edge, HOLDS the
     action to drop it, and the springer jumps ▲ to grab it and climbs (hold ▲; ▼ slides back down). Once someone is
     on the string it stays down. Over the top and down the far side.
   THE MOWER: its speed is set per stretch, it hurries when it is far behind (so it is always close and loud) and eases
     a little when it is right behind you. A red edge on the screen and a rattle say it is close. If it reaches the one
     at the back: "WHOOSH!" its wind tumbles you both back to the last safe spot (just past the last thing you got over)
     and the mower backs off to give you a start (counted as Close calls; soft fail).
   DEWDROPS hang in the grass, some low, some up where only a fling reaches (55 in all).
   Each stretch ends at a safe spot the mower can't reach (a flowerpot, a watering can, a garden gnome, the patio step).
   STRETCHES (jobs swap each stretch): Front Lawn (Pip cuts), Dandelion Patch (Bo cuts), Pebble Path (Pip cuts),
     The Big Finish (Bo cuts). The mower gets a little faster each stretch.
   GOLD HELP (only while both are playing, announced, counted): caught twice in one stretch = the gold sprinkler soaks
     the mower, which sputters at 60% speed for 20 s.
   IDLE: no person presses anything for 12 s: "Taking a break", the mower waits and the clock stops.
   MEDAL goals (MODES.mowrun.medals, js/medals.js): Gold <= S.goldT with <= 1 close call and >= 75% of the dew;
   Silver <= S.silverT with <= 5 close calls.
   MODES.mowrun.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.mowrun*. */
(() => {
  const K = SHRUNK, TAU = Math.PI * 2;
  const S = {
    ground: 430, runV: 235, acc: 2200, jumpV: 470, g: 1700, boostV: 830, boostVx: 120, maxFall: 1000,
    bw: 22, bh: 26, chopCd: 0.17, braceR: 40, boostR: 36, reachR: 44, climbV: 210, grabR: 16,
    leash: 640, catchPad: 8, mowBack: 600, whirlT: 1.4, dewR: 20, idleWait: 12,
    goldSlow: 0.6, goldDur: 20, goldT: 160, silverT: 270,
  };
  const GY = S.ground;

  /* ---------- the course ----------
     tokens (left to right): 'r300' open lawn for 300 px; 'G4' a grass clump needing 4 chops; 'P120:80' a pebble 120 tall,
     80 wide; 'T100:170' a fallen stick (twig) 100 thick, 170 long; 'l40:46' a little thing to jump (40 tall, 46 wide);
     'd' a dewdrop just above the ground here, 'd150' one 150 px up (only a fling gets there); 'D' a row of 3 low drops. */
  function compile(def) {
    const c = { obs: [], dews: [], endX: 0 };
    let x = 260;
    for (const tok of def.course) {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      if (k === 'r') x += a[0];
      else if (k === 'G') { c.obs.push({ kind: 'grass', x, w: 46, h: 2000, hp: a[0], max: a[0], fall: 0, seed: x }); x += 46; }
      else if (k === 'P') { c.obs.push({ kind: 'rock', x, w: a[1] || 80, h: a[0], seed: x }); x += a[1] || 80; }
      else if (k === 'T') { c.obs.push({ kind: 'log', x, w: a[1] || 160, h: a[0], seed: x }); x += a[1] || 160; }
      else if (k === 'l') { c.obs.push({ kind: 'low', x, w: a[1] || 44, h: a[0] || 36, seed: x }); x += a[1] || 44; }
      else if (k === 'd') c.dews.push({ x: x - 10, y: GY - (a[0] || 40), got: false, t: 0 });
      else if (k === 'D') for (let i = 0; i < 3; i++) c.dews.push({ x: x - 60 + i * 34, y: GY - 34, got: false, t: 0 });
    }
    c.endX = x + 140;
    return c;
  }
  const boostable = O => O.kind === 'rock' || O.kind === 'log';
  const solid = O => O.kind !== 'grass' || O.hp > 0;
  const topY = O => GY - O.h;

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, x) => ({ id, x, y: GY, vx: 0, vy: 0, face: 1, grounded: true, on: null, st: 'run', t: 0, chopT: 0, sq: 0,
    hx0: 0, hy0: 0, hx1: 0, hy1: 0, ht: 0, wx: 0, wy: 0, spin: 0 });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.cut = def.cutter || 0; st.bst = 1 - st.cut; st.title = def.title || '';
    st.c = compile(def);
    st.run = [0, 1].map(id => newRunner(id, 120 + (id === st.cut ? 40 : 0)));
    st.cp = 110; st.cpO = -1;
    st.mow = { x: -520, v: 0, base: def.mower || 95, shake: 0, gold: 0, back: 0, sput: 0 };
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.whirl = null; st.rc = { caught: 0 }; st.segStart = G.time; st.clock = st.clock || 0; st.roarT = 0; st.near = 0;
    st.cam = { x: 0 }; st.string = null;
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.cut] = 'chop'; w[st.bst] = 'bend'; K.actLabels(w, 'chop'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && !st.whirl && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go' && !st.whirl;
    st.clock += dt;
    for (const O of st.c.obs) if (O.kind === 'grass' && O.hp <= 0 && O.fall < 1) O.fall = Math.min(1, O.fall + dt * 2.6);
    for (const d of st.c.dews) if (d.t > 0) d.t -= dt;
    for (const r of st.run) runner(st, r, dt, live);
    stringStep(st, dt);
    for (const O of st.c.obs) if (O.spr > 0) O.spr = Math.max(0, O.spr - dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { leash(st); dew(st); checkpoint(st); goal(st); }
    mower(st, dt, live);
    if (st.whirl) whirlStep(st, dt);
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // boxes a runner can't walk through, as [x0, x1, top]
  function boxes(st) { return st.c.obs.filter(solid).map(O => ({ O, x0: O.x, x1: O.x + O.w, top: topY(O) })); }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.chopT > 0) r.chopT -= dt;
    if (r.sq > 0) r.sq = Math.max(0, r.sq - dt * 4);
    if (r.st === 'whirl') return;
    const p = G.players[r.id], i = live ? p.input : NO_INPUT, jump = live && p.pendingJump, act = live && p.pendingAct;
    if (r.st === 'climb') {
      // on the kite string: ▲ (or jump) climbs, ▼ slides down; at the top, step onto it
      const O = r.climbO;
      r.x = O.x - S.bw / 2 - 1; r.face = 1; r.vx = 0; r.vy = 0;
      if (i.jump || i.up) r.y -= S.climbV * dt; else if (i.down) r.y += S.climbV * 1.3 * dt;
      if (r.y <= topY(O) + 6) {
        r.st = 'run'; r.grounded = true; r.on = O; r.y = topY(O); r.x = O.x + 14; r.sq = 1;
        Sfx.play('shrunkThud'); K.pop(st, O.x + 14, topY(O) - 50, 'Up!', '#ffffff', 20); st.stats.hoists++;
      } else if (r.y >= GY) { r.y = GY; r.st = 'run'; r.grounded = true; r.on = null; }
      return;
    }
    const job = r.id === st.cut ? 'cut' : 'boost', other = st.run[1 - r.id];
    // the springer bends the springy grass blade at the foot of a pebble or stick down to the ground
    if (job === 'boost' && live && i.act && r.grounded && !r.on) {
      const O = st.c.obs.find(o => boostable(o) && o.x - (r.x + S.bw / 2) >= -2 && o.x - (r.x + S.bw / 2) <= S.braceR);
      if (O) { if (r.st !== 'brace') { r.st = 'brace'; r.braceO = O; Sfx.play('mowrunBrace'); } r.face = 1; r.vx = 0; }
      else if (r.st === 'brace') r.st = 'run';
      if (!O && act) K.hintOnce(st, 'braceHere', r.id, 'Bend the springy grass at the foot of a pebble or stick');
    } else if (r.st === 'brace') r.st = 'run';
    // the cutter drops the kite string from the near edge of a pebble or stick
    if (r.st === 'reach' && !(live && i.act && r.grounded && r.on && r.x - r.on.x < S.reachR + 8)) r.st = 'run';
    if (r.st !== 'brace' && live && i.act && r.grounded && r.on && boostable(r.on) && r.x - r.on.x < S.reachR + 8 && other.y >= GY - 1 && other.x < r.on.x) {
      if (r.st !== 'reach') { r.st = 'reach'; Sfx.play('mowrunReach'); }
      r.face = -1; r.vx = 0;
    }
    if (r.st === 'brace' || r.st === 'reach') {
      // a jump onto the bent blade's tip is a fling; a jump at the dropped string grabs it (both handled by the jumper)
      if (jump) K.hintOnce(st, 'holdStill' + r.st, r.id, r.st === 'brace' ? 'Hold it down: ' + NAMES[1 - r.id] + ' jumps on the tip' : 'Hold on: ' + NAMES[1 - r.id] + ' grabs the string');
      gravity(st, r, dt);
      return;
    }
    // chop
    if (act && job === 'cut') {
      const O = st.c.obs.find(o => o.kind === 'grass' && o.hp > 0 && chopGap(o, r) <= 34);
      if (O && r.chopT <= 0) { r.face = O.x > r.x ? 1 : -1; chop(st, r, O); }
    } else if (act && job === 'boost') {
      const O = st.c.obs.find(o => o.kind === 'grass' && o.hp > 0 && o.x - r.x < 60 && o.x - r.x > -10);
      if (O) K.hint(st, r.id, 'Only ' + NAMES[st.cut] + ' has the thorn: ' + NAMES[st.cut] + ' chops!');
    }
    // run
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) r.face = want;
    // in the air with nothing pressed you keep your speed (so a fling carries you up onto the top)
    if (r.grounded || want) r.vx = approach(r.vx, want * S.runV, (r.grounded ? S.acc : S.acc * 0.6) * dt);
    // jump: off the bent blade's tip it is a fling; at the dropped kite string it grabs on; otherwise a plain jump
    const Sg = st.string;
    if (jump && r.grounded) {
      if (other.st === 'brace' && Math.abs(other.x - r.x) < S.boostR && !r.on) {
        boost(st, r, other);
      } else if (Sg && Sg.u >= 1 && !r.on && Math.abs(r.x - (Sg.O.x - S.bw / 2 - 1)) < S.grabR + 8) {
        r.st = 'climb'; r.climbO = Sg.O; r.grounded = false; r.vx = 0; r.vy = 0; r.y -= 6;
        Sfx.play('mowrunGrab');
        return;
      } else {
        r.vy = -S.jumpV; r.grounded = false; r.on = null; Sfx.play('mowrunJump', r.id);
      }
    }
    // move x, then y, against the solid boxes
    const bx = boxes(st), hw = S.bw / 2;
    let nx = r.x + r.vx * dt;
    for (const b of bx) {
      if (r.y <= b.top + 0.5 || r.y - S.bh >= GY) continue;
      if (nx + hw > b.x0 && nx - hw < b.x1) {
        if (r.x <= (b.x0 + b.x1) / 2) nx = Math.min(nx, b.x0 - hw); else nx = Math.max(nx, b.x1 + hw);
        r.vx = 0;
        if (b.O.kind === 'grass') K.hintOnce(st, 'grassWall', r.id, r.id === st.cut ? 'Tall grass! Chop it ' + K.key(r.id, 'act') : 'Tall grass: ' + NAMES[st.cut] + ' chops it');
        else if (boostable(b.O) && r.grounded && !r.on) K.hintOnce(st, 'tooTall' + r.id, r.id, 'Too tall to jump! Use the springy grass!');
      }
    }
    // a fling always lands on the top it was aimed at (no sailing over and leaving the partner stuck behind)
    if (r.boostO && !r.grounded && r.vy > 0 && r.y < topY(r.boostO) + 1) nx = Math.min(nx, r.boostO.x + r.boostO.w - hw - 6);
    // up top with the partner still down behind: stay up here and drop the string (walking off would strand them)
    if (r.grounded && r.on && boostable(r.on) && strandedBehind(other, r.on) && nx > r.on.x + r.on.w - hw - 2) {
      nx = r.on.x + r.on.w - hw - 2; r.vx = Math.min(r.vx, 0);
      K.hint(st, r.id, 'Drop the string for ' + NAMES[other.id] + ' first: hold ' + K.key(r.id, 'act') + ' at the near edge');
    }
    r.x = nx;
    // dropping onto the bent blade's tip is a fling too (so a jump that's a little early or late still works)
    if (job === 'cut' && !r.grounded && r.vy > 0 && other.st === 'brace' && !r.on && Math.abs(other.x - r.x) < S.boostR + 6 &&
        r.y + r.vy * dt >= GY - S.bh && r.y < GY - S.bh + 4) { r.y = GY - S.bh; boost(st, r, other); return; }
    gravity(st, r, dt);
    if (r.grounded) r.boostO = null;
  }
  // the bent blade springs up and flings whoever is on its tip up on top (the springer lets it go)
  function boost(st, r, other) {
    r.vy = -S.boostV; r.vx = S.boostVx; r.grounded = false; r.on = null; r.face = 1; other.sq = 1; r.boostO = other.braceO;
    if (other.braceO) other.braceO.spr = 0.8;
    Sfx.play('shrunkBoing'); K.pop(st, r.x, r.y - 50, 'SPROING!', PCOL[other.id], 22); K.dust(st, other.x, GY, null, 6);
    st.stats.boosts++;
  }
  // the kite string: down (u 0..1) while the cutter holds the action at the near edge, or while someone is on it
  function stringStep(st, dt) {
    const T = st.run[st.cut], on = st.run.find(r => r.st === 'climb');
    const O = on ? on.climbO : T.st === 'reach' ? T.on : null;
    if (O && (!st.string || st.string.O !== O)) { st.string = { O, u: 0 }; Sfx.play('mowrunReach'); }
    if (!st.string) return;
    st.string.u = O ? Math.min(1, st.string.u + dt / 0.25) : st.string.u - dt / 0.3;
    if (st.string.u <= 0) st.string = null;
  }
  // still on the ground in front of O (not on it, not past it)
  const strandedBehind = (r, O) => r.st !== 'whirl' && r.on !== O && r.x < O.x && r.st !== 'climb';
  function gravity(st, r, dt) {
    const hw = S.bw / 2;
    if (r.grounded) {
      // walked off the edge of what we stand on
      if (r.on && (r.x - hw > r.on.x + r.on.w || r.x + hw < r.on.x || !solid(r.on))) { r.grounded = false; r.on = null; }
      else return;
    }
    r.vy = Math.min(S.maxFall, r.vy + S.g * dt);
    const ny = r.y + r.vy * dt;
    if (r.vy >= 0) {
      for (const O of st.c.obs) {
        if (!solid(O) || O.kind === 'grass') continue;
        const ty = topY(O);
        if (r.y <= ty + 0.5 && ny >= ty && r.x + hw > O.x + 2 && r.x - hw < O.x + O.w - 2) {
          r.y = ty; r.vy = 0; r.grounded = true; r.on = O; r.sq = 0.7; if (O.kind !== 'low') Sfx.play('shrunkThud');
          return;
        }
      }
      if (ny >= GY) { r.y = GY; r.vy = 0; r.grounded = true; r.on = null; r.sq = 0.6; return; }
    }
    r.y = ny;
  }
  // the space between a runner and a clump (either side)
  const chopGap = (o, r) => Math.max(o.x - (r.x + S.bw / 2), (r.x - S.bw / 2) - (o.x + o.w));
  function chop(st, r, O) {
    O.hp--; r.chopT = S.chopCd; st.stats.chops++;
    Sfx.play('mowrunChop', 1 + (O.max - O.hp) * 0.05);
    for (let k = 0; k < 4; k++) K.part(st, O.x + 6, GY - 30 - Math.random() * 80, -60 - Math.random() * 100, -80 - Math.random() * 120, 0.9, k % 2 ? K.COL.grass : K.COL.grassHi, 4, 500, 'leaf');
    if (O.hp <= 0) {
      Sfx.play('mowrunTimber'); K.pop(st, O.x + 20, GY - 140, 'Chopped through!', '#ffffff', 22);
      for (let k = 0; k < 12; k++) K.part(st, O.x + Math.random() * O.w, GY - 40 - Math.random() * 200, 40 + Math.random() * 160, -60 - Math.random() * 80, 1.2, k % 2 ? K.COL.grass : K.COL.grassDark, 5, 420, 'leaf');
    }
  }
  // nobody runs off and leaves the other behind
  function leash(st) {
    const [a, b] = st.run, front = a.x > b.x ? a : b, back = front === a ? b : a;
    if (front.x - back.x > S.leash) {
      front.x = back.x + S.leash; front.vx = Math.min(front.vx, 0);
      K.hintOnce(st, 'leash' + front.id + st.k, front.id, 'Wait for ' + NAMES[back.id] + '!');
    }
  }
  function dew(st) {
    for (const r of st.run) {
      if (r.st === 'whirl') continue;
      for (const d of st.c.dews) {
        if (d.got || Math.abs(d.x - r.x) > S.dewR || Math.abs(d.y - (r.y - 13)) > S.dewR + 6) continue;
        d.got = true; d.t = 0.4; st.dew++;
        Sfx.play('shrunkPop', 1 + (st.dew % 5) * 0.06); K.spark(st, d.x, d.y, 5, ['#ffffff', K.COL.dew]);
      }
    }
  }
  // the last safe spot: just past the last clump, pebble or stick that both are past
  function checkpoint(st) {
    if (!st.run.every(r => r.grounded && r.st === 'run' && !r.on)) return;
    const back = Math.min(st.run[0].x, st.run[1].x);
    st.c.obs.forEach((O, i) => {
      if (i <= st.cpO || O.kind === 'low' || back < O.x + O.w + 24) return;
      st.cpO = i; st.cp = O.x + O.w + 40;
    });
  }
  function goal(st) {
    const c = st.c;
    if (!st.run.every(r => r.grounded && r.x >= c.endX - 30 && r.st === 'run')) return;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('shrunkCheer'); Sfx.play('mowrunPhew');
    K.pop(st, c.endX + 30, GY - 200, last ? 'Up on the patio! The mower can\'t follow!' : (G.level.def.safe || 'Safe!') + ' Swap jobs!', '#ffffff', 26);
    for (const r of st.run) r.vx = 0;
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('mowrunFanfare'); K.confetti(st, st.c.endX, GY - 200, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.endX - st.cam.x, y: GY - 80 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }

  /* ---------- the mower ---------- */
  function mower(st, dt, live) {
    const m = st.mow;
    if (m.gold > 0 && live) { m.gold -= dt; if (m.gold <= 0) K.msg(st, 'The mower dried off. Here it comes again!', '#ffffff', 3); }
    if (m.sput > 0) m.sput -= dt;
    const back = Math.min(st.run[0].x, st.run[1].x), gap = back - m.x;
    st.near = clamp(1 - (gap - 60) / 260, 0, 1);
    if (st.state === 'end') { m.v = approach(m.v, -90, 200 * dt); m.x += m.v * dt; m.shake = 0.3; return; }
    if (!live) { m.v = approach(m.v, 0, 300 * dt); m.x += m.v * dt; m.shake = st.whirl ? 1 : 0.25; return; }
    let want = m.base * (gap > 640 ? 2.4 : gap > 420 ? 1.35 : gap < 150 ? 0.7 : 1);
    if (m.gold > 0) want *= S.goldSlow;
    m.v = approach(m.v, want, 260 * dt);
    m.x += m.v * dt;
    m.shake = 0.5 + st.near * 0.8;
    st.roarT -= dt;
    if (st.roarT <= 0) { st.roarT = 0.26 - st.near * 0.12; Sfx.play('mowrunRoar', 0.8 + st.near * 0.5); }
    if (st.near > 0.7 && !st.saidNear) { st.saidNear = true; K.msg(st, 'The mower is right behind you! RUN!', '#ffd0c8', 2.6); }
    if (st.near < 0.2) st.saidNear = false;
    // clippings spray out of the front of the deck
    if (Math.random() < 0.5) K.part(st, m.x + 4, GY - 20 - Math.random() * 30, 80 + Math.random() * 220, -120 - Math.random() * 200, 0.8, Math.random() < 0.5 ? K.COL.grass : K.COL.grassHi, 3, 600, 'leaf');
    // caught
    const r = st.run.find(q => q.x - S.bw / 2 < m.x + S.catchPad && q.st !== 'whirl');
    if (r) caught(st);
  }
  function caught(st) {
    st.stats.caught++; st.rc.caught++;
    st.whirl = { t: 0 };
    G.shake = Math.max(G.shake || 0, 0.5);
    Sfx.play('mowrunWhoosh'); Sfx.play('shrunkSquee');
    K.pop(st, st.mow.x + 160, GY - 220, 'WHOOSH!', '#ffffff', 34);
    for (const r of st.run) { r.st = 'whirl'; r.wx = r.x; r.wy = r.y; r.spin = 0; r.vx = 0; r.vy = 0; r.on = null; }
    for (let k = 0; k < 30; k++) K.part(st, st.mow.x + 40 + Math.random() * 200, GY - Math.random() * 200, 100 + Math.random() * 300, -200 - Math.random() * 300, 1.2, Math.random() < 0.5 ? K.COL.grass : K.COL.grassHi, 4, 400, 'leaf');
  }
  function whirlStep(st, dt) {
    const w = st.whirl;
    w.t += dt;
    for (const r of st.run) {
      const u = clamp(w.t / S.whirlT, 0, 1);
      r.spin += dt * 14;
      r.x = K.lerp(r.wx, st.cp + (r.id === st.cut ? 30 : 0), K.smooth(u));
      r.y = K.lerp(r.wy, GY, K.smooth(u)) - Math.sin(u * Math.PI) * 230;
    }
    if (w.t >= S.whirlT) {
      st.whirl = null;
      for (const r of st.run) { r.st = 'run'; r.y = GY; r.grounded = true; r.vy = 0; r.on = null; r.sq = 1; }
      st.mow.x = st.cp - S.mowBack; st.mow.v = 0;
      K.dust(st, st.cp, GY, null, 10);
      if (st.rc.caught === 1) K.msg(st, 'Blown back to the last safe spot. Keep moving!', '#ffffff', 3);
      if (st.rc.caught >= 2 && !st.goldUsed && K.both(st)) {
        st.goldUsed = true; st.mow.gold = S.goldDur;
        K.goldHelp(st, 'Gold sprinkler! The mower is soaked and sputters for 20 s');
      }
    }
  }

  /* ---------- the camera ---------- */
  function cam(st, dt) {
    const mid = (st.run[0].x + st.run[1].x) / 2, lead = Math.max(st.run[0].x, st.run[1].x);
    let want = Math.max(mid - W * 0.42, lead - W + 140);
    // when the mower is close, lean back so its front stays in view (never losing the leader)
    if (st.state === 'go') want = Math.max(Math.min(want, st.mow.x - 140), lead - W + 140);
    want = clamp(want, 0, st.c.endX + 260 - W);
    st.cam.x = st.whirl ? K.lerp(st.cam.x, want, Math.min(1, dt * 3)) : K.lerp(st.cam.x, want, Math.min(1, dt * 6));
  }
  function mirror(st) {
    for (const r of st.run) K.place(r.id, r.x - st.cam.x, Math.min(r.y, GY));
  }

  /* ---------- what to do next ----------
     plan(st): { O (the next thing in the way), kind ('open' | 'low' | 'grass' | 'boost'), stage ('chop' | 'brace' (bend
       the blade) | 'jump' | 'reach' (drop the string) | 'climb' | 'over'), and per job a target x (go there), act (true =
       hold, 'tap' = tap), jump (true = tap now), up (hold ▲: climbing), face (-1 to turn back) and why (a word for the
       prompts) }: cut (the cutter) and bst (the springer). */
  function plan(st) {
    const out = planCore(st), c = st.c;
    // little things to hop: jump when one is right in front (whatever else is going on)
    const lowAhead = r => r.grounded && c.obs.some(o => o.kind === 'low' && o.x - (r.x + S.bw / 2) > -1 && (o.x - (r.x + S.bw / 2) < 2 || (r.vx > 60 && o.x - (r.x + S.bw / 2) < 34 + r.vx * 0.06)));
    if (lowAhead(st.run[st.cut]) && out.cut.x > st.run[st.cut].x) out.cut.jump = true;
    if (lowAhead(st.run[st.bst]) && out.bst.x > st.run[st.bst].x) out.bst.jump = true;
    return out;
  }
  function planCore(st) {
    const c = st.c, T = st.run[st.cut], B = st.run[st.bst], back = Math.min(T.x, B.x);
    const out = { O: null, kind: 'open', stage: 'run', cut: { x: c.endX + 20 }, bst: { x: c.endX + 20 } };
    let O = null;
    for (const o of c.obs) {
      if (o.kind === 'low') continue;
      if (o.kind === 'grass' && o.hp <= 0) continue;
      if (o.x + o.w + 8 > back || (boostable(o) && (T.on === o || B.on === o))) { O = o; break; }
    }
    if (!O) return out;
    out.O = O;
    if (O.kind === 'grass') {
      out.kind = 'grass'; out.stage = 'chop';
      out.cut = { x: O.x - S.bw / 2 - 6, act: chopGap(O, T) <= 30 ? 'tap' : false, why: 'chop' };
      out.bst = { x: Math.min(B.x, O.x - 70), why: 'wait' };
      if (B.x < O.x - 140) out.bst.x = O.x - 70;
      return out;
    }
    out.kind = 'boost';
    const top = r => r.on === O, base = O.x - S.bw / 2 - 4;
    // already down the far side (or jumping down it)
    const past = r => !top(r) && r.st !== 'climb' && r.x - S.bw / 2 > O.x + O.w - 4;
    if (past(T) || past(B)) {
      out.stage = 'over';
      const P = past(T) ? T : B, Q = P === T ? B : T, pj = P === T ? 'cut' : 'bst', qj = pj === 'cut' ? 'bst' : 'cut';
      // the one over waits just past it; the other comes over the top (or, stranded in front, waits for the mower to
      // blow them both back, which can't be helped: the rules up top stop this happening)
      out[pj] = { x: Math.max(P.x, O.x + O.w + 30), why: 'wait' };
      out[qj] = top(Q) ? { x: O.x + O.w + 60 } : { x: Q.x, why: 'wait' };
      return out;
    }
    if (top(T) && top(B)) {
      out.stage = 'over'; out.cut = { x: O.x + O.w + 60 }; out.bst = { x: O.x + O.w + 60 };
    } else if (top(B) && !top(T)) {
      // (only after a respawn mix-up) the booster gets down and starts again
      out.stage = 'over'; out.bst = { x: O.x + O.w + 40 }; out.cut = { x: O.x - 70 };
    } else if (top(T)) {
      // the kite string: the cutter drops it from the near edge, the springer grabs it and climbs
      const climbing = B.st === 'climb', down = st.string && st.string.O === O && st.string.u >= 1;
      out.stage = down || climbing ? 'climb' : 'reach';
      const atEdge = T.x - O.x < S.reachR;
      out.cut = climbing ? { x: O.x + 40, why: 'wait' } : { x: O.x + 14, act: atEdge, face: -1, why: 'reach' };
      const under = B.grounded && !B.on && Math.abs(B.x - (O.x - S.bw / 2 - 1)) < S.grabR;
      out.bst = climbing ? { x: base, up: true, why: 'climb' } : { x: O.x - S.bw / 2 - 1, jump: down && under, why: 'grab' };
    } else if (!T.grounded && T.y < GY - 20) {
      // boosted: steer onto the top
      out.stage = 'jump'; out.cut = { x: O.x + Math.min(40, O.w / 2), why: 'jump' }; out.bst = { x: base, act: B.st === 'brace', why: 'brace' };
    } else {
      const braced = B.st === 'brace' && B.braceO === O;
      out.stage = braced ? 'jump' : 'brace';
      out.bst = { x: base, act: Math.abs(B.x - base) < 14 || braced, why: 'brace' };
      if (braced) {
        out.cut = { x: B.x, jump: T.grounded && !T.on && Math.abs(T.x - B.x) < S.boostR - 8, why: 'jump' };
      } else out.cut = { x: Math.min(base - 46, Math.max(T.x, base - 120)), why: 'wait' };
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const cx = st.cam.x, t = st.clock, c = st.c;
    K.sky(cx, t);
    K.farGrass(cx, { y: 400 });
    // a nearer row of blades, darker
    const par = 0.62, step = 70, sx = cx * par;
    for (let i = Math.floor(sx / step) - 2; i <= Math.ceil((sx + W) / step) + 2; i++) {
      const x = i * step - sx + (K.hash(i + 40) - 0.5) * 40, h = 220 + K.hash(i + 41) * 200;
      K.blade(x, GY + 4, h, (K.hash(i + 42) - 0.5) * 70, { w: 22, col: i % 2 ? '#6fb35a' : '#7cbd64', t, seed: i, dark: 'rgba(40,100,36,0.35)' });
      if (K.hash(i + 43) < 0.12) K.dandelion(x + 20, GY + 4, 200 + K.hash(i) * 80, t, { puff: K.hash(i + 44) < 0.4 });
    }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    K.soil(cx - 20, cx + W + 20, GY);
    // the safe spot at the end
    drawSafe(st, c.endX, G.level.def.safeKind || 'pot', t);
    for (const O of c.obs) {
      if (O.x > cx + W + 120 || O.x + O.w < cx - 160) continue;
      if (O.kind === 'grass') drawClump(st, O, t);
      else if (O.kind === 'rock') K.pebble(O.x + O.w / 2, GY + 2, O.w + 6, O.h + 2, { seed: O.seed });
      else if (O.kind === 'log') K.twig(O.x - 2, GY + 1, O.w + 4, O.h + 1);
      else drawLow(O);
      if (boostable(O)) drawSpring(st, O, t);
    }
    for (const d of c.dews) if (!d.got && d.x > cx - 40 && d.x < cx + W + 40) K.dew(d.x, d.y, 8, t);
    ctx.restore();
  }
  // the springy grass blade at the foot of a pebble or stick (bent to the ground by the springer, wobbling after a fling),
  // and the loop of kite string caught on top (hanging down the near face while it is dropped)
  function drawSpring(st, O, t) {
    const B = st.run[st.bst], bent = B.st === 'brace' && B.braceO === O && !(O.spr > 0.45), rx = O.x - 6;
    ctx.save();
    ctx.lineCap = 'round';
    if (bent) {
      const tx = B.x - 14;
      ctx.strokeStyle = '#3f8a34'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(rx, GY + 2); ctx.quadraticCurveTo(rx - 6, GY - 46, tx, GY - 8); ctx.stroke();
      ctx.strokeStyle = '#7fcf5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rx, GY + 2); ctx.quadraticCurveTo(rx - 6, GY - 46, tx, GY - 8); ctx.stroke();
      ctx.fillStyle = '#ffe08a'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 10); circle(tx, GY - 10, 5); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      const w = O.spr > 0 ? Math.sin(t * 40) * 12 * O.spr : Math.sin(t * 2 + O.seed) * 3, h = Math.min(O.h - 14, 96);
      ctx.strokeStyle = '#3f8a34'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(rx, GY + 2); ctx.quadraticCurveTo(rx - 14, GY - h * 0.6, rx - 20 + w, GY - h); ctx.stroke();
      ctx.strokeStyle = '#7fcf5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rx, GY + 2); ctx.quadraticCurveTo(rx - 14, GY - h * 0.6, rx - 20 + w, GY - h); ctx.stroke();
      // a little yellow bud on its tip marks the springy one
      ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#9a7a1a'; ctx.lineWidth = 1.5; circle(rx - 20 + w, GY - h - 3, 5); ctx.fill(); ctx.stroke();
    }
    // the kite string: a coil on top by the near edge, and a line down the face while dropped
    const sg = st.string && st.string.O === O ? st.string.u : 0, ty = topY(O), sx = O.x - 2;
    ctx.strokeStyle = '#f2ecd8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(O.x + 12, ty - 3, 9, 3.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#d24a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O.x + 4, ty - 6); ctx.lineTo(O.x + 9, ty - 11); ctx.lineTo(O.x + 13, ty - 6); ctx.stroke();
    if (sg > 0) {
      const len = (GY - ty - 4) * sg;
      ctx.strokeStyle = '#f2ecd8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(O.x + 6, ty - 2); ctx.lineTo(sx, ty + 2); ctx.quadraticCurveTo(sx - 3 + Math.sin(t * 5) * 2, ty + len / 2, sx, ty + len); ctx.stroke();
    }
    ctx.restore();
  }
  function drawLow(O) {
    const x = O.x, w = O.w, h = O.h, k = Math.floor(K.hash(O.seed) * 3);
    if (k === 0) { // an acorn cap, upside down
      ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.moveTo(x, GY); ctx.quadraticCurveTo(x + w / 2, GY - h * 1.6, x + w, GY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1.5; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + 4, GY - h * j / 4.5); ctx.lineTo(x + w - 4, GY - h * j / 4.5); ctx.stroke(); }
    } else if (k === 1) { // a bottle cap
      ctx.fillStyle = '#d8423a'; rr(x, GY - h, w, h, 4); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.fillRect(x + 3, GY - h + 3, w - 6, 4);
      ctx.strokeStyle = '#902a24'; ctx.lineWidth = 1.5; for (let j = 0; j <= w; j += 6) { ctx.beginPath(); ctx.moveTo(x + j, GY - h + 8); ctx.lineTo(x + j, GY); ctx.stroke(); }
    } else K.pebble(x + w / 2, GY + 1, w, h, { seed: O.seed, col: '#a9a497' });
  }
  function drawClump(st, O, t) {
    const n = 6;
    if (O.hp > 0) {
      // a thick wall of dark blades, outlined so it stands out from the grass far behind
      ctx.fillStyle = 'rgba(20,50,16,0.35)'; ctx.beginPath(); ctx.ellipse(O.x + O.w / 2, GY, O.w * 0.8, 8, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 9; k++) {
        const x = O.x + 2 + k * (O.w - 4) / 8, lean = (K.hash(O.seed + k) - 0.5) * 70, h = 360 + K.hash(O.seed + k + 3) * 200;
        ctx.save(); ctx.strokeStyle = '#1d4a18'; ctx.lineWidth = 3;
        K.blade(x, GY + 2, h, lean, { w: 22, col: k % 3 === 0 ? '#2f7f2a' : k % 3 === 1 ? '#378f30' : '#2a7026', t, seed: k, dark: 'rgba(160,230,120,0.5)' });
        ctx.restore();
      }
      // notches: chops left
      for (let k = 0; k < O.max; k++) {
        const y = GY - 40 - k * 16, on = k < O.hp;
        ctx.fillStyle = on ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)';
        rr(O.x + O.w / 2 - 9, y - 4, 18, 8, 4); ctx.fill();
      }
    } else {
      // cut: short stubs and the tops lying flat
      for (let k = 0; k < n; k++) {
        const x = O.x + 4 + k * (O.w - 8) / (n - 1);
        K.blade(x, GY + 2, 18, 0, { w: 16, col: '#4caa40', dark: false });
        const fx = x + 10, a = K.lerp(-Math.PI / 2, -0.12 + K.hash(O.seed + k) * 0.2, O.fall);
        ctx.save(); ctx.translate(fx, GY - 16 * (1 - O.fall) - 4); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = k % 2 ? '#3f9a36' : '#4caa40'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -200 + k * 6); ctx.lineTo(8, 0); ctx.fill();
        ctx.restore();
      }
    }
  }
  function drawSafe(st, x, kind, t) {
    if (kind === 'pot') {
      ctx.fillStyle = '#c8643a'; ctx.beginPath(); ctx.moveTo(x - 20, GY - 300); ctx.lineTo(x + 260, GY - 300); ctx.lineTo(x + 230, GY + 4); ctx.lineTo(x + 10, GY + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e07a4a'; rr(x - 34, GY - 340, 308, 50, 8); ctx.fill();
      ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.ellipse(x + 46, GY - 40, 40, 44, 0, Math.PI, 0); ctx.lineTo(x + 86, GY); ctx.lineTo(x + 6, GY); ctx.fill();
      K.daisy(x + 120, GY - 340, 140, t, { col: '#ff9fc0' }); K.daisy(x + 200, GY - 340, 110, t);
    } else if (kind === 'can') {
      ctx.fillStyle = '#4aa0c8'; rr(x, GY - 280, 300, 284, 20); ctx.fill();
      ctx.fillStyle = '#3a88b0'; ctx.fillRect(x, GY - 240, 300, 16);
      ctx.strokeStyle = '#4aa0c8'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x + 280, GY - 200); ctx.lineTo(x + 420, GY - 340); ctx.stroke();
      ctx.fillStyle = '#2a4a5a'; ctx.beginPath(); ctx.ellipse(x + 50, GY - 40, 36, 42, 0, Math.PI, 0); ctx.lineTo(x + 86, GY); ctx.lineTo(x + 14, GY); ctx.fill();
    } else if (kind === 'gnome') {
      ctx.fillStyle = '#3a6ac8'; rr(x + 20, GY - 220, 200, 224, 40); ctx.fill();
      ctx.fillStyle = '#f2c8a0'; circle(x + 120, GY - 260, 60); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 60, GY - 250); ctx.quadraticCurveTo(x + 120, GY - 120, x + 180, GY - 250); ctx.fill();
      ctx.fillStyle = '#d8423a'; ctx.beginPath(); ctx.moveTo(x + 50, GY - 290); ctx.lineTo(x + 120, GY - 470); ctx.lineTo(x + 190, GY - 290); ctx.fill();
      ctx.fillStyle = '#2a2a3a'; circle(x + 100, GY - 272, 6); ctx.fill(); circle(x + 140, GY - 272, 6); ctx.fill();
      ctx.fillStyle = '#2a3a5a'; ctx.beginPath(); ctx.ellipse(x + 60, GY - 30, 30, 34, 0, Math.PI, 0); ctx.lineTo(x + 90, GY); ctx.lineTo(x + 30, GY); ctx.fill();
    } else {
      // the patio: big paving slabs, one step up
      ctx.fillStyle = '#b8b0a2'; ctx.fillRect(x, GY - 60, 900, 600);
      ctx.fillStyle = '#d0c8ba'; ctx.fillRect(x, GY - 60, 900, 10);
      ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 220, GY - 60); ctx.lineTo(x + k * 220, H); ctx.stroke(); }
    }
  }
  function drawMower(st) {
    const m = st.mow, cx = st.cam.x, x = m.x - cx;
    if (x < -40) return;
    const sh = (Math.random() - 0.5) * 4 * m.shake, t = st.clock, wet = m.gold > 0;
    ctx.save(); ctx.translate(sh, sh * 0.5);
    const body = wet ? '#c86a6a' : '#d8342a', hi = wet ? '#e09090' : '#f0584a', dark = wet ? '#8a4444' : '#8a1e18';
    // the handle bars, rising out of the sky behind
    ctx.strokeStyle = '#5a5e66'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 470, GY - 210); ctx.lineTo(x - 760, -200); ctx.stroke();
    ctx.strokeStyle = '#7a808a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 466, GY - 218); ctx.lineTo(x - 754, -196); ctx.stroke();
    ctx.lineCap = 'butt';
    // the engine up top: a dome with cooling fins and a pull-cord handle
    ctx.fillStyle = dark; rr(x - 560, GY - 330, 400, 190, 40); ctx.fill();
    ctx.fillStyle = body; rr(x - 552, GY - 340, 384, 180, 40); ctx.fill();
    ctx.fillStyle = hi; rr(x - 530, GY - 330, 300, 22, 11); ctx.fill();
    ctx.fillStyle = dark; for (let k = 0; k < 7; k++) rr(x - 520 + k * 46, GY - 296, 20, 110, 8), ctx.fill();
    ctx.fillStyle = '#ffd84a'; text('MOW-MAX', x - 360, GY - 200, 30, '#ffd84a', 'center');
    // the cutting deck: a long red shell, low to the ground, with a grille nose
    ctx.fillStyle = dark; rr(x - 900, GY - 168, 900, 150, 26); ctx.fill();
    ctx.fillStyle = body; rr(x - 900, GY - 176, 896, 128, 30); ctx.fill();
    ctx.fillStyle = hi; rr(x - 880, GY - 168, 860, 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 8; k++) { circle(x - 860 + k * 110, GY - 120, 6); ctx.fill(); }
    // headlights like two angry eyes
    const glow = 0.6 + 0.4 * Math.sin(t * 6);
    for (const dy of [-140, -100]) {
      ctx.fillStyle = 'rgba(255,240,150,' + 0.22 * glow + ')'; circle(x - 26, GY + dy, 26); ctx.fill();
      ctx.fillStyle = '#fff3b0'; circle(x - 26, GY + dy, 13); ctx.fill();
      ctx.fillStyle = '#3a1010'; ctx.beginPath(); ctx.moveTo(x - 46, GY + dy - 16); ctx.lineTo(x - 8, GY + dy - 6); ctx.lineTo(x - 8, GY + dy - 14); ctx.lineTo(x - 44, GY + dy - 22); ctx.closePath(); ctx.fill();
    }
    // the front bumper: a steel bar with teeth
    ctx.fillStyle = '#d8dce2'; rr(x - 12, GY - 70, 18, 52, 6); ctx.fill();
    ctx.fillStyle = '#aab0b8'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 6, GY - 64 + k * 12); ctx.lineTo(x + 18, GY - 58 + k * 12); ctx.lineTo(x + 6, GY - 52 + k * 12); ctx.fill(); }
    // the dark gap under the deck where the blade spins
    ctx.fillStyle = '#1a1214'; ctx.fillRect(x - 900, GY - 24, 896, 22);
    for (let k = 0; k < 4; k++) {
      const a = t * 34 + k * TAU / 4, bx = x - 260 + Math.cos(a) * 240, len = 60 + Math.abs(Math.sin(a)) * 50;
      ctx.fillStyle = 'rgba(230,236,244,' + (0.45 + 0.4 * Math.abs(Math.cos(a))) + ')'; ctx.fillRect(bx - len / 2, GY - 15, len, 5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; if (Math.sin(t * 40) > 0.3) ctx.fillRect(x - 40, GY - 14, 30, 3);
    // the front wheel, rolling
    const wx = x - 120, wy = GY - 52, wr = 58, rot = -m.x / wr;
    ctx.fillStyle = '#1e1e22'; circle(wx, wy, wr); ctx.fill();
    ctx.strokeStyle = '#33333a'; ctx.lineWidth = 9;
    for (let k = 0; k < 12; k++) { const a = rot + k * TAU / 12; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82); ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); ctx.stroke(); }
    ctx.fillStyle = '#c8ccd2'; circle(wx, wy, wr * 0.5); ctx.fill();
    ctx.fillStyle = '#9aa0a8'; circle(wx, wy, wr * 0.3); ctx.fill();
    ctx.strokeStyle = '#7a8088'; ctx.lineWidth = 4;
    for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * wr * 0.48, wy + Math.sin(a) * wr * 0.48); ctx.stroke(); }
    if (wet) { ctx.fillStyle = 'rgba(150,210,255,0.6)'; for (let k = 0; k < 14; k++) { const yy = GY - 340 + ((t * 240 + k * 47) % 330); rr(x - 520 + k * 36, yy, 5, 14, 2); ctx.fill(); } }
    // exhaust puffs
    if (Math.sin(t * 9) > 0.6) { ctx.fillStyle = 'rgba(80,80,90,0.25)'; circle(x - 190, GY - 360 - (t * 60 % 40), 26); ctx.fill(); }
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const r of st.run) drawRunner(st, r);
    K.drawParts(st, cx);
    ctx.restore();
    drawMower(st);
    // near blades in front, for depth
    const par = 1.25, step = 260, sx = cx * par;
    for (let i = Math.floor(sx / step) - 1; i <= Math.ceil((sx + W) / step) + 1; i++) {
      if (K.hash(i + 70) < 0.5) continue;
      const x = i * step - sx + K.hash(i + 71) * 120;
      K.blade(x, H + 10, 120 + K.hash(i + 72) * 90, (K.hash(i + 73) - 0.5) * 50, { w: 26, col: 'rgba(60,130,50,0.85)', t, seed: i, dark: false });
    }
    // the mower is close: a red edge on the left
    if (st.near > 0.05 && st.state === 'go') {
      const g = ctx.createLinearGradient(0, 0, 220, 0);
      g.addColorStop(0, 'rgba(255,40,30,' + (0.45 * st.near * (0.8 + 0.2 * Math.sin(t * 16))) + ')'); g.addColorStop(1, 'rgba(255,40,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 220, H);
    }
    K.drawPops(st, cx, 0);
  }
  function drawRunner(st, r) {
    const job = r.id === st.cut ? 'cut' : 'boost';
    let sy = 1 - r.sq * 0.18, rot = 0, y = r.y, x = r.x;
    if (r.st === 'whirl') rot = r.spin;
    else if (r.st === 'brace') { sy = 0.85; }
    else if (!r.grounded) rot = r.face * clamp(r.vy / 2000, -0.15, 0.15);
    else if (Math.abs(r.vx) > 20) rot = r.face * 0.1;
    // shadow
    if (r.st !== 'whirl') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, r.on ? topY(r.on) : GY, 13, 4, 0, 0, TAU); ctx.fill(); }
    K.hero(r.id, x, y, { face: r.face, rot, sy, sx: 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.st === 'whirl' });
    const dark = PDARK[r.id];
    if (job === 'cut' && r.st !== 'whirl') {
      // the rose thorn held forward (a chop swings it down)
      const sw = r.chopT > 0 ? (r.chopT / S.chopCd) : 0, a = r.face > 0 ? -0.9 + sw * 1.6 : -Math.PI + 0.9 - sw * 1.6;
      const hx = x + r.face * 13, hy = y - 13;
      ctx.fillStyle = '#7a2a3a'; ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a + 1.57) * 4, hy + Math.sin(a + 1.57) * 4); ctx.lineTo(hx + Math.cos(a) * 26, hy + Math.sin(a) * 26); ctx.lineTo(hx + Math.cos(a - 1.57) * 4, hy + Math.sin(a - 1.57) * 4); ctx.fill();
      ctx.fillStyle = PCOL[r.id]; ctx.strokeStyle = dark; ctx.lineWidth = 2; circle(hx, hy, 3.6); ctx.fill(); ctx.stroke();
    }
    if (r.st === 'brace' || r.st === 'reach' || r.st === 'climb') {
      // hands: holding the blade's tip down in front, paying out the string at the edge, gripping the string above
      const hx = r.st === 'brace' ? x - 12 : r.st === 'reach' ? x - 14 : x + 10, hy = r.st === 'brace' ? y - 10 : r.st === 'reach' ? y - 4 : y - 30;
      ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = PCOL[r.id]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = PCOL[r.id]; circle(hx, hy, 4); ctx.fill();
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '💧 ' + st.dew + ' / ' + st.totalDew;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#bfeaff', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Tn = st.cut, Bn = st.bst, Tr = st.run[Tn], Br = st.run[Bn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Tn, 'cutter', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Tn, 'act') + 'CHOP', pl.cut.why === 'chop' && !!pl.cut.act, Tr.chopT > 0, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Tn, 'act') + 'STRING', pl.stage === 'reach' && pl.cut.act, Tr.st === 'reach', z);
    }
    {
      const bx = K.panel(Bn, 'springer', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Bn, 'act') + 'BEND', pl.stage === 'brace' && !!pl.bst.act, Br.st === 'brace', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Bn, 'up') + 'CLIMB', (!!pl.bst.jump && pl.bst.why === 'grab') || pl.bst.why === 'climb', Br.st === 'climb', z);
    }
    // how close the mower is
    {
      const w = 150 * z, h = 10 * z, x = W / 2 - w / 2, y = H - 24 * z;
      text('Mower', x - 8, y + h / 2, 12 * z, '#ffd0c8', 'right', 'body');
      K.meter(x, y, w, h, st.near, st.near > 0.7 ? '#ff5a4a' : st.near > 0.35 ? '#ffb04a' : '#8fe3b0');
      if (st.mow.gold > 0) text('soaked ' + Math.ceil(st.mow.gold) + 's', x + w + 8, y + h / 2, 12 * z, C.gold, 'left', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting || st.whirl) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => r.y - 46;
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.kind === 'grass' && pl.cut.act) { s = 'Chop! ' + K.key(Tn, 'act'); pulse = true; }
      else if (pl.kind === 'grass') { s = 'Chop the grass ' + K.key(Tn, 'right'); col = '#ffe7a8'; }
      else if (pl.stage === 'jump') { s = Math.abs(Tr.x - Br.x) < S.boostR ? 'Jump on the tip! ' + K.key(Tn, 'up') : 'Run onto the blade\'s tip, then jump ' + K.key(Tn, 'up'); pulse = Math.abs(Tr.x - Br.x) < S.boostR; }
      else if (pl.stage === 'brace') { s = 'Wait for ' + NAMES[Bn] + ' to bend the springy grass'; col = '#ffe7a8'; }
      else if (pl.stage === 'reach') { s = pl.cut.act ? 'Hold ' + K.key(Tn, 'act') + ' to drop the string' : 'To the edge ' + K.key(Tn, 'left'); pulse = !!pl.cut.act; }
      else if (pl.stage === 'climb') { s = Br.st === 'climb' ? NAMES[Bn] + ' is climbing up!' : 'Keep holding ' + K.key(Tn, 'act'); col = '#d9ffd0'; }
      P.say(Tn, s, sx(Tr), sy(Tr), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.stage === 'brace') { s = pl.bst.act ? 'Hold ' + K.key(Bn, 'act') + ' to bend the springy grass' : 'To the springy grass ' + K.key(Bn, 'right'); pulse = !!pl.bst.act; }
      else if (pl.stage === 'jump') { s = 'Keep holding ' + K.key(Bn, 'act'); col = '#d9ffd0'; }
      else if (pl.stage === 'climb') { s = Br.st === 'climb' ? 'Climb! Hold ' + K.key(Bn, 'up') : pl.bst.jump ? 'Jump! ' + K.key(Bn, 'up') + ' Grab the string' : 'Under the string ' + K.key(Bn, Br.x < pl.bst.x ? 'right' : 'left'); pulse = Br.st === 'climb' || !!pl.bst.jump; }
      else if (pl.stage === 'reach') { s = 'Wait for the string'; col = '#ffe7a8'; }
      else if (pl.kind === 'grass' && Br.x > pl.O.x - 90) { s = NAMES[Tn] + ' chops this one'; col = '#ffe7a8'; }
      P.say(Bn, s, sx(Br), sy(Br), col, pulse);
    }
  }
  const FONT = K.FONT;

  MODES.mowrun = {
    S, compile, plan,
    medals: { bronze: 'Escape the lawnmower', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'caught', gold: 1, silver: 5, word: 'close call', text: n => (n ? `At most ${n} close call${n === 1 ? '' : 's'}` : 'No close calls') },
      { key: 'dew', gold: 0.75, more: true, pct: true, word: 'the dew' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { caught: s.caught, dew: st.dew / (st.totalDew || 1) } : {}; },
    setup(st, L) {
      st.stats = { chops: 0, boosts: 0, hoists: 0, caught: 0, helps: 0, roomT: [] };
      st.dew = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalDew = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).dews.length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.goldUsed = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Dewdrops', value: st.dew + ' of ' + st.totalDew },
        { label: 'Close calls', value: String(s.caught) },
        { label: 'Grass chopped', value: String(s.chops) },
      ];
      out.push('Grass flings: ' + s.boosts + '. String climbs: ' + s.hoists + '. The mower never got you both for good!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = cut => ({ label: 'chop', labels: cut === 0 ? ['chop', 'bend'] : ['bend', 'chop'] });
  SHRUNK.defs.mowrun = {
    name: 'Lawnmower Escape', world: 30, kind: 'team', mode: 'mowrun', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'RUN from the mower! The cutter chops tall grass. The springer bends the springy grass at a pebble to fling the cutter up; then the cutter drops a string.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Front Lawn', cutter: 0, mower: 80, safe: 'Under the flowerpot!', safeKind: 'pot', act: acts(0),
        tip: 'Pip chops the tall grass. Bo holds the action to bend the springy grass, Pip jumps on its tip: SPROING! Then Pip drops the string for Bo.',
        course: ['r200', 'd', 'r160', 'D', 'r100', 'G3', 'r220', 'd', 'l36:44', 'r200', 'd', 'r120', 'P110:90', 'd150', 'r260', 'D', 'r100', 'G4', 'r200',
          'l40:46', 'r160', 'd', 'r140', 'P120:100', 'd160', 'r200', 'G3', 'r140', 'D', 'r200', 'l34:40', 'r200'] },
      { title: 'Dandelion Patch', cutter: 1, mower: 88, safe: 'Behind the watering can!', safeKind: 'can', act: acts(1),
        tip: 'Swap! Bo chops, Pip bends the grass. Fallen sticks are long: fling up, drop the string, run along the top.',
        course: ['r200', 'D', 'r160', 'G4', 'r200', 'd', 'r100', 'T100:170', 'd150', 'r240', 'l38:44', 'r160', 'G5', 'r180', 'D', 'r140', 'P120:90', 'd170',
          'r180', 'G3', 'r220', 'd', 'l40:46', 'r180', 'T110:200', 'd160', 'r200', 'D', 'r100', 'G4', 'r240'] },
      { title: 'Pebble Path', cutter: 0, mower: 96, safe: 'Under the garden gnome!', safeKind: 'gnome', act: acts(0),
        tip: 'Pip chops again. Pebbles one after another: fling, string, drop down, and again!',
        course: ['r200', 'd', 'r140', 'P110:80', 'd150', 'r200', 'P130:100', 'd170', 'r180', 'G4', 'r200', 'D', 'r120', 'l40:44', 'r160', 'P120:90', 'd160',
          'r160', 'G5', 'r180', 'T100:180', 'd150', 'r220', 'D', 'r100', 'P140:100', 'd180', 'r200', 'G4', 'r200'] },
      { title: 'The Big Finish', cutter: 1, mower: 104, safe: 'Up on the patio!', safeKind: 'patio', act: acts(1),
        tip: 'The last dash to the patio! Bo chops, Pip bends the grass. The mower is fast now, so no dawdling!',
        course: ['r200', 'D', 'r140', 'G4', 'r200', 'P120:90', 'd160', 'r200', 'l40:46', 'r140', 'G5', 'r160', 'd', 'T110:190', 'd160', 'r220', 'D', 'r120',
          'P130:100', 'd170', 'r160', 'G4', 'r160', 'l38:44', 'r160', 'G6', 'r200', 'D', 'r100', 'P140:110', 'd180', 'r240'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.mowrunJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.mowrunChop = function (p) { p = p || 1; this.tone(900 * p, 0.04, 'square', 0.03, 400 * p); this.tone(220 * p, 0.06, 'triangle', 0.03, 160 * p, 0.02); };
  Sfx.extra.mowrunTimber = function () { [600, 480, 380, 300].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, f * 0.8, i * 0.05)); };
  Sfx.extra.mowrunBrace = function () { this.tone(240, 0.08, 'triangle', 0.035, 300); };
  Sfx.extra.mowrunReach = function () { this.tone(420, 0.08, 'triangle', 0.03, 520); };
  Sfx.extra.mowrunGrab = function () { this.tone(300, 0.06, 'square', 0.02, 260); };
  Sfx.extra.mowrunRoar = function (p) { p = p || 1; this.tone(55 * p, 0.24, 'sawtooth', 0.02 * p, 62 * p); this.tone(110 * p, 0.12, 'square', 0.008 * p, 100 * p); };
  Sfx.extra.mowrunWhoosh = function () { this.tone(200, 0.5, 'sawtooth', 0.03, 1200); this.tone(900, 0.4, 'sine', 0.02, 200, 0.2); };
  Sfx.extra.mowrunPhew = function () { this.tone(520, 0.08, 'triangle', 0.035, 700); this.tone(700, 0.12, 'triangle', 0.03, 880, 0.08); };
  Sfx.extra.mowrunFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();

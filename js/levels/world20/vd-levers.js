/* Pip & Bo - Level 20-1 Volcano Dragon: phase 'levers' (Hopping Pillars). */
'use strict';

/* ===== 20-1 phase 2: Hopping Pillars (VD_PHASES.levers) =====
   One screen at the crater rim. A lava lake (his hot tub) with 4 stone pillars; each pillar has a lever on a ledge
   around the crater, linked to it by a chain, and a matching gem (green circle, purple diamond, pink heart, teal
   triangle) on both. The low ledges (left and right, one jump up from the rims) hold levers 1 and 4; a plank rope
   bridge across the top (two more jumps up the ledges) holds levers 2 and 3. ▼ drops through the bridge where rock is
   under it (never into the lake).
   Cinder perches on a pillar for a few seconds, crouches and flaps (the next pillar's gem, lever and chain light up
   and a dotted arc shows the hop), hops, lands, and so on. Pull the lever UNDER THE PILLAR HE IS ON (hold the action
   VDL.pullT s at it) before he leaves: the pillar sinks, SPLASH, he is dunked in his hot tub, sputters happily-grumpily
   and flies out to another pillar. 4 dunks win; jobs swap after each dunk, so each player pulls twice and shields
   twice.
   Jobs: the SHIELDER holds the action to raise the shield (slow walk, small hops only); the PULLER pulls. While he
   perches he guards his lever: anyone near it gets a telegraphed flame (he inhales, the zone glows), then a short rest
   (VDL.guard.rest s: he catches his breath, a puff of smoke) and the next, so a 1.2 s pull only works under the
   shield: a bonk resets the pull, and the lever won't budge for an unshielded puller while a flame is on them or
   during the rest after it (the hot lever), so the only unshielded pulling time is a 0.9 s inhale and nobody can tank
   a bonk and pull alone. The guard flame belongs to its lever: it goes out when
   he hops, and it wins over a stray flame. When nobody is near his lever he now and then breathes at someone on the way.
   Lava: "Hot foot!" (counted) and a pop back to where you last stood.
   Hop order: never the same pillar twice in a row, rarely straight back, and only levers both players can reach in
   time (an estimate from where they stand; farther fair ones are a bit more likely). Each dunk makes his perches a
   little shorter. Gold help (announced): after 2 hops in a row without a dunk he sits longer ("Sleepy Cinder") and
   rests a little longer between guard flames, after 4 even longer naps, longer rests, shorter guard flames and fewer
   stray ones ("Extra sleepy"). In 1-player mode, a person who has the shield and gets to the lit lever
   first while the computer is far away (VDL.farEst s, and too far to pull before he hops) takes the pull job instead
   (announced), so the computer takes whichever job the person leaves. (Not when the computer is just on its way:
   then the person's press is the shield it was asked for.) Fire never knocks anyone into the lava: a low side lever's
   flame pops them down to the rim beside its ledge, and ▼ won't drop anyone through the bridge over the lake. Stats: st.stats.levers { dunks, hops, misses, lava, help }.
   Map chars (parsed here): 3 4 5 6 the four levers (the tile they stand in), 7 8 9 0 the four pillar tops (the
   pillar's top is that tile's bottom). Lever k goes with pillar k. */

const VDL = {
  s: 0.6,                                   // Cinder's scale here
  lavaY: 448, lavaX0: 180, lavaX1: 780,     // the lava lake (world = screen: one screen)
  bridgeY: 150,
  rimY: 420, rimX: 135,                     // the rims' top; a pop-down spot beside a low ledge (left; right mirrored)
  firstPerch: 9,                            // s on his first pillar (the badges and tips are up meanwhile)
  perch: [3.4, 3.2, 3.0, 2.9],              // s per perch by dunks so far
  crouchT: 1.0, hopT: 0.95, hopPeak: 44, flyT: 1.35, flyPeak: 120,
  pullT: 1.2, decay: 1.2, reach: 26,        // s of holding, /s lost when let go, px from the lever
  // (inhale must stay well under pullT: it is the only time an unshielded puller can pull; rest is the hot lever)
  guard: { dx: 72, dy: 50, inhale: 0.9, breathe: 1.1, rest: 0.6, w: 136, h: 120 },
  roam: { first: 2.5, gap: 5.5, inhale: 1.25, breathe: 0.9, w: 110, h: 130 },
  help: [{ at: 2, add: 1.6, roam: 1.25, rest: 0.9, breathe: 1.1, text: 'Sleepy Cinder! He sits longer now.' },
    { at: 4, add: 3.2, roam: 1.6, rest: 1.3, breathe: 0.85, text: 'Extra sleepy Cinder! Even longer naps, less fire.' }],
  fairPad: 0.55,
  farEst: 2.0,                              // 1-player: the computer is "far away" (s to get there) for the job swap
  win: 4,
  dunk: { sink: 0.55, line: 0.75, swap: 1.1, out: 2.7, end: 2.5, riseWait: 1.6, riseV: 46 },
  gems: [['circle', '#6fd66f'], ['diamond', '#b48cff'], ['heart', '#ff7fb0'], ['tri', '#4fd6c4']],
};

vdRoom('levers', {
  title: 'Hopping Pillars', first: 0,
  act: { label: 'pull', labels: ['shield', 'pull'] },
  tip: 'Pull the lever under the pillar Cinder sits on to dunk him in his hot tub! Shield the puller from his fire.',
  map: [
    '................................', //  0
    '................................', //  1
    '................................', //  2
    '................................', //  3
    '...........4........5...........', //  4  levers 2 and 3 on the bridge
    '###==========================###', //  5  the rope bridge
    '................................', //  6
    '................................', //  7
    '....###..................###....', //  8  middle steps
    '.............8....9.............', //  9  pillar tops 2 and 3 (y 300)
    '.3......7..............0......6.', // 10  levers 1 and 4; pillar tops 1 and 4 (y 330)
    '####........................####', // 11  low ledges
    '................................', // 12
    '..1.2...........................', // 13
    '######....................######', // 14  the rims
    '######....................######', // 15
    '######....................######', // 16
    '######....................######', // 17
  ],
});

/* --- helpers --- */
const vdlCx = p => p.x + p.w / 2, vdlFeet = p => p.y + p.h;
const vdlSolo = () => typeof cpuSolo === 'function' && cpuSolo();
const vdlCpu = id => typeof cpuOn === 'function' && cpuOn(id);
const vdlActive = ph => (ph.cin.state === 'perch' || ph.cin.state === 'crouch') ? ph.cin.on : -1;
// the pillar he is about to hop to, is hopping to or flying to (-1 if none)
const vdlNext = ph => (['crouch', 'hop', 'fly'].includes(ph.cin.state) ? ph.cin.to : -1);
// the lever the team should head for: the one he sits on, else the one he is hopping / flying to
const vdlGoal = ph => { const a = vdlActive(ph); return a >= 0 ? a : ph.cin.to; };
function vdlAt(p, lv, reach = VDL.reach) {
  return !!p && p.alive && p.grounded && Math.abs(vdlFeet(p) - lv.feet) < 3 && Math.abs(vdlCx(p) - lv.x) <= reach;
}
const vdlNear = (p, lv) => p.alive && Math.abs(vdlCx(p) - lv.x) < VDL.guard.dx && Math.abs(vdlFeet(p) - lv.feet) < VDL.guard.dy;
function vdlPerchT(st) {
  const ph = st.ph, h = ph.help ? VDL.help[ph.help - 1].add : 0;
  return VDL.perch[Math.min(ph.dunks, VDL.perch.length - 1)] + h;
}
// rough seconds for p to get to lever lv (walk, jumps up the ledges, drops, and the bridge between the two sides)
function vdlEst(p, lv) {
  const x = vdlCx(p), f = Math.min(vdlFeet(p), 440), dx = Math.abs(lv.x - x);
  if (dx < 30 && Math.abs(f - lv.feet) < 10) return 0;
  let t = dx / 200 + Math.max(0, f - lv.feet) / 150 + Math.max(0, lv.feet - f) / 450;
  if (f > VDL.bridgeY + 40 && lv.feet > VDL.bridgeY + 40 && (x < W / 2) !== (lv.x < W / 2)) t += (f - VDL.bridgeY) / 150 + (lv.feet - VDL.bridgeY) / 450;
  return t;
}
// the next pillar: not this one, rarely straight back, one both can reach in time; farther fair ones a bit likelier
// (far: after a dunk he flies out to one of the two farthest, fair or not; a perch nobody could reach is no miss)
function vdlPick(st, from, far) {
  const ph = st.ph, ps = G.players;
  const ups = ph.pillars.filter(q => q.k !== from && q.state === 'up');
  if (!ups.length) return ph.pillars.find(q => q.k !== from).k;
  const est = q => Math.max(...ps.map(p => vdlEst(p, ph.levers[q.k])));
  if (far) {
    const by = ups.slice().sort((a, b) => est(b) - est(a));
    return (by.length > 1 && vdRand() < 0.35 ? by[1] : by[0]).k;
  }
  const budget = VDL.crouchT + VDL.hopT + vdlPerchT(st) - VDL.pullT - VDL.fairPad;
  let fair = ups.filter(q => est(q) <= budget);
  if (!fair.length) return ups.reduce((a, b) => (est(a) <= est(b) ? a : b)).k;
  if (fair.length > 1) { const f2 = fair.filter(q => q.k !== ph.prev); if (f2.length) fair = f2; }
  if (fair.length > 1) { const f3 = fair.filter(q => est(q) > 0.5); if (f3.length) fair = f3; }
  const ws = fair.map(q => (0.4 + est(q)) ** 2), sum = ws.reduce((a, b) => a + b, 0);
  let r = vdRand() * sum;
  for (let i = 0; i < fair.length; i++) { r -= ws[i]; if (r <= 0) return fair[i].k; }
  return fair[fair.length - 1].k;
}
// a hint over player id, not repeated while it says the same thing (unless `again` s passed)
function vdlHint(st, id, key, text, o = {}) {
  const ph = st.ph, h = ph.hk[id];
  if (h.key === key && G.time - h.t < (o.again || 7)) return;
  h.key = key; h.t = G.time;
  vdHint(st, id, text, { life: o.life || 2.6, gold: o.gold, cpu: o.cpu });
}
const vdlName = id => NAMES[id];

/* --- Cinder: perch, crouch, hop; the dunk and the fly-out --- */
function vdlLand(st, k) {
  const ph = st.ph, c = st.cinder, q = ph.pillars[k];
  ph.cin = { state: 'perch', on: k, to: -1, t: 0, dur: vdlPerchT(st), fair: ph.cin.fair !== false };
  Object.assign(c, { x: q.x, y: q.top, air: false, pose: 'perch', lava: null, gy: null });
  c.face = ph.levers[k].x > q.x ? 1 : -1;
  c.hitT = 0.25;
  puff(q.x, q.top, 8, 'rgba(120,100,110,0.8)');
  Sfx.play('vdLevLand');
  ph.roamT = Math.max(ph.roamT, 1.6);
}
function vdlStartHop(st, kind) {
  const ph = st.ph, c = st.cinder, to = ph.cin.to, q = ph.pillars[to];
  const dur = kind === 'fly' ? VDL.flyT : VDL.hopT;
  // could both get there and pull in time? (else his leaving is no miss)
  const reach = Math.max(...G.players.map(p => vdlEst(p, ph.levers[to])));
  const fair = reach <= dur + (kind === 'fly' ? 0 : VDL.crouchT) + vdlPerchT(st) - VDL.pullT - VDL.fairPad + 0.3;
  ph.cin = { state: kind, on: -1, to, t: 0, x0: c.x, y0: c.y, x1: q.x, y1: q.top, dur, fair };
  c.face = q.x > c.x ? 1 : -1;
  c.air = true; c.pose = kind === 'fly' ? 'fly' : 'hop';
  Sfx.play(kind === 'fly' ? 'vdFlap' : 'vdLevHop');
}
function vdlCinderStep(st, dt, calm) {
  const ph = st.ph, c = st.cinder, n = ph.cin, ps = G.players;
  if (ph.dunk) { vdlDunkStep(st, dt); return; }
  if (n.state === 'perch') {
    c.pose = 'perch';
    c.look = { x: vdlCx(ps[ph.pull]), y: ps[ph.pull].y };
    if (!calm) n.t += dt;
    // a little grace for a pull that is nearly done
    const lv = ph.levers[n.on];
    if (n.t >= n.dur && !(lv.prog > 0.5 && (n.grace = (n.grace || 0) + dt) < 0.6)) {
      n.state = 'crouch'; n.t = 0; ph.prev = n.on; n.to = vdlPick(st, n.on);
      c.pose = 'crouch'; Sfx.play('vdFlap');
      vdlTargetHints(st);
    }
  } else if (n.state === 'crouch') {
    c.pose = 'crouch';
    if (!calm) n.t += dt;
    if (n.t >= VDL.crouchT) {
      // he got away: a miss (gold help after a few in a row)
      const lv = ph.levers[n.on], pu = ps[ph.pull];
      if (lv.prog > 0.05 && vdlAt(pu, lv)) { vdlHint(st, ph.pull, 'aww', 'Aww! He hopped away!', { cpu: 'Aww!' }); Sfx.play('vdLevAww'); }
      for (const l of ph.levers) l.prog = 0;
      const S = vdStats(st); S.hops = (S.hops || 0) + 1;
      if (n.fair !== false) { ph.miss++; S.misses = (S.misses || 0) + 1; }
      const hp = VDL.help[ph.help];
      if (hp && ph.miss >= hp.at) {
        ph.help++; vdStats(st).help = ph.help;
        vdHelp(st, hp.text);
        vdReact(st, 'surprised', ph.help === 1 ? '*yawn* ...so sleepy...' : 'Zzz... *hic* ...huh?', 1.8);
      } else if (ph.miss > 0 && vdRand() < 0.45) vdSay(st, ['Too slow! Hee hee!', 'Nope! Over here!', 'Can\'t catch me!', 'Hop hop hop!'][Math.floor(vdRand() * 4)], 1.6);
      vdlStartHop(st, 'hop');
    }
  } else if (n.state === 'hop' || n.state === 'fly') {
    n.t += dt;
    const u = clamp(n.t / n.dur, 0, 1), e = u * u * (3 - 2 * u), peak = n.state === 'fly' ? VDL.flyPeak : VDL.hopPeak;
    c.x = n.x0 + (n.x1 - n.x0) * e;
    c.y = n.y0 + (n.y1 - n.y0) * e - peak * 4 * u * (1 - u);
    c.gy = VDL.lavaY;
    if (c.lava != null && c.y < VDL.lavaY - 4) {   // out of the tub: lava drips
      c.lava = null;
      for (let k = 0; k < 8; k++) ph.drops.push({ x: c.x + (vdRand() - 0.5) * 50, y: c.y - vdRand() * 40, vx: (vdRand() - 0.5) * 60, vy: 40 + vdRand() * 80, r: 3 + vdRand() * 3, t: 0 });
    }
    if (u >= 1) vdlLand(st, n.to);
  }
}
// the dunk: the pillar sinks, SPLASH, he sputters in his hot tub, the jobs swap, then he flies out (or the phase is won)
function vdlStartDunk(st, k) {
  const ph = st.ph, c = st.cinder, D = VDL.dunk;
  ph.dunk = { k, t: 0, splashed: false, said: false, swapped: false, y0: c.y };
  ph.cin = { state: 'dunk', on: -1, to: -1, t: 0 };
  ph.dunks++; vdStats(st).dunks = ph.dunks; ph.miss = 0;
  ph.pillars[k].state = 'sink';
  c.mood = 'surprised'; c.moodT = 1.2; c.act = null;
  for (const l of ph.levers) l.prog = 0;
  ph.levers[k].yank = 1;
  vdCelebrate(st, ph.dunks >= VDL.win ? D.end + 1 : D.out + 0.3);
  Sfx.play('vdLevClunk'); Sfx.play('vdLevRumble');
  vdPop(st, ph.levers[k].x, ph.levers[k].feet - 50, 'CLUNK!', C.gold, 24);
}
function vdlDunkStep(st, dt) {
  const ph = st.ph, d = ph.dunk, c = st.cinder, q = ph.pillars[d.k], D = VDL.dunk, s = c.s;
  d.t += dt;
  const sinkTo = VDL.lavaY + 24 - q.top0;
  q.sink = Math.min(sinkTo, sinkTo * clamp(d.t / D.sink, 0, 1) ** 2);
  const want = VDL.lavaY + 64 * s;   // his feet down in the tub: belly at the lava line
  if (!d.splashed) {
    c.y = q.top0 + q.sink;
    if (c.y > VDL.lavaY - 6) {
      d.splashed = true; c.lava = VDL.lavaY; c.pose = 'splash';
      vdlSplash(st, c.x, 1);
      vdPop(st, c.x, VDL.lavaY - 140, 'SPLASH!', '#ffd27a', 34);
      Sfx.play('vdSplash'); Sfx.play('vdLevSploosh');
      if (!reduceMotion) G.shake = Math.max(G.shake || 0, 0.22);
      for (const p of G.players) rumble(p.id, 0.5, 0.5, 200);
    }
  } else c.y = approach(c.y, want, 260 * dt);
  if (d.splashed && d.t > D.sink + 0.9 && c.pose === 'splash') { c.pose = 'tub'; c.mood = 'grumpy'; }
  if (d.splashed && (G.tickN % 50) === 0) Sfx.play('vdLevBlub');
  if (!d.said && d.t >= D.line) {
    d.said = true;
    if (ph.dunks < VDL.win) vdSay(st, ['Blub! Hey! ...ooh, cozy. HMPH!', 'Pffft! My hot tub! ...it IS nice. Grr!'][(ph.dunks - 1) % 2], 2.4);
  }
  if (ph.dunks >= VDL.win) {
    if (d.t >= D.end && !st.cut) {
      vdStats(st).time = Math.round(st.phT * 10) / 10;
      vdPhaseDone(st, { say: 'Blub blub... FINE! But nobody rings my gong!' });
    }
    return;
  }
  if (!d.swapped && d.t >= D.swap) {
    d.swapped = true; ph.pull = 1 - ph.pull; vdSwap(st);
    ph.hk = [{}, {}];
    vdlJobHints(st, 2.8);
  }
  if (d.t >= D.out) {
    ph.dunk = null;
    q.state = 'down'; q.wait = D.riseWait;
    ph.cin = { state: 'perch', on: -1, to: vdlPick(st, d.k, true) };
    vdlStartHop(st, 'fly');
    vdlTargetHints(st);
  }
}
function vdlSplash(st, x, big) {
  const ph = st.ph, n = big ? 26 : 8, sp = big ? 1 : 0.5;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (vdRand() - 0.5) * 2.2;
    const v = (220 + vdRand() * 260) * sp;
    ph.drops.push({ x: x + (vdRand() - 0.5) * 30, y: VDL.lavaY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (3 + vdRand() * 5) * (big ? 1 : 0.7), t: 0 });
  }
  ph.rings.push({ x, t: 0, big: !!big });
}

/* --- the pull --- */
// p could not get to lever g and pull it before he leaves that pillar (1-player: the computer is "far away")
function vdlTooFar(st, p, g) {
  const n = st.ph.cin, est = vdlEst(p, st.ph.levers[g]);
  let left = VDL.crouchT;
  if (n.state === 'perch') left += n.dur - n.t;
  else if (n.state === 'crouch') left -= n.t;
  else if (n.state === 'hop' || n.state === 'fly') left += n.dur - n.t + vdlPerchT(st);
  return est > VDL.farEst && est + VDL.pullT + 0.3 > left;
}
// a flame is blowing on p, or his lever is still hot from the last one (the rest between guard flames), and no shield
// covers p: the lever won't budge (so nobody can tank a bonk and pull alone)
function vdlScorched(st, p) {
  if (vdUnderShield(st, p) >= 0) return false;
  if (st.ph.guardRest > 0) return true;
  return st.fires.some(f => f.phase === 'breathe' && rectHit(p, f.x0, f.gy - f.h, f.x1 - f.x0, f.h + 8));
}
// the guard flame's breath and the rest after it (longer while he is sleepy: gold help)
function vdlGuardK(st) {
  const h = st.ph.help ? VDL.help[st.ph.help - 1] : null, G2 = VDL.guard;
  return { breathe: h ? h.breathe : G2.breathe, rest: h ? h.rest : G2.rest };
}
function vdlPullStep(st, dt) {
  const ph = st.ph, ps = G.players, pu = ps[ph.pull], sh = ps[1 - ph.pull], act = vdlActive(ph);
  for (const lv of ph.levers) {
    lv.jig = Math.max(0, lv.jig - dt); lv.yank = Math.max(0, (lv.yank || 0) - dt * 1.2);
    const pulling = lv.k === act && vdlAt(pu, lv) && pu.input.act && pu.stun <= 0 && !vdlScorched(st, pu);
    if (pulling) {
      lv.prog += dt / VDL.pullT;
      if ((lv.clickT = (lv.clickT || 0) - dt) <= 0) { lv.clickT = 0.14; Sfx.play('vdLevCreak', pu.id); }
      if (lv.prog >= 1) { lv.prog = 1; vdlStartDunk(st, lv.k); return; }
    } else lv.prog = Math.max(0, lv.prog - VDL.decay * dt);
  }
  // a fresh press: at a lever he isn't on ("Not this one!"), or the shield's job (1-player: first there pulls)
  for (const p of ps) {
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    const lv = ph.levers.find(l => vdlAt(p, l));
    if (p.id === ph.pull) {
      if (lv && lv.k !== act) {
        lv.jig = 0.45; Sfx.play('vdLevLocked', p.id);
        vdlHint(st, p.id, 'wrong' + lv.k, act >= 0 ? 'Not this one! Find the glowing lever!' : 'Wait! Watch where he hops!', { again: 3, cpu: 'Oops!' });
      }
      continue;
    }
    // the shielder (a person, 1-player mode) got to the lit lever first and the computer is too far away to pull it
    // before he hops off (not just on its way: then the person's press is the shield it was asked for): swap jobs
    const g = vdlGoal(ph);
    if (g >= 0 && vdlSolo() && !vdlCpu(p.id) && vdlCpu(pu.id) && vdlAt(p, ph.levers[g], 34) && vdlTooFar(st, pu, g)) {
      ph.pull = p.id; vdSwap(st); ph.hk = [{}, {}];
      vdNews(st, vdlName(p.id) + ' got there first: ' + vdlName(p.id) + ' pulls!', false, 3);
      vdlHint(st, p.id, 'took', 'Hold ' + vdKey(p.id, 'act') + ' to pull!', { life: 3 });
    }
  }
  void sh;
}

/* --- his fire: guarding his lever (back to back), and now and then at someone on the way --- */
function vdlFireStep(st, dt, calm) {
  const ph = st.ph, ps = G.players, act = vdlActive(ph);
  // a guard flame belongs to its lever: it goes out when he leaves that pillar
  for (const f of st.fires) if (f.guard && f.lever !== act && f.phase !== 'out') vdFireOut(st, f);
  // a guard flame that blew out on his lever: he catches his breath (a puff of smoke) before the next one, and the
  // lever stays hot meanwhile (vdlScorched)
  ph.guardRest = Math.max(0, ph.guardRest - dt);
  for (const f of st.fires) if (f.guard && f.phase === 'out' && !f.rested) {
    f.rested = true;
    if (f.lever === act && !calm) {
      ph.guardRest = vdlGuardK(st).rest;
      const c = st.cinder, n = vdCinderPts(c).nose;   // (a quiet puff of smoke: he catches his breath)
      for (let k = 0; k < 2; k++) st.smoke.push({ x: n.x + c.face * k * 5, y: n.y - k * 4, vx: c.face * (14 + k * 10), vy: -36 - k * 14, r: 5 + k * 3, t: 0, life: 0.9 + k * 0.2 });
    }
  }
  if (act < 0) ph.guardRest = 0;
  if (calm || act < 0) return;
  const lv = ph.levers[act], G2 = VDL.guard;
  const near = ps.some(p => vdlNear(p, lv));
  if (near && ph.guardRest > 0) return;
  if (near && !st.fires.some(f => f.guard && f.phase !== 'out')) {
    for (const f of st.fires) if (!f.guard) vdFireOut(st, f);      // guarding beats a stray flame
    const f = vdFire(st, { x: lv.x, w: G2.w, gy: lv.feet, h: G2.h, inhale: G2.inhale, breathe: vdlGuardK(st).breathe, onHit: vdlFireHit });
    if (f) { f.guard = true; f.lever = act; }
    ph.roamT = Math.max(ph.roamT, 2.5);
    return;
  }
  const live = st.fires.some(f => f.phase !== 'out');
  if (live || near || ph.cin.state !== 'perch') return;
  const hp = ph.help ? VDL.help[ph.help - 1].roam : 1;
  if ((ph.roamT -= dt) > 0) return;
  ph.roamT = VDL.roam.gap * hp;
  const R = VDL.roam;
  const ok = ps.filter(p => p.alive && p.grounded && p.tileGround && st.safe[p.id] <= 0 && vdlFeet(p) < VDL.lavaY - 10);
  if (!ok.length) return;
  const p = ok.length > 1 ? ok[vdRand() < 0.5 ? 0 : 1] : ok[0];
  vdFire(st, { x: clamp(vdlCx(p), R.w / 2, W - R.w / 2), w: R.w, gy: vdlFeet(p), h: R.h, inhale: R.inhale, breathe: R.breathe, target: p.id, onHit: vdlFireHit });
}
// "Toasty!" without a second soft fail: a knock-back toward the lake would often bounce the player on into the lava
// ("Hot foot!" too). From a low side lever's flame they pop down to the rim beside its ledge (out of the flame); below
// the bridge they are knocked toward the outer wall; on the bridge, away from the flame as usual.
function vdlFireHit(st, p, f) {
  const cx = vdlCx(p), left = cx < W / 2, lv = f.guard ? st.ph.levers[f.lever] : null;
  if (lv && lv.feet > VDL.bridgeY + 40) {
    const o = G.players[1 - p.id], x = left ? VDL.rimX : W - VDL.rimX, taken = Math.abs(vdlCx(o) - x) < 24 && Math.abs(vdlFeet(o) - VDL.rimY) < 30;
    return vdBonk(st, p, { kind: 'fire', word: f.word, to: { x: taken ? x + (left ? -26 : 26) : x, y: VDL.rimY } });   // (not on the partner's head)
  }
  const low = vdlFeet(p) > VDL.bridgeY + 40;
  return vdBonk(st, p, { kind: 'fire', word: f.word, fromX: low ? cx + (left ? 1 : -1) : f.cx });
}

/* --- lava: "Hot foot!", back to where you last stood --- */
function vdlSpot(p) {
  const feet = vdlFeet(p), ty = Math.round(feet / T);
  for (const x of [vdlCx(p), p.x + 3, p.x + p.w - 3]) {
    const tx = Math.floor(x / T), ch = tile(tx, ty);
    if (ch === '#' || ch === '=') return { x: tx * T + T / 2, y: ty * T };
  }
  return { x: vdlCx(p), y: feet };
}
// ▼ only drops through the bridge where rock is under it (over the lake it would just be a hot foot)
function vdlNoDropStep() {
  const ty0 = Math.round(VDL.bridgeY / T) + 1;
  const rock = x => { for (let ty = ty0; ty < ROWS; ty++) { const ch = tile(Math.floor(x / T), ty); if (ch === '#' || ch === '=') return ty * T < VDL.lavaY; } return false; };
  for (const p of G.players) {
    if (p.alive && p.input.down && p.grounded && Math.abs(vdlFeet(p) - VDL.bridgeY) < 2 && !(rock(p.x + 4) && rock(p.x + p.w - 4))) p.downLatch = true;
  }
}
function vdlLavaStep(st) {
  const ph = st.ph;
  for (const p of G.players) {
    if (!p.alive) continue;
    if (p.grounded && p.tileGround && p.vy >= 0 && vdlFeet(p) < VDL.lavaY) ph.spot[p.id] = vdlSpot(p);
    if (vdlFeet(p) > VDL.lavaY + 6) {
      const to = ph.spot[p.id], x = vdlCx(p);
      vdlSplash(st, x, false);
      if (vdBonk(st, p, { kind: 'lava', to })) { const S = vdStats(st); S.lava = (S.lava || 0) + 1; }
      else { p.x = to.x - p.w / 2; p.y = to.y - p.h; p.vx = 0; p.vy = -VD.bonk.popV; p.grounded = false; p.jumping = false; }
      p.downLatch = true;   // (a ▼ still held must be let go before it drops you through the bridge again)
      vdlHint(st, p.id, 'lava', 'Hot foot! Stay out of his hot tub!', { again: 10, cpu: 'Hot hot hot!' });
    }
  }
}

/* --- hints that follow each player's own device --- */
function vdlJobHints(st, life = 3) {
  const ph = st.ph, pu = ph.pull, sh = 1 - pu;
  vdlHint(st, sh, 'job', 'Hold ' + vdKey(sh, 'act') + ' to shield ' + vdlName(pu) + '!', { life, cpu: 'I\'ll shield!' });
  vdlHint(st, pu, 'job', 'Pull the glowing lever!', { life, cpu: 'I\'ll pull!' });
}
function vdlTargetHints(st) {
  const ph = st.ph, g = ph.cin.to;
  if (g < 0 || st.idle) return;
  if (vdlAt(G.players[ph.pull], ph.levers[g], 40)) return;
  vdlHint(st, ph.pull, 'tgt' + g, 'He\'s hopping! Go to the glowing lever!', { life: 2.2, again: 4 });
}
function vdlHintStep(st, dt) {
  const ph = st.ph, ps = G.players, pu = ps[ph.pull], shId = 1 - ph.pull, sh = ps[shId], act = vdlActive(ph);
  if ((ph.hintT -= dt) > 0 || st.idle) return;
  ph.hintT = 0.25;
  // the shielder holding the shield at a ledge it can't hop up
  const inp = sh.input;
  if (sh.alive && vdShieldUp(st, shId) && sh.grounded && (inp.left || inp.right) && Math.abs(sh.vx) < 5 && !(act >= 0 && vdlNear(sh, ph.levers[act])))
    vdlHint(st, shId, 'drop', 'Let go of ' + vdKey(shId, 'act') + ' to jump high!', { again: 8 });
  if (act < 0) return;
  const lv = ph.levers[act], puAt = vdlAt(pu, lv), covered = vdUnderShield(st, pu) >= 0;
  // a hint that no longer fits goes away
  const drop = (id, keys) => { if (st.hints[id] && keys.includes(ph.hk[id].key)) { st.hints[id] = null; ph.hk[id] = {}; } };
  if (covered) drop(pu.id, ['wait']);
  if (pu.input.act && puAt) drop(pu.id, ['hold']);
  if (vdShieldUp(st, shId)) drop(shId, ['raise', 'come', 'job']);
  const fire = st.fires.find(f => f.phase !== 'out' && f.guard) || (ph.guardRest > 0 ? { rest: true } : null);
  if (puAt && !pu.input.act && (ph.atT[pu.id] += 0.25) > 0.7) vdlHint(st, pu.id, 'hold', 'Hold ' + vdKey(pu.id, 'act') + ' to pull!', { again: 6, cpu: 'Pulling!' });
  if (!puAt) ph.atT[pu.id] = 0;
  if (puAt && !covered && fire) vdlHint(st, pu.id, 'wait', 'Wait for ' + vdlName(shId) + '\'s shield!', { again: 6, cpu: 'Shield me!' });
  if (puAt && !vdShieldUp(st, shId)) {
    if (vdlNear(sh, lv)) vdlHint(st, shId, 'raise', 'Hold ' + vdKey(shId, 'act') + ': shield ' + vdlName(pu.id) + '!', { again: 6, cpu: 'Shield up!' });
    else vdlHint(st, shId, 'come', 'Go shield ' + vdlName(pu.id) + ' at the lever!', { again: 8, cpu: 'Coming!' });
  }
  if (vdlNear(sh, lv) && !vdlNear(pu, lv) && vdShieldUp(st, shId) && vdlEst(pu, lv) > 1)
    vdlHint(st, pu.id, 'call', 'Hurry! Pull the glowing lever!', { again: 8 });
}

/* --- the phase --- */
VD_PHASES.levers = {
  setup(st, L) {
    const ph = st.ph, c = st.cinder, def = L.def;
    ph.levers = []; ph.pillars = [];
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = L.grid[ty][tx], li = '3456'.indexOf(ch), pi = '7890'.indexOf(ch);
      if (li >= 0) { ph.levers[li] = { k: li, x: tx * T + T / 2, feet: (ty + 1) * T, prog: 0, jig: 0, yank: 0 }; L.grid[ty][tx] = '.'; }
      if (pi >= 0) { ph.pillars[pi] = { k: pi, x: tx * T + T / 2, top0: (ty + 1) * T, top: (ty + 1) * T, sink: 0, state: 'up', wait: 0 }; L.grid[ty][tx] = '.'; }
    }
    ph.pull = def.first === 1 ? 0 : 1;   // def.first takes job A (the shield) first
    ph.dunks = 0; ph.miss = 0; ph.help = 0; ph.prev = -1; ph.roamT = VDL.roam.first + 3; ph.guardRest = 0;
    ph.dunk = null; ph.drops = []; ph.rings = []; ph.hintT = 1; ph.hk = [{}, {}]; ph.atT = [0, 0];
    ph.spot = G.players.map(p => ({ x: vdlCx(p), y: vdlFeet(p) }));
    const k0 = 0, q = ph.pillars[k0];
    ph.cin = { state: 'perch', on: k0, to: -1, t: 0, dur: VDL.firstPerch };
    Object.assign(c, { s: VDL.s, x: q.x, y: q.top, face: -1, pose: 'perch', air: false, gy: null, lava: null, mood: 'grumpy', baseMood: 'grumpy' });
    Object.assign(vdStats(st), { dunks: 0, hops: 0, misses: 0, lava: 0, help: 0 });
    ph.introSaid = false;
  },
  // (the leave cutscene: the lava rescue still runs, so a player in the air over the lake is popped back, not lost)
  coast(st, dt) { vdCoast(dt); vdlLavaStep(st); },
  step(st, dt) {
    const ph = st.ph, ps = G.players, calm = vdCalm(st), shId = 1 - ph.pull;
    vdShield(st, shId, ps[shId].alive && ps[shId].input.act);
    vdShield(st, ph.pull, false);
    vdlNoDropStep();
    vdPlatform(st, dt);
    vdlLavaStep(st);
    if (!ph.introSaid && !calm) { ph.introSaid = true; vdSay(st, 'My pillars! My hot tub! Go away!', 2.4); vdlJobHints(st, 3.4); }
    vdlCinderStep(st, dt, calm);
    if (!ph.dunk) vdlPullStep(st, dt);
    else for (const p of ps) p.pendingAct = false;
    vdlFireStep(st, dt, calm);
    vdlHintStep(st, dt);
    // pillars rise back up after a dunk
    for (const q of ph.pillars) {
      if (q.state === 'down' && (q.wait -= dt) <= 0) q.state = 'rise';
      if (q.state === 'rise') { q.sink = Math.max(0, q.sink - VDL.dunk.riseV * dt); if (q.sink <= 0) { q.state = 'up'; puff(q.x, q.top0, 6, 'rgba(255,200,120,0.7)'); } }
      q.top = q.top0 + q.sink;
    }
    // splash drops and rings
    for (const d of ph.drops) { d.t += dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    if (ph.drops.length) ph.drops = ph.drops.filter(d => d.y < VDL.lavaY + 4 || d.t < 0.05);
    for (const r of ph.rings) r.t += dt;
    if (ph.rings.length) ph.rings = ph.rings.filter(r => r.t < 1.2);
  },
  onBonk(st, p) {
    const ph = st.ph;
    if (p.id === ph.pull) for (const l of ph.levers) l.prog = 0;
  },
  drawBack(st) { vdlDrawBack(st); },
  draw(st) { vdlDrawLevers(st); },
  drawTop(st) { vdlDrawTop(st); },
  hudText: st => 'Dunks ' + st.ph.dunks + '/' + VDL.win,
  progress: st => ({ n: st.ph.dunks, of: VDL.win }),
  labels: st => (st.ph.pull === 1 ? ['shield', 'pull'] : ['pull', 'shield']),
  roles: st => (st.ph.pull === 1 ? ['Shield!', 'Pull!'] : ['Pull!', 'Shield!']),
};

/* --- drawing --- */
function vdlGem(kind, x, y, r, col, glow) {
  ctx.save(); ctx.translate(x, y);
  if (glow > 0) { ctx.fillStyle = `rgba(255,214,90,${0.55 * glow})`; circle(0, 0, r * 1.9); ctx.fill(); }
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
  if (kind === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
  else if (kind === 'diamond') { ctx.moveTo(0, -r * 1.15); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.15); ctx.lineTo(-r, 0); ctx.closePath(); }
  else if (kind === 'heart') { ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.6, -r * 1.3, 0, -r * 0.45); ctx.bezierCurveTo(r * 0.6, -r * 1.3, r * 1.6, -r * 0.2, 0, r); ctx.closePath(); }
  else { ctx.moveTo(0, -r * 1.1); ctx.lineTo(r * 1.05, r * 0.8); ctx.lineTo(-r * 1.05, r * 0.8); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(-r * 0.3, -r * 0.35, r * 0.28); ctx.fill();
  ctx.restore();
}
// where lever k's chain meets its pillar (world)
function vdlRing(ph, k) {
  const q = ph.pillars[k], lv = ph.levers[k], side = lv.x < q.x ? -1 : 1;
  return { x: q.x + side * 26, y: q.top + 34 };
}
function vdlChain(ax, ay, bx, by, sag, col, glow) {
  const n = Math.max(6, Math.round(Math.hypot(bx - ax, by - ay) / 9));
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * bx, y = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * my + u * u * by;
    const dx = 2 * (1 - u) * (mx - ax) + 2 * u * (bx - mx), dy = 2 * (1 - u) * (my - ay) + 2 * u * (by - my), a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + (i % 2 ? Math.PI / 2 : 0));
    if (glow > 0) { ctx.strokeStyle = `rgba(255,214,90,${0.6 * glow})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 3.2, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }
}
function vdlDrawBack(st) {
  const ph = st.ph, t = G.clock, L = VDL;
  // the sunset sky, then the far wall of the crater
  vdDrawBackdrop(t, { x: 820, y: 250 });
  ctx.fillStyle = '#4a2534';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 210);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 214 + Math.sin(x / W * Math.PI) * 120 + Math.sin(x * 0.05) * 6 + (hash(x, 5) % 9));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // the far wall's sunlit rim, rock layers and specks
  ctx.strokeStyle = 'rgba(255,160,120,0.3)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 215 + Math.sin(x / W * Math.PI) * 120 + Math.sin(x * 0.05) * 6 + (hash(x, 5) % 9));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(25,8,18,0.22)'; ctx.lineWidth = 3;
  for (const dy of [34, 70]) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 214 + dy + Math.sin(x / W * Math.PI) * 120 + Math.sin(x * 0.03 + dy) * 5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(25,8,18,0.25)'; ctx.beginPath(); for (let k = 0; k < 30; k++) { const h = hash(k, 61), x = h % W; vdlDot(x, 230 + Math.sin(x / W * Math.PI) * 120 + (h >> 10) % 70, 1.5 + (k % 3)); } ctx.fill();
  ctx.fillStyle = '#5c2e3c';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 280);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 290 + Math.sin(x / W * Math.PI) * 90 + Math.sin(x * 0.07 + 1) * 5);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,170,120,0.28)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 291 + Math.sin(x / W * Math.PI) * 90 + Math.sin(x * 0.07 + 1) * 5);
  ctx.stroke();
  // the lake's glow on the wall, glowing cracks
  const gl = ctx.createLinearGradient(0, 300, 0, L.lavaY);
  gl.addColorStop(0, 'rgba(255,120,50,0)'); gl.addColorStop(1, `rgba(255,140,60,${0.42 + 0.06 * Math.sin(t * 2)})`);
  ctx.fillStyle = gl; ctx.fillRect(L.lavaX0 - 60, 300, L.lavaX1 - L.lavaX0 + 120, L.lavaY - 300);
  ctx.strokeStyle = `rgba(255,150,70,${0.45 + 0.15 * Math.sin(t * 1.7)})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const [x, y] of [[260, 300], [480, 345], [700, 300], [380, 390], [600, 395]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 6, y + 30); ctx.lineTo(x + 20, y + 44); ctx.stroke();
  }
  // steam puffs rising off the lake (a pure function of the clock)
  for (let k = 0; k < 6; k++) {
    const u = (t * 0.16 + k / 6) % 1, x = L.lavaX0 + 60 + ((k * 137) % (L.lavaX1 - L.lavaX0 - 120)) + Math.sin(u * 6 + k) * 16;
    const a = 0.16 * Math.sin(u * Math.PI), y = L.lavaY - 20 - u * 220, r = 14 + u * 26;
    ctx.fillStyle = `rgba(255,220,200,${a})`; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.arc(x - r * 0.5, y + r * 0.25, r * 0.55, 0, Math.PI * 2); ctx.arc(x + r * 0.5, y + r * 0.2, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,240,225,${a * 0.9})`; circle(x - r * 0.2, y - r * 0.3, r * 0.35); ctx.fill();
  }
  // the rock (stone tiles and the bridge planks), drawn again over the backdrop
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = G.level.grid[ty][tx];
    if (ch === '#') drawStone(tx, ty);
    else if (ch === '=') drawPlank(tx * T, ty * T, tx, ty);
  }
  // the bridge's rope rails and posts
  const by = 5 * T, bx0 = 3 * T, bx1 = 29 * T;
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx0, by - 26);
  for (let x = bx0; x <= bx1; x += 10) ctx.lineTo(x, by - 26 + Math.sin((x - bx0) / (bx1 - bx0) * Math.PI) * 10);
  ctx.stroke();
  ctx.strokeStyle = C.rope; ctx.lineWidth = 2; ctx.stroke();
  for (let x = bx0; x <= bx1; x += 4 * T) {
    const ry = by - 26 + Math.sin((x - bx0) / (bx1 - bx0) * Math.PI) * 10;
    ctx.fillStyle = C.plankDark; ctx.fillRect(x - 2, ry - 2, 4, by - ry + 2);
  }
  // pillars (behind Cinder and the lava)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, L.lavaY + 2); ctx.clip();
  for (const q of ph.pillars) vdlDrawPillar(st, q);
  ctx.restore();
  // the chains from each lever to its pillar
  const goal = vdlNext(ph), act = vdlActive(ph);
  for (const lv of ph.levers) {
    const r = vdlRing(ph, lv.k), q = ph.pillars[lv.k], ax = lv.x, ay = lv.feet - 4;
    if (q.top0 + q.sink + 30 > L.lavaY) {   // a sunk pillar: the chain dips into the lava
      vdlChain(ax, ay, r.x, L.lavaY + 4, lv.yank > 0 ? 4 : 20, '#8d8796', 0); continue;
    }
    const glow = lv.k === act ? 0.7 + 0.3 * Math.sin(t * 6) : lv.k === goal ? 0.4 : 0;
    vdlChain(ax, ay, r.x, r.y, (1 - lv.prog) * (lv.yank > 0 ? 2 : 26), lv.k === act || lv.k === goal ? '#ffe08a' : '#a8a2b0', glow);
  }
  // the lava lake (his hot tub)
  vdDrawLava(L.lavaX0, L.lavaX1, L.lavaY, t, { depth: H - L.lavaY + 4 });
  ctx.fillStyle = 'rgba(255,170,80,0.35)';
  for (const x of [L.lavaX0, L.lavaX1 - 6]) ctx.fillRect(x, L.lavaY - 30, 6, 30);
}
function vdlDrawPillar(st, q) {
  const ph = st.ph, t = G.clock, L = VDL, w = 58, x0 = q.x - w / 2, top = q.top, act = vdlActive(ph), goal = vdlNext(ph);
  const bot = L.lavaY + 4;
  ctx.fillStyle = '#4a404f'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.fillRect(x0, top + 6, w, bot - top - 6); ctx.strokeRect(x0, top + 6, w, bot - top - 6);
  // column facets
  ctx.fillStyle = '#5b5062'; ctx.fillRect(x0 + 6, top + 8, 12, bot - top - 8);
  ctx.fillStyle = '#3a3240'; ctx.fillRect(x0 + w - 14, top + 8, 10, bot - top - 8);
  ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let y = top + 30; y < bot; y += 34) { ctx.moveTo(x0 + 2, y); ctx.lineTo(x0 + w - 2, y + 4); } ctx.stroke();
  // the lava's glow up its foot
  const g = ctx.createLinearGradient(0, bot - 50, 0, bot);
  g.addColorStop(0, 'rgba(255,140,60,0)'); g.addColorStop(1, 'rgba(255,150,60,0.55)');
  ctx.fillStyle = g; ctx.fillRect(x0, bot - 50, w, 50);
  // the cap
  ctx.fillStyle = '#6a5e72'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  rr(x0 - 6, top, w + 12, 12, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.grass; ctx.fillRect(x0 - 2, top + 2, w + 4, 3);
  // its gem (lit while he sits on it, or is about to hop to it)
  const [kind, col] = VDL.gems[q.k], glow = q.k === act ? 0.7 + 0.3 * Math.sin(t * 6) : q.k === goal ? 0.5 + 0.5 * Math.sin(t * 12) : 0;
  vdlGem(kind, q.x, top + 34, 9, col, glow);
  // the chain's ring
  const r = vdlRing(ph, q.k);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; circle(r.x, r.y, 5); ctx.stroke();
  ctx.strokeStyle = '#a8a2b0'; ctx.lineWidth = 2; ctx.stroke();
}
function vdlDrawLevers(st) {
  const ph = st.ph, t = G.clock, act = vdlActive(ph), goal = vdlNext(ph);
  for (const lv of ph.levers) {
    const x = lv.x, y = lv.feet, [kind, col] = VDL.gems[lv.k];
    const lit = lv.k === act ? 1 : lv.k === goal ? 0.5 : 0;
    if (lit) { const a = (lit === 1 ? 0.35 : 0.2) + 0.12 * Math.sin(t * 6); const gr = ctx.createRadialGradient(x, y - 14, 4, x, y - 14, 46); gr.addColorStop(0, `rgba(255,214,90,${a})`); gr.addColorStop(1, 'rgba(255,214,90,0)'); ctx.fillStyle = gr; circle(x, y - 14, 46); ctx.fill(); }
    // the handle: up and back at rest, down and forward when pulled (it jiggles when locked)
    const dir = ph.pillars[lv.k].x > x ? 1 : -1;
    const ang = (-0.75 + 1.5 * lv.prog) * dir + Math.sin(lv.jig * 40) * 0.12 * (lv.jig > 0 ? 1 : 0);
    const px = x, py = y - 9, hx = px + Math.sin(ang) * 30, hy = py - Math.cos(ang) * 30;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#a0683e'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(hx, hy, 6); ctx.fill(); ctx.stroke();
    // the base, with its gem
    ctx.fillStyle = '#6a5e72'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x - 15, y - 12, 30, 12, 4); ctx.fill(); ctx.stroke();
    vdlGem(kind, x, y - 6, 4.5, col, 0);
    // pull progress: a gold ring around the pivot
    if (lv.prog > 0.01) {
      ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 6; circle(x, y - 40, 12); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 40, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lv.prog); ctx.stroke();
    }
  }
  // the hop he is about to make: a dotted arc to the next pillar
  const n = ph.cin;
  if (n.state === 'crouch' && n.to >= 0) {
    const c = st.cinder, q = ph.pillars[n.to], k = clamp(n.t / VDL.crouchT, 0, 1);
    ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = `rgba(255,236,170,${0.4 + 0.5 * k})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(c.x, c.y - 40);
    ctx.quadraticCurveTo((c.x + q.x) / 2, Math.min(c.y, q.top) - 40 - VDL.hopPeak * 2, q.x, q.top - 4); ctx.stroke();
    ctx.restore();
  }
}
function vdlDrawTop(st) {
  const ph = st.ph, t = G.clock, act = vdlActive(ph), big = vdBig();
  // splash drops and rings
  for (const d of ph.drops) { ctx.fillStyle = d.r > 5 ? '#ffc04d' : '#ff7a1f'; circle(d.x, d.y, d.r); ctx.fill(); }
  for (const r of ph.rings) {
    const u = r.t / 1.2, rx = (r.big ? 60 : 22) + u * (r.big ? 110 : 40);
    ctx.strokeStyle = `rgba(255,236,170,${0.8 * (1 - u)})`; ctx.lineWidth = r.big ? 4 : 2.5;
    ctx.beginPath(); ctx.ellipse(r.x, VDL.lavaY + 2, rx, rx * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // a bouncing arrow over the lever to pull (gold), and a blinking paler one over the lever of the pillar he hops to
  if (!ph.dunk) for (const k of [act, vdlNext(ph)]) {
    if (k < 0) continue;
    const lv = ph.levers[k], on = k === act, bob = Math.abs(Math.sin(t * 5)) * 7, z = big ? 1.3 : 1;
    const y = lv.feet - 62 - bob - (lv.prog > 0.01 ? 14 : 0), x = lv.x;
    ctx.save(); ctx.globalAlpha = on ? 1 : 0.55 + 0.35 * Math.sin(t * 12);
    ctx.fillStyle = on ? C.gold : '#fff1b8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 11 * z, y - 12 * z); ctx.lineTo(x + 11 * z, y - 12 * z); ctx.lineTo(x + 11 * z, y - 2 * z); ctx.lineTo(x + 17 * z, y - 2 * z); ctx.lineTo(x, y + 14 * z); ctx.lineTo(x - 17 * z, y - 2 * z); ctx.lineTo(x - 11 * z, y - 2 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
    const [kind, col] = VDL.gems[k];
    vdlGem(kind, x, y - 24 * z, 7 * z, col, 0);
    ctx.restore();
  }
}

/* --- sounds --- */
Sfx.extra.vdLevClunk = function () { this.tone(150, 0.14, 'square', 0.06, 70); this.tone(720, 0.05, 'square', 0.03, 380, 0.02); };
Sfx.extra.vdLevCreak = function (p) { this.tone(560 * p, 0.03, 'square', 0.018, 420 * p); };
Sfx.extra.vdLevRumble = function () { this.tone(72, 0.6, 'sawtooth', 0.04, 45); this.tone(110, 0.5, 'triangle', 0.045, 60, 0.05); };
Sfx.extra.vdLevSploosh = function () { this.tone(520, 0.5, 'sawtooth', 0.025, 60); this.tone(180, 0.6, 'sine', 0.07, 50, 0.03); [900, 700, 1100].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.03, f * 1.6, 0.2 + i * 0.09)); };
Sfx.extra.vdLevBlub = function () { [300, 380, 260].forEach((f, i) => this.tone(f, 0.07, 'sine', 0.035, f * 1.8, i * 0.12)); };
Sfx.extra.vdLevHop = function () { this.tone(220, 0.2, 'triangle', 0.05, 540); this.tone(150, 0.12, 'sine', 0.03, 300, 0.03); };
Sfx.extra.vdLevLand = function () { this.tone(110, 0.16, 'triangle', 0.07, 55); this.tone(260, 0.05, 'square', 0.025, 170); };
Sfx.extra.vdLevLocked = function (p) { this.tone(240 * p, 0.05, 'square', 0.035, 200 * p); this.tone(240 * p, 0.05, 'square', 0.035, 200 * p, 0.09); };
Sfx.extra.vdLevAww = function () { this.tone(520, 0.18, 'triangle', 0.035, 380); this.tone(400, 0.26, 'triangle', 0.035, 300, 0.16); };
// a dot added to the current path, so many dots fill in one call
function vdlDot(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }

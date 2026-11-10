/* Pip & Bo - Computer partner brain for 28-4 Camel Race (mode 'camelrace'). */
'use strict';

(() => {
  /* The computer is the other rider. It presses the same keys a person does: ▲ (a fresh press) jumps, ▼ in the air
     drops faster, the action eats a date for a dash.
     Jumping: every reaction time (Hard 0.05 s, Normal 0.12 s, Easy 0.3 s) it tries "jump now", "jump a little later"
     (up to 0.6 s) and "don't jump" with the level's own movement (MODES.camelrace.test.move) over what it can see
     (Hard 520 px ahead, Easy 260), and scores each: hitting a cactus or rocks is very bad, a pot or quicksand bad,
     a splash a little bad, a Perfect landing good, a Thud a little bad, a scarab good. It jumps when "now" is the
     best plan. Easy and Normal sometimes don't see a thing in time (Easy 30%, Normal 8%), and press a little early or
     late (Easy ± 0.09 s, Normal ± 0.04 s), so they get Thuds and bumps now and then; Easy only goes for Perfect
     landings half the time.
     In the air it holds ▼ when dropping sooner gives the better landing.
     Dates: a dash at "GO!" for a Great start (Hard always, Normal half the time, Easy 1 in 5), then a dash whenever
     its dates are full (so a new one can grow) and nothing is right in front of it; Hard keeps one for the last
     stretch.
     What it reads: the course ahead and its own camel. Never the other player's keys.
     It talks (1-player mode only) in short bubbles: "Hup!", "Giddy-up!", "Good race!". */
  const SK = {
    easy: { look: 260, react: 0.3, see: 0.7, noise: 0.09, perfP: 0.5, startP: 0.2, keep: 0, downP: 0.3 },
    normal: { look: 400, react: 0.12, see: 0.92, noise: 0.04, perfP: 0.85, startP: 0.5, keep: 0, downP: 0.8 },
    hard: { look: 520, react: 0.05, see: 1, noise: 0, perfP: 1, startP: 1, keep: 1, downP: 1 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const M = () => MODES.camelrace.test;
  const SDT = 1 / 60;
  const PEN = { cactus: -100, rocks: -100, pot: -40, sand: -45, water: -18, perfect: 14, thud: -8, scarab: 10 };

  // run one plan: wait `delay` s on the ground (or in the air, with down held when `down`), jump, fly, land, and
  // keep running until `horizon` s. Returns its score. With `again`, the best next jump after the first landing counts
  // too (so it doesn't land just in front of a cactus it can't get over).
  const AGAIN = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  function score(c, me, seenObs, delay, jump, down, horizon, perfP, again, t0) {
    t0 = t0 || 0;
    const q = M(), CR = q.CR;
    const D = { k: me.k, x: me.x, y: me.y, vy: me.vy, sp: me.sp, air: me.air, airT: me.airT, lane: me.lane, dashT: me.dashT, boostT: me.boostT, sink: me.sink, tail: me.tail, done: false };
    let s = 0, t = 0, jumped = false, lastZone = me.air ? null : q.zoneAt(c, me.x);
    const hit = new Set(), got = new Set();
    let landings = 0;
    while (t < horizon) {
      const want = jump && !jumped && !D.air && t >= delay;
      if (want) jumped = true;
      q.speed(c, D, SDT);
      const ev = q.move(c, D, { jump: want, down: down && D.air }, SDT);
      D.boostT = Math.max(0, D.boostT - SDT);
      t += SDT;
      if (ev === 'land' && D.airT > 0.25) {
        const sl = q.slope(c, D.x);
        if (sl > CR.perfectSlope) { D.sp = Math.min(CR.maxSp, D.sp + CR.perfect); D.boostT = 0.6; } else if (sl < CR.thudSlope) D.sp *= CR.thudKeep;
        if (landings++ === 0) {
          s += sl > CR.perfectSlope ? PEN.perfect * perfP : sl < CR.thudSlope ? PEN.thud : 0;
          if (again && jumped && horizon - t > 0.2) {
            let rest = score(c, D, seenObs, 0, false, false, horizon - t, perfP, false, t0 + t);
            for (const d of AGAIN) rest = Math.max(rest, score(c, D, seenObs, d, true, false, horizon - t, perfP, false, t0 + t));
            return s + rest;
          }
        }
      }
      for (const o of seenObs) {
        if (hit.has(o) || Math.abs(o.x - D.x) > 26) continue;
        if (D.y > q.ground(c, D.lane, o.x) - o.h + 4) { hit.add(o); s += PEN[o.k] * (1 - (t0 + t) / 3); }
      }
      if (!D.air) {
        const z = q.zoneAt(c, D.x);
        if (z && z !== lastZone) s += PEN[z.k] * (1 - (t0 + t) / 3);
        lastZone = z;
      }
      for (const sc of c.scarabs) {
        if (got.has(sc) || sc.got[me.k] || Math.abs(D.x - sc.x) > 26) continue;
        if (Math.abs(D.y - 40 - (q.ground(c, D.lane, sc.x) - sc.dy)) < 30) { got.add(sc); s += PEN.scarab; }
      }
    }
    return s;
  }

  cpuBrain('camelrace', {
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst;
      if (!st || !st.cam || !st.pl) return null;
      const D = st.pl[p.id], x = D.x - st.cam.x;
      return x < 0 || x > W ? null : { x, y: Math.max(110, D.y - 150) };
    },
    reset(S) { S.pl = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !st.course || !m) return out;
      const sk = skOf(info.skill), me = st.pl[p.id], c = st.course, CR = M().CR;
      if (S.pl !== st.pl) {
        S.pl = st.pl; S.planT = 0; S.jumpAt = null; S.down = false; S.wasJump = false; S.saidEnd = false;
        S.startDash = Math.random() < sk.startP; S.startAt = 0.05 + Math.random() * 0.3; S.started = false;
        S.blind = new Set(); S.looked = new Set(); S.perf = st.stat.perfect[p.id];
      }
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, 'Giddy-up!');
          else if (m.end.winner === o.id) cpuSay(p, 'Good race!');
        }
        return out;
      }
      if (st.ph !== 'race' || me.done) return out;
      // a Great start
      if (!S.started && st.rt >= S.startAt) { S.started = true; if (S.startDash) { out.act = 'tap'; return out; } }
      if (st.stat.perfect[p.id] > S.perf) { S.perf = st.stat.perfect[p.id]; if (Math.random() < 0.25) cpuSay(p, 'Hup!'); }
      // what it noticed: each obstacle and zone gets one look when it comes into view; some are missed for a moment
      const seen = [];
      for (const ob of c.obs) {
        if (ob.hit[p.id] || ob.broke[p.id] || ob.x < me.x - 30 || ob.x > me.x + sk.look) continue;
        if (!S.looked.has(ob)) { S.looked.add(ob); if (Math.random() > sk.see) S.blind.add(ob); }
        if (S.blind.has(ob) && ob.x - me.x > 70) continue;   // noticed late
        seen.push(ob);
      }
      const cv = { obs: seen, zones: c.zones.filter(z => z.x1 > me.x && z.x0 < me.x + sk.look && !(S.blind.has(z) && z.x0 - me.x > 60)), scarabs: c.scarabs, len: c.len, f: c.f, ph: c.ph };
      for (const z of c.zones) if (z.x0 > me.x && z.x0 < me.x + sk.look && !S.looked.has(z)) { S.looked.add(z); if (Math.random() > sk.see) S.blind.add(z); }
      // keep the real dunes for the movement (zones/obstacles filtered to what it saw)
      const course = Object.assign({}, c, cv);
      // plan
      S.planT -= dt;
      if (S.planT <= 0) {
        S.planT = sk.react * (0.8 + Math.random() * 0.4);
        const H = 1.25;
        if (!me.air) {
          const none = score(course, me, seen, 0, false, false, H, sk.perfP, false);
          let best = none, bestD = null;
          for (let d = 0; d <= 0.6 + 1e-9; d += 0.04) {
            const s = score(course, me, seen, d, true, false, H, sk.perfP, true);
            if (s > best + 0.5) { best = s; bestD = d; }
          }
          if (bestD !== null && bestD < 0.04 + sk.react) S.jumpAt = st.rt + Math.max(0, bestD + sk.noise * (Math.random() * 2 - 1));
          else S.jumpAt = null;
        } else {
          S.jumpAt = null;
          const a = score(course, me, seen, 0, false, false, 1.0, sk.perfP), b = score(course, me, seen, 0, false, true, 1.0, sk.perfP);
          S.down = b > a + 1 && Math.random() < sk.downP;
        }
      }
      if (!me.air && S.jumpAt !== null && st.rt >= S.jumpAt && !S.wasJump) { out.jump = true; S.jumpAt = null; }
      if (me.air && S.down) out.down = true;
      if (!me.air) S.down = false;
      S.wasJump = !!out.jump;
      // dates: dash when full (a new one grows), when nothing is right in front
      const keep = sk.keep && c.len - me.x > 700 ? sk.keep : 0;
      const ahead = Math.max(200, me.sp * 1.1), clear = !me.air && S.jumpAt === null && !seen.some(ob => ob.x > me.x - 20 && ob.x - me.x < ahead) && !c.zones.some(z => z.x1 > me.x && z.x0 < me.x + ahead);
      if (me.dashT <= 0 && me.dates >= 1 && clear && !out.jump) {
        const final = c.len - me.x < 700;
        if ((me.dates >= me.maxDates && me.dates > keep) || final) out.act = 'tap';
      }
      return out;
    },
  });
})();

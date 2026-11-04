/* Pip & Bo - Computer partner: rising lava. */
'use strict';

/* 5-4 Rising Lava (MODES.lava). Every button builds steps for the partner, so the brain plays its colour's jobs in
   whatever order the floor allows, using cpuNav (built steps of its colour count as ground, the partner's don't):
   1. press its own buttons that it can reach and that have not been pressed yet (they only ever help the partner);
   2. hold its own hold plate while the partner has not yet climbed past the steps it builds (the level's "past" is
      the partner's highest point this floor, so a person who goes a different way is still waited for);
   3. stand on its star button (top floor) until the hatch opens, then go to the door; on other floors go to the door
      once it can reach it;
   4. nothing to do: wait next to the lowest of the steps the partner will build for it, up out of the lava's way, and
      climb them as soon as they pop in (they make the next job reachable). Stuck below with no way up: hold ▼ to hop
      back to the checkpoint.
   It reads the same things a person sees: buttons, ghost steps, the lava, the partner. When the person has pressed
   nothing for the level's own AFK time (and isn't holding a button), it stands still too, so the lava pauses. */
(() => {
  const LV_K = {
    replan: 0.35,      // s between fresh looks at the jobs (sooner when the steps change)
    lavaGap: 75,       // px: a waiting spot this far above the lava is safe
    sayEvery: 8,       // s between speech bubbles
    nudge: 5,          // s waiting for the person before a bubble
    hopMs: 2,          // ms per step looking for a tricky hop
    politeMax: 10,     // s at most waiting by a button for a partner who isn't climbing on to come to its new steps
  };

  // shortest times (s) from the player's map cell to every cell of cpuNav's map
  function lvDist(g, from) {
    const n = g.cells.length, d = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
    d[from] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const e of g.cells[u].edges) if (d[u] + e.t < d[e.to]) d[e.to] = d[u] + e.t;
    }
    return d;
  }
  // the map cell a player stands in (a head or a corner: the nearest cell at about that height)
  function lvFrom(g, p) {
    if (!p.grounded) return null;
    const tx = Math.floor(cpuCx(p) / T), ty = Math.floor((cpuFeet(p) - 1) / T), n = g.at.get(ty * COLS + tx);
    if (n) return n;
    let best = null, bd = Infinity;
    for (const k of g.cells) { const dd = Math.abs(k.tx * T + T / 2 - cpuCx(p)) + Math.abs((k.ty + 1) * T - cpuFeet(p)) * 3; if (dd < bd) { bd = dd; best = k; } }
    return bd < 60 ? best : null;
  }
  const lvCell = (g, c, r) => g.at.get(r * COLS + c);
  const lvTop = gr => Math.min(...gr.cells.map(cl => cl.r)) * T;
  // the partner has climbed past these steps (their highest point this floor is above the top step)
  const lvPast = (st, gr, o) => st.best[o.id] < lvTop(gr) - T / 2;

  /* ---------- tricky hops ----------
     cpuNav jumps with jump held all the way. Under a low ceiling (steps the partner built above you) the way on can
     need a short hop. When a job can't be reached, this tries short hops (jump held 0.03-0.45 s, standing or with a
     one-tile run-up) from the cells it can reach to nearby cells that lead to the job, with the game's own physics
     (navSim), a few pairs per step. A hop counts only if it also lands from a few px either side. */
  const LV_HOLDS = [0.03, 0.06, 0.1, 0.14, 0.18, 0.22, 0.27, 0.33, 0.45], LV_DELAYS = [0, 0.08, 0.16, 0.25], LV_OFFS = [0, -4, 4, -8, 8];
  function lvHopSim(g, p, a, b, dir, run, off, hold, delay) {
    const s = { x: a.tx * T + T / 2 + off - PW / 2, y: (a.ty + 1) * T - PH, vx: run ? dir * PHYS.maxRun : 0, vy: -PHYS.jumpV, g: false, jumping: true, dropT: 0 };
    for (let t = 0; t < 1.6; t += DT) {
      navSim({}, p, s, t >= delay ? dir : 0, t < hold, DT);
      if (s.y > H || navSpike(s.x, s.y, PW, PH)) return false;
      if (s.g && t > 0.03) {
        for (let k = 0; k < 18; k++) navSim({}, p, s, 0, false, DT); // let go on landing: does it stay there?
        return s.g && Math.floor((s.x + PW / 2) / T) === b.tx && Math.floor((s.y + PH - 1) / T) === b.ty;
      }
    }
    return false;
  }
  function lvHopFind(st, g, p, D, ms) {
    const key = g.key + '|' + st.want.map(w => w.c + ',' + w.r).join(';');
    let H0 = st.hops;
    if (!H0 || H0.key !== key) {
      // cells that lead to a wanted job (backwards over cpuNav's moves)
      const lead = new Uint8Array(g.cells.length), back = g.cells.map(() => []), todo = [];
      for (const c of g.cells) for (const e of c.edges) back[e.to].push(c.i);
      for (const w of st.want) { const n = lvCell(g, w.c, w.r); if (n && !lead[n.i]) { lead[n.i] = 1; todo.push(n.i); } }
      while (todo.length) { const i = todo.pop(); for (const j of back[i]) if (!lead[j]) { lead[j] = 1; todo.push(j); } }
      const pairs = [];
      for (const a of g.cells) {
        if (D[a.i] === Infinity) continue;
        for (const b of g.cells) {
          const dx = b.tx - a.tx, dy = b.ty - a.ty;
          if (!lead[b.i] || D[b.i] < Infinity || !dx || Math.abs(dx) > 5 || dy < -4 || dy > 3) continue;
          pairs.push({ a, b, cost: D[a.i] + Math.abs(dx) * 0.1 });
        }
      }
      pairs.sort((x, y) => x.cost - y.cost);
      H0 = st.hops = { key, pairs, i: 0, found: null };
    }
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), t0 = now();
    while (!H0.found && H0.i < H0.pairs.length && now() - t0 < ms) {
      const { a, b } = H0.pairs[H0.i++], dir = Math.sign(b.tx - a.tx);
      const canRun = !!lvCell(g, a.tx - dir, a.ty);
      for (const run of canRun ? [1, 0] : [0]) for (const hold of LV_HOLDS) for (const delay of run ? [0] : LV_DELAYS) for (const off of LV_OFFS) {
        if (H0.found) break;
        if (lvHopSim(g, p, a, b, dir, run, off, hold, delay) && lvHopSim(g, p, a, b, dir, run, off - 2, hold, delay)
          && lvHopSim(g, p, a, b, dir, run, off + 2, hold, delay) && lvHopSim(g, p, a, b, dir, run, off, hold + DT, delay)) {
          H0.found = { a: { c: a.tx, r: a.ty }, b: { c: b.tx, r: b.ty }, dir, run, off, hold, delay };
        }
      }
    }
    return H0.found;
  }
  // doing a hop: get on its cell, back up (run-up), go, press jump at the take-off point, let go after `hold`
  function lvHopRun(st, p, h, dt) {
    const out = {}, R = st.hopRun, ax = h.a.c * T + T / 2, tx = ax + h.off, cx = cpuCx(p);
    if (R.phase === 'goto') {
      const r = cpuNav(st, p, ax, (h.a.r + 1) * T, { tol: 3 });
      if (st.nav.status === 'arrived' && Math.abs(p.vx) < 20) R.phase = h.run ? 'back' : 'line';
      if (st.nav.status === 'noPath') return null;
      return r;
    }
    if (R.phase === 'back') { if (cpuSeek(out, p, ax - h.dir * T, 2) && Math.abs(p.vx) < 15) R.phase = 'go'; return out; }
    if (R.phase === 'line') { if (cpuSeek(out, p, tx, 1) && Math.abs(p.vx) < 5) R.phase = 'go'; return out; }
    if (R.phase === 'go') {
      if (h.run) { out.left = h.dir < 0; out.right = h.dir > 0; if ((cx - tx) * h.dir < 0) return out; }
      if (CPU.last[p.id].jump) return {};
      out.jump = true; R.phase = 'air'; R.t = 0;
      return out;
    }
    R.t += dt;
    out.jump = R.t < h.hold;
    if (R.t >= h.delay) { out.left = h.dir < 0; out.right = h.dir > 0; }
    if (R.t > 0.05 && p.grounded) return null; // landed: done
    if (R.t > 2) return null;
    return out;
  }

  // what to do now: { c, r, kind } (stand in cell c,r) or { kind: 'back' } or null
  function lvPlan(st, p, o, g, D, info) {
    const S = G.mst, k = p.id;
    const reach = (c, r) => { const n = lvCell(g, c, r); return n ? D[n.i] : Infinity; };
    const pick = list => {
      let best = null;
      for (const j of list) { const t = reach(j.c, j.r); if (t < Infinity && (!best || t < best.t)) best = Object.assign({ t }, j); }
      return best;
    };
    st.want = []; // the jobs it can't reach yet (lvHopFind looks for a tricky hop to them)
    const cat = list => { const j = pick(list); if (!j) st.want.push(...list); return j; };
    // 1. my buttons not pressed yet. Manners: new steps can be in the way (a low ceiling) while the partner is still on
    //    the way to them, so press when the partner stands by the lowest new step, or waits for me, or after politeMax s
    const mine = S.buttons.filter(b => b.owner === k && !b.hold && !b.latched && S.groups[b.group]);
    const oc = Math.floor(cpuCx(o) / T), orow = Math.floor((cpuFeet(o) - 1) / T);
    const waiting = info.partnerIdle > 5;
    const rude = b => {
      // (two computers don't wait for each other: a computer gets past a low ceiling with a short hop, see below)
      if (info.partnerCpu || (st.polite[b.ch] || 0) >= LV_K.politeMax) return false;
      if (!o.alive) return true; // (an ouch: wait to see where they pop back)
      const cells = S.groups[b.group].cells, low = Math.max(...cells.map(cl => cl.r));
      // (standing still up level with them, not under them: waiting for me. Not while they still climb up to that level
      //  or stand under the new steps: those make a low ceiling over the way up)
      const under = cells.some(cl => Math.abs(cl.c - oc) <= 1 && cl.r < orow - 1 && cl.r >= orow - 5);
      if (waiting && orow <= low + 1 && !under) return false;
      // (a partner who hasn't climbed yet this floor and stands about level with the steps counts as near from anywhere
      //  on that level: the opening presses, where you both press at once and then climb, must not wait)
      const fresh = S.best[o.id] >= G.level.spawns[o.id].y + PH - T / 2, span = fresh ? COLS : 3;
      return !(o.grounded && orow >= low && orow <= low + 2 && cells.some(cl => cl.r === low && Math.abs(cl.c - oc) <= span));
    };
    let j = cat(mine.filter(b => !rude(b)).map(b => ({ c: b.c, r: b.r, kind: 'press' })));
    if (j) return j;
    // (wait on my side of the button, a cell or two away from it: a jump that lands right next to it can slide onto it.
    //  Not on any button or on a cell where my own steps will pop in)
    const btnAt = (c, r) => S.buttons.some(b => b.c === c && b.r === r) || S.twins.some(tw => tw.c === c && tw.r === r);
    const myGhost = (c, r) => Object.values(S.groups).some(gr => gr.holder === k && gr.state !== 'on' && gr.cells.some(cl => cl.c === c && cl.r === r));
    for (const b of mine.filter(rude)) {
      if (reach(b.c, b.r) === Infinity) continue;
      const s = cpuCx(p) < b.c * T + T / 2 ? -1 : 1;
      let best = null;
      for (const cell of g.cells) {
        const t = D[cell.i], dx = (cell.tx - b.c) * s, dy = cell.ty - b.r;
        if (t === Infinity || dx < (dy ? 1 : 2) || dx > 6 || Math.abs(dy) > 4 || btnAt(cell.tx, cell.ty) || myGhost(cell.tx, cell.ty)) continue;
        const hot = (cell.ty + 1) * T > S.lavaY - LV_K.lavaGap;
        const score = dx + Math.abs(dy) * 1.5 + t * 0.3 + (hot ? 40 : 0);
        if (!best || score < best.score) best = { c: cell.tx, r: cell.ty, kind: 'polite', ch: b.ch, side: s, score };
      }
      if (best) return best;
      return { c: b.c, r: b.r, kind: 'press' }; // (nowhere to wait on my side: just press it)
    }
    // 2. my hold plates the partner still needs
    j = cat(S.buttons.filter(b => b.owner === k && b.hold && S.groups[b.group] && !lvPast(S, S.groups[b.group], o)).map(b => ({ c: b.c, r: b.r, kind: 'hold' })));
    if (j) return j;
    // 3. my star, then the door
    if (S.twins.length && !S.hatchOpen) {
      j = cat(S.twins.filter(tw => tw.owner === k).map(tw => ({ c: tw.c, r: tw.r, kind: 'star' })));
      if (j) return j;
    }
    const d = G.level.door;
    if (d && (!S.twins.length || S.hatchOpen)) {
      const c0 = Math.floor(d.x / T), r = Math.round((d.y + d.h) / T) - 1;
      // Pip takes the left half, Bo the right, unless the partner already stands there
      const mySide = c0 + k, theirSide = c0 + 1 - k;
      const cs = oc === mySide && Math.abs(cpuFeet(o) - (r + 1) * T) < 4 ? [theirSide, mySide] : [mySide, theirSide];
      for (const c of cs) if (reach(c, r) < Infinity) return { c, r, kind: 'door' };
      st.want.push(...cs.map(c => ({ c, r, kind: 'door' })));
    }
    // 4. wait by the steps the partner will build for me, out of the lava's way
    const ghosts = Object.values(S.groups).filter(gr => gr.holder === k && gr.state !== 'on' && gr.state !== 'building');
    const mineGhost = (c, r) => ghosts.some(gr => gr.cells.some(cl => cl.c === c && cl.r === r));
    const theirBtn = (c, r) => S.buttons.some(b => b.owner !== k && b.c === c && b.r === r) || S.twins.some(tw => tw.owner !== k && tw.c === c && tw.r === r);
    let best = null;
    for (const gr of ghosts) {
      const low = gr.cells.reduce((a, cl) => (cl.r > a.r ? cl : a), gr.cells[0]);
      for (const cell of g.cells) {
        const t = D[cell.i];
        if (t === Infinity || mineGhost(cell.tx, cell.ty) || theirBtn(cell.tx, cell.ty)) continue;
        // a spot just beside / below the lowest step (not right under it), well above the lava
        const under = gr.cells.some(cl => cl.c === cell.tx && cl.r < cell.ty);
        const feet = (cell.ty + 1) * T, hot = feet > S.lavaY - LV_K.lavaGap;
        const score = Math.abs(cell.tx - low.c) + Math.abs(cell.ty - low.r) * 1.5 + (under ? 2 : 0) + (hot ? 40 : 0) + t * 0.3;
        if (!best || score < best.score) best = { c: cell.tx, r: cell.ty, kind: 'wait', score, t };
      }
    }
    if (best) return best;
    // nothing to do from here: hop back if stuck down below my checkpoint (else stay put)
    const cp = S.cp[k], here = lvFrom(g, p);
    if (here && here.ty > cp.r + 1) return { kind: 'back' };
    return null;
  }

  cpuBrain('lava', {
    reset(st) { st.job = null; st.planT = 0; st.key = ''; st.back = 0; st.sayT = 0; st.waitT = 0; st.D = null; st.want = []; st.hops = null; st.hopBan = {}; st.polite = {}; st.react = 0; st.yieldT = 0; st.yieldCD = 0; st.stuckT = 0; },
    think(st, p, o, dt, info) {
      const out = {};
      const S = G.mst, M = MODES.lava;
      if (!S.buttons || !S.cfg || !p.alive) { st.job = null; return out; }
      if (st.sayT > 0) st.sayT -= dt;
      // hop back: let go a moment, then hold ▼ for a second
      if (st.back > 0) {
        st.back -= dt;
        if (st.back > 1.15) return out;
        if (!p.grounded || p.onOneWay || M.onAnyButton(p)) { st.back = 0; return out; }
        out.down = true;
        return out;
      }
      if (info.intro && G.introT > 0.4) return out;
      // the person walked away (and isn't holding a button for us): stand still so the level's own pause kicks in
      if (!info.partnerCpu && info.partnerIdle > S.cfg.afkPause && !M.onOwnButton(o) && p.grounded) { st.job = null; return out; }
      // steps popping in one by one: wait for the whole group (each change rebuilds the way map, so don't look mid-build)
      if (Object.values(S.groups).some(gr => gr.state === 'building')) {
        if (p.grounded) return out;
        const l = CPU.last[p.id];
        return { left: l.left, right: l.right, jump: l.jump };
      }
      const g = navGraph(p, {});
      // a tricky hop under way (dropped if the tiles change before take-off)
      if (st.job && st.job.kind === 'hop') {
        const h = st.job.h;
        if (st.key === g.key || st.hopRun.phase === 'air') {
          const r = lvHopRun(st, p, h, dt);
          if (r) return r;
          if (st.hopRun.phase === 'air') {
            const at = lvFrom(g, p), hk = h.a.c + ',' + h.a.r + '>' + h.b.c + ',' + h.b.r;
            if (!at || at.tx !== h.b.c || at.ty !== h.b.r) st.hopBan[hk] = G.time + 4; // missed (bumped?): try another way for a bit
          }
        }
        st.job = null; st.planT = 0;
      }
      // a fresh look now and then, or right away when the tiles changed (steps popped in or faded)
      st.planT -= dt;
      if (p.grounded && (st.planT <= 0 || st.key !== g.key)) {
        const here = lvFrom(g, p);
        if (here) {
          st.planT = LV_K.replan; st.key = g.key;
          const prev = st.job;
          st.D = lvDist(g, here.i);
          st.job = lvPlan(st, p, o, g, st.D, info);
          if (!prev || !st.job || prev.kind !== st.job.kind) st.waitT = 0;
          if (st.job && (!prev || prev.c !== st.job.c || prev.r !== st.job.r)) st.react = (1 - info.skill) * 0.5;
        }
      }
      // a job out of reach: look for a tricky hop to it (a little each step)
      if (st.D && st.want && st.want.length && (!st.job || st.job.kind === 'wait' || st.job.kind === 'back')) {
        const h = lvHopFind(st, g, p, st.D, LV_K.hopMs);
        if (h && !(G.time < (st.hopBan[h.a.c + ',' + h.a.r + '>' + h.b.c + ',' + h.b.r] || 0))) {
          st.job = { kind: 'hop', h }; st.hopRun = { phase: 'goto', t: 0 };
          return lvHopRun(st, p, h, dt) || out;
        }
      }
      const j = st.job;
      if (!j) return out;
      if (j.kind === 'back') {
        const canHold = p.grounded && !p.onOneWay && !M.onAnyButton(p);
        if (canHold) { st.back = 1.3; st.job = null; }
        return out;
      }
      // (not while they climb on; slowly while they move about down below, so a slow starter isn't rushed)
      if (j.kind === 'polite' && S.sinceUp[o.id] > 8) st.polite[j.ch] = (st.polite[j.ch] || 0) + dt * (info.partnerIdle > 1.5 ? 1 : 0.25);
      // a short think before setting off to a new job (longer on easy)
      if (st.react > 0 && p.grounded) { st.react -= dt; return out; }
      // stuck nose to nose with the partner (the criss-cross stairs): one of us stands aside for a moment and lets the
      // other hop past (a person always gets to go first; between two computers, Pip waits)
      if (st.yieldT > 0) { st.yieldT -= dt; if (p.grounded) return out; }
      st.yieldCD -= dt;
      const near = o.alive && Math.abs(cpuCx(o) - cpuCx(p)) < 50 && Math.abs(cpuFeet(o) - cpuFeet(p)) < 60;
      st.stuckT = near && st.nav && st.nav.status !== 'arrived' ? st.stuckT + dt : Math.max(0, st.stuckT - dt);
      if (st.stuckT > 0.8 && st.yieldCD <= 0 && (!info.partnerCpu || p.id === 0)) { st.stuckT = 0; st.yieldT = 1.4; st.yieldCD = 3.5; return out; }
      // (waiting by my button: the far half of the next cell, so I never stand on the button by mistake)
      const jx = j.c * T + T / 2 + (j.kind === 'polite' ? j.side * 5 : 0);
      const res = cpuNav(st, p, jx, (j.r + 1) * T, { tol: j.kind === 'wait' ? 6 : j.kind === 'polite' ? 4 : 5 });
      const there = st.nav.status === 'arrived';
      st.waitT = there ? st.waitT + dt : 0;
      // a few words for a person who seems unsure (1-player mode only)
      if (there && !info.partnerCpu && st.sayT <= 0 && st.waitT > LV_K.nudge && info.partnerIdle > 3) {
        const line = j.kind === 'wait' ? 'Press your button!' : j.kind === 'polite' ? 'Come on up!' : j.kind === 'hold' ? 'Go! I’m holding!' : j.kind === 'star' ? 'Stand on your star!' : j.kind === 'door' ? 'Meet at the door!' : null;
        if (line) { cpuSay(p, line, 2.5); st.sayT = LV_K.sayEvery; }
      }
      return res;
    },
  });
  CPU.brains.lava.model = { lvPlan, lvDist, lvFrom, lvHopFind }; // (tests)
})();

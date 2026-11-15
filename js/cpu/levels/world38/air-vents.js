/* Pip & Bo - Computer partner brain for 38-3 Air Vent Crawl (mode 'spyvents'). */
'use strict';

(() => {
  /* 38-3 (MODES.spyvents): the brain knows the maze (like Shipwreck Lights' brain knows the wreck): it reads
     MODES.spyvents.plan(st), the route's steps for each agent (where to be, which way to shine, which panel to hack),
     and walks there by grid distances (MODES.spyvents.bfs). On top of the plan:
     - creeps (0.12 s on, 0.15 s off, never reaching the boom speed) on and onto dented metal; holds ▼ in drop shafts;
     - waits before a steam vent until it won't burst while crossing; waits at a failing fan for it to stop;
     - as LIGHT: covers the torch while the cone would light a grate with its Zero under it (now or within 0.8 s), and
       keeps it uncovered on a panel while the hacker works (it never turns away until the pattern is done); never
       gets more than 4 cells (about 150 px) ahead of the hacker;
     - as HACKER: opens the panel and presses the arrows at a person-like 0.25 s a press, only while they're readable;
       in the dark it says "Light, please!" instead of guessing;
     - shuts doors behind it when a Sniffer is close (the plan's optional 'close' steps); reels in side ducts are
       skipped while a Sniffer is within 320 px. */
  const M = () => MODES.spyvents;
  cpuBrain('spyvents', {
    reset(s) { s.pulse = 0; s.pressT = 0; s.darkT = 0; s.coverT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.ag || info.intro || st.state !== 'go' || st.waiting) return out;
      const m = M(), S = m.S, pl = m.plan(st), a = st.ag[p.id], b = st.ag[1 - p.id], P = pl.ag[p.id];
      if (!P) return out;
      const isLight = p.id === st.lightId;
      // the wrist screen is open: press the pattern, one arrow every 0.25 s, only while it can be read
      if (st.hack && st.hack.who === p.id) {
        const pn = st.L.panels[st.hack.p];
        s.pressT -= dt;
        if (!m.readable(st, pn)) { s.darkT += dt; if (s.darkT > 1.5 && !info.partnerCpu) { s.darkT = -3; cpuSay(p, 'Light, please! Shine it on the panel.', 1.8); } return out; }
        s.darkT = 0;
        // (one press per arrow: it waits to see the arrow tick before the next, so a slow hand never presses twice)
        if (s.sentI === st.hack.i && s.sentP === st.hack.p && s.pressT > -1.2) return out;
        if (s.pressT <= 0) { s.pressT = 0.25; s.sentI = st.hack.i; s.sentP = st.hack.p; const d = pn.seq[st.hack.i]; if (d === 'l') out.left = true; else if (d === 'r') out.right = true; else if (d === 'u') out.jump = true; else out.down = true; }
        return out;
      }
      // the torch: cover it while it would light a guard under a grate
      if (isLight) {
        if (m.grateRisk(st, a, 0.8)) s.coverT = 0.3;
        if (s.coverT > 0) { s.coverT -= dt; out.act = true; }
      }
      if (P.act) out.act = P.act;
      const here = m.cellOf(a.x, a.y);
      // in a drop shaft: brake all the way down, whatever else is going on
      if (m.chAt(st, here.c, here.r) === 'v') { out.down = true; return out; }
      if (!P.to) return out;
      const [tc, tr] = P.to;
      // at the spot: face the way the plan wants (the light shining on a panel), open a panel
      // (once there, it counts as there until 8 px off, so turning to face the panel never sets it walking again)
      const off = Math.hypot(a.x - m.cx(tc), a.y - m.cy(tr)), key = tc + ',' + tr;
      if (off < 3) s.at = key; else if (off > 8 || s.at !== key) s.at = null;
      if (s.at === key) {
        if (P.face && (a.td[0] !== P.face[0] || a.td[1] !== P.face[1])) dirOut(out, P.face);
        if (!isLight && P.hack != null && !st.hack) out.act = 'tap';
        return out;
      }
      // never stop inside a steam vent
      const inSteam = m.chAt(st, here.c, here.r) === 's';
      // pacing: the one ahead waits (the light stays within about 150 px of the hacker, and the hacker never crawls
      // off into the dark ahead of the light)
      const far = ahead(st, m, a, b, pl);
      // (a reel is a short side trip: it goes and comes back, rather than wait at the side duct for a person who
      // has crawled on along the main duct)
      if (!inSteam && P.why !== 'rush' && P.why !== 'reel' && far > ((P.why === 'catch' || P.why === 'shine') ? 6 : isLight ? 4 : 3)) return out;
      // the next cell along the shortest way
      const D = m.bfs(st, tc, tr, a);
      const id = here.c + here.r * st.L.cols;
      let dir = null;
      if (D[id] === 0) dir = [Math.sign(m.cx(tc) - a.x), Math.sign(m.cy(tr) - a.y)];
      else for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (here.c + dx) + (here.r + dy) * st.L.cols; if (D[n] >= 0 && D[n] < D[id]) { dir = [dx, dy]; break; } }
      if (!dir) return out;
      const nc = here.c + dir[0], nr = here.r + dir[1], nch = m.chAt(st, nc, nr), ch = m.chAt(st, here.c, here.r);
      // steam ahead: only step in when it won't burst while we cross
      const sv = m.steamAt(st, nc, nr);
      if (sv && ch !== 's') for (let t = 0; t <= 1.2; t += 0.05) if (m.steamPhase(sv, st.T + t) === 'on') return out;
      // drop shafts: brake all the way down
      if (ch === 'v' || nch === 'v') { out.down = true; return out; }
      // dented metal: creep
      if ((ch === 'm' || nch === 'm') && !inSteam) { s.pulse = (s.pulse + dt) % 0.27; if (s.pulse > 0.12) return out; }
      dirOut(out, dir);
      return out;
    },
  });
  function dirOut(out, d) { if (d[0] > 0) out.right = true; else if (d[0] < 0) out.left = true; else if (d[1] > 0) out.down = true; else if (d[1] < 0) out.jump = true; }
  // how many cells a is ahead of b along the route (0 when it isn't ahead)
  function ahead(st, m, a, b, pl) {
    if (a.step < b.step) return 0;
    const ca = m.cellOf(a.x, a.y), cb = m.cellOf(b.x, b.y);
    const D = m.bfs(st, cb.c, cb.r, null, { thru: () => false });
    const d = D[ca.c + ca.r * st.L.cols];
    if (d < 0) return 0;
    if (a.step === b.step) {
      const P = pl.ag[a.id];
      if (!P.to) return 0;
      const T = m.bfs(st, P.to[0], P.to[1], null);
      const da = T[ca.c + ca.r * st.L.cols], db = T[cb.c + cb.r * st.L.cols];
      if (da < 0 || db < 0 || da >= db) return 0;
    }
    return d;
  }
})();

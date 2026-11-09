/* Pip & Bo - Computer partner brain for 28-1 Rolling Boulder Run (mode 'boulderrun'). */
'use strict';

/* How the computer plays Rolling Boulder Run
   It works in world coordinates (p.x + camX) and reads the run's course from G.mst: floors, gaps, crumbled tiles,
   steps, doors and their levers, rubble piles, ceiling rocks, and the boulder. Every step:
   - The team's next blocker is the nearest shut door or standing rubble pile ahead of it.
       its job (pull)  -> run to the lever and hold the action until the door grinds up.
       its job (smash) -> run up to the pile and keep tapping the action until it bursts.
       not its job     -> wait 40 px in front of the blocker ("Pull the lever!" / "Smash the rubble!" in 1-player).
   - Otherwise it runs right. It jumps when a gap (or a crumbled tile) or a step is just ahead, holding the jump for a
     full-height jump. A ceiling rock that is shaking just ahead: it waits for it to drop (unless the boulder is right
     behind, then it dashes under). A rock shaking right over it: it keeps running.
   - It never runs far ahead of a person: more than 380 px in front, it waits ("Come on!"), unless the boulder is close.
   It can't finish alone: only the puller can open doors and only the smasher can clear rubble. */
(() => {
  const M = () => MODES.boulderrun;
  function think(st, p, o, dt, info) {
    const out = {}, ms = info.mst;
    if (!ms || !ms.c || ms.state !== 'run' || info.intro) return out;
    const P = ms.pl[p.id];
    if (!P || P.flat > 0 || P.whoops || !p.alive) return out;
    const c = ms.c, cam = ms.camX, cx = p.x + p.w / 2 + cam, ocx = o.x + o.w / 2 + cam;
    const job = M().test.brJob(ms, p.id), B = ms.b;
    const bGap = B && B.state === 'roll' ? cx - (B.x + M().BR.r) : 999;
    // the next blocker ahead
    let blk = null;
    for (const d of c.doors) if (!d.lever.done && d.x0 > cx - 30 && (!blk || d.x0 < blk.x)) blk = { k: 'door', x: d.x0, d };
    for (const r of c.rubble) if (!r.off && r.x0 > cx - 30 && (!blk || r.x0 < blk.x)) blk = { k: 'rubble', x: r.x0, r };
    let target = cx + 300, act = false;
    if (blk && blk.x - cx < 700) {
      if (blk.k === 'door') {
        if (job === 'pull') {
          target = blk.d.lever.x;
          if (Math.abs(cx - target) < 12 && p.grounded) { act = true; target = cx; }
        } else { target = blk.x - 40; if (Math.abs(cx - target) < 20) cpuSay(p, 'Pull the lever!'); }
      } else {
        if (job === 'smash') {
          target = blk.x - 16;
          if (blk.x - cx < 30) { st.tapT = (st.tapT || 0) + dt; act = 'tap'; target = cx; }
        } else { target = blk.x - 44; if (Math.abs(cx - target) < 20) cpuSay(p, 'Smash the rubble!'); }
      }
    }
    // don't leave a person far behind
    if (!info.partnerCpu && cx - ocx > 380 && bGap > 200 && target > cx) { target = cx; cpuSay(p, 'Come on!'); }
    // ceiling rocks
    for (const r of c.rocks) {
      if (r.st !== 'warn') continue;
      const d = r.x - cx;
      if (d > 0 && d < 80 && bGap > 140 && target > cx) target = Math.min(target, r.x - 70);
      if (Math.abs(d) <= 34) target = Math.max(target, r.x + 80);
    }
    if (target > cx + 6) { out.right = true; } else if (target < cx - 6) { out.left = true; }
    else cpuSeek(out, p, target - cam);
    if (act) out.act = act;
    // jumps
    st.jumpT = Math.max(0, (st.jumpT || 0) - dt);
    if (out.right && p.grounded && st.jumpT <= 0) {
      const look = 18 + Math.max(0, p.vx) * 0.08;
      let need = false;
      for (let x = cx + 8; x <= cx + look; x += 4) if (M().test.brGapAt(c, x)) need = true;
      for (const s of c.steps) if (s.x0 - (cx + 11) > -2 && s.x0 - (cx + 11) < 26 && p.y + p.h > s.y0 + 1) need = true;
      // a crumbling tile just ahead with a gap after it: jump from solid ground
      if (need) st.jumpT = 0.3;
    }
    if (st.jumpT > 0) out.jump = true;
    return out;
  }
  cpuBrain('boulderrun', { think });
})();

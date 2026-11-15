/* Pip & Bo - Computer opponent brain for 39-4 Gem Rush (mode 'gemrush'). */
'use strict';

(() => {
  /* 39-4 Gem Rush (MODES.gemrush): the computer digs its own way, reading MODES.gemrush.plan(st, id, o): a route over the
     grid to the best gem points per second (value over dig time and walking). It re-plans about twice a second and
     commits to each dig until the cell is open (no flutter). Its digging speed is a person's (the same rules).
     Versus brains use the Opponent setting (info.skill).
     EASY: the nearest gems first, the star gem only late in the round, no care for boulder lines or gas, a 0.3 s pause
       between digs, re-plans slowly, never sabotages.
     NORMAL: values the star gem properly, avoids boulder lines and gas, and about half the time drops a boulder on the
       other digger when one is cheaply available (they are in its shadow line and its support is near).
     HARD: also counts the gems around each target, contests the star gem, always takes a cheap cave-in, re-plans faster.
     LIGHTS LOW: every skill plans only with what its own lamp and the pillar flashes have shown (st.known).
     MOTHERLODE: Normal and Hard go and stand on their plate early; the vault door needs both.
     Fairness: it reads the other digger's position as it was 0.2 s ago (cpuSeen), never its inputs. */
  const M = () => MODES.gemrush;
  cpuBrain('gemrush', {
    reset(S) { S.plan = null; S.planT = 0; S.pause = 0; S.lastDig = null; S.sab = {}; S.wait = 0; S.stuck = 0; S.lastCell = ''; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pl || info.frozen || st.res) return out;
      const id = p.id, P = st.pl[id], sk = info.skill, easy = sk < 0.5, hard = sk > 0.9, GR = M().GR, C_ = GR.cell;
      if (P.buried > 0 || P.lift > 0) { S.plan = null; return out; }
      S.seenO = cpuLag(st, 'gemrushO' + id, { x: st.pl[1 - id].x, y: st.pl[1 - id].y }, 0.2);
      const here = M().cellOf(P), key = here.r + ':' + here.c;
      if (key === S.lastCell) S.stuck += dt; else { S.stuck = 0; S.lastCell = key; }
      S.planT -= dt; S.pause -= dt;
      // re-plan
      if (!S.plan || S.planT <= 0 || !S.plan.path.length || S.plan.goal.got || S.stuck > 2.5) {
        const ex = extras(st, id, easy, hard, S);
        S.plan = M().plan(st, id, {
          star: easy ? (st.t > 35 ? 1 : 0.2) : hard ? 1.25 : 1, avoid: !easy, near: easy, look: hard, route: hard, seen: st.k === 3,
          pause: easy ? 0.3 : 0, extra: ex, shaft: easy ? 0 : 0.5, fall: easy ? 0 : 0.25,
        });
        S.planT = (easy ? 0.65 : hard ? 0.35 : 0.5) * (0.8 + Math.random() * 0.4);
        if (S.stuck > 2.5) S.stuck = 0;
      }
      // digging into rock (pushed off the planned spot): think again
      if (P.dig && P.dig.blocked) { S.plan = null; S.planT = 0; }
      const pl = S.plan;
      if (!pl) return out;
      // drop steps already done
      while (pl.path.length && pl.path[0].r === here.r && pl.path[0].c === here.c) pl.path.shift();
      const step = pl.path[0];
      const cx = (here.c + 0.5) * C_, off = P.x - cx;
      const center = () => { if (off > 3) out.left = true; else if (off < -3) out.right = true; };
      if (!step) {
        // at the goal: a sabotage dig, or wait on a plate
        const g = pl.goal;
        if (g && g.sab) { if (M().solid(M().cellAt(st, here.r, here.c + g.sab))) { out.act = true; if (g.sab > 0) out.right = true; else out.left = true; } else S.plan = null; }
        else if (g && g.plate) { center(); S.wait += dt; if (S.wait > 6 || (st.vault && st.vault.open)) { S.plan = null; S.wait = 0; } }
        else center();
        return out;
      }
      const h = step.how || { k: 'side', dc: Math.sign(step.c - here.c) || 1 };
      const dirKey = d => (d > 0 ? 'right' : 'left');
      const kAt = (r, c) => M().cellAt(st, r, c), solid = M().solid;
      if (easy && S.pause > 0) return out;
      // a person's tiny hesitation after each dig (also keeps two computers from moving as exact mirror images)
      if (S.wasDig && !P.dig) S.hes = easy ? 0.3 + Math.random() * 0.2 : Math.random() * (hard ? 0.03 : 0.16);
      S.wasDig = !!P.dig; S.hes = (S.hes || 0) - dt;
      if (S.hes > 0) return out;
      // commit to a dig in progress until the cell is open (no flutter)
      if (P.dig && !P.dig.blocked && S.digOut && S.digKey === P.dig.r + ':' + P.dig.c) return Object.assign(out, S.digOut);
      // in the air: drift to the middle of the cell (or keep going for a jump up a step)
      if (!P.ground && !(h.k === 'jump' && P.vy < 120)) { center(); return out; }
      // standing on the lip of a hole (the plan has us down in it): step over it and drop first
      if (P.ground && !solid(kAt(here.r + 1, here.c)) && Math.abs(off) > 2) { if (off > 0) out.left = true; else out.right = true; return out; }
      const dig = () => { out.act = true; S.lastDig = st.t; };
      if (h.k === 'down') {
        if (Math.abs(off) > 3) center();
        else if (solid(kAt(here.r + 1, here.c))) { dig(); out.down = true; }
      } else if (h.k === 'diag') {
        if (solid(kAt(here.r, here.c + h.dc)) || solid(kAt(here.r + 1, here.c + h.dc))) { if (Math.abs(off) > 8) center(); else { dig(); out.down = true; out[dirKey(h.dc)] = true; } }
        else out[dirKey(h.dc)] = true;
      } else if (h.k === 'jump') {
        if (P.ground && Math.abs(off) < 6) out.jump = 'tap';
        out[dirKey(h.dc)] = true;
      } else {
        if (solid(kAt(here.r, here.c + h.dc))) { dig(); out[dirKey(h.dc)] = true; }
        else out[dirKey(h.dc)] = true;
      }
      if (out.act) { S.digOut = { act: true, left: !!out.left, right: !!out.right, down: !!out.down }; const dr = out.down ? 1 : 0, dc = out.left ? -1 : out.right ? 1 : 0; S.digKey = dr && dc ? (solid(kAt(here.r, here.c + dc)) ? here.r + ':' + (here.c + dc) : (here.r + 1) + ':' + (here.c + dc)) : dr ? (here.r + 1) + ':' + here.c : here.r + ':' + (here.c + dc); }
      // Easy: a little pause after each dig
      if (easy && !out.act && S.lastDig !== null && st.t - S.lastDig < 0.05) S.pause = 0.3;
      return out;
    },
  });
  // targets other than gems: a cheap cave-in on the other digger (Normal half the time, Hard always), the vault plate
  function extras(st, id, easy, hard, S) {
    const ex = [], M_ = M(), k = M_.kinds, O = st.pl[1 - id];
    if (st.vault && !st.vault.open && !easy) {
      const [r, c] = st.vault.plates[id === 0 ? 0 : 1];
      ex.push({ r: r - 1, c, v: hard ? 7 : 5, plate: true, got: false, x: 0, y: 0 });
    }
    if (easy) return ex;
    // where the other digger was 0.2 s ago
    const seen = S.seenO || { x: O.x, y: O.y };
    const oc = { r: Math.floor((seen.y - 4) / M_.GR.cell), c: Math.floor(seen.x / M_.GR.cell) };
    for (let r = Math.max(1, oc.r - 8); r < oc.r - 1; r++) {
      const c = oc.c;
      if (M_.cellAt(st, r, c) !== k.BOUL || !M_.diggable(M_.cellAt(st, r + 1, c))) continue;
      // open all the way down from under the support to the other digger
      let open = true; for (let y = r + 2; y <= oc.r; y++) if (M_.cellAt(st, y, c) !== k.E) { open = false; break; }
      if (!open) continue;
      const key = st.round + ':' + r + ':' + c;
      if (S.sab[key] === undefined) S.sab[key] = hard || Math.random() < 0.5;
      if (!S.sab[key]) continue;
      for (const dc of [-1, 1]) {
        const sc = c + dc;
        if (M_.cellAt(st, r + 1, sc) === k.E && M_.solid(M_.cellAt(st, r + 2, sc))) ex.push({ r: r + 1, c: sc, v: hard ? 6 : 4, sab: -dc, got: false, x: 0, y: 0 });
      }
    }
    return ex;
  }
})();

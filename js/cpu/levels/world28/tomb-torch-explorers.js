/* Pip & Bo - Computer partner brain for 28-2 Tomb Torch Explorers (mode 'tombtorch'). */
'use strict';

/* How the computer plays Tomb Torch Explorers
   It walks with the shared path finder (cpuNav). Seen, armed traps are cells it won't stand on (it jumps them); a trap
   nobody has seen yet can catch it out like anyone else. Its job comes from the chamber (def torch):
   TORCH  -> lights any unlit brazier close to it (same floor, about 5 tiles), then goes to the next switch that is
             still pressed-able and reachable (the first in the chamber's list), and stands beside it so its partner
             can see it. With a person seeking: "Press the switch!".
   SEEKER -> disarms a seen trap close by, presses the next switch once it has been seen, and otherwise follows the
             torch (a person with the torch who wanders off: "Bring the torch over here!").
   When every gate is open both go to the doorway. It can't finish alone: only the torch lights the way and only the
   seeker presses switches. It reads where switches are only once they're seen (the same marks the players get),
   except that the torch heads for the next switch's spot, like a player who has read the tip. */
(() => {
  const exitT = ms => ({ x: ms.exit.x + T, feet: ms.exit.y + 2 * T });
  function opts(ms) {
    const armed = ms.traps.filter(tr => tr.seen && !tr.off);
    return { avoid: (tx, ty) => armed.some(tr => tr.tx === tx && tr.ty === ty), key: armed.map(tr => tr.tx + '.' + tr.ty).join(','), tol: 8 };
  }
  // the next switch the team should press: the first one not done that this player can reach
  function nextSwitch(ms, p, o, onlySeen) {
    for (const s of ms.sw) {
      if (s.done || (onlySeen && !s.seen)) continue;
      if (cpuNavReach(p, s.x, (s.ty + 1) * T, o) < Infinity) return s;
    }
    return null;
  }
  function think(st, p, o, dt, info) {
    const ms = info.mst;
    if (!ms || !ms.sw || info.intro || !p.alive) return {};
    const no = opts(ms), torch = p.id === ms.torch, cx = p.x + p.w / 2, feet = p.y + p.h;
    // standing on (or under) the partner: step off first, or the path finder can't find a cell
    if (p.onPartner && !p.tileGround) return { right: cx < W / 2, left: cx >= W / 2 };
    if (o.onPartner && !o.tileGround && Math.abs(o.x - p.x) < p.w) return {};
    let out = null, act = false;
    const go = (x, f, tol) => { out = cpuNav(st, p, x, f, Object.assign({}, no, { tol: tol || no.tol })); return st.nav && st.nav.status === 'arrived'; };
    if (ms.exitOpen) { const e = exitT(ms); go(e.x + (p.id ? 10 : -10), e.feet); return out; }
    if (torch) {
      const b = ms.braziers.find(b => !b.lit && Math.abs(b.x - cx) < 150 && Math.abs(b.y - feet) < 10);
      if (b) { if (go(b.x + (b.x > cx ? -20 : 20), b.y, 10) || Math.abs(b.x - cx) < 30) act = 'tap'; }
      else {
        const s = nextSwitch(ms, p, no, false);
        if (s) {
          // stand a little to the side so the seeker can get to it
          const sk = G.players[1 - ms.torch], side = s.x + (sk.x + sk.w / 2 < s.x ? 40 : -40);
          go(cpuNavReach(p, side, (s.ty + 1) * T, no) < Infinity ? side : s.x, (s.ty + 1) * T, 16);
          if (s.seen && !info.partnerCpu && Math.abs(s.x - cx) < 80) cpuSay(p, 'Press the switch!');
        } else go(o.x + o.w / 2 - 40 * o.face, o.y + o.h, 30);
      }
    } else {
      const tr = ms.traps.find(tr => tr.seen && !tr.off && Math.abs(tr.x0 + T / 2 - cx) < 110 && Math.abs(tr.y - feet) < 10);
      const s = nextSwitch(ms, p, no, true);
      if (tr) {
        const side = tr.x0 + T / 2 + (cx < tr.x0 + T / 2 ? -34 : 34);
        if (go(side, tr.y, 8) || Math.abs(side - cx) < 10) act = 'tap';
      } else if (s) {
        if (go(s.x, (s.ty + 1) * T, 8) || (Math.abs(s.x - cx) < 28 && Math.abs((s.ty + 1) * T - feet) < 4)) act = 'tap';
      } else {
        const th = G.players[ms.torch];
        const tcx = th.x + th.w / 2;
        go(tcx + (cx < tcx ? -36 : 36), th.y + th.h, 34);
        if (!info.partnerCpu && Math.abs(th.x - p.x) > 250) cpuSay(p, 'Bring the torch over here!');
      }
    }
    out = out || {};
    if (act) out.act = act;
    return out;
  }
  cpuBrain('tombtorch', { think });
})();

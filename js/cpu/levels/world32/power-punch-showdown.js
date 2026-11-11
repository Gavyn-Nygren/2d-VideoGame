/* Pip & Bo - Computer opponent brain for 32-4 Power Punch Showdown (mode 'punchout'). */
'use strict';

(() => {
  /* 32-4 Power Punch Showdown (MODES.punchout): the computer brawls on the rooftop, reading MODES.punchout.plan(st, id)
     (where the other hero is, its reach, the roof's ends, the power-up on the field).
     GETTING BACK: knocked past the end of the roof it steers back to the middle and double-jumps once it is falling
       (with flight it just holds jump). Every skill does this, but Easy waits a little longer before the second jump.
     FIGHTING: it walks up to the other hero (jumping onto a catwalk after them, walking off one to follow them down)
       and punches once they're in reach, after a reaction delay (Easy 0.4 s, Normal 0.22 s, Hard 0.12 s); Easy also
       swings at the air now and then. Normal and Hard wait out the moment after a hit when the other hero can't be hit
       (they flicker). It keeps away from the roof's ends unless it's chasing someone there.
     BLOCKING: when a punch is coming that would land it may hold ▼ (Easy 12%, Normal 35%, Hard 60% of punches).
     POWER-UPS: it goes for a power-up that has landed when it is closer than the other hero (Hard also races for it
       from further away, Easy only notices half of them).
     Versus brains use the Opponent setting (info.skill). */
  const M = () => MODES.punchout;
  cpuBrain('punchout', {
    reset(S) { S.react = 0; S.blockT = 0; S.seen = -1; S.orbSeen = null; S.orbWant = false; S.wander = 0; S.wanderT = 3 + Math.random() * 4; S.airT = 0; S.swingT = 2; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.f || info.frozen) return out;
      const sk = info.skill, easy = sk < 0.5, hard = sk > 0.9;
      const pl = M().plan(st, p.id), A = pl.me, B = pl.them, PO = M().PO;
      if (A.out || A.hurt > 0) { S.react = 0; return out; }
      const dirTo = x => (x > A.x + 6 ? 1 : x < A.x - 6 ? -1 : 0);
      const go = d => { if (d > 0) out.right = true; else if (d < 0) out.left = true; };
      // 1. off the end of the roof: back to the middle
      if (A.x < PO.L + 8 || A.x > PO.R - 8) {
        if (!A.grounded) {
          go(A.x < PO.L + 8 ? 1 : -1);
          if (A.pow === 'fly') out.jump = true;
          else {
            S.airT += dt;
            if (A.jumps > 0 && A.vy > (easy ? 120 : 0) && S.airT > (easy ? 0.25 : 0.1)) out.jump = 'tap';
          }
          return out;
        }
      }
      S.airT = 0;
      // 2. blocking a punch that's coming
      if (S.blockT > 0) { S.blockT -= dt; if (A.grounded) { out.down = true; return out; } }
      if (pl.theyWind && A.grounded) {
        const id = st.stat.swings[B.id];
        if (S.seen !== id) { S.seen = id; if (Math.random() < (easy ? 0.12 : hard ? 0.6 : 0.35)) { S.blockT = 0.28; out.down = true; return out; } }
      }
      // 3. where to go: a power-up, or the other hero
      let tx = B.x, wantY = B.y;
      const orb = pl.orb;
      if (orb !== S.orbSeen) { S.orbSeen = orb; S.orbWant = !!orb && (!easy || Math.random() < 0.5); }
      const forOrb = orb && orb.landed && S.orbWant && (pl.orbMine || (hard && Math.abs(orb.x - A.x) < 260));
      if (forOrb) { tx = orb.x; wantY = orb.y + 16; }
      else if (!B.out) { const side = Math.sign(A.x - B.x) || -B.face; tx = B.x + side * pl.reach * 0.55; }
      // keep off the very ends (unless that's where the other hero or the power is)
      const lo = PO.L + 26, hi = PO.R - 26;
      if (!forOrb) tx = clamp(tx, lo, hi);
      // Easy wanders now and then
      S.wanderT -= dt;
      if (easy && S.wanderT <= 0) { S.wander = 0.8 + Math.random(); S.wanderT = 5 + Math.random() * 5; S.wx = clamp(A.x + (Math.random() - 0.5) * 300, lo, hi); }
      if (S.wander > 0) { S.wander -= dt; tx = S.wx; }
      let d = dirTo(tx);
      // up onto a catwalk: get under its end and jump; down: walk off its nearer end
      const above = wantY < A.y - 40, below = wantY > A.y + 40;
      if (above && A.grounded && Math.abs(tx - A.x) < 70) out.jump = 'tap';
      if (above && !A.grounded && A.vy > 0 && A.jumps > 0 && A.y > wantY - 10 && Math.abs(tx - A.x) < 80) out.jump = 'tap';
      if (below && A.grounded && Math.abs(tx - A.x) < 40) {
        const q = pl.plats.find(k => Math.abs(k.y - A.y) < 1 && A.x >= k.x0 - 4 && A.x <= k.x1 + 4);
        if (q) d = A.x - q.x0 < q.x1 - A.x ? -1 : 1;
      }
      // 4. punching: in reach and facing them
      if (!forOrb && pl.inReach && !B.out) {
        if (!pl.facing) d = Math.sign(B.x - A.x) || A.face;
        else if (A.punch < 0 && (easy || B.safe < 0.1)) {
          S.react += dt;
          if (S.react >= (easy ? 0.4 : hard ? 0.12 : 0.22) * (0.8 + Math.random() * 0.4)) { out.act = 'tap'; S.react = 0; }
          // (in reach and facing: stand and fight)
          if (Math.abs(B.x - A.x) < pl.reach - 10) d = 0;
        }
      } else S.react = 0;
      // Easy swings at the air sometimes
      S.swingT -= dt;
      if (easy && S.swingT <= 0) { S.swingT = 3 + Math.random() * 4; if (A.punch < 0) out.act = 'tap'; }
      go(d);
      return out;
    },
  });
})();

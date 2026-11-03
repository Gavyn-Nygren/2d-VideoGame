/* Pip & Bo - Computer partner: World 1 (Hold the Door, Boost Me Up, Your Color My Color, Rope Chain & Bungee). */
'use strict';

(() => {
  /* ---------- shared helpers ---------- */
  const tileX = tx => tx * T + T / 2;                 // centre x of a column
  const floorAt = ty => (ty + 1) * T;                 // feet height standing in row ty
  const plateOf = (L, letter, tx) => L.plates.find(pl => pl.letter === letter && (tx == null || pl.x === tx));
  const onPlate = (p, pl) => !!pl && p.alive && rectHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12);
  const onHead = (r, c) => r.alive && c.alive && r.onPartner && Math.abs(cpuFeet(r) - c.y) < 3 && Math.abs(cpuCx(r) - cpuCx(c)) < c.w;
  const still = p => p.grounded && Math.abs(p.vx) < 8;
  // go and stand on a button
  const holdPlate = (st, p, pl) => cpuNav(st, p, pl.x * T + T / 2, floorAt(pl.y), { tol: 4 });
  const near = (p, x, d) => Math.abs(cpuCx(p) - x) < d;
  const reach = (p, x, feet) => cpuNavReach(p, x, feet) < Infinity;

  // The carrier's half of a boost: stand at x and wait for the partner to climb on. With ride = true, jump once they
  // are on (a "ride a jump": the rider jumps again at the top).
  function carry(st, p, o, x, feet, ride, dt, info) {
    const at = near(p, x, 6) && (Math.abs(cpuFeet(p) - feet) < 6 || (!p.grounded && st.rideT < 0)); // (or mid ride-jump)
    // standing on the rider's head by mistake: step off, away from them
    if (onHead(p, o)) { st.rideT = 0; const out = {}; out.left = cpuCx(p) <= cpuCx(o); out.right = !out.left; return out; }
    // not there yet: walk there (carrying the rider if they already climbed on)
    if (!at) { st.rideT = 0; return cpuNav(st, p, x, feet, { tol: 4, noHop: true }); }
    const out = {};
    if (onHead(o, p) && p.grounded) {
      st.rideT = (st.rideT || 0) + dt;
      if (ride) {
        // jump with the rider on (again every so often if they didn't make it)
        if (st.rideT > (info.partnerCpu ? 0.3 : 0.6)) { out.jump = !CPU.last[p.id].jump; st.rideT = -0.6; cpuSay(p, 'Jump at the top!', 1.6); }
        else if (st.rideT > 0) cpuSay(p, 'Hold on...', 1);
      }
    } else if (!p.grounded) {
      out.jump = p.vy < 0; // a full jump for the rider
    } else {
      st.rideT = 0;
      if (cpuFor(st, 'waitHop', true, dt) > 1.2) cpuSay(p, 'Hop on my head!', 2.2);
    }
    if (at) cpuSteer(out, p, x, 3);
    return out;
  }
  // The rider's half: climb onto the carrier's head, then jump for (tx, tfeet) (tx = null: just ride). With ride = true, wait for the carrier's
  // jump and jump again at its top.
  function rideUp(st, p, o, tx, tfeet, ride, dt, spotX) {
    const out = {};
    // standing where the carrier wants to stand: make room (step to the side away from the target)
    if (spotX != null && !st.launch && p.grounded && !onHead(p, o) && near(p, spotX, 26) && !near(o, spotX, 8)) {
      const away = tx != null && tx < spotX ? 1 : -1;
      return cpuNav(st, p, spotX + away * 44, cpuFeet(p), { tol: 6, noHop: true });
    }
    if (st.launch) {
      // flying off the carrier's head toward the target (the jump was pressed on the head, so it's airborne next step)
      if (p.grounded && cpuFor(st, 'launchGround', true, dt) > 0.3) { st.launch = false; return out; }
      if (!p.grounded) cpuFor(st, 'launchGround', false, dt);
      st.launchAge = (st.launchAge || 0) + dt;
      out.jump = (p.vy < 0 && !p.grounded) || st.launchAge < 0.25; // keep holding jump, like a person would
      cpuSteer(out, p, tx, 3);
      return out;
    }
    if (onHead(p, o) && p.grounded) {
      if (tx == null) return out; // just climb on and ride
      const placed = spotX == null || near(o, spotX, 10); // the carrier is where the boost works
      const go = placed && (ride ? !o.grounded && o.vy > -140 : still(o) && cpuFor(st, 'stand', true, dt) > 0.25);
      if (go) { st.launch = true; st.launchAge = 0; cpuFor(st, 'launchGround', false, dt); out.jump = true; cpuSteer(out, p, tx, 3); }
      return out;
    }
    cpuFor(st, 'stand', false, dt);
    // get onto the carrier: walk up beside them, then hop on (if I'm in the carrier's way, hop on now: they carry me)
    const dx = cpuCx(o) - cpuCx(p);
    const inWay = spotX != null && !near(o, spotX, 10) && Math.sign(cpuCx(p) - cpuCx(o)) === Math.sign(spotX - cpuCx(o)) && Math.abs(dx) < 60;
    if (!p.grounded) { out.jump = p.vy < 0; cpuSeek(out, p, cpuCx(o), 2); return out; }
    if (Math.abs(dx) > 34 || Math.abs(cpuFeet(o) - cpuFeet(p)) > 40) return cpuNav(st, p, cpuCx(o) - Math.sign(dx || 1) * 30, cpuFeet(o), { tol: 6, noHop: true });
    if ((still(o) || inWay) && !CPU.last[p.id].jump) { out.jump = true; cpuSeek(out, p, cpuCx(o), 2); }
    return out;
  }
  // who takes the "holder" or "carrier" job when nobody has yet: the computer offers, unless its partner is the
  // computer too (then Bo does)
  const iHold = (p, info) => (info.partnerCpu ? p.id === 1 : true);

  /* ---------- 1-1 Hold the Door ----------
     Three areas: left of the gate (column 12), the middle (up to the bridge's right end, column 25) and the right.
     Whoever is ahead stands on the button on their side for the one behind; the one behind crosses when it's open.
     When both are in the same area, the computer offers to hold the button (or crosses if its partner is already on it). */
  cpuBrain('level:Hold the Door', {
    think(st, p, o, dt, info) {
      const L = info.L, out = {};
      if (!p.alive) return out;
      const zone = q => (cpuCx(q) < 12 * T ? 0 : cpuCx(q) < 25 * T ? 1 : 2);
      const mine = zone(p), theirs = o.alive ? zone(o) : mine;
      const hold = [plateOf(L, 'a', 8), plateOf(L, 'b', 16)], ahead = [plateOf(L, 'a', 14), plateOf(L, 'b', 27)];
      const open = [L.sw.A.on, L.sw.X.on], wait = [tileX(10), tileX(17)], past = [tileX(15), tileX(26)];
      const d = L.door;
      if (mine === 2 && theirs === 2) return cpuNav(st, p, d.x + d.w / 2 + (p.id ? 8 : -8), d.y + d.h, { tol: 5 });
      if (mine > theirs) {
        // I'm ahead: hold the button on my side
        if (!onPlate(p, ahead[theirs]) && near(p, tileX(ahead[theirs].x), 40)) cpuSay(p, 'I’ve got the button!', 1.5);
        if (theirs === mine - 1) return holdPlate(st, p, ahead[theirs]);
        return holdPlate(st, p, ahead[mine - 1]);
      }
      if (mine < theirs) {
        // I'm behind: cross when it's open, otherwise wait by it
        if (open[mine] && (mine === 1 || !o.alive || onPlate(o, ahead[0]) || open[0])) return cpuNav(st, p, past[mine], floorAt(15), { tol: 8 });
        if (cpuFor(st, 'ask', true, dt) > 2.5) cpuSay(p, 'Stand on the button!', 2);
        return cpuNav(st, p, wait[mine], floorAt(15), { tol: 8 });
      }
      cpuFor(st, 'ask', false, dt);
      // same area: one holds, one crosses
      if (st.crossZone !== mine) { st.crossT = 0; st.crossZone = mine; }
      const pl = hold[mine];
      // the partner is on the button (or was a moment ago): cross. If they leave it for good, offer to hold again.
      st.crossT = onPlate(o, pl) ? 1.5 : (st.crossT || 0) - dt;
      if (st.crossT > 0 && !onPlate(p, pl)) {
        if (open[mine]) return cpuNav(st, p, past[mine], floorAt(15), { tol: 8 });
        return cpuNav(st, p, wait[mine], floorAt(15), { tol: 8 });
      }
      if (iHold(p, info)) {
        if (onPlate(p, pl) && cpuFor(st, 'held', true, dt) > 0.8) cpuSay(p, 'Go! I’ll hold it.', 2);
        return holdPlate(st, p, pl);
      }
      // (two computers: Pip crosses once Bo holds)
      return cpuNav(st, p, open[mine] ? past[mine] : wait[mine], floorAt(15), { tol: 8 });
    },
  });

  /* ---------- 1-2 Boost Me Up ----------
     Key first (a boost up the left ledge), then a boost over the gate so the one on the far side can stand on its
     button, then a "ride a jump" up to the high button that builds the bridge for the other, then the door.
     The computer carries (its partner rides) unless its partner is the computer too (then Pip rides). */
  cpuBrain('level:Boost Me Up', {
    think(st, p, o, dt, info) {
      const L = info.L, out = {};
      if (!p.alive) return out;
      const cx = cpuCx(p), ft = cpuFeet(p);
      const zone = q => {
        const x = cpuCx(q), f = cpuFeet(q);
        if (x >= 25 * T && f <= floorAt(9) + 2) return 3;         // the top right ledge
        if (x >= 15 * T || (x >= 14 * T - 4 && f <= floorAt(11) + 2)) return 2; // right of the gate (or up on top of it)
        if (x < 7 * T && f <= floorAt(11) + 2) return 1;           // the key ledge
        return 0;                                                  // left of the gate
      };
      const mine = zone(p), theirs = o.alive ? zone(o) : mine;
      const gateOpen = L.sw.A.on, bridgeOn = L.sw.X.on, keyGot = L.key.got;
      const plA = plateOf(L, 'a'), plB = plateOf(L, 'b'), d = L.door;
      const rider = info.partnerCpu ? p.id === 0 : !!st.iRide;
      // a person who stands still beside the ledge for a while is offering to carry: the computer rides instead
      if (!info.partnerCpu) {
        if (info.partnerIdle > 3 && still(o) && !onHead(p, o) && !onHead(o, p)) st.iRide = true;
        if (onHead(o, p)) st.iRide = false;
      }
      // the key: whoever is up on the key ledge walks to it, then hops back down
      if (mine === 1) {
        if (!keyGot) return cpuNav(st, p, L.key.x, floorAt(11), { tol: 4 });
        return cpuNav(st, p, tileX(9), floorAt(15), { tol: 8 });
      }
      if (!keyGot) {
        // both get back to the left of the gate, then boost up to the key
        if (mine >= 2) return cpuNav(st, p, tileX(10), floorAt(15), { tol: 10 });
        if (theirs === 1) { cpuSay(p, 'Grab the key!', 1.5); return cpuNav(st, p, tileX(9), floorAt(15), { tol: 10 }); }
        if (theirs !== 0) return cpuNav(st, p, tileX(12), floorAt(15), { tol: 10 });
        if (rider) return rideUp(st, p, o, tileX(5), floorAt(11), false, dt, tileX(7));
        st.launch = false;
        return carry(st, p, o, tileX(7), floorAt(15), false, dt, info);
      }
      if (mine === 3 && theirs === 3) return cpuNav(st, p, d.x + d.w / 2 + (p.id ? 8 : -8), d.y + d.h, { tol: 5 });
      if (mine === 3) return holdPlate(st, p, plB);                 // hold the bridge for the partner below
      if (theirs === 3) {
        // the partner holds the bridge button: climb up over the bridge
        if (bridgeOn) return cpuNav(st, p, tileX(28), floorAt(9), { tol: 8 });
        if (cpuFor(st, 'ask', true, dt) > 2) cpuSay(p, 'Stand on the button!', 2);
        return cpuNav(st, p, tileX(20), floorAt(15), { tol: 10 });
      }
      if (mine === 2 && theirs === 2) {
        // ride a jump up to the high ledge
        if (rider) return rideUp(st, p, o, tileX(26) + 6, floorAt(9), true, dt, tileX(24));
        st.launch = false;
        return carry(st, p, o, tileX(24), floorAt(15), true, dt, info);
      }
      if (mine === 2) {
        // the partner is still left of the gate: stand on its button
        return holdPlate(st, p, plA);
      }
      if (theirs === 2) {
        if (gateOpen) return cpuNav(st, p, tileX(19), floorAt(15), { tol: 10 });
        if (cpuFor(st, 'ask', true, dt) > 2.5) cpuSay(p, 'Stand on the button!', 2);
        return cpuNav(st, p, tileX(12), floorAt(15), { tol: 10 });
      }
      // both left of the gate with the key: boost one over the gate
      if (rider) return rideUp(st, p, o, tileX(17), floorAt(15), false, dt, tileX(13));
      st.launch = false;
      return carry(st, p, o, tileX(13), floorAt(15), false, dt, info);
    },
  });

  /* ---------- 1-3 Your Color, My Color ----------
     Fixed jobs: Pip carries Bo over the orange blocks, Bo carries Pip over the blue ones, then Pip slips through the
     blue wall and stands on the button that opens the gate for Bo. */
  cpuBrain('level:Your Color, My Color', {
    think(st, p, o, dt, info) {
      const L = info.L, out = {};
      if (!p.alive) return out;
      const pip = p.id === 0 ? p : o, bo = p.id === 0 ? o : p;
      const where = q => {
        const x = cpuCx(q), f = cpuFeet(q);
        if (x >= 27 * T + 8) return 'right';
        if (x >= 23 * T - 4 && f >= floorAt(13) - 2) return 'down';
        if (f <= floorAt(10) + 3 && x >= 13 * T) return 'blue';     // on the blue row (or on Bo up there)
        if (f <= floorAt(12) + 3 && x >= 5 * T) return 'orange';   // on the orange row (or on Pip up there)
        return 'start';
      };
      const wp = where(pip), wb = where(bo), d = L.door, plA = plateOf(L, 'a');
      if (!p.alive || !o.alive) { st.launch = false; st.hopBo = false; return out; }
      const atDoor = q => cpuCx(q) > d.x + 4 && cpuCx(q) < d.x + d.w - 4;
      if (p.id === 0) {
        // ---- Pip ----
        // hopping up onto Bo's head (over the blue row, which doesn't hold Pip): a full jump, steering onto Bo
        if (st.hopBo) {
          if (p.grounded) st.hopBo = false;
          else { out.jump = p.vy < 0; cpuSeek(out, p, cpuCx(bo), 2); return out; }
        }
        if (wp === 'right') {
          // hold the gate until Bo is through, then the door
          if (wb === 'right' && atDoor(bo)) return cpuNav(st, p, d.x + 10, d.y + d.h, { tol: 4 });
          return holdPlate(st, p, plA);
        }
        if (wp === 'down') {
          if (wb === 'down' || wb === 'right') return cpuNav(st, p, tileX(29), floorAt(15), { tol: 6 }); // through the blue wall
          return cpuNav(st, p, tileX(24), floorAt(15), { tol: 8 });
        }
        if (wp === 'blue') return out;                              // riding Bo: keep still
        if (wp === 'orange') {
          if (!bo.grounded) return out;                             // Bo is mid-jump: wait
          if (onHead(bo, pip)) return cpuNav(st, p, tileX(13), floorAt(12), { tol: 3 }); // carry Bo to the end
          if (wb === 'blue' || wb === 'down') {
            // hop onto Bo's head (Bo waits on the blue row)
            if (onHead(pip, bo)) return out;
            if (!p.grounded) { out.jump = p.vy < 0; cpuSeek(out, p, cpuCx(bo), 2); return out; }
            if (wb === 'blue' && still(bo) && cpuFor(st, 'boStill', true, dt) > 0.3 && cpuCx(bo) < 15 * T + 8 && near(p, tileX(13), 10) && !CPU.last[p.id].jump) {
              st.hopBo = true; out.jump = true; cpuSeek(out, p, cpuCx(bo), 2); return out;
            }
            if (!still(bo)) cpuFor(st, 'boStill', false, dt);
            return cpuNav(st, p, tileX(13), floorAt(12), { tol: 3 });
          }
          // Bo is still at the start: go back for them
          return cpuNav(st, p, tileX(4), floorAt(15), { tol: 6 });
        }
        // start: wait for Bo on my head, then up onto the orange blocks
        if (onHead(bo, pip) && cpuFor(st, 'carried', true, dt) > 0.4) return cpuNav(st, p, tileX(8), floorAt(12), { tol: 6 });
        if (!onHead(bo, pip)) cpuFor(st, 'carried', false, dt);
        if (wb === 'blue' || wb === 'down') return cpuNav(st, p, tileX(13), floorAt(12), { tol: 3 });
        const o2 = carry(st, p, o, tileX(4), floorAt(15), false, dt, info);
        return o2;
      }
      // ---- Bo ----
      if (st.launch) return rideUp(st, p, o, tileX(15), floorAt(10), false, dt); // mid-jump to the blue row
      if (wb === 'right') return cpuNav(st, p, d.x + d.w - 10, d.y + d.h, { tol: 4 });
      if (wb === 'down') {
        if (L.sw.A.on && wp === 'right') return cpuNav(st, p, d.x + d.w - 10, d.y + d.h, { tol: 4 });
        if (wp === 'down' && cpuFor(st, 'tellPip', true, dt) > 2) cpuSay(p, 'Jump through the blue wall!', 2.2);
        if (onHead(pip, bo)) return cpuNav(st, p, tileX(24), floorAt(15), { tol: 6 }); // set Pip down past the drop
        return cpuNav(st, p, tileX(24), floorAt(15), { tol: 6 });
      }
      if (wb === 'blue') {
        if (onHead(pip, bo) && cpuFor(st, 'riderOn', true, dt) > 0.4) return cpuNav(st, p, tileX(24), floorAt(15), { tol: 6 });
        if (!onHead(pip, bo)) cpuFor(st, 'riderOn', false, dt);
        if (wp === 'down' || wp === 'right') return cpuNav(st, p, tileX(24), floorAt(15), { tol: 6 });
        // wait at the start of the blue row for Pip to hop on
        return carry(st, p, o, tileX(14), floorAt(10), false, dt, info);
      }
      if (wb === 'orange') {
        // riding Pip over the orange row: jump to the blue row at the end
        if (st.launch || (onHead(bo, pip) && still(pip) && cpuCx(pip) >= 12 * T)) return rideUp(st, p, o, tileX(15), floorAt(10), false, dt);
        return out;
      }
      // start: hop onto Pip
      if (wp === 'start') return rideUp(st, p, o, null, 0, false, dt);
      if (wp === 'orange' && !onHead(bo, pip)) { if (cpuFor(st, 'back', true, dt) > 1.5) cpuSay(p, 'Come back for me!', 2); }
      return cpuNav(st, p, tileX(3), floorAt(15), { tol: 6 });
    },
  });
})();

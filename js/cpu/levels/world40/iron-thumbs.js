/* Pip & Bo - Computer opponent: 40-1 Part 8 'thumbs' (Thumb War). */
'use strict';

/* The computer is the opponent here, at the Opponent setting (info.vs 0.35 / 0.7 / 1). It sees the other thumb late
   (Easy 0.45 s, Normal 0.28 s, Hard 0.14 s): a wind-up it sees in time it jukes (Hard often, Easy rarely) or tucks
   under; a flat or cramped thumb it slams for a pin; otherwise it slams now and then for a knock, and Hard sometimes
   rears and tucks at once to bait a whiff. It keeps its thumb leaned in a little for range. Pinned, it taps on the
   flag's bounces (Easy hits half of them, Normal most, Hard nearly all). */
IRON_BRAINS.thumbs = {
  reset(bst) { bst.hist = null; bst.pin = null; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, out = {}, K = IRONTHUMB, vs = info.vs || 0.7, me = ph.th && ph.th[p.id], op = ph.th && ph.th[o.id];
    if (!me || ph.mode !== 'fight') { bst.hist = null; return out; }
    const now = ph.t, react = 0.45 - (vs - 0.35) / 0.65 * 0.31, toward = p.id ? 'left' : 'right', away = p.id ? 'right' : 'left';
    // what it has seen of the other thumb: its states, each seen `react` s after it began
    const H = bst.hist || (bst.hist = [{ s: op.s, at: -9 }]);
    if (H[H.length - 1].s !== op.s) { H.push({ s: op.s, at: now }); if (H.length > 12) H.shift(); }
    let seen = H[0]; for (const h of H) if (h.at <= now - react) seen = h;
    // pinned: tap on the bounces it catches
    const P = ph.pin;
    if (P) {
      if (P.b !== p.id) return out;
      if (!bst.pin || bst.pin.P !== P) {
        const hitP = 0.5 + (vs - 0.35) / 0.65 * 0.45;
        bst.pin = { P, plan: P.beats.map(bt => (Math.random() < hitP ? bt + (Math.random() - 0.5) * 0.12 : null)), done: [false, false, false] };
      }
      bst.pin.plan.forEach((at, k) => { if (at != null && !bst.pin.done[k] && P.t >= at) { bst.pin.done[k] = true; out.act = 'tap'; } });
      return out;
    }
    // keep leaned in a little
    if (me.lean < 6) out[toward] = true; else if (me.lean > 11) out[away] = true;
    const attack = (seen.s === 'rear' || seen.s === 'strike') ? seen : null;
    switch (me.s) {
      case 'up': {
        if (attack && bst.answered !== attack.at) {
          // answer a wind-up: wait so the juke covers the strike, then juke or tuck
          if (now - attack.at < Math.max(0, 0.22 - react)) break;
          bst.answered = attack.at;
          const jukeP = 0.1 + (vs - 0.35) / 0.65 * 0.65;
          if (me.jukeCd <= 0 && Math.random() < jukeP) out.jump = 'tap';
          else if (me.tuckT < 0.5 && Math.random() < 0.3 + vs * 0.5) { out.down = true; bst.tuckUntil = now + 0.5; }
          break;
        }
        const open = seen.s === 'flat' || seen.s === 'cramp' || (op.stam <= 0 && seen.s === 'up');
        if (open && bst.openAt !== seen.at) { bst.openAt = seen.at; bst.punish = Math.random() < 0.2 + vs * 0.8; }
        if (open && bst.punish) { if (!bst.slamT || now - bst.slamT > 0.4) { out.act = 'tap'; bst.slamT = now; } break; }
        if (cpuChance(vs * 0.6, dt)) {
          out.act = 'tap'; bst.slamT = now;
          bst.feint = vs >= 0.9 && Math.random() < 0.3;
        }
        break;
      }
      case 'rear': if (bst.feint && me.t > 0.08) { out.down = true; bst.feint = false; bst.tuckUntil = now + 0.6; } break;
      case 'tuck': if (now < (bst.tuckUntil || 0) && me.tuckT < 0.9) out.down = true; break;
    }
    return out;
  },
};

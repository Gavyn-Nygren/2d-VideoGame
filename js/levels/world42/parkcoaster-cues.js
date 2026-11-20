/* Pip & Bo - 42-1 Runaway Coaster: the cues. Everything flat that tells the riders what to do and when.
   Drawn over the 3D picture from the rules' own list (PARKCOASTER.cues, runaway-coaster.js), so the screen can never
   ask for something the rules do not.

     THE CUE CARD (top middle). The next thing to do, S.CUE_T seconds before its moment: what ("LEAN LEFT", "DUCK",
       "JUMP TOGETHER", "HANDS UP!"), who ("both of you", "one of you is enough", "Bo only"), each rider's own button
       beside their name, and a bar that fills up to the moment. At the moment the card jumps to "NOW!", grows and
       pulses, and big arrows sweep the side of the screen to lean to (down both sides for a duck, up for a jump). A
       lean that must be held shows a bar draining to the end of the bend; the card and arrows turn green while the
       riders have it right, and each rider gets a tick as they do their part. A hop is counted in on the beat
       (three pips, then JUMP!). What comes after is a small "NEXT" chip under the card.
     LEVER CARDS (lower left for Pip, lower right for Bo). "LEVER COMING", then "PULL NOW!" with that rider's button
       while the lever is in reach.
     BOLTS. A mistake card says what went wrong and what it cost ("Bonk! Duck next time / -1 bolt, 2 left"); the very
       first one also says what bolts are for. A photo arch that tightened bolts says so. (The HUD's row of bolts is
       drawn by the rules file.)
     HOW TO RIDE. While the riders board, each one's four controls in their own buttons.
   No three.js here; the file is loaded with the 3D files only because it is only needed when the level is drawn. */
'use strict';

const PARKCOASTER_CUES = (function () {
  const CO = PARKCOASTER, S = CO.S, PR = PARKCOASTER_ROUTE, L = PR.lists;
  const GOLD = '#ffd24a', WHITE = '#fff6dc', GOOD = '#8dffb0', DUCK = '#7ae8ff', HOP = '#ffe24a', HANDS = '#ff9ad6', BAD = '#ffb36a';
  const BG = 'rgba(18,20,26,0.9)', BODY = '"Atkinson Hyperlegible", system-ui, sans-serif';
  const RM = () => !!(typeof reduceMotion !== 'undefined' && reduceMotion) || !!(typeof K3D !== 'undefined' && K3D.reduce);
  const human = k => !isCpuPlayer(k);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const TIP_NAMES = { plush: 'the giant prize', gondola: 'the gondola', gear: 'the gears', scaffold: 'the scaffolding', hook: 'the hook' };

  // a chevron: ang 0 points right, PI left, PI/2 down, -PI/2 up
  function chev(x, y, size, ang, col, alpha, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,12,18,0.75)'; ctx.lineWidth = (lw || size * 0.3) + 4;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.5); ctx.lineTo(size * 0.3, 0); ctx.lineTo(-size * 0.3, size * 0.5); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = lw || size * 0.3;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.5); ctx.lineTo(size * 0.3, 0); ctx.lineTo(-size * 0.3, size * 0.5); ctx.stroke();
    ctx.restore();
  }
  function tick(x, y, r) {
    ctx.save(); ctx.fillStyle = '#1f9d55'; circle(x, y, r); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.36; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.4); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke(); ctx.restore();
  }
  // a rider's badge: their colour and initial, their button for this cue under it, a tick when they have done it
  // (xe is the card's edge: Pip's badge sits left of it and Bo's right, and a wide key grows away from the card)
  function badge(k, what, xe, y, done) {
    const d = k === 0 ? -1 : 1, x = xe + d * 28;
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,18,0.7)'; circle(x, y, 17); ctx.fill();
    ctx.fillStyle = PCOL[k]; circle(x, y, 14); ctx.fill();
    text(NAMES[k][0], x, y + 1, 16, '#fff', 'center', 'body');
    if (what && human(k)) drawBtn(k, what, xe + d * 10, y + 34, { size: 24, align: k === 0 ? 'right' : 'left' });
    else if (!human(k)) text('computer', x, y + 28, 10, 'rgba(255,255,255,0.75)', 'center', 'body');
    if (done) tick(x + 12, y - 11, 8);
    ctx.restore();
  }
  // what a cue says
  function words(c, now) {
    if (c.k === 'lean') return { col: c.both ? GOLD : WHITE, title: 'LEAN ' + (c.dir < 0 ? 'LEFT' : 'RIGHT'), sub: c.tip ? 'both of you, away from ' + (TIP_NAMES[c.tip] || 'it') : c.both ? 'both of you' : 'one of you is enough', what: c.dir < 0 ? 'left' : 'right', who: [true, true], hold: c.tB - c.tA > 0.8 };
    if (c.k === 'duck') return { col: DUCK, title: 'DUCK', sub: c.who === 'both' ? 'both of you' : NAMES[c.who] + ' only', what: 'down', who: c.who === 'both' ? [true, true] : [c.who === 0, c.who === 1] };
    if (c.k === 'hop') return { col: HOP, title: now ? 'JUMP!' : 'JUMP TOGETHER', sub: 'press at the same time', what: 'hop', who: [true, true] };
    return { col: HANDS, title: 'HANDS UP!', sub: 'let go of every button for the photo', what: null, who: [true, true] };
  }
  function icon(c, x, y, col, s) {
    if (c.k === 'lean') { for (const i of [0, 1]) chev(x + (i - 0.5) * 16 * s * c.dir, y, 30 * s, c.dir < 0 ? Math.PI : 0, col, 1, 7 * s); }
    else if (c.k === 'duck') { for (const i of [0, 1]) chev(x, y + (i - 0.5) * 14 * s, 28 * s, Math.PI / 2, col, 1, 7 * s); }
    else if (c.k === 'hop') { for (const i of [0, 1]) chev(x, y - (i - 0.5) * 14 * s, 28 * s, -Math.PI / 2, col, 1, 7 * s); }
    else {
      // a little box camera
      ctx.save(); ctx.fillStyle = col; rr(x - 17 * s, y - 10 * s, 34 * s, 24 * s, 5 * s); ctx.fill(); rr(x - 8 * s, y - 16 * s, 14 * s, 8 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#17191d'; circle(x, y + 2 * s, 8 * s); ctx.fill(); ctx.fillStyle = col; circle(x, y + 2 * s, 4 * s); ctx.fill(); ctx.restore();
    }
  }

  /* ---------- the cue card ---------- */
  function card(st, q, y, k, alone) {
    const c = q.c, now = q.eta <= 0, ok = now ? CO.cueOk(st, c) : { ok: false, who: [false, false] }, wd = words(c, now);
    const col = now && ok.ok ? GOOD : wd.col, pulse = now && !RM() ? 1 + Math.sin(G.clock * 13) * 0.035 : 1;
    const w = 380, h = 70;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(k * pulse, k * pulse);
    ctx.globalAlpha *= now ? 1 : clamp(0.55 + (S.CUE_T - q.eta) * 0.5, 0.55, 0.92);
    // the card
    if (now) { ctx.shadowColor = col; ctx.shadowBlur = 22; }
    ctx.fillStyle = BG; rr(-w / 2, -h / 2, w, h, 16); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = col; ctx.lineWidth = now ? 4 : 2.5; rr(-w / 2, -h / 2, w, h, 16); ctx.stroke();
    // the tag: GET READY, then NOW! (HOLD IT while a lean is held right)
    const tag = !now ? 'GET READY' : ok.ok && wd.hold ? 'HOLD IT!' : 'NOW!';
    ctx.font = '700 12px ' + BODY; const tw = ctx.measureText(tag).width + 22;
    ctx.fillStyle = now ? col : '#3a3f4a'; rr(-tw / 2, -h / 2 - 11, tw, 20, 10); ctx.fill();
    text(tag, 0, -h / 2 - 0.5, 12, now ? '#17191d' : '#e6e9ee', 'center', 'body');
    // the picture and the words
    icon(c, -w / 2 + 46, 2, col, 1);
    if (c.k !== 'hands') icon(c, w / 2 - 46, 2, col, 1);
    text(wd.title, 0, -6, 32, col, 'center');
    // a hop is counted in: three pips and a star light up on the beat
    const beats = c.k === 'hop' && q.eta < S.CUE_BEAT * 3.6;
    if (beats) {
      for (let i = 0; i < 4; i++) {
        const lit = q.eta <= (3 - i) * S.CUE_BEAT + 1e-6, x = (i - 1.5) * 26, yy = 22;
        ctx.fillStyle = lit ? (i === 3 ? '#fff' : col) : 'rgba(255,255,255,0.22)'; circle(x, yy, i === 3 ? 8 : 6); ctx.fill();
      }
    } else text(wd.sub, 0, 21, 14, '#e6e9ee', 'center', 'body');
    // the riders: their button, a tick when their part is done
    for (const p of [0, 1]) {
      if (!wd.who[p]) continue;
      badge(p, wd.what, p === 0 ? -w / 2 : w / 2, -14, now && ok.who[p]);
    }
    // the bar: filling up to the moment, then (a held lean) draining to the end of the bend
    const bw = w - 28, by = h / 2 + 9;
    ctx.fillStyle = 'rgba(10,12,18,0.75)'; rr(-bw / 2 - 2, by - 2, bw + 4, 11, 5.5); ctx.fill();
    if (!now) {
      const u = clamp(1 - q.eta / S.CUE_T, 0, 1);
      ctx.fillStyle = wd.col; rr(-bw / 2, by, Math.max(7, bw * u), 7, 3.5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(bw / 2 - 2, by - 3, 3, 13);
    } else {
      const u = wd.hold ? clamp(q.left / (c.tB - c.tA), 0, 1) : 1;
      ctx.fillStyle = col; rr(-bw / 2, by, Math.max(7, bw * u), 7, 3.5); ctx.fill();
    }
    ctx.restore();
    void alone;
  }
  // "NEXT": the thing after, small, under the card
  function chip(q, y) {
    const c = q.c, wd = words(c, false), label = 'NEXT: ' + wd.title;
    ctx.save(); ctx.globalAlpha *= 0.9; ctx.font = '700 13px ' + BODY;
    const w = ctx.measureText(label).width + 56;
    ctx.fillStyle = BG; rr(W / 2 - w / 2, y - 13, w, 26, 13); ctx.fill();
    ctx.strokeStyle = wd.col; ctx.lineWidth = 1.5; rr(W / 2 - w / 2, y - 13, w, 26, 13); ctx.stroke();
    icon(c, W / 2 - w / 2 + 20, y, wd.col, 0.42);
    text(label, W / 2 + 12, y + 0.5, 13, wd.col, 'center', 'body');
    ctx.restore();
  }
  // the sweep: big arrows at the side of the screen at a cue's moment (and fading in just before it)
  function sweep(st, q) {
    // (a jump's arrows wait for the moment itself: early ones had people jumping early)
    const c = q.c, a = c.k === 'hop' ? (q.eta <= 0 ? 1 : 0) : clamp(1 - q.eta / 0.35, 0, 1);
    if (a <= 0) return;
    const now = q.eta <= 0, ok = now && CO.cueOk(st, c).ok, wd = words(c, now), col = ok ? GOOD : wd.col;
    const ph = RM() ? 0.5 : (G.clock * 2.2) % 1;
    ctx.save(); ctx.globalAlpha = a;
    if (c.k === 'lean') {
      const d = c.dir, x0 = W / 2 + d * 250;
      const g = ctx.createLinearGradient(d < 0 ? 0 : W, 0, d < 0 ? 170 : W - 170, 0);
      g.addColorStop(0, ok ? 'rgba(141,255,176,0.34)' : c.both ? 'rgba(255,210,74,0.34)' : 'rgba(255,246,220,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(d < 0 ? 0 : W - 170, 0, 170, H);
      const n = c.both ? 3 : 2;
      for (let i = 0; i < n; i++) { const u = (i + ph) / n; chev(x0 + d * u * 150, H * 0.47, 78 - u * 10, d < 0 ? Math.PI : 0, col, Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.95 + 0.05, 17); }
    } else if (c.k === 'duck') {
      for (const p of [0, 1]) {
        if (c.who !== 'both' && c.who !== p) continue;
        const x = p === 0 ? W * 0.16 : W * 0.84;
        for (let i = 0; i < 2; i++) { const u = (i + ph) / 2; chev(x, H * 0.3 + u * 110, 64, Math.PI / 2, col, Math.sin(u * Math.PI) * 0.95 + 0.05, 15); }
      }
      // hazard stripes along the top edge: something low is coming
      ctx.globalAlpha = a * 0.85;
      for (let x = -20 + ((G.clock * 60) % 40); x < W + 20; x += 40) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x + 8, 12); ctx.lineTo(x - 12, 12); ctx.closePath(); ctx.fill(); }
    } else if (c.k === 'hop') {
      for (const x of [W * 0.16, W * 0.84]) for (let i = 0; i < 2; i++) { const u = (i + ph) / 2; chev(x, H * 0.62 - u * 120, 64, -Math.PI / 2, col, Math.sin(u * Math.PI) * 0.95 + 0.05, 15); }
    }
    ctx.restore();
  }

  /* ---------- lever cards ---------- */
  const LEVER_WORDS = { switch: ['LEVER COMING', 'PULL NOW!'], rocket: ['LEVER COMING', 'PULL NOW!'], bell: ['BELL COMING', 'RING IT!'], target: ['TARGETS COMING', 'HIT IT!'], brake: ['BRAKE COMING', 'BRAKE NOW!'] };
  function levers(st) {
    const seen = [false, false];
    for (let i = 0; i < L.levers.length; i++) {
      const lv = L.levers[i];
      if (seen[lv.side] || !human(lv.side)) continue;
      if (lv.kind === 'brake' ? st.brake[lv.side] : st.thrown[i]) continue;
      const pre = CO.leverPre(lv, st.v);
      if (st.s > lv.s + S.LEVER_POST) continue;
      const eta = PR.eta(st.s, lv.s - pre);
      if (eta > 2.2) break;
      seen[lv.side] = true;
      const now = eta <= 0, wd = LEVER_WORDS[lv.kind], col = PCOL[lv.side];
      const x = lv.side === 0 ? 150 : W - 150, y = H - 138, w = 230, h = 50, pulse = now && !RM() ? 1 + Math.sin(G.clock * 13) * 0.05 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse); ctx.globalAlpha *= now ? 1 : 0.8;
      if (now) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
      ctx.fillStyle = BG; rr(-w / 2, -h / 2, w, h, 14); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = col; ctx.lineWidth = now ? 4 : 2.5; rr(-w / 2, -h / 2, w, h, 14); ctx.stroke();
      ctx.fillStyle = col; circle(-w / 2 + 26, 0, 14); ctx.fill(); text(NAMES[lv.side][0], -w / 2 + 26, 1, 16, '#fff', 'center', 'body');
      text(now ? wd[1] : wd[0], -w / 2 + 50, -1, now ? 22 : 17, now ? '#fff' : '#e6e9ee', 'left');
      drawBtn(lv.side, 'act', w / 2 - 30, 0, { size: 26 });
      // the bar: until the lever is in reach, then until it has gone by
      const bw = w - 24, u = now ? clamp(PR.eta(st.s, lv.s + S.LEVER_POST) / Math.max(0.2, PR.eta(lv.s - pre, lv.s + S.LEVER_POST)), 0, 1) : clamp(1 - eta / 2.2, 0, 1);
      ctx.fillStyle = 'rgba(10,12,18,0.75)'; rr(-bw / 2 - 2, h / 2 + 5, bw + 4, 9, 4.5); ctx.fill();
      ctx.fillStyle = col; rr(-bw / 2, h / 2 + 7, Math.max(5, bw * u), 5, 2.5); ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- bolts: what a mistake cost, what an arch gave back ---------- */
  const WHY = { bend: 'Wrong lean!', bonk: 'Bonk! Duck next time', gap: 'Missed the jump!', tip: 'Scrape! Lean away from it', detour: 'Missed the lever!', rocket: 'Missed the lever! Fizz-BANG!' };
  function bolts(st) {
    let last = null, arch = null;
    for (const fx of st.fx) { if (fx.k === 'rattle') last = fx; if (fx.k === 'arch' && fx.fixed > 0) arch = fx; }
    if (last && (!arch || arch.t < last.t)) {
      const age = st.t - last.t, T = last.first ? 2.9 : 1.7;
      if (age < T) {
        const a = clamp((T - age) * 3, 0, 1) * clamp(age * 10, 0, 1), y = 296 - Math.min(0.25, age) * 24, n = st.maxBolts;
        ctx.save(); ctx.globalAlpha = a;
        const hh = last.first ? 96 : 74;
        ctx.fillStyle = BG; rr(W / 2 - 190, y - 26, 380, hh, 14); ctx.fill(); ctx.strokeStyle = BAD; ctx.lineWidth = 2.5; rr(W / 2 - 190, y - 26, 380, hh, 14); ctx.stroke();
        text(WHY[last.why] || 'Oops!', W / 2, y - 2, 26, BAD, 'center');
        // the row of bolts, the one just lost pinging off in red
        const left = Math.max(0, last.left), lab = left === 0 ? 'No bolts left!' : left === 1 ? 'A bolt shook loose. Last one!' : 'A bolt shook loose. ' + left + ' left';
        ctx.font = '700 15px ' + BODY; const lw = ctx.measureText(lab).width, bx = W / 2 - (lw + 12 + n * 20) / 2;
        for (let i = 0; i < n; i++) {
          if (i === left) { ctx.save(); ctx.translate(bx + 9 + i * 20 + age * 30, y + 28 - Math.sin(Math.min(1, age * 1.6) * Math.PI) * 14); ctx.rotate(age * 9); ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); for (let j = 0; j < 6; j++) { const an = j / 6 * Math.PI * 2; ctx.lineTo(Math.cos(an) * 7, Math.sin(an) * 7); } ctx.closePath(); ctx.fill(); ctx.restore(); }
          CO.hudBolt(bx + 9 + i * 20, y + 28, i < left, st.gold > 0);
        }
        text(lab, bx + n * 20 + 12, y + 28.5, 15, '#fff', 'left', 'body');
        if (last.first) text('Lose them all and it is back to the last photo arch.', W / 2, y + 54, 13, '#e6e9ee', 'center', 'body');
        ctx.restore();
      }
    } else if (arch) {
      const age = st.t - arch.t;
      if (age < 1.8) {
        ctx.save(); ctx.globalAlpha = clamp((1.8 - age) * 3, 0, 1) * clamp(age * 10, 0, 1);
        const m = 'Photo arch: every bolt tightened!'; ctx.font = '700 17px ' + BODY; const w = ctx.measureText(m).width + 44;
        ctx.fillStyle = BG; rr(W / 2 - w / 2, 272, w, 36, 18); ctx.fill(); ctx.strokeStyle = GOOD; ctx.lineWidth = 2; rr(W / 2 - w / 2, 272, w, 36, 18); ctx.stroke();
        text(m, W / 2, 290.5, 17, GOOD, 'center', 'body'); ctx.restore();
      }
    }
    if (st.phase === 'breakdown') {
      ctx.save(); ctx.globalAlpha = Math.min(1, st.phaseT * 3);
      const m1 = 'Out of bolts! Breakdown!', m2 = 'The mechanic winds you back to the last photo arch...';
      ctx.fillStyle = BG; rr(W / 2 - 230, 262, 460, 70, 14); ctx.fill(); ctx.strokeStyle = BAD; ctx.lineWidth = 2.5; rr(W / 2 - 230, 262, 460, 70, 14); ctx.stroke();
      text(m1, W / 2, 286, 26, BAD, 'center'); text(m2, W / 2, 314, 15, '#fff', 'center', 'body'); ctx.restore();
    }
  }

  /* ---------- how to ride: each rider's controls, while they board ---------- */
  const ROWS = [['left', 'right', 'Lean left and right'], ['down', null, 'Duck'], ['hop', null, 'Jump (press together)'], ['act', null, 'Pull your lever']];
  function howTo(st) {
    const a = clamp(st.phaseT * 2.5, 0, 1) * clamp((S.BOARD_T - st.phaseT) * 2.5, 0, 1);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const w = 300, h = 172, y0 = H - h - 16;
    for (const k of [0, 1]) {
      const x0 = k === 0 ? 18 : W - w - 18;
      ctx.fillStyle = BG; rr(x0, y0, w, h, 16); ctx.fill(); ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 3; rr(x0, y0, w, h, 16); ctx.stroke();
      ctx.fillStyle = PCOL[k]; circle(x0 + 28, y0 + 26, 14); ctx.fill(); text(NAMES[k][0], x0 + 28, y0 + 27, 16, '#fff', 'center', 'body');
      text(NAMES[k], x0 + 50, y0 + 26, 22, PCOL[k], 'left');
      text(k === 0 ? 'left seat' : 'right seat', x0 + w - 16, y0 + 27, 13, '#c9ced6', 'right', 'body');
      if (!human(k)) { text('The computer rides this seat', x0 + w / 2, y0 + 86, 15, '#e6e9ee', 'center', 'body'); text('and does its part every time.', x0 + w / 2, y0 + 108, 15, '#e6e9ee', 'center', 'body'); continue; }
      ROWS.forEach((r, i) => {
        const y = y0 + 60 + i * 28;
        let x = x0 + 18;
        for (const what of [r[0], r[1]]) { if (!what) continue; ctx.font = `700 13px ${BODY}`; const bw = Math.max(22, Math.ceil(ctx.measureText(btnLabel(k, what)).width) + 11); drawBtn(k, what, x, y, { size: 22, align: 'left' }); x += bw + 5; }
        text(r[2], x0 + 112, y + 0.5, 15, '#fff', 'left', 'body');
      });
    }
    // the middle: what the cards will do
    const m = ['Watch the card at the top:', 'it shows what to do, and when.'];
    ctx.fillStyle = BG; rr(W / 2 - 132, y0 + 14, 264, 76, 14); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(W / 2 - 132, y0 + 14, 264, 76, 14); ctx.stroke();
    text('HOW TO RIDE', W / 2, y0 + 32, 18, GOLD, 'center'); text(m[0], W / 2, y0 + 54, 13, '#fff', 'center', 'body'); text(m[1], W / 2, y0 + 72, 13, '#fff', 'center', 'body');
    const anyHuman = [0, 1].find(human);
    if (anyHuman != null && st.phaseT > 0.5) { ctx.font = '700 13px ' + BODY; drawBtn(anyHuman, 'hop', W / 2, y0 + 108, { size: 20, label: 'skip', color: '#e6e9ee' }); }
    ctx.restore();
  }

  /* ---------- speed lines: streaks from the middle of the picture when the train is flying ---------- */
  function speedLines(st) {
    if (RM() || st.phase !== 'ride') return;
    const k = clamp((st.v - 14) / 8, 0, 1); if (k <= 0) return;
    const cx = W / 2, cy = H * 0.4, t = G.clock;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const an = i * 2.399 + Math.floor(t * 3 + i * 0.37) * 1.7, u = ((t * (1.6 + (i % 5) * 0.25) + i * 0.173) % 1);
      const r0 = 250 + u * 260, r1 = r0 + 40 + u * 90 * k;
      ctx.strokeStyle = `rgba(255,255,255,${(0.05 + 0.2 * k) * Math.sin(u * Math.PI)})`; ctx.lineWidth = 1.5 + u * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0 * 1.25, cy + Math.sin(an) * r0 * 0.8); ctx.lineTo(cx + Math.cos(an) * r1 * 1.25, cy + Math.sin(an) * r1 * 0.8); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- all of it ---------- */
  const TOP = 104;
  function draw(st) {
    if (st.noHud) return;
    speedLines(st);
    if (st.phase === 'board') return howTo(st);
    bolts(st);
    if (st.phase !== 'ride') return;
    const qs = CO.cues(st);
    for (const q of qs.slice(0, 2)) sweep(st, q);
    if (qs.length) {
      card(st, qs[0], TOP, 1, qs.length === 1);
      const q1 = qs[1];
      if (q1) { if (q1.eta <= 0.25) card(st, q1, TOP + 104, 0.78); else chip(q1, TOP + 66); }
    }
    levers(st);
  }
  return { draw, TOP };
})();

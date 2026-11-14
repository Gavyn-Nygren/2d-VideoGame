/* Pip & Bo - Music: background music and level ambience, all made in the browser with WebAudio (no sound files).
   The songs themselves are in js/music-tracks.js. See "Music and sound" in GAME_NOTES.md. */
'use strict';

/* ---------- how a song is written ----------
   SONGS.name = {
     bpm: 120,            quarter notes a minute
     beats: 4,            quarter notes in a bar (3 for a waltz or a 6/8 jig)
     root: 60,            MIDI note of scale step 0 (60 = middle C)
     scale: 'major',      a 7-note scale from MUSIC_SCALES
     swing: 0.2,          optional: how late the off-beat 8th notes are (0 to 0.33)
     form: ['A', 'A', 'B', 'A'],   the order of the sections, looped for ever
     sec: { A: { ch: [0, 4, 5, 3],       one chord a bar, named by the scale step of its root ([0, 4] = two in a bar)
                 lead: ['4 - 2 4 7 - 4 -', ...] } },   one string a bar (same count as ch)
     inst: { lead: 'flute', bass: 'bass', arp: 'pluck', pad: 'strings', comp: 'pizz' },
     oct: { lead: 1 },    optional: move a part up or down whole octaves (the bass finds its own octave)
     bass: '0 . 0 . 2 . 0 .',   patterns for one bar, repeated: numbers are chord notes (0 root, 1 third, 2 fifth, 3 octave)
     arp: '0 1 2 1 0 1 2 1',
     comp: '. x . x',           x = play the chord short
     drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' },   x hit, X loud, o soft, . rest (letters: MUSIC_DRUMS)
   }
   A bar string is split evenly over the bar: 8 pieces are 8th notes in 4/4, 16 are 16ths, 6 are the 8ths of a jig.
   In a lead: a number is a scale step (7 = an octave up, -1 = one below the root; 3# or 3b = a semitone up or down),
   '-' holds the last note, '.' is a rest. A section may override bass, arp, comp or drums, and may give 'lead2'. */
const MUSIC_SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], phrygdom: [0, 1, 4, 5, 7, 8, 10],
};

/* ---------- instruments ----------
   w, w2: wave shapes (w2 is a second layer: det = detune in cents, oct2 = octaves up, mix = its level)
   a d s r: fade-in, decay, held level (0 = a pluck), fade-out      lp: low-pass in Hz (env: opens this many times wider at the start)
   fm: [ratio, depth, depth at the end] for bells                  vib: [speed, depth in cents]    oct: octaves up or down */
const MUSIC_INST = {
  lead:      { w: 'square', w2: 'triangle', mix: 0.9, lp: 2600, a: 0.008, d: 0.15, s: 0.55, r: 0.08, vol: 0.085, vib: [5.5, 5] },
  chip:      { w: 'square', lp: 3800, a: 0.004, d: 0.1, s: 0.6, r: 0.05, vol: 0.06 },
  chiparp:   { w: 'square', lp: 3000, a: 0.003, d: 0.06, s: 0.25, r: 0.03, vol: 0.04 },
  flute:     { w: 'sine', w2: 'triangle', mix: 0.45, a: 0.04, d: 0.1, s: 0.8, r: 0.12, vol: 0.15, vib: [5, 7] },
  whistle:   { w: 'sine', a: 0.07, d: 0.1, s: 0.9, r: 0.2, vol: 0.13, vib: [6, 16] },
  bell:      { w: 'sine', fm: [3.5, 2.2, 0.05], a: 0.002, d: 0.5, s: 0, r: 0.5, vol: 0.13 },
  musicbox:  { w: 'sine', fm: [7, 1.1, 0], a: 0.002, d: 0.35, s: 0, r: 0.4, vol: 0.12, oct: 1 },
  marimba:   { w: 'sine', fm: [4, 1.4, 0], a: 0.002, d: 0.14, s: 0, r: 0.15, vol: 0.2 },
  vibes:     { w: 'sine', fm: [4, 0.8, 0.15], a: 0.003, d: 0.6, s: 0, r: 0.5, vol: 0.14 },
  pluck:     { w: 'triangle', w2: 'sawtooth', mix: 0.3, lp: 3000, env: 3, a: 0.003, d: 0.22, s: 0, r: 0.2, vol: 0.14 },
  banjo:     { w: 'sawtooth', lp: 2200, env: 4, q: 2, a: 0.002, d: 0.12, s: 0, r: 0.1, vol: 0.1 },
  koto:      { w: 'sawtooth', w2: 'square', mix: 0.3, lp: 1800, env: 5, q: 3, a: 0.002, d: 0.3, s: 0, r: 0.3, vol: 0.11 },
  harpsi:    { w: 'sawtooth', w2: 'square', oct2: 1, mix: 0.25, lp: 5000, a: 0.002, d: 0.25, s: 0, r: 0.15, vol: 0.07 },
  organ:     { w: 'square', w2: 'sine', oct2: 1, mix: 0.5, lp: 3000, a: 0.01, d: 0.05, s: 0.9, r: 0.06, vol: 0.065, vib: [6, 8] },
  accordion: { w: 'sawtooth', w2: 'sawtooth', det: 14, mix: 1, lp: 2200, a: 0.03, d: 0.1, s: 0.85, r: 0.08, vol: 0.055 },
  harmonica: { w: 'square', w2: 'sawtooth', det: 9, mix: 0.5, lp: 1900, q: 2, a: 0.04, d: 0.1, s: 0.85, r: 0.1, vol: 0.06, vib: [5.5, 10] },
  brass:     { w: 'sawtooth', w2: 'sawtooth', det: 8, mix: 0.8, lp: 1400, env: 2.2, a: 0.03, d: 0.2, s: 0.75, r: 0.1, vol: 0.075 },
  reed:      { w: 'sawtooth', lp: 2400, q: 4, a: 0.02, d: 0.1, s: 0.9, r: 0.06, vol: 0.06, vib: [6.5, 14] },
  fiddle:    { w: 'sawtooth', w2: 'sawtooth', det: 6, mix: 0.5, lp: 3200, q: 1.5, a: 0.02, d: 0.08, s: 0.8, r: 0.06, vol: 0.055, vib: [6, 9] },
  strings:   { w: 'sawtooth', w2: 'sawtooth', det: 12, mix: 1, lp: 1100, a: 0.35, d: 0.3, s: 0.8, r: 0.5, vol: 0.026 },
  softpad:   { w: 'triangle', w2: 'sine', det: 6, mix: 1, a: 0.4, d: 0.3, s: 0.9, r: 0.6, vol: 0.045 },
  bass:      { w: 'triangle', w2: 'sine', mix: 0.8, lp: 700, a: 0.006, d: 0.2, s: 0.6, r: 0.08, vol: 0.2 },
  sawbass:   { w: 'sawtooth', w2: 'square', mix: 0.4, lp: 500, env: 3, q: 2, a: 0.004, d: 0.15, s: 0.4, r: 0.06, vol: 0.12 },
  upright:   { w: 'triangle', lp: 600, a: 0.004, d: 0.25, s: 0.2, r: 0.1, vol: 0.26 },
  tuba:      { w: 'sawtooth', lp: 380, a: 0.02, d: 0.1, s: 0.7, r: 0.08, vol: 0.17 },
  pizz:      { w: 'triangle', w2: 'sawtooth', mix: 0.2, lp: 1500, env: 2, a: 0.003, d: 0.1, s: 0, r: 0.08, vol: 0.12 },
};

/* ---------- drums: one letter each in a song's drums rows ---------- */
const MUSIC_DRUMS = {
  k(M, t, v) { M.osc(t, 'sine', 150, 45, 0.11, 0.42 * v, 0.2); },                                    // kick
  s(M, t, v) { M.hiss(t, 'bandpass', 1900, 0.7, 0.2 * v, 0.13); M.osc(t, 'triangle', 190, 120, 0.06, 0.16 * v, 0.08); }, // snare
  h(M, t, v) { M.hiss(t, 'highpass', 7200, 0.7, 0.06 * v, 0.035); },                                 // closed hi-hat
  H(M, t, v) { M.hiss(t, 'highpass', 6500, 0.7, 0.055 * v, 0.2); },                                  // open hi-hat
  c(M, t, v) { for (let i = 0; i < 3; i++) M.hiss(t + i * 0.012, 'bandpass', 1300, 1.2, 0.13 * v, 0.07); }, // clap
  w(M, t, v) { M.osc(t, 'sine', 840, 800, 0.03, 0.13 * v, 0.045); M.osc(t, 'triangle', 1260, 1200, 0.02, 0.05 * v, 0.03); }, // woodblock
  t(M, t, v) { M.osc(t, 'sine', 115, 68, 0.18, 0.36 * v, 0.26); M.hiss(t, 'lowpass', 500, 0.7, 0.07 * v, 0.06); },   // low tom, taiko
  T(M, t, v) { M.osc(t, 'sine', 175, 112, 0.14, 0.28 * v, 0.2); },                                    // high tom
  z(M, t, v) { M.hiss(t, 'highpass', 5200, 0.7, 0.04 * v, 0.05, 0.012); },                           // shaker
  j(M, t, v) { M.hiss(t, 'highpass', 8200, 1, 0.055 * v, 0.09); M.hiss(t, 'bandpass', 5200, 6, 0.03 * v, 0.07); },   // tambourine, sleigh bells
  b(M, t, v) { M.osc(t, 'square', 545, 545, 0.01, 0.045 * v, 0.09); M.osc(t, 'square', 815, 815, 0.01, 0.035 * v, 0.07); }, // cowbell
  r(M, t, v) { M.hiss(t, 'bandpass', 6200, 2.5, 0.05 * v, 0.24); },                                  // ride cymbal
  m(M, t, v) { M.osc(t, 'sine', 100, 88, 0.4, 0.3 * v, 0.5); M.hiss(t, 'lowpass', 300, 0.7, 0.05 * v, 0.08); },      // timpani
  D(M, t, v) { M.osc(t, 'sine', 150, 82, 0.09, 0.36 * v, 0.14); },                                    // hand drum: low "dum"
  e(M, t, v) { M.hiss(t, 'bandpass', 2600, 2, 0.11 * v, 0.045); M.osc(t, 'sine', 620, 560, 0.02, 0.06 * v, 0.04); }, // hand drum: high "tek"
};

const Music = {
  name: null,      // the song that is playing
  amb: null,       // the ambience that is playing
  cued: null, cuedFor: null,
  // which song and ambience fit what is on screen right now (js/music-tracks.js fills MUSIC_BY_WORLD and AMB_BY_WORLD)
  pick() {
    if (this.force) return Object.assign({ song: null, amb: null, rate: 1, duck: 1 }, this.force); // the sound test page (tools/audio/jukebox.js)
    const m = G.mode;
    const inLevel = (m === 'ready' || m === 'play' || m === 'paused' || m === 'clear' || m === 'result') && G.level && LEVELS[G.levelIndex];
    if (!inLevel) return { song: 'menu', amb: null, rate: 1, duck: 1 };
    const l = LEVELS[G.levelIndex], def = G.level.def;
    if (this.cuedFor !== G.level) { this.cued = null; this.cuedFor = G.level; }
    // a mode can choose by itself: MODES.x.music = () => ({ song, amb }) (30-1 plays each era's own song)
    const own = G.lmode && typeof G.lmode.music === 'function' ? G.lmode.music() || {} : {};
    const cue = Object.assign({}, own, this.cued || {});
    const song = cue.song || def.music || l.music || MUSIC_BY_LEVEL[l.name] || MUSIC_BY_WORLD[l.world] || 'base';
    const amb = cue.amb !== undefined ? cue.amb : def.amb !== undefined ? def.amb : l.amb !== undefined ? l.amb
      : AMB_BY_LEVEL[l.name] !== undefined ? AMB_BY_LEVEL[l.name] : AMB_BY_WORLD[l.world] || null;
    // the levels of a world share its song, each in its own key (and versus levels a little faster), so no two sound quite the same
    if (this._posOf !== LEVELS.length) { this._pos = {}; const seen = {}; LEVELS.forEach(x => { this._pos[x.name] = seen[x.world] = (seen[x.world] === undefined ? 0 : seen[x.world] + 1); }); this._posOf = LEVELS.length; }
    const tr = cue.song ? 0 : [0, 2, -2, 3, -3, 5][this._pos[l.name] % 6];
    return { song, amb: m === 'result' ? null : amb, rate: l.kind === 'versus' ? 1.06 : 1, tr, duck: m === 'paused' ? 0.35 : m === 'ready' ? 0.6 : 1 };
  },
  // a level mode can change the music or ambience part-way through (a boss phase, a new era): Music.cue({ song, amb }).
  // It lasts until the next room or level loads.
  cue(o) { this.cued = Object.assign(this.cuedFor === G.level && this.cued ? this.cued : {}, o); this.cuedFor = G.level; },

  /* ---------- called every frame from js/main.js ---------- */
  tick() {
    const ctx = Sfx.ctx;
    if (!ctx || ctx.state !== 'running' || typeof SONGS === 'undefined') return;
    const on = !Sfx.muted, want = this.pick(), now = ctx.currentTime;
    const song = on && Sfx.vol.music ? want.song : null, amb = on && Sfx.vol.sfx ? want.amb : null;
    if (song !== this.name || (this.trk && song && (this.trk.rate !== want.rate || this.trk.tr !== (want.tr || 0)))) this.start(song, want.rate, want.tr || 0);
    if (this.trk) {
      if (this.trk.duck !== want.duck) { this.trk.duck = want.duck; this.trk.out.gain.setTargetAtTime(this.trk.vol * want.duck, now, 0.15); }
      // rAF stops in a hidden tab: pick the song up from the next bar when the tab comes back
      if (this.trk.next < now - 0.2) this.trk.next = now + 0.06;
      while (this.trk.next < now + 0.35) this.bar(this.trk);
    }
    if (amb !== this.amb) this.ambStart(amb);
    if (this.ambOn) {
      const d = want.duck < 1 ? 0.4 : 1;
      if (this.ambOn.duck !== d) { this.ambOn.duck = d; this.ambOn.out.gain.setTargetAtTime(d, now, 0.2); }
      this.ambTick(now);
    }
  },
  stopTrack(trk, fade = 0.25) {
    const now = this.ctx().currentTime;
    trk.out.gain.cancelScheduledValues(now); trk.out.gain.setTargetAtTime(0, now, fade);
    setTimeout(() => { try { trk.out.disconnect(); } catch (e) { /* gone already */ } }, fade * 6000 + 300);
  },
  ctx() { return Sfx.ctx; },
  start(name, rate = 1, tr = 0) {
    if (this.trk) { this.stopTrack(this.trk); this.trk = null; }
    this.name = name;
    const song = name && SONGS[name];
    if (!song) return;
    const ctx = Sfx.ctx, out = ctx.createGain(), vol = song.vol == null ? 1 : song.vol;
    out.gain.setValueAtTime(0, ctx.currentTime); out.gain.setTargetAtTime(vol, ctx.currentTime, 0.2);
    out.connect(Sfx.musicIn);
    this.trk = { song, out, vol, duck: 1, rate, tr, next: ctx.currentTime + 0.12, bar: 0 };
  },

  /* ---------- the sequencer: schedules one bar of the song ---------- */
  // the bars of a song, in play order: [{ sec, i }] (worked out once per song)
  barsOf(song) {
    if (!song._bars) {
      song._bars = [];
      for (const s of song.form) { const sec = song.sec[s]; for (let i = 0; i < sec.ch.length; i++) song._bars.push({ sec, i }); }
    }
    return song._bars;
  },
  // scale step (may be below 0 or above 6) -> MIDI note
  note(song, step, acc = 0) {
    const sc = MUSIC_SCALES[song.scale || 'major'], oct = Math.floor(step / 7);
    return song.root + oct * 12 + sc[step - oct * 7] + acc;
  },
  // the scale step of a chord's n-th note: 0 root, 1 third, 2 fifth, 3 octave, 4 tenth; -1 is the fifth below
  chordStep(root, n) { const o = Math.floor(n / 3); return root + o * 7 + (n - o * 3) * 2; },
  bar(trk) {
    const song = trk.song, bars = this.barsOf(song), B = bars[trk.bar % bars.length], sec = B.sec;
    const tr = trk.tr || 0;
    const t0 = trk.next, beat = 60 / (song.bpm * trk.rate), len = (song.beats || 4) * beat, out = trk.out, inst = song.inst || {};
    const ch = sec.ch[B.i], chordAt = f => Array.isArray(ch) ? ch[Math.min(ch.length - 1, Math.floor(f * ch.length))] : ch;
    const swing = song.swing || 0;
    // the start time of piece i of n in this bar (off-beat 8ths, or 16ths in a 16-piece bar, land late when the song swings)
    const at = (i, n) => t0 + (i / n) * len + (swing && i % 2 && (n === (song.beats || 4) * 2 || n === (song.beats || 4) * 4) ? swing * len / n : 0);
    const part = (k) => sec[k] !== undefined ? sec[k] : song[k];
    // melody lines
    for (const k of ['lead', 'lead2']) {
      const rows = sec[k]; if (!rows || !inst[k]) continue;
      const toks = this.toks(rows[B.i % rows.length]), n = toks.length;
      for (let i = 0; i < n; i++) {
        const tk = toks[i]; if (tk === '.' || tk === '-') continue;
        let hold = 1; while (i + hold < n && toks[i + hold] === '-') hold++;
        const m = /^(-?\d+)([#b]?)$/.exec(tk); if (!m) continue;
        const t = at(i, n), end = i + hold >= n ? t0 + len : at(i + hold, n);
        this.voice(out, t, tr + this.note(song, +m[1], m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * ((song.oct && song.oct[k]) || 0), (end - t) * 0.92, inst[k], 1);
      }
    }
    // bass and arpeggio: chord notes
    for (const k of ['bass', 'arp']) {
      const pat = part(k); if (!pat || !inst[k]) continue;
      const toks = this.toks(pat), n = toks.length;
      for (let i = 0; i < n; i++) {
        const tk = toks[i]; if (tk === '.' || tk === '-') continue;
        let hold = 1; while (i + hold < n && toks[i + hold] === '-') hold++;
        const t = at(i, n), end = i + hold >= n ? t0 + len : at(i + hold, n);
        // the bass sits in its own octave whatever the song's key (its root lands between C2 and B2)
        const shift = k === 'bass' ? 12 * Math.floor((47 - song.root) / 12) : 12 * ((song.oct && song.oct[k]) || 0);
        this.voice(out, t, tr + this.note(song, this.chordStep(chordAt(i / n), +tk)) + shift, (end - t) * (k === 'bass' ? 0.85 : 0.95), inst[k], 1);
      }
    }
    // chord stabs
    const comp = part('comp');
    if (comp && inst.comp) {
      const toks = this.toks(comp), n = toks.length;
      for (let i = 0; i < n; i++) if (toks[i] === 'x' || toks[i] === 'X') {
        const r0 = chordAt(i / n), r = r0 > 3 ? r0 - 7 : r0, t = at(i, n); // chords high in the scale are played an octave down
        for (let c = 0; c < 3; c++) this.voice(out, t, tr + this.note(song, this.chordStep(r, c)), len / n * 0.5, inst.comp, toks[i] === 'X' ? 0.8 : 0.6);
      }
    }
    // held chords
    if (inst.pad && part('pad') !== false) {
      const cs = Array.isArray(ch) ? ch : [ch];
      cs.forEach((r0, j) => { const r = r0 > 3 ? r0 - 7 : r0; for (let c = 0; c < 3; c++) this.voice(out, t0 + j * len / cs.length, tr + this.note(song, this.chordStep(r, c)), len / cs.length * 0.98, inst.pad, 1); });
    }
    // drums
    const drums = part('drums');
    if (drums) for (const d in drums) {
      const row = drums[d].replace(/\s/g, ''), n = row.length, fn = MUSIC_DRUMS[d];
      if (fn) for (let i = 0; i < n; i++) { const c = row[i]; if (c !== '.') { this._out = out; fn(this, at(i, n), c === 'X' ? 1.3 : c === 'o' ? 0.5 : 1); } }
    }
    trk.next = t0 + len; trk.bar++;
  },
  _tok: {},
  toks(s) { return this._tok[s] || (this._tok[s] = s.trim().split(/\s+/)); },

  /* ---------- one note ---------- */
  voice(out, t, midi, dur, name, vel) {
    const I = MUSIC_INST[name]; if (!I) return;
    const ctx = Sfx.ctx, f = 440 * Math.pow(2, (midi + (I.oct || 0) * 12 - 69) / 12);
    const g = ctx.createGain(), peak = I.vol * vel, end = t + Math.max(dur, I.a + 0.02), stop = end + I.r * 1.8 + 0.05;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + I.a);
    g.gain.setTargetAtTime(peak * I.s, t + I.a, I.d / 3 + 0.001);
    g.gain.setTargetAtTime(0, end, I.r / 3 + 0.001);
    g.connect(out);
    let dst = g;
    if (I.lp) {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = I.q || 0.7;
      if (I.env) { fl.frequency.setValueAtTime(Math.min(16000, I.lp * I.env), t); fl.frequency.setTargetAtTime(I.lp, t, I.d / 2 + 0.01); }
      else fl.frequency.value = I.lp;
      fl.connect(g); dst = fl;
    }
    const o = ctx.createOscillator(); o.type = I.w; o.frequency.value = f; o.connect(dst); o.start(t); o.stop(stop);
    let o2 = null;
    if (I.w2) {
      o2 = ctx.createOscillator(); o2.type = I.w2; o2.frequency.value = f * Math.pow(2, I.oct2 || 0); o2.detune.value = I.det || 0;
      const m = ctx.createGain(); m.gain.value = I.mix == null ? 0.5 : I.mix; o2.connect(m); m.connect(dst); o2.start(t); o2.stop(stop);
    }
    if (I.fm) {
      const mo = ctx.createOscillator(), mg = ctx.createGain(); mo.frequency.value = f * I.fm[0];
      mg.gain.setValueAtTime(f * I.fm[1], t); mg.gain.setTargetAtTime(f * I.fm[1] * (I.fm[2] || 0), t, I.d / 2 + 0.01);
      mo.connect(mg); mg.connect(o.frequency); mo.start(t); mo.stop(stop);
    }
    if (I.vib && dur > 0.3) {
      const lf = ctx.createOscillator(), lg = ctx.createGain(); lf.frequency.value = I.vib[0];
      lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(I.vib[1], t + 0.3);
      lf.connect(lg); lg.connect(o.detune); if (o2) lg.connect(o2.detune); lf.start(t); lf.stop(stop);
    }
  },
  // drum pieces: a sine/triangle/square blip that drops in pitch, and a burst of filtered noise
  osc(t, type, f0, f1, drop, vol, dur) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + drop);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._out); o.start(t); o.stop(t + dur + 0.02);
  },
  hiss(t, type, f, q, vol, dur, a = 0.001) {
    const ctx = Sfx.ctx, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = Sfx.noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    s.connect(fl); fl.connect(g); g.connect(this._out); s.start(t, (t * 7.3) % 1.5); s.stop(t + a + dur + 0.02);
  },

  /* ---------- ambience: a quiet bed of sound under a level (wind, waves, crickets, a crowd...) ----------
     AMBIENCE.name = { beds: [{ noise: 'bandpass' | 'lowpass' | 'highpass', f, q, vol, lfo: [speed, depth 0..1] }
                              or { hum: 'sine' | 'sawtooth'..., f, vol, lp, lfo }],
                       events: [{ every: [min, max] seconds, fn(A, t) }] }      (A is Music; use A.chirp, A.puff, A.ping)
     It plays through the sound-effects volume, not the music volume. */
  ambStart(name) {
    const ctx = Sfx.ctx, now = ctx.currentTime;
    if (this.ambOn) {
      const old = this.ambOn; old.out.gain.cancelScheduledValues(now); old.out.gain.setTargetAtTime(0, now, 0.3);
      setTimeout(() => { old.nodes.forEach(n => { try { n.stop(); } catch (e) { /* stopped */ } }); try { old.out.disconnect(); } catch (e) { /* gone */ } }, 2200);
      this.ambOn = null;
    }
    this.amb = name;
    const A = name && AMBIENCE[name]; if (!A) return;
    const out = ctx.createGain(); out.gain.setValueAtTime(0, now); out.gain.setTargetAtTime(1, now, 0.6); out.connect(Sfx.sfxIn);
    const nodes = [];
    for (const b of A.beds || []) {
      const g = ctx.createGain(); g.gain.value = b.vol; g.connect(out);
      let src;
      if (b.noise) {
        src = ctx.createBufferSource(); src.buffer = Sfx.noiseBuf; src.loop = true;
        const fl = ctx.createBiquadFilter(); fl.type = b.noise; fl.frequency.value = b.f; fl.Q.value = b.q || 0.7; src.connect(fl); fl.connect(g);
        if (b.sweep) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = b.sweep[0]; lg.gain.value = b.sweep[1]; l.connect(lg); lg.connect(fl.frequency); l.start(); nodes.push(l); }
      } else {
        src = ctx.createOscillator(); src.type = b.hum; src.frequency.value = b.f;
        if (b.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = b.lp; src.connect(fl); fl.connect(g); } else src.connect(g);
      }
      if (b.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = b.lfo[0]; lg.gain.value = b.vol * b.lfo[1]; l.connect(lg); lg.connect(g.gain); l.start(); nodes.push(l); }
      src.start(); nodes.push(src);
    }
    this.ambOn = { def: A, out, nodes, duck: 1, next: (A.events || []).map(e => now + 0.5 + Math.random() * e.every[1]) };
  },
  ambTick(now) {
    const a = this.ambOn, ev = a.def.events || [];
    for (let i = 0; i < ev.length; i++) if (now >= a.next[i]) {
      a.next[i] = now + ev[i].every[0] + Math.random() * (ev[i].every[1] - ev[i].every[0]);
      this._out = a.out;
      try { ev[i].fn(this, now + 0.03); } catch (e) { /* ignore audio errors */ }
    }
  },
  // pieces for ambience events
  chirp(t, f0, f1, dur, vol, type = 'sine') { this.osc(t, type, f0, f1, dur, vol, dur); },
  puff(t, type, f, q, vol, dur, a) { this.hiss(t, type, f, q, vol, dur, a); },
};

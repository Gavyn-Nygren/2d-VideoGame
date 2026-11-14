/* Pip & Bo - Audio: the sound effects engine (each level adds its own sounds in its own file). Music is in js/music.js. */
'use strict';

/* ---------- sound ----------
   Everything is made in the browser with WebAudio: no sound files. The signal path:
     tone()/noise() -> sfxIn -> sfxVol -+-> master -> compressor -> speakers
     music (js/music.js) -> musicVol ---+
     (both also send a little to one small-room reverb)
   Volume: Sfx.setVol('sfx' | 'music', 0..3) (Off, Low, Medium, High), saved as 'volSfx' / 'volMusic'. */
const SFX_VOL_STEPS = [0, 0.4, 0.7, 1];
const Sfx = {
  ctx: null, muted: false,
  vol: { sfx: 3, music: 2 },
  init() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { this.ctx = new AC(); this.build(this.ctx); } }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  // the mixer. Also used by tools that render sound offline (pass an OfflineAudioContext, then set Sfx.ctx to it)
  build(ctx) {
    const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    this.master = gain(this.muted ? 0 : 1);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxVol = gain(SFX_VOL_STEPS[this.vol.sfx]); this.musicVol = gain(SFX_VOL_STEPS[this.vol.music]);
    this.sfxVol.connect(this.master); this.musicVol.connect(this.master);
    // a short, soft room reverb made from decaying noise
    const len = Math.floor(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3.2); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const sSend = gain(0.16), mSend = gain(0.22), ret = gain(0.5);
    this.sfxVol.connect(sSend); sSend.connect(verb); this.musicVol.connect(mSend); mSend.connect(verb); verb.connect(ret); ret.connect(this.master);
    this.sfxIn = gain(1.5); this.sfxIn.connect(this.sfxVol); // sound effects sit a little above the music
    // square and sawtooth beeps go through one gentle low-pass so they sound rounder
    this.softIn = ctx.createBiquadFilter(); this.softIn.type = 'lowpass'; this.softIn.frequency.value = 4200; this.softIn.Q.value = 0.4;
    this.softIn.connect(this.sfxIn);
    this.musicIn = gain(1); this.musicIn.connect(this.musicVol);
    // two seconds of white noise, shared by every noise sound and drum
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = rnd();
    this.noiseBuf = nb;
  },
  setVol(k, n) {
    n = Math.max(0, Math.min(3, n | 0)); this.vol[k] = n;
    const node = k === 'music' ? this.musicVol : this.sfxVol;
    if (node && this.ctx) node.gain.setTargetAtTime(SFX_VOL_STEPS[n], this.ctx.currentTime, 0.03);
  },
  setMuted(on) {
    this.muted = !!on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0 : 1, this.ctx.currentTime, 0.02);
  },
  tone(f, dur, type = 'square', vol = 0.06, to = null, delay = 0) {
    if (this.muted || !this.ctx || !this.vol.sfx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      const buzzy = type === 'square' || type === 'sawtooth';
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      // a 4 ms fade-in takes the click off the front of every beep
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(buzzy ? this.softIn : this.sfxIn); o.start(t); o.stop(t + dur + 0.03);
      if (buzzy && dur >= 0.07) { // a second, slightly detuned voice makes longer buzzy tones fuller
        const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
        o2.type = type; o2.frequency.setValueAtTime(f, t); o2.detune.value = 9;
        if (to) o2.frequency.exponentialRampToValueAtTime(to, t + dur);
        g2.gain.value = 0.5; o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + dur + 0.03);
      }
    } catch (e) { /* ignore audio errors */ }
  },
  // filtered noise, for everything a beep cannot do: splashes, thuds, wind, crackle, crowds.
  // o: { type: 'bandpass' | 'lowpass' | 'highpass', f, to (sweep the filter), q, vol, a (fade-in seconds), delay }
  noise(dur, o = {}) {
    if (this.muted || !this.ctx || !this.vol.sfx || !this.noiseBuf) return;
    try {
      const t = this.ctx.currentTime + (o.delay || 0);
      const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noiseBuf; s.loop = true;
      fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 0.8; fl.frequency.setValueAtTime(o.f || 1000, t);
      if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      const a = Math.min(o.a || 0.004, dur * 0.6), vol = o.vol || 0.05;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(this.sfxIn); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
    } catch (e) { /* ignore audio errors */ }
  },
  play(n, id = 0) {
    const pitch = id === 1 ? 0.84 : 1;
    this.texture(n);
    switch (n) {
      case 'jump': this.tone(330 * pitch, 0.12, 'square', 0.035, 620 * pitch); this.noise(0.07, { f: 900, to: 2200, vol: 0.012 }); break;
      case 'land': this.tone(140, 0.06, 'triangle', 0.05, 90); break;
      case 'press': this.tone(520, 0.05, 'square', 0.04); this.tone(260, 0.04, 'triangle', 0.04); break;
      case 'open': this.tone(240, 0.16, 'sawtooth', 0.025, 420); this.noise(0.16, { f: 500, to: 1400, vol: 0.015 }); break;
      case 'close': this.tone(380, 0.14, 'sawtooth', 0.02, 200); this.noise(0.14, { f: 1400, to: 400, vol: 0.015 }); break;
      case 'key': [660, 880, 1320].forEach((f, i) => { this.tone(f, 0.12, 'square', 0.04, null, i * 0.07); this.tone(f * 2, 0.3, 'sine', 0.02, null, i * 0.07); }); break;
      case 'flag': [520, 780].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.08)); this.tone(1560, 0.4, 'sine', 0.025, null, 0.16); break;
      case 'die': this.tone(420, 0.35, 'sawtooth', 0.04, 70); this.tone(210, 0.35, 'triangle', 0.04, 50); break;
      case 'paddle': this.tone(560 * pitch, 0.06, 'square', 0.05, 720 * pitch); break;
      case 'robo': this.tone(300, 0.07, 'sawtooth', 0.035, 240); break;
      case 'wall': this.tone(240, 0.04, 'square', 0.03); break;
      case 'serve': this.tone(440, 0.05, 'triangle', 0.04, 660); break;
      case 'pointUs': [660, 880, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.07)); break;
      case 'pointRobo': this.tone(330, 0.3, 'sawtooth', 0.035, 110); break;
      case 'squash': this.tone(260, 0.22, 'square', 0.05, 60); this.tone(90, 0.3, 'triangle', 0.08, 50, 0.05); break;
      case 'crack': this.tone(900, 0.04, 'square', 0.04, 500); this.tone(200, 0.06, 'triangle', 0.06, 120); break;
      case 'crumble': [0, 0.04, 0.08].forEach((d, i) => this.tone(240 - i * 50, 0.09, 'square', 0.045, 80, d)); break;
      case 'clear': this.fanfare([523, 659, 784, 1047], 0.11, 0.2); break;
      case 'crown': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.06, null, i * 0.06)); break;
      case 'stomp': this.tone(200, 0.14, 'square', 0.05, 520); break;
      case 'win': this.fanfare([392, 523, 659, 784, 1047], 0.12, 0.22); break;
      case 'tick': this.tone(880, 0.04, 'square', 0.03); break;
      case 'clank': this.tone(1250, 0.05, 'square', 0.03); this.tone(1870, 0.08, 'triangle', 0.03, null, 0.03); break;
      case 'boing': this.tone(170 / pitch, 0.28, 'sine', 0.09, 560 / pitch); this.tone(340 / pitch, 0.2, 'triangle', 0.025, 1120 / pitch); break;
      case 'room': [440, 660, 880].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); break;
      case 'thwack': this.tone(1500, 0.04, 'square', 0.05, 600); this.tone(230, 0.12, 'triangle', 0.08, 110); break;
      case 'whoosh': this.tone(260 * pitch, 0.09, 'sawtooth', 0.018, 460 * pitch); break;
      case 'bonk': this.tone(330, 0.05, 'triangle', 0.05, 220); break;
      case 'splash': this.tone(900, 0.3, 'sawtooth', 0.02, 140); this.tone(320, 0.3, 'sine', 0.07, 70); break;
      case 'bumper': this.tone(620, 0.06, 'square', 0.05, 980); this.tone(1240, 0.08, 'triangle', 0.04, null, 0.02); break;
      case 'portal': this.tone(300, 0.22, 'sine', 0.07, 1200); this.tone(900, 0.18, 'triangle', 0.03, 260, 0.05); this.noise(0.25, { f: 600, to: 3000, q: 3, vol: 0.02 }); break;
      case 'ring': [988, 1319, 1760].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.05, null, i * 0.04)); break;
      case 'cup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.07)); this.noise(0.9, { f: 1500, q: 0.5, vol: 0.02, a: 0.2, delay: 0.2 }); break;
      // best-of-N matches
      case 'roundStart': [392, 523].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.09)); break;
      case 'beep': this.tone(660, 0.12, 'square', 0.045); break;
      case 'go': this.tone(990, 0.28, 'square', 0.05); this.tone(1320, 0.28, 'triangle', 0.04, null, 0.02); this.tone(495, 0.28, 'triangle', 0.04); break;
      case 'roundWin': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.06, null, i * 0.08)); break;
      case 'roundTie': [440, 370].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.05, null, i * 0.14)); break;
      case 'matchWin': this.fanfare([392, 523, 659, 784, 1047, 1319], 0.11, 0.24); this.tone(1568, 0.5, 'triangle', 0.05, null, 0.68); break;
      // level modes add their own sounds: Sfx.extra.punch = function (pitch, id) { this.tone(...) } then Sfx.play('punch', p.id)
      default: if (this.extra[n]) this.extra[n].call(this, pitch, id);
    }
  },
  // a rising run of notes with a fifth under each one, a held last chord and a little crowd: level clear, match won
  fanfare(notes, gap, len) {
    notes.forEach((f, i) => {
      this.tone(f, len, 'square', 0.04, null, i * gap);
      this.tone(f * 0.75, len, 'triangle', 0.035, null, i * gap);
    });
    const end = (notes.length - 1) * gap, top = notes[notes.length - 1];
    [1, 1.26, 1.5, 2].forEach(m => this.tone(top / 2 * m, 0.7, 'triangle', 0.028, null, end + 0.02));
    this.noise(1.1, { f: 1400, q: 0.5, vol: 0.022, a: 0.25, delay: end * 0.6 });
  },
  extra: {},

  /* ---------- textures ----------
     Every sound, built in or a level's own, also gets a layer of noise or shimmer picked from the words in its
     name: 'pyrCrash' gets a heavy thud of noise, 'sbSplash' gets water, 'vikGold' gets a sparkle. So name a new sound
     for what it is (mode prefix, then plain words in camelCase) and it picks up the right body for free.
     Sfx.texture.off['name'] = true switches the layer off for one sound. */
  texKinds: {
    water: { words: 'splash sploosh splish splosh dive spill pour splat dunk soak squirt', gap: 0.07,
      fn(s) { s.noise(0.32, { f: 1800, to: 350, q: 0.7, vol: 0.05 }); s.noise(0.12, { type: 'highpass', f: 3500, vol: 0.02, delay: 0.02 }); } },
    drip: { words: 'plop bloop blub glub glug bubble gulp drip', gap: 0.05,
      fn(s) { s.noise(0.06, { f: 700, to: 1500, q: 4, vol: 0.025 }); } },
    heavy: { words: 'thud crash boom smash slam thump rumble crumble avalanche cannon ram stomp quake blast explode bang collapse topple kaboom', gap: 0.08,
      fn(s) { s.noise(0.34, { type: 'lowpass', f: 600, to: 90, q: 0.6, vol: 0.11 }); s.tone(72, 0.3, 'sine', 0.07, 38); } },
    knock: { words: 'bonk bump hit clunk thunk clonk knock whack thwack kick punch jab land drop block clack plonk tap squash chop bash', gap: 0.05,
      fn(s) { s.noise(0.055, { type: 'lowpass', f: 1100, to: 300, vol: 0.05 }); } },
    air: { words: 'whoosh swish gust wind dash swing throw toss launch zoom whiff fan flap fwoosh fwump jet sweep puff poof whee fly glide swoop woosh', gap: 0.07,
      fn(s) { s.noise(0.2, { f: 500, to: 1900, q: 1.4, vol: 0.035, a: 0.05 }); } },
    crack: { words: 'crack snap break shatter rip smash crumble split', gap: 0.05,
      fn(s) { s.noise(0.05, { type: 'highpass', f: 2600, vol: 0.045 }); s.noise(0.09, { f: 1500, q: 2, vol: 0.02, delay: 0.03 }); } },
    fire: { words: 'burn sizzle fizz hiss steam hot fire flame lava torch scorch', gap: 0.1,
      fn(s) { s.noise(0.3, { type: 'highpass', f: 4200, vol: 0.022, a: 0.03 }); s.noise(0.3, { f: 900, q: 0.6, vol: 0.02, a: 0.05 }); } },
    metal: { words: 'clang clank clink clash chain anvil sword shield armor armour', gap: 0.05,
      fn(s) { s.tone(2093, 0.3, 'sine', 0.012); s.tone(3322, 0.22, 'sine', 0.009); s.tone(5274, 0.12, 'sine', 0.005); } },
    sparkle: { words: 'gold star gem coin perfect lucky jackpot glow sparkle treasure magic shine twinkle', gap: 0.08,
      fn(s) { [2637, 3136, 3951, 5274].forEach((f, i) => s.tone(f, 0.22, 'sine', 0.012, null, 0.03 + i * 0.045)); } },
    crowd: { words: 'cheer party hooray crowd applause', gap: 0.5,
      fn(s) { s.noise(1.0, { f: 1300, q: 0.5, vol: 0.03, a: 0.2 }); s.noise(0.8, { type: 'highpass', f: 3000, vol: 0.012, a: 0.25, delay: 0.1 }); } },
    scrape: { words: 'scrape skid screech slide drag grind', gap: 0.1,
      fn(s) { s.noise(0.2, { f: 2400, q: 5, vol: 0.02, a: 0.03 }); } },
    zap: { words: 'zap spark shock laser bolt lightning', gap: 0.06,
      fn(s) { s.noise(0.1, { type: 'highpass', f: 5000, vol: 0.03 }); s.noise(0.14, { f: 3000, to: 600, q: 4, vol: 0.02 }); } },
  },
  texMap: null, texOf: {}, texLast: {},
  texture(n) {
    if (this.muted || !this.ctx || !this.vol.sfx) return;
    let kind = this.texOf[n];
    if (kind === undefined) {
      if (!this.texMap) {
        this.texMap = {};
        for (const k in this.texKinds) for (const w of this.texKinds[k].words.split(' ')) if (!this.texMap[w]) this.texMap[w] = k;
      }
      // 'pyrCrash' -> ['pyr', 'crash']: the first piece is the level's prefix, the rest are looked up
      const bits = String(n).replace(/[_\-]/g, ' ').match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) || [];
      const words = bits.length > 1 ? bits.slice(1) : bits;
      kind = null;
      for (const w of words) { const k = this.texMap[w.toLowerCase()]; if (k) { kind = k; break; } }
      if (this.texture.off[n]) kind = null;
      this.texOf[n] = kind;
    }
    if (!kind) return;
    const K = this.texKinds[kind], now = this.ctx.currentTime;
    if (now - (this.texLast[kind] || -9) < K.gap) return; // a burst of the same kind of sound gets one layer, not ten
    this.texLast[kind] = now;
    K.fn(this);
  },
};
Sfx.texture.off = {};

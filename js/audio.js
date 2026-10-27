/* Pip & Bo - Audio: the sound effects engine (each level adds its own sounds in its own file). */
'use strict';

/* ---------- sound ---------- */
const Sfx = {
  ctx: null, muted: false,
  init() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type = 'square', vol = 0.06, to = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* ignore audio errors */ }
  },
  play(n, id = 0) {
    const pitch = id === 1 ? 0.84 : 1;
    switch (n) {
      case 'jump': this.tone(330 * pitch, 0.12, 'square', 0.035, 620 * pitch); break;
      case 'land': this.tone(140, 0.06, 'triangle', 0.05, 90); break;
      case 'press': this.tone(520, 0.05, 'square', 0.04); break;
      case 'open': this.tone(240, 0.16, 'sawtooth', 0.025, 420); break;
      case 'close': this.tone(380, 0.14, 'sawtooth', 0.02, 200); break;
      case 'key': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.04, null, i * 0.07)); break;
      case 'flag': [520, 780].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.08)); break;
      case 'die': this.tone(420, 0.35, 'sawtooth', 0.04, 70); break;
      case 'paddle': this.tone(560 * pitch, 0.06, 'square', 0.05, 720 * pitch); break;
      case 'robo': this.tone(300, 0.07, 'sawtooth', 0.035, 240); break;
      case 'wall': this.tone(240, 0.04, 'square', 0.03); break;
      case 'serve': this.tone(440, 0.05, 'triangle', 0.04, 660); break;
      case 'pointUs': [660, 880, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.07)); break;
      case 'pointRobo': this.tone(330, 0.3, 'sawtooth', 0.035, 110); break;
      case 'squash': this.tone(260, 0.22, 'square', 0.05, 60); this.tone(90, 0.3, 'triangle', 0.08, 50, 0.05); break;
      case 'crack': this.tone(900, 0.04, 'square', 0.04, 500); this.tone(200, 0.06, 'triangle', 0.06, 120); break;
      case 'crumble': [0, 0.04, 0.08].forEach((d, i) => this.tone(240 - i * 50, 0.09, 'square', 0.045, 80, d)); break;
      case 'clear': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', 0.04, null, i * 0.11)); break;
      case 'crown': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.06, null, i * 0.06)); break;
      case 'stomp': this.tone(200, 0.14, 'square', 0.05, 520); break;
      case 'win': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'square', 0.045, null, i * 0.12)); break;
      case 'tick': this.tone(880, 0.04, 'square', 0.03); break;
      case 'clank': this.tone(1250, 0.05, 'square', 0.03); this.tone(1870, 0.08, 'triangle', 0.03, null, 0.03); break;
      case 'boing': this.tone(170 / pitch, 0.28, 'sine', 0.09, 560 / pitch); break;
      case 'room': [440, 660, 880].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); break;
      case 'thwack': this.tone(1500, 0.04, 'square', 0.05, 600); this.tone(230, 0.12, 'triangle', 0.08, 110); break;
      case 'whoosh': this.tone(260 * pitch, 0.09, 'sawtooth', 0.018, 460 * pitch); break;
      case 'bonk': this.tone(330, 0.05, 'triangle', 0.05, 220); break;
      case 'splash': this.tone(900, 0.3, 'sawtooth', 0.025, 140); this.tone(320, 0.3, 'sine', 0.07, 70); break;
      case 'bumper': this.tone(620, 0.06, 'square', 0.05, 980); this.tone(1240, 0.08, 'triangle', 0.04, null, 0.02); break;
      case 'portal': this.tone(300, 0.22, 'sine', 0.07, 1200); this.tone(900, 0.18, 'triangle', 0.03, 260, 0.05); break;
      case 'ring': [988, 1319, 1760].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.05, null, i * 0.04)); break;
      case 'cup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.07)); break;
      // best-of-N matches
      case 'roundStart': [392, 523].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.09)); break;
      case 'beep': this.tone(660, 0.12, 'square', 0.045); break;
      case 'go': this.tone(990, 0.28, 'square', 0.05); this.tone(1320, 0.28, 'triangle', 0.04, null, 0.02); break;
      case 'roundWin': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.06, null, i * 0.08)); break;
      case 'roundTie': [440, 370].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.05, null, i * 0.14)); break;
      case 'matchWin': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.24, 'square', 0.045, null, i * 0.11)); this.tone(1568, 0.5, 'triangle', 0.05, null, 0.68); break;
      // level modes add their own sounds: Sfx.extra.punch = function (pitch, id) { this.tone(...) } then Sfx.play('punch', p.id)
      default: if (this.extra[n]) this.extra[n].call(this, pitch, id);
    }
  },
  extra: {},
};


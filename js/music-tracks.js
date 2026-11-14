/* Pip & Bo - Music tracks: the songs, the ambience beds, and which world or level plays which.
   How a song is written is explained at the top of js/music.js. Every tune here is original. */
'use strict';

const SONGS = {
  /* ---------- menus: the Pip & Bo theme, warm and easy-going ---------- */
  menu: {
    bpm: 104, vol: 0.15, root: 60, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'flute', bass: 'bass', arp: 'pluck', pad: 'softpad' },
    bass: '0 . . 0 2 . 0 .', arp: '0 1 2 1 3 1 2 1',
    drums: { k: 'x.......x.x.....', w: '....x.......x...', z: 'o.o.o.o.o.o.o.o.' },
    sec: {
      A: { ch: [0, 4, 5, 3], lead: ['4 - 2 4 7 - 4 -', '6 - 4 6 8 - 6 -', '7 - 5 7 9 - 7 5', '5 - 7 5 3 - 4 -'] },
      A2: { ch: [0, 4, 5, [3, 4]], lead: ['2 - 2 3 4 - 7 -', '6 - 4 - 1 - 4 -', '5 - 5 6 7 - 9 -', '8 7 5 7 8 - 6 -'] },
      B: { ch: [3, 0, 3, 4], lead: ['5 - 7 - 10 - 9 7', '9 - 7 - 4 - - .', '5 - 7 - 10 - 9 7', '8 - 6 - 8 - 11 -'] },
    },
  },
  /* ---------- the base level tune: a bouncy adventure, for any world without its own theme ---------- */
  base: {
    bpm: 120, vol: 0.21, root: 55, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'lead', bass: 'bass', arp: 'marimba', pad: 'softpad' }, oct: { lead: 1, arp: 1 },
    bass: '0 . 0 . 2 . 0 2', arp: '0 . 1 2 . 1 2 .',
    drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    sec: {
      A: { ch: [0, 0, 3, 4], lead: ['0 2 4 2 7 - 4 -', '5 4 2 4 2 - 0 -', '3 5 7 5 8 7 5 -', '4 6 8 6 4 - - .'] },
      A2: { ch: [0, 5, 3, 4], lead: ['7 - 4 7 9 - 7 -', '7 - 5 7 9 7 5 -', '10 9 7 5 7 - 5 3', '4 - 6 - 8 6 4 -'] },
      B: { ch: [5, 3, 0, 4], lead: ['5 - 7 9 - 7 5 -', '3 - 5 7 - 5 3 -', '4 - 7 9 - 7 4 -', '8 - 6 4 6 - 8 -'],
        drums: { k: 'x.......x.......', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
    },
  },
  /* ---------- boss worlds (10, 20, 30): fast, minor, driving ---------- */
  boss: {
    bpm: 140, vol: 0.39, root: 64, scale: 'minor', form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'brass', bass: 'sawbass', arp: 'chiparp', pad: 'strings' },
    bass: '0 0 3 0 0 0 3 0', arp: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2',
    drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx', m: 'x...............' },
    sec: {
      A: { ch: [0, 0, 5, 6], lead: ['0 - . 0 2 - 4 -', '7 - 6 4 2 - 0 -', '5 - . 5 7 - 9 -', '8 - 6 8 10 - 8 -'] },
      B: { ch: [3, 3, 4, 4], lead: ['3 5 7 5 3 5 7 5', '10 - 9 - 7 - 5 -', '4 6 8 6 4 6 8 6', '11 - 8 - 6 - 4 -'],
        drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx', t: '..............x.' } },
    },
  },
  /* ---------- World 8 Lucky Casino, World 36 Movie Studio: swing ---------- */
  casino: {
    bpm: 132, vol: 0.42, root: 53, scale: 'major', swing: 0.3, form: ['A', 'A2'],
    inst: { lead: 'vibes', bass: 'upright', comp: 'pizz' }, oct: { lead: 1 },
    bass: '0 2 3 2', comp: '. . x . . x . .',
    drums: { r: 'x..xx..xx..xx..x', h: '....x.......x...', k: 'x...............', s: '..............o.' },
    sec: {
      A: { ch: [0, 5, 1, 4], lead: ['4 - 7 9 - 7 4 -', '9 - 7 5 - 7 9 -', '8 - 5 3 - 5 8 -', '8 - 6 4 - 3 1 -'] },
      A2: { ch: [0, 5, 1, 4], lead: ['2 . 4 7 . 9 - -', '7 . 5 9 . 7 - -', '5 . 3 8 . 5 - -', '6 . 4 8 6 4 1 -'] },
    },
  },
  /* ---------- World 12 Winter Games: music box and sleigh bells ---------- */
  winter: {
    bpm: 108, vol: 0.32, root: 53, scale: 'major', form: ['A', 'B'],
    inst: { lead: 'musicbox', bass: 'bass', arp: 'bell', pad: 'softpad' }, oct: { arp: 1 },
    bass: '0 . . . 2 . . .', arp: '0 . 2 . 1 . 2 .',
    drums: { j: 'x.x.x.x.x.x.x.x.', k: 'x.......o.......' },
    sec: {
      A: { ch: [0, 3, 0, 4], lead: ['4 - 7 - 9 - 7 -', '10 - 9 7 5 - - .', '4 - 7 - 9 - 11 -', '8 - 6 4 8 - - .'] },
      B: { ch: [0, 3, 4, 0], lead: ['9 - 7 9 11 - 9 -', '10 - 12 10 7 - 5 -', '8 - 6 8 11 - 8 6', '7 - - - . . . .'] },
    },
  },
  /* ---------- World 13 Spooky Hollow, World 25 Zombie Acres: a creepy waltz ---------- */
  spooky: {
    bpm: 138, vol: 0.42, beats: 3, root: 62, scale: 'harmonic', form: ['A', 'B'],
    inst: { lead: 'whistle', bass: 'pizz', comp: 'harpsi', pad: 'strings' },
    bass: '0 . .', comp: '. x x',
    drums: { t: 'o..', z: '.xx' },
    sec: {
      A: { ch: [0, 0, 3, 0, 4, 4, 0, 0], lead: ['0 2 4', '7 - 6', '5 3 5', '4 - -', '6 8 6', '4 - 1', '2 1 0', '0 - .'] },
      B: { ch: [5, 5, 3, 3, 4, 4, 4, 4], lead: ['5 7 9', '9 - 7', '3 5 7', '7 - 5', '4 6 8', '8 - 6', '4 - 6', '8 - -'] },
    },
  },
  /* ---------- World 15 Orbit Outpost: slow and floaty ---------- */
  space: {
    bpm: 84, vol: 0.27, root: 60, scale: 'lydian', form: ['A'],
    inst: { lead: 'whistle', bass: 'bass', arp: 'bell', pad: 'strings' }, oct: { arp: 1 },
    bass: '0 . . . . . 0 .', arp: '0 2 1 2 3 2 1 2 0 2 1 2 3 2 1 2',
    drums: { k: 'x.........x.....', h: '....o.......o...' },
    sec: {
      A: { ch: [0, 1, 0, 1, 5, 1, 0, 0],
        lead: ['4 - - 6', '8 - - -', '7 - - 4', '3 - - -', '5 - 7 -', '8 - 5 -', '4 - - -', '. . . .'] },
    },
  },
  /* ---------- World 18 Pirate Cove, World 34 Viking Voyage: a sea jig ---------- */
  pirate: {
    bpm: 152, vol: 0.59, beats: 3, root: 62, scale: 'minor', form: ['A', 'A', 'B'],
    inst: { lead: 'accordion', bass: 'tuba', comp: 'pizz' },
    bass: '0 . . 2 . .', comp: '. x x . x x',
    drums: { k: 'x.....', j: '..x..x', t: '...o..' },
    sec: {
      A: { ch: [0, 0, 6, 6, 0, 0, 6, 0],
        lead: ['0 - 2 4 - 2', '4 - 7 4 2 0', '-1 - 1 3 - 1', '3 - 6 3 1 -1', '0 - 2 4 - 7', '9 - 7 4 - 2', '1 - 3 1 -1 1', '0 - - 0 - .'] },
      B: { ch: [5, 5, 2, 2, 3, 3, 4, 4],
        lead: ['5 - 7 9 - 7', '9 - 7 5 - .', '2 - 4 6 - 4', '6 - 4 2 - .', '3 - 5 7 - 5', '7 - 5 3 - .', '4 - 6 8 - 6', '8 - 6 4 - -'] },
    },
  },
  /* ---------- World 19 Tumbleweed Gulch, World 23 Barnyard Fair: banjo and harmonica ---------- */
  west: {
    bpm: 126, vol: 0.48, root: 55, scale: 'major', swing: 0.22, form: ['A'],
    inst: { lead: 'harmonica', bass: 'upright', arp: 'banjo' }, oct: { lead: 1, arp: 1 },
    bass: '0 . 2 . 0 . 2 .', arp: '0 2 1 2 3 2 1 2',
    drums: { w: 'x..xx.x.x..xx.x.', z: '..x...x...x...x.' },
    sec: {
      A: { ch: [0, 0, 3, 0, 4, 3, 0, 0],
        lead: ['0 - 2 4 5 - 4 -', '7 - 5 4 2 - 0 -', '5 - 7 5 7 - 5 -', '4 - 2 4 0 - - .',
          '8 - 8 6 4 - 6 -', '5 - 7 5 3 - 5 -', '4 - 2 1 0 - 2 -', '0 - - - . . . .'] },
    },
  },
  /* ---------- World 22 Coral Deep: dreamy and slow ---------- */
  coral: {
    bpm: 92, vol: 0.24, root: 63, scale: 'major', form: ['A'],
    inst: { lead: 'flute', bass: 'bass', arp: 'pluck', pad: 'strings' }, oct: { arp: 1 },
    bass: '0 . . . . . 2 .', arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
    drums: { z: 'o...o...o...o...' },
    sec: {
      A: { ch: [0, 2, 3, 0, 5, 2, 3, 4],
        lead: ['4 - 7 -', '6 - 4 -', '5 - 7 10', '9 - - -', '9 - 7 -', '6 - 4 -', '5 - 7 5', '4 - - -'] },
    },
  },
  /* ---------- World 26 Circus Big Top, World 24 Toy Box Town: an oom-pah march ---------- */
  circus: {
    bpm: 138, vol: 0.41, root: 60, scale: 'major', form: ['A'],
    inst: { lead: 'organ', bass: 'tuba', comp: 'pizz' },
    bass: '0 . 2 . 0 . 2 .', comp: '. x . x . x . x',
    drums: { k: 'x...x...x...x...', s: '..x...x...x...xx', H: '..............x.' },
    sec: {
      A: { ch: [0, 0, 4, 4, 4, 4, 0, 0],
        lead: ['4 4# 5 4 7 - 4 -', '2 - 4 - 7 - - .', '3 3# 4 6 8 - 6 -', '4 - 6 - 8 - - .',
          '8 - 6 8 10 - 8 -', '6 - 4 6 8 - 6 4', '7 - 4 7 9 - 7 4', '7 - . 4 7 - . .'] },
    },
  },
  /* ---------- World 27 Robot Factory: chip-tune electro ---------- */
  robots: {
    bpm: 128, vol: 0.49, root: 57, scale: 'minor', form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'chip', bass: 'sawbass', arp: 'chiparp' }, oct: { lead: 1, arp: 1 },
    bass: '0 . 0 3 0 . 0 3', arp: '0 1 2 3 2 1 0 1 2 3 2 1 0 1 2 3',
    drums: { k: 'x...x...x...x...', c: '....x.......x...', h: '..x...x...x...xx', b: '......o.......o.' },
    sec: {
      A: { ch: [0, 5, 2, 6], lead: ['0 - 0 2 4 - 2 -', '7 - 5 7 9 - 7 -', '6 - 4 6 9 - 6 -', '8 - 6 8 10 8 6 -'] },
      B: { ch: [3, 0, 3, 4], lead: ['3 5 7 - 5 3 5 -', '4 2 0 - 2 4 7 -', '3 5 7 - 10 7 5 -', '4 - 6 - 8 - 6 4'] },
    },
  },
  /* ---------- World 28 Pyramid Sands: desert reed and hand drums ---------- */
  pyramid: {
    bpm: 100, vol: 0.34, root: 62, scale: 'phrygdom', form: ['A'],
    inst: { lead: 'reed', bass: 'bass', arp: 'pluck' },
    bass: '0 . . 0 . . 2 .', arp: '0 . 2 . 3 . 2 .',
    drums: { D: 'x.....x...x.....', e: '..x.x...x...x.x.', j: '....x.......x...' },
    sec: {
      A: { ch: [0, 0, 1, 0, 3, 3, 1, 0],
        lead: ['0 - 1 2 3 2 1 0', '2 - 3 4 - 3 2 1', '1 - 2 3 5 3 2 1', '0 - - - . 0 1 2',
          '3 - 4 5 7 - 5 4', '5 4 3 4 5 - 3 -', '1 2 3 2 1 - -1 1', '0 - - - . . . .'] },
    },
  },
  /* ---------- World 29 Ninja Dojo: koto and big drums ---------- */
  ninja: {
    bpm: 96, vol: 0.36, root: 57, scale: 'phrygian', form: ['A'],
    inst: { lead: 'koto', lead2: 'flute', bass: 'bass' }, oct: { lead: 1, lead2: 1 },
    bass: '0 . . . . . . . 2 . . . 0 . . .',
    drums: { t: 'x.....x...x.x...', w: '....x.......x...', T: '..............o.' },
    sec: {
      A: { ch: [0, 0, 0, 0, 0, 0, 0, 0],
        lead: ['0 - 3 4 - 3 1 0', '-1 - 0 - . . 0 1', '3 - 4 6 - 4 3 1', '0 - - - . . . .',
          '7 - 6 4 - 3 4 6', '7 - 8 7 6 4 3 -', '4 - 3 1 0 - -1 0', '0 - - - . 4 3 1'],
        lead2: ['. . . .', '. . . .', '. . . .', '4 - 3 -', '. . . .', '. . . .', '. . . .', '7 - - -'] },
    },
  },
  /* ---------- World 37 Medieval Tournament, World 7 Castle Quest: lute, recorder and tabor ---------- */
  medieval: {
    bpm: 112, vol: 0.24, root: 62, scale: 'dorian', form: ['A'],
    inst: { lead: 'flute', bass: 'bass', arp: 'pluck' },
    bass: '0 . . . 2 . . .', arp: '0 2 1 2 3 2 1 2',
    drums: { t: 'x.....x.x.......', j: '....x.......x.x.' },
    sec: {
      A: { ch: [0, 6, 0, 6, 0, 3, 6, 0],
        lead: ['0 - 2 4 - 2 4 5', '6 - 4 6 8 - 6 -', '7 - 4 7 9 - 7 4', '6 - 8 6 4 - - .',
          '4 - 5 7 - 5 4 2', '3 - 5 7 5 3 5 -', '6 - 4 3 1 - 3 -', '0 - - - . . . .'] },
    },
  },
};

/* ---------- which world plays which song (world index from 0: World 1 is 0). No entry: 'base'. ----------
   A level can pick its own with `music: 'name'` in its def (and a room with its own def.music), or by name here. */
const MUSIC_BY_WORLD = {
  6: 'medieval', 7: 'casino', 9: 'boss', 11: 'winter', 12: 'spooky', 14: 'space', 17: 'pirate', 18: 'west', 19: 'boss',
  21: 'coral', 22: 'west', 23: 'circus', 24: 'spooky', 25: 'circus', 26: 'robots', 27: 'pyramid', 28: 'ninja', 29: 'boss',
  33: 'pirate', 35: 'casino', 36: 'medieval',
};
const MUSIC_BY_LEVEL = {};

/* ---------- ambience beds (how they are written: "ambience" in js/music.js) ---------- */
const AMB_BIRD = (A, t) => { const f = 2300 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.11, f, f * 1.25, 0.07, 0.014); };
const AMB_OWL = (A, t) => { A.chirp(t, 390, 360, 0.25, 0.02); A.chirp(t + 0.38, 390, 330, 0.4, 0.02); };
const AMB_CRICKET = (A, t) => { for (let i = 0; i < 3; i++) A.chirp(t + i * 0.07, 4300, 4300, 0.035, 0.005); };
const AMBIENCE = {
  meadow: { beds: [{ noise: 'bandpass', f: 450, q: 0.6, vol: 0.006, lfo: [0.1, 0.6] }], events: [{ every: [1.5, 5], fn: AMB_BIRD }] },
  wind: { beds: [{ noise: 'bandpass', f: 520, q: 0.9, vol: 0.022, lfo: [0.13, 0.6], sweep: [0.07, 200] }] },
  snow: { beds: [{ noise: 'bandpass', f: 900, q: 1.2, vol: 0.018, lfo: [0.1, 0.7], sweep: [0.06, 350] }] },
  desert: { beds: [{ noise: 'bandpass', f: 700, q: 0.6, vol: 0.012, lfo: [0.08, 0.7] }, { noise: 'highpass', f: 5000, vol: 0.003, lfo: [0.15, 0.8] }] },
  ocean: { beds: [{ noise: 'lowpass', f: 520, vol: 0.035, lfo: [0.11, 0.8] }, { noise: 'highpass', f: 3200, vol: 0.005, lfo: [0.11, 0.9] }],
    events: [{ every: [7, 16], fn(A, t) { A.chirp(t, 1500, 1000, 0.22, 0.01); A.chirp(t + 0.3, 1450, 950, 0.25, 0.01); } },      // a gull
      { every: [4, 9], fn(A, t) { A.chirp(t, 170, 130, 0.35, 0.007, 'sawtooth'); } }] },                                           // a creak of wood
  underwater: { beds: [{ noise: 'lowpass', f: 260, vol: 0.05, lfo: [0.2, 0.3] }],
    events: [{ every: [0.8, 3], fn(A, t) { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.09, 420 + i * 90, 1100 + i * 120, 0.07, 0.016); } }] },
  night: { beds: [{ noise: 'bandpass', f: 400, q: 0.6, vol: 0.006, lfo: [0.09, 0.6] }],
    events: [{ every: [0.5, 1.4], fn: AMB_CRICKET }, { every: [10, 22], fn: AMB_OWL }] },
  spooky: { beds: [{ noise: 'bandpass', f: 320, q: 3, vol: 0.02, lfo: [0.12, 0.6], sweep: [0.1, 120] }],
    events: [{ every: [9, 20], fn: AMB_OWL }, { every: [1, 3], fn: AMB_CRICKET }] },
  cave: { beds: [{ hum: 'sine', f: 55, vol: 0.014 }, { noise: 'lowpass', f: 200, vol: 0.02, lfo: [0.1, 0.4] }],
    events: [{ every: [2, 6], fn(A, t) { A.chirp(t, 1500, 900, 0.05, 0.02); A.chirp(t + 0.16, 1300, 800, 0.04, 0.007); } }] },          // a drip and its echo
  factory: { beds: [{ hum: 'sawtooth', f: 55, lp: 180, vol: 0.02, lfo: [4, 0.3] }, { noise: 'bandpass', f: 1800, q: 2, vol: 0.004, lfo: [1.5, 0.9] }],
    events: [{ every: [1.2, 3.5], fn(A, t) { A.chirp(t, 900, 880, 0.04, 0.008, 'square'); A.puff(t, 'bandpass', 2600, 3, 0.012, 0.05); } },
      { every: [5, 11], fn(A, t) { A.puff(t, 'highpass', 4000, 0.7, 0.012, 0.5, 0.05); } }] },                                    // a hiss of steam
  space: { beds: [{ hum: 'sine', f: 48, vol: 0.03, lfo: [0.1, 0.5] }, { hum: 'sine', f: 96.5, vol: 0.01, lfo: [0.07, 0.6] }],
    events: [{ every: [4, 10], fn(A, t) { const f = 1500 + Math.random() * 900; A.chirp(t, f, f, 0.08, 0.006); A.chirp(t + 0.14, f * 1.2, f * 1.2, 0.08, 0.006); } }] },
  crowd: { beds: [{ noise: 'bandpass', f: 1000, q: 0.5, vol: 0.014, lfo: [0.3, 0.3] }],
    events: [{ every: [8, 18], fn(A, t) { A.puff(t, 'bandpass', 1400, 0.5, 0.02, 1.2, 0.5); } }] },                                // the crowd swells
  lava: { beds: [{ noise: 'lowpass', f: 180, vol: 0.05, lfo: [0.25, 0.4] }],
    events: [{ every: [0.15, 0.6], fn(A, t) { A.puff(t, 'highpass', 3000, 0.7, 0.01, 0.02); } },                                  // crackle
      { every: [3, 8], fn(A, t) { A.chirp(t, 110, 190, 0.12, 0.03); } }] },                                                        // a bubble of lava
  jungle: { beds: [{ noise: 'highpass', f: 6000, vol: 0.004, lfo: [9, 0.8] }, { noise: 'bandpass', f: 450, q: 0.6, vol: 0.006, lfo: [0.1, 0.6] }],
    events: [{ every: [1.5, 4], fn: AMB_BIRD },
      { every: [4, 10], fn(A, t) { for (let i = 0; i < 4; i++) A.chirp(t + i * 0.13, 900, 1500, 0.1, 0.012); } }] },                // a whooping bird
  storm: { beds: [{ noise: 'highpass', f: 2500, vol: 0.012 }, { noise: 'bandpass', f: 420, q: 0.8, vol: 0.022, lfo: [0.14, 0.6], sweep: [0.08, 180] }],
    events: [{ every: [8, 18], fn(A, t) { A.puff(t, 'lowpass', 130, 0.7, 0.12, 1.6, 0.05); A.puff(t + 0.5, 'lowpass', 90, 0.7, 0.07, 1.4, 0.2); } }] }, // thunder
  river: { beds: [{ noise: 'bandpass', f: 1300, q: 0.5, vol: 0.016, lfo: [0.3, 0.25] }, { noise: 'lowpass', f: 420, vol: 0.022, lfo: [0.17, 0.3] }],
    events: [{ every: [2, 6], fn: AMB_BIRD }] },
  city: { beds: [{ noise: 'lowpass', f: 300, vol: 0.022, lfo: [0.08, 0.3] }],
    events: [{ every: [7, 16], fn(A, t) { A.chirp(t, 440, 440, 0.22, 0.005, 'square'); A.chirp(t, 554, 554, 0.22, 0.004, 'square'); } }] },    // a far-off horn
};
/* which world gets which ambience (world index from 0). A level can pick its own with `amb: 'name'` in its def
   (`amb: null` for silence), or by name in AMB_BY_LEVEL. */
const AMB_BY_WORLD = {
  0: 'meadow', 1: 'meadow', 2: 'meadow', 3: 'crowd', 4: 'wind', 5: 'meadow', 6: 'wind', 7: 'crowd', 8: 'lava', 9: 'factory',
  10: 'crowd', 11: 'snow', 12: 'spooky', 13: 'jungle', 14: 'space', 15: 'factory', 16: 'jungle', 17: 'ocean', 18: 'desert', 19: 'lava',
  20: 'wind', 21: 'underwater', 22: 'meadow', 24: 'spooky', 25: 'crowd', 26: 'factory', 27: 'desert', 28: 'night',
  30: 'meadow', 31: 'city', 32: 'storm', 33: 'ocean', 34: 'night', 35: 'city', 36: 'crowd',
};
const AMB_BY_LEVEL = {
  'Robo Pong': null, 'Snowball Fight': 'snow', 'Pizza Delivery': 'city', 'Ice Slide': 'snow', 'Rising Lava': 'lava',
  'Tug of War': 'crowd', 'Sumo Bounce': 'crowd', 'Laser Vault': 'cave', 'Bumper Cars': 'crowd',
  'San Francisco 1906 Quake': 'city', 'Ice Age Glacier': 'snow', 'Curling': 'crowd', 'Ice Hockey': 'crowd',
  'Temple Doors': 'cave', 'River Rapids Canoe': 'river', 'Waterfall Climb': 'river', 'Gold Mine Cart': 'cave',
  'Hot Dog Stand Rush': 'crowd', 'Pie-Eating Contest': 'crowd', 'Tomb Torch Explorers': 'cave', 'Sliding Stone Puzzle': 'cave',
  'Ant Hill Heist': 'cave', 'Blizzard Whiteout': 'snow', 'Ice Fortress Raid': 'snow', 'Mead Hall Feast Brawl': 'crowd',
  'Stunt Show Showdown': 'crowd', 'Runaway Royal Carriage': 'meadow', 'Siege Tower Push': 'wind',
};

/* Pip & Bo - World 43 Arcade Cabinet: music and ambience (registered here so js/music-tracks.js is left alone).
   Shared by every World 43 level: a level picks a part with its def's `music` or switches with Music.cue({ song }).

   INSERT COIN: an original, bright, driving tune in A dorian made of square and triangle waves, a proper bass and
   drums, suggesting the old arcade machines without quoting any of them. The hook climbs in fourths (0 3 4 7) and
   answers itself a step lower; the B part drops to the relative major (C) and sparkles.
     arcadecabinet        the world song (world page, the default for World 43 levels): full band at 148 a minute
     arcadecabinetChute   hushed and echoing: the hook on a soft square, an arp, a heartbeat kick (43-1's coin chute)
     arcadecabinetGears   a clanking beat locked to the gears: woodblocks and toms, the bass in fifths (the gear works)
     arcadecabinetCity    full and glittering: everything, the arp in sixteenths (Circuit City)
     arcadecabinetChase   tense: a pulsing low bass on every 8th, a two-note alarm, the hook in the minor (the Sweeper)
     arcadecabinetBox     grand: the B part's major chords, bells on top (the coin box)
     arcadecabinetStart   a rising fanfare (START), then the world song
   AMBIENCE.arcadecabinet: the hum of the machine, relays clicking, the cooling fan, a coin rattling somewhere, and,
   faintly from outside, the muffled jingle of the game's attract mode. Loudness set with node tools/audio/check.js. */
'use strict';

(() => {
  const hook = ['0 . 3 . 4 . 7 -', '. 6 4 . 3 . 4 .', '-1 . 2 . 3 . 6 -', '. 4 3 . 2 . 0 .'];
  const hook2 = ['0 . 3 . 4 . 7 -', '. 6 4 . 3 . 4 .', '2 . 4 . 6 . 9 -', '8 7 6 4 3 . . .'];
  const bAns = ['. . . . 7 . 6 .', '. . . . 4 . 3 .', '. . . . 6 . 4 .', '. . . . 2 . 3 .'];
  SONGS.arcadecabinet = {
    bpm: 148, vol: 0.18, root: 57, scale: 'dorian', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'chip', lead2: 'chiparp', bass: 'bass', comp: 'pluck', arp: 'chiparp', pad: 'softpad' },
    bass: '0 0 2 0 3 0 2 0', comp: '. x . x . x . x', arp: '0 1 2 3 2 1 0 1',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    sec: {
      A: { ch: [0, 0, 6, 3], lead: hook, lead2: bAns },
      A2: { ch: [0, 0, 4, 3], lead: hook2, lead2: bAns },
      B: { ch: [2, 6, 3, 4], lead: ['4 . 4 5 6 . 4 .', '3 . 3 4 5 . 3 .', '2 . 2 3 4 . 6 .', '7 - - - 6 - 4 -'],
        lead2: ['9 . 11 . 9 . 7 .', '8 . 10 . 8 . 6 .', '7 . 9 . 11 . 9 .', '11 - - - 10 - - -'], arp: '0 2 1 3 0 2 1 3',
        drums: { k: 'x.......x.x.....', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' } },
    },
  };
  SONGS.arcadecabinetChute = {
    bpm: 148, vol: 0.34, root: 57, scale: 'dorian', form: ['A', 'A'],
    inst: { lead: 'chiparp', bass: 'bass', arp: 'musicbox', pad: 'softpad' },
    bass: '0 . . . 0 . . .', arp: '0 . 2 . 3 . 2 .',
    drums: { k: 'x.......x.......', h: '....o.......o...' },
    sec: { A: { ch: [0, 0, 6, 3], lead: hook } },
  };
  SONGS.arcadecabinetGears = {
    bpm: 148, vol: 0.4, root: 57, scale: 'dorian', form: ['A', 'A2'],
    inst: { lead: 'chip', lead2: 'chiparp', bass: 'sawbass', arp: 'marimba' },
    bass: '0 . 2 . 0 . 2 .', arp: '0 . 0 1 . 2 . 1',
    drums: { k: 'x...x...x...x...', t: '..x.......x.....', w: 'x.xxx.x.x.xxx.x.', h: '..x...x...x...x.' },
    sec: { A: { ch: [0, 0, 6, 3], lead: hook, lead2: bAns }, A2: { ch: [0, 0, 4, 3], lead: hook2 } },
  };
  SONGS.arcadecabinetCity = {
    bpm: 150, vol: 0.17, root: 57, scale: 'dorian', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'chip', lead2: 'bell', bass: 'bass', comp: 'pluck', arp: 'chiparp', pad: 'softpad' },
    bass: '0 0 2 0 3 0 2 3', comp: '. x . x . x . x', arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', c: '............x...' },
    sec: SONGS.arcadecabinet.sec,
  };
  SONGS.arcadecabinetChase = {
    bpm: 156, vol: 0.35, root: 57, scale: 'minor', form: ['A', 'A'],
    inst: { lead: 'chip', lead2: 'chiparp', bass: 'sawbass', pad: 'strings' },
    bass: '0 0 0 0 0 0 0 0',
    drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    sec: { A: { ch: [0, 5, 6, 4], lead: ['0 . 3 . 4 . 7 -', '. 5 4 . 3 . 4 .', '-1 . 2 . 3 . 6 -', '. 4 3 . 2 . 0 .'],
      lead2: ['11 . 10 . 11 . 10 .', '11 . 10 . 11 . 10 .', '11 . 10 . 11 . 10 .', '11 . 10 . 11 . 10 .'] } },
  };
  SONGS.arcadecabinetBox = {
    bpm: 140, vol: 0.23, root: 60, scale: 'major', form: ['A', 'B'],
    inst: { lead: 'chip', lead2: 'bell', bass: 'bass', comp: 'pluck', arp: 'vibes', pad: 'strings' },
    bass: '0 . 2 . 3 . 2 .', comp: '. x . x . x . x', arp: '0 1 2 3 2 1 2 3',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    sec: { A: { ch: [0, 4, 5, 3], lead: ['4 . 4 5 6 . 4 .', '3 . 3 4 5 . 3 .', '2 . 2 3 4 . 6 .', '7 - - - 6 - 4 -'], lead2: ['7 - - - 9 - - -', '8 - - - 7 - - -', '9 - - - 11 - - -', '14 - - - - - - -'] },
      B: { ch: [5, 3, 4, 4], lead: ['2 . 4 . 7 . 9 -', '. 8 7 . 5 . 4 .', '4 . 5 . 6 . 7 -', '7 - - - - - - -'], lead2: ['9 - - - - - - -', '10 - - - 9 - - -', '11 - - - 13 - - -', '14 - - - - - - -'] } },
  };
  SONGS.arcadecabinetStart = {
    bpm: 132, vol: 0.36, root: 60, scale: 'major', form: ['A'],
    inst: { lead: 'chip', lead2: 'brass', bass: 'bass', arp: 'chiparp', pad: 'strings' },
    bass: '0 . . . 0 . . .', arp: '0 1 2 3 4 3 2 1',
    drums: { k: 'x.......x.......', s: '............xxxx', H: 'x...............' },
    sec: { A: { ch: [0, 3, 4, 0], lead: ['0 2 4 7 - - - -', '5 7 9 12 - - - -', '6 8 11 13 - - - -', '14 - - - - - - -'], lead2: ['0 - - - - - - -', '3 - - - - - - -', '4 - - - - - - -', '7 - - - - - - -'] } },
  };
  if (typeof MUSIC_BY_WORLD !== 'undefined') MUSIC_BY_WORLD[42] = 'arcadecabinet';

  const RELAY = (A, t) => { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.07, 2600, 2400, 0.012, 0.006, 'square'); };
  const RATTLE = (A, t) => { for (let i = 0; i < 5; i++) A.chirp(t + i * 0.09 + Math.random() * 0.03, 2400 + Math.random() * 600, 2200, 0.05, 0.004, 'triangle'); };
  const ATTRACT = (A, t) => { [0, 4, 7, 12, 7, 4].forEach((n, i) => A.chirp(t + i * 0.12, 440 * Math.pow(2, n / 12), 440 * Math.pow(2, n / 12), 0.08, 0.0025, 'square')); };
  const ZAPP = (A, t) => { A.puff(t, 'highpass', 4500, 0.8, 0.006, 0.08); };
  Object.assign(AMBIENCE, {
    arcadecabinet: { beds: [{ hum: 'sawtooth', f: 60, lp: 220, vol: 0.014, lfo: [0.2, 0.3] }, { noise: 'bandpass', f: 420, q: 0.7, vol: 0.01, lfo: [0.6, 0.25] }],
      events: [{ every: [0.6, 2.2], fn: RELAY }, { every: [9, 18], fn: RATTLE }, { every: [12, 24], fn: ATTRACT }, { every: [2, 6], fn: ZAPP }] },
  });
})();

/* Pip & Bo - Level 41-2 Page Turner Chase: its music and ambience (loaded with the level's rules, not on demand).
   popchase0-3: one song per page, a music-box tune in a minor key pushed along by a galloping plucked bass and a
     clock tick that gets busier and faster each page (the Reader is reading faster).
   popchaseLullaby: the same tune slowed into a lullaby in a major key for the finish under the paper night sky.
   popchaseAttic (ambience): the attic at bedtime: rain on the roof, the Reader's slow breathing, a creak, a yawn
     every 20 s or so. MODES.popchase.music (in page-turner-chase.js) picks the song for the page. */
'use strict';

(function () {
  const TUNE = {
    A: ['4 . 2 . 0 . 2 4', '5 . 4 . 2 . . .', '3 . 2 . 0 . 3 5', '4 . 3 . 1 . . .'],
    A2: ['7 . 6 . 4 . 6 7', '8 . 7 . 5 . . .', '6 . 5 . 3 . 5 6', '4 - - . 1 . 4 .'],
    B: ['5 . 7 . 9 . 7 5', '3 . 5 . 7 . 5 3', '4 . 6 . 7 . 9 .', '8 . 7 . 6 . 4 .'],
  };
  const TICKS = ['x.......x.......', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'X.xxxxxxX.xxxxxx'];
  const chase = (k, vol) => ({
    bpm: 132 + k * 8, vol, root: 57 + [0, 0, 2, 3][k], scale: 'minor', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'musicbox', lead2: 'bell', bass: 'upright', comp: 'pizz', pad: 'softpad' }, oct: { lead: 1, lead2: 1 },
    // the gallop: long, short-short
    bass: '0 . 0 0 0 . 0 0 4 . 4 4 4 . 4 4', comp: k < 2 ? '. . x . . . x .' : '. x . x . x . x',
    drums: { w: TICKS[k], k: 'x.....x.x.....x.', h: k >= 2 ? '..x...x...x...x.' : '' },
    sec: {
      A: { ch: [0, 5, 3, 4], lead: TUNE.A },
      A2: { ch: [0, 5, 3, 4], lead: TUNE.A2, lead2: ['. . . . 7 . . .', '. . . . 8 . . .', '. . . . 6 . . .', '. . . . 4 . . .'] },
      B: { ch: [5, 3, 0, 4], lead: TUNE.B },
    },
  });
  SONGS.popchase0 = chase(0, 0.27); SONGS.popchase1 = chase(1, 0.27); SONGS.popchase2 = chase(2, 0.25); SONGS.popchase3 = chase(3, 0.26);
  SONGS.popchaseLullaby = {
    bpm: 72, vol: 0.35, root: 60, scale: 'major', form: ['A', 'A2'],
    inst: { lead: 'musicbox', bass: 'bass', pad: 'softpad' }, oct: { lead: 1 },
    bass: '0 . . . 4 . . .',
    sec: { A: { ch: [0, 5, 3, 4], lead: TUNE.A }, A2: { ch: [0, 5, 3, 0], lead: TUNE.A2 } },
  };
  MUSIC_BY_LEVEL['Page Turner Chase'] = 'popchase0';
  AMBIENCE.popchaseAttic = {
    beds: [
      { noise: 'highpass', f: 3200, vol: 0.008, lfo: [0.3, 0.3] },             // rain on the roof
      { noise: 'bandpass', f: 900, q: 0.6, vol: 0.008, lfo: [0.17, 0.4] },
      { noise: 'lowpass', f: 260, vol: 0.022, lfo: [0.2, 0.95] },             // the Reader's slow breathing
    ],
    events: [
      { every: [18, 26], fn(A, t) { A.chirp(t, 220, 140, 1.4, 0.012, 'sawtooth'); A.chirp(t + 0.1, 330, 180, 1.2, 0.01); A.puff(t, 'lowpass', 700, 0.7, 0.02, 1.2, 0.3); } }, // a yawn
      { every: [10, 20], fn(A, t) { A.chirp(t, 180, 150, 0.35, 0.006, 'sawtooth'); } },                                                                   // a beam creaks
      { every: [3, 8], fn(A, t) { A.puff(t, 'highpass', 5000, 0.8, 0.012, 0.04); } },                                                                       // a heavy drop on the window
    ],
  };
  AMB_BY_LEVEL['Page Turner Chase'] = 'popchaseAttic';
})();

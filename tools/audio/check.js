#!/usr/bin/env node
// Checks the music and sound engine (js/audio.js, js/music.js, js/music-tracks.js) in headless Chromium:
//   every song is well-formed (bars line up, instruments and drums exist) and renders without an error;
//   how loud each song is (peak and average), so the songs can be balanced against each other;
//   every world and level resolves to a song and an ambience that exist;
//   every sound effect in the game plays without an error; the music follows the menus and levels.
// Usage: node tools/audio/check.js [--wav] [--secs=20]     --wav also saves build/audio/<song>.wav to listen to
// (needs Playwright; exit code 1 on a failure)
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : null; };
const SECS = +(arg('secs') || 20), WAV = !!arg('wav');
let fails = 0;
const ok = (cond, what) => { if (!cond) { fails++; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };
function wav(b64, sr) {
  const pcm = Buffer.from(b64, 'base64'), head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22); head.writeUInt32LE(sr, 24); head.writeUInt32LE(sr * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
}
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo);

  // --- the songs are well-formed
  const bad = await page.evaluate(() => {
    const out = [];
    for (const name in SONGS) {
      const s = SONGS[name], say = m => out.push(name + ': ' + m);
      if (!MUSIC_SCALES[s.scale || 'major']) say('unknown scale ' + s.scale);
      for (const k in s.inst || {}) if (!MUSIC_INST[s.inst[k]]) say('unknown instrument ' + s.inst[k]);
      for (const f of s.form) if (!s.sec[f]) say('form names a missing section ' + f);
      const drumRows = d => { for (const k in d || {}) { if (!MUSIC_DRUMS[k]) say('unknown drum ' + k); if (/[^xXo.\s]/.test(d[k])) say('bad drum row ' + d[k]); } };
      const pat = (p, what) => { if (p) for (const t of p.trim().split(/\s+/)) if (!/^(-?\d+|\.|-|x|X)$/.test(t)) say('bad ' + what + ' piece "' + t + '"'); };
      drumRows(s.drums); pat(s.bass, 'bass'); pat(s.arp, 'arp'); pat(s.comp, 'comp');
      for (const f in s.sec) {
        const sec = s.sec[f];
        drumRows(sec.drums); pat(sec.bass, 'bass'); pat(sec.arp, 'arp'); pat(sec.comp, 'comp');
        for (const k of ['lead', 'lead2']) if (sec[k]) {
          if (sec[k].length !== sec.ch.length) say(f + '.' + k + ' has ' + sec[k].length + ' bars for ' + sec.ch.length + ' chords');
          sec[k].forEach((row, i) => {
            const t = row.trim().split(/\s+/);
            for (const x of t) if (!/^(-?\d+[#b]?|\.|-)$/.test(x)) say(f + '.' + k + ' bar ' + (i + 1) + ': bad piece "' + x + '"');
            if (t[0] === '-') say(f + '.' + k + ' bar ' + (i + 1) + ' starts with a hold');
          });
        }
      }
    }
    return out;
  });
  ok(!bad.length, 'every song is well-formed' + (bad.length ? ':\n        ' + bad.join('\n        ') : ''));

  // --- every world and level has a song and an ambience that exist
  const maps = await page.evaluate(() => {
    const P = window.__pipbo, out = [], rows = [];
    P.LEVELS.forEach((l, i) => {
      P.loadLevel(i, 'view'); P.G.mode = 'play';
      const w = Music.pick();
      if (!SONGS[w.song]) out.push(l.name + ': no song ' + w.song);
      if (w.amb && !AMBIENCE[w.amb]) out.push(l.name + ': no ambience ' + w.amb);
      rows.push((l.world + 1) + ' ' + l.name + ': ' + w.song + ' / ' + (w.amb || '-'));
    });
    for (const k in MUSIC_BY_LEVEL) if (!P.LEVELS.some(l => l.name === k)) out.push('MUSIC_BY_LEVEL names a level that does not exist: ' + k);
    for (const k in AMB_BY_LEVEL) if (!P.LEVELS.some(l => l.name === k)) out.push('AMB_BY_LEVEL names a level that does not exist: ' + k);
    P.showTitle();
    return { out, rows };
  });
  ok(!maps.out.length, 'every level picks a song and an ambience that exist' + (maps.out.length ? ':\n        ' + maps.out.join('\n        ') : ''));
  if (arg('list')) console.log(maps.rows.join('\n'));

  // --- render every song offline and measure it
  const names = await page.evaluate(() => Object.keys(SONGS));
  console.log('\nsong        bars  loop(s)  peak   avg(dB)');
  for (const name of names) {
    const r = await page.evaluate(async ([name, secs, wantWav]) => {
      const sr = 44100, off = new OfflineAudioContext(2, sr * secs, sr), live = Sfx.ctx;
      Sfx.ctx = off; Sfx.build(off);
      const song = SONGS[name], out = off.createGain(); out.gain.value = song.vol == null ? 1 : song.vol; out.connect(Sfx.musicIn);
      Sfx.musicVol.gain.value = 1;
      const trk = { song, out, rate: 1, next: 0.05, bar: 0 };
      let err = null;
      try { while (trk.next < secs) Music.bar(trk); } catch (e) { err = String(e && e.stack || e); }
      const buf = await off.startRendering();
      Sfx.ctx = live; if (live) Sfx.build(live);
      const a = buf.getChannelData(0), b = buf.getChannelData(1);
      let peak = 0, sum = 0;
      for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > peak) peak = v; sum += a[i] * a[i]; }
      const bars = Music.barsOf(song).length;
      return { vol: song.vol == null ? 1 : song.vol, err, peak, rms: Math.sqrt(sum / a.length), bars, loop: bars * (song.beats || 4) * 60 / song.bpm, pcm: wantWav ? (() => { const i16 = new Int16Array(a.length * 2); for (let i = 0; i < a.length; i++) { i16[i * 2] = Math.max(-1, Math.min(1, a[i])) * 32767; i16[i * 2 + 1] = Math.max(-1, Math.min(1, b[i])) * 32767; }
        const u8 = new Uint8Array(i16.buffer); let str = ''; for (let i = 0; i < u8.length; i += 32768) str += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(str); })() : null };
    }, [name, SECS, WAV]);
    const db = 20 * Math.log10(r.rms || 1e-9);
    console.log(name.padEnd(12) + ('vol ' + (r.vol * Math.pow(10, (-24 - db) / 20)).toFixed(2)).padEnd(10) + String(r.bars).padStart(4) + r.loop.toFixed(1).padStart(8) + r.peak.toFixed(2).padStart(7) + db.toFixed(1).padStart(9));
    ok(!r.err, name + ' renders' + (r.err ? ': ' + r.err : ''));
    ok(r.peak < 0.95, name + ' does not clip (peak ' + r.peak.toFixed(2) + ')');
    ok(db > -27 && db < -21, name + ' is about as loud as the others (' + db.toFixed(1) + ' dB)');
    if (WAV) { fs.mkdirSync(path.join(root, 'build', 'audio'), { recursive: true }); fs.writeFileSync(path.join(root, 'build', 'audio', name + '.wav'), wav(r.pcm, 44100)); }
  }

  // --- every sound effect plays, and its texture layer is looked up, without an error
  const sfx = await page.evaluate(() => {
    Sfx.init();
    const names = ['jump', 'land', 'press', 'open', 'close', 'key', 'flag', 'die', 'clear', 'win', 'splash', 'boing', 'matchWin', 'cup', 'portal'].concat(Object.keys(Sfx.extra));
    const bad = []; let textured = 0;
    const tone = Sfx.tone, noise = Sfx.noise; let calls = 0;
    Sfx.tone = function () { calls++; }; Sfx.noise = function () { calls++; };     // count, do not flood the speakers
    for (const n of names) { try { Sfx.texLast = {}; Sfx.play(n, 0); Sfx.play(n, 1); if (Sfx.texOf[n]) textured++; } catch (e) { bad.push(n + ': ' + e.message); } }
    Sfx.tone = tone; Sfx.noise = noise;
    return { n: names.length, bad, textured, calls };
  });
  ok(!sfx.bad.length, sfx.n + ' sound effects play without an error (' + sfx.textured + ' get a texture layer)' + (sfx.bad.length ? ': ' + sfx.bad.slice(0, 8).join('; ') : ''));

  // --- the music follows the game: menu song on the title, the world's song in a level, quieter when paused
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const st = () => page.evaluate(() => ({ song: Music.name, amb: Music.amb, duck: Music.trk && Music.trk.duck, state: Sfx.ctx && Sfx.ctx.state, mode: window.__pipbo.G.mode }));
  let s = await st();
  ok(s.state === 'running' && s.song === 'menu', 'the menu song plays on the menus (' + JSON.stringify(s) + ')');
  await page.evaluate(() => { const P = window.__pipbo; P.startLevel(P.LEVELS.findIndex(l => l.world === 17)); });
  await page.waitForTimeout(500); s = await st();
  ok(s.song === 'pirate' && s.amb === 'ocean', 'a World 18 level plays the pirate song over the sea (' + JSON.stringify(s) + ')');
  await page.evaluate(() => { const P = window.__pipbo; P.G.mode = 'play'; P.pause(); });
  await page.waitForTimeout(300); s = await st();
  ok(s.mode === 'paused' && s.duck < 1, 'pausing turns the music down');
  ok(await page.locator('[data-act="syscfg"][data-k="music"]').count() === 4 && await page.locator('[data-act="syscfg"][data-k="sfx"]').count() === 4, 'the pause menu has Music and Sounds volume buttons');
  await page.click('[data-act="syscfg"][data-k="music"][data-v="0"]'); await page.waitForTimeout(300); s = await st();
  ok(s.song === null, 'Music: Off stops the music');
  ok(await page.evaluate(() => localStorage.getItem('pipbo:volMusic')) === '0', 'the music volume is saved');
  await page.click('[data-act="syscfg"][data-k="music"][data-v="3"]'); await page.waitForTimeout(300); s = await st();
  ok(s.song === 'pirate', 'Music: High brings it back');
  await page.keyboard.press('KeyM'); await page.waitForTimeout(200); s = await st();
  ok(s.song === null && s.amb === null, 'M mutes music and ambience');
  await page.keyboard.press('KeyM'); await page.waitForTimeout(200);
  await page.evaluate(() => window.__pipbo.showTitle()); await page.waitForTimeout(300); s = await st();
  ok(s.song === 'menu' && s.amb === null, 'back on the title the menu song returns');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));

  await browser.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
  process.exit(fails ? 1 : 0);
})();

#!/usr/bin/env node
// Builds build/sound-test.html: one page to listen to every song, ambience and sound texture without playing the game.
// Usage: node tools/audio/jukebox.js      (needs only Node). Open the file in a browser, or publish it to share.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const js = f => fs.readFileSync(path.join(root, 'js', f), 'utf8').replace(/^﻿/, '').replace(/'use strict';/, '');
// world names, read from the code so the page can say which worlds play which song
const names = {};
const grab = src => { for (const m of src.matchAll(/WORLDS\[(\d+)\] = \{ name: '((?:[^'\\]|\\.)*)'/g)) names[+m[1]] = m[2].replace(/\\'/g, "'"); };
const list = fs.readFileSync(path.join(root, 'js', 'levels', 'level-list.js'), 'utf8');
const block = list.slice(list.indexOf('const WORLDS = ['));
let n = 0;
for (const m of block.matchAll(/^  \{ name: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)")/gm)) names[n++] = (m[1] || m[2]).replace(/\\'/g, "'");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  if (e.isDirectory()) walk(path.join(d, e.name)); else if (/\.js$/.test(e.name)) grab(fs.readFileSync(path.join(d, e.name), 'utf8'));
});
walk(path.join(root, 'js', 'levels'));

const page = fs.readFileSync(path.join(__dirname, 'jukebox.html'), 'utf8')
  .replace('/*WORLD_NAMES*/', () => JSON.stringify(names))
  .replace('/*AUDIO*/', () => js('audio.js') + js('music.js') + js('music-tracks.js'));
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'sound-test.html'), page);
console.log('Wrote build/sound-test.html (' + (page.length / 1024).toFixed(0) + ' KB)');

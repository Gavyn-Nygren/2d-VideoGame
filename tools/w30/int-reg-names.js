#!/usr/bin/env node
// Name collisions: every top-level name declared in the World 30 files (levels, brains, preview) against every other
// js file and against each other; Sfx.extra keys, store keys, MODES / cpuBrain keys; names that break the tth prefix rule.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const is30 = f => /world30/.test(f);
const decl = {}, sfx = {}, keys = {}, modes = {}, brains = {};
const add = (map, name, f) => { (map[name] || (map[name] = [])).push(f); };
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/^(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) add(decl, m[1], f);
  for (const m of src.matchAll(/^(?:const|let|var)\s+[^=;]*?,\s*([A-Za-z_$][\w$]*)\s*=/gm)) add(decl, m[1], f + ' (2nd in a list)');
  for (const m of src.matchAll(/^(?:const|let|var)\s+[\[{]([^\]}]+)[\]}]\s*=/gm)) for (const n of m[1].split(',')) add(decl, n.trim().split(/[:=]/).pop().trim(), f + ' (destructured)');
  for (const m of src.matchAll(/Sfx\.extra\.([A-Za-z_$][\w$]*)\s*=/g)) add(sfx, m[1], f);
  for (const m of src.matchAll(/store\.(?:get|set)\(\s*(['"`])([^'"`]+)\1/g)) add(keys, m[2], f);
  for (const m of src.matchAll(/^MODES\.([A-Za-z_$][\w$]*)\s*=/gm)) add(modes, m[1], f);
  for (const m of src.matchAll(/cpuBrain\(\s*'([^']+)'/g)) add(brains, m[1], f);
}
let bad = 0;
const report = (what, map, rule) => {
  for (const [name, fs_] of Object.entries(map)) {
    const in30 = fs_.filter(is30), out = fs_.filter(f => !is30(f));
    if (!in30.length) continue;
    const uniq30 = [...new Set(in30.map(f => f.split(' ')[0]))];
    if (out.length || uniq30.length > 1 || in30.length > uniq30.length) { bad++; console.log('CLASH ' + what + ' ' + name + ': ' + fs_.join(', ')); }
    if (rule && !rule(name)) { bad++; console.log('PREFIX ' + what + ' ' + name + ' (' + in30[0] + ') does not start with tth'); }
  }
};
report('name', decl, n => /^(tth|TTH)/.test(n));
report('sfx', sfx, n => /^tth/.test(n));
report('store', keys, n => /^tth/.test(n));
report('mode', modes); report('brain', brains);
// era prefix rule: a name in tth-<era>.js starts with tth<Era> / TTH<ERA>
for (const [name, fs_] of Object.entries(decl)) for (const f of fs_) {
  const m = /tth-([a-z]+)\.js/.exec(f); if (!m) continue;
  const era = m[1];
  if (!new RegExp('^(tth' + era + '|TTH_?' + era + '|tthbrain' + era + '|tth' + era.slice(0, 3) + ')', 'i').test(name)) console.log('era prefix: ' + name + ' in ' + f);
}
const n30 = Object.entries(decl).filter(([, f]) => f.some(is30)).length;
console.log(n30 + ' top-level names in World 30 files, ' + Object.keys(decl).length + ' in all; ' + Object.keys(sfx).filter(k => sfx[k].some(is30)).length + ' World 30 sounds; store keys: ' + Object.keys(keys).filter(k => keys[k].some(is30)).join(' ') + '; problems: ' + bad);

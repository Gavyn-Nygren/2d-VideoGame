#!/usr/bin/env node
// Era 'moon': the whole bot matrix in one go (pair, noisy x2, kid x2, idle x2), with the era's own stats per run.
//   node tools/w30/moon-all.js [--seeds=1,2,3,4,5] [--only=pair,noisy,kid,idle]
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3,4,5'), only = opt('only', 'pair,noisy,kid,idle').split(',');
const run = (who, extra) => {
  let out;
  try { out = execFileSync('node', [path.join(__dirname, 'play.js'), 'moon', '--who=' + who, '--json', ...extra], { encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e) { out = e.stdout; }
  let rs; try { rs = JSON.parse(out); } catch (e) { console.log(who, extra.join(' '), 'NO JSON', String(out).slice(0, 400)); return; }
  for (const r of rs) {
    const o = r.own || {}, ok = who === 'idle' ? !r.ended : !!r.ended;
    console.log(`${who.padEnd(5)} ${extra.filter(x => /clumsy/.test(x)).join('').padEnd(10)} s${r.seed} ${(r.ended || 'not ended').padEnd(9)} ${String(r.t).padStart(6)}s team ${String(r.team).padStart(2)} ${JSON.stringify(r.kinds)} t=${JSON.stringify(o.t)} cells ${o.cells}/${o.missed} pumps ${o.pumps} spills ${o.spills} tries ${o.tries} fuel ${o.fuel} gold ${JSON.stringify(o.gold)} ${ok ? 'ok' : 'FAIL'}${r.cpuErrs.length ? ' CPUERR ' + r.cpuErrs : ''}${r.errors.length ? ' PAGEERR ' + r.errors.join('|').slice(0, 300) : ''}`);
  }
};
if (only.includes('pair')) run('pair', ['--seeds=' + seeds]);
if (only.includes('noisy')) { run('noisy', ['--seeds=1,2,3']); run('noisy', ['--seeds=1,2,3', '--clumsy=1']); }
if (only.includes('kid')) { run('kid', ['--seeds=1,2,3']); run('kid', ['--seeds=1,2,3', '--clumsy=1']); }
if (only.includes('idle')) { run('idle', ['--max=240']); run('idle', ['--max=240', '--clumsy=1']); }

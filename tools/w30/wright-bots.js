#!/usr/bin/env node
// Era 'wright': all the bot runs in one go (a wrapper round tools/w30/play.js), one short line per run with the
// bump kinds and the four flight times.   node tools/w30/wright-bots.js [pair,noisy,kid,idle] [--seeds=1,2,3]
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const args = process.argv.slice(2);
const whos = (args.find(a => !a.startsWith('--')) || 'pair,noisy,kid,idle').split(',');
const seeds = (args.find(a => a.startsWith('--seeds=')) || '--seeds=1,2,3').split('=')[1];
let bad = 0;
for (const who of whos) for (const clumsy of who === 'pair' ? [0] : [0, 1]) {
  const a = [path.join(__dirname, 'play.js'), 'wright', '--who=' + who, '--clumsy=' + clumsy, '--json', '--seeds=' + (who === 'idle' ? '1' : who === 'pair' ? seeds + ',4,5' : seeds)];
  if (who === 'idle') a.push('--max=240');
  let txt; try { txt = execFileSync('node', a, { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { txt = e.stdout; }
  for (const r of JSON.parse(txt)) {
    const ok = (who === 'idle' ? !r.ended : !!r.ended) && !r.errors.length && !r.cpuErrs.length; if (!ok) bad++;
    console.log(`${who.padEnd(5)} clumsy=${clumsy} s${r.seed} ${(r.ended || 'not ended').padEnd(9)} ${String(r.t).padStart(6)}s team ${String(r.team).padStart(2)} help ${r.help.length} ${JSON.stringify(r.kinds)} flights ${JSON.stringify(r.own.flightT)} catch ${r.own.catchT} [${r.hud}] ${ok ? 'ok' : 'FAIL ' + r.errors.join('|') + r.cpuErrs.join('|')}`);
  }
}
process.exit(bad ? 1 : 0);

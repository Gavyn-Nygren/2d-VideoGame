/* Pip & Bo - Shared constants, colors and small helpers used everywhere. */
'use strict';


/* ---------- constants ---------- */
const T = 30, COLS = 32, ROWS = 18, W = COLS * T, H = ROWS * T;
const DT = 1 / 120;
const PW = 22, PH = 26;
const PHYS = {
  g: 2000, jumpV: 660, ropeJumpV: 600, maxRun: 220,
  accG: 2400, accA: 1600, fricG: 2600, fricA: 500,
  maxFall: 900, coyote: 0.08, buffer: 0.12, cut: 0.45,
};
const C = {
  pip: '#ff6b4a', pipDark: '#b8402a', bo: '#5b95ff', boDark: '#2f5fc4',
  gold: '#ffc53d', goldDark: '#b9850f', ink: '#1c1a36', paper: '#f6efdf',
  stone: '#414c7e', stoneLight: '#4f5b92', stoneEdge: '#2f3762', grass: '#8fe3b0', grassDark: '#55ad80',
  spike: '#2a2f4f', spikeHi: '#e9e4f5', plank: '#c98b5a', plankDark: '#8a5833',
  skyTop: '#bfe3f0', skyBot: '#f6ecd0', hillFar: '#acd8cf', hillNear: '#8fc5b6',
  rope: '#f1d7a6', ropeDark: '#6b4630', doorIn: '#2b2850', glow: '#ffd77a',
  sun: 'rgba(255, 238, 176, 0.95)', sunGlow: 'rgba(255, 238, 176, 0.35)',
};
const LETTER_COL = { a: '#ffc53d', b: '#ff8fc7', c: '#b28dff' };
const NAMES = ['Pip', 'Bo'];
const PCOL = [C.pip, C.bo], PDARK = [C.pipDark, C.boDark];
const BASE_C = { ...C };
// a level (or room) can override its world's colours with def.theme = { skyTop: ..., grass: ... } (same keys as WORLDS[].theme)
function applyTheme(w, extra) { Object.assign(C, BASE_C, (WORLDS[w] || WORLDS[0]).theme, extra || {}); }
const reduceMotion = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

/* ---------- small helpers ---------- */
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w - 0.001 && a.x + a.w > b.x + 0.001 && a.y < b.y + b.h - 0.001 && a.y + a.h > b.y + 0.001;
const rectHit = (p, x, y, w, h) => p.x < x + w && p.x + p.w > x && p.y < y + h && p.y + p.h > y;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };
const fmtTime = s => { const m = Math.floor(s / 60); const r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 1-player mode, a brain stands in for the person: does correct play ever press nothing for 10 s (the Thief then "waits")?
const path = require('path'); const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const page = await b.newPage();
 await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html')); await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES.timethief);
 for (const human of [0, 1]) for (const era of [0,1,2,3,4,5,6,7,8,9]) {
 const r = await page.evaluate(({ human, era }) => { const P = window.__pipbo; G.manual = true; G.cpuOn = [human !== 0, human !== 1];
  const st = P.MODES.timethief.test.jump(era, { seed: 3 }); let hst = {}; const p = G.players[human], o = G.players[1 - human]; let quiet = 0, maxQuiet = 0, log = [];
  for (let n = 0; n < 400 / P.DT; n++) {
    const out = cpuBrainFor(G.level.def).think(hst, p, o, P.DT, cpuInfo(p)) || {}; cpuApply(p, out);
    const any = p.input.left || p.input.right || p.input.jump || p.input.down || p.input.up || p.input.act;
    quiet = any ? 0 : quiet + P.DT; if (quiet > maxQuiet) maxQuiet = quiet;
    P.step(P.DT);
    if (st.idle && !log.length) { log.push({ phT: st.phT.toFixed(1), roles: TTH_PHASES[st.phase].roles(st), labels: st.labKey, hud: TTH_PHASES[st.phase].hudText(st), px: Math.round(p.x), py: Math.round(p.y), bubbles: CPU.bubbles.map(x => x && x.text), ph: Object.keys(st.ph).filter(k => typeof st.ph[k] !== "object").map(k => k + "=" + (typeof st.ph[k] === "number" ? +st.ph[k].toFixed(1) : st.ph[k])).join(" ") }); break; }
    if (st.cut) break; }
  return { human, cut: !!st.cut, phT: st.phT, maxQuiet, log }; }, { human, era });
 console.log(era, "human", human, r.cut ? "ended" : "IDLE STALL", "phT", r.phT.toFixed(1), "maxQuiet", r.maxQuiet.toFixed(1), r.log.length ? JSON.stringify({ roles: r.log[0].roles, hud: r.log[0].hud, labels: r.log[0].labels }) : ""); }
 await b.close(); })();

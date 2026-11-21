const path=require('path');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const pg=await b.newPage();const errs=[];
pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});pg.on('pageerror',e=>errs.push(String(e.stack||e)));
await pg.goto('file://'+path.resolve('index.html'));await pg.waitForFunction(()=>window.__pipbo&&window.__pipbo.G);
const ok=await pg.evaluate(()=>window.__pipbo.K3D.need());
const r=await pg.evaluate(()=>{const P=window.__pipbo,G=P.G;const i=P.LEVELS.findIndex(l=>l.mode==='arcadecoin');G.manual=true;P.K3D.noRender=true;G.cpuOn=[true,true];P.loadLevel(i);const st=G.mst;let n=0;for(;n<120*200&&G.mode==='play';n++)P.step(P.DT);return {i,code:P.LEVELS[i].world,mode:G.mode,phase:st.phase,s:st.s.toFixed(1),t:st.t.toFixed(1),coins:st.coins,wipes:st.wipes,restarts:st.restarts,ARC:typeof ARCADE, sweeps:st.sweeps, why: st.fx.filter(f=>f.k==='wipe').slice(-4).map(f=>f.why+'@'+f.s.toFixed(1)+' x'+f.x.toFixed(1)).join(' ')}});
console.log(ok,JSON.stringify(r));console.log(errs.slice(0,10).join('\n'));await b.close();})();

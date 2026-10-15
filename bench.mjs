/**
 * Scroll-performance baseline for the production URL.
 *
 * Reports MEDIAN frame time during a steady scroll, which is what "lag" actually is.
 * 16.7ms = 60fps. Anything over ~33ms (30fps) is visible as stutter.
 * CPU throttling stands in for slower hardware: 1x desktop, 4x a mid phone.
 */
import { chromium } from 'playwright';
const BASE='https://www.raysonsgroup.com/shell-molded-castings-manufacturers-in-india/new-website';
const PAGES=['index.html','About Us.html','foundry.html','products.html','enquire.html'];
const b=await chromium.launch();
async function run(page,vp,cpu,label){
  const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:vp.d,isMobile:vp.w<900,hasTouch:vp.w<900});
  const pg=await ctx.newPage();
  if(cpu>1){ const c=await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate',{rate:cpu}); }
  await pg.goto(BASE+'/'+encodeURI(page),{waitUntil:'domcontentloaded',timeout:60000});
  await pg.waitForTimeout(12000);
  const r=await pg.evaluate(async ()=>{
    const f=[]; let last=performance.now(), stop=false;
    const tick=()=>{const n=performance.now(); f.push(n-last); last=n; if(!stop)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
    const t0=performance.now();
    while(performance.now()-t0<6000){ scrollBy(0,90); await new Promise(r=>setTimeout(r,45)); }
    stop=true; await new Promise(r=>setTimeout(r,200)); f.shift();
    if(f.length<8) return {bad:true,n:f.length};
    const s=[...f].sort((a,b)=>a-b);
    return {med:+s[Math.floor(s.length*.5)].toFixed(1), p90:+s[Math.floor(s.length*.9)].toFixed(1)};
  });
  const v=r.bad?'  (too few frames)':`median ${String(r.med).padStart(6)}ms  p90 ${String(r.p90).padStart(6)}ms  ${r.med<=20?'smooth':r.med<=33?'ok':'LAGGY'}`;
  console.log(`  ${page.padEnd(15)} ${label.padEnd(14)} ${v}`);
  await ctx.close();
  return r.med||999;
}
console.log('DESKTOP (1440x900, no throttle)');
for(const p of PAGES) await run(p,{w:1440,h:900,d:2},1,'desktop');
console.log('');
console.log('iPHONE (390x844 dpr3, 4x CPU throttle)');
for(const p of PAGES) await run(p,{w:390,h:844,d:3},4,'iphone 4x');
console.log('');
console.log('ANDROID (412x915 dpr2.6, 4x CPU throttle)');
for(const p of PAGES) await run(p,{w:412,h:915,d:2.6},4,'android 4x');
await b.close();

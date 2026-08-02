import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT='e:/raysons-website';
const OUT='C:/Users/HP/AppData/Local/Temp/claude/e--raysons-website/acd346fb-43f0-4bf8-99c3-50069c053182/scratchpad';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.glb':'model/gltf-binary'};
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,b)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(p).toLowerCase()]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>srv.listen(4381,r));
const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ok=(n,c)=>console.log(`${c?'PASS':'FAIL'}  ${n}`); const errs=[];
const ctx=await br.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{localStorage.setItem('rc_theme','light')}catch(e){}});
// Products: does .pline cover .pstage?
{
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('products: '+e.message));
  await pg.goto('http://localhost:4381/raysons-scrollyteller/products.html',{waitUntil:'load'}); await pg.waitForTimeout(4000);
  await pg.evaluate(()=>scrollTo(0,innerHeight*3)); await pg.waitForTimeout(3000);
  const s=await pg.evaluate(()=>({pline:getComputedStyle(document.querySelector('.pline')).backgroundColor,
    pstage:getComputedStyle(document.querySelector('.pstage')).backgroundColor,
    parts:[...document.querySelectorAll('.ppart')].filter(p=>getComputedStyle(p).visibility!=='hidden').length}));
  ok('Products: procession not covered by an opaque section', s.pline==='rgba(0, 0, 0, 0)');
  console.log('   ',JSON.stringify(s));
  await pg.screenshot({path:path.join(OUT,'stack-products-light.png'),animations:'disabled',timeout:90000});
  await pg.close();
}
// Foundry: does .fhero / .fobj cover the heat canvas?
{
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('foundry: '+e.message));
  await pg.goto('http://localhost:4381/raysons-scrollyteller/foundry.html',{waitUntil:'load'}); await pg.waitForTimeout(5000);
  const s=await pg.evaluate(()=>({fhero:getComputedStyle(document.querySelector('.fhero')).backgroundColor,
    fobj:getComputedStyle(document.getElementById('fobj')).backgroundColor,
    stage:getComputedStyle(document.querySelector('.stage')).backgroundColor,
    live:document.body.classList.contains('fobj-live')}));
  ok('Foundry: hero + object not painted over the heat field', s.fhero==='rgba(0, 0, 0, 0)' && s.fobj==='rgba(0, 0, 0, 0)');
  console.log('   ',JSON.stringify(s));
  await pg.screenshot({path:path.join(OUT,'stack-foundry-light.png'),animations:'disabled',timeout:90000});
  await pg.close();
}
console.log('errors:',errs.length?errs.slice(0,3):'none');
await br.close(); srv.close();

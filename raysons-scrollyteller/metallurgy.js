// ============================================================
//  RAYSONS — Foundry · "The Metallurgy" (Chapter V — the Innovation beat)
//  One iron, four grades. A polished specimen turns under a raking light while its
//  MICROSTRUCTURE walks the material spectrum on scroll: flake graphite (Grey CI) drawing
//  into spheres (Ductile), warming through the heat grade (SiMo) to the austempered
//  brightness of ADI. The graphite shape IS the metallurgy — flake vs spheroidal is exactly
//  what separates grey iron from ductile — so the visual tells the true story.
//  Procedural Canvas 2D, zero new assets — the same "we don't show you the fire, we make
//  one" ethos as the heat-field. Idle-gated + reduced-motion safe; no canvas → the stacked
//  cards in the markup carry it.
// ============================================================
(function(){
  const wrap   = document.getElementById('metallurgy');
  const canvas = document.getElementById('metalCanvas');
  if(!wrap || !canvas) return;
  const ctx = canvas.getContext('2d');
  if(!ctx){ wrap.classList.add('metal--flat'); return; }   // no 2d → flatten to the cards

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  const clamp = (v,a,b)=> v<a?a : v>b?b : v;
  const lerp  = (a,b,t)=> a + (b-a)*t;

  // material signatures — colour, microstructure, hardness. spher: 0 = flake, 1 = spheroidal.
  const MAT = [
    { metal:[0x55,0x51,0x4b], light:[0xcf,0xd6,0xe0], glow:[0,0,0,0],           spher:0.0, dens:0.86, hard:0.26 }, // Grey CI
    { metal:[0x63,0x5c,0x53], light:[0xe6,0xdc,0xcb], glow:[0,0,0,0],           spher:1.0, dens:1.00, hard:0.50 }, // SG / Ductile
    { metal:[0x7c,0x5a,0x3e], light:[0xff,0xb4,0x74], glow:[255,110,30,0.50],   spher:1.0, dens:1.05, hard:0.62 }, // SiMo
    { metal:[0x9a,0x82,0x58], light:[0xff,0xe6,0xb2], glow:[255,201,112,0.30],  spher:1.0, dens:1.24, hard:0.90 }, // ADI
  ];
  const NM = MAT.length;
  const cards = Array.from(wrap.querySelectorAll('.metal__card'));

  // fixed graphite field (uniform in the unit disc) — density param draws a prefix of it
  const P = MOBILE ? 120 : 210;
  const pts = [];
  for(let i=0;i<P;i++){
    const a = Math.random()*6.2832, r = Math.sqrt(Math.random());
    pts.push({ x:Math.cos(a)*r, y:Math.sin(a)*r, s:0.4+Math.random()*0.9, rot:Math.random()*3.1416 });
  }

  let W=0,H=0,dpr=1,raf=null,visible=true,t=0,prog=0,target=0,lastCard=-1;

  function size(){
    dpr = Math.min(devicePixelRatio||1, MOBILE?1.5:2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1,Math.round(r.width)); H = Math.max(1,Math.round(r.height));
    canvas.width = W*dpr; canvas.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  size();
  addEventListener('resize', ()=>{ size(); if(REDUCED) draw(); });
  if('ResizeObserver' in window) new ResizeObserver(()=>{ size(); if(REDUCED) draw(); }).observe(canvas);

  function mix(stop){
    const f = stop - Math.floor(stop);
    const a = MAT[clamp(Math.floor(stop),0,NM-1)], b = MAT[clamp(Math.floor(stop)+1,0,NM-1)];
    const C=(k)=>[lerp(a[k][0],b[k][0],f),lerp(a[k][1],b[k][1],f),lerp(a[k][2],b[k][2],f)];
    return { metal:C('metal'), light:C('light'),
      glow:[lerp(a.glow[0],b.glow[0],f),lerp(a.glow[1],b.glow[1],f),lerp(a.glow[2],b.glow[2],f),lerp(a.glow[3],b.glow[3],f)],
      spher:lerp(a.spher,b.spher,f), dens:lerp(a.dens,b.dens,f), hard:lerp(a.hard,b.hard,f) };
  }
  const rgb=(c)=>`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;

  function draw(){
    ctx.clearRect(0,0,W,H);
    const cx=W*0.5, cy=H*0.52, R=Math.min(W,H)*(MOBILE?0.32:0.29);
    const m = mix(prog*(NM-1));
    const ang = t*0.00015;                                  // the specimen turns slowly
    const lx = cx + Math.cos(ang)*R*0.55, ly = cy + Math.sin(ang*0.8)*R*0.42;   // raking light

    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,R,0,6.2832); ctx.clip();

    // base metal, lit from the raking light
    const base = ctx.createRadialGradient(lx,ly,R*0.04, cx,cy,R*1.08);
    base.addColorStop(0, rgb([ (m.light[0]+m.metal[0])/2, (m.light[1]+m.metal[1])/2, (m.light[2]+m.metal[2])/2 ]));
    base.addColorStop(0.55, rgb(m.metal));
    base.addColorStop(1, rgb([m.metal[0]*0.42,m.metal[1]*0.42,m.metal[2]*0.42]));
    ctx.fillStyle = base; ctx.fillRect(0,0,W,H);

    // graphite: flakes (elongated) draw into spheroids (round) as spher → 1
    const ca=Math.cos(ang), sa=Math.sin(ang);
    const n = Math.min(P, Math.floor(P*clamp(m.dens,0,1.4)));
    const flake = 1 - m.spher;
    for(let i=0;i<n;i++){
      const p = pts[i];
      const px = cx + (p.x*ca - p.y*sa)*R*0.95;
      const py = cy + (p.x*sa + p.y*ca)*R*0.95;
      const b  = R*0.017*p.s;
      const rx = b*(1 + flake*3.4);
      const ry = b*(1 - flake*0.55);
      ctx.save(); ctx.translate(px,py); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(17,15,13,0.82)';
      ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,6.2832); ctx.fill();
      ctx.restore();
    }

    // heat-grade rim (SiMo) / austempered sheen (ADI)
    if(m.glow[3] > 0.01){
      const rim = ctx.createRadialGradient(cx,cy,R*0.55, cx,cy,R*1.02);
      rim.addColorStop(0, `rgba(${m.glow[0]|0},${m.glow[1]|0},${m.glow[2]|0},0)`);
      rim.addColorStop(1, `rgba(${m.glow[0]|0},${m.glow[1]|0},${m.glow[2]|0},${m.glow[3].toFixed(3)})`);
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rim; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over';
    }
    // specular — brighter with hardness (ADI reads polished)
    const sh = ctx.createRadialGradient(lx,ly,0, lx,ly,R*0.75);
    sh.addColorStop(0, `rgba(${m.light[0]|0},${m.light[1]|0},${m.light[2]|0},${(0.14+m.hard*0.24).toFixed(3)})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=sh; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over';
    ctx.restore();

    // specimen edge
    ctx.beginPath(); ctx.arc(cx,cy,R,0,6.2832); ctx.lineWidth=1.2;
    ctx.strokeStyle=`rgba(${m.light[0]|0},${m.light[1]|0},${m.light[2]|0},0.16)`; ctx.stroke();
  }

  function syncCard(){
    const idx = clamp(Math.round(prog*(NM-1)),0,NM-1);
    if(idx===lastCard) return; lastCard=idx;
    cards.forEach((c,i)=> c.classList.toggle('on', i===idx));
  }
  function measure(){
    const max = wrap.offsetHeight - innerHeight;
    return clamp(-wrap.getBoundingClientRect().top / Math.max(1,max), 0, 1);
  }

  // ---- run: animated loop while visible (not reduced); reduced-motion draws on scroll only ----
  let last = performance.now();
  function loop(now){
    raf = requestAnimationFrame(loop);
    const dt = Math.min(48, now-last); last = now; t += dt;
    target = measure(); prog += (target-prog)*0.12;
    draw(); syncCard();
  }
  function start(){ if(raf || REDUCED) return; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } }

  if(REDUCED){
    const redraw = ()=>{ prog = measure(); draw(); syncCard(); };
    addEventListener('scroll', redraw, {passive:true}); redraw();
  } else {
    if('IntersectionObserver' in window){
      new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; visible ? start() : stop(); },
        { rootMargin:'10% 0px' }).observe(wrap);
    } else start();
    document.addEventListener('visibilitychange', ()=> (document.hidden || !visible) ? stop() : start());
  }
})();

// ============================================================
//  RAYSONS — Foundry · procedural molten heat-field
//  Foundry owns no footage: every clip and still in this project belongs to the Overview
//  film or the About reel. Rather than borrow the Overview's pour — a replayed frame of a
//  film the visitor just watched — this hero is GENERATED: a furnace-mouth glow that
//  breathes, and heat plumes rising and shearing off it, drawn with additive blending.
//  Zero bytes, zero borrowed assets, and it matches the page's thesis: we don't show you a
//  picture of the fire, we make one.
//  Idle-gated (IntersectionObserver + tab visibility) and reduced-motion safe.
// ============================================================
(function(){
  const canvas = document.getElementById('fheat');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  const rand = (a,b)=> a + Math.random()*(b-a);

  let W=0, H=0, dpr=1, raf=null, visible=true, t=0;

  function size(){
    dpr = Math.min(devicePixelRatio||1, MOBILE?1.5:2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  size();
  addEventListener('resize', ()=>{ size(); if(REDUCED) draw(0); });
  if('ResizeObserver' in window) new ResizeObserver(()=>{ size(); if(REDUCED) draw(0); }).observe(canvas);

  // ---- heat plumes: soft blobs born at the furnace mouth, rising, shearing, cooling ----
  const N = MOBILE ? 16 : 30;
  const plumes = [];
  function spawn(p, seed){
    p.x = W*0.5 + rand(-W*0.22, W*0.22);
    p.y = H*(seed ? rand(0.55,1.15) : rand(1.02,1.2));   // seeded ones start mid-rise
    p.r = rand(H*0.05, H*0.16);
    p.vy = rand(-0.22, -0.55);
    p.vx = rand(-0.10, 0.10);
    p.life = 0; p.max = rand(260, 620);
    p.heat = rand(0.5, 1);
  }
  for(let i=0;i<N;i++){ const p={}; spawn(p,true); plumes.push(p); }

  function draw(dt){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';

    // furnace mouth — a molten glow low in the frame that breathes
    const pulse = REDUCED ? 0.5 : 0.5 + Math.sin(t*0.0011)*0.5;
    const gy = H*0.94, gr = Math.max(W,H) * (0.42 + pulse*0.05);
    const mouth = ctx.createRadialGradient(W*0.5, gy, 0, W*0.5, gy, gr);
    mouth.addColorStop(0,   'rgba(255,150,60,'  + (0.48 + pulse*0.12).toFixed(3) + ')');
    mouth.addColorStop(0.32,'rgba(214,84,20,'   + (0.24 + pulse*0.06).toFixed(3) + ')');
    mouth.addColorStop(1,   'rgba(120,30,6,0)');
    ctx.fillStyle = mouth;
    ctx.fillRect(0,0,W,H);

    // rising heat
    for(let i=0;i<plumes.length;i++){
      const p = plumes[i];
      if(!REDUCED){
        p.life += dt;
        p.y += p.vy * dt * 0.06;
        p.x += (p.vx + Math.sin((p.y + t*0.05) * 0.006) * 0.22) * dt * 0.06;  // shear as it climbs
        p.r += dt * 0.012;
        if(p.life > p.max || p.y < -p.r) spawn(p,false);
      }
      const climb = 1 - Math.min(1, p.y / (H*1.05));          // hotter low, cooler high
      const fade  = 1 - Math.min(1, p.life / p.max);
      const a = Math.max(0, climb * fade * p.heat * 0.26);
      if(a <= 0.002) continue;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0,   'rgba(255,' + (120 + climb*70|0) + ',' + (40 + climb*30|0) + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(196,74,18,' + (a*0.45).toFixed(3) + ')');
      g.addColorStop(1,   'rgba(90,24,4,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  let last = performance.now();
  function loop(now){
    raf = requestAnimationFrame(loop);
    const dt = Math.min(48, now - last); last = now;
    t += dt;
    draw(dt);
  }
  function start(){ if(raf || REDUCED) return; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

  if(REDUCED){ draw(0); return; }                            // one still frame, no loop
  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; visible ? start() : stop(); },
      { rootMargin:'10% 0px' }).observe(canvas);
  } else start();
  document.addEventListener('visibilitychange', ()=> document.hidden || !visible ? stop() : start());
})();

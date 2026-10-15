// ============================================================
//  RAYSONS — Foundry · procedural molten heat-field
//  Foundry owns no footage: every clip and still in this project belongs to the Overview
//  film or the About reel. Rather than borrow the Overview's pour — a replayed frame of a
//  film the visitor just watched — this hero is GENERATED: a furnace-mouth glow that
//  breathes, and heat plumes rising and shearing off it, drawn with additive blending.
//  Zero bytes, zero borrowed assets, and it matches the page's thesis: we don't show you a
//  picture of the fire, we make one.
//  Runs on every .fheat canvas (the hero AND the furnace beat), each idle-gated
//  (IntersectionObserver + tab visibility) and reduced-motion safe on its own.
// ============================================================
(function(){
  function initHeat(canvas){
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
    const rand = (a,b)=> a + Math.random()*(b-a);

    let W=0, H=0, dpr=1, raf=null, visible=true, t=0;

    function size(){
      // A full-screen backdrop at devicePixelRatio 2 is 5.18 megapixels on a 1440x900
      // screen, and this page composites more than one of them. Profiling put 96% of a
      // scroll in native painting with JavaScript at nothing, so the cost IS the pixel
      // count. These are soft gradient fields and a slowly-turning object, not text:
      // the resolution is not buying detail anyone can see, it is buying stutter.
      // 1 everywhere. This page draws TWO of these full-screen fields plus a WebGL
      // object, and up to three are on screen together — 5.1 megapixels a frame at
      // 1.25. They are soft plumes of colour with no edge in them anywhere, which is
      // the one kind of content a device pixel ratio does nothing for.
      dpr = Math.min(devicePixelRatio||1, 1);
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W*dpr; canvas.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    size();
    addEventListener('resize', ()=>{ size(); if(REDUCED) draw(0); });
    if('ResizeObserver' in window) new ResizeObserver(()=>{ size(); if(REDUCED) draw(0); }).observe(canvas);

    // ---- heat plumes: soft blobs born at the furnace mouth, rising, shearing, cooling ----
    // 30 plumes meant 30 full-canvas radial gradient fills per frame. Each one is a
    // large soft blob and they overlap heavily; at 20 the field is as dense to look at
    // and a third cheaper to draw.
    const N = MOBILE ? 16 : 20;
    const plumes = [];

    // PRE-RENDERED BLOBS, NOT GRADIENTS PER FRAME.
    // Each plume used to build a fresh createRadialGradient with three concatenated
    // rgba strings and fill an arc with it — 16 of those per field, two fields on this
    // page, every frame. Rasterising a gradient is far more expensive than blitting a
    // bitmap, and the blob is the SAME SHAPE every time: only its size, tint and alpha
    // change. Isolating the canvases measured 216ms a frame against 29.8ms without
    // them on a throttled phone, and this is what that cost was.
    //
    // So the blob is drawn once per tint into an offscreen canvas and stamped from
    // there. Four tints are plenty: the colour only shifts with how high the plume has
    // climbed, across a narrow amber range nobody can band at this softness.
    const TINTS = 4, SPRITE = 128;
    const sprites = [];
    function buildSprites(){
      sprites.length = 0;
      for(let i = 0; i < TINTS; i++){
        const climb = i / (TINTS - 1);
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        const g2 = c.getContext('2d');
        const r = SPRITE / 2;
        const g = g2.createRadialGradient(r, r, 0, r, r, r);
        if(LIGHT){
          g.addColorStop(0,   'rgba(' + (222 - climb*18|0) + ',' + (172 - climb*22|0) + ',' + (118 - climb*20|0) + ',1)');
          g.addColorStop(0.5, 'rgba(198,140,86,0.478)');
          g.addColorStop(1,   'rgba(214,178,132,0)');
        } else {
          g.addColorStop(0,   'rgba(255,' + (120 + climb*70|0) + ',' + (40 + climb*30|0) + ',1)');
          g.addColorStop(0.5, 'rgba(196,74,18,0.391)');
          g.addColorStop(1,   'rgba(90,24,4,0)');
        }
        g2.fillStyle = g;
        g2.beginPath(); g2.arc(r, r, r, 0, 6.2832); g2.fill();
        sprites.push(c);
      }
    }
    // NOT CALLED HERE. `LIGHT` is declared with let further down, so calling this at
    // definition time threw "Cannot access 'LIGHT' before initialization" and took the
    // whole of initHeat with it — the heat fields had stopped running entirely, which
    // is also why removing them appeared to cost nothing in the measurements. Built
    // lazily on the first draw instead, by which time the theme is known.
    let spritesReady = false;
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

    // THEME. The field is drawn ADDITIVELY ('lighter'), which is how fire works: it only
    // exists as light ADDED to darkness. On a bone page that same maths drives every pixel
    // to white and the furnace disappears into the paper. So light mode inverts the model —
    // 'multiply' with warm ochre, which SUBTRACTS toward amber instead of adding toward
    // white. Same plumes, same motion, same furnace mouth; it reads as heat haze and hot
    // sand over bone rather than flame in a dark room.
    const themeNow = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    let LIGHT = themeNow() === 'light';
    new MutationObserver(() => { LIGHT = themeNow() === 'light'; spritesReady = false; if (REDUCED) draw(0); })
      .observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });

    function draw(dt){
      if(!spritesReady){ buildSprites(); spritesReady = true; }
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation = LIGHT ? 'multiply' : 'lighter';

      // furnace mouth — a molten glow low in the frame that breathes
      const pulse = REDUCED ? 0.5 : 0.5 + Math.sin(t*0.0011)*0.5;
      const gy = H*0.94, gr = Math.max(W,H) * (0.42 + pulse*0.05);
      const mouth = ctx.createRadialGradient(W*0.5, gy, 0, W*0.5, gy, gr);
      if(LIGHT){
        // multiply: these SUBTRACT toward amber, so they must be warm mid-tones, not fire
        mouth.addColorStop(0,   'rgba(226,176,116,' + (0.40 + pulse*0.10).toFixed(3) + ')');
        mouth.addColorStop(0.32,'rgba(198,132,72,'  + (0.26 + pulse*0.06).toFixed(3) + ')');
        mouth.addColorStop(1,   'rgba(214,178,132,0)');
      } else {
        mouth.addColorStop(0,   'rgba(255,150,60,'  + (0.48 + pulse*0.12).toFixed(3) + ')');
        mouth.addColorStop(0.32,'rgba(214,84,20,'   + (0.24 + pulse*0.06).toFixed(3) + ')');
        mouth.addColorStop(1,   'rgba(120,30,6,0)');
      }
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
        // alpha carries what the gradient's per-stop opacity used to; the 1.15 the
        // light path applied at the core is folded in here.
        const spr = sprites[Math.min(TINTS - 1, (climb * TINTS) | 0)];
        ctx.globalAlpha = Math.min(1, LIGHT ? a * 1.15 : a);
        ctx.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    let last = performance.now();
    // 20fps, AND NOT WHILE THE PAGE IS MOVING.
    // Each draw clears a full-screen canvas, fills it with a radial gradient under a
    // 'lighter' or 'multiply' composite, then stamps the plumes under the same — and
    // this page carries TWO of these fields. A non-default composite operation makes
    // the compositor re-blend the whole surface, so the cost is per-draw and almost
    // independent of what is in it: removing the canvases took a throttled phone from
    // 216ms a frame to 29.8ms, while cutting the pixel ratio, thinning the plumes and
    // pre-rendering them as sprites each moved it barely at all.
    //
    // The content is drifting heat — plumes that take seconds to cross the frame. At
    // 20fps that reads identically and costs a third as much, and while the visitor is
    // actually scrolling it does not need to advance at all: nobody is watching the
    // plumes during a flick, and the scroll is what must stay smooth.
    const FRAME_MS = 1000 / 20;
    let acc = 0, scrolling = false, scrollIdle = null;
    addEventListener('scroll', ()=>{
      scrolling = true;
      clearTimeout(scrollIdle);
      scrollIdle = setTimeout(()=>{ scrolling = false; }, 180);
    }, { passive:true });

    function loop(now){
      raf = requestAnimationFrame(loop);
      const dt = Math.min(48, now - last); last = now;
      if(scrolling) return;                    // the scroll owns the frame
      acc += dt;
      if(acc < FRAME_MS) return;               // still inside this 20fps slot
      t += acc;
      draw(acc);
      acc = 0;
    }
    function start(){ if(raf || REDUCED) return; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

    if(REDUCED){ draw(0); return; }                            // one still frame, no loop
    if('IntersectionObserver' in window){
      // HIDE IT, DO NOT MERELY STOP IT.
      // Stopping the rAF stops the drawing; it does not take the canvas out of the
      // compositor, which keeps blending the layer on every frame whether or not
      // anything changed in it. This page has two of these plus a WebGL canvas, and
      // with all three present a throttled phone sat at 170ms a frame even with the
      // heat loops paused outright — the layers were the cost, not the painting.
      // visibility:hidden drops it from compositing and costs nothing to undo.
      new IntersectionObserver((es)=>{
          visible = es[0].isIntersecting;
          canvas.style.visibility = visible ? '' : 'hidden';
          visible ? start() : stop();
        },
        { rootMargin:'10% 0px' }).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', ()=> document.hidden || !visible ? stop() : start());
  }

  document.querySelectorAll('.fheat').forEach(initHeat);
})();

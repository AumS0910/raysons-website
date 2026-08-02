// ============================================================
//  RAYSONS — Products · "The Catalogue"
//  23 real castings on a pinned rig: they travel up through a molten pool of light,
//  one lit at a time, neighbours receding above and below in depth. Native scroll +
//  a single lerp (no scroll-jack, no Lenis) so it reads as a slow dolly down a rack
//  rather than a slideshow — the same feel as the Overview's film.
//  Idle-gated: once the lerp settles it stops touching the DOM entirely.
//  Degrades: no-JS → the noscript block stacks the parts in flow (see products.html).
// ============================================================
(function(){
  const N = 23;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v,a,b)=> v<a?a : v>b?b : v;

  const rig   = document.getElementById('rig');
  const line  = document.getElementById('line');
  const hud   = document.getElementById('phud');
  const hudN  = document.getElementById('phudN');
  const rail  = document.getElementById('prail');
  const fill  = document.getElementById('prailFill');
  // THE PROCESSION IS GONE (the pinned 23-part rig was removed from products.html), but
  // this file also owns the catalogue's staggered grid reveal, the .rv reveals and the
  // data-psec grade. Those used to sit AFTER an `if(!rig || !line) return;` early exit —
  // so removing the rig would have returned before them and left every product card at
  // opacity:0 on a page whose whole job is showing products. The procession is now scoped
  // to its own guard instead, and everything else runs regardless.
  const HAS_RIG = !!(rig && line);

  const src = (i)=> 'products/part-' + String(i+1).padStart(2,'0') + '.webp';

  // ---- build the rig (only if the procession is present) ----
  const parts = [];
  if(HAS_RIG){
    for(let i=0;i<N;i++){
      const d = document.createElement('div');
      d.className = 'ppart';
      const im = document.createElement('img');
      im.src = src(i);
      im.alt = 'Raysons Shell Cast iron casting, part ' + String(i+1).padStart(2,'0') + ' of ' + N;
      im.decoding = 'async';
      if(i > 1) im.loading = 'lazy';              // the first two carry the entry; rest stream in
      d.appendChild(im); rig.appendChild(d); parts.push(d);
    }
  }

  // ---- sectored product grids: staggered reveal ----
  // The grids are in the HTML (Automobile / Hydraulic / Oil & Gas).
  // Each .pgrid__item starts opacity:0 translateY(30px) and gets .in when visible.
  const gridItems = document.querySelectorAll('.pgrid__item');
  if('IntersectionObserver' in window && gridItems.length){
    const gio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){
          // stagger: delay based on data-i within each grid
          const idx = parseInt(e.target.getAttribute('data-i') || '0', 10);
          e.target.style.transitionDelay = (idx * 0.08) + 's';
          e.target.classList.add('in');
          gio.unobserve(e.target);
        }
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.1 });
    gridItems.forEach(function(el){ gio.observe(el); });
  } else {
    // no IO → show all immediately
    gridItems.forEach(function(el){ el.classList.add('in'); });
  }

  // ---- rv reveals (section headers, etc.) ----
  const rvs = document.querySelectorAll('.rv');
  if('IntersectionObserver' in window && rvs.length){
    const rio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); rio.unobserve(e.target); }
      });
    }, { rootMargin:'0px 0px -12% 0px', threshold:0.05 });
    rvs.forEach(function(el){ rio.observe(el); });
  } else {
    rvs.forEach(function(el){ el.classList.add('in'); });
  }

  // ---- the rig: place each part relative to the lit position ----
  //  d = i - f  → 0 is dead centre in the light; ±1 is one step away, receding.
  if(HAS_RIG){
  function place(f){
    for(let i=0;i<N;i++){
      const p = parts[i], d = i - f, ad = Math.abs(d);
      if(ad > 2.2){ if(p.style.visibility !== 'hidden') p.style.visibility = 'hidden'; continue; }
      if(p.style.visibility !== 'visible') p.style.visibility = 'visible';
      const y  = d * 62;                                  // % of viewport travel per step
      const s  = clamp(1 - ad*0.20, 0.42, 1);             // recede with distance
      const o  = clamp(1 - ad*0.46, 0, 1);
      const b  = clamp(1 - ad*0.34, 0.2, 1);              // only the lit one is full brightness
      p.style.transform = 'translate(-50%,-50%) translate3d(0,' + y.toFixed(2) + 'vh,0) scale(' + s.toFixed(3) + ')';
      p.style.opacity = o.toFixed(3);
      p.style.filter = 'brightness(' + b.toFixed(3) + ')';
      p.style.zIndex = String(20 - Math.round(ad*10));
    }
  }

  // ---- scroll → lerped progress ----
  let sy = scrollY, target = scrollY, raf = null, visible = true, settled = 0, lastN = -1;

  function progress(){
    const max = line.offsetHeight - innerHeight;
    if(max <= 0) return 0;
    const top = line.getBoundingClientRect().top + scrollY;
    return clamp((sy - top) / max, 0, 1);
  }
  function frame(){
    raf = null;
    sy += (target - sy) * (REDUCED ? 1 : 0.10);
    const moving = Math.abs(target - sy) > 0.4;
    if(!moving){ if(settled > 4) return; settled++; } else settled = 0;

    const p = progress();
    const f = p * (N - 1);
    place(f);

    const cur = clamp(Math.round(f), 0, N-1) + 1;
    if(cur !== lastN){ if(hudN) hudN.textContent = String(cur).padStart(2,'0'); lastN = cur; }
    if(fill) fill.style.height = (p*100).toFixed(2) + '%';

    if(visible && moving) kick();
  }
  function kick(){ if(!raf && visible) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', ()=>{ target = scrollY; settled = 0; kick(); }, { passive:true });
  addEventListener('resize', ()=>{ settled = 0; kick(); });

  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; if(visible){ settled=0; kick(); } },
      { rootMargin:'20% 0px' }).observe(line);
  }
  place(0); kick();

  // ---- chrome: show the instruments only while the rack owns the frame ----
  function chrome(on){
    if(hud)  hud.classList.toggle('on', on);
    if(rail) rail.classList.toggle('on', on);
  }
  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=> chrome(es[0].isIntersecting), { rootMargin:'-10% 0px -10% 0px' }).observe(line);
  } else chrome(true);
  }   // ── end HAS_RIG ──────────────────────────────────────────────────────────

  // ---- the environmental grade: which section owns the frame ----
  // Deliberately OUTSIDE the rig guard. It was nested inside the procession's observer
  // block, so with the rack gone the page would have lost its lighting entirely.
  if('IntersectionObserver' in window){
    const secs = Array.from(document.querySelectorAll('[data-psec]'));
    const io = new IntersectionObserver((es)=>{
      es.forEach((e)=>{ if(e.isIntersecting){
        const k = e.target.getAttribute('data-psec');
        if(document.body.dataset.psec !== k) document.body.dataset.psec = k;
      }});
    }, { rootMargin:'-45% 0px -45% 0px' });
    secs.forEach((s)=> io.observe(s));
  }

  // ---- mobile nav burger (same behaviour as the other pages) ----
  const burger = document.getElementById('navBurger');
  const links  = document.querySelector('.nav-links');
  if(burger && links){
    burger.addEventListener('click', ()=>{ const o = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    links.querySelectorAll('a').forEach((a)=> a.addEventListener('click', ()=>{
      document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded','false'); }));
  }

  // reveal the CTA dock once you're past the hero; retire the scroll cue on first move
  // (cinema.js does this on the Overview — this page has no cinema.js)
  const dock = document.getElementById('ccta');
  const cue  = document.querySelector('.ccue');
  addEventListener('scroll', ()=>{
    if(dock) dock.classList.toggle('on', scrollY > innerHeight*0.6);
    if(cue)  cue.classList.toggle('hide', scrollY > 40);
  }, { passive:true });
})();

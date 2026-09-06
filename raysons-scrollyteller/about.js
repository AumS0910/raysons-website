// ============================================================
//  RAYSONS — About Us · "Forged over forty years"
//  GSAP ScrollTrigger + Lenis. Building plates parallax with
//  scroll; copy + sections reveal. Degrades gracefully if the
//  CDN libs fail or reduced-motion is on.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  // ---- loader: light page, reveal fast ----
  const loader = document.getElementById('cloader');
  const lbar = document.querySelector('#cloader .cbar i');
  const lpct = document.querySelector('#cloader .cpct');
  let pct = 0;
  const tick = setInterval(()=>{ pct = Math.min(100, pct + 9); if(lbar) lbar.style.width = pct+'%'; if(lpct) lpct.textContent = String(pct).padStart(3,'0'); if(pct>=100) clearInterval(tick); }, 80);
  function reveal(){ if(lbar) lbar.style.width='100%'; if(lpct) lpct.textContent='100'; clearInterval(tick); if(loader) loader.classList.add('done'); document.body.classList.add('entered'); }
  // Arriving from the index product-lift? The part is already on screen — skip the
  // loader entirely so the handoff reads as one continuous shot (no loading curtain).
  const FROM_LIFT = /[?&]from=lift\b/.test(location.search);
  // Re-entry within the session (html.reentry): the loader is already hidden by CSS — reveal
  // the chrome now so the page arrives hot, no progress ritual. One opening title per session.
  const REENTRY = document.documentElement.classList.contains('reentry');
  if(FROM_LIFT){ if(loader){ loader.classList.add('done'); loader.style.display='none'; } document.body.classList.add('entered'); }
  else if(REENTRY){ reveal(); }
  else { addEventListener('load', ()=> setTimeout(reveal, 350)); setTimeout(reveal, 1800); }

  // ---- drifting embers ----
  if(!REDUCED){
    const box = document.getElementById('embers');
    if(box){ for(let i=0;i<22;i++){ const e=document.createElement('span'); e.className='ember';
      e.style.left=(Math.random()*100)+'%'; e.style.setProperty('--dx',((Math.random()*60-30))+'px');
      e.style.animationDuration=(7+Math.random()*9)+'s'; e.style.animationDelay=(-Math.random()*12)+'s';
      e.style.opacity=(0.2+Math.random()*0.6); box.appendChild(e); } }
  }

  // ---- persistent CTA + scroll cue ----
  const ctaDock = document.getElementById('ccta');
  const cue = document.querySelector('.ccue');
  addEventListener('scroll', ()=>{ const y=scrollY,h=innerHeight;
    if(ctaDock) ctaDock.classList.toggle('on', y>h*0.5);
    if(cue) cue.classList.toggle('hide', y>h*0.25);
  }, {passive:true});

  // ---- mobile nav ----
  const burger = document.getElementById('navBurger');
  const links = document.querySelector('.nav-links');
  if(burger && links){
    burger.addEventListener('click', ()=>{ const o=document.body.classList.toggle('nav-open'); burger.setAttribute('aria-expanded', o?'true':'false'); });
    links.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=>{ document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded','false'); }));
  }

  // ---- reveals fallback (no GSAP or reduced motion) ----
  function revealAllNow(){ document.querySelectorAll('.rv').forEach(el=>el.classList.add('in')); }

  if(REDUCED || !hasGSAP){
    document.body.classList.add(REDUCED?'reduced':'no-gsap');
    // still reveal on scroll with IntersectionObserver so it's not all-at-once
    if('IntersectionObserver' in window && !REDUCED){
      const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{rootMargin:'0px 0px -10% 0px',threshold:.15});
      document.querySelectorAll('.rv').forEach(el=>io.observe(el));
    } else { revealAllNow(); }
    return;
  }

  // ============================================================
  //  GSAP + Lenis
  // ============================================================
  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger);

  // NO Lenis on About. The film engine (about-film.js) and the monument timeline already
  // lerp scroll→scrub; stacking Lenis's smoothing on top double-filtered every input and
  // WAS the "lag" the user felt. Native scroll + the single per-engine lerp matches
  // index.html's tight feel. ScrollTrigger runs fine on native scroll.

  // staggered reveals
  ScrollTrigger.batch('.rv', {
    start: 'top 86%',
    onEnter: (els)=> gsap.to(els, { opacity:1, y:0, duration:1, ease:'power3.out', stagger:0.08, overwrite:true }),
  });
  gsap.set('.rv', { opacity:0, y:38 });

  // (Removed dead [data-chapter] / [data-num] parallax triggers — those belonged to the
  // retired building-chapters + .era timeline layout and no longer exist in the DOM. They
  // measured nothing yet still recalculated on every ScrollTrigger.refresh.)

  ScrollTrigger.refresh();
  // refresh after the hero image + fonts settle
  addEventListener('load', ()=> ScrollTrigger.refresh());
})();

/* ============================================================
   PURPOSE — the pinned horizontal run (Mission / Vision / Values)

   The section is tall; a sticky stage holds it on screen; the page's own vertical scroll
   position drives the track sideways. When the third statement lands, the pin releases and
   the page carries on down. Nothing is intercepted — no wheel or touch handler, no
   preventDefault — so momentum, the scrollbar, Find-in-page, deep links and the keyboard
   all keep working, and there is no way for the page to get stuck if this script throws.

   Off on phones and under reduced-motion: a horizontal jack on a 390px screen turns three
   readable statements into a trap. The CSS static stack is the truth; .hpin-live is a
   layer on top of it, so everything here can fail and the words are still there.
   ============================================================ */
(function(){
  // The SPA re-runs every body script on each entry (spa.js rebuilds them so they
  // execute), and this file is one. Without this, hopping Overview -> About -> Overview
  // -> About leaves the earlier instances alive, still listening on window and still
  // holding a detached #purposePin. They agree with the live instance about whether the
  // pin should run, but not about who owns the class: on the next resize a stale
  // sync() -> disable() strips .hpin-live off the body and the real pin dies flat.
  if(window.__purposeTeardown) window.__purposeTeardown();

  var pin = document.getElementById('purposePin');
  if(!pin) return;
  var stage  = pin.querySelector('.purpose__stage');
  var track  = pin.querySelector('.purpose__track');
  var fill   = pin.querySelector('.purpose__rail-fill');
  var panels = Array.prototype.slice.call(pin.querySelectorAll('.ppanel'));
  if(!stage || !track || panels.length < 2) return;

  // the scroll budget is written from the panel count, so a fourth statement
  // lengthens the run without anyone remembering to retune a magic number
  pin.style.setProperty('--pan', panels.length);

  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqNarrow = matchMedia('(max-width: 900px)');

  var live = false, cur = 0, target = 0, raf = null, onScreen = true, travel = 0;
  var last = performance.now();

  // Frame-rate independent damping. A fixed per-frame fraction silently assumes 60fps;
  // Safari runs these pages far slower and the track crawled behind the scroll on iPhone.
  // k is chosen so the feel at 60fps is exactly what it was.
  function damp(k, dt){ return 1 - Math.exp(-k * dt); }

  function measureTravel(){ travel = Math.max(0, track.scrollWidth - stage.clientWidth); }

  // A short hold at each end. Without it the track is already moving the instant the pin
  // catches and still moving when it lets go, which reads as a slip rather than a stop.
  var LEAD = 0.07, TAIL = 0.07;
  function progress(){
    var max = pin.offsetHeight - innerHeight;
    if(max <= 0) return 0;
    var raw = -pin.getBoundingClientRect().top / max;
    var p = (raw - LEAD) / (1 - LEAD - TAIL);
    return p < 0 ? 0 : p > 1 ? 1 : dwell(p);
  }

  // DWELL. A linear scrub means the track is always moving, so stopping anywhere leaves
  // two half-statements side by side and nothing to read. This holds each panel still for
  // the first and last 22% of its segment and eases across the middle, so the run reads as
  // three deliberate statements rather than one long strip — and wherever you stop, you
  // have almost certainly stopped on one of them.
  var HOLD = 0.22;
  function dwell(p){
    var seg = panels.length - 1;
    var f = p * seg, i = Math.floor(f);
    if(i >= seg) return 1;                       // the last panel, already landed
    var t = (f - i - HOLD) / (1 - 2 * HOLD);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return (i + t * t * (3 - 2 * t)) / seg;      // smoothstep
  }

  function apply(p){
    track.style.transform = 'translate3d(' + (-p * travel).toFixed(2) + 'px,0,0)';
    if(fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    // the statement being read is the lit one; the others recede rather than disappear,
    // so the run still reads as one continuous strip and not as three slides
    var f = p * (panels.length - 1);
    for(var i = 0; i < panels.length; i++){
      var d = Math.abs(i - f); if(d > 1) d = 1;
      panels[i].style.opacity = (1 - d * 0.7).toFixed(3);
    }
  }

  function kick(){ if(!raf && live && onScreen) raf = requestAnimationFrame(loop); }
  function loop(){
    raf = null;
    target = progress();
    var now = performance.now();
    var dt = Math.min(0.1, (now - last) / 1000) || 0.016; last = now;
    cur += (target - cur) * damp(11.9, dt);
    // LAND EXACTLY. The lerp only approaches its target, and the loop gives up at a
    // threshold — which across 2535px of travel left the first panel resting 1-2px
    // off the stage edge, enough to show a sliver of the next one. Snap the last step.
    if(Math.abs(target - cur) <= 0.0006) cur = target;
    apply(cur);
    if(live && onScreen && cur !== target) kick();
  }

  function enable(){
    if(live) return;
    live = true;
    document.body.classList.add('hpin-live');
    // the class changes the layout, so travel can only be read after it has applied
    requestAnimationFrame(function(){ measureTravel(); cur = target = progress(); apply(cur); kick(); });
  }
  function disable(){
    if(!live) return;
    live = false;
    document.body.classList.remove('hpin-live');
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    track.style.transform = '';
    if(fill) fill.style.transform = '';
    for(var i = 0; i < panels.length; i++) panels[i].style.opacity = '';
  }
  function sync(){ (mqReduce.matches || mqNarrow.matches) ? disable() : enable(); }

  var dead = false, io = null, off = [];
  function on(t, ev, fn, opt){ t.addEventListener(ev, fn, opt); off.push(function(){ t.removeEventListener(ev, fn, opt); }); }

  function onScroll(){ if(!dead) kick(); }
  function onResize(){ if(dead) return; sync(); if(live){ measureTravel(); kick(); } }
  function onLoad(){ if(!dead && live){ measureTravel(); kick(); } }
  function onMQ(){ if(!dead) sync(); }

  on(window, 'scroll', onScroll, { passive:true });
  on(window, 'resize', onResize, { passive:true });
  // a lazily-decoded portrait changes the track's height, not its width, but the pin's own
  // height is viewport-based — re-measure anyway, it is one read and it costs nothing
  on(window, 'load', onLoad);
  if(mqReduce.addEventListener){ on(mqReduce, 'change', onMQ); on(mqNarrow, 'change', onMQ); }
  else { mqReduce.addListener(onMQ); mqNarrow.addListener(onMQ); }   // Safari < 14

  // stop the rAF entirely when the section is nowhere near the viewport
  if('IntersectionObserver' in window){
    io = new IntersectionObserver(function(es){
      if(dead) return;
      onScreen = es[0].isIntersecting; if(onScreen) kick();
    }, { rootMargin:'20% 0px' });
    io.observe(pin);
  }

  // Hand the next instance a way to silence this one. It deliberately does NOT touch
  // body.hpin-live: the incoming instance owns that class and sets it a moment later,
  // and clearing it here would flash the static stack through the view transition.
  var self = function(){
    dead = true;
    for(var i = 0; i < off.length; i++) off[i]();
    off.length = 0;
    if(io) io.disconnect();
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    // drop the global's hold on this closure, or navigating away from About and staying
    // away leaves a whole detached section (three portraits included) reachable forever
    if(window.__purposeTeardown === self) window.__purposeTeardown = null;
  };
  window.__purposeTeardown = self;

  sync();
})();

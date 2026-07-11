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
  if(FROM_LIFT){ if(loader){ loader.classList.add('done'); loader.style.display='none'; } document.body.classList.add('entered'); }
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

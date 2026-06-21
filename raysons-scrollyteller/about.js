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
  addEventListener('load', ()=> setTimeout(reveal, 350));
  setTimeout(reveal, 1800);

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

  // Lenis smooth scroll, wired to ScrollTrigger
  let lenis = null;
  if(window.Lenis){
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t)=> lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;   // test/debug hook
  }

  // staggered reveals
  ScrollTrigger.batch('.rv', {
    start: 'top 86%',
    onEnter: (els)=> gsap.to(els, { opacity:1, y:0, duration:1, ease:'power3.out', stagger:0.08, overwrite:true }),
  });
  gsap.set('.rv', { opacity:0, y:38 });

  // building plates — parallax the image inside the framed plate + a soft scale-in
  document.querySelectorAll('[data-chapter]').forEach((ch)=>{
    const img = ch.querySelector('.chapter__plate img');
    const plate = ch.querySelector('.chapter__plate');
    if(img){
      gsap.fromTo(img, { yPercent:-8 }, { yPercent:8, ease:'none',
        scrollTrigger:{ trigger:ch, start:'top bottom', end:'bottom top', scrub:true } });
    }
    if(plate){
      gsap.fromTo(plate, { scale:0.92, opacity:0.4 }, { scale:1, opacity:1, ease:'power2.out',
        scrollTrigger:{ trigger:ch, start:'top 80%', end:'top 40%', scrub:true } });
    }
  });

  // timeline year numerals — gentle parallax drift while sticky
  document.querySelectorAll('[data-num]').forEach((num)=>{
    gsap.fromTo(num, { yPercent:6 }, { yPercent:-6, ease:'none',
      scrollTrigger:{ trigger:num.closest('.era'), start:'top bottom', end:'bottom top', scrub:true } });
  });

  ScrollTrigger.refresh();
  // refresh after the hero image + fonts settle
  addEventListener('load', ()=> ScrollTrigger.refresh());
})();

// ============================================================
//  RAYSONS — Foundry page engine
//  Lenis smooth scroll + GSAP ScrollTrigger reveals +
//  interactive process image crossfade.
//  ZERO video scrub, ZERO canvas — lag-free by design.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  // ---- loader ----
  const loader = document.getElementById('cloader');
  const lbar = document.querySelector('#cloader .cbar i');
  const lpct = document.querySelector('#cloader .cpct');
  let pct = 0;
  const tick = setInterval(()=>{
    pct = Math.min(100, pct + 12);
    if(lbar) lbar.style.width = pct+'%';
    if(lpct) lpct.textContent = String(pct).padStart(3,'0');
    if(pct >= 100) clearInterval(tick);
  }, 60);
  function reveal(){
    if(lbar) lbar.style.width='100%';
    if(lpct) lpct.textContent='100';
    clearInterval(tick);
    if(loader) loader.classList.add('done');
    document.body.classList.add('entered');
  }
  addEventListener('load', ()=> setTimeout(reveal, 300));
  setTimeout(reveal, 1600);   // ceiling: never trap user

  // ---- drifting embers ----
  if(!REDUCED){
    const box = document.getElementById('embers');
    if(box){
      for(let i = 0; i < 18; i++){
        const e = document.createElement('span');
        e.className = 'ember';
        e.style.left = (Math.random()*100)+'%';
        e.style.setProperty('--dx', ((Math.random()*60-30))+'px');
        e.style.animationDuration = (7+Math.random()*9)+'s';
        e.style.animationDelay = (-Math.random()*12)+'s';
        e.style.opacity = (0.2+Math.random()*0.6);
        box.appendChild(e);
      }
    }
  }

  // ---- persistent CTA + scroll cue ----
  const ctaDock = document.getElementById('ccta');
  const cue = document.querySelector('.ccue');
  addEventListener('scroll', ()=>{
    const y = scrollY, h = innerHeight;
    if(ctaDock) ctaDock.classList.toggle('on', y > h*0.5);
    if(cue) cue.classList.toggle('hide', y > h*0.25);
  }, {passive:true});

  // ---- mobile nav ----
  const burger = document.getElementById('navBurger');
  const links = document.querySelector('.nav-links');
  if(burger && links){
    burger.addEventListener('click', ()=>{
      const o = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', ()=>{
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded','false');
      })
    );
  }

  // ---- reveals fallback (no GSAP or reduced motion) ----
  function revealAllNow(){ document.querySelectorAll('.rv').forEach(el => el.classList.add('in')); }

  if(REDUCED || !hasGSAP){
    document.body.classList.add(REDUCED ? 'reduced' : 'no-gsap');
    if('IntersectionObserver' in window && !REDUCED){
      const io = new IntersectionObserver((es)=>{
        es.forEach(e =>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }});
      }, {rootMargin:'0px 0px -10% 0px', threshold:.15});
      document.querySelectorAll('.rv').forEach(el => io.observe(el));
    } else {
      revealAllNow();
    }
    // process steps still need click interactivity even without GSAP
    initProcessSteps();
    return;
  }

  // ============================================================
  //  GSAP + Lenis
  // ============================================================
  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll
  let lenis = null;
  if(window.Lenis){
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // staggered reveals
  ScrollTrigger.batch('.rv', {
    start: 'top 86%',
    onEnter: (els) => gsap.to(els, { opacity:1, y:0, duration:1, ease:'power3.out', stagger:0.08, overwrite:true }),
  });
  gsap.set('.rv', { opacity:0, y:38 });

  // pillar image parallax
  document.querySelectorAll('.pillar__visual img').forEach(img => {
    gsap.fromTo(img, { yPercent:-6 }, { yPercent:6, ease:'none',
      scrollTrigger:{ trigger:img.closest('.pillar'), start:'top bottom', end:'bottom top', scrub:true }
    });
  });

  // pillar visual scale-in
  document.querySelectorAll('.pillar__visual').forEach(plate => {
    gsap.fromTo(plate, { scale:0.92, opacity:0.4 }, { scale:1, opacity:1, ease:'power2.out',
      scrollTrigger:{ trigger:plate.closest('.pillar'), start:'top 80%', end:'top 40%', scrub:true }
    });
  });

  // spec cards stagger
  const specCards = document.querySelectorAll('.specs-sec__card');
  if(specCards.length){
    gsap.fromTo(specCards, { y:30, opacity:0 }, {
      y:0, opacity:1, duration:0.7, ease:'power3.out', stagger:0.08,
      scrollTrigger:{ trigger:'.specs-sec__grid', start:'top 82%' }
    });
  }

  // capabilities columns stagger
  const capsCols = document.querySelectorAll('.caps-sec__col');
  if(capsCols.length){
    gsap.fromTo(capsCols, { y:30, opacity:0 }, {
      y:0, opacity:1, duration:0.7, ease:'power3.out', stagger:0.1,
      scrollTrigger:{ trigger:'.caps-sec__grid', start:'top 82%' }
    });
  }

  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());

  // ============================================================
  //  PROCESS — interactive timeline with image crossfade
  //  Steps highlight on scroll (GSAP ScrollTrigger) AND on click.
  //  The sticky image panel crossfades between 6 foundry photos.
  // ============================================================
  initProcessSteps();

  function initProcessSteps(){
    const steps = document.querySelectorAll('.process-sec__step');
    const images = document.querySelectorAll('.process-sec__img');
    if(!steps.length) return;

    function activate(idx){
      steps.forEach((s, i) => s.classList.toggle('active', i === idx));
      images.forEach((img, i) => img.classList.toggle('active', i === idx));
    }

    // click-to-jump
    steps.forEach((step, i) => {
      step.addEventListener('click', () => activate(i));
    });

    // scroll-driven activation (GSAP)
    if(hasGSAP && !REDUCED){
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: () => activate(i),
          onEnterBack: () => activate(i),
        });
      });
    } else {
      // fallback: IntersectionObserver
      if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if(e.isIntersecting){
              const idx = parseInt(e.target.dataset.step);
              if(!isNaN(idx)) activate(idx);
            }
          });
        }, { rootMargin:'-30% 0px -30% 0px' });
        steps.forEach(s => io.observe(s));
      }
    }

    // initialise first step
    activate(0);
  }
})();

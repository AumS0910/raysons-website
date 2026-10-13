// ============================================================
//  RAYSONS — Foundry page engine
//  Native scroll + GSAP ScrollTrigger reveals + drifting embers.
//  No Lenis (it double-smoothed the chapters' own lerp), no video scrub — lag-free by design.
//  The hero's molten heat-field lives in foundry-heat.js; the pinned chapters in
//  foundry-chapters.js.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  // Re-entry within the session (html.reentry): the loader is already hidden by CSS — reveal
  // the chrome now so the page arrives hot, no progress ritual. One opening title per session.
  if(document.documentElement.classList.contains('reentry')){ reveal(); }
  else { addEventListener('load', ()=> setTimeout(reveal, 300)); setTimeout(reveal, 1600); }   // ceiling: never trap user

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
  // Reduced motion gets everything at once. Everything else goes through initReveals()
  // below — there is no GSAP branch to choose any more, because the reveals never
  // needed a library and the one they had broke them on Safari.
  if(REDUCED){
    document.body.classList.add('reduced');
    document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
    initProcessSteps();
    return;
  }
  // ============================================================
  //  REVEALS AND PILLAR EFFECTS — IntersectionObserver, not ScrollTrigger
  //
  //  ScrollTrigger.batch SILENTLY FAILED ON SAFARI here. Measured on WebKit at iPhone
  //  size: 14 of this page's 33 .rv elements never got their reveal and stayed at
  //  opacity 0 for the entire visit — the pillar rows, pills and plates among them.
  //  Chrome revealed all 33. So nearly half of Foundry was INVISIBLE to every iPhone
  //  visitor, and because the canvases and the GLB model kept working it read as
  //  "the page is fine, the scroll animations are broken" rather than as missing content.
  //
  //  The scrub effects are deleted, not ported, because they animated NOTHING: the
  //  parallax targeted .pillar__visual, the staggers targeted .specs-sec__card and
  //  .caps-sec__col, and none of those three selectors matches a single element in this
  //  page any more. They were dead triggers that still made ScrollTrigger.refresh()
  //  measure them on every resize and load.
  // ============================================================
  function initReveals(){
    var rvs = Array.prototype.slice.call(document.querySelectorAll('.rv'));
    if(!rvs.length) return;
    function show(el, i){
      if(el.classList.contains('in')) return;
      el.style.transitionDelay = ((i % 6) * 0.07) + 's';
      el.classList.add('in');
    }
    if(!('IntersectionObserver' in window)){ rvs.forEach(function(el){ show(el,0); }); return; }
    // threshold 0: a lazily-decoded image reflows the row mid-scroll, the crossing is
    // missed, and an element unobserved on the only path that reveals it is gone for good.
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e,i){ if(e.isIntersecting){ show(e.target,i); io.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0 });
    rvs.forEach(function(el){ io.observe(el); });

    function sweep(){
      for(var i=0;i<rvs.length;i++){
        var el=rvs[i];
        if(el.classList.contains('in')) continue;
        if(el.getBoundingClientRect().top < innerHeight*0.98){ io.unobserve(el); show(el,i); }
      }
    }
    addEventListener('scroll', sweep, { passive:true });
    addEventListener('resize', sweep, { passive:true });
    sweep();
    // Last line of defence. A bug in the reveal logic may cost the animation; it must
    // never cost the words. Anything still hidden after 8s is shown unconditionally.
    setTimeout(function(){ rvs.forEach(function(el,i){ show(el,i); }); }, 8000);
  }
  initReveals();


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

    // scroll-driven activation. This was a ScrollTrigger per step with an
    // IntersectionObserver fallback behind it; the fallback is now the only path, since
    // it is the one that works on Safari and needs no library.
    if(!REDUCED && 'IntersectionObserver' in window){
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

    // initialise first step
    activate(0);
  }
})();

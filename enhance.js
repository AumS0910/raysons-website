/**
 * enhance.js — landonorris-style interactivity layered onto V1.
 * Purely additive: hover-reveal images, magnetic buttons, image clip-reveals,
 * subtle parallax. Does not touch V1's existing main.js or content.
 */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches;
const lerp=(a,b,t)=>a+(b-a)*t;

/* ── 1 · Industries: text-only hover interaction ──
   (Removed the floating photo-reveal — those were foundry PROCESS images,
   not industry images. The spotlight-dim + ember-dot hover lives in
   enhance.css and stays. Real industry images can be wired in later.) */

/* ── 2 · Magnetic buttons ── */
(function magnetic(){
  if(TOUCH||REDUCED) return;
  const sel='.float-cta__link,.nav-cta,.cta__btn,.btn-cta,.hero__cta,.enquire__submit,[data-rx-magnetic]';
  document.querySelectorAll(sel).forEach(btn=>{
    btn.setAttribute('data-rx-magnetic','');
    btn.addEventListener('mousemove',e=>{
      const r=btn.getBoundingClientRect();
      const mx=e.clientX-r.left-r.width/2, my=e.clientY-r.top-r.height/2;
      btn.style.transform=`translate(${mx*0.22}px, ${my*0.34}px)`;
    });
    btn.addEventListener('mouseleave',()=>{ btn.style.transform=''; });
  });
})();

/* ── 3 · Editorial image treatment (landonorris-style) — BULLETPROOF ──
   Clip-wipe reveal on scroll + parallax-within-frame + hover brighten.
   The clip is added by JS, so without JS (or if anything fails) the image
   is ALWAYS visible — never hidden. Targets static content photos only,
   NOT the Foundry's interactive process viewer (process__img). */
(function imageReveals(){
  const imgs=[...document.querySelectorAll('[data-rx-img]')];   // about cards handled by fan gallery below
  if(!imgs.length) return;
  const frames=[];
  imgs.forEach(im=>{
    const w=im.closest('.rx-img') || im.parentElement;
    if(w){ w.classList.add('rx-img'); frames.push({w,im}); }
  });
  if(REDUCED) return;

  const reveal=(f)=>f.w.classList.add('rx-in');
  frames.forEach(f=>f.w.classList.add('rx-cliphide'));          // JS-added clip (no-JS = visible)
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ const f=frames.find(x=>x.w===e.target); if(f)reveal(f); io.unobserve(e.target); } }),
    {threshold:0.12, rootMargin:'0px 0px -6% 0px'});
  frames.forEach(f=>{ const r=f.w.getBoundingClientRect();
    if(r.top<innerHeight*0.98 && r.bottom>0) reveal(f);        // already on screen → reveal now
    else io.observe(f.w); });
  setTimeout(()=>frames.forEach(reveal), 2600);                 // SAFETY: nothing stays hidden, ever

  if(TOUCH) return;
  (function parallaxFrames(){ requestAnimationFrame(parallaxFrames);
    const vh=innerHeight;
    frames.forEach(f=>{ const r=f.w.getBoundingClientRect();
      if(r.bottom<-40||r.top>vh+40) return;
      const off=((r.top+r.height/2)-vh/2)/vh;                   // -0.5..0.5
      f.im.style.transform=`scale(1.16) translateY(${(off*6).toFixed(2)}%)`;
    });
  })();
})();

/* ── 3b · About fanned photo gallery (landonorris "pop-up & slide") ──
   The facility photos start as a rotated, overlapping stack pulled toward
   centre, then slide/spread/upright into their grid as you scroll in.
   Uses layout offsets (offsetLeft/Top — transform-independent) so there's
   no feedback loop. Bulletproof: no JS / reduced-motion → normal grid. */
(function aboutFanGallery(){
  const grid=document.querySelector('.about-us__photo-grid');
  if(!grid) return;
  const cards=[...grid.querySelectorAll('.about-us__photo-card')];
  if(!cards.length) return;
  grid.style.position=grid.style.position||'relative';
  cards.forEach(c=>{ c.classList.add('rx-fan'); c.style.willChange='transform,opacity'; });
  if(REDUCED){ return; }                      // leave as normal visible grid
  const angles=[-9, 6, -7, 9, -5, 7];          // stacked rotations per card
  function update(){
    requestAnimationFrame(update);
    const r=grid.getBoundingClientRect(), vh=innerHeight;
    if(r.bottom<-120||r.top>vh+120) return;
    let p=(vh*0.9 - r.top)/(vh*0.60); p=Math.max(0,Math.min(1,p));
    const e=1-Math.pow(1-p,3);                  // easeOutCubic
    const gcx=grid.offsetWidth/2, gcy=grid.offsetHeight/2;
    cards.forEach((c,i)=>{
      const ccx=c.offsetLeft+c.offsetWidth/2, ccy=c.offsetTop+c.offsetHeight/2;
      const dx=(gcx-ccx)*(1-e), dy=(gcy-ccy)*(1-e);
      const rot=(angles[i%angles.length])*(1-e);
      const sc=0.82+0.18*e;
      c.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      c.style.opacity=(0.35+0.65*e).toFixed(3);
      c.style.zIndex=String(20-i);
    });
  }
  requestAnimationFrame(update);
})();

/* ── 3c · Client-logo marquee (21st.dev "Clients" pattern, vanilla) ──
   Converts the static customer-logo grid into a seamless infinite marquee
   with edge-fade + pause-on-hover. Content (the logos) is unchanged. */
(function logoMarquee(){
  const grid=document.querySelector('.about-us__logo-grid');
  if(!grid || grid.dataset.rxMarq) return;
  const items=[...grid.children];
  if(items.length<4) return;
  grid.dataset.rxMarq='1';
  const track=document.createElement('div'); track.className='rx-marq-track';
  items.forEach(it=>track.appendChild(it));
  items.forEach(it=>track.appendChild(it.cloneNode(true)));   // duplicate → seamless loop
  grid.appendChild(track);
  grid.classList.add('rx-marquee');
})();

/* ── 3z · INNER-PAGE molten atmosphere (matches overview's world) ──
   Inner pages were flat dark; the overview breathes with heat-glow + drifting
   embers. We add a decorative, pointer-events-none layer behind the content so
   About/Foundry/Enquire feel like the same molten universe as the overview. */
(function innerAtmosphere(){
  if(document.body.classList.contains('page--home')) return;
  if(REDUCED) return;
  const atmo=document.createElement('div');
  atmo.className='rx-atmo'; atmo.setAttribute('aria-hidden','true');
  const glow=document.createElement('div'); glow.className='rx-atmo__glow'; atmo.appendChild(glow);
  for(let i=0;i<16;i++){
    const d=document.createElement('i'); d.className='rx-ember-dot';
    d.style.left=(Math.random()*100).toFixed(1)+'%';
    d.style.setProperty('--d',(7+Math.random()*9).toFixed(1)+'s');
    d.style.setProperty('--delay',(-Math.random()*14).toFixed(1)+'s');
    d.style.setProperty('--x',(Math.random()*70-35).toFixed(0)+'px');
    d.style.setProperty('--o',(0.22+Math.random()*0.4).toFixed(2));
    d.style.setProperty('--sc',(0.7+Math.random()*1.1).toFixed(2));
    atmo.appendChild(d);
  }
  document.body.prepend(atmo);
})();

/* ── 3d · INNER-PAGE dramatic scroll reveals ──
   V1 disables its own reveals on inner pages (.about-us .film-reveal{opacity:1}),
   which is why About/Foundry/Enquire feel static. We add our own — headings
   mask-wipe, content slides up, staggered — scoped to NON-home pages only so
   the overview stays exactly as-is. Bulletproof: reveal-on-load-if-in-view +
   IntersectionObserver + fallback timeout → content can never stay hidden. */
(function innerReveals(){
  if(document.body.classList.contains('page--home')) return;   // overview untouched
  if(REDUCED) return;
  const sel=[
    'h1','h2','h3','.beat__body','.beat__row','.beat__pill','.beat__eyebrow',
    '.about-us__body','.about-us__lead p','.about-us__points li','.about-us__eyebrow',
    '.about-us__subheadline','.mvv__card','.timeline__item','.about-us__standard',
    '.faq__item','.faq__eyebrow','.specs__card','.caps__col','.process__step',
    '.cta__body','.cta__buttons','.cta__contact-block'
  ].join(',');
  const skip='nav,#navbar,.footer,.preloader,#custom-cursor,.about-us__photo-grid,.about-us__logo-grid,.hero,.story,.timeline,.about-us__standards,.mvv,.about-us__section-head--mvv';
  const els=[...document.querySelectorAll(sel)].filter(e=>!e.closest(skip));
  if(!els.length) return;

  els.forEach(el=>{
    const mask=/^H[123]$/.test(el.tagName);
    el.classList.add(mask?'rx-rvmask':'rx-rv');
    // light stagger among near-siblings
    const sibs=el.parentElement?[...el.parentElement.children].indexOf(el):0;
    el.style.transitionDelay=(Math.min(Math.max(sibs,0),6)*55)+'ms';
  });

  const show=el=>el.classList.add('rx-shown');
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ show(e.target); io.unobserve(e.target); } }),
    {threshold:0.12, rootMargin:'0px 0px -7% 0px'});
  els.forEach(el=>{ const r=el.getBoundingClientRect();
    if(r.top<innerHeight*0.96 && r.bottom>0) show(el);   // already visible → no flash
    else io.observe(el); });
  setTimeout(()=>els.forEach(show), 3000);                // SAFETY: never stay hidden
})();

/* ── 4 · Subtle parallax on tagged elements (gentle, doesn't fight V1) ── */
(function parallax(){
  if(REDUCED||TOUCH) return;
  const els=[...document.querySelectorAll('[data-rx-parallax]')];
  if(!els.length) return;
  function onScroll(){
    const vh=innerHeight;
    els.forEach(el=>{
      const r=el.getBoundingClientRect();
      const center=r.top+r.height/2;
      const off=(center-vh/2)/vh;              // -0.5..0.5
      const amt=parseFloat(el.dataset.rxParallax)||30;
      el.style.transform=`translate3d(0,${(-off*amt).toFixed(1)}px,0)`;
    });
    requestAnimationFrame(onScroll);
  }
  requestAnimationFrame(onScroll);
})();

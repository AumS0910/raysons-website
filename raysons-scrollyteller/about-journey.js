// ============================================================
//  RAYSONS — About · "Our Journey" pinned corridor
//  Scroll travels 1987 → 2027. A single buttery LERPED scroll value drives a
//  ticking year counter, cross-fades the era panels one at a time, and drifts a
//  giant outlined year watermark behind each — the "travel the corridor" feel of
//  the reference About film. Native scroll + a sticky pin (no scroll-jacking);
//  idle-gated so it costs nothing at rest. Degrades to a stacked list under
//  reduced-motion / no-JS (CSS handles that).
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sec = document.getElementById('tl');
  if(!sec || !sec.classList.contains('journey')) return;
  const eras  = Array.from(sec.querySelectorAll('.journey__era'));
  const marks = Array.from(sec.querySelectorAll('.journey__mark'));
  const yearEl = document.getElementById('jYear');
  const fill   = document.getElementById('jFill');
  const knob   = document.getElementById('jKnob');
  const N = eras.length;
  if(!N) return;
  const YEARS = marks.map(m => parseInt(m.textContent, 10) || 1987);   // [1987,2005,2021,2027]

  if(REDUCED){ sec.classList.add('journey--static'); return; }   // CSS shows all eras stacked
  sec.classList.add('journey--live');

  const clamp = (v,a,b)=> Math.min(Math.max(v,a), b);
  let sy = scrollY, target = scrollY, lastA = -1, raf = null, visible = true;

  function kick(){ if(!raf && visible) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', ()=>{ target = scrollY; kick(); }, { passive:true });
  addEventListener('resize', kick);

  function frame(){
    raf = null;
    sy += (target - sy) * 0.11;                          // buttery damp — the whole feel
    const total  = sec.offsetHeight - innerHeight;
    const docTop = sec.getBoundingClientRect().top + scrollY;
    const p = total > 0 ? clamp(sy - docTop, 0, total) / total : 0;
    window.__journeyP = p;                               // hand the WebGL corridor our scroll position
    const f = p * (N - 1);                               // camera position 0..N-1
    const active = clamp(Math.round(f), 0, N - 1);
    const local  = f - active;

    // year counter interpolates between the era anchor years
    const i0 = clamp(Math.floor(f), 0, N - 1), i1 = clamp(i0 + 1, 0, N - 1);
    if(yearEl) yearEl.textContent = Math.round(YEARS[i0] + (YEARS[i1] - YEARS[i0]) * (f - i0));
    if(fill)   fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if(knob)   knob.style.left = (p * 100).toFixed(2) + '%';

    if(active !== lastA){
      eras.forEach((e,i)=> e.classList.toggle('on', i === active));
      marks.forEach((m,i)=> m.classList.toggle('on', i === active));
      // ENVIRONMENTAL GRADE: the light tells the forty-year story — warm sand (1987) →
      // bronze (2005) → MOLTEN as the foundry is lit (2021) → cool steel (2027). CSS crossfades it.
      document.body.dataset.era = String(active);
      lastA = active;
    }
    // drift the active watermark as you move through its era (parallax life)
    const m = marks[active];
    if(m) m.style.setProperty('--mx', (local * -10).toFixed(2) + 'vw');

    if(visible && Math.abs(target - sy) > 0.4) kick();  // keep going while the lerp catches up
  }

  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; if(visible) kick(); },
      { rootMargin:'12% 0px' }).observe(sec);
  }

  // ── GRABBABLE TIMELINE ──────────────────────────────────────────────────────
  // The rail isn't just a readout — grab it and scrub the forty years by hand. A drag maps
  // pointer-x to the section's scroll position, so the year counter, eras and watermark all
  // update through the same frame() (one source of truth). Keyboard steps era to era.
  const rail = sec.querySelector('.journey__rail');
  if(rail){
    const hit = document.createElement('div');           // a taller transparent grab strip over the 1px line
    hit.className = 'journey__scrub';
    hit.setAttribute('role','slider');
    hit.setAttribute('tabindex','0');
    hit.setAttribute('aria-label','Timeline — drag to travel 1987 to ' + YEARS[YEARS.length-1]);
    hit.setAttribute('aria-valuemin', String(YEARS[0]));
    hit.setAttribute('aria-valuemax', String(YEARS[YEARS.length-1]));
    hit.setAttribute('data-cursor','Scrub');            // contextual cursor label (premium.js)
    rail.appendChild(hit);
    rail.removeAttribute('aria-hidden');

    let scrubbing = false;
    function railP(clientX){ const r = rail.getBoundingClientRect(); return clamp((clientX - r.left) / Math.max(1, r.width), 0, 1); }
    function goTo(p){
      const total = sec.offsetHeight - innerHeight;
      const docTop = sec.getBoundingClientRect().top + scrollY;
      const y = docTop + p * total;
      sy = y; target = y; window.scrollTo(0, y);          // drive scroll; frame() renders exactly at p
      hit.setAttribute('aria-valuenow', String(Math.round(YEARS[0] + (YEARS[YEARS.length-1]-YEARS[0]) * p)));
      kick();
    }
    hit.addEventListener('pointerdown', (e)=>{ scrubbing = true; hit.classList.add('grabbing');
      try{ hit.setPointerCapture(e.pointerId); }catch(_){}; goTo(railP(e.clientX)); e.preventDefault(); }, { passive:false });
    hit.addEventListener('pointermove', (e)=>{ if(scrubbing){ goTo(railP(e.clientX)); e.preventDefault(); } }, { passive:false });
    const end = ()=>{ scrubbing = false; hit.classList.remove('grabbing'); };
    hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
    hit.addEventListener('keydown', (e)=>{
      const step = (e.key==='ArrowRight'||e.key==='ArrowDown') ? 1 : (e.key==='ArrowLeft'||e.key==='ArrowUp') ? -1 : 0;
      if(!step) return; e.preventDefault();
      const total = sec.offsetHeight - innerHeight, docTop = sec.getBoundingClientRect().top + scrollY;
      const curP = total > 0 ? clamp((sy - docTop) / total, 0, 1) : 0;
      goTo(clamp((Math.round(curP*(N-1)) + step) / (N-1), 0, 1));
    });
  }

  kick();
})();

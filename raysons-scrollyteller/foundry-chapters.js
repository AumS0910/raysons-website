// ============================================================
//  RAYSONS — Foundry film chapters (Phase 1)
//  Converts the static back-half (The Program / Stations / Production Scope) into
//  pinned scroll-scrubbed chapters. Native scroll + a sticky pin (no scroll-jacking);
//  a single lerped progress drives the reveals. Degrades to the static, fully-visible
//  layout under reduced-motion / no-JS (CSS: the pin + hides only apply under body.fchap-live).
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chaps = Array.from(document.querySelectorAll('.fchap'));
  if(!chaps.length || REDUCED) return;                 // static fallback — no .fchap-live class
  document.body.classList.add('fchap-live');

  chaps.forEach(function(sec){
    const type   = sec.dataset.chap;                   // program | station | scope
    const items  = Array.from(sec.querySelectorAll('[data-i]'));
    const N      = items.length || 1;
    const countEl= sec.querySelector('[data-count]');
    const hudK   = sec.querySelector('.fchap__hud-k[data-hud]');
    const fill   = sec.querySelector('.fchap__rail-fill');
    let cur = 0, target = 0, raf = null, visible = true, lastA = -1;

    function measure(){
      const max = sec.offsetHeight - innerHeight;
      if(max <= 0) return 0;
      return Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / max));
    }
    function kick(){ if(!raf && visible) raf = requestAnimationFrame(loop); }
    // Frame-rate independent damping. A fixed per-frame fraction silently assumes
    // 60fps; Safari runs these pages far slower, so the motion crawled behind the
    // scroll on iPhone. k is chosen so the feel at 60fps is exactly what it was.
    const damp = (k, dt) => 1 - Math.exp(-k * dt);
    let _last = performance.now();
    function loop(){
      raf = null; target = measure();
      const _n = performance.now();
      const _dt = Math.min(0.1, (_n - _last) / 1000) || 0.016; _last = _n;
      cur += (target - cur) * damp(11.9, _dt); apply(cur);
      if(visible && Math.abs(target - cur) > 0.0006) kick();
    }

    function apply(p){
      if(fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      const f = p * N;
      if(type === 'station'){
        // one station full-bleed at a time (crossfade); HUD reads the active station
        const a = Math.min(N-1, Math.floor(f));
        if(a !== lastA){
          items.forEach((it,i)=> it.classList.toggle('on', i === a));
          if(hudK) hudK.textContent = items[a].getAttribute('data-hud') || '';
          if(countEl) countEl.textContent = String(a+1).padStart(2,'0') + ' / ' + String(N).padStart(2,'0');
          lastA = a;
        }
      } else {
        // progressive assemble: row/col i lands once the scrub passes it
        let shown = 1;
        items.forEach((it,i)=>{ const on = f > i + 0.30; it.classList.toggle('in', on); if(on) shown = i+1; });
        if(countEl) countEl.textContent = String(shown).padStart(2,'0') + ' / ' + String(N).padStart(2,'0');
      }
    }

    addEventListener('scroll', kick, { passive:true });
    addEventListener('resize', kick);
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ visible = es[0].isIntersecting; if(visible) kick(); }, { rootMargin:'12% 0px' }).observe(sec);
    }
    kick();
  });
})();

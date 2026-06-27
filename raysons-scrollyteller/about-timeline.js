// ============================================================
//  RAYSONS — About · cinematic year-counter timeline
//  Pins a corridor stage; scroll travels 1987 -> 2027. A giant
//  year ticks up, the active era cross-fades, milestones rise.
//  Vanilla + rAF (no GSAP dep). Degrades to a stacked list.
// ============================================================
(function(){
  const sec = document.getElementById('tl');
  if(!sec){ return; }
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = document.getElementById('tlYear');
  const eras   = Array.from(sec.querySelectorAll('.tl__era'));
  const rail   = Array.from(sec.querySelectorAll('.tl__rail li'));
  const vid    = document.getElementById('tlvid');
  const N      = eras.length;
  const Y0 = 1987, Y1 = 2027;

  // No eras or reduced-motion -> stacked fallback, nothing to drive.
  if(!N || REDUCED){ document.documentElement.classList.add('reduced'); return; }

  // ambient backdrop: lazy — only fetch + play the loop when the timeline nears the
  // viewport (it's preload:none), and pause it when far so it never costs on first load
  if(vid && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){ try{ vid.preload='auto'; vid.play().catch(function(){}); }catch(_){ } }
        else { try{ vid.pause(); }catch(_){ } }
      });
    }, { rootMargin: '40% 0px' }).observe(sec);
  }

  let cur = 0, target = 0, raf = null, lastActive = -1;

  function onScroll(){
    const max = sec.offsetHeight - innerHeight;
    if(max <= 0){ return; }
    target = Math.max(0, Math.min(1, -sec.getBoundingClientRect().top / max));
    if(!raf) raf = requestAnimationFrame(loop);
  }

  function loop(){
    cur += (target - cur) * 0.12;
    if(Math.abs(target - cur) < 0.0004){ cur = target; raf = null; }
    else { raf = requestAnimationFrame(loop); }

    // giant year ticks 1987 -> 2027 across the whole corridor
    yearEl.textContent = Math.round(Y0 + (Y1 - Y0) * cur);

    // active era = which quarter we're in (tiny lead so it flips mid-gap, not at the edge)
    const f = cur * N;
    const active = Math.max(0, Math.min(N - 1, Math.floor(f + 0.001)));
    if(active !== lastActive){
      eras.forEach((e,i)=> e.classList.toggle('on', i === active));
      rail.forEach((e,i)=>{ e.classList.toggle('on', i <= active); e.classList.toggle('cur', i === active); });
      lastActive = active;
    }
  }

  addEventListener('scroll', onScroll, { passive:true });
  addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) onScroll(); });
  // first paint + after fonts/layout settle
  onScroll();
  addEventListener('load', onScroll);
  setTimeout(onScroll, 400);
})();

// ============================================================
//  RAYSONS — About · cinematic year-pillar timeline
//  Pins a corridor; scroll travels 1987 -> 2027. Each era's
//  MONUMENT clip (its year carved in stone) is SCROLL-SCRUBBED —
//  the camera push-in is driven by how far you've scrolled through
//  that era — cross-fading as you pass from one pillar to the next.
//  Vanilla + rAF. Degrades to a stacked list (reduced/no-JS).
// ============================================================
(function(){
  const sec = document.getElementById('tl');
  if(!sec){ return; }
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = document.getElementById('tlYear');     // optional
  const eras   = Array.from(sec.querySelectorAll('.tl__era'));
  const rail   = Array.from(sec.querySelectorAll('.tl__rail li'));
  const N       = eras.length;
  const Y0 = 1987, Y1 = 2027;

  if(!N || REDUCED){ document.documentElement.classList.add('reduced'); return; }

  // MOBILE / iOS can't seek live <video> on scroll → don't scrub; the monument's POSTER
  // still (its carved year) shows, cross-fading per era. The mp4 never loads on mobile.
  const MOBILE = matchMedia('(hover:none) and (pointer:coarse)').matches || innerWidth <= 820;
  // SCRUB disabled on EVERY device now: seeking the 4 monument clips was decoder-bound jank
  // + ~30 MB of downloads that clashed with index's molten world. Cross-fade the carved-year
  // POSTER stills instead (verified crisp). Flip to `!MOBILE` to bring the video push-in back.
  const SCRUB = false;

  // per-era monument clips with their own scrub state (same seek-pump as the index lift)
  const mons = Array.from(sec.querySelectorAll('.tl__mon')).map(function(v){
    const m = { el:v, dur:0, targetCT:0, seeking:false, seekT:0, primed:false };
    v.addEventListener('loadedmetadata', function(){ m.dur = v.duration || 0; });
    v.addEventListener('seeked', function(){ m.seeking = false; });
    return m;
  });
  function prime(m){
    if(!m || m.primed) return; m.primed = true;     // a never-played clip stalls on first seek
    try{ m.el.muted = true; m.el.preload = 'auto'; const pr = m.el.play();
      if(pr && pr.then) pr.then(function(){ m.el.pause(); try{ m.el.currentTime = 0; }catch(_){} }).catch(function(){}); }catch(_){}
  }
  function scrub(m, frac){
    if(!m || !m.dur) return;
    m.targetCT = Math.max(0, Math.min(m.dur-0.05, frac*m.dur));
    if(m.seeking && performance.now()-m.seekT < 200) return;     // in-flight seek (watchdog)
    if(Math.abs(m.targetCT-(m.el.currentTime||0)) < 0.03){ m.seeking=false; return; }
    m.seeking = true; m.seekT = performance.now();
    try{ m.el.currentTime = m.targetCT; }catch(_){ m.seeking = false; }
  }

  // lazy gate: only load/scrub the monuments when the section is near the viewport
  let near = false;
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      near = es[0].isIntersecting;
      if(near && SCRUB){ const a = lastActive >= 0 ? lastActive : 0; prime(mons[a]); prime(mons[a+1]); }
      else if(!near) mons.forEach(function(m){ try{ m.el.pause(); }catch(_){ } });
    }, { rootMargin: '35% 0px' }).observe(sec);
  } else { near = true; }

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

    if(yearEl) yearEl.textContent = Math.round(Y0 + (Y1 - Y0) * cur);

    const f = cur * N;
    const active = Math.max(0, Math.min(N - 1, Math.floor(f + 0.001)));
    const local  = Math.max(0, Math.min(1, f - active));   // progress within the active era

    if(active !== lastActive){
      eras.forEach((e,i)=> e.classList.toggle('on', i === active));
      rail.forEach((e,i)=>{ e.classList.toggle('on', i <= active); e.classList.toggle('cur', i === active); });
      mons.forEach(function(m,i){
        if(i === active){ m.el.classList.add('on'); if(near && SCRUB){ prime(m); } }
        else m.el.classList.remove('on');
      });
      if(near && SCRUB){ prime(mons[active+1]); }   // desktop: ready the next pillar
      lastActive = active;
    }

    // desktop: scroll drives the carved-year monument's slow push-in. mobile: poster still.
    if(near && SCRUB) scrub(mons[active], local);
  }

  addEventListener('scroll', onScroll, { passive:true });
  addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) onScroll(); });
  onScroll();
  addEventListener('load', onScroll);
  setTimeout(onScroll, 400);
})();

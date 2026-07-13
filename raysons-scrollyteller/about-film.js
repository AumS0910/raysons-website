// ============================================================
//  RAYSONS — About film engine (single-clip cinema)
//  ONE looping casting clip plays behind the group story — molten
//  iron → the finished part — matching index's molten-valve world.
//  The clip PLAYS (never scrubs), so it stays light and smooth; the
//  editorial beats cross-fade over it on scroll. Idle-gated + it
//  pauses the clip when the film is off-screen. Degrades to the
//  poster still under reduced-motion.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // phones don't get the 8.5MB clip — the poster still carries the section (index's rule:
  // heavy media never ships to mobile). Desktop plays the film.
  const MOBILE  = matchMedia('(hover:none) and (pointer:coarse)').matches || innerWidth <= 820;
  const film = document.querySelector('.film');
  if(!film) return;
  const facts = Array.from(document.querySelectorAll('.fact'));
  const vid = document.getElementById('filmvid');
  const countEl = document.querySelector('.film__count b');
  const N = facts.length || 1;
  // index→About handoff: the valve match-cut is held on arrival and dissolves on SCROLL
  // (not on a timer), so the two pages read as one continuous shot.
  const matchcut = document.querySelector('.film__matchcut');
  const FROM_LIFT = /[?&]from=lift\b/.test(location.search);
  if(matchcut && !FROM_LIFT) matchcut.style.opacity = '0';   // direct visit: no valve

  // autoplay the casting clip (muted, looping, inline). Playing a clip is cheap and smooth —
  // the old build SCRUBBED heavy clips frame-by-frame, which was the lag. This just plays.
  function play(){ if(!vid || REDUCED || MOBILE) return; try{ vid.muted = true; const p = vid.play(); if(p && p.catch) p.catch(()=>{}); }catch(_){ } }
  if(vid && !REDUCED && !MOBILE){
    vid.preload = 'auto'; try{ vid.load(); }catch(_){}          // desktop: fetch + play
    if(vid.readyState >= 2) play(); else vid.addEventListener('canplay', play, { once:true });
  }

  let lastSeg = -1;
  function render(p){
    const t = p * N;
    const seg = Math.min(N-1, Math.floor(t));
    const local = t - seg;

    if(seg !== lastSeg){
      facts.forEach((f,i)=> f.classList.toggle('on', i===seg));
      if(countEl) countEl.textContent = String(seg+1).padStart(2,'0');
      lastSeg = seg;
    }
    // hold the valve on arrival, dissolve it over the first ~12% of the film scroll
    if(matchcut && FROM_LIFT && !REDUCED){
      matchcut.style.opacity = Math.max(0, 1 - p/0.12).toFixed(3);
    }
    // the active beat drifts up + fades at its edges (first beat holds in, last holds out)
    if(!REDUCED){
      const f = facts[seg];
      if(f){
        f.style.transform = 'translate3d(0,'+(local*-72).toFixed(1)+'px,0)';
        // the entry title fades out over the first ~30% of scroll, then the brand film plays clean
        const op = seg===0 ? Math.max(0, 1 - local/0.30)
                           : Math.max(0, Math.min(1, local<0.16 ? local/0.16 : local>0.84 ? (1-local)/0.16 : 1));
        f.style.opacity = op.toFixed(3);
      }
    }
  }

  // IDLE-GATED scroll loop — native scroll (no Lenis on About). Spins only while the beat
  // position is still settling and parks when the film is off-screen (also pauses the clip).
  let cur = 0, target = 0, raf = null, visible = true;
  function measure(){ const max = Math.max(1, film.offsetHeight - innerHeight);
    return Math.max(0, Math.min(1, -film.getBoundingClientRect().top / max)); }
  function kick(){ if(!raf && visible) raf = requestAnimationFrame(loop); }
  function loop(){
    raf = null;
    target = measure();
    cur += (target - cur) * (REDUCED ? 1 : 0.12);
    render(cur);
    if(visible && Math.abs(target - cur) > 0.0005) kick();
  }
  addEventListener('scroll', kick, { passive:true });
  addEventListener('resize', kick);
  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=>{
      visible = es[0].isIntersecting;
      if(vid){ if(visible) play(); else { try{ vid.pause(); }catch(_){ } } }   // save decode when off-screen
      if(visible) kick();
    }, { rootMargin: '15% 0px' }).observe(film);
  }
  kick();
})();

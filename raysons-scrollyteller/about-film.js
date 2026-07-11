// ============================================================
//  RAYSONS — About film engine (sticky-canvas scrollyteller)
//  Hero = the valve still the index lift ends on (drawn to the
//  canvas). The four group verticals are LIVE clips, SCROLL-
//  SCRUBBED like the index lift — shown as real <video> layers
//  (not canvas-drawn, so paused/seeked frames decode reliably),
//  cross-fading with ken-burns + a noir grade. Fact copy floats
//  over each beat.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('stage');
  const film = document.querySelector('.film');
  if(!canvas || !film) return;
  const ctx = canvas.getContext('2d');
  const facts = Array.from(document.querySelectorAll('.fact'));

  // hero (image, on canvas) + four building clips (video layers, scrubbed)
  const heroImg = new Image(); heroImg.src = 'valve/lift-poster.jpg';
  // heavy clips are served from jsDelivr's CDN (off the Vercel deploy) — range-request
  // support keeps the scrub working; pinned to the media-v1 tag for stable caching
  const CDN = 'https://cdn.jsdelivr.net/gh/AumS0910/raysons-website@media-v1/raysons-scrollyteller/';
  const CLIPS = [CDN+'images/sandchem.mp4', CDN+'images/industries.mp4', CDN+'images/regenta.mp4', CDN+'images/shellcast.mp4'];
  const POSTERS = ['images/sandchem-poster.jpg','images/industries-poster.jpg','images/regenta-poster.jpg','images/shellcast-poster.jpg'];
  // MOBILE / iOS can't reliably seek live <video> on scroll (frames never decode → black),
  // so on touch/small screens we DON'T scrub — we show each clip's poster still (cross-fading).
  // Bonus: the heavy mp4 never downloads on mobile, only the ~100KB poster.
  const MOBILE = matchMedia('(hover:none) and (pointer:coarse)').matches || innerWidth <= 820;
  const SCRUB  = !MOBILE && !REDUCED;
  const N = CLIPS.length + 1;   // hero + 4
  const GRADE = REDUCED ? 'none' : 'brightness(.8) contrast(1.06) saturate(1.05)';

  // build the building layers — <video> (scrubbed) on desktop, poster-still on mobile
  const holder = film.querySelector('.film__pin') || film;
  const builds = CLIPS.map((src, idx) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'none';
    v.poster = POSTERS[idx];                 // the still shown until/unless we scrub the clip
    if(SCRUB) v.src = src;                    // only load the heavy clip where we can actually scrub
    v.setAttribute('aria-hidden','true');
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'
      + 'opacity:0;z-index:0;pointer-events:none;transform-origin:50% 50%;'
      + 'filter:'+GRADE+';will-change:opacity,transform';
    holder.appendChild(v);
    const m = { el:v, dur:0, targetCT:0, seeking:false, seekT:0, primed:false };
    v.addEventListener('loadedmetadata', ()=>{ m.dur = v.duration || 0; });
    v.addEventListener('seeked', ()=>{ m.seeking = false; });
    return m;
  });

  function size(){ const dpr = Math.min(devicePixelRatio||1, 2); canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr; }
  size(); addEventListener('resize', size);

  // hero is an image drawn to the canvas (covers, ungraded → match-cuts the index lift)
  function drawHero(scale){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#050302'; ctx.fillRect(0,0,canvas.width,canvas.height);
    if(!heroImg.complete || !heroImg.naturalWidth) return;
    const cw=canvas.width, ch=canvas.height, iw=heroImg.naturalWidth, ih=heroImg.naturalHeight;
    const s = Math.max(cw/iw, ch/ih) * scale, w=iw*s, h=ih*s;
    ctx.drawImage(heroImg, (cw-w)/2, (ch-h)/2, w, h);
  }

  // SCROLL-SCRUB (same pattern as the index lift): prime the decoder once (a never-played
  // clip stalls on its first seek), then chase a target time one seek at a time (200ms watchdog)
  function prime(m){
    if(!m || m.primed || REDUCED) return; m.primed = true;
    try{ m.el.muted = true; const pr = m.el.play();
         if(pr && pr.then) pr.then(()=>{ m.el.pause(); try{ m.el.currentTime = 0; }catch(_){} }).catch(()=>{}); }catch(_){}
  }
  function scrub(m, frac){
    if(!m || !m.dur || REDUCED) return;
    m.targetCT = Math.max(0, Math.min(m.dur-0.05, frac*m.dur));
    if(m.seeking && performance.now()-m.seekT < 200) return;        // in-flight seek
    if(Math.abs(m.targetCT-(m.el.currentTime||0)) < 0.03){ m.seeking=false; return; }
    m.seeking = true; m.seekT = performance.now();
    try{ m.el.currentTime = m.targetCT; }catch(_){ m.seeking = false; }
  }

  const countEl = document.querySelector('.film__count b');
  let lastSeg = -1;
  function render(p){
    const t = p * N;
    const seg = Math.min(N-1, Math.floor(t));
    const local = t - seg;

    // hero layer on the canvas (only really seen at seg 0; covered by a building otherwise)
    drawHero(seg===0 ? (1.02 + local*0.08) : 1.0);

    // building video layers: only the active beat (and the outgoing one mid-dissolve) are lit
    builds.forEach((m, idx) => {
      const s = idx + 1;                       // this clip owns segment s
      let op = 0, frac = 0;
      if(s === seg){ op = local < 0.20 ? local/0.20 : 1; frac = local; }     // active: scrub start->end
      else if(s === seg-1){ op = local < 0.20 ? 1-local/0.20 : 0; frac = 1; } // outgoing: hold last frame, fade out
      m.el.style.opacity = op.toFixed(3);
      if(op > 0.001 && SCRUB){
        m.el.style.transform = 'scale('+(1.02 + frac*0.08).toFixed(3)+')';
        scrub(m, frac);
      }
    });

    if(seg !== lastSeg){
      facts.forEach((f,i)=> f.classList.toggle('on', i===seg));
      if(countEl) countEl.textContent = String(seg+1).padStart(2,'0');
      if(SCRUB){ prime(builds[seg-1]); prime(builds[seg]); }   // desktop: ready clips for scrub
      lastSeg = seg;
    }
    if(!REDUCED){
      const f = facts[seg];
      if(f){
        f.style.transform = 'translate3d(0,'+(local*-64).toFixed(1)+'px,0)';
        const op = seg===0 ? (local<0.82 ? 1 : Math.max(0,(1-local)/0.18))
                           : (local<0.16 ? local/0.16 : local>0.84 ? (1-local)/0.16 : 1);
        f.style.opacity = Math.max(0, Math.min(1, op)).toFixed(3);
      }
    }
  }

  // IDLE-GATED LOOP — the old version ran render() every frame forever (repainting the
  // hero canvas + 4 video layers at 60fps even at the footer). Now the loop only spins
  // while the scrub is still settling, a seek is in flight, or a clip is priming — and it
  // parks entirely when the film is off-screen. This is what made About feel laggy.
  let cur = 0, target = 0, raf = null, visible = true;
  function measure(){
    const max = Math.max(1, film.offsetHeight - innerHeight);
    return Math.max(0, Math.min(1, -film.getBoundingClientRect().top / max));
  }
  function kick(){ if(!raf && visible) raf = requestAnimationFrame(loop); }
  function loop(){
    raf = null;
    target = measure();
    cur += (target - cur) * (REDUCED ? 1 : 0.1);
    render(cur);
    // keep spinning only if there's still work: settling, an active seek, or an unprimed clip
    const settling = Math.abs(target - cur) > 0.0004;
    const busy = SCRUB && builds.some(m => m.seeking || (!m.primed && m.el.style.opacity > 0.001));
    if(visible && (settling || busy)) kick();
  }
  // native scroll now drives it (Lenis removed from About — see about.js); each scroll
  // event re-arms the loop, which self-parks once settled
  addEventListener('scroll', kick, { passive:true });
  addEventListener('resize', ()=>{ size(); kick(); });
  // park the whole engine when the film scrolls out of view, wake it just before it returns
  if('IntersectionObserver' in window){
    new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; if(visible) kick(); },
      { rootMargin: '15% 0px' }).observe(film);
  }
  kick();
})();

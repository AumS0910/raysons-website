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
  const N = CLIPS.length + 1;   // hero + 4
  const GRADE = REDUCED ? 'none' : 'brightness(.8) contrast(1.06) saturate(1.05)';

  // build the building <video> layers — visible-capable (opacity-driven), scrubbed
  const holder = film.querySelector('.film__pin') || film;
  const builds = CLIPS.map(src => {
    const v = document.createElement('video');
    // preload:none → a clip is only fetched when its beat approaches (prime()), so the
    // page isn't dragged down by ~33MB of building footage on first load
    v.muted = true; v.playsInline = true; v.preload = 'none'; v.src = src;
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
      if(op > 0.001){
        if(!REDUCED) m.el.style.transform = 'scale('+(1.02 + frac*0.08).toFixed(3)+')';
        scrub(m, frac);
      }
    });

    if(seg !== lastSeg){
      facts.forEach((f,i)=> f.classList.toggle('on', i===seg));
      if(countEl) countEl.textContent = String(seg+1).padStart(2,'0');
      prime(builds[seg-1]); prime(builds[seg]);   // ready current + upcoming clip for instant scrub
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

  let cur = 0, target = 0;
  function loop(){
    requestAnimationFrame(loop);
    const max = Math.max(1, film.offsetHeight - innerHeight);
    target = Math.max(0, Math.min(1, -film.getBoundingClientRect().top / max));
    cur += (target - cur) * (REDUCED ? 1 : 0.1);
    render(cur);
  }
  requestAnimationFrame(loop);
})();

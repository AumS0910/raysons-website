// ============================================================
//  RAYSONS — Scroll-Cinema engine  (RIFT-style, vanilla)
//  One product (the valve), scroll-scrubbed. Each clip is played
//  ONCE, every frame captured to an in-memory WebP Image; from then
//  on scroll position -> frame index -> drawImage (decode-free 60fps).
//  Two acts are free: Reassemble = deconstruct reversed, Reveal =
//  macro reversed. Bulletproof: crossfade / reduced-motion fallbacks.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  const clamp = (v,a,b)=> v<a?a : v>b?b : v;

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const overlays = Array.from(document.querySelectorAll('.act'));
  const loader = document.getElementById('cloader');
  const lbar   = document.querySelector('#cloader .cbar i');
  const lpct   = document.querySelector('#cloader .cpct');
  const scrollSpace = document.getElementById('cscroll');
  const cue = document.querySelector('.ccue');
  const ctaDock = document.getElementById('ccta');

  // ---- the six-act segment plan (spans from the RIFT whitepaper) ----
  const CLIPS = {
    deconstruct: 'valve/deconstruct.mp4',
    orbit:       'valve/orbit.mp4',
    bridge:      'valve/bridge.mp4',
    macro:       'valve/macro.mp4',
  };
  const SEGMENTS = [
    { clip:'deconstruct', reverse:false, span:6, act:0 },  // Deconstruct
    { clip:'deconstruct', reverse:true,  span:6, act:1 },  // Reassemble (free)
    { clip:'orbit',       reverse:false, span:6, act:2 },  // Orbit
    { clip:'bridge',      reverse:false, span:5, act:3 },  // Bridge
    { clip:'macro',       reverse:false, span:6, act:4 },  // Detail
    { clip:'macro',       reverse:true,  span:6, act:5 },  // Reveal (free)
  ];
  const TOTAL = SEGMENTS.reduce((s,x)=>s+x.span,0);
  const N_ACTS = overlays.length;

  // scroll runway: ~1 viewport per span-unit-ish, capped reasonable
  const VH = MOBILE ? 16 : 20;
  scrollSpace.style.height = (TOTAL * VH + 40) + 'vh';
  addEventListener('resize', ()=>{ scrollSpace.style.height = (TOTAL*VH+40)+'vh'; sizeCanvas(); });

  // ---- DPR-aware canvas ----
  function sizeCanvas(){
    const dpr = Math.min(devicePixelRatio||1, 2);
    canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr;
  }
  sizeCanvas();

  // ---- hero still (first paint + crossfade fallback) ----
  const heroImg = new Image();  heroImg.src = 'valve/hero.jpg';
  const explImg = new Image();  explImg.src = 'valve/exploded.jpg';

  // ---- captured frame store ----
  const frames = {};          // clipKey -> Image[]
  let capturedClips = 0;
  const uniqueClips = Object.keys(CLIPS).length;

  // capture one clip: play it through once, grab every displayed frame
  function captureClip(key, src){
    return new Promise((resolve)=>{
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
      const arr = [];
      const cap = document.createElement('canvas');
      const cx  = cap.getContext('2d');
      let sized = false, done = false;
      const finish = ()=>{ if(done) return; done=true; frames[key]=arr; capturedClips++; resolve(arr); };
      function grab(){
        if(!v.videoWidth){ if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab); return; }
        if(!sized){
          const needW = Math.min(3840, Math.max(MOBILE?900:1920, innerWidth*(devicePixelRatio||1)));
          const scale = Math.min(1, needW / v.videoWidth);
          cap.width = Math.round(v.videoWidth*scale);
          cap.height = Math.round(v.videoHeight*scale);
          sized = true;
        }
        cx.drawImage(v, 0,0, cap.width, cap.height);
        const idx = arr.length; arr.push(null);             // hold order
        cap.toBlob(b=>{ if(!b) return; const im=new Image(); im.src=URL.createObjectURL(b); arr[idx]=im; }, 'image/webp', 0.9);
        updateLoader();
        if(v.ended) finish();
        else if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
      }
      v.onended = finish;
      v.onerror = ()=>{ finish(); };                         // degrade: empty -> crossfade
      v.addEventListener('canplay', ()=>{
        v.play().then(()=>{
          if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
          else { // no rVFC -> sample on a timer until ended
            const iv=setInterval(()=>{ if(done){clearInterval(iv);return;} grab(); if(v.ended){clearInterval(iv);finish();} }, 1000/24);
          }
        }).catch(finish);
      }, { once:true });
    });
  }

  // ---- loader progress (rough, weighted by clips captured) ----
  let started=false, totalFramesGuess = 0;
  function updateLoader(){
    const cap = Object.values(frames).reduce((s,a)=>s+a.length,0);
    const frac = clamp(capturedClips/uniqueClips + (cap%30)/30/uniqueClips, 0, 1);
    lbar.style.width = (frac*100).toFixed(0)+'%';
    lpct.textContent = String(Math.floor(frac*100)).padStart(3,'0');
  }

  // ============================================================
  //  RENDER
  // ============================================================
  const _grade = REDUCED ? 'none' : 'brightness(1.07) contrast(1.05) saturate(1.16)';
  let lastAct = -1, breathT = 0;
  function drawFrame(im, vel){
    if(!im || !im.complete || !im.naturalWidth){ return false; }
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    // breathing scale keeps the stage alive; velocity adds a touch of blur
    breathT += 0.016;
    const breathe = 1 + Math.sin(breathT*0.6)*0.012;
    const blur = REDUCED ? 0 : Math.min(4, vel*4);
    ctx.filter = (_grade==='none'?'':_grade) + (blur>0.2? ` blur(${blur.toFixed(1)}px)`:'');
    const s = Math.max(cw/im.naturalWidth, ch/im.naturalHeight) * breathe;
    const w = im.naturalWidth*s, h = im.naturalHeight*s;
    ctx.drawImage(im, (cw-w)/2, (ch-h)/2, w, h);
    ctx.filter = 'none';
    return true;
  }
  // crossfade fallback (no frames): hero <-> exploded by progress
  function drawCrossfade(p){
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    const a = p<0.5 ? heroImg : explImg;
    const cover=(im)=>{ if(!im.naturalWidth) return; const s=Math.max(cw/im.naturalWidth,ch/im.naturalHeight); ctx.drawImage(im,(cw-im.naturalWidth*s)/2,(ch-im.naturalHeight*s)/2,im.naturalWidth*s,im.naturalHeight*s); };
    cover(a);
  }

  function render(progress, vel){
    const t = progress * TOTAL;
    let acc=0, seg=SEGMENTS[0], local=0;
    for(let i=0;i<SEGMENTS.length;i++){
      const s=SEGMENTS[i];
      if(t <= acc+s.span || i===SEGMENTS.length-1){ seg=s; local=clamp((t-acc)/s.span,0,1); break; }
      acc+=s.span;
    }
    const arr = frames[seg.clip];
    let drew=false;
    if(arr && arr.length){
      const u = seg.reverse ? (1-local) : local;
      const fi = clamp(Math.round(u*(arr.length-1)), 0, arr.length-1);
      drew = drawFrame(arr[fi], vel);
    }
    if(!drew) drawCrossfade(progress);

    // editorial overlays — show the act riding the current segment
    if(seg.act !== lastAct){
      overlays.forEach((o,i)=> o.classList.toggle('on', i===seg.act));
      lastAct = seg.act;
    }
    if(cue) cue.classList.toggle('hide', progress>0.02);
    if(ctaDock) ctaDock.classList.toggle('on', progress>0.06);
  }

  // ============================================================
  //  SCROLL LOOP (lerped — buttery, RIFT-style)
  // ============================================================
  let sy=scrollY, target=scrollY, prevP=0;
  addEventListener('scroll', ()=>{ target=scrollY; }, {passive:true});
  function loop(){
    requestAnimationFrame(loop);
    sy += (target-sy) * (REDUCED?1:0.09);
    const max = Math.max(1, scrollSpace.offsetHeight - innerHeight);
    const p = clamp(sy/max, 0, 1);
    const vel = Math.min(1, Math.abs(p-prevP)*60); prevP=p;
    render(p, vel);
  }

  // ============================================================
  //  BOOT — capture all clips, then reveal
  // ============================================================
  function start(){
    if(started) return; started=true;
    lbar.style.width='100%'; lpct.textContent='100';
    loader.classList.add('done');
    document.body.classList.add('entered');
    lastAct=-1; overlays.forEach((o,i)=>o.classList.toggle('on', i===0));
    requestAnimationFrame(loop);
  }
  function heroReady(){ return new Promise(r=>{ if(heroImg.complete && heroImg.naturalWidth) return r(); heroImg.addEventListener('load',()=>r(),{once:true}); heroImg.addEventListener('error',()=>r(),{once:true}); }); }

  // paint hero immediately so the stage is never blank
  heroImg.onload = ()=>{ if(!started){ const cw=canvas.width,ch=canvas.height; const s=Math.max(cw/heroImg.naturalWidth,ch/heroImg.naturalHeight); ctx.drawImage(heroImg,(cw-heroImg.naturalWidth*s)/2,(ch-heroImg.naturalHeight*s)/2,heroImg.naturalWidth*s,heroImg.naturalHeight*s); } };

  if(REDUCED){
    heroReady().then(start);          // static hero, no capture, no scrub
  } else {
    // Reveal FAST — show the hero the moment its still is decoded; the clips then
    // play+capture invisibly in the background. Scrubbing falls back to a
    // hero<->exploded crossfade until each clip's frames are ready (motion still reads).
    heroReady().then(()=> setTimeout(start, 600));
    setTimeout(()=>{ if(!started) start(); }, 4000);   // ceiling
    (async ()=>{ for(const key of ['deconstruct','orbit','bridge','macro']) await captureClip(key, CLIPS[key]); })();
  }
})();

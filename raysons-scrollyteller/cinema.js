// ============================================================
//  RAYSONS — Scroll-Cinema engine  (RIFT-style, vanilla)
//  ONE bespoke film, fire to finished part: the molten pour ->
//  "fire becomes the part" morph -> the valve deconstructs, orbits,
//  pushes into macro detail, pulls back. Each clip is played ONCE,
//  every frame captured to an in-memory WebP Image; from then on
//  scroll position -> frame index -> drawImage (decode-free 60fps).
//  Reassemble = deconstruct reversed, Reveal = macro reversed (free).
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

  // ---- the clips + eight-act plan (fire -> finished part) ----
  const CLIPS = {
    pour:        'valve/pour.mp4',
    forge:       'valve/forge.mp4',
    deconstruct: 'valve/deconstruct.mp4',
    orbit:       'valve/orbit.mp4',
    bridge:      'valve/bridge.mp4',
    macro:       'valve/macro.mp4',
  };
  const SEGMENTS = [
    { clip:'pour',        reverse:false, span:7, act:0 },  // The Pour (fire / hero)
    { clip:'forge',       reverse:false, span:6, act:1 },  // Fire becomes the part
    { clip:'deconstruct', reverse:false, span:6, act:2 },  // Deconstruct
    { clip:'deconstruct', reverse:true,  span:6, act:3 },  // Reassemble (free)
    { clip:'orbit',       reverse:false, span:6, act:4 },  // Orbit — every side
    { clip:'bridge',      reverse:false, span:5, act:5 },  // Bridge
    { clip:'macro',       reverse:false, span:6, act:6 },  // Detail — the bore
    { clip:'macro',       reverse:true,  span:6, act:7 },  // Reveal (free) — finale
  ];
  const TOTAL = SEGMENTS.reduce((s,x)=>s+x.span,0);

  const VH = MOBILE ? 15 : 18;                          // scroll runway per span-unit
  scrollSpace.style.height = (TOTAL * VH + 40) + 'vh';
  addEventListener('resize', ()=>{ scrollSpace.style.height = (TOTAL*VH+40)+'vh'; sizeCanvas(); });

  function sizeCanvas(){ const dpr=Math.min(devicePixelRatio||1,2); canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr; }
  sizeCanvas();

  // poster = a pour frame, painted instantly while the clips capture in the background
  const posterImg = new Image(); posterImg.src = 'valve/pour-poster.jpg';

  // ---- captured frame store ----
  const frames = {};
  let capturedClips = 0;
  const uniqueClips = Object.keys(CLIPS).length;

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
          cap.width = Math.round(v.videoWidth*scale); cap.height = Math.round(v.videoHeight*scale); sized=true;
        }
        cx.drawImage(v, 0,0, cap.width, cap.height);
        const idx = arr.length; arr.push(null);
        cap.toBlob(b=>{ if(!b) return; const im=new Image(); im.src=URL.createObjectURL(b); arr[idx]=im; }, 'image/webp', 0.9);
        updateLoader();
        if(v.ended) finish();
        else if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
      }
      v.onended = finish;
      v.onerror = finish;
      v.addEventListener('canplay', ()=>{
        v.play().then(()=>{
          if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
          else { const iv=setInterval(()=>{ if(done){clearInterval(iv);return;} grab(); if(v.ended){clearInterval(iv);finish();} }, 1000/24); }
        }).catch(finish);
      }, { once:true });
    });
  }

  function updateLoader(){
    const cap = Object.values(frames).reduce((s,a)=>s+a.length,0);
    const frac = clamp(capturedClips/uniqueClips + (cap%30)/30/uniqueClips, 0, 1);
    lbar.style.width = (frac*100).toFixed(0)+'%';
    lpct.textContent = String(Math.floor(frac*100)).padStart(3,'0');
  }

  // ============================================================
  //  RENDER
  // ============================================================
  const _grade = REDUCED ? '' : 'brightness(1.05) contrast(1.04) saturate(1.12)';
  let lastAct = -1, breathT = 0, lastGood = null;

  function paint(im, vel){
    if(!im || !im.complete || !im.naturalWidth) return false;
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    breathT += 0.016;
    const breathe = 1 + (REDUCED?0:Math.sin(breathT*0.6)*0.012);
    const blur = REDUCED ? 0 : Math.min(4, vel*4);
    ctx.filter = _grade + (blur>0.2? ` blur(${blur.toFixed(1)}px)`:'');
    const s = Math.max(cw/im.naturalWidth, ch/im.naturalHeight) * breathe;
    const w = im.naturalWidth*s, h = im.naturalHeight*s;
    ctx.drawImage(im, (cw-w)/2, (ch-h)/2, w, h);
    ctx.filter = 'none';
    lastGood = im;
    return true;
  }
  function paintFallback(){
    const im = lastGood || (posterImg.complete && posterImg.naturalWidth ? posterImg : null);
    if(!im) return;
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    ctx.filter = _grade;
    const s=Math.max(cw/im.naturalWidth,ch/im.naturalHeight);
    ctx.drawImage(im,(cw-im.naturalWidth*s)/2,(ch-im.naturalHeight*s)/2,im.naturalWidth*s,im.naturalHeight*s);
    ctx.filter='none';
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
      drew = paint(arr[fi], vel);
    }
    if(!drew) paintFallback();

    if(seg.act !== lastAct){ overlays.forEach((o,i)=> o.classList.toggle('on', i===seg.act)); lastAct=seg.act; }
    if(cue) cue.classList.toggle('hide', progress>0.015);
    if(ctaDock) ctaDock.classList.toggle('on', progress>0.05);
  }

  // ============================================================
  //  SCROLL LOOP (lerped — buttery)
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
  //  BOOT
  // ============================================================
  let started=false;
  function start(){
    if(started) return; started=true;
    lbar.style.width='100%'; lpct.textContent='100';
    loader.classList.add('done');
    document.body.classList.add('entered');
    lastAct=-1; overlays.forEach((o,i)=>o.classList.toggle('on', i===0));
    requestAnimationFrame(loop);
  }
  function posterReady(){ return new Promise(r=>{ if(posterImg.complete && posterImg.naturalWidth) return r(); posterImg.addEventListener('load',()=>r(),{once:true}); posterImg.addEventListener('error',()=>r(),{once:true}); }); }

  // first paint the poster the moment it decodes, so the stage is never blank
  posterReady().then(()=>{ if(!started){ const cw=canvas.width,ch=canvas.height,s=Math.max(cw/posterImg.naturalWidth,ch/posterImg.naturalHeight); ctx.drawImage(posterImg,(cw-posterImg.naturalWidth*s)/2,(ch-posterImg.naturalHeight*s)/2,posterImg.naturalWidth*s,posterImg.naturalHeight*s); } });

  if(REDUCED){
    posterReady().then(start);
  } else {
    // reveal FAST behind the pour poster; capture the clips in scroll order in the
    // background. Scrubbing holds the last good frame / poster until each is ready.
    posterReady().then(()=> setTimeout(start, 600));
    setTimeout(()=>{ if(!started) start(); }, 4000);   // ceiling
    (async ()=>{ for(const key of ['pour','forge','deconstruct','orbit','bridge','macro']) await captureClip(key, CLIPS[key]); })();
  }
})();

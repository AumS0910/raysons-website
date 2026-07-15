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

  // Size the canvas BUFFER to the element's ACTUAL rendered box — NOT innerWidth/innerHeight.
  // On iOS the fixed #stage fills the large (URL-bar-collapsed) viewport while innerHeight is
  // the small viewport, so the two differ; sizing the buffer to the element keeps buffer-aspect
  // == element-aspect and the pour asset COVERS correctly instead of stretching. A ResizeObserver
  // catches the iOS URL-bar resize so it stays correct as you scroll.
  function sizeCanvas(){
    const dpr=Math.min(devicePixelRatio||1,2);
    const r=canvas.getBoundingClientRect();
    const w=Math.round(r.width)||innerWidth, h=Math.round(r.height)||innerHeight;
    if(canvas.width!==w*dpr || canvas.height!==h*dpr){ canvas.width=w*dpr; canvas.height=h*dpr; }
  }
  function onResize(){ scrollSpace.style.height=(TOTAL*VH+40)+'vh'; sizeCanvas(); settledFrames=0; }
  sizeCanvas();
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  if('ResizeObserver' in window){ new ResizeObserver(function(){ sizeCanvas(); settledFrames=0; }).observe(canvas); }

  // poster = a pour frame, painted instantly while the clips capture in the background
  const posterImg = new Image(); posterImg.src = 'valve/pour-poster.jpg';

  // ---- captured frame store ----
  const frames = {};
  let capturedClips = 0;
  let settledFrames = 0;   // idle-loop counter; reset whenever the stage must repaint
  const uniqueClips = Object.keys(CLIPS).length;

  // ============================================================
  //  FRAME CACHE — IndexedDB (RIFT whitepaper §3.6 / §8)
  //  Each clip's WebP frames persist per device, keyed by clip|bucket.
  //  First visit decodes the clips once; every later visit / reload
  //  restores from disk with zero video decode. Partial captures from
  //  a stalled decode are never written.
  // ============================================================
  const DB_NAME = 'raysons-cinema', STORE = 'frames', CACHE_VER = 'v2';  // bump = invalidate any stale cached captures
  const cacheKey = (key)=> `${CACHE_VER}|${key}|${MOBILE?'m':'d'}`;
  let dbP = null;
  function openDB(){
    if(dbP) return dbP;
    dbP = new Promise((res)=>{
      let req; try{ req = indexedDB.open(DB_NAME, 1); }catch(e){ return res(null); }
      req.onupgradeneeded = ()=>{ try{ req.result.createObjectStore(STORE); }catch(e){} };
      req.onsuccess = ()=> res(req.result);
      req.onerror   = ()=> res(null);
    });
    return dbP;
  }
  async function idbGet(key){
    const db = await openDB(); if(!db) return null;
    return new Promise((res)=>{ try{
      const r = db.transaction(STORE,'readonly').objectStore(STORE).get(cacheKey(key));
      r.onsuccess = ()=> res(r.result || null); r.onerror = ()=> res(null);
    }catch(e){ res(null); } });
  }
  async function idbSet(key, blobs){
    const db = await openDB(); if(!db) return;
    try{ db.transaction(STORE,'readwrite').objectStore(STORE).put(blobs, cacheKey(key)); }catch(e){}
  }
  // Build Image objects from a stored Blob[] (no decode of video at all).
  function imagesFromBlobs(blobs){
    return blobs.map(b=>{ const im=new Image(); im.src=URL.createObjectURL(b); return im; });
  }

  // Restore a clip from cache if present; returns true on hit.
  async function loadCached(key){
    const blobs = await idbGet(key);
    // ignore empty / partial cache entries (a too-short capture = frozen scrub) — re-capture instead
    if(!blobs || blobs.length < 8 || !blobs.every(Boolean)) return false;
    frames[key] = imagesFromBlobs(blobs);
    capturedClips++; updateLoader();
    return true;
  }

  function captureClip(key, src){
    return new Promise((resolve)=>{
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
      const arr = [];           // Image objects for painting
      const blobArr = [];       // WebP Blobs for persisting to IndexedDB
      const cap = document.createElement('canvas');
      const cx  = cap.getContext('2d');
      let sized = false, done = false, ended = false, persisted = false;
      // toBlob is async — only persist a clean, fully-decoded clip once EVERY
      // frame's WebP blob has actually landed (never a stalled / mid-encode partial).
      const maybePersist = ()=>{
        if(persisted || !ended) return;
        if(blobArr.length && blobArr.every(Boolean)){ persisted=true; idbSet(key, blobArr.slice()); }
      };
      const finish = ()=>{
        if(done) return; done=true; frames[key]=arr; capturedClips++;
        maybePersist();
        resolve(arr);
      };
      function grab(){
        if(!v.videoWidth){ if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab); return; }
        if(!sized){
          const needW = Math.min(3840, Math.max(MOBILE?900:1920, innerWidth*(devicePixelRatio||1)));
          const scale = Math.min(1, needW / v.videoWidth);
          cap.width = Math.round(v.videoWidth*scale); cap.height = Math.round(v.videoHeight*scale); sized=true;
        }
        cx.drawImage(v, 0,0, cap.width, cap.height);
        const idx = arr.length; arr.push(null); blobArr.push(null);
        cap.toBlob(b=>{ if(!b) return; blobArr[idx]=b; const im=new Image(); im.src=URL.createObjectURL(b); arr[idx]=im; maybePersist(); }, 'image/webp', 0.95);
        updateLoader();
        if(v.ended){ ended=true; finish(); }
        else if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
      }
      v.onended = ()=>{ ended=true; finish(); };
      v.onerror = finish;
      v.addEventListener('canplay', ()=>{
        v.play().then(()=>{
          // Capture at high playback speed so each clip is ready in ~1.5s instead
          // of real-time (~5s). The video is muted, so a high rate is allowed; the
          // compositor still presents frames to requestVideoFrameCallback.
          try{ v.playbackRate = MOBILE ? 3 : 4; }catch(e){}
          if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab);
          else { const iv=setInterval(()=>{ if(done){clearInterval(iv);return;} grab(); if(v.ended){ended=true;clearInterval(iv);finish();} }, 1000/24); }
        }).catch(finish);
      }, { once:true });
    });
  }

  function updateLoader(){
    settledFrames = 0;   // a new frame just landed — keep the canvas live so it paints in
    const cap = Object.values(frames).reduce((s,a)=>s+a.length,0);
    const frac = clamp(capturedClips/uniqueClips + (cap%30)/30/uniqueClips, 0, 1);
    lbar.style.width = (frac*100).toFixed(0)+'%';
    lpct.textContent = String(Math.floor(frac*100)).padStart(3,'0');
  }

  // ============================================================
  //  RENDER
  // ============================================================
  const _grade = REDUCED ? '' : 'brightness(1.10) contrast(1.07) saturate(1.16)';
  let lastAct = -1, breathT = 0, lastGood = null;

  // ============================================================
  //  2.5D SCROLL CAMERA
  //  The footage is flat, but the FRAME is not: a per-scene dolly (scale), tilt (y)
  //  and pan (x) move a virtual camera through each shot — the Ken-Burns / parallax
  //  approach the reference sites get from a real 3D camera, authored over the
  //  frame-captured film. Moves are eased-out so they SETTLE at the end of a beat
  //  (precision feels locked), scale is chained scene-to-scene so cuts don't pop, and
  //  the whole thing is lerp-smoothed so the camera lags the scroll a few frames for
  //  weight. Base scale stays >=1.06 so translation never reveals a frame edge.
  //  Reduced-motion holds a still, gently-scaled frame. Mobile damps pan/tilt only.
  // ============================================================
  const CAM_AMP = REDUCED ? 0 : (MOBILE ? 0.72 : 1);       // pan/tilt amplitude (dolly unaffected)
  const easeOut = (t)=> 1 - Math.pow(1 - clamp(t,0,1), 3);
  const lerp = (a,b,t)=> a + (b-a)*t;
  // per-act: dolly scale [from,to] (chained continuous), tilt y [from,to] as a fraction
  // of canvas height, and lateral pan amplitude (a there-and-back sine → 0 at every
  // boundary, so a pan never pops between scenes).
  const CAMERA = [
    { s:[1.06,1.16], y:[ 0.015,-0.010], pan:0     },  // 0 pour        push in, tilt up to the ladle
    { s:[1.16,1.22], y:[-0.010,-0.020], pan:0.010 },  // 1 forge       press toward the heat
    { s:[1.22,1.06], y:[-0.020, 0.006], pan:0     },  // 2 deconstruct pull back — the part opens up
    { s:[1.06,1.12], y:[ 0.006, 0.000], pan:0     },  // 3 reassemble  settle back in
    { s:[1.12,1.10], y:[ 0.000, 0.000], pan:0.022 },  // 4 orbit       lateral pan around the part
    { s:[1.10,1.06], y:[ 0.000, 0.015], pan:0     },  // 5 bridge      open out — the film widens
    { s:[1.06,1.22], y:[ 0.015,-0.015], pan:0     },  // 6 bore        push in hard, then LOCK
    { s:[1.22,1.06], y:[-0.015, 0.010], pan:0     },  // 7 finale      pull back farther than expected
  ];
  let smCam = { scale:1.06, x:0, y:0 }, curCam = { scale:1.06, x:0, y:0 };
  function camTarget(act, local){
    if(REDUCED) return { scale:1.06, x:0, y:0 };
    // hero, before the first scroll: a slow ambient drift that never hard-resets
    if(autoplay && act===0){
      const a = autoT*0.6;
      return { scale: 1.09 + Math.sin(a)*0.035, x: Math.sin(a*0.5)*0.006*CAM_AMP, y: Math.cos(a*0.7)*0.008*CAM_AMP };
    }
    const k = CAMERA[act] || CAMERA[0], te = easeOut(local);
    return { scale: lerp(k.s[0],k.s[1],te), x: Math.sin(Math.PI*local)*(k.pan||0)*CAM_AMP, y: lerp(k.y[0],k.y[1],te)*CAM_AMP };
  }
  function stepCam(act, local){
    const t = camTarget(act, local);
    if(REDUCED){ smCam = t; }
    else smCam = { scale: lerp(smCam.scale,t.scale,0.18), x: lerp(smCam.x,t.x,0.18), y: lerp(smCam.y,t.y,0.18) };
    curCam = smCam; return smCam;
  }

  function paint(im, vel, cam){
    if(!im || !im.complete || !im.naturalWidth) return false;
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    breathT += 0.016;
    const breathe = 1 + (REDUCED?0:Math.sin(breathT*0.6)*0.012);
    const blur = REDUCED ? 0 : Math.min(4, vel*4);
    ctx.filter = _grade + (blur>0.2? ` blur(${blur.toFixed(1)}px)`:'');
    const s = Math.max(cw/im.naturalWidth, ch/im.naturalHeight) * breathe * (cam?cam.scale:1);
    const w = im.naturalWidth*s, h = im.naturalHeight*s;
    ctx.drawImage(im, (cw-w)/2 + (cam?cam.x*cw:0), (ch-h)/2 + (cam?cam.y*ch:0), w, h);
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
    const s=Math.max(cw/im.naturalWidth,ch/im.naturalHeight)*(curCam?curCam.scale:1);
    const w=im.naturalWidth*s, h=im.naturalHeight*s;
    ctx.drawImage(im,(cw-w)/2+(curCam?curCam.x*cw:0),(ch-h)/2+(curCam?curCam.y*ch:0),w,h);
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
    const cam = stepCam(seg.act, local);
    let drew=false;
    if(arr && arr.length){
      const u = seg.reverse ? (1-local) : local;
      const fi = clamp(Math.round(u*(arr.length-1)), 0, arr.length-1);
      drew = paint(arr[fi], vel, cam);
    }
    if(!drew) paintFallback();

    if(seg.act !== lastAct){ overlays.forEach((o,i)=> o.classList.toggle('on', i===seg.act)); lastAct=seg.act; }

    // SCROLL-TIED MOTION: the active scene's text physically travels and fades
    // with scroll — it rises from below, holds centred where you read it, then
    // lifts up and fades out as the next scene rises in. Both adjacent scenes are
    // ~0 opacity at the boundary, so the act-switch is invisible (no slideshow
    // crossfade). Scene 0 is special-cased: it's already shown (hero auto-play),
    // so it only exits, never enters from below.
    if(!REDUCED){
      const inner = overlays[seg.act] && overlays[seg.act].querySelector('.inner');
      if(inner){
        const isLast = (seg === SEGMENTS[SEGMENTS.length-1]);
        if(seg.act === 0){
          inner.style.transform = 'translate3d(0,'+(local*-150).toFixed(1)+'px,0)';
          inner.style.opacity = (local < 0.72 ? 1 : Math.max(0,(1-local)/0.28)).toFixed(3);
        } else if(isLast){
          // finale: enters from below, then HOLDS (no exit fade — nothing follows it)
          const lf = Math.min(local, 0.5);
          inner.style.transform = 'translate3d(0,'+((0.5-lf)*180).toFixed(1)+'px,0)';
          inner.style.opacity = (local < 0.20 ? local/0.20 : 1).toFixed(3);
        } else {
          inner.style.transform = 'translate3d(0,'+((0.5-local)*180).toFixed(1)+'px,0)';
          const op = local < 0.20 ? local/0.20 : local > 0.80 ? (1-local)/0.20 : 1;
          inner.style.opacity = clamp(op,0,1).toFixed(3);
        }
        // DIFFERENTIAL PARALLAX: the scene's peak number (1450°C / ±0.3mm) travels a
        // touch further than its witness text — one hero element breathes, the rest holds.
        const peakEl = inner.querySelector('[data-peak]');
        if(peakEl) peakEl.style.transform = 'translate3d(0,'+((0.5-local)*54).toFixed(1)+'px,0)';
      }
    }

    if(cue) cue.classList.toggle('hide', progress>0.015);
    if(ctaDock) ctaDock.classList.toggle('on', progress>0.05);
  }

  // ============================================================
  //  SCROLL LOOP (lerped — buttery)
  // ============================================================
  let sy=scrollY, target=scrollY, prevP=0, autoplay=false, autoT=0;
  const POUR_FRAC = SEGMENTS[0].span / TOTAL;   // scroll fraction the pour clip occupies
  addEventListener('scroll', ()=>{ if(scrollY>2) autoplay=false; target=scrollY; settledFrames=0; }, {passive:true});
  function loop(){
    requestAnimationFrame(loop);
    // HERO AUTO-PLAY: until the user scrolls, the pour flows on its own (looping)
    // so the molten is alive, not a frozen frame. First scroll hands off to the
    // scroll-scrub. Reduced-motion opts out and holds a still frame.
    if(autoplay && target < 2 && !REDUCED){
      autoT += 0.0033;                          // ~5s per pour cycle
      const p = (autoT % 1) * POUR_FRAC;
      render(p, 0.05);
      const hi = overlays[0] && overlays[0].querySelector('.inner');
      if(hi){ hi.style.transform='none'; hi.style.opacity='1'; }  // hold hero text stable while it loops
      if(cue) cue.classList.remove('hide');
      if(ctaDock) ctaDock.classList.remove('on');
      prevP = p; return;
    }
    const prev=sy;
    sy += (target-sy) * (REDUCED?1:0.09);
    const moving = Math.abs(target-sy) > 0.4 || Math.abs(sy-prev) > 0.1;
    // Idle: once the scroll has settled and the breathing has been painted a
    // few frames, stop the full-screen canvas repaint entirely (battery/GPU).
    if(!moving){ if(settledFrames > 6) return; settledFrames++; } else { settledFrames=0; }
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
    // Each clip restores from IndexedDB if cached (instant, decode-free);
    // only a cache miss falls through to the one-time video capture.
    (async ()=>{
      for(const key of ['pour','forge','deconstruct','orbit','bridge','macro']){
        if(!(await loadCached(key))) await captureClip(key, CLIPS[key]);
      }
    })();
  }
})();

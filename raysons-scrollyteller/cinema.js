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
  // No codec in the capture path where the browser gives us bitmaps. See grab().
  const HAS_BITMAP = typeof createImageBitmap === 'function';
  const clamp = (v,a,b)=> v<a?a : v>b?b : v;

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  // The film is scaled on every painted frame (1024px source into a 780px buffer, plus
  // the breathing zoom). 'high' smoothing asks for a multi-tap resample of a full-screen
  // image sixty times a second; on photographic footage in motion the difference from
  // 'low' is invisible and the cost is not. Set once, here, rather than per frame.
  try{ ctx.imageSmoothingQuality = 'low'; }catch(e){}
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
  // THE EDIT. These spans were 7-6-6-6-6-5-6-6 — every act inside one unit of every other,
  // so the establishing shot, the connective bridge and the climax all cost the viewer the
  // same scroll. No cut works that way; an edit breathes. Reweighted so the pour gets room
  // to be awe, the bridge stops charging climax rates for connective tissue, and the final
  // reveal is the longest thing in the film.
  // TOTAL IS UNCHANGED (48), so the page length, the scroll runway and every downstream
  // measurement are identical — only the distribution moves.
  const SEGMENTS = [
    { clip:'pour',        reverse:false, span:9, act:0 },  // The Pour — the one moment of pure awe, held
    { clip:'forge',       reverse:false, span:6, act:1 },  // Fire becomes the part
    { clip:'deconstruct', reverse:false, span:5, act:2 },  // Deconstruct
    { clip:'deconstruct', reverse:true,  span:5, act:3 },  // Reassemble (free)
    { clip:'orbit',       reverse:false, span:6, act:4 },  // Orbit — every side
    { clip:'bridge',      reverse:false, span:3, act:5 },  // Bridge — connective tissue, keep it moving
    { clip:'macro',       reverse:false, span:6, act:6 },  // Detail — the bore
    { clip:'macro',       reverse:true,  span:8, act:7 },  // Reveal (free) — the payoff, the longest beat
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
    // DPR 2 on a 3x phone meant a 780x1688 buffer — 1.32 megapixels blitted every single
    // frame of every scroll, and a CPU profile put 89% of the scroll in native compositing
    // with drawImage the largest JS cost after it. This is photographic film under motion,
    // not text: at 1.4 nobody can tell, and it is HALF the pixels. Desktop keeps 2.
    // 1.4 was chosen when every frame of this canvas was a scroll-time cost worth
    // halving. The film is pre-rendered images on a phone now and a paint costs ~5ms,
    // so that economy had stopped paying for itself and was only costing sharpness: a
    // 546px buffer stretched across a 1170px screen is a 2.1x upscale, which is exactly
    // as soft as it sounds. 2 is the ordinary retina treatment — 780px here, downscaled
    // from 1024px source frames rather than magnified from 512.
    const dpr=Math.min(devicePixelRatio||1, MOBILE ? 2 : 1.5);
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
  // NO IndexedDB CALL MAY BLOCK THE CAPTURE QUEUE. The clips are restored/captured in a
  // sequential await loop, so anything that never settles stops the film dead at
  // whichever clip it happened on. Measured on WebKit: pour captures in 1.5s, then
  // nothing for 90 seconds — six of eight acts left with no footage on every iPhone.
  // Opening the database succeeds there; it is the read that never calls back. A cache
  // miss is cheap (we re-capture); a hung promise costs the entire rest of the film.
  const settle = (p, ms, fallback)=> Promise.race([
    p, new Promise(res=> setTimeout(()=> res(fallback), ms))
  ]);
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
    const db = await settle(openDB(), 2000, null); if(!db) return null;
    return settle(new Promise((res)=>{ try{
      const r = db.transaction(STORE,'readonly').objectStore(STORE).get(cacheKey(key));
      r.onsuccess = ()=> res(r.result || null); r.onerror = ()=> res(null);
    }catch(e){ res(null); } }), 2000, null);
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

  // SCROLLING WINS. Capture decodes six clips and builds hundreds of bitmaps; on a
  // phone that work lands on the same main thread and GPU the scroll needs, for the
  // ~45s it takes. The film arriving a few seconds later costs nothing anyone notices;
  // a scroll that stutters for 45 seconds is the whole experience. So the clips pause
  // the moment the page moves and resume once it has been still for a beat.
  let scrolling = false, scrollIdle = null;
  const capturing = new Set();
  addEventListener('scroll', ()=>{
    if(!scrolling){ scrolling = true; capturing.forEach(v=>{ try{ v.pause(); }catch(e){} }); }
    clearTimeout(scrollIdle);
    scrollIdle = setTimeout(()=>{
      scrolling = false;
      capturing.forEach(v=>{ try{ v.play().catch(()=>{}); }catch(e){} });
    }, 220);
  }, { passive:true });

  // ============================================================
  //  PRE-RENDERED FRAMES (phones)
  //
  //  A phone does not decode video for this film any more. Capture needed ~45 seconds
  //  of video decoding before it had frames to scrub, and a visitor starts scrolling
  //  immediately — so what they actually saw was a poster that would not move, no
  //  matter how fast the page scrolled or how cheap each paint had become. Frame time
  //  was never the complaint. A stuck ladle was.
  //
  //  So the frames ship already made: 32 per clip, 512px wide, 1.5MB for the whole film
  //  against 21MB of video it replaces. The browser decodes images off the main thread,
  //  there is nothing to capture, nothing to hold in GPU memory, and the first act is
  //  scrubbable as soon as its images arrive rather than 45 seconds later.
  //
  //  Desktop keeps the capture path: it has the budget, it finishes in ~21s, and it
  //  gets the full-resolution film. This is not a downgrade applied everywhere — it is
  //  the right trade on the device that could not afford the other one.
  // ============================================================
  const SEQ_FRAMES = 32;
  function loadSequence(key){
    return new Promise((resolve)=>{
      const arr = new Array(SEQ_FRAMES);
      let settled = 0;
      // Published immediately, not when the last frame lands: paint() skips any image
      // that is not ready yet, so the act becomes scrubbable as its frames arrive.
      frames[key] = arr;
      for(let i = 0; i < SEQ_FRAMES; i++){
        const im = new Image();
        im.decoding = 'async';
        arr[i] = im;
        const onSettle = ()=>{
          settled++;
          updateLoader();
          if(settled === SEQ_FRAMES){ capturedClips++; resolve(arr); }
        };
        im.onload = onSettle;
        im.onerror = onSettle;                 // a missing frame must not stall the film
        // The directory carries the frame width. These are cached immutable for a year
        // by our own .htaccess, so replacing the CONTENTS of images/film/ left every
        // phone that had already loaded the 512px set holding it — the film came back
        // sharp on a cold cache and stayed soft on the client's actual device. A new
        // resolution is a new path from now on.
        im.src = 'images/film-1024/' + key + '/' + String(i + 1).padStart(2, '0') + '.webp';
      }
    });
  }

  function captureClip(key, src){
    return new Promise((resolve)=>{
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
      // SAFARI WILL NOT PAINT A DETACHED VIDEO. drawImage() from a <video> that was
      // never added to the document returns transparent black on WebKit — the clip
      // plays, currentTime advances, videoWidth is correct, and every captured frame
      // is still empty. That is exactly what shipped: on iPhone the whole film was
      // 27 black WebP frames, so the canvas stayed black however far you scrolled.
      // Chromium paints a detached video happily, which is why it never showed here.
      //
      // So put it in the document. It has to stay in the layout tree and be rendered
      // — display:none and visibility:hidden both bring the black frames back — hence
      // offscreen with a real size rather than hidden.
      // Sized 1280x720 rather than a token 2px because WebKit reports videoWidth as the
      // element's RENDERED width, and captureClip scales the frame buffer from it — at
      // 160px the film came out as a 160-wide image stretched over the whole screen.
      // Offscreen, so the size costs nothing but the number this hands to the sizer.
      v.setAttribute('aria-hidden', 'true');
      v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:720px;opacity:0.01;pointer-events:none;z-index:-1';
      document.body.appendChild(v);
      if(MOBILE) capturing.add(v);          // so the scroll can pause it
      const arr = [];           // Image objects for painting
      const blobArr = [];       // WebP Blobs for persisting to IndexedDB
      const cap = document.createElement('canvas');
      const cx  = cap.getContext('2d');
      let sized = false, done = false, ended = false, persisted = false, lastT = -1;
      // toBlob is async — only persist a clean, fully-decoded clip once EVERY
      // frame's WebP blob has actually landed (never a stalled / mid-encode partial).
      const maybePersist = ()=>{
        if(persisted || !ended) return;
        if(blobArr.length && blobArr.every(Boolean)){ persisted=true; idbSet(key, blobArr.slice()); }
      };
      // WATCHDOG. The clips are captured in a sequential await loop, so a clip that
      // never finishes does not fail alone — it blocks every clip behind it forever.
      // Measured: Chromium captures all six in 21s, one every ~4s; WebKit captures pour
      // at 1.5s and then nothing at all for 90s, which left six of the eight acts with
      // no footage to scrub to on every iPhone. Whatever decoder state causes that, no
      // single clip may be allowed to hold the queue, so one gives up after 14s with
      // whatever frames it managed and the next one starts.
      // 24s, not 14: on the polling path a clip now runs at 1x, so the watchdog has to
      // outlast an ~8s clip plus decode overhead or it would truncate every capture.
      const WATCHDOG = setTimeout(()=>{ if(!done) finish(); }, 24000);
      const finish = ()=>{
        if(done) return; done=true; clearTimeout(WATCHDOG); frames[key]=arr; capturedClips++;
        maybePersist();
        // the offscreen element has done its job — stop it decoding and take it out
        capturing.delete(v);
        try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
        try{ v.remove(); }catch(e){}
        resolve(arr);
      };
      function grab(){
        if(!v.videoWidth){ if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(grab); return; }
        if(!sized){
          // CAPTURE NO LARGER THAN WE WILL EVER PAINT. The canvas buffer is capped at
          // 1.4x CSS on a phone, so on a 390px screen it paints 546px wide — capturing
          // at 900+ was decoding, scaling and holding bitmaps nearly twice the size they
          // can ever be shown at, for every frame of six clips. Memory and decode time
          // both scale with this number, and both are what the scroll is competing with.
          const needW = Math.min(3840, Math.max(MOBILE ? 640 : 1920, innerWidth*(devicePixelRatio||1) * (MOBILE ? 0.6 : 1)));
          const scale = Math.min(1, needW / v.videoWidth);
          cap.width = Math.round(v.videoWidth*scale); cap.height = Math.round(v.videoHeight*scale); sized=true;
        }
        // Only grab when the clip has actually MOVED. A blind timer samples whatever
        // the decoder happens to have — and when playback outruns it, that is the
        // previous frame again, or nothing at all. Requiring currentTime to advance
        // means every captured frame is a real, distinct one, and a slow decoder
        // costs us frame count rather than a reel of black.
        if(v.currentTime <= lastT) return;
        lastT = v.currentTime;
        cx.drawImage(v, 0,0, cap.width, cap.height);
        const idx = arr.length; arr.push(null); blobArr.push(null);
        // A PAINTABLE FRAME, IMMEDIATELY — no encoding.
        // This used to be canvas.toBlob('image/webp'), and that encode was the whole
        // problem on iPhone: measured on a real device profile, Safari manages about
        // 2.1 WebP encodes a second. The film is 48 seconds of footage; capturing it at
        // a usable frame density needs ~1440 frames, so encoding alone was ELEVEN
        // MINUTES of work. The film never finished capturing, which is why scrolling
        // stayed sticky on a phone until 'everything loaded' — it never fully did.
        // createImageBitmap is a GPU-side copy with no codec in the path at all.
        if(HAS_BITMAP){
          createImageBitmap(cap).then(bm=>{ arr[idx]=bm; }).catch(()=>{});
        } else {
          cap.toBlob(b=>{ if(!b) return; blobArr[idx]=b; const im=new Image(); im.src=URL.createObjectURL(b); arr[idx]=im; maybePersist(); }, 'image/webp', 0.95);
        }
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
          //
          // Safari has no requestVideoFrameCallback, so it falls back to polling —
          // and polling at 24Hz while the video runs at 3x samples only 8 frames per
          // SECOND OF FOOTAGE. That is why iOS ended up with a handful of frames per
          // clip and the film played as a slideshow. When we have to poll, run the
          // clip at normal speed so every poll lands on a distinct frame.
          const RVFC = !!v.requestVideoFrameCallback;
          // Back to full speed on both paths. The polling path was dropped to 1x only
          // because 24Hz polling against a 3x clip sampled 8 frames per second of
          // footage — but that was a workaround for a frame budget the WebP encode was
          // eating. With bitmaps there is no encode, so we can play fast AND sample
          // every presented frame: rAF polls at the display rate (60Hz, 120Hz on newer
          // iPhones) instead of a fixed timer.
          // SPEED ONLY WHERE THE FRAMES ARE GUARANTEED. With requestVideoFrameCallback
          // the browser hands us every presented frame, so playing fast costs nothing.
          // WebKit has no rVFC and must poll on a 30Hz timer: at 2x that samples ~15
          // frames per second of footage and simply misses the rest. Measured over a
          // full scroll — WebKit 10 distinct film frames against Chromium's 27, which
          // is why the film steps in jumps on an iPhone while it glides on a desktop.
          // On the polling path, run the clip at normal speed so a 30Hz poll lands on
          // roughly every source frame. It costs capture time, not frames.
          try{ v.playbackRate = RVFC ? (MOBILE ? 2 : 4) : 1; }catch(e){}
          if(RVFC) v.requestVideoFrameCallback(grab);
          // A TIMER, not rAF: rAF is gated by the compositor, so on a page already
          // painting a full-screen canvas it samples at whatever the render loop
          // manages — exactly when frames matter most. 30Hz, not 60: swept against
          // capture completeness on real devices, 60Hz and 40Hz both starved the decode
          // until the last clips never captured and the closing acts went black.
          //
          // Retried at 60Hz once the paint cost dropped to ~25ms and the polling path
          // moved to 1x, on the theory that the original budget no longer applied. It
          // changed nothing measurable (WebKit held at 30 distinct film states across
          // the runway, Chromium at 60), so the empirical 30 stands rather than carry a
          // value that contradicts device testing for no benefit.
          else { const iv=setInterval(()=>{ if(done){clearInterval(iv);return;} grab(); if(v.ended){ended=true;clearInterval(iv);finish();} }, 1000/30); }
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
  // ON MOBILE THE GRADE MOVES TO THE ELEMENT. ctx.filter re-filters the whole surface in
  // software on every single painted frame; as a CSS filter on the canvas element the
  // compositor does it on the GPU, once, for free, and the result is pixel-identical.
  // The motion blur goes entirely on mobile: blur() is the most expensive filter there is
  // and it was running a full-surface pass per frame, for a few pixels of smear during
  // fast scroll that nobody has ever remarked on — on the device that can least afford it.
  if(MOBILE && _grade) canvas.style.filter = _grade;
  const CTX_FILTER = MOBILE ? '' : _grade;   // '' == no per-frame filter work at all
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
    // per-frame 0.18 assumed 60fps; k=11.9 is that same feel measured against real time
    else { const a = 1 - Math.exp(-11.9 * frameDt);
      smCam = { scale: lerp(smCam.scale,t.scale,a), x: lerp(smCam.x,t.x,a), y: lerp(smCam.y,t.y,a) }; }
    curCam = smCam; return smCam;
  }

  // Frames are ImageBitmaps where the browser has them and <img> otherwise (the
  // IndexedDB cache still restores <img>). These read either without caring which.
  const fw = im => im.naturalWidth  || im.width  || 0;
  const fh = im => im.naturalHeight || im.height || 0;
  const fready = im => !!im && (im.complete === undefined || im.complete) && fw(im) > 0;

  function paint(im, vel, cam){
    if(!fready(im)) return false;
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    breathT += 0.016;
    // The breathing zoom is a 1.2% drift that keeps a held frame feeling alive on a
    // desktop. On a phone it costs far more than it gives: it changes the scale on
    // every single frame, so a full-screen image is resampled afresh even when the
    // film has not advanced a frame and the camera has not moved. Dropping it on
    // mobile is what makes the skip below possible at all.
    const breathe = (REDUCED || MOBILE) ? 1 : (1 + Math.sin(breathT*0.6)*0.012);
    const blur = REDUCED ? 0 : Math.min(4, vel*4);
    const _f = CTX_FILTER + (!MOBILE && blur>0.2 ? ` blur(${blur.toFixed(1)}px)` : '');
    if(_f) ctx.filter = _f;
    const s = Math.max(cw/fw(im), ch/fh(im)) * breathe * (cam?cam.scale:1);
    const w = fw(im)*s, h = fh(im)*s;
    ctx.drawImage(im, (cw-w)/2 + (cam?cam.x*cw:0), (ch-h)/2 + (cam?cam.y*ch:0), w, h);
    if(_f) ctx.filter = 'none';
    lastGood = im;
    return true;
  }
  function paintFallback(){
    const im = lastGood || (fready(posterImg) ? posterImg : null);
    if(!im) return;
    const cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    if(CTX_FILTER) ctx.filter = CTX_FILTER;
    const s=Math.max(cw/fw(im),ch/fh(im))*(curCam?curCam.scale:1);
    const w=fw(im)*s, h=fh(im)*s;
    ctx.drawImage(im,(cw-w)/2+(curCam?curCam.x*cw:0),(ch-h)/2+(curCam?curCam.y*ch:0),w,h);
    if(CTX_FILTER) ctx.filter='none';
  }

  // ══ TURNTABLE ══════════════════════════════════════════════════════════════
  // Act 4's clip is a full 360° orbit, and every one of its frames is already
  // captured to an Image. So the frame index is randomly addressable: drag
  // horizontally, offset the index, and the part turns. Past the last frame it
  // WRAPS to the first, because a full circle has no seam — which is what makes
  // this read as a turntable rather than a video being scrubbed to its end.
  //
  // This is the one interaction footage can honestly support. Every angle the
  // viewer asks for is an angle that was actually filmed; nothing is invented.
  const TURN_ACT = 4;
  let turnOff = 0, turnV = 0, turning = false, tX = 0, tY = 0, tAxis = 0, tLast = 0;
  let curAct = -1;
  const turnAlive = ()=> curAct === TURN_ACT && (turning || Math.abs(turnV) > 0.02);

  function onDown(e){
    if(curAct !== TURN_ACT) return;
    if(e.target.closest && e.target.closest('a,button')) return;
    turning = true; tAxis = 0; tX = e.clientX; tY = e.clientY; tLast = performance.now();
    turnV = 0;
    document.body.classList.add('turning');
  }
  function onMove(e){
    if(!turning) return;
    const dx = e.clientX - tX, dy = e.clientY - tY;
    // On touch, decide ONCE whether this gesture is a turn or a scroll. Without
    // this a vertical swipe would fight the page scroll and the film would feel
    // broken on a phone.
    if(tAxis === 0){
      // A thumb swipe is never perfectly vertical. Deciding on 4px with a bare
      // |dx| > |dy| meant a slightly diagonal scroll could be claimed as a turn, and
      // then preventDefault() held the page still for the rest of that gesture — the
      // scroll simply not working, intermittently, in this one act. Claim the gesture
      // only on a clear and deliberate horizontal intent: 10px travelled and a 1.5x
      // bias. Anything else is released to the page immediately.
      if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      tAxis = (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) >= 10) ? 1 : -1;
      if(tAxis === -1){ turning = false; document.body.classList.remove('turning'); return; }
    }
    if(e.cancelable) e.preventDefault();
    const now = performance.now(), dt = Math.max(1, now - tLast);
    const step = dx * 0.16;                       // px -> frames
    turnOff += step;
    turnV = step * Math.min(3, 16 / dt);          // frames per frame, for the coast
    tX = e.clientX; tY = e.clientY; tLast = now;
    settledFrames = 0;                            // wake the loop
  }
  function onUp(){ turning = false; document.body.classList.remove('turning'); }
  addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive:false });
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);

  // ground truth for testing: the frame index actually painted, and the live turn
  // offset. Screenshot diffing cannot verify this — the breathing zoom changes pixels
  // every frame whether or not the drag is connected.
  window.__cine = ()=>({ act: curAct, off: +turnOff.toFixed(2), v: +turnV.toFixed(3), fi: lastFi });
  let lastFi = -1, lastCamKey = '';

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
    curAct = seg.act;
    let drew=false;
    if(arr && arr.length){
      const u = seg.reverse ? (1-local) : local;
      let fi;
      if(seg.act === TURN_ACT){
        // scroll still advances the orbit; the drag is an OFFSET on top of it, so
        // letting go never snaps the part back to where the scroll says it should be
        fi = Math.round(u*(arr.length-1) + turnOff);
        fi = ((fi % arr.length) + arr.length) % arr.length;    // wrap — it's a circle
      } else {
        fi = clamp(Math.round(u*(arr.length-1)), 0, arr.length-1);
      }
      // NOTHING CHANGED, NOTHING TO DRAW. Scrolling slowly, many frames land on the
      // same film frame with the camera barely moving, and every one of them was
      // repainting a full-screen image for an identical result. Skipping those is the
      // difference between painting on every scroll event and painting when the
      // picture actually differs.
      const camKey = cam ? ((cam.x*1e3|0)+','+(cam.y*1e3|0)+','+(cam.scale*1e3|0)) : '-';
      if(MOBILE && fi === lastFi && camKey === lastCamKey && lastGood === arr[fi]){
        drew = true;                        // the canvas already shows exactly this
      } else {
        lastCamKey = camKey;
        drew = paint(arr[fi], vel, cam);
      }
      lastFi = fi;
    }
    if(!drew) paintFallback();

    // hand the part its momentum back when released
    if(!turning && Math.abs(turnV) > 0.02){ turnOff += turnV; turnV *= 0.94; }
    else if(!turning) turnV = 0;
    if(document.body.classList.contains('turntable') !== (seg.act === TURN_ACT))
      document.body.classList.toggle('turntable', seg.act === TURN_ACT);

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
  let lastT = performance.now();   // for frame-rate-independent scroll smoothing
  let frameDt = 0.016;             // last frame's elapsed time, shared with stepCam
  const POUR_FRAC = SEGMENTS[0].span / TOTAL;   // scroll fraction the pour clip occupies
  // iOS SAFARI THROTTLES requestAnimationFrame DURING MOMENTUM SCROLL. It gives the
  // scroll thread priority and our rAF callback simply does not run — so the lerped
  // loop below stalls, the fixed canvas keeps whatever frame it last painted, and the
  // film sits frozen behind text that is still moving. Reported exactly as it looks:
  // "everything is scrolling except the background."
  //
  // Scroll events DO keep firing throughout. So when rAF has clearly stalled, paint
  // from the scroll event instead. The 40ms gate means this only engages when the loop
  // is genuinely not running, and it self-limits to ~25 paints a second; the rest of the
  // time the lerped loop owns the canvas and this costs one subtraction per event.
  // Painting here is only affordable because the frame now costs ~25ms rather than 224.
  let lastLoopAt = performance.now();
  function paintFromScroll(){
    lastLoopAt = performance.now();
    sy = target;                       // no time to ease — land on where the page IS
    const max = Math.max(1, scrollSpace.offsetHeight - innerHeight);
    const p = clamp(sy / max, 0, 1);
    const vel = Math.min(1, Math.abs(p - prevP) * 60); prevP = p;
    render(p, vel);
  }
  addEventListener('scroll', ()=>{
    if(scrollY>2) autoplay=false;
    target=scrollY; settledFrames=0;
    // ON A PHONE THE SCROLL HANDLER OWNS THE FILM OUTRIGHT.
    // Waiting for rAF to stall before painting still leaves the film at the mercy of a
    // loop iOS is free to starve, and measured frame indices while scrubbing the pour
    // showed exactly that: one frame held for the better part of a second, then a jump.
    // Scroll events are the one signal that keeps firing throughout a flick, so on
    // mobile every one of them paints, capped near 70fps. A frame costs ~5ms there now,
    // which is what makes this affordable; at the 224ms it cost this morning it would
    // have been unthinkable. Desktop keeps the stall-detection path and its easing.
    if(performance.now() - lastLoopAt > (MOBILE ? 14 : 40)) paintFromScroll();
  }, {passive:true});
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
    // FRAME-RATE INDEPENDENT SMOOTHING. This was `sy += (target-sy) * 0.09`, which
    // moves 9% of the remaining distance PER FRAME and so silently assumes 60fps.
    // Safari renders this page far slower than Chrome, and at ~2fps the film crawled
    // toward wherever you had scrolled to — on an iPhone the scroll appeared dead,
    // stuck on the opening act while the page underneath had already moved on.
    // Converge against real elapsed time instead: k chosen so that at 60fps this is
    // the original 0.09 per frame, but now 10fps covers the same ground per second.
    const _now = performance.now();
    const dt = Math.min(0.1, (_now - lastT) / 1000) || 0.016;   // clamp tab-switch spikes
    lastT = _now;
    lastLoopAt = _now;        // tell the scroll path the loop is alive
    frameDt = dt;                       // stepCam smooths against real time too
    // NO EASING ON A PHONE. The lerp exists to make a mouse wheel feel buttery: it
    // eases the film toward where you scrolled to. But it only advances when the loop
    // runs, and iOS starves rAF during momentum scrolling — so the film held one frame
    // for about a second and then jumped. Measured as frame indices while scrubbing the
    // pour: 0,0,0,0,0,0,0,0,20,20,20,20... The ladle was not pouring, it was stepping.
    //
    // A phone's own scrolling is already smooth, and the film has nothing to smooth out:
    // it should sit exactly where the finger is. Track the scroll position directly and
    // the frame follows every pixel of it. Desktop keeps the easing, which is where the
    // feel was tuned and where rAF is not fighting the scroller.
    sy = (REDUCED || MOBILE) ? target : sy + (target-sy) * (1 - Math.exp(-dt * 5.7));
    const moving = Math.abs(target-sy) > 0.4 || Math.abs(sy-prev) > 0.1;
    // Idle: once the scroll has settled and the breathing has been painted a
    // few frames, stop the full-screen canvas repaint entirely (battery/GPU).
    // The idle gate stops the repaint once scroll settles — correct for a static
    // painted frame. But a turntable that is being dragged, or still coasting, has
    // a new frame to show every tick, so it has to keep the loop alive.
    if(!moving && !turnAlive()){ if(settledFrames > 6) return; settledFrames++; } else { settledFrames=0; }
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
    // Re-entry within the session (html.reentry): the loader is already hidden by CSS and
    // the poster is cached, so boot the film with no artificial delay — one opening title.
    const REENTRY = document.documentElement.classList.contains('reentry');
    posterReady().then(()=> setTimeout(start, REENTRY ? 0 : 600));
    setTimeout(()=>{ if(!started) start(); }, 4000);   // ceiling
    // Each clip restores from IndexedDB if cached (instant, decode-free);
    // only a cache miss falls through to the one-time video capture.
    (async ()=>{
      const KEYS = ['pour','forge','deconstruct','orbit','bridge','macro'];
      if(MOBILE){
        // The opening act first and on its own, so the pour is scrubbable as early as
        // possible; the rest in parallel, because image decoding is off-thread and does
        // not compete with the scroll the way video capture did.
        await loadSequence(KEYS[0]);
        KEYS.slice(1).forEach(loadSequence);
        return;
      }
      for(const key of KEYS){
        if(!(await loadCached(key))) await captureClip(key, CLIPS[key]);
      }
    })();
  }
})();

// ============================================================
//  RAYSONS — scroll engine, chapters, cursor, HUD, loader
// ============================================================
(function(){
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const N = chapters.length;               // overlay chapters
  const KF_SEG = N - 1;                    // matches camera segments in scene.js
  const scrollSpace = document.getElementById('scroll-space');
  // total scrollable height: ~ one viewport per chapter transition + tail
  scrollSpace.style.height = (N * 100 + 40) + 'vh';

  const progTrack = document.querySelector('.prog .track i');
  const progCur   = document.querySelector('.prog .cur');
  const cue       = document.querySelector('.cue');
  const legal     = document.querySelector('.legal');
  const ctaQuote  = document.getElementById('cta-quote');
  const hudTemp   = document.getElementById('hud-temp');
  const hudStage  = document.getElementById('hud-stage');
  const STAGES = ['STANDBY','CHARGE','MELT · 1450°C','CAST','MACHINE','SPEC','GLOBAL'];

  // ============================================================
  //  SMOOTH SCROLL — Lenis + one GSAP ScrollTrigger.
  //  Replaces the old triple-lerp (app 0.12 → scene 0.07 → cam 0.08).
  //  Now: Lenis smooths the wheel → ScrollTrigger maps scroll to 0..1
  //  progress → the camera's single lerp in scene.js is the only
  //  "heavy camera" easing on top. Two stages, no mush.
  // ============================================================
  let progress = 0, lastActive = -1;
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1.0 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t)=> lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // ---- SplitText kinetic reveals on the display headings ----
  // Each .display is split into masked words; when a chapter becomes active its
  // words slide up out of the mask with a stagger (replaces the CSS block-fade
  // on the headings; other .rise elements keep the CSS reveal).
  let splitReady = false;
  const chapterWords = [];
  function initSplit(){
    if (splitReady || typeof SplitText === 'undefined') return;
    splitReady = true;
    gsap.registerPlugin(SplitText);
    chapters.forEach((ch, i)=>{
      const words = [];
      ch.querySelectorAll('.display').forEach(d=>{
        d.classList.remove('rise');             // GSAP drives the headings now
        const s = new SplitText(d, { type:'words', mask:'words' });
        words.push(...s.words);
      });
      chapterWords[i] = words;
      if (words.length) gsap.set(words, { yPercent:115, opacity:0 });
    });
  }
  function revealChapter(idx){
    if (!splitReady) return;
    chapterWords.forEach((words, i)=>{
      if (!words || !words.length) return;
      if (i === idx) gsap.to(words, { yPercent:0, opacity:1, duration:0.82, ease:'power3.out', stagger:0.05, overwrite:true });
      else gsap.set(words, { yPercent:115, opacity:0, overwrite:true });
    });
    // Stagger the customer-name chips on the active beat (the globe finale lands harder).
    const chips = chapters[idx] && chapters[idx].querySelectorAll('.chips span');
    if (chips && chips.length) gsap.fromTo(chips, { y:16, opacity:0 }, { y:0, opacity:1, duration:0.5, ease:'power2.out', stagger:0.05, delay:0.18, overwrite:true });
  }

  function applyChrome(pr){
    const f = pr * KF_SEG;
    const active = Math.round(f);
    chapters.forEach((c,i)=> c.classList.toggle('active', i === active));
    if (active !== lastActive){ revealChapter(active); lastActive = active; }
    progTrack.style.width = (pr*100).toFixed(1) + '%';
    progCur.textContent = String(Math.min(N, active+1)).padStart(2,'0') + ' / ' + String(N).padStart(2,'0');
    const temp = Math.round(28 + (1 - Math.abs(f-1.5)/2.5) * 1422 * (f<3?1:Math.max(0,1-(f-3)/3)));
    hudTemp.textContent = Math.max(28, temp) + '°C';
    hudStage.textContent = STAGES[Math.min(STAGES.length-1, active)];
    cue.classList.toggle('hide', pr > 0.03);
    legal.classList.toggle('show', pr > 0.965);
    if (ctaQuote) ctaQuote.classList.toggle('visible', pr > 0.08);
  }

  ScrollTrigger.create({
    trigger: scrollSpace,
    start: 'top top',
    end: 'bottom bottom',
    // Gentle snap: nudges to the nearest beat once the wheel settles, but never
    // blocks free scrubbing through the pour. Tunable / removable.
    snap: { snapTo: 1 / KF_SEG, duration: { min: 0.2, max: 0.6 }, delay: 0.12, ease: 'power2.inOut' },
    onUpdate: (self)=>{
      progress = self.progress;
      if (window.Foundry) window.Foundry.setProgress(progress);
      applyChrome(progress);
    },
  });

  addEventListener('resize', ()=>{ scrollSpace.style.height = (N*100+40)+'vh'; ScrollTrigger.refresh(); });

  // persist scroll position (survives refresh during iteration)
  let saveT=null;
  lenis.on('scroll', ({ scroll })=>{ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem('rsc_y', String(scroll)); }catch(e){} }, 140); });
  function restoreScroll(){
    try{ const y=parseFloat(localStorage.getItem('rsc_y')); if(y>0){ lenis.scrollTo(y, { immediate:true }); } }catch(e){}
  }

  // ---- jump nav: clicking nav links smooth-scrolls to the mapped beat ----
  // 7-beat journey. about/enquire now live on subpages (nav wiring is a follow-up);
  // mapped to valid in-journey indices for now so the jump-nav never errors.
  const SECTION_MAP = { overview:0, about:0, foundry:2, products:3, enquire:6 };
  document.querySelectorAll('[data-jump]').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const seg = SECTION_MAP[a.dataset.jump] ?? 0;
      const max = scrollSpace.offsetHeight - innerHeight;
      lenis.scrollTo((seg / KF_SEG) * max, { duration: 1.2 });
    });
  });

  // ============================================================
  //  LOADER
  // ============================================================
  const loader = document.getElementById('loader');
  const bar = loader.querySelector('.loader-bar i');
  const pct = loader.querySelector('.loader-pct');
  let p = 0;
  function startReveal(){
    loader.classList.add('done');
    document.body.classList.add('entered');
    ScrollTrigger.refresh();
    restoreScroll();
    applyChrome(progress);
    // Split once fonts are settled (correct word wrapping), then reveal current beat.
    ((document.fonts && document.fonts.ready) || Promise.resolve()).then(()=>{ initSplit(); revealChapter(Math.max(0, lastActive)); });
  }
  const li = setInterval(()=>{
    p += Math.random()*7 + 4;
    if(p >= 100){ p = 100; clearInterval(li); setTimeout(startReveal, 520); }
    bar.style.width = p + '%';
    pct.textContent = Math.floor(p).toString().padStart(3,'0');
  }, 82);

  // ============================================================
  //  CUSTOM CURSOR + magnetic buttons
  // ============================================================
  const cursor = document.getElementById('cursor');
  let mx=innerWidth/2, my=innerHeight/2, cx=mx, cy=my;
  addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; });
  (function cloop(){
    cx += (mx-cx)*0.22; cy += (my-cy)*0.22;
    cursor.style.transform = `translate(${cx}px,${cy}px)`;
    requestAnimationFrame(cloop);
  })();
  const hotSel = 'a, summary, .mag, .sound, [data-jump]';
  document.addEventListener('mouseover', e=>{ if(e.target.closest(hotSel)) cursor.classList.add('hot'); });
  document.addEventListener('mouseout',  e=>{ if(e.target.closest(hotSel)) cursor.classList.remove('hot'); });

  // magnetic effect
  document.querySelectorAll('.mag').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left+r.width/2);
      const dy = e.clientY - (r.top+r.height/2);
      btn.style.transform = `translate(${dx*0.28}px,${dy*0.34}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });

  // ============================================================
  //  SOUND — low furnace rumble (WebAudio, no asset)
  // ============================================================
  const soundBtn = document.getElementById('sound');
  let actx, on=false, nodes=[];
  function buildAudio(){
    actx = new (window.AudioContext||window.webkitAudioContext)();
    const master = actx.createGain(); master.gain.value=0.0; master.connect(actx.destination);
    // brown-ish noise rumble
    const buf = actx.createBuffer(1, actx.sampleRate*2, actx.sampleRate);
    const d = buf.getChannelData(0); let last=0;
    for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.2; }
    const src = actx.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=160;
    src.connect(lp); lp.connect(master); src.start();
    // slow LFO swell
    const lfo=actx.createOscillator(); lfo.frequency.value=0.08;
    const lfoG=actx.createGain(); lfoG.gain.value=0.04; lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start();
    nodes=[master];
    return master;
  }
  soundBtn.addEventListener('click', ()=>{
    if(!actx){ buildAudio(); }
    if(actx.state==='suspended') actx.resume();
    on=!on;
    soundBtn.classList.toggle('on', on);
    soundBtn.querySelector('.lbl').textContent = on? 'Sound On':'Sound';
    nodes[0].gain.linearRampToValueAtTime(on?0.12:0.0, actx.currentTime+0.6);
  });

  // first paint
  applyChrome(0);
})();

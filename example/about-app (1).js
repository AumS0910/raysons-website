// ============================================================
//  RAYSONS — About · scroll engine, HUD year counter, loader
// ============================================================
(function(){
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const N = chapters.length;
  const KF_SEG = N - 1;
  const scrollSpace = document.getElementById('scroll-space');
  let vhPerChapter = 100; // tweakable scroll length

  function sizeScroll(){ scrollSpace.style.height = (N * vhPerChapter + 40) + 'vh'; }
  sizeScroll();

  const progTrack = document.querySelector('.prog .track i');
  const progCur   = document.querySelector('.prog .cur');
  const cue       = document.querySelector('.cue');
  const legal     = document.querySelector('.legal');
  const hudYear   = document.getElementById('hud-year');
  const hudStage  = document.getElementById('hud-stage');
  const STAGES = ['ORIGIN','THE GROUP','PURPOSE','THE JOURNEY','1987 — 1995','1997 — 2005','2021 — IGNITION','2026 — AHEAD','PEOPLE','STANDARDS','GLOBAL'];
  // year readout per chapter (interpolated through the corridor)
  const YEARS = [1987,1987,1987,1987,1991,2001,2021,2026,2027,2027,2027];

  let progress = 0, target = 0, raf = null;
  let scrollEase = 0.12; // tweakable feel

  function scrollUtilY(){ return window.scrollY || document.documentElement.scrollTop; }
  function onScroll(){
    const max = scrollSpace.offsetHeight - innerHeight;
    target = Math.max(0, Math.min(1, scrollUtilY() / max));
    if(!raf) raf = requestAnimationFrame(loop);
  }

  function loop(){
    progress += (target - progress) * scrollEase;
    if(Math.abs(target - progress) < 0.0002){ progress = target; raf = null; } else { raf = requestAnimationFrame(loop); }

    if(window.AboutScene) window.AboutScene.setProgress(progress);

    const f = progress * KF_SEG;
    const active = Math.round(f);
    chapters.forEach((c,i)=> c.classList.toggle('active', i === active));

    progTrack.style.width = (progress*100).toFixed(1) + '%';
    progCur.textContent = String(Math.min(N, active+1)).padStart(2,'0') + ' / ' + String(N).padStart(2,'0');

    // HUD — year counter interpolates between chapter years
    const i0 = Math.min(YEARS.length-1, Math.floor(f));
    const i1 = Math.min(YEARS.length-1, i0+1);
    const yr = Math.round(YEARS[i0] + (YEARS[i1]-YEARS[i0]) * (f - i0));
    hudYear.textContent = yr;
    hudStage.textContent = STAGES[Math.min(STAGES.length-1, active)];

    cue.classList.toggle('hide', progress > 0.03);
    legal.classList.toggle('show', progress > 0.965);
  }

  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', ()=>{ sizeScroll(); onScroll(); });
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ if(!raf) raf=requestAnimationFrame(loop); onScroll(); } });

  // persist scroll position
  let saveT=null;
  addEventListener('scroll', ()=>{ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem('rsc_about_y', String(scrollUtilY())); }catch(e){} }, 120); }, {passive:true});
  function restoreScroll(){
    try{ const y=parseFloat(localStorage.getItem('rsc_about_y')); if(y>0){ window.scrollTo(0,y); progress=target=Math.max(0,Math.min(1,y/(scrollSpace.offsetHeight-innerHeight))); } }catch(e){}
  }

  // ---- in-page jumps ----
  const SECTION_MAP = { top:0, group:1, purpose:2, journey:3, people:8, standards:9, global:10 };
  document.querySelectorAll('[data-jump]').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const seg = SECTION_MAP[a.dataset.jump] ?? 0;
      const max = scrollSpace.offsetHeight - innerHeight;
      window.scrollTo({ top:(seg / KF_SEG) * max, behavior:'smooth' });
    });
  });

  // ============================================================
  //  TWEAKS HOOK — called by the React tweaks island
  // ============================================================
  window.AboutPage = {
    applyTweaks(t){
      document.body.dataset.dir = t.direction === 'Steel' ? 'steel' : 'ember';
      if(window.AboutScene){
        window.AboutScene.setDirection(document.body.dataset.dir);
        window.AboutScene.setParams({ drift: t.drift, camLerp: t.camChase/100, bloom: t.bloom });
      }
      scrollEase = t.scrollEase/100;
      const newVh = t.scrollLength;
      if(newVh !== vhPerChapter){
        const ratio = scrollUtilY() / Math.max(1, scrollSpace.offsetHeight - innerHeight);
        vhPerChapter = newVh; sizeScroll();
        window.scrollTo(0, ratio * (scrollSpace.offsetHeight - innerHeight));
      }
      onScroll();
    }
  };

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
    restoreScroll();
    onScroll();
  }
  const li = setInterval(()=>{
    p += Math.random()*7 + 4;
    if(p >= 100){ p = 100; clearInterval(li); setTimeout(startReveal, 520); }
    bar.style.width = p + '%';
    pct.textContent = Math.floor(p).toString().padStart(3,'0');
  }, 82);

  // ============================================================
  //  CURSOR + magnetic
  // ============================================================
  const cursor = document.getElementById('cursor');
  let mx=innerWidth/2, my=innerHeight/2, cx=mx, cy=my;
  addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; });
  (function cloop(){
    cx += (mx-cx)*0.22; cy += (my-cy)*0.22;
    cursor.style.transform = `translate(${cx}px,${cy}px)`;
    requestAnimationFrame(cloop);
  })();
  const hotSel = 'a, summary, .mag, .sound, [data-jump], button, input, select, label';
  document.addEventListener('mouseover', e=>{ if(e.target.closest(hotSel)) cursor.classList.add('hot'); });
  document.addEventListener('mouseout',  e=>{ if(e.target.closest(hotSel)) cursor.classList.remove('hot'); });
  document.querySelectorAll('.mag').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX-(r.left+r.width/2))*0.28}px,${(e.clientY-(r.top+r.height/2))*0.34}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });

  // ============================================================
  //  SOUND — low rumble
  // ============================================================
  const soundBtn = document.getElementById('sound');
  let actx, on=false, nodes=[];
  function buildAudio(){
    actx = new (window.AudioContext||window.webkitAudioContext)();
    const master = actx.createGain(); master.gain.value=0.0; master.connect(actx.destination);
    const buf = actx.createBuffer(1, actx.sampleRate*2, actx.sampleRate);
    const d = buf.getChannelData(0); let last=0;
    for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.2; }
    const src = actx.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=160;
    src.connect(lp); lp.connect(master); src.start();
    const lfo=actx.createOscillator(); lfo.frequency.value=0.08;
    const lfoG=actx.createGain(); lfoG.gain.value=0.04; lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start();
    nodes=[master];
  }
  soundBtn.addEventListener('click', ()=>{
    if(!actx){ buildAudio(); }
    if(actx.state==='suspended') actx.resume();
    on=!on;
    soundBtn.classList.toggle('on', on);
    soundBtn.querySelector('.lbl').textContent = on? 'Sound On':'Sound';
    nodes[0].gain.linearRampToValueAtTime(on?0.12:0.0, actx.currentTime+0.6);
  });

  onScroll();
})();

// ============================================================
//  RAYSONS — cinematic sound layer (shared: index + about)
//  Ambient foundry bed + per-scene stings + UI whoosh, gated
//  behind a remembered on/off toggle. Autoplay-policy safe:
//  audio only starts after the first user gesture. Ships SILENT
//  and error-free until the audio files exist in /audio.
//
//  Drop these in raysons-scrollyteller/audio/  (mp3, ~96–128kbps):
//    foundry-bed.mp3   — seamless loop, low furnace rumble/ambience
//    s0.mp3 … s7.mp3   — one short sting per scene (index acts 0–7)
//    click.mp3         — the reassembly snap
//    whoosh.mp3        — page-transition curtain
// ============================================================
(function(){
  const KEY = 'raysons-sound';
  let on = localStorage.getItem(KEY); on = (on === null) ? true : (on === '1');
  let armed = false;

  // ---- audio store (fails silently if a file is missing) ----
  const A = {};
  function load(name, src, loop, vol){
    try{
      const a = new Audio(src); a.loop = !!loop; a.preload = 'auto';
      a.volume = (vol == null ? 1 : vol);
      a.addEventListener('error', ()=>{ A[name] = null; }, { once:true });
      A[name] = a;
    }catch(e){ A[name] = null; }
  }
  load('bed', 'audio/foundry-bed.mp3', true, 0);
  load('click', 'audio/click.mp3', false, 0.55);
  load('whoosh', 'audio/whoosh.mp3', false, 0.5);
  for(let i=0;i<8;i++) load('s'+i, 'audio/s'+i+'.mp3', false, 0.5);

  function fadeTo(a, target, ms){
    if(!a) return; const start = a.volume, t0 = performance.now();
    (function step(t){ const k = Math.min(1, (t-t0)/ms); a.volume = start + (target-start)*k; if(k<1) requestAnimationFrame(step); })(t0);
  }
  function startBed(){ const b = A.bed; if(!b || !on) return; b.play().then(()=> fadeTo(b, 0.32, 1400)).catch(()=>{}); }
  function play(name){ if(!on) return; const a = A[name]; if(!a) return; try{ const c = a.cloneNode(); c.volume = a.volume; c.play().catch(()=>{}); }catch(e){} }

  // ---- toggle UI (self-contained) ----
  const css = `
  .snd{position:fixed;left:clamp(16px,3vw,34px);bottom:clamp(16px,3vw,30px);z-index:60;display:inline-flex;align-items:center;gap:9px;cursor:pointer;
    font-family:var(--mono,monospace);font-size:10px;letter-spacing:.2em;color:var(--ink-dim,#9a8e80);text-transform:uppercase;
    background:rgba(10,7,5,.42);border:1px solid var(--line,rgba(244,236,226,.1));padding:8px 13px;border-radius:40px;backdrop-filter:blur(6px);transition:color .3s,border-color .3s}
  .snd:hover{color:var(--ink,#f4ece2);border-color:var(--line-strong,rgba(244,236,226,.22))}
  .snd .eq{display:flex;align-items:flex-end;gap:2px;height:11px}
  .snd .eq i{width:2px;height:30%;background:currentColor;transition:height .2s}
  .snd.on .eq i{animation:sndeq 1s ease-in-out infinite}
  .snd.on .eq i:nth-child(2){animation-delay:.2s}.snd.on .eq i:nth-child(3){animation-delay:.4s}.snd.on .eq i:nth-child(4){animation-delay:.1s}
  @keyframes sndeq{0%,100%{height:25%}50%{height:100%}}
  @media(prefers-reduced-motion:reduce){.snd.on .eq i{animation:none;height:60%}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('button');
  btn.className = 'snd' + (on ? ' on' : '');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.setAttribute('aria-label', 'Toggle sound');
  btn.innerHTML = '<span class="eq"><i></i><i></i><i></i><i></i></span><span class="lbl">Sound</span>';
  addEventListener('DOMContentLoaded', ()=> document.body.appendChild(btn));
  if(document.body) document.body.appendChild(btn);

  btn.addEventListener('click', ()=>{
    on = !on; localStorage.setItem(KEY, on ? '1':'0');
    btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on?'true':'false');
    if(on){ armed = true; startBed(); } else { if(A.bed) fadeTo(A.bed, 0, 400); }
  });

  // ---- arm audio on first gesture (browser autoplay policy) ----
  function arm(){ if(armed) return; armed = true; if(on) startBed(); }
  ['pointerdown','keydown','wheel','touchstart'].forEach(e => addEventListener(e, arm, { once:true, passive:true }));

  // ---- per-scene stings: watch which .act / .fact gains .on ----
  const sceneRoot = document.getElementById('acts') || document.querySelector('.film__overlays');
  if(sceneRoot){
    const items = () => Array.from(sceneRoot.children.length ? sceneRoot.querySelectorAll('.act,.fact') : []);
    let last = -1;
    const mo = new MutationObserver(()=>{
      const list = Array.from(sceneRoot.querySelectorAll('.act,.fact'));
      const i = list.findIndex(el => el.classList.contains('on'));
      if(i >= 0 && i !== last){ last = i; play('s'+i); }
    });
    mo.observe(sceneRoot, { subtree:true, attributes:true, attributeFilter:['class'] });
  }

  // ---- page-transition whoosh (premium.js adds .ptrans.cover) ----
  const ptObserver = new MutationObserver(()=>{
    const pt = document.querySelector('.ptrans');
    if(pt && pt.classList.contains('cover')) play('whoosh');
  });
  addEventListener('DOMContentLoaded', ()=>{ const pt = document.querySelector('.ptrans'); if(pt) ptObserver.observe(pt, { attributes:true, attributeFilter:['class'] }); });
})();

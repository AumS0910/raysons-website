// ============================================================
//  RAYSONS — About film engine (sticky-canvas scrollyteller)
//  Same "scroll scrubs a fixed film" feel as index, but the film
//  is the building stills: ken-burns + cross-dissolve as you
//  scroll, with text "facts" floating over each beat. Drop the
//  4 image-to-video clips into FRAMES later → true scrubbed film.
// ============================================================
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('stage');
  const film = document.querySelector('.film');
  if(!canvas || !film) return;
  const ctx = canvas.getContext('2d');
  const facts = Array.from(document.querySelectorAll('.fact'));

  // hero ties to index (the pour), then the four buildings
  const SRC = [
    'valve/pour-poster.jpg',
    'images/raysons-sandchem.png',
    'images/raysons-real-estate-retail.png',
    'images/regenta-place.png',
    'images/raysons-shellcast.png'
  ];
  const imgs = SRC.map(s => { const i = new Image(); i.src = s; return i; });
  const N = SRC.length;
  const GRADE = REDUCED ? '' : 'brightness(.84) contrast(1.1) saturate(1.18) sepia(.16) hue-rotate(-6deg)';

  function size(){ const dpr = Math.min(devicePixelRatio||1, 2); canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr; }
  size(); addEventListener('resize', size);

  function cover(img, scale){
    if(!img || !img.complete || !img.naturalWidth) return false;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw/img.naturalWidth, ch/img.naturalHeight) * scale;
    const w = img.naturalWidth*s, h = img.naturalHeight*s;
    ctx.drawImage(img, (cw-w)/2, (ch-h)/2, w, h);
    return true;
  }

  const countEl = document.querySelector('.film__count b');
  let lastSeg = -1;
  function render(p){
    const t = p * N;
    const seg = Math.min(N-1, Math.floor(t));
    const local = t - seg;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.filter = GRADE;
    const scale = 1.02 + local*0.08;                 // ken-burns push
    const fade  = local < 0.20 ? local/0.20 : 1;     // cross-dissolve from previous
    if(seg > 0 && fade < 1){ ctx.globalAlpha = 1; cover(imgs[seg-1], 1.10); }
    ctx.globalAlpha = (seg > 0) ? fade : 1;
    cover(imgs[seg], scale);
    ctx.globalAlpha = 1; ctx.filter = 'none';

    if(seg !== lastSeg){ facts.forEach((f,i)=> f.classList.toggle('on', i===seg)); if(countEl) countEl.textContent = String(seg+1).padStart(2,'0'); lastSeg = seg; }
    if(!REDUCED){
      const f = facts[seg];
      if(f){
        f.style.transform = 'translate3d(0,'+(local*-64).toFixed(1)+'px,0)';
        // hero (seg 0) only exits; the rest fade in + out at the beat edges
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

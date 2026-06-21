// ============================================================
//  RAYSONS — premium interaction layer (shared: index + about)
//  Reactive custom cursor + magnetic buttons. Self-contained:
//  injects its own CSS + DOM. Bails on touch; respects
//  prefers-reduced-motion (cursor stays, magnetic pull off).
// ============================================================
(function(){
  if (matchMedia('(pointer:coarse)').matches) return;   // touch → native cursor
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- inject styles ----
  const css = `
  html.pc-on, html.pc-on *{cursor:none !important}
  .pcursor{position:fixed;top:0;left:0;z-index:9999;pointer-events:none;mix-blend-mode:difference;will-change:transform}
  .pcursor__ring{position:absolute;width:34px;height:34px;border:1px solid #fff;border-radius:50%;
    transform:translate(-50%,-50%);transition:width .28s cubic-bezier(.2,.7,.2,1),height .28s cubic-bezier(.2,.7,.2,1),background .28s;
    display:flex;align-items:center;justify-content:center}
  .pcursor__dot{position:absolute;width:5px;height:5px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);transition:opacity .2s}
  .pcursor__label{font-family:var(--mono,'Space Mono',monospace);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#fff;opacity:0;transition:opacity .2s}
  .pcursor.is-hot .pcursor__ring{width:62px;height:62px;background:rgba(255,255,255,.10)}
  .pcursor.is-hot .pcursor__dot{opacity:0}
  .pcursor.is-hot .pcursor__label{opacity:1}
  [data-magnetic],.mag,.nav-links a,.cta-quote{will-change:transform}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  document.documentElement.classList.add('pc-on');

  // ---- cursor DOM ----
  const cur = document.createElement('div'); cur.className = 'pcursor';
  cur.innerHTML = '<span class="pcursor__ring"><span class="pcursor__label"></span></span><span class="pcursor__dot"></span>';
  document.body.appendChild(cur);
  const ring = cur.querySelector('.pcursor__ring');
  const dot  = cur.querySelector('.pcursor__dot');
  const label= cur.querySelector('.pcursor__label');

  let mx = innerWidth/2, my = innerHeight/2;     // target
  let rx = mx, ry = my;                            // ring (lagged)
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive:true });
  addEventListener('mouseleave', ()=> cur.style.opacity = '0');
  addEventListener('mouseenter', ()=> cur.style.opacity = '1');

  function loop(){
    requestAnimationFrame(loop);
    rx += (mx - rx) * (REDUCED ? 1 : 0.18);
    ry += (my - ry) * (REDUCED ? 1 : 0.18);
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    dot.style.transform  = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  }
  requestAnimationFrame(loop);

  // ---- hover state (grow + label) over interactives ----
  const HOT = 'a, button, [data-cursor], .mag, summary, .chips span';
  document.addEventListener('mouseover', e => {
    const el = e.target.closest(HOT); if(!el) return;
    cur.classList.add('is-hot');
    label.textContent = el.getAttribute('data-cursor') || (el.matches('.mag,.cta-quote') ? 'Enquire' : 'View');
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest(HOT) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOT))){
      cur.classList.remove('is-hot'); label.textContent = '';
    }
  });

  // ---- magnetic pull (CTAs + nav links) ----
  if(!REDUCED){
    const mags = Array.from(document.querySelectorAll('[data-magnetic], .mag, .cta-quote, .nav-links a'));
    const R = 90;          // activation radius beyond the element box
    addEventListener('mousemove', e => {
      for(const el of mags){
        const b = el.getBoundingClientRect();
        const cx = b.left + b.width/2, cy = b.top + b.height/2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const reach = Math.max(b.width, b.height)/2 + R;
        if(dist < reach){
          const pull = (1 - dist/reach) * 0.4;
          el.style.transform = `translate(${dx*pull}px, ${dy*pull}px)`;
        } else if(el.style.transform){
          el.style.transform = '';
        }
      }
    }, { passive:true });
  }
})();

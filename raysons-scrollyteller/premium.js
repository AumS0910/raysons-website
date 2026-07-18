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
  [data-magnetic],.mag,.nav-links a,.cta-quote{will-change:transform}
  /* split-text word reveal */
  [data-split]{}
  .psplit__w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.14em;margin-bottom:-.14em}
  .psplit__i{display:inline-block;transform:translateY(115%);transition:transform 1s cubic-bezier(.2,.7,.2,1)}
  .psplit.in .psplit__i{transform:none}
  /* molten page-transition curtain */
  .ptrans{position:fixed;inset:0;z-index:9998;pointer-events:none;transform:translateY(101%);
    background:linear-gradient(0deg,var(--molten-deep,#c2300a),var(--molten,#ff6a1a) 58%,var(--molten-hot,#ffb24a));
    transition:transform .55s cubic-bezier(.7,0,.25,1)}
  .ptrans.cover{transform:translateY(0)}`;
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
    label.textContent = el.getAttribute('data-cursor')
      || (el.matches('.mag,.cta-quote,.btn--fill,.eq-submit') ? 'Enquire' : 'View');
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest(HOT) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOT))){
      cur.classList.remove('is-hot'); label.textContent = '';
    }
  });

  // ---- magnetic pull (CTAs + nav links) ----
  if(!REDUCED){
    const mags = Array.from(document.querySelectorAll('[data-magnetic], .mag, .cta-quote, .nav-links a, .btn--fill, .eq-submit, .finale-next, .bracket-next'));
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

  // ---- SPLIT-TEXT word reveal (per-word mask rise; preserves inline <em>) ----
  function splitReveal(){
    document.querySelectorAll('[data-split]').forEach(el => {
      if(el.dataset.splitDone) return; el.dataset.splitDone = '1';
      const nodes = Array.from(el.childNodes);
      el.innerHTML = ''; el.classList.add('psplit');
      let wi = 0;
      nodes.forEach(node => {
        if(node.nodeType === 3){                       // text → split into words
          node.textContent.split(/(\s+)/).forEach(tok => {
            if(tok === '') return;
            if(/^\s+$/.test(tok)){ el.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'psplit__w';
            const i = document.createElement('span'); i.className = 'psplit__i';
            i.textContent = tok; i.style.transitionDelay = (wi++ * 0.045) + 's';
            w.appendChild(i); el.appendChild(w);
          });
        } else if(node.nodeName === 'BR'){
          el.appendChild(document.createElement('br'));
        } else {                                        // element (e.g. <em>) → one unit
          const w = document.createElement('span'); w.className = 'psplit__w';
          const i = document.createElement('span'); i.className = 'psplit__i';
          i.appendChild(node.cloneNode(true)); i.style.transitionDelay = (wi++ * 0.045) + 's';
          w.appendChild(i); el.appendChild(w);
        }
      });
    });
    const all = document.querySelectorAll('.psplit');
    if(REDUCED || !('IntersectionObserver' in window)){ all.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.1 });
    all.forEach(e => io.observe(e));
    // safety: never leave a split heading permanently hidden
    setTimeout(() => all.forEach(e => { const r = e.getBoundingClientRect(); if(r.top < innerHeight && r.bottom > 0) e.classList.add('in'); }), 1200);
  }
  if(document.readyState !== 'loading') splitReveal();
  else document.addEventListener('DOMContentLoaded', splitReveal);

  // ---- MOLTEN PAGE-TRANSITION (leave wipe; the enter is each page's loader) ----
  const pt = document.createElement('div'); pt.className = 'ptrans'; document.body.appendChild(pt);
  document.addEventListener('click', e => {
    // nav-transition.js listens on CAPTURE and owns internal navigation (it types the
    // destination and handles the finale handoff). Without this guard BOTH curtains fired
    // and scheduled their own navigation — two transitions stacked on every link.
    if(e.defaultPrevented) return;
    const a = e.target.closest('a'); if(!a) return;
    const href = a.getAttribute('href'); if(!href) return;
    if(a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    if(/^(https?:|mailto:|tel:|#)/.test(href) || !/\.html(\?|#|$)/.test(href)) return;  // only internal .html
    e.preventDefault();
    if(REDUCED){ location.href = href; return; }
    pt.classList.add('cover');
    setTimeout(() => { location.href = href; }, 560);
  });
})();

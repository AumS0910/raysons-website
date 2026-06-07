/**
 * about-story.js — "The Raysons Story": a buttery, F1-feature-style scroll
 * journey for the About page. Loaded only on about.html.
 *
 * The butter: a single LERPED scroll value (`sy`) chases the real scroll each
 * frame; every animation is driven from that damped value, never from raw
 * scroll — so nothing ever jitters. (This is what Cartier / the F1 feature do.)
 *
 * Bulletproof: if JS doesn't run or reduced-motion is on, the markup degrades
 * to a clean, fully-visible stacked gallery (CSS default). We only switch on
 * the pinned cinematic mode here.
 */
(function () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const story = document.querySelector('.story');
  if (!story) return;

  const scroll = story.querySelector('.story__scroll');
  const stage = story.querySelector('.story__stage');
  const specimens = [...story.querySelectorAll('.story__specimen')];
  const fill = story.querySelector('.story__progress-fill');
  const countEl = story.querySelector('.story__count');
  const N = specimens.length;
  if (!scroll || !stage || !N) return;
  if (REDUCED) return;   // reduced-motion → accessible stacked gallery (CSS default)

  // F1 history carousel: full-screen slides laid in a row; vertical scroll
  // drives a HORIZONTAL slide (one centred at a time, neighbours off-screen,
  // slide-out-left / slide-in-right). NOT a cross-fade.
  const rail = document.createElement('div'); rail.className = 'story__rail';
  specimens.forEach(s => rail.appendChild(s));
  stage.appendChild(rail);

  story.classList.add('is-pinned');
  // extra 60vh at the end = the diagonal "riser" where building 4 exits up-left
  const setHeights = () => { scroll.style.height = (N * 100 + 60) + 'vh'; };
  setHeights();
  addEventListener('resize', setHeights);

  let sy = scrollY, target = scrollY, mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });
  addEventListener('mousemove', (e) => {
    tmx = e.clientX / innerWidth - 0.5;
    tmy = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  let lastActive = -1;

  function frame() {
    requestAnimationFrame(frame);
    sy += (target - sy) * 0.11;                 // ← buttery damp
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;

    const rect = scroll.getBoundingClientRect();
    const total = scroll.offsetHeight - innerHeight;
    const scrolled = clamp(sy - (rect.top + scrollY), 0, total);
    const riserPx = innerHeight * 0.6;
    const carTotal = Math.max(1, total - riserPx);
    const pc = clamp(scrolled, 0, carTotal) / carTotal;   // carousel progress (horizontal)
    const fp = pc * (N - 1);                               // 0 .. N-1
    const riser = clamp((scrolled - carTotal) / riserPx, 0, 1);  // 0→1 the diagonal exit

    // horizontal slide + (at the end) building 4 exits UP-LEFT on the diagonal
    rail.style.transform = `translate3d(${(-fp * innerWidth - riser * innerWidth * 0.62).toFixed(1)}px, ${(-riser * innerHeight * 0.55).toFixed(1)}px, 0)`;
    rail.style.opacity = clamp(1 - riser * 1.25, 0, 1).toFixed(3);
    const active = clamp(Math.round(fp), 0, N - 1);

    specimens.forEach((sp, i) => {
      const d = fp - i;                          // 0 when this slide is centred
      const e = clamp(1 - Math.abs(d), 0, 1);
      const build = sp.querySelector('.story__build');
      if (build) {
        const tiltY = mx * 18 * e, tiltX = -my * 11 * e;   // stronger tilt-to-cursor (interactive)
        build.style.transform =
          `perspective(1200px) translateX(${(d * 7).toFixed(2)}vw) ` +     // depth parallax within slide
          `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) ` +
          `scale(${(0.92 + 0.08 * e).toFixed(3)})`;
        // cut-out float: drop-shadow grounds it on the background
        build.style.filter = `drop-shadow(0 30px 42px rgba(0,0,0,.5)) brightness(${(0.88 + 0.12 * e).toFixed(2)})`;
      }
      const txt = sp.querySelector('.story__text');
      if (txt) {
        txt.style.opacity = clamp(1 - Math.abs(d) * 1.4, 0, 1).toFixed(3);
        txt.style.transform = `translateX(${(d * -3).toFixed(2)}vw)`;       // text drifts a touch slower
      }
    });

    if (fill) fill.style.transform = `scaleX(${pc.toFixed(4)})`;
    if (active !== lastActive) {
      lastActive = active;
      if (countEl) countEl.textContent =
        String(active + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    }
  }
  requestAnimationFrame(frame);
})();


/* ── Certificates — F1 "history of cars" horizontal traverse ──
   The standards scroll past one-at-a-time (like the buildings), with a big
   active-code watermark + molten rail. Bulletproof: no-JS/reduced → grid. */
(function certificatesTraverse(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sec = document.querySelector('.about-us__standards');
  if (!sec) return;
  const track = sec.querySelector('.about-us__standards-grid');
  const items = [...sec.querySelectorAll('.about-us__standard')];
  if (!track || items.length < 3 || REDUCED) return;

  const stage = document.createElement('div'); stage.className = 'htrav__stage';
  while (sec.firstChild) stage.appendChild(sec.firstChild);
  sec.appendChild(stage);
  const code = el => (el.querySelector('span')?.textContent || '').split(/[\s/]/)[0];
  const big = document.createElement('div'); big.className = 'htrav__big'; big.setAttribute('aria-hidden','true');
  big.textContent = code(items[0]); stage.insertBefore(big, stage.firstChild);
  const rail = document.createElement('div'); rail.className = 'htrav__rail';
  const fill = document.createElement('span'); fill.className = 'htrav__rail-fill';
  rail.appendChild(fill); stage.appendChild(rail);

  sec.classList.add('is-htrav');
  const setH = () => { sec.style.height = (items.length * 44) + 'vh'; };
  setH(); addEventListener('resize', setH);

  let sy = scrollY, target = scrollY;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });
  const clamp = (v,a,b) => Math.min(Math.max(v,a),b); let lastA = -1;
  function frame(){
    requestAnimationFrame(frame);
    sy += (target - sy) * 0.11;
    const rect = sec.getBoundingClientRect(); const total = sec.offsetHeight - innerHeight;
    const secDocTop = rect.top + scrollY;
    stage.style.top = clamp(scrollY - secDocTop, 0, total).toFixed(1) + 'px';   // JS pin (real scroll → glued)
    const scrolled = clamp(sy - secDocTop, 0, total);
    const p = total > 0 ? scrolled / total : 0;
    const itemW = items[0].offsetWidth || 360;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 32;
    const fp = p * (items.length - 1);
    track.style.transform = `translate3d(${(innerWidth/2 - itemW/2 - fp*(itemW+gap)).toFixed(1)}px,0,0)`;
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    const a = clamp(Math.round(fp), 0, items.length-1);
    if (a !== lastA){ lastA = a; items.forEach((it,i)=>it.classList.toggle('is-active',i===a)); big.textContent = code(items[a]); }
  }
  requestAnimationFrame(frame);
})();

/* ── Mission · Vision · Values — HORIZONTAL scroll-jack ──
   You scroll DOWN; the cards travel sideways (one centred at a time). Cards
   keep their box look (wrapped in .mvv__box). JS-pinned (sticky is broken in
   .about-us__inner) + full-bleed. Bulletproof: no-JS/reduced → stacked cards. */
(function mvvHorizontal(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mvv = document.querySelector('.mvv');
  if (!mvv) return;
  const cards = [...mvv.querySelectorAll('.mvv__card')];
  if (cards.length < 2 || REDUCED) return;
  const head = document.querySelector('.about-us__section-head--mvv');
  cards.forEach(c => c.classList.remove('film-reveal'));   // free our inline opacity/transform from V1's !important

  cards.forEach(c => { const box = document.createElement('div'); box.className = 'mvv__box';
    while (c.firstChild) box.appendChild(c.firstChild); c.appendChild(box); });

  const wrap = document.createElement('div'); wrap.className = 'mvv-sec';
  (head || mvv).parentNode.insertBefore(wrap, head || mvv);
  const stage = document.createElement('div'); stage.className = 'mvv-stage';
  if (head) stage.appendChild(head);
  stage.appendChild(mvv);
  const bar = document.createElement('div'); bar.className = 'htrav__rail';
  const fill = document.createElement('span'); fill.className = 'htrav__rail-fill'; bar.appendChild(fill); stage.appendChild(bar);
  wrap.appendChild(stage);
  mvv.classList.add('is-mvvrail');
  const setH = () => { wrap.style.height = (cards.length * 100) + 'vh'; };
  setH(); addEventListener('resize', setH);

  let sy = scrollY, target = scrollY;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });
  const clamp = (v,a,b) => Math.min(Math.max(v,a),b); let lastA = -1;
  function frame(){
    requestAnimationFrame(frame);
    sy += (target - sy) * 0.11;
    const rect = wrap.getBoundingClientRect(); const total = wrap.offsetHeight - innerHeight;
    const docTop = rect.top + scrollY;
    stage.style.top = clamp(scrollY - docTop, 0, total).toFixed(1) + 'px';   // JS pin
    const scrolled = clamp(sy - docTop, 0, total); const p = total > 0 ? scrolled / total : 0;
    const fp = p * (cards.length - 1);
    mvv.style.transform = `translate3d(${(-fp * innerWidth).toFixed(1)}px,0,0)`;   // travel right
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    const a = clamp(Math.round(fp), 0, cards.length - 1);
    cards.forEach((c,i) => { const d = fp - i, e = clamp(1 - Math.abs(d), 0, 1);
      c.classList.toggle('is-active', i === a);
      const box = c.querySelector('.mvv__box');
      if (box){ box.style.opacity = clamp(0.25 + 0.75*e, 0, 1).toFixed(3);
        box.style.transform = `translateX(${(d * 4).toFixed(2)}vw) scale(${(0.92 + 0.08*e).toFixed(3)})`; } });
    if (a !== lastA) lastA = a;
  }
  requestAnimationFrame(frame);
})();

/* ── The Journey (Growth & Innovation) — DIAGONAL scroll-jack (slanting) ──
   You scroll DOWN; the years travel along a DIAGONAL (down-right), one centred
   at a time — the scroll itself slants. JS-pinned + full-bleed. Bulletproof. */
(function diagonalYears(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tl = document.querySelector('.timeline');
  if (!tl) return;
  const inner = tl.querySelector('.timeline__inner');
  const orig = [...tl.querySelectorAll('.timeline__item')];
  if (!inner || orig.length < 2) return;
  if (REDUCED) return;   // leave V1's plain list visible

  // V1 owns .timeline__item (.film-reveal + transform:none!important, re-asserted
  // each frame). So MOVE the content into our own clean elements V1 can't touch.
  const track = document.createElement('div'); track.className = 'rx-tl-track'; inner.appendChild(track);
  const items = orig.map(it => {
    const el = document.createElement('div'); el.className = 'rx-tl-item';
    while (it.firstChild) el.appendChild(it.firstChild);   // move year/content across
    track.appendChild(el); it.remove();                    // drop the V1 item
    return el;
  });
  const bar = document.createElement('div'); bar.className = 'timeline__rail';
  const fill = document.createElement('span'); fill.className = 'timeline__rail-fill'; bar.appendChild(fill); inner.appendChild(bar);

  tl.classList.add('is-diag');
  const setH = () => { tl.style.height = (items.length * 75) + 'vh'; };
  setH(); addEventListener('resize', setH);

  let sy = scrollY, target = scrollY;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });
  const clamp = (v,a,b) => Math.min(Math.max(v,a),b); let lastA = -1;
  function frame(){
    requestAnimationFrame(frame);
    sy += (target - sy) * 0.11;
    const rect = tl.getBoundingClientRect(); const total = tl.offsetHeight - innerHeight;
    const docTop = rect.top + scrollY;
    inner.style.top = clamp(scrollY - docTop, 0, total).toFixed(1) + 'px';   // JS pin
    const scrolled = clamp(sy - docTop, 0, total); const p = total > 0 ? scrolled / total : 0;
    const fp = p * (items.length - 1);
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    const stepX = innerWidth * 0.66, stepY = innerHeight * 0.5;   // one diagonal step = down + right
    const a = clamp(Math.round(fp), 0, items.length - 1);
    items.forEach((it,i) => { const d = i - fp, e = clamp(1 - Math.abs(d), 0, 1);
      it.classList.toggle('is-active', i === a);
      // travel is diagonal, but the text stays upright (no rotate)
      it.style.transform = `translate(-50%,-50%) translate(${(d*stepX).toFixed(1)}px, ${(d*stepY).toFixed(1)}px)`;
      it.style.opacity = clamp(0.12 + 0.88*e, 0, 1).toFixed(3); });
    lastA = a;
  }
  requestAnimationFrame(frame);
})();




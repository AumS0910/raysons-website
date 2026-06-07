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
(function unifiedStaircase () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const story = document.querySelector('.story');
  if (!story) return;
  const scroll = story.querySelector('.story__scroll');
  const stage = story.querySelector('.story__stage');
  const builds = [...story.querySelectorAll('.story__specimen')];
  const mvv = document.querySelector('.mvv');
  const cards = mvv ? [...mvv.querySelectorAll('.mvv__card')] : [];
  const fill = story.querySelector('.story__progress-fill');
  const countEl = story.querySelector('.story__count');
  if (!scroll || !stage || !builds.length) return;
  if (REDUCED) return;   // fallback: sections stay stacked (CSS default)

  // ONE carousel: buildings (row 0) + Mission cards (row 1, one step down).
  // Scroll moves the camera RIGHT through buildings, takes ONE diagonal step
  // DOWN-right from building 4 into Mission, then RIGHT through Mission.  --\--
  cards.forEach(c => {
    c.classList.remove('film-reveal');
    if (!c.querySelector('.mvv__box')) {
      const box = document.createElement('div'); box.className = 'mvv__box';
      while (c.firstChild) box.appendChild(c.firstChild); c.appendChild(box);
    }
  });
  const track = document.createElement('div'); track.className = 'story__track';
  builds.forEach(b => track.appendChild(b));
  cards.forEach(c => track.appendChild(c));
  stage.appendChild(track);
  // Mission now lives in this carousel → hide the old empty container, but KEEP
  // its heading: move it into the stage and fade it in over the Mission stops.
  if (mvv) mvv.style.display = 'none';
  const mvvHead = document.querySelector('.about-us__section-head--mvv');
  if (mvvHead){ mvvHead.classList.add('rx-mvv-head'); stage.appendChild(mvvHead); }

  const items = [...builds, ...cards];   // 0..b-1 buildings, then Mission
  const B = builds.length, stops = items.length;
  items.forEach(it => it.classList.add('rx-stop'));

  const layout = () => {
    const W = innerWidth, H = innerHeight;
    items.forEach((it, k) => {
      const slotX = k * W, slotY = (k >= B) ? H : 0;   // Mission sits one row down
      it.style.left = '50%'; it.style.top = '50%';
      it.style.transform = `translate(-50%,-50%) translate(${slotX}px, ${slotY}px)`;
    });
  };
  layout(); addEventListener('resize', layout);

  story.classList.add('is-unified');
  const setH = () => { scroll.style.height = (stops * 100) + 'vh'; };
  setH(); addEventListener('resize', setH);

  let sy = scrollY, target = scrollY;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  let lastA = -1;

  function frame () {
    requestAnimationFrame(frame);
    sy += (target - sy) * 0.11;                  // buttery damp
    const rect = scroll.getBoundingClientRect();
    const total = scroll.offsetHeight - innerHeight;
    const docTop = rect.top + scrollY;
    stage.style.top = clamp(scrollY - docTop, 0, total).toFixed(1) + 'px';   // JS pin
    const p = total > 0 ? clamp(sy - docTop, 0, total) / total : 0;
    const t = p * (stops - 1);                   // camera position along the path (0..stops-1)
    const W = innerWidth, H = innerHeight;
    const camX = t * W;                          // always travelling right
    const camY = clamp(t - (B - 1), 0, 1) * H;   // ONE step down: building 4 → Mission (the \)
    track.style.transform = `translate3d(${(-camX).toFixed(1)}px, ${(-camY).toFixed(1)}px, 0)`;
    if (mvvHead) mvvHead.style.opacity = clamp(t - (B - 1), 0, 1).toFixed(2);  // heading fades in at Mission
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    const a = clamp(Math.round(t), 0, stops - 1);
    if (a !== lastA) {
      lastA = a;
      if (countEl) countEl.textContent = a < B
        ? String(a + 1).padStart(2, '0') + ' / ' + String(B).padStart(2, '0')
        : 'Purpose';
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




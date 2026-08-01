// ============================================================
//  RAYSONS — seamless flow (SPA router)
//  Turns the five real pages into ONE continuous experience: an internal link
//  no longer reloads the browser. The next page is fetched, its <body> is swapped
//  in under a cross-document-style view transition, its scripts are re-run, and the
//  URL updates via History — so Overview → About → Foundry → Products → Enquire
//  flows with no white flash and no engine teardown blink. The navbar becomes a
//  fast-travel control rather than a set of page loads.
//
//  Progressive enhancement: no fetch / no History → links behave normally (full
//  navigation), so nothing is worse than today on any browser.
// ============================================================
(function () {
  if (!window.history || !window.fetch || !document.querySelector) return;

  // REAL filenames, real case — used to build fetch URLs. Vercel's Linux filesystem
  // is case-sensitive, so 'about us.html' would 404 in production while working on
  // Windows; compare case-insensitively but always FETCH the true name.
  const SEQ = ['index.html', 'About Us.html', 'foundry.html', 'products.html', 'enquire.html'];
  const fileOf = (url) => decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || 'index.html').toLowerCase();
  const orderOf = (url) => SEQ.findIndex((f) => f.toLowerCase() === fileOf(url));
  let navigating = false;

  // Re-run the scripts in a freshly-swapped <body>. Nodes inserted as HTML never
  // execute, so each <script> is rebuilt as a new element. Module scripts and the
  // importmap live in <head> (shared, already parsed), so only body scripts re-run.
  let nav = 0;
  function runScripts(scope) {
    const olds = Array.from(scope.querySelectorAll('script'));
    return olds.reduce((chain, old) => chain.then(() => new Promise((resolve) => {
      const s = document.createElement('script');
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      if (old.src) {
        // ONLY modules get the cache-bust. ES modules execute once per URL, so a module
        // <script> must get a fresh URL to re-run on a revisit — but classic scripts
        // re-execute on insert regardless and are served from cache, so busting THEM just
        // forced a needless re-download every hop (the lag). Classic scripts (and the
        // three.js addons a module imports) now stay cached; only the small module
        // entrypoint re-downloads.
        const isModule = (old.getAttribute('type') || '').toLowerCase() === 'module';
        const href = old.getAttribute('src');
        s.setAttribute('src', isModule ? href + (href.includes('?') ? '&' : '?') + 'spa=' + nav : href);
        s.onload = s.onerror = () => resolve();
      } else {
        s.textContent = old.textContent;
      }
      old.replaceWith(s);
      if (!old.src) resolve();
    })), Promise.resolve());
  }

  // page-specific stylesheets differ per page (about-cinema.css, foundry.css …).
  // Reconcile <head> links so the incoming page's CSS is present and the outgoing
  // page's page-only CSS is dropped — styles.css (shared) stays put.
  function reconcileHead(doc) {
    const want = new Map();
    doc.head.querySelectorAll('link[rel="stylesheet"]').forEach((l) => want.set(l.getAttribute('href'), l));
    const have = new Map();
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach((l) => have.set(l.getAttribute('href'), l));
    have.forEach((el, href) => { if (!want.has(href)) el.remove(); });
    want.forEach((el, href) => { if (!have.has(href)) document.head.appendChild(el.cloneNode(true)); });
  }

  async function go(url, push, landAtBottom) {
    if (navigating) return;
    navigating = true;
    nav++;
    try {
      const res = await fetch(url, { headers: { 'X-SPA': '1' } });
      if (!res.ok) throw new Error('bad status');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const swap = () => {
        reconcileHead(doc);
        document.title = doc.title;
        document.documentElement.className = doc.documentElement.className;
        document.body.replaceWith(doc.body);
        window.scrollTo(0, 0);
        if (push) history.pushState({ spa: true }, '', url);
      };

      if (document.startViewTransition) {
        await document.startViewTransition(swap).updateCallbackDone;
      } else {
        swap();
      }
      await runScripts(document.body);

      // Reverse entry lands at the BOTTOM of the previous page. Its height is set by
      // that page's own scroll engine (GSAP ScrollTrigger, canvas sizing) and grows
      // over several frames, so a fixed rAF is too early. Poll until the height stops
      // changing (or a ceiling), pinning to the bottom each tick so the view ends up at
      // the true end no matter when the engine finishes measuring.
      if (landAtBottom) {
        let last = -1, stable = 0, ticks = 0;
        const pin = () => {
          const h = document.documentElement.scrollHeight;
          window.scrollTo(0, h);
          stable = (h === last) ? stable + 1 : 0;
          last = h;
          if (stable < 4 && ticks++ < 90) requestAnimationFrame(pin);
        };
        requestAnimationFrame(pin);
      }
      // arm the prefetch for whatever comes next from the page we just landed on
      if ('requestIdleCallback' in window) requestIdleCallback(prefetchNext, { timeout: 3000 });
      else setTimeout(prefetchNext, 1200);
    } catch (e) {
      // any failure → hard navigate, never leave the user stranded
      location.href = url;
    } finally {
      navigating = false;
    }
  }

  // intercept internal .html links
  addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const raw = a.getAttribute('href') || '';
    if (!/\.html(\?|#|$)/i.test(raw)) return;
    let u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.host !== location.host) return;
    if (fileOf(u.href) === fileOf(location.href) && !u.hash) return;
    e.preventDefault();
    go(u.href, true);
  }, true);

  addEventListener('popstate', () => go(location.href, false));

  // PREFETCH the next page in sequence once the current one is idle, so the fetch on
  // auto-advance (or a nav click) is served from cache instead of a cold round-trip —
  // this is most of the felt lag on a slow connection.
  function prefetchNext() {
    const i = order();
    if (i < 0 || i >= SEQ.length - 1) return;
    const href = new URL(SEQ[i + 1], location.href).href;
    if (document.querySelector('link[data-prefetch="' + href + '"]')) return;
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = href; l.setAttribute('data-prefetch', href);
    document.head.appendChild(l);
  }
  if ('requestIdleCallback' in window) requestIdleCallback(prefetchNext, { timeout: 3000 });
  else setTimeout(prefetchNext, 1500);

  // ── AUTO-ADVANCE — the site is one continuous scroll, no clicking ──────────
  // At the bottom of a page, a little more downward intent flows into the NEXT page;
  // at the top, upward intent flows back into the END of the previous one. The five
  // documents read as a single uninterrupted scroll. Intent is accumulated past a
  // threshold so it never fires on a stray wheel tick or bounce, and only ever at the
  // very edges — normal scrolling in the middle of a page is untouched.
  const order = () => orderOf(location.href);
  const EDGE = 8, NEED = 380;          // px from edge to arm; wheel delta to commit
  let acc = 0, lastT = 0;

  function atBottom() { return innerHeight + Math.ceil(scrollY) >= document.documentElement.scrollHeight - EDGE; }
  function atTop() { return scrollY <= EDGE; }

  function intent(dy) {
    if (navigating) return;
    const now = performance.now();
    if (now - lastT > 400) acc = 0;    // reset if they paused — must be a continuous push
    lastT = now;
    const i = order();
    if (dy > 0 && atBottom() && i > -1 && i < SEQ.length - 1) {
      acc += dy;
      if (acc > NEED) { acc = 0; go(new URL(SEQ[i + 1], location.href).href, true, false); }
    } else if (dy < 0 && atTop() && i > 0) {
      acc += -dy;
      if (acc > NEED) { acc = 0; go(new URL(SEQ[i - 1], location.href).href, true, true); }
    } else {
      acc = 0;
    }
  }

  addEventListener('wheel', (e) => intent(e.deltaY), { passive: true });
  let ty = 0;
  addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { const y = e.touches[0].clientY; intent((ty - y) * 2.2); ty = y; }, { passive: true });
})();

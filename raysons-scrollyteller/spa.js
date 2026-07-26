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

  const SEQ = ['index.html', 'about us.html', 'foundry.html', 'products.html', 'enquire.html'];
  const fileOf = (url) => decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || 'index.html').toLowerCase();
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
        // ES modules execute ONCE per URL — a plain re-insert of a module <script>
        // does nothing on a revisit, so the page's engine would come back dead. A
        // per-navigation cache-bust query makes it a "new" module URL, forcing it to
        // re-run every time you return. (Classic scripts already re-run on insert.)
        const bust = (old.src.includes('?') ? '&' : '?') + 'spa=' + nav;
        s.setAttribute('src', old.getAttribute('src') + bust);
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

  async function go(url, push) {
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
})();

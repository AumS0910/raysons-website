// ============================================================
//  RAYSONS — exit transitions (shared across all four pages)
//  An internal page nav dips the viewport to ember-black — the SAME colour as the
//  loaders (#050302) — and types the destination name, so Overview / About / Foundry
//  / Enquire cut like scenes of one film and flow straight into the next page's title
//  card. Reduced-motion navigates instantly. No dependencies. Style in styles.css (.nav-xfade).
// ============================================================
// ── PRERENDER THE NEXT PAGE ──────────────────────────────────────────────────
// The dissolve was smooth but you still landed on a page that then had to BOOT —
// capture its clips, load its libraries, start its engine. That work happening
// after arrival is the last thing that reads as "a new page" rather than a cut.
//
// Speculation rules move it earlier: on hover or touch-start over a nav link the
// browser builds the whole destination in the background — scripts run, canvas
// boots, first frame paints — and the click simply reveals what is already alive.
// Combined with the view transition, that is how a multi-page site gets the feel
// people associate with a single-page app, without becoming one.
//
// "moderate" eagerness is deliberate: prerendering ALL five on load would run five
// WebGL engines at once. Hover is intent, and intent arrives early enough.
(function(){
  if(!HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
  const rules = {
    prerender: [{
      where: { and: [
        { href_matches: '/raysons-scrollyteller/*.html' },
        { not: { selector_matches: '[download], [target="_blank"]' } }
      ]},
      eagerness: 'moderate'
    }]
  };
  const s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify(rules);
  document.head.appendChild(s);
})();

(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // instant nav, no dip
  if(!document.body) return;

  // STAND DOWN where the browser can do this natively. Cross-document view
  // transitions (styles.css, @view-transition) hold the outgoing page's last
  // painted frame and dissolve it into the incoming one — no gap at all. This
  // curtain has to dip through black BECAUSE it cannot see the next page yet, so
  // running both would mean dipping to black and then cross-fading from black.
  // Firefox has no support today and still gets the wipe.
  if(CSS.supports('view-transition-name','none') && 'startViewTransition' in document) return;

  const NAMES = { 'index.html':'Overview', 'about us.html':'About',
                  'foundry.html':'Foundry', 'enquire.html':'Enquire' };
  const here = decodeURIComponent(location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const ov = document.createElement('div');
  ov.className = 'nav-xfade'; ov.setAttribute('aria-hidden','true');
  ov.innerHTML = '<span class="nav-xfade__k"></span>';
  const label = ov.querySelector('.nav-xfade__k');
  document.body.appendChild(ov);

  // back/forward restore (bfcache): make sure the curtain is lifted
  addEventListener('pageshow', ()=> ov.classList.remove('on'));

  let going = false;
  document.addEventListener('click', function(e){
    if(e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if(!a || a.target==='_blank' || a.hasAttribute('download')) return;
    const raw = a.getAttribute('href') || '';
    if(!/\.html(\?|#|$)/i.test(raw)) return;                     // only internal .html page links
    let u; try{ u = new URL(a.href, location.href); }catch(_){ return; }
    if(u.host !== location.host) return;                          // external → let it go
    const file = decodeURIComponent(u.pathname.split('/').pop() || '').toLowerCase();
    if(file === here && !u.search && !u.hash) return;             // same page, no state → normal
    e.preventDefault(); if(going) return; going = true;
    label.textContent = '→ ' + (NAMES[file] || file.replace(/\.html$/i,'')).toUpperCase();
    ov.classList.add('on');
    setTimeout(function(){ location.href = a.href; }, 460);       // dip, then cut
  }, true);
})();

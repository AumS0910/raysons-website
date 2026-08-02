// ============================================================
//  RAYSONS — theme toggle
//  The site is a dark film by design and opens that way; light is the visitor's choice and
//  it sticks. The state lives on <html data-theme>, NOT on a class, because the seamless
//  router (spa.js) assigns `document.documentElement.className` wholesale on every hop —
//  a theme stored as a class would be wiped the moment you navigated, and the site would
//  snap back to dark mid-journey. The attribute survives because nothing touches it.
//
//  The value is applied by a tiny boot script in each <head> BEFORE the stylesheet, so a
//  light-mode visitor never sees a black flash on load. This file only binds the button
//  and keeps its label honest; it re-runs on every router hop, so the bind is guarded.
// ============================================================
(function () {
  var root = document.documentElement;

  function label(t) {
    var b = document.getElementById('themeToggle');
    if (!b) return;
    b.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    b.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false');
  }

  function apply(t, persist) {
    if (t === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    if (persist) { try { localStorage.setItem('rc_theme', t); } catch (e) {} }
    label(t);
  }

  var btn = document.getElementById('themeToggle');
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      apply(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    });
  }
  // keep the label in sync with whatever the boot script already applied (and after a hop)
  label(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
})();

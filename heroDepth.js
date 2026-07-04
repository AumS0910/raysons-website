// ============================================================
//  HERO DEPTH — GSAP ScrollTrigger dolly + parallax over the
//  frames2 molten-pour sequence. Purely additive: it does NOT
//  touch the frame engine in main.js, and it deliberately targets
//  the INNER elements (#hero-canvas, #ember-canvas) plus #layer-heat
//  — the layers main.js does not already transform — so the two
//  systems never fight over the same `transform`.
//
//  Effect: as you scroll the pinned hero, the "camera" pushes into
//  the pour (scale + rotateX out of a tilt) while heat (back) and
//  embers (front) separate in depth.
// ============================================================
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initHeroDepth() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse)').matches || window.innerWidth < 981;
  if (reduce || isCoarse) return;

  const hero       = document.querySelector('.hero');
  const wrap       = document.getElementById('layer-canvas');  // centered by main.js (translateX-50%) — DO NOT animate transform
  const pour       = document.getElementById('hero-canvas');   // inner canvas — free for us
  const emberWrap  = document.getElementById('layer-embers');
  const emberCanvas= document.getElementById('ember-canvas');  // inner canvas — free for us
  const heat       = document.getElementById('layer-heat');     // main.js never transforms this
  if (!hero || !wrap || !pour) return;

  // Perspective lives on the wrappers (a separate CSS property from `transform`,
  // so it never clashes with main.js writing transform on the wrappers).
  gsap.set(wrap, { perspective: 1400 });
  if (emberWrap) gsap.set(emberWrap, { perspective: 1400 });

  gsap.set(pour, { transformOrigin: '50% 46%', willChange: 'transform', backfaceVisibility: 'hidden' });
  if (heat) gsap.set(heat, { transformOrigin: '50% 50%', willChange: 'transform' });
  if (emberCanvas) gsap.set(emberCanvas, { transformOrigin: '50% 60%', willChange: 'transform' });

  // One scrubbed timeline across the full hero travel. ease:'none' everywhere so
  // motion maps 1:1 to scroll; scrub adds the smooth "heavy camera" catch-up.
  const tl = gsap.timeline({
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
  });

  // Background heat: large + slow — the furthest plane.
  if (heat) tl.fromTo(heat, { scale: 1.04 }, { scale: 1.28, ease: 'none' }, 0);

  // The pour: dolly push-in (scale) tipping up out of a slight rotateX. Subtle Y
  // because main.js already parallaxes the wrap; this just adds volume on top.
  tl.fromTo(pour,
    { scale: 0.92, rotateX: 6, y: 14 },
    { scale: 1.16, rotateX: 0, y: -8, ease: 'none' }, 0);

  // Embers: nearest plane — biggest scale + rises fastest past the camera.
  if (emberCanvas) tl.fromTo(emberCanvas, { scale: 1.0, y: 0 }, { scale: 1.4, y: -80, ease: 'none' }, 0);

  // Layout settles after fonts/frames load — keep trigger math accurate.
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroDepth);
} else {
  initHeroDepth();
}

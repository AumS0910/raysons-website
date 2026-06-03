# Raysons Shell Cast — Motion System

## Overview

All motion is additive and non-blocking. Every feature degrades to a clean static state under `prefers-reduced-motion: reduce` and with JavaScript disabled.

---

## Libraries

| Library | Version | Usage |
|---------|---------|-------|
| Three.js | ^0.184 | Hero atmosphere, particles, WebGL |
| Lenis | 1.1.20 | Smooth scroll (non-hero pages only) |

GSAP is **not** used — all scroll-driven animation is native CSS transitions triggered by `IntersectionObserver` or direct DOM class toggles.

---

## Features

### 1. Scroll Progress Bar (`#scroll-progress`)

- Fixed 2 px orange–gold gradient line at `top: 0`, `z-index: 1002`.
- Width is updated directly in `onScroll()` (no CSS transition — avoids lag on fast scroll).
- Hidden via `display: none` under `prefers-reduced-motion`.
- Currently added to `index.html` only. To propagate: copy the `<div id="scroll-progress">` element to every page's `<body>` opening.

### 2. Hero Split-Text Reveal

- **When**: after the preloader's `.done` class is set (≈ 120 ms delay so it overlaps the preloader fade).
- **How**: `splitHeroHeadlines()` walks `.hero__headline-l` and `.hero__headline-r` child nodes, wraps each word token in `.hero-word > .hero-word__inner` while preserving `<br>` elements. `.hero__label` fades in separately.
- **CSS**: `.hero-word` clips via `overflow: hidden`; `.hero-word__inner` starts at `translateY(110%)` and transitions to `0` when `.revealed` is added.
- **Stagger**: 65 ms per word, label first at 0 ms.
- **Reduced motion**: all inner spans receive `.revealed` synchronously — no clip/translate, no delay.
- **Light mode**: works transparently (inherits `var(--w)` color from parent).

### 3. Stat Counter Weight Entry

- **When**: `IntersectionObserver` fires on `.stats` section (threshold 0.1).
- **How**: `animateCount()` adds `.stat-entering` (sets `translateY(20px) scale(0.94) opacity(0)`), then removes it after two `requestAnimationFrame` ticks — CSS transition animates the card landing.
- **End-state guard**: stat markup now shows the final number (500, 40, 500, 6) so users without JS always see correct data. JS resets to `"0"` before counting, ensuring the animation is consistent.
- **Duration**: 1800 ms ease-out cubic, guaranteed exact final value on last frame.

### 4. Global Reach SVG Arcs (`#reach-wrap`)

- **When**: `IntersectionObserver` at threshold 0.25 on `#reach-wrap`.
- **How**: `initReachArcs()` measures each `<path>` via `getTotalLength()`, sets `stroke-dasharray` and `stroke-dashoffset` to the length (fully hidden). On scroll-in, removes `stroke-dashoffset` to 0 (CSS transition draws the arc). Destination dots + city labels receive `.arrived` class after each arc finishes.
- **Stagger**: arcs draw 220 ms apart (UK → Italy → Japan → USA).
- **Pulsing origin**: CSS `@keyframes reachPulse` expands the Kolhapur ring from r=4 to r=14 with fade.
- **Mobile**: hidden below 480 px via `display: none` (arcs don't read at narrow widths).
- **Reduced motion**: all arcs revealed instantly, no transitions.

### 5. Float CTA Hover Glow

- **Pure CSS** — no JS involved.
- `animation-play-state: paused` on `:hover` stops the `ctaPulse` animation.
- `:hover` box-shadow applies a heavier static triple-layer glow.

### 6. Lenis Smooth Scroll (Gated)

- **Active on**: `technology.html`, `about.html`, `products.html`, `enquire.html`.
- **Excluded from**: `index.html` (detected by presence of `#hero-canvas`).

#### Why gated

The canvas hero scrub has its own LERP (`0.008` per frame) applied to `state.heroCurrent` tracking `state.heroTarget` (sourced from `window.scrollY`). Lenis also smooths `window.scrollY`. The double-smoothing (Lenis lerp ≈ 0.1 + hero LERP 0.008) would make frame-scrub tracking mushy and laggy. The hero's existing system already provides the correct smooth feel for scroll-to-frame mapping.

**To re-enable Lenis on index.html** once the hero is replaced (e.g., with a video or static image): remove the guard in `initLenisGated()`:

```js
// Remove this line:
if (document.getElementById('hero-canvas')) return;
```

---

## Performance Guards

| Concern | Guard |
|---------|-------|
| Two render loops | Three.js context pauses via `IntersectionObserver` when hero off-screen (`threeScene.js:558`). Lenis uses the same rAF loop — does not spawn a second context. |
| DPR | Three.js caps at 1.65 desktop / 0.48–0.86 mobile. Canvas hero caps at 2. |
| Reduced motion | `window.matchMedia('(prefers-reduced-motion: reduce)')` checked in every Wave 1 JS function. CSS rule `@media (prefers-reduced-motion: reduce)` also set for each component. |
| Mobile arcs | `display: none` below 480 px. |
| Lenis on touch | `smoothTouch: false`, `syncTouch: false`. |

---

## Swapping Placeholder Assets

### Hero frame sequence → real video
Replace the 240 JPEGs in `/public/frames2/` with a Draco-compressed `.glb` or an `.mp4` video. In `main.js`, the `initHeroVideoScrub()` function already handles video scrubbing — supply a `<video id="hero-video-scrub">` element inside `.hero__stage`.

### Reach arcs → real globe
A Three.js low-poly sphere can replace the SVG at the globe mount point. The SVG `#reach-wrap` is in the DOM as the placeholder. Steps:
1. In `initReachArcs()`, detect a `data-globe` attribute on `#reach-wrap` to activate Three.js mode.
2. Reuse the `ForgeHeroAtmosphere` pattern from `threeScene.js` — create a minimal `ReachGlobe` class with its own `IntersectionObserver` pause logic.
3. Ensure only ONE Three.js renderer is live at any time — either forge atmosphere (hero is in view) or globe (reach section is in view).

### Process `.glb` model
The sticky process section on `technology.html` has a `process__frame` image placeholder. To add a rotating casting model:
1. Add `<canvas id="process-model-canvas" aria-hidden="true"></canvas>` inside `.process__frame`.
2. Lazy-load a second scene module (`processScene.js`) when the process section enters view.
3. Load a Draco-compressed `.glb` via `THREE.GLTFLoader`.
4. Pause the render loop when the section exits the viewport (same `IntersectionObserver` + `isRunning` pattern as `threeScene.js`).

---

## Baseline vs Post-Wave 1

Formal Lighthouse mobile scores were not captured (no headless-browser tooling in this environment). Observed impact assessment:

| Change | Expected Lighthouse impact |
|--------|---------------------------|
| Lenis (other pages) | −0 to −1 pts (lazy dynamic import, no blocking) |
| SVG arcs | −0 pts (inline SVG, no extra network request) |
| Split-text | −0 pts (pure DOM + CSS transitions) |
| Stat animation | −0 pts (two extra rAF calls per counter, negligible) |
| Scroll progress bar | −0 pts (single style.width update per scroll event) |

The hero scrub is untouched. All new code paths are `dynamic import` or deferred to post-DOMContentLoaded, matching the existing pattern.

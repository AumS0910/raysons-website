const TOTAL = 240;
const FRAME_PATH = '/frames2/ezgif-frame-';
const CROP = 0.10;
const LERP = 0.008;
const BEAT_RANGES = [{ id: 'beat-1', s: 0, e: .25 }, { id: 'beat-2', s: .25, e: .5 }, { id: 'beat-3', s: .5, e: .75 }, { id: 'beat-4', s: .75, e: 1 }];

const isMobile = () => window.innerWidth < 768;
const isAndroid = () => /Android/i.test(navigator.userAgent || "");
const motionScale = () => isMobile() ? (isAndroid() ? .46 : .55) : 1;
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const perfTier = (() => {
  const nav = navigator || {};
  const memory = nav.deviceMemory || 4;
  const cores = nav.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  const saveData = !!nav.connection?.saveData;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!coarse && window.innerWidth >= 768) return "desktop";
  if (saveData || memory <= 2 || cores <= 4 || dpr > 2.85) return "low";
  if (isAndroid()) {
    if (memory <= 3 || cores <= 6 || dpr >= 2.75) return "low";
    return "mid";
  }
  if (memory <= 4 || cores <= 6 || dpr > 2.25) return "mid";
  return "high";
})();
const isLowPerf = () => perfTier === "low" || document.documentElement.dataset.perfTier === "low";
const isMidPerf = () => perfTier === "mid" || document.documentElement.dataset.perfTier === "mid";
const frameStep = () => {
  if (!isMobile()) return 1;
  if (isLowPerf()) return 4;
  if (isMidPerf()) return isAndroid() ? 2 : 3;
  return 2;
};
const maxInitialFrame = () => {
  if (!isMobile()) return 96;
  if (isLowPerf()) return 76;
  if (isMidPerf()) return isAndroid() ? 120 : 104;
  return 132;
};

const state = { heroTarget: 0, heroCurrent: 0, beatTarget: 0, beatCurrent: 0 };
let frames = new Array(TOTAL).fill(null);
let allReady = false;
let prevBeatIdx = -1;
let heroCanvas, heroCtx, emberCanvas, emberCtx, offC, offX;
let heroVideo, heroVideoReady = false, videoScrubCurrent = 0, lastVideoTime = -1;
let pendingVideoTime = null, lastVideoSeekAt = 0, lastMobileSceneUpdate = 0;
let embers = [];
let filmScenes = [];
let lastDrawnMobileFrame = -1;
let lastDrawnMobileProgress = -1;

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.documentElement.dataset.perfTier = perfTier;
  document.documentElement.dataset.platform = isAndroid() ? "android" : "default";
  monitorMobileSmoothness();
  initAtmosphereLayer();
  heroCanvas = document.getElementById('hero-canvas');
  emberCanvas = document.getElementById('ember-canvas');
  if (heroCanvas) heroCtx = heroCanvas.getContext('2d', { alpha: false, desynchronized: true });
  if (emberCanvas) emberCtx = emberCanvas.getContext('2d', { alpha: true, desynchronized: true });
  heroVideo = document.getElementById('hero-video-scrub');

  sizeCanvases();
  window.addEventListener('resize', debounce(sizeCanvases, 150));
  window.addEventListener('scroll', onScroll, { passive: true });

  initNav();
  initMobile();
  initCursor();
  initCinematicSections();
  initObservers();
  onScroll();
  if (!initHeroVideoScrub()) preloadFrames();
}

function initAtmosphereLayer() {
  if (!document.getElementById('webgl-canvas')) return;

  const delay = isMobile()
    ? (isLowPerf() ? 900 : 420)
    : 120;

  window.setTimeout(() => {
    import("./threeScene").catch(() => {
      document.documentElement.dataset.perfTier = "low";
    });
  }, delay);
}

function monitorMobileSmoothness() {
  if (!isMobile() || isLowPerf()) return;
  let framesSeen = 0;
  let slowFrames = 0;
  let last = performance.now();
  const start = last;

  function sample(now) {
    const delta = now - last;
    last = now;
    framesSeen++;
    if (delta > 38) slowFrames++;

    if (now - start < 4200 && framesSeen < 220) {
      requestAnimationFrame(sample);
      return;
    }

    const limit = isAndroid() ? 0.24 : 0.34;
    if (framesSeen > 30 && slowFrames / framesSeen > limit) {
      document.documentElement.dataset.perfTier = "low";
    }
  }

  requestAnimationFrame(sample);
}

/* ── Magnetic cursor (orange ring) ──────────────────────────────
   The #custom-cursor div lives as the last child of <body>,
   outside .hero, so mix-blend-mode:difference is never clipped
   by the hero's isolation context.
──────────────────────────────────────────────────────────────── */
function initCursor() {
  const el = document.getElementById('custom-cursor');
  if (!el || window.matchMedia('(hover:none)').matches) return;
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let tx = cx, ty = cy;
  let revealed = false;

  document.addEventListener('pointermove', e => {
    tx = e.clientX;
    ty = e.clientY;
    // Snap to exact position on first move so it doesn't slide in from corner
    if (!revealed) {
      cx = tx;
      cy = ty;
      el.style.left = cx + 'px';
      el.style.top  = cy + 'px';
      el.style.opacity = '1';
      revealed = true;
    }
  }, { passive: true });

  // Expand cursor on interactive elements
  const targets = 'a, button, .btn, .stats__item, .specs__card, .caps__col, .industries__item, .ticker__item';
  document.querySelectorAll(targets).forEach(node => {
    node.addEventListener('mouseenter', () => el.classList.add('cursor--hover'));
    node.addEventListener('mouseleave', () => el.classList.remove('cursor--hover'));
  });
  (function moveCursor() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    requestAnimationFrame(moveCursor);
  })();
}

function getFramePath(i) {
  return FRAME_PATH + String(i + 1).padStart(3, '0') + '.jpg';
}

async function preloadFrames() {
  const bar = document.getElementById('preloader-bar');
  let loaded = 0;
  const initialTotal = maxInitialFrame();
  const minEnd = performance.now() + 900;
  let started = false;

  const mobileDecodeWidth = isLowPerf() ? 620 : isMidPerf() ? (isAndroid() ? 860 : 720) : 820;
  const bitmapOptions = isMobile()
    ? { resizeWidth: mobileDecodeWidth, resizeQuality: isLowPerf() ? 'low' : 'medium' }
    : null;
  const decodeFrame = blob => bitmapOptions
    ? createImageBitmap(blob, bitmapOptions).catch(() => createImageBitmap(blob))
    : createImageBitmap(blob);

  const loadFrame = i => fetch(getFramePath(i))
    .then(r => r.blob())
    .then(decodeFrame)
    .then(bitmap => {
      frames[i] = bitmap;
      loaded++;
      if (bar) bar.style.width = (Math.min(loaded, initialTotal) / initialTotal * 100) + '%';
    })
    .catch(() => {
      loaded++;
      if (bar) bar.style.width = (Math.min(loaded, initialTotal) / initialTotal * 100) + '%';
    });

  const reveal = async () => {
    if (started) return;
    started = true;
    allReady = true;
    if (bar) bar.style.width = '100%';
    const remaining = minEnd - performance.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('done');
      setTimeout(() => preloader.remove(), 900);
    }
    requestAnimationFrame(masterTick);
  };

  setTimeout(reveal, isMobile() ? 1050 : 1800);

  const step = frameStep();
  const priorityFrames = [];
  for (let i = 0; i < TOTAL; i += step) priorityFrames.push(i);
  if (!priorityFrames.includes(TOTAL - 1)) priorityFrames.push(TOTAL - 1);

  const batchSize = isMobile() ? (isLowPerf() ? 8 : 12) : 32;
  for (let batch = 0; batch < priorityFrames.length; batch += batchSize) {
    const chunk = priorityFrames.slice(batch, batch + batchSize);
    await Promise.all(chunk.map(loadFrame));
    if (loaded >= Math.min(initialTotal, priorityFrames.length)) reveal();
  }
  reveal();

  if (!isMobile()) {
    const missing = [];
    for (let i = 0; i < TOTAL; i++) {
      if (!frames[i]) missing.push(i);
    }
    for (let batch = 0; batch < missing.length; batch += 24) {
      await Promise.all(missing.slice(batch, batch + 24).map(loadFrame));
    }
  }
}

function initHeroVideoScrub() {
  if (!isMobile() || !heroVideo || !heroVideo.querySelector('source')) return false;

  const bar = document.getElementById('preloader-bar');
  const preloader = document.getElementById('preloader');
  let fallbackStarted = false;

  const fallback = () => {
    if (fallbackStarted || heroVideoReady) return;
    fallbackStarted = true;
    document.documentElement.classList.remove('hero-video-enabled', 'hero-video-ready');
    preloadFrames();
  };

  heroVideo.muted = true;
  heroVideo.playsInline = true;
  heroVideo.loop = false;
  heroVideo.preload = 'auto';
  heroVideo.pause();

  heroVideo.addEventListener('loadedmetadata', () => {
    if (!heroVideo.duration || Number.isNaN(heroVideo.duration)) {
      fallback();
      return;
    }
    heroVideoReady = true;
    allReady = true;
    document.documentElement.classList.add('hero-video-enabled', 'hero-video-ready');
    videoScrubCurrent = 0;
    lastVideoTime = -1;
    pendingVideoTime = null;
    lastVideoSeekAt = 0;
    heroVideo.currentTime = 0.001;
    heroVideo.pause();
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('done');
        setTimeout(() => preloader.remove(), 900);
      }
      requestAnimationFrame(masterTick);
    }, isMobile() ? 320 : 650);
  }, { once: true });

  heroVideo.addEventListener('error', fallback, { once: true });
  heroVideo.addEventListener('seeked', flushPendingVideoSeek);
  setTimeout(fallback, 2200);
  heroVideo.load();
  return true;
}

function sizeCanvases() {
  if (!heroCanvas || !heroCtx || !emberCanvas || !emberCtx) return;
  const heroDpr = isMobile() ? (isLowPerf() ? 0.82 : isMidPerf() ? (isAndroid() ? 1 : 0.9) : 1.05) : Math.min(window.devicePixelRatio || 1, 2);
  const emberDpr = isMobile() ? (isLowPerf() ? 0.66 : isMidPerf() ? 0.72 : 0.9) : heroDpr;
  sizeCanvasToEl(heroCanvas, heroCtx, heroDpr, document.querySelector('.hero__canvas-wrap'));
  sizeCanvasFull(emberCanvas, emberCtx, emberDpr);

  offC = document.createElement('canvas');
  offC.width = heroCanvas.width;
  offC.height = heroCanvas.height;
  offX = offC.getContext('2d', { alpha: false, desynchronized: true });
  offX.setTransform(heroDpr, 0, 0, heroDpr, 0, 0);
  lastDrawnMobileFrame = -1;
  lastDrawnMobileProgress = -1;
}

function sizeCanvasToEl(canvas, ctx, dpr, el) {
  if (!el) return;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas._lw = w;
  canvas._lh = h;
  canvas._dpr = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function sizeCanvasFull(canvas, ctx, dpr) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas._lw = w;
  canvas._lh = h;
  canvas._dpr = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function onScroll() {
  const sy = window.scrollY;
  const hero = document.querySelector('.hero');
  if (hero) {
    const start = hero.offsetTop || 0;
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    const rawHeroProgress = clamp((sy - start) / travel);
    state.heroTarget = rawHeroProgress;
    const shouldPinHero = isMobile() && sy >= start && rawHeroProgress < 1;
    hero.classList.toggle('hero--fixed', shouldPinHero);
    hero.classList.toggle('hero--released', isMobile() && rawHeroProgress >= 1);
  }

  const beats = document.getElementById('beats-section');
  if (beats) {
    const r = beats.getBoundingClientRect();
    const max = beats.offsetHeight - window.innerHeight;
    state.beatTarget = clamp(-r.top / (max || 1));
  }

  document.getElementById('navbar')?.classList.toggle('scrolled', sy > 60);
  document.getElementById('float-cta')?.classList.toggle('visible', hero ? sy > hero.offsetHeight * .34 && sy < hero.offsetHeight * .9 : sy > 500);
}

function calcDraw(img, cw, ch) {
  const sw = img.width;
  const sh = img.height * (1 - CROP);
  const sc = Math.min(cw / sw, (ch * .76) / sh) * 1.16;
  return { sw, sh, dx: (cw - sw * sc) / 2, dy: (ch - sh * sc) / 2, dw: sw * sc, dh: sh * sc };
}

function drawFrame(ctx, offCtx, offCan, cw, ch, progress) {
  if (!ctx || !offCtx || !offCan || !cw || !ch) return;
  const mobile = isMobile();
  const ri = progress * (TOTAL - 1);
  const iA = Math.floor(ri);
  const iB = Math.min(iA + 1, TOTAL - 1);
  const blend = ri - iA;
  const a = frames[iA] || nearestFrame(iA);
  const b = frames[iB] || nearestFrame(iB);
  if (!a) return;

  if (mobile) {
    ctx.setTransform(ctx.canvas?._dpr || 1, 0, 0, ctx.canvas?._dpr || 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = isLowPerf() ? 'low' : 'medium';
    ctx.fillStyle = '#0A0804';
    ctx.fillRect(0, 0, cw, ch);

    const dA = calcDraw(a, cw, ch);
    ctx.drawImage(a, 0, 0, dA.sw, dA.sh, dA.dx, dA.dy, dA.dw, dA.dh);
    if (!isLowPerf() && b && blend > .001) {
      const dB = calcDraw(b, cw, ch);
      ctx.globalAlpha = blend;
      ctx.drawImage(b, 0, 0, dB.sw, dB.sh, dB.dx, dB.dy, dB.dw, dB.dh);
      ctx.globalAlpha = 1;
    }

    if (!isLowPerf()) {
      const fade = ctx.createLinearGradient(0, ch, 0, ch * 0.52);
      fade.addColorStop(0, 'rgba(10,8,4,1)');
      fade.addColorStop(1, 'rgba(10,8,4,0)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, ch * 0.52, cw, ch * 0.48);
    }
    return;
  }

  // Fill with site background colour — not pure black
  offCtx.globalAlpha = 1;
  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = mobile ? 'low' : 'high';
  offCtx.fillStyle = '#0A0804';
  offCtx.fillRect(0, 0, cw, ch);

  // Draw current frame
  const dA = calcDraw(a, cw, ch);
  offCtx.drawImage(a, 0, 0, dA.sw, dA.sh, dA.dx, dA.dy, dA.dw, dA.dh);
  if (b && blend > .001) {
    const dB = calcDraw(b, cw, ch);
    offCtx.globalAlpha = blend;
    offCtx.drawImage(b, 0, 0, dB.sw, dB.sh, dB.dx, dB.dy, dB.dw, dB.dh);
    offCtx.globalAlpha = 1;
  }

  // ── SECONDARY edge blend (canvas layer) ──────────────────────────────────
  // These are tuned to the ladle content (handle left, open right, heavy bottom).
  // The CSS mask-image is the PRIMARY dissolve; these gradients are the fallback
  // and add extra depth inside the canvas itself.

  // Left edge: 42% — covers ladle handle arm without eating the bowl
  const eL = offCtx.createLinearGradient(0, 0, cw * 0.42, 0);
  eL.addColorStop(0,    'rgba(10,8,4,1)');
  eL.addColorStop(0.5,  'rgba(10,8,4,0.6)');
  eL.addColorStop(1,    'rgba(10,8,4,0)');
  offCtx.fillStyle = eL;
  offCtx.fillRect(0, 0, cw * 0.42, ch);

  // Right edge: 36% — less content on right side
  const eR = offCtx.createLinearGradient(cw, 0, cw * 0.64, 0);
  eR.addColorStop(0,    'rgba(10,8,4,1)');
  eR.addColorStop(0.5,  'rgba(10,8,4,0.6)');
  eR.addColorStop(1,    'rgba(10,8,4,0)');
  offCtx.fillStyle = eR;
  offCtx.fillRect(cw * 0.64, 0, cw * 0.36, ch);

  // Top edge: 28%
  const eT = offCtx.createLinearGradient(0, 0, 0, ch * 0.28);
  eT.addColorStop(0, 'rgba(10,8,4,1)');
  eT.addColorStop(1, 'rgba(10,8,4,0)');
  offCtx.fillStyle = eT;
  offCtx.fillRect(0, 0, cw, ch * 0.28);

  // Bottom edge: 48% — melts into ticker below
  const eB = offCtx.createLinearGradient(0, ch, 0, ch * 0.52);
  eB.addColorStop(0,   'rgba(10,8,4,1)');
  eB.addColorStop(0.5, 'rgba(10,8,4,0.55)');
  eB.addColorStop(1,   'rgba(10,8,4,0)');
  offCtx.fillStyle = eB;
  offCtx.fillRect(0, ch * 0.52, cw, ch * 0.48);

  // Centre radial darkening — very subtle, keeps text readable
  const vC = offCtx.createRadialGradient(cw * 0.5, ch * 0.5, ch * 0.12, cw * 0.5, ch * 0.5, ch * 0.58);
  vC.addColorStop(0, 'rgba(0,0,0,0)');
  vC.addColorStop(1, 'rgba(0,0,0,0.18)');
  offCtx.fillStyle = vC;
  offCtx.fillRect(0, 0, cw, ch);

  const dpr = ctx.canvas?._dpr || (mobile ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 2));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = mobile ? 'low' : 'high';
  ctx.drawImage(offCan, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function nearestFrame(index) {
  for (let d = 1; d < TOTAL; d++) {
    const prev = index - d;
    const next = index + d;
    if (prev >= 0 && frames[prev]) return frames[prev];
    if (next < TOTAL && frames[next]) return frames[next];
  }
  return null;
}

function masterTick() {
  if (isMobile()) {
    const delta = state.heroTarget - state.heroCurrent;
    const baseEase = isLowPerf() ? 0.24 : isAndroid() ? 0.18 : 0.14;
    const maxEase = isLowPerf() ? 0.44 : isAndroid() ? 0.38 : 0.32;
    const ease = Math.min(maxEase, baseEase + Math.abs(delta) * 1.35);
    state.heroCurrent += Math.abs(delta) < .001 ? delta : delta * ease;
  } else {
    state.heroCurrent += Math.abs(state.heroTarget - state.heroCurrent) < .0001 ? state.heroTarget - state.heroCurrent : (state.heroTarget - state.heroCurrent) * LERP;
  }
  // Beats use target directly — LERP caused pillars 3 & 4 to be skipped as
  // the lagged current value fired all missed beats in rapid succession on catch-up
  state.beatCurrent = state.beatTarget;

  const now = performance.now();
  const mobileVideoMode = isMobile() && heroVideoReady;
  const shouldUpdateScene = !mobileVideoMode || now - lastMobileSceneUpdate > 140;

  if (shouldUpdateScene) {
    updateCinematicPage();
  }
  updateParallax();
  if (shouldUpdateScene) {
    updateBeats(state.beatCurrent);
    updateTextFills();
    lastMobileSceneUpdate = now;
  }


  if (allReady) {
    if (heroVideoReady) {
      updateHeroVideoScrub();
    } else if (isMobile()) {
      const mobileFrame = Math.floor(state.heroCurrent * (TOTAL - 1));
      const drawThreshold = isLowPerf() ? .0035 : .0012;
      if (mobileFrame !== lastDrawnMobileFrame || Math.abs(state.heroCurrent - lastDrawnMobileProgress) > drawThreshold) {
        drawFrame(heroCtx, offX, offC, heroCanvas ? heroCanvas._lw || 1 : 1, heroCanvas ? heroCanvas._lh || 1 : 1, state.heroCurrent);
        lastDrawnMobileFrame = mobileFrame;
        lastDrawnMobileProgress = state.heroCurrent;
      }
    } else {
      drawFrame(heroCtx, offX, offC, heroCanvas ? heroCanvas._lw || 1 : 1, heroCanvas ? heroCanvas._lh || 1 : 1, state.heroCurrent);
    }
  }
  if (!(isMobile() && heroVideoReady)) {
    updateEmbers(emberCtx, embers, emberCanvas ? emberCanvas._lw || window.innerWidth : window.innerWidth, emberCanvas ? emberCanvas._lh || window.innerHeight : window.innerHeight, state.heroCurrent);
  }

  const scrollInd = document.getElementById('scroll-ind');
  if (scrollInd) scrollInd.style.opacity = state.heroCurrent > .08 ? '0' : '1';
  requestAnimationFrame(masterTick);
}

function updateHeroVideoScrub() {
  if (!heroVideoReady || !heroVideo || !heroVideo.duration) return;

  const delta = state.heroCurrent - videoScrubCurrent;
  const ease = isMobile()
    ? (isLowPerf() ? 0.5 : isMidPerf() ? 0.42 : 0.36)
    : 0.12;
  videoScrubCurrent += Math.abs(delta) < .0008 ? delta : delta * ease;

  const nextTime = clamp(videoScrubCurrent) * Math.max(0, heroVideo.duration - 0.045);
  const threshold = isMobile()
    ? (isLowPerf() ? 0.18 : isMidPerf() ? 0.14 : 0.1)
    : 0.016;
  const minSeekGap = isMobile()
    ? (isLowPerf() ? 180 : isMidPerf() ? 140 : 110)
    : 32;

  if (Math.abs(nextTime - lastVideoTime) < threshold) return;

  pendingVideoTime = nextTime;
  if (!heroVideo.seeking && performance.now() - lastVideoSeekAt >= minSeekGap) {
    flushPendingVideoSeek();
  }
}

function flushPendingVideoSeek() {
  if (!heroVideoReady || !heroVideo || pendingVideoTime == null || heroVideo.seeking) return;
  const target = pendingVideoTime;
  pendingVideoTime = null;
  lastVideoSeekAt = performance.now();
  lastVideoTime = target;
  heroVideo.pause();
  if (typeof heroVideo.fastSeek === 'function') {
    try {
      heroVideo.fastSeek(target);
      return;
    } catch (_) {
      // Fall back to currentTime below when fastSeek is not usable.
    }
  }
  heroVideo.currentTime = target;
}

function updateParallax() {
  const sy = window.scrollY;
  const hero = document.querySelector('.hero');
  const heroStart = hero?.offsetTop || 0;
  const heroScroll = Math.max(0, sy - heroStart);
  const scale = motionScale();
  const heroBg = document.getElementById('hero-bg-text');
  const canvas = document.getElementById('layer-canvas');
  const embersEl = document.getElementById('layer-embers');
  const left = document.querySelector('.hero__left');
  const right = document.querySelector('.hero__right');
  const beatsSchematic = document.getElementById('beats-schematic');
  const beatsBg = document.querySelector('.beats__bg-text');

  if (heroBg) heroBg.style.transform = `translate(-50%,calc(-50% + ${heroScroll * .035 * scale}px))`;
  if (canvas) canvas.style.transform = `translateX(-50%) translateY(${heroScroll * .055 * scale}px) translateZ(0)`;
  if (embersEl) embersEl.style.transform = `translateY(${-heroScroll * .045 * scale}px) translateZ(0)`;
  if (left && !isMobile()) left.style.transform = `translateY(calc(-50% + ${heroScroll * .08 * scale}px))`;
  if (right && !isMobile()) right.style.transform = `translateY(calc(-50% + ${heroScroll * .12 * scale}px))`;

  const beats = document.getElementById('beats-section');
  if (beats && beatsSchematic) {
    const r = beats.getBoundingClientRect();
    const p = clamp(-r.top / (beats.offsetHeight - window.innerHeight || 1));
    beatsSchematic.style.transform = `translateY(${(p - .5) * -70 * scale}px) rotate(${(p - .5) * 8}deg) scale(${1.02 + p * .04})`;
    if (beatsBg) beatsBg.style.transform = `translate(-50%,calc(-50% + ${(p - .5) * 42 * scale}px))`;
  }
}

let beatTransitionTimer = null;

function updateBeats(progress) {
  let active = BEAT_RANGES.length - 1;
  BEAT_RANGES.forEach((beat, i) => {
    if (progress >= beat.s && progress <= beat.e) active = i;
  });
  if (active === prevBeatIdx) return;

  const forward = prevBeatIdx < 0 || active > prevBeatIdx;
  const enterY  = forward ? '28px' : '-28px';

  // ── Cancel in-flight timer and reset all non-active beats immediately ──
  if (beatTransitionTimer) {
    clearTimeout(beatTransitionTimer);
    beatTransitionTimer = null;
  }
  BEAT_RANGES.forEach((beat, i) => {
    if (i === active) return;
    const el = document.getElementById(beat.id);
    if (el) { el.style.cssText = ''; el.classList.remove('active'); }
  });

  // ── Animate the incoming beat in ──
  const inEl = document.getElementById(BEAT_RANGES[active].id);
  if (inEl) {
    if (isMobile()) {
      inEl.style.cssText = '';
      inEl.classList.add('active');
      prevBeatIdx = active;
      document.querySelectorAll('.beats__nav-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === active);
      });
      return;
    }

    inEl.style.cssText = `opacity:0;transform:translateY(${enterY});filter:blur(5px);transition:none;pointer-events:none`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      inEl.style.transition = 'opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1), filter .55s cubic-bezier(.22,1,.36,1)';
      inEl.style.opacity    = '1';
      inEl.style.transform  = 'translateY(0)';
      inEl.style.filter     = 'blur(0)';
      inEl.style.pointerEvents = 'auto';
      inEl.classList.add('active');
      beatTransitionTimer = setTimeout(() => {
        inEl.style.cssText = '';
        inEl.classList.add('active');
        beatTransitionTimer = null;
      }, 680);
    }));
  }

  prevBeatIdx = active;

  // Keep nav dots in sync
  document.querySelectorAll('.beats__nav-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === active);
  });
}

/* Scroll the page so the beats section is showing pillar at index (0-3) */
function scrollToPillar(idx) {
  const beats = document.getElementById('beats-section');
  if (!beats) return;
  const max = beats.offsetHeight - window.innerHeight;
  const ratio = BEAT_RANGES[idx]?.s ?? 0;
  // Add a small offset (15% of one pillar's travel) to land in the middle of that range
  const targetScroll = beats.offsetTop + max * (ratio + 0.12);
  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
}
// Expose globally so inline onclick attributes in HTML can call this from module scope
window.scrollToPillar = scrollToPillar;


function updateTextFills() {
  fillByViewport(document.getElementById('about-text'), .1, .85);
  fillByViewport(document.querySelector('.industries__statement'), .15, .82);
}

function fillByViewport(el, start, end) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const raw = (vh * end - r.top) / (vh * (end - start));
  el.style.setProperty('--fill', (clamp(raw) * 100).toFixed(1) + '%');
}

class Ember {
  constructor(w, h, init) { this.reset(w, h, init) }
  reset(w, h, init = false) {
    this.x = Math.random() * w;
    this.y = init ? Math.random() * h : h + 20;
    this.sz = 1.2 + Math.random() * 4.8;
    this.vy = -(.25 + Math.random() * 1.1);
    this.phase = Math.random() * Math.PI * 2;
    this.op = .18 + Math.random() * .55;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 180;
    this.r = 255;
    this.g = 105 + Math.floor(Math.random() * 110);
    this.b = Math.floor(Math.random() * 28);
  }
  update(w, h) {
    this.life++;
    this.x += Math.sin(this.life * .035 + this.phase) * .55;
    this.y += this.vy;
    if (this.life > this.maxLife || this.y < -20 || this.x < -30 || this.x > w + 30) this.reset(w, h);
  }
  draw(ctx, intensity) {
    const life = this.life / this.maxLife;
    const fade = Math.min(this.life / 22, 1) * Math.max(0, 1 - life);
    const a = this.op * fade * intensity;
    if (a < .01) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${a})`;
    ctx.shadowBlur = this.sz * 3;
    ctx.shadowColor = `rgba(${this.r},${this.g},${this.b},${a * .5})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function updateEmbers(ctx, arr, w, h, progress) {
  if (!ctx || !w || !h) return;
  if (arr.length === 0) for (let i = 0; i < (isMobile() ? (isLowPerf() ? 14 : 32) : 60); i++)arr.push(new Ember(w, h, true));
  ctx.clearRect(0, 0, w, h);
  if (progress < .01) return;
  arr.forEach(ember => {
    ember.update(w, h);
    ember.draw(ctx, progress);
  });
}

function initNav() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  });
}

function initMobile() {
  const button = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (button && menu) button.addEventListener('click', () => menu.classList.toggle('open'));
}

function initCinematicSections() {
  document.querySelectorAll('.hero .film-reveal,.hero .film-scene').forEach(el => {
    el.classList.remove('film-reveal', 'film-scene', 'is-visible');
    el.style.removeProperty('--reveal-delay');
  });

  const sceneConfigs = [
    ['about', 'scene--bridge'],
    ['stats', 'scene--measure'],
    ['specs-section', 'scene--precision'],
    ['process', 'scene--rhythm'],
    ['capabilities', 'scene--control'],
    ['industries', 'scene--global'],
    ['enquire', 'scene--resolve']
  ];

  filmScenes = sceneConfigs
    .map(([id, tone]) => document.getElementById(id) ? { el: document.getElementById(id), tone } : null)
    .filter(Boolean);

  filmScenes.forEach(({ el, tone }) => {
    el.classList.add('film-scene', tone);
    getRevealTargets(el).forEach((target, i) => {
      target.classList.add('film-reveal');
      target.style.setProperty('--reveal-delay', `${Math.min(i, 8) * 70}ms`);
    });
  });

  // Regular sections share one observer (threshold 0.18 with rootMargin)
  const sceneObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, { threshold: .18, rootMargin: '-8% 0px -14% 0px' });

  // The #enquire section is at the very bottom of the page.
  // A high threshold + negative bottom rootMargin means it may never
  // intersect enough when the user jumps directly via the nav link.
  // Give it its own lenient observer: 5% visible is enough to reveal.
  const ctaObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: .05, rootMargin: '0px' });

  filmScenes.forEach(({ el }) => {
    if (el.id === 'enquire') ctaObs.observe(el);
    else sceneObs.observe(el);
  });

  // Force-reveal any section whose id matches the current URL hash
  // (handles clicking the Enquire nav link before observer fires).
  function forceRevealHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target && target.classList.contains('film-scene')) {
      target.classList.add('is-visible');
    }
  }
  forceRevealHash();
  window.addEventListener('hashchange', () => setTimeout(forceRevealHash, 80));
}

function getRevealTargets(root) {
  const selectors = [
    '.about__label', '.about__kicker', '.about__statement', '.about__body', '.about__facts span',
    '.stats__item',
    '.specs__eyebrow', '.specs__lede', '.specs__headline', '.specs__card',
    '.process__eyebrow', '.process__headline', '.process__step', '.process__frame',
    '.caps__eyebrow', '.caps__headline', '.caps__col',
    '.industries__statement', '.industries__item', '.industries__contact',
    '.cta__eyebrow', '.cta__headline', '.cta__rule', '.cta__body', '.cta__buttons', '.cta__contact-block'
  ];
  return [...root.querySelectorAll(selectors.join(','))]
    .filter(target => !target.closest('.hero') && !target.closest('.beats__schematic') && !target.closest('.beat'));
}

function updateCinematicPage() {
  const doc = document.documentElement;
  const sy = window.scrollY;
  const hero = document.querySelector('.hero');
  const heroHeight = hero?.offsetHeight || window.innerHeight;
  const afterHero = clamp((sy - heroHeight * .55) / (Math.max(1, document.body.scrollHeight - window.innerHeight - heroHeight * .55)));
  const heat = 1 - afterHero;
  const calm = smoothstep(.18, 1, afterHero);

  doc.style.setProperty('--forge-heat', (heat).toFixed(3));
  doc.style.setProperty('--forge-calm', (calm).toFixed(3));
  doc.style.setProperty('--atmo-opacity', (0.16 * heat + 0.035).toFixed(3));
  doc.style.setProperty('--atmo-warmth', (0.11 * heat).toFixed(3));

  filmScenes.forEach(({ el }, index) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const center = (r.top + r.height * .5) / vh;
    const progress = clamp((vh - r.top) / (vh + r.height));
    const focus = 1 - clamp(Math.abs(center - .5) * 1.7);
    const drift = (center - .5) * -34 * motionScale();
    el.style.setProperty('--scene-progress', progress.toFixed(3));
    el.style.setProperty('--scene-focus', focus.toFixed(3));
    el.style.setProperty('--scene-drift', `${drift.toFixed(2)}px`);
    el.style.setProperty('--scene-index', index);
  });
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function initObservers() {
  const statsObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.getElementById('stats-line')?.classList.add('drawn');
      document.querySelectorAll('.stats__item').forEach(card => animateCount(card));
      statsObs.disconnect();
    });
  }, { threshold: .3 });
  const stats = document.getElementById('stats');
  if (stats) statsObs.observe(stats);

  // ── Process step activation ─────────────────────────────────────
  // activateStep: deactivates all, activates one, crossfades image.
  const processSteps = Array.from(document.querySelectorAll('.process__step'));
  const processImages = Array.from(document.querySelectorAll('.process__img'));
  const processSection = document.getElementById('process');
  let activeProcessIdx = -1;
  let processScrollRaf = 0;

  processSteps.forEach(step => {
    const stepIdx = parseInt(step.dataset.step, 10);
    const source = processImages.find(img => parseInt(img.dataset.stepImg, 10) === stepIdx);
    if (!source || step.querySelector('.process__mobile-frame')) return;

    const frame = document.createElement('div');
    frame.className = 'process__mobile-frame';
    const img = source.cloneNode(false);
    img.className = 'process__mobile-img';
    img.loading = 'eager';
    img.decoding = 'async';
    img.fetchPriority = stepIdx < 2 ? 'high' : 'low';
    if (typeof img.decode === 'function') img.decode().catch(() => {});
    frame.appendChild(img);
    step.appendChild(frame);
  });

  function activateStep(stepEl) {
    if (!stepEl) return;
    const stepIdx = parseInt(stepEl.dataset.step, 10);
    if (stepIdx === activeProcessIdx) return;
    activeProcessIdx = stepIdx;
    processSteps.forEach(s => s.classList.remove('active'));
    stepEl.classList.add('active');
    processImages.forEach(img => {
      img.classList.toggle('active', parseInt(img.dataset.stepImg, 10) === stepIdx);
    });
  }

  // On scroll: find whichever step's top is closest to 40% down the viewport.
  // This works for ALL 6 steps even when steps 5 & 6 can't reach true center.
  const steps = processSteps;
  const TRIGGER_Y = 0.40; // 40% from top of viewport

  function updateActiveStepOnScroll() {
    processScrollRaf = 0;
    if (processSection) {
      const sectionRect = processSection.getBoundingClientRect();
      if (sectionRect.bottom < 0 || sectionRect.top > window.innerHeight) return;
    }
    const trigger = window.innerHeight * TRIGGER_Y;
    let closest = null;
    let closestDist = Infinity;
    steps.forEach(step => {
      const rect = step.getBoundingClientRect();
      const dist = Math.abs(rect.top - trigger);
      if (dist < closestDist) { closestDist = dist; closest = step; }
    });
    if (closest && !closest.classList.contains('active')) activateStep(closest);
  }

  const requestProcessUpdate = () => {
    if (processScrollRaf) return;
    processScrollRaf = requestAnimationFrame(updateActiveStepOnScroll);
  };

  window.addEventListener('scroll', requestProcessUpdate, { passive: true });
  updateActiveStepOnScroll(); // run once on load

  // Click navigation: scroll so the step lands at the 40% trigger point.
  steps.forEach(step => {
    const goToStep = () => {
      activateStep(step); // immediate visual change
      const rect = step.getBoundingClientRect();
      const targetScroll = window.scrollY + rect.top - (window.innerHeight * TRIGGER_Y);
      window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    };

    const dot   = step.querySelector('.process__dot');
    const title = step.querySelector('.process__title');
    if (dot)   { dot.style.cursor = 'pointer'; dot.addEventListener('click', goToStep); }
    if (title) { title.addEventListener('click', goToStep); }
  });
}

function animateCount(card) {
  if (card.dataset.counted) return;
  card.dataset.counted = 'true';
  const target = parseInt(card.dataset.target, 10);
  const numEl = card.querySelector('.stats__num');
  if (!numEl) return;
  const start = performance.now();
  function tick(now) {
    const t = clamp((now - start) / 1800);
    numEl.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

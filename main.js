/* ═══════════════════════════════════════════
   RAYSONS GROUP — Core Logic v2
   Contain-fit · Cross-fade · Lerp · Depth Ring
   ═══════════════════════════════════════════ */

const TOTAL_FRAMES = 240;
const FRAME_PATH = '/frames/ezgif-frame-';
const LERP_FACTOR = 0.08;
const BEATS = [
  { id: 'beat-1', start: 0.00, end: 0.15 },
  { id: 'beat-2', start: 0.15, end: 0.45 },
  { id: 'beat-3', start: 0.45, end: 0.65 },
  { id: 'beat-4', start: 0.65, end: 0.85 },
  { id: 'beat-5', start: 0.85, end: 1.00 },
];

// ─── STATE ───
let frames = new Array(TOTAL_FRAMES).fill(null);
let targetProgress = 0;
let currentProgress = 0;
let heroCanvas, heroCtx, emberCanvas, emberCtx;
let offscreen, offCtx;
let heroSection;
let beatElements = [];
let embers = [];
let logicalW = 0, logicalH = 0;
let isHeroVisible = true;
let allFramesReady = false;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', init);

function init() {
  heroCanvas = document.getElementById('hero-canvas');
  heroCtx = heroCanvas.getContext('2d', { alpha: false });
  emberCanvas = document.getElementById('ember-canvas');
  emberCtx = emberCanvas.getContext('2d', { alpha: true });
  heroSection = document.querySelector('.hero-sequence');

  BEATS.forEach(b => beatElements.push(document.getElementById(b.id)));

  resizeCanvases();
  window.addEventListener('resize', debounce(resizeCanvases, 150));

  // Scroll handler — ONLY updates targetProgress
  window.addEventListener('scroll', () => {
    const rect = heroSection.getBoundingClientRect();
    const max = heroSection.offsetHeight - window.innerHeight;
    targetProgress = Math.max(0, Math.min(1, -rect.top / max));
    isHeroVisible = rect.top < window.innerHeight && rect.bottom > 0;
    const nav = document.getElementById('navbar');
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  // Preload all frames then start
  preloadAllFrames();
  initNavbar();
  initStats();
  initProcess();
  initMobileMenu();
  requestAnimationFrame(renderLoop);
}

// ─── CANVAS SIZING ───
function resizeCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  logicalW = window.innerWidth;
  logicalH = window.innerHeight;
  [heroCanvas, emberCanvas].forEach(c => {
    c.width = logicalW * dpr;
    c.height = logicalH * dpr;
    c.style.width = logicalW + 'px';
    c.style.height = logicalH + 'px';
  });
  heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  emberCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Offscreen double-buffer
  try {
    offscreen = new OffscreenCanvas(logicalW * dpr, logicalH * dpr);
    offCtx = offscreen.getContext('2d');
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } catch (e) { offscreen = null; offCtx = null; }
  if (allFramesReady) drawBlendedFrame(currentProgress);
}

// ─── PRELOAD ALL FRAMES ───
function getFramePath(i) {
  return FRAME_PATH + String(i + 1).padStart(3, '0') + '.jpg';
}

async function preloadAllFrames() {
  const bar = document.getElementById('frame-loader-bar');
  let loaded = 0;
  // Load in batches of 40 to avoid connection overload
  for (let batch = 0; batch < TOTAL_FRAMES; batch += 40) {
    const end = Math.min(batch + 40, TOTAL_FRAMES);
    const promises = [];
    for (let i = batch; i < end; i++) {
      promises.push(
        fetch(getFramePath(i))
          .then(r => r.blob())
          .then(blob => createImageBitmap(blob))
          .then(bmp => {
            frames[i] = bmp;
            loaded++;
            if (bar) bar.style.width = `${(loaded / TOTAL_FRAMES) * 100}%`;
            if (i === 0) { drawBlendedFrame(0); updateBeats(0); }
          })
          .catch(() => { loaded++; })
      );
    }
    await Promise.all(promises);
  }
  allFramesReady = true;
  const loader = document.getElementById('frame-loader');
  if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 600); }
}

// ─── CONTAIN-FIT CALCULATOR ───
function calcContainDraw(img, cw, ch) {
  const scale = Math.min(cw / img.width, (ch * 0.70) / img.height) * 1.15;
  const dw = img.width * scale;
  const dh = img.height * scale;
  return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
}

// ─── DRAW WITH CROSS-FADE + DEPTH RING + GROUND SHADOW ───
function drawBlendedFrame(progress) {
  const cw = logicalW, ch = logicalH;
  if (!cw || !ch) return;

  // Fractional frame index for cross-fade
  const rawIdx = progress * (TOTAL_FRAMES - 1);
  const idxA = Math.floor(rawIdx);
  const idxB = Math.min(idxA + 1, TOTAL_FRAMES - 1);
  const blend = rawIdx - idxA;

  const imgA = frames[idxA];
  const imgB = frames[idxB];
  if (!imgA) return;

  const ctx = offCtx || heroCtx;

  // Clear
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#0A0804';
  ctx.fillRect(0, 0, cw, ch);

  // Draw frame A (full opacity)
  const dA = calcContainDraw(imgA, cw, ch);
  ctx.drawImage(imgA, dA.dx, dA.dy, dA.dw, dA.dh);

  // Cross-fade frame B
  if (imgB && blend > 0.001) {
    const dB = calcContainDraw(imgB, cw, ch);
    ctx.globalAlpha = blend;
    ctx.drawImage(imgB, dB.dx, dB.dy, dB.dw, dB.dh);
    ctx.globalAlpha = 1.0;
  }

  // Depth isolation ring — radial spotlight vignette
  const vigR = Math.min(cw, ch) * 0.55;
  const vig = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, vigR);
  vig.addColorStop(0, 'rgba(10,8,4,0)');
  vig.addColorStop(0.55, 'rgba(10,8,4,0)');
  vig.addColorStop(1, 'rgba(10,8,4,0.75)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, cw, ch);

  // Ground shadow beneath casting
  const sy = ch * 0.72, sw = cw * 0.15, sh = ch * 0.04;
  const sg = ctx.createRadialGradient(cw / 2, sy, 0, cw / 2, sy, sw);
  sg.addColorStop(0, 'rgba(255,107,0,0.08)');
  sg.addColorStop(1, 'rgba(255,107,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(cw / 2, sy, sw, sh, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blit offscreen → visible canvas
  if (offscreen && offCtx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCtx.setTransform(1, 0, 0, 1, 0, 0);
    heroCtx.drawImage(offscreen, 0, 0);
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

// ─── RENDER LOOP — lerp + draw ───
function renderLoop() {
  // Lerp with snap
  const diff = targetProgress - currentProgress;
  if (Math.abs(diff) < 0.0001) {
    currentProgress = targetProgress;
  } else {
    currentProgress += diff * LERP_FACTOR;
  }

  if (isHeroVisible || Math.abs(diff) > 0.001) {
    drawBlendedFrame(currentProgress);
    updateBeats(currentProgress);
    updateEmbers();
  }

  // UI updates driven by lerped progress
  const hint = document.getElementById('scroll-hint');
  if (hint) hint.style.opacity = currentProgress > 0.05 ? '0' : '';
  const glow = document.getElementById('hero-glow');
  if (glow) glow.style.opacity = Math.min(currentProgress * 2, 1) * 0.8;

  requestAnimationFrame(renderLoop);
}

// ─── BEAT CONTROLLER ───
function updateBeats(progress) {
  BEATS.forEach((beat, i) => {
    const el = beatElements[i];
    if (!el) return;
    const { start, end } = beat;
    const fadeZone = (end - start) * 0.2;
    let opacity = 0;
    if (progress >= start && progress <= end) {
      if (progress < start + fadeZone) opacity = (progress - start) / fadeZone;
      else if (progress < end - fadeZone) opacity = 1;
      else if (i < BEATS.length - 1) opacity = (end - progress) / fadeZone;
      else opacity = 1;
    }
    opacity = Math.max(0, Math.min(1, opacity));
    el.style.opacity = opacity;
    if (opacity > 0.05) el.classList.add('active');
    else el.classList.remove('active');
  });
}

// ─── EMBER PARTICLE SYSTEM ───
class Ember {
  constructor(w, h) { this.reset(w, h, true); }
  reset(w, h, initial = false) {
    this.x = Math.random() * w;
    this.y = initial ? Math.random() * h : h + 10;
    this.size = 1.5 + Math.random() * 3.5;
    this.speedY = -(0.3 + Math.random() * 1.2);
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.opacity = 0.2 + Math.random() * 0.6;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 180;
    this.color = `255,${107 + Math.floor(Math.random() * 108)},${Math.floor(Math.random() * 30)}`;
  }
  update(w, h) {
    this.x += this.speedX; this.y += this.speedY; this.life++;
    this.speedX += (Math.random() - 0.5) * 0.05;
    if (this.life > this.maxLife || this.y < -20) this.reset(w, h);
  }
  draw(ctx) {
    const alpha = this.opacity * Math.min(this.life / 20, 1) * Math.max(0, 1 - this.life / this.maxLife) * currentProgress;
    if (alpha < 0.01) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color},${alpha})`;
    ctx.shadowBlur = this.size * 3;
    ctx.shadowColor = `rgba(${this.color},${alpha * 0.5})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function updateEmbers() {
  const w = logicalW, h = logicalH;
  if (embers.length === 0) { for (let i = 0; i < 35; i++) embers.push(new Ember(w, h)); }
  emberCtx.clearRect(0, 0, w, h);
  if (currentProgress < 0.01) return;
  embers.forEach(e => { e.update(w, h); e.draw(emberCtx); });
}

// ─── STATS COUNTER ───
function initStats() {
  const cards = document.querySelectorAll('.stats__card');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.3 });
  cards.forEach(c => obs.observe(c));
}
function animateCounter(card) {
  const target = parseInt(card.dataset.target);
  const numEl = card.querySelector('.stats__number');
  const start = performance.now();
  card.classList.add('counted');
  function tick(now) {
    const t = Math.min((now - start) / 2000, 1);
    numEl.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── PROCESS TIMELINE ───
function initProcess() {
  const steps = document.querySelectorAll('.process__step');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  steps.forEach((s, i) => { s.style.transitionDelay = `${i * 0.1}s`; obs.observe(s); });
}

// ─── NAVBAR ───
function initNavbar() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('mobile-menu')?.classList.remove('open'); }
    });
  });
}
function initMobileMenu() {
  const btn = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}

// ─── UTILITIES ───
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

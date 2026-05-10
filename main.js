/* ═══════════════════════════════════════════
   RAYSONS GROUP — Core v3
   Split-screen · Cross-fade · Lerp · Depth
   Watermark crop · Heat glow · Ground shadow
   ═══════════════════════════════════════════ */

const TOTAL_FRAMES = 240;
const FRAME_PATH = '/frames/ezgif-frame-';
const LERP = 0.072;
const CROP_BOTTOM = 0.10; // Crop bottom 10% to remove Veo watermark
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
let offCanvas, offCtx;
let heroSection, canvasPanel;
let beatElements = [];
let embers = [];
let logW = 0, logH = 0;
let isHeroVisible = true;
let allReady = false;
let prevBeatIdx = -1;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', init);

function init() {
  heroCanvas = document.getElementById('hero-canvas');
  heroCtx = heroCanvas.getContext('2d', { alpha: false });
  emberCanvas = document.getElementById('ember-canvas');
  emberCtx = emberCanvas.getContext('2d', { alpha: true });
  heroSection = document.querySelector('.hero-sequence');
  canvasPanel = document.querySelector('.hero-sequence__canvas-panel');

  BEATS.forEach(b => beatElements.push(document.getElementById(b.id)));

  resizeCanvases();
  window.addEventListener('resize', debounce(resizeCanvases, 150));

  // Scroll — ONLY updates target. Zero DOM work.
  window.addEventListener('scroll', () => {
    const rect = heroSection.getBoundingClientRect();
    const max = heroSection.offsetHeight - window.innerHeight;
    targetProgress = Math.max(0, Math.min(1, -rect.top / max));
    isHeroVisible = rect.top < window.innerHeight && rect.bottom > 0;
    const nav = document.getElementById('navbar');
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  preloadAllFrames();
  initNavbar();
  initStats();
  initProcess();
  initMobileMenu();
}

// ─── CANVAS SIZING — retina-aware ───
function resizeCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Canvas fills the canvas-panel element, not the full viewport
  const panel = canvasPanel || document.querySelector('.hero-sequence__canvas-panel');
  logW = panel ? panel.offsetWidth : window.innerWidth;
  logH = panel ? panel.offsetHeight : window.innerHeight;

  [heroCanvas, emberCanvas].forEach(c => {
    c.width = logW * dpr;
    c.height = logH * dpr;
    c.style.width = logW + 'px';
    c.style.height = logH + 'px';
  });
  heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  emberCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Offscreen double-buffer (standard canvas fallback for Safari)
  offCanvas = document.createElement('canvas');
  offCanvas.width = logW * dpr;
  offCanvas.height = logH * dpr;
  offCtx = offCanvas.getContext('2d');
  offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (allReady) drawBlendedFrame(currentProgress);
}

// ─── PRELOAD ALL FRAMES ───
function getFramePath(i) {
  return FRAME_PATH + String(i + 1).padStart(3, '0') + '.jpg';
}

async function preloadAllFrames() {
  const bar = document.getElementById('frame-loader-bar');
  let loaded = 0;
  let firstDrawn = false;

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
            if (i === 0 && !firstDrawn) { firstDrawn = true; drawBlendedFrame(0); updateBeats(0); beatElements[0]?.classList.add('active'); }
          })
          .catch(() => { loaded++; })
      );
    }
    await Promise.all(promises);
  }

  allReady = true;
  const loader = document.getElementById('hero-loader');
  if (loader) {
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 700);
  }
  // Start render loop only after all frames ready
  requestAnimationFrame(renderLoop);
}

// ─── CONTAIN-FIT with watermark crop ───
function calcDraw(img, cw, ch) {
  const srcW = img.width;
  const srcH = img.height * (1 - CROP_BOTTOM); // Crop bottom 8%
  const scale = Math.min(cw / srcW, (ch * 0.72) / srcH) * 1.12;
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { srcW, srcH, dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
}

// ─── DRAW — cross-fade + depth ring + ground shadow + heat glow ───
function drawBlendedFrame(progress) {
  const cw = logW, ch = logH;
  if (!cw || !ch) return;

  const rawIdx = progress * (TOTAL_FRAMES - 1);
  const idxA = Math.floor(rawIdx);
  const idxB = Math.min(idxA + 1, TOTAL_FRAMES - 1);
  const blend = rawIdx - idxA;
  const imgA = frames[idxA];
  const imgB = frames[idxB];
  if (!imgA) return;

  const ctx = offCtx;

  // Clear
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#0A0804';
  ctx.fillRect(0, 0, cw, ch);

  // Frame A — contain-fit with watermark crop
  const dA = calcDraw(imgA, cw, ch);
  ctx.drawImage(imgA, 0, 0, dA.srcW, dA.srcH, dA.dx, dA.dy, dA.dw, dA.dh);

  // Cross-fade frame B
  if (imgB && blend > 0.001) {
    const dB = calcDraw(imgB, cw, ch);
    ctx.globalAlpha = blend;
    ctx.drawImage(imgB, 0, 0, dB.srcW, dB.srcH, dB.dx, dB.dy, dB.dw, dB.dh);
    ctx.globalAlpha = 1.0;
  }

  // Layer 2 — Radial depth vignette (floating void)
  const vigGrad = ctx.createRadialGradient(
    cw / 2, ch / 2, ch * 0.22,
    cw / 2, ch / 2, ch * 0.72
  );
  vigGrad.addColorStop(0, 'rgba(10,8,4,0)');
  vigGrad.addColorStop(0.7, 'rgba(10,8,4,0.35)');
  vigGrad.addColorStop(1, 'rgba(10,8,4,0.92)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, cw, ch);

  // Layer 3 — Ground shadow
  const sy = ch * 0.74;
  const sw = cw * 0.28;
  const shadowAlpha = 0.06 + progress * 0.09;
  const shadowGrad = ctx.createRadialGradient(cw / 2, sy, 0, cw / 2, sy, sw);
  shadowGrad.addColorStop(0, `rgba(255,107,0,${shadowAlpha})`);
  shadowGrad.addColorStop(1, 'rgba(10,8,4,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(0, sy - ch * 0.06, cw, ch * 0.12);

  // Layer 4 — Heat glow (peaks mid-scroll during pour)
  const heatIntensity = Math.sin(progress * Math.PI) * 0.18;
  if (heatIntensity > 0.01) {
    const heatGrad = ctx.createRadialGradient(cw / 2, ch * 0.52, 0, cw / 2, ch * 0.52, cw * 0.38);
    heatGrad.addColorStop(0, `rgba(255,140,0,${heatIntensity})`);
    heatGrad.addColorStop(1, 'rgba(10,8,4,0)');
    ctx.fillStyle = heatGrad;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Blit offscreen → visible
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  heroCtx.setTransform(1, 0, 0, 1, 0, 0);
  heroCtx.drawImage(offCanvas, 0, 0);
  heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── RENDER LOOP — lerp + draw ───
function renderLoop() {
  const diff = targetProgress - currentProgress;
  if (Math.abs(diff) < 0.0001) {
    currentProgress = targetProgress;
  } else {
    currentProgress += diff * LERP;
  }

  if (isHeroVisible || Math.abs(diff) > 0.001) {
    drawBlendedFrame(currentProgress);
    updateBeats(currentProgress);
    updateEmbers();
  }

  const hint = document.getElementById('scroll-hint');
  if (hint) hint.style.opacity = currentProgress > 0.05 ? '0' : '';

  requestAnimationFrame(renderLoop);
}

// ─── BEAT CONTROLLER — one active at a time, 80ms gap ───
function updateBeats(progress) {
  let activeIdx = -1;
  BEATS.forEach((beat, i) => {
    const { start, end } = beat;
    if (progress >= start && progress <= end) activeIdx = i;
  });

  // Only change if beat changed
  if (activeIdx !== prevBeatIdx) {
    // Deactivate previous
    if (prevBeatIdx >= 0 && beatElements[prevBeatIdx]) {
      beatElements[prevBeatIdx].classList.remove('active');
      beatElements[prevBeatIdx].style.opacity = '0';
    }
    // Activate new after 80ms gap
    if (activeIdx >= 0 && beatElements[activeIdx]) {
      setTimeout(() => {
        beatElements[activeIdx].classList.add('active');
        beatElements[activeIdx].style.opacity = '1';
      }, prevBeatIdx >= 0 ? 80 : 0);
    }
    prevBeatIdx = activeIdx;
  }
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
  const w = logW, h = logH;
  if (embers.length === 0) { for (let i = 0; i < 35; i++) embers.push(new Ember(w, h)); }
  emberCtx.clearRect(0, 0, w, h);
  if (currentProgress < 0.01) return;
  embers.forEach(e => { e.update(w, h); e.draw(emberCtx); });
}

// ─── STATS ───
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

// ─── PROCESS ───
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

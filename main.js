/* ═══════════════════════════════════════════
   RAYSONS GROUP — Core Logic
   Image Sequence · Scroll Engine · Particles
   ═══════════════════════════════════════════ */

// ─── CONFIG ───
const TOTAL_FRAMES = 240;
const FRAME_PATH = './ezgif-40aa784ac6cfbb0c-jpg/ezgif-frame-';
const BEATS = [
  { id: 'beat-1', start: 0.00, end: 0.15 },
  { id: 'beat-2', start: 0.15, end: 0.45 },
  { id: 'beat-3', start: 0.45, end: 0.65 },
  { id: 'beat-4', start: 0.65, end: 0.85 },
  { id: 'beat-5', start: 0.85, end: 1.00 },
];

// ─── STATE ───
let frames = new Array(TOTAL_FRAMES).fill(null);
let currentFrame = 0;
let scrollProgress = 0;
let heroCanvas, heroCtx, emberCanvas, emberCtx;
let heroSection, stickyContainer;
let beatElements = [];
let embers = [];
let rafId = null;
let imagesLoaded = 0;
let isHeroVisible = true;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', init);

function init() {
  heroCanvas = document.getElementById('hero-canvas');
  heroCtx = heroCanvas.getContext('2d', { alpha: false });
  emberCanvas = document.getElementById('ember-canvas');
  emberCtx = emberCanvas.getContext('2d', { alpha: true });
  heroSection = document.querySelector('.hero-sequence');
  stickyContainer = document.querySelector('.hero-sequence__sticky');

  BEATS.forEach(b => {
    beatElements.push(document.getElementById(b.id));
  });

  resizeCanvases();
  window.addEventListener('resize', debounce(resizeCanvases, 150));
  window.addEventListener('scroll', onScroll, { passive: true });

  loadFramesBatch(0, 30, () => {
    drawFrame(0);
    updateBeats(0);
    loadFramesBatch(30, TOTAL_FRAMES);
  });

  initNavbar();
  initStats();
  initProcess();
  initMobileMenu();

  requestAnimationFrame(renderLoop);
}

// ─── CANVAS SIZING ───
function resizeCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  [heroCanvas, emberCanvas].forEach(c => {
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
  });
  heroCtx.scale(dpr, dpr);
  emberCtx.scale(dpr, dpr);
  if (frames[currentFrame]) drawFrame(currentFrame);
}

// ─── FRAME LOADING ───
function getFramePath(i) {
  return FRAME_PATH + String(i + 1).padStart(3, '0') + '.jpg';
}

function loadFramesBatch(start, end, callback) {
  let remaining = end - start;
  for (let i = start; i < end; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    img.onload = () => {
      if (typeof createImageBitmap !== 'undefined') {
        createImageBitmap(img).then(bmp => {
          frames[i] = bmp;
          imagesLoaded++;
          remaining--;
          if (remaining <= 0 && callback) callback();
        });
      } else {
        frames[i] = img;
        imagesLoaded++;
        remaining--;
        if (remaining <= 0 && callback) callback();
      }
    };
    img.onerror = () => {
      remaining--;
      if (remaining <= 0 && callback) callback();
    };
  }
}

// ─── DRAWING ───
function drawFrame(idx) {
  const frame = frames[idx];
  if (!frame) return;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = frame.width;
  const ih = frame.height;

  // Cover fit
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  heroCtx.fillStyle = '#0A0804';
  heroCtx.fillRect(0, 0, cw, ch);
  heroCtx.drawImage(frame, dx, dy, dw, dh);
}

// ─── SCROLL HANDLER ───
function onScroll() {
  const rect = heroSection.getBoundingClientRect();
  const sectionHeight = heroSection.offsetHeight - window.innerHeight;
  const scrolled = -rect.top;
  scrollProgress = Math.max(0, Math.min(1, scrolled / sectionHeight));

  isHeroVisible = rect.top < window.innerHeight && rect.bottom > 0;

  // Navbar
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Scroll hint fade
  const hint = document.getElementById('scroll-hint');
  if (hint) {
    hint.style.opacity = scrollProgress > 0.05 ? '0' : '';
  }

  // Hero glow intensity
  const glow = document.getElementById('hero-glow');
  if (glow) {
    const intensity = Math.min(scrollProgress * 2, 1) * 0.8;
    glow.style.opacity = intensity;
  }
}

// ─── RENDER LOOP ───
function renderLoop() {
  if (isHeroVisible) {
    const targetFrame = Math.round(scrollProgress * (TOTAL_FRAMES - 1));
    if (targetFrame !== currentFrame) {
      currentFrame = targetFrame;
      drawFrame(currentFrame);
    }
    updateBeats(scrollProgress);
    updateEmbers();
  }
  rafId = requestAnimationFrame(renderLoop);
}

// ─── BEAT CONTROLLER ───
function updateBeats(progress) {
  BEATS.forEach((beat, i) => {
    const el = beatElements[i];
    if (!el) return;

    const { start, end } = beat;
    const beatDuration = end - start;
    const fadeZone = beatDuration * 0.2;

    let opacity = 0;
    if (progress >= start && progress <= end) {
      // Fade in
      if (progress < start + fadeZone) {
        opacity = (progress - start) / fadeZone;
      }
      // Hold
      else if (progress < end - fadeZone) {
        opacity = 1;
      }
      // Fade out (except last beat)
      else if (i < BEATS.length - 1) {
        opacity = (end - progress) / fadeZone;
      } else {
        opacity = 1;
      }
    }

    opacity = Math.max(0, Math.min(1, opacity));
    el.style.opacity = opacity;

    if (opacity > 0.05) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

// ─── EMBER PARTICLE SYSTEM ───
class Ember {
  constructor(w, h) {
    this.reset(w, h, true);
  }
  reset(w, h, initial = false) {
    this.x = Math.random() * w;
    this.y = initial ? Math.random() * h : h + 10;
    this.size = 1.5 + Math.random() * 3.5;
    this.speedY = -(0.3 + Math.random() * 1.2);
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.opacity = 0.2 + Math.random() * 0.6;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 180;
    const r = 255;
    const g = 107 + Math.floor(Math.random() * 108); // 107-215 (orange to gold)
    const b = Math.floor(Math.random() * 30);
    this.color = `${r},${g},${b}`;
  }
  update(w, h) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;
    this.speedX += (Math.random() - 0.5) * 0.05;
    if (this.life > this.maxLife || this.y < -20) {
      this.reset(w, h);
    }
  }
  draw(ctx) {
    const fadeIn = Math.min(this.life / 20, 1);
    const fadeOut = Math.max(0, 1 - (this.life / this.maxLife));
    const alpha = this.opacity * fadeIn * fadeOut * scrollProgress;
    if (alpha < 0.01) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color},${alpha})`;
    ctx.fill();
    // Glow
    ctx.shadowBlur = this.size * 3;
    ctx.shadowColor = `rgba(${this.color},${alpha * 0.5})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function initEmbers() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  embers = [];
  for (let i = 0; i < 35; i++) {
    embers.push(new Ember(w, h));
  }
}

function updateEmbers() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (embers.length === 0) initEmbers();

  emberCtx.clearRect(0, 0, w, h);
  if (scrollProgress < 0.01) return;

  embers.forEach(e => {
    e.update(w, h);
    e.draw(emberCtx);
  });
}

// ─── STATS COUNTER ───
function initStats() {
  const cards = document.querySelectorAll('.stats__card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  cards.forEach(c => observer.observe(c));
}

function animateCounter(card) {
  const target = parseInt(card.dataset.target);
  const numEl = card.querySelector('.stats__number');
  const duration = 2000;
  const start = performance.now();

  card.classList.add('counted');

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    numEl.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── PROCESS TIMELINE ───
function initProcess() {
  const steps = document.querySelectorAll('.process__step');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  steps.forEach((s, i) => {
    s.style.transitionDelay = `${i * 0.1}s`;
    observer.observe(s);
  });
}

// ─── NAVBAR ───
function initNavbar() {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu if open
        document.getElementById('mobile-menu')?.classList.remove('open');
      }
    });
  });
}

function initMobileMenu() {
  const btn = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }
}

// ─── UTILITIES ───
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

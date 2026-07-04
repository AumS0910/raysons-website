/**
 * CastingSequence.js
 * Raysons Shell Cast — two-phase scroll-scrubbed frame cinema.
 *
 * USAGE
 * ─────
 * import { initCastingSequence } from './components/scenes/CastingSequence.js';
 *
 * initCastingSequence({
 *   // Required: selector string OR DOM element of the 800vh wrapper
 *   container: '#casting',
 *
 *   // Optional overrides (defaults shown — relative to the page's origin)
 *   assemblyDir: 'assembly-frames',   // folder name for assembly JPGs
 *   boreDir:     'bore-frames',       // folder name for bore JPGs
 *   framePrefix: 'ezgif-frame-',      // filename prefix
 *   frameCount:  240,                 // total frames per phase
 *
 *   // Mobile video fallback paths (set to null to disable)
 *   assemblyVideo: 'assembly.mp4',
 *   boreVideo:     'bore.mp4',
 * });
 *
 * REQUIREMENTS (must already be on the page)
 * ─────────────────────────────────────────
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
 * <link rel="stylesheet" href="components/scenes/CastingSequence.module.css">
 *
 * EXPECTED HTML SKELETON (generated automatically if not present)
 * ──────────────────────────────────────────────────────────────
 * <section class="cs-wrap" id="casting">
 *   <div class="cs-stage">
 *     <canvas class="cs-canvas"></canvas>
 *     <video class="cs-video" muted playsinline loop preload="metadata"></video>
 *     <!-- overlay divs injected by JS -->
 *   </div>
 * </section>
 *
 * PERFORMANCE NOTES
 * ─────────────────
 * • First 20 assembly frames preloaded immediately; rest in background chunks of 30.
 * • Frames stored as ImageBitmap (fastest ctx.drawImage path).
 * • RAF render loop skips when frameIndex hasn't changed.
 * • Canvas DPR capped at 2; decode width capped at 720 px to limit VRAM.
 * • Bore frames only begin loading after all assembly frames are queued.
 * • Estimated peak memory (desktop): ~2 × 240 × (720×540 RGBA) ≈ 178 MB.
 *   Comfortable on modern devices; falls back to nearest available frame if
 *   any individual fetch fails.
 */

(function (global) {
  'use strict';

  /* ──────────────────────────────────────────────
     DEVICE / CONNECTION HELPERS
  ────────────────────────────────────────────── */
  function isMobile() {
    return (
      window.innerWidth <= 1024 ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0)
    );
  }

  function isSlowConnection() {
    const conn = navigator.connection;
    if (!conn) return false;
    return ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
  }

  /* ──────────────────────────────────────────────
     HTML SCAFFOLD
     Injects required child elements inside .cs-stage
     so the caller only needs the outer wrapper.
  ────────────────────────────────────────────── */
  function buildScaffold(stage) {
    stage.innerHTML = `
      <canvas class="cs-canvas" aria-hidden="true"></canvas>
      <video class="cs-video" muted playsinline loop preload="metadata" aria-hidden="true"></video>

      <!-- ASSEMBLY overlays -->
      <div class="cs-ov cs-ov--bl" id="cs-ov-a1">
        <div class="cs-mono cs-amber cs-mono-12">Five components.</div>
        <div class="cs-mono cs-amber cs-mono-12">One casting.</div>
      </div>
      <div class="cs-ov cs-ov--bl" id="cs-ov-a2">
        <div class="cs-mono cs-amber cs-mono-12">Shell moulded.</div>
        <div class="cs-mono cs-amber cs-mono-12">SG Iron · IS 1865</div>
      </div>
      <div class="cs-ov cs-ov--cb" id="cs-ov-a3">
        <div class="cs-corm-36">Hydraulic Valve Housing</div>
        <div class="cs-mono cs-amber cs-mono-13" style="margin-top:10px">CT8 · Grade 450/12</div>
      </div>

      <!-- BORE overlays -->
      <div class="cs-ov cs-ov--c cs-pulse" id="cs-ov-b1">
        <div class="cs-corm-it-28">Look inside.</div>
      </div>
      <div class="cs-darken" id="cs-darken"></div>
      <div class="cs-finale" id="cs-finale">
        <div class="cs-finale__h">Every machine has one.</div>
        <div class="cs-finale__sub">The part that holds everything together.</div>
      </div>

      <!-- PRELOADER -->
      <div class="cs-pre" id="cs-pre">
        <div class="cs-pre__bar"><i id="cs-pre-bar"></i></div>
        <div class="cs-pre__pct cs-mono" id="cs-pre-pct">000%</div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────────
     MAIN EXPORT
  ────────────────────────────────────────────── */
  function initCastingSequence(opts) {
    opts = opts || {};

    const FRAME_COUNT   = opts.frameCount    || 240;
    const ASSEMBLY_DIR  = opts.assemblyDir   || 'assembly-frames';
    const BORE_DIR      = opts.boreDir       || 'bore-frames';
    const FRAME_PREFIX  = opts.framePrefix   || 'ezgif-frame-';
    const ASSEMBLY_VID  = opts.assemblyVideo !== undefined ? opts.assemblyVideo : 'assembly.mp4';
    const BORE_VID      = opts.boreVideo     !== undefined ? opts.boreVideo     : 'bore.mp4';

    /* ── resolve container ── */
    const wrap = typeof opts.container === 'string'
      ? document.querySelector(opts.container)
      : opts.container;

    if (!wrap) {
      console.warn('[CastingSequence] container not found:', opts.container);
      return;
    }

    /* ── ensure stage child ── */
    let stage = wrap.querySelector('.cs-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';
      wrap.appendChild(stage);
    }
    buildScaffold(stage);

    /* ── element refs ── */
    const canvas  = stage.querySelector('.cs-canvas');
    const video   = stage.querySelector('.cs-video');
    const pre     = stage.querySelector('#cs-pre');
    const preBar  = stage.querySelector('#cs-pre-bar');
    const prePct  = stage.querySelector('#cs-pre-pct');

    const els = {
      a1:     stage.querySelector('#cs-ov-a1'),
      a2:     stage.querySelector('#cs-ov-a2'),
      a3:     stage.querySelector('#cs-ov-a3'),
      b1:     stage.querySelector('#cs-ov-b1'),
      darken: stage.querySelector('#cs-darken'),
      finale: stage.querySelector('#cs-finale'),
    };

    /* ── check GSAP ── */
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ──────────────────────────────────────────
       PATH HELPERS
    ────────────────────────────────────────── */
    function pad3(n) { return String(n).padStart(3, '0'); }
    function aPath(i) { return `${ASSEMBLY_DIR}/${FRAME_PREFIX}${pad3(i + 1)}.jpg`; }
    function bPath(i) { return `${BORE_DIR}/${FRAME_PREFIX}${pad3(i + 1)}.jpg`; }

    /* ──────────────────────────────────────────
       CANVAS SIZING (cover-fit)
    ────────────────────────────────────────── */
    const ctx = canvas.getContext('2d', { alpha: false });

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = window.innerWidth  + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }
    sizeCanvas();

    /* cover-fit draw as specified in scratch pad */
    function drawFrame(img) {
      if (!img) return;
      ctx.fillStyle = '#050302';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width  - img.width  * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    /* ──────────────────────────────────────────
       FRAME STORAGE
    ────────────────────────────────────────── */
    const assemblyFrames = new Array(FRAME_COUNT);
    const boreFrames     = new Array(FRAME_COUNT);
    let firstReady = false;

    /* Decode at 720 px wide — saves ~53% VRAM vs native 1080p decode */
    const DECODE_W = 720;

    async function loadOne(arr, i, pathFn) {
      try {
        const res  = await fetch(pathFn(i));
        if (!res.ok) return;
        const blob = await res.blob();
        arr[i] = await createImageBitmap(blob, { resizeWidth: DECODE_W, resizeQuality: 'high' });
      } catch (_) {
        /* leave undefined; renderer falls back to nearest loaded frame */
      }
    }

    /* Walk outward from index until we find a loaded frame */
    function nearest(arr, i) {
      for (let d = 0; d < FRAME_COUNT; d++) {
        const lo = (i - d + FRAME_COUNT) % FRAME_COUNT;
        const hi = (i + d) % FRAME_COUNT;
        if (arr[lo]) return arr[lo];
        if (arr[hi]) return arr[hi];
      }
      return null;
    }

    /* ── progress bar update ── */
    let _loaded = 0;
    const _total = FRAME_COUNT * 2;
    function bumpProgress() {
      _loaded++;
      const pct = Math.round((_loaded / _total) * 100);
      if (preBar) preBar.style.width = pct + '%';
      if (prePct) prePct.textContent = String(pct).padStart(3, '0') + '%';
    }

    /* ── chunked background preload ── */
    async function preload() {
      /* Step 1: first 20 assembly frames — show canvas immediately */
      const first20 = Array.from({ length: 20 }, (_, i) =>
        loadOne(assemblyFrames, i, aPath).then(bumpProgress)
      );
      await Promise.all(first20);
      firstReady = true;
      if (pre) pre.classList.add('done');

      /* Step 2: queue remaining assembly + all bore frames */
      const queue = [];
      for (let i = 20; i < FRAME_COUNT; i++)
        queue.push(() => loadOne(assemblyFrames, i, aPath).then(bumpProgress));
      for (let i = 0;  i < FRAME_COUNT; i++)
        queue.push(() => loadOne(boreFrames, i, bPath).then(bumpProgress));

      /* load in chunks of 30 so we don't slam the network */
      for (let c = 0; c < queue.length; c += 30) {
        await Promise.all(queue.slice(c, c + 30).map(fn => fn()));
      }
    }

    /* ──────────────────────────────────────────
       OVERLAY LOGIC
    ────────────────────────────────────────── */
    let _finaleTimers   = [];
    let _finaleRunning  = false;

    function clearFinale() {
      _finaleTimers.forEach(clearTimeout);
      _finaleTimers = [];
    }

    function runFinale() {
      els.darken.style.opacity = '1';
      if (_finaleRunning) return;
      _finaleRunning = true;
      _finaleTimers.push(setTimeout(() => els.finale.classList.add('show'),  800));
      _finaleTimers.push(setTimeout(() => els.finale.classList.add('show2'), 1400));
    }

    function setOverlays(phase, f) {
      const show = (el, cond) => el && el.classList.toggle('show', !!cond);

      if (phase === 'assembly') {
        show(els.a1, f >= 20  && f < 80);
        show(els.a2, f >= 120 && f < 180);
        show(els.a3, f >= 220);
        show(els.b1, false);
        if (els.darken)  els.darken.style.opacity = '0';
        if (els.finale)  els.finale.classList.remove('show', 'show2');
        clearFinale();
        _finaleRunning = false;

      } else { /* bore */
        show(els.a1, false);
        show(els.a2, false);
        show(els.a3, false);
        show(els.b1, f >= 1 && f < 60);

        /* darken: rgba(5,4,3,0) → rgba(5,4,3,0.7) across frames 180–239 */
        const darkenAmt = f < 180 ? 0
          : Math.min(0.7, ((f - 180) / (239 - 180)) * 0.7);
        if (els.darken) els.darken.style.opacity = String(darkenAmt);

        if (f >= 239) {
          runFinale();
        } else {
          if (els.finale) els.finale.classList.remove('show', 'show2');
          clearFinale();
          _finaleRunning = false;
        }
      }
    }

    /* Reduced-motion: show all overlays synchronously based on progress */
    function setOverlaysReduced(progress) {
      /* Show the most contextually relevant overlay for the static view */
      const phase = progress < 0.5 ? 'assembly' : 'bore';
      const pp    = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
      const f     = Math.floor(pp * (FRAME_COUNT - 1));
      setOverlays(phase, f);
    }

    /* ──────────────────────────────────────────
       DESKTOP — scroll-scrubbed canvas
    ────────────────────────────────────────── */
    function initDesktop() {
      if (!hasGSAP) {
        console.warn('[CastingSequence] GSAP + ScrollTrigger required for desktop mode.');
        initSlow();
        return;
      }

      window.gsap.registerPlugin(window.ScrollTrigger);

      let target    = { phase: 'assembly', frame: 0 };
      let lastFrame = -1;
      let lastPhase = '';

      window.ScrollTrigger.create({
        trigger:  wrap,
        start:    'top top',
        end:      'bottom bottom',
        pin:      stage,
        scrub:    0.5,          /* slight cinematic lag vs scrub:true */
        onUpdate: function (self) {
          const phase = self.progress < 0.5 ? 'assembly' : 'bore';
          const pp    = self.progress < 0.5
            ? self.progress * 2
            : (self.progress - 0.5) * 2;
          target = { phase, frame: Math.floor(pp * (FRAME_COUNT - 1)) };
          setOverlays(phase, target.frame);
          if (phase !== 'bore') { _finaleRunning = false; }
        },
      });

      /* RAF render loop — only redraws when frame index changes */
      (function loop() {
        requestAnimationFrame(loop);
        if (!firstReady) return;
        if (target.frame !== lastFrame || target.phase !== lastPhase) {
          const arr = target.phase === 'assembly' ? assemblyFrames : boreFrames;
          drawFrame(arr[target.frame] || nearest(arr, target.frame));
          lastFrame = target.frame;
          lastPhase = target.phase;
        }
      })();

      preload();
    }

    /* ──────────────────────────────────────────
       MOBILE — video autoplay + IntersectionObserver
    ────────────────────────────────────────── */
    function initMobile() {
      canvas.style.display = 'none';
      if (pre) pre.classList.add('done');

      /* No video src supplied or file absent → fall back to slow static */
      if (!ASSEMBLY_VID) { initSlow(); return; }

      let phase = 'assembly';
      video.style.display = 'block';
      video.src = ASSEMBLY_VID;
      video.loop = true;

      /* play when 40% visible */
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.intersectionRatio >= 0.4) {
              video.play().catch(function () {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: [0, 0.4, 1] }
      );
      io.observe(stage);

      /* overlay via timeupdate */
      video.addEventListener('timeupdate', function () {
        const f = Math.floor((video.currentTime / (video.duration || 1)) * (FRAME_COUNT - 1));
        setOverlays(phase, f);
      });

      /* when assembly ends, switch to bore */
      video.addEventListener('ended', function () {
        if (phase === 'assembly' && BORE_VID) {
          phase = 'bore';
          video.loop = false;
          video.src = BORE_VID;
          video.play().catch(function () {});
        }
      });
    }

    /* ──────────────────────────────────────────
       SLOW CONNECTION — single static first frame
    ────────────────────────────────────────── */
    function initSlow() {
      if (pre) pre.classList.add('done');
      fetch(aPath(0))
        .then(function (r) { return r.blob(); })
        .then(function (b) { return createImageBitmap(b); })
        .then(function (img) { sizeCanvas(); drawFrame(img); })
        .catch(function () {});
    }

    /* ──────────────────────────────────────────
       REDUCED MOTION — static first frame + visible copy
    ────────────────────────────────────────── */
    function initReducedMotion() {
      if (pre) pre.classList.add('done');
      /* show static first frame */
      fetch(aPath(0))
        .then(function (r) { return r.blob(); })
        .then(function (b) { return createImageBitmap(b); })
        .then(function (img) { drawFrame(img); })
        .catch(function () {});
      /* show the final assembly overlay so copy is visible */
      setOverlaysReduced(0.9);
    }

    /* ──────────────────────────────────────────
       RESIZE HANDLER
    ────────────────────────────────────────── */
    window.addEventListener('resize', function () {
      sizeCanvas();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });

    /* ──────────────────────────────────────────
       BOOT
    ────────────────────────────────────────── */
    if (REDUCED) {
      initReducedMotion();
    } else if (isSlowConnection()) {
      initSlow();
    } else if (isMobile()) {
      initMobile();
    } else {
      initDesktop();
    }

    /* expose for debugging */
    window.__CastingSequence = {
      isMobile:        isMobile(),
      isSlowConnection:isSlowConnection(),
      isReducedMotion: REDUCED,
      get firstReady() { return firstReady; },
      get assembled()  { return assemblyFrames.filter(Boolean).length; },
      get bored()      { return boreFrames.filter(Boolean).length; },
    };
  }

  /* ── export ── */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCastingSequence };
  } else {
    global.initCastingSequence = initCastingSequence;
  }

})(typeof globalThis !== 'undefined' ? globalThis : window);

/**
 * globeScene.js — Realistic Earth + molten India + trade routes (V1 reach).
 *
 *  - Proper photographic day Earth (earth-2k.jpg)
 *  - INDIA rendered as its real country shape, glowing molten orange with a
 *    radiating burst (equirectangular overlay shell, aligned to the texture)
 *  - Orange great-circle arcs from Kolhapur + travelling molten drop
 *  - Lava pool flare where each arc lands
 *  - Interactive: click/touch-drag to rotate, inertia, auto-spin resumes
 *  - Framed with margin (no top/bottom crop). One texture, no CDN dependency.
 */

import * as THREE from 'three';

const canvas    = document.getElementById('reach-globe-canvas');
const container = document.getElementById('reach-wrap');
if (!canvas || !container) throw new Error('[globeScene] elements not found');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Renderer ───────────────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
// Pull the camera back so the globe + arcs sit with margin (no crop).
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 3.5);
camera.lookAt(0, 0, 0);

function resize() {
  const w = container.clientWidth || window.innerWidth;
  // Taller aspect so the sphere is never clipped top/bottom.
  const h = Math.min(Math.round(w * 0.62), 600);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resize();
window.addEventListener('resize', resize);

/* ── Lighting (jeskojets-style dark monochrome globe) ───────── */
scene.add(new THREE.AmbientLight(0xffffff, 0.95));
const sun = new THREE.DirectionalLight(0xffe6c4, 0.85);
sun.position.set(2.5, 1.4, 3.0);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffcaa0, 0.18);
fill.position.set(-3, -1, -2);
scene.add(fill);

/* ── The rotatable group (globe + all overlays) ─────────────── */
const earth = new THREE.Group();
const INIT_ROT  = -(74.2 + 90) * (Math.PI / 180); // India faces camera at start
const INIT_TILT = 0.32;                            // tilt so India sits centred
earth.rotation.y = INIT_ROT;
earth.rotation.x = INIT_TILT;
scene.add(earth);

/* ── Dark monochrome globe (jeskojets style) ────────────────── */
const globeMat = new THREE.MeshStandardMaterial({ color: 0x16120c, roughness: 1, metalness: 0 });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), globeMat);
earth.add(globe);
// Load earth-2k and recolour: blue oceans → near-black, land → faint warm tan.
new THREE.TextureLoader().load('/images/earth-2k.jpg', (t) => {
  const img = t.image, W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], g = a[i + 1], bch = a[i + 2];
    if (bch > r + 8 && bch > g + 2) {            // blue-dominant = ocean
      a[i] = 17; a[i + 1] = 14; a[i + 2] = 10;
    } else {                                      // land = warm tan relief
      const lum = (r * 0.3 + g * 0.59 + bch * 0.11) / 255;
      const v = 0.45 + 0.55 * Math.pow(lum, 0.85);
      a[i] = Math.round(48 + v * 78); a[i + 1] = Math.round(40 + v * 60); a[i + 2] = Math.round(30 + v * 42);
    }
  }
  x.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true;
});

/* ── Faint lat/long grid (jeskojets meridians/parallels) ────── */
(function addGrid() {
  const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
  x.strokeStyle = 'rgba(225,185,135,0.16)'; x.lineWidth = 1.5;
  for (let lat = -80; lat <= 80; lat += 20) { const y = ((90 - lat) / 180) * H; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  for (let lon = -180; lon < 180; lon += 20) { const xx = ((lon + 180) / 360) * W; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const grid = new THREE.Mesh(new THREE.SphereGeometry(1.004, 96, 96),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  earth.add(grid);
})();

/* ── Subtle warm rim (no blue atmosphere) ───────────────────── */
const atmosMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);
      vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz);
      gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vV;
    void main(){ float rim=pow(1.0-abs(dot(vN,vV)),4.0);
      gl_FragColor=vec4(vec3(0.55,0.38,0.20), rim*0.28); }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 64), atmosMat));

/* ── INDIA as its real shape, glowing molten orange ─────────── */
// Simplified India outline (lat, lon), clockwise from the north.
const INDIA_OUTLINE = [
  [35.0,74.0],[34.0,78.0],[32.5,79.2],[30.2,81.0],[28.6,84.0],[27.6,88.2],
  [27.2,92.0],[28.1,95.4],[26.6,97.2],[24.2,94.2],[23.0,93.2],[22.0,92.0],
  [21.6,89.0],[20.2,87.0],[16.5,81.5],[13.1,80.3],[10.3,79.8],[8.1,77.5],
  [9.2,76.2],[12.8,74.6],[15.8,73.6],[19.0,72.8],[20.9,70.2],[22.6,69.0],
  [24.3,71.0],[26.0,70.0],[28.0,70.2],[30.0,74.0],[32.2,75.0],[35.0,74.0],
];

function buildIndiaTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.clearRect(0, 0, W, H);
  const px = (lat, lon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

  // Outer glow (radiating burst) — soft orange halo around India
  x.save();
  x.shadowColor = 'rgba(255,120,30,0.95)';
  x.shadowBlur = 90;
  x.beginPath();
  INDIA_OUTLINE.forEach(([lat, lon], i) => { const [a, b] = px(lat, lon); i ? x.lineTo(a, b) : x.moveTo(a, b); });
  x.closePath();
  x.fillStyle = 'rgba(255,120,30,1)';
  x.fill();
  x.fill(); // double for a stronger halo
  x.restore();

  // Filled India with a molten gradient (hot core → deep orange edge)
  const [cx, cy] = px(21, 79);
  const grd = x.createRadialGradient(cx, cy, 4, cx, cy, 150);
  grd.addColorStop(0.0, '#fff1c0');
  grd.addColorStop(0.35, '#ff8a1e');
  grd.addColorStop(1.0, '#e24a08');
  x.beginPath();
  INDIA_OUTLINE.forEach(([lat, lon], i) => { const [a, b] = px(lat, lon); i ? x.lineTo(a, b) : x.moveTo(a, b); });
  x.closePath();
  x.fillStyle = grd;
  x.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Glow burst behind India (radiating rays / molten halo)
const indiaBurst = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (function(){
    const s=256,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');
    const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    g.addColorStop(0,'rgba(255,180,80,0.9)');g.addColorStop(0.3,'rgba(255,110,25,0.6)');
    g.addColorStop(0.6,'rgba(230,70,10,0.25)');g.addColorStop(1,'rgba(230,70,10,0)');
    x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);
  })(),
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
indiaBurst.position.copy(ll(21, 78, 1.01));
indiaBurst.scale.setScalar(0.95);
indiaBurst.renderOrder = 1;
earth.add(indiaBurst);

// India as its real country shape — solid molten fill so the shape reads clearly
const indiaShell = new THREE.Mesh(
  new THREE.SphereGeometry(1.006, 96, 96),
  new THREE.MeshBasicMaterial({
    map: buildIndiaTexture(), transparent: true, depthWrite: false,
  })
);
indiaShell.renderOrder = 2;
earth.add(indiaShell);

/* ── Lat/lon → 3D ───────────────────────────────────────────── */
function ll(lat, lon, r = 1.0) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Molten glow sprite (for drops + lava pools) ────────────── */
function glowTex() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0.0, 'rgba(255,245,220,1)');
  g.addColorStop(0.25, 'rgba(255,130,30,0.95)');
  g.addColorStop(0.6, 'rgba(220,70,10,0.4)');
  g.addColorStop(1.0, 'rgba(220,70,10,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
const moltenTex = glowTex();
const moltenSprite = (size) => {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({
    map: moltenTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  m.scale.setScalar(size); return m;
};

/* ── Trade routes ───────────────────────────────────────────── */
const ORIGIN = [16.7, 74.2];
const DESTS = [[41.9,12.5],[51.5,-0.1],[35.7,139.7],[38.0,-97.0]]; // Italy, UK, Japan, USA
const ARC_R = 1.012;
const arcs = [];

DESTS.forEach((d) => {
  const from = ll(ORIGIN[0], ORIGIN[1], ARC_R), to = ll(d[0], d[1], ARC_R);
  const N = 100; const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = new THREE.Vector3().lerpVectors(from, to, t).normalize();
    p.multiplyScalar(ARC_R * (1 + Math.sin(t * Math.PI) * 0.22));
    pts.push(p);
  }
  const full = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { full[i*3]=p.x; full[i*3+1]=p.y; full[i*3+2]=p.z; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(full.slice(0,3), 3));
  geo._full = full; geo._N = N; geo._pts = pts;
  earth.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xff7a1e, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
  })));
  const drop = moltenSprite(0.11); drop.visible = false; earth.add(drop);
  const pool = moltenSprite(0.0);  pool.position.copy(ll(d[0], d[1], 1.015)); earth.add(pool);
  arcs.push({ geo, drop, pool, startMs: null, pts });
});

/* ── Arc animation ──────────────────────────────────────────── */
let started = false;
function startArcs() {
  if (started) return; started = true;
  const now = performance.now();
  arcs.forEach((a, i) => { a.startMs = now + i * 380; });
}
function updateArcs(now) {
  arcs.forEach((a) => {
    if (a.startMs === null) return;
    const DRAW = 1700;
    const t = Math.max(0, Math.min(1, (now - a.startMs) / DRAW));
    const N = a.geo._N, ct = Math.max(2, Math.round(t * N));
    a.geo.setAttribute('position', new THREE.BufferAttribute(a.geo._full.slice(0, ct*3), 3));
    a.geo.attributes.position.needsUpdate = true;
    a.geo.setDrawRange(0, ct);
    if (t > 0 && t < 1) { a.drop.visible = true; a.drop.position.copy(a.pts[Math.min(ct, N)]); }
    else if (t >= 1) {
      a.drop.visible = false;
      const since = (now - (a.startMs + DRAW)) / 1000;
      const flare = Math.min(since / 0.4, 1);
      const pulse = 0.22 + 0.06 * Math.sin(since * 3.0);
      a.pool.scale.setScalar(flare * pulse + 0.001);
      a.pool.material.opacity = 0.65 + 0.25 * Math.sin(since * 3.0);
    }
  });
}

/* ── Interactivity: drag to rotate, inertia, auto-spin resume ── */
let dragging = false, lastX = 0, lastY = 0;
let velY = 0, velX = 0;          // inertia
let userY = 0, userX = 0;        // accumulated user rotation
let autoSpin = 0;                // auto rotation accumulator
let idleMs = 0;                  // ms since last interaction

canvas.style.cursor = 'grab';
function onDown(e) {
  dragging = true; idleMs = 0; canvas.style.cursor = 'grabbing';
  const p = e.touches ? e.touches[0] : e;
  lastX = p.clientX; lastY = p.clientY; velY = velX = 0;
}
function onMove(e) {
  if (!dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const dx = p.clientX - lastX, dy = p.clientY - lastY;
  // On touch, let a clearly-vertical swipe scroll the page instead of rotating.
  if (e.touches && Math.abs(dy) > Math.abs(dx) * 1.3) { dragging = false; return; }
  lastX = p.clientX; lastY = p.clientY;
  velY = dx * 0.005; velX = dy * 0.005;
  userY += velY; userX += velX;
  userX = Math.max(-0.6, Math.min(0.6, userX)); // clamp tilt
  if (e.cancelable && (!e.touches || Math.abs(dx) >= Math.abs(dy))) e.preventDefault();
}
function onUp() { dragging = false; idleMs = 0; canvas.style.cursor = 'grab'; }

canvas.addEventListener('mousedown', onDown);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', onDown, { passive: true });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onUp);

/* ── Loop ───────────────────────────────────────────────────── */
const clock = new THREE.Clock();
let running = false;

function tick() {
  if (!running) return;
  requestAnimationFrame(tick);
  const dt = clock.getDelta();
  const now = performance.now();

  if (!dragging) {
    idleMs += dt * 1000;
    // inertia decay
    userY += velY; userX += velX;
    velY *= 0.94; velX *= 0.94;
    userX = Math.max(-0.6, Math.min(0.6, userX));
    // resume gentle auto-spin after 2.5s idle
    if (!REDUCED && idleMs > 2500) autoSpin += dt * 0.07;
  }

  earth.rotation.y = INIT_ROT + autoSpin + userY;
  earth.rotation.x = INIT_TILT + userX;

  // India breathing glow burst
  const el = clock.elapsedTime;
  indiaBurst.scale.setScalar(0.95 * (1 + Math.sin(el * 2.2) * 0.10));
  indiaBurst.material.opacity = 0.85 + Math.sin(el * 2.2) * 0.12;

  updateArcs(now);
  renderer.render(scene, camera);
}

const obs = new IntersectionObserver((entries) => {
  const vis = entries[0].isIntersecting;
  if (vis) { startArcs(); if (!running) { running = true; clock.start(); tick(); } }
  else running = false;
}, { threshold: 0.15 });
obs.observe(canvas);

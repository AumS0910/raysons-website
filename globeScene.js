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
camera.position.set(0, 0, 3.25);   // full globe with margin (not cropped)
camera.lookAt(0, 0, 0);

function resize() {
  const w = container.clientWidth || window.innerWidth;
  // Tall canvas so the big sphere has full vertical room (never clipped).
  const h = Math.min(Math.round(w * 0.82), 860);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resize();
window.addEventListener('resize', resize);

/* ── Lighting (neutral — jeskojets grey globe) ──────────────── */
scene.add(new THREE.AmbientLight(0xffffff, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(2.5, 1.4, 3.0);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.14);
fill.position.set(-3, -1, -2);
scene.add(fill);

/* ── The rotatable group (globe + all overlays) ─────────────── */
const earth = new THREE.Group();
const INIT_ROT  = -(74.2 + 90) * (Math.PI / 180); // India faces camera at start
const INIT_TILT = 0.32;                            // tilt so India sits centred
earth.rotation.y = INIT_ROT;
earth.rotation.x = INIT_TILT;
scene.add(earth);

/* ── Globe — jeskojets look: light-grey land, near-black ocean ── */
const globeMat = new THREE.MeshStandardMaterial({ color: 0x101013, roughness: 1, metalness: 0 });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), globeMat);
earth.add(globe);
// Recolour earth-2k → clean matte-grey continents with a CRISP coastline
// outline (so they're defined, not messy), near-black ocean. (jeskojets look)
new THREE.TextureLoader().load('/images/earth-2k.jpg', (t) => {
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(t.image, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), a = d.data;
  // pass 1 — land/ocean mask (ocean = blue-dominant)
  const land = new Uint8Array(W * H);
  for (let pi = 0; pi < W * H; pi++) { const i = pi * 4; land[pi] = (a[i+2] > a[i]+8 && a[i+2] > a[i+1]+2) ? 0 : 1; }
  // pass 2 — recolour: ocean black, land matte grey, coastline a bright edge
  for (let pi = 0; pi < W * H; pi++) {
    const i = pi * 4;
    if (!land[pi]) { a[i] = 12; a[i+1] = 12; a[i+2] = 14; continue; }
    const lum = (a[i]*0.3 + a[i+1]*0.59 + a[i+2]*0.11) / 255;
    let gy = Math.round(132 + Math.pow(lum, 0.7) * 48);     // uniform matte grey 132..180
    const xc = pi % W, yc = (pi / W) | 0;
    const edge = (xc>0 && !land[pi-1]) || (xc<W-1 && !land[pi+1]) || (yc>0 && !land[pi-W]) || (yc<H-1 && !land[pi+W]);
    if (edge) gy = 220;                                     // crisp coastline outline
    a[i] = gy; a[i+1] = gy; a[i+2] = gy + 4;
  }
  x.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true;
});
// (no lat/long grid, no atmosphere ring — match jeskojets exactly)

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

  const path = () => { x.beginPath(); INDIA_OUTLINE.forEach(([lat, lon], i) => { const [a, b] = px(lat, lon); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); };

  // small, clean glow (no big fuzzy halo)
  x.save(); x.shadowColor = 'rgba(255,120,30,0.55)'; x.shadowBlur = 18; path(); x.fillStyle = '#ff7a1e'; x.fill(); x.restore();

  // clean orange fill
  const [cx, cy] = px(21, 79);
  const grd = x.createRadialGradient(cx, cy, 4, cx, cy, 140);
  grd.addColorStop(0.0, '#ffb24d'); grd.addColorStop(0.5, '#ff7a1e'); grd.addColorStop(1.0, '#e85a10');
  path(); x.fillStyle = grd; x.fill();

  // crisp outline so the country shape reads clearly
  path(); x.lineWidth = 4; x.strokeStyle = 'rgba(255,224,170,0.92)'; x.stroke();

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
indiaBurst.scale.setScalar(0.5);   // smaller, subtle glow (not a big halo)
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
const LIMIT = Math.PI / 2;        // ±90° → 180° total, left-right only
function onMove(e) {
  if (!dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const dx = p.clientX - lastX, dy = p.clientY - lastY;
  // On touch, let a clearly-vertical swipe scroll the page instead of rotating.
  if (e.touches && Math.abs(dy) > Math.abs(dx) * 1.3) { dragging = false; return; }
  lastX = p.clientX; lastY = p.clientY;
  velY = dx * 0.005;                                  // horizontal only
  userY = Math.max(-LIMIT, Math.min(LIMIT, userY + velY));  // clamp to 180°
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
    // horizontal inertia, clamped to the 180° range. No full 360 spin.
    userY = Math.max(-LIMIT, Math.min(LIMIT, userY + velY));
    velY *= 0.94;
  }

  // gentle idle left-right oscillation so the globe is alive (pauses while dragging)
  const osc = (REDUCED || dragging) ? 0 : Math.sin(clock.elapsedTime * 0.16) * 0.30;
  earth.rotation.y = INIT_ROT + userY + osc;   // left-right only
  earth.rotation.x = INIT_TILT;                // fixed tilt (no vertical drag)

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

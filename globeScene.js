/**
 * globeScene.js — Real photographic Earth globe for V1 reach section.
 *
 * Texture: NASA Blue Marble (land_ocean_ice_cloud_2048.jpg)
 * Served from three.js examples CDN. For production, download and serve locally:
 *   https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg
 *   → place at /images/earth-2k.jpg in the raysons-website directory
 *
 * Features:
 *   - Photographic 2048×1024 NASA Earth texture
 *   - Specular ocean shininess (dedicated specular texture)
 *   - Atmosphere / limb glow shader (additive blending)
 *   - Shipping routes: Kolhapur → Italy, UK, Japan, USA (animated great-circle arcs)
 *   - Pulsing orange origin marker (Kolhapur)
 *   - Slow auto-rotation, starts with India facing camera
 *   - IntersectionObserver pause, arc animation on scroll-in
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0.15, 2.6);
camera.lookAt(0, 0, 0);

function resize() {
  const w = container.clientWidth  || window.innerWidth;
  const h = Math.min(Math.round(w * 0.58), 520);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}
resize();
window.addEventListener('resize', resize);

/* ── Lighting ───────────────────────────────────────────────── */
// Sun — warm directional from upper-right (Pacific side)
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(5, 3, 5);
scene.add(sun);

// Subtle cool fill from opposite (space side)
const fill = new THREE.DirectionalLight(0x2244aa, 0.18);
fill.position.set(-5, -2, -3);
scene.add(fill);

// Low ambient so dark side isn't fully black
scene.add(new THREE.AmbientLight(0x111828, 0.6));

/* ── Earth textures ─────────────────────────────────────────── */
const loader  = new THREE.TextureLoader();

// Try local first, fall back to three.js CDN
const EARTH_LOCAL   = '/images/earth-2k.jpg';
const EARTH_CDN     = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
const SPECULAR_CDN  = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';

function loadTex(url, fallback) {
  return new Promise(resolve => {
    loader.load(url, resolve, undefined, () => {
      if (fallback) loader.load(fallback, resolve, undefined, () => resolve(null));
      else resolve(null);
    });
  });
}

// Globe sphere — visible immediately with dark placeholder, texture swaps in
const globeMat = new THREE.MeshPhongMaterial({
  color: 0x1a2a40,
  specular: new THREE.Color(0x224488),
  shininess: 18,
});
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 80, 80), globeMat);
// Start with India/Kolhapur (74.2°E) facing the camera
globe.rotation.y = -(74.2 + 90) * (Math.PI / 180);
scene.add(globe);

// Load textures asynchronously and swap in
Promise.all([
  loadTex(EARTH_LOCAL, EARTH_CDN),
  loadTex(SPECULAR_CDN, null),
]).then(([earthTex, specTex]) => {
  if (earthTex) {
    earthTex.colorSpace = THREE.SRGBColorSpace;
    globeMat.map     = earthTex;
    globeMat.color.set(0xffffff);
    globeMat.needsUpdate = true;
  }
  if (specTex) {
    globeMat.specularMap = specTex;
    globeMat.specular.set(0x888888);
    globeMat.shininess = 25;
    globeMat.needsUpdate = true;
  }
});

/* ── Atmosphere glow ────────────────────────────────────────── */
const atmosMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  uniforms: {
    innerColor: { value: new THREE.Color(0x1a44aa) },
    rimColor:   { value: new THREE.Color(0x3388ee) },
    sunDir:     { value: sun.position.clone().normalize() },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal  = normalize(normalMatrix * normal);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform vec3 innerColor;
    uniform vec3 rimColor;
    uniform vec3 sunDir;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float rim = 1.0 - abs(dot(vNormal, vViewDir));
      rim = pow(rim, 2.8);
      // Slight sun-side brightening
      float sun = clamp(dot(vNormal, sunDir) * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(innerColor, rimColor, rim) * (0.7 + sun * 0.3);
      gl_FragColor = vec4(col, rim * 0.75);
    }
  `,
});
const atmos = new THREE.Mesh(new THREE.SphereGeometry(1.095, 64, 64), atmosMat);
scene.add(atmos);

/* ── Lat/lon → 3D ───────────────────────────────────────────── */
function ll(lat, lon, r = 1.0) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Shipping routes ────────────────────────────────────────── */
const ORIGIN = [16.7, 74.2]; // Kolhapur
const ROUTES = [
  { dest: [41.9, 12.5],   label: 'Italy',  color: new THREE.Color(0xff6a1a) },
  { dest: [51.5, -0.1],   label: 'UK',     color: new THREE.Color(0xff8844) },
  { dest: [35.7, 139.7],  label: 'Japan',  color: new THREE.Color(0xffaa66) },
  { dest: [38.0, -97.0],  label: 'USA',    color: new THREE.Color(0xffcc88) },
];

const ARC_R = 1.018;
const arcObjects = []; // { line, fullPos, startMs }
const destDots   = [];

ROUTES.forEach(route => {
  const from  = ll(ORIGIN[0], ORIGIN[1], ARC_R);
  const to    = ll(route.dest[0], route.dest[1], ARC_R);
  const N     = 90;
  const full  = new Float32Array((N + 1) * 3);

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = new THREE.Vector3().lerpVectors(from, to, t).normalize();
    const lift = 1 + Math.sin(t * Math.PI) * 0.22;
    p.multiplyScalar(ARC_R * lift);
    full[i*3] = p.x; full[i*3+1] = p.y; full[i*3+2] = p.z;
  }

  const geo  = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(full.slice(0, 3), 3));
  geo._full = full; geo._N = N;

  const mat  = new THREE.LineBasicMaterial({
    color: route.color, transparent: true, opacity: 0.85, linewidth: 1,
  });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  arcObjects.push({ line, geo, startMs: null });

  // Destination dot
  const dot  = new THREE.Mesh(
    new THREE.SphereGeometry(0.020, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff0e0 })
  );
  dot.position.copy(ll(route.dest[0], route.dest[1], ARC_R + 0.012));
  dot.visible = false;
  scene.add(dot);
  destDots.push(dot);
});

/* ── Kolhapur origin marker ─────────────────────────────────── */
const originDot = new THREE.Mesh(
  new THREE.SphereGeometry(0.024, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff6a1a })
);
originDot.position.copy(ll(ORIGIN[0], ORIGIN[1], ARC_R + 0.012));
scene.add(originDot);

// Pulsing ring
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.030, 0.038, 36),
  new THREE.MeshBasicMaterial({
    color: 0xff6a1a, transparent: true, opacity: 0.7,
    side: THREE.DoubleSide, depthWrite: false,
  })
);
pulseRing.position.copy(originDot.position);
pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(pulseRing);

/* ── Arc draw animation ─────────────────────────────────────── */
let arcsStarted = false;

function startArcs() {
  if (arcsStarted) return;
  arcsStarted = true;
  const now = performance.now();
  arcObjects.forEach((a, i) => { a.startMs = now + i * 320; });
}

function updateArcs(now) {
  arcObjects.forEach((a, i) => {
    if (a.startMs === null) return;
    const t  = Math.max(0, Math.min(1, (now - a.startMs) / 1800));
    const N  = a.geo._N;
    const ct = Math.max(2, Math.round(t * N));
    const buf = a.geo._full.slice(0, ct * 3);
    a.geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    a.geo.attributes.position.needsUpdate = true;
    a.geo.setDrawRange(0, ct);
    if (t >= 0.99 && !destDots[i].visible) destDots[i].visible = true;
  });
}

/* ── Rotate all scene objects with the globe ────────────────── */
const INIT_ROT = -(74.2 + 90) * (Math.PI / 180);
let rotY = INIT_ROT;

function rotatePt(pos, ry) {
  return pos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
}

function syncWithGlobe(ry) {
  arcObjects.forEach(a => { a.line.rotation.y = ry; });
  destDots.forEach(d   => { d.rotation.y = ry; });
  originDot.position.copy(rotatePt(ll(ORIGIN[0], ORIGIN[1], ARC_R + 0.012), ry - INIT_ROT));
  pulseRing.position.copy(originDot.position);
  pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
}

/* ── Render loop ────────────────────────────────────────────── */
const clock = new THREE.Clock();
let running = false;

function tick() {
  if (!running) return;
  requestAnimationFrame(tick);

  const el    = clock.getElapsedTime();
  const now   = performance.now();

  if (!REDUCED) {
    rotY = INIT_ROT + el * 0.10;
    globe.rotation.y = rotY;
    atmos.rotation.y = rotY * 0.95;
    syncWithGlobe(rotY);

    // Pulse ring
    const ps = 1 + Math.sin(el * 2.8) * 0.3;
    pulseRing.scale.setScalar(ps);
    pulseRing.material.opacity = 0.7 - Math.sin(el * 2.8) * 0.35;
  }

  updateArcs(now);
  renderer.render(scene, camera);
}

/* ── IntersectionObserver ───────────────────────────────────── */
const obs = new IntersectionObserver(entries => {
  const vis = entries[0].isIntersecting;
  if (vis) {
    startArcs();
    if (!running) { running = true; clock.start(); tick(); }
  } else {
    running = false;
  }
}, { threshold: 0.15 });
obs.observe(canvas);

/**
 * hubScene.js — Pinned scroll cinematic for the V1 overview page.
 *
 * The #hub-realm section is tall (420vh). Its sticky stage pins a full-screen
 * 3D canvas. Scroll progress (0→1) through the section drives:
 *
 *   t 0.00–0.15  ENTER THE REALM  — camera dollies in from far; hub rotates
 *                                   horizontal → vertical; vignette fades in.
 *   t 0.15–0.32  TITLE HOLD       — "The part inside the machine." reads.
 *   t 0.32–0.52  BEAT 1           — orbit right, bore caption.
 *   t 0.52–0.72  BEAT 2           — low angle, machined flange face caption.
 *   t 0.72–0.88  BEAT 3           — orbit left, bolt-pattern caption.
 *   t 0.88–1.00  PULL BACK / EXIT — specs reveal, camera retreats.
 *
 * Everything is lerped — nothing snaps (V2 damping philosophy).
 * Uses three/examples/jsm only (already in V1's `three` dep). No new packages.
 * Responsive (full-viewport resize), reduced-motion + touch aware.
 */

import * as THREE from 'three';
import { RGBELoader }            from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment }       from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer }        from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }            from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }       from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }            from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

const canvas  = document.getElementById('hub-scene-canvas');
const section = document.getElementById('hub-realm');
if (!canvas || !section) throw new Error('[hubScene] required elements missing');

const REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = window.matchMedia('(hover: none)').matches;

/* ── helpers ─────────────────────────────────────────────────── */
const clamp  = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp   = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
function lerpV3(cur, tgt, t) {
  cur.x += (tgt.x - cur.x) * t;
  cur.y += (tgt.y - cur.y) * t;
  cur.z += (tgt.z - cur.z) * t;
}
// Opacity envelope: 0 before fadeInStart, ramps to 1 by fullStart,
// holds to fullEnd, ramps to 0 by fadeOutEnd.
function envelope(t, fadeInStart, fullStart, fullEnd, fadeOutEnd) {
  if (t <= fadeInStart || t >= fadeOutEnd) return 0;
  if (t < fullStart)  return (t - fadeInStart) / (fullStart - fadeInStart);
  if (t <= fullEnd)   return 1;
  return 1 - (t - fullEnd) / (fadeOutEnd - fullEnd);
}

/* ── Renderer ────────────────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.3 : 1.5));
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);

const stage = canvas.parentElement; // .hub-realm__sticky (full viewport)
const W = () => stage.clientWidth  || window.innerWidth;
const H = () => stage.clientHeight || window.innerHeight;

const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.05, 100);

/* ── Camera path keyframes (for the VERTICAL hub) ───────────────
   Each entry: [t, posX,posY,posZ, lookX,lookY,lookZ]               */
const CAM_KEYS = [
  [0.00, -0.3, 0.6, 7.6,  0.0,  0.00, 0.0], // far — entering the realm
  [0.15, -0.4, 0.9, 4.0,  0.0,  0.15, 0.0], // arrived — hero 3/4 framing
  [0.32, -0.4, 0.9, 4.0,  0.0,  0.15, 0.0], // hold for the title
  [0.50,  2.7, 0.5, 2.9,  0.0,  0.10, 0.0], // beat 1 — orbit right (bore/profile)
  [0.66,  1.0,-1.2, 2.0,  0.0, -0.35, 0.0], // beat 2 — low, machined flange face
  [0.82, -2.3, 0.7, 2.4,  0.0,  0.02, 0.0], // beat 3 — orbit left (bolt pattern)
  [1.00,  0.0, 0.5, 5.4,  0.0,  0.10, 0.0], // exit — pull back
];

function sampleCamera(t, outPos, outLook) {
  const ct = clamp(t);
  let i = 0;
  while (i < CAM_KEYS.length - 1 && ct > CAM_KEYS[i + 1][0]) i++;
  const a = CAM_KEYS[i], b = CAM_KEYS[Math.min(i + 1, CAM_KEYS.length - 1)];
  const span = (b[0] - a[0]) || 1;
  const lt = smooth(clamp((ct - a[0]) / span));
  outPos.set( lerp(a[1], b[1], lt), lerp(a[2], b[2], lt), lerp(a[3], b[3], lt));
  outLook.set(lerp(a[4], b[4], lt), lerp(a[5], b[5], lt), lerp(a[6], b[6], lt));
}

const _tgtPos  = new THREE.Vector3();
const _tgtLook = new THREE.Vector3();
const _curPos  = new THREE.Vector3(-0.3, 0.6, 7.6);
const _curLook = new THREE.Vector3(0, 0, 0);
camera.position.copy(_curPos);
camera.lookAt(_curLook);

function resize() {
  const w = W(), h = H();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

/* ── Post-processing ─────────────────────────────────────────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.0, 0.42, 0.78);
composer.addPass(bloom);
const gamma = new ShaderPass(GammaCorrectionShader);
gamma.renderToScreen = true;
composer.addPass(gamma);

/* ── Lighting ────────────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x111111, 1.0));
const key = new THREE.DirectionalLight(0xd8d0c8, 2.0); key.position.set(-3, 4, 3); scene.add(key);
const fill = new THREE.DirectionalLight(0x8899cc, 0.55); fill.position.set(4, -1, 2); scene.add(fill);
scene.add(new THREE.HemisphereLight(0x9ab0cc, 0x221f1a, 0.9));
const rim = new THREE.SpotLight(0xff6a1a, 0.0, 14, Math.PI / 5, 0.8, 1.6);
rim.position.set(2.5, 2.6, -2.0);
const rimTarget = new THREE.Object3D(); scene.add(rimTarget); rim.target = rimTarget; scene.add(rim);

/* ── HDRI ────────────────────────────────────────────────────── */
async function loadEnv() {
  try {
    const t = await new RGBELoader().loadAsync('/hdri/studio_small_09_2k.hdr');
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = t;
  } catch {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
}

/* ── Procedural textures ─────────────────────────────────────── */
function noiseTex(size, base, v) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const val = Math.round(clamp(base + (Math.random() * 2 - 1) * v) * 255);
    d[i] = d[i+1] = d[i+2] = val; d[i+3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}
function normalTex(size, amp) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = Math.round((0.5 + (Math.random()*2-1)*amp)*255);
    d[i+1] = Math.round((0.5 + (Math.random()*2-1)*amp)*255);
    d[i+2] = 255; d[i+3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); return t;
}

/* ── Materials ───────────────────────────────────────────────── */
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x7e7870, roughness: 0.28, metalness: 0.78, envMapIntensity: 1.5,
  roughnessMap: noiseTex(256, 0.28, 0.08), normalMap: normalTex(256, 0.09),
  normalScale: new THREE.Vector2(0.25, 0.25), transparent: true, opacity: 0,
});
const machinedMat = new THREE.MeshStandardMaterial({
  color: 0x9a9288, roughness: 0.07, metalness: 0.92, envMapIntensity: 2.2, transparent: true, opacity: 0,
});
const boreMat = new THREE.MeshStandardMaterial({
  color: 0x1c1916, roughness: 0.55, metalness: 0.60, side: THREE.BackSide, envMapIntensity: 0.4, transparent: true, opacity: 0,
});
const splineMat = new THREE.MeshStandardMaterial({
  color: 0x2a2622, roughness: 0.35, metalness: 0.65, envMapIntensity: 0.6, transparent: true, opacity: 0,
});
const boltMat = new THREE.MeshStandardMaterial({
  color: 0x0e0d0b, roughness: 0.5, metalness: 0.5, side: THREE.BackSide, envMapIntensity: 0.2, transparent: true, opacity: 0,
});
const chamferMat = new THREE.MeshStandardMaterial({
  color: 0x888278, roughness: 0.12, metalness: 0.88, envMapIntensity: 1.8, transparent: true, opacity: 0,
});
const ALL_MATS = [bodyMat, machinedMat, boreMat, splineMat, boltMat, chamferMat];
const wireMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, wireframe: true, transparent: true, opacity: 0, depthWrite: false });

/* ── Geometry ────────────────────────────────────────────────── */
const FLNG_R=0.90, FLNG_H=0.10, HUB_R=0.38, HUB_H=0.72, BORE_R=0.195;
const SPLINE_N=8, SPLINE_W=0.032, SPLINE_D=0.040;
const BOLT_R=0.65, BOLT_N=4, BOLT_HR=0.062;

const hub  = new THREE.Group();
const wire = new THREE.Group();

function addM(geo, mat, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  if (rot) m.rotation.copy(rot);
  hub.add(m);
  const w = new THREE.Mesh(geo, wireMat.clone());
  if (pos) w.position.copy(pos);
  if (rot) w.rotation.copy(rot);
  wire.add(w);
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

// Flange rim
addM(new THREE.CylinderGeometry(FLNG_R,FLNG_R,FLNG_H,80,1,true), bodyMat, V(0,-FLNG_H/2,0));
// Step face
addM(new THREE.RingGeometry(HUB_R,FLNG_R,80,1), bodyMat, V(0,0,0), E(-Math.PI/2,0,0));
// Mating face (machined)
addM(new THREE.RingGeometry(BORE_R,FLNG_R,80,1), machinedMat, V(0,-FLNG_H,0), E(Math.PI/2,0,0));
// Hub OD
addM(new THREE.CylinderGeometry(HUB_R-0.004,HUB_R+0.004,HUB_H,80,5,true), bodyMat, V(0,HUB_H/2,0));
// Hub top face
addM(new THREE.RingGeometry(BORE_R,HUB_R,80,1), machinedMat, V(0,HUB_H,0), E(-Math.PI/2,0,0));
// Shoulder chamfer
addM(new THREE.TorusGeometry(HUB_R+0.012,0.014,12,80), chamferMat, V(0,0,0), E(Math.PI/2,0,0));
// Top edge chamfer
addM(new THREE.TorusGeometry(HUB_R-0.014,0.014,10,80), chamferMat, V(0,HUB_H,0), E(Math.PI/2,0,0));
// Bore
addM(new THREE.CylinderGeometry(BORE_R,BORE_R,HUB_H+FLNG_H+0.01,64,2,true), boreMat, V(0,(HUB_H-FLNG_H)/2,0));
// Splines
for (let i=0;i<SPLINE_N;i++) {
  const a=(i/SPLINE_N)*Math.PI*2, r=BORE_R-SPLINE_D/2;
  addM(new THREE.BoxGeometry(SPLINE_W,HUB_H+FLNG_H+0.02,SPLINE_D), splineMat,
       V(r*Math.cos(a),(HUB_H-FLNG_H)/2,r*Math.sin(a)), E(0,-a,0));
  addM(new THREE.PlaneGeometry(SPLINE_W,HUB_H+FLNG_H+0.02), splineMat,
       V((r-SPLINE_D/2)*Math.cos(a),(HUB_H-FLNG_H)/2,(r-SPLINE_D/2)*Math.sin(a)), E(0,-a+Math.PI,0));
}
// Bolt holes
for (let i=0;i<BOLT_N;i++) {
  const a=(i/BOLT_N)*Math.PI*2+Math.PI/4;
  addM(new THREE.CylinderGeometry(BOLT_HR,BOLT_HR,FLNG_H+0.008,18,1,true), boltMat, V(BOLT_R*Math.cos(a),-FLNG_H/2,BOLT_R*Math.sin(a)));
  addM(new THREE.TorusGeometry(BOLT_HR+0.015,0.010,6,24), machinedMat, V(BOLT_R*Math.cos(a),-FLNG_H,BOLT_R*Math.sin(a)), E(Math.PI/2,0,0));
  addM(new THREE.CylinderGeometry(BOLT_HR+0.025,BOLT_HR+0.025,0.008,24), bodyMat, V(BOLT_R*Math.cos(a),0.004,BOLT_R*Math.sin(a)));
}

hub.scale.setScalar(1.28);
wire.scale.copy(hub.scale);
scene.add(hub);
scene.add(wire);

/* ── Hub orientation: horizontal ⇄ vertical ─────────────────────
   Horizontal (t=0): lying on its side, bore axis ~horizontal.
   Vertical  (t≥0.15): standing upright, bore opening tilted to camera. */
const HORIZ = { x: 0.10, z: -Math.PI / 2 };
const VERT  = { x: 0.32, z: 0.0 };

function applyHubOrientation(t, spinY) {
  const k = smooth(clamp(t / 0.15)); // 0→1 over first 15% of scroll
  hub.rotation.x = lerp(HORIZ.x, VERT.x, k);
  hub.rotation.z = lerp(HORIZ.z, VERT.z, k);
  hub.rotation.y = spinY;
  wire.rotation.copy(hub.rotation);
}

/* ── Loading reveal (wireframe → material) ───────────────────── */
let revealed = false;
function runReveal() {
  if (revealed) return;
  revealed = true;
  if (REDUCED) {
    wire.children.forEach(m => { m.material.opacity = 0; });
    ALL_MATS.forEach(m => { m.opacity = 1; });
    rim.intensity = 6.0; bloom.strength = 0.42;
    return;
  }
  const start = performance.now();
  const P0 = 600, P1 = 1200, P2 = 2000;
  (function step() {
    const e = performance.now() - start;
    const t0 = clamp(e / P0);
    const t1 = clamp((e - P0) / (P1 - P0));
    const t2 = clamp((e - P1) / (P2 - P1));
    wire.children.forEach(m => { m.material.opacity = t0 * (1 - t2); });
    ALL_MATS.forEach(m => { m.opacity = t1; });
    rim.intensity = t1 * 6.0;
    bloom.strength = t1 * 0.42;
    if (e < P2) requestAnimationFrame(step);
  })();
}

/* ── Pointer tilt (desktop) ──────────────────────────────────── */
const _tiltTgt = new THREE.Vector2();
const _tiltCur = new THREE.Vector2();
const MAX_TILT = 0.06, TILT_LERP = 0.032;
if (!IS_TOUCH && !REDUCED) {
  window.addEventListener('mousemove', e => {
    _tiltTgt.x =  ((e.clientY / window.innerHeight) * 2 - 1) * -MAX_TILT;
    _tiltTgt.y =  ((e.clientX / window.innerWidth)  * 2 - 1) *  MAX_TILT;
  });
}

/* ── Text overlay elements ───────────────────────────────────── */
const elIntro   = document.getElementById('hub-intro');
const elTitle   = document.getElementById('hub-title');
const elSpecs   = document.getElementById('hub-specs');
const elHint    = document.getElementById('hub-scroll-hint');
const elVig     = document.getElementById('hub-realm-vignette');
const elCap1    = document.getElementById('hub-cap-1');
const elCap2    = document.getElementById('hub-cap-2');
const elCap3    = document.getElementById('hub-cap-3');

function setOverlays(t) {
  if (elIntro) elIntro.style.opacity = envelope(t, 0.0, 0.03, 0.12, 0.20);
  if (elHint)  elHint.style.opacity  = envelope(t, 0.0, 0.02, 0.08, 0.16);
  if (elTitle) elTitle.style.opacity = envelope(t, 0.12, 0.17, 0.30, 0.40);
  if (elSpecs) elSpecs.style.opacity = envelope(t, 0.86, 0.92, 1.0, 1.01);
  // Vignette deepens as you enter, eases slightly at exit
  if (elVig)   elVig.style.opacity   = clamp(smooth(clamp(t / 0.13)) * 0.72 - (t > 0.9 ? (t - 0.9) * 1.5 : 0), 0, 0.72);
  // Captions toggle visible class
  if (elCap1) elCap1.classList.toggle('visible', t > 0.40 && t < 0.54);
  if (elCap2) elCap2.classList.toggle('visible', t > 0.56 && t < 0.72);
  if (elCap3) elCap3.classList.toggle('visible', t > 0.74 && t < 0.88);
}

/* ── Scroll progress + fixed-stage visibility ────────────────────
   The stage is position:fixed. We compute the section's progress and
   also a "presence" factor that fades the whole stage in as the realm
   takes over the viewport and out as it releases — the realm crossing. */
function scrollProgress() {
  const rect = section.getBoundingClientRect();
  const total = section.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp(-rect.top / total);
}

function stagePresence() {
  // 1 while the section fully covers the viewport; fades over a band
  // as it enters (top crossing down) and exits (bottom crossing up).
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const band = vh * 0.5; // fade distance
  // entering: section.top from +band → 0  ⇒ presence 0 → 1
  const enter = clamp((band - rect.top) / band);
  // exiting: section.bottom from vh → vh - band  ⇒ presence 1 → 0
  const exit = clamp((rect.bottom - (vh - band)) / band);
  return Math.min(enter, exit);
}

const elStage = canvas.parentElement; // .hub-realm__sticky (fixed)
function applyStageVisibility(p) {
  elStage.style.opacity = String(p);
  elStage.style.visibility = p > 0.001 ? 'visible' : 'hidden';
}

/* ── Render loop ─────────────────────────────────────────────── */
const clock = new THREE.Clock();
let running = false;
let spinY = VERT ? 0 : 0;

function frame() {
  if (!running) return;
  requestAnimationFrame(frame);

  const elapsed = clock.getElapsedTime();
  const t = REDUCED ? 0.18 : scrollProgress();

  // Camera path
  sampleCamera(t, _tgtPos, _tgtLook);

  // Aspect-aware fit: on portrait/narrow viewports, pull the camera back
  // along its view ray so the part stays framed instead of cropping.
  const aspect = W() / H();
  if (aspect < 1) {
    const fit = 1 + clamp((1 / aspect - 1), 0, 1.3) * 0.55;
    _tgtPos.sub(_tgtLook).multiplyScalar(fit).add(_tgtLook);
  }

  lerpV3(_curPos,  _tgtPos,  0.085);
  lerpV3(_curLook, _tgtLook, 0.07);
  camera.position.copy(_curPos);
  camera.lookAt(_curLook);

  // Pointer tilt on top of lookAt
  if (!IS_TOUCH && !REDUCED) {
    _tiltCur.x += (_tiltTgt.x - _tiltCur.x) * TILT_LERP;
    _tiltCur.y += (_tiltTgt.y - _tiltCur.y) * TILT_LERP;
    if (Math.abs(_tiltCur.x) > 1e-4 || Math.abs(_tiltCur.y) > 1e-4) {
      camera.quaternion.multiply(new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(_tiltCur.x, _tiltCur.y, 0, 'YXZ')));
    }
  }

  // Hub orientation + gentle spin
  spinY = REDUCED ? 0.4 : (0.45 + elapsed * 0.12);
  applyHubOrientation(t, spinY);
  hub.position.y  = REDUCED ? 0 : Math.sin(elapsed * 0.35) * 0.04;
  wire.position.y = hub.position.y;

  // Fixed-stage presence — the "realm crossing" fade in/out
  applyStageVisibility(REDUCED ? 1 : stagePresence());

  setOverlays(t);
  composer.render();
}

/* ── Activate the loop when the section is near the viewport ──────
   rootMargin extends the active zone half a viewport beyond the
   section so the fade-in/out has frames to run. When the loop stops,
   the stage is explicitly hidden. */
const obs = new IntersectionObserver(entries => {
  const vis = entries[0].isIntersecting;
  if (vis) {
    runReveal();
    if (!running) { running = true; clock.start(); frame(); }
  } else {
    running = false;
    if (!REDUCED) applyStageVisibility(0); // ensure hidden when out of range
  }
}, { rootMargin: '50% 0px 50% 0px', threshold: 0 });
obs.observe(section);

resize();
loadEnv();

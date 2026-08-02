// ============================================================
//  RAYSONS — Foundry · "THE CATCH"
//  The Overview finale ends with a real 3D casting in the visitor's hands — they turn it,
//  they let go, it holds where they left it (bracket.js). Then they cross to Foundry and,
//  until now, it became a flat PNG: the site dropped the object and picked up a picture.
//
//  This catches it. bracket.js writes the pose it was left in (sessionStorage 'rc_casting');
//  this runs the IDENTICAL camera rig, starts the casting at exactly that orientation and
//  distance, and settles it into the hero pose over about two seconds. Combined with the
//  view-transition name both pages share, crossing from the finale reads as one continuous
//  shot of one object — not two pages that happen to show the same part.
//
//  It is the same object in every sense that matters: same GLB, same studio environment,
//  same iron. The visitor can still turn it, because that is the verb they already have in
//  their hands when they arrive — the point here is continuity, not a new trick.
//
//  Gated: no WebGL or reduced-motion → returns, and the existing poster (.fhero__object)
//  stays exactly as it is. The poster also holds the frame until the model is really in
//  memory, so a slow connection never shows an empty hero.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  // The seamless router (spa.js) re-runs body scripts on every hop and cache-busts module
  // URLs so they execute again. Tear the previous instance down first or its render loop
  // keeps burning a GPU context against a canvas no longer in the document.
  if (window.__fobjDispose) { try { window.__fobjDispose(); } catch (_) {} window.__fobjDispose = null; }

  const holder = document.getElementById('fobj');
  const canvas = document.getElementById('fobjGL');
  if (!holder || !canvas) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  if (REDUCED) return;                       // the still poster IS the reduced-motion design

  let hasGL = false;
  try { hasGL = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'))); } catch (_) {}
  if (!hasGL) return;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);          // heavy metal settling, no overshoot

  // ── surface + environment: lifted from bracket.js so this is visibly the SAME casting ──
  // (duplicated rather than shared: bracket.js is a self-contained IIFE with no exports,
  //  and the two engines must stay independently removable)
  function makeNoiseTex(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), img = x.createImageData(size, size);
    for (let i = 0; i < size * size; i++) { const v = 170 + Math.random() * 80 | 0; img.data[i*4] = img.data[i*4+1] = img.data[i*4+2] = v; img.data[i*4+3] = 255; }
    x.putImageData(img, 0, 0);
    x.globalAlpha = 0.22;
    for (let i = 0; i < 90; i++) { x.fillStyle = Math.random() > 0.5 ? '#fff' : '#4a4a4a'; x.beginPath();
      x.arc(Math.random()*size, Math.random()*size, size*(0.015+Math.random()*0.05), 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function boxUV(geo, scale) {                       // the CAD mesh ships with no UVs
    const pos = geo.attributes.position;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const n = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = pz; v = py; } else if (ay >= ax && ay >= az) { u = px; v = pz; } else { u = px; v = py; }
      uv[i*2] = u * scale; uv[i*2+1] = v * scale;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  function makeEnv() {                                // a studio, not a furnace — see bracket.js
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0a0a0b);
    const strip = (w, h, color, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); m.lookAt(0,0,0); s.add(m); };
    strip(14, 26, 0xdfe4ec, -11, 6, 3);
    strip(9, 18,  0x6e7480,  12, 5, -3);
    strip(18, 14, 0x8d939e,   0, 14, 0);
    strip(22, 12, 0x14161a,   0, -7, 9);
    return s;
  }

  // ── renderer ──────────────────────────────────────────────────────────────
  // alpha:true and no postprocessing: the hero's procedural heat-field (foundry-heat.js) has
  // to stay visible BEHIND the casting, and an opaque canvas would black it out.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(makeEnv(), 0.5);
  scene.environment = envRT.texture;

  const FOV = 34;                                   // the finale's focal length, so the catch
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);   // does not change lens mid-move
  const target = new THREE.Vector3(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xcbcdd2, 0x2e2c29, 0.6));
  const key  = new THREE.DirectionalLight(0xf6f2ec, 3.4); key.position.set(-4, 5, 3);   scene.add(key);
  const rim  = new THREE.DirectionalLight(0xcfd6e0, 1.9); rim.position.set(5, 3.5, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xd8a06a, 0.7); rim2.position.set(-2, 1, -5); scene.add(rim2);
  const fillL= new THREE.DirectionalLight(0xeeeae4, 0.5); fillL.position.set(2, -1, 4); scene.add(fillL);

  // ── the metal — bracket.js's iron, unchanged ──────────────────────────────
  const grain = makeNoiseTex(256);
  const iron = new THREE.MeshPhysicalMaterial({
    color: 0x8a847b, metalness: 0.86, roughness: 0.34,
    clearcoat: 0.35, clearcoatRoughness: 0.40, envMapIntensity: 1.75,
    bumpMap: grain, bumpScale: 0.32, roughnessMap: grain
  });

  // ── the pose we were left in ──────────────────────────────────────────────
  // Anything older than a minute is not a handoff, it is a stale tab — fall back to a plain
  // arrival so a cold visit to /foundry.html does not replay someone's forgotten pose.
  let caught = null;
  try {
    const raw = sessionStorage.getItem('rc_casting');
    if (raw) { const h = JSON.parse(raw); if (h && Date.now() - h.t < 60000 && isFinite(h.az)) caught = h; }
  } catch (_) {}

  const REST = { az: 0.42, el: 0.30 };              // where the hero wants the part to end up
  let restRad = 4.0, fitR = 0.95;                   // fitR = the part's bounding-sphere radius
  const pose = { az: REST.az, el: REST.el, rad: restRad };
  const from = { az: REST.az, el: REST.el, rad: restRad };
  let settle = 1, SETTLE_MS = 1900;                 // 1 = at rest

  // ── the casting ───────────────────────────────────────────────────────────
  const root = new THREE.Group(); scene.add(root);
  let modelReady = false, disposed = false;

  const draco = new DRACOLoader(); draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  gltfLoader.load('models/valve-part.glb', (gltf) => {
    if (disposed) return;
    const obj = gltf.scene;
    obj.traverse(c => { if (c.isMesh) { boxUV(c.geometry, 0.09); c.material = iron; } });
    obj.rotation.x = -Math.PI / 2;                          // FreeCAD Z-up → Y-up
    const b = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); b.getSize(size);
    const center = new THREE.Vector3(); b.getCenter(center);
    obj.scale.setScalar(1.70 / size.length());              // the finale's exact fit — same object, same size
    obj.position.sub(center.multiplyScalar(1.70 / size.length()));
    root.add(obj);
    const sph = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
    target.copy(sph.center);
    fitR = sph.radius;
    resize();

    // start where the finale left it — same angles, and a distance corrected for the fact
    // that this canvas is a hero-sized box rather than the finale's full window, so the part
    // arrives at the SCREEN size it had a moment ago instead of jumping scale
    if (caught) {
      from.az = caught.az; from.el = caught.el;
      from.rad = caught.rad * (Math.tan((caught.fov || 34) * Math.PI / 360) / Math.tan(FOV * Math.PI / 360));
      settle = 0;
    } else {
      from.az = REST.az - 0.42; from.el = REST.el + 0.06; from.rad = restRad * 1.16;
      settle = 0; SETTLE_MS = 1500;                         // a plain arrival for a cold visit
    }
    Object.assign(pose, from);
    modelReady = true;
    goLive();
  }, undefined, () => { /* load failed → the poster simply stays */ });

  // hand the hero over from the poster to the live object, moving the view-transition name
  // with it so the finale keeps flying its casting into this exact spot
  function goLive() {
    document.body.classList.add('fobj-live');
    setTimeout(() => { if (!disposed) document.body.classList.add('fobj-swapped'); }, 700);
  }

  // ── sizing: the object's own box, not the window ──────────────────────────
  function resize() {
    const r = holder.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // frame the part from its bounding sphere so it keeps a margin on every viewport,
    // instead of a hand-tuned distance that crops on one shape and floats on another
    const halfV = FOV * Math.PI / 360;
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    restRad = Math.max(fitR / Math.sin(halfV), fitR / Math.sin(halfH)) / 0.74;
    if (settle >= 1) pose.rad = restRad;
  }

  // ── the verb they arrive holding: turn it ─────────────────────────────────
  let dragAz = 0, dragEl = 0, velAz = 0, velEl = 0, dragging = false, px = 0, py = 0;
  const ac = new AbortController();
  const sig = { signal: ac.signal, passive: true };

  canvas.addEventListener('pointerdown', (e) => {
    if (!modelReady) return;
    dragging = true; px = e.clientX; py = e.clientY; velAz = 0; velEl = 0;
    holder.classList.add('grabbing');
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }, sig);
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - px) * 0.006, dy = (e.clientY - py) * 0.005;
    dragAz += dx; dragEl = clamp(dragEl + dy, -0.5, 0.7); velAz = dx; velEl = dy;
    px = e.clientX; py = e.clientY;
  }, sig);
  const drop = () => { dragging = false; holder.classList.remove('grabbing'); };
  addEventListener('pointerup', drop, sig);
  addEventListener('pointercancel', drop, sig);

  addEventListener('resize', resize, sig);
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(holder); }

  // ── render only while the hero is on screen ───────────────────────────────
  let onScreen = true, io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; }, { rootMargin: '15% 0px' });
    io.observe(holder);
  }

  resize();

  let prev = performance.now();
  renderer.setAnimationLoop((tm) => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - prev) / 1000);      // clamped: a backgrounded tab must not jump
    prev = now;
    if (!onScreen || !modelReady) return;
    const t = tm * 0.001;

    // THE SETTLE — on elapsed time, not per frame, so the catch takes the same beat on a
    // laptop as on a phone rather than running at whatever rate the GPU happens to manage
    if (settle < 1) {
      settle = Math.min(1, settle + dt * 1000 / SETTLE_MS);
      const e = easeOut(settle);
      pose.az  = lerp(from.az,  REST.az,  e);
      pose.el  = lerp(from.el,  REST.el,  e);
      pose.rad = lerp(from.rad, restRad,  e);
    }

    // release inertia settles and the pose HOLDS — the finale's behaviour, continued
    if (!dragging) { dragAz += velAz; dragEl = clamp(dragEl + velEl, -0.5, 0.7); velAz *= 0.90; velEl *= 0.90; }

    // the operator's breathing — micro handheld drift so the object feels shot, not computed
    const az = pose.az + dragAz + Math.sin(t * 0.13) * 0.010 + Math.sin(t * 0.047) * 0.006;
    const el = clamp(pose.el + dragEl + Math.sin(t * 0.09 + 1.7) * 0.006, -0.3, 1.1);
    camera.position.set(
      target.x + pose.rad * Math.cos(el) * Math.sin(az),
      target.y + pose.rad * Math.sin(el),
      target.z + pose.rad * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(target.x, target.y + Math.sin(t * 0.11 + 0.6) * 0.008, target.z);

    renderer.render(scene, camera);
  });

  // ── teardown (SPA hop) ────────────────────────────────────────────────────
  window.__fobjDispose = function () {
    disposed = true;
    try { renderer.setAnimationLoop(null); } catch (_) {}
    try { ac.abort(); } catch (_) {}
    try { if (io) io.disconnect(); if (ro) ro.disconnect(); } catch (_) {}
    try {
      root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      grain.dispose(); iron.dispose(); envRT.texture.dispose(); pmrem.dispose();
      draco.dispose(); renderer.dispose();
    } catch (_) {}
    document.body.classList.remove('fobj-live', 'fobj-swapped');
  };
})();

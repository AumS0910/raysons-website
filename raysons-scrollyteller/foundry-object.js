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

  // ── THE FRAGMENTS ─────────────────────────────────────────────────────────
  // The GLB is ONE welded mesh — a finished casting, not an assembly — so there are no
  // components to take apart. Instead the triangles are clustered into fragments on load
  // (a grid over the part's own bounding box, sized to its proportions so the pieces come
  // out roughly cubic rather than as slabs), and each fragment gets its own outward vector,
  // tumble axis and arrival delay baked into per-vertex attributes. The whole dismantle
  // then runs in the vertex shader off a single uniform — so it is still ONE draw call, and
  // costs nothing per frame beyond the uniform write.
  function buildFragments(geo) {
    const pos = geo.attributes.position;
    const nv = pos.count, nt = nv / 3;                 // non-indexed → 3 verts per triangle
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const size = new THREE.Vector3(); bb.getSize(size);
    const mid  = new THREE.Vector3(); bb.getCenter(mid);
    // base 3, not 4: a finer grid shatters this casting into slivers that read as debris.
    // Bigger clusters read as pieces of a part coming back together, which is the point.
    const maxS = Math.max(size.x, size.y, size.z) || 1;
    const gx = Math.max(2, Math.round(3 * size.x / maxS));
    const gy = Math.max(2, Math.round(3 * size.y / maxS));
    const gz = Math.max(2, Math.round(3 * size.z / maxS));

    // pass 1 — bin every triangle by its centroid, accumulating each cell's centre
    const triCell = new Int32Array(nt), cells = new Map();
    for (let t = 0; t < nt; t++) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { const i = t*3 + k; cx += pos.getX(i); cy += pos.getY(i); cz += pos.getZ(i); }
      cx /= 3; cy /= 3; cz /= 3;
      const ix = Math.min(gx-1, Math.max(0, Math.floor((cx - bb.min.x) / (size.x || 1) * gx)));
      const iy = Math.min(gy-1, Math.max(0, Math.floor((cy - bb.min.y) / (size.y || 1) * gy)));
      const iz = Math.min(gz-1, Math.max(0, Math.floor((cz - bb.min.z) / (size.z || 1) * gz)));
      const id = (ix * gy + iy) * gz + iz;
      triCell[t] = id;
      let c = cells.get(id);
      if (!c) { c = { sx:0, sy:0, sz:0, n:0 }; cells.set(id, c); }
      c.sx += cx; c.sy += cy; c.sz += cz; c.n++;
    }

    // pass 2 — per fragment: where it sits, which way it flies, how it tumbles, when it lands
    const hash = (s) => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };
    let maxD = 1e-6;
    cells.forEach((c) => {
      c.cx = c.sx/c.n; c.cy = c.sy/c.n; c.cz = c.sz/c.n;
      c.d = Math.hypot(c.cx - mid.x, c.cy - mid.y, c.cz - mid.z);
      if (c.d > maxD) maxD = c.d;
    });
    cells.forEach((c, id) => {
      let dx = c.cx - mid.x, dy = c.cy - mid.y, dz = c.cz - mid.z;
      let len = Math.hypot(dx, dy, dz);
      if (len < 1e-5) { dx = hash(id)*2-1; dy = hash(id+7)*2-1; dz = hash(id+13)*2-1; len = Math.hypot(dx,dy,dz) || 1; }
      // outer fragments travel further and land last — the classic exploded view, and it
      // means the part resolves from the core outwards rather than all at once
      const reach = 0.45 + 0.55 * (c.d / maxD) + hash(id + 31) * 0.22;
      c.dx = dx/len*reach; c.dy = dy/len*reach; c.dz = dz/len*reach;
      c.delay = c.d / maxD;
      let ax = hash(id+3)*2-1, ay = hash(id+5)*2-1, az = hash(id+11)*2-1;
      const al = Math.hypot(ax, ay, az) || 1;
      c.ax = ax/al; c.ay = ay/al; c.az = az/al;
      c.ang = (hash(id + 17) * 2 - 1) * 1.25;
    });

    const origin = new Float32Array(nv * 3), dir = new Float32Array(nv * 4), spin = new Float32Array(nv * 4);
    for (let t = 0; t < nt; t++) {
      const c = cells.get(triCell[t]);
      for (let k = 0; k < 3; k++) {
        const i = t*3 + k;
        origin[i*3] = c.cx; origin[i*3+1] = c.cy; origin[i*3+2] = c.cz;
        dir[i*4] = c.dx; dir[i*4+1] = c.dy; dir[i*4+2] = c.dz; dir[i*4+3] = c.delay;
        spin[i*4] = c.ax; spin[i*4+1] = c.ay; spin[i*4+2] = c.az; spin[i*4+3] = c.ang;
      }
    }
    geo.setAttribute('aOrigin', new THREE.BufferAttribute(origin, 3));
    geo.setAttribute('aDir',    new THREE.BufferAttribute(dir, 4));
    geo.setAttribute('aSpin',   new THREE.BufferAttribute(spin, 4));
    return { spread: size.length() * 0.20, count: cells.size };
  }

  // ── the metal — bracket.js's iron, plus the dismantle ─────────────────────
  const grain = makeNoiseTex(256);
  const iron = new THREE.MeshPhysicalMaterial({
    color: 0x8a847b, metalness: 0.86, roughness: 0.34,
    clearcoat: 0.35, clearcoatRoughness: 0.40, envMapIntensity: 1.75,
    bumpMap: grain, bumpScale: 0.32, roughnessMap: grain
  });
  const uni = { uAssemble: { value: 1 }, uSpread: { value: 0.5 } };
  iron.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aOrigin; attribute vec4 aDir; attribute vec4 aSpin;
        uniform float uAssemble, uSpread;
        // Rodrigues — rotate v about a unit axis, used for both the position and the normal
        // so a tumbled fragment is still lit correctly instead of shading like the whole part
        vec3 rotAx(vec3 v, vec3 axis, float a){
          float c = cos(a), s = sin(a);
          return v*c + cross(axis, v)*s + axis*dot(axis, v)*(1.0-c);
        }`)
      // normals are computed BEFORE positions in three's vertex shader, so the fragment's
      // openness is derived here and reused below
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float fOpen = 1.0 - clamp((uAssemble - aDir.w * 0.30) / 0.70, 0.0, 1.0);
        fOpen = fOpen * fOpen * (3.0 - 2.0 * fOpen);
        objectNormal = rotAx(objectNormal, aSpin.xyz, aSpin.w * fOpen);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 fLocal = transformed - aOrigin;
        transformed = aOrigin + rotAx(fLocal, aSpin.xyz, aSpin.w * fOpen) + aDir.xyz * (uSpread * fOpen);`);
  };

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
    let spread = 0.5;
    obj.traverse(c => { if (c.isMesh) {
      // de-index first: fragments need every triangle to own its vertices, or a triangle on
      // a fragment boundary would be torn between two destinations
      const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry;
      boxUV(g, 0.09);
      spread = buildFragments(g).spread;
      c.geometry = g;
      c.material = iron;
    }});
    // The frame is much tighter on a phone, which magnifies the scatter: at the desktop
    // spread the fragments filled the whole band and stopped reading as one object coming
    // together. Only the OPEN state shrinks — the assembled casting is unchanged.
    uni.uSpread.value = spread * (MOBILE ? 0.5 : 1);
    obj.rotation.x = -Math.PI / 2;                          // FreeCAD Z-up → Y-up
    const b = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); b.getSize(size);
    const center = new THREE.Vector3(); b.getCenter(center);
    obj.scale.setScalar(1.70 / size.length());              // the finale's exact fit — same object, same size
    obj.position.sub(center.multiplyScalar(1.70 / size.length()));
    root.add(obj);
    const sph = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
    target.copy(sph.center);
    // Frame the ASSEMBLED part. Padding this out to the dismantled extent permanently
    // shrank the casting to reserve room for a state that lasts a couple of seconds — the
    // finished object is what the visitor looks at for the rest of the visit, so it gets
    // the frame. Fragments may drift past the edge while it is open; the canvas edges are
    // masked, so they dissolve out rather than clip.
    fitR = sph.radius;
    resize();

    // start where the finale left it — same angles, and a distance corrected for the fact
    // that this canvas is a hero-sized box rather than the finale's full window, so the part
    // arrives at the SCREEN size it had a moment ago instead of jumping scale
    if (caught) {
      from.az = caught.az; from.el = caught.el;
      from.rad = caught.rad * (Math.tan((caught.fov || 34) * Math.PI / 360) / Math.tan(FOV * Math.PI / 360));
      settle = 0;
      openT = -0.75;      // land whole first — the catch has to register before it opens
    } else {
      from.az = REST.az - 0.42; from.el = REST.el + 0.06; from.rad = restRad * 1.16;
      settle = 0; SETTLE_MS = 1500;                         // a plain arrival for a cold visit
      openT = -0.55;
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
  // (A scale-up "fly in from the finale" was tried here and removed: blowing the band up to
  //  cover the viewport threw a full-screen casting across the headline for a second, which
  //  read as a glitch rather than as continuity. The handoff stays where it works — the
  //  camera pose carries over, so the part is already turned the way you left it.)

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
    // >1 deliberately: fitR is the BOUNDING SPHERE, and this casting is flat and elongated,
    // so its silhouette never fills that sphere. Framing the sphere conservatively left a
    // wide dead margin on every side. 1.15 sizes to the part you can actually see.
    restRad = Math.max(fitR / Math.sin(halfV), fitR / Math.sin(halfH)) / 1.45;
    if (settle >= 1) pose.rad = restRad;
  }

  // ── the verb they arrive holding: turn it — and turning it puts it back together ──
  let dragAz = 0, dragEl = 0, velAz = 0, velEl = 0, dragging = false, px = 0, py = 0;
  const hintEl = document.getElementById('fobjHint');
  // SCROLL ASSEMBLES IT. This was pointer travel — you had to grab the casting and drag
  // roughly 1100px to put it back together, which is a lot to ask of someone who does not
  // yet know the object is interactive, and impossible to discover on a phone without
  // trying. Scrolling is the one gesture every visitor is already making, so the part now
  // reassembles as the hero scrolls past: arrive, watch it come apart, keep scrolling and
  // it builds itself. Reversible too — scroll back up and it opens again, which a
  // monotonic drag counter could never do.
  const heroEl = holder.closest('.fhero');
  let openT = -0.45;                        // <0 = the beat where it is still whole (the catch lands first)
  let hinted = false;
  let asm = 0;                              // the SHOWN assembly, lagging the scroll target
  function scrollProgress(){
    if(!heroEl) return 0;
    const r = heroEl.getBoundingClientRect();
    // The full hero height, not two-thirds of it: at 0.66 the part snapped together inside
    // about half a screen of scroll and the whole beat was over before it registered. Now
    // it takes essentially the entire hero to build, and the LAG below keeps it from
    // tracking the wheel 1:1 — the metal has weight, so it should arrive a moment after
    // you ask rather than pinned to the scrollbar.
    return clamp(-r.top / Math.max(1, heroEl.offsetHeight * 1.0), 0, 1);
  }
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
    const rawX = e.clientX - px, rawY = e.clientY - py;
    const dx = rawX * 0.006, dy = rawY * 0.005;
    dragAz += dx; dragEl = clamp(dragEl + dy, -0.5, 0.7); velAz = dx; velEl = dy;
    px = e.clientX; py = e.clientY;
    // dragging only TURNS the part now; scrolling is what assembles it.
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

    // THE DISMANTLE. The catch lands whole — it has to, or the handoff from the finale means
    // nothing — and only then does the casting come apart, which is also what teaches the
    // visitor that it can go back. From there their drag owns it.
    openT = Math.min(1, openT + dt / 1.15);
    const o = openT <= 0 ? 0 : openT * openT * (3 - 2 * openT);
    const sp = scrollProgress();
    asm += (sp - asm) * (1 - Math.exp(-dt * 4.2));      // time-based, so the weight is the
    if (Math.abs(sp - asm) < 0.002) asm = sp;           // same on any framerate
    uni.uAssemble.value = Math.max(1 - o, asm);
    if (hintEl && !hinted && sp > 0.04) { hinted = true; hintEl.classList.add('gone'); }

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

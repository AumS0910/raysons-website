// ============================================================
//  RAYSONS — "One Form" · the single-film experience
//  ONE document. ONE canvas that never unmounts. ONE casting that lives through
//  every chapter and TRAVELS between them, because it is never destroyed — the
//  thing an MPA with page reloads structurally cannot do. Scroll drives a camera
//  that moves through rooms; a chapter rail lets you jump anywhere; drag turns the
//  part at any point. Cartier-style: the object is the constant, the story moves
//  around it.
//
//  Built as a NEW entry (experience.html) so the live five-page site is untouched
//  while this proves out. Reuses the tuned material/lighting from the finale.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp  = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  const canvas = document.getElementById('expGL');
  const scroller = document.getElementById('expScroll');
  if (!canvas || !scroller) return;

  let hasGL = false;
  try { hasGL = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'))); } catch (e) {}
  if (!hasGL) { document.body.classList.add('no-webgl'); return; }   // CSS shows a static fallback

  // ── CHAPTERS — each is a camera pose the object is viewed from. Scroll lerps
  //    between consecutive poses, so the SAME object glides room to room. Screen-x
  //    offset moves it left/right so it dodges the text column per chapter. ──
  const CHAPTERS = [
    { id: 'overview', label: 'Overview', az: -0.6, el: 0.28, rad: 4.6, ox:  0.20, heat: 0.0 },
    { id: 'fire',     label: 'The Pour', az:  0.3, el: 0.20, rad: 3.4, ox: -0.22, heat: 1.0 },
    { id: 'object',   label: 'The Part', az:  1.1, el: 0.16, rad: 3.0, ox:  0.24, heat: 0.0 },
    { id: 'foundry',  label: 'Foundry',  az:  2.0, el: 0.30, rad: 3.3, ox: -0.24, heat: 0.15 },
    { id: 'products', label: 'Products', az:  3.0, el: 0.18, rad: 3.1, ox:  0.24, heat: 0.0 },
    { id: 'enquire',  label: 'Enquire',  az:  3.9, el: 0.22, rad: 3.8, ox:  0.0,  heat: 0.0 },
  ];
  const N = CHAPTERS.length;

  // ============================================================
  //  RENDERER + SCENE  (material/lighting matched to the finale)
  // ============================================================
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0807);
  scene.fog = new THREE.FogExp2(0x0b0b0c, 0.028);

  // a neutral studio env (the finale's makeEnv, trimmed) so the metal reads as steel
  function makeEnv() {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0a0a0b);
    const strip = (w, h, c, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
    strip(14, 26, 0xdfe4ec, -11, 6, 3);   // neutral key
    strip(9, 18, 0x6e7480, 12, 5, -3);    // cool rim
    strip(18, 14, 0x8d939e, 0, 14, 0);    // ceiling bounce
    strip(22, 12, 0x14161a, 0, -7, 9);    // dark floor front
    return s;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeEnv(), 0.5).texture;

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 100);
  const target = new THREE.Vector3(0, 0, 0);
  const _dir = new THREE.Vector3(), _right = new THREE.Vector3(), _look = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight(0xcbcdd2, 0x2e2c29, 0.6));
  const key = new THREE.DirectionalLight(0xf6f2ec, 3.6); key.position.set(-4, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfd6e0, 1.9); rim.position.set(5, 3.5, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xeeeae4, 0.5); fill.position.set(2, -1, 4); scene.add(fill);
  const heatLight = new THREE.PointLight(0xff5a14, 0, 9, 2); scene.add(heatLight);   // the "fire" chapter glow

  // machined steel — matched to the committed finale material
  function makeNoise(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    const img = x.createImageData(size, size);
    for (let i = 0; i < size * size; i++) { const v = 170 + Math.random() * 80 | 0; img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v; img.data[i*4+3]=255; }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function boxUV(geo, scale) {
    const pos = geo.attributes.position; if (!geo.attributes.normal) geo.computeVertexNormals();
    const n = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v; if (ax >= ay && ax >= az) { u = pz; v = py; } else if (ay >= ax && ay >= az) { u = px; v = pz; } else { u = px; v = py; }
      uv[i*2] = u * scale; uv[i*2+1] = v * scale;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const grain = makeNoise(256);
  const iron = new THREE.MeshPhysicalMaterial({
    color: 0x8a847b, metalness: 0.86, roughness: 0.34,
    clearcoat: 0.35, clearcoatRoughness: 0.40, envMapIntensity: 1.75,
    bumpMap: grain, bumpScale: 0.28, roughnessMap: grain,
    emissive: new THREE.Color(0xff5a14), emissiveIntensity: 0.0,   // driven per-chapter for the pour
  });

  const root = new THREE.Group(); scene.add(root);
  let modelReady = false;

  const draco = new DRACOLoader(); draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  loader.load('models/valve-part.glb', (gltf) => {
    const obj = gltf.scene;
    obj.traverse(c => { if (c.isMesh) { boxUV(c.geometry, 0.09); c.material = iron; } });
    obj.rotation.x = -Math.PI / 2;                       // FreeCAD Z-up → Y-up
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const fit = 1.7 / size.length();
    obj.scale.setScalar(fit);
    obj.position.sub(center.multiplyScalar(fit));
    root.add(obj);
    const b2 = new THREE.Box3().setFromObject(obj);
    target.set(0, (b2.min.y + b2.max.y) / 2, 0);
    heatLight.position.set(0, target.y, 0);
    modelReady = true;
    document.body.classList.add('exp-ready');
  });

  // ── SCROLL + DRAG STATE ──
  let sp = 0, spT = 0;                 // damped global scroll 0..1
  let dragAz = 0, dragAzT = 0, spin = 0, dragging = false, lx = 0, touched = false, lastMv = 0;

  function scrollProgress() {
    const max = scroller.offsetHeight - innerHeight;
    return max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  }
  addEventListener('scroll', () => { spT = scrollProgress(); }, { passive: true });
  spT = sp = scrollProgress();

  // drag to turn — anywhere, anytime (the object is always live)
  addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,[data-ui]')) return;
    dragging = true; touched = true; lx = e.clientX; lastMv = performance.now(); spin = 0;
    document.body.classList.add('exp-grab');
  });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, now = performance.now();
    dragAzT -= dx * 0.006;
    spin = -dx * 0.006 * Math.min(3, 16 / Math.max(1, now - lastMv));
    lx = e.clientX; lastMv = now;
  });
  const endDrag = () => { dragging = false; document.body.classList.remove('exp-grab'); };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // ── chapter chrome (rail + captions + progress) ──
  const railItems = [...document.querySelectorAll('.exp-rail__i')];
  const caps = CHAPTERS.map(c => document.getElementById('cap-' + c.id));
  const progFill = document.getElementById('expProgFill');
  let lastChap = -1, lastHeat = -1;
  function setChapter(i) {
    if (i === lastChap) return; lastChap = i;
    railItems.forEach((r, k) => r.classList.toggle('on', k === i));
    caps.forEach((c, k) => c && c.classList.toggle('on', k === i));
    document.body.dataset.chapter = CHAPTERS[i].id;
  }

  // ── MAIN LOOP — always running; the object never stops existing ──
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const t = (now - t0) / 1000;

    sp += (spT - sp) * (REDUCED ? 1 : 0.08);
    // inertia after a flick
    if (!dragging && Math.abs(spin) > 0.0002) { dragAzT += spin; spin *= 0.94; }
    dragAz += (dragAzT - dragAz) * 0.1;

    // which chapter, and local progress within the transition to the next
    const f = sp * (N - 1);
    const i = clamp(Math.floor(f), 0, N - 1);
    const j = clamp(i + 1, 0, N - 1);
    const lt = smooth(0, 1, f - i);
    const A = CHAPTERS[i], B = CHAPTERS[j];

    // camera pose interpolates between chapters → the object travels
    const az = lerp(A.az, B.az, lt) + dragAz + Math.sin(t * 0.00018 * 1000) * 0.0;
    const el = lerp(A.el, B.el, lt) + Math.sin(t * 0.21) * 0.012;
    const rad = lerp(A.rad, B.rad, lt);
    const ox = lerp(A.ox, B.ox, lt);           // screen-space slide so it clears the text
    const heat = lerp(A.heat, B.heat, lt);

    camera.position.set(
      target.x + rad * Math.cos(el) * Math.sin(az),
      target.y + rad * Math.sin(el),
      target.z + rad * Math.cos(el) * Math.cos(az)
    );
    // PAN, not nudge — slide the object across the frame so it clears the text column.
    // A true pan (shift camera AND look-target along the camera's right axis) moves the
    // subject reliably to the opposite side; the earlier position-only nudge barely moved
    // a large, close object. ox>0 puts the part on the RIGHT, ox<0 on the LEFT.
    _dir.set(target.x - camera.position.x, target.y - camera.position.y, target.z - camera.position.z).normalize();
    _right.crossVectors(_dir, camera.up).normalize();
    const pan = -ox * rad * 0.6;
    camera.position.addScaledVector(_right, pan);
    _look.copy(target).addScaledVector(_right, pan);
    camera.lookAt(_look);

    if (modelReady) {
      iron.emissiveIntensity = heat * (0.9 + Math.sin(t * 8) * 0.12);
      heatLight.intensity = heat * (6 + Math.sin(t * 9) * 1.1);
      root.scale.setScalar(lerp(0.9, 1.0, smooth(0, 0.08, sp)));
    }

    setChapter(Math.round(f));
    if (progFill) progFill.style.transform = 'scaleY(' + sp.toFixed(4) + ')';

    // --heat — the connective tissue (Plan B). One 0..1 temperature, updated every
    // frame, that CSS reads for grain, body warmth, rail colour and the vignette glow.
    // It is what will make the coming video clips read as one continuous world rather
    // than seven separate files, and it already unifies the live object with the page.
    if (Math.abs(heat - lastHeat) > 0.002) {
      document.documentElement.style.setProperty('--heat', heat.toFixed(3));
      lastHeat = heat;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // ── chapter navigation: jump anywhere ──
  railItems.forEach((r, k) => {
    r.addEventListener('click', () => {
      const sec = document.getElementById('sec-' + CHAPTERS[k].id);
      if (sec) sec.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    });
  });
  // hint dismiss on first interaction
  addEventListener('scroll', () => document.body.classList.add('exp-scrolled'), { once: true, passive: true });
})();

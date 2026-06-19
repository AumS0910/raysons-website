// ============================================================
//  RAYSONS — Through the Foundry  ·  WebGL scene (Three.js)
//  Exposes window.Foundry { setProgress, resize, ready }
// ============================================================
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.getElementById('gl');
// Device tier: throttle particle count, bloom resolution, antialias and pixel
// ratio on phones/tablets so the foundry holds framerate on mobile Safari.
const MOBILE = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias:!MOBILE, alpha:false, powerPreference:'high-performance', preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#070504');
scene.fog = new THREE.FogExp2('#0a0604', 0.012);

// Environment map so the ported V1 hub's physical/clearcoat metal reads as metal
// (MeshPhysicalMaterial needs reflections). RoomEnvironment is built into three
// addons — no external HDRI asset required.
const _pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = _pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 600);
camera.position.set(0,1,30);

// ---- lighting ----
const amb = new THREE.AmbientLight('#2a1d12', 0.6);
scene.add(amb);
const key = new THREE.PointLight('#ff7a26', 0, 120, 2.0); // furnace light, intensity driven by scroll
key.position.set(0,2,-6);
scene.add(key);
const rim = new THREE.DirectionalLight('#88a6ff', 0.25);
rim.position.set(-6,8,4);
scene.add(rim);
const castLight = new THREE.PointLight('#ffae5a', 0, 60, 2.2);
castLight.position.set(2,3,-92);
scene.add(castLight);

// ============================================================
//  EMBERS — drifting sparks that follow the camera
// ============================================================
const EMBER_N = MOBILE ? 320 : 900;
const emGeo = new THREE.BufferGeometry();
const emPos = new Float32Array(EMBER_N*3);
const emVel = new Float32Array(EMBER_N);
const emSize = new Float32Array(EMBER_N);
const emSeed = new Float32Array(EMBER_N);
for(let i=0;i<EMBER_N;i++){
  emPos[i*3]   = (Math.random()-.5)*70;
  emPos[i*3+1] = (Math.random()-.5)*50;
  emPos[i*3+2] = (Math.random()-.5)*120 - 40;
  emVel[i] = 0.4 + Math.random()*1.4;
  emSize[i] = 0.6 + Math.random()*2.2;
  emSeed[i] = Math.random()*6.28;
}
emGeo.setAttribute('position', new THREE.BufferAttribute(emPos,3));
emGeo.setAttribute('aVel', new THREE.BufferAttribute(emVel,1));
emGeo.setAttribute('aSize', new THREE.BufferAttribute(emSize,1));
emGeo.setAttribute('aSeed', new THREE.BufferAttribute(emSeed,1));
const emMat = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{ uTime:{value:0}, uPix:{value:renderer.getPixelRatio()} },
  vertexShader:`
    uniform float uTime; uniform float uPix;
    attribute float aVel; attribute float aSize; attribute float aSeed;
    varying float vA;
    void main(){
      vec3 p = position;
      float t = uTime*aVel;
      p.y += mod(t, 50.0) - 0.0;
      p.y = mod(p.y + 25.0, 50.0) - 25.0;
      p.x += sin(uTime*0.5 + aSeed)*1.4;
      vA = 0.4 + 0.6*abs(sin(uTime*1.5 + aSeed));
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPix * (60.0 / -mv.z);
    }`,
  fragmentShader:`
    varying float vA;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      if(r>0.5) discard;
      float glow = smoothstep(0.5,0.0,r);
      vec3 col = mix(vec3(1.0,0.35,0.06), vec3(1.0,0.78,0.3), glow);
      gl_FragColor = vec4(col, glow*vA);
    }`
});
const embers = new THREE.Points(emGeo, emMat);
embers.frustumCulled = false;
scene.add(embers);

// ============================================================
//  FURNACE — glowing core near origin
// ============================================================
const furnace = new THREE.Group();
furnace.position.set(0,1,-4);
const coreMat = new THREE.MeshBasicMaterial({ color:'#ff7a26' });
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4,2), coreMat);
furnace.add(core);
// shell ribs
const ribMat = new THREE.MeshStandardMaterial({ color:'#1c1713', metalness:.9, roughness:.35, emissive:'#ff5a14', emissiveIntensity:.4 });
for(let i=0;i<5;i++){
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9+i*0.05, 0.05, 8, 64), ribMat);
  ring.rotation.x = Math.PI/2; ring.position.y = -1.6 + i*0.8;
  ring.scale.setScalar(1 - Math.abs(i-2)*0.08);
  furnace.add(ring);
}
scene.add(furnace);
// Hidden: the V1 ladle pour (below) is the hero visual now, not this sphere.
furnace.visible = false;

// heat haze plane behind furnace
const haze = new THREE.Mesh(
  new THREE.PlaneGeometry(60,60),
  new THREE.MeshBasicMaterial({ color:'#ff5212', transparent:true, opacity:.12, blending:THREE.AdditiveBlending, depthWrite:false })
);
haze.position.set(0,0,-14);
scene.add(haze);

// ============================================================
//  MOLTEN POUR — stream + pool
// ============================================================
const pour = new THREE.Group();
pour.position.set(0,-1,-46);
// ladle (tilted cylinder)
const ladleMat = new THREE.MeshStandardMaterial({ color:'#15110d', metalness:.95, roughness:.4, emissive:'#7a1e05', emissiveIntensity:.5 });
const ladle = new THREE.Mesh(new THREE.CylinderGeometry(2.2,1.7,2.6,32,1,true), ladleMat);
ladle.position.set(-4,4.5,0); ladle.rotation.z = -0.9;
pour.add(ladle);
// molten stream
const streamMat = new THREE.MeshBasicMaterial({ color:'#ffb347' });
const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.4,7,12), streamMat);
stream.position.set(-2.4,0.9,0); stream.rotation.z = 0.32;
pour.add(stream);
// pool disc
const poolMat = new THREE.MeshBasicMaterial({ color:'#ff7314' });
const pool = new THREE.Mesh(new THREE.CircleGeometry(4.2,48), poolMat);
pool.rotation.x = -Math.PI/2; pool.position.y = -2.6;
pour.add(pool);
const poolGlow = new THREE.Mesh(new THREE.CircleGeometry(7,48),
  new THREE.MeshBasicMaterial({ color:'#ff4d0a', transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false }));
poolGlow.rotation.x = -Math.PI/2; poolGlow.position.y = -2.55;
pour.add(poolGlow);
// spark burst at pool
const SP_N = 260;
const spGeo = new THREE.BufferGeometry();
const spPos = new Float32Array(SP_N*3);
const spSeed = new Float32Array(SP_N);
for(let i=0;i<SP_N;i++){
  spPos[i*3]=0;spPos[i*3+1]=0;spPos[i*3+2]=0;
  spSeed[i]=Math.random();
}
spGeo.setAttribute('position', new THREE.BufferAttribute(spPos,3));
spGeo.setAttribute('aSeed', new THREE.BufferAttribute(spSeed,1));
const spMat = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{ uTime:{value:0}, uPix:{value:renderer.getPixelRatio()} },
  vertexShader:`
    uniform float uTime; uniform float uPix; attribute float aSeed; varying float vA;
    void main(){
      float life = mod(uTime*0.6 + aSeed*3.0, 1.0);
      float ang = aSeed*40.0;
      float spread = 5.5*life;
      vec3 p = vec3(cos(ang)*spread, life*5.5 - life*life*7.0, sin(ang)*spread*0.6);
      vA = (1.0-life);
      vec4 mv = modelViewMatrix*vec4(p,1.0);
      gl_Position = projectionMatrix*mv;
      gl_PointSize = (1.0+aSeed*2.0)*uPix*(40.0/-mv.z);
    }`,
  fragmentShader:`
    varying float vA; void main(){
      vec2 d=gl_PointCoord-0.5; if(length(d)>0.5) discard;
      gl_FragColor=vec4(mix(vec3(1.0,0.9,0.5),vec3(1.0,0.4,0.1),1.0-vA), vA);
    }`
});
const sparks = new THREE.Points(spGeo, spMat); sparks.frustumCulled=false;
sparks.position.y=-2.4; pour.add(sparks);
scene.add(pour);

// ============================================================
//  HERO POUR — hero2 frame sequence (from hero2.mp4) on a 3D
//  billboard plane. Hides the procedural pour above. The plane
//  faces the camera and scrubs frame index from scroll progress;
//  additive blending drops the dark surround so only the molten
//  metal glows into the foundry scene.
// ============================================================
pour.visible = false;

// hero2 frame sequence (extracted from hero2.mp4), scrubbed by scroll for a
// buttery frame-by-frame pour. Relative path so it resolves in dev
// (/raysons-scrollyteller/hero2/) AND in the static deploy (root -> /hero2/).
// Asset load tracker — the loader bar in app.js gates on real decode counts
// (not a fake timer) so the user never scrolls into a blank billboard.
const Assets = (window.__assets = { hero: 0, valve: 0, bore: 0, heroN: 240, valveN: 300, boreN: 240, fail: 0 });

const HERO_N = 240;
const heroImgs = new Array(HERO_N);
// Throttled loader (max 8 in flight). Firing all 240 fetches at once floods the
// event loop with promise microtasks and starves the loader's setInterval — which
// is what stalled the reveal for 15-30s. 8-at-a-time keeps the timer responsive.
(function loadHero(){
  let next = 0, active = 0; const CONC = 8;
  function pump(){
    while (active < CONC && next < HERO_N){
      const i = next++; active++;
      fetch('hero2/ezgif-frame-' + String(i + 1).padStart(3, '0') + '.jpg')
        .then(r => r.blob()).then(bl => createImageBitmap(bl, { resizeWidth: 1280, resizeQuality: 'high' }))
        .then(bm => { heroImgs[i] = bm; Assets.hero++; }).catch(() => { Assets.fail++; })
        .finally(() => { active--; pump(); });
    }
  }
  pump();
})();
const pourCanvas = document.createElement('canvas');
pourCanvas.width = 1280; pourCanvas.height = 720;
const pourCtx = pourCanvas.getContext('2d');
const pourTex = new THREE.CanvasTexture(pourCanvas);
pourTex.colorSpace = THREE.SRGBColorSpace;
// Luminance-key material: the footage carries a baked foundry background. We
// multiply every pixel by a brightness mask so only the genuinely-glowing molten
// metal + sparks survive — the dark/mid-tone room dissolves into the scene's
// void, so the pour reads as part of ONE continuous world (no video rectangle).
const pourMat = new THREE.ShaderMaterial({
  uniforms: { uTex:{value:pourTex}, uOpacity:{value:0}, uKeyLo:{value:0.20}, uKeyHi:{value:0.52} },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D uTex; uniform float uOpacity, uKeyLo, uKeyHi; varying vec2 vUv;
    void main(){
      vec4 t = texture2D(uTex, vUv);
      float luma = dot(t.rgb, vec3(0.299, 0.587, 0.114));
      float k = smoothstep(uKeyLo, uKeyHi, luma);   // 0 = background, 1 = molten
      gl_FragColor = vec4(t.rgb * k * uOpacity, 1.0); // additive: keyed-out pixels add nothing
    }`
});
const pourPlane = new THREE.Mesh(new THREE.PlaneGeometry(34, 19), pourMat);
scene.add(pourPlane);
pourPlane.renderOrder = -1; // draw before embers so sparks cross in front of the pour
const _pourDir = new THREE.Vector3();
const POUR_DIST = 18; // units in front of the camera

// Scrub the hero frame sequence by scroll (cover-fit onto the canvas texture).
let _heroDrawn = -1;
function drawHeroFrame(idx) {
  idx = Math.max(0, Math.min(HERO_N - 1, idx | 0));
  if (idx === _heroDrawn) return;
  const im = heroImgs[idx]; if (!im) return;
  const cw = pourCanvas.width, ch = pourCanvas.height;
  pourCtx.fillStyle = '#000'; pourCtx.fillRect(0, 0, cw, ch);
  const s = Math.max(cw / im.width, ch / im.height);
  pourCtx.drawImage(im, (cw - im.width*s)/2, (ch - im.height*s)/2, im.width*s, im.height*s);
  pourTex.needsUpdate = true; _heroDrawn = idx;
}
function updatePour(p) {
  // Lock the pour as the HERO: a fixed distance in front of the camera through the
  // opening, scrubbing the frame sequence, then fading out BEFORE the casting beat
  // so it never overlaps the assembly.
  drawHeroFrame(_clamp01(p / 0.40) * (HERO_N - 1));
  const op = _clamp01((0.46 - p) / 0.06);
  pourPlane.material.uniforms.uOpacity.value = op;
  pourPlane.visible = op > 0.001;
  if (pourPlane.visible) {
    camera.getWorldDirection(_pourDir);
    pourPlane.position.copy(camera.position).addScaledVector(_pourDir, POUR_DIST);
    pourPlane.lookAt(camera.position);
    // micro-parallax: independent screen-space drift + slow dolly so the pour
    // reads as a body in space, not a decal locked to the lens.
    const t = clock.elapsedTime;
    pourPlane.translateX(Math.sin(t * 0.25) * 0.8);
    pourPlane.translateY(Math.cos(t * 0.21) * 0.55);
    pourPlane.scale.setScalar(0.96 + (p / 0.40) * 0.12);
  }
}

// ============================================================
//  CASTING — hydraulic valve (assembly frame sequence) billboard.
//  Replaces the disabled flanged hub. The footage has a near-black
//  background, so a GENTLE luminance key (normal blending — it's
//  solid metal, not a glow) floats the part cleanly in the void and
//  scrubs the rotation across the casting beat (~0.40 -> 0.66).
// ============================================================
const VALVE_N = 300;
const valveImgs = new Array(VALVE_N);
// assembly-frames2 (landscape) — the finished part assembling, shown at the CASTING
// beat AFTER the pour, replacing the old portrait assembly-frames. Deferred 2s so it
// doesn't compete with the hero loader. Relative path resolves on dev + static deploy.
function loadValveFrames(){
  for (let i = 0; i < VALVE_N; i++) {
    fetch('assembly-frames2/ezgif-frame-' + String(i + 1).padStart(3, '0') + '.jpg')
      .then(r => r.blob()).then(b => createImageBitmap(b, { resizeWidth: 1280, resizeQuality: 'high' }))
      .then(bm => { valveImgs[i] = bm; Assets.valve++; }).catch(() => { Assets.fail++; });
  }
}
setTimeout(loadValveFrames, 2000);
const valveCanvas = document.createElement('canvas');
valveCanvas.width = 1280; valveCanvas.height = 720;   // LANDSCAPE 16:9 (new assembly-frames2 footage)
const valveCtx = valveCanvas.getContext('2d');
const valveTex = new THREE.CanvasTexture(valveCanvas);
valveTex.colorSpace = THREE.SRGBColorSpace;
// New footage sits on a genuinely BLACK stage (sampled edges ≈ rgb 3/255). A soft
// dark-key alphas out ONLY the near-black background (luma < ~0.11) so the part
// floats cleanly in the void with no rectangle edge — while every mid-tone of the
// casting stays fully opaque and fresh (no dulling, the old luma-key's failure mode).
const valveMat = new THREE.ShaderMaterial({
  uniforms: { uTex:{value:valveTex}, uOpacity:{value:0} },
  transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
    void main(){
      vec4 t = texture2D(uTex, vUv);
      float luma = dot(t.rgb, vec3(0.299, 0.587, 0.114));
      float a = smoothstep(0.025, 0.11, luma);   // key out near-black bg, keep the part
      gl_FragColor = vec4(t.rgb, a * uOpacity);
    }`
});
// Landscape 16:9 billboard sized to sit in the casting framing with margin on all
// sides, so the FULL exploded assembly is visible (the old 9:16 plane cropped the
// wide spread). Camera-locked + centered in updateValve so it never drifts off-frame.
const valvePlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), valveMat);
valvePlane.position.set(0, 0.4, -92);
scene.add(valvePlane);
let _valveDrawn = -1;
function drawValveFrame(idx){
  idx = Math.max(0, Math.min(VALVE_N-1, idx|0));
  if (idx === _valveDrawn) return;
  const im = valveImgs[idx]; if (!im) return;
  const cw = valveCanvas.width, ch = valveCanvas.height;
  valveCtx.fillStyle = '#000'; valveCtx.fillRect(0,0,cw,ch);
  const s = Math.max(cw/im.width, ch/im.height);
  valveCtx.drawImage(im, (cw-im.width*s)/2, (ch-im.height*s)/2, im.width*s, im.height*s);
  valveTex.needsUpdate = true; _valveDrawn = idx;
}
function updateValve(p){
  const t = _clamp01((p - 0.48) / (0.63 - 0.48));   // SLOWER assembly — spread over more scroll
  // Full assembly: exploded components -> one casting. (The widest-explosion frames
  // are clipped L/R in the SOURCE render; only a re-render with margin fixes that.)
  drawValveFrame(t * (VALVE_N - 1));
  // Fade in after the pour clears, hold the assembled part, then CROSS-FADE OUT
  // into the bore (0.62 -> 0.67) so it dissolves into looking down its own bore.
  const lin = Math.min(_clamp01((p - 0.48) / 0.05), _clamp01((0.67 - p) / 0.05));
  const op = lin * lin * (3 - 2 * lin);
  valveMat.uniforms.uOpacity.value = op;
  valvePlane.visible = op > 0.001;
  if (valvePlane.visible) {
    // Camera-locked + centered so the components never drift off-frame as the
    // casting camera pans; pulled back (14u) so the whole exploded spread fits.
    camera.getWorldDirection(_pourDir);
    valvePlane.position.copy(camera.position).addScaledVector(_pourDir, 14);
    valvePlane.lookAt(camera.position);
  }
}

// ============================================================
//  BORE PORTAL — "look inside the part" push-in (bore frame seq).
//  Full-screen (you are INSIDE the bore now), camera-locked, scrubs
//  the dolly, then darkens into the globe finale. The footage fills
//  the frame so it needs no key — just a full-bleed cover-fit.
// ============================================================
const BORE_N = 240;
const boreImgs = new Array(BORE_N);
// Bore frames only appear at ~62% scroll, so defer them — loading them at init
// alongside the hero set jams the connection pool and stalls the loader. 3s in,
// the hero is already streaming and the page has revealed.
let _boreLoadStarted = false;
function loadBoreFrames(){
  if (_boreLoadStarted) return; _boreLoadStarted = true;
  for (let i = 0; i < BORE_N; i++) {
    fetch('bore-frames/ezgif-frame-' + String(i + 1).padStart(3, '0') + '.jpg')
      .then(r => r.blob()).then(b => createImageBitmap(b, { resizeWidth: 720, resizeQuality: 'high' }))
      .then(bm => { boreImgs[i] = bm; Assets.bore++; }).catch(() => { Assets.fail++; });
  }
}
setTimeout(loadBoreFrames, 3000);
const boreCanvas = document.createElement('canvas');
boreCanvas.width = 720; boreCanvas.height = 1280;   // portrait — hub-sized porthole, not full-screen
const boreCtx = boreCanvas.getContext('2d');
const boreTex = new THREE.CanvasTexture(boreCanvas);
boreTex.colorSpace = THREE.SRGBColorSpace;
// Circular-porthole vignette: the bore footage fills its frame (no black bg), so a
// radial mask dissolves the rectangle edges into the void — reads as "looking INTO
// the part's bore", hub-sized to match the valve and at the same spot for a blend.
const borePortalMat = new THREE.ShaderMaterial({
  uniforms: { uTex:{value:boreTex}, uOpacity:{value:0} },
  transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
    void main(){
      vec4 t = texture2D(uTex, vUv);
      float r = length(vUv - 0.5);
      float mask = smoothstep(0.5, 0.30, r);   // circular porthole, edges fade to void
      gl_FragColor = vec4(t.rgb, mask * uOpacity);
    }`
});
const borePlane = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 9.8), borePortalMat); // hub-sized, like the valve
borePlane.position.set(0, 0.4, -92);   // same spot as the valve → cross-blend in place
scene.add(borePlane);
let _boreDrawn = -1;
function drawBoreFrame(idx){
  idx = Math.max(0, Math.min(BORE_N - 1, idx | 0));
  if (idx === _boreDrawn) return;
  const im = boreImgs[idx]; if (!im) return;
  const cw = boreCanvas.width, ch = boreCanvas.height;
  boreCtx.fillStyle = '#000'; boreCtx.fillRect(0, 0, cw, ch);
  const s = Math.max(cw / im.width, ch / im.height);   // cover-fit the portrait frame
  boreCtx.drawImage(im, (cw - im.width * s) / 2, (ch - im.height * s) / 2, im.width * s, im.height * s);
  boreTex.needsUpdate = true; _boreDrawn = idx;
}
function updateBore(p){
  const t = _clamp01((p - 0.62) / (0.86 - 0.62));   // dolly push-in down the bore
  drawBoreFrame(t * (BORE_N - 1));
  // CROSS-BLEND from the valve (0.62->0.67), push down the bore, then fade out as
  // the globe grows in behind it (~0.86->0.94) — so the globe emerges from the bore.
  const lin = Math.min(_clamp01((p - 0.62) / 0.05), _clamp01((0.94 - p) / 0.08));
  const op = lin * lin * (3 - 2 * lin);
  borePortalMat.uniforms.uOpacity.value = op;
  borePlane.visible = op > 0.001;
  if (borePlane.visible) {
    // Camera-locked porthole: stays in front as the camera dives, so the push-in
    // reads and the bore is what you're moving THROUGH toward the globe.
    camera.getWorldDirection(_pourDir);
    borePlane.position.copy(camera.position).addScaledVector(_pourDir, 12);
    borePlane.lookAt(camera.position);
  }
}

// ============================================================
//  CASTING — V1 precision flanged hub (ported from hubScene.js)
//  Real machined part: flange + machined faces + 8 splines +
//  4 bolt holes, procedural turning-groove maps, clearcoat metal,
//  orange wireframe overlay. Replaces the old primitive casting.
//  Emissive is driven hot->cool by applyProgress() on castingMats.
// ============================================================
const _clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// Procedural height -> normal+roughness maps (multi-octave value noise +
// horizontal turning bands = the look of machined/turned metal).
function valueNoise2D(size, octaves, bandFreq){
  const h = new Float32Array(size*size);
  const rnd = (x,y)=>{ const s=Math.sin(x*127.1+y*311.7)*43758.5453; return s-Math.floor(s); };
  for(let oc=0;oc<octaves;oc++){
    const freq=Math.pow(2,oc)*6, amp=Math.pow(0.5,oc), cell=size/freq;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const fx=x/cell, fy=y/cell, ix=Math.floor(fx), iy=Math.floor(fy);
      const tx=fx-ix, ty=fy-iy;
      const a=rnd(ix,iy), b=rnd(ix+1,iy), cc=rnd(ix,iy+1), dd=rnd(ix+1,iy+1);
      const ux=tx*tx*(3-2*tx), uy=ty*ty*(3-2*ty);
      h[y*size+x]+=(a*(1-ux)*(1-uy)+b*ux*(1-uy)+cc*(1-ux)*uy+dd*ux*uy)*amp;
    }
  }
  let mn=Infinity, mx=-Infinity;
  for(let i=0;i<h.length;i++){ if(h[i]<mn)mn=h[i]; if(h[i]>mx)mx=h[i]; }
  for(let y=0;y<size;y++){
    const band=bandFreq?Math.sin(y/size*Math.PI*2*bandFreq)*0.12:0;
    for(let x=0;x<size;x++) h[y*size+x]=(h[y*size+x]-mn)/(mx-mn)*0.8+band+0.1;
  }
  return h;
}
function mapsFromHeight(h, size, normalStrength, roughBase, roughVar){
  const nC=document.createElement('canvas'); nC.width=nC.height=size;
  const rC=document.createElement('canvas'); rC.width=rC.height=size;
  const nx=nC.getContext('2d'), rx=rC.getContext('2d');
  const nIm=nx.createImageData(size,size), rIm=rx.createImageData(size,size);
  const nd=nIm.data, rd=rIm.data;
  const at=(x,y)=>h[((y+size)%size)*size+((x+size)%size)];
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const dx=(at(x+1,y)-at(x-1,y))*normalStrength, dy=(at(x,y+1)-at(x,y-1))*normalStrength;
    const nxv=-dx, nyv=-dy, nzv=1, len=Math.hypot(nxv,nyv,nzv), i=(y*size+x)*4;
    nd[i]=((nxv/len)*0.5+0.5)*255; nd[i+1]=((nyv/len)*0.5+0.5)*255; nd[i+2]=((nzv/len)*0.5+0.5)*255; nd[i+3]=255;
    const r=_clamp01(roughBase+(at(x,y)-0.5)*roughVar)*255; rd[i]=rd[i+1]=rd[i+2]=r; rd[i+3]=255;
  }
  nx.putImageData(nIm,0,0); rx.putImageData(rIm,0,0);
  const nt=new THREE.CanvasTexture(nC), rt=new THREE.CanvasTexture(rC);
  nt.wrapS=nt.wrapT=rt.wrapS=rt.wrapT=THREE.RepeatWrapping;
  return { normal:nt, rough:rt };
}
const _TEX=1024;
const bodyMaps=mapsFromHeight(valueNoise2D(_TEX,4,26),_TEX,2.2,0.30,0.22);
bodyMaps.normal.repeat.set(3,3); bodyMaps.rough.repeat.set(3,3);
const machMaps=mapsFromHeight(valueNoise2D(_TEX,3,70),_TEX,1.1,0.07,0.06);
machMaps.normal.repeat.set(2,2); machMaps.rough.repeat.set(2,2);

// Cool machined metal — exactly as in V1 (no emissive). Lit by the studio
// lights below + the RoomEnvironment map.
const bodyMat = new THREE.MeshPhysicalMaterial({ color:0x8a847b, roughness:0.30, metalness:0.82, envMapIntensity:1.7,
  roughnessMap:bodyMaps.rough, normalMap:bodyMaps.normal, normalScale:new THREE.Vector2(0.5,0.5),
  clearcoat:0.35, clearcoatRoughness:0.4 });
const machinedMat = new THREE.MeshPhysicalMaterial({ color:0xa8a098, roughness:0.06, metalness:0.95, envMapIntensity:2.4,
  roughnessMap:machMaps.rough, normalMap:machMaps.normal, normalScale:new THREE.Vector2(0.12,0.12),
  clearcoat:0.25, clearcoatRoughness:0.12 });
const boreMat = new THREE.MeshStandardMaterial({ color:0x1c1916, roughness:0.55, metalness:0.60, side:THREE.BackSide, envMapIntensity:0.4 });
const splineMat = new THREE.MeshStandardMaterial({ color:0x2a2622, roughness:0.35, metalness:0.65, envMapIntensity:0.6 });
const boltMat = new THREE.MeshStandardMaterial({ color:0x0e0d0b, roughness:0.5, metalness:0.5, side:THREE.BackSide, envMapIntensity:0.2 });
const chamferMat = new THREE.MeshStandardMaterial({ color:0x888278, roughness:0.12, metalness:0.88, envMapIntensity:1.8 });
const wireMat = new THREE.MeshBasicMaterial({ color:0xff6a1a, wireframe:true, transparent:true, opacity:0.16, depthWrite:false });

const FLNG_R=0.90, FLNG_H=0.10, HUB_R=0.38, HUB_H=0.72, BORE_R=0.195;
const SPLINE_N=8, SPLINE_W=0.032, SPLINE_D=0.040;
const BOLT_R=0.65, BOLT_N=4, BOLT_HR=0.062;

const casting = new THREE.Group();
casting.position.set(0,0.4,-92);
const hub  = new THREE.Group();
const hubWire = new THREE.Group();
function addM(geo, mat, pos, rot){
  const m=new THREE.Mesh(geo,mat); if(pos)m.position.copy(pos); if(rot)m.rotation.copy(rot); hub.add(m);
  const w=new THREE.Mesh(geo,wireMat.clone()); if(pos)w.position.copy(pos); if(rot)w.rotation.copy(rot); hubWire.add(w);
  return m;
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z), Eu=(x,y,z)=>new THREE.Euler(x,y,z);
addM(new THREE.CylinderGeometry(FLNG_R,FLNG_R,FLNG_H,80,1,true), bodyMat, V(0,-FLNG_H/2,0));
addM(new THREE.RingGeometry(HUB_R,FLNG_R,80,1), bodyMat, V(0,0,0), Eu(-Math.PI/2,0,0));
addM(new THREE.RingGeometry(BORE_R,FLNG_R,80,1), machinedMat, V(0,-FLNG_H,0), Eu(Math.PI/2,0,0));
addM(new THREE.CylinderGeometry(HUB_R-0.004,HUB_R+0.004,HUB_H,80,5,true), bodyMat, V(0,HUB_H/2,0));
addM(new THREE.RingGeometry(BORE_R,HUB_R,80,1), machinedMat, V(0,HUB_H,0), Eu(-Math.PI/2,0,0));
addM(new THREE.TorusGeometry(HUB_R+0.012,0.014,12,80), chamferMat, V(0,0,0), Eu(Math.PI/2,0,0));
addM(new THREE.TorusGeometry(HUB_R-0.014,0.014,10,80), chamferMat, V(0,HUB_H,0), Eu(Math.PI/2,0,0));
addM(new THREE.CylinderGeometry(BORE_R,BORE_R,HUB_H+FLNG_H+0.01,64,2,true), boreMat, V(0,(HUB_H-FLNG_H)/2,0));
for(let i=0;i<SPLINE_N;i++){
  const a=(i/SPLINE_N)*Math.PI*2, r=BORE_R-SPLINE_D/2;
  addM(new THREE.BoxGeometry(SPLINE_W,HUB_H+FLNG_H+0.02,SPLINE_D), splineMat, V(r*Math.cos(a),(HUB_H-FLNG_H)/2,r*Math.sin(a)), Eu(0,-a,0));
  addM(new THREE.PlaneGeometry(SPLINE_W,HUB_H+FLNG_H+0.02), splineMat, V((r-SPLINE_D/2)*Math.cos(a),(HUB_H-FLNG_H)/2,(r-SPLINE_D/2)*Math.sin(a)), Eu(0,-a+Math.PI,0));
}
for(let i=0;i<BOLT_N;i++){
  const a=(i/BOLT_N)*Math.PI*2+Math.PI/4;
  addM(new THREE.CylinderGeometry(BOLT_HR,BOLT_HR,FLNG_H+0.008,18,1,true), boltMat, V(BOLT_R*Math.cos(a),-FLNG_H/2,BOLT_R*Math.sin(a)));
  addM(new THREE.TorusGeometry(BOLT_HR+0.015,0.010,6,24), machinedMat, V(BOLT_R*Math.cos(a),-FLNG_H,BOLT_R*Math.sin(a)), Eu(Math.PI/2,0,0));
  addM(new THREE.CylinderGeometry(BOLT_HR+0.025,BOLT_HR+0.025,0.008,24), bodyMat, V(BOLT_R*Math.cos(a),0.004,BOLT_R*Math.sin(a)));
}
// Scale to fill the camera framing the old casting occupied, and centre vertically.
const HUB_SCALE = 3.1;
hub.scale.setScalar(HUB_SCALE); hubWire.scale.setScalar(HUB_SCALE);
const _yOff = -((HUB_H-FLNG_H)/2)*HUB_SCALE;
hub.position.y = _yOff; hubWire.position.y = _yOff;
casting.add(hub); casting.add(hubWire);
scene.add(casting);
// ⚑ FLANGED HUB TEMPORARILY DISABLED — testing the frame-sequence casting approach
// (assembly + bore). Re-enable by removing this line.
casting.visible = false;
// Empty so applyProgress()'s hot->cool emissive driver leaves the hub as
// clean metal (the V1 look). The casting beat is lit, not glowing.
const castingMats=[];

// Dedicated studio lighting at the casting (z=-92) so the COOL machined metal
// still reads after the hot emissive fades — mirrors V1 hub-realm's key+fill.
// Distance-limited point lights keep them local to the casting beat.
const hubKey  = new THREE.PointLight(0xfff0e2, 130, 46, 2); hubKey.position.set(7, 8, -85);  scene.add(hubKey);
const hubFill = new THREE.PointLight(0x8ca6d8, 55, 46, 2);  hubFill.position.set(-8, -2, -99); scene.add(hubFill);
const hubRim  = new THREE.PointLight(0xff7a2a, 40, 40, 2);  hubRim.position.set(-3, 4, -100);  scene.add(hubRim);

// ============================================================
//  PROCESS RAIL — 6 marker pylons along the path
// ============================================================
const rail = new THREE.Group();
const railMat = new THREE.MeshStandardMaterial({ color:'#1a1611', metalness:.8, roughness:.5, emissive:'#ff5a14', emissiveIntensity:.5 });
for(let i=0;i<6;i++){
  const z = -118 - i*16;
  const side = i%2===0 ? -7 : 7;
  const py = new THREE.Mesh(new THREE.BoxGeometry(0.2,7,0.2), railMat);
  py.position.set(side,0,z); rail.add(py);
  const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.7),
    new THREE.MeshBasicMaterial({ color:'#ff7a26' }));
  node.position.set(side,2.4,z); node.userData.spin=0.5+i*0.1; rail.add(node);
}
scene.add(rail);
rail.visible = false; // Process chapter removed from the journey.

// ============================================================
//  GLOBE — export arcs (Kolhapur -> world)
// ============================================================
const globe = new THREE.Group();
globe.position.set(0,0.5,-195);  // closer so it grows in AS the bore porthole opens
const R=6;
const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(R,2),
  new THREE.MeshBasicMaterial({ color:'#b5763f', wireframe:true, transparent:true, opacity:.46 }));
globe.add(wire);
const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(R*0.86,32,32),
  new THREE.MeshBasicMaterial({ color:'#1c0f06' }));
globe.add(innerGlow);
// Fresnel atmosphere halo — lifts the globe to the hub's fidelity tier.
const atmo = new THREE.Mesh(new THREE.SphereGeometry(R*1.05,48,48),
  new THREE.ShaderMaterial({
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.BackSide,
    uniforms:{ uColor:{ value:new THREE.Color('#ff6a1a') } },
    vertexShader:`varying vec3 vN; varying vec3 vView;
      void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uColor; varying vec3 vN; varying vec3 vView;
      void main(){ float f=pow(1.0-max(dot(vN,vView),0.0),2.6); gl_FragColor=vec4(uColor, f*0.85); }`
  }));
globe.add(atmo);
function ll(lat,lon){ const p=(90-lat)*Math.PI/180,t=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-R*Math.sin(p)*Math.cos(t), R*Math.cos(p), R*Math.sin(p)*Math.sin(t)); }
const HOME=ll(16.7,74.2); // Kolhapur
const DEST=[ll(43,12), ll(54,-2), ll(36,138), ll(39,-98)]; // Italy, UK, Japan, USA
const arcMat=new THREE.LineBasicMaterial({ color:'#ff7a26', transparent:true, opacity:.8 });
const dashHeads=[];
DEST.forEach(d=>{
  const mid=HOME.clone().add(d).multiplyScalar(0.5).normalize().multiplyScalar(R*1.5);
  const curve=new THREE.QuadraticBezierCurve3(HOME,mid,d);
  const pts=curve.getPoints(50);
  const g=new THREE.BufferGeometry().setFromPoints(pts);
  globe.add(new THREE.Line(g,arcMat.clone()));
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshBasicMaterial({color:'#ffcf8a'}));
  head.userData.curve=curve; dashHeads.push(head); globe.add(head);
  const pin=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8), new THREE.MeshBasicMaterial({color:'#ff7a26'}));
  pin.position.copy(d); globe.add(pin);
});
const homePin=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,10), new THREE.MeshBasicMaterial({color:'#ffcf8a'}));
homePin.position.copy(HOME); globe.add(homePin);
scene.add(globe);

// ============================================================
//  CAMERA PATH — keyframes per chapter
// ============================================================
// 7-beat journey. Process / Group / FAQ / Enquire chapters removed — the
// globe (global customers) is the finale. Indices match the .chapter DOM order.
const KF = [
  { p:[0,1.2,30],    l:[0,1,-4] },     // 0 hero
  { p:[0.4,0.6,12],  l:[0,1,-12] },    // 1 "part inside machine"
  { p:[3,2.2,-34],   l:[0,-1,-46] },   // 2 pour
  { p:[0.5,1.4,-80], l:[0,0.4,-92] },  // 3 casting reveal
  { p:[4.2,0.8,-86], l:[0,0.4,-92] },  // 4 casting features
  { p:[0,1.2,-150],  l:[0,0.5,-195] }, // 5 capabilities
  { p:[0,1,-181],    l:[0,0.5,-195] }, // 6 globe / trust — FINALE (emerges from bore)
];
const N_SEG = KF.length-1;
const _p=new THREE.Vector3(), _l=new THREE.Vector3(), _tmp=new THREE.Vector3();
function smooth(t){ return t*t*(3-2*t); }

let progress=0, targetProgress=0;
const clock=new THREE.Clock();

function applyProgress(g){
  const f = g*N_SEG;
  const i = Math.min(N_SEG-1, Math.floor(f));
  const t = smooth(f-i);
  const a=KF[i], b=KF[i+1];
  _p.set(a.p[0]+(b.p[0]-a.p[0])*t, a.p[1]+(b.p[1]-a.p[1])*t, a.p[2]+(b.p[2]-a.p[2])*t);
  _l.set(a.l[0]+(b.l[0]-a.l[0])*t, a.l[1]+(b.l[1]-a.l[1])*t, a.l[2]+(b.l[2]-a.l[2])*t);
  // gentle parallax sway (skipped for reduced-motion users)
  if (!REDUCED){
    _p.x += Math.sin(clock.elapsedTime*0.3)*0.25;
    _p.y += Math.cos(clock.elapsedTime*0.24)*0.18;
  }
  camera.position.lerp(_p, 0.11);
  _tmp.copy(_l); camera.lookAt(_tmp);

  // furnace light intensity peaks early
  key.intensity = 6.5 * Math.max(0, 1 - Math.abs(g*N_SEG-0.6)/1.6);
  // casting cooling: hot at seg3 -> cool by seg5
  const cool = THREE.MathUtils.clamp((g*N_SEG-3)/2.2, 0, 1);
  const eI = 1.5*(1-cool);
  castingMats.forEach(m=>{ m.emissiveIntensity = eI*1.1 + 0.05; m.emissive.setHSL(0.06, 1, 0.5*(1-cool*0.7)); });
  castLight.intensity = 5*(1-cool)*Math.max(0,1-Math.abs(g*N_SEG-3.5)/2);
}

// ============================================================
//  POST
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth*(MOBILE?0.5:1), innerHeight*(MOBILE?0.5:1)), MOBILE?0.7:0.9, 0.7, 0.18);
composer.addPass(bloom);

// ============================================================
//  LOOP
// ============================================================
function tick(){
  requestAnimationFrame(tick);
  // Don't render behind the opaque loader — rendering the bloom scene full-speed
  // while hidden starves the loader's timer and stalls the reveal. Wait for 'entered'.
  if (!document.body.classList.contains('entered')) return;
  const dt=Math.min(0.05, clock.getDelta()); const et=clock.elapsedTime;
  progress += (targetProgress-progress)*0.30;  // light: Lenis already smooths scroll; camera lerp below is the cinematic easing
  emMat.uniforms.uTime.value=et;
  spMat.uniforms.uTime.value=et;
  core.rotation.y+=dt*0.3; core.rotation.x+=dt*0.12;
  core.scale.setScalar(1+Math.sin(et*2)*0.04);
  // V1 hub choreography (ported from hubScene.js): horizontal->vertical flip as
  // the camera arrives at the casting, continuous accelerating Y-spin, and a
  // gentle floating bob. Applied to the inner hub groups (casting stays fixed).
  {
    const ct = _clamp01((progress - 0.40) / (0.60 - 0.40)); // local casting-beat progress
    const k  = smooth(_clamp01(ct / 0.25));                  // flip over first 25% of beat
    const spinY = 0.45 + et * 0.12;
    hub.rotation.set(0.10 + 0.22 * k, spinY, -Math.PI / 2 + (Math.PI / 2) * k);
    hubWire.rotation.copy(hub.rotation);
    const bobY = _yOff + Math.sin(et * 0.35) * 0.04;
    hub.position.y = bobY; hubWire.position.y = bobY;
  }
  pool.scale.setScalar(1+Math.sin(et*3)*0.03);
  rail.children.forEach(c=>{ if(c.userData.spin) c.rotation.y+=dt*c.userData.spin; });
  globe.rotation.y+=dt*0.05;
  dashHeads.forEach((h,i)=>{ const t=(et*0.18+i*0.25)%1; h.position.copy(h.userData.curve.getPoint(t)); });
  applyProgress(progress);
  updatePour(progress);
  updateValve(progress);
  updateBore(progress);
  // Pour -> hub handoff: a bloom + light flash centred where the pour fades and
  // the finished part is revealed, so the molten metal visibly *becomes* the part.
  const _ho = Math.exp(-Math.pow((progress - 0.46) / 0.05, 2));
  bloom.strength = 0.9 + _ho * 0.95;
  castLight.intensity += _ho * 7;
  composer.render();
}

// ============================================================
//  API
// ============================================================
window.Foundry = {
  setProgress(v){ targetProgress = Math.max(0, Math.min(1, v)); },
  resize(){
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight);
  },
  // synchronous render for offline inspection (rAF-independent)
  debugRender(p){
    progress = Math.max(0, Math.min(1, p));
    for(let k=0;k<60;k++) applyProgress(progress);
    composer.render();
  },
  // lock progress so the running tick loop keeps this exact framing (capture aid)
  lock(p){
    progress = targetProgress = Math.max(0, Math.min(1, p));
    for(let k=0;k<60;k++) applyProgress(progress);
  },
  ready:true
};
window.__dbg = { camera, casting, hub, hubWire, pourPlane, THREE,
  getState: () => ({ progress, targetProgress }),
  pourState: () => { let n=0; for(let i=0;i<HERO_N;i++) if(heroImgs[i]) n++; return { heroLoaded:n, drawn:_heroDrawn, visible:pourPlane.visible, opacity:+pourPlane.material.uniforms.uOpacity.value.toFixed(2) }; } };
addEventListener('resize', ()=>window.Foundry.resize());
tick();
window.dispatchEvent(new Event('foundry-ready'));

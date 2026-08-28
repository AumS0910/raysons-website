// ============================================================
//  RAYSONS — About · Timeline Journey  ·  WebGL scene
//  Exposes window.AboutScene { setProgress, setDirection, setParams, resize }
// ============================================================
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance', preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

// ---- direction palettes ----
const PALETTES = {
  ember: {
    bg:'#070504', fog:'#0a0604', accent:'#ff7a26', hot:'#ffb24a', deep:'#c2300a',
    amb:'#2a1d12', rim:'#88a6ff', wire:'#5a4a3a', plate:'#ffae5a', text:'#ffd9a8'
  },
  steel: {
    bg:'#04070b', fog:'#050a10', accent:'#5fa8ff', hot:'#a8d2ff', deep:'#1a4ea8',
    amb:'#101a2a', rim:'#ffb96a', wire:'#3a4a5e', plate:'#7fb8ff', text:'#cfe6ff'
  }
};
let PAL = PALETTES.ember;

scene.background = new THREE.Color(PAL.bg);
scene.fog = new THREE.FogExp2(PAL.fog, 0.011);

const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 700);
camera.position.set(0,1.5,18);

// ---- lighting ----
const amb = new THREE.AmbientLight(PAL.amb, 0.7); scene.add(amb);
const key = new THREE.PointLight(PAL.accent, 2.5, 140, 2.0); key.position.set(0,3,-20); scene.add(key);
const rim = new THREE.DirectionalLight(PAL.rim, 0.25); rim.position.set(-6,8,4); scene.add(rim);
const flare = new THREE.PointLight(PAL.hot, 0, 80, 2.2); flare.position.set(0,2,-208); scene.add(flare); // 2021 ignition

// ============================================================
//  EMBERS — drifting particles following the camera
// ============================================================
const EMBER_N = 800;
const emGeo = new THREE.BufferGeometry();
const emPos = new Float32Array(EMBER_N*3);
const emVel = new Float32Array(EMBER_N);
const emSize = new Float32Array(EMBER_N);
const emSeed = new Float32Array(EMBER_N);
for(let i=0;i<EMBER_N;i++){
  emPos[i*3]   = (Math.random()-.5)*70;
  emPos[i*3+1] = (Math.random()-.5)*50;
  emPos[i*3+2] = -Math.random()*380;
  emVel[i] = 0.3 + Math.random()*1.2;
  emSize[i] = 0.6 + Math.random()*2.0;
  emSeed[i] = Math.random()*6.28;
}
emGeo.setAttribute('position', new THREE.BufferAttribute(emPos,3));
emGeo.setAttribute('aVel', new THREE.BufferAttribute(emVel,1));
emGeo.setAttribute('aSize', new THREE.BufferAttribute(emSize,1));
emGeo.setAttribute('aSeed', new THREE.BufferAttribute(emSeed,1));
const emMat = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{ uTime:{value:0}, uPix:{value:renderer.getPixelRatio()},
    uColA:{value:new THREE.Color(1.0,0.35,0.06)}, uColB:{value:new THREE.Color(1.0,0.78,0.3)} },
  vertexShader:`
    uniform float uTime; uniform float uPix;
    attribute float aVel; attribute float aSize; attribute float aSeed;
    varying float vA;
    void main(){
      vec3 p = position;
      p.y = mod(p.y + uTime*aVel + 25.0, 50.0) - 25.0;
      p.x += sin(uTime*0.5 + aSeed)*1.4;
      vA = 0.35 + 0.6*abs(sin(uTime*1.5 + aSeed));
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPix * (60.0 / -mv.z);
    }`,
  fragmentShader:`
    uniform vec3 uColA; uniform vec3 uColB; varying float vA;
    void main(){
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      if(r>0.5) discard;
      float glow = smoothstep(0.5,0.0,r);
      gl_FragColor = vec4(mix(uColA, uColB, glow), glow*vA);
    }`
});
const embers = new THREE.Points(emGeo, emMat);
embers.frustumCulled = false;
scene.add(embers);

// ============================================================
//  GROUP CONSTELLATION — 4 verticals orbiting a core  (z ≈ -20)
// ============================================================
const group4 = new THREE.Group(); group4.position.set(0,1,-20);
const coreMat = new THREE.MeshBasicMaterial({ color:PAL.accent });
const gCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1), coreMat);
group4.add(gCore);
const satMat = new THREE.MeshStandardMaterial({ color:'#241e18', metalness:.92, roughness:.35, emissive:PAL.deep, emissiveIntensity:.8 });
const SAT_GEOS = [
  new THREE.OctahedronGeometry(0.85),            // Sandchem — crystal/sand
  new THREE.BoxGeometry(1.1,1.1,1.1),            // Industries — block/real estate
  new THREE.TorusGeometry(0.72,0.24,12,32),      // Hospitality — ring
  new THREE.ConeGeometry(0.78,1.3,5)             // Shell Cast — crucible
];
const sats = SAT_GEOS.map((g,i)=>{
  const m = new THREE.Mesh(g, satMat);
  m.userData.ang = (i/4)*Math.PI*2;
  m.userData.r = 4.2;
  group4.add(m);
  const orb = new THREE.Mesh(new THREE.TorusGeometry(4.2,0.012,6,90),
    new THREE.MeshBasicMaterial({ color:PAL.wire, transparent:true, opacity:.4 }));
  orb.rotation.x = Math.PI/2; if(i===0) group4.add(orb);
  return m;
});
scene.add(group4);

// ============================================================
//  PURPOSE RINGS — mission / vision / values  (z ≈ -62)
// ============================================================
const purpose = new THREE.Group(); purpose.position.set(0,1,-62);
const pCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9,2), new THREE.MeshBasicMaterial({ color:PAL.hot }));
purpose.add(pCore);
const ringMat = new THREE.MeshStandardMaterial({ color:'#1c1713', metalness:.9, roughness:.35, emissive:PAL.deep, emissiveIntensity:1.0 });
const pRings = [0,1,2].map(i=>{
  const r = new THREE.Mesh(new THREE.TorusGeometry(2.1+i*0.85, 0.05, 10, 80), ringMat);
  r.userData.tilt = i;
  purpose.add(r); return r;
});
scene.add(purpose);

// ============================================================
//  TIMELINE CORRIDOR — 10 year monoliths  (z -100 … -252)
// ============================================================
const MILESTONES = [
  { yr:'1987', z:-100 }, { yr:'1992', z:-116 }, { yr:'1995', z:-132 },
  { yr:'1997', z:-148 }, { yr:'2002', z:-164 }, { yr:'2005', z:-180 },
  { yr:'2021', z:-200 }, { yr:'2022', z:-216 },
  { yr:'2026', z:-236 }, { yr:'2027', z:-252 }
];
function yearTexture(yr, colorHex){
  const c = document.createElement('canvas'); c.width=512; c.height=256;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0,0,512,256);
  x.font = '700 150px "Space Grotesk", sans-serif';
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle = colorHex;
  x.shadowColor = colorHex; x.shadowBlur = 30;
  x.fillText(yr, 256, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const corridor = new THREE.Group();
const slabMat = new THREE.MeshStandardMaterial({ color:'#1b1612', metalness:.9, roughness:.4, emissive:PAL.deep, emissiveIntensity:.25 });
const monoliths = MILESTONES.map((ms,i)=>{
  const side = i%2===0 ? -6.4 : 6.4;
  const g = new THREE.Group(); g.position.set(side, 0, ms.z);
  // stele
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 2.6), slabMat);
  slab.position.y = 1.5; g.add(slab);
  // glowing year plate facing corridor centre
  const plateMat = new THREE.MeshBasicMaterial({ map: yearTexture(ms.yr, '#ffae5a'), transparent:true });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), plateMat);
  plate.position.set(side<0? 0.5 : -0.5, 2.6, 0);
  plate.rotation.y = side<0 ? Math.PI/2 : -Math.PI/2;
  g.add(plate);
  // base glow
  const baseGlow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32),
    new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false }));
  baseGlow.rotation.x = -Math.PI/2; baseGlow.position.y = -2.95; g.add(baseGlow);
  // marker node
  const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshBasicMaterial({ color:PAL.accent }));
  node.position.y = 6.4; node.userData.spin = 0.4 + i*0.07; g.add(node);
  g.userData.plateMat = plateMat; g.userData.glow = baseGlow; g.userData.node = node; g.userData.yr = ms.yr;
  corridor.add(g);
  return g;
});
// corridor floor path — glowing centre line
const pathLine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 175),
  new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false }));
pathLine.rotation.x = -Math.PI/2; pathLine.position.set(0,-2.98,-176);
corridor.add(pathLine);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 420),
  new THREE.MeshStandardMaterial({ color:'#0b0805', metalness:.4, roughness:.9 }));
floor.rotation.x = -Math.PI/2; floor.position.set(0,-3,-180);
corridor.add(floor);
scene.add(corridor);

// ============================================================
//  PEOPLE FIELD — grid of nodes, the team  (z ≈ -290)
// ============================================================
const people = new THREE.Group(); people.position.set(0,0,-290);
const PEOPLE_N = 7*5;
const pplMat = new THREE.MeshBasicMaterial({ color:PAL.hot });
for(let i=0;i<PEOPLE_N;i++){
  const cx = (i%7-3)*1.7, cz = (Math.floor(i/7)-2)*1.7;
  const h = 0.9 + Math.random()*0.9;
  const fig = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, h, 3, 8), pplMat.clone());
  fig.material.transparent = true; fig.material.opacity = 0.5 + Math.random()*0.5;
  fig.position.set(cx, h/2 - 2.4, cz);
  fig.userData.ph = Math.random()*6.28;
  people.add(fig);
}
scene.add(people);

// ============================================================
//  STANDARDS — 5 floating seals  (z ≈ -322)
// ============================================================
const seals = new THREE.Group(); seals.position.set(0,1,-322);
const sealMat = new THREE.MeshStandardMaterial({ color:'#241e18', metalness:.95, roughness:.3, emissive:PAL.deep, emissiveIntensity:.9 });
for(let i=0;i<5;i++){
  const a = ((i-2)/5)*Math.PI*0.9;
  const s = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8,0.12,10,40), sealMat);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial({ color:PAL.accent }));
  s.add(ring); s.add(core);
  s.position.set(Math.sin(a)*7.5, Math.cos(a*2)*1.4, -Math.abs(Math.sin(a))*3);
  s.userData.spin = 0.3+i*0.12;
  seals.add(s);
}
scene.add(seals);

// ============================================================
//  FINALE — customer constellation ring  (z ≈ -352)
// ============================================================
const finale = new THREE.Group(); finale.position.set(0,1,-352);
const fCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4,2), new THREE.MeshBasicMaterial({ color:PAL.accent }));
finale.add(fCore);
const starMat = new THREE.MeshBasicMaterial({ color:PAL.hot });
const stars = [];
for(let i=0;i<8;i++){
  const st = new THREE.Mesh(new THREE.SphereGeometry(0.16,10,10), starMat);
  st.userData.ang = (i/8)*Math.PI*2; st.userData.r = 4.6;
  finale.add(st); stars.push(st);
  const arcPts = [];
  for(let k=0;k<=24;k++){
    const t=k/24;
    const a0 = st.userData.ang;
    const from = new THREE.Vector3(0,0,0);
    const to = new THREE.Vector3(Math.cos(a0)*4.6, Math.sin(a0*1.7)*1.2, Math.sin(a0)*4.6);
    const mid = from.clone().lerp(to,0.5).add(new THREE.Vector3(0,1.6,0));
    const p = new THREE.Vector3().copy(from).multiplyScalar((1-t)*(1-t))
      .add(mid.clone().multiplyScalar(2*(1-t)*t))
      .add(to.clone().multiplyScalar(t*t));
    arcPts.push(p);
  }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineBasicMaterial({ color:PAL.accent, transparent:true, opacity:.5 }));
  finale.add(arc);
}
scene.add(finale);

// ============================================================
//  CAMERA PATH — 11 chapters
// ============================================================
const KF = [
  { p:[0,1.6,16],     l:[0,1,-20] },    // 0 hero — group cluster far ahead
  { p:[5.5,2.4,-11],  l:[0,1,-20] },    // 1 the group — orbit side
  { p:[0,1.2,-53],    l:[0,1,-62] },    // 2 purpose rings
  { p:[0,3.2,-84],    l:[0,1.4,-130] }, // 3 journey intro — corridor mouth
  { p:[1.8,1.6,-106], l:[-3,2.4,-128] },// 4 era 1987–1995
  { p:[-1.8,1.6,-154],l:[3,2.4,-176] }, // 5 era 1997–2005
  { p:[1.8,1.6,-202], l:[-3,2.6,-214] },// 6 era 2021–2022 (ignition)
  { p:[-1.4,2.2,-238],l:[3,2.6,-250] }, // 7 era 2026–2027 (future)
  { p:[0,2.4,-277],   l:[0,0.2,-290] }, // 8 people
  { p:[2.4,1.6,-310], l:[0,1,-322] },   // 9 standards
  { p:[0,1.2,-338],   l:[0,1,-352] },   // 10 finale / customers
];
const N_SEG = KF.length-1;
const _p=new THREE.Vector3(), _l=new THREE.Vector3();
function smooth(t){ return t*t*(3-2*t); }

let progress=0, targetProgress=0;
let drift = 1.0;       // sway multiplier (tweak)
let camLerp = 0.08;    // camera chase (tweak)
const clock=new THREE.Clock();

function applyProgress(g){
  const f = g*N_SEG;
  const i = Math.min(N_SEG-1, Math.floor(f));
  const t = smooth(f-i);
  const a=KF[i], b=KF[i+1];
  _p.set(a.p[0]+(b.p[0]-a.p[0])*t, a.p[1]+(b.p[1]-a.p[1])*t, a.p[2]+(b.p[2]-a.p[2])*t);
  _l.set(a.l[0]+(b.l[0]-a.l[0])*t, a.l[1]+(b.l[1]-a.l[1])*t, a.l[2]+(b.l[2]-a.l[2])*t);
  _p.x += Math.sin(clock.elapsedTime*0.3)*0.25*drift;
  _p.y += Math.cos(clock.elapsedTime*0.24)*0.18*drift;
  camera.position.lerp(_p, camLerp);
  camera.lookAt(_l);

  key.position.set(camera.position.x, camera.position.y+2.5, camera.position.z-12);

  // 2021 ignition flare peaks on chapter 6
  flare.intensity = 7 * Math.max(0, 1 - Math.abs(f-6)/1.1);

  // monolith plates brighten as the camera approaches
  monoliths.forEach(m=>{
    const d = Math.abs(m.position.z - camera.position.z);
    const near = THREE.MathUtils.clamp(1 - d/46, 0.12, 1);
    m.userData.plateMat.opacity = near;
    m.userData.glow.material.opacity = 0.05 + near*0.22;
  });
}

// ============================================================
//  POST
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.85, 0.7, 0.18);
composer.addPass(bloom);

// ============================================================
//  DIRECTION SWITCH
// ============================================================
function applyDirection(name){
  PAL = PALETTES[name] || PALETTES.ember;
  scene.background.set(PAL.bg);
  scene.fog.color.set(PAL.fog);
  amb.color.set(PAL.amb);
  key.color.set(PAL.accent);
  rim.color.set(PAL.rim);
  flare.color.set(PAL.hot);
  coreMat.color.set(PAL.accent);
  satMat.emissive.set(PAL.deep);
  pCore.material.color.set(PAL.hot);
  ringMat.emissive.set(PAL.deep);
  slabMat.emissive.set(PAL.deep);
  pplMat.color.set(PAL.hot);
  people.children.forEach(c=>c.material.color.set(PAL.hot));
  sealMat.emissive.set(PAL.deep);
  seals.children.forEach(s=>s.children[1].material.color.set(PAL.accent));
  fCore.material.color.set(PAL.accent);
  starMat.color.set(PAL.hot);
  finale.children.forEach(c=>{ if(c.isLine) c.material.color.set(PAL.accent); });
  pathLine.material.color.set(PAL.accent);
  monoliths.forEach(m=>{
    m.userData.plateMat.map = yearTexture(m.userData.yr, name==='steel' ? '#9cc8ff' : '#ffae5a');
    m.userData.plateMat.needsUpdate = true;
    m.userData.glow.material.color.set(PAL.accent);
    m.userData.node.material.color.set(PAL.accent);
  });
  if(name==='steel'){
    emMat.uniforms.uColA.value.setRGB(0.25,0.55,1.0);
    emMat.uniforms.uColB.value.setRGB(0.65,0.85,1.0);
  } else {
    emMat.uniforms.uColA.value.setRGB(1.0,0.35,0.06);
    emMat.uniforms.uColB.value.setRGB(1.0,0.78,0.3);
  }
}

// ============================================================
//  LOOP
// ============================================================
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(0.05, clock.getDelta()); const et=clock.elapsedTime;
  progress += (targetProgress-progress)*0.07;
  emMat.uniforms.uTime.value=et;

  gCore.rotation.y+=dt*0.3; gCore.rotation.x+=dt*0.12;
  sats.forEach((s,i)=>{
    const a = s.userData.ang + et*(0.18+i*0.03);
    s.position.set(Math.cos(a)*s.userData.r, Math.sin(a*1.4)*0.7, Math.sin(a)*s.userData.r);
    s.rotation.y += dt*0.6; s.rotation.x += dt*0.2;
  });
  pCore.scale.setScalar(1+Math.sin(et*2)*0.05);
  pRings.forEach((r,i)=>{
    r.rotation.x = et*(0.12+i*0.06) + i;
    r.rotation.y = et*(0.09+i*0.05);
  });
  monoliths.forEach(m=>{ m.userData.node.rotation.y += dt*m.userData.spin*2; });
  people.children.forEach(f=>{ f.position.y += Math.sin(et*1.2+f.userData.ph)*0.0016; });
  seals.children.forEach(s=>{ s.rotation.y += dt*s.userData.spin; s.rotation.x += dt*s.userData.spin*0.4; });
  fCore.rotation.y += dt*0.25;
  stars.forEach((st,i)=>{
    const a = st.userData.ang + et*0.12;
    st.position.set(Math.cos(a)*st.userData.r, Math.sin(a*1.7)*1.2, Math.sin(a)*st.userData.r);
  });
  finale.rotation.y = et*0.04;

  applyProgress(progress);
  composer.render();
}

// ============================================================
//  API
// ============================================================
window.AboutScene = {
  setProgress(v){ targetProgress = Math.max(0, Math.min(1, v)); },
  setDirection(name){ applyDirection(name); },
  setParams(o){
    if(o.drift !== undefined) drift = o.drift;
    if(o.camLerp !== undefined) camLerp = o.camLerp;
    if(o.bloom !== undefined) bloom.strength = o.bloom;
  },
  resize(){
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight);
  },
  debugRender(p){
    progress = Math.max(0, Math.min(1, p));
    for(let k=0;k<80;k++) applyProgress(progress);
    composer.render();
  },
  ready:true
};
addEventListener('resize', ()=>window.AboutScene.resize());
applyDirection(document.body.dataset.dir === 'steel' ? 'steel' : 'ember');
tick();
window.dispatchEvent(new Event('about-ready'));

// ============================================================
//  RAYSONS — About · "Our Journey" WebGL corridor
//  A 3D corridor of molten year-pillars (1987 → 2027); the camera dollies
//  between them as you scroll the journey. Ported/condensed from the reference
//  about-scene.js (ember direction). Desktop + WebGL only — on mobile / reduced-
//  motion / no-WebGL it never initialises and the CSS card list carries the section.
//  Driven by window.__journeyP (0..1), set each frame by about-journey.js.
// ============================================================
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('journeyGL');
const section = document.getElementById('tl');
if(canvas && section && !matchMedia('(prefers-reduced-motion: reduce)').matches && innerWidth > 820){
  try { boot(); } catch(e){ /* WebGL unavailable → CSS card list stays */ }
}

function boot(){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const PAL = { bg:'#070504', fog:'#0a0604', accent:'#ff7a26', hot:'#ffb24a', deep:'#c2300a', amb:'#2a1d12', rim:'#88a6ff' };
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PAL.fog, 0.012);

  const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 700);
  camera.position.set(0, 1.8, -96);

  scene.add(new THREE.AmbientLight(PAL.amb, 0.7));
  const key   = new THREE.PointLight(PAL.accent, 2.6, 150, 2.0); key.position.set(0,3,-120); scene.add(key);
  const rim   = new THREE.DirectionalLight(PAL.rim, 0.25); rim.position.set(-6,8,4); scene.add(rim);
  const flare = new THREE.PointLight(PAL.hot, 0, 80, 2.2); flare.position.set(0,2,-208); scene.add(flare); // 2021 ignition

  // ---- drifting embers ----
  const EMBER_N = 520;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(EMBER_N*3), vel = new Float32Array(EMBER_N), sz = new Float32Array(EMBER_N), seed = new Float32Array(EMBER_N);
  for(let i=0;i<EMBER_N;i++){
    pos[i*3]=(Math.random()-.5)*70; pos[i*3+1]=(Math.random()-.5)*50; pos[i*3+2]=-100-Math.random()*170;
    vel[i]=0.3+Math.random()*1.2; sz[i]=0.6+Math.random()*2.0; seed[i]=Math.random()*6.28;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('aVel', new THREE.BufferAttribute(vel,1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz,1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
  const emMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:{value:0}, uPix:{value:renderer.getPixelRatio()},
      uColA:{value:new THREE.Color(1.0,0.35,0.06)}, uColB:{value:new THREE.Color(1.0,0.78,0.3)} },
    vertexShader:`uniform float uTime; uniform float uPix; attribute float aVel; attribute float aSize; attribute float aSeed; varying float vA;
      void main(){ vec3 p=position; p.y=mod(p.y+uTime*aVel+25.0,50.0)-25.0; p.x+=sin(uTime*0.5+aSeed)*1.4;
        vA=0.35+0.6*abs(sin(uTime*1.5+aSeed)); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=aSize*uPix*(60.0/-mv.z); }`,
    fragmentShader:`uniform vec3 uColA; uniform vec3 uColB; varying float vA;
      void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float glow=smoothstep(0.5,0.0,r);
        gl_FragColor=vec4(mix(uColA,uColB,glow), glow*vA); }`
  });
  const embers = new THREE.Points(g, emMat); embers.frustumCulled = false; scene.add(embers);

  // ---- corridor of year-pillars (z -100 … -252) ----
  const MILESTONES = [
    {yr:'1987',z:-100},{yr:'1992',z:-116},{yr:'1995',z:-132},{yr:'1997',z:-148},{yr:'2002',z:-164},
    {yr:'2005',z:-180},{yr:'2021',z:-200},{yr:'2022',z:-216},{yr:'2026',z:-236},{yr:'2027',z:-252}
  ];
  function yearTex(yr){
    const c=document.createElement('canvas'); c.width=512; c.height=256; const x=c.getContext('2d');
    x.fillStyle='#000'; x.fillRect(0,0,512,256);
    x.font='700 150px "Space Grotesk","Montserrat",sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.fillStyle='#ffae5a'; x.shadowColor='#ffae5a'; x.shadowBlur=30; x.fillText(yr,256,138);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
  }
  const slabMat = new THREE.MeshStandardMaterial({ color:'#1b1612', metalness:.9, roughness:.4, emissive:PAL.deep, emissiveIntensity:.28 });
  const monoliths = MILESTONES.map((ms,i)=>{
    const side = i%2===0 ? -6.4 : 6.4;
    const grp = new THREE.Group(); grp.position.set(side,0,ms.z);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5,9,2.6), slabMat); slab.position.y=1.5; grp.add(slab);
    const plateMat = new THREE.MeshBasicMaterial({ map:yearTex(ms.yr), transparent:true });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7), plateMat);
    plate.position.set(side<0?0.5:-0.5, 2.6, 0); plate.rotation.y = side<0?Math.PI/2:-Math.PI/2; grp.add(plate);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.2,32),
      new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false }));
    glow.rotation.x=-Math.PI/2; glow.position.y=-2.95; grp.add(glow);
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshBasicMaterial({ color:PAL.accent }));
    node.position.y=6.4; node.userData.spin=0.4+i*0.07; grp.add(node);
    grp.userData={ plateMat, glow, node };
    scene.add(grp); return grp;
  });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(0.16,175),
    new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false }));
  path.rotation.x=-Math.PI/2; path.position.set(0,-2.98,-176); scene.add(path);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,420),
    new THREE.MeshStandardMaterial({ color:'#0b0805', metalness:.4, roughness:.9 }));
  floor.rotation.x=-Math.PI/2; floor.position.set(0,-3,-180); scene.add(floor);

  // ---- camera path: 4 era keyframes (from the reference corridor keyframes) ----
  const JKF = [
    { p:[1.8,1.6,-106], l:[-3,2.4,-128] },  // Era I  · 1987–1995
    { p:[-1.8,1.6,-154],l:[3,2.4,-176]  },  // Era II · 1997–2005
    { p:[1.8,1.6,-202], l:[-3,2.6,-214] },  // Era III· 2021–2022 (ignition)
    { p:[-1.4,2.2,-238],l:[3,2.6,-250]  }   // Era IV · 2026–2027
  ];
  const NS = JKF.length-1, _p=new THREE.Vector3(), _l=new THREE.Vector3();
  const smooth=t=>t*t*(3-2*t);
  function applyProgress(gp){
    const f=gp*NS, i=Math.min(NS-1,Math.floor(f)), t=smooth(f-i), a=JKF[i], b=JKF[i+1];
    _p.set(a.p[0]+(b.p[0]-a.p[0])*t, a.p[1]+(b.p[1]-a.p[1])*t, a.p[2]+(b.p[2]-a.p[2])*t);
    _l.set(a.l[0]+(b.l[0]-a.l[0])*t, a.l[1]+(b.l[1]-a.l[1])*t, a.l[2]+(b.l[2]-a.l[2])*t);
    _p.x += Math.sin(clock.elapsedTime*0.3)*0.22;
    _p.y += Math.cos(clock.elapsedTime*0.24)*0.16;
    camera.position.lerp(_p, 0.08); camera.lookAt(_l);
    key.position.set(camera.position.x, camera.position.y+2.5, camera.position.z-12);
    flare.intensity = 7*Math.max(0, 1-Math.abs(f-2)/1.1);  // ignition flare peaks at Era III
    monoliths.forEach(m=>{ const d=Math.abs(m.position.z-camera.position.z), near=THREE.MathUtils.clamp(1-d/46,0.12,1);
      m.userData.plateMat.opacity=near; m.userData.glow.material.opacity=0.05+near*0.22; });
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.8, 0.7, 0.2);
  composer.addPass(bloom);

  const clock = new THREE.Clock();
  let prog = 0, visible = true;
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>{ visible = es[0].isIntersecting; }, { rootMargin:'20% 0px' }).observe(section);
  }
  addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); });

  function tick(){
    requestAnimationFrame(tick);
    if(!visible) return;                        // don't render when the journey is off-screen
    const dt=Math.min(0.05, clock.getDelta()), et=clock.elapsedTime;
    prog += ((window.__journeyP||0) - prog) * 0.08;
    emMat.uniforms.uTime.value = et;
    monoliths.forEach(m=>{ m.userData.node.rotation.y += dt*0.9; });
    applyProgress(prog);
    composer.render();
  }
  document.body.classList.add('journey-gl');   // CSS: fade the flat glow, lift text scrim
  tick();
}

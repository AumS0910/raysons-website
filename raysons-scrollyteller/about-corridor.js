// ============================================================
//  RAYSONS — About · WebGL flythrough (the whole second half)
//  One continuous camera move through a premium molten world:
//    corridor of year-pillars (Our Journey, pinned)  →  people field
//    (Our People)  →  standards seals (Certifications)  →  customer
//    constellation (Finale).
//  The canvas is FIXED full-viewport; it fades in at the journey and
//  carries every section after it — index's "one continuous world".
//  Premium pass: PMREM environment (real metal reflections), rounded
//  monoliths with molten seams, Cormorant-engraved year plates,
//  flowing molten path shader, jewel markers.
//  Desktop + WebGL only — mobile / reduced-motion / no-WebGL keep the
//  stacked CSS layout. Journey progress comes from about-journey.js
//  (window.__journeyP); the tail phase is measured from the DOM.
// ============================================================
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.getElementById('journeyGL');
const journey = document.getElementById('tl');
// Runs on EVERY size now — the user wants the desktop journey on phone/tablet too.
// boot() tunes render cost + camera FOV down for small screens; reduced-motion / no-WebGL
// still fall back to the CSS card list.
if(canvas && journey && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  try { boot(); } catch(e){ /* no WebGL → CSS layout carries the page */ }
}

function boot(){
  const MOBILE = innerWidth <= 820;                   // phones/tablets: lighter render + wider FOV
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!MOBILE, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.3 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const PAL = { fog:'#0a0604', accent:'#ff7a26', hot:'#ffb24a', deep:'#c2300a', amb:'#2a1d12', rim:'#88a6ff' };
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PAL.fog, 0.012);
  // PMREM environment — the single biggest "premium metal" lever: every standard
  // material picks up soft studio reflections instead of flat shading
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 700);
  camera.position.set(1.8, 1.6, -96);

  scene.add(new THREE.AmbientLight(PAL.amb, 0.65));
  const key   = new THREE.PointLight(PAL.accent, 2.6, 150, 2.0); key.position.set(0,3,-120); scene.add(key);
  const rim   = new THREE.DirectionalLight(PAL.rim, 0.42); rim.position.set(-6,8,4); scene.add(rim);
  const flare = new THREE.PointLight(PAL.hot, 0, 80, 2.2); flare.position.set(0,2,-208); scene.add(flare); // 2021 ignition

  // ---------- drifting embers (whole world) ----------
  const EMBER_N = MOBILE ? 280 : 640;
  const eg = new THREE.BufferGeometry();
  const pos = new Float32Array(EMBER_N*3), vel = new Float32Array(EMBER_N), sz = new Float32Array(EMBER_N), seed = new Float32Array(EMBER_N);
  for(let i=0;i<EMBER_N;i++){
    pos[i*3]=(Math.random()-.5)*70; pos[i*3+1]=(Math.random()-.5)*50; pos[i*3+2]=-96-Math.random()*270;
    vel[i]=0.3+Math.random()*1.2; sz[i]=0.6+Math.random()*2.0; seed[i]=Math.random()*6.28;
  }
  eg.setAttribute('position', new THREE.BufferAttribute(pos,3));
  eg.setAttribute('aVel', new THREE.BufferAttribute(vel,1));
  eg.setAttribute('aSize', new THREE.BufferAttribute(sz,1));
  eg.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
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
  const embers = new THREE.Points(eg, emMat); embers.frustumCulled = false; scene.add(embers);

  // ---------- premium monolith geometry: rounded-edge slab (extruded rounded rect) ----------
  function roundedSlabGeo(w, d, h, r){
    const s = new THREE.Shape();
    const x = -w/2, y = -d/2;
    s.moveTo(x+r, y);
    s.lineTo(x+w-r, y); s.quadraticCurveTo(x+w, y, x+w, y+r);
    s.lineTo(x+w, y+d-r); s.quadraticCurveTo(x+w, y+d, x+w-r, y+d);
    s.lineTo(x+r, y+d); s.quadraticCurveTo(x, y+d, x, y+d-r);
    s.lineTo(x, y+r); s.quadraticCurveTo(x, y, x+r, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth:h, bevelEnabled:true, bevelThickness:0.045, bevelSize:0.045, bevelSegments:2, curveSegments:6 });
    geo.rotateX(-Math.PI/2);      // extrude along Y (up)
    geo.translate(0, 0, 0);
    return geo;
  }

  // ---------- Cormorant-engraved year plates (regenerated once real fonts load) ----------
  function yearTex(yr){
    const c=document.createElement('canvas'); c.width=512; c.height=256; const x=c.getContext('2d');
    x.fillStyle='#050302'; x.fillRect(0,0,512,256);
    x.font='600 168px "Cormorant", Georgia, serif'; x.textAlign='center'; x.textBaseline='middle';
    x.fillStyle='#e9b96f'; x.shadowColor='#ffae5a'; x.shadowBlur=26; x.fillText(yr,256,124);
    x.shadowBlur=0; x.fillStyle='rgba(233,185,111,.55)'; x.fillRect(156,212,200,2);   // engraved underline
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;
  }

  // ---------- corridor of year-pillars (z -100 … -252) ----------
  const MILESTONES = [
    {yr:'1987',z:-100},{yr:'1992',z:-116},{yr:'1995',z:-132},{yr:'1997',z:-148},{yr:'2002',z:-164},
    {yr:'2005',z:-180},{yr:'2021',z:-200},{yr:'2022',z:-216},{yr:'2026',z:-236},{yr:'2027',z:-252}
  ];
  const ironMat = new THREE.MeshStandardMaterial({ color:'#171310', metalness:.88, roughness:.30,
    emissive:PAL.deep, emissiveIntensity:.16, envMapIntensity:1.15 });
  const seamMat = new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.85,
    blending:THREE.AdditiveBlending, depthWrite:false });
  const slabGeo = roundedSlabGeo(0.56, 2.6, 9, 0.14);
  const monoliths = MILESTONES.map((ms,i)=>{
    const side = i%2===0 ? -6.4 : 6.4;
    const grp = new THREE.Group(); grp.position.set(side,0,ms.z);
    const slab = new THREE.Mesh(slabGeo, ironMat); slab.position.y = -3; grp.add(slab);
    // molten seam — a thin glowing strip up the inner edge (the pillar reads "cast, still cooling")
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 8.6), seamMat);
    seam.position.set(side<0? 0.31 : -0.31, 1.3, 1.18); seam.rotation.y = side<0? Math.PI/2 : -Math.PI/2;
    grp.add(seam);
    // engraved year plate facing the corridor centre
    const plateMat = new THREE.MeshBasicMaterial({ map:yearTex(ms.yr), transparent:true });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7), plateMat);
    plate.position.set(side<0?0.5:-0.5, 2.6, 0); plate.rotation.y = side<0?Math.PI/2:-Math.PI/2; grp.add(plate);
    // molten pool under the pillar
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.2,40),
      new THREE.MeshBasicMaterial({ color:PAL.accent, transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false }));
    glow.rotation.x=-Math.PI/2; glow.position.y=-2.95; grp.add(glow);
    // jewel marker — delicate ring + hot core (replaces the dev-arty octahedron)
    const marker = new THREE.Group(); marker.position.y = 6.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.30,0.022,10,48), ironMat);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.09,12,12), new THREE.MeshBasicMaterial({ color:PAL.hot }));
    marker.add(ring); marker.add(core); marker.userData.spin = 0.3+i*0.05; grp.add(marker);
    grp.userData={ plateMat, glow, marker, yr:ms.yr };
    scene.add(grp); return grp;
  });
  // regenerate the plates once Cormorant is actually loaded (avoid baked fallback font)
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=> monoliths.forEach(m=>{
      m.userData.plateMat.map = yearTex(m.userData.yr); m.userData.plateMat.needsUpdate = true; }));
  }

  // ---------- flowing molten path (animated shader) + floor ----------
  const pathMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:{value:0}, uCol:{value:new THREE.Color(PAL.accent)}, uHot:{value:new THREE.Color(PAL.hot)} },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform float uTime; uniform vec3 uCol; uniform vec3 uHot; varying vec2 vUv;
      void main(){
        float flow = 0.5 + 0.5*sin(vUv.y*90.0 - uTime*2.2);          // molten pulse travelling down the line
        float edge = smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x);
        vec3 col = mix(uCol, uHot, flow*0.7);
        gl_FragColor = vec4(col, (0.35 + 0.45*flow) * edge);
      }`
  });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 300), pathMat);
  path.rotation.x=-Math.PI/2; path.position.set(0,-2.97,-230); scene.add(path);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 520),
    new THREE.MeshStandardMaterial({ color:'#0b0805', metalness:.72, roughness:.38, envMapIntensity:.5 }));
  floor.rotation.x=-Math.PI/2; floor.position.set(0,-3,-230); scene.add(floor);

  // (people-field capsule figures removed — the user read them as "glowing candles".
  //  The passage after the corridor is clean ember-lit fog; the seals are the next beat.)

  // ---------- STANDARDS SEALS — five forged rings (z ≈ -322) ----------
  const seals = new THREE.Group(); seals.position.set(0,1,-322);
  for(let i=0;i<5;i++){
    const a=((i-2)/5)*Math.PI*0.9, s=new THREE.Group();
    s.add(new THREE.Mesh(new THREE.TorusGeometry(0.82,0.10,14,56), ironMat));
    s.add(new THREE.Mesh(new THREE.TorusGeometry(0.52,0.03,10,48), ironMat));
    const core=new THREE.Mesh(new THREE.SphereGeometry(0.16,14,14), new THREE.MeshBasicMaterial({ color:PAL.accent }));
    s.add(core);
    s.position.set(Math.sin(a)*7.5, Math.cos(a*2)*1.4, -Math.abs(Math.sin(a))*3);
    s.userData.spin=0.3+i*0.12; seals.add(s);
  }
  scene.add(seals);

  // ---------- camera path: corridor (0..3, pinned journey) + tail (3..6, in-flow sections) ----------
  // NO finale object — the user rejected globe/constellation forms. The flythrough ends at
  // the seals; the canvas fades out and the finale rests on the quiet molten stage.
  const KF = [
    { p:[1.8,1.6,-106], l:[-3,2.4,-128] },   // 0 Era I
    { p:[-1.8,1.6,-154],l:[3,2.4,-176]  },   // 1 Era II
    { p:[1.8,1.6,-202], l:[-3,2.6,-214] },   // 2 Era III (ignition)
    { p:[-1.4,2.2,-238],l:[3,2.6,-250]  },   // 3 Era IV — corridor exit
    { p:[0,1.7,-262],   l:[0,0.4,-298]  },   // 4 calm passage — empty fog, embers only (Purpose breathes here)
    { p:[0,2.1,-286],   l:[0,0.8,-318]  },   // 5 deeper drift — still clean fog (Our People)
    { p:[2.4,1.6,-310], l:[0,1,-322]    }    // 6 standards seals (Certifications)
  ];
  const NS=KF.length-1, _p=new THREE.Vector3(), _l=new THREE.Vector3();
  const smooth=t=>t*t*(3-2*t);
  const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);

  // tail progress: journey's end → the CERTS section's end (the flythrough's last beat).
  // The finale after it gets NO GL — it rests on the quiet molten stage.
  let tailStart=0, tailEnd=1, fadeIn0=0, fadeOut0=1e9;
  const certsEl = document.querySelector('.certs') ? document.querySelector('.certs').closest('.sec') : null;
  function measure(){
    const jTop = journey.offsetTop;
    tailStart = jTop + journey.offsetHeight - innerHeight;         // journey unpins here
    tailEnd   = certsEl ? (certsEl.offsetTop + certsEl.offsetHeight - innerHeight) : tailStart+1;
    fadeIn0   = jTop - innerHeight*0.5;                            // canvas fades in approaching the journey
    fadeOut0  = tailEnd + innerHeight*0.3;                         // and out before the finale arrives
  }
  measure(); addEventListener('resize', measure); addEventListener('load', measure);
  setTimeout(measure, 800);

  let sy=scrollY, target=scrollY;
  addEventListener('scroll', ()=>{ target=scrollY; }, { passive:true });

  function applyCamera(u, et){
    const f=clamp(u,0,NS), i=Math.min(NS-1,Math.floor(f)), t=smooth(f-i), a=KF[i], b=KF[i+1];
    _p.set(a.p[0]+(b.p[0]-a.p[0])*t, a.p[1]+(b.p[1]-a.p[1])*t, a.p[2]+(b.p[2]-a.p[2])*t);
    _l.set(a.l[0]+(b.l[0]-a.l[0])*t, a.l[1]+(b.l[1]-a.l[1])*t, a.l[2]+(b.l[2]-a.l[2])*t);
    _p.x += Math.sin(et*0.3)*0.22; _p.y += Math.cos(et*0.24)*0.16;   // hand-held drift
    camera.position.lerp(_p, 0.08); camera.lookAt(_l);
    key.position.set(camera.position.x, camera.position.y+2.5, camera.position.z-12);
    flare.intensity = 7*Math.max(0, 1-Math.abs(f-2)/1.1);
    monoliths.forEach(m=>{ const d=Math.abs(m.position.z-camera.position.z), near=clamp(1-d/46,0.12,1);
      m.userData.plateMat.opacity=near; m.userData.glow.material.opacity=0.05+near*0.22; });
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.92, 0.75, 0.16);
  composer.addPass(bloom);

  const clock=new THREE.Clock();
  // Size the render buffer to the CANVAS BOX (not innerWidth/innerHeight) so iOS's dynamic
  // URL-bar viewport can't stretch it; widen the FOV on portrait so the side pillars still frame.
  function sizeAll(){
    const r=canvas.getBoundingClientRect();
    const w=Math.round(r.width)||innerWidth, h=Math.round(r.height)||innerHeight, a=w/h;
    camera.fov = a<0.7 ? 82 : a<1 ? 66 : 52; camera.aspect=a; camera.updateProjectionMatrix();
    renderer.setSize(w,h,false); composer.setSize(w,h);
  }
  sizeAll();
  addEventListener('resize', sizeAll);
  addEventListener('orientationchange', sizeAll);
  if('ResizeObserver' in window){ new ResizeObserver(sizeAll).observe(canvas); }

  function tick(){
    requestAnimationFrame(tick);
    sy += (target-sy)*0.11;
    // canvas opacity: off before the journey, on through the finale
    const op = clamp((sy-fadeIn0)/420, 0, 1) * clamp((fadeOut0-sy)/420, 0, 1);
    canvas.style.opacity = op.toFixed(3);
    if(op <= 0.001) return;                                     // free when invisible
    const dt=Math.min(0.05, clock.getDelta()), et=clock.elapsedTime;
    emMat.uniforms.uTime.value=et; pathMat.uniforms.uTime.value=et;
    monoliths.forEach(m=>{ m.userData.marker.rotation.y += dt*m.userData.marker.userData.spin*1.6; });
    seals.children.forEach(s=>{ s.rotation.y += dt*s.userData.spin; s.rotation.x += dt*s.userData.spin*0.4; });

    // path param: journey phase from about-journey.js, tail phase from the DOM
    let u;
    if(sy < tailStart) u = (window.__journeyP||0)*3;
    else u = 3 + clamp((sy-tailStart)/(tailEnd-tailStart), 0, 1)*3;
    applyCamera(u, et);
    composer.render();
  }
  document.body.classList.add('journey-gl');
  tick();
}

// ============================================================
//  RAYSONS — "The Object" · WebGL finale  ·  "Your drawing, our fire."
//  The real Raysons casting (11CX065C01) in true 3D, as the film's closing chapter.
//  It opens literally on the copy: the part is first a glowing TECHNICAL DRAWING
//  (feature-edge wireframe), then it CASTS — molten-hot iron floods in, glows, and
//  cools to solid metal. The camera arcs around it on scroll and pushes toward the bore;
//  release the scroll and you can DRAG to inspect it. Real depth, real camera.
//  Appended AFTER the film (its own scroll zone) — cinema.js / #cscroll untouched; the
//  film holds its last frame behind. Degrades: no WebGL / reduced-motion → zone removed.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE  = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  const clamp = (v,a,b)=> v<a?a : v>b?b : v;
  const lerp  = (a,b,t)=> a + (b-a)*t;
  const easeIO = (t)=> t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  const smooth = (e0,e1,x)=>{ const t=clamp((x-e0)/(e1-e0),0,1); return t*t*(3-2*t); };

  // procedural sand-cast grain (the CAD mesh has no UVs, so we box-project them below and
  // drive bump + roughness from this tileable noise → real cast-iron surface, not plastic)
  function makeNoiseTex(size){
    const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d');
    const img=x.createImageData(size,size);
    for(let i=0;i<size*size;i++){ const v=170+Math.random()*80|0; img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v; img.data[i*4+3]=255; }
    x.putImageData(img,0,0);
    x.globalAlpha=0.22;                                   // low-freq mottle = the cast skin (kept fine —
    for(let i=0;i<90;i++){ x.fillStyle=Math.random()>0.5?'#fff':'#4a4a4a'; x.beginPath();  // big soft blobs read
      x.arc(Math.random()*size,Math.random()*size,size*(0.015+Math.random()*0.05),0,7); x.fill(); }  // as leopard print up close
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
  }
  function boxUV(geo, scale){                              // box/triplanar-ish UVs from object space
    const pos=geo.attributes.position, nor=geo.attributes.normal; if(!nor) geo.computeVertexNormals();
    const n=geo.attributes.normal, uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
      const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
      let u,v; if(ax>=ay&&ax>=az){u=pz;v=py;} else if(ay>=ax&&ay>=az){u=px;v=pz;} else {u=px;v=py;}
      uv[i*2]=u*scale; uv[i*2+1]=v*scale;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  }
  // a DARK FOUNDRY environment for reflections — not a neutral studio. Emissive strips act as
  // area lights: a big molten-warm key, a cool steel rim, a dim warm ceiling. This is what makes
  // the metal read like it belongs in the pour/valve footage instead of a clean product render.
  function makeEnv(){
    const s = new THREE.Scene(); s.background = new THREE.Color(0x040303);
    const strip=(w,h,color,x,y,z)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color})); m.position.set(x,y,z); m.lookAt(0,0,0); s.add(m); };
    strip(12,26, 0xff6a1a, -11, 6, 3);   // molten key (left, warm)
    strip(7,18,  0x35507e,  12, 5, -3);  // steel rim (right, cool)
    strip(16,14, 0x120f0b,   0, 14, 0);  // dim warm ceiling
    strip(22,12, 0x030202,   0, -7, 9);  // dark floor front
    return s;
  }

  const canvas  = document.getElementById('bracketGL');
  const spacer  = document.getElementById('bracketScroll');
  const cap     = document.getElementById('bracketCap');
  const hint    = document.getElementById('bracketHint');
  const tol     = document.getElementById('bracketTol');
  const next    = document.getElementById('bracketNext');
  const fx      = document.getElementById('bracketFx');
  const cscroll = document.getElementById('cscroll');
  const acts    = document.getElementById('acts');
  const hud     = document.getElementById('filmHud');
  const rail    = document.getElementById('filmRail');
  if(!canvas || !spacer || !cscroll) return;

  let hasGL=false; try{ hasGL = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2')||canvas.getContext('webgl'))); }catch(e){}
  if(!hasGL || REDUCED){ spacer.style.display='none'; return; }

  // ---- caption copy per phase (drawing → casting) ----
  const capEl = { k: cap && cap.querySelector('.k'), h: cap && cap.querySelector('h2'), p: cap && cap.querySelector('p') };
  const COPY = {
    drawing: { k:'The Drawing · 11CX065C01', h:'Your <em>drawing.</em>', p:'Your part, in our language' },
    object:  { k:'The Object · 11CX065C01',  h:'Our <em>fire.</em>',     p:'Rear bracket · shell moulded · machined to drawing' },
    section: { k:'Section · 11CX065C01',      h:'Every <em>wall.</em>',   p:'Sectioned to the drawing · wall thickness held' }
  };
  let capPhase = '';
  function setCopy(phase){ if(phase===capPhase || !capEl.h) return; capPhase=phase; const c=COPY[phase];
    if(capEl.k) capEl.k.textContent=c.k; capEl.h.innerHTML=c.h; if(capEl.p) capEl.p.textContent=c.p; }

  // ============================================================
  //  RENDERER + SCENE
  // ============================================================
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!MOBILE, alpha:false, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE?1.6:2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = !MOBILE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;                    // section-cut interaction (see below)

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080605);
  scene.fog = new THREE.FogExp2(0x0a0807, 0.032);          // subtle depth haze — the footage has atmosphere
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeEnv(), 0.5).texture;

  const camera = new THREE.PerspectiveCamera(34, innerWidth/innerHeight, 0.1, 100);
  const target = new THREE.Vector3(0,0,0);

  scene.add(new THREE.HemisphereLight(0x9fb6d6, 0x2a1a10, 0.65));
  const key = new THREE.DirectionalLight(0xffa04a, 4.4); key.position.set(-4,5,3); key.castShadow=!MOBILE;
  if(!MOBILE){ key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.0004;
    key.shadow.camera.near=1; key.shadow.camera.far=20;
    key.shadow.camera.left=-4; key.shadow.camera.right=4; key.shadow.camera.top=4; key.shadow.camera.bottom=-4; }
  scene.add(key);
  const rim  = new THREE.DirectionalLight(0xaaccff, 2.6); rim.position.set(5,3.5,-4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff7a2a, 1.3); rim2.position.set(-2,1,-5); scene.add(rim2);  // warm back kicker
  const fill = new THREE.DirectionalLight(0xffe0c0, 0.5); fill.position.set(2,-1,4); scene.add(fill);
  // the heat of the pour, cast onto the world: a point light inside the part that burns
  // while the metal floods, so the floor and reflection catch the glow (added at init at
  // zero intensity — adding a light mid-scroll would force a shader recompile hitch)
  const heatLight = new THREE.PointLight(0xff5a14, 0, 9, 2); scene.add(heatLight);
  // section-cut: a champagne light that warms the freshly-exposed interior when the part is
  // sectioned (added at init at 0 intensity, same no-recompile reason)
  const cutLight = new THREE.PointLight(0xe6c483, 0, 6, 2); scene.add(cutLight);

  // ---- atmosphere: embers during the cast, dust motes in the light the rest of the time ----
  function makeSprite(soft){
    const c=document.createElement('canvas'); c.width=c.height=32; const x=c.getContext('2d');
    const g=x.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(soft?0.25:0.5,'rgba(255,255,255,.5)'); g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g; x.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(c);
  }
  function makeParticles(n, size, color, opacity){
    const pos=new Float32Array(n*3), seed=new Float32Array(n);
    for(let i=0;i<n;i++){ pos[i*3]=(Math.random()-0.5)*4.5; pos[i*3+1]=Math.random()*3.4-0.9; pos[i*3+2]=(Math.random()-0.5)*4.5; seed[i]=Math.random()*100; }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const m=new THREE.PointsMaterial({ size, color, map:makeSprite(true), transparent:true, opacity,
      blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
    const p=new THREE.Points(g,m); p.visible=false; p.userData.seed=seed; scene.add(p);
    return p;
  }
  const embers = makeParticles(MOBILE?50:120, 0.05, 0xffa040, 1);   // sparks of the pour
  const dust   = makeParticles(MOBILE?30:80,  0.03, 0xc9b89a, 0.10); // motes hanging in the key light
  function driftParticles(p, t, rise, wander){
    const a=p.geometry.attributes.position, s=p.userData.seed, n=a.count;
    for(let i=0;i<n;i++){
      let y=a.getY(i) + rise*(0.6+((s[i]*7)%1));
      if(y>2.6) y=-0.9;
      a.setY(i,y);
      a.setX(i, a.getX(i) + Math.sin(t*0.7+s[i])*wander);
      a.setZ(i, a.getZ(i) + Math.cos(t*0.5+s[i]*1.3)*wander);
    }
    a.needsUpdate=true;
  }

  // SECTION CUT: a camera-tracking plane that slices the near half away to reveal wall
  // thickness. Starts with a huge constant so it clips nothing until the section phase; set
  // on the material at creation so the shader compiles WITH the clipping chunks.
  const clipPlane = new THREE.Plane(new THREE.Vector3(0,0,1), 100);
  const _v = new THREE.Vector3(), _p = new THREE.Vector3();

  // machined cast-iron: physical metal with sand-cast surface grain + a faint machined sheen
  const grain = makeNoiseTex(256);
  const iron = new THREE.MeshPhysicalMaterial({
    color:0x3a342c, metalness:0.95, roughness:0.5,          // dark warm iron
    clearcoat:0.28, clearcoatRoughness:0.42, envMapIntensity:1.35,
    bumpMap:grain, bumpScale:0.32, roughnessMap:grain,
    transparent:true, opacity:1.0,
    clippingPlanes:[clipPlane], clipShadows:true            // section cut; DoubleSide toggled only while cutting
  });
  // THE POUR, made literal: instead of the whole part fading in uniformly (an opacity
  // slider), molten iron FLOODS the mould bottom-up — a per-fragment fill level with a
  // white-hot front line where the metal is rising, and a blackbody ramp so it cools
  // white → orange → dull red → iron. Injected into the physical material so the glow
  // still receives the same lighting, fog and bloom as everything else.
  const uni = {
    uFill : { value: 0 },   // 0..1 — how high the metal has risen (world-Y, normalised)
    uHeat : { value: 0 },   // 0..1 — how hot the flooded metal still is
    uGhost: { value: 0 },   // faint volume fill while it's still the drawing
    uSolid: { value: 0 },   // master solidity (drives per-fragment alpha with uFill)
    uMinY : { value: -1 },
    uMaxY : { value:  1 }
  };
  iron.onBeforeCompile = (sh)=>{
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <project_vertex>', 'vWY = (modelMatrix * vec4(transformed,1.0)).y;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vWY;
        uniform float uFill, uHeat, uGhost, uSolid, uMinY, uMaxY;
        vec3 blackbody(float t){
          return mix(vec3(0.55,0.05,0.01),
                     mix(vec3(1.0,0.42,0.08), vec3(1.0,0.88,0.62), smoothstep(0.55,1.0,t)),
                     smoothstep(0.0,0.5,t)); }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float hN = clamp((vWY - uMinY) / max(0.0001, uMaxY - uMinY), 0.0, 1.0);
        float below = 1.0 - smoothstep(uFill - 0.04, uFill + 0.04, hN);   // metal exists up to the fill line
        float front = exp(-abs(hN - uFill) * 16.0);                       // the rising pour-front
        vec4 diffuseColor = vec4( diffuse, max(uGhost, uSolid * below) );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float trail = below * exp(-max(0.0, uFill - hN) * 6.0);   // glow TRAILS the front — lower metal has cooled longer
        float glow = min(1.2, uHeat * (trail * 0.4 + front * 1.5));
        totalEmissiveRadiance += blackbody(uHeat) * glow * 1.6;`);
  };
  const wireMat = new THREE.LineBasicMaterial({ color:0xff8a3a, transparent:true, opacity:0.0, depthTest:true });      // bright feature outline
  const meshWireMat = new THREE.LineBasicMaterial({ color:0xcf8a48, transparent:true, opacity:0.0, depthWrite:false }); // full mesh wireframe (the "complete" drawing)

  const root = new THREE.Group(); scene.add(root);
  const wires = []; let floor=null, shadowPlane=null, modelReady=false;

  const draco = new DRACOLoader(); draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  loader.load('models/bracket.glb', (gltf)=>{
    const obj = gltf.scene;
    obj.traverse(c=>{ if(c.isMesh){
      boxUV(c.geometry, 0.09);                           // box-projected UVs for the cast grain
      c.material=iron; c.castShadow=!MOBILE; c.receiveShadow=!MOBILE;
      // the "drawing": bright feature outline (22° so more lines read) + the full mesh
      // wireframe behind it (desktop) → a complete technical drawing, not a few floating lines
      const ls = new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry, 22), wireMat);
      c.add(ls); wires.push(ls);
      if(!MOBILE){ const mw = new THREE.LineSegments(new THREE.WireframeGeometry(c.geometry), meshWireMat); c.add(mw); }
    }});
    obj.rotation.x = -Math.PI/2;                       // FreeCAD Z-up → Y-up
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    obj.scale.setScalar(2.4 / Math.max(size.x,size.y,size.z));
    obj.position.sub(center.multiplyScalar(2.4 / Math.max(size.x,size.y,size.z)));
    root.add(obj);
    const b2 = new THREE.Box3().setFromObject(obj);
    target.set(0,(b2.min.y+b2.max.y)/2,0);
    uni.uMinY.value = b2.min.y - 0.02;                 // the pour-front shader's world-Y bounds
    uni.uMaxY.value = b2.max.y + 0.02;
    heatLight.position.set(0, (b2.min.y+b2.max.y)/2, 0);
    if(!MOBILE){
      // wet reflective floor — matches the pour/valve footage (part mirrored on a dark, damp
      // studio floor). Dark-tinted so the reflection reads subtle, and the molten cast glows in it.
      const mirror = new Reflector(new THREE.PlaneGeometry(120,120), { textureWidth:1024, textureHeight:1024, color:0x050406 });
      mirror.rotation.x=-Math.PI/2; mirror.position.y=b2.min.y-0.002; scene.add(mirror); floor=mirror;
      // a soft contact shadow on top of the reflection grounds the part
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.ShadowMaterial({opacity:0.5}));
      sh.rotation.x=-Math.PI/2; sh.position.y=b2.min.y+0.001; sh.receiveShadow=true; scene.add(sh); shadowPlane=sh;
    }
    modelReady = true;
  });

  // ---- post: subtle bloom for the molten heat-flash + bright metal specular ----
  let composer=null, bloom=null;
  if(!MOBILE){
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.55, 0.5, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ============================================================
  //  SCROLL ZONE + CAMERA RIG
  // ============================================================
  let dragAz=0, dragEl=0, velAz=0, velEl=0, dragging=false, px=0, py=0, curZp=-1, active=false;
  function filmMax(){ return Math.max(1, cscroll.offsetHeight - innerHeight); }
  function zoneProg(){
    const fm = filmMax();
    const docMax = Math.max(fm+1, document.documentElement.scrollHeight - innerHeight);
    return clamp((scrollY - fm) / Math.max(1, docMax - fm), 0, 1);
  }
  function poseFor(zp){
    const e = easeIO(zp);
    const az = lerp(-0.5, 1.9, e) + dragAz;
    const el = lerp(0.34, 0.20, smooth(0,0.6,zp)) + lerp(0, 0.12, smooth(0.6,1,zp)) + dragEl;
    const rad = lerp(3.6, 2.75, smooth(0.30,0.62,zp)) + lerp(0, 0.7, smooth(0.62,1,zp));
    return { az, el:clamp(el,-0.3,1.2), rad:clamp(rad,2.4,6) };
  }
  function applyCamera(zp, t){
    const p = poseFor(zp);
    // operator's breathing — micro handheld drift so the move feels shot, not computed
    const az = p.az + Math.sin(t*0.13)*0.010 + Math.sin(t*0.047)*0.006;
    const el = p.el + Math.sin(t*0.09+1.7)*0.006;
    camera.position.set(target.x+p.rad*Math.cos(el)*Math.sin(az), target.y+p.rad*Math.sin(el), target.z+p.rad*Math.cos(el)*Math.cos(az));
    camera.lookAt(target.x, target.y + Math.sin(t*0.11+0.6)*0.008, target.z);
  }

  // grab-and-hold: pointer delta rotates the part 1:1; release holds the pose with a touch
  // of inertia that settles. No auto-rotate, no snap-back — you spin it, it stays where you left it.
  canvas.addEventListener('pointerdown', (e)=>{ if(!active) return; dragging=true; px=e.clientX; py=e.clientY; velAz=0; velEl=0; try{canvas.setPointerCapture(e.pointerId);}catch(_){}}, {passive:true});
  addEventListener('pointermove', (e)=>{ if(!dragging) return; const dx=(e.clientX-px)*0.006, dy=(e.clientY-py)*0.005; dragAz+=dx; dragEl=clamp(dragEl+dy,-0.6,0.9); velAz=dx; velEl=dy; px=e.clientX; py=e.clientY; }, {passive:true});
  addEventListener('pointerup', ()=>{ dragging=false; }, {passive:true});

  // ============================================================
  //  REVEAL — drawing → cast → cool
  //  zp 0.00–0.22  the DRAWING (wireframe glows in)
  //  zp 0.22–0.44  the CAST (molten iron floods in, emissive heat peaks, wire fades)
  //  zp 0.44–1.00  the OBJECT (solid iron, orbit + drag to inspect)
  // ============================================================
  function reveal(zp){
    const wire  = smooth(0.02,0.10,zp) * (1 - smooth(0.26,0.44,zp));     // in, then out
    const solid = smooth(0.26,0.46,zp);                                  // iron floods in
    const heat  = smooth(0.24,0.34,zp) * (1 - smooth(0.38,0.58,zp));     // molten flash, then cools
    wireMat.opacity = wire;
    meshWireMat.opacity = wire * 0.16;                                   // faint full mesh behind the outline
    uni.uGhost.value = wire * 0.14;                                      // faint volume fill → the drawing has volume
    uni.uSolid.value = solid;                                            // per-fragment: metal exists up to the fill line
    uni.uFill.value  = smooth(0.24,0.42,zp) * 1.18;                      // the pour rises bottom-up and crests PAST the top
                                                                         // fast — the flat top face all sits at one height, so
                                                                         // a lingering front would light the whole face at once
    uni.uHeat.value  = heat;                                             // blackbody ramp: white-hot → orange → dull red
    iron.roughness = lerp(0.42, 0.55, smooth(0.36,0.7,zp));              // shiny-hot → matte cast-cool
    if(bloom) bloom.strength = 0.55 + heat * 0.35;                       // the flash blooms; the cooled iron doesn't
    if(floor) floor.visible = solid > 0.02;                              // reflection only once it's cast — a drawing has none
    if(shadowPlane) shadowPlane.material.opacity = 0.42 * solid;         // shadow fades in with the solid
    // atmosphere: sparks ride the heat; dust hangs in the light once the object is real
    embers.visible = heat > 0.015; embers.material.opacity = Math.min(1, heat*1.6);
    dust.visible = zp > 0.30; dust.material.opacity = 0.10 * smooth(0.30,0.5,zp);
    return heat;
  }

  // SECTION CUT — sweep a camera-facing plane through the solid part (near the end of the
  // object zone) to reveal wall thickness, then retract before the "group story" CTA. The
  // freshly-cut interior catches a champagne light. Plane tracks the camera so the section
  // always opens toward the viewer, even as the orbit turns.
  function section(zp){
    const sec = smooth(0.56,0.70,zp) * (1 - smooth(0.80,0.88,zp));   // in → hold → out
    if(sec > 0.002){
      iron.side = THREE.DoubleSide;                                  // see the inner walls (cheap: side is render-state, no recompile)
      const camToTarget = _v.subVectors(target, camera.position).normalize();
      const point = _p.copy(target).addScaledVector(camToTarget, 1.3*(sec-1));   // front face → centre as sec 0→1
      clipPlane.setFromNormalAndCoplanarPoint(camToTarget, point);
      cutLight.position.copy(point).addScaledVector(camToTarget, -0.35);          // just behind the cut face
      cutLight.intensity = sec * 3.2;
    } else if(cutLight.intensity !== 0 || iron.side !== THREE.FrontSide){
      iron.side = THREE.FrontSide; clipPlane.constant = 100; cutLight.intensity = 0;   // no clip
    }
    return sec;
  }

  function setChrome(zp){
    const vis = smooth(0.0,0.05,zp);                                    // clear the film fast → clean drawing on black
    canvas.style.opacity = vis.toFixed(3);
    if(fx) fx.style.opacity = vis.toFixed(3);                          // grade the 3D like the film
    canvas.style.pointerEvents = zp>0.46 ? 'auto' : 'none';             // drag only once it's the solid object
    if(acts) acts.style.opacity = zp>0.001 ? (1-vis).toFixed(3) : '';
    if(cap)  cap.style.opacity  = smooth(0.05,0.13,zp).toFixed(3);
    if(hint) hint.style.opacity = (smooth(0.48,0.58,zp) * (1-smooth(0.86,0.97,zp))).toFixed(3);
    if(next){ const nv = smooth(0.87,0.96,zp); next.style.opacity=nv.toFixed(3); next.style.pointerEvents = nv>0.5?'auto':'none'; }
    if(hud)  hud.style.opacity  = zp>0.05 ? '0' : '';
    if(rail) rail.style.opacity = zp>0.05 ? '0' : '';
    document.body.classList.toggle('bracket-on', zp>0.04);
  }

  function onResize(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight); if(composer) composer.setSize(innerWidth,innerHeight); }
  addEventListener('resize', onResize);

  renderer.setAnimationLoop((tm)=>{
    const zp = zoneProg(), t = tm * 0.001;
    active = zp > 0.02;
    if(zp !== curZp){ setChrome(zp); curZp = zp; }
    if(!active) return;

    if(!dragging){ dragAz += velAz; dragEl = clamp(dragEl+velEl,-0.6,0.9); velAz*=0.90; velEl*=0.90; }  // release inertia settles; pose HELD

    applyCamera(zp, t);   // pose the camera BEFORE the section plane reads it

    if(modelReady){
      const heat = reveal(zp);
      root.scale.setScalar(lerp(0.92, 1.0, smooth(0,0.12,zp)));
      if(embers.visible) driftParticles(embers, t, 0.012 + heat*0.010, 0.0011);  // sparks climb with the heat
      if(dust.visible)   driftParticles(dust,   t, 0.0009,             0.0004); // motes barely move
      heatLight.intensity = heat * (7 + Math.sin(t*9)*1.2 + Math.sin(t*23)*0.6); // the fire flickers

      const sec = section(zp);
      // caption: drawing → object, overridden by the section beat while it's open
      setCopy(sec > 0.45 ? 'section' : (zp < 0.32 ? 'drawing' : 'object'));

      // TOLERANCE OVERLAY — grab the casting and the drawing returns to inspect it: a
      // champagne readout of the tolerance, and the metal catches more champagne light.
      const inspecting = dragging && zp > 0.5 && sec < 0.3;   // not while it's sectioned
      if(tol) tol.classList.toggle('on', inspecting);
      iron.envMapIntensity = lerp(iron.envMapIntensity, inspecting ? 2.15 : 1.35, 0.12);
    }
    if(composer) composer.render(); else renderer.render(scene, camera);
  });
})();

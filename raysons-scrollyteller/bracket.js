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
    x.globalAlpha=0.35;                                   // low-freq mottle = the cast skin
    for(let i=0;i<60;i++){ x.fillStyle=Math.random()>0.5?'#fff':'#4a4a4a'; x.beginPath();
      x.arc(Math.random()*size,Math.random()*size,size*(0.03+Math.random()*0.10),0,7); x.fill(); }
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

  const canvas  = document.getElementById('bracketGL');
  const spacer  = document.getElementById('bracketScroll');
  const cap     = document.getElementById('bracketCap');
  const hint    = document.getElementById('bracketHint');
  const next    = document.getElementById('bracketNext');
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
    object:  { k:'The Object · 11CX065C01',  h:'Our <em>fire.</em>',     p:'Rear bracket · shell moulded · machined to drawing' }
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0807);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

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

  // machined cast-iron: physical metal with sand-cast surface grain + a faint machined sheen
  const grain = makeNoiseTex(256);
  const iron = new THREE.MeshPhysicalMaterial({
    color:0x44443e, metalness:0.94, roughness:0.55,
    clearcoat:0.2, clearcoatRoughness:0.5, envMapIntensity:1.55,
    bumpMap:grain, bumpScale:0.35, roughnessMap:grain,
    emissive:0xff4d12, emissiveIntensity:0.0, transparent:true, opacity:0.0
  });
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
    if(!MOBILE){
      // wet reflective floor — matches the pour/valve footage (part mirrored on a dark, damp
      // studio floor). Dark-tinted so the reflection reads subtle, and the molten cast glows in it.
      const mirror = new Reflector(new THREE.PlaneGeometry(80,80), { textureWidth:1024, textureHeight:1024, color:0x0e0d11 });
      mirror.rotation.x=-Math.PI/2; mirror.position.y=b2.min.y-0.002; scene.add(mirror); floor=mirror;
      // a soft contact shadow on top of the reflection grounds the part
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.ShadowMaterial({opacity:0.4}));
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
  function applyCamera(zp){
    const p = poseFor(zp), ce=Math.cos(p.el), se=Math.sin(p.el);
    camera.position.set(target.x+p.rad*ce*Math.sin(p.az), target.y+p.rad*se, target.z+p.rad*ce*Math.cos(p.az));
    camera.lookAt(target);
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
    const heat  = smooth(0.24,0.36,zp) * (1 - smooth(0.36,0.58,zp));     // molten flash, then cools
    wireMat.opacity = wire;
    meshWireMat.opacity = wire * 0.16;                                   // faint full mesh behind the outline
    iron.opacity = Math.max(solid, wire*0.14);                           // faint ghost fill → the drawing has volume
    iron.emissiveIntensity = heat * 2.0;                                 // glowing hot → bloom picks it up
    iron.roughness = lerp(0.42, 0.55, smooth(0.36,0.7,zp));              // shiny-hot → matte cast-cool
    if(floor) floor.visible = solid > 0.02;                              // reflection only once it's cast — a drawing has none
    if(shadowPlane) shadowPlane.material.opacity = 0.42 * solid;         // shadow fades in with the solid
    setCopy(zp < 0.32 ? 'drawing' : 'object');
  }

  function setChrome(zp){
    const vis = smooth(0.0,0.05,zp);                                    // clear the film fast → clean drawing on black
    canvas.style.opacity = vis.toFixed(3);
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

  renderer.setAnimationLoop(()=>{
    const zp = zoneProg();
    active = zp > 0.02;
    if(zp !== curZp){ setChrome(zp); curZp = zp; }
    if(!active) return;

    if(!dragging){ dragAz += velAz; dragEl = clamp(dragEl+velEl,-0.6,0.9); velAz*=0.90; velEl*=0.90; }  // release inertia settles; pose HELD

    if(modelReady){
      reveal(zp);
      root.scale.setScalar(lerp(0.92, 1.0, smooth(0,0.12,zp)));
    }
    applyCamera(zp);
    if(composer) composer.render(); else renderer.render(scene, camera);
  });
})();

/**
 * foundryStory.js — Cinematic foundry pour (V1-hero composition) using the real
 * ladle.glb + mould.glb. Flanged-hub-grade rendering: HDRI reflections,
 * MeshPhysicalMaterial clearcoat, cinematic 3-point + ember lighting, HDR bloom.
 *
 * Composition locked to the V1 hero: mould centred on a stand, ladle upper-right
 * tilted, pouring a molten-iron stream down into the sprue. Scroll scrubs the pour.
 *
 * TUNE block holds all positions for quick screenshot iteration.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas  = document.getElementById('story-canvas');
const section = document.getElementById('story');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);

/* ── TUNE — V1-hero layout (mould centred on stand, ladle upper-right) ── */
const MOULD_SCALE = 1.8;
const LADLE_SCALE = 1.9;
const LADLE_YAW   = 2.3;     // base yaw so the heart-spout faces the mould
const LADLE_POS   = new THREE.Vector3(1.9, 3.0, 0.2);   // upper-right, clearly above+aside the mould
const SPRUE       = new THREE.Vector3(0.15, 1.15, 0.1); // pour target on the mould top
const LADLE_MOLTEN_LOCAL = new THREE.Vector3(0, 0.30, 0);
const LADLE_MOLTEN_R = 0.66;
const LADLE_SPOUT_LOCAL  = new THREE.Vector3(0, 0.46, 0.82);
const TILT_MAX = 1.25;

/* ── Renderer ───────────────────────────────────────────────── */
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.toneMapping=THREE.NoToneMapping;
renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x070609);
scene.fog=new THREE.FogExp2(0x070609,0.02);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
new RGBELoader().load('/hdri/studio_small_09_2k.hdr',(hdr)=>{
  hdr.mapping=THREE.EquirectangularReflectionMapping; scene.environment=hdr;
},undefined,()=>{});
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,0.1,100);

/* ── Post (HDR bloom) ───────────────────────────────────────── */
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.5,0.45,0.75);
composer.addPass(bloom);
const gamma=new ShaderPass(GammaCorrectionShader);gamma.renderToScreen=true;composer.addPass(gamma);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

/* ── Cinematic lighting (flanged-hub style) + molten lights ─── */
scene.add(new THREE.AmbientLight(0x10141a,0.55));
const key=new THREE.DirectionalLight(0xd8d0c8,1.5);key.position.set(-4,7,4);
key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=1;key.shadow.camera.far=25;
key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;scene.add(key);
const fillL=new THREE.DirectionalLight(0x8899cc,0.5);fillL.position.set(5,1,3);scene.add(fillL);
scene.add(new THREE.HemisphereLight(0x9ab0cc,0x201a14,0.7));
const emberRim=new THREE.SpotLight(0xff6a1a,2.4,18,Math.PI/5,0.85,1.6);emberRim.position.set(3.5,3,-3.5);scene.add(emberRim);
const ladleLight=new THREE.PointLight(0xffb050,0,8,2);scene.add(ladleLight);
const mouldLight=new THREE.PointLight(0xff8024,0,9,2);mouldLight.position.copy(SPRUE);scene.add(mouldLight);

/* ── Ground + stand under the mould (V1 has the mould on a block) ── */
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),
  new THREE.MeshStandardMaterial({color:0x0a080b,roughness:1,metalness:0}));
ground.rotation.x=-Math.PI/2;ground.position.y=-0.01;ground.receiveShadow=true;scene.add(ground);
const stand=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.0,2.2),
  new THREE.MeshStandardMaterial({color:0x14110e,roughness:0.9,metalness:0.2,envMapIntensity:0.5}));
stand.position.set(0,0.5,0);stand.castShadow=true;stand.receiveShadow=true;scene.add(stand);

/* ── Molten shader (flowing white-hot) ──────────────────────── */
const moltenU={time:{value:0},heat:{value:1}};
const moltenMat=new THREE.ShaderMaterial({uniforms:moltenU,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float time;uniform float heat;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}
    void main(){vec2 p=vUv*5.;float n=fbm(p+vec2(time*0.25,time*0.15));
      float t=clamp(fbm(p*1.6-vec2(time*0.35,0.))*0.5+n*0.6,0.,1.);
      vec3 white=vec3(1.,0.96,0.8),yellow=vec3(1.,0.74,0.24),orange=vec3(1.,0.36,0.06),crust=vec3(0.32,0.08,0.02);
      vec3 c=mix(orange,yellow,smoothstep(0.35,0.6,t));c=mix(c,white,smoothstep(0.62,0.86,t));
      c=mix(crust,c,smoothstep(0.1,0.3,t));c*=(0.7+heat*0.8);gl_FragColor=vec4(c,1.);}`});
function moltenDisc(r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,48),moltenMat);m.rotation.x=-Math.PI/2;return m;}

/* ── Particles ──────────────────────────────────────────────── */
function dotTex(){const s=64,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.4,'rgba(255,210,130,0.9)');g.addColorStop(1,'rgba(255,120,40,0)');x.fillStyle=g;x.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(c);}
const DOT=dotTex();
function pts(n,size,color,blend=THREE.AdditiveBlending){const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
  const m=new THREE.PointsMaterial({size,map:DOT,color,transparent:true,blending:blend,depthWrite:false});
  const o=new THREE.Points(g,m);o.frustumCulled=false;scene.add(o);return{o,g,n,life:new Float32Array(n),vel:new Float32Array(n*3),head:0};}
const SPARK=pts(300,0.05,0xff7a30);
const STEAM=pts(90,0.6,0x9a9089,THREE.NormalBlending);STEAM.o.material.opacity=0.13;

/* ── Ladle molten + pour stream + mould molten ──────────────── */
const ladleMolten=moltenDisc(LADLE_MOLTEN_R); ladleMolten.position.copy(LADLE_MOLTEN_LOCAL);
const mouldMolten=moltenDisc(0.36); mouldMolten.position.copy(SPRUE); mouldMolten.visible=false; scene.add(mouldMolten);
const streamMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.085,1,16,1,true),moltenMat);streamMesh.visible=false;scene.add(streamMesh);
const _up=new THREE.Vector3(0,1,0),_dir=new THREE.Vector3(),_mid=new THREE.Vector3(),_q=new THREE.Quaternion();
const SPOUT_W=new THREE.Vector3();

/* ── Material upgrade → MeshPhysicalMaterial w/ clearcoat (hub-grade) ── */
function upgrade(root,opts){root.traverse(o=>{
  if(!o.isMesh||!o.material) return;
  o.castShadow=true; o.receiveShadow=true;
  const s=o.material;
  const phys=new THREE.MeshPhysicalMaterial({
    map:s.map||null, normalMap:s.normalMap||null, roughnessMap:s.roughnessMap||null, metalnessMap:s.metalnessMap||null,
    aoMap:s.aoMap||null, color:s.color?s.color.clone():new THREE.Color(0xffffff),
    roughness:opts.roughness!=null?opts.roughness:(s.roughness!=null?s.roughness:0.8),
    metalness:opts.metalness!=null?opts.metalness:(s.metalness!=null?s.metalness:0.4),
    envMapIntensity:opts.env!=null?opts.env:1.2,
    clearcoat:opts.clearcoat!=null?opts.clearcoat:0.0,
    clearcoatRoughness:0.35,
  });
  if(phys.map) phys.map.anisotropy=8;
  o.material=phys;
});}

/* ── Load models ────────────────────────────────────────────── */
let ladle=null, mould=null, ready=false;
const loader=new GLTFLoader();
function fit(root,scale){const box=new THREE.Box3().setFromObject(root);const c=box.getCenter(new THREE.Vector3());
  root.position.sub(c); root.scale.setScalar(scale);}
loader.load('/models/mould.glb',(g)=>{
  mould=g.scene; fit(mould,MOULD_SCALE);
  upgrade(mould,{roughness:0.95,metalness:0.05,env:0.7,clearcoat:0.0}); // sand: matte
  const box=new THREE.Box3().setFromObject(mould);
  mould.position.y+=(1.0-box.min.y); // sit on top of the stand (stand top at y=1.0)
  scene.add(mould); checkReady();
});
loader.load('/models/ladle.glb',(g)=>{
  const root=g.scene; fit(root,LADLE_SCALE);
  upgrade(root,{roughness:0.6,metalness:0.85,env:1.3,clearcoat:0.4}); // cast iron: metallic + clearcoat
  ladle=new THREE.Group();
  ladle.add(root);
  ladle.add(ladleMolten);
  const spoutAnchor=new THREE.Object3D(); spoutAnchor.position.copy(LADLE_SPOUT_LOCAL); ladle.add(spoutAnchor);
  ladle.userData.spout=spoutAnchor;
  ladle.position.copy(LADLE_POS);
  ladle.rotation.y=LADLE_YAW;
  scene.add(ladle); checkReady();
});
function checkReady(){ if(ladle&&mould) ready=true; }

/* ── Emitters ───────────────────────────────────────────────── */
function emitSpark(dt,amt){const pos=SPARK.g.attributes.position.array;
  for(let k=0;k<amt;k++){if(Math.random()>0.45)continue;SPARK.head=(SPARK.head+1)%SPARK.n;const i=SPARK.head;
    SPARK.life[i]=1;pos[i*3]=SPRUE.x+(Math.random()-0.5)*0.5;pos[i*3+1]=SPRUE.y;pos[i*3+2]=SPRUE.z+(Math.random()-0.5)*0.4;
    const a=Math.random()*6.28,sp=1.3+Math.random()*1.8;SPARK.vel[i*3]=Math.cos(a)*sp*0.4;SPARK.vel[i*3+1]=1.8+Math.random()*2.2;SPARK.vel[i*3+2]=Math.sin(a)*sp*0.4;}
  for(let i=0;i<SPARK.n;i++){if(SPARK.life[i]<=0){pos[i*3+1]=-99;continue;}
    SPARK.vel[i*3+1]-=9.8*dt*0.55;pos[i*3]+=SPARK.vel[i*3]*dt;pos[i*3+1]+=SPARK.vel[i*3+1]*dt;pos[i*3+2]+=SPARK.vel[i*3+2]*dt;SPARK.life[i]-=dt*1.5;}
  SPARK.g.attributes.position.needsUpdate=true;}
let steamT=0;
function emitSteam(dt){steamT+=dt;const pos=STEAM.g.attributes.position.array;
  if(steamT>0.11){steamT=0;STEAM.head=(STEAM.head+1)%STEAM.n;const i=STEAM.head;STEAM.life[i]=1;
    pos[i*3]=SPRUE.x+(Math.random()-0.5)*0.6;pos[i*3+1]=SPRUE.y;pos[i*3+2]=SPRUE.z+(Math.random()-0.5)*0.5;
    STEAM.vel[i*3]=(Math.random()-0.5)*0.2;STEAM.vel[i*3+1]=0.5+Math.random()*0.4;STEAM.vel[i*3+2]=(Math.random()-0.5)*0.2;}
  for(let i=0;i<STEAM.n;i++){if(STEAM.life[i]<=0){pos[i*3+1]=-99;continue;}
    pos[i*3]+=STEAM.vel[i*3]*dt;pos[i*3+1]+=STEAM.vel[i*3+1]*dt;pos[i*3+2]+=STEAM.vel[i*3+2]*dt;STEAM.life[i]-=dt*0.3;}
  STEAM.g.attributes.position.needsUpdate=true;}

/* ── Hero camera (holds V1 composition, gentle push-in) ─────── */
const CAM=[
  [0.00,  1.2,2.4,7.0,  0.4,1.5,0],   // hero establishing
  [0.30,  1.0,2.2,6.2,  0.4,1.4,0],   // push in slightly
  [0.58,  0.6,1.9,5.4,  0.3,1.2,0],   // the pour, tighter
  [0.80,  0.4,1.7,5.0,  0.2,1.1,0],   // casting glow
  [1.00,  1.4,2.3,6.8,  0.3,1.3,0],   // settle back
];
function sampleCam(t,op,ol){const ct=clamp(t);let i=0;while(i<CAM.length-1&&ct>CAM[i+1][0])i++;
  const a=CAM[i],b=CAM[Math.min(i+1,CAM.length-1)];const lt=smooth(clamp((ct-a[0])/((b[0]-a[0])||1)));
  op.set(lerp(a[1],b[1],lt),lerp(a[2],b[2],lt),lerp(a[3],b[3],lt));
  ol.set(lerp(a[4],b[4],lt),lerp(a[5],b[5],lt),lerp(a[6],b[6],lt));}
const _cp=new THREE.Vector3(),_cl=new THREE.Vector3(),_cpc=new THREE.Vector3(1.2,2.4,7.0),_clc=new THREE.Vector3(0.4,1.5,0);

/* ── Beat copy ──────────────────────────────────────────────── */
const caps=[...document.querySelectorAll('.story-cap')];
function setCaps(t){const w=[[0.0,0.24],[0.28,0.5],[0.54,0.76],[0.8,1.01]];
  caps.forEach((el,i)=>{const[a,b]=w[i];const o=(t>a&&t<b)?clamp((t-a)/0.05)*clamp((b-t)/0.05):0;el.style.opacity=Math.min(1,o);});}

/* ── presence / progress ────────────────────────────────────── */
const stage=canvas.parentElement;
function presence(){const r=section.getBoundingClientRect(),vh=innerHeight,band=vh*0.5;
  return Math.min(clamp((band-r.top)/band),clamp((r.bottom-(vh-band))/band));}
function progress(){const r=section.getBoundingClientRect(),tot=section.offsetHeight-innerHeight;return tot<=0?0:clamp(-r.top/tot);}

/* ── Pour scrub ─────────────────────────────────────────────── */
function ladleTilt(t){
  if(t<0.30) return smooth(t/0.30)*0.45;           // ease into a slight tilt
  if(t<0.42) return lerp(0.45,TILT_MAX,smooth((t-0.30)/0.12));
  if(t<0.70) return TILT_MAX;                        // full pour
  if(t<0.80) return lerp(TILT_MAX,0.3,smooth((t-0.70)/0.10));
  return 0.3;
}
function pourIntensity(t){ return (t>0.40&&t<0.72)?clamp((t-0.40)/0.05)*clamp((0.72-t)/0.05):0; }
function updateStream(intensity){
  if(intensity<=0.01||!ladle){streamMesh.visible=false;return;}
  streamMesh.visible=true;
  ladle.userData.spout.getWorldPosition(SPOUT_W);
  _dir.subVectors(SPRUE,SPOUT_W);const len=_dir.length();
  _mid.addVectors(SPOUT_W,SPRUE).multiplyScalar(0.5);streamMesh.position.copy(_mid);
  _q.setFromUnitVectors(_up,_dir.clone().normalize());streamMesh.quaternion.copy(_q);
  streamMesh.scale.set(0.55+intensity*0.5,len,0.55+intensity*0.5);
}

/* ── Loop ───────────────────────────────────────────────────── */
const clock=new THREE.Clock();let running=false;
function frame(){
  if(!running)return;requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05);const el=clock.elapsedTime;
  const t=REDUCED?0.55:progress();
  moltenU.time.value=el;

  sampleCam(t,_cp,_cl);_cpc.lerp(_cp,0.1);_clc.lerp(_cl,0.08);
  camera.position.copy(_cpc);camera.lookAt(_clc);

  if(ready){
    ladle.rotation.y=LADLE_YAW;
    ladle.rotation.x=ladleTilt(t);            // tip the heart-spout forward to pour
    const intensity=pourIntensity(t);
    moltenU.heat.value=0.9+intensity*0.35;

    const emptied=clamp((t-0.42)/0.3);
    ladleMolten.visible=t<0.82;
    ladleLight.intensity=(2.8-emptied*1.6)*1.6;
    ladle.getWorldPosition(ladleLight.position); ladleLight.position.y+=0.4;

    updateStream(intensity);

    const fillT=clamp((t-0.44)/0.3,0,1);
    const heat=t<0.8?fillT:Math.max(0,1-(t-0.8)/0.25);
    mouldMolten.visible=heat>0.05; mouldMolten.scale.setScalar(0.5+fillT*1.2);
    mouldLight.intensity=1+heat*5.5;

    if(intensity>0||(t>0.5&&t<0.85)) emitSpark(dt,2);
    if(t>0.48&&t<0.95) emitSteam(dt);
  }

  setCaps(t);
  stage.style.opacity=String(REDUCED?1:presence());
  stage.style.visibility=(REDUCED||presence()>0.001)?'visible':'hidden';
  composer.render();
}
const obs=new IntersectionObserver(es=>{const v=es[0].isIntersecting;
  if(v){if(!running){running=true;clock.start();frame();}}else{running=false;if(!REDUCED){stage.style.opacity='0';stage.style.visibility='hidden';}}
},{rootMargin:'50% 0px 50% 0px',threshold:0});
obs.observe(section);

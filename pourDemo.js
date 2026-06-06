/**
 * pourDemo.js — Real-time molten-iron pour, proof-of-concept.
 * Standalone (does not touch the main site). Proves a filmed pour can be
 * recreated as interactive real-time WebGL: ladle tilt → molten stream →
 * sparks → glowing mould → steam, tied together with HDR bloom.
 *
 * Loops on an 8s timeline (matching the reference clip). Pointer orbits.
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

const canvas = document.getElementById('pour-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.FogExp2(0x07060a, 0.045);

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(3.2, 1.6, 5.2);
camera.lookAt(0, 0.2, 0);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
});

/* ── Post: bloom makes the molten metal glow ─────────────────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.55, 0.0);
composer.addPass(bloom);
const gamma = new ShaderPass(GammaCorrectionShader); gamma.renderToScreen = true;
composer.addPass(gamma);

/* ── Lighting ────────────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x223344, 0.5));
const key = new THREE.DirectionalLight(0x6688aa, 0.6); key.position.set(-4, 5, 3); scene.add(key);
// The molten metal is its own warm light source
const moltenLight = new THREE.PointLight(0xff7a20, 0, 8, 2);
moltenLight.position.set(0, -0.4, 0);
scene.add(moltenLight);

/* ── Ground / anvil block under the mould ────────────────────── */
const anvil = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 0.5, 1.8),
  new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.95, metalness: 0.3 })
);
anvil.position.set(0, -1.15, 0); scene.add(anvil);

/* ── Sand mould (the box the iron pours into) ────────────────── */
const mould = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.5, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1.0, metalness: 0.0 })
);
mould.position.set(0, -0.78, 0); scene.add(mould);
// Sprue cup (the funnel hole the iron enters)
const cupMat = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 1, metalness: 0,
  emissive: 0xff5a10, emissiveIntensity: 0 });
const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.16, 32), cupMat);
cup.position.set(0, -0.5, 0); scene.add(cup);
// Molten pool that grows in the cup
const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe390 });
const pool = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), poolMat);
pool.rotation.x = -Math.PI/2; pool.position.set(0, -0.44, 0); pool.visible = false; scene.add(pool);

/* ── Ladle (bucket with pour spout) via LatheGeometry ────────── */
const ladleProfile = [];
for (let i = 0; i <= 10; i++) {
  const t = i/10;
  ladleProfile.push(new THREE.Vector2(0.05 + 0.55*Math.pow(t,0.7), t*0.7)); // bowl wall
}
const ladleOuter = new THREE.Mesh(
  new THREE.LatheGeometry(ladleProfile, 40),
  new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.75, metalness: 0.6, side: THREE.DoubleSide })
);
// Glowing molten interior of the ladle
const ladleInner = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.18, 0.06, 40),
  new THREE.MeshBasicMaterial({ color: 0xffb050 })
);
ladleInner.position.y = 0.62;
const ladle = new THREE.Group();
ladle.add(ladleOuter); ladle.add(ladleInner);
// trunnion arm (the bar the crane holds)
const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12),
  new THREE.MeshStandardMaterial({ color: 0x222020, roughness: 0.6, metalness: 0.7 }));
arm.rotation.z = Math.PI/2; arm.position.y = 0.45; ladle.add(arm);
ladle.position.set(-1.05, 1.15, 0);
scene.add(ladle);

// Spout world position (where the stream is born) — updated each frame
const spout = new THREE.Object3D();
spout.position.set(0.6, 0.55, 0); // local to ladle, at the lip
ladle.add(spout);

/* ── Particle helper (additive points with a soft sprite) ────── */
function dotTexture() {
  const s=64, c=document.createElement('canvas'); c.width=c.height=s;
  const x=c.getContext('2d'); const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.4,'rgba(255,200,120,0.9)');
  g.addColorStop(1,'rgba(255,120,40,0)'); x.fillStyle=g; x.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(c);
}
const DOT = dotTexture();

function makePoints(count, size, color) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count*3), 3));
  const mat = new THREE.PointsMaterial({
    size, map: DOT, color, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return { pts, geo, count, life: new Float32Array(count), vel: new Float32Array(count*3) };
}

const STREAM = makePoints(420, 0.17, 0xfff2cc);  // dense, yellow-white molten iron
const SPARK  = makePoints(240, 0.06, 0xff7a30);  // orange-red sparks
const STEAM  = makePoints(60, 0.5, 0x99908a);
STEAM.pts.material.opacity = 0.18; STEAM.pts.material.blending = THREE.NormalBlending;

/* ── Pour state ──────────────────────────────────────────────── */
const SPOUT_W = new THREE.Vector3();      // world spout pos
const IMPACT = new THREE.Vector3(0, -0.5, 0); // mould cup
let streamHead = 0;

function resetParticles(P){ for(let i=0;i<P.count;i++) P.life[i]=0; }
resetParticles(STREAM); resetParticles(SPARK); resetParticles(STEAM);

function emitStream(dt, intensity) {
  ladle.updateWorldMatrix(true, false);
  SPOUT_W.setFromMatrixPosition(spout.matrixWorld);
  const pos = STREAM.geo.attributes.position.array;
  // recycle dead particles from spout following a parabola to IMPACT
  const toEmit = Math.floor(intensity * 16);  // denser, continuous stream
  for (let n=0; n<toEmit; n++) {
    streamHead = (streamHead+1) % STREAM.count;
    const i = streamHead;
    STREAM.life[i] = 1.0;
    pos[i*3]=SPOUT_W.x + (Math.random()-0.5)*0.04;
    pos[i*3+1]=SPOUT_W.y;
    pos[i*3+2]=SPOUT_W.z + (Math.random()-0.5)*0.04;
    STREAM.vel[i*3]=(IMPACT.x-SPOUT_W.x)*0.6 + (Math.random()-0.5)*0.1;
    STREAM.vel[i*3+1]=-0.2;
    STREAM.vel[i*3+2]=(IMPACT.z-SPOUT_W.z)*0.6;
  }
  for (let i=0;i<STREAM.count;i++){
    if (STREAM.life[i]<=0) { pos[i*3+1]=-99; continue; }
    STREAM.vel[i*3+1]-=9.8*dt*0.25;       // gravity
    pos[i*3]+=STREAM.vel[i*3]*dt;
    pos[i*3+1]+=STREAM.vel[i*3+1]*dt;
    pos[i*3+2]+=STREAM.vel[i*3+2]*dt;
    if (pos[i*3+1]<=IMPACT.y){ STREAM.life[i]=0; pos[i*3+1]=-99; emitSpark(pos[i*3],pos[i*3+2]); }
    else STREAM.life[i]-=dt*0.3;
  }
  STREAM.geo.attributes.position.needsUpdate = true;
}

let sparkHead=0;
function emitSpark(x,z){
  if (Math.random()>0.5) return;
  sparkHead=(sparkHead+1)%SPARK.count; const i=sparkHead;
  const pos=SPARK.geo.attributes.position.array;
  SPARK.life[i]=1; pos[i*3]=x; pos[i*3+1]=IMPACT.y; pos[i*3+2]=z;
  const a=Math.random()*Math.PI*2, s=1.2+Math.random()*1.5;
  SPARK.vel[i*3]=Math.cos(a)*s*0.4; SPARK.vel[i*3+1]=1.5+Math.random()*2; SPARK.vel[i*3+2]=Math.sin(a)*s*0.4;
}
function updateSparks(dt){
  const pos=SPARK.geo.attributes.position.array;
  for(let i=0;i<SPARK.count;i++){
    if(SPARK.life[i]<=0){pos[i*3+1]=-99;continue;}
    SPARK.vel[i*3+1]-=9.8*dt*0.6;
    pos[i*3]+=SPARK.vel[i*3]*dt; pos[i*3+1]+=SPARK.vel[i*3+1]*dt; pos[i*3+2]+=SPARK.vel[i*3+2]*dt;
    SPARK.life[i]-=dt*1.6;
  }
  SPARK.geo.attributes.position.needsUpdate=true;
}
let steamHead=0, steamT=0;
function emitSteam(dt){
  steamT+=dt; const pos=STEAM.geo.attributes.position.array;
  if(steamT>0.12){ steamT=0; steamHead=(steamHead+1)%STEAM.count; const i=steamHead;
    STEAM.life[i]=1; pos[i*3]=(Math.random()-0.5)*0.5; pos[i*3+1]=IMPACT.y; pos[i*3+2]=(Math.random()-0.5)*0.4;
    STEAM.vel[i*3]=(Math.random()-0.5)*0.2; STEAM.vel[i*3+1]=0.5+Math.random()*0.4; STEAM.vel[i*3+2]=(Math.random()-0.5)*0.2;
  }
  for(let i=0;i<STEAM.count;i++){ if(STEAM.life[i]<=0){pos[i*3+1]=-99;continue;}
    pos[i*3]+=STEAM.vel[i*3]*dt; pos[i*3+1]+=STEAM.vel[i*3+1]*dt; pos[i*3+2]+=STEAM.vel[i*3+2]*dt;
    STEAM.life[i]-=dt*0.4; }
  STEAM.geo.attributes.position.needsUpdate=true;
}

/* ── Pointer orbit ───────────────────────────────────────────── */
let ax=0.0, ay=0.0, tax=0, tay=0, down=false, lx=0, ly=0;
canvas.addEventListener('pointerdown',e=>{down=true;lx=e.clientX;ly=e.clientY;});
addEventListener('pointerup',()=>down=false);
addEventListener('pointermove',e=>{ if(!down)return; tay+=(e.clientX-lx)*0.005; tax+=(e.clientY-ly)*0.005;
  tax=Math.max(-0.5,Math.min(0.6,tax)); lx=e.clientX;ly=e.clientY; });

/* ── Timeline (8s loop) ──────────────────────────────────────── */
const TILT_MAX = 1.15;
let T = 0;
const clock = new THREE.Clock();

function loop(){
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  T = (T + dt) % 8;

  // Phases: 0-1.3 tilt in · 1.3-5 pour · 5-6.2 tilt back · 6.2-8 settle
  let tilt=0, intensity=0;
  if (T<1.3){ tilt = (T/1.3)*TILT_MAX; }
  else if (T<5){ tilt=TILT_MAX; intensity=1; }
  else if (T<6.2){ tilt=TILT_MAX*(1-(T-5)/1.2); intensity=Math.max(0,1-(T-5)/0.6); }
  else { tilt=0; intensity=0; }

  ladle.rotation.z = tilt;

  if (intensity>0) emitStream(dt, intensity);
  else { const pos=STREAM.geo.attributes.position.array; for(let i=0;i<STREAM.count;i++){ if(STREAM.life[i]>0){STREAM.vel[i*3+1]-=9.8*dt*0.25; pos[i*3+1]+=STREAM.vel[i*3+1]*dt; STREAM.life[i]-=dt*0.5; if(pos[i*3+1]<IMPACT.y){STREAM.life[i]=0;pos[i*3+1]=-99;}}} STREAM.geo.attributes.position.needsUpdate=true; }
  updateSparks(dt);
  if (T>1.5) emitSteam(dt);

  // Mould glow grows during pour, cools after
  const fillT = THREE.MathUtils.clamp((T-1.3)/3.7, 0, 1);
  const heat = T<5 ? fillT : Math.max(0, 1-(T-5)/2.8);
  cupMat.emissiveIntensity = heat*3.4;
  pool.visible = heat>0.05; pool.scale.setScalar(0.6+fillT*0.9);
  poolMat.color.setRGB(1, 0.85+heat*0.12, 0.45+heat*0.3);   // bright yellow pool
  moltenLight.intensity = 1.0 + heat*5.0 + intensity*3.0;
  ladleInner.material.color.setRGB(1, 0.82+intensity*0.12, 0.4); // glowing yellow interior

  // camera orbit
  ax+=(tax-ax)*0.06; ay+=(tay-ay)*0.06;
  const r=6.1;
  camera.position.set(Math.sin(ay)*r*Math.cos(ax), 1.4+Math.sin(ax)*3, Math.cos(ay)*r*Math.cos(ax));
  camera.lookAt(0,-0.1,0);

  composer.render();
}
loop();

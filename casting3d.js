/**
 * casting3d.js — The precision casting in 3D (shared by Ch2 transformation + Ch3 examine).
 * Ch2: scroll morphs the part from rough AS-CAST iron → polished MACHINED component.
 * Ch3: drag to orbit and examine (wired later).
 *
 * Returns an API: { setPrecision(t), setAutoYaw(on), enableDrag(on), tick(), resize() }.
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

export function createCasting(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;

  const scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
  new RGBELoader().load('/hdri/studio_small_09_2k.hdr',(h)=>{h.mapping=THREE.EquirectangularReflectionMapping;scene.environment=h;},undefined,()=>{});

  const W=()=>canvas.parentElement.clientWidth||innerWidth;
  const H=()=>canvas.parentElement.clientHeight||innerHeight;
  const camera=new THREE.PerspectiveCamera(40,W()/H(),0.05,50);
  camera.position.set(-0.4,0.7,3.9);

  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(W(),H()),0.25,0.5,0.85);
  composer.addPass(bloom);
  const gamma=new ShaderPass(GammaCorrectionShader);gamma.renderToScreen=true;composer.addPass(gamma);

  // lighting (hub recipe)
  scene.add(new THREE.AmbientLight(0x111418,0.6));
  const key=new THREE.DirectionalLight(0xd8d0c8,1.4);key.position.set(-3,4,3);scene.add(key);
  const fill=new THREE.DirectionalLight(0x8899cc,0.45);fill.position.set(4,-1,2);scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x9ab0cc,0x221f1a,0.9));
  const ember=new THREE.SpotLight(0xff6a1a,2.0,14,Math.PI/5,0.85,1.6);ember.position.set(2.5,2.6,-2);
  const et=new THREE.Object3D();scene.add(et);ember.target=et;scene.add(ember);

  // procedural cast-iron normal/rough
  function noiseTex(size,base,v){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),im=x.createImageData(size,size),d=im.data;
    for(let i=0;i<d.length;i+=4){const val=Math.round(clamp(base+(Math.random()*2-1)*v)*255);d[i]=d[i+1]=d[i+2]=val;d[i+3]=255;}
    x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);return t;}
  function normTex(size,a){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),im=x.createImageData(size,size),d=im.data;
    for(let i=0;i<d.length;i+=4){d[i]=Math.round((0.5+(Math.random()*2-1)*a)*255);d[i+1]=Math.round((0.5+(Math.random()*2-1)*a)*255);d[i+2]=255;d[i+3]=255;}
    x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);return t;}

  // materials: BODY (as-cast) + MACHINED (precision faces, morph rough→mirror)
  const bodyMat=new THREE.MeshPhysicalMaterial({color:0x3a342c,roughness:0.92,metalness:0.45,envMapIntensity:1.0,
    roughnessMap:noiseTex(256,0.9,0.12),normalMap:normTex(256,0.12),normalScale:new THREE.Vector2(0.6,0.6),clearcoat:0.1});
  const machinedMat=new THREE.MeshPhysicalMaterial({color:0x3a352e,roughness:0.85,metalness:0.6,envMapIntensity:1.0,clearcoat:0.0});
  const boreMat=new THREE.MeshStandardMaterial({color:0x1c1916,roughness:0.7,metalness:0.5,side:THREE.BackSide,envMapIntensity:0.5});
  const boltMat=new THREE.MeshStandardMaterial({color:0x0e0d0b,roughness:0.6,metalness:0.4,side:THREE.BackSide,envMapIntensity:0.3});

  // geometry — flanged splined hub
  const FLNG_R=0.90,FLNG_H=0.10,HUB_R=0.38,HUB_H=0.72,BORE_R=0.195,SPLINE_N=8,SPLINE_W=0.032,SPLINE_D=0.040,BOLT_R=0.65,BOLT_N=4,BOLT_HR=0.062;
  const hub=new THREE.Group();
  const V=(x,y,z)=>new THREE.Vector3(x,y,z),E=(x,y,z)=>new THREE.Euler(x,y,z);
  const add=(g,m,p,r)=>{const me=new THREE.Mesh(g,m);if(p)me.position.copy(p);if(r)me.rotation.copy(r);hub.add(me);return me;};
  add(new THREE.CylinderGeometry(FLNG_R,FLNG_R,FLNG_H,80,1,true),bodyMat,V(0,-FLNG_H/2,0));
  add(new THREE.RingGeometry(HUB_R,FLNG_R,80,1),bodyMat,V(0,0,0),E(-Math.PI/2,0,0));
  add(new THREE.RingGeometry(BORE_R,FLNG_R,80,1),machinedMat,V(0,-FLNG_H,0),E(Math.PI/2,0,0));   // mating face
  add(new THREE.CylinderGeometry(HUB_R-0.004,HUB_R+0.004,HUB_H,80,5,true),bodyMat,V(0,HUB_H/2,0));
  add(new THREE.RingGeometry(BORE_R,HUB_R,80,1),machinedMat,V(0,HUB_H,0),E(-Math.PI/2,0,0));       // hub top
  add(new THREE.TorusGeometry(HUB_R+0.012,0.014,12,80),machinedMat,V(0,0,0),E(Math.PI/2,0,0));
  add(new THREE.TorusGeometry(HUB_R-0.014,0.014,10,80),machinedMat,V(0,HUB_H,0),E(Math.PI/2,0,0));
  add(new THREE.CylinderGeometry(BORE_R,BORE_R,HUB_H+FLNG_H+0.01,64,2,true),boreMat,V(0,(HUB_H-FLNG_H)/2,0)); // bore (machined)
  for(let i=0;i<SPLINE_N;i++){const a=(i/SPLINE_N)*Math.PI*2,r=BORE_R-SPLINE_D/2;
    add(new THREE.BoxGeometry(SPLINE_W,HUB_H+FLNG_H+0.02,SPLINE_D),machinedMat,V(r*Math.cos(a),(HUB_H-FLNG_H)/2,r*Math.sin(a)),E(0,-a,0));}
  for(let i=0;i<BOLT_N;i++){const a=(i/BOLT_N)*Math.PI*2+Math.PI/4;
    add(new THREE.CylinderGeometry(BOLT_HR,BOLT_HR,FLNG_H+0.01,18,1,true),boltMat,V(BOLT_R*Math.cos(a),-FLNG_H/2,BOLT_R*Math.sin(a)));
    add(new THREE.TorusGeometry(BOLT_HR+0.012,0.008,8,24),machinedMat,V(BOLT_R*Math.cos(a),0.003,BOLT_R*Math.sin(a)),E(Math.PI/2,0,0));}
  hub.rotation.set(0.5,0.4,0.06); hub.scale.setScalar(1.25);
  scene.add(hub);

  function resize(){const w=W(),h=H();renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  resize();

  // ── transformation: rough as-cast → polished machined ──
  function setPrecision(t){
    const ct=clamp(t);
    // machined precision faces: dark rough → bright mirror
    machinedMat.color.setRGB(lerp(0x3a/255,0x86/255,ct),lerp(0x35/255,0x80/255,ct),lerp(0x2e/255,0x76/255,ct));
    machinedMat.roughness=lerp(0.85,0.09,ct);
    machinedMat.metalness=lerp(0.6,0.92,ct);
    machinedMat.envMapIntensity=lerp(1.0,1.6,ct);
    machinedMat.clearcoat=lerp(0.0,0.3,ct);
    // bore gets bright too
    boreMat.color.setRGB(lerp(0x1c/255,0x58/255,ct),lerp(0x19/255,0x54/255,ct),lerp(0x16/255,0x50/255,ct));
    boreMat.roughness=lerp(0.7,0.12,ct);
    // body cleans up slightly (fettled)
    bodyMat.roughness=lerp(0.92,0.6,ct);
    bodyMat.color.setRGB(lerp(0x3a/255,0x6e/255,ct),lerp(0x34/255,0x68/255,ct),lerp(0x2c/255,0x60/255,ct));
  }
  setPrecision(0);

  // ── interaction (Ch3) + idle ──
  let autoYaw=true, dragEnabled=false, dragging=false, lastX=0,lastY=0, velY=0, userY=0, userX=0, idle=0;
  function onDown(e){if(!dragEnabled)return;dragging=true;const p=e.touches?e.touches[0]:e;lastX=p.clientX;lastY=p.clientY;velY=0;}
  function onMove(e){if(!dragging)return;const p=e.touches?e.touches[0]:e;const dx=p.clientX-lastX,dy=p.clientY-lastY;
    if(e.touches&&Math.abs(dy)>Math.abs(dx)*1.3){dragging=false;return;}
    lastX=p.clientX;lastY=p.clientY;velY=dx*0.006;userY+=velY;userX=clamp(userX+dy*0.005,-0.5,0.6);
    if(e.cancelable&&(!e.touches||Math.abs(dx)>=Math.abs(dy)))e.preventDefault();}
  function onUp(){dragging=false;}
  canvas.addEventListener('mousedown',onDown);addEventListener('mousemove',onMove);addEventListener('mouseup',onUp);
  canvas.addEventListener('touchstart',onDown,{passive:true});canvas.addEventListener('touchmove',onMove,{passive:false});canvas.addEventListener('touchend',onUp);

  let _emberCur=0;
  function tick(dt){
    if(!dragging){userY+=velY;velY*=0.94;}
    const baseYaw=autoYaw?performance.now()*0.00012:0;
    hub.rotation.y=0.4+baseYaw+userY;
    hub.rotation.x=0.5+userX;
    _emberCur+=(2.0-_emberCur)*0.05; ember.intensity=_emberCur;
    composer.render();
  }

  return {
    setPrecision,
    setAutoYaw:(v)=>autoYaw=v,
    enableDrag:(v)=>{dragEnabled=v; canvas.style.cursor=v?'grab':'default';},
    tick, resize,
  };
}

/**
 * storyGlobe.js — realistic Earth for Chapter 7 (Global Reach).
 * Day texture + molten-orange India + orange trade-route arcs + drag-to-rotate.
 * Returns { tick, resize }.
 */
import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function createStoryGlobe(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;

  const scene=new THREE.Scene();
  const W=()=>canvas.parentElement.clientWidth||innerWidth;
  const H=()=>canvas.parentElement.clientHeight||innerHeight;
  const camera=new THREE.PerspectiveCamera(40,W()/H(),0.1,100);
  camera.position.set(0,0,3.4);

  scene.add(new THREE.AmbientLight(0x445566,0.6));
  const sun=new THREE.DirectionalLight(0xfff4e0,2.3);sun.position.set(2.5,1.2,3);scene.add(sun);

  const earth=new THREE.Group();
  const INIT_ROT=-(74.2+90)*(Math.PI/180), INIT_TILT=0.3;
  earth.rotation.set(INIT_TILT,INIT_ROT,0);scene.add(earth);

  const mat=new THREE.MeshPhongMaterial({color:0x2a3a4a,specular:new THREE.Color(0x335577),shininess:15});
  const globe=new THREE.Mesh(new THREE.SphereGeometry(1,80,80),mat);earth.add(globe);
  new THREE.TextureLoader().load('/images/earth-2k.jpg',(t)=>{t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.color.set(0xffffff);mat.needsUpdate=true;});

  // subtle atmosphere
  const atmos=new THREE.Mesh(new THREE.SphereGeometry(1.06,64,64),new THREE.ShaderMaterial({
    side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 m=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-m.xyz);gl_Position=projectionMatrix*m;}`,
    fragmentShader:`varying vec3 n;varying vec3 v;void main(){float r=pow(1.-abs(dot(n,v)),4.);gl_FragColor=vec4(vec3(.35,.45,.6),r*.3);}`}));
  scene.add(atmos);

  function ll(lat,lon,r=1){const phi=(90-lat)*Math.PI/180,th=(lon+180)*Math.PI/180;
    return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(th));}

  // India shape (filled molten) via equirect overlay
  const INDIA=[[35,74],[34,78],[32.5,79.2],[30.2,81],[28.6,84],[27.6,88.2],[27.2,92],[28.1,95.4],[26.6,97.2],[24.2,94.2],[23,93.2],[22,92],[21.6,89],[20.2,87],[16.5,81.5],[13.1,80.3],[10.3,79.8],[8.1,77.5],[9.2,76.2],[12.8,74.6],[15.8,73.6],[19,72.8],[20.9,70.2],[22.6,69],[24.3,71],[26,70],[28,70.2],[30,74],[32.2,75],[35,74]];
  function indiaTex(){const W2=2048,Hh=1024,c=document.createElement('canvas');c.width=W2;c.height=Hh;const x=c.getContext('2d');x.clearRect(0,0,W2,Hh);
    const px=(la,lo)=>[((lo+180)/360)*W2,((90-la)/180)*Hh];
    x.save();x.shadowColor='rgba(255,120,30,.95)';x.shadowBlur=90;x.beginPath();INDIA.forEach(([la,lo],i)=>{const[a,b]=px(la,lo);i?x.lineTo(a,b):x.moveTo(a,b);});x.closePath();x.fillStyle='rgba(255,120,30,1)';x.fill();x.fill();x.restore();
    const[cx,cy]=px(21,79);const g=x.createRadialGradient(cx,cy,4,cx,cy,150);g.addColorStop(0,'#fff1c0');g.addColorStop(.35,'#ff8a1e');g.addColorStop(1,'#e24a08');
    x.beginPath();INDIA.forEach(([la,lo],i)=>{const[a,b]=px(la,lo);i?x.lineTo(a,b):x.moveTo(a,b);});x.closePath();x.fillStyle=g;x.fill();
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
  const indiaShell=new THREE.Mesh(new THREE.SphereGeometry(1.006,96,96),new THREE.MeshBasicMaterial({map:indiaTex(),transparent:true,depthWrite:false}));earth.add(indiaShell);

  // molten glow sprite for arcs/drops
  function glowTex(){const s=128,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    g.addColorStop(0,'rgba(255,245,220,1)');g.addColorStop(.25,'rgba(255,130,30,.95)');g.addColorStop(1,'rgba(220,70,10,0)');x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);}
  const GT=glowTex();
  const ORIGIN=[16.7,74.2],DESTS=[[41.9,12.5],[51.5,-0.1],[35.7,139.7],[38,-97]];const ARC_R=1.012;const arcs=[];
  DESTS.forEach(d=>{const from=ll(ORIGIN[0],ORIGIN[1],ARC_R),to=ll(d[0],d[1],ARC_R);const N=100;const full=new Float32Array((N+1)*3);
    for(let i=0;i<=N;i++){const t=i/N;const p=new THREE.Vector3().lerpVectors(from,to,t).normalize();p.multiplyScalar(ARC_R*(1+Math.sin(t*Math.PI)*0.22));full[i*3]=p.x;full[i*3+1]=p.y;full[i*3+2]=p.z;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(full.slice(0,3),3));geo._full=full;geo._N=N;
    earth.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff7a1e,transparent:true,opacity:.95,blending:THREE.AdditiveBlending})));
    const dot=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));dot.scale.setScalar(.12);dot.position.copy(ll(d[0],d[1],1.02));dot.visible=false;earth.add(dot);
    arcs.push({geo,dot,startMs:performance.now()+arcs.length*350});});

  function updateArcs(now){arcs.forEach(a=>{const t=clamp((now-a.startMs)/1700);const ct=Math.max(2,Math.round(t*a.geo._N));
    a.geo.setAttribute('position',new THREE.BufferAttribute(a.geo._full.slice(0,ct*3),3));a.geo.attributes.position.needsUpdate=true;a.geo.setDrawRange(0,ct);if(t>=.99)a.dot.visible=true;});}

  function resize(){const w=W(),h=H();renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  resize();

  // drag
  let dragging=false,lx=0,ly=0,vy=0,uy=0,ux=0;
  canvas.style.cursor='grab';
  function down(e){dragging=true;canvas.style.cursor='grabbing';const p=e.touches?e.touches[0]:e;lx=p.clientX;ly=p.clientY;vy=0;}
  function move(e){if(!dragging)return;const p=e.touches?e.touches[0]:e;const dx=p.clientX-lx,dy=p.clientY-ly;
    if(e.touches&&Math.abs(dy)>Math.abs(dx)*1.3){dragging=false;return;}lx=p.clientX;ly=p.clientY;vy=dx*0.005;uy+=vy;ux=clamp(ux+dy*0.005,-.5,.5);
    if(e.cancelable&&(!e.touches||Math.abs(dx)>=Math.abs(dy)))e.preventDefault();}
  function up(){dragging=false;canvas.style.cursor='grab';}
  canvas.addEventListener('mousedown',down);addEventListener('mousemove',move);addEventListener('mouseup',up);
  canvas.addEventListener('touchstart',down,{passive:true});canvas.addEventListener('touchmove',move,{passive:false});canvas.addEventListener('touchend',up);

  let el=0;
  function tick(dt){el+=dt;if(!dragging){uy+=vy;vy*=0.95;}
    earth.rotation.y=INIT_ROT+el*0.05+uy;earth.rotation.x=INIT_TILT+ux;
    updateArcs(performance.now());renderer.render(scene,camera);}
  return {tick,resize};
}

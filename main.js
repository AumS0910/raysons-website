const TOTAL=240;
const FRAME_PATH='/frames/ezgif-frame-';
const CROP=0.10;
const LERP=0.008;
const BEAT_RANGES=[{id:'beat-1',s:0,e:.25},{id:'beat-2',s:.25,e:.5},{id:'beat-3',s:.5,e:.75},{id:'beat-4',s:.75,e:1}];

const isMobile=()=>window.innerWidth<768;
const motionScale=()=>isMobile()?.55:1;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));

const state={heroTarget:0,heroCurrent:0,beatTarget:0,beatCurrent:0};
let frames=new Array(TOTAL).fill(null);
let allReady=false;
let prevBeatIdx=-1;
let heroCanvas,heroCtx,emberCanvas,emberCtx,offC,offX;
let embers=[];

document.addEventListener('DOMContentLoaded',init);

function init(){
  heroCanvas=document.getElementById('hero-canvas');
  emberCanvas=document.getElementById('ember-canvas');
  if(heroCanvas)heroCtx=heroCanvas.getContext('2d',{alpha:false});
  if(emberCanvas)emberCtx=emberCanvas.getContext('2d',{alpha:true});

  sizeCanvases();
  window.addEventListener('resize',debounce(sizeCanvases,150));
  window.addEventListener('scroll',onScroll,{passive:true});

  initNav();
  initMobile();
  initObservers();
  onScroll();
  preloadFrames();
}

function getFramePath(i){
  return FRAME_PATH+String(i+1).padStart(3,'0')+'.jpg';
}

async function preloadFrames(){
  const bar=document.getElementById('preloader-bar');
  let loaded=0;
  const minEnd=performance.now()+900;
  let started=false;

  const loadFrame=i=>fetch(getFramePath(i))
    .then(r=>r.blob())
    .then(blob=>createImageBitmap(blob))
    .then(bitmap=>{
      frames[i]=bitmap;
      loaded++;
      if(bar)bar.style.width=(loaded/TOTAL*100)+'%';
    })
    .catch(()=>{
      loaded++;
      if(bar)bar.style.width=(loaded/TOTAL*100)+'%';
    });

  const reveal=async()=>{
    if(started)return;
    started=true;
    allReady=true;
    const remaining=minEnd-performance.now();
    if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
    const preloader=document.getElementById('preloader');
    if(preloader){
      preloader.classList.add('done');
      setTimeout(()=>preloader.remove(),900);
    }
    requestAnimationFrame(masterTick);
  };

  setTimeout(reveal,1800);

  for(let batch=0;batch<TOTAL;batch+=32){
    const end=Math.min(batch+32,TOTAL);
    const proms=[];
    for(let i=batch;i<end;i++){
      proms.push(loadFrame(i));
    }
    await Promise.all(proms);
    if(batch>=32)reveal();
  }
  reveal();
}

function sizeCanvases(){
  if(!heroCanvas||!heroCtx||!emberCanvas||!emberCtx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  sizeCanvasToEl(heroCanvas,heroCtx,dpr,document.querySelector('.hero__canvas-wrap'));
  sizeCanvasFull(emberCanvas,emberCtx,dpr);

  offC=document.createElement('canvas');
  offC.width=heroCanvas.width;
  offC.height=heroCanvas.height;
  offX=offC.getContext('2d');
  offX.setTransform(dpr,0,0,dpr,0,0);
}

function sizeCanvasToEl(canvas,ctx,dpr,el){
  if(!el)return;
  const w=el.offsetWidth;
  const h=el.offsetHeight;
  canvas.width=w*dpr;
  canvas.height=h*dpr;
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';
  canvas._lw=w;
  canvas._lh=h;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function sizeCanvasFull(canvas,ctx,dpr){
  const w=window.innerWidth;
  const h=window.innerHeight;
  canvas.width=w*dpr;
  canvas.height=h*dpr;
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';
  canvas._lw=w;
  canvas._lh=h;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function onScroll(){
  const sy=window.scrollY;
  const hero=document.querySelector('.hero');
  if(hero){
    const start=hero.offsetTop||0;
    const travel=Math.max(1,hero.offsetHeight-window.innerHeight);
    state.heroTarget=clamp((sy-start)/travel);
  }

  const beats=document.getElementById('beats-section');
  if(beats){
    const r=beats.getBoundingClientRect();
    const max=beats.offsetHeight-window.innerHeight;
    state.beatTarget=clamp(-r.top/(max||1));
  }

  document.getElementById('navbar')?.classList.toggle('scrolled',sy>60);
  document.getElementById('float-cta')?.classList.toggle('visible',hero?sy>hero.offsetHeight*.34&&sy<hero.offsetHeight*.9:sy>500);
}

function calcDraw(img,cw,ch){
  const sw=img.width;
  const sh=img.height*(1-CROP);
  const sc=Math.min(cw/sw,(ch*.76)/sh)*1.16;
  return{sw,sh,dx:(cw-sw*sc)/2,dy:(ch-sh*sc)/2,dw:sw*sc,dh:sh*sc};
}

function drawFrame(ctx,offCtx,offCan,cw,ch,progress){
  if(!ctx||!offCtx||!offCan||!cw||!ch)return;
  const ri=progress*(TOTAL-1);
  const iA=Math.floor(ri);
  const iB=Math.min(iA+1,TOTAL-1);
  const blend=ri-iA;
  const a=frames[iA]||nearestFrame(iA);
  const b=frames[iB]||nearestFrame(iB);
  if(!a)return;

  offCtx.globalAlpha=1;
  offCtx.fillStyle='#000';
  offCtx.fillRect(0,0,cw,ch);

  const dA=calcDraw(a,cw,ch);
  offCtx.drawImage(a,0,0,dA.sw,dA.sh,dA.dx,dA.dy,dA.dw,dA.dh);
  if(b&&blend>.001){
    const dB=calcDraw(b,cw,ch);
    offCtx.globalAlpha=blend;
    offCtx.drawImage(b,0,0,dB.sw,dB.sh,dB.dx,dB.dy,dB.dw,dB.dh);
    offCtx.globalAlpha=1;
  }

  const vg=offCtx.createRadialGradient(cw/2,ch/2,ch*.2,cw/2,ch/2,ch*.68);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(.68,'rgba(0,0,0,.28)');
  vg.addColorStop(1,'rgba(0,0,0,.9)');
  offCtx.fillStyle=vg;
  offCtx.fillRect(0,0,cw,ch);

  const glow=offCtx.createRadialGradient(cw/2,ch*.7,0,cw/2,ch*.7,cw*.34);
  glow.addColorStop(0,`rgba(255,107,0,${.06+progress*.12})`);
  glow.addColorStop(1,'rgba(0,0,0,0)');
  offCtx.fillStyle=glow;
  offCtx.fillRect(0,0,cw,ch);

  const dpr=Math.min(window.devicePixelRatio||1,2);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(offCan,0,0);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function nearestFrame(index){
  for(let d=1;d<TOTAL;d++){
    const prev=index-d;
    const next=index+d;
    if(prev>=0&&frames[prev])return frames[prev];
    if(next<TOTAL&&frames[next])return frames[next];
  }
  return null;
}

function masterTick(){
  state.heroCurrent+=Math.abs(state.heroTarget-state.heroCurrent)<.0001?state.heroTarget-state.heroCurrent:(state.heroTarget-state.heroCurrent)*LERP;
  state.beatCurrent+=Math.abs(state.beatTarget-state.beatCurrent)<.0001?state.beatTarget-state.beatCurrent:(state.beatTarget-state.beatCurrent)*LERP;

  updateParallax();
  updateBeats(state.beatCurrent);
  updateTextFills();

  if(allReady){
    drawFrame(heroCtx,offX,offC,heroCanvas?heroCanvas._lw||1:1,heroCanvas?heroCanvas._lh||1:1,state.heroCurrent);
  }
  updateEmbers(emberCtx,embers,emberCanvas?emberCanvas._lw||window.innerWidth:window.innerWidth,emberCanvas?emberCanvas._lh||window.innerHeight:window.innerHeight,state.heroCurrent);

  const scrollInd=document.getElementById('scroll-ind');
  if(scrollInd)scrollInd.style.opacity=state.heroCurrent>.08?'0':'1';
  requestAnimationFrame(masterTick);
}

function updateParallax(){
  const sy=window.scrollY;
  const hero=document.querySelector('.hero');
  const heroStart=hero?.offsetTop||0;
  const heroScroll=Math.max(0,sy-heroStart);
  const scale=motionScale();
  const heroBg=document.getElementById('hero-bg-text');
  const canvas=document.getElementById('layer-canvas');
  const embersEl=document.getElementById('layer-embers');
  const left=document.querySelector('.hero__left');
  const right=document.querySelector('.hero__right');
  const beatsSchematic=document.getElementById('beats-schematic');
  const beatsBg=document.querySelector('.beats__bg-text');

  if(heroBg)heroBg.style.transform=`translate(-50%,calc(-50% + ${heroScroll*.035*scale}px))`;
  if(canvas)canvas.style.transform=`translateX(-50%) translateY(${heroScroll*.055*scale}px) translateZ(0)`;
  if(embersEl)embersEl.style.transform=`translateY(${-heroScroll*.045*scale}px) translateZ(0)`;
  if(left&&!isMobile())left.style.transform=`translateY(calc(-50% + ${heroScroll*.08*scale}px))`;
  if(right&&!isMobile())right.style.transform=`translateY(calc(-50% + ${heroScroll*.12*scale}px))`;

  const beats=document.getElementById('beats-section');
  if(beats&&beatsSchematic){
    const r=beats.getBoundingClientRect();
    const p=clamp(-r.top/(beats.offsetHeight-window.innerHeight||1));
    beatsSchematic.style.transform=`translateY(${(p-.5)*-70*scale}px) rotate(${(p-.5)*8}deg) scale(${1.02+p*.04})`;
    if(beatsBg)beatsBg.style.transform=`translate(-50%,calc(-50% + ${(p-.5)*42*scale}px))`;
  }
}

function updateBeats(progress){
  let active=BEAT_RANGES.length-1;
  BEAT_RANGES.forEach((beat,i)=>{
    if(progress>=beat.s&&progress<=beat.e)active=i;
  });
  if(active===prevBeatIdx)return;
  BEAT_RANGES.forEach((beat,i)=>{
    document.getElementById(beat.id)?.classList.toggle('active',i===active);
  });
  prevBeatIdx=active;
}

function updateTextFills(){
  fillByViewport(document.getElementById('about-text'),.1,.85);
  fillByViewport(document.querySelector('.industries__statement'),.15,.82);
}

function fillByViewport(el,start,end){
  if(!el)return;
  const r=el.getBoundingClientRect();
  const vh=window.innerHeight||1;
  const raw=(vh*end-r.top)/(vh*(end-start));
  el.style.setProperty('--fill',(clamp(raw)*100).toFixed(1)+'%');
}

class Ember{
  constructor(w,h,init){this.reset(w,h,init)}
  reset(w,h,init=false){
    this.x=Math.random()*w;
    this.y=init?Math.random()*h:h+20;
    this.sz=1.2+Math.random()*4.8;
    this.vy=-(.25+Math.random()*1.1);
    this.phase=Math.random()*Math.PI*2;
    this.op=.18+Math.random()*.55;
    this.life=0;
    this.maxLife=120+Math.random()*180;
    this.r=255;
    this.g=105+Math.floor(Math.random()*110);
    this.b=Math.floor(Math.random()*28);
  }
  update(w,h){
    this.life++;
    this.x+=Math.sin(this.life*.035+this.phase)*.55;
    this.y+=this.vy;
    if(this.life>this.maxLife||this.y<-20||this.x<-30||this.x>w+30)this.reset(w,h);
  }
  draw(ctx,intensity){
    const life=this.life/this.maxLife;
    const fade=Math.min(this.life/22,1)*Math.max(0,1-life);
    const a=this.op*fade*intensity;
    if(a<.01)return;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.sz,0,Math.PI*2);
    ctx.fillStyle=`rgba(${this.r},${this.g},${this.b},${a})`;
    ctx.shadowBlur=this.sz*3;
    ctx.shadowColor=`rgba(${this.r},${this.g},${this.b},${a*.5})`;
    ctx.fill();
    ctx.shadowBlur=0;
  }
}

function updateEmbers(ctx,arr,w,h,progress){
  if(!ctx||!w||!h)return;
  if(arr.length===0)for(let i=0;i<60;i++)arr.push(new Ember(w,h,true));
  ctx.clearRect(0,0,w,h);
  if(progress<.01)return;
  arr.forEach(ember=>{
    ember.update(w,h);
    ember.draw(ctx,progress);
  });
}

function initNav(){
  document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click',event=>{
      const target=document.querySelector(anchor.getAttribute('href'));
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  });
}

function initMobile(){
  const button=document.getElementById('nav-hamburger');
  const menu=document.getElementById('mobile-menu');
  if(button&&menu)button.addEventListener('click',()=>menu.classList.toggle('open'));
}

function initObservers(){
  const statsObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      document.getElementById('stats-line')?.classList.add('drawn');
      document.querySelectorAll('.stats__item').forEach(card=>animateCount(card));
      statsObs.disconnect();
    });
  },{threshold:.3});
  const stats=document.getElementById('stats');
  if(stats)statsObs.observe(stats);

  const procObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      document.querySelectorAll('.process__step').forEach(step=>step.classList.remove('active'));
      entry.target.classList.add('active');
      const ghost=document.getElementById('process-ghost');
      if(ghost)ghost.textContent=String(parseInt(entry.target.dataset.step,10)+1).padStart(2,'0');
    });
  },{threshold:.5,rootMargin:'0px 0px -30% 0px'});
  document.querySelectorAll('.process__step').forEach(step=>procObs.observe(step));
}

function animateCount(card){
  if(card.dataset.counted)return;
  card.dataset.counted='true';
  const target=parseInt(card.dataset.target,10);
  const numEl=card.querySelector('.stats__num');
  if(!numEl)return;
  const start=performance.now();
  function tick(now){
    const t=clamp((now-start)/1800);
    numEl.textContent=Math.round((1-Math.pow(1-t,3))*target);
    if(t<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function debounce(fn,ms){
  let timer;
  return(...args)=>{
    clearTimeout(timer);
    timer=setTimeout(()=>fn(...args),ms);
  };
}

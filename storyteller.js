/**
 * storyteller.js — Raysons scroll story.
 * Chapter 1: THE POUR — photoreal frame-scrub of the real molten pour.
 * The 240 frames are preloaded and scrubbed by scroll; beat copy fades through;
 * vignette + grain give the cinematic finish. Fixed-stage (robust on all devices).
 *
 * Chapters 2–9 will register below as they're built.
 */

import { createCasting } from './casting3d.js';
import Lenis from 'lenis';
import { createStoryGlobe } from './storyGlobe.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Lenis smooth scroll (buttery, landonorris-style) ── */
let lenis=null;
if(!REDUCED){
  lenis=new Lenis({lerp:0.09,smoothWheel:true,wheelMultiplier:1.0});
  function lraf(t){lenis.raf(t);requestAnimationFrame(lraf);}
  requestAnimationFrame(lraf);
}

/* ── Frame preload ──────────────────────────────────────────── */
const FRAME_COUNT=240;
const framePath=i=>`/frames2/ezgif-frame-${String(i).padStart(3,'0')}.jpg`;
const frames=new Array(FRAME_COUNT);
let loaded=0;
for(let i=0;i<FRAME_COUNT;i++){
  const img=new Image();
  img.onload=()=>{loaded++;};
  img.onerror=()=>{loaded++;};
  img.src=framePath(i+1);
  frames[i]=img;
}

/* ── Loader ─────────────────────────────────────────────────── */
const loaderEl=document.getElementById('loader');
const pctEl=document.getElementById('loader-pct');
const barEl=document.getElementById('loader-bar');
let started=false;
function pollLoad(){
  const pct=Math.round(loaded/FRAME_COUNT*100);
  pctEl.textContent=pct;
  barEl.style.width=pct+'%';
  if(loaded>=FRAME_COUNT*0.55 && !started){ start(); }  // more loaded before reveal = fewer fallback frames
  if(loaded<FRAME_COUNT) requestAnimationFrame(pollLoad);
}
requestAnimationFrame(pollLoad);

function nearestLoaded(idx){
  // return the closest loaded, complete frame to idx
  if(frames[idx]&&frames[idx].complete&&frames[idx].naturalWidth) return frames[idx];
  for(let d=1;d<FRAME_COUNT;d++){
    const a=idx-d,b=idx+d;
    if(a>=0&&frames[a]&&frames[a].complete&&frames[a].naturalWidth) return frames[a];
    if(b<FRAME_COUNT&&frames[b]&&frames[b].complete&&frames[b].naturalWidth) return frames[b];
  }
  return null;
}

/* ── Chapter 1: pour canvas ─────────────────────────────────── */
const ch1=document.getElementById('ch1');
const stage=document.getElementById('ch1-stage');
const canvas=document.getElementById('pour-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const beats=[...document.querySelectorAll('#ch1-stage .ch-copy')];
const progEl=document.getElementById('ch1-progress');

let cw=0,ch=0,dpr=1;
function resize(){
  dpr=Math.min(devicePixelRatio,1.5);              // cap DPR — less fill, less lag
  cw=innerWidth; ch=innerHeight;
  canvas.width=Math.round(cw*dpr); canvas.height=Math.round(ch*dpr);
  canvas.style.width=cw+'px'; canvas.style.height=ch+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; // crisp scaling
  _lastDrawn=-1;
}
addEventListener('resize',resize);

function drawCover(img){
  if(!img) return;
  const iw=img.naturalWidth, ih=img.naturalHeight;
  const s=Math.max(cw/iw, ch/ih);
  const w=iw*s, h=ih*s;
  ctx.drawImage(img,(cw-w)/2,(ch-h)/2,w,h);
}

function ch1Progress(){
  const r=ch1.getBoundingClientRect();
  const tot=ch1.offsetHeight-innerHeight;
  return tot<=0?0:clamp(-r.top/tot);
}
function ch1Presence(){
  const r=ch1.getBoundingClientRect(),vh=innerHeight,band=vh*0.5;
  return Math.min(clamp((band-r.top)/band),clamp((r.bottom-(vh-band))/band));
}

// beat windows within chapter progress
const BEATS=[[0.02,0.30],[0.36,0.64],[0.70,0.97]];
function setBeats(t){
  beats.forEach((el,i)=>{const[a,b]=BEATS[i];
    const o=(t>a&&t<b)?clamp((t-a)/0.05)*clamp((b-t)/0.05):0; el.style.opacity=Math.min(1,o);});
}

/* ── Chapter 2: the casting transformation (raw → machined) ── */
const ch2=document.getElementById('ch2');
const ch2Stage=document.getElementById('ch2-stage');
const castCanvas=document.getElementById('cast-canvas');
const ch2Title=document.getElementById('ch2-title');
const ch2Desc=document.getElementById('ch2-desc');
const ch2Copy=document.getElementById('ch2-copy');
const ch2Prog=document.getElementById('ch2-progress');
const tSteps=[...document.querySelectorAll('#ch2-stage .t-step')];
const casting=createCasting(castCanvas);
addEventListener('resize',()=>casting.resize());
let ch2Precision=0;
const CH2_TITLES=[
  ['Raw casting.','As poured: rough as-cast iron, straight from the shell mould.'],
  ['Fettled.','Gates and risers removed; the surface cleaned and dressed.'],
  ['Machined component.','HMC, VMC & CNC turning — assembly-ready to drawing, ±tolerance.'],
];
function sectionProgress(sec){const r=sec.getBoundingClientRect();const tot=sec.offsetHeight-innerHeight;return tot<=0?0:clamp(-r.top/tot);}
function sectionPresence(sec){const r=sec.getBoundingClientRect(),vh=innerHeight,band=vh*0.5;return Math.min(clamp((band-r.top)/band),clamp((r.bottom-(vh-band))/band));}

// Chapter 3 (examine) shares the casting stage
const ch3=document.getElementById('ch3');
const ch3Overlay=document.getElementById('ch3-overlay');
const tRail=document.querySelector('#ch2-stage .t-rail');
let _ch2clock=performance.now(), dragOn=false;

function tickCasting(){
  const p2=REDUCED?0:sectionPresence(ch2);
  const p3=REDUCED?1:sectionPresence(ch3);
  const pres=Math.max(p2,p3);
  ch2Stage.style.opacity=String(pres);
  ch2Stage.style.visibility=pres>0.001?'visible':'hidden';
  const now=performance.now();const dt=Math.min((now-_ch2clock)/1000,0.05);_ch2clock=now;
  if(pres<=0.001){ if(dragOn){casting.enableDrag(false);dragOn=false;} ch3Overlay.style.visibility='hidden'; return; }

  const examine = p3>0.02 && p3>=p2;   // we're in Chapter 3
  if(examine){
    casting.setPrecision(1);                          // fully machined
    if(!dragOn){casting.enableDrag(true);casting.setAutoYaw(true);dragOn=true;}
    ch3Overlay.style.visibility='visible';
    ch3Overlay.style.opacity=String(clamp((p3-0.08)/0.3));
    ch2Copy.style.opacity='0'; if(tRail)tRail.style.opacity='0';
  }else{
    if(dragOn){casting.enableDrag(false);casting.setAutoYaw(true);dragOn=false;}
    ch3Overlay.style.opacity='0'; ch3Overlay.style.visibility='hidden';
    if(tRail)tRail.style.opacity='1';
    const t=REDUCED?0.6:sectionProgress(ch2);
    ch2Precision=lerp(ch2Precision,t,0.12);
    casting.setPrecision(ch2Precision);
    ch2Prog.style.width=(t*100)+'%';
    const step=t<0.34?0:(t<0.7?1:2);
    tSteps.forEach((el,i)=>el.classList.toggle('on',i<=step));
    if(ch2Title.dataset.step!=String(step)){ch2Title.dataset.step=String(step);
      ch2Title.textContent=CH2_TITLES[step][0];ch2Desc.textContent=CH2_TITLES[step][1];}
    ch2Copy.style.opacity=String(clamp((p2-0.1)/0.3));
  }
  casting.tick(dt);
}

/* ── Chapter 4: spectro verification (one-shot fill) ── */
const ch4=document.getElementById('ch4');
const spectroEl=document.getElementById('ch4-spectro');
const verifiedEl=document.getElementById('ch4-verified');
const ELEMENTS=[['C','Carbon',3.4,'%',0.82],['Si','Silicon',2.1,'%',0.62],['Mn','Manganese',0.65,'%',0.45],['Mg','Magnesium',0.045,'%',0.3],['S','Sulphur',0.09,'%',0.22],['P','Phosphorus',0.08,'%',0.2]];
const specRows=ELEMENTS.map(([sym,_n,val,unit,bar])=>{
  const row=document.createElement('div');row.className='spec-row';
  row.innerHTML=`<span class="spec-el">${sym}</span><div class="spec-bar"><div class="spec-fill"></div></div><span class="spec-val">0${unit}</span>`;
  spectroEl.insertBefore(row,verifiedEl);
  return {fill:row.querySelector('.spec-fill'),val:row.querySelector('.spec-val'),target:val,unit,bar};
});
function runSpectro(){
  const start=performance.now();const DUR=1700;
  (function step(){const e=performance.now()-start;
    specRows.forEach((r,i)=>{const d=clamp((e-i*120)/900);r.fill.style.width=(d*r.bar*100)+'%';
      const v=r.target*d;r.val.textContent=(r.target<0.1?v.toFixed(3):v.toFixed(2))+r.unit;});
    if(e>DUR) verifiedEl.classList.add('in'); else requestAnimationFrame(step);})();
}
new IntersectionObserver(es=>{if(es[0].isIntersecting){runSpectro();}},{threshold:0.4}).observe(ch4);

/* ── Chapter 5: horizontal process ── */
const ch5=document.getElementById('ch5');
const ch5Track=document.getElementById('ch5-track');
const ch5Count=document.getElementById('ch5-count');
function tickCh5(){
  const r=ch5.getBoundingClientRect();
  if(r.bottom<-50||r.top>innerHeight+50)return;
  const t=sectionProgress(ch5);
  const maxX=Math.max(0,ch5Track.scrollWidth-innerWidth+ (innerWidth*0.05));
  ch5Track.style.transform=`translate3d(${-t*maxX}px,0,0)`;
  ch5Count.textContent=`0${Math.min(5,Math.floor(t*4.99)+1)} / 05`;
}

/* ── Chapter 6: legacy counters (one-shot) ── */
const ch6=document.getElementById('ch6');
function runCounters(){
  document.querySelectorAll('#ch6 .ch6-stat').forEach((el,i)=>{
    const numEl=el.querySelector('.num');const target=+el.dataset.count;const pre=el.dataset.prefix||'';const suf=el.dataset.suffix||'';
    const start=performance.now()+i*100;
    (function step(){const e=performance.now()-start;if(e<0){requestAnimationFrame(step);return;}
      const d=clamp(e/1600);const v=Math.round((1-Math.pow(1-d,3))*target);numEl.textContent=pre+v+suf;
      if(d<1)requestAnimationFrame(step);})();
  });
}
new IntersectionObserver(es=>{if(es[0].isIntersecting){runCounters();}},{threshold:0.35}).observe(ch6);

/* ── Chapter 7: globe ── */
const ch7=document.getElementById('ch7');
const globeCanvas=document.getElementById('story-globe');
const storyGlobe=createStoryGlobe(globeCanvas);
addEventListener('resize',()=>storyGlobe.resize());
let _gclk=performance.now();
function tickGlobe(){
  const r=ch7.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight)return;
  const now=performance.now();const dt=Math.min((now-_gclk)/1000,0.05);_gclk=now;
  storyGlobe.tick(dt);
}

let dispFrame=0,_lastDrawn=-1;
function loop(){
  requestAnimationFrame(loop);
  // ── Chapter 1 (pour) ──
  const t=REDUCED?0.5:ch1Progress();
  const presence=REDUCED?1:ch1Presence();
  stage.style.opacity=String(presence);
  stage.style.visibility=presence>0.001?'visible':'hidden';
  if(presence>0.001){
    const target=t*(FRAME_COUNT-1);
    dispFrame=lerp(dispFrame,target,REDUCED?1:0.32);
    const idx=Math.round(dispFrame);
    if(idx!==_lastDrawn){ drawCover(nearestLoaded(idx)); _lastDrawn=idx; }
    setBeats(t);
    progEl.style.width=(t*100)+'%';
  }
  // ── Chapters 2 + 3 (casting transform + examine) ──
  tickCasting();
  // ── Chapter 5 (horizontal process) ──
  tickCh5();
  // ── Chapter 7 (globe) ──
  tickGlobe();
}

function start(){
  started=true;
  resize();
  loaderEl.classList.add('hide');
  loop();
}

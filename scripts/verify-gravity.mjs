import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.portrait.ready');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;c.intro.duration=.01;
    Object.assign(c.shader,{fragmentation:1,zoom:1,centerX:0,centerY:0,randomness:0,fragmentSpin:0,fragmentDepth:0,flightDepth:0,windCurl:0,streamReach:0,driftSpread:1,dissolveStart:-.5,dissolveEnd:-.4,particleTravel:.6,particleSpeed:.35,debrisDensity:0});
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d'),r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(600,600);
    const sample=t=>{
      r.render(0,'human',false,{x:-2,y:-2,strength:0},0,1,t);
      const g=r.gl,a=new Uint8Array(600*600*4);g.readPixels(0,0,600,600,g.RGBA,g.UNSIGNED_BYTE,a);
      let n=0,x=0,y=0;for(let i=3;i<a.length;i+=4)if(a[i]>40){n++;x+=((i-3)/4)%600;y+=Math.floor((i-3)/4/600);}
      return {x:x/n,y:y/n,n};
    };
    const directions=[];
    for(const x of [10,14,18,22])for(const y of [6,10,14,18]){
      ctx.clearRect(0,0,256,256);ctx.fillStyle='#00ff00';ctx.fillRect(x/32*256,y/24*256,256/32,256/24);r.updateSource(source);
      const home=sample(0),flight=sample(.6);
      directions.push({dx:flight.x-home.x,dy:flight.y-home.y,ratio:flight.n/home.n});
    }
    const error=r.gl.getError();r.dispose();
    const img=new Image();img.src=config.portrait;await img.decode();
    const p=structuredClone(config);p.shader.fragmentation=1;
    const photo=new PortraitGL(document.createElement('canvas'),img,p);photo.resize(640,640);
    const capture=()=>{
      photo.render(0,'human',true,{x:-2,y:-2,strength:0},0,1,0);
      const g=photo.gl,a=new Uint8Array(640*640*4);g.readPixels(0,0,640,640,g.RGBA,g.UNSIGNED_BYTE,a);return a;
    };
    const original=capture(),coarseVertices=photo.vertexCount;p.shader.fragmentation=2;photo.applyConfig();const fine=capture(),fineVertices=photo.vertexCount;
    const changed=original.reduce((n,v,i)=>n+(Math.abs(v-fine[i])>12),0)/original.length;
    photo.dispose();return {directions,error,changed,coarseVertices,fineVertices};
  });
  for(const [axis,sign] of [['dx',1],['dx',-1],['dy',1],['dy',-1]])assert.ok(result.directions.filter(d=>d[axis]*sign>8).length>=3,'Shards travel in every screen direction, with no common wind');
  assert.ok(result.directions.every(d=>d.ratio>.8&&d.ratio<1.2),'Every isolated shard carries its own source pixels without duplication');
  assert.equal(result.fineVertices,result.coarseVertices*4,'Each character is split into four independently movable pieces');
  assert.ok(result.changed<.003,'Subdivision preserves the assembled portrait');assert.equal(result.error,0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const desktop=await page.evaluate(()=>new Promise(resolve=>{let last=0;const deltas=[];const f=t=>{if(last)deltas.push(t-last);last=t;if(deltas.length<60)requestAnimationFrame(f);else{deltas.sort((a,b)=>a-b);resolve({median:deltas[30],p95:deltas[57]});}};requestAnimationFrame(f);}));
  await page.setViewportSize({width:390,height:844});
  const phone=await page.evaluate(()=>new Promise(resolve=>{let last=0;const deltas=[];const f=t=>{if(last)deltas.push(t-last);last=t;if(deltas.length<60)requestAnimationFrame(f);else{deltas.sort((a,b)=>a-b);resolve({median:deltas[30],p95:deltas[57]});}};requestAnimationFrame(f);}));
  assert.deepEqual(errors,[]);console.log('Zero-gravity source motion, subdivision and frame timing:',{...result,desktop,phone});
}finally{await browser.close();}

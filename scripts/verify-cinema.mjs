import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.portrait.ready');
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs');
    const original=PortraitGL.prototype.render;
    window.cinemaFrames=[];
    PortraitGL.prototype.render=function(...args){
      const result=original.apply(this,args);
      window.cinemaFrames.push({text:!!this.options.text,phase:args[1],light:args[4],assembly:args[5],breakup:args[6]});
      return result;
    };
  });
  const checkCue=async()=>{
    await page.waitForFunction(()=>window.cinemaFrames.some(f=>f.assembly===1));
    return page.evaluate(()=>{
      const frames=window.cinemaFrames,photo=frames.filter(f=>!f.text),cue=photo.find(f=>f.light>0);
      return {cue,early:photo.some(f=>f.assembly<.9&&f.light>0),synced:frames.every((f,i)=>f.text||!frames[i+1]||frames[i+1].light===f.light),end:photo.find(f=>f.assembly===1)};
    });
  };
  const first=await checkCue();
  assert.ok(first.cue.assembly>=.9&&first.cue.assembly<.93,'Ignition lands during the final assembly beat');
  assert.ok(!first.early&&first.synced,'Photo and text share the exact cue, with no early ignition');
  assert.ok(first.end.breakup>=.45,'Edge erosion runs through the cue without an idle beat');
  await page.screenshot({path:'output/cinema-desktop.png'});
  await page.evaluate(()=>{window.cinemaFrames=[];document.querySelector('[data-scene="replay"]').click();});
  const replay=await checkCue();
  assert.ok(replay.cue.assembly>=.9&&replay.cue.assembly<.93,'Replay restages the same timed ignition');
  await page.emulateMedia({reducedMotion:'reduce'});
  const depth=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(20/32*256,8/24*256,256/32,256/24);
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,randomness:0,fragmentSpin:0,fragmentDepth:0,windCurl:0,streamReach:0,dissolveStart:.2,dissolveEnd:.3,particleSpeed:.35,debrisDensity:1});
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(600,600);
    r.gl.uniform1f(r.uniforms.entranceSeed,7);
    const pointer={x:-2,y:-2,strength:0};
    const sample=(depth,assembly=1,time=0,reduced=false)=>{
      c.shader.flightDepth=depth;r.applyConfig();r.render(0,'human',reduced,pointer,0,assembly,time);
      const g=r.gl,a=new Uint8Array(600*600*4);g.readPixels(0,0,600,600,g.RGBA,g.UNSIGNED_BYTE,a);return a;
    };
    const difference=(a,b)=>a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>10),0);
    const home=difference(sample(0),sample(1));
    const reduced=difference(sample(0,1,60,true),sample(1,1,60,true));
    const incoming=difference(sample(0,.5),sample(1,.5));
    let outgoing=0;
    for(let t=.4;t<2;t+=.1)outgoing=Math.max(outgoing,difference(sample(0,1,t),sample(1,1,t)));
    for(let i=0;i<=180;i++)r.updateInteraction(i/60,false,{...pointer,reveal:1});
    const restored=difference(sample(0,1,60),sample(1,1,60));
    const error=r.gl.getError();r.dispose();return {home,reduced,incoming,outgoing,restored,error};
  });
  assert.equal(depth.home+depth.reduced+depth.restored+depth.error,0,'Depth leaves home, restored and reduced-motion pixels exact');
  assert.ok(depth.incoming>40&&depth.outgoing>40,'Near/far projection changes both incoming and outgoing source cells');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/cinema-phone.png'});
  assert.deepEqual(errors,[]);
  console.log('Cinematic timing, replay, synchronized cue and source-cell depth passed:',{first,replay,depth});
}finally{await browser.close();}

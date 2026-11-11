import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {sceneTimeline} from '../site/timeline.mjs';
import {publishedLook} from '../site/config.mjs';
for(let t=0;t<600;t+=.05){
  const a=sceneTimeline(t,publishedLook),b=sceneTimeline(t+.001,publishedLook);
  assert.ok(a.erosion>=0&&a.erosion<3.6,'The timeline remains bounded over ten minutes');
  assert.ok(Math.abs(a.erosion-b.erosion)<.003,'No jump at cycle or direction boundaries');
}
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.portrait.ready');
  const samples=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs'),{sceneTimeline}=await import('/timeline.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const c=structuredClone(config);Object.assign(c.shader,{scrambleHz:0,glitchBandSpeed:0,densityJitter:0});
    const photo=new PortraitGL(document.createElement('canvas'),image,c);photo.resize(640,640);
    const text=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),c,matchMedia('(prefers-reduced-motion: reduce)'));
    text.renderer.options.clear=true;
    const read=r=>{const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;};
    const count=a=>a.reduce((n,v,i)=>n+(i%4===3&&v>24),0);
    const probe=r=>{
      r.gl.useProgram(r.program);r.gl.uniform1f(r.uniforms.entranceSeed,7);
      const draw=(t,reduced=false)=>{r.render(0,'human',reduced,{x:-2,y:-2,strength:0},0,1,sceneTimeline(t,c.shader).erosion);return read(r);};
      const full=count(draw(0)),times=[2,6,10,14,18,23,27.6,40,53.6,60,120,300,600];
      const frames=times.map(t=>({time:t,count:count(draw(t))}));
      for(let i=0;i<180;i++)r.updateInteraction(i/60,false,{x:-2,y:-2,strength:0,reveal:1});
      const gathered=count(draw(14));r.resetInteraction();
      return {full,frames,gathered,reduced:count(draw(300,true)),reducedHome:count(draw(0,true)),error:r.gl.getError()};
    };
    const result={photo:probe(photo),text:probe(text.renderer)};photo.dispose();text.dispose();
    // Direct the live page to particular times for visual inspection. Only the
    // browser test changes these arguments; the shipped page uses its own clock.
    const render=PortraitGL.prototype.render;window.timelineAt=6;
    PortraitGL.prototype.render=function(...args){
      args[5]=1;args[6]=sceneTimeline(window.timelineAt,config.shader).erosion;
      const result=render.apply(this,args);
      if(this.options.text&&window.captureTimeline){const resolve=window.captureTimeline;window.captureTimeline=null;resolve(count(read(this)));}
      return result;
    };
    return result;
  });
  console.log('Timeline samples:',JSON.stringify(samples));
  for(const [name,sample] of Object.entries(samples)){
    assert.ok(sample.frames.every(f=>f.count>sample.full*(name==='text'?.65:.42)),`${name} stays present at every sampled time`);
    assert.ok(sample.frames.find(f=>f.time===27.6).count>sample.frames.find(f=>f.time===14).count*(name==='text'?1.03:1.1),`${name} reconstructs after erosion`);
    assert.ok(sample.gathered>=sample.full*.99&&sample.reduced===sample.reducedHome,'Gather and reduced motion preserve the original');
    assert.equal(sample.error,0);
  }
  await page.waitForSelector('[data-entrance="settled"]');
  for(const [time,label] of [[6,'readable'],[14,'erosion'],[23,'return']]){
    await page.evaluate(t=>window.timelineAt=t,time);await page.waitForTimeout(300);
    await page.screenshot({path:`output/timeline-${label}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.timelineAt=14);await page.waitForTimeout(300);
  await page.screenshot({path:'output/timeline-phone.png'});
  const pixels=()=>page.evaluate(()=>new Promise(resolve=>window.captureTimeline=resolve));
  const eroded=await pixels();
  await page.getByRole('button',{name:'Reveal',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);const revealed=await pixels();
  assert.ok(revealed>eroded*1.05,'Keyboard Reveal gathers the living scene at its crest');
  await page.getByRole('button',{name:'Release',exact:true}).click();await page.mouse.move(389,843);
  await page.waitForTimeout(2200);const released=await pixels();
  assert.ok(released<revealed*.98&&released>0,'Release rejoins the current erosion, never black');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:480,id:1}]});
  await page.waitForTimeout(3600);const gathered=await pixels();
  assert.ok(gathered>released*1.05,'Holding on the portrait restores the living scene');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>!document.querySelector('.gather-cursor').classList.contains('held'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('Living timeline, reconstruction, readable text, restoration and phone layout passed.');
}finally{await browser.close();}

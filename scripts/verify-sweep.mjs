import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const {TextEffect}=await import('/text-effect.mjs');
    const read=r=>{const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;};
    const count=a=>a.reduce((n,v,i)=>n+(i%4===3&&v>12),0);
    const departures=[];
    for(const x of [3,16,29]){
      const source=document.createElement('canvas');source.width=source.height=256;
      const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(x/32*256,8/24*256,256/32,256/24);
      const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
      Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,dissolveStart:.67,dissolveEnd:.77,sweepDuration:8,particleSpeed:1,randomness:0});
      const r=new PortraitGL(document.createElement('canvas'),source,c);r.resize(600,600);
      let lastVisible=0;
      for(let t=0;t<=12;t+=.25){r.render(0,'human',false,{x:-2,y:-2,strength:0},0,1,t);if(count(read(r))>2)lastVisible=t;}
      departures.push(lastVisible);r.dispose();
    }
    const image=new Image();image.src=config.portrait;await image.decode();
    const c=structuredClone(config);Object.assign(c.shader,{zoom:1,centerX:0,centerY:0});
    const r=new PortraitGL(document.createElement('canvas'),image,c);r.resize(600,600);
    const samples=[];
    for(const t of [0,6,12,18,30,60]){r.render(0,'human',false,{x:-2,y:-2,strength:0},0,1,t);samples.push(count(read(r)));}
    // Stress the flight primitive at full erosion. The production timeline is
    // bounded and uses a lower text amount, covered by verify-timeline.
    const textConfig=structuredClone(config);textConfig.shader.textBreakup=1;
    const effect=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),textConfig,matchMedia('(prefers-reduced-motion: reduce)'));
    effect.renderer.options.clear=true;
    effect.render(0,'human',false,0,60);const emptyText=count(read(effect.renderer));
    effect.pointer.x=effect.pointer.tx=.3;effect.pointer.y=effect.pointer.ty=.3;effect.pointer.targetStrength=1;
    for(let i=1;i<=60;i++)effect.render(i/60,'human',false,0,60);
    const restoredText=count(read(effect.renderer));
    effect.leave();for(let i=61;i<=240;i++)effect.render(i/60,'human',false,0,60);
    const releasedText=count(read(effect.renderer));
    effect.dispose();r.dispose();
    return {departures,samples,emptyText,restoredText,releasedText};
  });
  assert.ok(result.departures[1]>result.departures[0]&&result.departures[0]>result.departures[2],'The silhouette releases before the facial core, with a slight right-side bias');
  assert.ok(result.samples[0]>result.samples[1]&&result.samples[1]>result.samples[2]);
  assert.equal(result.samples[4],0);assert.equal(result.samples[5],0,'Completed dissolution does not respawn');
  assert.equal(result.emptyText,0);assert.ok(result.restoredText>100,'Hover restores actual text pixels after full dissolution');assert.equal(result.releasedText,0);
  // Accelerate the visual clock only in this test to inspect the fully dissolved UI.
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
    window.forceGone=true;
    PortraitGL.prototype.render=function(...args){if(window.forceGone)args[6]=60;return render.apply(this,args);};
  });
  await page.waitForSelector('[data-entrance="settled"]');
  await page.waitForTimeout(100);await page.screenshot({path:'output/sweep-empty.png'});
  const target=await page.locator('.ai-letter').first().boundingBox();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2);await page.waitForTimeout(600);
  await page.screenshot({path:'output/sweep-restore-text.png'});
  await page.mouse.move(0,0);
  await page.locator('.tuner-toggle').click();
  await page.evaluate(()=>window.forceGone=false);
  await page.getByRole('button',{name:'Restart cycle',exact:true}).click();
  const clock=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl'),p=g.getParameter(g.CURRENT_PROGRAM);return g.getUniform(p,g.getUniformLocation(p,'breakupTime'));});
  assert.ok(clock<.2,'Replay restarts the sweep clock');
  assert.deepEqual(errors,[]);console.log('Sweep QA passed:',result);
}finally{await browser.close();}

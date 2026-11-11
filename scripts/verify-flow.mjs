import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('[data-entrance="settled"]');
  const liveClock=await page.locator('canvas').evaluate(c=>{
    const g=c.getContext('webgl'),p=g.getParameter(g.CURRENT_PROGRAM);
    return g.getUniform(p,g.getUniformLocation(p,'breakupTime'));
  });
  assert.ok(liveClock>=.45,'Live edge erosion is already underway when the final cells arrive');
  const results=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const {sceneTimeline}=await import('/timeline.mjs');
    const img=new Image();img.src=config.portrait;await img.decode();
    const c=structuredClone(config);Object.assign(c.shader,{scrambleHz:0,glitchBandSpeed:0,densityJitter:0});
    const photo=new PortraitGL(document.createElement('canvas'),img,c);photo.resize(640,640);
    const text=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),c,matchMedia('(prefers-reduced-motion: reduce)'));
    text.renderer.options.clear=true;
    const read=r=>{const g=r.gl,p=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);return p;};
    const diff=(a,b)=>a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>12),0);
    const probe=r=>{
      r.gl.useProgram(r.program);r.gl.uniform1f(r.uniforms.entranceSeed,7);
      const sample=(t,breakup=sceneTimeline(Math.max(0,t-4.8*.72),c.shader).erosion)=>{
        r.render(0,'human',false,{x:-2,y:-2,strength:0},0,Math.min(t/4.8,1),breakup);return read(r);
      };
      const overlapping=diff(sample(4.56),sample(4.56,0));
      const a=sample(4.78),b=sample(4.79),d=sample(4.8),e=sample(4.81);
      const before=diff(a,b),seam=diff(b,d),after=diff(d,e);
      return {overlapping,before,seam,after};
    };
    const photoFlow=probe(photo),textFlow=probe(text.renderer);
    // Jump across a small brush in one frame: cells between the endpoints must respond.
    const stroke={x:.2,y:.4,strength:1,radius:.035,trail:.9};
    photo.resetInteraction();photo.updateInteraction(0,false,stroke);
    photo.updateInteraction(1/60,false,{...stroke,x:.55});
    const at=(x,y)=>photo.interactions[(Math.floor(y*photo.meshRows)*photo.meshColumns+Math.floor(x*photo.meshColumns))*12];
    const middle=at(.375,.4),outside=at(.375,.7);
    photo.updateInteraction(2/60,false,{...stroke,x:.55,strength:0});
    const lingering=at(.375,.4);
    photo.dispose();text.dispose();
    return {photoFlow,textFlow,middle,outside,lingering};
  });
  for(const result of [results.photoFlow,results.textFlow]){
    assert.ok(result.overlapping>500,'Real source pixels are leaving while the final cells arrive');
    assert.ok(result.seam<Math.max(result.before,result.after)*2+100,'No discontinuity at the end of the intro clock');
    assert.ok(result.after>100,'Motion continues immediately after assembly');
  }
  assert.ok(results.middle>.7&&results.outside===0,'Fast strokes restore their path without affecting distant cells');
  assert.ok(results.lingering>.5,'The stroke leaves a lingering trail');
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForTimeout(4500);await page.screenshot({path:'output/flow-handoff.png'});
  await page.waitForTimeout(1200);await page.screenshot({path:'output/flow-stream.png'});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForTimeout(5300);await page.screenshot({path:'output/flow-mobile.png'});
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto('http://localhost:8080');await phone.waitForSelector('[data-entrance="settled"]');
  assert.equal(await phone.locator('.portrait').evaluate(e=>getComputedStyle(e).touchAction),'pinch-zoom');
  const bounds=await phone.locator('.portrait').boundingBox(),cdp=await phone.context().newCDPSession(phone);
  const point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height*.4,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await phone.waitForTimeout(100);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,y:point.y+65}]});
  await phone.waitForTimeout(250);
  assert.ok(await phone.locator('.gather-cursor').evaluate(e=>e.classList.contains('held')),'Vertical drawing on the portrait remains a reveal gesture');
  await phone.screenshot({path:'output/flow-phone-touch.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>!document.querySelector('.gather-cursor').classList.contains('held'));
  assert.deepEqual(errors,[]);console.log('Continuous flow QA passed:',{liveClock,...results});
} finally {await browser.close();}

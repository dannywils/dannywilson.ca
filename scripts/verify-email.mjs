import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/assets/portrait.webp',async route=>{await gate;await route.continue();});
  await page.goto('http://localhost:8080',{waitUntil:'domcontentloaded'});
  const email=page.locator('.email');
  assert.equal(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','No static email flashes before assembly');
  await page.keyboard.press('Tab');
  assert.ok(await email.evaluate(e=>e===document.activeElement));
  assert.notEqual(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','Keyboard focus exposes the contact immediately');
  await email.evaluate(e=>e.blur());release();
  await page.waitForSelector('.identity.text-ready');
  await page.waitForTimeout(1900);await page.screenshot({path:'output/email-arriving-phone.png'});
  await page.getByRole('button',{name:'Skip entrance'}).click();
  assert.equal(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','The DOM glyphs stay hidden behind the ASCII email');
  const pixels=await page.evaluate(async()=>{
    const {TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const e=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    const r=e.renderer;r.options.clear=true;
    // Isolate real email source pixels, keeping the same mesh and source bounds.
    e.source.getContext('2d').clearRect(0,0,e.source.width,e.emailRegion[1]*e.source.height);
    r.updateSource(e.source);r.gl.uniform1f(r.uniforms.entranceSeed,7);
    const sample=(assembly,breakup=0,visible=true,time=0)=>{
      r.showAnchored(visible);r.render(time,'human',false,{x:-2,y:-2,strength:0},0,assembly,breakup);
      const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);
      let count=0,sumX=0;for(let i=3;i<a.length;i+=4)if(a[i]>20){count++;sumX+=((i-3)/4)%r.canvas.width;}
      return {count,x:sumX/Math.max(count,1),a};
    };
    const start=sample(0),flight=sample(.45),home=sample(1),held=sample(1,60),handoff=sample(.999),hidden=sample(1,0,false),rewritten=sample(1,0,true,.37);
    const result={start:start.count,flight:flight.count,flightX:flight.x,home:home.count,homeX:home.x,protected:home.a.every((v,i)=>v===held.a[i]),exactLanding:home.a.every((v,i)=>v===handoff.a[i]),hidden:hidden.count,rewritten:home.a.reduce((n,v,i)=>n+(Math.abs(v-rewritten.a[i])>25),0),error:r.gl.getError()};
    e.dispose();return result;
  });
  assert.equal(pixels.start,0);assert.ok(pixels.flight>20&&pixels.home>100);
  assert.ok(pixels.flightX<pixels.homeX-10,'Email source fragments travel in from the left');
  assert.ok(pixels.protected&&pixels.exactLanding,'Email stays intact after its exact landing');
  assert.equal(pixels.hidden,0,'Email visibility mask still works');assert.equal(pixels.error,0);
  assert.ok(pixels.rewritten>100,'The assembled email retains animated ASCII characters');
  await page.waitForSelector('.email-settled');
  await email.evaluate(e=>e.addEventListener('click',event=>{event.preventDefault();window.emailClicked=true;}));
  await email.click();assert.ok(await page.evaluate(()=>window.emailClicked));
  assert.equal(await email.getAttribute('href'),'mailto:danny@dannywilson.ca');
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForFunction(()=>!document.querySelector('.identity').classList.contains('email-settled'));
  assert.equal(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForSelector('.email-settled',{timeout:1500});
  assert.equal(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','Reduced motion preserves the ASCII email');
  await page.keyboard.press('Tab');await email.focus();
  assert.equal(await email.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','Focusing the link does not replace its ASCII texture');
  assert.notEqual(await email.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  await email.evaluate(e=>e.blur());
  await page.screenshot({path:'output/email-ascii-phone.png'});
  const still=await page.locator('canvas').first().screenshot();await page.waitForTimeout(200);
  assert.deepEqual(await page.locator('canvas').first().screenshot(),still);
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(150);
  await page.screenshot({path:'output/email-ascii-desktop.png'});
  assert.deepEqual(errors,[]);console.log('Email ASCII texture, entrance, focus, exact landing, protected source pixels, link, Replay and reduced motion passed:',pixels);
}finally{await browser.close();}

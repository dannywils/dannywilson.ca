import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  await page.evaluate(async()=>{
    const {TextEffect}=await import('/text-effect.mjs');
    const render=TextEffect.prototype.render;
    TextEffect.prototype.render=function(...args){window.textEffectForTest=this;return render.apply(this,args);};
  });
  await page.waitForFunction(()=>window.textEffectForTest);
  await page.waitForSelector('[data-entrance="settled"]');
  const pixelChecks=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const canvas=document.createElement('canvas'),photo=new PortraitGL(canvas,image,structuredClone(config));photo.resize(640,640);
    const read=r=>{const gl=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);gl.readPixels(0,0,r.canvas.width,r.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
    const sample=(assembly,breakup)=>{photo.render(4.8,'human',false,{x:-2,y:-2,strength:0},0,assembly,breakup);return read(photo);};
    const before=sample(.999,0),settled=sample(1,0),first=sample(1,.05),later=sample(1,3);
    const handoffChanged=settled.reduce((n,v,i)=>n+(Math.abs(v-before[i])>4),0);
    const launchChanged=settled.reduce((n,v,i)=>n+(Math.abs(v-first[i])>4),0);
    const laterChanged=settled.reduce((n,v,i)=>n+(Math.abs(v-later[i])>12),0);photo.dispose();
    const effect=window.textEffectForTest,textCanvas=document.createElement('canvas');
    const text=new PortraitGL(textCanvas,effect.source,structuredClone(effect.textConfig),{text:true});
    text.setIdentityBounds(effect.identityRegions);
    text.resize(1440,1000,effect.bounds);
    text.render(0,'human',false,{x:-2,y:-2,strength:0},0,0,0);
    const introEmpty=read(text).every(v=>v===0);
    const textSample=(time,phase='human',light=0)=>{text.render(time,phase,false,{x:-2,y:-2,strength:0},light,1,time);return read(text);};
    const intact=textSample(0),broken=textSample(4),red=textSample(0,'takeover',1);
    let namePixels=0,departed=0,accentRed=0,otherRed=0;
    const h=document.querySelector('h1').getBoundingClientRect();
    const accents=[...document.querySelectorAll('.ai-letter')].map(e=>e.getBoundingClientRect());
    for(let y=Math.ceil(h.top);y<h.bottom;y++)for(let x=Math.ceil(h.left);x<h.right;x++){
      const i=((1000-1-y)*1440+x)*4;
      if(intact[i]>80){namePixels++;if(broken[i]<20)departed++;}
      if(red[i]>70&&red[i]>red[i+1]*3&&red[i]>red[i+2]*3){
        if(accents.some(b=>x>=b.left-45&&x<=b.right+45&&y>=b.top-45&&y<=b.bottom+45))accentRed++;else otherRed++;
      }
    }
    const result={introEmpty,handoffChanged,launchChanged,laterChanged,namePixels,departed,accentRed,otherRed,error:text.gl.getError()};text.dispose();return result;
  });
  assert.equal(pixelChecks.handoffChanged,0,'Assembly hands off without a jump');
  assert.ok(pixelChecks.introEmpty,'Text begins as incoming fragments rather than complete letters');
  assert.ok(pixelChecks.launchChanged>0&&pixelChecks.launchChanged<pixelChecks.laterChanged*.15,'The first 50 ms begin moving gradually, with no dead interval');
  assert.ok(pixelChecks.laterChanged>1000,'Disintegration still starts progressively');
  assert.ok(pixelChecks.namePixels>10000&&pixelChecks.departed>500,'Actual letter pixels leave their original positions');
  assert.equal(pixelChecks.accentRed+pixelChecks.otherRed,0,'The entire name stays neutral during the eye flicker');
  assert.equal(pixelChecks.error,0);
  const letter=await page.locator('.ai-letter').first().boundingBox();
  await page.mouse.move(letter.x+letter.width/2,letter.y+letter.height/2);await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>window.textEffectForTest.pointer.strength>.95),'Name hover activates local restoration');
  await page.screenshot({path:'output/text-hover.png'});
  await page.mouse.move(0,0);await page.waitForTimeout(900);
  assert.ok(await page.evaluate(()=>window.textEffectForTest.pointer.strength<.001));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  const name=await page.locator('h1').boundingBox(),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:name.x+name.width*.4,y:name.y+name.height*.3,id:1}]});
  await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>window.textEffectForTest.pointer.strength>.95));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);
  assert.ok(await page.evaluate(()=>window.textEffectForTest.pointer.strength<.001));
  await page.locator('.email').evaluate(e=>e.addEventListener('click',event=>{event.preventDefault();window.emailClicked=true;}));
  await page.locator('.email').click();assert.ok(await page.evaluate(()=>window.emailClicked));
  assert.equal(await page.locator('.email').getAttribute('href'),'mailto:danny@dannywilson.ca');
  await page.screenshot({path:'output/text-mobile.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  const still=await page.locator('canvas').screenshot();await page.waitForTimeout(200);
  assert.deepEqual(await page.locator('canvas').screenshot(),still);
  assert.deepEqual(errors,[]);console.log('Text and handoff QA passed:',pixelChecks);
}finally{await browser.close();}

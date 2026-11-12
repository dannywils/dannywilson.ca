import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const base=process.env.SITE_URL||'http://localhost:8081';
try{
 const page=await browser.newPage({deviceScaleFactor:2,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390],[667,375],[1440,900]]){
  await page.setViewportSize({width,height});await page.goto(base);
  await page.waitForSelector('.identity.text-ready',{state:'attached'});
  await page.evaluate(async()=>{
   const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
   window.layers={};
   PortraitGL.prototype.render=function(...args){
    args[0]=14;args[5]=1;args[7]=.6;const result=render.apply(this,args);
    window.layers[this.options.text?'text':'portrait']={bounds:this.bounds,placement:this.placement,profile:this.gradientProfile,
     image:[this.sourceWidth,this.sourceHeight],pointer:{x:args[3].x,y:args[3].y},error:this.gl.getError()};return result;
   };
  });
  await page.waitForFunction(()=>window.layers.text);
  const state=await page.evaluate(()=>{
   const {bounds:b,placement:p,image:[iw,ih]}=window.layers.portrait;
   const scale=Math.min(b.width/iw,b.height/ih)*p.zoom,w=iw*scale,h=ih*scale;
   const cx=b.left+b.width/2+p.centerX*w,cy=b.top+b.height/2+p.centerY*h;
   const names=[...document.querySelectorAll('.name-line')].map(el=>{const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();return {left:b.left,right:b.right,bottom:b.bottom};});
   const email=document.querySelector('.email-button').getBoundingClientRect();
   return {face:{left:cx-.25*w,right:cx+.25*w,top:cy-.49*h,chin:cy+.2*h},names,
    layers:window.layers,email:{left:email.left,right:email.right,top:email.top,bottom:email.bottom},
    scrolling:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
  });
  assert.equal(state.scrolling,false);assert.equal(state.layers.portrait.error+state.layers.text.error,0);
  assert.ok(state.email.left>=0&&state.email.right<=width&&state.email.top>=0&&state.email.bottom<=height);
  if(width<=1000){
   assert.ok(state.face.left>=12&&state.face.right<=width-12,'Full face stays inside the viewport');
   assert.ok(state.face.top>=12&&state.face.chin<height-64,'Head and chin stay clear of viewport edges');
   assert.ok(state.layers.portrait.profile[2]<=4.2&&state.layers.portrait.profile[3]>=2.1,'Compact glyph sizes remain readable');
  }
  if(width<=700&&height>width)assert.ok(state.face.top-Math.max(...state.names.map(n=>n.bottom))>=24,'Name and head have clear separation');
  if(width===1440){assert.equal(state.layers.portrait.placement.centerX,-.3);assert.equal(state.layers.portrait.placement.zoom,1.18);}
  if(width===320||width===390||width===844)await page.screenshot({path:`output/mobile-fix-${width}.png`});
  // A hover at the displayed nose must map to the same source coordinates as
  // drawing. This catches stale desktop offsets in compact hit testing.
  const p=state.layers.portrait,b=p.bounds,[iw,ih]=p.image;
  const scale=Math.min(b.width/iw,b.height/ih)*p.placement.zoom;
  const x=b.left+b.width/2+(.51-.5+p.placement.centerX)*iw*scale;
  const y=b.top+b.height/2+(.425-.5+p.placement.centerY)*ih*scale;
  await page.waitForSelector('.portrait[data-entrance="settled"]',{state:'attached'});
  await page.mouse.move(x,y);
  await page.waitForFunction(()=>Math.abs(window.layers.portrait.pointer.x-.51)<.015&&Math.abs(window.layers.portrait.pointer.y-.425)<.015,null,{timeout:5000});
  assert.deepEqual(errors,[]);console.log(`${width}x${height}: full face, legible glyph range, spacing, contact and pointer alignment passed`);
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>window.layers.portrait.placement.compact&&window.layers.portrait.placement.centerX===0);
 await page.setViewportSize({width:1440,height:900});
 await page.waitForFunction(()=>!window.layers.portrait.placement.compact&&window.layers.portrait.placement.centerX===-.3);
 console.log('Live resize restores the correct framing in both directions.');
}finally{await browser.close();}

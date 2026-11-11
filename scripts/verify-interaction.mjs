import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('[data-entrance="settled"]');
  const sourcePoint={x:.43,y:.35};
  async function screenPoint(){return page.evaluate(async p=>{
    const {config}=await import('/config.mjs'),image=new Image();image.src=config.portrait;await image.decode();
    const b=document.querySelector('.portrait').getBoundingClientRect();
    const scale=Math.min(b.width/image.naturalWidth,b.height/image.naturalHeight)*config.shader.zoom;
    return {x:b.left+b.width/2+(p.x-.5+config.shader.centerX)*image.naturalWidth*scale,
      y:b.top+b.height/2+(p.y-.5+config.shader.centerY)*image.naturalHeight*scale};
  },sourcePoint);}
  async function pointer(){return page.locator('canvas').evaluate(c=>{
    const gl=c.getContext('webgl'),p=gl.getParameter(gl.CURRENT_PROGRAM);
    return {position:Array.from(gl.getUniform(p,gl.getUniformLocation(p,'pointer'))),
      strength:gl.getUniform(p,gl.getUniformLocation(p,'pointerStrength'))};
  });}
  let target=await screenPoint();await page.mouse.move(target.x,target.y);await page.waitForTimeout(450);
  let state=await pointer();assert.ok(state.strength>.95);
  await page.screenshot({path:'output/hover-active.png'});
  assert.ok(Math.abs(state.position[0]-sourcePoint.x)<.005&&Math.abs(state.position[1]-sourcePoint.y)<.005,'Hover maps to source coordinates through zoom and placement');
  await page.mouse.move(0,0);await page.waitForTimeout(900);assert.ok((await pointer()).strength<.001);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);target=await screenPoint();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,id:1}]});
  await page.waitForTimeout(450);state=await pointer();assert.ok(state.strength>.95,'Held touch activates the portrait');
  await page.screenshot({path:'output/touch-active.png'});
  assert.ok(Math.abs(state.position[0]-sourcePoint.x)<.005);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(900);assert.ok((await pointer()).strength<.001,'Lifting a finger releases the effect');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,id:2}]});
  await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForTimeout(900);assert.ok((await pointer()).strength<.001,'Cancelled gestures release the effect');
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=await page.locator('canvas').screenshot();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,id:3}]});
  await page.waitForTimeout(200);assert.deepEqual(await page.locator('canvas').screenshot(),still,'Reduced motion stays static on touch');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const c=structuredClone(config);Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,breakup:1});
    const img=new Image();img.src=c.portrait;await img.decode();
    const make=()=>{const r=new PortraitGL(document.createElement('canvas'),img,c);r.resize(600,600);r.gl.uniform1f(r.uniforms.entranceSeed,7);return r;};
    const active=make(),neutral=make(),p={x:.43,y:.35,strength:1};
    for(let i=0;i<=60;i++)active.updateInteraction(i/60,false,p);
    const cell=(x,y)=>(Math.floor(y*active.meshRows)*active.meshColumns+Math.floor(x*active.meshColumns))*active.interactionStride;
    const near=cell(p.x,p.y),far=cell(.8,.7);
    const strength=active.interactions[near],distant=active.interactions[far];
    let farSourceInfluence=0;
    for(let y=0;y<active.meshRows;y++)for(let x=Math.ceil(active.meshColumns*.8);x<active.meshColumns;x++)
      farSourceInfluence+=active.interactions[(y*active.meshColumns+x)*active.interactionStride];
    const read=r=>{const gl=r.gl,a=new Uint8Array(600*600*4);gl.readPixels(0,0,600,600,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
    active.render(1,'human',false,p,0,1,0);const a=read(active);
    neutral.render(1,'human',false,{x:-2,y:-2,strength:0},0,1,0);const b=read(neutral);
    let changed=0,farChanged=0;
    for(let y=0;y<600;y++)for(let x=0;x<600;x++){const i=(y*600+x)*4;if(Math.abs(a[i]-b[i])>12){changed++;if(x>480)farChanged++;}}
    for(let i=61;i<=360;i++)active.updateInteraction(i/60,false,{...p,strength:0});
    const settled=active.interactions[near];
    active.render(6,'human',false,{...p,strength:0},0,1,0);
    const released=read(active),releasedPixels=released.filter((v,i)=>i%4===3&&v>12).length;
    neutral.render(6,'human',false,{...p,strength:0},0,1,0);const recovered=read(neutral);
    const result={strength,distant,changed,farChanged,farSourceInfluence,settled,releasedPixels,healed:released.every((v,i)=>v===recovered[i]),homePixels:b.filter((v,i)=>i%4===3&&v>0).length,error:active.gl.getError()};
    active.dispose();neutral.dispose();return result;
  });
  assert.ok(result.strength>.9,'Nearby source cells respond to scattering');
  assert.equal(result.distant,0,'Distant source cells remain undisturbed');
  assert.ok(result.homePixels>1000,'The resting scene is visible before touching');
  assert.ok(result.changed>500,'Interaction visibly scatters the local portrait');
  assert.equal(result.farSourceInfluence,0,'The brush only affects nearby source cells');
  assert.ok(result.settled<.02&&result.healed,'Displaced pixels reform exactly after release');
  assert.equal(result.error,0);assert.deepEqual(errors,[]);
  console.log('Interaction QA passed:',result);
} finally {await browser.close();}

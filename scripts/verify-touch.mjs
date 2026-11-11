import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.getByRole('button',{name:'Skip entrance'}).tap();
  await page.waitForSelector('[data-entrance="settled"]');
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){const result=render.apply(this,args);this.testPointer={...args[3]};if(this.options.text)window.touchType=this;else window.touchPhoto=this;return result;};
  });
  assert.equal(await page.locator('.email').evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  const cdp=await page.context().newCDPSession(page);
  const send=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const point={x:195,y:460,id:1};
  const gather=()=>page.locator('.gather-cursor').evaluate(e=>Number(e.style.getPropertyValue('--gather')));
  await send('touchStart',[point]);await page.waitForTimeout(800);
  assert.equal(await gather(),0,'A stationary hold never expands the brush');
  const radius=await page.evaluate(()=>window.touchPhoto.testPointer.radius);
  await page.waitForTimeout(3000);
  const local=await page.evaluate(()=>{
    const r=window.touchPhoto,p=r.testPointer;let near=0,far=0;
    for(let y=0;y<r.meshRows;y++)for(let x=0;x<r.meshColumns;x++){
      const value=r.interactions[(y*r.meshColumns+x)*r.interactionStride];
      const distance=Math.hypot((x+.5)/r.meshColumns-p.x,((y+.5)/r.meshRows-p.y)*r.sourceHeight/r.sourceWidth);
      if(distance>p.radius*1.05)far=Math.max(far,value);else near=Math.max(near,value);
    }
    return {near,far,radius:p.radius,name:Math.max(...window.touchType.interactions.filter((_,i)=>i%window.touchType.interactionStride===0))};
  });
  assert.equal(local.radius,radius,'Four-second holds retain exactly the initial contact radius');
  assert.ok(local.near>.9);assert.equal(local.far,0,'Only source cells at the touched spot deform');
  assert.equal(local.name,0,'Holding the face does not affect the distant name');
  assert.equal(await page.evaluate(()=>window.touchPhoto.testPointer.taps.length),0,'Holding does not trigger a tap burst');
  await page.screenshot({path:'output/touch-scatter-active.png'});
  assert.equal(await page.locator('.portrait').evaluate(e=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false,'Long-press gathering suppresses the artwork context menu');
  assert.ok(await page.locator('.gather-cursor').evaluate(e=>e.classList.contains('held')));
  await send('touchStart',[point,{x:270,y:510,id:2}]);await page.waitForTimeout(120);
  assert.equal(await gather(),0,'A second finger cancels gathering immediately');
  assert.ok(await page.locator('.gather-cursor').evaluate(e=>!e.classList.contains('held')));
  await send('touchMove',[{...point,x:180},{x:285,y:510,id:2}]);
  await send('touchEnd');await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
  await page.waitForTimeout(150);
  await send('touchStart',[point]);
  for(let i=0;i<20;i++){
    await send('touchMove',[{...point,x:170+(i%2)*50,y:460+(i%3)*15}]);await page.waitForTimeout(150);
  }
  assert.ok(await gather()<.06,'Drawing for three seconds does not become a full-scene hold');
  await send('touchCancel');await page.waitForTimeout(80);
  assert.equal(await gather(),0);
  await page.waitForTimeout(800);
  await page.evaluate(()=>{window.touchPhoto.resetInteraction();window.touchType.resetInteraction();});
  await page.touchscreen.tap(195,460);
  await page.waitForTimeout(120);
  const burst=await page.evaluate(()=>{
    const r=window.touchPhoto,p=r.testPointer.taps[0];
    if(!p)return null;
    return {x:p.x,y:p.y,width:p.width,strength:p.strength};
  });
  assert.ok(burst&&burst.strength>0,'Tap starts moving immediately');
  assert.equal(burst.x,195);assert.equal(burst.y,460,'Tap coordinates are passed unchanged in screen space');
  assert.ok(burst.width>70&&burst.width<=108,'Tap selects a broader local patch');
  await page.waitForTimeout(900);
  assert.ok(await page.evaluate(()=>window.touchPhoto.testPointer.taps[0]?.strength)>.95,'Pieces are still out in space after one second');
  await page.screenshot({path:'output/touch-local-burst.png'});
  await page.waitForTimeout(1400);
  const returning=await page.evaluate(()=>window.touchPhoto.testPointer.taps[0]?.strength);
  assert.ok(returning>.15&&returning<.7,'The slower pull home is still underway after two seconds');
  await page.screenshot({path:'output/touch-burst-return.png'});
  await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(()=>window.touchPhoto.testPointer.taps.length),0,'Burst completes naturally');
  await page.touchscreen.tap(165,420);await page.waitForTimeout(1100);
  const first=await page.evaluate(()=>({...window.touchPhoto.testPointer.taps[0]}));
  await send('touchStart',[{x:245,y:490,id:1}]);await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>window.touchPhoto.testPointer.taps[0]?.seed),first.seed,'A new press does not clear the first burst');
  await send('touchEnd');await page.waitForTimeout(180);
  const overlap=await page.evaluate(()=>window.touchPhoto.testPointer.taps.map(t=>({...t})));
  assert.equal(overlap.length,2,'Two independent tap bursts coexist');
  assert.equal(overlap[0].seed,first.seed);assert.ok(overlap[0].age>first.age);
  assert.ok(overlap[1].age<.5&&overlap[1].strength>0,'New tap starts on its own clock');
  await page.screenshot({path:'output/touch-overlapping-bursts.png'});
  await page.waitForTimeout(2700);
  const remaining=await page.evaluate(()=>window.touchPhoto.testPointer.taps.map(t=>({...t})));
  assert.equal(remaining.length,1,'The first finishes without removing the second');
  assert.equal(remaining[0].seed,overlap[1].seed);assert.ok(remaining[0].strength>0);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>window.touchPhoto.testPointer.taps.length),0);
  await page.locator('.email').evaluate(e=>e.addEventListener('click',event=>{event.preventDefault();window.contactTapped=true;}));
  await page.locator('.email').tap();assert.ok(await page.evaluate(()=>window.contactTapped));
  assert.ok(await page.locator('.gather-cursor').evaluate(e=>!e.classList.contains('held')),'Email taps do not capture a drawing gesture');
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    const controls=await page.locator('.scene-actions').evaluate(e=>[...e.children].map(c=>{
      const b=c.getBoundingClientRect();return {left:b.left,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
    }));
    assert.ok(controls.every(b=>b.width>=44&&b.height>=48&&b.left>=0&&b.right<=width&&b.bottom<=height),`Touch controls fit with at least 48px height: ${JSON.stringify({width,height,controls})}`);
    assert.ok(await page.locator('.contact-link span').isVisible(),'Contact retains its text label on small phones');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.body.style.minHeight='1400px');
  await send('touchStart',[{x:20,y:220,id:1}]);
  for(let i=1;i<=8;i++){await send('touchMove',[{x:20,y:220-i*18,id:1}]);await page.waitForTimeout(30);}
  await send('touchEnd');await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>scrollY)>20,'Swipes outside the drawing surface still scroll normally');
  await page.evaluate(()=>{document.body.style.minHeight='';scrollTo(0,0);});await page.waitForTimeout(150);
  await page.getByRole('button',{name:'Tune appearance'}).tap();
  const panel=page.locator('.tuner');
  const before=await page.evaluate(()=>scrollY);
  const settingsBefore=await page.evaluate(()=>localStorage.getItem('danny-portrait-tuning-v1'));
  const box=await panel.boundingBox();
  await send('touchStart',[{x:32,y:box.y+box.height-60,id:1}]);
  for(let i=1;i<=8;i++){await send('touchMove',[{x:32,y:box.y+box.height-60-i*25,id:1}]);await page.waitForTimeout(25);}
  await send('touchEnd');await page.waitForTimeout(250);
  assert.ok(await panel.evaluate(e=>e.scrollTop)>50,'Tuner scrolls with a vertical finger swipe');
  assert.equal(await page.evaluate(()=>scrollY),before,'Tuner scrolling does not move the page behind it');
  assert.equal(await page.evaluate(()=>localStorage.getItem('danny-portrait-tuning-v1')),settingsBefore,'Vertical swipes never commit incidental range changes');
  await panel.evaluate(e=>e.scrollTop=0);
  const density=page.locator('#tune-density'),range=await density.boundingBox(),original=await density.inputValue();
  await page.touchscreen.tap(range.x+range.width*.65,range.y+range.height/2);
  assert.notEqual(await density.inputValue(),original,'Intentional slider taps still apply');
  const tapped=await density.inputValue();
  await send('touchStart',[{x:range.x+range.width*.65,y:range.y+range.height/2,id:1}]);
  for(let i=1;i<=6;i++){await send('touchMove',[{x:range.x+range.width*(.65+i*.035),y:range.y+range.height/2,id:1}]);await page.waitForTimeout(30);}
  await send('touchEnd');
  assert.ok(Number(await density.inputValue())>Number(tapped),'Horizontal slider drags still apply');
  await page.locator('[data-action="reset"]').evaluate(e=>e.click());
  await page.screenshot({path:'output/touch-tuner.png'});
  await page.getByRole('button',{name:'Close controls'}).tap();
  await page.locator('[data-scene="reveal"]').tap();assert.equal(await page.locator('[data-scene="reveal"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-scene="reveal"]').tap();assert.equal(await page.locator('[data-scene="reveal"]').getAttribute('aria-pressed'),'false');
  await page.screenshot({path:'output/touch-phone.png'});
  assert.deepEqual(errors,[]);
  console.log('Touch QA passed: independent overlapping taps, fixed local holds, accurate broader tap, one-second drift, slow return, pinch cancellation, email, controls and tuner scrolling.');
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.getByRole('button',{name:'Skip entrance'}).tap();
  await page.waitForSelector('[data-entrance="settled"]');
  assert.equal(await page.locator('.email').evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  const cdp=await page.context().newCDPSession(page);
  const send=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const point={x:195,y:460,id:1};
  const gather=()=>page.locator('.gather-cursor').evaluate(e=>Number(e.style.getPropertyValue('--gather')));
  await send('touchStart',[point]);await page.waitForTimeout(800);
  assert.ok(await gather()>.15,'A stationary hold expands the restoration brush');
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
  await page.touchscreen.tap(195,460);
  await page.waitForFunction(()=>document.querySelector('.experience-hint').textContent==='Recalling');
  await page.waitForTimeout(1900);
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
  console.log('Touch QA passed: hold/draw separation, multi-touch cancellation, tap recall, email, controls, safe layout and tuner swipe scrolling.');
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8080');
  const button=page.getByRole('link',{name:'Email Danny',exact:true});
  assert.equal(await page.locator('.identity a').count(),0);assert.equal(await button.getAttribute('href'),'mailto:danny@dannywilson.ca');
  assert.ok(await button.isVisible());await page.waitForSelector('.portrait.ready');await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    const b=await button.boundingBox(),controls=await page.locator('.scene-actions').boundingBox();
    assert.ok(b.width>=100&&b.height>=48&&b.x>=0&&b.x+b.width<=width&&b.y+b.height<=height);
    assert.ok(controls.x+controls.width<=b.x-4,'Email has its own space beside the controls');
    await page.screenshot({path:`output/contact-${width}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const before=await button.boundingBox();
  await page.evaluate(()=>{document.body.style.minHeight='1800px';scrollTo(0,300);});await page.waitForTimeout(150);
  assert.deepEqual(await button.boundingBox(),before,'Email stays fixed during scrolling');
  await button.evaluate(e=>e.addEventListener('click',event=>{event.preventDefault();window.emailClicked=true;}));
  await button.tap();assert.ok(await page.evaluate(()=>window.emailClicked));
  await page.keyboard.press('Tab');await button.focus();assert.notEqual(await button.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  await page.emulateMedia({reducedMotion:'reduce'});assert.ok(await button.isVisible());
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://localhost:8080');
  assert.ok(await nojs.getByRole('link',{name:'Email Danny',exact:true}).isVisible());
  const fallback=await browser.newPage();await fallback.route('**/main.mjs',r=>r.abort());await fallback.goto('http://localhost:8080');
  assert.ok(await fallback.getByRole('link',{name:'Email Danny',exact:true}).isVisible());
  assert.deepEqual(errors,[]);console.log('Floating email: layouts, scrolling, mail click, focus, reduced motion and fallback passed.');
}finally{await browser.close();}

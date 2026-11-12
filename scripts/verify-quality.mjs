import {publishedLook} from '../site/config.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');
  await page.getByRole('button',{name:'Skip entrance'}).click();
  await page.waitForSelector('[data-entrance="settled"]',{timeout:1000});
  assert.equal(await page.locator('.portrait').getAttribute('aria-busy'),'false');
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForSelector('[data-entrance="assembling"]');
  await page.getByRole('button',{name:'Skip entrance'}).click();
  const reveal=page.locator('[data-scene="reveal"]');
  await reveal.click();assert.equal(await reveal.getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');assert.equal(await reveal.getAttribute('aria-pressed'),'false');
  await reveal.click();
  await page.getByRole('button',{name:'Tune appearance'}).click();
  await page.locator('[data-action="replay"]').click();
  assert.equal(await reveal.getAttribute('aria-pressed'),'false','Restart clears pinned Reveal');
  await page.waitForTimeout(150);
  await page.evaluate(()=>{
    window.rasterizedLetters=0;
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(...args){window.rasterizedLetters++;return fill.apply(this,args);};
  });
  await page.locator('#tune-brightness').evaluate(input=>{
    for(let i=0;i<12;i++){input.value=String(1+i*.05);input.dispatchEvent(new Event('input',{bubbles:true}));}
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.rasterizedLetters),0,'Tone changes reuse the name texture');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('danny-portrait-tuning-v1')));
  assert.equal(saved.brightness,1.55,'Every setting change still applies');
  await page.locator('#tune-letterSpacing').evaluate(input=>{input.value='.04';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok(await page.evaluate(()=>window.rasterizedLetters)>0,'Letter-spacing changes rebuild the actual type');
  const density=page.getByRole('spinbutton',{name:'Character density value'});
  await density.fill('9999');await density.press('Tab');
  assert.equal(await density.inputValue(),String(publishedLook.density));
  assert.match(await page.locator('.tuner-status').textContent(),/restored/);
  await density.fill('');await density.press('Tab');assert.equal(await density.inputValue(),String(publishedLook.density));
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.tuner').isHidden());
  await reveal.click();await page.waitForTimeout(600);
  await page.screenshot({path:'output/quality-phone.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('[data-scene="replay"]').disabled);
  assert.ok(await page.getByRole('button',{name:'Replay entrance'}).isDisabled());
  assert.ok(await reveal.isDisabled());
  assert.deepEqual(errors,[]);
  console.log('Quality QA passed: Skip/Replay, Escape release, cycle reset, reusable type texture, valid field values and reduced motion.');
}finally{await browser.close();}

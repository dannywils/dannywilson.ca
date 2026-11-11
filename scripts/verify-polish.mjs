import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  await page.screenshot({path:`output/polish-${before?'before':'after'}-desktop.png`});
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    const ui=await page.evaluate(()=>{
      const email=document.querySelector('.email'),rail=document.querySelector('.experience'),face=document.querySelector('.portrait').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,emailColor:getComputedStyle(email).color,emailHeight:email.getBoundingClientRect().height,
        faceBottom:face.bottom,railTop:rail.getBoundingClientRect().top,controls:[...rail.querySelectorAll('a,button')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};
    });
    if(!before){assert.equal(ui.overflow,false);assert.equal(ui.emailColor,'rgba(0, 0, 0, 0)','ASCII email replaces DOM glyphs');assert.ok(ui.emailHeight>=44);assert.ok(ui.controls.every(c=>c.width>=44&&c.height>=44));if(width<=700||height<540)assert.ok(ui.faceBottom<=ui.railTop+3);}
    if(width===390)await page.screenshot({path:`output/polish-${before?'before':'after'}-phone.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('.tuner-toggle').click();
  await page.screenshot({path:`output/polish-${before?'before':'after'}-tune.png`});
  if(!before){
    const controls=await page.locator('.tuner').evaluate(panel=>({overflow:panel.scrollWidth>panel.clientWidth,close:panel.querySelector('.tuner-close').getBoundingClientRect().height,number:panel.querySelector('input[type="number"]').getBoundingClientRect().height,range:panel.querySelector('input[type="range"]').getBoundingClientRect().height,font:getComputedStyle(panel.querySelector('input[type="number"]')).fontSize}));
    assert.equal(controls.overflow,false);assert.ok(controls.close>=44&&controls.number>=44&&controls.range>=44);assert.equal(controls.font,'16px');
    await page.keyboard.press('Escape');assert.ok(await page.locator('.tuner').isHidden());assert.ok(await page.locator('.tuner-toggle').evaluate(e=>e===document.activeElement));
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(1000);
    assert.equal(await page.locator('.email').evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('.email').getAttribute('href'),'mailto:danny@dannywilson.ca');
    await page.locator('.email').focus();assert.notEqual(await page.locator('.email').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  }
  assert.deepEqual(errors,[]);console.log(before?'Before polish captured.':'Polish QA passed: readable contact, responsive layout, 44px controls, phone fields, Escape/focus and mail link.');
}finally{await browser.close();}

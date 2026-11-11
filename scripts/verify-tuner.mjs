import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { publishedLook } from '../site/config.mjs';
const browser=await chromium.launch({channel:'msedge'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://localhost:8080/?tune');
  await page.waitForSelector('.portrait.ready');
  for (const [key,value] of Object.entries(publishedLook)) {
    const control=key==='eyeColor'?page.getByLabel('Eye color',{exact:true}):page.locator(`#tune-${key}`);
    assert.equal(await control.inputValue(),String(value),`Published ${key} matches the selected look`);
  }
  assert.ok(await page.locator('.tuner').isVisible());
  const portrait=await page.locator('.portrait').boundingBox(), panel=await page.locator('.tuner').boundingBox();
  assert.ok(portrait.y+portrait.height<=panel.y,'Phone portrait remains above the controls');
  assert.ok(await page.locator('h1').isVisible(),'Name remains visible for flicker tuning');
  const uniform=name=>page.locator('canvas').evaluate((c,name)=>{
    const gl=c.getContext('webgl'),p=gl.getParameter(gl.CURRENT_PROGRAM);
    const value=gl.getUniform(p,gl.getUniformLocation(p,name));
    return typeof value==='number'?value:Array.from(value);
  },name);
  const change=async(key,value)=>{
    await page.locator(`#tune-${key}`).evaluate((e,value)=>{
      e.closest('details').open=true;e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));
    },String(value));
  };
  const initial=await page.locator('canvas').screenshot();
  await change('brightness',1.5);await change('contrast',1.3);await change('density',200);
  assert.equal(await uniform('columns'),150);
  const tones=await uniform('toneControls');assert.ok(Math.abs(tones[0]-1.3)<.001);assert.equal(tones[1],1.5);
  assert.notDeepEqual(await page.locator('canvas').screenshot(),initial,'Tonal controls visibly change the rendered portrait');
  await change('centerX',.12);await change('zoom',1.2);await change('breakup',.4);await change('randomness',1.3);await change('particleSpeed',.8);
  assert.ok(Math.abs((await uniform('placement'))[1]-.12)<.001);
  assert.ok(Math.abs((await uniform('debrisControls'))[0]-.4)<.001);
  assert.ok(Math.abs((await uniform('dissolve'))[3]-.8)<.001);
  await change('feather',1.5);
  const boundary=await uniform('dissolve');
  assert.ok(Math.abs(boundary[1]-boundary[0]-1.5)<.001,'Softness can span more than the full portrait');
  await page.reload();await page.waitForSelector('.portrait.ready');
  assert.equal(await page.locator('#tune-brightness').inputValue(),'1.5');
  assert.equal(await page.locator('#tune-feather').inputValue(),'1.5');
  assert.equal((await uniform('toneControls'))[1],1.5,'Settings persist across reload');
  await page.locator('[data-action="link"]').click();
  const link=await page.evaluate(()=>navigator.clipboard.readText());
  assert.ok(link.includes('#look='));
  const shared=await browser.newPage();await shared.goto(link);await shared.waitForSelector('.portrait.ready');
  assert.equal(await shared.locator('#tune-brightness').inputValue(),'1.5','Shared look works on a fresh device');
  await shared.close();
  await page.locator('[data-action="import"]').click();
  await page.getByRole('textbox',{name:'Settings JSON'}).fill('{"brightness":999,"density":-100,"centerX":0.1,"eyeColor":"invalid"}');
  await page.locator('[data-action="apply"]').click();
  assert.equal(await page.locator('#tune-brightness').inputValue(),'2');assert.equal(await page.locator('#tune-density').inputValue(),'60');
  await page.locator('[data-action="preview"]').click();
  assert.match(await page.locator('.tuner-status').textContent(),/Reduced motion/);
  assert.equal(await page.locator('.composition').getAttribute('data-phase'),'human');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-action="preview"]').click();
  await page.waitForSelector('[data-phase="takeover"]',{timeout:3000});
  await page.locator('[data-action="reset"]').click();
  assert.equal(await page.locator('#tune-brightness').inputValue(),String(publishedLook.brightness));assert.equal(await page.locator('#tune-density').inputValue(),String(publishedLook.density));
  await page.getByRole('button',{name:'Close controls'}).click();
  assert.ok(await page.locator('.email').isVisible());assert.ok(await page.locator('.tuner-toggle').evaluate(e=>e===document.activeElement));
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.tuner-toggle').click();
  await page.screenshot({path:'output/tuner-desktop.png'});
  assert.deepEqual(errors,[]);
  console.log('Tuner QA passed: live GPU changes, phone layout, persistence, shared links, bounded imports, reset, flicker and reduced motion.');
} finally {await browser.close();}

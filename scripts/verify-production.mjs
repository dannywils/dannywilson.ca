import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const base=process.env.SITE_URL||'http://localhost:8081';
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.addInitScript(()=>localStorage.setItem('danny-portrait-tuning-v1',JSON.stringify({density:60,letterSpacing:-.06})));
    await page.goto(base+'/?tune#look='+encodeURIComponent(JSON.stringify({density:60})));
    await page.waitForSelector('.portrait[data-renderer="webgl"]',{state:'attached'});
    assert.equal(await page.locator('.experience,.tuner,.tuner-toggle,[data-scene]').count(),0);
    assert.ok(!requests.some(url=>/tuner\.(mjs|css)/.test(url)));
    const email=page.getByRole('link',{name:'Email Danny',exact:true});
    assert.equal(await email.getAttribute('href'),'mailto:danny@dannywilson.ca');
    assert.equal((await email.textContent()).trim(),'');
    const bounds=await email.boundingBox();assert.ok(bounds.width>=48&&bounds.height>=48);
    assert.equal(await email.locator('svg').evaluate(e=>getComputedStyle(e).animationName),'none');
    const state=await page.evaluate(async()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
      spacing:document.documentElement.style.getPropertyValue('--name-spacing'),density:(await import('/config.mjs')).config.ascii.desktopColumns}));
    assert.ok(state.width<=viewport.width&&state.height<=viewport.height);
    assert.equal(state.spacing,'0.06em');assert.equal(state.density,229);
    await page.keyboard.press('Tab');assert.ok(await email.evaluate(e=>e===document.activeElement));
    await page.screenshot({path:`output/production-${viewport.width}.png`});assert.deepEqual(errors,[]);await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.waitForSelector('.portrait[data-entrance="settled"]',{state:'attached'});
  await page.evaluate(async()=>{const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){window.bursts=args[3].taps?.length??0;return render.apply(this,args);};});
  await page.mouse.click(1050,400);await page.waitForTimeout(80);
  assert.ok(await page.evaluate(()=>window.bursts>0),'Production pointer interactions survive removing controls');
  assert.equal(await page.locator('.email-glyph').evaluate(e=>getComputedStyle(e).animationName),'mail-signal');
  assert.deepEqual(errors,[]);await page.close();
  const fallback=await browser.newPage({javaScriptEnabled:false});await fallback.goto(base);
  assert.ok(await fallback.getByRole('link',{name:'Email Danny'}).isVisible());
  assert.equal(await fallback.locator('.experience,.tuner-toggle').count(),0);
  await fallback.close();
  console.log('Production passed: desktop/phone/landscape, no preview UI or tuning overrides, accessible icon, reduced motion, intro, tap and no-JS contact.');
}finally{await browser.close();}

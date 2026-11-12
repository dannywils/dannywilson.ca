import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('danny-portrait-tuning-v1'))localStorage.setItem('danny-portrait-tuning-v1',JSON.stringify({contrast:1.25,density:179}));});
  await page.goto('http://localhost:8080/?tune');await page.waitForSelector('.identity.text-ready');
  assert.equal(await page.locator('#tune-glyphFillX').inputValue(),'1');
  assert.equal(await page.locator('#tune-glyphFillY').inputValue(),'1');
  assert.equal(await page.locator('#tune-contrast').inputValue(),'1.25','Old saved looks acquire neutral fill without losing their tone settings');
  for(const [name,value] of [['Horizontal fill value','1.25'],['Vertical fill value','1.5']]){
    const input=page.getByRole('spinbutton',{name,exact:true});await input.fill(value);await input.press('Tab');
  }
  const uniforms=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl'),p=g.getParameter(g.CURRENT_PROGRAM);return {fill:Array.from(g.getUniform(p,g.getUniformLocation(p,'glyphFill'))),tone:Array.from(g.getUniform(p,g.getUniformLocation(p,'toneControls')))};});
  assert.deepEqual(uniforms.fill,[1.25,1.5]);assert.equal(uniforms.tone[0],1.25);
  await page.reload();await page.waitForSelector('.identity.text-ready');
  assert.equal(await page.locator('#tune-glyphFillX').inputValue(),'1.25');assert.equal(await page.locator('#tune-glyphFillY').inputValue(),'1.5');
  await page.locator('#tune-glyphFillY').scrollIntoViewIfNeeded();await page.screenshot({path:'output/glyph-fill-controls-phone.png'});
  const shared=await browser.newPage({reducedMotion:'reduce'});
  await shared.goto('http://localhost:8080/?tune#look='+encodeURIComponent(JSON.stringify({glyphFillX:1.3,glyphFillY:1.6})));
  await shared.waitForSelector('.identity.text-ready');assert.equal(await shared.locator('#tune-glyphFillX').inputValue(),'1.3');assert.equal(await shared.locator('#tune-glyphFillY').inputValue(),'1.6');await shared.close();
  await page.getByRole('button',{name:'Import settings',exact:true}).click();
  await page.getByRole('textbox',{name:'Settings JSON'}).fill(JSON.stringify({glyphFillX:99,glyphFillY:-2}));
  await page.getByRole('button',{name:'Apply JSON',exact:true}).click();
  assert.equal(await page.locator('#tune-glyphFillX').inputValue(),'2');assert.equal(await page.locator('#tune-glyphFillY').inputValue(),'0.5');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  assert.equal(await page.locator('#tune-glyphFillX').inputValue(),'1');assert.equal(await page.locator('#tune-glyphFillY').inputValue(),'1');
  const results=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(96,85,32,42);
    const results=[];
    for(const text of [false,true]){
      const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=8;Object.assign(c.shader,{zoom:1,centerX:0,centerY:0});
      const r=new PortraitGL(document.createElement('canvas'),source,c,{text,idleGlitch:false,sceneGlitch:false});r.resize(512,512);
      const sample=(x,y)=>{
        c.shader.glyphFillX=x;c.shader.glyphFillY=y;r.applyConfig();r.render(0,'human',true,{x:-2,y:-2,strength:0},0,1,0);
        const g=r.gl,p=new Uint8Array(512*512*4);g.readPixels(0,0,512,512,g.RGBA,g.UNSIGNED_BYTE,p);
        let minX=512,minY=512,maxX=0,maxY=0,ink=0;for(let i=3;i<p.length;i+=4)if(p[i]>30){const q=(i-3)/4,px=q%512,py=Math.floor(q/512);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);ink++;}
        return {width:maxX-minX+1,height:maxY-minY+1,ink,minX,maxX};
      };
      const home=sample(1,1),wide=sample(1.4,1),tall=sample(1,1.4),small=sample(.5,.5),full=sample(2,2);
      results.push({text,home,wide,tall,small,full,error:r.gl.getError()});r.dispose();
    }return results;
  });
  console.log('Glyph fill:',results);
  for(const r of results){
    assert.ok(r.wide.width>r.home.width&&Math.abs(r.wide.height-r.home.height)<=2,'Horizontal fill changes width independently');
    assert.ok(r.tall.height>r.home.height&&Math.abs(r.tall.width-r.home.width)<=2,'Vertical fill changes height independently');
    assert.ok(r.small.ink<r.home.ink&&r.full.ink>r.home.ink);assert.ok(r.full.minX>=192&&r.full.maxX<256,'Expanded ink stays in its source cell');assert.equal(r.error,0);
  }
  assert.deepEqual(errors,[]);console.log('Persistence, old looks, shared links, import limits and Reset passed.');
}finally{await browser.close();}

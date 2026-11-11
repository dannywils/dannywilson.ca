import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('[data-entrance="settled"]');
  const wave=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,256,256);
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=48;
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(500,500);
    const p={x:-2,y:-2,strength:0,trail:.4};
    const at=x=>r.interactions[(Math.floor(.4*r.meshRows)*r.meshColumns+Math.floor(x*r.meshColumns))*12];
    let near,earlyFar,lateFar;
    for(let i=0;i<=90;i++){
      r.updateInteraction(i/60,false,{...p,pulse:{x:.2,y:.4,radius:i/60*.65,width:.12}});
      if(i===10){near=at(.23);earlyFar=at(.75);}
      if(i===55)lateFar=at(.75);
    }
    for(let i=91;i<=300;i++)r.updateInteraction(i/60,false,p);
    const remaining=Math.max(...r.interactions.filter((_,i)=>i%2===0));
    r.dispose();return {near,earlyFar,lateFar,remaining};
  });
  assert.ok(wave.near>.5&&wave.earlyFar===0&&wave.lateFar>.5,'A recall wave visits source cells in distance order');
  assert.ok(wave.remaining<.001,'Recalled source cells dissolve again after the wave passes');
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs');const render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){
      args[6]=60;render.apply(this,args);
      if(this.options.text){
        window.recallActive=!!args[3].pulse;
        const g=this.gl,p=new Uint8Array(this.canvas.width*this.canvas.height*4);
        g.readPixels(0,0,this.canvas.width,this.canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);
        window.visibleCells=p.reduce((n,v,i)=>n+(i%16===3&&v>32),0);
      }
    };
  });
  await page.waitForFunction(()=>window.visibleCells===0);
  await page.mouse.click(1080,400);await page.mouse.move(1438,998);
  await page.waitForFunction(()=>window.recallActive&&window.visibleCells>1000);
  await page.waitForTimeout(550);await page.screenshot({path:'output/recall-wave.png'});
  await page.waitForFunction(()=>!window.recallActive&&window.visibleCells===0);
  await page.mouse.move(1080,400);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.recallActive),false,'Long holds do not also launch a wave');
  await page.mouse.down();await page.mouse.move(1140,400);await page.mouse.up();
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.recallActive),false,'Drawing does not accidentally trigger tap recall');
  const contact=page.getByRole('link',{name:'Contact Danny by email'});
  assert.equal(await contact.getAttribute('href'),'mailto:danny@dannywilson.ca');
  for(const width of [320,390,700,1440]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.locator('.scene-actions').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;}),'All controls fit the viewport');
  }
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto('http://localhost:8080');await phone.waitForSelector('[data-entrance="settled"]');
  await phone.touchscreen.tap(195,480);
  await phone.waitForFunction(()=>document.querySelector('.experience-hint').textContent==='Recalling');
  await phone.waitForTimeout(500);await phone.screenshot({path:'output/recall-phone.png'});
  await phone.emulateMedia({reducedMotion:'reduce'});
  await phone.waitForFunction(()=>document.querySelector('.experience-hint').textContent==='Motion reduced');
  const still=await phone.locator('canvas').screenshot();await phone.touchscreen.tap(195,480);
  assert.deepEqual(await phone.locator('canvas').screenshot(),still);
  assert.deepEqual(errors,[]);console.log('Recall QA passed:',wave);
} finally {await browser.close();}

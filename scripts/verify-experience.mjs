import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');
  await page.waitForSelector('[data-entrance="settled"]');
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs');
    const render=PortraitGL.prototype.render;
    window.forceDissolved=true;
    PortraitGL.prototype.render=function(...args){
      if(window.forceDissolved)args[6]=60;
      render.apply(this,args);
      if(this.options.text){
        const gl=this.gl,p=new Uint8Array(this.canvas.width*this.canvas.height*4);
        gl.readPixels(0,0,this.canvas.width,this.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);
        let left=0,right=0;
        for(let y=0;y<this.canvas.height;y+=3)for(let x=0;x<this.canvas.width;x+=3){
          if(p[(y*this.canvas.width+x)*4+3]>24){if(x<this.canvas.width/2)left++;else right++;}
        }
        window.scenePixels={left,right};
      }
    };
  });
  await page.waitForFunction(()=>window.scenePixels?.left===0&&window.scenePixels?.right===0);
  // The complete scene is recoverable by keyboard, without having to hunt invisible targets.
  const reveal=page.getByRole('button',{name:'Reveal',exact:true});
  await reveal.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.scenePixels.left>4000&&window.scenePixels.right>3000);
  assert.equal(await page.getByRole('button',{name:'Release',exact:true}).getAttribute('aria-pressed'),'true');
  await page.waitForTimeout(1300);
  await page.screenshot({path:'output/creative-desktop.png'});
  const complete=await page.evaluate(()=>window.scenePixels);
  await page.getByRole('button',{name:'Release',exact:true}).click();
  await page.mouse.move(1435,990);
  await page.waitForFunction(()=>window.scenePixels.left===0&&window.scenePixels.right===0);
  await page.mouse.move(1050,400);await page.mouse.down();
  await page.waitForTimeout(700);
  const local=await page.evaluate(()=>window.scenePixels);
  await page.waitForFunction(()=>window.scenePixels.left>4000&&window.scenePixels.right>3000);
  assert.ok(local.left<complete.left*.5,'A hold gathers outward before reaching the distant name');
  await page.screenshot({path:'output/creative-gather.png'});
  await page.mouse.up();await page.mouse.move(1435,990);
  await page.waitForFunction(()=>window.scenePixels.left===0&&window.scenePixels.right===0);
  // Replay restarts the source-cell entrance, not a DOM-image flash.
  await page.evaluate(()=>window.forceDissolved=false);
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForSelector('[data-entrance="assembling"]');
  await page.waitForTimeout(1200);
  await page.screenshot({path:'output/creative-entrance.png'});
  await page.waitForSelector('[data-entrance="settled"]');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.forceDissolved=true);
  await page.mouse.move(389,843);
  await page.waitForFunction(()=>window.scenePixels.left===0&&window.scenePixels.right===0);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:480,id:1}]});
  await page.waitForTimeout(3400);
  const touch=await page.evaluate(()=>window.scenePixels);
  assert.ok(touch.left>500&&touch.right>500,'Holding on a phone gathers both halves of the scene');
  await page.screenshot({path:'output/creative-mobile.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>window.scenePixels.left===0&&window.scenePixels.right===0);
  assert.ok(await page.locator('.gather-cursor').evaluate(e=>!e.classList.contains('held')));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('[data-scene="reveal"]').disabled);
  assert.ok(await reveal.isDisabled());
  const still=await page.locator('canvas').screenshot();await page.waitForTimeout(250);
  assert.deepEqual(await page.locator('canvas').screenshot(),still);
  assert.deepEqual(errors,[]);
  console.log('Experience QA passed:',{complete,local,touch});
} finally {await browser.close();}

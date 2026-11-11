import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const probe=()=>page.evaluate(async()=>{
    const {TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const effect=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    const r=effect.renderer;r.options.clear=true;r.gl.uniform1f(r.uniforms.entranceSeed,7);
    const sample=(delay,amount,time=0,phase='human')=>{
      Object.assign(r.config.shader,{identityDelay:delay,identityBreakup:amount});r.applyConfig();
      r.render(0,phase,false,{x:-2,y:-2,strength:0},1,1,time);
      const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;
    };
    const home=sample(0,1),heldHome=sample(.7,.35),flicker=sample(.7,.35,0,'takeover');
    const same=(a,b)=>a.every((v,i)=>v===b[i]);
    const boxes=[...document.querySelectorAll('.ai-letter')].map(e=>e.getBoundingClientRect());
    const lost=a=>boxes.map(b=>{
      let n=0;for(let y=Math.ceil(b.top);y<b.bottom;y++)for(let x=Math.ceil(b.left);x<b.right;x++){
        const i=((r.canvas.height-1-y)*r.canvas.width+x)*4;
        if(home[i+3]>100&&a[i+3]<home[i+3]*.5)n++;
      }return n;
    });
    const normalEarly=[0,0],delayed=[0,0];
    for(let t=.5;t<=8&&normalEarly.some(v=>!v);t+=.5){
      const normal=lost(sample(0,1,t)),held=lost(sample(.7,1,t));
      for(let i=0;i<2;i++)if(!normalEarly[i]&&normal[i]>20){normalEarly[i]=normal[i];delayed[i]=held[i];}
    }
    const normalLate=lost(sample(0,1,20)),retained=lost(sample(0,.35,20));
    for(let i=0;i<180;i++)r.updateInteraction(i/60,false,{x:-2,y:-2,strength:0,reveal:1});
    const gathered=sample(.7,.35,20);
    const result={normalEarly,delayed,normalLate,retained,sameHome:same(home,heldHome),noRed:same(heldHome,flicker),gathered:same(home,gathered),error:r.gl.getError()};
    effect.dispose();return result;
  });
  const results=[];
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(120);
    const r=await probe();results.push({width,...r});console.log('Identity probe:',{width,...r});
    assert.ok(r.sameHome&&r.noRed,'A/I have exactly the same neutral rendering during every eye phase');
    for(let i=0;i<2;i++){
      assert.ok(r.normalEarly[i]>0&&r.delayed[i]<r.normalEarly[i]*.7,'Each letter starts releasing later');
      assert.ok(r.normalLate[i]>0&&r.retained[i]<r.normalLate[i]*.5,'Each letter releases fewer source pieces');
    }
    assert.ok(r.gathered,'Reveal restores every original letter pixel');assert.equal(r.error,0);
  }
  // Capture the real text renderer at the crest without changing its geometry.
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){args[5]=1;args[6]=2.7;return render.apply(this,args);};
  });
  await page.waitForTimeout(250);await page.screenshot({path:'output/identity-phone.png'});
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(250);await page.screenshot({path:'output/identity-desktop.png'});
  assert.deepEqual(errors,[]);console.log('Subtle A/I persistence, neutral color, resize and exact restoration passed:',results);
}finally{await browser.close();}

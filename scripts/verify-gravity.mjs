import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const base=process.env.SITE_URL||'http://localhost:8081';
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:viewport.width<700?2:1}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?gravity');
    await page.waitForSelector('.identity.text-ready',{state:'attached'});
    await page.evaluate(async()=>{
      const {PortraitGL}=await import('/portrait-gl.mjs'),original=PortraitGL.prototype.render;
      window.gravityTime=18;window.gravityFrames={};
      PortraitGL.prototype.render=function(...args){args[0]=window.gravityTime;args[5]=1;args[7]=0;
        const result=original.apply(this,args),g=this.gl;
        window.gravityFrames[this.options.text?'text':'portrait']={wells:Array.from(g.getUniform(this.program,this.uniforms.gravityWells)),pass:g.getUniform(this.program,this.uniforms.gravityPass),error:g.getError()};
        return result;
      };
    });
    await page.waitForFunction(()=>Object.keys(window.gravityFrames).length===2);
    const frames=await page.evaluate(()=>window.gravityFrames);
    assert.deepEqual(frames.portrait.wells,frames.text.wells,'Both layers use the same screen-space gravity wells');
    assert.equal(frames.text.pass,2);assert.equal(frames.portrait.error+frames.text.error,0);
    for(const time of [9,18,29]){
      await page.evaluate(t=>window.gravityTime=t,time);await page.waitForTimeout(100);
      await page.screenshot({path:`output/gravity-${viewport.width}-${time}.png`});
    }
    const previous=frames.text.wells;
    await page.setViewportSize({width:viewport.width-40,height:viewport.height-80});
    await page.waitForTimeout(100);
    const resized=await page.evaluate(()=>window.gravityFrames);
    assert.notDeepEqual(resized.text.wells,previous,'Gravity centers follow responsive text layout');
    assert.deepEqual(resized.text.wells,resized.portrait.wells);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
    const reduced=await page.evaluate(()=>window.gravityFrames);
    assert.equal(reduced.text.pass,0);assert.equal(reduced.portrait.pass,0);
    assert.deepEqual(errors,[]);await page.close();
  }
  const gpu=await browser.newPage();await gpu.goto(base+'/?gravity');
  const metrics=await gpu.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const c=structuredClone(config);Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,gapFill:1});
    c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    const source=document.createElement('canvas');source.width=source.height=64;
    const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true,idleGlitch:false,sceneGlitch:false});
    r.resize(500,400,{left:220,top:100,width:180,height:180});
    r.setIdentityBounds([[.1,.1,.2,.3],[.4,.1,.5,.3]]);
    const sample=(time,reduced=false)=>{
      r.render(time,'human',reduced,{x:-2,y:-2,strength:0},0,1,0,0);
      const p=new Uint8Array(500*400*4),g=r.gl;g.readPixels(0,0,500,400,g.RGBA,g.UNSIGNED_BYTE,p);return p;
    };
    const ordinary=sample(0,true);r.gravityWells=[40,140,80,240];const staticGravity=sample(30,true);
    const results=[10,18,29,45].map(time=>{
      const p=sample(time);let home=0,outside=0;const anchor=p[((400-1-130)*500+247)*4+3];
      for(let y=0;y<400;y++)for(let x=0;x<500;x++)if(p[(y*500+x)*4+3]>50){
        const sy=399-y;if(x>=220&&x<400&&sy>=100&&sy<280)home++;else outside++;
      }
      return {home:home/(180*180),outside,anchor};
    });
    const reducedEqual=ordinary.every((v,i)=>v===staticGravity[i]);r.dispose();return {results,reducedEqual};
  });
  console.log(metrics);
  assert.ok(metrics.reducedEqual,'Reduced motion is identical to the ordinary static scene');
  for(const m of metrics.results){assert.ok(m.home>.9,'Replacement keeps the source filled');assert.ok(m.outside>100,'Actual source ink travels toward the wells');assert.equal(m.anchor,255,'Protected letter cells remain intact');}
  await gpu.close();
  console.log('Gravity preview: shared anchors, two passes, responsive alignment, reduced motion and WebGL checks passed.');
}finally{await browser.close();}

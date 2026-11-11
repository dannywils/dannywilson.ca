import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  for(const dpr of [1,2]){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:8080');await page.getByRole('button',{name:'Skip entrance'}).tap();
    await page.waitForSelector('[data-entrance="settled"]');
    await page.evaluate(async()=>{
      const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
      PortraitGL.prototype.render=function(...args){const result=render.apply(this,args);this.testPointer={...args[3]};window[this.options.text?'targetText':'targetPhoto']=this;return result;};
    });
    const cdp=await page.context().newCDPSession(page);
    // Reproduce a mobile large-vh surface differing from the visible window,
    // then a shifted viewport origin (browser chrome / viewport panning).
    for(const surface of [{extra:0,left:0,top:0},{extra:120,left:0,top:0},{extra:80,left:9,top:-34}]){
      await page.evaluate(s=>{
        const c=document.querySelector('canvas');c.style.height=`calc(100vh + ${s.extra}px)`;
        c.style.left=`${s.left}px`;c.style.top=`${s.top}px`;dispatchEvent(new Event('resize'));
      },surface);
      await page.waitForTimeout(120);
      for(const [kind,x,y] of [['Photo',195,460],['Text',220,110]]){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
        await page.waitForTimeout(110);
        const held=await page.evaluate(kind=>{
          const r=window['target'+kind],g=r.gl,p=r.testPointer,c=r.canvas.getBoundingClientRect();
          const b=g.getUniform(r.program,r.uniforms.portraitBounds),res=g.getUniform(r.program,r.uniforms.resolution),placement=g.getUniform(r.program,r.uniforms.placement);
          const fit=Math.min(b[2]/r.sourceWidth,b[3]/r.sourceHeight)*placement[0];
          const px=(p.tx-.5+placement[1])*r.sourceWidth*fit+b[0]+b[2]/2;
          const py=(p.ty-.5+placement[2])*r.sourceHeight*fit+b[1]+b[3]/2;
          return {x:c.left+px/res[0]*c.width,y:c.top+py/res[1]*c.height};
        },kind);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForTimeout(80);
        const tapped=await page.evaluate(kind=>{
          const r=window['target'+kind],g=r.gl,c=r.canvas.getBoundingClientRect(),res=g.getUniform(r.program,r.uniforms.resolution);
          const count=r.testPointer.taps.length,i=(count-1)*4;
          return {x:c.left+r.tapData[i]/res[0]*c.width,y:c.top+r.tapData[i+1]/res[1]*c.height};
        },kind);
        console.log('Viewport contact:',{dpr,surface,kind,expected:{x,y},held,tapped});
        for(const actual of [held,tapped])assert.ok(Math.hypot(actual.x-x,actual.y-y)<.75,'Brush and burst align with the finger in displayed CSS pixels');
      }
    }
    assert.deepEqual(errors,[]);await page.close();
  }
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  for(const dpr of [1,2]){
    const page=await browser.newPage({viewport:{width:900,height:800},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
    const result=await page.evaluate(async()=>{
      const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs'),{tapProgress,tapDuration}=await import('/tap-motion.mjs');
      const source=document.createElement('canvas');source.width=source.height=256;
      const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(20*8,8*256/24,8,256/24);
      const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
      Object.assign(c.shader,{fragmentation:1,zoom:1,centerX:0,centerY:0,breakup:1,dissolveStart:.2,dissolveEnd:.3,particleSpeed:.35,particleTravel:.6,debrisDensity:1,scrambleHz:0,glitchBandSpeed:0,densityJitter:0});
      const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(600,600);r.gl.uniform1f(r.uniforms.entranceSeed,7);
      const sample=(clock,tap=null)=>{
        r.render(0,'human',false,{x:-2,y:-2,strength:0,taps:tap?[tap]:[]},0,1,clock);
        const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);
        let count=0,x=0,y=0;
        for(let i=3;i<a.length;i+=4)if(a[i]>20){const px=(i-3)/4;count++;x+=px%r.canvas.width;y+=r.canvas.height-1-Math.floor(px/r.canvas.width);}
        return {count,x:x/Math.max(count,1)/r.pixelRatio,y:y/Math.max(count,1)/r.pixelRatio,a};
      };
      const home=sample(0);let moved,clock;
      for(let t=.4;t<4;t+=.05){const f=sample(t);if(f.count>12&&f.x>80&&f.x<520&&f.y>80&&f.y<520&&Math.hypot(f.x-home.x,f.y-home.y)>90){moved=f;clock=t;break;}}
      if(!moved){r.dispose();return {fixture:false};}
      const tap={x:moved.x,y:moved.y,width:45,breakupTime:clock,seed:0};
      const at=age=>sample(clock,{...tap,age,strength:tapProgress(age)});
      const start=at(0),out=at(1.1),returning=at(2.6),end=at(tapDuration);
      const oldPosition=sample(clock,{...tap,x:home.x,y:home.y,age:1.1,strength:1});
      const difference=(a,b)=>a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>2),0);
      const answer={fixture:true,home:{x:home.x,y:home.y},hit:{x:moved.x,y:moved.y},start:difference(start.a,moved.a),out:difference(out.a,moved.a),outDistance:Math.hypot(out.x-moved.x,out.y-moved.y),returnDistance:Math.hypot(returning.x-moved.x,returning.y-moved.y),end:difference(end.a,moved.a),wrongTarget:difference(oldPosition.a,moved.a),error:r.gl.getError()};r.dispose();return answer;
    });
    console.log('Tap targeting probe:',{dpr,...result});
    assert.ok(result.fixture,'Fixture has a visible shard displaced from its source position');
    assert.equal(result.start,0);assert.equal(result.end,0);assert.equal(result.wrongTarget,0,'Original source coordinates no longer select a displaced shard');
    // This source shard is a slow lingerer; velocities now deliberately vary.
    assert.ok(result.out>20&&result.outDistance>1,'Tapping the displayed shard moves it, including a slow lingerer');
    assert.ok(result.returnDistance>0&&result.returnDistance<result.outDistance*.65,'It is still returning slowly after 2.6 seconds');
    assert.equal(result.error,0);await page.close();
  }
}finally{await browser.close();}

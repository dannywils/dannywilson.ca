import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  for(const [width,dpr] of [[1440,1],[390,1],[390,2]]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
    const results=await page.evaluate(async()=>{
      const {TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
      const {idleGlitchAt}=await import('/idle-glitch.mjs');
      let idleTime=5;for(let t=5;t<10;t+=.01)if(idleGlitchAt(t)[0]>.95){idleTime=t;break;}
      const e=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
      const r=e.renderer;r.options.clear=true;
      const original=document.createElement('canvas');original.width=e.source.width;original.height=e.source.height;original.getContext('2d').drawImage(e.source,0,0);
      const range=document.createRange();range.setStart(document.querySelector('.name-line').firstChild,0);range.setEnd(document.querySelector('.name-line').firstChild,1);
      const box=range.getBoundingClientRect(),b=e.bounds;
      const regions=[...e.identityRegions,[(box.left-b.left)/b.width,(box.top-b.top)/b.height,(box.right-b.left)/b.width,(box.bottom-b.top)/b.height]];
      const neutral={x:-2,y:-2,strength:0};
      const sample=(clock,pointer=neutral)=>{
        r.render(idleTime,'human',false,pointer,0,1,clock);const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;
      };
      const changed=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
      const result=[];
      for(const [index,region] of regions.entries()){
        const ctx=e.source.getContext('2d'),[left,top,right,bottom]=region;
        ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,e.source.width,e.source.height);
        const x=left*original.width,y=top*original.height,w=(right-left)*original.width,h=(bottom-top)*original.height;
        ctx.drawImage(original,x,y,w,h,x,y,w,h);r.updateSource(e.source);
        const pointer={x:(left+right)/2,y:(top+bottom)/2,strength:1,radius:.3};
        for(const clock of [0,2.7,20]){
          r.resetInteraction();const home=sample(clock);
          r.interactionTime=0;
          for(let i=0;i<90;i++)r.updateInteraction(i/60,false,pointer);
          const hovered=sample(clock,pointer);
          const tapped=sample(clock,{...pointer,taps:[{x:b.left+pointer.x*b.width,y:b.top+pointer.y*b.height,width:150,age:1.1,strength:1,breakupTime:clock}]});
          result.push({letter:['A','I','D'][index],clock,hover:changed(home,hovered),tap:changed(home,tapped),pixels:home.filter((v,i)=>i%4===3&&v>20).length});
        }
      }
      const error=r.gl.getError();e.dispose();return {samples:result,error};
    });
    console.log('Identity immunity:',{width,dpr,...results});
    for(const r of results.samples){
      if(r.letter!=='D'){assert.equal(r.hover,0,`${r.letter} stays pixel-exact under hover at cycle ${r.clock}`);assert.equal(r.tap,0,`${r.letter} stays pixel-exact under tap at cycle ${r.clock}`);}
      else if(r.clock===0)assert.ok(r.hover>100&&r.tap>100,'Neighboring letters still react');
    }
    assert.equal(results.error,0);await page.close();
  }
}finally{await browser.close();}

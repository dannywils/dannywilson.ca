import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const results=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const c=structuredClone(config);Object.assign(c.shader,{scrambleHz:0,glitchBandSpeed:0,densityJitter:0});
    const image=new Image();image.src=c.portrait;await image.decode();
    const photo=new PortraitGL(document.createElement('canvas'),image,c);photo.resize(640,640);
    const text=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),c,matchMedia('(prefers-reduced-motion: reduce)'));text.renderer.options.clear=true;
    const neutral={x:-2,y:-2,strength:0};
    const probe=(r,point)=>{
      const read=(reduced=false)=>{r.render(0,'human',reduced,neutral,0,1,0);const g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;};
      const tick=(p)=>{r.interactionTime=0;r.updateInteraction(1/60,false,p);};
      const home=read();for(let i=0;i<90;i++)tick({...point,strength:1,radius:.18,trail:.9});const scattered=read();
      let moved=0,departed=0;for(let i=3;i<home.length;i+=4){if(Math.abs(home[i]-scattered[i])>30)moved++;if(home[i]>60&&scattered[i]<20)departed++;}
      for(let i=0;i<600;i++)tick({...neutral,trail:.9});const healed=read();
      const healedDifference=home.reduce((n,v,i)=>n+(Math.abs(v-healed[i])>2),0);
      for(let i=0;i<90;i++)tick({...point,strength:1,radius:2,reveal:1});const revealed=read();
      const revealDifference=home.reduce((n,v,i)=>n+(Math.abs(v-revealed[i])>2),0);
      for(let i=0;i<90;i++)tick({...point,strength:1,radius:2});const reduced=read(true);r.resetInteraction();const reducedHome=read(true);
      return {moved,departed,healedDifference,revealDifference,reducedStill:reduced.every((v,i)=>v===reducedHome[i]),error:r.gl.getError()};
    };
    const result={photo:probe(photo,{x:.5,y:.4}),text:probe(text.renderer,{x:.4,y:.25})};photo.dispose();text.dispose();return result;
  });
  for(const result of Object.values(results)){
    assert.ok(result.moved>500&&result.departed>200,'Touch displaces and removes source pixels from their resting positions');
    assert.equal(result.healedDifference,0,'Released pixels return exactly to their home rendering');
    assert.equal(result.revealDifference,0,'Explicit Reveal overrides destructive touch');
    assert.ok(result.reducedStill);assert.equal(result.error,0);
  }
  console.log('Destructive brush, exact natural recovery, explicit Reveal and reduced motion passed:',results);
}finally{await browser.close();}

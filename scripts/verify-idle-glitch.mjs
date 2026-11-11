import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const results=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs'),{idleGlitchAt}=await import('/idle-glitch.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const letters=document.createElement('canvas');letters.width=letters.height=256;
    const ctx=letters.getContext('2d');ctx.fillStyle='white';ctx.font='bold 50px Arial';ctx.fillText('DANNY',10,100);ctx.fillText('WILSON',10,160);
    let peak=0;for(let t=5;t<10;t+=.01)if(idleGlitchAt(t)[0]>.95){peak=t;break;}
    const results=[];
    for(const text of [false,true]){
      const r=new PortraitGL(document.createElement('canvas'),text?letters:image,structuredClone(config),{text});r.resize(390,600);
      const sample=(enabled,time=peak,reduced=false,assembly=1,reveal=0)=>{
        r.options.idleGlitch=enabled;r.render(time,'human',reduced,{x:-2,y:-2,strength:0,reveal},0,assembly,0);
        const g=r.gl,a=new Uint8Array(390*600*4);g.readPixels(0,0,390,600,g.RGBA,g.UNSIGNED_BYTE,a);return a;
      };
      const difference=(a,b)=>a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>2),0);
      const visible=a=>a.reduce((n,v,i)=>n+(i%4===3&&v>20),0);
      const home=sample(false),glitch=sample(true);
      const active=difference(home,glitch),retained=visible(glitch)/visible(home);
      const quiet=difference(sample(true,0),sample(false,0));
      const reduced=difference(sample(true,peak,true),sample(false,peak,true));
      const intro=difference(sample(true,peak,false,.5),sample(false,peak,false,.5));
      for(let i=0;i<180;i++){r.interactionTime=0;r.updateInteraction(1/60,false,{x:-2,y:-2,strength:0,reveal:1});}
      const reveal=difference(sample(true,peak,false,1,1),sample(false,peak,false,1,1));
      results.push({text,peak,active,retained,quiet,reduced,intro,reveal,error:r.gl.getError()});r.dispose();
    }
    return results;
  });
  console.log('Idle glitch QA:',results);
  for(const r of results){
    assert.ok(r.peak>5&&r.active>1000,'Glitches happen with no input and no eye cue');
    assert.ok(r.retained>.85,'Most visible source detail survives each burst');
    assert.equal(r.quiet+r.reduced+r.intro+r.reveal+r.error,0,'Quiet intervals, reduced motion, intro and Reveal remain exact');
  }
  // Capture the actual shared portrait/name/email composition at a burst peak.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{idleGlitchAt}=await import('/idle-glitch.mjs');
    let peak=5;for(let t=5;t<10;t+=.01)if(idleGlitchAt(t)[0]>.95){peak=t;break;}
    const render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){args[0]=peak;args[1]='human';args[4]=0;args[5]=1;args[6]=0;return render.apply(this,args);};
  });
  await page.waitForTimeout(200);await page.screenshot({path:'output/idle-glitch-phone.png'});
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(200);
  await page.screenshot({path:'output/idle-glitch-desktop.png'});
}finally{await browser.close();}

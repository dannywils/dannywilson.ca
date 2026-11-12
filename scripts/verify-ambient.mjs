import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  for(const [width,height] of [[320,480],[390,844],[667,375],[844,390],[1440,900],[1920,600]]){
    await page.setViewportSize({width,height});
    const layout=await page.evaluate(()=>{
      const h=document.querySelector('h1'),b=h.getBoundingClientRect();
      scrollTo(100,300);
      return {width:innerWidth,height:innerHeight,scrollX,scrollY,documentHeight:document.documentElement.scrollHeight,
        text:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},select:getComputedStyle(h).userSelect};
    });
    assert.equal(layout.scrollX+layout.scrollY,0);assert.equal(layout.documentHeight,height);
    assert.equal(layout.select,'none');assert.ok(layout.text.left>=0&&layout.text.right<=width+1&&layout.text.top>=0&&layout.text.bottom<height-65);
    await page.screenshot({path:`output/window-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  const metrics=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const canvas=document.querySelector('canvas'),photo=new PortraitGL(canvas,image,structuredClone(config),{idleGlitch:false,sceneGlitch:false});
    const text=new TextEffect(canvas,document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    text.renderer.options.idleGlitch=text.renderer.options.sceneGlitch=false;
    const b=document.querySelector('.portrait').getBoundingClientRect();photo.resize(innerWidth,innerHeight,b);
    const sample=(r,c,phase='human',reduced=false)=>{
      r.options.clear=true;r.render(0,phase,reduced,{x:-2,y:-2,strength:0},1,1,0,c);
      const g=r.gl,p=new Uint8Array(canvas.width*canvas.height*4);g.readPixels(0,0,canvas.width,canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);return p;
    };
    const pixels=p=>p.reduce((n,v,i)=>n+(i%4===3&&v>20),0),diff=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
    const results=[];
    for(const r of [photo,text.renderer]){
      const home=sample(r,0),homeCount=pixels(home);let leastRetained=1,leastUnchanged=1,mostChanged=0;
      for(const t of [.1,.4,.6,1,2,5,10]){
        const frame=sample(r,t);leastRetained=Math.min(leastRetained,pixels(frame)/homeCount);
        let unchanged=0;for(let i=3;i<home.length;i+=4)if(home[i]>20&&Math.abs(home[i]-frame[i])<3)unchanged++;
        leastUnchanged=Math.min(leastUnchanged,unchanged/homeCount);mostChanged=Math.max(mostChanged,diff(home,frame));
      }
      const active=sample(r,.6);r.setDetailLimit(1);const economical=sample(r,.6);
      const centroid=p=>{let x=0,y=0,n=0;for(let i=3;i<p.length;i+=4)if(p[i]>20){const q=(i-3)/4;x+=q%canvas.width;y+=Math.floor(q/canvas.width);n++;}return [x/n,y/n];};
      const ca=centroid(active),cb=centroid(economical);
      results.push({text:!!r.options.text,homeCount,leastRetained,leastUnchanged,mostChanged,detailShift:Math.hypot(ca[0]-cb[0],ca[1]-cb[1]),
        redEyeDiff:diff(sample(r,0),sample(r,0,'takeover')),reducedDiff:diff(sample(r,0,'human',true),sample(r,5,'human',true)),error:r.gl.getError()});
    }
    return results;
  });
  console.log('Ambient drift:',metrics);
  for(const m of metrics){
    assert.ok(m.homeCount>10000&&m.leastRetained>.9,'The complete scene stays visible throughout idle motion');
    assert.ok(m.leastUnchanged>.75&&m.mostChanged>1000,'Movement stays sparse but visible');
    assert.ok(m.detailShift<.5,'Changing subdivision does not relocate the drifting cohort');
    assert.equal(m.redEyeDiff+m.reducedDiff+m.error,0,'No eye or reduced-motion animation');
  }
  await page.getByRole('button',{name:'Tune appearance'}).click();
  assert.equal(await page.getByRole('button',{name:'Test flicker'}).count(),0);assert.equal(await page.getByText('Red eye',{exact:true}).count(),0);
  await page.close();
  const mouse=await browser.newPage({viewport:{width:1440,height:900}});
  await mouse.goto('http://localhost:8080');await mouse.getByRole('button',{name:'Skip entrance'}).click();
  await mouse.evaluate(async()=>{const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;window.captureAmbient=0;PortraitGL.prototype.render=function(...args){args[0]=0;args[7]=window.captureAmbient;return render.apply(this,args);};});
  for(const [name,c] of [['home',0],['drift',.6],['later',5]]){await mouse.evaluate(c=>window.captureAmbient=c,c);await mouse.waitForTimeout(100);await mouse.screenshot({path:`output/ambient-${name}.png`});}
  await mouse.evaluate(()=>window.captureAmbient=0);
  await mouse.evaluate(async()=>{const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;PortraitGL.prototype.render=function(...args){window.mouseBursts=args[3].taps?.map(t=>({...t}));return render.apply(this,args);};});
  await mouse.mouse.move(800,400);
  for(let i=1;i<=6;i++){await mouse.waitForTimeout(18);await mouse.mouse.move(800+i*22,400);}
  await mouse.waitForTimeout(40);
  const bursts=await mouse.evaluate(()=>window.mouseBursts);assert.ok(bursts.some(t=>t.velocityX>.45),'Unpressed mouse movement throws local pieces');
  await mouse.mouse.down();await mouse.mouse.move(700,450,{steps:12});await mouse.mouse.up();
  assert.equal(await mouse.evaluate(()=>getSelection().toString()),'');
  assert.deepEqual(errors,[]);console.log('Window fit, no selection, mouse flick and removed eye controls passed.');
}finally{await browser.close();}

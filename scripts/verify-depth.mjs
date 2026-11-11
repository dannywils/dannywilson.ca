import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.portrait.ready');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(20/32*256,8/24*256,256/32,256/24);
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,randomness:0,fragmentSpin:0,windCurl:0,streamReach:0,dissolveStart:.2,dissolveEnd:.3,particleSpeed:.35,debrisDensity:.6});
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(600,600);
    r.gl.uniform1f(r.uniforms.entranceSeed,7);
    const p={x:-2,y:-2,strength:0};
    const sample=(depth,t,reduced=false,pointer=p)=>{
      c.shader.fragmentDepth=depth;r.applyConfig();r.render(0,'human',reduced,pointer,0,1,t);
      const g=r.gl,a=new Uint8Array(600*600*4);g.readPixels(0,0,600,600,g.RGBA,g.UNSIGNED_BYTE,a);return a;
    };
    const equal=(a,b)=>a.every((v,i)=>v===b[i]);
    const count=a=>a.reduce((n,v,i)=>n+(i%4===3&&v>24),0);
    const homeEqual=equal(sample(0,0),sample(1.1,0));
    const reducedEqual=equal(sample(0,60,true),sample(1.1,60,true));
    let flatCount=0,depthCount=0;
    for(let t=.3;t<3;t+=.05){
      const flat=sample(0,t),depth=sample(1.1,t),f=count(flat),d=count(depth);
      if(f>50&&d>10&&d<f*.7){flatCount=f;depthCount=d;break;}
    }
    for(let i=0;i<=180;i++)r.updateInteraction(i/60,false,{...p,reveal:1});
    const restoredEqual=equal(sample(0,60,false,{...p,reveal:1}),sample(1.1,60,false,{...p,reveal:1}));
    const error=r.gl.getError();r.dispose();return {homeEqual,reducedEqual,restoredEqual,flatCount,depthCount,error};
  });
  assert.ok(result.homeEqual&&result.reducedEqual&&result.restoredEqual,'Depth changes only airborne cells; restored and reduced-motion pixels remain exact');
  assert.ok(result.flatCount>50&&result.depthCount<result.flatCount*.7,'A flying source cell turns edge-on');
  assert.equal(result.error,0);
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>{
      const face=document.querySelector('.portrait').getBoundingClientRect(),rail=document.querySelector('.experience').getBoundingClientRect();
      return {faceBottom:face.bottom,railTop:rail.top,faceWidth:face.width,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(layout.overflow,false,'Responsive layout stays within the screen');
    if(width<=700||height<540)assert.ok(layout.faceBottom<=layout.railTop+3,'Portrait stays above the controls on compact screens');
    if(width===390)assert.ok(layout.faceWidth>=380,'Phone portrait uses the available width');
    if(width===390||height===390)await page.screenshot({path:`output/depth-layout-${width}.png`});
  }
  assert.deepEqual(errors,[]);console.log('Fragment depth and compact layout QA passed:',result);
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:900,height:800},reducedMotion:'reduce'});
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,256,256);
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=96;
    Object.assign(c.shader,{fragmentation:2,zoom:1,centerX:0,centerY:0,breakup:0,scrambleHz:0,glitchBandSpeed:0,densityJitter:0});
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true});r.resize(600,600);
    const sample=(taps=[],reduced=false)=>{
      r.render(0,'human',reduced,{x:-2,y:-2,strength:0,taps},0,1,0);
      const g=r.gl,a=new Uint8Array(600*600*4);g.readPixels(0,0,600,600,g.RGBA,g.UNSIGNED_BYTE,a);return a;
    };
    const first={x:160,y:240,width:90,age:1.1,strength:1,breakupTime:0,seed:7};
    const second={...first,x:440,y:360,seed:31};
    const home=sample(),one=sample([first]),two=sample([second]),both=sample([first,second]);
    const otherSeed=sample([{...first,seed:89}]);
    const reduced=sample([first,second],true),reducedHome=sample([],true);
    let coreHome=0,coreBurst=0,firstRetained=0,secondRetained=0,firstChanged=0,secondChanged=0,seedChanges=0;
    for(let y=0;y<600;y++)for(let x=0;x<600;x++){
      const i=((599-y)*600+x)*4+3;
      const d1=Math.hypot(x-first.x,y-first.y),d2=Math.hypot(x-second.x,y-second.y);
      if(d1<first.width*.25){coreHome+=home[i];coreBurst+=one[i];}
      if(d1<100){firstRetained+=Math.abs(one[i]-both[i])>2;firstChanged+=Math.abs(home[i]-both[i])>20;}
      if(d2<100){secondRetained+=Math.abs(two[i]-both[i])>2;secondChanged+=Math.abs(home[i]-both[i])>20;}
      seedChanges+=Math.abs(one[i]-otherSeed[i])>20;
    }
    // A full burst batch must also compile/render on the WebGL1 path.
    sample(Array.from({length:16},(_,i)=>({...first,x:50+i*30,seed:i*17})));
    const answer={coreRetention:coreBurst/coreHome,firstRetained,secondRetained,firstChanged,secondChanged,seedChanges,reducedExact:reduced.every((v,i)=>v===reducedHome[i]),error:r.gl.getError()};
    r.dispose();return answer;
  });
  console.log('Tap shape and composition:',result);
  assert.ok(result.coreRetention>.2,'The impact retains suspended fragments instead of evacuating a circular core');
  assert.equal(result.firstRetained,0,'Second burst does not replace or alter a distant first burst');
  assert.equal(result.secondRetained,0,'Both independent fields are rendered in the combined frame');
  assert.ok(result.firstChanged>1000&&result.secondChanged>1000);
  assert.ok(result.seedChanges>1000,'Repeated impacts have distinct breakup patterns');
  assert.ok(result.reducedExact);assert.equal(result.error,0);
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/assets/portrait.webp',async route=>{await gate;await route.continue();});
  await page.goto('http://localhost:8080',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.fallback').isVisible(),false,'No alternate portrait appears while the source loads');
  assert.equal(await page.locator('.portrait').getAttribute('data-renderer'),'loading');
  assert.equal(await page.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)','Text does not flash before its own assembly');
  release();await page.waitForSelector('[data-entrance="assembling"]');
  await page.waitForTimeout(2000);
  assert.equal(await page.locator('.portrait').getAttribute('data-entrance'),'assembling','The entrance is still assembling after two seconds');
  await page.screenshot({path:'output/entrance-mid.png'});
  assert.equal(await page.locator('.fallback').isVisible(),false);
  await page.waitForSelector('[data-entrance="settled"]');
  assert.equal(await page.locator('.portrait').getAttribute('aria-busy'),'false');
  await page.screenshot({path:'output/entrance-settled.png'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  assert.deepEqual(await page.locator('canvas').boundingBox(),{x:0,y:0,width:390,height:844},'Canvas spans the screen rather than the portrait box');
  assert.equal(await page.locator('.portrait').getAttribute('data-entrance'),'settled','Resize does not replay the entrance');
  await page.evaluate(()=>{document.body.style.minHeight='1600px';scrollTo(0,100);});
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>{
    const b=document.querySelector('.portrait').getBoundingClientRect(),gl=document.querySelector('canvas').getContext('webgl'),p=gl.getParameter(gl.CURRENT_PROGRAM);
    const bounds=gl.getUniform(p,gl.getUniformLocation(p,'portraitBounds'));
    return Math.abs(bounds[1]-b.top*Math.min(devicePixelRatio,2))<1;
  }),'The portrait remains aligned while the page scrolls');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    // Isolate cloud travel; near/far projection has separate coverage in verify-cinema.
    Object.assign(c.shader,{breakup:0,flightDepth:0,zoom:1,centerX:0,centerY:0,scrambleHz:0,glitchBandSpeed:0});
    async function probe(column,breakup=false){
      const source=document.createElement('canvas');source.width=source.height=256;
      const ctx=source.getContext('2d');ctx.fillStyle='#cccccc';ctx.fillRect(column/32*256,8/24*256,256/32,256/24);
      const image=new Image();image.src=source.toDataURL();await image.decode();
      const local=structuredClone(c);
      if(breakup)Object.assign(local.shader,{breakup:1,dissolveStart:.3,dissolveEnd:.4,particleTravel:.6,particleSpeed:.5,debrisDensity:.6,randomness:0});
      const canvas=document.createElement('canvas'),r=new PortraitGL(canvas,image,local);
      r.gl.uniform1f(r.uniforms.entranceSeed,7);
      r.resize(640,480,{left:360,top:120,width:240,height:240});
      const sample=(assembly,reduced=false,time=0)=>{
        r.render(time,'human',reduced,{x:-2,y:-2,strength:0},0,assembly);
        const gl=r.gl,pixels=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let sum=0,sumY=0,count=0;for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(pixels[(y*640+x)*4+3]>20){sum+=x;sumY+=y;count++;}
        return {x:sum/Math.max(1,count),y:sumY/Math.max(1,count),count,pixels};
      };
      const start=sample(0),middle=sample(.5),end=sample(1),normal=sample(undefined);
      const trajectory=[];
      for(let p=.05;p<=.85;p+=.01){const point=sample(p);if(point.count>10)trajectory.push(point);}
      const shifts=trajectory.slice(1).map((point,i)=>Math.abs(point.x-trajectory[i].x));
      const pauses=shifts.filter(v=>v<1).length,bursts=shifts.filter(v=>v>15).length;
      const verticalRange=Math.max(...trajectory.map(p=>p.y))-Math.min(...trajectory.map(p=>p.y));
      r.gl.uniform1f(r.uniforms.entranceSeed,81);
      const differentRun=sample(.5),sameLanding=sample(1);
      const randomized=!middle.pixels.every((v,i)=>v===differentRun.pixels[i]);
      const stableDestination=end.pixels.every((v,i)=>v===sameLanding.pixels[i]);
      r.gl.uniform1f(r.uniforms.entranceSeed,7);
      let firstVisible,firstVisibleAt;
      for(let p=.005;p<1;p+=.005){const next=sample(p);if(next.count>0){firstVisible=next.x;firstVisibleAt=p;break;}}
      let escaped=false;
      if(breakup)for(let t=0;t<6;t+=.04){const next=sample(1,false,t);if(next.x>603&&next.count>2){escaped=true;break;}}
      const reducedStart=sample(0,true),reducedEnd=sample(1,true);
      const result={startCount:start.count,middleX:middle.x,endX:end.x,middleCount:middle.count,endCount:end.count,firstVisible,firstVisibleAt,escaped,pauses,bursts,verticalRange,randomized,stableDestination,
        exactLanding:end.pixels.every((v,i)=>v===normal.pixels[i]),
        reducedStill:reducedStart.pixels.every((v,i)=>v===reducedEnd.pixels[i]),error:r.gl.getError()};
      r.dispose();return result;
    }
    const image=new Image();image.src=config.portrait;await image.decode();
    const scene=new PortraitGL(document.createElement('canvas'),image,structuredClone(config));
    scene.resize(640,480,{left:360,top:120,width:240,height:240});
    scene.gl.uniform1f(scene.uniforms.entranceSeed,7);
    scene.render(0,'human',false,{x:-2,y:-2,strength:0},0,.08,0);
    const earlyPixels=new Uint8Array(640*480*4),gl=scene.gl;gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,earlyPixels);
    const earlyVisible=earlyPixels.filter((v,i)=>i%4===3&&v>20).length;scene.dispose();
    // Track one real glyph across seeded runs. It must approach its destination
    // from all four directions, not simply cross the left edge at different Y's.
    const dot=document.createElement('canvas');dot.width=dot.height=256;
    const ctx=dot.getContext('2d');ctx.fillStyle='white';ctx.fillRect(16*8,12*256/24,8,256/24);
    const dc=structuredClone(c);dc.shader.fragmentation=1;
    const r=new PortraitGL(document.createElement('canvas'),dot,dc,{text:true});r.resize(640,480);
    const centroid=assembly=>{
      r.render(0,'human',false,{x:-2,y:-2,strength:0},0,assembly,0);
      const g=r.gl,a=new Uint8Array(640*480*4);g.readPixels(0,0,640,480,g.RGBA,g.UNSIGNED_BYTE,a);
      let x=0,y=0,n=0;for(let i=3;i<a.length;i+=4)if(a[i]>20){const p=(i-3)/4;x+=p%640;y+=479-Math.floor(p/640);n++;}
      return {x:x/Math.max(n,1),y:y/Math.max(n,1),n};
    };
    const home=centroid(1),directions={left:0,right:0,above:0,below:0};
    for(let seed=1;seed<=32;seed++){
      r.gl.uniform1f(r.uniforms.entranceSeed,seed*17);const p=centroid(.22);
      if(p.n<5)continue;
      if(p.x<home.x-30)directions.left++;if(p.x>home.x+30)directions.right++;
      if(p.y<home.y-30)directions.above++;if(p.y>home.y+30)directions.below++;
    }
    r.dispose();
    return {left:await probe(12),right:await probe(20),debris:await probe(31,true),earlyVisible,directions};
  });
  assert.ok(result.earlyVisible>20,'The opening cohort enters within the first half-second');
  for(const side of [result.left,result.right]){
    assert.equal(side.startCount,0,'The first frame contains no completed portrait');
    assert.ok(side.middleCount>20&&side.endCount>20);
    assert.ok(side.exactLanding,'Cells land on the exact normal rendering');
    assert.ok(side.reducedStill,'Reduced motion skips travel');assert.equal(side.error,0);
    assert.ok(side.firstVisibleAt<.35,'Later cohorts join during the first third of the entrance');
    assert.ok(side.pauses>0&&side.bursts>0,'Flight varies between slow capture and quicker travel');
    assert.ok(side.verticalRange>15,'Flight has substantial vertical variation');
    assert.ok(side.randomized&&side.stableDestination,'Reload seeds vary the journey without changing the destination');
  }
  assert.ok(Object.values(result.directions).every(n=>n>=2),'Source glyphs arrive from left, right, above and below');
  assert.ok(result.debris.escaped,'Disintegrating cells remain visible beyond the portrait boundary');
  const reduced=await browser.newPage({reducedMotion:'reduce'});
  await reduced.goto('http://localhost:8080');await reduced.waitForSelector('[data-entrance="settled"]');
  assert.equal(await reduced.locator('.fallback').isVisible(),false);
  const failed=await browser.newPage();await failed.route('**/main.mjs',route=>route.abort());
  await failed.goto('http://localhost:8080');assert.ok(await failed.locator('.fallback').isVisible(),'Script load failure still reveals the fallback');
  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto('http://localhost:8080');await phone.waitForSelector('[data-entrance="assembling"]');
  await phone.waitForTimeout(1300);await phone.screenshot({path:'output/entrance-phone-early.png'});
  await phone.waitForTimeout(1500);await phone.screenshot({path:'output/entrance-phone-capture.png'});
  await phone.waitForSelector('[data-entrance="settled"]');
  assert.deepEqual(errors,[]);
  console.log('Entrance QA passed:',result);
} finally {await browser.close();}

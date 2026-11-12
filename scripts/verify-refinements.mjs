import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.goto('http://localhost:8080');await page.getByRole('button',{name:'Skip entrance'}).tap();await page.waitForSelector('[data-entrance="settled"]');
  await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;
    PortraitGL.prototype.render=function(...args){const result=render.apply(this,args);this.testPointer=args[3];window[this.options.text?'refineText':'refinePhoto']=this;return result;};
  });
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:450,id:1}]});
  for(let i=1;i<=5;i++){await page.waitForTimeout(16);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130+i*18,y:450-i*3,id:1}]});}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);
  const flick=await page.evaluate(()=>({...window.refinePhoto.testPointer.taps.at(-1)}));
  assert.ok(flick.velocityX>.45&&flick.velocityY<0,'Swipe creates momentum in its release direction');assert.equal(flick.x,220);assert.equal(flick.y,435);
  await page.screenshot({path:'output/flick-phone.png'});
  const pixels=await page.evaluate(async()=>{
    const a=window.refinePhoto,b=window.refineText;
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs'),{sceneGlitchAt}=await import('/idle-glitch.mjs');
    const source=document.createElement('canvas');source.width=source.height=256;const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(20*8,8*256/24,8,256/24);
    const c=structuredClone(config);c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,fragmentation:2,breakup:0,scrambleHz:0,glitchBandSpeed:0});
    const r=new PortraitGL(document.createElement('canvas'),source,c,{text:true,idleGlitch:false,sceneGlitch:false});r.resize(600,600);
    const sample=(taps=[])=>{
      r.render(0,'human',false,{x:-2,y:-2,strength:0,taps},0,1,0);
      const g=r.gl,a=new Uint8Array(600*600*4);g.readPixels(0,0,600,600,g.RGBA,g.UNSIGNED_BYTE,a);
      let x=0,y=0,n=0;for(let i=3;i<a.length;i+=4)if(a[i]>20){const p=(i-3)/4;x+=p%600;y+=599-Math.floor(p/600);n++;}
      return {x:x/Math.max(n,1),y:y/Math.max(n,1),a};
    };
    const home=sample(),tap={x:home.x,y:home.y,width:65,age:1.1,strength:1,seed:7,breakupTime:0};
    const right=sample([{...tap,velocityX:1,velocityY:0}]),left=sample([{...tap,velocityX:-1,velocityY:0}]),down=sample([{...tap,velocityX:0,velocityY:1}]),up=sample([{...tap,velocityX:0,velocityY:-1}]);
    const fullVertices=r.vertexCount;r.setDetailLimit(1);const low=sample(),lowVertices=r.vertexCount;
    const staticDiff=home.a.reduce((n,v,i)=>n+(Math.abs(v-low.a[i])>2),0);r.setDetailLimit(3);const restored=sample();
    let coordinated=0,uniformsMatch=true;
    for(let t=17;t<22;t+=.07)if(sceneGlitchAt(t)[0]>.5){
      for(const layer of [a,b])layer.render(t,'human',false,{x:-2,y:-2,strength:0},0,1,0);
      const av=a.gl.getUniform(a.program,a.uniforms.sceneGlitch),bv=b.gl.getUniform(b.program,b.uniforms.sceneGlitch);uniformsMatch&&=av.every((v,i)=>v===bv[i]);coordinated++;
    }
    const result={right:right.x-home.x,left:left.x-home.x,down:down.y-home.y,up:up.y-home.y,fullVertices,lowVertices,staticDiff,restoreDiff:home.a.reduce((n,v,i)=>n+(v!==restored.a[i]),0),columns:r.config.ascii.mobileColumns,uniformsMatch,coordinated,error:r.gl.getError()};r.dispose();return result;
  });
  console.log('Flick / shared tear / adaptive mesh:',pixels);
  assert.ok(pixels.right>25&&pixels.left< -25&&pixels.down>25&&pixels.up< -25,'Rendered glyphs follow every flick direction');
  assert.equal(pixels.fullVertices,pixels.lowVertices*4);assert.equal(pixels.staticDiff+pixels.restoreDiff+pixels.error,0,'Quality changes preserve settled glyphs');assert.equal(pixels.columns,32);assert.ok(pixels.uniformsMatch&&pixels.coordinated>3);
  await page.close();
  const slow=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await slow.addInitScript(()=>{const raf=requestAnimationFrame;let time=0;window.requestAnimationFrame=cb=>raf(()=>cb(time+=40));});
  await slow.goto('http://localhost:8080');await slow.waitForSelector('canvas[data-detail="economy"]',{timeout:30000});
  assert.equal(await slow.locator('.portrait').getAttribute('data-entrance'),'settled');await slow.screenshot({path:'output/adaptive-phone.png'});
  console.log('Live adaptation after sustained slow frames passed.');
}finally{await browser.close();}

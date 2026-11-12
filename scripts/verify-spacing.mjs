import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({reducedMotion:'reduce'});
  for(const [width,height] of [[1440,900],[1024,768],[768,1024],[701,900],[390,844],[320,568],[844,390],[667,375],[1920,1080]]){
    await page.setViewportSize({width,height});
    await page.goto('http://localhost:8081');
    await page.waitForSelector('.identity.text-ready',{state:'attached'});
    const result=await page.evaluate(async()=>{
      const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
      const boxes=[...document.querySelectorAll('.name-line')].map(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect();});
      const text={right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};
      const column=document.querySelector('.identity').getBoundingClientRect(),bounds=document.querySelector('.portrait').getBoundingClientRect();
      const stacked=bounds.top>=column.bottom;
      const image=new Image();image.src=config.portrait;await image.decode();
      const canvas=document.createElement('canvas'),r=new PortraitGL(canvas,image,config,{idleGlitch:false,sceneGlitch:false});
      r.resize(innerWidth,innerHeight,bounds);
      r.render(0,'human',true,{x:-2,y:-2,strength:0},0,1,0);
      const pixels=new Uint8Array(canvas.width*canvas.height*4),g=r.gl;
      g.readPixels(0,0,canvas.width,canvas.height,g.RGBA,g.UNSIGNED_BYTE,pixels);
      let edge=Infinity;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const i=(y*canvas.width+x)*4,screenY=canvas.height-1-y;
        if(pixels[i+3]<40)continue;
        if(stacked)edge=Math.min(edge,screenY);
        else if(screenY>=text.top&&screenY<=text.bottom)edge=Math.min(edge,x);
      }
      r.dispose();
      return {stacked,gap:edge-(stacked?text.bottom:text.right),overflow:text.right-column.right,
        scrolling:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
    });
    console.log(`${width}x${height}`,result);
    assert.ok(result.overflow<=1,'The name stays inside its own column');
    assert.ok(Number.isFinite(result.gap)&&result.gap>=24,'The rendered portrait keeps at least 24px clear of the name');
    assert.equal(result.scrolling,false);
    if(width===320||width===701)await page.screenshot({path:`output/spacing-${width}.png`});
  }
}finally{await browser.close();}

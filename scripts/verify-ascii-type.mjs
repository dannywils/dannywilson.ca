import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'msedge'});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    await page.goto('http://localhost:8080');
    await page.waitForSelector('.identity.text-ready');
    const result=await page.evaluate(async()=>{
      const {TextEffect}=await import('/text-effect.mjs'),{PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
      const effect=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
      const renderer=effect.renderer;renderer.options.clear=true;renderer.showAnchored(false);
      const photo=new PortraitGL(document.createElement('canvas'),effect.source,structuredClone(config));
      const shader=r=>r.gl.getAttachedShaders(r.program).filter(s=>r.gl.getShaderParameter(s,r.gl.SHADER_TYPE)===r.gl.FRAGMENT_SHADER).map(s=>r.gl.getShaderSource(s))[0];
      const shared=shader(renderer)===shader(photo);photo.dispose();
      const sample=(time,reduced=false)=>{
        renderer.render(time,'human',reduced,{x:-2,y:-2,strength:0},0,1,0);
        const gl=renderer.gl,pixels=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);
        gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
      };
      const first=sample(0),next=sample(.37),still=sample(0,true),stillLater=sample(9,true);
      const source=effect.source.getContext('2d').getImageData(0,0,effect.source.width,effect.source.height);
      const b=effect.bounds,h=document.querySelector('h1').getBoundingClientRect();
      let interior=0,holes=0,lit=0,rewritten=0;
      const alpha=(x,y)=>source.data[(y*source.width+x)*4+3]??0;
      for(let y=Math.ceil(h.top);y<h.bottom;y++)for(let x=Math.ceil(h.left);x<h.right;x++){
        const sx=Math.floor((x-b.left)/b.width*source.width),sy=Math.floor((y-b.top)/b.height*source.height);
        if([alpha(sx,sy),alpha(sx-2,sy),alpha(sx+2,sy),alpha(sx,sy-2),alpha(sx,sy+2)].some(a=>a<250))continue;
        const i=((renderer.canvas.height-1-y)*renderer.canvas.width+x)*4;
        interior++;if(first[i+3]<30)holes++;if(first[i]>80)lit++;
        if(Math.abs(first[i+3]-next[i+3])>30)rewritten++;
      }
      renderer.config.ascii.desktopColumns=110;renderer.config.ascii.mobileColumns=90;renderer.applyConfig();
      const lowerDensity=sample(0),densityChanged=first.reduce((n,v,i)=>n+(Math.abs(v-lowerDensity[i])>30),0);
      const answer={shared,interior,holes,lit,rewritten,densityChanged,reducedStatic:still.every((v,i)=>v===stillLater[i]),error:renderer.gl.getError()};
      effect.dispose();return answer;
    });
    assert.ok(result.shared,'Name and portrait compile the same ASCII fragment shader');
    assert.ok(result.interior>1000&&result.holes>result.interior*.03&&result.lit>result.interior*.25,'Settled strokes contain visible glyph ink and gaps, rather than solid type');
    assert.ok(result.rewritten>result.interior*.04,'Characters rewrite while the letter geometry stays assembled');
    assert.ok(result.densityChanged>1000,'The shared density control changes name texture');
    assert.ok(result.reducedStatic,'Reduced motion keeps the textured name static');
    assert.equal(result.error,0);
    console.log('Shared ASCII type passed:',{width,...result});await page.close();
  }
}finally{await browser.close();}

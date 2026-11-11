import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
// Optional git revision identifies the pre-optimization renderer.
const baseline=execFileSync('git',['show',`${process.argv[2]??'7f29b71'}:site/portrait-gl.mjs`],{encoding:'utf8'});
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
  await page.route('**/baseline-portrait-gl.mjs',route=>route.fulfill({contentType:'text/javascript',body:baseline}));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const result=await page.evaluate(async()=>{
    const {PortraitGL:Before}=await import('/baseline-portrait-gl.mjs'),{PortraitGL:After}=await import('/portrait-gl.mjs');
    const {config}=await import('/config.mjs'),{TextEffect}=await import('/text-effect.mjs');
    const source=new Image();source.src=config.portrait;await source.decode();
    const text=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    const results=[];
    for(const type of ['photo','text']){
      const pair=[Before,After].map(Renderer=>{
        const r=new Renderer(document.createElement('canvas'),type==='photo'?source:text.source,structuredClone(type==='photo'?config:text.textConfig),{text:type==='text'});
        r.resize(390,844,{left:0,top:type==='photo'?280:40,width:390,height:type==='photo'?500:240});
        r.gl.uniform1f(r.uniforms.entranceSeed,7);
        if(type==='text'){r.setIdentityBounds(text.identityRegions);r.setAnchoredBounds(text.emailRegion);r.showAnchored(true);}return r;
      });
      const pointer={x:-2,y:-2,strength:0,taps:[]};
      let changed=0,maxDelta=0,visible=0;
      for(const [assembly,clock,count] of [[.4,0,0],[.9,.5,0],[1,0,0],[1,2,1],[1,8,8],[1,3,16]]){
        pointer.taps=Array.from({length:count},(_,i)=>({x:80+i%4*70,y:100+Math.floor(i/4)*150,width:92,age:1.1,strength:1,seed:i*17,breakupTime:clock}));
        const pixels=pair.map(r=>{
          r.render(4,'human',false,pointer,0,assembly,clock);
          const a=new Uint8Array(r.canvas.width*r.canvas.height*4),g=r.gl;
          g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a;
        });
        for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);changed+=d>2;maxDelta=Math.max(maxDelta,d);visible+=pixels[0][i]>20;}
      }
      const timings=[];
      for(const count of [0,1,8,16]){
        pointer.taps=Array.from({length:count},(_,i)=>({x:80+i%4*70,y:100+Math.floor(i/4)*150,width:92,age:1.1,strength:1,seed:i*17,breakupTime:3}));
        const samples=[[],[]];
        for(let round=0;round<9;round++)for(const index of round%2?[1,0]:[0,1]){
          const r=pair[index];r.gl.finish();const start=performance.now();
          for(let frame=0;frame<64;frame++)r.render(4,'human',false,pointer,0,1,3);
          r.gl.readPixels(0,0,1,1,r.gl.RGBA,r.gl.UNSIGNED_BYTE,new Uint8Array(4));if(round>1)samples[index].push((performance.now()-start)/64);
        }
        const med=s=>s.sort((a,b)=>a-b)[Math.floor(s.length/2)];
        timings.push({taps:count,beforeMs:med(samples[0]),afterMs:med(samples[1])});
      }
      results.push({type,changed,maxDelta,visible,timings,errors:pair.map(r=>r.gl.getError())});pair.forEach(r=>r.dispose());
    }
    text.dispose();return results;
  });
  console.log(JSON.stringify(result,null,2));
  await writeFile(new URL('../output/renderer-profile.json',import.meta.url),JSON.stringify(result,null,2));
  for(const r of result){assert.ok(r.visible>1000);assert.equal(r.changed,0,'Optimization preserves rendered pixels');assert.deepEqual(r.errors,[0,0]);}
}finally{await browser.close();}

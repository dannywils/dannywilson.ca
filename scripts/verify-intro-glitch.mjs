import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const baseline=execFileSync('git',['show','5ec505c:site/portrait-gl.mjs'],{encoding:'utf8'});
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/glitch-baseline.mjs',r=>r.fulfill({contentType:'text/javascript',body:baseline}));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const results=await page.evaluate(async()=>{
    const {PortraitGL:Before}=await import('/glitch-baseline.mjs'),{PortraitGL:After}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const letters=document.createElement('canvas');letters.width=letters.height=256;
    const ctx=letters.getContext('2d');ctx.fillStyle='white';ctx.font='bold 50px Arial';ctx.fillText('DANNY',10,100);ctx.fillText('WILSON',10,160);
    const results=[];
    for(const text of [false,true]){
      const pair=[Before,After].map(Renderer=>{
        const r=new Renderer(document.createElement('canvas'),text?letters:image,structuredClone(config),{text});
        r.resize(390,600);r.gl.uniform1f(r.uniforms.entranceSeed,7);return r;
      });
      const changed=[];
      for(const [assembly,reduced] of [[.2,false],[.45,false],[.7,false],[1,false],[.4,true]]){
        const frames=pair.map(r=>{
          r.render(assembly*4.8,'human',reduced,{x:-2,y:-2,strength:0},0,assembly,0);
          const g=r.gl,p=new Uint8Array(390*600*4);g.readPixels(0,0,390,600,g.RGBA,g.UNSIGNED_BYTE,p);return p;
        });
        changed.push({assembly,reduced,bytes:frames[0].reduce((n,v,i)=>n+(Math.abs(v-frames[1][i])>2),0)});
      }
      results.push({text,changed,errors:pair.map(r=>r.gl.getError())});pair.forEach(r=>r.dispose());
    }
    return results;
  });
  console.log('Intro glitch comparison:',JSON.stringify(results));
  for(const result of results){
    for(const frame of result.changed)assert.ok(frame.assembly===1||frame.reduced?frame.bytes===0:frame.bytes>1000,'Stronger intro corruption preserves exact landing and reduced motion');
    assert.deepEqual(result.errors,[0,0]);
  }
}finally{await browser.close();}

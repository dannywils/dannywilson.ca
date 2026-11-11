import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  assert.ok(requests.some(r=>r.endsWith('/portrait.webp')));
  assert.ok(!requests.some(r=>r.endsWith('/portrait-static.svg')||r.endsWith('/portrait.png')),'Working WebGL downloads only the compressed portrait');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const text=new TextEffect(document.createElement('canvas'),document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    const results=[];
    for(const isText of [false,true]){
      const pair=[true,false].map(indexed=>{
        const r=new PortraitGL(document.createElement('canvas'),isText?text.source:image,structuredClone(isText?text.textConfig:config),{text:isText,indexed});
        r.resize(640,640);r.gl.uniform1f(r.uniforms.entranceSeed,7);
        if(isText){r.setIdentityBounds(text.identityRegions);r.setAnchoredBounds(text.emailRegion);r.showAnchored(true);}return r;
      });
      const [fast,legacy]=pair;let changed=0;
      for(const [assembly,breakup] of [[0,0],[.35,0],[.85,0],[1,0],[1,2],[1,8]]){
        const samples=pair.map(r=>{
          r.render(0,'human',false,{x:-2,y:-2,strength:0},0,assembly,breakup);
          const a=new Uint8Array(640*640*4);r.gl.readPixels(0,0,640,640,r.gl.RGBA,r.gl.UNSIGNED_BYTE,a);return a;
        });
        changed+=samples[0].reduce((n,v,i)=>n+(v!==samples[1][i]),0);
      }
      for(let i=0;i<20;i++)for(const r of pair)r.updateInteraction(i/60,false,{x:.3+i*.01,y:.4,strength:1,radius:.15});
      let interactionDiff=0;
      for(let i=0;i<fast.meshColumns*fast.meshRows;i++)for(let channel=0;channel<2;channel++)interactionDiff=Math.max(interactionDiff,Math.abs(fast.interactions[i*fast.interactionStride+channel]-legacy.interactions[i*legacy.interactionStride+channel]));
      results.push({text:isText,indexed:fast.indexed,changed,interactionDiff,vertices:fast.vertexCount,legacyVertices:legacy.vertexCount,interactionBytes:fast.interactions.byteLength,legacyInteractionBytes:legacy.interactions.byteLength,errors:pair.map(r=>r.gl.getError())});
      pair.forEach(r=>r.dispose());
    }
    text.dispose();return results;
  });
  for(const r of result){assert.ok(r.indexed);assert.equal(r.changed,0,'Indexed and legacy rendering are pixel-identical');assert.equal(r.interactionDiff,0);assert.equal(r.vertices*3,r.legacyVertices*2);assert.equal(r.interactionBytes*3,r.legacyInteractionBytes*2);assert.deepEqual(r.errors,[0,0]);}
  const fallback=await browser.newPage();await fallback.route('**/main.mjs',r=>r.abort());
  await fallback.goto('http://localhost:8080');await fallback.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/portrait-static.svg')&&r.responseEnd>0));
  assert.ok(await fallback.locator('.fallback').isVisible());
  const nojs=await browser.newPage({javaScriptEnabled:false});
  await nojs.goto('http://localhost:8080');assert.ok(await nojs.locator('.fallback').isVisible());
  assert.deepEqual(errors,[]);console.log('Loading and pixel-exact indexed rendering passed:',result);
}finally{await browser.close();}

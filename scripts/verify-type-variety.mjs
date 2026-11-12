import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const baseline=execFileSync('git',['show','7c5a357:site/portrait-gl.mjs'],{encoding:'utf8'});
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/type-baseline.mjs',r=>r.fulfill({contentType:'text/javascript',body:baseline}));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  const results=await page.evaluate(async()=>{
    const {PortraitGL:Before}=await import('/type-baseline.mjs'),{PortraitGL:After}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const solid=document.createElement('canvas');solid.width=solid.height=256;
    const ctx=solid.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,256,256);
    const diff=(a,b)=>a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>2),0),results=[];
    for(const text of [false,true]){
      const pair=[Before,After].map(Renderer=>{
        const c=structuredClone(config);if(text){c.ascii.mobileColumns=24;c.shader.zoom=1;c.shader.centerX=c.shader.centerY=0;}
        const r=new Renderer(document.createElement('canvas'),text?solid:image,c,{text,idleGlitch:false,sceneGlitch:false});
        r.resize(390,600);r.gl.uniform1f(r.uniforms.entranceSeed,7);return r;
      });
      const sample=(r,time,reduced,assembly=1)=>{
        r.render(time,'human',reduced,{x:-2,y:-2,strength:0},0,assembly,0);
        const g=r.gl,a=new Uint8Array(390*600*4);g.readPixels(0,0,390,600,g.RGBA,g.UNSIGNED_BYTE,a);return a;
      };
      const changes=[.3,.7,1].map(assembly=>diff(sample(pair[0],2,false,assembly),sample(pair[1],2,false,assembly)));
      const reduced=diff(sample(pair[1],0,true),sample(pair[1],8,true));
      const rewriting=diff(sample(pair[1],0,false),sample(pair[1],.3,false));
      // A flat source must still contain visibly different glyph silhouettes.
      const pixels=sample(pair[1],0,true),patterns=new Set();
      for(let row=3;row<15;row++)for(let col=3;col<21;col++){
        let pattern='';for(let y=0;y<12;y++)for(let x=0;x<8;x++){
          const px=Math.floor((col+(x+.5)/8)*390/24),py=Math.floor(105+(row+(y+.5)/12)*390/18);
          pattern+=pixels[((599-py)*390+px)*4+3]>100?'1':'0';
        }patterns.add(pattern);
      }
      results.push({text,changes,reduced,rewriting,patterns:patterns.size,errors:pair.map(r=>r.gl.getError())});pair.forEach(r=>r.dispose());
    }return results;
  });
  console.log('ASCII glyph variety:',results);
  assert.ok(results[0].changes.every(n=>n===0),'Portrait remains pixel-identical');
  assert.ok(results[1].changes.every(n=>n>1000),'Text gains distinct glyphs throughout entry and rest');
  assert.ok(results[1].patterns>30&&results[1].rewriting>1000,'Flat letter ink supports diverse, rewriting glyph shapes');
  for(const r of results){assert.equal(r.reduced,0);assert.deepEqual(r.errors,[0,0]);}
}finally{await browser.close();}

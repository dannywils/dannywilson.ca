import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  await page.getByRole('button',{name:'Skip entrance'}).click();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const before=await metric();
  await page.evaluate(()=>new Promise(resolve=>{let n=0;const frame=()=>++n===180?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);}));
  const after=await metric();
  await page.emulateMedia({reducedMotion:'reduce'});
  const probe=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const r=new PortraitGL(document.createElement('canvas'),image,structuredClone(config));r.resize(640,640);r.gl.uniform1f(r.uniforms.entranceSeed,7);
    const pointer={x:.48,y:.4,strength:1,radius:.15};
    for(let i=0;i<12;i++)r.updateInteraction(i/60,false,pointer);
    const times=[];for(let i=12;i<72;i++){const start=performance.now();r.updateInteraction(i/60,false,pointer);times.push(performance.now()-start);}
    const interactionMs=times.reduce((a,b)=>a+b)/times.length;
    const result={cells:r.meshColumns*r.meshRows,vertices:r.vertexCount,interactionBytes:r.interactions.byteLength,indexed:!!r.indexBuffer,interactionMs};r.dispose();
    const resources=performance.getEntriesByType('resource');
    return {...result,resources:resources.map(r=>({name:new URL(r.name).pathname,bytes:r.encodedBodySize})),resourceBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0)};
  });
  const metrics=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'].map(k=>[k,after[k]-before[k]]));
  const result={viewport:'1440x900 Edge on development host',frames:180,...metrics,...probe};
  await writeFile(`output/profile-${process.argv[2]??'latest'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}

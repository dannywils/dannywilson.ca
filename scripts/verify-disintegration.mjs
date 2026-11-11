import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.goto('http://localhost:8080');
  const result=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs');
    const {config}=await import('/config.mjs');
    const c=structuredClone(config);
    c.ascii.desktopColumns=c.ascii.mobileColumns=32;
    Object.assign(c.shader,{scrambleHz:0,glitchBandSpeed:0,densityJitter:0,breakup:0,
      dissolveStart:.3,dissolveEnd:.4,randomness:0,particleTravel:.6,particleSpeed:.5,debrisDensity:.6});
    // One non-transparent source cell: any extra debris would be invented content.
    const source=document.createElement('canvas');source.width=source.height=256;
    const ctx=source.getContext('2d');ctx.fillStyle='#b0b0b0';
    ctx.fillRect(20/32*256,8/24*256,256/32,256/24);
    const img=new Image();img.src=source.toDataURL();await img.decode();
    const canvas=document.createElement('canvas'),r=new PortraitGL(canvas,img,c);
    r.resize(640,480);
    const capture=t=>{
      r.render(t,'human',false,{x:-2,y:-2});
      const gl=r.gl,pixels=new Uint8Array(canvas.width*canvas.height*4);
      gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const points=[];let minX=640,maxX=-1,minY=480,maxY=-1;
      for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(pixels[(y*640+x)*4+3]>80){
        points.push([x,y]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      return {points,minX,maxX,minY,maxY};
    };
    const attached=capture(0);
    c.shader.breakup=1;r.applyConfig();
    let moved;
    for(let i=0;i<100;i++){
      const next=capture(i*.04);
      if(next.minX>attached.maxX+5 && next.points.length>attached.points.length*.85){moved=next;break;}
    }
    if(!moved)throw Error('No intact departing cell found');
    const normalized=new Set(attached.points.map(([x,y])=>`${x-attached.minX},${y-attached.minY}`));
    let matching=0;
    for(const [x,y] of moved.points)if(normalized.has(`${x-moved.minX},${y-moved.minY}`))matching++;
    const output={sourcePixels:attached.points.length,movedPixels:moved.points.length,
      shapeMatch:matching/Math.max(attached.points.length,moved.points.length),
      displacement:moved.minX-attached.minX,sourceVacated:moved.minX>attached.maxX,
      glError:r.gl.getError()};
    r.dispose();return output;
  });
  console.log(result);
  assert.ok(result.sourcePixels>20);
  assert.ok(result.sourceVacated,'The departing cell vacates its original position');
  assert.ok(result.shapeMatch>.8,'The displaced pixels preserve the source glyph shape');
  assert.ok(result.movedPixels/result.sourcePixels<1.2,'No additional particle glyphs are created');
  assert.equal(result.glError,0);
  console.log('Source-cell disintegration QA passed.');
}finally{await browser.close();}

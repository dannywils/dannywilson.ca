import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const base=process.env.SITE_URL||'http://localhost:8081';
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},deviceScaleFactor:width===390?2:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForSelector('.identity.text-ready',{state:'attached'});
  await page.evaluate(async()=>{
   const {PortraitGL}=await import('/portrait-gl.mjs'),original=PortraitGL.prototype.render;
   window.meshes={};
   PortraitGL.prototype.render=function(...args){args[0]=14;args[5]=1;args[7]=.6;const result=original.apply(this,args);window.glError=this.gl.getError();window.meshes[this.options.text?'text':'portrait']={profile:this.gradientProfile,gradient:this.meshGradient};return result;};
  });
  await page.waitForFunction(()=>window.glError!==undefined);assert.equal(await page.evaluate(()=>window.glError),0);
  const meshes=await page.evaluate(()=>window.meshes);
  assert.equal(meshes.text.gradient,true);assert.equal(meshes.portrait.gradient,true);
  assert.deepEqual(meshes.text.profile,meshes.portrait.profile);
  assert.ok(meshes.text.profile[2]>meshes.text.profile[3]);
  await page.screenshot({path:`output/density-gradient-${width}.png`});
  assert.deepEqual(errors,[]);await page.close();
 }
 const page=await browser.newPage();await page.goto(base);
 const result=await page.evaluate(async()=>{
  const {PortraitGL}=await import('/portrait-gl.mjs'),{config}=await import('/config.mjs');
  const c=structuredClone(config);Object.assign(c.shader,{zoom:1,centerX:0,centerY:0,gapFill:1,fragmentDepth:0,idleCopies:false});
  const source=document.createElement('canvas');source.width=source.height=64;
  const ctx=source.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);
  const sample=(text,gradient)=>{
   c.shader.densityGradient=gradient;
   const canvas=document.createElement('canvas'),g=canvas.getContext('webgl');let vertices;
   const bufferData=g.bufferData.bind(g);
   g.bufferData=(target,data,usage)=>{if(data instanceof Float32Array&&usage===g.STATIC_DRAW)vertices=data.slice();return bufferData(target,data,usage);};
   const r=new PortraitGL(canvas,source,c,{text,idleGlitch:false,sceneGlitch:false});
   r.setDensityGradient([0,400,12,4]);r.resize(400,400);r.render(0,'human',true,{x:-2,y:-2,strength:0},0,1,0,0);
   const p=new Uint8Array(400*400*4);g.readPixels(0,0,400,400,g.RGBA,g.UNSIGNED_BYTE,p);r.dispose();return {pixels:p,vertices};
  };
  const varied=sample(false,true),face=varied.pixels,text=sample(true,true),originalText=sample(true,false);
  const bands=[.2,.35,.5,.65].map(start=>{
   let ink=0,total=0;for(let y=120;y<300;y++)for(let x=Math.round(start*400);x<Math.round((start+.15)*400);x++){total++;if(face[(y*400+x)*4+3]>200)ink++;}
   return ink/total;
  });
  const sizes=[[],[]];for(let i=0;i<varied.vertices.length;i+=32){const v=varied.vertices,x=(v[i+4]+v[i+6])*.5,w=v[i+6]-v[i+4],h=v[i+7]-v[i+5];if(x>.25&&x<.35)sizes[0].push([w,h]);if(x>.65&&x<.75)sizes[1].push([w,h]);}
  const average=sizes.map(group=>[0,1].map(axis=>group.reduce((sum,p)=>sum+p[axis],0)/group.length));
  return {bands,average,sharedGeometry:varied.vertices.every((v,i)=>v===text.vertices[i]),textChanged:text.vertices.length!==originalText.vertices.length};
 });
 assert.ok(result.sharedGeometry&&result.textChanged);for(const band of result.bands)assert.ok(band>.99);
 for(let axis=0;axis<2;axis++)assert.ok(result.average[0][axis]>result.average[1][axis]*1.7);
 console.log('Shared gradient: larger left, smaller right, full coverage:',result);
}finally{await browser.close();}

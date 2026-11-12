import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.identity.text-ready');
  for(const [width,height] of [[320,480],[390,844],[667,375],[844,390],[1440,900],[1920,600]]){
    await page.setViewportSize({width,height});
    const layout=await page.evaluate(()=>{
      const h=document.querySelector('h1'),b=h.getBoundingClientRect();
      scrollTo(100,300);
      return {width:innerWidth,height:innerHeight,scrollX,scrollY,documentHeight:document.documentElement.scrollHeight,
        text:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},select:getComputedStyle(h).userSelect};
    });
    assert.equal(layout.scrollX+layout.scrollY,0);assert.equal(layout.documentHeight,height);
    assert.equal(layout.select,'none');assert.ok(layout.text.left>=0&&layout.text.right<=width+1&&layout.text.top>=0&&layout.text.bottom<height-65);
    await page.screenshot({path:`output/window-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  const metrics=await page.evaluate(async()=>{
    const {PortraitGL}=await import('/portrait-gl.mjs'),{TextEffect}=await import('/text-effect.mjs'),{config}=await import('/config.mjs');
    const image=new Image();image.src=config.portrait;await image.decode();
    const canvas=document.querySelector('canvas'),photo=new PortraitGL(canvas,image,structuredClone(config),{idleGlitch:false,sceneGlitch:false});
    const text=new TextEffect(canvas,document.querySelector('.identity'),structuredClone(config),matchMedia('(prefers-reduced-motion: reduce)'));
    text.renderer.options.idleGlitch=text.renderer.options.sceneGlitch=false;
    const b=document.querySelector('.portrait').getBoundingClientRect();photo.resize(innerWidth,innerHeight,b);
    const sample=(r,c,phase='human',reduced=false)=>{
      r.options.clear=true;r.render(0,phase,reduced,{x:-2,y:-2,strength:0},1,1,0,c);
      const g=r.gl,p=new Uint8Array(canvas.width*canvas.height*4);g.readPixels(0,0,canvas.width,canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);return p;
    };
    const pixels=p=>p.reduce((n,v,i)=>n+(i%4===3&&v>20),0),diff=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
    const home=sample(photo,0),middle=sample(photo,.5),gone=sample(photo,1);
    const radius=p=>{let n=0,total=0;for(let i=3;i<p.length;i+=4)if(p[i]>20){const q=(i-3)/4;total+=Math.hypot(q%canvas.width-canvas.width*.5,canvas.height-1-Math.floor(q/canvas.width)-canvas.height*.46);n++;}return total/n;};
    const name=sample(text.renderer,0),remnant=sample(text.renderer,1);
    let outside=0,changedProtected=0;
    const regions=text.identityRegions.map(([l,t,r,b])=>({l:text.bounds.left+l*text.bounds.width-8,t:text.bounds.top+t*text.bounds.height-8,r:text.bounds.left+r*text.bounds.width+8,b:text.bounds.top+b*text.bounds.height+8}));
    for(let i=3;i<remnant.length;i+=4){const q=(i-3)/4,x=q%canvas.width,y=canvas.height-1-Math.floor(q/canvas.width);
      const protectedPixel=regions.some(b=>x>=b.l&&x<=b.r&&y>=b.t&&y<=b.b);
      if(remnant[i]>20&&!protectedPixel)outside++;
      const interior=regions.some(b=>x>=b.l+9&&x<=b.r-9&&y>=b.t+9&&y<=b.b-9);
      if(interior&&remnant[i]!==name[i])changedProtected++;
    }
    window.collapseShot=c=>{photo.options.clear=true;text.renderer.options.clear=false;photo.render(0,'human',false,{x:-2,y:-2,strength:0},0,1,0,c);text.renderer.render(0,'human',false,{x:-2,y:-2,strength:0},0,1,0,c);};
    return {home:pixels(home),middle:pixels(middle),gone:pixels(gone),homeRadius:radius(home),middleRadius:radius(middle),name:pixels(name),remnant:pixels(remnant),outside,changedProtected,
      returnDiff:diff(home,sample(photo,0)),redEyeDiff:diff(home,sample(photo,0,'takeover')),reducedDiff:diff(sample(photo,0,'human',true),sample(photo,1,'human',true)),error:photo.gl.getError()};
  });
  console.log('Collapse:',metrics);
  assert.ok(metrics.home>10000&&metrics.middle>1000&&metrics.middleRadius<metrics.homeRadius*.7);
  assert.equal(metrics.gone,0);assert.ok(metrics.remnant>1000&&metrics.remnant<metrics.name*.3);
  assert.equal(metrics.outside+metrics.changedProtected+metrics.returnDiff+metrics.redEyeDiff+metrics.reducedDiff+metrics.error,0);
  await page.getByRole('button',{name:'Tune appearance'}).click();
  assert.equal(await page.getByRole('button',{name:'Test flicker'}).count(),0);assert.equal(await page.getByText('Red eye',{exact:true}).count(),0);
  await page.close();
  const mouse=await browser.newPage({viewport:{width:1440,height:900}});
  await mouse.goto('http://localhost:8080');await mouse.getByRole('button',{name:'Skip entrance'}).click();
  await mouse.evaluate(async()=>{const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;window.captureCollapse=0;PortraitGL.prototype.render=function(...args){args[0]=0;args[7]=window.captureCollapse;return render.apply(this,args);};});
  for(const [name,c] of [['home',0],['inward',.5],['ai',1]]){await mouse.evaluate(c=>window.captureCollapse=c,c);await mouse.waitForTimeout(100);await mouse.screenshot({path:`output/collapse-${name}.png`});}
  await mouse.evaluate(()=>window.captureCollapse=0);
  await mouse.evaluate(async()=>{const {PortraitGL}=await import('/portrait-gl.mjs'),render=PortraitGL.prototype.render;PortraitGL.prototype.render=function(...args){window.mouseBursts=args[3].taps?.map(t=>({...t}));return render.apply(this,args);};});
  await mouse.mouse.move(800,400);
  for(let i=1;i<=6;i++){await mouse.waitForTimeout(18);await mouse.mouse.move(800+i*22,400);}
  await mouse.waitForTimeout(40);
  const bursts=await mouse.evaluate(()=>window.mouseBursts);assert.ok(bursts.some(t=>t.velocityX>.45),'Unpressed mouse movement throws local pieces');
  await mouse.mouse.down();await mouse.mouse.move(700,450,{steps:12});await mouse.mouse.up();
  assert.equal(await mouse.evaluate(()=>getSelection().toString()),'');
  assert.deepEqual(errors,[]);console.log('Window fit, no selection, mouse flick and removed eye controls passed.');
}finally{await browser.close();}

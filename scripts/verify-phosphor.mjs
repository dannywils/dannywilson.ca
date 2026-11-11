import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8080');await page.waitForSelector('.portrait.ready');
  const result=await page.evaluate(async()=>{
    const {Phosphor}=await import('/phosphor.mjs');
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
    const gl=canvas.getContext('webgl',{alpha:true,preserveDrawingBuffer:true});
    const fx=new Phosphor(gl);
    const sample=(time,x,color=[.6,.7,.65,.8],seconds=.08,reduced=false)=>{
      fx.begin();gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      if(x!==null){gl.enable(gl.SCISSOR_TEST);gl.scissor(x,16,8,8);gl.clearColor(...color);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.SCISSOR_TEST);}
      fx.present(time,seconds,reduced);
      const p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;
    };
    const pixel=(p,x)=>Array.from(p.slice((20*canvas.width+x)*4,(20*canvas.width+x)*4+4));
    const first=sample(0,8),moved=sample(.016,40),stationary=sample(.032,40);
    const echo=pixel(moved,10),untouched=pixel(moved,90);
    const stable=pixel(moved,42).every((v,i)=>v===pixel(stationary,42)[i]);
    const faded=sample(2,null).every(v=>v===0);
    sample(3,8);const red=sample(3.01,8,[.3,.02,.01,1]);
    const dim=sample(3.02,8,[.03,.001,.001,1]);
    const redPixel=pixel(red,10),dimPixel=pixel(dim,10),firstPixel=pixel(first,10);
    const extinguished=sample(3.03,null).every(v=>v===0);
    sample(4,8);const reducedClear=sample(4.016,null,undefined,.08,true).every(v=>v===0);
    sample(5,8);const disabledClear=sample(5.016,null,undefined,0).every(v=>v===0);
    sample(5.1,8);let tail;
    for(let i=1;i<=180;i++)tail=sample(5.1+i/180,null);
    const highRefreshClear=tail.every(v=>v===0);
    sample(6,8);canvas.width=64;const resizedClear=sample(6.016,null).every(v=>v===0);
    const error=gl.getError();fx.dispose();
    return {first:firstPixel,echo,untouched,stable,faded,red:redPixel,dim:dimPixel,extinguished,reducedClear,disabledClear,highRefreshClear,resizedClear,error};
  });
  assert.ok(result.echo[3]>0&&result.echo[3]<204,'Only previous source pixels leave a fading trail');
  assert.deepEqual(result.untouched,[0,0,0,0]);
  assert.ok(result.stable&&result.faded,'Stationary detail stays constant and motion trails disappear');
  assert.ok(Math.abs(result.red[0]-77)<=1&&Math.abs(result.dim[0]-8)<=1,'A red ignition dip is not filled in by a white or brighter red afterimage');
  assert.ok(result.extinguished,'Red flicker leaves no delayed red afterimage');
  assert.ok(result.reducedClear&&result.disabledClear&&result.resizedClear,'Reduced motion, disabled effect, and resize clear history');
  assert.ok(result.highRefreshClear,'Dim trails cannot get stuck in 8-bit feedback at high refresh rates');
  assert.equal(result.error,0);
  await page.waitForSelector('[data-entrance="settled"]');
  await page.getByRole('button',{name:'Reveal',exact:true}).click();await page.waitForTimeout(1300);
  await page.screenshot({path:'output/phosphor-desktop.png'});
  await page.getByRole('button',{name:'Replay entrance'}).click();
  await page.waitForTimeout(1800);await page.screenshot({path:'output/phosphor-arrival.png'});
  await page.waitForSelector('[data-entrance="settled"]');
  // An optional framebuffer failure must retain the interactive portrait.
  await page.evaluate(async()=>{const {Phosphor}=await import('/phosphor.mjs');Phosphor.prototype.begin=function(){throw Error('test allocation failure');};});
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.portrait').getAttribute('data-renderer'),'webgl');
  assert.ok(await page.locator('.portrait-canvas').evaluate(e=>e.classList.contains('ready')));
  assert.deepEqual(errors,[]);console.log('Phosphor QA passed:',result);
}finally{await browser.close();}

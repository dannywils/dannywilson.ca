import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
  const results=[];
  for(const baseline of [true,false]){
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    if(baseline)for(const file of ['main.mjs','text-effect.mjs','experience.mjs','portrait-gl.mjs']){
      const body=execFileSync('git',['show',`${process.argv[2]??'7f29b71'}:site/${file}`],{encoding:'utf8'});
      await page.route(`**/${file}`,route=>route.fulfill({contentType:'text/javascript',body}));
    }
    await page.goto('http://localhost:8080');await page.getByRole('button',{name:'Skip entrance'}).tap();
    await page.waitForSelector('[data-entrance="settled"]');
    await page.evaluate(()=>{
      const read=Element.prototype.getBoundingClientRect;
      window.work={reads:0,mutations:0};
      Element.prototype.getBoundingClientRect=function(...args){window.work.reads++;return read.apply(this,args);};
      new MutationObserver(records=>window.work.mutations+=records.length).observe(document.querySelector('.composition'),{attributes:true,subtree:true});
    });
    const measure=()=>page.evaluate(async()=>{
      window.work.reads=0;window.work.mutations=0;
      for(let i=0;i<40;i++)await new Promise(requestAnimationFrame);
      return {...window.work};
    });
    const idle=await measure();
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:460,id:1}]});
    const held=await measure();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    results.push({baseline,idle,held});await page.close();
  }
  console.log('DOM work over 40 animated frames:',results);
  assert.equal(results[1].idle.reads,0,'Idle animation needs no layout queries');
  assert.equal(results[1].held.reads,0,'Held contact uses cached bounds');
  assert.ok(results[1].idle.mutations<results[0].idle.mutations*.2,'Idle attribute writes are reduced');
  assert.ok(results[1].held.mutations<results[0].held.mutations*.2,'Held contact avoids redundant attribute writes');
}finally{await browser.close();}

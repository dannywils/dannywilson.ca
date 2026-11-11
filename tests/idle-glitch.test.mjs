import test from 'node:test';
import assert from 'node:assert/strict';
import {idleGlitchAt} from '../site/idle-glitch.mjs';
test('idle glitches have bounded brief bursts and varied quiet intervals',()=>{
  const data=new Float32Array(3),starts=[];let active=0,last=false;
  for(let t=0;t<60;t+=.005){
    assert.equal(idleGlitchAt(t,data),data,'Reuse the uniform buffer');
    assert.ok(data[0]>=0&&data[0]<=1);assert.ok([...data].every(Number.isFinite));
    const on=data[0]>.05;if(on){active++;if(!last)starts.push(t);}last=on;
  }
  assert.ok(starts.length>40,'Idle has recurring multi-pulse events');
  assert.ok(active/12000>.07&&active/12000<.25,'Most of the timeline stays clear');
  const gaps=starts.slice(1).map((t,i)=>t-starts[i]);
  assert.ok(Math.max(...gaps)>Math.min(...gaps)*3,'Cadence includes quick echoes and longer pauses');
  assert.equal(idleGlitchAt(0)[0],0);
});

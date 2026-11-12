import test from 'node:test';
import assert from 'node:assert/strict';
import {recordGesture,flickVelocity} from '../site/flick.mjs';
import {AdaptiveQuality} from '../site/adaptive-quality.mjs';
import {sceneGlitchAt} from '../site/idle-glitch.mjs';
test('flicks use recent direction and reject slow drags or a pause before release',()=>{
  const s=[];recordGesture(s,10,10,0);recordGesture(s,40,20,40);recordGesture(s,80,30,80);
  const v=flickVelocity(s,90,30,90);assert.ok(v.velocityX>.8&&v.velocityY>0);
  assert.equal(flickVelocity(s,90,30,300),null);
  assert.equal(flickVelocity([{x:10,y:10,time:0}],20,10,100),null);
  const down=flickVelocity([{x:50,y:10,time:0}],50,100,50);assert.equal(down.velocityX,0);assert.ok(down.velocityY>1);
});
test('adaptive detail waits for sustained pressure and a quiet frame, then recovers slowly',()=>{
  const q=new AdaptiveQuality();
  for(let i=0;i<20;i++)q.observe(40);assert.equal(q.desired,3);
  for(let i=0;i<60;i++)q.observe(40);assert.equal(q.desired,1);
  assert.equal(q.commitIfCalm(false),false);assert.equal(q.limit,3);
  assert.equal(q.commitIfCalm(true),true);assert.equal(q.limit,1);
  for(let i=0;i<150;i++)q.observe(16.67);assert.equal(q.desired,1);
  for(let i=0;i<1000;i++)q.observe(16.67);assert.equal(q.desired,3);
  assert.equal(q.commitIfCalm(true),true);assert.equal(q.limit,3);
  q.observe(5000);assert.equal(q.desired,3,'A hidden-tab pause is not GPU pressure');
});
test('coordinated tears are rare, traverse the screen, and have quiet boundaries',()=>{
  const starts=[],positions=[];let on=false;
  for(let t=0;t<120;t+=.01){const s=sceneGlitchAt(t);if(s[0]>.01){positions.push(s[1]);if(!on)starts.push(t);on=true;}else on=false;}
  assert.equal(starts.length,4);assert.ok(starts.slice(1).every((t,i)=>t-starts[i]>24));
  assert.ok(Math.min(...positions)<0&&Math.max(...positions)>1);assert.equal(sceneGlitchAt(0)[0],0);
});

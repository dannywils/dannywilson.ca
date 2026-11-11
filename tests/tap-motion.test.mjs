import test from 'node:test';
import assert from 'node:assert/strict';
import {tapProgress,tapDuration,tapDriftSeconds,addTap,advanceTaps,maxTapBursts} from '../site/tap-motion.mjs';
test('tap drifts for about a second, then takes longer to return without a snap',()=>{
  assert.equal(tapProgress(0),0);assert.equal(tapProgress(tapDriftSeconds),1);assert.equal(tapProgress(tapDuration),0);
  assert.ok(tapProgress(.9)>tapProgress(.3));
  assert.ok(tapProgress(2)>.7&&tapProgress(3)<.3);
  for(let t=0;t<tapDuration;t+=.005){
    assert.ok(tapProgress(t)>=0&&tapProgress(t)<=1);
    assert.ok(Math.abs(tapProgress(t+.001)-tapProgress(t))<.002);
  }
  assert.ok(tapProgress(tapDuration-.01)<.00001);
});
test('overlapping taps retain separate clocks and expire independently',()=>{
  const taps=[];addTap(taps,{x:100,y:100,width:90});advanceTaps(taps,1.2);
  const first=taps[0];addTap(taps,{x:140,y:130,width:90});
  assert.equal(taps[0],first);assert.equal(taps[0].age,1.2);assert.equal(taps[1].age,0);
  const second=taps[1];advanceTaps(taps,2.7);
  assert.deepEqual(taps,[second]);assert.equal(second.strength,tapProgress(2.7));
  advanceTaps(taps,1.2);assert.deepEqual(taps,[]);
});
test('rapid input never evicts a live burst and expired capacity is reused',()=>{
  const taps=[];
  for(let i=0;i<maxTapBursts;i++)addTap(taps,{x:i,y:100,width:90});
  const original=[...taps];addTap(taps,{x:999,y:100,width:90});
  assert.deepEqual(taps,original);
  advanceTaps(taps,tapDuration);addTap(taps,{x:999,y:100,width:90});
  assert.equal(taps.length,1);assert.equal(taps[0].x,999);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {tapProgress,tapDuration,tapDriftSeconds} from '../site/tap-motion.mjs';
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

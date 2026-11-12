import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneTimeline} from '../site/timeline.mjs';
test('collapse reaches an A/I-only pause and reforms continuously across the loop',()=>{
  const settings={cycleDuration:26};
  assert.equal(sceneTimeline(0,settings).collapse,0);
  assert.equal(sceneTimeline(26*.63,settings).collapse,1);
  assert.equal(sceneTimeline(26,settings).collapse,0);
  assert.ok(sceneTimeline(26*.8,settings).returning);
  let last=0;
  for(let t=0;t<260;t+=.01){const c=sceneTimeline(t,settings).collapse;assert.ok(c>=0&&c<=1);assert.ok(Math.abs(c-last)<.003);last=c;}
});

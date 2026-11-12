import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneTimeline} from '../site/timeline.mjs';
test('ambient drift time stays continuous without a disappearance or loop reset',()=>{
  const settings={cycleDuration:26};
  assert.equal(sceneTimeline(0,settings).driftTime,0);
  assert.equal(sceneTimeline(26,settings).driftTime,1);
  assert.equal(sceneTimeline(52,settings).driftTime,2);
  let last=0;
  for(let t=0;t<260;t+=.01){const scene=sceneTimeline(t,settings);assert.equal(scene.erosion,0);assert.ok(scene.driftTime>=last&&scene.driftTime-last<.001);last=scene.driftTime;}
});

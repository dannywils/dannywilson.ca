// Continuous time lets sparse source shards breathe outward independently.
// No whole-scene disappearance, synchronized crest, or reset at cycle boundaries.
export function sceneTimeline(seconds,settings){
  const t=Math.max(0,seconds),period=Math.max(8,settings.cycleDuration??26);
  return {erosion:0,driftTime:t/period};
}

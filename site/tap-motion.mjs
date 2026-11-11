export const tapDriftSeconds=1.1;
export const tapReturnSeconds=2.7;
export const tapDuration=tapDriftSeconds+tapReturnSeconds;
// Bound shader work without ever evicting a burst that is still returning home.
export const maxTapBursts=16;

export function addTap(taps,point){
  if(taps.length>=maxTapBursts)return;
  taps.push({...point,age:0,strength:0,seed:Math.random()*997});
}

export function advanceTaps(taps,delta){
  for(let i=taps.length-1;i>=0;i--){
    const tap=taps[i];tap.age+=delta;tap.strength=tapProgress(tap.age);
    if(tap.age>=tapDuration)taps.splice(i,1);
  }
}

// Launch with momentum, coast to the crest, then accelerate gently home and settle.
export function tapProgress(age){
  if(age<=0||age>=tapDuration)return 0;
  if(age<=tapDriftSeconds)return Math.sin(age/tapDriftSeconds*Math.PI/2);
  const t=(age-tapDriftSeconds)/tapReturnSeconds;
  return 1-t*t*t*(t*(t*6-15)+10);
}

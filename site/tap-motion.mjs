export const tapDriftSeconds=1.1;
export const tapReturnSeconds=2.7;
export const tapDuration=tapDriftSeconds+tapReturnSeconds;

// Launch with momentum, coast to the crest, then accelerate gently home and settle.
export function tapProgress(age){
  if(age<=0||age>=tapDuration)return 0;
  if(age<=tapDriftSeconds)return Math.sin(age/tapDriftSeconds*Math.PI/2);
  const t=(age-tapDriftSeconds)/tapReturnSeconds;
  return 1-t*t*t*(t*(t*6-15)+10);
}

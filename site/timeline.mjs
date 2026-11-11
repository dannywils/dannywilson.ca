const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// A bounded, asymmetric tide drives the existing source-cell flight paths.
// Time never resets at a cycle seam: departure eases into return, then the next
// swell. The original face stays present even after minutes without interaction.
export function sceneTimeline(seconds,settings){
  const t=Math.max(0,seconds),period=Math.max(8,settings.cycleDuration??26);
  const clock=t/period+.08;
  const phase=clock%1;
  const swell=smooth(0,.42,phase)*(1-smooth(.42,1,phase));
  const variation=.92+.08*Math.sin(clock*Math.PI*2*.618);
  const reach=(settings.sweepDuration??18)*.15*(settings.erosionReach??1);
  const erosion=smooth(0,1.6,t)*reach*swell*variation;
  return {erosion,swell,phase,returning:phase>.42};
}

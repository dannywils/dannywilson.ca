const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// Slow inward collapse, a brief A/I-only pause, then a gentler reconstruction.
// Both ends have zero velocity so the loop has no positional reset.
export function sceneTimeline(seconds,settings){
  const t=Math.max(0,seconds),period=Math.max(8,settings.cycleDuration??26);
  const clock=t/period;
  const phase=clock%1;
  const collapse=smooth(0,.58,phase)*(1-smooth(.68,1,phase));
  return {erosion:0,collapse,phase,returning:phase>.68};
}

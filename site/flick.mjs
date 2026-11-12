export function recordGesture(samples,x,y,time){
  samples.push({x,y,time});
  while(samples.length>1&&(samples.length>16||time-samples[0].time>120))samples.shift();
}

export function flickVelocity(samples,x,y,time){
  const first=samples.find(s=>time-s.time<=120);
  if(!first)return null;
  const dt=time-first.time,dx=x-first.x,dy=y-first.y,distance=Math.hypot(dx,dy);
  if(dt<12||distance<18||distance/dt<.45)return null;
  const momentum=Math.min(2,Math.max(.6,distance/dt));
  return {velocityX:dx/distance*momentum,velocityY:dy/distance*momentum};
}

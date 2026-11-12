const random=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const pulse=(age,start,duration)=>smooth(start,start+.014,age)*(1-smooth(start+duration-.025,start+duration,age));

// Short, uneven double/triple bursts, independent of pointer activity and eye cues.
// Sample once per renderer/frame; the shader only chooses the affected source cells.
export function idleGlitchAt(seconds,out=new Float32Array(3)){
  const time=Math.max(0,seconds),epoch=Math.floor(time/2.1);
  const age=time-epoch*2.1-(.25+random(epoch+1)*.8);
  const first=pulse(age,0,.12+random(epoch+7)*.045)*.8;
  const second=pulse(age,.18+random(epoch+13)*.04,.1+random(epoch+19)*.035);
  const third=random(epoch+29)>.45?pulse(age,.38,.085)*.7:0;
  out[0]=Math.max(first,second,third);
  out[1]=epoch*13.7+(second>0?17:third>0?31:0);
  out[2]=Math.floor(time*29);
  return out;
}

// One occasional viewport-space tear connects both renderers. Its cadence is
// deliberately separate from the small, frequent idle glitches.
export function sceneGlitchAt(seconds,out=new Float32Array(4)){
  const time=Math.max(0,seconds),epoch=Math.floor(time/29);
  const age=time-epoch*29-(17+random(epoch+73)*4),duration=.82;
  out[0]=pulse(age,0,duration);
  out[1]=-.08+1.16*smooth(0,duration,age);
  out[2]=epoch*19.3+53;
  out[3]=(random(epoch+89)>.5?1:-1)*(9+random(epoch+97)*5);
  return out;
}

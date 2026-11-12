// Keep glyph density and output resolution fixed. Only shard subdivision changes,
// after sustained frame pressure and at a quiet, fully reformed point in the scene.
export class AdaptiveQuality {
  constructor(){this.limit=3;this.desired=3;this.sinceChange=0;this.fastTime=0;this.resetSamples();}
  resetSamples(){this.elapsed=0;this.frames=0;this.slow=0;}
  observe(delta){
    if(delta<=0||delta>250)return;
    this.sinceChange+=delta;this.elapsed+=delta;this.frames++;this.slow+=delta>24;
    if(this.elapsed<2400||this.frames<40)return;
    const average=this.elapsed/this.frames,ratio=this.slow/this.frames;
    if(average>25&&ratio>.45){this.desired=1;this.fastTime=0;}
    else if(average<19&&ratio<.1){
      this.fastTime+=this.elapsed;
      if(this.fastTime>=12000&&this.sinceChange>=15000)this.desired=3;
    }else this.fastTime=0;
    this.resetSamples();
  }
  commitIfCalm(calm){
    if(!calm||this.limit===this.desired)return false;
    this.limit=this.desired;this.sinceChange=0;this.fastTime=0;return true;
  }
}

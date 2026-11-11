import { PortraitGL } from './portrait-gl.mjs';

// Rasterize the real DOM letter shapes once, then transport those pixels on the GPU.
export class TextEffect {
  constructor(canvas, element, config, motion) {
    Object.assign(this,{canvas,element,config,motion});
    this.source=document.createElement('canvas');
    this.pointer={x:-2,y:-2,tx:-2,ty:-2,strength:0,targetStrength:0};
    this.listeners=[];
    const on=(name,fn)=>{element.addEventListener(name,fn);this.listeners.push([name,fn]);};
    const move=e=>{
      if(motion.matches||e.isPrimary===false||!this.bounds)return;
      this.position();
      const p=this.pointer,b=this.bounds;
      p.tx=(e.clientX-b.left)/b.width;p.ty=(e.clientY-b.top)/b.height;
      if(p.strength<.01){p.x=p.tx;p.y=p.ty;}
      p.targetStrength=e.gather||(p.tx>=0&&p.tx<=1&&p.ty>=0&&p.ty<=1)?1:0;
    };
    this.movePointer=move;
    // Scene pointer ownership lives in experience.mjs; only keyboard focus is local.
    on('focusin',e=>{
      if(motion.matches||!this.bounds)return;
      const b=e.target.getBoundingClientRect();
      move({clientX:b.left+b.width/2,clientY:b.top+b.height/2,isPrimary:true});
    });
    on('focusout',()=>this.leave());
    this.refresh();
  }
  leave(){this.pointer.targetStrength=0;}
  position(){
    if(!this.bounds)return;
    const b=this.element.getBoundingClientRect();
    this.bounds.left=b.left+this.offsetX;this.bounds.top=b.top+this.offsetY;
    this.renderer?.setBounds(this.bounds);
  }
  applyConfig(){
    this.textConfig={...this.config,ascii:{...this.config.ascii},shader:{...this.config.shader,
      breakup:this.config.shader.breakup*(this.config.shader.textBreakup??.25),zoom:1,centerX:0,centerY:0}};
    if(this.renderer){this.renderer.config=this.textConfig;this.renderer.applyConfig();}
  }
  updateConfig(){
    if(getComputedStyle(this.element.querySelector('h1')).letterSpacing!==this.letterSpacing)this.refresh();
    else this.applyConfig();
  }
  refresh(){
    this.letterSpacing=getComputedStyle(this.element.querySelector('h1')).letterSpacing;
    const anchor=this.element.getBoundingClientRect(),letters=[];
    const walker=document.createTreeWalker(this.element,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,parent=node.parentElement;
      if(!parent.closest('h1,.email'))continue;
      const style=getComputedStyle(parent);
      for(let i=0;i<node.length;i++){
        if(!node.data[i].trim())continue;
        const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
        const box=range.getBoundingClientRect();
        if(!box.width||!box.height)continue;
        letters.push({char:node.data[i],box,font:`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          accent:!!parent.closest('.ai-letter'),email:!!parent.closest('.email')});
      }
    }
    if(!letters.length)return;
    const pad=48,dpr=Math.min(devicePixelRatio||1,2);
    const left=Math.min(...letters.map(l=>l.box.left))-pad,top=Math.min(...letters.map(l=>l.box.top))-pad;
    const right=Math.max(...letters.map(l=>l.box.right))+pad,bottom=Math.max(...letters.map(l=>l.box.bottom))+pad;
    this.bounds={left,top,width:Math.ceil(right-left),height:Math.ceil(bottom-top)};
    this.offsetX=left-anchor.left;this.offsetY=top-anchor.top;
    this.source.width=Math.ceil(this.bounds.width*dpr);this.source.height=Math.ceil(this.bounds.height*dpr);
    const ctx=this.source.getContext('2d');ctx.scale(dpr,dpr);
    for(const letter of letters){
      ctx.font=letter.font;ctx.textBaseline='alphabetic';
      const metrics=ctx.measureText(letter.char),ascent=metrics.fontBoundingBoxAscent,descent=metrics.fontBoundingBoxDescent;
      const x=letter.box.left-left,y=letter.box.top-top+(letter.box.height-ascent-descent)/2+ascent;
      ctx.fillStyle=letter.email?'#b3b8b5':'#f4f1e7';
      ctx.fillText(letter.char,x,y);
    }
    this.applyConfig();
    if(this.renderer)this.renderer.updateSource(this.source);
    else this.renderer=new PortraitGL(this.canvas,this.source,this.textConfig,{text:true,clear:false});
    this.identityRegions=letters.filter(l=>l.accent).map(({box})=>[
      (box.left-left)/this.bounds.width,(box.top-top)/this.bounds.height,
      (box.right-left)/this.bounds.width,(box.bottom-top)/this.bounds.height]);
    this.renderer.setIdentityBounds(this.identityRegions);
    const emailLetters=letters.filter(l=>l.email);
    // Protect the complete email cells, including shards crossing a glyph edge.
    this.emailRegion=emailLetters.length?[
      (Math.min(...emailLetters.map(l=>l.box.left))-left-4)/this.bounds.width,
      (Math.min(...emailLetters.map(l=>l.box.top))-top-4)/this.bounds.height,
      (Math.max(...emailLetters.map(l=>l.box.right))-left+4)/this.bounds.width,
      (Math.max(...emailLetters.map(l=>l.box.bottom))-top+4)/this.bounds.height]:[0,0,0,0];
    this.renderer.setAnchoredBounds(this.emailRegion);
    this.renderer.resize(innerWidth,innerHeight,this.bounds);
  }
  render(time,phase,reduced,light,breakupTime,interactive=true,assembly=1,brush){
    if(!this.renderer)return;
    const settled=reduced||assembly>=1;
    this.element.classList.toggle('email-settled',settled);
    this.renderer.showAnchored(true);
    const delta=Math.max(0,Math.min(.1,time-(this.lastTime??time)));this.lastTime=time;
    const p=this.pointer;
    if(brush){p.radius=brush.radius/this.bounds.width;p.reveal=brush.reveal;p.trail=this.config.shader.trailPersistence;}
    p.taps=brush?.taps??[];
    if(reduced||!interactive){p.strength=0;if(reduced)p.targetStrength=0;}
    else{
      const follow=1-Math.exp(-delta/.065);p.x+=(p.tx-p.x)*follow;p.y+=(p.ty-p.y)*follow;
      p.strength+=(p.targetStrength-p.strength)*(1-Math.exp(-delta/.11));
    }
    this.renderer.render(time,phase,reduced,p,light,assembly,breakupTime);
    this.element.classList.add('text-ready');
  }
  dispose(){
    for(const [name,fn] of this.listeners)this.element.removeEventListener(name,fn);
    this.renderer?.dispose();this.element.classList.remove('text-ready','email-settled');
  }
}

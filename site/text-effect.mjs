import { PortraitGL } from './portrait-gl.mjs';

// Rasterize the real DOM letter shapes once, then transport those pixels on the GPU.
export class TextEffect {
  constructor(canvas, element, config, motion) {
    Object.assign(this,{canvas,element,config,motion});
    this.source=document.createElement('canvas');
    this.glow=document.createElement('canvas');
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
    on('pointerenter',move);on('pointermove',move);
    on('pointerdown',e=>{move(e);if(e.isPrimary!==false&&e.pointerType!=='mouse'&&!e.target.closest('.email'))element.setPointerCapture(e.pointerId);});
    on('pointerup',e=>{if(e.pointerType!=='mouse')this.leave();});
    for(const event of ['pointerleave','pointercancel','lostpointercapture'])on(event,()=>this.leave());
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
  refresh(){
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
    for(const image of [this.source,this.glow]){image.width=Math.ceil(this.bounds.width*dpr);image.height=Math.ceil(this.bounds.height*dpr);}
    const ctx=this.source.getContext('2d'),halo=this.glow.getContext('2d');ctx.scale(dpr,dpr);halo.scale(dpr,dpr);
    for(const letter of letters){
      ctx.font=halo.font=letter.font;ctx.textBaseline=halo.textBaseline='alphabetic';
      const metrics=ctx.measureText(letter.char),ascent=metrics.fontBoundingBoxAscent,descent=metrics.fontBoundingBoxDescent;
      const x=letter.box.left-left,y=letter.box.top-top+(letter.box.height-ascent-descent)/2+ascent;
      ctx.fillStyle=letter.accent?'#ff0000':letter.email?'#949b9a':'#f4f1e7';
      ctx.fillText(letter.char,x,y);
      if(letter.accent){
        halo.fillStyle='rgb(255,0,0)';
        for(const [blur,alpha] of [[5,.6],[20,.38],[42,.16]]){
          halo.shadowBlur=blur*dpr;halo.shadowColor=`rgba(255,0,0,${alpha})`;halo.fillText(letter.char,x,y);
        }
      }
    }
    this.textConfig={...this.config,ascii:{...this.config.ascii},shader:{...this.config.shader,
      breakup:this.config.shader.breakup*(this.config.shader.textBreakup??.25),zoom:1,centerX:0,centerY:0}};
    if(this.renderer){this.renderer.config=this.textConfig;this.renderer.updateSource(this.source,this.glow);this.renderer.applyConfig();}
    else this.renderer=new PortraitGL(this.canvas,this.source,this.textConfig,{text:true,glow:this.glow,clear:false});
    this.renderer.resize(innerWidth,innerHeight,this.bounds);
  }
  render(time,phase,reduced,light,breakupTime,interactive=true,assembly=1,brush){
    if(!this.renderer)return;
    const delta=Math.max(0,Math.min(.1,time-(this.lastTime??time)));this.lastTime=time;
    const p=this.pointer;
    if(brush){p.radius=brush.radius/this.bounds.width;p.reveal=brush.reveal;p.trail=this.config.shader.trailPersistence;}
    const pulse=brush?.pulse,b=this.bounds;
    p.pulse=pulse?{x:(pulse.x-b.left)/b.width,y:(pulse.y-b.top)/b.height,radius:pulse.radius/b.width,width:pulse.width/b.width}:null;
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
    this.renderer?.dispose();this.element.classList.remove('text-ready');
  }
}

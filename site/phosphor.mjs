// A short, frame-time-driven afterimage of the rendered source pixels.
// Max compositing leaves stationary detail unchanged instead of brightening it.
export class Phosphor {
  constructor(gl) {
    this.gl=gl;this.targets=[];this.shaders=[];this.readIndex=0;
    try {
      const compile=(type,source)=>{
        const shader=gl.createShader(type);this.shaders.push(shader);
        gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      this.program=gl.createProgram();
      gl.attachShader(this.program,compile(gl.VERTEX_SHADER,`
        attribute vec2 position; varying vec2 uv;
        void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}
      `));
      gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,`
        precision highp float;
        varying vec2 uv; uniform sampler2D scene; uniform sampler2D previous;
        uniform float retention;
        bool red(vec4 p){return p.r>.005&&p.r>p.g*2.&&p.r>p.b*2.;}
        void main(){
          vec4 current=texture2D(scene,uv);
          // Half a byte prevents dim RGBA8 trails rounding back to the same value
          // forever at high refresh rates. Bright trails follow exponential decay.
          vec4 echo=max(texture2D(previous,uv)*retention-vec4(.501/255.),vec4(0.));
          // Keep the eye and A/I ignition envelope crisp, including its dark dips.
          if(red(current)||red(echo))echo=vec4(0.);
          if(echo.a<.004)echo=vec4(0.);
          gl_FragColor=max(current,echo);
        }
      `));
      gl.linkProgram(this.program);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
      this.position=gl.getAttribLocation(this.program,'position');
      this.uniforms=Object.fromEntries(['scene','previous','retention'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    }catch(error){this.dispose();throw error;}
  }
  resize(width,height){
    if(width===this.width&&height===this.height)return;
    const gl=this.gl;this.releaseTargets();this.width=width;this.height=height;
    for(let i=0;i<3;i++){
      const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();
      this.targets.push({texture,framebuffer});
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Phosphor target unavailable');
    }
    this.clear();
  }
  clear(){
    const gl=this.gl;this.readIndex=0;this.lastTime=null;
    gl.clearColor(0,0,0,0);
    for(const t of this.targets){gl.bindFramebuffer(gl.FRAMEBUFFER,t.framebuffer);gl.clear(gl.COLOR_BUFFER_BIT);}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  begin(){
    const gl=this.gl;this.resize(gl.canvas.width,gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.targets[0].framebuffer);
    gl.viewport(0,0,this.width,this.height);
  }
  present(time,seconds,reduced=false){
    const gl=this.gl,delta=this.lastTime===null?Infinity:Math.max(0,time-this.lastTime);
    this.lastTime=time;
    const retention=reduced||seconds<=0?0:Math.exp(-delta/seconds);
    const previous=this.targets[1+this.readIndex],next=this.targets[1+(1-this.readIndex)];
    gl.disable(gl.BLEND);gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);
    gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
    gl.uniform1i(this.uniforms.scene,0);gl.uniform1i(this.uniforms.previous,1);
    const pass=(target,texture,decay)=>{
      gl.bindFramebuffer(gl.FRAMEBUFFER,target);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,previous.texture);
      gl.uniform1f(this.uniforms.retention,decay);gl.drawArrays(gl.TRIANGLES,0,6);
    };
    pass(next.framebuffer,this.targets[0].texture,retention);
    pass(null,next.texture,0);
    this.readIndex=1-this.readIndex;
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  }
  releaseTargets(){
    for(const t of this.targets){this.gl.deleteFramebuffer(t.framebuffer);this.gl.deleteTexture(t.texture);}
    this.targets=[];
  }
  dispose(){
    this.releaseTargets();
    if(this.buffer)this.gl.deleteBuffer(this.buffer);
    if(this.program)this.gl.deleteProgram(this.program);
    for(const shader of this.shaders)this.gl.deleteShader(shader);
  }
}

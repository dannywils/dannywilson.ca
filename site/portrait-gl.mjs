// One GPU pass: each source fragment is a movable quad, rendered exactly once.
// The source photograph is sampled only for tone/alpha; it is never composited.
const vertexSource = `
attribute vec2 position;
attribute vec2 origin;
attribute vec2 interaction;
uniform vec2 resolution;
uniform vec4 portraitBounds;
uniform vec2 imageSize;
uniform vec3 placement;
uniform vec4 dissolve;
uniform vec3 debrisControls;
uniform float columns;
uniform vec2 meshGrid;
uniform float driftSpread;
uniform float portraitMode;
uniform vec4 identityA;
uniform vec4 identityI;
uniform vec2 identityControls;
uniform vec4 anchoredRegion;
uniform float time;
uniform float breakupTime;
uniform float sweepDuration;
uniform float motion;
uniform float assembly;
uniform float entranceSeed;
uniform vec3 flowControls;
uniform vec2 introTiming;
uniform float erosionStructure;
uniform float fragmentDepth;
uniform float flightDepth;
varying vec2 uv;
varying float fragmentLife;
varying vec2 cellInteraction;
varying float fragmentShade;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float inside(vec2 p,vec4 rect) {
  return step(rect.x,p.x)*step(p.x,rect.z)*step(rect.y,p.y)*step(p.y,rect.w);
}
void main() {
  vec2 grid=meshGrid;
  vec2 cell=floor(origin*grid);
  cellInteraction=interaction*motion;
  float local=cellInteraction.x;
  // Positive interaction scatters; negative interaction is the explicit Reveal action.
  float restored=smoothstep(.08,.8,max(-local,0.));
  float identity=max(inside(origin,identityA),inside(origin,identityI));
  float anchored=inside(origin,anchoredRegion);
  float amount=debrisControls.x*mix(1.,identityControls.y,identity)*(1.-anchored);
  float released=step(hash(cell+113.2),amount)*step(.00001,amount);
  float seed=hash(cell+17.3);
  vec2 introCell=cell+entranceSeed;
  // Nearby pieces gather in soft clusters, with independent late stragglers.
  // Both renderers use the same normalized rhythm without a rigid wipe front.
  float cluster=noise(origin*vec2(5.,7.)+entranceSeed*.13+17.3);
  float arrivalOrder=pow(clamp(cluster*.64+pow(hash(introCell+219.3),1.4)*.32+origin.x*.04,0.,1.),2.);
  float settleAt=mix(introTiming.y,1.,arrivalOrder);
  float rate=mix(1.,.6+seed*1.5,debrisControls.y);
  // A bounded scene clock advances and retreats this front. Returning uses the
  // same source cells and paths; there is no separate respawn particle system.
  float velocity=(max(dissolve.y,.1)+.12)/max(sweepDuration,.1);
  // Connected contours tear off in patches, with a little grain at their edges.
  float contour=noise(origin*vec2(9.,15.)+31.7)*.72+noise(origin*vec2(27.,41.)+7.3)*.28;
  float boundary=mix(hash(cell+91.7),contour,erosionStructure);
  float threshold=mix(dissolve.x,dissolve.y,boundary);
  // The silhouette opens into a volume, with a little of the original right
  // edge bias. Protect the bridge/nose through the bounded cycle, not by warping.
  vec2 radial=origin-vec2(.5,.4);
  float releasePosition=mix(origin.x,.5+length(radial*vec2(.8,1.))*.65,.65);
  float core=1.-smoothstep(.65,1.25,length(radial/vec2(.13,.18)));
  float departure=max(0.,(threshold-releasePosition)/velocity)+core*1.4*portraitMode+identity*identityControls.x;
  float flightDuration=clamp(.55/max(dissolve.w,.03)/max(rate,.2),.8,6.);
  // Main starts this clock at 72% of the intro. A cell departs immediately after
  // its own arrival when the dissolve front has reached it, without a shared hold.
  float age=clamp((breakupTime-(settleAt-introTiming.y)*introTiming.x-departure)/flightDuration,0.,1.)*motion*step(.00001,dissolve.w);
  // Touch pushes actual source shards farther along their weightless flight.
  // Its decaying trail returns them continuously to the current automatic cycle.
  float disturbance=smoothstep(.02,.9,max(local,0.))*(1.-anchored)*mix(1.,.7,identity);
  float automatic=age*released;
  float flight=(automatic+(1.-automatic)*disturbance*(.28+hash(cell+59.1)*.08))*(1.-restored);
  float burst=hash(cell+59.1);
  // Independent velocities on a sphere: no shared wind, downward gravity, or
  // screen-right destination. Each shard keeps its original source UVs.
  float azimuth=hash(cell+401.7)*6.283185;
  float z=hash(cell+417.3)*2.-1.;
  float equator=sqrt(max(0.,1.-z*z));
  float orbit=(hash(cell+431.9)-.5)*flight*1.2*flowControls.x;
  vec2 heading=vec2(cos(azimuth+orbit),sin(azimuth+orbit))*equator;
  float travel=flight*flight*(2.-flight);
  float distance=travel*dissolve.z*mix(1.,.55+burst*1.2,debrisControls.y)*driftSpread;
  float drifter=step(hash(cell+71.3),debrisControls.z)*step(.0001,debrisControls.z);
  float reach=1.+drifter*flowControls.z*1.6;
  vec2 offset=heading*distance*reach;
  float persistence=mix(.68+burst*.22,.94+burst*.06,drifter);
  fragmentLife=1.-smoothstep(persistence*.7,persistence,flight);
  vec2 size=imageSize*min(portraitBounds.z/imageSize.x,portraitBounds.w/imageSize.y);
  vec2 homeCenter=(origin-.5+placement.yz)*size*placement.x+portraitBounds.xy+portraitBounds.zw*.5;
  // Every cell begins just beyond the viewport's left edge, independent of the portrait box.
  float early=step(.84,hash(introCell+203.1));
  float delay=mix(.012+cluster*.19+hash(introCell+201.7)*.065,.004+seed*.02,early);
  float progress=clamp((assembly-delay)/(settleAt-delay),0.,1.);
  // Continuous, independently paced approaches replace the regular stop/start steps.
  // The clock remains monotonic; broad surges feel like drifting into capture.
  float tempo=hash(introCell+241.1);
  float approachClock=progress+sin(progress*3.14159)*(tempo-.5)*.42;
  float arrival=approachClock*(.8+approachClock*(1.4-approachClock*1.2));
  float remaining=1.-arrival;
  float plane=mix(-.5,.2,hash(introCell+307.1))+step(.86,hash(introCell+313.5))*1.4;
  float approach=(1.-smoothstep(.12,.9,arrival))*flightDepth*motion;
  float glyphWidth=size.x*placement.x/columns;
  float unsettled=smoothstep(.04,.18,progress)*(1.-smoothstep(.58,.9,progress));
  float glitchClock=assembly*(42.+hash(introCell+263.2)*48.);
  float glitchFrame=floor(glitchClock);
  float pulse=pow(sin(fract(glitchClock)*3.14159),4.);
  float glitch=step(.82,hash(introCell+glitchFrame*13.7))*unsettled*pulse;
  vec2 jitter=vec2(hash(introCell+glitchFrame*3.7),hash(introCell+glitchFrame*9.1))-.5;
  float rowClock=assembly*29.;
  float rowFrame=floor(rowClock);
  float rowTear=(hash(vec2(cell.y,rowFrame+entranceSeed))-.5)*resolution.x*.025
    *step(.93,hash(vec2(cell.y+77.,rowFrame)))*unsettled*pow(sin(fract(rowClock)*3.14159),4.);
  // Cubic paths bend out of a broad launch cloud at the left screen edge.
  // Nearby source pieces share an arc, with fine variation within each cluster.
  float arc=(noise(origin*vec2(4.,6.)+entranceSeed*.07+83.)-.5)*1.3;
  float scatter=hash(introCell+231.9)-.5;
  float launchY=(arc+scatter*.42)*min(resolution.y,size.y*placement.x);
  float margin=glyphWidth*(2.+hash(introCell+237.1)*12.);
  vec2 launch=vec2(-homeCenter.x-margin,launchY);
  vec2 bend=vec2(-homeCenter.x*(.25+tempo*.5)-margin*.35,launchY*.7+arc*size.y*.3);
  vec2 capture=vec2(-size.x*placement.x*(.025+seed*.13),-arc*size.y*.13);
  vec2 incoming=launch*remaining*remaining*remaining
    +3.*bend*remaining*remaining*arrival+3.*capture*remaining*arrival*arrival;
  incoming+=jitter*vec2(resolution.x*.025,size.y*.045)*glitch+vec2(rowTear,0.);
  incoming.y+=plane*sin(progress*3.14159)*remaining*size.y*.12*flightDepth*motion;
  float live=smoothstep(.98,1.,progress);
  offset*=live;
  float perspective=2./max(.8,2.-z*travel*.85*flightDepth*live);
  vec2 volumeCenter=(vec2(.5,.4)-.5+placement.yz)*size*placement.x+portraitBounds.xy+portraitBounds.zw*.5;
  float flicker=1.-glitch*(.25+hash(introCell+glitchFrame*31.1)*.5);
  float arrivingInk=mix(.3,1.,smoothstep(.3,.94,arrival));
  fragmentLife=mix(1.,fragmentLife,live)*smoothstep(delay,delay+.035,assembly)*flicker*arrivingInk;
  // UVs stay anchored to the original face cell while its geometry moves.
  uv=vec2(position.x,1.-position.y);
  float angle=(seed-.5)*travel*4.*flowControls.y*live
    +(hash(introCell+331.7)-.5)*remaining*sin(progress*3.14159)*.65*flightDepth*motion;
  vec2 localPosition=(position-origin)*size*placement.x;
  // Airborne cells turn edge-on like small pieces of phosphor. The projection
  // becomes exactly flat at home, including when restoring along the same path.
  float airborne=smoothstep(.02,.25,flight)*live*clamp(fragmentDepth,0.,1.);
  float facing=abs(cos(flight*(3.+burst*5.)*fragmentDepth));
  localPosition.x*=mix(1.,.28+.72*facing,airborne);
  localPosition.y*=mix(1.,.72+.28*abs(cos(flight*(2.+seed*3.)*fragmentDepth)),airborne);
  fragmentShade=1.-airborne*(1.-facing)*.3;
  // Different source cells pass nearer or farther from the lens. Their scale and
  // lighting return to exactly one at home; the settled face never changes shape.
  float lensScale=max(.3,1.+plane*approach)*perspective;
  localPosition*=lensScale;
  fragmentShade*=1.-clamp(-plane,0.,.5)*.4*approach;
  fragmentShade*=1.-max(0.,-z)*travel*.35*flightDepth*live;
  localPosition=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*localPosition;
  vec2 screen=volumeCenter+(homeCenter-volumeCenter)*perspective+localPosition+offset*size*placement.x*perspective+incoming;
  gl_Position=vec4(screen.x/resolution.x*2.-1.,1.-screen.y/resolution.y*2.,0.,1.);
}
`;
const fragmentSource = `
precision highp float;
varying vec2 uv;
varying float fragmentLife;
varying vec2 cellInteraction;
varying float fragmentShade;
uniform sampler2D portrait;
uniform sampler2D atlas;
uniform float portraitMode;
uniform vec4 anchoredRegion;
uniform float anchoredVisible;
uniform vec2 resolution;
uniform vec4 portraitBounds;
uniform vec2 imageSize;
uniform vec2 pointer;
uniform float pointerStrength;
uniform float columns;
uniform float time;
uniform float motion;
uniform float interference;
uniform float takeover;
uniform vec4 eye;
uniform vec3 eyeColor;
uniform float eyeGlow;
uniform vec3 paper;
uniform vec3 cyan;
uniform float exposure;
uniform float scrambleHz;
uniform float densityJitter;
uniform float glitchBandSpeed;
uniform vec4 dissolve;
uniform float noseContrast;
uniform vec4 toneControls;
uniform vec3 placement;
uniform vec3 debrisControls;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c,vec3(.2126,.7152,.0722)); }
float glyphAt(vec2 position,vec2 grid,float index,float variant,vec2 size) {
  vec2 glyphUV=fract(position*grid);
  vec2 atlasUV=vec2((index+glyphUV.x)/16.,(variant+glyphUV.y)/8.);
  vec2 tap=grid/size/vec2(16.,8.)*.25;
  return clamp((texture2D(atlas,atlasUV+tap).a+texture2D(atlas,atlasUV-tap).a
    +texture2D(atlas,atlasUV+vec2(tap.x,-tap.y)).a
    +texture2D(atlas,atlasUV+vec2(-tap.x,tap.y)).a)*.25*toneControls.w,0.,1.);
}
void main() {
  float scale = min(portraitBounds.z/imageSize.x, portraitBounds.w/imageSize.y);
  vec2 size = imageSize * scale * placement.x;
  vec2 pos = vec2(uv.x,1.-uv.y);
  if (pos.x<0. || pos.x>1. || pos.y<0. || pos.y>1.) { gl_FragColor=vec4(0.); return; }
  float anchored=portraitMode<.5&&pos.x>=anchoredRegion.x&&pos.x<=anchoredRegion.z&&pos.y>=anchoredRegion.y&&pos.y<=anchoredRegion.w?1.:0.;
  if(anchored>.5&&anchoredVisible<.5){gl_FragColor=vec4(0.);return;}
  // A few thin horizontal slices move during the shared transition only.
  float slice = floor(pos.y*42.);
  float event = floor(time*13.);
  float selected = step(.90, hash(vec2(slice,event)))*portraitMode;
  float tear = (hash(vec2(slice,event+71.))-.5)*.026*selected*interference;
  pos.x += tear;
  vec2 grid = vec2(columns, floor(columns*imageSize.y/imageSize.x/1.3));
  // Small contact type needs finer cells, but uses the identical atlas and shading.
  grid *= mix(1.,3.,anchored);
  vec2 cell = floor(pos*grid);
  vec2 center = (cell+.5)/grid;
  vec4 sampleColor = texture2D(portrait, center);
  float rawL = lum(sampleColor.rgb);
  float l = rawL;
  vec2 texel = 1./imageSize;
  float surrounding = (lum(texture2D(portrait,center+vec2(texel.x*3.,0.)).rgb)
    +lum(texture2D(portrait,center-vec2(texel.x*3.,0.)).rgb)
    +lum(texture2D(portrait,center+vec2(0.,texel.y*3.)).rgb)
    +lum(texture2D(portrait,center-vec2(0.,texel.y*3.)).rgb))*.25;
  l = clamp(l+(l-surrounding)*1.1,0.,1.);
  // Limit contrast to the bridge and tip; stop before the moustache.
  vec2 noseDelta=(center-vec2(.51,.425))/vec2(.065,.07);
  float nose=exp(-dot(noseDelta,noseDelta)*1.4)*(1.-smoothstep(.46,.48,center.y))*portraitMode;
  float broad=(lum(texture2D(portrait,center+vec2(.022,0.)).rgb)
    +lum(texture2D(portrait,center-vec2(.022,0.)).rgb)
    +lum(texture2D(portrait,center+vec2(0.,.022)).rgb)
    +lum(texture2D(portrait,center-vec2(0.,.022)).rgb))*.25;
  l=clamp(l+clamp((rawL-broad)*noseContrast,-.06,.06)*nose,0.,1.);
  l=clamp((l-.5)*toneControls.x+.5,0.,1.);
  float tone = clamp(pow(l,toneControls.z)*exposure,0.,1.);
  float seed = hash(cell);
  float fade = 1.-smoothstep(.78,1.,center.y)*portraitMode;
  float silhouette = sampleColor.a * fade;
  // Sparse shoulders, but preserve dark glasses and facial structure.
  if (l<.065 && seed>.38) silhouette *= .08;
  // Every cell has its own clock: continuous rewriting without a whole-face flash.
  float tick = floor(time*scrambleHz*(.65+seed*.7)+seed*23.);
  float rewrite = hash(cell+vec2(tick*3.17,tick*7.13));
  float band = (1.-smoothstep(.015,.045,abs(center.y-fract(time*glitchBandSpeed))))*motion;
  float jitter = floor(hash(cell+vec2(tick+41.,tick*2.3))*3.)-1.;
  // Lock tonal density across the face; shapes still change every tick.
  float face = 1.-smoothstep(.85,1.1,length((center-vec2(.5,.37))/vec2(.29,.34)));
  float index = floor(clamp(floor(tone*15.)+jitter*densityJitter*motion*(1.+band)*step(face,.1),0.,15.));
  float alternate = floor(rewrite*8.)*motion;
  alternate=mix(alternate,floor(rewrite*2.)*motion,step(.25,nose));
  float glyph = glyphAt(pos,grid,index,alternate,size);
  float edge = clamp(abs(l-surrounding)*7.,0.,1.);
  vec3 ink = mix(paper,cyan, .13+edge*.45+step(.88,seed)*.23+band*.12);
  // Returning source glyphs briefly catch a cool phosphor edge as they settle.
  float landing=cellInteraction.y*smoothstep(.2,.8,cellInteraction.x);
  ink=mix(ink,vec3(.76,.97,1.),landing*.4);
  float light = exp(-dot(center-pointer,center-pointer)*90.)*.12*motion*pointerStrength;
  float sweep = exp(-pow((center.y-fract(time*.045))/.075,2.))*.07*motion;
  float intensity = (.12+1.08*pow(tone,1.15))+light*.5+sweep*.5+(rewrite-.5)*.035*motion;
  float eyeDistance = length((center-eye.xy)/eye.zw);
  float eyeMask = (1.-smoothstep(.72,1.15,eyeDistance))*takeover*portraitMode;
  vec3 red = eyeColor;
  ink = mix(ink,red,eyeMask);
  float opacity = glyph*silhouette*intensity;
  // Tight phosphor halo, still restricted to the eye rather than the lens.
  float halo = exp(-eyeDistance*eyeDistance*4.)*takeover*eyeGlow*sampleColor.a*portraitMode;
  vec3 color = ink*opacity + red*halo;
  // Cyan channel separation in the displaced slices, never over the whole face.
  color += cyan*glyph*silhouette*selected*interference*.12;
  gl_FragColor=vec4(color*toneControls.y*fragmentShade,clamp(opacity+halo,0.,1.))*fragmentLife;
}
`;

export class PortraitGL {
  constructor(canvas, image, config, options = {}) {
    this.canvas = canvas;
    this.config = config;
    this.image = image;
    this.options = options;
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!this.gl) throw new Error("WebGL unavailable");
    const gl = this.gl;
    this.shaders = [];
    this.textures = [];
    try {
      const compile = (type, code) => {
        const shader = gl.createShader(type);
        this.shaders.push(shader);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      this.program = gl.createProgram();
      gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(
        this.program,
        compile(gl.FRAGMENT_SHADER, fragmentSource),
      );
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(this.program));
      gl.useProgram(this.program);
      this.buffer = gl.createBuffer();
      // Four unique corners per shard; retain the triangle path for older WebGL.
      this.indexed=options.indexed!==false&&!!gl.getExtension('OES_element_index_uint');
      this.verticesPerCell=this.indexed?4:6;
      this.interactionStride=this.verticesPerCell*2;
      if(this.indexed)this.indexBuffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      const position = gl.getAttribLocation(this.program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      const origin = gl.getAttribLocation(this.program, "origin");
      gl.enableVertexAttribArray(origin);
      gl.vertexAttribPointer(origin, 2, gl.FLOAT, false, 16, 8);
      this.interactionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.interactionBuffer);
      const interaction = gl.getAttribLocation(this.program, "interaction");
      gl.enableVertexAttribArray(interaction);
      gl.vertexAttribPointer(interaction, 2, gl.FLOAT, false, 8, 0);
      this.attributes={position,origin,interaction};
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.uniforms = Object.fromEntries(
        [
          "portrait",
          "atlas",
          "resolution",
          "portraitBounds",
          "imageSize",
          "pointer",
          "pointerStrength",
          "columns",
          "meshGrid",
          "driftSpread",
          "portraitMode",
          "identityA",
          "identityI",
          "identityControls",
          "anchoredRegion",
          "anchoredVisible",
          "time",
          "breakupTime",
          "sweepDuration",
          "motion",
          "assembly",
          "entranceSeed",
          "flowControls",
          "introTiming",
          "erosionStructure",
          "fragmentDepth",
          "flightDepth",
          "interference",
          "takeover",
          "eye",
          "eyeColor",
          "eyeGlow",
          "paper",
          "cyan",
          "exposure",
          "scrambleHz",
          "densityJitter",
          "glitchBandSpeed",
          "dissolve",
          "noseContrast",
          "toneControls",
          "placement",
          "debrisControls",
        ].map((key) => [key, gl.getUniformLocation(this.program, key)]),
      );
      const atlas = document.createElement("canvas");
      atlas.width = 16 * 32;
      atlas.height = 8 * 64;
      const ctx = atlas.getContext("2d");
      if (!ctx) throw new Error("Glyph atlas unavailable");
      ctx.fillStyle = "#fff";
      ctx.font = "bold 50px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Eight alternatives per tone bucket keep the portrait legible as it rewrites.
      const buckets = [
        "        ",
        ".,'`.,'`",
        ":;!|:;!|",
        "il!|/\\()",
        "+-=~+x*:",
        "xv<>/\\{}",
        "*x+zXY{}",
        "oaceusvw",
        "O0QCUG()",
        "0OQDBR68",
        "#HKAENXZ",
        "%&$8BRMW",
        "MWN#%&@8",
        "@&#%WM08",
        "@MW#&%B8",
        "@#WM&%B8",
      ];
      const rows = Array.from({ length: 8 }, (_, row) =>
        buckets.map((bucket) => bucket[row]).join(""),
      );
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => ctx.fillText(c, x * 32 + 16, y * 64 + 32)),
      );
      [image, atlas].forEach((source, i) => {
        const texture = gl.createTexture();
        this.textures.push(texture);
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source,
        );
      });
      const u = this.uniforms;
      gl.uniform1f(u.entranceSeed, Math.random()*997);
      gl.uniform1i(u.portrait, 0);
      gl.uniform1i(u.atlas, 1);
      gl.uniform2f(u.imageSize, this.sourceWidth, this.sourceHeight);
      gl.uniform4f(
        u.eye,
        config.eye.x,
        config.eye.y,
        config.eye.rx,
        config.eye.ry,
      );
      gl.uniform3fv(
        u.paper,
        config.ascii.color.map((v) => v / 255),
      );
      gl.uniform3fv(
        u.eyeColor,
        config.eye.color.map((v) => v / 255),
      );
      gl.uniform1f(u.eyeGlow, config.eye.glow);
      gl.uniform3fv(
        u.cyan,
        config.ascii.cyan.map((v) => v / 255),
      );
      gl.uniform1f(u.exposure, config.shader.exposure);
      gl.uniform1f(u.scrambleHz, config.shader.scrambleHz);
      gl.uniform1f(u.densityJitter, config.shader.densityJitter);
      gl.uniform1f(u.glitchBandSpeed, config.shader.glitchBandSpeed);
      gl.uniform4f(
        u.dissolve,
        config.shader.dissolveStart,
        config.shader.dissolveEnd,
        config.shader.particleTravel,
        config.shader.particleSpeed,
      );
      gl.uniform1f(u.noseContrast, config.shader.noseContrast);
      this.applyConfig();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  applyConfig() {
    const gl=this.gl,u=this.uniforms,c=this.config,s=c.shader;
    gl.useProgram(this.program);
    gl.uniform4f(u.toneControls,s.contrast,s.brightness,s.gamma,s.glyphWeight);
    gl.uniform3f(u.placement,s.zoom,s.centerX,s.centerY);
    gl.uniform3f(u.debrisControls,s.breakup,s.randomness,s.debrisDensity);
    gl.uniform1f(u.columns,innerWidth<=700?c.ascii.mobileColumns:c.ascii.desktopColumns);
    gl.uniform1f(u.exposure,s.exposure);
    gl.uniform1f(u.scrambleHz,s.scrambleHz);
    gl.uniform1f(u.densityJitter,s.densityJitter);
    gl.uniform1f(u.glitchBandSpeed,s.glitchBandSpeed);
    gl.uniform1f(u.noseContrast,s.noseContrast);
    gl.uniform4f(u.dissolve,s.dissolveStart,s.dissolveEnd,s.particleTravel,s.particleSpeed);
    gl.uniform4f(u.eye,c.eye.x,c.eye.y,c.eye.rx,c.eye.ry);
    gl.uniform3fv(u.eyeColor,c.eye.color.map(v=>v/255));
    gl.uniform1f(u.eyeGlow,c.eye.glow);
    gl.uniform1f(u.sweepDuration,s.sweepDuration??18);
    gl.uniform3f(u.flowControls,s.windCurl??.9,s.fragmentSpin??.65,s.streamReach??1.2);
    gl.uniform2f(u.introTiming,c.intro.duration,c.intro.flowStart);
    gl.uniform1f(u.erosionStructure,s.erosionStructure??.68);
    gl.uniform1f(u.fragmentDepth,s.fragmentDepth??.8);
    gl.uniform1f(u.flightDepth,s.flightDepth??.8);
    gl.uniform1f(u.driftSpread,s.driftSpread??1);
    gl.uniform1f(u.portraitMode,this.options.text?0:1);
    gl.uniform2f(u.identityControls,s.identityDelay??.7,s.identityBreakup??.35);
    this.updateMesh();
  }
  get sourceWidth(){return this.image.naturalWidth||this.image.width;}
  get sourceHeight(){return this.image.naturalHeight||this.image.height;}
  setIdentityBounds(regions=[]) {
    this.gl.useProgram(this.program);
    this.gl.uniform4fv(this.uniforms.identityA,regions[0]??[0,0,0,0]);
    this.gl.uniform4fv(this.uniforms.identityI,regions[1]??[0,0,0,0]);
  }
  setAnchoredBounds(region) {
    this.gl.useProgram(this.program);
    this.gl.uniform4fv(this.uniforms.anchoredRegion,region??[0,0,0,0]);
  }
  showAnchored(visible) {
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.uniforms.anchoredVisible,visible?1:0);
  }
  updateSource(image) {
    this.image=image;
    const gl=this.gl;
    gl.useProgram(this.program);
    for(const [index,source] of [[0,image]]){
      gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,this.textures[index]);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    }
    gl.uniform2f(this.uniforms.imageSize,this.sourceWidth,this.sourceHeight);
    this.updateMesh();
  }
  bind() {
    const gl=this.gl,a=this.attributes;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.enableVertexAttribArray(a.position);gl.vertexAttribPointer(a.position,2,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(a.origin);gl.vertexAttribPointer(a.origin,2,gl.FLOAT,false,16,8);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.interactionBuffer);
    gl.enableVertexAttribArray(a.interaction);gl.vertexAttribPointer(a.interaction,2,gl.FLOAT,false,8,0);
    if(this.indexBuffer)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
    this.textures.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);});
  }
  updateMesh() {
    const glyphColumns=innerWidth<=700?this.config.ascii.mobileColumns:this.config.ascii.desktopColumns;
    const detail=Math.max(1,Math.min(innerWidth<=700?2:3,Math.round(this.config.shader.fragmentation??2)));
    const columns=glyphColumns*detail;
    const rows=Math.max(1,Math.floor(glyphColumns*this.sourceHeight/this.sourceWidth/1.3))*detail;
    this.gl.uniform2f(this.uniforms.meshGrid,columns,rows);
    if(this.meshColumns===columns && this.meshRows===rows)return;
    this.meshColumns=columns;this.meshRows=rows;
    const vertices=new Float32Array(columns*rows*this.verticesPerCell*4);
    const corners=this.indexed?[[0,0],[1,0],[0,1],[1,1]]:[[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]];
    let i=0;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)for(const [dx,dy] of corners){
      vertices[i++]=(x+dx)/columns;vertices[i++]=(y+dy)/rows;
      vertices[i++]=(x+.5)/columns;vertices[i++]=(y+.5)/rows;
    }
    this.vertexCount=vertices.length/4;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.STATIC_DRAW);
    if(this.indexed){
      const indices=new Uint32Array(columns*rows*6),order=[0,1,2,2,1,3];
      for(let cell=0;cell<columns*rows;cell++)for(let v=0;v<6;v++)indices[cell*6+v]=cell*4+order[v];
      this.indexCount=indices.length;
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,indices,this.gl.STATIC_DRAW);
    }
    this.interactions=new Float32Array(columns*rows*this.interactionStride);
    this.interactionActive=false;
    this.previousPointer=null;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.interactionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER,this.interactions,this.gl.DYNAMIC_DRAW);
  }
  updateInteraction(time, reduced, pointer) {
    const delta=Math.max(0,Math.min(.1,time-(this.interactionTime??time)));
    this.interactionTime=time;
    const strength=reduced?0:(pointer.strength??(pointer.x>=0&&pointer.y>=0?1:0));
    const reveal=reduced?0:(pointer.reveal??0);
    const pulse=reduced?null:pointer.pulse;
    const aspect=this.sourceHeight/this.sourceWidth;
    const previous=this.previousPointer;
    this.previousPointer=!reduced&&strength>.05?{x:pointer.x,y:pointer.y}:null;
    const sx=previous?previous.x-pointer.x:0,sy=previous?(previous.y-pointer.y)*aspect:0;
    const lengthSquared=sx*sx+sy*sy;
    // Sweep the brush across the path between frames so quick gestures leave no holes.
    const sweeping=!!previous&&strength>.05&&lengthSquared>1e-8&&lengthSquared<.7;
    if(strength<.001&&reveal<.001&&!pulse&&!this.interactionActive)return;
    const data=this.interactions,columns=this.meshColumns,rows=this.meshRows;
    const attack=1-Math.exp(-delta/.12),release=1-Math.exp(-delta/(pointer.trail??.45));
    const chargeRelease=Math.exp(-delta/.18),chargeDelta=Math.max(delta,.001);
    const catchUp=sweeping?Math.max(attack,Math.min(.95,Math.sqrt(lengthSquared)*12)):attack;
    let active=false;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const i=(y*columns+x)*this.interactionStride;
      let dx=(x+.5)/columns-pointer.x,dy=((y+.5)/rows-pointer.y)*aspect;
      const along=sweeping?Math.max(0,Math.min(1,(dx*sx+dy*sy)/lengthSquared)):0;
      dx-=sx*along;dy-=sy*along;
      const radial=Math.max(0,1-Math.sqrt(dx*dx+dy*dy)/(pointer.radius??.16));
      let wave=0;
      if(pulse){
        const distance=Math.hypot((x+.5)/columns-pulse.x,((y+.5)/rows-pulse.y)*aspect);
        const edge=Math.max(0,Math.min(1,(Math.abs(distance-pulse.radius)-pulse.width*.3)/(pulse.width*.7)));
        wave=1-edge*edge*(3-2*edge);
      }
      const scatter=Math.max(wave,radial*radial*(3-2*radial)*strength);
      const target=scatter*(1-reveal)-reveal;
      const attacking=Math.abs(target)>Math.abs(data[i])||target*data[i]<0;
      let amount=data[i]+(target-data[i])*(attacking?catchUp:release);
      if(reduced||Math.abs(amount)<.0001)amount=0;
      const charge=reduced?0:Math.max(data[i+1]*chargeRelease,Math.min(1,Math.max(0,data[i]-amount)/chargeDelta*.2));
      for(let v=0;v<this.verticesPerCell;v++){data[i+v*2]=amount;data[i+v*2+1]=charge;}
      active ||= Math.abs(amount)>.0001;
    }
    this.interactionActive=active;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.interactionBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,data);
  }
  resetInteraction() {
    this.previousPointer=null;
    this.interactions.fill(0);this.interactionActive=false;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.interactionBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,this.interactions);
  }
  resize(width, height, bounds = {left:0,top:0,width,height}) {
    const gl = this.gl,
      dpr = Math.min(devicePixelRatio || 1, 2);
    gl.useProgram(this.program);
    this.pixelRatio=dpr;
    if(this.canvas.width!==Math.round(width*dpr))this.canvas.width=Math.round(width*dpr);
    if(this.canvas.height!==Math.round(height*dpr))this.canvas.height=Math.round(height*dpr);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(
      this.uniforms.resolution,
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f(
      this.uniforms.columns,
      innerWidth <= 700
        ? this.config.ascii.mobileColumns
        : this.config.ascii.desktopColumns,
    );
    this.updateMesh();
    this.setBounds(bounds);
  }
  setBounds(bounds) {
    const dpr=this.pixelRatio||1;
    this.gl.useProgram(this.program);
    this.gl.uniform4f(this.uniforms.portraitBounds,bounds.left*dpr,bounds.top*dpr,bounds.width*dpr,bounds.height*dpr);
  }
  render(time, phase, reduced, pointer, light = 1, assembly = 1, breakupTime = time) {
    const gl = this.gl,
      u = this.uniforms;
    this.bind();
    this.updateInteraction(time,reduced||assembly<1,pointer);
    gl.uniform1f(u.time, reduced ? 0 : time);
    gl.uniform1f(u.breakupTime,breakupTime);
    gl.uniform1f(u.motion, reduced ? 0 : 1);
    gl.uniform1f(u.assembly, reduced ? 1 : assembly);
    gl.uniform1f(u.interference, !reduced && phase === "interference" ? 1 : 0);
    gl.uniform1f(
      u.takeover,
      !reduced && (phase === "interference" || phase === "takeover")
        ? light
        : 0,
    );
    gl.uniform2f(u.pointer, pointer.x, pointer.y);
    gl.uniform1f(u.pointerStrength,reduced?0:(pointer.strength??1));
    if(this.options.clear!==false){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
    if(this.indexed)gl.drawElements(gl.TRIANGLES,this.indexCount,gl.UNSIGNED_INT,0);
    else gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }
  dispose() {
    const gl = this.gl;
    this.textures?.forEach((t) => gl.deleteTexture(t));
    this.shaders?.forEach((s) => gl.deleteShader(s));
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    if (this.interactionBuffer) gl.deleteBuffer(this.interactionBuffer);
    if (this.program) gl.deleteProgram(this.program);
  }
}

// One GPU pass: each source fragment is a movable quad, rendered exactly once.
// The source photograph is sampled only for tone/alpha; it is never composited.
import {maxTapBursts} from './tap-motion.mjs';
import {idleGlitchAt,sceneGlitchAt} from './idle-glitch.mjs';
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
uniform float ambientTime;
uniform vec2 pointer;
uniform float pointerStrength;
uniform float brushRadius;
uniform float sweepDuration;
uniform float motion;
uniform float assembly;
uniform float entranceSeed;
uniform vec3 flowControls;
uniform vec2 introTiming;
uniform float erosionStructure;
uniform float fragmentDepth;
uniform float flightDepth;
uniform vec4 taps[${maxTapBursts}];
uniform vec4 tapTimings[${maxTapBursts}];
uniform vec2 tapVelocities[${maxTapBursts}];
uniform int tapCount;
uniform vec3 idleGlitch;
uniform vec4 sceneGlitch;
varying vec2 uv;
varying float fragmentLife;
varying vec2 cellInteraction;
varying float fragmentShade;
varying float interactionMask;
varying float arrivalGlitch;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float inside(vec2 p,vec4 rect) {
  return step(rect.x,p.x)*step(p.x,rect.z)*step(rect.y,p.y)*step(p.y,rect.w);
}
vec2 ambientOffset(float clock,vec2 cell){
  vec2 glyphGrid=vec2(columns,floor(columns*imageSize.y/imageSize.x/1.3));
  cell=floor((cell+.5)/meshGrid*glyphGrid);
  // Ninety percent of the source stays exactly home. The remainder coasts out
  // and back at independent rates, retaining its ink and original shard shape.
  if(clock<=0.||hash(cell+913.7)<.9)return vec2(0.);
  float rhythm=.5-.5*cos(clock*6.283185*(.6+hash(cell+947.3)*1.2)+hash(cell+961.7)*6.283185);
  float drift=smoothstep(.15,.95,rhythm)*smoothstep(0.,.08,clock);
  vec2 radial=(cell+.5)/glyphGrid-vec2(.5,.45);
  float angle=atan(radial.y+.00001,radial.x+.00001)+(hash(cell+977.1)-.5)*2.2;
  float width=imageSize.x*min(portraitBounds.z/imageSize.x,portraitBounds.w/imageSize.y)*placement.x;
  float distance=width*(.012+hash(cell+991.3)*.025)*drift*driftSpread;
  return vec2(cos(angle),sin(angle))*distance;
}
void main() {
  vec2 grid=meshGrid;
  vec2 cell=floor(origin*grid);
  float identity=max(inside(origin,identityA),inside(origin,identityI));
  // All sub-shards of an ASCII cell inherit the sampled character's immunity,
  // including the tiny glyph edges extending beyond the DOM letter bounds.
  vec2 characterGrid=vec2(columns,floor(columns*imageSize.y/imageSize.x/1.3));
  vec2 characterCenter=(floor(origin*characterGrid)+.5)/characterGrid;
  vec2 identityPad=.5/characterGrid+1./imageSize;
  vec4 padded=vec4(-identityPad,identityPad);
  float protectedA=inside(characterCenter,identityA+padded)*step(.00001,identityA.z-identityA.x);
  float protectedI=inside(characterCenter,identityI+padded)*step(.00001,identityI.z-identityI.x);
  interactionMask=1.-max(protectedA,protectedI)*(1.-portraitMode);
  cellInteraction=interaction*motion;
  // A/I retain their automatic timing, but ignore all positive contact effects.
  // Negative interaction remains available to the explicit Reveal button.
  if(interactionMask<.5){cellInteraction.x=min(0.,cellInteraction.x);cellInteraction.y=0.;}
  float local=cellInteraction.x;
  if(ambientTime>.001&&local>=0.){
    // Contact follows the visible drifting cohort, not its former outline.
    vec2 sourceSize=imageSize*min(portraitBounds.z/imageSize.x,portraitBounds.w/imageSize.y)*placement.x;
    vec2 sourceCenter=portraitBounds.xy+portraitBounds.zw*.5;
    vec2 cellHome=(origin-.5+placement.yz)*sourceSize+sourceCenter;
    vec2 pointerScreen=(pointer-.5+placement.yz)*sourceSize+sourceCenter;
    vec2 visibleCell=cellHome+ambientOffset(ambientTime,cell);
    float radial=clamp(1.-length(visibleCell-pointerScreen)/max(brushRadius*sourceSize.x,1.),0.,1.);
    local=radial*radial*(3.-2.*radial)*pointerStrength*motion*interactionMask;
    cellInteraction.x=local;
  }
  // Positive interaction scatters; negative interaction is the explicit Reveal action.
  float restored=smoothstep(.08,.8,max(-local,0.));
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
  float impact=smoothstep(1.,2.,max(local,0.));
  float flight=(automatic+(1.-automatic)*disturbance*(.28+hash(cell+59.1)*.08+impact*.3))*(1.-restored);
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
  // Source fragments gather from a loose volume spanning and surrounding the
  // viewport, rather than a vertical launch strip at one edge.
  float early=step(.84,hash(introCell+203.1));
  float delay=mix(.012+cluster*.19+hash(introCell+201.7)*.065,.004+seed*.02,early);
  float progress=clamp((assembly-delay)/(settleAt-delay),0.,1.);
  // Some small cohorts briefly stall, then catch up. Other pieces keep drifting,
  // so corruption is local rather than a full-screen freeze or flash.
  float unsettled=smoothstep(.04,.18,progress)*(1.-smoothstep(.68,.94,progress));
  vec2 packet=floor(introCell/vec2(6.,4.));
  float steps=20.+hash(packet+351.7)*14.;
  float packetClock=progress*steps;
  float stalled=(floor(packetClock)+smoothstep(.42,1.,fract(packetClock)))/steps;
  float flightProgress=mix(progress,stalled,step(.46,hash(packet+359.3))*unsettled);
  float tempo=hash(introCell+241.1);
  float approachClock=flightProgress+sin(flightProgress*3.14159)*(tempo-.5)*.42;
  float arrival=approachClock*(.8+approachClock*(1.4-approachClock*1.2));
  float remaining=1.-arrival;
  float plane=mix(-.5,.2,hash(introCell+307.1))+step(.86,hash(introCell+313.5))*1.4;
  float approach=(1.-smoothstep(.12,.9,arrival))*flightDepth*motion;
  float glitchClock=assembly*(56.+hash(introCell+263.2)*64.);
  float glitchFrame=floor(glitchClock);
  float pulse=pow(sin(fract(glitchClock)*3.14159),2.);
  float glitch=step(.66,hash(introCell+glitchFrame*13.7))*unsettled*pulse;
  vec2 jitter=vec2(hash(introCell+glitchFrame*3.7),hash(introCell+glitchFrame*9.1))-.5;
  float rowClock=assembly*43.;
  float rowFrame=floor(rowClock);
  float rowBurst=step(.8,hash(vec2(cell.y+77.,rowFrame)))*unsettled*pow(sin(fract(rowClock)*3.14159),2.);
  float rowTear=(hash(vec2(cell.y,rowFrame+entranceSeed))-.5)*resolution.x*.065*rowBurst;
  float packetFrame=floor(assembly*37.);
  float packetBurst=step(.72,hash(packet+packetFrame*7.1))*unsettled
    *pow(sin(fract(assembly*37.)*3.14159),2.);
  vec2 packetJump=vec2(hash(packet+packetFrame*11.3),hash(packet+packetFrame*17.9))-.5;
  arrivalGlitch=max(glitch,max(rowBurst,packetBurst))*motion;
  // Independent starting positions avoid an edge-shaped curtain or radial rim.
  // Curved approaches retain the shared, irregular arrival rhythm of the face,
  // name and email. The cloud extends beyond every edge without clipping.
  float arc=(noise(origin*vec2(4.,6.)+entranceSeed*.07+83.)-.5)*1.3;
  vec2 launchPoint=(vec2(hash(introCell+231.9),hash(introCell+237.1))*1.6-.3)*resolution;
  vec2 launch=launchPoint-homeCenter;
  vec2 direction=launch/max(length(launch),1.);
  vec2 tangent=vec2(-direction.y,direction.x);
  float span=min(resolution.x,resolution.y);
  vec2 bend=launch*(.45+tempo*.2)+tangent*arc*span*.3;
  vec2 capture=(direction*(.025+seed*.13)+tangent*arc*.08)*min(size.x,size.y)*placement.x;
  vec2 incoming=launch*remaining*remaining*remaining
    +3.*bend*remaining*remaining*arrival+3.*capture*remaining*arrival*arrival;
  incoming+=jitter*vec2(resolution.x*.055,size.y*.065)*glitch+vec2(rowTear,0.);
  incoming+=packetJump*span*.09*packetBurst;
  incoming.y+=plane*sin(progress*3.14159)*remaining*size.y*.12*flightDepth*motion;
  float live=smoothstep(.98,1.,progress);
  offset*=live;
  float perspective=2./max(.8,2.-z*travel*.85*flightDepth*live);
  vec2 volumeCenter=(vec2(.5,.4)-.5+placement.yz)*size*placement.x+portraitBounds.xy+portraitBounds.zw*.5;
  float flicker=1.-arrivalGlitch*(.35+hash(introCell+glitchFrame*31.1)*.5);
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
  localPosition*=mix(1.,.65+.35*facing,airborne);
  fragmentShade=1.-airborne*(1.-facing)*.3;
  // Different source cells pass nearer or farther from the lens. Their scale and
  // lighting return to exactly one at home; the settled face never changes shape.
  float lensScale=max(.3,1.+plane*approach)*perspective;
  localPosition*=lensScale;
  fragmentShade*=1.-clamp(-plane,0.,.5)*.4*approach;
  fragmentShade*=1.-max(0.,-z)*travel*.35*flightDepth*live;
  localPosition=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*localPosition;
  vec2 screen=volumeCenter+(homeCenter-volumeCenter)*perspective+localPosition+offset*size*placement.x*perspective+incoming;
  if(idleGlitch.x>0.&&restored<1.){
    // Brief corruption of small source patches and thin rows, with no global
    // shake. Quiet intervals return exactly to the ordinary ASCII rendering.
    vec2 block=floor(characterCenter*characterGrid/vec2(8.,3.));
    float row=floor(characterCenter.y*characterGrid.y);
    float patch=step(.74,hash(block+idleGlitch.y));
    float slice=step(.935,hash(vec2(row,idleGlitch.y+91.)));
    float strength=idleGlitch.x*(1.-restored)*mix(1.,.3,identity);
    float corruption=max(patch,slice)*strength;
    float tear=(hash(vec2(row,idleGlitch.z+117.))-.5)*6.*slice;
    vec2 jitter=vec2(hash(cell+idleGlitch.z*3.7),hash(cell+idleGlitch.z*9.1))-.5;
    float glyphWidth=size.x*placement.x/columns;
    screen+=(vec2(tear,0.)+jitter*.9*patch)*glyphWidth*strength*(1.-anchored);
    arrivalGlitch=max(arrivalGlitch,corruption);
    fragmentShade*=1.-corruption*.2;
  }
  if(sceneGlitch.x>0.&&restored<1.){
    float band=1.-smoothstep(.012,.037,abs(screen.y/resolution.y-sceneGlitch.y));
    float signal=band*sceneGlitch.x*(1.-restored)*mix(1.,.3,identity);
    // Screen coordinates make the same tear cross the portrait and typography.
    float row=floor(screen.y/resolution.y*140.);
    float broken=.65+.35*hash(vec2(row,sceneGlitch.z+floor(time*23.)));
    screen.x+=sceneGlitch.w*signal*broken;
    arrivalGlitch=max(arrivalGlitch,signal*.9);
    fragmentShade*=1.-signal*.18;
  }
  for(int tapIndex=0;tapIndex<${maxTapBursts};tapIndex++){
    if(tapIndex>=tapCount||interactionMask<.5||anchored>.5||restored>=1.)break;
    vec4 tap=taps[tapIndex];
    if(tap.w<=0.)continue;
    vec4 tapTiming=tapTimings[tapIndex];
    // Freeze selection at the tap: hit the displayed pieces, including their
    // existing drift and depth, rather than the original source-image location.
    float hitAge=clamp((tapTiming.y-(settleAt-introTiming.y)*introTiming.x-departure)/flightDuration,0.,1.)*step(.00001,dissolve.w);
    float hitFlight=hitAge*released;
    float hitTravel=hitFlight*hitFlight*(2.-hitFlight);
    float hitOrbit=(hash(cell+431.9)-.5)*hitFlight*1.2*flowControls.x;
    vec2 hitHeading=vec2(cos(azimuth+hitOrbit),sin(azimuth+hitOrbit))*equator;
    float hitDistance=hitTravel*dissolve.z*mix(1.,.55+burst*1.2,debrisControls.y)*driftSpread;
    float hitPerspective=2./max(.8,2.-z*hitTravel*.85*flightDepth);
    vec2 hit=volumeCenter+(homeCenter-volumeCenter)*hitPerspective+hitHeading*hitDistance*reach*size*placement.x*hitPerspective;
    hit+=ambientOffset(tapTiming.w,cell)*(1.-restored);
    vec2 fromTap=hit-tap.xy;
    // The noisy contour never exceeds 1.35 radii. Reject distant pieces before
    // evaluating its noise, random velocities and trigonometry for every tap.
    if(dot(fromTap,fromTap)>=tap.z*tap.z*1.8225)continue;
    float hitRadius=length(fromTap);
    // A ragged, connected pressure field replaces the clean circular cutout.
    // Its seed stays fixed for this impact; nearby fragments tear in patches.
    vec2 patch=fromTap/tap.z;
    float coarse=noise(patch*2.7+tapTiming.z);
    float fine=noise(patch*7.3+tapTiming.z+31.7);
    float edge=.58+coarse*.57+fine*.2;
    float influence=(1.-smoothstep(.02,edge,hitRadius/tap.z))*(1.-anchored)*(1.-restored)*interactionMask;
    vec2 outward=hitRadius>1.?fromTap/hitRadius:vec2(cos(azimuth),sin(azimuth));
    vec2 tangent=vec2(-outward.y,outward.x);
    float spread=tap.w*influence;
    // A broad range of projected velocities leaves suspended fragments inside
    // the impact, instead of evacuating the center into a uniform bright ring.
    float scatter=hash(cell+tapTiming.z+701.3);
    float turn=(hash(cell+tapTiming.z+733.1)-.5)*2.6;
    float lingering=1.-smoothstep(.23,.35,hash(cell+tapTiming.z+739.7));
    float speed=mix(.035+pow(scatter,2.)*2.1,.015+scatter*.035,lingering);
    vec2 drift=(outward*cos(turn)+tangent*sin(turn))*speed;
    vec2 velocity=tapVelocities[tapIndex];
    if(dot(velocity,velocity)>.001)drift=drift*.18+velocity*(.8+scatter*.4);
    screen+=drift*tap.z*spread;
    screen+=localPosition*z*.35*spread;
    fragmentShade*=1.-max(0.,-z)*.18*spread;
  }
  // Idle motion treats every letter alike. A/I immunity belongs to contact only.
  screen+=ambientOffset(ambientTime,cell)*motion*(1.-restored)*live;
  gl_Position=vec4(screen.x/resolution.x*2.-1.,1.-screen.y/resolution.y*2.,0.,1.);
}
`;
const fragmentSource = `
precision highp float;
varying float interactionMask;
varying float arrivalGlitch;
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
uniform vec3 paper;
uniform vec3 cyan;
uniform float exposure;
uniform float scrambleHz;
uniform float densityJitter;
uniform float glitchBandSpeed;
uniform vec4 dissolve;
uniform float noseContrast;
uniform vec4 toneControls;
uniform vec2 glyphFill;
uniform vec3 placement;
uniform vec3 debrisControls;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c,vec3(.2126,.7152,.0722)); }
float glyphAt(vec2 position,vec2 grid,float index,float variant,vec2 size) {
  // Enlarge the ink within its existing source cell, independently on each axis.
  // Keep sampling inside this atlas tile so smaller glyphs cannot pick up neighbors.
  vec2 glyphUV=(fract(position*grid)-.5)/glyphFill+.5;
  if(any(lessThan(glyphUV,vec2(0.)))||any(greaterThan(glyphUV,vec2(1.))))return 0.;
  vec2 atlasUV=vec2((index+glyphUV.x)/16.,(variant+glyphUV.y)/8.);
  vec2 tap=grid/size/vec2(16.,8.)*.25/glyphFill;
  vec2 lo=(vec2(index,variant)+vec2(.5/32.,.5/64.))/vec2(16.,8.);
  vec2 hi=(vec2(index+1.,variant+1.)-vec2(.5/32.,.5/64.))/vec2(16.,8.);
  float weight=mix(min(toneControls.w,1.2),toneControls.w,portraitMode);
  return clamp((texture2D(atlas,clamp(atlasUV+tap,lo,hi)).a+texture2D(atlas,clamp(atlasUV-tap,lo,hi)).a
    +texture2D(atlas,clamp(atlasUV+vec2(tap.x,-tap.y),lo,hi)).a
    +texture2D(atlas,clamp(atlasUV+vec2(-tap.x,tap.y),lo,hi)).a)*.25*weight,0.,1.);
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
  // Short bursts rewrite glyph shapes quickly without changing their tone bucket.
  if(arrivalGlitch>.12){
    float corruptTick=floor(time*73.);
    rewrite=hash(cell+vec2(corruptTick*11.7,corruptTick*5.3));
  }
  float band = (1.-smoothstep(.015,.045,abs(center.y-fract(time*glitchBandSpeed))))*motion;
  float jitter = floor(hash(cell+vec2(tick+41.,tick*2.3))*3.)-1.;
  // Lock tonal density across the face; shapes still change every tick.
  float face = 1.-smoothstep(.85,1.1,length((center-vec2(.5,.37))/vec2(.29,.34)));
  float index = floor(clamp(floor(tone*15.)+jitter*densityJitter*motion*(1.+band)*step(face,.1),0.,15.));
  // Flat letter ink has no photographic tones: distribute its cells across the
  // same atlas instead of saturating every cell into the heaviest @/# bucket.
  // A stable per-cell bucket keeps brightness steady while variants rewrite.
  index=mix(5.+floor(hash(cell+vec2(17.3,91.7))*9.),index,portraitMode);
  float alternate = floor(rewrite*8.)*motion;
  alternate=mix(floor(rewrite*8.),alternate,portraitMode);
  alternate=mix(alternate,floor(rewrite*2.)*motion,step(.25,nose));
  float glyph = glyphAt(pos,grid,index,alternate,size);
  float edge = clamp(abs(l-surrounding)*7.,0.,1.);
  vec3 ink = mix(paper,cyan, .13+edge*.45+step(.88,seed)*.23+band*.12);
  ink=mix(ink,vec3(.65,.95,1.),arrivalGlitch*.35);
  // Returning source glyphs briefly catch a cool phosphor edge as they settle.
  float light = exp(-dot(center-pointer,center-pointer)*90.)*.12*motion*pointerStrength*interactionMask;
  float sweep = exp(-pow((center.y-fract(time*.045))/.075,2.))*.07*motion;
  float intensity = (.12+1.08*pow(tone,1.15))+light*.5+sweep*.5+(rewrite-.5)*.035*motion;
  float opacity = glyph*silhouette*intensity;
  vec3 color = ink*opacity;
  // Cyan channel separation in the displaced slices, never over the whole face.
  color += cyan*glyph*silhouette*selected*interference*.12;
  gl_FragColor=vec4(color*toneControls.y*fragmentShade,clamp(opacity,0.,1.))*fragmentLife;
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
          "ambientTime",
          "brushRadius",
          "sweepDuration",
          "motion",
          "assembly",
          "entranceSeed",
          "flowControls",
          "introTiming",
          "erosionStructure",
          "fragmentDepth",
          "flightDepth",
          "taps[0]",
          "tapTimings[0]",
          "tapVelocities[0]",
          "tapCount",
          "idleGlitch",
          "sceneGlitch",
          "interference",
          "paper",
          "cyan",
          "exposure",
          "scrambleHz",
          "densityJitter",
          "glitchBandSpeed",
          "dissolve",
          "noseContrast",
          "toneControls",
          "glyphFill",
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
      gl.uniform3fv(
        u.paper,
        config.ascii.color.map((v) => v / 255),
      );
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
    gl.uniform2f(u.glyphFill,s.glyphFillX??1,s.glyphFillY??1);
    gl.uniform3f(u.placement,s.zoom,s.centerX,s.centerY);
    gl.uniform3f(u.debrisControls,s.breakup,s.randomness,s.debrisDensity);
    gl.uniform1f(u.columns,innerWidth<=700?c.ascii.mobileColumns:c.ascii.desktopColumns);
    gl.uniform1f(u.exposure,s.exposure);
    gl.uniform1f(u.scrambleHz,s.scrambleHz);
    gl.uniform1f(u.densityJitter,s.densityJitter);
    gl.uniform1f(u.glitchBandSpeed,s.glitchBandSpeed);
    gl.uniform1f(u.noseContrast,s.noseContrast);
    gl.uniform4f(u.dissolve,s.dissolveStart,s.dissolveEnd,s.particleTravel,s.particleSpeed);
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
    const detail=Math.max(1,Math.min(this.options.detailLimit??3,innerWidth<=700?2:3,Math.round(this.config.shader.fragmentation??2)));
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
  setDetailLimit(limit){
    if(this.options.detailLimit===limit)return;
    this.options.detailLimit=limit;this.gl.useProgram(this.program);this.updateMesh();
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
    const impulseAttack=1-Math.exp(-delta/.035),impulseRelease=1-Math.exp(-delta/.24);
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
        wave=(1-edge*edge*(3-2*edge))*(pulse.strength??1);
      }
      const scatter=Math.max(wave,radial*radial*(3-2*radial)*strength);
      const target=scatter*(1-reveal)-reveal;
      const attacking=Math.abs(target)>Math.abs(data[i])||target*data[i]<0;
      const response=wave>0?(attacking?impulseAttack:impulseRelease):(attacking?catchUp:release);
      let amount=data[i]+(target-data[i])*response;
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
  resize(width, height, bounds = {left:0,top:0,width,height}, surface = {left:0,top:0}) {
    const gl = this.gl,
      dpr = Math.min(devicePixelRatio || 1, 2);
    gl.useProgram(this.program);
    this.pixelRatio=dpr;
    this.surfaceLeft=surface.left;this.surfaceTop=surface.top;
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
    this.gl.uniform4f(this.uniforms.portraitBounds,(bounds.left-(this.surfaceLeft??0))*dpr,(bounds.top-(this.surfaceTop??0))*dpr,bounds.width*dpr,bounds.height*dpr);
  }
  render(time, phase, reduced, pointer, light = 1, assembly = 1, breakupTime = time, ambientTime = 0) {
    const gl = this.gl,
      u = this.uniforms;
    this.bind();
    this.updateInteraction(time,reduced||assembly<1,pointer);
    gl.uniform1f(u.time, reduced ? 0 : time);
    gl.uniform1f(u.breakupTime,breakupTime);
    gl.uniform1f(u.ambientTime,reduced?0:ambientTime);
    gl.uniform1f(u.motion, reduced ? 0 : 1);
    gl.uniform1f(u.assembly, reduced ? 1 : assembly);
    gl.uniform1f(u.interference, !reduced && phase === "interference" ? 1 : 0);
    gl.uniform2f(u.pointer, pointer.x, pointer.y);
    gl.uniform1f(u.pointerStrength,reduced?0:(pointer.strength??1));
    gl.uniform1f(u.brushRadius,pointer.radius??.16);
    this.idleData??=new Float32Array(3);
    if(!reduced&&assembly>=1&&this.options.idleGlitch!==false)idleGlitchAt(time,this.idleData);
    else this.idleData.fill(0);
    gl.uniform3fv(u.idleGlitch,this.idleData);
    this.sceneGlitchData??=new Float32Array(4);
    if(!reduced&&assembly>=1&&this.options.sceneGlitch!==false)sceneGlitchAt(time,this.sceneGlitchData);
    else this.sceneGlitchData.fill(0);
    gl.uniform4f(u.sceneGlitch,this.sceneGlitchData[0],this.sceneGlitchData[1],this.sceneGlitchData[2],this.sceneGlitchData[3]*(this.pixelRatio||1));
    const taps=!reduced&&assembly>=1?(pointer.taps??[]):[],dpr=this.pixelRatio||1;
    const count=Math.min(taps.length,maxTapBursts);
    this.tapData??=new Float32Array(maxTapBursts*4);
    this.tapTimingData??=new Float32Array(maxTapBursts*4);
    this.tapVelocityData??=new Float32Array(maxTapBursts*2);
    for(let i=0;i<count;i++){
      const tap=taps[i],p=i*4,t=i*4;
      this.tapData[p]=(tap.x-(this.surfaceLeft??0))*dpr;
      this.tapData[p+1]=(tap.y-(this.surfaceTop??0))*dpr;
      this.tapData[p+2]=tap.width*dpr;this.tapData[p+3]=tap.strength;
      this.tapTimingData[t]=tap.age;this.tapTimingData[t+1]=tap.breakupTime??breakupTime;
      this.tapTimingData[t+2]=tap.seed??0;
      this.tapTimingData[t+3]=tap.ambientTime??ambientTime;
      this.tapVelocityData[i*2]=tap.velocityX??0;this.tapVelocityData[i*2+1]=tap.velocityY??0;
    }
    gl.uniform1i(u.tapCount,count);
    if(count){
      gl.uniform4fv(u['taps[0]'],this.tapData);
      gl.uniform4fv(u['tapTimings[0]'],this.tapTimingData);
      gl.uniform2fv(u['tapVelocities[0]'],this.tapVelocityData);
    }
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

import { config, publishedLook } from "./config.mjs";
import { PortraitGL } from "./portrait-gl.mjs";
// preview:start
import { createTuner } from "./tuner.mjs";
// preview:end
import { TextEffect } from "./text-effect.mjs";
import { createExperience } from "./experience.mjs";
import { sceneTimeline } from "./timeline.mjs";
import { AdaptiveQuality } from './adaptive-quality.mjs';
const root = document.querySelector(".composition");
const figure = document.querySelector(".portrait");
const canvas = document.querySelector("canvas");
const email = document.querySelector(".email-button");
const identity = document.querySelector(".identity");
const gravityEnabled = new URLSearchParams(location.search).has('gravity');
document.documentElement.style.setProperty('--name-spacing',`${publishedLook.letterSpacing}em`);
email.href = `mailto:${config.email}`;
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const coarse=matchMedia('(pointer: coarse)'),quality=new AdaptiveQuality();
let renderer,
  textEffect,
  portraitBounds,
  lastAssembling,
  frame = 0,
  last = 0,
  elapsed = 0,
  entranceElapsed = 0,
  breakupElapsed = 0,
  currentAmbientTime = 0,
  disposed = false;
const entranceDuration = config.intro.duration*1000;
const pointer = { x: -2, y: -2, tx: -2, ty: -2, strength: 0, targetStrength: 0 };
const image = new Image();
const experience = createExperience({root,motion,config,
  onMove(e) { move(e); textEffect?.movePointer(e); if(e.gather)pointer.targetStrength=1; },
  onLeave: leaveAll,
  onReplay() {
    entranceElapsed=0;breakupElapsed=0;
    renderer?.resetInteraction();textEffect?.renderer?.resetInteraction();
    start();
  },
  onSkip() {
    entranceElapsed=entranceDuration;
    breakupElapsed=entranceDuration*(1-config.intro.flowStart)/1000;
    renderer?.resetInteraction();textEffect?.renderer?.resetInteraction();
    start();draw();
  }
});
function draw() {
  const assembly = motion.matches ? 1 : Math.min(1, entranceElapsed / entranceDuration);
  const timeline=sceneTimeline(breakupElapsed,config.shader);
  currentAmbientTime=motion.matches?0:timeline.driftTime;
  if (renderer) {
    if(quality.commitIfCalm(assembly===1&&pointer.strength<.01&&(textEffect?.pointer.strength??0)<.01&&experience.state.reveal<.01&&!experience.state.taps.length&&!renderer.idleData?.[0]&&!renderer.sceneGlitchData?.[0])){
      renderer.setDetailLimit(quality.limit);textEffect?.renderer?.setDetailLimit(quality.limit);
      canvas.dataset.detail=quality.limit===1?'economy':'full';
    }
    const b=portraitBounds;
    const width=image.naturalWidth*Math.min(b.width/image.naturalWidth,b.height/image.naturalHeight)*renderer.placement.zoom;
    pointer.radius=experience.state.radius/width;
    pointer.reveal=experience.state.reveal;
    pointer.trail=config.shader.trailPersistence;
    for(const tap of experience.state.taps){tap.breakupTime??=0;tap.ambientTime??=timeline.driftTime;}
    pointer.taps=experience.state.taps;
    const assembling=assembly<1;
    if(assembling!==lastAssembling){
      figure.dataset.entrance=assembling?'assembling':'settled';
      figure.setAttribute('aria-busy',String(assembling));lastAssembling=assembling;
    }
    renderer.render(elapsed,'human',motion.matches,pointer,0,assembly,0,timeline.driftTime);
    textEffect?.render(elapsed,'human',motion.matches,0,0,assembly===1,assembly,experience.state,timeline.driftTime);
    renderer.gl.useProgram(renderer.program);
  }
}
function resize() {
  if (!renderer) return;
  const b = figure.getBoundingClientRect();
  portraitBounds=b;
  // Mobile browser chrome can make CSS viewport units differ from innerHeight.
  // Render both layers in the actual canvas's CSS-pixel coordinate system.
  const surface=canvas.getBoundingClientRect();
  renderer.resize(surface.width,surface.height,b,surface);
  textEffect?.refresh(surface);
  updateGravityWells();
  updateDensityGradient();
  draw();
}
function updateDensityGradient(){
  if(!config.shader.densityGradient||!renderer||!textEffect?.renderer||!portraitBounds)return;
  const b=portraitBounds,s=renderer.placement;
  const width=image.naturalWidth*Math.min(b.width/image.naturalWidth,b.height/image.naturalHeight)*s.zoom;
  const faceRight=b.left+b.width*.5+(.75-.5+s.centerX)*width;
  const left=textEffect.bounds.left+48;
  const right=s.compact?Math.max(left+100,innerWidth-24,faceRight):Math.max(left+100,faceRight);
  const base=width/(innerWidth<=700?config.ascii.mobileColumns:config.ascii.desktopColumns);
  const profile=s.compact
    ? [left,right,Math.min(4.2,base*1.5),Math.min(3.2,Math.max(2.1,base*.55))]
    : [left,right,base*1.8,base*.6];
  renderer.setDensityGradient(profile);textEffect.renderer.setDensityGradient(profile);
}
function updateGravityWells(){
  if(!gravityEnabled||!textEffect?.identityRegions)return;
  const b=textEffect.bounds;
  const wells=textEffect.identityRegions.flatMap(r=>[b.left+(r[0]+r[2])*.5*b.width,b.top+(r[1]+r[3])*.5*b.height]);
  renderer.gravityWells=wells;
  textEffect.renderer.gravityWells=wells;
}
function reposition() {
  if (!renderer) return;
  portraitBounds=figure.getBoundingClientRect();
  renderer.setBounds(portraitBounds);
  textEffect?.position();
  updateGravityWells();
  updateDensityGradient();
  draw();
}
function tick(now) {
  if (disposed || document.hidden || !renderer) return;
  // A media change can be observed before its change event is dispatched.
  // Finish the static frame instead of freezing halfway through the entrance.
  if (motion.matches) { preference(); return; }
  const delta = last ? Math.min(now - last, 100) : 0;
  if(last&&(coarse.matches||innerWidth<=700))quality.observe(now-last);
  last = now;
  elapsed += delta / 1000;
  const dissolveDelta=Math.max(0,delta-Math.max(0,entranceDuration*config.intro.flowStart-entranceElapsed));
  entranceElapsed = Math.min(entranceDuration, entranceElapsed + delta);
  breakupElapsed += dissolveDelta / 1000;
  experience.update(delta/1000, Math.min(1,entranceElapsed/entranceDuration), breakupElapsed);
  const follow = 1 - Math.exp(-delta / 65);
  pointer.x += (pointer.tx - pointer.x) * follow;
  pointer.y += (pointer.ty - pointer.y) * follow;
  pointer.strength += (pointer.targetStrength - pointer.strength) * (1 - Math.exp(-delta / 110));
  draw();
  frame = requestAnimationFrame(tick);
}
function start() {
  cancelAnimationFrame(frame);
  last = 0;
  quality.resetSamples();
  if (!renderer) return;
  experience.update(0,motion.matches?1:entranceElapsed/entranceDuration,breakupElapsed);
  if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  else draw();
}
function move(e) {
  if (motion.matches || e.isPrimary === false || !image.naturalWidth) return;
  const b = portraitBounds;
  if(!b)return;
  const placement=renderer.placement;
  const scale = Math.min(b.width / image.naturalWidth, b.height / image.naturalHeight) * placement.zoom;
  pointer.tx = (e.clientX - b.left - b.width / 2) / (image.naturalWidth * scale) + .5 - placement.centerX;
  pointer.ty = (e.clientY - b.top - b.height / 2) / (image.naturalHeight * scale) + .5 - placement.centerY;
  if (pointer.strength < .01) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
  pointer.targetStrength = currentAmbientTime>.001 || (pointer.tx >= 0 && pointer.tx <= 1 && pointer.ty >= 0 && pointer.ty <= 1) ? 1 : 0;
}
function leave() {
  pointer.targetStrength = 0;
}
function leaveAll(){leave();textEffect?.leave();}
function visibility() {
  if (document.hidden) { leaveAll(); pointer.strength = 0; }
  start();
}
function preference() {
  elapsed = 0;
  breakupElapsed = 0;
  if (motion.matches) entranceElapsed = entranceDuration;
  leaveAll();
  pointer.strength = 0;
  start();
}
function fail(error) {
  document.documentElement.classList.add('portrait-unavailable');
  cancelAnimationFrame(frame);
  figure.classList.remove("ready");
  canvas.classList.remove("ready");
  textEffect?.dispose();textEffect=undefined;
  figure.dataset.renderer = "fallback";
  experience.update(0,1,breakupElapsed);
  figure.setAttribute("aria-busy", "false");
  if (error instanceof Error) console.warn("Portrait fallback:", error.message);
}
function initialize() {
  try {
    lastAssembling=undefined;
    if (motion.matches) entranceElapsed=entranceDuration;
    renderer = new PortraitGL(canvas, image, config,{detailLimit:quality.limit});
    textEffect = new TextEffect(canvas, identity, config, motion);
    textEffect.renderer.setDetailLimit(quality.limit);
    resize();
    figure.dataset.renderer = "webgl";
    figure.classList.add("ready");
    canvas.classList.add("ready");
    document.documentElement.classList.remove('portrait-unavailable');
    experience.update(0,motion.matches?1:entranceElapsed/entranceDuration,breakupElapsed);
    start();
  } catch (error) {
    renderer = undefined;
    fail(error);
  }
}
function lost(e) {
  e.preventDefault();
  renderer = undefined;
  fail();
}
function restored() {
  if (!disposed) initialize();
}
const observer = new ResizeObserver(() => {
  try {
    resize();
  } catch (error) {
    fail(error);
  }
});
image.onload = () => {
  initialize();
  observer.observe(figure);
  observer.observe(identity);
  observer.observe(canvas);
};
image.onerror = () => fail();
// preview:start
createTuner(config, () => {
  renderer?.applyConfig();
  textEffect?.updateConfig();
  updateGravityWells();
  updateDensityGradient();
  draw();
}, () => {}, () => {
  breakupElapsed=0;
  experience.release();
  renderer?.resetInteraction();textEffect?.renderer?.resetInteraction();
  draw();
});
// preview:end
image.src = config.portrait;
canvas.addEventListener("webglcontextlost", lost);
canvas.addEventListener("webglcontextrestored", restored);
document.addEventListener("visibilitychange", visibility);
addEventListener("blur", leaveAll);
addEventListener("resize", resize);
addEventListener("scroll", reposition, { passive: true });
window.visualViewport?.addEventListener('resize',resize);
window.visualViewport?.addEventListener('scroll',resize);
motion.addEventListener("change", preference);
addEventListener(
  "pagehide",
  () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer?.dispose();
    textEffect?.dispose();
    experience.dispose();
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    document.removeEventListener("visibilitychange", visibility);
    removeEventListener("blur", leaveAll);
    removeEventListener("resize", resize);
    removeEventListener("scroll", reposition);
    window.visualViewport?.removeEventListener('resize',resize);
    window.visualViewport?.removeEventListener('scroll',resize);
    motion.removeEventListener("change", preference);
  },
  { once: true },
);
addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

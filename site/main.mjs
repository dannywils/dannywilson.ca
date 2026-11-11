import { config } from "./config.mjs";
import { Controller } from "./controller.mjs";
import { PortraitGL } from "./portrait-gl.mjs";
import { createTuner } from "./tuner.mjs";
import { TextEffect } from "./text-effect.mjs";
import { createExperience } from "./experience.mjs";
import { Phosphor } from "./phosphor.mjs";
import { sceneTimeline } from "./timeline.mjs";
const root = document.querySelector(".composition");
const figure = document.querySelector(".portrait");
const canvas = document.querySelector("canvas");
const email = document.querySelector(".email");
const identity = document.querySelector(".identity");
email.href = `mailto:${config.email}`;
email.textContent = config.email;
document.querySelector('.contact-link').href=email.href;
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let controller = new Controller(config),
  renderer,
  textEffect,
  phosphor,
  frame = 0,
  last = 0,
  elapsed = 0,
  entranceElapsed = 0,
  breakupElapsed = 0,
  introCueFired = false,
  disposed = false;
const entranceDuration = config.intro.duration*1000;
const pointer = { x: -2, y: -2, tx: -2, ty: -2, strength: 0, targetStrength: 0 };
const image = new Image();
const experience = createExperience({root,motion,config,
  onMove(e) { move(e); textEffect?.movePointer(e); if(e.gather)pointer.targetStrength=1; },
  onLeave: leaveAll,
  onReplay() {
    entranceElapsed=0;breakupElapsed=0;introCueFired=false;controller=new Controller(config);
    phosphor?.clear();
    renderer?.resetInteraction();textEffect?.renderer?.resetInteraction();
    sync();start();
  }
});
function sync() {
  root.dataset.phase = controller.phase;
}
function draw() {
  const light = motion.matches ? 0 : controller.light;
  root.style.setProperty("--ai-light", light);
  const assembly = motion.matches ? 1 : Math.min(1, entranceElapsed / entranceDuration);
  const timeline=sceneTimeline(breakupElapsed,config.shader);
  if (renderer) {
    const b=figure.getBoundingClientRect();
    const width=image.naturalWidth*Math.min(b.width/image.naturalWidth,b.height/image.naturalHeight)*config.shader.zoom;
    pointer.radius=experience.state.radius/width;
    pointer.reveal=experience.state.reveal;
    pointer.trail=config.shader.trailPersistence;
    const pulse=experience.state.pulse;
    pointer.pulse=pulse?{
      x:(pulse.x-b.left-b.width/2)/width+.5-config.shader.centerX,
      y:(pulse.y-b.top-b.height/2)/(width*image.naturalHeight/image.naturalWidth)+.5-config.shader.centerY,
      radius:pulse.radius/width,width:pulse.width/width
    }:null;
    figure.dataset.entrance = assembly < 1 ? "assembling" : "settled";
    figure.setAttribute("aria-busy", String(assembly < 1));
    let usePhosphor=!!phosphor&&!motion.matches&&config.shader.afterglow>0;
    if(usePhosphor){
      try{phosphor.begin();}catch{
        phosphor.dispose();phosphor=undefined;usePhosphor=false;
        renderer.gl.bindFramebuffer(renderer.gl.FRAMEBUFFER,null);
      }
    }
    renderer.render(elapsed, controller.phase, motion.matches, pointer, light, assembly, timeline.erosion);
    textEffect?.render(elapsed,controller.phase,motion.matches,light,timeline.erosion,assembly===1,assembly,experience.state);
    if(usePhosphor){
      // Fast incoming pieces stay distinct; full afterglow returns as they land.
      const landing=Math.max(0,Math.min(1,(assembly-.65)/.35));
      const introTrail=.3+.7*landing*landing*(3-2*landing);
      phosphor.present(elapsed,config.shader.afterglow*introTrail);
    }
    renderer.gl.useProgram(renderer.program);
  }
}
function resize() {
  if (!renderer) return;
  const b = figure.getBoundingClientRect();
  renderer.resize(innerWidth, innerHeight, b);
  textEffect?.refresh();
  phosphor?.clear();
  draw();
}
function reposition() {
  if (!renderer) return;
  renderer.setBounds(figure.getBoundingClientRect());
  textEffect?.position();
  phosphor?.clear();
  draw();
}
function tick(now) {
  if (disposed || document.hidden || motion.matches || !renderer) return;
  const delta = last ? Math.min(now - last, 100) : 0;
  last = now;
  elapsed += delta / 1000;
  const beforeEntrance=entranceElapsed;
  const dissolveDelta=Math.max(0,delta-Math.max(0,entranceDuration*config.intro.flowStart-entranceElapsed));
  entranceElapsed = Math.min(entranceDuration, entranceElapsed + delta);
  breakupElapsed += dissolveDelta / 1000;
  experience.update(delta/1000, Math.min(1,entranceElapsed/entranceDuration), breakupElapsed);
  let lightDelta=introCueFired?delta:0;
  const ignitionAt=entranceDuration*config.intro.ignition;
  if(!introCueFired&&entranceElapsed>=ignitionAt){
    introCueFired=true;controller.ignite();sync();
    lightDelta=Math.max(0,beforeEntrance+delta-ignitionAt);
  }
  if(lightDelta>0&&controller.update(lightDelta))sync();
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
  if (!renderer) return;
  experience.update(0,motion.matches?1:entranceElapsed/entranceDuration,breakupElapsed);
  if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  else draw();
}
function move(e) {
  if (motion.matches || e.isPrimary === false || !image.naturalWidth) return;
  const b = figure.getBoundingClientRect();
  const scale = Math.min(b.width / image.naturalWidth, b.height / image.naturalHeight) * config.shader.zoom;
  pointer.tx = (e.clientX - b.left - b.width / 2) / (image.naturalWidth * scale) + .5 - config.shader.centerX;
  pointer.ty = (e.clientY - b.top - b.height / 2) / (image.naturalHeight * scale) + .5 - config.shader.centerY;
  if (pointer.strength < .01) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
  pointer.targetStrength = pointer.tx >= 0 && pointer.tx <= 1 && pointer.ty >= 0 && pointer.ty <= 1 ? 1 : 0;
}
function leave() {
  pointer.targetStrength = 0;
}
function leaveAll(){leave();textEffect?.leave();}
function down(e) {
  move(e);
  if (e.isPrimary !== false && e.pointerType !== "mouse") figure.setPointerCapture(e.pointerId);
}
function up(e) {
  if (e.pointerType !== "mouse") leave();
}
function visibility() {
  if (document.hidden) { leaveAll(); pointer.strength = 0; }
  start();
}
function preference() {
  phosphor?.clear();
  controller = new Controller(config);
  elapsed = 0;
  breakupElapsed = 0;
  if (motion.matches) entranceElapsed = entranceDuration;
  introCueFired=entranceElapsed===entranceDuration;
  leaveAll();
  pointer.strength = 0;
  sync();
  start();
}
function fail(error) {
  document.documentElement.classList.add('portrait-unavailable');
  cancelAnimationFrame(frame);
  figure.classList.remove("ready");
  canvas.classList.remove("ready");
  textEffect?.dispose();textEffect=undefined;
  phosphor?.dispose();phosphor=undefined;
  figure.dataset.renderer = "fallback";
  experience.update(0,1,breakupElapsed);
  figure.setAttribute("aria-busy", "false");
  controller = new Controller(config);
  sync();
  if (error instanceof Error) console.warn("Portrait fallback:", error.message);
}
function initialize() {
  try {
    if (motion.matches) {entranceElapsed=entranceDuration;introCueFired=true;}
    renderer = new PortraitGL(canvas, image, config);
    textEffect = new TextEffect(canvas, identity, config, motion);
    try{phosphor=new Phosphor(renderer.gl);}catch{phosphor=undefined;}
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
};
image.onerror = () => fail();
createTuner(config, () => {
  renderer?.applyConfig();
  textEffect?.refresh();
  phosphor?.clear();
  controller.duration = controller.phase === "human"
    ? Math.max(controller.elapsed + 100, (config.timing.humanMin + config.timing.humanMax) / 2)
    : config.timing[controller.phase];
  draw();
}, () => {
  controller.ignite();
  sync();
  start();
}, () => {
  breakupElapsed=0;
  leaveAll();
  draw();
});
image.src = config.portrait;
figure.addEventListener("pointermove", move);
figure.addEventListener("pointerenter", move);
figure.addEventListener("pointerdown", down);
figure.addEventListener("pointerup", up);
figure.addEventListener("pointercancel", leave);
figure.addEventListener("lostpointercapture", leave);
figure.addEventListener("pointerleave", leave);
canvas.addEventListener("webglcontextlost", lost);
canvas.addEventListener("webglcontextrestored", restored);
document.addEventListener("visibilitychange", visibility);
addEventListener("blur", leaveAll);
addEventListener("resize", resize);
addEventListener("scroll", reposition, { passive: true });
motion.addEventListener("change", preference);
addEventListener(
  "pagehide",
  () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer?.dispose();
    textEffect?.dispose();
    phosphor?.dispose();
    experience.dispose();
    figure.removeEventListener("pointermove", move);
    figure.removeEventListener("pointerenter", move);
    figure.removeEventListener("pointerdown", down);
    figure.removeEventListener("pointerup", up);
    figure.removeEventListener("pointercancel", leave);
    figure.removeEventListener("lostpointercapture", leave);
    figure.removeEventListener("pointerleave", leave);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    document.removeEventListener("visibilitychange", visibility);
    removeEventListener("blur", leaveAll);
    removeEventListener("resize", resize);
    removeEventListener("scroll", reposition);
    motion.removeEventListener("change", preference);
  },
  { once: true },
);
addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

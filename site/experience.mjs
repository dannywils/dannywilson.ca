import {addTap,advanceTaps,tapDriftSeconds} from './tap-motion.mjs';
// A screen-space brush scatters the portrait and type; the cycle reforms them.
export function createExperience({ root, motion, config, onMove, onLeave, onReplay, onSkip }) {
  const rail = document.querySelector('.experience');
  const hint = rail.querySelector('.experience-hint');
  const reveal = rail.querySelector('[data-scene="reveal"]');
  const replay = rail.querySelector('[data-scene="replay"]');
  const cursor = document.querySelector('.gather-cursor');
  const figure = root.querySelector('.portrait');
  const coarse = matchMedia('(pointer: coarse)');
  const listeners = [];
  let enabled = false, held = false, pinned = false, active = false;
  let x = -100, y = -100, lastHint = '',lastCursor='',lastRail='';
  let interactive=false,assembling=true;
  let captured=null,multitouch=false;
  let pressedAt=0,startX=0,startY=0,travel=0;
  const touches=new Set();
  const state = { radius: 90, reveal: 0, gather: 0, taps:[] };
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push([el, type, fn]); };
  const reset = () => {
    held = false; active = false;
    lastCursor='';
    const id=captured;captured=null;
    if(id!==null&&root.hasPointerCapture(id))root.releasePointerCapture(id);
    cursor.classList.remove('active', 'held'); onLeave();
  };
  const cancelGesture=()=>{state.gather=0;reset();};
  const syncReveal = () => {
    reveal.setAttribute('aria-pressed',String(pinned));
    reveal.querySelector('span').textContent=pinned?'Release':'Reveal';
    reveal.title=pinned?'Resume the dissolve and reform cycle':'Reveal the complete portrait and name';
  };
  const release = () => {
    pinned=false;state.reveal=0;state.gather=0;state.taps.length=0;reset();syncReveal();
  };
  const move = e => {
    if (!interactive || motion.matches || e.isPrimary === false || multitouch) return;
    if(e.target?.closest('a,button,input,select,textarea')){if(!held)reset();return;}
    if(e.pointerType==='touch'&&!held)return;
    x = e.clientX; y = e.clientY; active = true;
    if(held)travel=Math.max(travel,Math.hypot(x-startX,y-startY));
    cursor.style.setProperty('--x', `${x}px`); cursor.style.setProperty('--y', `${y}px`);
    onMove({clientX:x,clientY:y,isPrimary:true,gather:held});
  };
  on(root, 'pointermove', move);
  on(root, 'pointerdown', e => {
    if (!interactive || multitouch || e.isPrimary === false || e.button > 0 || e.target.closest('a,button,input,select,textarea')) return;
    held = true;
    captured=e.pointerId;
    pressedAt=performance.now();startX=e.clientX;startY=e.clientY;travel=0;
    root.setPointerCapture(e.pointerId); move(e);
  });
  on(root, 'pointerup', e => {
    if(e.isPrimary===false||e.pointerId!==captured)return;
    if(held&&performance.now()-pressedAt<280&&travel<10&&interactive&&!pinned){
      addTap(state.taps,{x:e.clientX,y:e.clientY,width:Math.min(coarse.matches?108:150,state.radius*1.9)});
    }
    held = false;
    captured=null;
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    if (e.pointerType !== 'mouse') reset();
  });
  on(root, 'pointerleave', () => { if (!held) reset(); });
  on(root, 'pointercancel', cancelGesture);
  on(root, 'lostpointercapture', e => { if(e.pointerId===captured)cancelGesture(); });
  // Yield to native pinch zoom as soon as a second finger lands, including
  // outside the portrait. Do not resume gathering until every finger is lifted.
  on(window,'pointerdown',e=>{if(e.pointerType==='touch'){touches.add(e.pointerId);if(touches.size>1){multitouch=true;cancelGesture();}}});
  for(const type of ['pointerup','pointercancel'])on(window,type,e=>{touches.delete(e.pointerId);if(!touches.size)multitouch=false;});
  on(root,'contextmenu',e=>{if(held&&coarse.matches&&!e.target.closest('a'))e.preventDefault();});
  on(window, 'blur', () => {touches.clear();multitouch=false;cancelGesture();});
  on(document, 'visibilitychange', () => { if (document.hidden) {touches.clear();multitouch=false;cancelGesture();} });
  on(reveal, 'click', () => {
    pinned = !pinned;
    state.taps.length=0;
    syncReveal();
  });
  on(replay, 'click', () => {
    release();
    if(assembling)onSkip?.();else onReplay();
  });
  on(motion, 'change', () => {
    release();
  });
  on(document,'keydown',e=>{
    if(e.key==='Escape'&&!document.body.classList.contains('tuning-open'))release();
  });
  return {
    state,release,
    update(delta, assembly, breakupTime) {
      enabled = figure.dataset.renderer === 'webgl';
      const ready = enabled && !motion.matches;
      interactive=ready&&assembly===1;
      if(interactive)advanceTaps(state.taps,delta);else state.taps.length=0;
      const nextAssembling=assembly<1;
      if(assembling!==nextAssembling||!replay.dataset.entranceAction){
        assembling=nextAssembling;replay.dataset.entranceAction=assembling?'skip':'replay';
        replay.querySelector('span').textContent=assembling?'Skip':'Replay';
        replay.querySelector('path').setAttribute('d',assembling?'M7 5l10 7-10 7V5Zm11 0v14':'M4 10a8 8 0 1 1 1.7 7M4 4v6h6');
        replay.setAttribute('aria-label',assembling?'Skip entrance':'Replay entrance');
        replay.title=assembling?'Skip entrance':'Replay entrance';
      }
      if(rail.hidden)rail.hidden=false;
      const disabled=!ready||assembly<1;
      if(reveal.disabled!==disabled)reveal.disabled=disabled;
      if(replay.disabled===ready)replay.disabled=!ready;
      if (held && ready && assembly === 1) {
        onMove({ clientX: x, clientY: y, isPrimary: true, gather: true });
      }
      // Contact stays local for taps, drags and arbitrarily long holds.
      state.radius = Math.max(16,Math.min(coarse.matches?56:80,config.shader.brushSize*(coarse.matches?.5:.7)));
      const target = pinned ? 1 : 0;
      state.reveal += (target - state.reveal) * (1 - Math.exp(-delta / .28));
      const interacting = active && ready && assembly === 1 && !pinned;
      const cursorState=`${interacting}:${held}`;
      if(cursorState!==lastCursor){
        cursor.classList.toggle('active',interacting);
        cursor.classList.toggle('held',held&&interacting);
        // The cursor marks contact, not an artificial clipping boundary.
        cursor.style.setProperty('--gather',state.gather);
        cursor.style.setProperty('--ring-size',held?'24px':'18px');
        lastCursor=cursorState;
      }
      const message = !enabled ? 'Static portrait' : motion.matches ? 'Motion reduced' : assembly < 1 ? 'Assembling' : pinned ? 'Revealed · release to resume' : held ? 'Release to reform' : state.taps.length ? (state.taps.some(tap=>tap.age<tapDriftSeconds)?'Drifting':'Reforming') : coarse.matches ? 'Tap to scatter · drag to deform' : 'Click to scatter · move to deform';
      if (message !== lastHint) { hint.textContent = message; lastHint = message; }
      const railState=assembly<1?'assembling':pinned?'revealed':'live';
      if(railState!==lastRail){rail.dataset.state=railState;lastRail=railState;}
    },
    dispose() { for (const [el, type, fn] of listeners) el.removeEventListener(type, fn); }
  };
}

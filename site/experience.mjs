// A screen-space brush lets a single gesture gather both the portrait and type.
export function createExperience({ root, motion, config, onMove, onLeave, onReplay }) {
  const rail = document.querySelector('.experience');
  const hint = rail.querySelector('.experience-hint');
  const reveal = rail.querySelector('[data-scene="reveal"]');
  const replay = rail.querySelector('[data-scene="replay"]');
  const cursor = document.querySelector('.gather-cursor');
  const figure = root.querySelector('.portrait');
  const coarse = matchMedia('(pointer: coarse)');
  const listeners = [];
  let enabled = false, held = false, pinned = false, heldTime = 0, active = false;
  let x = -100, y = -100, lastHint = '';
  let startX=0,startY=0,travel=0,pressedAt=0,interactive=false;
  const state = { radius: 90, reveal: 0, gather: 0, pulse:null };
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push([el, type, fn]); };
  const reset = () => {
    held = false; heldTime = 0; active = false;
    cursor.classList.remove('active', 'held'); onLeave();
  };
  const move = e => {
    if (!enabled || motion.matches || e.isPrimary === false) return;
    x = e.clientX; y = e.clientY; active = true;
    if(held)travel=Math.max(travel,Math.hypot(x-startX,y-startY));
    cursor.style.setProperty('--x', `${x}px`); cursor.style.setProperty('--y', `${y}px`);
    onMove({clientX:x,clientY:y,isPrimary:true,gather:held});
  };
  on(root, 'pointermove', move);
  on(root, 'pointerdown', e => {
    if (!interactive || e.isPrimary === false || e.button > 0 || e.target.closest('a,button')) return;
    held = true; heldTime = 0;
    startX=e.clientX;startY=e.clientY;travel=0;pressedAt=performance.now();state.pulse=null;
    root.setPointerCapture(e.pointerId); move(e);
  });
  on(root, 'pointerup', e => {
    if(e.isPrimary===false)return;
    if(held&&performance.now()-pressedAt<280&&travel<12&&interactive&&!pinned){
      const reach=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
      state.pulse={x,y,age:0,radius:0,width:Math.max(90,Math.min(180,reach*.18)),reach};
    }
    held = false; heldTime = 0;
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    if (e.pointerType !== 'mouse') reset();
  });
  on(root, 'pointerleave', () => { if (!held) reset(); });
  on(root, 'pointercancel', () => { state.pulse=null;reset(); });
  on(root, 'lostpointercapture', () => { held = false; heldTime = 0; });
  on(window, 'blur', () => { state.pulse=null;reset(); });
  on(document, 'visibilitychange', () => { if (document.hidden) {state.pulse=null;reset();} });
  on(reveal, 'click', () => {
    pinned = !pinned;
    state.pulse=null;
    reveal.setAttribute('aria-pressed', String(pinned));
    reveal.querySelector('span').textContent = pinned ? 'Release' : 'Reveal';
  });
  on(replay, 'click', () => {
    pinned = false; state.reveal = 0; state.gather = 0; state.pulse=null;reset();
    reveal.setAttribute('aria-pressed', 'false'); reveal.querySelector('span').textContent = 'Reveal';
    onReplay();
  });
  on(motion, 'change', () => {
    pinned = false; state.reveal = 0; state.gather = 0; state.pulse=null;reset();
    reveal.setAttribute('aria-pressed','false');reveal.querySelector('span').textContent='Reveal';
  });
  return {
    state,
    update(delta, assembly, breakupTime) {
      enabled = figure.dataset.renderer === 'webgl';
      const ready = enabled && !motion.matches;
      interactive=ready&&assembly===1;
      if(state.pulse){
        state.pulse.age+=delta;
        state.pulse.radius=(state.pulse.reach+state.pulse.width)*state.pulse.age/1.8;
        if(state.pulse.age>1.8||!interactive)state.pulse=null;
      }
      rail.hidden = false;
      reveal.disabled = replay.disabled = !ready || assembly < 1;
      if (held && ready && assembly === 1) {
        heldTime += delta;
        // A short intentional hold, then an accelerating circle of restoration.
        state.gather = Math.min(1, Math.max(0, (heldTime - .18) / 2.2));
        onMove({ clientX: x, clientY: y, isPrimary: true, gather: true });
      } else state.gather *= Math.exp(-delta / .3);
      state.radius = config.shader.brushSize*(coarse.matches ? .82 : 1) + Math.pow(state.gather, 1.7) * Math.hypot(innerWidth, innerHeight) * 4;
      const target = pinned || state.gather > .98 ? 1 : 0;
      state.reveal += (target - state.reveal) * (1 - Math.exp(-delta / .28));
      const interacting = active && ready && assembly === 1 && breakupTime > 1 && !pinned;
      cursor.classList.toggle('active', interacting);
      cursor.classList.toggle('held', held && interacting);
      // The cursor marks the gathering gesture, not an artificial clipping boundary.
      cursor.style.setProperty('--gather', state.gather);
      cursor.style.setProperty('--ring-size', `${18 + state.gather * 62}px`);
      const message = !enabled ? 'Static portrait' : motion.matches ? 'Motion reduced' : assembly < 1 ? 'Assembling' : pinned ? 'Revealed · release to dissolve' : held ? (state.gather===1?'Release to scatter':'Gathering') : state.pulse ? 'Recalling' : coarse.matches ? 'Draw, tap or hold to reveal' : 'Move, click or hold to reveal';
      if (message !== lastHint) { hint.textContent = message; lastHint = message; }
      rail.dataset.state = assembly < 1 ? 'assembling' : pinned ? 'revealed' : 'live';
    },
    dispose() { for (const [el, type, fn] of listeners) el.removeEventListener(type, fn); }
  };
}

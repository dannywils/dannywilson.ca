// A screen-space brush lets a single gesture gather both the portrait and type.
export function createExperience({ root, motion, onMove, onLeave, onReplay }) {
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
  const state = { radius: 90, reveal: 0, gather: 0 };
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push([el, type, fn]); };
  const reset = () => {
    held = false; heldTime = 0; active = false;
    cursor.classList.remove('active', 'held'); onLeave();
  };
  const move = e => {
    if (!enabled || motion.matches || e.isPrimary === false) return;
    x = e.clientX; y = e.clientY; active = true;
    cursor.style.setProperty('--x', `${x}px`); cursor.style.setProperty('--y', `${y}px`);
    onMove({clientX:x,clientY:y,isPrimary:true,gather:held});
  };
  on(root, 'pointermove', move);
  on(root, 'pointerdown', e => {
    if (!enabled || motion.matches || e.isPrimary === false || e.button > 0 || e.target.closest('a,button')) return;
    held = true; heldTime = 0;
    root.setPointerCapture(e.pointerId); move(e);
  });
  on(root, 'pointerup', e => {
    held = false; heldTime = 0;
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    if (e.pointerType !== 'mouse') reset();
  });
  on(root, 'pointerleave', () => { if (!held) reset(); });
  on(root, 'pointercancel', reset);
  on(root, 'lostpointercapture', () => { held = false; heldTime = 0; });
  on(window, 'blur', reset);
  on(document, 'visibilitychange', () => { if (document.hidden) reset(); });
  on(reveal, 'click', () => {
    pinned = !pinned;
    reveal.setAttribute('aria-pressed', String(pinned));
    reveal.querySelector('span').textContent = pinned ? 'Release' : 'Reveal';
  });
  on(replay, 'click', () => {
    pinned = false; state.reveal = 0; state.gather = 0; reset();
    reveal.setAttribute('aria-pressed', 'false'); reveal.querySelector('span').textContent = 'Reveal';
    onReplay();
  });
  on(motion, 'change', () => {
    pinned = false; state.reveal = 0; state.gather = 0; reset();
    reveal.setAttribute('aria-pressed','false');reveal.querySelector('span').textContent='Reveal';
  });
  return {
    state,
    update(delta, assembly, breakupTime) {
      enabled = figure.dataset.renderer === 'webgl';
      const ready = enabled && !motion.matches;
      rail.hidden = false;
      reveal.disabled = replay.disabled = !ready || assembly < 1;
      if (held && ready && assembly === 1) {
        heldTime += delta;
        // A short intentional hold, then an accelerating circle of restoration.
        state.gather = Math.min(1, Math.max(0, (heldTime - .18) / 2.2));
        onMove({ clientX: x, clientY: y, isPrimary: true, gather: true });
      } else state.gather *= Math.exp(-delta / .3);
      state.radius = (coarse.matches ? 78 : 96) + Math.pow(state.gather, 1.7) * Math.hypot(innerWidth, innerHeight) * 4;
      const target = pinned || state.gather > .98 ? 1 : 0;
      state.reveal += (target - state.reveal) * (1 - Math.exp(-delta / .28));
      const interacting = active && ready && assembly === 1 && breakupTime > 1 && !pinned;
      cursor.classList.toggle('active', interacting);
      cursor.classList.toggle('held', held && interacting);
      // The cursor marks the gathering gesture, not an artificial clipping boundary.
      cursor.style.setProperty('--gather', state.gather);
      cursor.style.setProperty('--ring-size', `${18 + state.gather * 62}px`);
      const message = !enabled ? 'Static portrait' : motion.matches ? 'Motion reduced' : assembly < 1 ? 'Assembling' : pinned ? 'Revealed · release to dissolve' : held ? 'Gathering' : coarse.matches ? 'Touch to reveal · hold to gather' : 'Move to reveal · hold to gather';
      if (message !== lastHint) { hint.textContent = message; lastHint = message; }
      rail.dataset.state = assembly < 1 ? 'assembling' : pinned ? 'revealed' : 'live';
    },
    dispose() { for (const [el, type, fn] of listeners) el.removeEventListener(type, fn); }
  };
}

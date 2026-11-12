// Danny's selected look. Shared by the renderer and the tuner's Reset action.
export const publishedLook = Object.freeze({
  density: 113,
  contrast: 0.85,
  brightness: 1.7,
  exposure: 1.15,
  gamma: 1.65,
  glyphWeight: 3,
  glyphFillX: 1,
  glyphFillY: 1,
  gapFill: 0,
  noseContrast: 3,
  zoom: 1.18,
  centerX: -0.3,
  centerY: 0.04,
  letterSpacing: -0.026,
  breakup: 1,
  breakupCenter: 0.72,
  feather: 0.59,
  sweepDuration: 18,
  cycleDuration: 8,
  erosionReach: 1,
  textBreakup: .25,
  identityDelay: .7,
  identityBreakup: .35,
  fragmentation: 1,
  driftSpread: 2,
  windCurl: 0,
  fragmentSpin: 0,
  streamReach: 0,
  erosionStructure: .68,
  fragmentDepth: 0.45,
  flightDepth: 0,
  afterglow: 0,
  brushSize: 200,
  trailPersistence: 2,
  particleSpeed: 0.2,
  particleTravel: 0.05,
  randomness: 0.7,
  debrisDensity: 0.39,
  scrambleHz: 3.5,
  densityJitter: 2,
  idleAmount: 10,
  textIdleAmount: 5,
  idleTravel: 4,
  textIdleTravel: 4,
  idleCopies: true,
  idleRetention: 100,
  redAmount: 7,
  redIntensity: 0.4,
  glitchBandSpeed: 1,
  eyeX: 0.434,
  eyeY: 0.328,
  eyeWidth: 0.019,
  eyeHeight: 0.011,
  eyeGlow: 0.035,
  flickerSpeed: 1.7,
  hold: 0.5,
  interval: 3,
  eyeColor: '#831100',
});

export function applyLook(config, values) {
  for (const key of ['contrast','brightness','exposure','gamma','glyphWeight',
    'noseContrast','zoom','centerX','centerY','breakup','randomness','particleSpeed',
    'particleTravel','debrisDensity','scrambleHz','densityJitter','glitchBandSpeed','sweepDuration',
    'windCurl','fragmentSpin','fragmentDepth','flightDepth','afterglow','streamReach','erosionStructure','brushSize','trailPersistence',
    'cycleDuration','erosionReach','textBreakup','fragmentation','driftSpread','identityDelay','identityBreakup'])
    config.shader[key] = values[key];
  config.ascii.desktopColumns = values.density;
  config.shader.glyphFillX = values.glyphFillX ?? 1;
  config.shader.glyphFillY = values.glyphFillY ?? 1;
  config.shader.gapFill = (values.gapFill ?? 0) / 100;
  if (typeof values.idleAmount === 'number') config.shader.idleFraction = values.idleAmount / 100;
  if (typeof values.textIdleAmount === 'number') config.shader.textIdleFraction = values.textIdleAmount / 100;
  for (const key of ['idleTravel', 'textIdleTravel'])
    if (typeof values[key] === 'number') config.shader[key] = values[key];
  if (typeof values.idleCopies === 'boolean') config.shader.idleCopies = values.idleCopies;
  if (typeof values.idleRetention === 'number') {
    config.shader.idleRetention = values.idleRetention / 100;
    config.shader.idleCopies = values.idleRetention > 0;
  }
  if (typeof values.redAmount === 'number') config.shader.redFraction = values.redAmount / 100;
  if (typeof values.redIntensity === 'number') config.shader.redIntensity = values.redIntensity;
  config.ascii.mobileColumns = Math.round(values.density * .75);
  config.shader.dissolveStart = values.breakupCenter - values.feather / 2;
  config.shader.dissolveEnd = values.breakupCenter + values.feather / 2;
  Object.assign(config.eye, {
    x: values.eyeX, y: values.eyeY, rx: values.eyeWidth, ry: values.eyeHeight,
    glow: values.eyeGlow,
    color: values.eyeColor.slice(1).match(/../g).map(v => parseInt(v, 16)),
  });
  Object.assign(config.timing, {
    interference: 420 / values.flickerSpeed,
    takeover: values.hold * 1000,
    humanMin: values.interval * 1000 - 2500,
    humanMax: values.interval * 1000 + 2500,
  });
}

export const config = {
  intro: { duration: 4.8, flowStart: .72, ignition: .9 },
  email: 'danny@dannywilson.ca',
  portrait: '/assets/portrait.webp',
  timing: { recovery: 260 },
  ascii: { color: [250, 250, 240], cyan: [168, 225, 232], red: '#ff1531', binary: true },
  eye: {},
  shader: { densityGradient: true, redFragments: 1 },
};
applyLook(config, publishedLook);

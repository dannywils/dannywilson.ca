// Danny's selected look. Shared by the renderer and the tuner's Reset action.
export const publishedLook = Object.freeze({
  density: 229,
  contrast: 0.65,
  brightness: 1.15,
  exposure: 1.25,
  gamma: 1.65,
  glyphWeight: 3,
  glyphFillX: 1.2,
  glyphFillY: 1.2,
  gapFill: 0,
  noseContrast: 3,
  zoom: 1.4,
  centerX: -0.03,
  centerY: 0.05,
  letterSpacing: 0.06,
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
  streamReach: 0.4,
  erosionStructure: .68,
  fragmentDepth: 0,
  flightDepth: 0,
  afterglow: 0,
  brushSize: 200,
  trailPersistence: 2,
  particleSpeed: 0.2,
  particleTravel: 0.13,
  randomness: 0.1,
  debrisDensity: 0.58,
  scrambleHz: 11.5,
  densityJitter: 1.25,
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
  ascii: { color: [250, 250, 240], cyan: [168, 225, 232], red: '#ff1531' },
  eye: {},
  shader: {},
};
applyLook(config, publishedLook);

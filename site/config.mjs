// Danny's selected look. Shared by the renderer and the tuner's Reset action.
export const publishedLook = Object.freeze({
  density: 179,
  contrast: 1.7,
  brightness: 1.5,
  exposure: 1.3,
  gamma: 1.55,
  glyphWeight: 2,
  noseContrast: 2.5,
  zoom: 1.22,
  centerX: -0.03,
  centerY: 0.04,
  letterSpacing: 0.026,
  breakup: 1,
  breakupCenter: 0.72,
  feather: 0.59,
  sweepDuration: 18,
  particleSpeed: 0.2,
  particleTravel: 0.18,
  randomness: 1.5,
  debrisDensity: 0.16,
  scrambleHz: 9.5,
  densityJitter: 0,
  glitchBandSpeed: 1,
  eyeX: 0.434,
  eyeY: 0.328,
  eyeWidth: 0.019,
  eyeHeight: 0.011,
  eyeGlow: 0.035,
  nameGlow: 2.5,
  flickerSpeed: 1.7,
  hold: 0.5,
  interval: 3,
  eyeColor: '#831100',
});

export function applyLook(config, values) {
  for (const key of ['contrast','brightness','exposure','gamma','glyphWeight',
    'noseContrast','zoom','centerX','centerY','breakup','randomness','particleSpeed',
    'particleTravel','debrisDensity','scrambleHz','densityJitter','glitchBandSpeed','sweepDuration'])
    config.shader[key] = values[key];
  config.ascii.desktopColumns = values.density;
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
  config.nameGlow = values.nameGlow;
}

export const config = {
  email: 'danny@dannywilson.ca',
  portrait: '/assets/portrait.png',
  timing: { recovery: 260 },
  ascii: { color: [250, 250, 240], cyan: [168, 225, 232], red: '#ff1531' },
  eye: {},
  shader: {},
};
applyLook(config, publishedLook);

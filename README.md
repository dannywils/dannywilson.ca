# Danny Wilson

The personal site at https://dannywilson.ca is hosted on GitHub Pages. The
deployable source is `site/`: plain HTML, CSS and JavaScript modules, with no
production dependency installation or build step. The previous Gatsby source
remains in Git history.

## V2 preview

Run `npm start` (Python 3 required), then open http://localhost:8080. V2 is on
the local `codex/v2` branch; it has not been published to the live domain.

`site/config.mjs` holds the email, timing, ASCII resolution, brightness,
colors, normalized eye mask, nose contrast and disintegration controls. If changing the email,
also update its HTML fallback in `site/index.html`.
Its `publishedLook` contains Danny's selected settings and supplies both the
initial renderer configuration and the tuner's Reset action. Existing device
adjustments remain saved; Reset loads the latest published look.

Open **Tune** (or append `?tune` to the preview URL) for live GPU
controls: character density/weight, contrast, brightness, shadow curve, nose
detail, portrait placement, breakup boundary, particles, turbulence, rewrite
speed, letter spacing, and synchronized eye/name ignition. On phones the panel
sits beneath the portrait. Settings save locally on the current device.
**Copy look link** transfers a look to another device; **Copy settings** exports
JSON for review or **Import settings**. These changes do not change the
published defaults. Reset restores the published look. Test flicker respects
the device's reduced-motion preference.

One controller drives human → interference → takeover → recovery. The first
takeover happens three seconds after assembly finishes, with later intervals randomized around
that value. The name's A/I and one eye light up
and recover together. A shared, uneven ignition envelope (1.7× speed) drives the
name's red glow and the eye's brightness, with a brief later voltage dip.
The name uses wider letter spacing. The page has no taglines. Hovering or holding
a finger restores nearby source pixels by reversing their flight back into place.
The effect follows source coordinates through zoom and placement. Restored pixels
dissolve again after release, cancellation, leaving the area, or losing focus.
Keyboard focus restores the email too. The portrait accepts drawing in any
direction on touchscreens; pinch zoom remains available. The rest of the page
still allows vertical scrolling. Reduced motion keeps the complete portrait and text static.

The interaction strip provides **Replay** for the complete entrance and **Reveal**
to gather the entire scene until **Release** is selected. Moving across the page
leaves a short restoration trail. Pressing and holding expands the brush from the
pointer to the whole scene over about 2.4 seconds; lifting releases the pixels.
Clicking or briefly tapping without dragging sends a travelling recall wave
through the actual source cells, then lets them dissolve again. It takes 1.8
seconds to cross the viewport; each visited cell returns along its existing
flight path. Long holds and drawing do not also trigger the wave, and motion
reduction, cancellation or loss of focus stop it. The persistent **Contact** link
keeps email reachable after the main composition has disappeared.
Both the portrait and type share a screen-space brush, so gathering works across
their boundaries. Fast strokes sweep the intervening path rather than skipping
cells between frames. Returning glyphs briefly catch a cool phosphor tint. Small
corner marks follow the brush; holding draws a progress ring that completes when
the scene is gathered. Touch cancellation,
focus loss and hidden tabs end the hold. The buttons offer a keyboard alternative;
reduced motion keeps the scene still and disables animation actions.

`site/experience.mjs` coordinates these gestures and the utility strip. The
appearance controls retain every original slider, preset and settings export.
Before this creative pass, the synchronized entrance was checkpointed as local
tag `codex/checkpoint-before-creative-20261111` (commit `f2b66ba`) and saved preview
version 19. The live domain remains unchanged.

`site/portrait-gl.mjs` renders ASCII in a single WebGL draw
(179 columns on desktop, 134 on mobile). It samples source luminance and edges,
selects characters from a supersampled glyph atlas with eight alternatives per
tone, then continuously rewrites them at independent rates around 9.5 times
per second. Adjacent tone changes and a moving scramble band add constant
character-level glitches while preserving the face and overall brightness.
The face keeps its source tonal density while character shapes change; density
jumps are confined to its outer silhouette. Stronger tonal contrast preserves
the eyes, glasses and smile. Nose contrast is capped and masked above the upper
lip so it cannot spread into the moustache; fewer shape variants keep the nose
outline stable. Explicit glyph sampling avoids atlas mip blur. Roughly the
right side begins breaking into individually transported glyph cells, then the
boundary sweeps left until the entire portrait and text have dissolved. Cells
depart once and stay gone until restored by interaction. The default sweep is
18 seconds; the panel exposes its duration and starting center, plus a Replay
dissolve button. Departing fragments finish fading after the front passes.
Each cell is drawn once: its original source coordinates, shading and character
move with it, leaving its position empty. No separate debris glyphs are generated.
The characters keep rewriting during flight. Vertex motion varies speed,
acceleration and curl per cell. Shared gusts curl through neighboring rows and
fragments rotate as they depart, with their source pixels attached. Particle
density selects a sparse cohort of longer-lived fragments that can drift toward
the viewport's right edge; the rest fades as local dust. Wind curl, fragment
rotation, stream reach, brush size and trail persistence have dedicated controls.
Boundary softness spans 0.01–2 portrait widths, including
values wider than the whole image. The central features stay intact at the
default boundary. Thin displaced slices intensify the synchronized
takeover. A dark crimson accent with a restrained halo is confined to one eye. The source
photo is never composited into the output. No rendering library is required.
The **Connected erosion** control blends fine independent grain with two scales
of connected contours, so breakup can peel away in irregular patches. It keeps
the same right-to-left sweep and does not introduce extra particle pixels.
Reduced motion keeps a static human state. Hidden tabs stop the animation loop.
GPU context loss reveals the static fallback; restoration rebuilds the renderer.
On initial load the portrait area stays clear until its source and shader are
ready. The actual glyph cells assemble from the screen's left edge over 4.8 seconds, land at
their source positions, then ease into the live disintegration. Image preloading
reduces the initial wait. The alternate SVG is hidden from first paint and only
appears for no JavaScript, script-load failure, or renderer failure. Reduced
motion shows the completed ASCII portrait immediately. Resizing does not replay
the entrance, and hidden tabs pause it. A fixed, pointer-transparent canvas covers
the viewport; the portrait's layout rectangle controls its destination and scale,
not clipping. Incoming and departing cells can cross that rectangle, with only
the screen edge clipping them. Scroll and resize keep the destination aligned.
Each load varies the cells' delays, stop/start bursts, curling paths, jitter,
brief dimming, and horizontal glitch slices. These disturbances taper away as
each cell settles, preserving the exact final portrait.
Disintegration begins during the final 28% of assembly. Each cell can depart only
after its own arrival and when the dissolve front reaches it. The last intro step
finishes at the cell's landing time; there is no global idle interval or extra
departure delay. This overlaps incoming and outgoing motion without jumping to
particles already midway through a flight. `config.intro` shares the timing
between the animation loop and shader. Hover restoration reverses the same paths.

`site/text-effect.mjs` rasterizes the existing name and email letter shapes and
feeds them through the same GPU cell motion. The name and email assemble from
the left alongside the portrait, then disintegrate with the face. Hover
and touch restore text locally. A/I retain synchronized red lighting and
bloom. The original DOM text remains for semantics, selection, keyboard focus,
and the working mail link, and is revealed if rendering fails. Rasterization is
repeated when layout or tuning changes, not on every animation frame.
Screen readers receive
the name, email and portrait description. A static ASCII SVG serves as the
no-JavaScript and renderer-failure fallback.

The built-in image tool extracted `site/assets/portrait.png` from the supplied
photo. Prompt: “Make an accurate photographic head and upper shoulders cutout.
Preserve this exact man's face, hair, rectangular glasses, expression and facial
proportions. Remove bathroom, background, phone and hand. Reconstruct only the
small missing black sweater shoulder area. Centered head and shoulders, head
large, from top of hair to upper chest, transparent background. No text,
graphics, ASCII, beautification or change in identity. Preserve natural facial
shading.” This is a generated extraction, not a measured 3D scan.

## Verification

Run `npm ci`, `npm run check`, and `npm test`. With the preview server running,
`node scripts/verify.mjs` runs browser QA using installed Microsoft Edge,
saves desktop, interference, takeover and mobile screenshots in ignored `output/`.
The static SVG preserves the previous bright ASCII treatment as a fallback.
The checks cover state transitions, synchronized name/eye lighting and recovery,
320–1440 px layouts, reduced motion, keyboard focus, email, WebGL rendering,
GPU context loss/restoration, unavailable WebGL, and no-JS fallback.
`node scripts/verify-tuner.mjs` checks live uniforms, persistence, shared looks,
imports, reset, mobile controls, and the reduced-motion preview behavior.
`node scripts/verify-disintegration.mjs` tracks a single source glyph's pixels
as it leaves the face, checking shape retention and that no duplicate remains.
`node scripts/verify-interaction.mjs` checks hover, held touch, cancellation,
coordinate mapping, local GPU restoration, complete disappearance, release,
and reduced motion.
`node scripts/verify-entrance.mjs` checks delayed loading without a fallback
flash, left-edge entry for both halves of the face, travel beyond the portrait
rectangle, exact landing positions, scroll alignment, reduced motion,
script-load failure, and the handoff to the normal renderer.
`node scripts/verify-text.mjs` checks a continuous handoff, actual letter pixels
departing, A/I-only red lighting, hover/touch release, the email link, and reduced motion.
`node scripts/verify-sweep.mjs` checks right-to-left departure order, permanent
disappearance, restoration of dissolved text, release, and replay.
`node scripts/verify-experience.mjs` checks whole-scene keyboard reveal/release,
progressive gathering, replayed assembly, phone hold/cancellation, and reduced
motion using actual rendered pixel counts.
`node scripts/verify-flow.mjs` checks overlapping arrival/departure for text and
portrait, continuity across the intro boundary, fast brush strokes, and vertical
drawing in an emulated touch browser.
`node scripts/verify-recall.mjs` checks travelling source-cell restoration and
release, click/tap recognition, separation from holds and drawing, persistent
contact access, compact control layouts, and reduced motion.

Push changes to `master` to publish through `.github/workflows/pages.yml`.
The workflow can also be run manually from the Actions tab. GitHub Pages must
use **GitHub Actions** as its publishing source, with `dannywilson.ca` set as
the custom domain and HTTPS enforcement enabled once its certificate is ready.

For local preview, run `python -m http.server 8080 --directory site` and open
http://localhost:8080.

DNS is managed at Squarespace. The apex uses the four GitHub Pages IPv4
addresses, and `www` is a CNAME to `dannywils.github.io`. Preserve the separate
email records when changing the website configuration. Netlify is no longer
part of the build or deployment workflow.

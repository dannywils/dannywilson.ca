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
speed, letter spacing, A/I persistence, and red-eye ignition. On phones the panel
sits beneath the portrait. Settings save locally on the current device.
**Copy look link** transfers a look to another device; **Copy settings** exports
JSON for review or **Import settings**. These changes do not change the
published defaults. Reset restores the published look. Test flicker respects
the device's reduced-motion preference.

One controller drives human → interference → takeover → recovery. The first
ignition starts at 90% of the entrance, while the final cells are still landing.
Replay restages this cue; later intervals vary around three seconds.
The eye uses an uneven ignition envelope (1.7× speed), with a brief later voltage
dip. The name stays uniformly off-white. Its A and I start releasing later and
shed only 35% as many eligible shards as neighboring letters, giving a subtle
AI reference through persistence rather than color or flashing. Their release
delay and erosion multiplier are adjustable in Tune.
The name uses wider letter spacing. The page has no taglines. Hovering or holding
a finger restores nearby source pixels by reversing their flight back into place.
The effect follows source coordinates through zoom and placement. Restored pixels
dissolve again after release, cancellation, leaving the area, or losing focus.
Keyboard focus restores the email too. The portrait accepts drawing in any
direction on touchscreens; pinch zoom remains available. The rest of the page
still allows vertical scrolling. Reduced motion keeps the complete portrait and text static.

`site/timeline.mjs` stages the whole scene as a living, 26-second cycle after the
entrance: light edge activity leaves the identity readable, an asymmetric swell
opens the silhouette into a weightless cloud, then a longer return brings the same source fragments home.
The front remains bounded; the portrait never ends in black. Successive swells
vary gently in strength, and continuous values at cycle boundaries avoid a reset
or hitch. The name sheds only a quarter of the eligible cells, retaining its
letter shapes throughout. **Cycle length**, **Peak erosion**, and **Text erosion**
are independently adjustable in Tune. **Restart cycle** restarts this motion;
**Replay** restages the full entrance and red ignition.
During assembly the same control becomes **Skip**, which moves directly to the
live scene without an extra ignition flash. **Escape** releases a pinned or held
reveal when the tuner is closed; Restart cycle also clears that reveal state.

The interaction strip provides **Replay** for the complete entrance and **Reveal**
to gather the entire scene until **Release** is selected. Moving across the page
leaves a short restoration trail. Pressing and holding expands the brush from the
pointer to the whole scene over about 2.4 seconds; lifting releases the pixels.
Clicking or briefly tapping without dragging sends a travelling recall wave
through the actual source cells, then lets them dissolve again. It takes 1.8
seconds to cross the viewport; each visited cell returns along its existing
flight path. Long holds and drawing do not also trigger the wave, and motion
reduction, cancellation or loss of focus stop it. The persistent **Contact** link
keeps email reachable throughout the animation.
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

The larger headline and portrait form a tighter composition. `site/phosphor.mjs`
adds a short afterimage from the actual rendered pixels, controlled by **Motion
afterglow**. Max compositing keeps unchanged detail from accumulating brightness;
frame-time decay and an 8-bit tail guard clear the trails completely. Red pixels
bypass history so the eye retains its sharp ignition dips. Replay,
layout changes and motion-preference changes clear the history. Reduced motion
and a zero afterglow setting bypass the effect, and unavailable framebuffer
support falls back to the ordinary interactive renderer.

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
silhouette breaks into individually transported source fragments, then the boundary
retreats to restore them. The scene timeline bounds the renderer's erosion clock,
preserving the face instead of advancing through complete disappearance. The
underlying sweep speed remains adjustable alongside the starting center. Hover,
touch and Reveal can gather cells at any point in the automatic cycle; release
blends back into the current stage rather than restarting it.
Each character cell is divided into four independently moving pieces by default.
The character atlas and tonal sampling stay at their original resolution, so
subdivision preserves the assembled face. **Shard detail** adjusts this division
from one to nine pieces per character, capped at four on phones. Each piece is
drawn once, carrying its original source coordinates and shading; no separate
debris glyphs are generated. The characters keep rewriting during flight.
Each shard has an independent velocity on a sphere, with gentle orbital drift
and slow rotation. There is no common wind or screen-right destination. **Weightless
spread** adjusts the volume; **Near / far depth** projects shards toward and away
from the viewer. The bridge and nose release later to retain facial structure.
Particle depth adds edge-on projection and directional dimming to airborne cells. Both
return exactly to their flat source appearance when gathered; the settled face
and type are unaffected. The **Fragment depth** control can reduce or disable it.
**Near / far depth** adds different apparent distances to incoming and departing
source cells: a few pass closer to the lens while others recede. Scale and shading
return exactly to their original values at home, including when restored by touch.
The utility strip stays subdued during assembly and becomes fully visible when
the entrance finishes, or immediately on hover or keyboard focus.
Particle density selects a sparse cohort of longer-lived, farther-travelling
fragments. The remaining shards also stay visible longer, forming a suspended
cloud before returning. Orbital drift, fragment rotation, far fragment reach,
brush size and trail persistence have dedicated controls. The stored `windCurl`
and `streamReach` keys remain compatible with saved looks and now control orbital
drift and far fragment reach.
On phones, the portrait uses the available screen width. Short screens reserve
space for the interaction strip, and landscape has a compact two-column layout.
Boundary softness spans 0.01–2 portrait widths, including
values wider than the whole image. The central features stay intact at the
default boundary. Thin displaced slices intensify the synchronized
takeover. A dark crimson accent with a restrained halo is confined to one eye. The source
photo is never composited into the output. No rendering library is required.
The **Connected erosion** control blends fine independent grain with two scales
of connected contours, so breakup can peel away in irregular patches. It keeps
an opening silhouette with a slight right-side bias and does not introduce extra particle pixels.
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
Each load varies the cells' delays and paths. Nearby cells gather in soft clusters,
with scattered early arrivals and late stragglers. A continuous approach blends
in occasional stalls, slight rotation, and brief glitch slices. Glitches have
smooth attack/release envelopes and fade before the final approach. Short launch
delays and initial momentum bring pieces into view in the opening half-second;
stalls begin only after they are moving. A cubic approach still reaches each
exact source position with zero speed, avoiding a last-frame snap.
Incoming fragments start at 30% ink and gain full brightness as they gather. Afterglow
starts at 30% of its tuned value and eases back to full strength during landing,
keeping fast incoming pieces distinct without changing the floating scene.
Disintegration begins during the final 28% of assembly. Each cell can depart only
after its own arrival and when the dissolve front reaches it. The last intro step
finishes at the cell's landing time; there is no global idle interval or extra
departure delay. This overlaps incoming and outgoing motion without jumping to
particles already midway through a flight. `config.intro` shares the timing
between the animation loop and shader. Hover restoration reverses the same paths.

`site/text-effect.mjs` rasterizes the existing name and email letter shapes.
The name passes through the portrait's exact ASCII fragment shader and glyph
atlas, including while assembled. Density, weight, tonal controls and character
rewriting apply to both; the name has no separate texture renderer. Portrait-only
eye, nose and shoulder masks do not affect the letters. Both assemble from
the left alongside the portrait, then the name disintegrates with the face. The email
cells are protected from subsequent disintegration; at the end of assembly the
GPU email switches to the normal, underlined DOM link. Keyboard focus reveals the
link immediately, and reduced motion skips its entrance. Hover
and touch restore text locally. A/I share the same neutral ink as the other
letters; normalized bounds select their delayed, reduced disintegration in the
vertex shader. Bounds update with layout, so the effect survives phone sizing,
letter-spacing changes and tuning. The original DOM text remains for semantics, selection, keyboard focus,
and the working mail link, and is revealed if rendering fails. Rasterization is
repeated when layout or letter spacing changes. Tone and motion adjustments reuse
the name texture and update its shader settings directly.
Screen readers receive
the name, email and portrait description. A static ASCII SVG serves as the
no-JavaScript and renderer-failure fallback.

The built-in image tool extracted `source-assets/portrait.png` from the supplied
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
The live portrait uses `site/assets/portrait.webp`, a lossless encoding with
identical decoded RGBA pixels. The original PNG stays outside the deployed assets.
The SVG is requested only for no-JavaScript or renderer/script failure, avoiding
an unused 983 KB download on the WebGL path.

The fragment mesh uses four indexed vertices per cell where WebGL supports
32-bit indices, with the original six-vertex path as a compatibility fallback.
This reduces vertex processing and interaction buffer size by one third without
changing source density, shard count or motion. Shared decay constants are
calculated once per interaction update instead of once per cell.
The checks cover state transitions, red-eye lighting and recovery, neutral text,
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
departing, neutral text during eye ignition, hover/touch release, the email link, and reduced motion.
`node scripts/verify-sweep.mjs` stress-tests the underlying flight primitive at
full erosion: silhouette-before-core departure, absence of duplicate cells, restoration of
dissolved text, release, and the cycle restart control.
`node scripts/verify-experience.mjs` stress-tests whole-scene keyboard reveal/release,
progressive gathering, replayed assembly, phone hold/cancellation, and reduced
motion using actual rendered pixel counts.
`node scripts/verify-flow.mjs` checks overlapping arrival/departure for text and
portrait, continuity across the intro boundary, fast brush strokes, and vertical
drawing in an emulated touch browser.
`node scripts/verify-recall.mjs` checks travelling source-cell restoration and
release, click/tap recognition, separation from holds and drawing, persistent
contact access, compact control layouts, and reduced motion.
`node scripts/verify-depth.mjs` checks airborne foreshortening, exact settled and
restored pixels, reduced motion, and phone/landscape layouts above the controls.
`node scripts/verify-phosphor.mjs` checks source-only afterimages, stationary
brightness, red flicker dips, complete high-refresh decay, resize/reduced-motion
clearing, and continued rendering if the optional effect becomes unavailable.
`node scripts/verify-cinema.mjs` checks the timed entrance ignition and Replay,
matching text/portrait light envelopes, uninterrupted breakup, and near/far
projection with exact home, restored, and reduced-motion pixels.
`node scripts/verify-timeline.mjs` samples ten minutes of cycle continuity and
rendered portrait/text presence across several cycles, including return from
peak erosion, gathering, reduced motion, and phone layouts.
`node scripts/verify-gravity.mjs` checks source shards travelling in all four
screen directions, absence of invented pixels, exact assembled detail after
subdivision, and desktop/phone viewport frame timing.
`node scripts/verify-identity.mjs` compares identical A/I source pixels with and
without retention: delayed release, fewer departures, no phase-dependent red,
exact restoration, and desktop/phone bounds.

`node scripts/verify-polish.mjs` checks compact, phone, landscape and desktop
layouts, persistent contact details, 44px action targets and tuner inputs,
16px phone fields, Escape-to-close, focus return, and the mail link. The tuning
panel separates timeline/lettering from fragment motion; controls retain the
existing stored settings and shared-look format.

`node scripts/verify-quality.mjs` checks Skip/Replay, Escape release, restart after
Reveal, name texture reuse, spacing refresh, invalid/empty number-field recovery,
and reduced motion. Invalid number fields return to the last accepted value on
blur, keeping the displayed settings consistent with the renderer.

`node scripts/verify-email.mjs` checks loading without an email flash, keyboard
access during assembly, real email source cells in flight, exact/protected landing,
the GPU-to-DOM handoff, mail clicks, Replay and reduced motion during the entrance.

`node scripts/verify-optimization.mjs` compares indexed and legacy rendering
pixel-for-pixel through entry, settled and disintegrating frames for both portrait
and type; it also compares interaction state and tests conditional fallback loading.
`node scripts/profile.mjs <label>` writes local resource and CPU measurements to
`output/profile-<label>.json`. On the development host, uncompressed requested
resources dropped from 2,696,088 to 1,099,845 bytes (59%); these figures are not
physical-phone timing or CDN transfer measurements.

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

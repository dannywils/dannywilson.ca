# Danny Wilson

The live personal site is https://dannywilson.ca, hosted on GitHub Pages.
`npm run build` produces `dist/` from `site/`, with no production dependencies.
The production build excludes Tune, its stylesheet and saved settings, interaction
hints, Replay and Reveal. It uses the published look in `site/config.mjs` and keeps
pointer interactions. The icon-only email link has an accessible name, a 52px
hit area and a brief envelope glitch that respects reduced motion.

Pushes to `master` run syntax checks, unit tests and the production build before
GitHub Pages deploys `dist/`. The custom domain is retained via `site/CNAME`.
The development source retains its tuning interface for future adjustments.

## Run locally

Run `npm start` (Python 3 required), then open http://localhost:8080.
`npm ci` installs development checks. `npm run check` verifies module syntax;
`npm test` runs unit checks. To preview production, run `npm run build`, then
`python -m http.server 8081 --directory dist`. Run
`node scripts/verify-production.mjs` against that server.

## Current experience

The composition fits the dynamic viewport without document scrolling. Desktop
and short landscape windows use two columns; portrait phones stack the name and
face. Typography scales with both width and height. Artwork cannot be selected.
The floating **Email Danny** icon link remains available from first paint and in fallback
mode. In the development preview, **Replay**, **Reveal / Release**, and **Tune** remain keyboard accessible.
The tuner scrolls independently of the fixed artwork; fields remain editable.

The portrait and uppercase name use the same WebGL shader and glyph atlas.
Photographic luminance selects the face's glyphs; solid letter ink uses a stable
mix of medium and dense glyph buckets. Text cells are slightly larger and lighter
so individual characters remain visible. Shapes rewrite at independent rates.
Reduced motion retains varied ASCII texture without animation.

Actual source fragments assemble from irregular positions across and beyond the
viewport over 4.8 seconds. Paths bend, stall and glitch locally, then settle into
place. The static SVG stays hidden until no-JavaScript, script-load failure, or
renderer failure requires it. Reduced motion shows the assembled scene immediately.
Resizing does not replay the intro, and hidden tabs pause animation.

`site/timeline.mjs` supplies continuous time for sparse outward disintegration.
About 90% of the source stays home while small groups coast outward and return at
independent rates around the selected 8-second base period. Displaced glyphs retain their
ink and shape; the full face and name stay visible. There is no inward collapse,
disappearance, or A/I-only pause. Idle motion treats A and I like every other letter.
Their subtle distinction is immunity to hover, tap, drag and flick. Protection uses
actual ink bounds and complete sampled glyph cells, without neighboring letters.
In the development preview, **Reveal** temporarily gathers the complete scene; **Release** resumes idle drift.

Mouse movement alone throws nearby fragments: recent velocity triggers local
directional bursts with a short cooldown. Slower movement uses the gentle brush.
Touch flicks trigger on release. Taps select broader irregular patches, drift for
1.1 seconds, then return over 2.7 seconds. Up to 16 independent bursts overlap;
new gestures never replace existing bursts. Holds keep a fixed local radius.
Tap targeting accounts for the drift position at impact; hover follows moving
cells. Pinch zoom remains available, and a second finger cancels the active brush.
The development preview’s keyboard Reveal offers a non-pointer alternative.

Returning fragments stay compact. The live renderer no longer uses the afterimage
pass, landing highlights, or anisotropic shard stretching. The red-eye feature,
its ignition controller, and its Tune controls are removed from the live experience.
Legacy configuration keys remain readable for old saved looks but cannot restore
the eye or afterimage effects.

Brief idle glitches rewrite small patches and shift narrow rows. A rarer shared
tear crosses the portrait and name roughly every 29 seconds. Reveal and reduced
motion suppress those events. Both layers share screen coordinates, timing and
glyph rendering; no extra decorative particles are generated.

Adaptive quality watches sustained slow frames on phones and touch devices. It
reduces shard subdivision when no gesture or glitch is active, then restores it
after sustained recovery. Glyph density, shading and output resolution stay fixed.
Idle cohorts are selected per glyph so subdivision changes do not relocate them.
Layout bounds are cached and refreshed on resize or viewport changes, not read
every frame. The indexed mesh uses four vertices per shard, with a six-vertex
compatibility path when required.

## Tune

Open **Tune** or append `?tune`. Active controls cover character density and weight,
brightness, contrast, shadow curve, nose detail, portrait position, letter spacing,
cycle length, fragment detail and movement, touch radius, and character rewriting.
**Horizontal fill** and **Vertical fill** expand the glyph ink independently inside
each existing cell. Both default to 1.2 and range from 0.5 to 2; higher values narrow
character/row gaps without changing density, contrast, source geometry or motion.
They apply to the portrait and name. Atlas sampling stays inside each glyph's tile.
**Gap fill** (0–100) fills the spaces between and inside characters on both the
portrait and name. At 100, every source cell is solid, retaining tonal shading and
the source silhouette. At 0 (default), the original ASCII texture is unchanged.
Fragment movement still works normally; empty background is never filled.
Changes save only in the current browser. **Reset** restores `publishedLook` from
`site/config.mjs`. **Copy settings**, **Import settings**, and **Copy look link**
transfer looks between devices without changing published defaults. Old ignition,
afterglow, partial-erosion and boundary controls have been retired.

The email address is in `site/config.mjs`; update its native HTML fallback in
`site/index.html` as well when changing it. The portrait uses lossless WebP; the
static SVG is requested only when the interactive renderer is unavailable.

## Verification

With the local server running, relevant Edge browser checks include:

- `node scripts/verify-ambient.mjs`: window fit, no scrolling or text selection,
  sparse idle movement, continued portrait/name visibility across several cycles,
  stable drift under detail changes, no red eye, reduced motion, and mouse flicks.
- `node scripts/verify-identity-immunity.mjs`: A/I stay unaffected by hover and
  taps at desktop and phone sizes and multiple device-pixel ratios.
- `node scripts/verify-refinements.mjs`: directional rendered motion, synchronized
  glitches, exact settled pixels across mesh detail changes, and adaptation.
- `node scripts/verify-touch.mjs`: independent bursts, local holds, drift and
  return timing, pinch cancellation, email, controls, and tuner scrolling.
- `node scripts/verify-email.mjs`: floating contact, responsive sizes, keyboard
  focus, mail link, reduced motion, no JavaScript and script-load failure.
- `node scripts/verify-quality.mjs`: Skip/Replay, Reveal, cycle restart, texture
  reuse, tuning validation and keyboard behavior.
- `node scripts/verify-ascii-type.mjs`: shared shader, visible glyph gaps,
  rewriting, density changes and reduced-motion stability.
- `node scripts/verify-glyph-fill.mjs`: independent width/height changes in actual
  rendered glyphs, cell boundaries, old saved looks, persistence, sharing, import
  bounds and Reset.

Screenshots are saved in ignored `output/`. These are browser-emulated phone
checks, not physical-phone performance measurements. Older scripts describe prior
creative iterations and may intentionally assert superseded eye/timeline behavior.
The earlier synchronized entrance was checkpointed at
`codex/checkpoint-before-creative-20261111` (`f2b66ba`).

## Portrait asset provenance

The built-in image tool extracted `source-assets/portrait.png` from the supplied
photo. Prompt: “Make an accurate photographic head and upper shoulders cutout.
Preserve this exact man's face, hair, rectangular glasses, expression and facial
proportions. Remove bathroom, background, phone and hand. Reconstruct only the
small missing black sweater shoulder area. Centered head and shoulders, head
large, from top of hair to upper chest, transparent background. No text,
graphics, ASCII, beautification or change in identity. Preserve natural facial
shading.” This is a generated extraction, not a measured 3D scan.

## Production publishing

Push `master` to publish through `.github/workflows/pages.yml`, or run that
workflow from Actions. V2 preview work does not push or merge into `master`.
GitHub Pages uses GitHub Actions, the custom domain `dannywilson.ca`, and HTTPS.
DNS is managed at Squarespace; preserve separate email records when changing
website DNS. Netlify is no longer part of the publishing workflow.

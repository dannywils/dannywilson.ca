# dannywilson.ca

My [personal website](https://dannywilson.ca): an ASCII portrait and name that
assemble, glitch, and scatter when you touch them. Built with HTML, CSS,
JavaScript, and WebGL. Hosted on GitHub Pages.

## Run locally

Requires Node.js 22 or later and Python 3.

```sh
npm ci
npm start
```

Open [localhost:8080](http://localhost:8080). The development version includes
Tune, Replay, and Reveal controls.

To preview the production build:

```sh
npm run build
python -m http.server 8081 --directory dist
```

Open [localhost:8081](http://localhost:8081). Production uses the published
settings and leaves out the tuning tools and interaction hints.

## How it works

The portrait and name share a WebGL renderer and a binary character atlas.
Characters shrink from the left of the name to the right of the face. The face
keeps its source characters while copies drift away; the name leaves holes.
Characters change at rest; taps and flicks scatter nearby pieces before they return.
The A in Danny and I in Wilson stay put during pointer interactions.

The scene fits the window on desktop and mobile. Reduced motion shows a still
image, and a static portrait replaces WebGL when it is unavailable. The email
link works without JavaScript.

## Change the look

Open Tune in the development version, or visit
[localhost:8080/?tune](http://localhost:8080/?tune). Settings save in your browser.
Copy settings exports JSON; copy look link lets you share a look. Reset restores
the published defaults.

Horizontal and vertical fill adjust the space between glyphs and rows. Gap fill
fills the spaces between and inside characters: 0 keeps the ASCII texture,
100 makes solid cells.

To publish a look, update `publishedLook` in [site/config.mjs](site/config.mjs).
The contact address lives there too; also update its HTML fallback in
[site/index.html](site/index.html) when changing it.

## Checks

```sh
npm run check
npm test
npm run build
```

With the production server running on port 8081:

```sh
node scripts/verify-production.mjs
```

The browser checks use Microsoft Edge and cover desktop and mobile layouts,
pointer input, reduced motion, and the email link. Screenshots go in `output/`.
Other scripts in `scripts/` cover individual effects; some target earlier versions.

## Portrait

The portrait was cut out from my photo using an image-generation tool. The source
is in `source-assets/`; the WebP and static SVG used by the site are in
[site/assets/](site/assets/).

## Publish

Push site changes to `master`. The [Pages workflow](.github/workflows/pages.yml)
runs the checks, builds `dist/`, and deploys it to **dannywilson.ca** over HTTPS.
You can also run the workflow manually from GitHub Actions.

The custom domain is configured in GitHub Pages settings. DNS is managed at
Squarespace. The old Netlify DNS zone also points to GitHub for resolvers still
using the former nameservers; Netlify no longer builds the site.

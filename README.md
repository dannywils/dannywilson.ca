# Danny Wilson

The personal site at https://dannywilson.ca is hosted on GitHub Pages. The
deployable source is `site/`: plain HTML and the original stylesheet, with no
package installation or build step. The previous Gatsby source remains in Git
history.

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

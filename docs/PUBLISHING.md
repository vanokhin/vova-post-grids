# Publishing the Posts Grid website

The website is a dependency-free static site in `docs/`. A GitHub Actions workflow publishes it whenever website files are pushed to `main`.

## First publication

1. Commit the `docs/` directory and `.github/workflows/pages.yml`.
2. Push the commit to `main` on GitHub.
3. Open the repository on GitHub and go to **Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Open **Actions → Deploy website to GitHub Pages**. If the push ran before Pages was enabled, choose **Run workflow** to start it again.
6. After the workflow finishes, visit `https://vanokhin.github.io/vova-posts-grid/`.
7. On the repository home page, open the **About** settings and set the website field to the published URL so visitors can find it immediately.

GitHub may take several minutes to make the first deployment available.

## Local preview

From the repository root, run:

```bash
python3 -m http.server 8080 --directory docs
```

Then open `http://localhost:8080/`.

## Publishing updates

Edit files in `docs/` and push them to `main`. The workflow deploys only when the website or workflow changes.

When the plugin version changes:

1. Run `npm run export` to create the release ZIP.
2. Copy the new ZIP from `dist/` to `docs/downloads/`.
3. Regenerate `docs/downloads/SHA256SUMS` for the new ZIP.
4. Remove the previous ZIP from `docs/downloads/` when it is no longer needed.
5. Update all of these values in `docs/index.html`:

-   the visible version labels;
-   `softwareVersion` in the JSON-LD block;
-   every direct ZIP URL;
-   the ZIP URL in `downloadUrl`.

Also update `docs/social-preview.svg` and regenerate `docs/social-preview.png` if the version is shown there.

## Optional custom domain

1. Add the domain in **Settings → Pages → Custom domain**.
2. Configure the DNS records GitHub shows.
3. After GitHub verifies the domain, enable **Enforce HTTPS**.
4. Update the canonical URL, Open Graph URL/image, `robots.txt`, and `sitemap.xml` to use the custom domain.

Do not add a `CNAME` file until the domain is known.

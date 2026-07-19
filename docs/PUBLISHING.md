# Publishing the Posts Grid plugin and website

GitHub Actions publishes installable plugin archives from version tags and deploys the dependency-free static site in `docs/` from `main`.

## Publishing a GitHub Release

The release workflow builds and publishes the installable plugin ZIP whenever a `v*` tag is pushed. The tag must exactly match the version in `package.json`, including the leading `v`.

1. Update `package.json` and `package-lock.json` together:

    ```bash
    npm version 1.1.0 --no-git-tag-version
    ```

2. Update the changelog in `readme.txt` and any version references in `docs/`.
3. Run `npm run export` locally to verify the release archive.
4. Commit the release changes and push them to `main`.
5. Create and push the matching tag:

    ```bash
    git tag -a v1.1.0 -m "v1.1.0"
    git push origin v1.1.0
    ```

The workflow creates a GitHub Release with generated release notes, `vova-posts-grid-<version>.zip`, the stable `vova-posts-grid.zip` download, and `SHA256SUMS`. A version mismatch stops the release before publication.

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

1. Update `softwareVersion` in the `docs/index.html` JSON-LD block.

2. Update `docs/social-preview.svg` and regenerate `docs/social-preview.png` if the version is shown there.

The download buttons and `downloadUrl` use the permanent `releases/latest/download/vova-posts-grid.zip` URL, so they automatically resolve to the latest published GitHub Release without website changes.

## Optional custom domain

1. Add the domain in **Settings → Pages → Custom domain**.
2. Configure the DNS records GitHub shows.
3. After GitHub verifies the domain, enable **Enforce HTTPS**.
4. Update the canonical URL, Open Graph URL/image, `robots.txt`, and `sitemap.xml` to use the custom domain.

Do not add a `CNAME` file until the domain is known.

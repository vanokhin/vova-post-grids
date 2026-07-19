<p align="center">
  <a href="https://vanokhin.github.io/vova-posts-grid/">
    <img src="docs/social-preview.png" alt="Vova's Posts Grid — a free Gutenberg block for flexible, responsive post grids" width="1200">
  </a>
</p>

<h1 align="center">Vova's Posts Grid</h1>

<p align="center">
  A focused Gutenberg block for flexible queries, responsive layouts, fully customizable cards, and smooth AJAX pagination.
</p>

<p align="center">
  <a href="https://vanokhin.github.io/vova-posts-grid/"><strong>Website</strong></a>
  ·
  <a href="https://github.com/vanokhin/vova-posts-grid/releases/latest/download/vova-posts-grid.zip"><strong>Download latest</strong></a>
  ·
  <a href="https://github.com/vanokhin/vova-posts-grid/releases"><strong>Releases</strong></a>
</p>

<p align="center">
  <a href="https://github.com/vanokhin/vova-posts-grid/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/vanokhin/vova-posts-grid?display_name=tag&sort=semver"></a>
  <a href="https://wordpress.org/"><img alt="WordPress 6.5 or later" src="https://img.shields.io/badge/WordPress-6.5%2B-21759B?logo=wordpress&logoColor=white"></a>
  <a href="https://www.php.net/"><img alt="PHP 7.4 or later" src="https://img.shields.io/badge/PHP-7.4%2B-777BB4?logo=php&logoColor=white"></a>
  <a href="LICENSE"><img alt="GPL 2.0 or later" src="https://img.shields.io/badge/license-GPL--2.0--or--later-2E8B57"></a>
</p>

Vova's Posts Grid lets you build post grids directly in the WordPress block editor. Query any public post type, hand-pick specific posts, and control every part of the layout without an account, a paid tier, or an external service.

## Highlights

-   **Flexible content queries** — choose a public post type and filter by taxonomy, terms, keyword, author, date range, featured image, or custom field.
-   **Hand-picked collections** — select and order individual posts instead of using a dynamic query.
-   **Responsive layouts** — configure desktop, tablet, and mobile columns independently, along with horizontal and vertical spacing.
-   **Complete card control** — reorder or hide the image, title, metadata, excerpt, and read-more link.
-   **Rich metadata** — display the date, author, categories, comments, modified date, reading time, or badges from a public taxonomy.
-   **Custom styling** — adjust image treatment, typography, colors, spacing, excerpt length, and read-more presentation.
-   **Smooth pagination** — load numbered or previous/next pages in place through the WordPress REST API.
-   **Native WordPress foundation** — built with core editor components, server-side rendering, and WordPress data APIs.

## Screenshots

|                                                Classic grid                                                 |                                                Magazine layout                                                |
| :---------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------: |
| [![Classic three-column post grid](docs/screenshots/classic-grid.webp)](docs/screenshots/classic-grid.webp) | [![Two-column magazine layout](docs/screenshots/magazine-layout.webp)](docs/screenshots/magazine-layout.webp) |
|                                           **Three-column cards**                                            |                                              **Editorial cards**                                              |

|                                                      Compact feed                                                      |                                                     Visual gallery                                                     |
| :--------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------: |
| [![Compact single-column post feed](docs/screenshots/compact-news-feed.webp)](docs/screenshots/compact-news-feed.webp) | [![Dense four-column visual post gallery](docs/screenshots/visual-gallery.webp)](docs/screenshots/visual-gallery.webp) |
|                                                  **Text-first list**                                                   |                                                  **Image-first grid**                                                  |

<details>
<summary><strong>See all block controls</strong></summary>

|                                              Query                                              |                                               Layout and pagination                                               |                                             Card design                                             |
| :---------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------: |
| [![Query controls](docs/screenshots/query-controls.webp)](docs/screenshots/query-controls.webp) | [![Layout and pagination controls](docs/screenshots/layout-controls.webp)](docs/screenshots/layout-controls.webp) | [![Card design controls](docs/screenshots/card-controls.webp)](docs/screenshots/card-controls.webp) |

</details>

## Installation

### Install a release

1. [Download the latest plugin ZIP](https://github.com/vanokhin/vova-posts-grid/releases/latest/download/vova-posts-grid.zip).
2. In WordPress, go to **Plugins → Add New Plugin → Upload Plugin**.
3. Select the ZIP, install it, and activate **Vova's Posts Grid**.
4. Open a post or page in the block editor.
5. Add the **Posts Grid** block from the **Vova Posts Grid** category.

You can also extract the release into `wp-content/plugins/vova-posts-grid` and activate it from the Plugins screen.

> The installable release already contains compiled assets. A source checkout must be built before it can be used as a plugin.

## Using the block

The inspector is organized into three tabs:

1. **Query** — build a dynamic query or choose specific posts, then set filters, ordering, sticky-post behavior, and the number of posts per page.
2. **Block** — configure responsive columns, gaps, pagination, images, empty-state text, and loading skeletons.
3. **Card** — arrange card elements and customize metadata, excerpts, links, typography, and colors.

The block also supports wide and full alignment. When pagination is enabled, only the grid content is updated; the page itself is not reloaded.

## Requirements

| Dependency   | Version                                             |
| ------------ | --------------------------------------------------- |
| WordPress    | 6.5 or later (tested up to 7.0)                     |
| PHP          | 7.4 or later                                        |
| Block editor | Gutenberg-compatible editor included with WordPress |

## Development

Clone the repository and install the JavaScript and PHP development dependencies:

```bash
git clone https://github.com/vanokhin/vova-posts-grid.git
cd vova-posts-grid
npm ci
composer install
```

The production build also regenerates the translation template, so make sure [WP-CLI](https://wp-cli.org/) and its `i18n` command are available.

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm start`            | Start the development build in watch mode                  |
| `npm run build`        | Compile production assets and regenerate the POT file      |
| `npm run lint:js`      | Lint JavaScript                                            |
| `npm run lint:css`     | Lint stylesheets                                           |
| `npm run lint:php`     | Check WordPress coding standards and PHP 7.4 compatibility |
| `npm run format:check` | Check formatting without changing files                    |
| `npm run test:unit`    | Run JavaScript unit tests                                  |
| `npm run export`       | Build and create a verified release ZIP in `dist/`         |

### Project structure

```text
vova-posts-grid.php              Plugin bootstrap and block registration
includes/                        Server-side queries, rendering, and REST endpoint
src/blocks/posts-grid/           Block metadata, editor UI, styles, and front-end script
src/shared/                      Shared editor components and styles
languages/                       Translation template
scripts/                         Reproducible release tooling
docs/                            GitHub Pages website and screenshots
```

Release tags are expected to match the version in `package.json`. See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the complete publishing workflow.

## Frequently asked questions

### Which content can the block display?

Any public post type and its public taxonomies, or a hand-picked list of specific posts.

### Does pagination reload the whole page?

No. The selected page is loaded through the WordPress REST API and the grid is updated in place.

### Does the plugin connect to an external service?

No. It works entirely with the content and APIs of the WordPress site where it is installed.

### Can I use it on a commercial website?

Yes. The plugin is free software licensed under GPL-2.0-or-later.

## License

Copyright © Vova Anokhin. Licensed under the [GNU General Public License v2.0 or later](LICENSE).

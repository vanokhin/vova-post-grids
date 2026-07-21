=== Vova's Post Grids ===
Contributors: gn_themes
Tags: posts, grid, gutenberg, query loop, pagination
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 999-version
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Responsive posts grid block.

== Description ==

Vova's Post Grids adds a focused block for displaying WordPress content in responsive post grids.

Build a dynamic query or select specific posts. Filter public content by post type, taxonomy, terms, keyword, author, date range, featured image, and custom fields. Control ordering, sticky posts, the current post, responsive columns, spacing, images, card elements, metadata, excerpts, links, empty states, loading skeletons, and AJAX pagination.

The block uses native WordPress data and editor components. It does not require an account or an external service.

== Installation ==

1. Upload the `vova-post-grids` folder to `/wp-content/plugins/`, or install the plugin ZIP through `Plugins > Add New > Upload Plugin`.
2. Activate **Vova's Post Grids**.
3. Open a post or page in the block editor.
4. Add the **Post Grids** block from the **Vova Post Grids** category.
5. Configure the query, layout, content, and pagination in the block sidebar.

== Frequently Asked Questions ==

= Which content can the block display? =

The block can query public post types and their public taxonomies, or display a hand-picked list of posts.

= Does pagination reload the whole page? =

No. When pagination is enabled, the block loads the selected page through the WordPress REST API and updates the grid in place.

= Can the card layout adapt to different screen sizes? =

Yes. Desktop, tablet, and mobile column counts and grid spacing can be configured independently.

= Does the plugin connect to an external service? =

No. The plugin works with content and APIs provided by the WordPress site where it is installed.

== Development ==

The release archive includes the human-readable block source and locked npm dependency metadata.

1. Install Node.js and npm, then run `npm ci`.
2. Install WP-CLI with the i18n command available.
3. Run `npm run build` to compile production assets and regenerate the translation template.
4. Run `npm run lint:js` and `npm run lint:css` for JavaScript and stylesheet checks.
5. Install the Composer development dependencies and run `npm run lint:php` for WordPress and PHP 7.4 compatibility checks.
6. Run `npm run export` to build and create the release ZIP in `dist/`.

== Changelog ==

= 2.0.0 =

- Plugin name changed to Vova's Post Grids (formerly Posts Grid)

= 1.0.1 =

- Hardened REST API endpoint

= 1.0.0 =

- Initial WordPress.org release.

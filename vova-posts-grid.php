<?php
/**
 * Plugin Name: Vova's Posts Grid
 * Plugin URI: https://vanokhin.github.io/vova-posts-grid/
 * Description: A responsive posts grid block with flexible queries and AJAX pagination.
 * Version: 999-version
 * Author: Vova Anokhin
 * Text Domain: vova-posts-grid
 * Domain Path: /languages
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package VovaPostsGrid
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'VOVAPG_VERSION', '999-version' );
define( 'VOVAPG_PLUGIN_FILE', __FILE__ );
define( 'VOVAPG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VOVAPG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once VOVAPG_PLUGIN_DIR . 'includes/class-vovapg-posts-grid.php';

/**
 * Registers the Posts Grid block from built metadata.
 *
 * @return void
 */
function vovapg_register_block(): void {
	$block_path = VOVAPG_PLUGIN_DIR . 'build/blocks/posts-grid';

	if ( ! file_exists( $block_path . '/block.json' ) ) {
		return;
	}

	register_block_type(
		$block_path,
		array( 'category' => 'vova-posts-grid' )
	);
}

/**
 * Adds the plugin's block category to the editor inserter.
 *
 * @param array<int, array<string, mixed>> $categories Existing categories.
 * @return array<int, array<string, mixed>>
 */
function vovapg_add_block_category( array $categories ): array {
	foreach ( $categories as $category ) {
		if ( isset( $category['slug'] ) && 'vova-posts-grid' === $category['slug'] ) {
			return $categories;
		}
	}

	array_unshift(
		$categories,
		array(
			'slug'  => 'vova-posts-grid',
			'title' => __( "Vova's Posts Grid", 'vova-posts-grid' ),
			'icon'  => null,
		)
	);

	return $categories;
}

add_action( 'init', 'vovapg_register_block' );
add_action( 'rest_api_init', array( 'VOVAPG_Posts_Grid', 'register_rest_routes' ) );
add_filter( 'block_categories_all', 'vovapg_add_block_category' );

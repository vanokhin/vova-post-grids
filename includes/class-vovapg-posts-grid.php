<?php
/**
 * Posts Grid rendering and AJAX endpoints.
 *
 * @package VovaPostsGrid
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Posts Grid block helpers.
 */
final class VOVAPG_Posts_Grid {
	private const REST_NAMESPACE                 = 'vovapg/v1';
	private const REST_ROUTE                     = '/posts-grid/render';
	private const READ_MORE_BUTTON_PADDING_RATIO = 1.618;
	private const READING_TIME_WORDS_PER_MINUTE  = 200;
	private const META_TAXONOMY_PREFIX           = 'taxonomy:';
	private const DEFAULT_ACCENT_COLOR           = '#0088ff';
	private const DEFAULT_TITLE_FONT_SIZE        = 17.6;
	private const DEFAULT_META_FONT_SIZE         = 13.76;
	private const DEFAULT_EXCERPT_FONT_SIZE      = 15.36;
	private const DEFAULT_READ_MORE_FONT_SIZE    = 16;

	/**
	 * Registers public REST routes for editor previews and AJAX pagination.
	 *
	 * @return void
	 */
	public static function register_rest_routes(): void {
		register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'render_ajax' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'attributes' => array(
						'required' => false,
					),
					'page'       => array(
						'required'          => false,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * Renders a REST response for editor preview and frontend pagination.
	 *
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response
	 */
	public static function render_ajax( WP_REST_Request $request ): WP_REST_Response {
		$attributes = $request->get_param( 'attributes' );
		$attributes = is_array( $attributes ) ? $attributes : array();
		$page       = max( 1, absint( $request->get_param( 'page' ) ) );
		$settings   = self::normalize_attributes( $attributes );
		$result     = self::render_content( $settings, $page );

		return rest_ensure_response(
			array(
				'html'        => $result['html'],
				'page'        => $result['page'],
				'maxNumPages' => $result['max_num_pages'],
				'foundPosts'  => $result['found_posts'],
			)
		);
	}

	/**
	 * Renders the block wrapper for the frontend render file.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string Rendered block HTML.
	 */
	public static function render_block( array $attributes ): string {
		$settings                  = self::normalize_attributes( $attributes );
		$settings['contextPostId'] = self::get_context_post_id();
		$result                    = self::render_content( $settings, 1 );
		$attributes_json           = wp_json_encode( $settings );

		if ( ! is_string( $attributes_json ) ) {
			$attributes_json = '{}';
		}

		$classes = array(
			'vovapg-posts-grid',
			'vovapg-block',
		);

		if ( 'auto' !== $settings['imageAspectRatio'] ) {
			$classes[] = 'vovapg-posts-grid--fixed-image';
		}

		if ( ! empty( $settings['loadingSkeleton'] ) ) {
			$classes[] = 'vovapg-posts-grid--has-loading-skeleton';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'                  => implode( ' ', $classes ),
				'style'                  => self::get_wrapper_style( $settings ),
				'data-vovapg-block'      => 'posts-grid',
				'data-vovapg-rest-url'   => esc_url_raw( rest_url( self::REST_NAMESPACE . self::REST_ROUTE ) ),
				'data-vovapg-attributes' => $attributes_json,
				'data-vovapg-page'       => '1',
			)
		);

		ob_start();
		?>
		<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<div class="vovapg-posts-grid__content" aria-live="polite">
				<?php echo $result['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</div>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Returns normalized block attributes.
	 *
	 * @param array<string, mixed> $attributes Raw attributes.
	 * @return array<string, mixed>
	 */
	private static function normalize_attributes( array $attributes ): array {
		$image_size         = isset( $attributes['imageSize'] ) ? sanitize_key( (string) $attributes['imageSize'] ) : 'medium_large';
		$image_aspect_ratio = isset( $attributes['imageAspectRatio'] ) ? sanitize_text_field( (string) $attributes['imageAspectRatio'] ) : '16:9';
		$pagination_type    = isset( $attributes['paginationType'] ) ? sanitize_text_field( (string) $attributes['paginationType'] ) : 'numbersPrevNext';
		$read_more_label    = isset( $attributes['readMoreLabel'] ) ? sanitize_text_field( (string) $attributes['readMoreLabel'] ) : '';
		$read_more_style    = isset( $attributes['readMoreStyle'] ) ? sanitize_text_field( (string) $attributes['readMoreStyle'] ) : 'button';
		$excerpt_length     = isset( $attributes['excerptLength'] ) ? (int) $attributes['excerptLength'] : 24;
		$empty_state_text   = isset( $attributes['emptyStateText'] ) ? sanitize_text_field( (string) $attributes['emptyStateText'] ) : '';
		$image_object_fit   = isset( $attributes['imageObjectFit'] ) ? sanitize_text_field( (string) $attributes['imageObjectFit'] ) : 'cover';
		$image_position     = isset( $attributes['imageObjectPosition'] ) ? sanitize_text_field( (string) $attributes['imageObjectPosition'] ) : 'center center';
		$image_radius       = isset( $attributes['imageBorderRadius'] ) ? (int) $attributes['imageBorderRadius'] : 10;
		$button_padding     = isset( $attributes['readMorePadding'] ) ? (float) $attributes['readMorePadding'] : (float) ( $attributes['readMorePaddingY'] ?? 9 );
		$title_font_size    = isset( $attributes['titleFontSize'] ) ? (float) $attributes['titleFontSize'] : self::DEFAULT_TITLE_FONT_SIZE;
		$meta_font_size     = isset( $attributes['metaFontSize'] ) ? (float) $attributes['metaFontSize'] : self::DEFAULT_META_FONT_SIZE;
		$excerpt_font_size  = isset( $attributes['excerptFontSize'] ) ? (float) $attributes['excerptFontSize'] : self::DEFAULT_EXCERPT_FONT_SIZE;
		$read_more_size     = isset( $attributes['readMoreFontSize'] ) ? (float) $attributes['readMoreFontSize'] : self::DEFAULT_READ_MORE_FONT_SIZE;
		$text_line_height   = isset( $attributes['textLineHeight'] ) ? (float) $attributes['textLineHeight'] : 1.35;
		$pagination_align   = isset( $attributes['paginationAlignment'] ) ? sanitize_key( (string) $attributes['paginationAlignment'] ) : 'center';
		$accent_color       = isset( $attributes['accentColor'] ) ? sanitize_text_field( (string) $attributes['accentColor'] ) : self::DEFAULT_ACCENT_COLOR;
		$meta_color         = isset( $attributes['metaColor'] ) ? sanitize_text_field( (string) $attributes['metaColor'] ) : '';
		$excerpt_color      = isset( $attributes['excerptColor'] ) ? sanitize_text_field( (string) $attributes['excerptColor'] ) : '';

		$allowed_aspect_ratios = array( 'auto', '1:1', '4:3', '3:2', '16:9', '3:4', '2:3' );
		if ( ! in_array( $image_aspect_ratio, $allowed_aspect_ratios, true ) ) {
			$image_aspect_ratio = '16:9';
		}

		$allowed_pagination_types = array( 'none', 'numbers', 'prevNext', 'numbersPrevNext' );
		if ( ! in_array( $pagination_type, $allowed_pagination_types, true ) ) {
			$pagination_type = 'numbersPrevNext';
		}

		if ( ! in_array( $pagination_align, array( 'left', 'center', 'right' ), true ) ) {
			$pagination_align = 'center';
		}

		if ( ! in_array( $read_more_style, array( 'button', 'textLink' ), true ) ) {
			$read_more_style = 'button';
		}

		if ( ! in_array( $image_object_fit, array( 'cover', 'contain', 'fill', 'scale-down' ), true ) ) {
			$image_object_fit = 'cover';
		}

		if ( ! in_array( $image_position, array( 'center center', 'center top', 'center bottom', 'left center', 'right center' ), true ) ) {
			$image_position = 'center center';
		}

		$available_sizes = array_merge( get_intermediate_image_sizes(), array( 'full' ) );
		if ( ! in_array( $image_size, $available_sizes, true ) ) {
			$image_size = in_array( 'medium_large', $available_sizes, true ) ? 'medium_large' : 'large';
		}

		return array(
			'query'               => self::normalize_query( isset( $attributes['query'] ) && is_array( $attributes['query'] ) ? $attributes['query'] : array() ),
			'desktopColumns'      => self::clamp_int( $attributes['desktopColumns'] ?? 3, 1, 6 ),
			'tabletColumns'       => self::clamp_int( $attributes['tabletColumns'] ?? 2, 1, 4 ),
			'mobileColumns'       => self::clamp_int( $attributes['mobileColumns'] ?? 1, 1, 3 ),
			'horizontalGap'       => self::clamp_int( $attributes['horizontalGap'] ?? 24, 0, 96 ),
			'verticalGap'         => self::clamp_int( $attributes['verticalGap'] ?? 24, 0, 96 ),
			'imageSize'           => $image_size,
			'imageAspectRatio'    => $image_aspect_ratio,
			'imageObjectFit'      => $image_object_fit,
			'imageObjectPosition' => $image_position,
			'imageBorderRadius'   => self::clamp_int( $image_radius, 0, 1000 ),
			'innerElementGap'     => self::clamp_int( $attributes['innerElementGap'] ?? 12, 0, 48 ),
			'titleFontSize'       => self::clamp_float( $title_font_size, 10, 72 ),
			'metaFontSize'        => self::clamp_float( $meta_font_size, 10, 32 ),
			'excerptFontSize'     => self::clamp_float( $excerpt_font_size, 10, 40 ),
			'readMoreFontSize'    => self::clamp_float( $read_more_size, 10, 40 ),
			'textLineHeight'      => self::clamp_float( $text_line_height, 1, 2.5 ),
			'elements'            => self::normalize_elements( $attributes['elements'] ?? array() ),
			'metaFields'          => self::normalize_meta_fields( $attributes['metaFields'] ?? array( 'date', 'author', 'categories' ) ),
			'readMoreLabel'       => '' !== $read_more_label ? $read_more_label : __( 'Read more', 'vova-posts-grid' ),
			'readMoreStyle'       => $read_more_style,
			'readMorePadding'     => self::clamp_float( $button_padding, 0, 80 ),
			'fullCardClickable'   => array_key_exists( 'fullCardClickable', $attributes ) ? (bool) $attributes['fullCardClickable'] : false,
			'openLinksInNewTab'   => array_key_exists( 'openLinksInNewTab', $attributes ) ? (bool) $attributes['openLinksInNewTab'] : false,
			'excerptLength'       => self::clamp_int( $excerpt_length, 5, 80 ),
			'emptyStateText'      => '' !== $empty_state_text ? $empty_state_text : __( 'No posts found.', 'vova-posts-grid' ),
			'loadingSkeleton'     => array_key_exists( 'loadingSkeleton', $attributes ) ? (bool) $attributes['loadingSkeleton'] : false,
			'contextPostId'       => isset( $attributes['contextPostId'] ) ? absint( $attributes['contextPostId'] ) : 0,
			'paginationType'      => $pagination_type,
			'paginationAlignment' => $pagination_align,
			'accentColor'         => self::is_css_color_value( $accent_color ) ? $accent_color : self::DEFAULT_ACCENT_COLOR,
			'metaColor'           => self::is_css_color_value( $meta_color ) ? $meta_color : '',
			'excerptColor'        => self::is_css_color_value( $excerpt_color ) ? $excerpt_color : '',
		);
	}

	/**
	 * Normalizes query settings.
	 *
	 * @param array<string, mixed> $query Raw query settings.
	 * @return array<string, mixed>
	 */
	private static function normalize_query( array $query ): array {
		$query_type     = isset( $query['queryType'] ) && 'specific' === sanitize_key( (string) $query['queryType'] ) ? 'specific' : 'dynamic';
		$post_type      = isset( $query['postType'] ) ? sanitize_key( (string) $query['postType'] ) : 'post';
		$taxonomy       = isset( $query['taxonomy'] ) ? sanitize_key( (string) $query['taxonomy'] ) : '';
		$keyword        = isset( $query['keyword'] ) ? sanitize_text_field( (string) $query['keyword'] ) : '';
		$author         = isset( $query['author'] ) ? absint( $query['author'] ) : 0;
		$posts_per_page = isset( $query['postsPerPage'] ) ? (int) $query['postsPerPage'] : 6;
		$order          = isset( $query['order'] ) ? strtoupper( sanitize_key( (string) $query['order'] ) ) : 'DESC';
		$orderby        = isset( $query['orderby'] ) ? sanitize_key( (string) $query['orderby'] ) : 'date';

		if ( ! self::is_public_post_type( $post_type ) ) {
			$post_type = 'post';
		}

		if ( ! self::is_public_taxonomy( $taxonomy ) ) {
			$taxonomy = '';
		}

		if ( ! in_array( $order, array( 'ASC', 'DESC' ), true ) ) {
			$order = 'DESC';
		}

		if ( ! in_array( $orderby, array( 'date', 'title', 'modified', 'menu_order', 'comment_count', 'rand', 'post__in' ), true ) ) {
			$orderby = 'date';
		}

		return array(
			'queryType'          => $query_type,
			'postType'           => $post_type,
			'taxonomy'           => $taxonomy,
			'terms'              => self::normalize_ids( $query['terms'] ?? array() ),
			'keyword'            => $keyword,
			'author'             => $author,
			'includePosts'       => self::normalize_post_selection( $query['includePosts'] ?? array() ),
			'excludePosts'       => self::normalize_post_selection( $query['excludePosts'] ?? array() ),
			'postsPerPage'       => self::clamp_int( $posts_per_page, 1, 100 ),
			'order'              => $order,
			'orderby'            => $orderby,
			'ignoreSticky'       => array_key_exists( 'ignoreSticky', $query ) ? (bool) $query['ignoreSticky'] : true,
			'excludeCurrentPost' => array_key_exists( 'excludeCurrentPost', $query ) ? (bool) $query['excludeCurrentPost'] : false,
			'hasFeaturedImage'   => array_key_exists( 'hasFeaturedImage', $query ) ? (bool) $query['hasFeaturedImage'] : false,
			'dateRange'          => self::normalize_date_range( $query['dateRange'] ?? array() ),
			'metaFilter'         => self::normalize_meta_filter( $query['metaFilter'] ?? array() ),
			'posts'              => self::normalize_post_selection( $query['posts'] ?? array() ),
		);
	}

	/**
	 * Normalizes a custom field filter.
	 *
	 * @param mixed $filter Raw custom field filter settings.
	 * @return array{enabled:bool,key:string,compare:string,value:string,type:string}
	 */
	private static function normalize_meta_filter( $filter ): array {
		$source  = is_array( $filter ) ? $filter : array();
		$key     = self::sanitize_meta_filter_string( $source['key'] ?? '' );
		$compare = isset( $source['compare'] ) ? sanitize_key( (string) $source['compare'] ) : 'exists';
		$type    = isset( $source['type'] ) ? sanitize_key( (string) $source['type'] ) : 'text';

		if ( ! in_array( $compare, array( 'exists', 'not_exists', 'equals', 'not_equals', 'contains', 'not_contains' ), true ) ) {
			$compare = 'exists';
		}

		if ( ! in_array( $type, array( 'text', 'number', 'date', 'boolean' ), true ) ) {
			$type = 'text';
		}

		return array(
			'enabled' => array_key_exists( 'enabled', $source ) ? (bool) $source['enabled'] : false,
			'key'     => $key,
			'compare' => $compare,
			'value'   => self::normalize_meta_filter_value( $source['value'] ?? '', $type ),
			'type'    => $type,
		);
	}

	/**
	 * Normalizes a custom field filter value.
	 *
	 * @param mixed  $value Raw value.
	 * @param string $type  Field type.
	 * @return string
	 */
	private static function normalize_meta_filter_value( $value, string $type ): string {
		if ( 'boolean' === $type ) {
			if ( is_bool( $value ) ) {
				return $value ? '1' : '0';
			}

			$normalized = strtolower( self::sanitize_meta_filter_string( $value ) );

			return in_array( $normalized, array( '0', 'false', 'no', 'off' ), true ) ? '0' : '1';
		}

		if ( 'number' === $type ) {
			$normalized = self::sanitize_meta_filter_string( $value );

			return is_numeric( $normalized ) ? $normalized : '';
		}

		if ( 'date' === $type ) {
			return self::normalize_date_value( $value );
		}

		return self::sanitize_meta_filter_string( $value );
	}

	/**
	 * Sanitizes a custom field filter string.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function sanitize_meta_filter_string( $value ): string {
		if ( is_bool( $value ) ) {
			return $value ? '1' : '0';
		}

		if ( ! is_scalar( $value ) ) {
			return '';
		}

		return trim( sanitize_text_field( (string) $value ) );
	}

	/**
	 * Normalizes date range settings.
	 *
	 * @param mixed $date_range Raw date range settings.
	 * @return array{mode:string,after:string,before:string}
	 */
	private static function normalize_date_range( $date_range ): array {
		$source = is_array( $date_range ) ? $date_range : array();
		$mode   = isset( $source['mode'] ) ? sanitize_key( (string) $source['mode'] ) : 'none';

		if ( ! in_array( $mode, array( 'none', 'last7', 'last30', 'last90', 'custom' ), true ) ) {
			$mode = 'none';
		}

		return array(
			'mode'   => $mode,
			'after'  => self::normalize_date_value( $source['after'] ?? '' ),
			'before' => self::normalize_date_value( $source['before'] ?? '' ),
		);
	}

	/**
	 * Normalizes a date input value.
	 *
	 * @param mixed $value Raw date value.
	 * @return string Date in Y-m-d format, or an empty string.
	 */
	private static function normalize_date_value( $value ): string {
		$date = sanitize_text_field( (string) $value );

		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			return '';
		}

		$parts = array_map( 'absint', explode( '-', $date ) );

		return checkdate( $parts[1], $parts[2], $parts[0] ) ? $date : '';
	}

	/**
	 * Normalizes post card element settings.
	 *
	 * @param mixed $elements Raw elements.
	 * @return array<int, array{id:string,visible:bool}>
	 */
	private static function normalize_elements( $elements ): array {
		$defaults = array(
			array(
				'id'      => 'image',
				'visible' => true,
			),
			array(
				'id'      => 'title',
				'visible' => true,
			),
			array(
				'id'      => 'meta',
				'visible' => true,
			),
			array(
				'id'      => 'excerpt',
				'visible' => true,
			),
			array(
				'id'      => 'readMore',
				'visible' => true,
			),
		);
		$allowed  = wp_list_pluck( $defaults, 'id' );
		$source   = is_array( $elements ) && $elements ? $elements : $defaults;
		$next     = array();
		$seen     = array();

		foreach ( $source as $element ) {
			if ( ! is_array( $element ) || empty( $element['id'] ) ) {
				continue;
			}

			$id = sanitize_key( (string) $element['id'] );
			if ( 'readmore' === $id ) {
				$id = 'readMore';
			}

			if ( ! in_array( $id, $allowed, true ) || isset( $seen[ $id ] ) ) {
				continue;
			}

			$seen[ $id ] = true;
			$next[]      = array(
				'id'      => $id,
				'visible' => array_key_exists( 'visible', $element ) ? (bool) $element['visible'] : true,
			);
		}

		foreach ( $defaults as $default ) {
			if ( ! isset( $seen[ $default['id'] ] ) ) {
				$next[] = $default;
			}
		}

		return $next;
	}

	/**
	 * Normalizes meta fields.
	 *
	 * @param mixed $fields Raw fields.
	 * @return array<int, string>
	 */
	private static function normalize_meta_fields( $fields ): array {
		$source = is_array( $fields ) ? $fields : array( 'date', 'author', 'categories' );
		$next   = array();
		$seen   = array();

		foreach ( $source as $field ) {
			$field_id = self::normalize_meta_field_id( $field );

			if ( '' !== $field_id && ! isset( $seen[ $field_id ] ) ) {
				$seen[ $field_id ] = true;
				$next[]            = $field_id;
			}
		}

		return $next;
	}

	/**
	 * Normalizes a single meta field identifier.
	 *
	 * @param mixed $field Raw field.
	 * @return string Normalized field ID, or an empty string.
	 */
	private static function normalize_meta_field_id( $field ): string {
		if ( is_array( $field ) ) {
			$field = $field['id'] ?? $field['value'] ?? '';
		}

		if ( ! is_string( $field ) && ! is_numeric( $field ) ) {
			return '';
		}

		$field   = trim( (string) $field );
		$allowed = array( 'date', 'author', 'categories', 'comments', 'modifiedDate', 'readingTime' );

		if ( in_array( $field, $allowed, true ) ) {
			return $field;
		}

		if ( 0 === strpos( $field, self::META_TAXONOMY_PREFIX ) ) {
			$taxonomy = sanitize_key( substr( $field, strlen( self::META_TAXONOMY_PREFIX ) ) );

			if ( '' !== $taxonomy && self::is_public_taxonomy( $taxonomy ) ) {
				return self::META_TAXONOMY_PREFIX . $taxonomy;
			}
		}

		return '';
	}

	/**
	 * Renders grid content without the outer block wrapper.
	 *
	 * @param array<string, mixed> $settings Normalized settings.
	 * @param int                  $page     Current page.
	 * @return array{html:string,page:int,max_num_pages:int,found_posts:int}
	 */
	private static function render_content( array $settings, int $page ): array {
		$query_args = self::build_query_args( $settings, $page );

		if ( empty( $query_args ) ) {
			return self::empty_result( $settings['emptyStateText'] );
		}

		$posts_query = new WP_Query( $query_args );
		$page        = max( 1, min( $page, max( 1, (int) $posts_query->max_num_pages ) ) );

		ob_start();

		if ( $posts_query->have_posts() ) :
			?>
			<div class="vovapg-posts-grid__grid">
				<?php
				while ( $posts_query->have_posts() ) :
					$posts_query->the_post();
					self::render_post_card( get_post(), $settings );
				endwhile;
				?>
			</div>
			<?php
			echo self::render_pagination( $settings, $page, (int) $posts_query->max_num_pages ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		else :
			?>
			<div class="vovapg-posts-grid__empty"><?php echo esc_html( $settings['emptyStateText'] ); ?></div>
			<?php
		endif;

		wp_reset_postdata();

		return array(
			'html'          => (string) ob_get_clean(),
			'page'          => $page,
			'max_num_pages' => (int) $posts_query->max_num_pages,
			'found_posts'   => (int) $posts_query->found_posts,
		);
	}

	/**
	 * Returns an empty render result.
	 *
	 * @param string $message Empty message.
	 * @return array{html:string,page:int,max_num_pages:int,found_posts:int}
	 */
	private static function empty_result( string $message ): array {
		return array(
			'html'          => '<div class="vovapg-posts-grid__empty">' . esc_html( $message ) . '</div>',
			'page'          => 1,
			'max_num_pages' => 0,
			'found_posts'   => 0,
		);
	}

	/**
	 * Builds WP_Query arguments.
	 *
	 * @param array<string, mixed> $settings Normalized settings.
	 * @param int                  $page     Current page.
	 * @return array<string, mixed>
	 */
	private static function build_query_args( array $settings, int $page ): array {
		$query       = $settings['query'];
		$exclude_ids = self::get_selected_post_ids( $query['excludePosts'] );

		if ( 'specific' === $query['queryType'] ) {
			$post_ids = array_values( array_diff( self::get_selected_post_ids( $query['posts'] ), $exclude_ids ) );

			if ( empty( $post_ids ) ) {
				return array();
			}

			$args = array(
				'post_type'           => self::get_selected_post_types( $query['posts'] ),
				'post_status'         => 'publish',
				'post__in'            => $post_ids,
				'orderby'             => 'post__in',
				'posts_per_page'      => $query['postsPerPage'],
				'paged'               => max( 1, $page ),
				'ignore_sticky_posts' => true,
			);

			return $args;
		}

		if ( ! empty( $query['excludeCurrentPost'] ) && ! empty( $settings['contextPostId'] ) ) {
			$exclude_ids[] = absint( $settings['contextPostId'] );
			$exclude_ids   = array_values( array_unique( array_filter( $exclude_ids ) ) );
		}

		$include_ids = array_values( array_diff( self::get_selected_post_ids( $query['includePosts'] ), $exclude_ids ) );

		if ( ! empty( $query['includePosts'] ) && empty( $include_ids ) ) {
			return array();
		}

		$orderby = $query['orderby'];
		if ( 'post__in' === $orderby && empty( $include_ids ) ) {
			$orderby = 'date';
		}

		$args = array(
			'post_type'           => $query['postType'],
			'post_status'         => 'publish',
			'posts_per_page'      => $query['postsPerPage'],
			'paged'               => max( 1, $page ),
			'order'               => $query['order'],
			'orderby'             => $orderby,
			'ignore_sticky_posts' => (bool) $query['ignoreSticky'],
		);

		if ( '' !== $query['keyword'] ) {
			$args['s'] = $query['keyword'];
		}

		if ( $query['author'] > 0 ) {
			$args['author'] = $query['author'];
		}

		if ( ! empty( $include_ids ) ) {
			$args['post__in'] = $include_ids;
		}

		if ( ! empty( $exclude_ids ) ) {
			// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_post__not_in -- Exclusions are explicitly configured by the block user and must preserve query pagination.
			$args['post__not_in'] = $exclude_ids;
		}

		if ( self::is_valid_tax_query( $query['postType'], $query['taxonomy'], $query['terms'] ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- User-configured taxonomy filtering is a core block feature.
			$args['tax_query'] = array(
				array(
					'taxonomy' => $query['taxonomy'],
					'field'    => 'term_id',
					'terms'    => $query['terms'],
				),
			);
		}

		self::apply_featured_image_query( $args, $query );
		self::apply_meta_filter_query( $args, $query );
		self::apply_date_query( $args, $query );

		return $args;
	}

	/**
	 * Applies the featured image filter to query args.
	 *
	 * @param array<string, mixed> $args  WP_Query args.
	 * @param array<string, mixed> $query Normalized query settings.
	 * @return void
	 */
	private static function apply_featured_image_query( array &$args, array $query ): void {
		if ( empty( $query['hasFeaturedImage'] ) ) {
			return;
		}

		$meta_query   = isset( $args['meta_query'] ) && is_array( $args['meta_query'] ) ? $args['meta_query'] : array();
		$meta_query[] = array(
			'key'     => '_thumbnail_id',
			'compare' => 'EXISTS',
		);

		// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- User-configured featured image filtering is expected for this block.
		$args['meta_query'] = $meta_query;
	}

	/**
	 * Applies the custom field filter to query args.
	 *
	 * @param array<string, mixed> $args  WP_Query args.
	 * @param array<string, mixed> $query Normalized query settings.
	 * @return void
	 */
	private static function apply_meta_filter_query( array &$args, array $query ): void {
		$meta_clause = self::get_meta_filter_query_clause( $query['metaFilter'] );

		if ( empty( $meta_clause ) ) {
			return;
		}

		$meta_query   = isset( $args['meta_query'] ) && is_array( $args['meta_query'] ) ? $args['meta_query'] : array();
		$meta_query[] = $meta_clause;

		// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- User-configured custom field filtering is expected for this block.
		$args['meta_query'] = $meta_query;
	}

	/**
	 * Returns a WP_Query meta_query clause from the custom field filter.
	 *
	 * @param array<string, mixed> $filter Normalized custom field filter.
	 * @return array<string, string>
	 */
	private static function get_meta_filter_query_clause( array $filter ): array {
		if ( empty( $filter['enabled'] ) || '' === $filter['key'] ) {
			return array();
		}

		$compare = self::get_meta_filter_query_compare( $filter['compare'] );

		if ( '' === $compare ) {
			return array();
		}

		$clause = array(
			'key'     => $filter['key'],
			'compare' => $compare,
		);

		if ( in_array( $filter['compare'], array( 'exists', 'not_exists' ), true ) ) {
			return $clause;
		}

		if ( '' === $filter['value'] ) {
			return array();
		}

		$clause['value'] = $filter['value'];
		$clause['type']  = self::get_meta_filter_query_type( $filter['type'] );

		return $clause;
	}

	/**
	 * Returns a WP_Query compare operator for a custom field filter.
	 *
	 * @param string $compare Normalized compare setting.
	 * @return string
	 */
	private static function get_meta_filter_query_compare( string $compare ): string {
		$map = array(
			'exists'       => 'EXISTS',
			'not_exists'   => 'NOT EXISTS',
			'equals'       => '=',
			'not_equals'   => '!=',
			'contains'     => 'LIKE',
			'not_contains' => 'NOT LIKE',
		);

		return $map[ $compare ] ?? '';
	}

	/**
	 * Returns a WP_Query type cast for a custom field filter.
	 *
	 * @param string $type Normalized type setting.
	 * @return string
	 */
	private static function get_meta_filter_query_type( string $type ): string {
		$map = array(
			'text'    => 'CHAR',
			'number'  => 'NUMERIC',
			'date'    => 'DATE',
			'boolean' => 'NUMERIC',
		);

		return $map[ $type ] ?? 'CHAR';
	}

	/**
	 * Applies the date range filter to query args.
	 *
	 * @param array<string, mixed> $args  WP_Query args.
	 * @param array<string, mixed> $query Normalized query settings.
	 * @return void
	 */
	private static function apply_date_query( array &$args, array $query ): void {
		$date_query = self::get_date_query( $query['dateRange'] );

		if ( empty( $date_query ) ) {
			return;
		}

		$args['date_query'] = array( $date_query );
	}

	/**
	 * Returns a WP_Query date_query clause.
	 *
	 * @param array<string, string> $date_range Normalized date range settings.
	 * @return array<string, mixed>
	 */
	private static function get_date_query( array $date_range ): array {
		$mode = isset( $date_range['mode'] ) ? $date_range['mode'] : 'none';

		if ( 'last7' === $mode ) {
			return array(
				'after'     => self::get_relative_date( 7 ),
				'inclusive' => true,
			);
		}

		if ( 'last30' === $mode ) {
			return array(
				'after'     => self::get_relative_date( 30 ),
				'inclusive' => true,
			);
		}

		if ( 'last90' === $mode ) {
			return array(
				'after'     => self::get_relative_date( 90 ),
				'inclusive' => true,
			);
		}

		if ( 'custom' !== $mode ) {
			return array();
		}

		$query = array( 'inclusive' => true );

		if ( ! empty( $date_range['after'] ) ) {
			$query['after'] = $date_range['after'];
		}

		if ( ! empty( $date_range['before'] ) ) {
			$query['before'] = $date_range['before'];
		}

		return count( $query ) > 1 ? $query : array();
	}

	/**
	 * Returns a local date string relative to now.
	 *
	 * @param int $days Days to subtract.
	 * @return string
	 */
	private static function get_relative_date( int $days ): string {
		return wp_date( 'Y-m-d', time() - ( $days * DAY_IN_SECONDS ) );
	}

	/**
	 * Renders a single post card.
	 *
	 * @param WP_Post|null         $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_post_card( ?WP_Post $post, array $settings ): void {
		if ( ! $post ) {
			return;
		}

		?>
		<div class="vovapg-posts-grid__card">
			<?php
			if ( ! empty( $settings['fullCardClickable'] ) ) {
				self::render_card_overlay_link( $post, $settings );
			}

			foreach ( $settings['elements'] as $element ) {
				if ( empty( $element['visible'] ) ) {
					continue;
				}

				switch ( $element['id'] ) {
					case 'image':
						self::render_post_image( $post, $settings );
						break;
					case 'title':
						self::render_post_title( $post, $settings );
						break;
					case 'meta':
						self::render_post_meta( $post, $settings );
						break;
					case 'excerpt':
						self::render_post_excerpt( $post, $settings );
						break;
					case 'readMore':
						self::render_read_more( $post, $settings );
						break;
				}
			}
			?>
		</div>
		<?php
	}

	/**
	 * Renders a post thumbnail.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_post_image( WP_Post $post, array $settings ): void {
		if ( ! has_post_thumbnail( $post ) ) {
			return;
		}

		$image = get_the_post_thumbnail(
			$post,
			$settings['imageSize'],
			array(
				'class'   => 'vovapg-posts-grid__image',
				'loading' => 'lazy',
			)
		);

		if ( ! $image ) {
			return;
		}

		?>
		<a <?php echo self::get_post_link_attributes( $post, $settings, 'vovapg-posts-grid__image-link' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo $image; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</a>
		<?php
	}

	/**
	 * Renders a post title.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_post_title( WP_Post $post, array $settings ): void {
		?>
		<a <?php echo self::get_post_link_attributes( $post, $settings, 'vovapg-posts-grid__title' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo esc_html( get_the_title( $post ) ); ?>
		</a>
		<?php
	}

	/**
	 * Renders selected post metadata.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_post_meta( WP_Post $post, array $settings ): void {
		$items = array();

		foreach ( $settings['metaFields'] as $field ) {
			$item = self::get_post_meta_item_html( $post, $field );

			if ( '' !== $item ) {
				$items[] = $item;
			}
		}

		if ( empty( $items ) ) {
			return;
		}

		?>
		<div class="vovapg-posts-grid__meta">
			<?php echo implode( '<span class="vovapg-posts-grid__meta-separator" aria-hidden="true">/</span>', $items ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
		<?php
	}

	/**
	 * Returns a single post meta item HTML fragment.
	 *
	 * @param WP_Post $post  Post object.
	 * @param string  $field Meta field ID.
	 * @return string Meta item HTML, or an empty string.
	 */
	private static function get_post_meta_item_html( WP_Post $post, string $field ): string {
		if ( 'date' === $field ) {
			return sprintf(
				'<time class="vovapg-posts-grid__meta-item" datetime="%1$s">%2$s</time>',
				esc_attr( get_the_date( DATE_W3C, $post ) ),
				esc_html( get_the_date( '', $post ) )
			);
		}

		if ( 'author' === $field ) {
			return sprintf(
				'<span class="vovapg-posts-grid__meta-item">%1$s</span>',
				esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) )
			);
		}

		if ( 'categories' === $field ) {
			if ( ! taxonomy_exists( 'category' ) ) {
				return '';
			}

			$categories = get_the_category( $post->ID );

			if ( empty( $categories ) ) {
				return '';
			}

			return sprintf(
				'<span class="vovapg-posts-grid__meta-item">%1$s</span>',
				esc_html( implode( ', ', wp_list_pluck( $categories, 'name' ) ) )
			);
		}

		if ( 'comments' === $field ) {
			$comments_number = absint( get_comments_number( $post ) );
			$label           = sprintf(
				/* translators: %s: number of comments. */
				_n( '%s comment', '%s comments', $comments_number, 'vova-posts-grid' ),
				number_format_i18n( $comments_number )
			);

			return sprintf(
				'<span class="vovapg-posts-grid__meta-item">%1$s</span>',
				esc_html( $label )
			);
		}

		if ( 'modifiedDate' === $field ) {
			$modified_date = get_the_modified_date( '', $post );

			if ( '' === $modified_date ) {
				return '';
			}

			return sprintf(
				'<time class="vovapg-posts-grid__meta-item" datetime="%1$s">%2$s</time>',
				esc_attr( get_the_modified_date( DATE_W3C, $post ) ),
				esc_html( $modified_date )
			);
		}

		if ( 'readingTime' === $field ) {
			$minutes = self::get_post_reading_time_minutes( $post );
			$label   = sprintf(
				/* translators: %s: number of minutes. */
				_n( '%s min read', '%s mins read', $minutes, 'vova-posts-grid' ),
				number_format_i18n( $minutes )
			);

			return sprintf(
				'<span class="vovapg-posts-grid__meta-item">%1$s</span>',
				esc_html( $label )
			);
		}

		if ( self::is_taxonomy_meta_field( $field ) ) {
			$taxonomy = substr( $field, strlen( self::META_TAXONOMY_PREFIX ) );

			return self::get_post_taxonomy_badges_meta_html( $post, $taxonomy );
		}

		return '';
	}

	/**
	 * Returns the estimated reading time in minutes.
	 *
	 * @param WP_Post $post Post object.
	 * @return int
	 */
	private static function get_post_reading_time_minutes( WP_Post $post ): int {
		$content = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
		$matches = array();

		preg_match_all( '/[\p{L}\p{N}\']+/u', $content, $matches );

		$word_count = isset( $matches[0] ) ? count( $matches[0] ) : 0;

		return max( 1, (int) ceil( $word_count / self::READING_TIME_WORDS_PER_MINUTE ) );
	}

	/**
	 * Returns taxonomy term badges meta HTML.
	 *
	 * @param WP_Post $post     Post object.
	 * @param string  $taxonomy Taxonomy slug.
	 * @return string
	 */
	private static function get_post_taxonomy_badges_meta_html( WP_Post $post, string $taxonomy ): string {
		if ( '' === $taxonomy || ! self::is_public_taxonomy( $taxonomy ) ) {
			return '';
		}

		$post_taxonomies = get_object_taxonomies( $post->post_type, 'names' );
		if ( ! in_array( $taxonomy, $post_taxonomies, true ) ) {
			return '';
		}

		$terms = get_the_terms( $post, $taxonomy );
		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return '';
		}

		$badges = array();
		foreach ( $terms as $term ) {
			$badges[] = sprintf(
				'<span class="vovapg-posts-grid__taxonomy-badge">%1$s</span>',
				esc_html( $term->name )
			);
		}

		return sprintf(
			'<span class="vovapg-posts-grid__meta-item vovapg-posts-grid__meta-item--taxonomy">%1$s</span>',
			implode( '', $badges )
		);
	}

	/**
	 * Checks whether a meta field ID points to a taxonomy badge group.
	 *
	 * @param string $field Meta field ID.
	 * @return bool
	 */
	private static function is_taxonomy_meta_field( string $field ): bool {
		return 0 === strpos( $field, self::META_TAXONOMY_PREFIX );
	}

	/**
	 * Renders a post excerpt.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_post_excerpt( WP_Post $post, array $settings ): void {
		$excerpt = wp_trim_words( wp_strip_all_tags( self::get_post_excerpt_source( $post ) ), $settings['excerptLength'] );

		if ( '' === trim( $excerpt ) ) {
			return;
		}

		?>
		<div class="vovapg-posts-grid__excerpt vovapg-card__text"><?php echo esc_html( $excerpt ); ?></div>
		<?php
	}

	/**
	 * Returns untrimmed text for block-controlled excerpt generation.
	 *
	 * @param WP_Post $post Post object.
	 * @return string Excerpt source text.
	 */
	private static function get_post_excerpt_source( WP_Post $post ): string {
		if ( '' !== trim( (string) $post->post_excerpt ) || post_password_required( $post ) ) {
			return get_the_excerpt( $post );
		}

		$source = (string) $post->post_content;
		$source = strip_shortcodes( $source );
		$source = excerpt_remove_blocks( $source );
		$source = apply_filters( 'the_content', $source ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core content hook.

		return str_replace( ']]>', ']]&gt;', $source );
	}

	/**
	 * Renders a read more link.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_read_more( WP_Post $post, array $settings ): void {
		$classes = 'button' === $settings['readMoreStyle'] ? 'vovapg-posts-grid__read-more vovapg-button' : 'vovapg-posts-grid__read-more vovapg-posts-grid__read-more--text-link';

		?>
		<a <?php echo self::get_post_link_attributes( $post, $settings, $classes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<span><?php echo esc_html( $settings['readMoreLabel'] ); ?></span>
		</a>
		<?php
	}

	/**
	 * Renders the full-card overlay link.
	 *
	 * @param WP_Post              $post     Post object.
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return void
	 */
	private static function render_card_overlay_link( WP_Post $post, array $settings ): void {
		$label = sprintf(
			/* translators: %s: post title. */
			__( 'Open %s', 'vova-posts-grid' ),
			get_the_title( $post )
		);

		?>
		<a <?php echo self::get_post_link_attributes( $post, $settings, 'vovapg-posts-grid__card-link', $label ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>></a>
		<?php
	}

	/**
	 * Returns escaped post link attributes.
	 *
	 * @param WP_Post              $post       Post object.
	 * @param array<string, mixed> $settings   Normalized settings.
	 * @param string               $class_name Link class attribute.
	 * @param string               $aria_label Optional aria-label.
	 * @return string
	 */
	private static function get_post_link_attributes( WP_Post $post, array $settings, string $class_name, string $aria_label = '' ): string {
		$attributes = array(
			'class' => $class_name,
			'href'  => get_permalink( $post ),
		);

		if ( ! empty( $settings['fullCardClickable'] ) && 'vovapg-posts-grid__card-link' !== $class_name ) {
			$attributes['tabindex']    = '-1';
			$attributes['aria-hidden'] = 'true';
		}

		if ( ! empty( $settings['openLinksInNewTab'] ) ) {
			$attributes['target'] = '_blank';
			$attributes['rel']    = 'noopener noreferrer';
		}

		if ( '' !== $aria_label ) {
			$attributes['aria-label'] = $aria_label;
		}

		$output = array();

		foreach ( $attributes as $name => $value ) {
			$escaped_value = 'href' === $name ? esc_url( (string) $value ) : esc_attr( (string) $value );
			$output[]      = sprintf( '%s="%s"', esc_attr( $name ), $escaped_value );
		}

		return implode( ' ', $output );
	}

	/**
	 * Renders pagination controls.
	 *
	 * @param array<string, mixed> $settings      Normalized settings.
	 * @param int                  $current_page  Current page.
	 * @param int                  $max_num_pages Max pages.
	 * @return string Pagination HTML.
	 */
	private static function render_pagination( array $settings, int $current_page, int $max_num_pages ): string {
		if ( 'none' === $settings['paginationType'] || $max_num_pages <= 1 ) {
			return '';
		}

		$show_numbers   = in_array( $settings['paginationType'], array( 'numbers', 'numbersPrevNext' ), true );
		$show_prev_next = in_array( $settings['paginationType'], array( 'prevNext', 'numbersPrevNext' ), true );
		$pages          = self::get_pagination_pages( $current_page, $max_num_pages );

		ob_start();
		?>
		<nav class="vovapg-posts-grid__pagination" aria-label="<?php esc_attr_e( 'Posts pagination', 'vova-posts-grid' ); ?>">
			<?php if ( $show_prev_next ) : ?>
				<button class="vovapg-posts-grid__page-button vovapg-posts-grid__page-button--prev" type="button" data-vovapg-page="<?php echo esc_attr( (string) max( 1, $current_page - 1 ) ); ?>"<?php disabled( 1 === $current_page ); ?>>
					<?php esc_html_e( 'Previous', 'vova-posts-grid' ); ?>
				</button>
			<?php endif; ?>
			<?php if ( $show_numbers ) : ?>
				<?php foreach ( $pages as $page ) : ?>
					<?php if ( 'ellipsis' === $page ) : ?>
						<span class="vovapg-posts-grid__page-ellipsis" aria-hidden="true">...</span>
					<?php else : ?>
						<button class="vovapg-posts-grid__page-button" type="button" data-vovapg-page="<?php echo esc_attr( (string) $page ); ?>"<?php echo (int) $page === $current_page ? ' aria-current="page"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
							<?php echo esc_html( (string) $page ); ?>
						</button>
					<?php endif; ?>
				<?php endforeach; ?>
			<?php endif; ?>
			<?php if ( $show_prev_next ) : ?>
				<button class="vovapg-posts-grid__page-button vovapg-posts-grid__page-button--next" type="button" data-vovapg-page="<?php echo esc_attr( (string) min( $max_num_pages, $current_page + 1 ) ); ?>"<?php disabled( $current_page === $max_num_pages ); ?>>
					<?php esc_html_e( 'Next', 'vova-posts-grid' ); ?>
				</button>
			<?php endif; ?>
		</nav>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Returns compact pagination page markers.
	 *
	 * @param int $current_page  Current page.
	 * @param int $max_num_pages Max pages.
	 * @return array<int, int|string>
	 */
	private static function get_pagination_pages( int $current_page, int $max_num_pages ): array {
		if ( $max_num_pages <= 7 ) {
			return range( 1, $max_num_pages );
		}

		$pages = array( 1 );
		$start = max( 2, $current_page - 2 );
		$end   = min( $max_num_pages - 1, $current_page + 2 );

		if ( $start > 2 ) {
			$pages[] = 'ellipsis';
		}

		for ( $page = $start; $page <= $end; $page++ ) {
			$pages[] = $page;
		}

		if ( $end < $max_num_pages - 1 ) {
			$pages[] = 'ellipsis';
		}

		$pages[] = $max_num_pages;

		return $pages;
	}

	/**
	 * Returns inline CSS variables for the wrapper.
	 *
	 * @param array<string, mixed> $settings Normalized settings.
	 * @return string Inline style value.
	 */
	private static function get_wrapper_style( array $settings ): string {
		$style  = '--vovapg-posts-grid-columns-desktop:' . (int) $settings['desktopColumns'] . ';';
		$style .= '--vovapg-posts-grid-columns-tablet:' . (int) $settings['tabletColumns'] . ';';
		$style .= '--vovapg-posts-grid-columns-mobile:' . (int) $settings['mobileColumns'] . ';';
		$style .= '--vovapg-posts-grid-horizontal-gap:' . (int) $settings['horizontalGap'] . 'px;';
		$style .= '--vovapg-posts-grid-vertical-gap:' . (int) $settings['verticalGap'] . 'px;';
		$style .= '--vovapg-posts-grid-image-object-fit:' . $settings['imageObjectFit'] . ';';
		$style .= '--vovapg-posts-grid-image-object-position:' . $settings['imageObjectPosition'] . ';';
		$style .= '--vovapg-posts-grid-image-border-radius:' . (int) $settings['imageBorderRadius'] . 'px;';
		$style .= '--vovapg-posts-grid-inner-element-gap:' . (int) $settings['innerElementGap'] . 'px;';
		$style .= '--vovapg-posts-grid-title-font-size:' . (float) $settings['titleFontSize'] . 'px;';
		$style .= '--vovapg-posts-grid-meta-font-size:' . (float) $settings['metaFontSize'] . 'px;';
		$style .= '--vovapg-posts-grid-excerpt-font-size:' . (float) $settings['excerptFontSize'] . 'px;';
		$style .= '--vovapg-posts-grid-read-more-font-size:' . (float) $settings['readMoreFontSize'] . 'px;';
		$style .= '--vovapg-posts-grid-text-line-height:' . (float) $settings['textLineHeight'] . ';';
		$style .= '--vovapg-posts-grid-read-more-button-padding:' . (float) $settings['readMorePadding'] . 'px ' . round( (float) $settings['readMorePadding'] * self::READ_MORE_BUTTON_PADDING_RATIO, 3 ) . 'px;';
		$style .= '--vovapg-posts-grid-pagination-justify-content:' . self::get_pagination_justify_content( $settings['paginationAlignment'] ) . ';';

		if ( '' !== $settings['accentColor'] ) {
			$style .= '--vovapg-posts-grid-accent-color:' . $settings['accentColor'] . ';';
		}

		if ( '' !== $settings['metaColor'] ) {
			$style .= '--vovapg-posts-grid-meta-color:' . $settings['metaColor'] . ';';
		}

		if ( '' !== $settings['excerptColor'] ) {
			$style .= '--vovapg-posts-grid-excerpt-color:' . $settings['excerptColor'] . ';';
		}

		if ( 'auto' !== $settings['imageAspectRatio'] ) {
			$style .= '--vovapg-posts-grid-image-aspect-ratio:' . str_replace( ':', ' / ', $settings['imageAspectRatio'] ) . ';';
		}

		return $style;
	}

	/**
	 * Returns the flex alignment value for pagination.
	 *
	 * @param string $alignment Pagination alignment setting.
	 * @return string CSS justify-content value.
	 */
	private static function get_pagination_justify_content( string $alignment ): string {
		if ( 'left' === $alignment ) {
			return 'flex-start';
		}

		if ( 'right' === $alignment ) {
			return 'flex-end';
		}

		return 'center';
	}

	/**
	 * Checks whether a value is safe to use as a CSS color.
	 *
	 * @param mixed $value Raw color value.
	 * @return bool
	 */
	private static function is_css_color_value( $value ): bool {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return false;
		}

		if ( preg_match( '/^#[0-9A-Fa-f]{3,8}$/', $value ) ) {
			return true;
		}

		if ( preg_match( '/^(rgb|rgba|hsl|hsla)\([0-9\s,.%+-]+\)$/i', $value ) ) {
			return true;
		}

		if ( preg_match( '/^var\(--[A-Za-z0-9_-]+\)$/', $value ) ) {
			return true;
		}

		return in_array(
			strtolower( $value ),
			array( 'currentcolor', 'transparent', 'inherit', 'initial', 'unset' ),
			true
		);
	}

	/**
	 * Validates a taxonomy query.
	 *
	 * @param string          $post_type Post type.
	 * @param string          $taxonomy  Taxonomy.
	 * @param array<int, int> $terms     Term IDs.
	 * @return bool
	 */
	private static function is_valid_tax_query( string $post_type, string $taxonomy, array $terms ): bool {
		if ( '' === $taxonomy || empty( $terms ) || ! self::is_public_taxonomy( $taxonomy ) ) {
			return false;
		}

		$taxonomies = get_object_taxonomies( $post_type, 'names' );

		return in_array( $taxonomy, $taxonomies, true );
	}

	/**
	 * Checks whether a taxonomy is public.
	 *
	 * @param string $taxonomy Taxonomy.
	 * @return bool
	 */
	private static function is_public_taxonomy( string $taxonomy ): bool {
		$object = get_taxonomy( $taxonomy );

		return $object instanceof WP_Taxonomy && ! empty( $object->public );
	}

	/**
	 * Checks whether a post type is public.
	 *
	 * @param string $post_type Post type.
	 * @return bool
	 */
	private static function is_public_post_type( string $post_type ): bool {
		$object = get_post_type_object( $post_type );

		return $object instanceof WP_Post_Type && ! empty( $object->public );
	}

	/**
	 * Returns the post ID for the current rendering context.
	 *
	 * @return int
	 */
	private static function get_context_post_id(): int {
		$post_id = absint( get_the_ID() );

		if ( ! $post_id && is_singular() ) {
			$post_id = absint( get_queried_object_id() );
		}

		return $post_id;
	}

	/**
	 * Returns selected post IDs.
	 *
	 * @param array<int, array<string, mixed>> $posts Selected posts.
	 * @return array<int, int>
	 */
	private static function get_selected_post_ids( array $posts ): array {
		return array_values(
			array_unique(
				array_filter(
					array_map(
						static function ( array $post ): int {
							return isset( $post['id'] ) ? absint( $post['id'] ) : 0;
						},
						$posts
					)
				)
			)
		);
	}

	/**
	 * Returns selected public post types.
	 *
	 * @param array<int, array<string, mixed>> $posts Selected posts.
	 * @return array<int, string>
	 */
	private static function get_selected_post_types( array $posts ): array {
		$post_types = array();

		foreach ( $posts as $post ) {
			$post_type = isset( $post['subtype'] ) ? sanitize_key( (string) $post['subtype'] ) : 'post';
			if ( self::is_public_post_type( $post_type ) ) {
				$post_types[] = $post_type;
			}
		}

		$post_types = array_values( array_unique( $post_types ) );

		return $post_types ? $post_types : array_values( get_post_types( array( 'public' => true ), 'names' ) );
	}

	/**
	 * Normalizes selected posts.
	 *
	 * @param mixed $posts Raw selected posts.
	 * @return array<int, array{id:int,subtype:string,title:string}>
	 */
	private static function normalize_post_selection( $posts ): array {
		$source = is_array( $posts ) ? $posts : array();
		$next   = array();
		$seen   = array();

		foreach ( $source as $post ) {
			if ( ! is_array( $post ) || empty( $post['id'] ) ) {
				continue;
			}

			$id      = absint( $post['id'] );
			$subtype = isset( $post['subtype'] ) ? sanitize_key( (string) $post['subtype'] ) : 'post';
			$title   = isset( $post['title'] ) ? sanitize_text_field( (string) $post['title'] ) : '';
			$key     = $subtype . ':' . $id;

			if ( ! $id || isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$next[]       = array(
				'id'      => $id,
				'subtype' => self::is_public_post_type( $subtype ) ? $subtype : 'post',
				'title'   => $title,
			);
		}

		return $next;
	}

	/**
	 * Normalizes integer IDs.
	 *
	 * @param mixed $ids Raw IDs.
	 * @return array<int, int>
	 */
	private static function normalize_ids( $ids ): array {
		$source = is_array( $ids ) ? $ids : array();

		return array_values( array_unique( array_filter( array_map( 'absint', $source ) ) ) );
	}

	/**
	 * Clamps an integer value.
	 *
	 * @param mixed $value Raw value.
	 * @param int   $min   Minimum.
	 * @param int   $max   Maximum.
	 * @return int
	 */
	private static function clamp_int( $value, int $min, int $max ): int {
		return max( $min, min( $max, (int) $value ) );
	}

	/**
	 * Clamps a float value.
	 *
	 * @param mixed $value Raw value.
	 * @param float $min   Minimum.
	 * @param float $max   Maximum.
	 * @return float
	 */
	private static function clamp_float( $value, float $min, float $max ): float {
		return max( $min, min( $max, (float) $value ) );
	}
}

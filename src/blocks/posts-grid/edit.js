import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	BaseControl,
	FormTokenField,
	Notice,
	PanelBody,
	RangeControl,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { RawHTML, useEffect, useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import ColorSettingsControl from '../../shared/components/ColorSettingsControl';
import SidebarTabsControl from '../../shared/components/SidebarTabsControl';
import {
	ASPECT_RATIO_OPTIONS,
	DATE_RANGE_OPTIONS,
	DEFAULT_ELEMENTS,
	DEFAULT_META_FIELDS,
	DEFAULT_QUERY,
	ELEMENT_LABELS,
	IMAGE_OBJECT_FIT_OPTIONS,
	IMAGE_OBJECT_POSITION_OPTIONS,
	IMAGE_SIZE_OPTIONS,
	META_FILTER_COMPARE_OPTIONS,
	META_FILTER_TYPE_OPTIONS,
	META_FIELD_OPTIONS,
	ORDER_OPTIONS,
	ORDERBY_OPTIONS,
	PAGINATION_ALIGNMENT_OPTIONS,
	PAGINATION_OPTIONS,
	QUERY_TYPE_OPTIONS,
	READ_MORE_STYLE_OPTIONS,
} from './config';
import {
	MAX_ELEMENTS,
	MAX_EMPTY_STATE_TEXT_LENGTH,
	MAX_KEYWORD_LENGTH,
	MAX_META_FIELDS,
	MAX_OBJECT_SLUG_LENGTH,
	MAX_POSTS_PER_PAGE,
	MAX_POST_TOKEN_TITLE_LENGTH,
	MAX_PRESENTATION_STRING_LENGTH,
	MAX_READ_MORE_LABEL_LENGTH,
	MAX_SELECTED_POSTS,
	MAX_TERMS,
} from './limits';

const COLUMNS_DESKTOP_VAR = '--vovapg-posts-grid-columns-desktop';
const COLUMNS_TABLET_VAR = '--vovapg-posts-grid-columns-tablet';
const COLUMNS_MOBILE_VAR = '--vovapg-posts-grid-columns-mobile';
const HORIZONTAL_GAP_VAR = '--vovapg-posts-grid-horizontal-gap';
const VERTICAL_GAP_VAR = '--vovapg-posts-grid-vertical-gap';
const IMAGE_ASPECT_RATIO_VAR = '--vovapg-posts-grid-image-aspect-ratio';
const IMAGE_OBJECT_FIT_VAR = '--vovapg-posts-grid-image-object-fit';
const IMAGE_OBJECT_POSITION_VAR = '--vovapg-posts-grid-image-object-position';
const IMAGE_BORDER_RADIUS_VAR = '--vovapg-posts-grid-image-border-radius';
const INNER_ELEMENT_GAP_VAR = '--vovapg-posts-grid-inner-element-gap';
const TITLE_FONT_SIZE_VAR = '--vovapg-posts-grid-title-font-size';
const META_FONT_SIZE_VAR = '--vovapg-posts-grid-meta-font-size';
const EXCERPT_FONT_SIZE_VAR = '--vovapg-posts-grid-excerpt-font-size';
const READ_MORE_FONT_SIZE_VAR = '--vovapg-posts-grid-read-more-font-size';
const TEXT_LINE_HEIGHT_VAR = '--vovapg-posts-grid-text-line-height';
const READ_MORE_BUTTON_PADDING_VAR =
	'--vovapg-posts-grid-read-more-button-padding';
const PAGINATION_JUSTIFY_CONTENT_VAR =
	'--vovapg-posts-grid-pagination-justify-content';
const ACCENT_COLOR_VAR = '--vovapg-posts-grid-accent-color';
const META_COLOR_VAR = '--vovapg-posts-grid-meta-color';
const EXCERPT_COLOR_VAR = '--vovapg-posts-grid-excerpt-color';
const DEFAULT_ACCENT_COLOR = '#0088ff';
const DEFAULT_READ_MORE_BUTTON_PADDING = 9;
const READ_MORE_BUTTON_PADDING_RATIO = 1.618;
const INSPECTOR_TAB_QUERY = 'query';
const INSPECTOR_TAB_BLOCK = 'block';
const INSPECTOR_TAB_CARD = 'card';
const INSPECTOR_TAB_PANEL_IDS = {
	[ INSPECTOR_TAB_QUERY ]: 'vovapg-posts-grid-inspector-query',
	[ INSPECTOR_TAB_BLOCK ]: 'vovapg-posts-grid-inspector-block',
	[ INSPECTOR_TAB_CARD ]: 'vovapg-posts-grid-inspector-card',
};
const INSPECTOR_TABS = [
	{
		name: INSPECTOR_TAB_QUERY,
		title: __( 'Query', 'vova-posts-grid' ),
		panelId: INSPECTOR_TAB_PANEL_IDS[ INSPECTOR_TAB_QUERY ],
	},
	{
		name: INSPECTOR_TAB_BLOCK,
		title: __( 'Block', 'vova-posts-grid' ),
		panelId: INSPECTOR_TAB_PANEL_IDS[ INSPECTOR_TAB_BLOCK ],
	},
	{
		name: INSPECTOR_TAB_CARD,
		title: __( 'Card', 'vova-posts-grid' ),
		panelId: INSPECTOR_TAB_PANEL_IDS[ INSPECTOR_TAB_CARD ],
	},
];

const FONT_SIZE_CONTROLS = [
	{
		attribute: 'titleFontSize',
		cssVariable: TITLE_FONT_SIZE_VAR,
		label: __( 'Title text size', 'vova-posts-grid' ),
		min: 10,
		max: 72,
		defaultValue: 17.6,
	},
	{
		attribute: 'metaFontSize',
		cssVariable: META_FONT_SIZE_VAR,
		label: __( 'Meta fields text size', 'vova-posts-grid' ),
		min: 10,
		max: 32,
		defaultValue: 13.76,
	},
	{
		attribute: 'excerptFontSize',
		cssVariable: EXCERPT_FONT_SIZE_VAR,
		label: __( 'Excerpt text size', 'vova-posts-grid' ),
		min: 10,
		max: 40,
		defaultValue: 15.36,
	},
	{
		attribute: 'readMoreFontSize',
		cssVariable: READ_MORE_FONT_SIZE_VAR,
		label: __( 'Read more text size', 'vova-posts-grid' ),
		min: 10,
		max: 40,
		defaultValue: 16,
	},
];

const COLOR_CONTROLS = [
	{
		attribute: 'accentColor',
		label: __( 'Accent color', 'vova-posts-grid' ),
		isShownByDefault: true,
	},
	{
		attribute: 'metaColor',
		label: __( 'Meta color', 'vova-posts-grid' ),
		isShownByDefault: true,
	},
	{
		attribute: 'excerptColor',
		label: __( 'Excerpt color', 'vova-posts-grid' ),
		isShownByDefault: true,
	},
];

const EXCLUDED_POST_TYPES = [
	'attachment',
	'nav_menu_item',
	'wp_block',
	'wp_template',
	'wp_template_part',
	'wp_navigation',
	'wp_global_styles',
	'wp_font_family',
	'wp_font_face',
];

const clamp = ( value, min, max ) => Math.min( Math.max( value, min ), max );

const limitString = ( value, maxLength ) =>
	Array.from( String( value || '' ) )
		.slice( 0, maxLength )
		.join( '' );

const roundCssNumber = ( value ) => Number( value.toFixed( 3 ) );

const getFontSizeValue = ( value, defaultValue, min, max ) => {
	const fontSize = Number( value );

	return clamp(
		Number.isFinite( fontSize ) ? fontSize : defaultValue,
		min,
		max
	);
};

const getReadMoreButtonPadding = ( value ) => {
	const vertical = clamp(
		Number.isFinite( value ) ? value : DEFAULT_READ_MORE_BUTTON_PADDING,
		0,
		80
	);
	const horizontal = vertical * READ_MORE_BUTTON_PADDING_RATIO;

	return `${ roundCssNumber( vertical ) }px ${ roundCssNumber(
		horizontal
	) }px`;
};

const getPaginationJustifyContent = ( alignment ) =>
	( {
		left: 'flex-start',
		center: 'center',
		right: 'flex-end',
	} )[ alignment ] || 'center';

const normalizeQueryPosts = ( posts ) => {
	if ( ! Array.isArray( posts ) ) {
		return [];
	}

	return posts
		.slice( 0, MAX_SELECTED_POSTS )
		.map( ( post ) => {
			const id = Number( post?.id );

			if ( ! Number.isInteger( id ) || id < 1 ) {
				return null;
			}

			return {
				id,
				subtype: limitString(
					post?.subtype || 'post',
					MAX_OBJECT_SLUG_LENGTH
				),
				title: limitString(
					getPostTitle( post ),
					MAX_POST_TOKEN_TITLE_LENGTH
				),
			};
		} )
		.filter( Boolean );
};

const normalizeElements = ( elements ) => {
	const allowedIds = DEFAULT_ELEMENTS.map( ( element ) => element.id );
	const source = (
		Array.isArray( elements ) && elements.length > 0
			? elements
			: DEFAULT_ELEMENTS
	).slice( 0, MAX_ELEMENTS );
	const seen = new Set();
	const next = [];

	source.forEach( ( element ) => {
		const id = element?.id;

		if ( ! allowedIds.includes( id ) || seen.has( id ) ) {
			return;
		}

		seen.add( id );
		next.push( {
			id,
			visible:
				typeof element.visible === 'boolean' ? element.visible : true,
		} );
	} );

	DEFAULT_ELEMENTS.forEach( ( element ) => {
		if ( ! seen.has( element.id ) ) {
			next.push( element );
		}
	} );

	return next;
};

const getTaxonomyMetaFieldId = ( taxonomy ) => `taxonomy:${ taxonomy }`;

const normalizeMetaFieldValue = ( field ) =>
	typeof field === 'string' ? field : '';

const normalizeMetaFields = ( fields, options ) => {
	const allowedValues = new Set( options.map( ( option ) => option.value ) );
	const source = (
		Array.isArray( fields ) ? fields : DEFAULT_META_FIELDS
	).slice( 0, MAX_META_FIELDS );
	const next = [];
	const seen = new Set();

	source.forEach( ( field ) => {
		const value = normalizeMetaFieldValue( field );

		if ( ! allowedValues.has( value ) || seen.has( value ) ) {
			return;
		}

		seen.add( value );
		next.push( value );
	} );

	return next;
};

const getMetaFieldOptions = ( taxonomies ) => {
	const taxonomyOptions = ( taxonomies || [] )
		.filter( ( taxonomy ) => taxonomy?.slug )
		.map( ( taxonomy ) => ( {
			label: sprintf(
				/* translators: %s: taxonomy name. */
				__( '%s badges', 'vova-posts-grid' ),
				taxonomy.name || taxonomy.slug
			),
			value: getTaxonomyMetaFieldId( taxonomy.slug ),
		} ) );

	return [ ...META_FIELD_OPTIONS, ...taxonomyOptions ];
};

const normalizeQuery = ( query ) => {
	const normalized = {
		...DEFAULT_QUERY,
		...( query || {} ),
		dateRange: {
			...DEFAULT_QUERY.dateRange,
			...( query?.dateRange || {} ),
		},
		metaFilter: {
			...DEFAULT_QUERY.metaFilter,
			...( query?.metaFilter || {} ),
		},
	};
	const postsPerPage = Number( normalized.postsPerPage );

	return {
		...normalized,
		postType: limitString(
			normalized.postType || 'post',
			MAX_OBJECT_SLUG_LENGTH
		),
		taxonomy: limitString( normalized.taxonomy, MAX_OBJECT_SLUG_LENGTH ),
		terms: Array.isArray( normalized.terms )
			? normalized.terms
					.map( Number )
					.filter(
						( termId ) => Number.isInteger( termId ) && termId > 0
					)
					.slice( 0, MAX_TERMS )
			: [],
		keyword: limitString( normalized.keyword, MAX_KEYWORD_LENGTH ),
		includePosts: normalizeQueryPosts( normalized.includePosts ),
		excludePosts: normalizeQueryPosts( normalized.excludePosts ),
		postsPerPage: clamp(
			Number.isFinite( postsPerPage )
				? Math.trunc( postsPerPage )
				: DEFAULT_QUERY.postsPerPage,
			1,
			MAX_POSTS_PER_PAGE
		),
		posts: normalizeQueryPosts( normalized.posts ),
	};
};

const getMetaFilterValueInputType = ( type ) => {
	if ( type === 'date' ) {
		return 'date';
	}

	if ( type === 'number' ) {
		return 'number';
	}

	return 'text';
};

const getPostTypeOptions = ( postTypes ) => {
	const options = ( postTypes || [] )
		.filter(
			( type ) =>
				type?.slug && ! EXCLUDED_POST_TYPES.includes( type.slug )
		)
		.map( ( type ) => ( {
			label: type.labels?.singular_name || type.name || type.slug,
			value: type.slug,
		} ) );
	const values = new Set( options.map( ( option ) => option.value ) );

	if ( ! values.has( 'post' ) ) {
		options.push( {
			label: __( 'Post', 'vova-posts-grid' ),
			value: 'post',
		} );
	}

	return options;
};

const getFallbackPostTitle = ( id ) =>
	sprintf(
		/* translators: %d: post ID. */
		__( 'Post #%d', 'vova-posts-grid' ),
		id
	);

function getPostTitle( post ) {
	if ( typeof post?.title === 'string' && post.title.trim() ) {
		return post.title;
	}

	if (
		typeof post?.title?.rendered === 'string' &&
		post.title.rendered.trim()
	) {
		return post.title.rendered.replace( /<[^>]*>/g, '' );
	}

	return getFallbackPostTitle( Number( post?.id ) || 0 );
}

const normalizeSearchResult = ( record ) => {
	const id = Number( record?.id );
	const subtype = record?.subtype;

	if ( ! Number.isInteger( id ) || id < 1 || ! subtype ) {
		return null;
	}

	return {
		id,
		subtype: limitString( subtype, MAX_OBJECT_SLUG_LENGTH ),
		title: limitString(
			getPostTitle( record ),
			MAX_POST_TOKEN_TITLE_LENGTH
		),
	};
};

const getPostKey = ( post ) =>
	`${ post.subtype || 'post' }:${ Number( post.id ) }`;

const getPostTokenValue = ( post ) =>
	`${
		post.title || getFallbackPostTitle( Number( post.id ) )
	} [${ getPostKey( post ) }]`;

const getBlockStyle = ( attributes ) => {
	const style = {};
	const desktopColumns = Number( attributes.desktopColumns );
	const tabletColumns = Number( attributes.tabletColumns );
	const mobileColumns = Number( attributes.mobileColumns );
	const horizontalGap = Number( attributes.horizontalGap );
	const verticalGap = Number( attributes.verticalGap );
	const innerElementGap = Number( attributes.innerElementGap );
	const imageAspectRatio = attributes.imageAspectRatio || '16:9';
	const imageBorderRadius = Number( attributes.imageBorderRadius );
	const readMorePadding = Number(
		attributes.readMorePadding ?? attributes.readMorePaddingY
	);
	const textLineHeight = Number( attributes.textLineHeight );

	style[ COLUMNS_DESKTOP_VAR ] = clamp(
		Number.isFinite( desktopColumns ) ? desktopColumns : 3,
		1,
		6
	);
	style[ COLUMNS_TABLET_VAR ] = clamp(
		Number.isFinite( tabletColumns ) ? tabletColumns : 2,
		1,
		4
	);
	style[ COLUMNS_MOBILE_VAR ] = clamp(
		Number.isFinite( mobileColumns ) ? mobileColumns : 1,
		1,
		3
	);
	style[ HORIZONTAL_GAP_VAR ] = `${ clamp(
		Number.isFinite( horizontalGap ) ? horizontalGap : 24,
		0,
		96
	) }px`;
	style[ VERTICAL_GAP_VAR ] = `${ clamp(
		Number.isFinite( verticalGap ) ? verticalGap : 24,
		0,
		96
	) }px`;

	if ( imageAspectRatio !== 'auto' ) {
		style[ IMAGE_ASPECT_RATIO_VAR ] = imageAspectRatio.replace(
			':',
			' / '
		);
	}

	style[ IMAGE_OBJECT_FIT_VAR ] = attributes.imageObjectFit || 'cover';
	style[ IMAGE_OBJECT_POSITION_VAR ] =
		attributes.imageObjectPosition || 'center center';
	style[ IMAGE_BORDER_RADIUS_VAR ] = `${ clamp(
		Number.isFinite( imageBorderRadius ) ? imageBorderRadius : 10,
		0,
		1000
	) }px`;
	style[ INNER_ELEMENT_GAP_VAR ] = `${ clamp(
		Number.isFinite( innerElementGap ) ? innerElementGap : 12,
		0,
		48
	) }px`;
	style[ TEXT_LINE_HEIGHT_VAR ] = String(
		clamp(
			Number.isFinite( textLineHeight ) ? textLineHeight : 1.35,
			1,
			2.5
		)
	);
	FONT_SIZE_CONTROLS.forEach( ( control ) => {
		style[ control.cssVariable ] = `${ roundCssNumber(
			getFontSizeValue(
				attributes[ control.attribute ],
				control.defaultValue,
				control.min,
				control.max
			)
		) }px`;
	} );
	style[ READ_MORE_BUTTON_PADDING_VAR ] =
		getReadMoreButtonPadding( readMorePadding );
	style[ PAGINATION_JUSTIFY_CONTENT_VAR ] = getPaginationJustifyContent(
		attributes.paginationAlignment || 'center'
	);

	style[ ACCENT_COLOR_VAR ] = attributes.accentColor || DEFAULT_ACCENT_COLOR;

	if ( attributes.metaColor ) {
		style[ META_COLOR_VAR ] = attributes.metaColor;
	}

	if ( attributes.excerptColor ) {
		style[ EXCERPT_COLOR_VAR ] = attributes.excerptColor;
	}

	return style;
};

const getPreviewAttributes = ( attributes, contextPostId = 0 ) => ( {
	query: normalizeQuery( attributes.query ),
	contextPostId: Number( contextPostId ) || 0,
	desktopColumns: attributes.desktopColumns,
	tabletColumns: attributes.tabletColumns,
	mobileColumns: attributes.mobileColumns,
	horizontalGap: attributes.horizontalGap,
	verticalGap: attributes.verticalGap,
	imageSize: limitString(
		attributes.imageSize,
		MAX_PRESENTATION_STRING_LENGTH
	),
	imageAspectRatio: attributes.imageAspectRatio,
	imageObjectFit: attributes.imageObjectFit,
	imageObjectPosition: attributes.imageObjectPosition,
	imageBorderRadius: attributes.imageBorderRadius,
	innerElementGap: attributes.innerElementGap,
	titleFontSize: attributes.titleFontSize,
	metaFontSize: attributes.metaFontSize,
	excerptFontSize: attributes.excerptFontSize,
	readMoreFontSize: attributes.readMoreFontSize,
	textLineHeight: attributes.textLineHeight,
	elements: normalizeElements( attributes.elements ),
	metaFields: Array.isArray( attributes.metaFields )
		? attributes.metaFields.slice( 0, MAX_META_FIELDS )
		: DEFAULT_META_FIELDS,
	readMoreLabel: limitString(
		attributes.readMoreLabel,
		MAX_READ_MORE_LABEL_LENGTH
	),
	readMoreStyle: attributes.readMoreStyle,
	readMorePadding: attributes.readMorePadding ?? attributes.readMorePaddingY,
	fullCardClickable: attributes.fullCardClickable,
	openLinksInNewTab: attributes.openLinksInNewTab,
	excerptLength: attributes.excerptLength,
	emptyStateText: limitString(
		attributes.emptyStateText,
		MAX_EMPTY_STATE_TEXT_LENGTH
	),
	loadingSkeleton: attributes.loadingSkeleton,
	paginationType: attributes.paginationType,
	paginationAlignment: attributes.paginationAlignment,
	accentColor: limitString(
		attributes.accentColor || DEFAULT_ACCENT_COLOR,
		MAX_PRESENTATION_STRING_LENGTH
	),
	metaColor: limitString(
		attributes.metaColor || '',
		MAX_PRESENTATION_STRING_LENGTH
	),
	excerptColor: limitString(
		attributes.excerptColor || '',
		MAX_PRESENTATION_STRING_LENGTH
	),
} );

function PostTokenField( {
	label,
	value,
	onChange,
	subtype = 'any',
	placeholder,
} ) {
	const selectedPosts = useMemo(
		() => normalizeQueryPosts( value ),
		[ value ]
	);
	const [ search, setSearch ] = useState( '' );
	const [ suggestions, setSuggestions ] = useState( [] );
	const [ postsByToken, setPostsByToken ] = useState( {} );
	const selectedPostsByToken = useMemo( () => {
		const map = {};

		selectedPosts.forEach( ( post ) => {
			map[ getPostTokenValue( post ) ] = post;
		} );

		return map;
	}, [ selectedPosts ] );
	const tokenLookup = useMemo(
		() => ( { ...postsByToken, ...selectedPostsByToken } ),
		[ postsByToken, selectedPostsByToken ]
	);
	const tokenValues = useMemo(
		() => selectedPosts.map( ( post ) => getPostTokenValue( post ) ),
		[ selectedPosts ]
	);

	useEffect( () => {
		let cancelled = false;

		if ( search.trim().length < 2 ) {
			setSuggestions( [] );

			return () => {
				cancelled = true;
			};
		}

		const timeout = setTimeout( () => {
			apiFetch( {
				path: addQueryArgs( '/wp/v2/search', {
					search,
					type: 'post',
					subtype,
					per_page: 20,
					_fields: 'id,title,subtype',
				} ),
			} )
				.then( ( records ) => {
					if ( cancelled || ! Array.isArray( records ) ) {
						return;
					}

					const nextPosts = records
						.map( normalizeSearchResult )
						.filter( Boolean );
					const nextPostsByToken = {};
					const nextSuggestions = nextPosts.map( ( post ) => {
						const token = getPostTokenValue( post );
						nextPostsByToken[ token ] = post;

						return token;
					} );

					setPostsByToken( ( prev ) => ( {
						...prev,
						...nextPostsByToken,
					} ) );
					setSuggestions( nextSuggestions );
				} )
				.catch( () => {
					if ( ! cancelled ) {
						setSuggestions( [] );
					}
				} );
		}, 250 );

		return () => {
			cancelled = true;
			clearTimeout( timeout );
		};
	}, [ search, subtype ] );

	const handleChange = ( tokens ) => {
		const seen = new Set();
		const nextPosts = [];

		tokens.forEach( ( token ) => {
			if ( nextPosts.length >= MAX_SELECTED_POSTS ) {
				return;
			}

			const post = tokenLookup[ token ];

			if ( ! post ) {
				return;
			}

			const key = getPostKey( post );

			if ( seen.has( key ) ) {
				return;
			}

			seen.add( key );
			nextPosts.push( {
				id: post.id,
				subtype: limitString( post.subtype, MAX_OBJECT_SLUG_LENGTH ),
				title: limitString( post.title, MAX_POST_TOKEN_TITLE_LENGTH ),
			} );
		} );

		onChange( nextPosts );
	};

	return (
		<div className="vovapg-posts-grid-post-token-field">
			<FormTokenField
				label={ label }
				value={ tokenValues }
				suggestions={ suggestions }
				placeholder={ placeholder }
				displayTransform={ ( token ) =>
					tokenLookup[ token ]?.title || token
				}
				onInputChange={ setSearch }
				onChange={ handleChange }
				__experimentalValidateInput={ ( token ) =>
					Boolean( tokenLookup[ token ] )
				}
				__experimentalExpandOnFocus
				__experimentalAutoSelectFirstMatch
				__experimentalRenderItem={ ( { item } ) => {
					const post = tokenLookup[ item ];

					return post ? `${ post.title } (${ post.subtype })` : item;
				} }
				__nextHasNoMarginBottom
			/>
		</div>
	);
}

function CardElementsControl( { elements, onChange } ) {
	const normalizedElements = useMemo(
		() => normalizeElements( elements ),
		[ elements ]
	);
	const [ draggedId, setDraggedId ] = useState( '' );

	const moveElement = ( sourceId, targetId ) => {
		if ( ! sourceId || ! targetId || sourceId === targetId ) {
			return;
		}

		const sourceIndex = normalizedElements.findIndex(
			( element ) => element.id === sourceId
		);
		const targetIndex = normalizedElements.findIndex(
			( element ) => element.id === targetId
		);

		if ( sourceIndex < 0 || targetIndex < 0 ) {
			return;
		}

		const nextElements = [ ...normalizedElements ];
		const [ movedElement ] = nextElements.splice( sourceIndex, 1 );
		nextElements.splice( targetIndex, 0, movedElement );
		onChange( nextElements );
	};

	const setElementVisibility = ( id, visible ) => {
		onChange(
			normalizedElements.map( ( element ) =>
				element.id === id ? { ...element, visible } : element
			)
		);
	};

	return (
		<BaseControl
			id="vovapg-posts-grid-elements-control"
			label={ __( 'Card elements', 'vova-posts-grid' ) }
			className="vovapg-posts-grid-elements-control"
		>
			<div className="vovapg-posts-grid-elements-control__items">
				{ normalizedElements.map( ( element ) => (
					<div
						className={
							draggedId === element.id
								? 'vovapg-posts-grid-elements-control__item vovapg-posts-grid-elements-control__item--dragging'
								: 'vovapg-posts-grid-elements-control__item'
						}
						key={ element.id }
						draggable
						onDragStart={ ( event ) => {
							setDraggedId( element.id );
							event.dataTransfer.effectAllowed = 'move';
							event.dataTransfer.setData(
								'text/plain',
								element.id
							);
						} }
						onDragOver={ ( event ) => {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'move';
						} }
						onDrop={ ( event ) => {
							event.preventDefault();
							moveElement(
								event.dataTransfer.getData( 'text/plain' ),
								element.id
							);
							setDraggedId( '' );
						} }
						onDragEnd={ () => setDraggedId( '' ) }
					>
						<span
							className="vovapg-posts-grid-elements-control__handle"
							aria-hidden="true"
						>
							::
						</span>
						<span className="vovapg-posts-grid-elements-control__label">
							{ ELEMENT_LABELS[ element.id ] || element.id }
						</span>
						<ToggleControl
							label={ __( 'Visible', 'vova-posts-grid' ) }
							checked={ element.visible }
							onChange={ ( visible ) =>
								setElementVisibility( element.id, visible )
							}
						/>
					</div>
				) ) }
			</div>
		</BaseControl>
	);
}

function MetaFieldsControl( { fields, options, onChange } ) {
	const orderedFields = useMemo( () => {
		const selectedFields = normalizeMetaFields( fields, options );
		const selectedSet = new Set( selectedFields );
		const fieldItems = selectedFields.map( ( value ) => ( {
			value,
			label:
				options.find( ( option ) => option.value === value )?.label ||
				value,
			visible: true,
		} ) );

		options.forEach( ( option ) => {
			if ( selectedSet.has( option.value ) ) {
				return;
			}

			fieldItems.push( {
				value: option.value,
				label: option.label,
				visible: false,
			} );
		} );

		return fieldItems;
	}, [ fields, options ] );
	const [ draggedValue, setDraggedValue ] = useState( '' );

	const updateFields = ( fieldItems ) => {
		onChange(
			fieldItems
				.filter( ( field ) => field.visible )
				.map( ( field ) => field.value )
				.slice( 0, MAX_META_FIELDS )
		);
	};

	const moveField = ( sourceValue, targetValue ) => {
		if ( ! sourceValue || ! targetValue || sourceValue === targetValue ) {
			return;
		}

		const sourceIndex = orderedFields.findIndex(
			( field ) => field.value === sourceValue
		);
		const targetIndex = orderedFields.findIndex(
			( field ) => field.value === targetValue
		);

		if ( sourceIndex < 0 || targetIndex < 0 ) {
			return;
		}

		const nextFields = [ ...orderedFields ];
		const [ movedField ] = nextFields.splice( sourceIndex, 1 );
		nextFields.splice( targetIndex, 0, movedField );
		updateFields( nextFields );
	};

	const setFieldVisibility = ( value, visible ) => {
		updateFields(
			orderedFields.map( ( field ) =>
				field.value === value ? { ...field, visible } : field
			)
		);
	};

	return (
		<BaseControl
			id="vovapg-posts-grid-meta-fields-control"
			label={ __( 'Meta fields', 'vova-posts-grid' ) }
			className="vovapg-posts-grid-elements-control vovapg-posts-grid-meta-fields-control"
		>
			<div className="vovapg-posts-grid-elements-control__items">
				{ orderedFields.map( ( field ) => (
					<div
						className={
							draggedValue === field.value
								? 'vovapg-posts-grid-elements-control__item vovapg-posts-grid-elements-control__item--dragging'
								: 'vovapg-posts-grid-elements-control__item'
						}
						key={ field.value }
						draggable
						onDragStart={ ( event ) => {
							setDraggedValue( field.value );
							event.dataTransfer.effectAllowed = 'move';
							event.dataTransfer.setData(
								'text/plain',
								field.value
							);
						} }
						onDragOver={ ( event ) => {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'move';
						} }
						onDrop={ ( event ) => {
							event.preventDefault();
							moveField(
								event.dataTransfer.getData( 'text/plain' ),
								field.value
							);
							setDraggedValue( '' );
						} }
						onDragEnd={ () => setDraggedValue( '' ) }
					>
						<span
							className="vovapg-posts-grid-elements-control__handle"
							aria-hidden="true"
						>
							::
						</span>
						<span className="vovapg-posts-grid-elements-control__label">
							{ field.label }
						</span>
						<ToggleControl
							label={ __( 'Visible', 'vova-posts-grid' ) }
							checked={ field.visible }
							onChange={ ( visible ) =>
								setFieldVisibility( field.value, visible )
							}
						/>
					</div>
				) ) }
			</div>
		</BaseControl>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const query = normalizeQuery( attributes.query );
	const dateRange = query.dateRange;
	const metaFilter = query.metaFilter;
	const metaFilterRequiresValue = ! [ 'exists', 'not_exists' ].includes(
		metaFilter.compare
	);
	const metaFilterValueInputType = getMetaFilterValueInputType(
		metaFilter.type
	);
	const metaFilterBooleanValue = metaFilter.value === '0' ? '0' : '1';
	const currentPostId = useSelect(
		( select ) => select( 'core/editor' )?.getCurrentPostId?.() || 0,
		[]
	);
	const previewAttributes = useMemo(
		() => getPreviewAttributes( attributes, currentPostId ),
		[ attributes, currentPostId ]
	);
	const previewKey = useMemo(
		() => JSON.stringify( previewAttributes ),
		[ previewAttributes ]
	);
	const [ previewHtml, setPreviewHtml ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ activeInspectorTab, setActiveInspectorTab ] =
		useState( INSPECTOR_TAB_QUERY );
	const postTypes = useSelect(
		( select ) =>
			select( 'core' ).getPostTypes( {
				per_page: -1,
				context: 'view',
			} ) || [],
		[]
	);
	const taxonomies = useSelect(
		( select ) =>
			select( 'core' ).getTaxonomies( {
				per_page: -1,
				context: 'view',
			} ) || [],
		[]
	);
	const authors = useSelect(
		( select ) =>
			select( 'core' ).getUsers( {
				per_page: -1,
				who: 'authors',
			} ) || [],
		[]
	);
	const postTypeOptions = useMemo(
		() => getPostTypeOptions( postTypes ),
		[ postTypes ]
	);
	const availableTaxonomies = useMemo(
		() =>
			( taxonomies || [] ).filter( ( tax ) =>
				Array.isArray( tax.types )
					? tax.types.includes( query.postType )
					: false
			),
		[ taxonomies, query.postType ]
	);
	const taxonomyOptions = useMemo(
		() => [
			{ label: __( 'None', 'vova-posts-grid' ), value: '' },
			...availableTaxonomies.map( ( tax ) => ( {
				label: tax.name || tax.slug,
				value: tax.slug,
			} ) ),
		],
		[ availableTaxonomies ]
	);
	const metaFieldOptions = useMemo(
		() => getMetaFieldOptions( availableTaxonomies ),
		[ availableTaxonomies ]
	);
	const selectedTaxonomy = useMemo(
		() =>
			availableTaxonomies.find( ( tax ) => tax.slug === query.taxonomy ),
		[ availableTaxonomies, query.taxonomy ]
	);
	const [ termSuggestions, setTermSuggestions ] = useState( [] );
	const [ termsById, setTermsById ] = useState( {} );
	const termValues = useMemo(
		() =>
			( query.terms || [] )
				.map( ( termId ) => termsById[ termId ] )
				.filter( Boolean ),
		[ query.terms, termsById ]
	);
	const authorOptions = useMemo(
		() => [
			{
				label: __( 'Any author', 'vova-posts-grid' ),
				value: '0',
			},
			...( authors || [] ).map( ( author ) => ( {
				label: author.name || author.slug,
				value: String( author.id ),
			} ) ),
		],
		[ authors ]
	);
	const blockClassName = [
		'vovapg-posts-grid',
		'vovapg-block',
		'vovapg-posts-grid--editor',
		attributes.imageAspectRatio === 'auto'
			? ''
			: 'vovapg-posts-grid--fixed-image',
		attributes.loadingSkeleton
			? 'vovapg-posts-grid--has-loading-skeleton'
			: '',
		isLoading ? 'vovapg-posts-grid--loading' : '',
	]
		.filter( Boolean )
		.join( ' ' );
	const blockProps = useBlockProps( {
		className: blockClassName,
		style: getBlockStyle( attributes ),
	} );

	useEffect( () => {
		let isCancelled = false;
		setIsLoading( true );
		setError( '' );

		const timeoutId = setTimeout( () => {
			apiFetch( {
				path: '/vovapg/v1/posts-grid/preview',
				method: 'POST',
				data: {
					attributes: previewAttributes,
					page: 1,
				},
			} )
				.then( ( response ) => {
					if ( isCancelled ) {
						return;
					}

					setPreviewHtml(
						typeof response?.html === 'string' ? response.html : ''
					);
				} )
				.catch( () => {
					if ( ! isCancelled ) {
						setPreviewHtml( '' );
						setError(
							__(
								'Could not load the posts grid preview.',
								'vova-posts-grid'
							)
						);
					}
				} )
				.finally( () => {
					if ( ! isCancelled ) {
						setIsLoading( false );
					}
				} );
		}, 250 );

		return () => {
			isCancelled = true;
			clearTimeout( timeoutId );
		};
	}, [ previewAttributes, previewKey ] );

	useEffect( () => {
		let cancelled = false;

		if ( ! selectedTaxonomy ) {
			setTermSuggestions( [] );

			return () => {
				cancelled = true;
			};
		}

		const restBase = selectedTaxonomy.rest_base || selectedTaxonomy.slug;
		const restNamespace = selectedTaxonomy.rest_namespace || 'wp/v2';

		apiFetch( {
			path: addQueryArgs( `/${ restNamespace }/${ restBase }`, {
				per_page: 100,
				_fields: 'id,name',
			} ),
		} )
			.then( ( records ) => {
				if ( cancelled || ! Array.isArray( records ) ) {
					return;
				}

				const map = {};
				records.forEach( ( term ) => {
					map[ term.id ] = term.name;
				} );

				setTermsById( ( prev ) => ( { ...prev, ...map } ) );
				setTermSuggestions( records.map( ( term ) => term.name ) );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setTermSuggestions( [] );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [ selectedTaxonomy ] );

	const updateQuery = ( updates ) => {
		setAttributes( { query: { ...query, ...updates } } );
	};

	const updateDateRange = ( updates ) => {
		updateQuery( {
			dateRange: {
				...dateRange,
				...updates,
			},
		} );
	};

	const updateMetaFilter = ( updates ) => {
		updateQuery( {
			metaFilter: {
				...metaFilter,
				...updates,
			},
		} );
	};

	const handleTermsChange = ( tokens ) => {
		const nameToId = Object.entries( termsById ).reduce(
			( map, [ id, name ] ) => ( {
				...map,
				[ name ]: Number( id ),
			} ),
			{}
		);

		updateQuery( {
			terms: tokens
				.map( ( token ) => nameToId[ token ] )
				.filter( Boolean )
				.slice( 0, MAX_TERMS ),
		} );
	};

	const metaFields = Array.isArray( attributes.metaFields )
		? attributes.metaFields
		: DEFAULT_META_FIELDS;

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<SidebarTabsControl
					tabs={ INSPECTOR_TABS }
					activeTab={ activeInspectorTab }
					onChange={ setActiveInspectorTab }
					ariaLabel={ __(
						'Posts grid settings sections',
						'vova-posts-grid'
					) }
				/>
				<div
					id={ INSPECTOR_TAB_PANEL_IDS[ activeInspectorTab ] }
					role="tabpanel"
				>
					{ activeInspectorTab === INSPECTOR_TAB_QUERY && (
						<PanelBody title={ __( 'Query', 'vova-posts-grid' ) }>
							<SelectControl
								label={ __( 'Query type', 'vova-posts-grid' ) }
								value={ query.queryType }
								options={ QUERY_TYPE_OPTIONS }
								onChange={ ( queryType ) =>
									updateQuery( { queryType } )
								}
							/>
							{ query.queryType === 'specific' ? (
								<PostTokenField
									label={ __( 'Posts', 'vova-posts-grid' ) }
									value={ query.posts }
									subtype="any"
									placeholder={ __(
										'Search posts',
										'vova-posts-grid'
									) }
									onChange={ ( posts ) =>
										updateQuery( { posts } )
									}
								/>
							) : (
								<>
									<SelectControl
										label={ __(
											'Post type',
											'vova-posts-grid'
										) }
										value={ query.postType }
										options={ postTypeOptions }
										onChange={ ( postType ) =>
											updateQuery( {
												postType,
												taxonomy: '',
												terms: [],
												includePosts: [],
												excludePosts: [],
											} )
										}
									/>
									<SelectControl
										label={ __(
											'Taxonomy',
											'vova-posts-grid'
										) }
										value={ query.taxonomy }
										options={ taxonomyOptions }
										onChange={ ( taxonomy ) =>
											updateQuery( {
												taxonomy,
												terms: [],
											} )
										}
									/>
									{ query.taxonomy && (
										<FormTokenField
											label={ __(
												'Terms',
												'vova-posts-grid'
											) }
											value={ termValues }
											suggestions={ termSuggestions }
											onChange={ handleTermsChange }
											__experimentalExpandOnFocus
											__nextHasNoMarginBottom
										/>
									) }
									<TextControl
										label={ __(
											'Keyword',
											'vova-posts-grid'
										) }
										value={ query.keyword }
										maxLength={ MAX_KEYWORD_LENGTH }
										onChange={ ( keyword ) =>
											updateQuery( {
												keyword: limitString(
													keyword,
													MAX_KEYWORD_LENGTH
												),
											} )
										}
									/>
									<SelectControl
										label={ __(
											'Author',
											'vova-posts-grid'
										) }
										value={ String( query.author || 0 ) }
										options={ authorOptions }
										onChange={ ( author ) =>
											updateQuery( {
												author: Number( author ) || 0,
											} )
										}
									/>
									<ToggleControl
										label={ __(
											'Exclude current post',
											'vova-posts-grid'
										) }
										checked={ !! query.excludeCurrentPost }
										onChange={ ( excludeCurrentPost ) =>
											updateQuery( {
												excludeCurrentPost,
											} )
										}
									/>
									<ToggleControl
										label={ __(
											'Only posts with featured images',
											'vova-posts-grid'
										) }
										checked={ !! query.hasFeaturedImage }
										onChange={ ( hasFeaturedImage ) =>
											updateQuery( { hasFeaturedImage } )
										}
									/>
									<SelectControl
										label={ __(
											'Date range',
											'vova-posts-grid'
										) }
										value={ dateRange.mode }
										options={ DATE_RANGE_OPTIONS }
										onChange={ ( mode ) =>
											updateDateRange( { mode } )
										}
									/>
									{ dateRange.mode === 'custom' && (
										<>
											<TextControl
												type="date"
												label={ __(
													'After',
													'vova-posts-grid'
												) }
												value={ dateRange.after || '' }
												onChange={ ( after ) =>
													updateDateRange( { after } )
												}
											/>
											<TextControl
												type="date"
												label={ __(
													'Before',
													'vova-posts-grid'
												) }
												value={ dateRange.before || '' }
												onChange={ ( before ) =>
													updateDateRange( {
														before,
													} )
												}
											/>
										</>
									) }
									<ToggleControl
										label={ __(
											'Filter by custom field',
											'vova-posts-grid'
										) }
										checked={ !! metaFilter.enabled }
										onChange={ ( enabled ) =>
											updateMetaFilter( { enabled } )
										}
									/>
									{ metaFilter.enabled && (
										<>
											<TextControl
												label={ __(
													'Meta key',
													'vova-posts-grid'
												) }
												value={ metaFilter.key || '' }
												onChange={ ( key ) =>
													updateMetaFilter( { key } )
												}
											/>
											<SelectControl
												label={ __(
													'Compare',
													'vova-posts-grid'
												) }
												value={ metaFilter.compare }
												options={
													META_FILTER_COMPARE_OPTIONS
												}
												onChange={ ( compare ) =>
													updateMetaFilter( {
														compare,
													} )
												}
											/>
											<SelectControl
												label={ __(
													'Type',
													'vova-posts-grid'
												) }
												value={ metaFilter.type }
												options={
													META_FILTER_TYPE_OPTIONS
												}
												onChange={ ( type ) =>
													updateMetaFilter( {
														type,
														value:
															type ===
																'boolean' &&
															metaFilter.value ===
																''
																? '1'
																: metaFilter.value,
													} )
												}
											/>
											{ metaFilterRequiresValue &&
												( metaFilter.type ===
												'boolean' ? (
													<SelectControl
														label={ __(
															'Value',
															'vova-posts-grid'
														) }
														value={
															metaFilterBooleanValue
														}
														options={ [
															{
																label: __(
																	'True',
																	'vova-posts-grid'
																),
																value: '1',
															},
															{
																label: __(
																	'False',
																	'vova-posts-grid'
																),
																value: '0',
															},
														] }
														onChange={ ( value ) =>
															updateMetaFilter( {
																value,
															} )
														}
													/>
												) : (
													<TextControl
														type={
															metaFilterValueInputType
														}
														label={ __(
															'Value',
															'vova-posts-grid'
														) }
														value={
															metaFilter.value ||
															''
														}
														onChange={ ( value ) =>
															updateMetaFilter( {
																value,
															} )
														}
													/>
												) ) }
										</>
									) }
									<PostTokenField
										label={ __(
											'Include posts',
											'vova-posts-grid'
										) }
										value={ query.includePosts }
										subtype={ query.postType || 'any' }
										placeholder={ __(
											'Search posts to include',
											'vova-posts-grid'
										) }
										onChange={ ( includePosts ) =>
											updateQuery( { includePosts } )
										}
									/>
									<PostTokenField
										label={ __(
											'Exclude posts',
											'vova-posts-grid'
										) }
										value={ query.excludePosts }
										subtype={ query.postType || 'any' }
										placeholder={ __(
											'Search posts to exclude',
											'vova-posts-grid'
										) }
										onChange={ ( excludePosts ) =>
											updateQuery( { excludePosts } )
										}
									/>
									<SelectControl
										label={ __(
											'Order by',
											'vova-posts-grid'
										) }
										value={ query.orderby }
										options={ ORDERBY_OPTIONS }
										onChange={ ( orderby ) =>
											updateQuery( { orderby } )
										}
									/>
									<SelectControl
										label={ __(
											'Order',
											'vova-posts-grid'
										) }
										value={ query.order }
										options={ ORDER_OPTIONS }
										onChange={ ( order ) =>
											updateQuery( { order } )
										}
									/>
									<ToggleControl
										label={ __(
											'Ignore sticky posts',
											'vova-posts-grid'
										) }
										checked={ query.ignoreSticky }
										onChange={ ( ignoreSticky ) =>
											updateQuery( { ignoreSticky } )
										}
									/>
								</>
							) }
							<RangeControl
								label={ __(
									'Posts per page',
									'vova-posts-grid'
								) }
								value={ query.postsPerPage }
								allowReset
								resetFallbackValue={
									DEFAULT_QUERY.postsPerPage
								}
								min={ 1 }
								max={ MAX_POSTS_PER_PAGE }
								onChange={ ( postsPerPage ) =>
									updateQuery( {
										postsPerPage: clamp(
											postsPerPage || 1,
											1,
											MAX_POSTS_PER_PAGE
										),
									} )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_BLOCK && (
						<PanelBody title={ __( 'Layout', 'vova-posts-grid' ) }>
							<RangeControl
								label={ __(
									'Desktop columns',
									'vova-posts-grid'
								) }
								value={ attributes.desktopColumns }
								allowReset
								resetFallbackValue={ 3 }
								min={ 1 }
								max={ 6 }
								onChange={ ( desktopColumns ) =>
									setAttributes( {
										desktopColumns: clamp(
											desktopColumns || 1,
											1,
											6
										),
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Tablet columns',
									'vova-posts-grid'
								) }
								value={ attributes.tabletColumns }
								allowReset
								resetFallbackValue={ 2 }
								min={ 1 }
								max={ 4 }
								onChange={ ( tabletColumns ) =>
									setAttributes( {
										tabletColumns: clamp(
											tabletColumns || 1,
											1,
											4
										),
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Mobile columns',
									'vova-posts-grid'
								) }
								value={ attributes.mobileColumns }
								allowReset
								resetFallbackValue={ 1 }
								min={ 1 }
								max={ 3 }
								onChange={ ( mobileColumns ) =>
									setAttributes( {
										mobileColumns: clamp(
											mobileColumns || 1,
											1,
											3
										),
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Horizontal gap',
									'vova-posts-grid'
								) }
								value={ attributes.horizontalGap }
								allowReset
								resetFallbackValue={ 24 }
								min={ 0 }
								max={ 96 }
								onChange={ ( horizontalGap ) =>
									setAttributes( {
										horizontalGap: clamp(
											horizontalGap || 0,
											0,
											96
										),
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Vertical gap',
									'vova-posts-grid'
								) }
								value={ attributes.verticalGap }
								allowReset
								resetFallbackValue={ 24 }
								min={ 0 }
								max={ 96 }
								onChange={ ( verticalGap ) =>
									setAttributes( {
										verticalGap: clamp(
											verticalGap || 0,
											0,
											96
										),
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Inner element gap',
									'vova-posts-grid'
								) }
								value={ attributes.innerElementGap }
								allowReset
								resetFallbackValue={ 12 }
								min={ 0 }
								max={ 48 }
								onChange={ ( innerElementGap ) =>
									setAttributes( {
										innerElementGap: clamp(
											innerElementGap || 0,
											0,
											48
										),
									} )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_BLOCK && (
						<PanelBody
							title={ __( 'Pagination', 'vova-posts-grid' ) }
						>
							<SelectControl
								label={ __( 'Pagination', 'vova-posts-grid' ) }
								value={ attributes.paginationType }
								options={ PAGINATION_OPTIONS }
								onChange={ ( paginationType ) =>
									setAttributes( { paginationType } )
								}
							/>
							<SelectControl
								label={ __(
									'Pagination alignment',
									'vova-posts-grid'
								) }
								value={
									attributes.paginationAlignment || 'center'
								}
								options={ PAGINATION_ALIGNMENT_OPTIONS }
								onChange={ ( paginationAlignment ) =>
									setAttributes( { paginationAlignment } )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_CARD && (
						<PanelBody title={ __( 'Image', 'vova-posts-grid' ) }>
							<SelectControl
								label={ __( 'Image size', 'vova-posts-grid' ) }
								value={ attributes.imageSize }
								options={ IMAGE_SIZE_OPTIONS }
								onChange={ ( imageSize ) =>
									setAttributes( { imageSize } )
								}
							/>
							<SelectControl
								label={ __(
									'Image aspect ratio',
									'vova-posts-grid'
								) }
								value={ attributes.imageAspectRatio }
								options={ ASPECT_RATIO_OPTIONS }
								onChange={ ( imageAspectRatio ) =>
									setAttributes( { imageAspectRatio } )
								}
							/>
							<SelectControl
								label={ __( 'Image fit', 'vova-posts-grid' ) }
								value={ attributes.imageObjectFit || 'cover' }
								options={ IMAGE_OBJECT_FIT_OPTIONS }
								onChange={ ( imageObjectFit ) =>
									setAttributes( { imageObjectFit } )
								}
							/>
							<SelectControl
								label={ __(
									'Image position',
									'vova-posts-grid'
								) }
								value={
									attributes.imageObjectPosition ||
									'center center'
								}
								options={ IMAGE_OBJECT_POSITION_OPTIONS }
								onChange={ ( imageObjectPosition ) =>
									setAttributes( { imageObjectPosition } )
								}
							/>
							<RangeControl
								label={ __(
									'Image border radius',
									'vova-posts-grid'
								) }
								value={ attributes.imageBorderRadius ?? 10 }
								allowReset
								resetFallbackValue={ 10 }
								min={ 0 }
								max={ 1000 }
								onChange={ ( imageBorderRadius ) =>
									setAttributes( {
										imageBorderRadius: clamp(
											imageBorderRadius ?? 10,
											0,
											1000
										),
									} )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_BLOCK && (
						<PanelBody title={ __( 'States', 'vova-posts-grid' ) }>
							<TextControl
								label={ __(
									'Empty state text',
									'vova-posts-grid'
								) }
								placeholder={ __(
									'No posts found.',
									'vova-posts-grid'
								) }
								value={ attributes.emptyStateText || '' }
								maxLength={ MAX_EMPTY_STATE_TEXT_LENGTH }
								onChange={ ( emptyStateText ) =>
									setAttributes( {
										emptyStateText: limitString(
											emptyStateText,
											MAX_EMPTY_STATE_TEXT_LENGTH
										),
									} )
								}
							/>
							<ToggleControl
								label={ __(
									'Loading skeleton',
									'vova-posts-grid'
								) }
								checked={ !! attributes.loadingSkeleton }
								onChange={ ( loadingSkeleton ) =>
									setAttributes( { loadingSkeleton } )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_CARD && (
						<PanelBody
							title={ __( 'Card content', 'vova-posts-grid' ) }
						>
							<CardElementsControl
								elements={ attributes.elements }
								onChange={ ( elements ) =>
									setAttributes( { elements } )
								}
							/>
							<MetaFieldsControl
								fields={ metaFields }
								options={ metaFieldOptions }
								onChange={ ( nextMetaFields ) =>
									setAttributes( {
										metaFields: nextMetaFields,
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Excerpt length',
									'vova-posts-grid'
								) }
								value={ attributes.excerptLength }
								allowReset
								resetFallbackValue={ 24 }
								min={ 5 }
								max={ 80 }
								onChange={ ( excerptLength ) =>
									setAttributes( {
										excerptLength: clamp(
											excerptLength || 5,
											5,
											80
										),
									} )
								}
							/>
							<ToggleControl
								label={ __(
									'Full card clickable',
									'vova-posts-grid'
								) }
								checked={ !! attributes.fullCardClickable }
								onChange={ ( fullCardClickable ) =>
									setAttributes( { fullCardClickable } )
								}
							/>
							<ToggleControl
								label={ __(
									'Open links in new tab',
									'vova-posts-grid'
								) }
								checked={ !! attributes.openLinksInNewTab }
								onChange={ ( openLinksInNewTab ) =>
									setAttributes( { openLinksInNewTab } )
								}
							/>
							<SelectControl
								label={ __(
									'Read more style',
									'vova-posts-grid'
								) }
								value={ attributes.readMoreStyle || 'button' }
								options={ READ_MORE_STYLE_OPTIONS }
								onChange={ ( readMoreStyle ) =>
									setAttributes( { readMoreStyle } )
								}
							/>
							<TextControl
								label={ __(
									'Read more label',
									'vova-posts-grid'
								) }
								value={ attributes.readMoreLabel }
								maxLength={ MAX_READ_MORE_LABEL_LENGTH }
								onChange={ ( readMoreLabel ) =>
									setAttributes( {
										readMoreLabel: limitString(
											readMoreLabel,
											MAX_READ_MORE_LABEL_LENGTH
										),
									} )
								}
							/>
							{ ( attributes.readMoreStyle || 'button' ) ===
								'button' && (
								<RangeControl
									label={ __(
										'Read More Button Padding',
										'vova-posts-grid'
									) }
									value={
										attributes.readMorePadding ??
										DEFAULT_READ_MORE_BUTTON_PADDING
									}
									allowReset
									resetFallbackValue={
										DEFAULT_READ_MORE_BUTTON_PADDING
									}
									min={ 0 }
									max={ 80 }
									onChange={ ( readMorePadding ) =>
										setAttributes( {
											readMorePadding: clamp(
												readMorePadding ??
													DEFAULT_READ_MORE_BUTTON_PADDING,
												0,
												80
											),
										} )
									}
								/>
							) }
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_CARD && (
						<PanelBody
							title={ __( 'Typography', 'vova-posts-grid' ) }
						>
							{ FONT_SIZE_CONTROLS.map( ( control ) => (
								<RangeControl
									key={ control.attribute }
									label={ control.label }
									value={ getFontSizeValue(
										attributes[ control.attribute ],
										control.defaultValue,
										control.min,
										control.max
									) }
									allowReset
									resetFallbackValue={ control.defaultValue }
									min={ control.min }
									max={ control.max }
									step={ 0.1 }
									onChange={ ( value ) =>
										setAttributes( {
											[ control.attribute ]:
												getFontSizeValue(
													value,
													control.defaultValue,
													control.min,
													control.max
												),
										} )
									}
								/>
							) ) }
							<RangeControl
								label={ __(
									'Text line height',
									'vova-posts-grid'
								) }
								value={ attributes.textLineHeight ?? 1.35 }
								allowReset
								resetFallbackValue={ 1.35 }
								min={ 1 }
								max={ 2.5 }
								step={ 0.05 }
								onChange={ ( textLineHeight ) =>
									setAttributes( {
										textLineHeight: clamp(
											textLineHeight ?? 1.35,
											1,
											2.5
										),
									} )
								}
							/>
						</PanelBody>
					) }
					{ activeInspectorTab === INSPECTOR_TAB_BLOCK && (
						<ColorSettingsControl
							attributes={ attributes }
							setAttributes={ setAttributes }
							controls={ COLOR_CONTROLS }
							title={ __( 'Colors', 'vova-posts-grid' ) }
						/>
					) }
				</div>
			</InspectorControls>
			<div className="vovapg-posts-grid__editor-preview">
				{ isLoading && (
					<div className="vovapg-posts-grid__editor-loading">
						<Spinner />
					</div>
				) }
				{ error && (
					<Notice status="error" isDismissible={ false }>
						{ error }
					</Notice>
				) }
				{ ! error && <RawHTML>{ previewHtml }</RawHTML> }
			</div>
		</div>
	);
}

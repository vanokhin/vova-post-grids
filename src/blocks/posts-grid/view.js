import { MAX_POSTS_PER_PAGE, getPublicPageNumber } from './limits';

const parseAttributes = ( value ) => {
	try {
		const attributes = JSON.parse( value || '{}' );

		return attributes && typeof attributes === 'object' ? attributes : {};
	} catch ( error ) {
		return {};
	}
};

const getSkeletonCardCount = ( content, attributes ) => {
	const currentCardCount = content.querySelectorAll(
		'.vovapg-posts-grid__card'
	).length;

	if ( currentCardCount > 0 ) {
		return currentCardCount;
	}

	const postsPerPage = Number( attributes?.query?.postsPerPage );

	return Math.min(
		Math.max( Number.isFinite( postsPerPage ) ? postsPerPage : 6, 1 ),
		MAX_POSTS_PER_PAGE
	);
};

const getSkeletonMarkup = ( content, attributes ) => {
	const cards = Array.from(
		{ length: getSkeletonCardCount( content, attributes ) },
		() => '<div class="vovapg-posts-grid__card"></div>'
	).join( '' );

	return `<div class="vovapg-posts-grid__grid" aria-hidden="true">${ cards }</div>`;
};

const initPostsGrid = ( block ) => {
	const content = block.querySelector( '.vovapg-posts-grid__content' );
	const restUrl = block.dataset.vovapgRestUrl;

	if ( ! content || ! restUrl || ! window.fetch ) {
		return;
	}

	const attributes = parseAttributes( block.dataset.vovapgAttributes );
	let controller = null;

	const setLoading = ( isLoading ) => {
		block.classList.toggle( 'vovapg-posts-grid--loading', isLoading );
		block.setAttribute( 'aria-busy', isLoading ? 'true' : 'false' );
	};

	const loadPage = ( page ) => {
		const nextPage = getPublicPageNumber( page );

		if ( nextPage === null ) {
			return;
		}

		if ( controller ) {
			controller.abort();
		}

		controller = new AbortController();
		setLoading( true );

		const previousHtml = content.innerHTML;

		if ( attributes.loadingSkeleton ) {
			content.innerHTML = getSkeletonMarkup( content, attributes );
		}

		window
			.fetch( restUrl, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify( {
					attributes,
					page: nextPage,
				} ),
				signal: controller.signal,
			} )
			.then( ( response ) => {
				if ( ! response.ok ) {
					throw new Error( 'Request failed' );
				}

				return response.json();
			} )
			.then( ( response ) => {
				if ( typeof response?.html !== 'string' ) {
					throw new Error( 'Invalid response' );
				}

				content.innerHTML = response.html;
				block.dataset.vovapgPage = String( response.page || nextPage );
				block.dispatchEvent(
					new CustomEvent( 'vovapg-posts-grid-page-loaded', {
						bubbles: true,
						detail: response,
					} )
				);
			} )
			.catch( ( error ) => {
				if ( error?.name === 'AbortError' ) {
					return;
				}

				block.classList.add( 'vovapg-posts-grid--error' );
				content.innerHTML = previousHtml;
			} )
			.finally( () => {
				setLoading( false );
				controller = null;
			} );
	};

	block.addEventListener( 'click', ( event ) => {
		const button = event.target.closest(
			'.vovapg-posts-grid__page-button'
		);

		if ( ! button || ! block.contains( button ) || button.disabled ) {
			return;
		}

		event.preventDefault();
		loadPage( button.dataset.vovapgPage );
	} );
};

const initAllPostsGrids = () => {
	document
		.querySelectorAll( '[data-vovapg-block="posts-grid"]' )
		.forEach( initPostsGrid );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initAllPostsGrids );
} else {
	initAllPostsGrids();
}

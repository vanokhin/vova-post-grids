import {
	MAX_POSTS_PER_PAGE,
	MAX_PUBLIC_PAGE,
	getPublicPageNumber,
} from '../limits';

describe( 'Posts Grid public limits', () => {
	it( 'keeps the frontend page and card limits in sync', () => {
		expect( MAX_PUBLIC_PAGE ).toBe( 100 );
		expect( MAX_POSTS_PER_PAGE ).toBe( 50 );
	} );

	it.each( [ 1, '2', MAX_PUBLIC_PAGE ] )(
		'accepts a finite integer page within range: %s',
		( page ) => {
			expect( getPublicPageNumber( page ) ).toBe( Number( page ) );
		}
	);

	it.each( [ 0, -1, 1.5, '1.5', MAX_PUBLIC_PAGE + 1, Infinity, NaN ] )(
		'rejects an invalid public page: %s',
		( page ) => {
			expect( getPublicPageNumber( page ) ).toBeNull();
		}
	);
} );
